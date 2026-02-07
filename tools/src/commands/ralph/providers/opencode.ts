/**
 * OpenCode provider implementation for Ralph
 *
 * Provides the full OpenCode provider with JSONL stream parsing, hard timeout
 * enforcement, permission bypass, and binary detection.
 *
 * ## OpenCode-Specific Quirks
 *
 * ### JSONL Output Format
 * OpenCode outputs newline-delimited JSON events to stdout via
 * `opencode run --format json`:
 * ```jsonl
 * {"type":"step_start","timestamp":...,"sessionID":"ses_XXX"}
 * {"type":"text","timestamp":...,"part":{"text":"Hello!"}}
 * {"type":"step_finish","timestamp":...,"part":{"reason":"stop","cost":0.001,"tokens":{...}}}
 * ```
 * Text is spread across multiple "text" events and must be concatenated.
 * The "step_finish" event with reason:"stop" contains cost and token data.
 *
 * ### Issue #8203 — Hard Timeout Required
 * OpenCode hangs forever on API errors (rate limits, auth failures) and writes
 * nothing to stderr. The ONLY reliable termination mechanism is a hard timeout.
 * Do NOT rely on:
 * - Exit codes (unreliable — process hangs instead of exiting)
 * - Stderr output (errors go to log files, not stderr)
 * - SIGTERM alone (may not work during API error hangs)
 *
 * The hard timeout starts immediately on process spawn and sends SIGKILL on
 * expiry via killProcessGracefully with a 0ms grace period (effectively
 * skipping SIGTERM, which may be ignored during hangs).
 *
 * ### Permission Bypass
 * OpenCode's interactive permission prompts must be bypassed for automation.
 * Set `OPENCODE_PERMISSION='{"*":"allow"}'` in the process environment.
 * This grants all permissions — appropriate for automated builds where the
 * prompt itself constrains behavior.
 *
 * ### Model Format
 * OpenCode uses "provider/model" format for model selection:
 * - `anthropic/claude-sonnet-4-20250514`
 * - `openai/gpt-4o`
 * - `google/gemini-2.5-pro-preview-05-06`
 *
 * @see docs/planning/milestones/004-MULTI-CLI/stories/003-opencode-support.md
 * @see docs/planning/milestones/004-MULTI-CLI/tasks/TASK-045-opencode-implementation.md
 */

import path from "node:path";

import type {
  AgentResult,
  InvocationOptions,
  OpencodeConfig,
  ProviderFailureOutcome,
  ProviderFailureReason,
  TokenUsage,
} from "./types";

import { killProcessGracefully, markTimerAsNonBlocking } from "./utils";

// =============================================================================
// Types
// =============================================================================

/** Parsed OpenCode JSONL event */
interface OpencodeEvent {
  part?: {
    cost?: number;
    reason?: string;
    text?: string;
    tokens?: {
      cache?: { read?: number; write?: number };
      cacheRead?: number;
      cacheWrite?: number;
      input?: number;
      output?: number;
      reasoning?: number;
    };
  };
  sessionID?: string;
  timestamp?: number;
  type: string;
}

/** Session entry returned by `opencode session list --format json` */
interface OpencodeSessionListEntry {
  created?: number;
  directory?: string;
  id?: string;
  projectId?: string;
  title?: string;
  updated?: number;
}

type OpencodeTokens = NonNullable<NonNullable<OpencodeEvent["part"]>["tokens"]>;

type TerminationSignal = "SIGINT" | "SIGTERM";

// =============================================================================
// Constants
// =============================================================================

/** Default hard timeout: 60 minutes (Issue #8203 mitigation) */
const DEFAULT_HARD_TIMEOUT_MS = 3_600_000;

/** Number of sessions to inspect when resolving supervised session ID */
const OPENCODE_SESSION_SCAN_LIMIT = 10;

/** Tolerance window to match supervised sessions by timestamp */
const OPENCODE_SUPERVISED_SESSION_LOOKBACK_MS = 10_000;

const OPENCODE_FAILURE_REASON_RULES: Array<{
  patterns: Array<string>;
  reason: ProviderFailureReason;
}> = [
  {
    patterns: ["interrupted", "sigint", "sigterm", "cancelled", "canceled"],
    reason: "interrupted",
  },
  {
    patterns: ["timed out", "timeout", "issue #8203", "hang"],
    reason: "timeout",
  },
  {
    patterns: [
      "api key",
      "unauthorized",
      "authentication",
      "forbidden",
      "invalid credentials",
      "invalid token",
    ],
    reason: "auth",
  },
  {
    patterns: [
      "unknown model",
      "invalid model",
      "model not found",
      "unsupported model",
    ],
    reason: "model",
  },
  {
    patterns: ["malformed json", "empty jsonl", "no step_finish", "parse"],
    reason: "malformed_output",
  },
  {
    patterns: [
      "rate limit",
      "temporarily unavailable",
      "overloaded",
      "connection",
      "network",
      "econn",
      "socket",
      "transport",
      " 429",
      " 502",
      " 503",
    ],
    reason: "transport",
  },
  {
    patterns: [
      "requires an interactive tty",
      "binary not found",
      "not found in path",
      "install:",
      "configuration",
      "config",
      "permission",
    ],
    reason: "configuration",
  },
];

/**
 * Permission bypass environment variable value.
 * Grants all permissions to OpenCode for automated execution.
 */
const OPENCODE_PERMISSION_VALUE = '{"*":"allow"}';

/** Conventional signal exit codes (128 + signal number) */
const SIGNAL_EXIT_CODE = { SIGINT: 130, SIGTERM: 143 } as const;

// =============================================================================
// Helper Functions (exported for testing)
// =============================================================================

/**
 * Build CLI arguments for the OpenCode process.
 *
 * Uses `opencode run --format json` for machine-readable output.
 * Model is passed in "provider/model" format (e.g., "anthropic/claude-sonnet-4-20250514").
 *
 * @param config - OpenCode provider configuration
 * @param prompt - The prompt to send to OpenCode
 * @returns Array of CLI arguments
 */
function buildOpencodeArguments(
  config: OpencodeConfig,
  prompt: string,
): Array<string> {
  const args = ["run", "--format", "json"];

  // Model format: "provider/model" (e.g., "anthropic/claude-sonnet-4-20250514")
  if (config.model !== undefined && config.model !== "") {
    args.push("--model", config.model);
  }

  args.push(prompt);

  return args;
}

/**
 * Build the environment variables for the OpenCode process.
 *
 * Inherits the current process environment and adds the
 * `OPENCODE_PERMISSION` variable for automation permission bypass.
 *
 * @returns Environment variables record for Bun.spawn
 */
function buildOpencodeEnv(): Record<string, string | undefined> {
  return {
    ...process.env,
    // Required for automation: bypasses OpenCode's interactive permission prompts.
    // Without this, OpenCode will pause and wait for user confirmation.
    OPENCODE_PERMISSION: OPENCODE_PERMISSION_VALUE,
  };
}

/**
 * Build CLI arguments for interactive OpenCode supervised mode.
 *
 * Uses OpenCode TUI entrypoint with an initial prompt so users can supervise
 * and intervene live.
 */
function buildOpencodeSupervisedArguments(
  config: OpencodeConfig,
  prompt: string,
): Array<string> {
  const args = ["--prompt", prompt];

  if (config.model !== undefined && config.model !== "") {
    args.push("--model", config.model);
  }

  return args;
}

/**
 * Check if the `opencode` binary is available in PATH.
 *
 * @returns true if `opencode` is found in PATH
 */
async function checkOpencodeAvailable(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", "opencode"], {
      stderr: "pipe",
      stdout: "pipe",
    });
    return (await proc.exited) === 0;
  } catch {
    return false;
  }
}

/**
 * Check whether supervised mode has the required interactive TTY.
 */
function ensureInteractiveTty(): void {
  const hasInteractiveTty = process.stdin.isTTY && process.stdout.isTTY;
  if (!hasInteractiveTty) {
    throw new Error(
      "OpenCode supervised mode requires an interactive TTY (stdin/stdout).\n" +
        "Run this command in a terminal session, or use '--headless' for non-interactive environments.",
    );
  }
}

/**
 * Map signal-like exit codes to signal names.
 */
function exitCodeToSignal(
  exitCode: null | number | undefined,
): null | TerminationSignal {
  if (exitCode === SIGNAL_EXIT_CODE.SIGINT) {
    return "SIGINT";
  }
  if (exitCode === SIGNAL_EXIT_CODE.SIGTERM) {
    return "SIGTERM";
  }
  return null;
}

function getOpencodeFailureReason(
  normalizedMessage: string,
): ProviderFailureReason | undefined {
  for (const rule of OPENCODE_FAILURE_REASON_RULES) {
    if (rule.patterns.some((pattern) => normalizedMessage.includes(pattern))) {
      return rule.reason;
    }
  }

  return undefined;
}

/**
 * Resolve the timestamp used to sort session recency.
 */
function getSessionTimestamp(session: OpencodeSessionListEntry): number {
  if (typeof session.updated === "number") {
    return session.updated;
  }
  if (typeof session.created === "number") {
    return session.created;
  }
  return 0;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Registry-compatible invoker for the OpenCode provider.
 *
 * Dispatches to one of two execution paths:
 * - headless: `opencode run --format json` with hard timeout enforcement
 * - supervised: interactive `opencode --prompt ...` with PTY requirements
 *
 * The registry composes prompt-file content + context and passes it as
 * `options.prompt` for both paths.
 *
 * @param options - Standard invocation options from the registry
 * @returns Normalized AgentResult
 * @throws Error if binary not found, process times out, exits non-zero, or JSONL is malformed
 */
async function invokeOpencode(
  options: InvocationOptions,
): Promise<AgentResult> {
  // Binary detection: fail fast with clear install instructions
  if (!(await checkOpencodeAvailable())) {
    throw new Error(
      "OpenCode binary not found in PATH.\n" +
        "Install: npm install -g opencode\n" +
        "See: https://opencode.ai for more information.",
    );
  }

  if (options.mode === "supervised") {
    return invokeOpencodeSupervised(options);
  }

  return invokeOpencodeHeadless(options);
}

/**
 * Headless OpenCode invocation path (`opencode run --format json`).
 */
async function invokeOpencodeHeadless(
  options: InvocationOptions,
): Promise<AgentResult> {
  const config = options.config as OpencodeConfig;
  const args = buildOpencodeArguments(config, options.prompt);
  const env = buildOpencodeEnv();
  const timeoutMs = config.timeoutMs ?? DEFAULT_HARD_TIMEOUT_MS;

  const startTime = Date.now();

  // Spawn OpenCode with JSONL output and permission bypass
  const proc = Bun.spawn(["opencode", ...args], {
    cwd: config.workingDirectory,
    env: env as Record<string, string>,
    stderr: "pipe",
    stdin: "ignore",
    stdout: "pipe",
  });

  // Start collecting stdout immediately (JSONL stream)
  const stdoutPromise = new Response(proc.stdout).text();

  // Drain stderr to prevent pipe blocking.
  // Note: OpenCode rarely writes to stderr per Issue #8203 — errors go to log files.
  const stderrPromise = new Response(proc.stderr).text();

  // ---------------------------------------------------------------------------
  // Hard Timeout — Issue #8203 Mitigation
  //
  // OpenCode hangs forever on API errors (rate limits, auth failures) without
  // writing to stderr or exiting. A hard timeout is the ONLY reliable way to
  // terminate the process in these scenarios.
  //
  // On timeout:
  // 1. Log error referencing Issue #8203
  // 2. Kill with SIGKILL via killProcessGracefully(proc, 0)
  //    - Grace period of 0ms means SIGTERM → immediate SIGKILL escalation
  //    - SIGTERM alone may not work during API error hangs (Issue #8203)
  // ---------------------------------------------------------------------------
  type ExitOutcome = "exited" | "hard_timeout";

  const exitPromise: Promise<ExitOutcome> = (async (): Promise<ExitOutcome> => {
    await proc.exited;
    return "exited";
  })();

  // eslint-disable-next-line promise/avoid-new -- setTimeout requires manual promise wrapping
  const hardTimeoutPromise = new Promise<ExitOutcome>((resolve) => {
    const timer = setTimeout(() => {
      resolve("hard_timeout");
    }, timeoutMs);
    markTimerAsNonBlocking(timer);
  });

  const outcome = await Promise.race([exitPromise, hardTimeoutPromise]);

  if (outcome === "hard_timeout") {
    const elapsed = Date.now() - startTime;
    // Log error with Issue #8203 reference for debugging
    console.error(
      `[Issue #8203] OpenCode hard timeout reached after ${elapsed}ms. ` +
        `OpenCode hangs forever on API errors and writes nothing to stderr. ` +
        `Sending SIGKILL (SIGTERM may not work during API error hangs).`,
    );

    // Kill process: 0ms grace period means SIGTERM → immediate SIGKILL
    // SIGKILL is required because SIGTERM may be ignored during API error hangs
    await killProcessGracefully(proc, 0);

    throw new Error(
      `OpenCode timed out after ${elapsed}ms ` +
        `(Issue #8203: process may have hung during API error)`,
    );
  }

  if (proc.exitCode !== 0) {
    const stderr = await stderrPromise;
    const stdout = await stdoutPromise;
    const trimmedStderr = stderr.trim();
    const details = trimmedStderr === "" ? stdout.trim() : stderr;
    throw new Error(
      `OpenCode exited with code ${String(proc.exitCode)}: ${details || "(no output)"}`,
    );
  }

  const stdout = await stdoutPromise;
  return normalizeOpencodeResult(stdout);
}

/**
 * Interactive OpenCode supervised invocation path.
 */
async function invokeOpencodeSupervised(
  options: InvocationOptions,
): Promise<AgentResult> {
  ensureInteractiveTty();

  const config = options.config as OpencodeConfig;
  const args = buildOpencodeSupervisedArguments(config, options.prompt);
  const env = buildOpencodeEnv();
  const startTime = Date.now();

  const proc = Bun.spawn(["opencode", ...args], {
    cwd: config.workingDirectory,
    env: env as Record<string, string>,
    stderr: "inherit",
    stdin: "inherit",
    stdout: "inherit",
  });

  const signalState: { interruptedBy: null | TerminationSignal } = {
    interruptedBy: null,
  };
  let didRequestTermination = false;

  function handleInterrupt(signal: TerminationSignal): void {
    signalState.interruptedBy = signal;
    if (didRequestTermination) {
      return;
    }
    didRequestTermination = true;

    // Deterministic interrupt path: terminate process and any child group members.
    sendSignalToProcessTree(proc, "SIGTERM");
    sendSignalToProcessTree(proc, "SIGKILL");
  }

  function handleSigintSignal(): void {
    handleInterrupt("SIGINT");
  }

  function handleSigtermSignal(): void {
    handleInterrupt("SIGTERM");
  }

  process.prependListener("SIGINT", handleSigintSignal);
  process.prependListener("SIGTERM", handleSigtermSignal);

  try {
    await proc.exited;
  } finally {
    process.removeListener("SIGINT", handleSigintSignal);
    process.removeListener("SIGTERM", handleSigtermSignal);
  }

  const durationMs = Date.now() - startTime;

  if (signalState.interruptedBy !== null) {
    throw new Error(
      `OpenCode supervised session interrupted by ${signalState.interruptedBy}`,
    );
  }

  if (proc.signalCode === "SIGINT" || proc.signalCode === "SIGTERM") {
    throw new Error(
      `OpenCode supervised session interrupted by ${proc.signalCode}`,
    );
  }

  const interruptionFromExit = exitCodeToSignal(proc.exitCode);
  if (interruptionFromExit !== null) {
    throw new Error(
      `OpenCode supervised session interrupted by ${interruptionFromExit}`,
    );
  }

  if (proc.exitCode !== 0) {
    throw new Error(
      `OpenCode supervised session exited with code ${String(proc.exitCode)}`,
    );
  }

  const sessionId = await resolveSupervisedSessionId(
    startTime,
    config.workingDirectory,
  );

  return { costUsd: 0, durationMs, result: "", sessionId };
}

/**
 * Best-effort list of recent OpenCode sessions.
 */
async function listOpencodeSessions(
  maxCount = OPENCODE_SESSION_SCAN_LIMIT,
): Promise<Array<OpencodeSessionListEntry>> {
  const proc = Bun.spawn(
    ["opencode", "session", "list", "--format", "json", "-n", String(maxCount)],
    { stderr: "pipe", stdin: "ignore", stdout: "pipe" },
  );

  const stdoutPromise = new Response(proc.stdout).text();
  const stderrPromise = new Response(proc.stderr).text();

  await proc.exited;
  const stdout = await stdoutPromise;
  const stderr = await stderrPromise;

  if (proc.exitCode !== 0 || stdout.trim() === "") {
    if (stderr.trim() !== "") {
      console.warn(
        `OpenCode session discovery warning: ${stderr.trim().slice(0, 200)}`,
      );
    }
    return [];
  }

  try {
    const parsed = JSON.parse(stdout) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry): entry is OpencodeSessionListEntry =>
        typeof entry === "object" && entry !== null,
    );
  } catch {
    return [];
  }
}

/**
 * Map OpenCode invocation failures into provider-neutral retry semantics.
 */
function mapOpencodeInvocationError(error: unknown): ProviderFailureOutcome {
  const message =
    error instanceof Error && error.message !== ""
      ? error.message
      : String(error);
  const normalized = message.toLowerCase();

  const reasonFromMessage =
    getOpencodeFailureReason(normalized) ??
    ("unknown" satisfies ProviderFailureReason);

  const status =
    reasonFromMessage === "timeout" || reasonFromMessage === "transport"
      ? "retryable"
      : "fatal";

  return { message, provider: "opencode", reason: reasonFromMessage, status };
}

/**
 * Parse OpenCode JSONL output and normalize to AgentResult.
 *
 * Processes the JSONL stream by:
 * 1. Splitting into lines and parsing each as JSON
 * 2. Concatenating text from all "text" events (in order)
 * 3. Finding the "step_finish" event with reason: "stop"
 * 4. Extracting cost, tokens, sessionId, and duration from events
 *
 * ## Incomplete Streams (Issue #8203)
 * If no "step_finish" event with reason:"stop" is found, this indicates
 * the process was killed (e.g., by hard timeout) or encountered an error.
 * In this case, the function throws a descriptive error rather than
 * returning partial data or hanging.
 *
 * @param jsonlOutput - Raw JSONL string from OpenCode stdout
 * @returns Normalized AgentResult
 * @throws Error if JSONL is empty, malformed, or missing required events
 */
function normalizeOpencodeResult(jsonlOutput: string): AgentResult {
  const events = parseOpencodeEvents(jsonlOutput);

  // Extract text from all text events (concatenated in order)
  const resultText = events
    .filter((event) => event.type === "text")
    .map((event) => event.part?.text ?? "")
    .join("");

  // Find step_finish with reason: "stop" — indicates successful completion.
  // Missing step_finish means the stream is incomplete (Issue #8203 timeout or error).
  const finishEvent = events.find(
    (event) => event.type === "step_finish" && event.part?.reason === "stop",
  );

  if (!finishEvent) {
    throw new Error(
      'No step_finish event with reason "stop" found in OpenCode output',
    );
  }

  // Extract sessionId from step_start event
  const startEvent = events.find((event) => event.type === "step_start");
  const sessionId =
    typeof startEvent?.sessionID === "string" ? startEvent.sessionID : "";

  // Extract cost from step_finish
  const costUsd =
    typeof finishEvent.part?.cost === "number" ? finishEvent.part.cost : 0;

  // Calculate duration from timestamps
  const startTimestamp = startEvent?.timestamp;
  const finishTimestamp = finishEvent.timestamp;
  const durationMs =
    typeof startTimestamp === "number" && typeof finishTimestamp === "number"
      ? finishTimestamp - startTimestamp
      : 0;

  // Extract token usage
  const tokenUsage = toTokenUsage(finishEvent.part?.tokens);

  return { costUsd, durationMs, result: resultText, sessionId, tokenUsage };
}

function parseOpencodeEvents(jsonlOutput: string): Array<OpencodeEvent> {
  const lines = jsonlOutput.split("\n").filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    throw new Error("Empty JSONL output from OpenCode");
  }

  const events: Array<OpencodeEvent> = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line) as OpencodeEvent);
    } catch {
      throw new Error(
        `Malformed JSON line in OpenCode output: ${line.slice(0, 100)}`,
      );
    }
  }

  return events;
}

/**
 * Match the most likely supervised session ID created by this invocation.
 */
async function resolveSupervisedSessionId(
  startedAtMs: number,
  workingDirectory?: string,
): Promise<string> {
  const sessions = await listOpencodeSessions();
  if (sessions.length === 0) {
    return "";
  }

  const threshold = startedAtMs - OPENCODE_SUPERVISED_SESSION_LOOKBACK_MS;
  const targetDirectory = path.resolve(workingDirectory ?? process.cwd());

  const normalizedSessions = sessions
    .map((session) => {
      const id = typeof session.id === "string" ? session.id : "";
      const directory =
        typeof session.directory === "string"
          ? path.resolve(session.directory)
          : "";
      const timestamp = getSessionTimestamp(session);
      return { directory, id, timestamp };
    })
    .filter((session) => session.id !== "")
    .sort((a, b) => b.timestamp - a.timestamp);

  if (normalizedSessions.length === 0) {
    return "";
  }

  const recentDirectoryMatch = normalizedSessions.find(
    (session) =>
      session.directory === targetDirectory && session.timestamp >= threshold,
  );
  if (recentDirectoryMatch !== undefined) {
    return recentDirectoryMatch.id;
  }

  const recentSession = normalizedSessions.find(
    (session) => session.timestamp >= threshold,
  );
  if (recentSession !== undefined) {
    return recentSession.id;
  }

  const directoryFallback = normalizedSessions.find(
    (session) => session.directory === targetDirectory,
  );
  if (directoryFallback !== undefined) {
    return directoryFallback.id;
  }

  return normalizedSessions[0]?.id ?? "";
}

/**
 * Best-effort process and process-group signal delivery.
 */
function sendSignalToProcessTree(
  proc: ReturnType<typeof Bun.spawn>,
  signal: "SIGKILL" | "SIGTERM",
): void {
  const { pid } = proc;
  if (typeof pid === "number" && pid > 0) {
    try {
      process.kill(-pid, signal);
    } catch {
      // Process group may not exist (non-detached child), continue.
    }
  }

  try {
    proc.kill(signal);
  } catch {
    // Process may already be terminated.
  }
}

function toTokenUsage(
  tokens: OpencodeTokens | undefined,
): TokenUsage | undefined {
  if (tokens === undefined) {
    return undefined;
  }

  const { cache, input, output, reasoning } = tokens;
  const cacheRead =
    typeof tokens.cacheRead === "number" ? tokens.cacheRead : cache?.read;
  const cacheWrite =
    typeof tokens.cacheWrite === "number" ? tokens.cacheWrite : cache?.write;

  return {
    cacheRead,
    cacheWrite,
    input: input ?? 0,
    output: output ?? 0,
    reasoning,
  };
}

// =============================================================================
// Exports
// =============================================================================

export {
  buildOpencodeArguments,
  buildOpencodeEnv,
  buildOpencodeSupervisedArguments,
  checkOpencodeAvailable,
  DEFAULT_HARD_TIMEOUT_MS,
  getOpencodeFailureReason,
  invokeOpencode,
  invokeOpencodeHeadless,
  invokeOpencodeSupervised,
  listOpencodeSessions,
  mapOpencodeInvocationError,
  normalizeOpencodeResult,
  OPENCODE_PERMISSION_VALUE,
  OPENCODE_SESSION_SCAN_LIMIT,
  OPENCODE_SUPERVISED_SESSION_LOOKBACK_MS,
  type OpencodeEvent,
  type OpencodeSessionListEntry,
  resolveSupervisedSessionId,
  sendSignalToProcessTree,
};

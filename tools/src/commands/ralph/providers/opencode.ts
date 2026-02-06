/**
 * OpenCode provider implementation for Ralph
 *
 * Provides the full OpenCode provider with JSONL stream parsing, hard timeout
 * enforcement, permission bypass, and binary detection.
 *
 * ## OpenCode-Specific Quirks
 *
 * ### JSONL Output Format
 * OpenCode outputs newline-delimited JSON events to stdout:
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

import type {
  AgentResult,
  InvocationOptions,
  OpencodeConfig,
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

// =============================================================================
// Constants
// =============================================================================

/** Default hard timeout: 60 minutes (Issue #8203 mitigation) */
const DEFAULT_HARD_TIMEOUT_MS = 3_600_000;

/**
 * Permission bypass environment variable value.
 * Grants all permissions to OpenCode for automated execution.
 */
const OPENCODE_PERMISSION_VALUE = '{"*":"allow"}';

// =============================================================================
// Helper Functions (exported for testing)
// =============================================================================

/**
 * Build CLI arguments for the OpenCode process.
 *
 * Always includes `--output jsonl` for machine-readable output.
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
  const args = ["--output", "jsonl", "--prompt", prompt];

  // Model format: "provider/model" (e.g., "anthropic/claude-sonnet-4-20250514")
  if (config.model !== undefined && config.model !== "") {
    args.push("--model", config.model);
  }

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

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Registry-compatible invoker for the OpenCode provider.
 *
 * Spawns the `opencode` CLI with `--output jsonl`, sets up the permission
 * bypass environment, enforces a hard timeout (Issue #8203 mitigation),
 * and normalizes the JSONL output to AgentResult.
 *
 * ## Process Lifecycle
 * 1. Check binary availability (fail fast with install instructions)
 * 2. Spawn process with OPENCODE_PERMISSION env and JSONL output mode
 * 3. Start hard timeout timer immediately (Issue #8203)
 * 4. Race process exit against hard timeout
 * 5. On timeout: log Issue #8203 message, SIGKILL via killProcessGracefully
 * 6. On normal exit: parse JSONL stdout and normalize to AgentResult
 *
 * Supervised mode is not yet implemented (returns empty AgentResult).
 *
 * @param options - Standard invocation options from the registry
 * @returns Normalized AgentResult
 * @throws Error if binary not found, process times out, exits non-zero, or JSONL is malformed
 */
async function invokeOpencode(
  options: InvocationOptions,
): Promise<AgentResult> {
  if (options.mode === "supervised") {
    // Supervised mode: OpenCode interactive session
    // Not yet implemented — would require stdio: inherit like Claude's chat mode
    return { costUsd: 0, durationMs: 0, result: "", sessionId: "" };
  }

  // Binary detection: fail fast with clear install instructions
  if (!(await checkOpencodeAvailable())) {
    throw new Error(
      "OpenCode binary not found in PATH.\n" +
        "Install: npm install -g opencode\n" +
        "See: https://opencode.ai for more information.",
    );
  }

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
    throw new Error(
      `OpenCode exited with code ${String(proc.exitCode)}: ${stderr || "(no stderr)"}`,
    );
  }

  const stdout = await stdoutPromise;
  return normalizeOpencodeResult(stdout);
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
  const tokens = finishEvent.part?.tokens;
  const tokenUsage: TokenUsage | undefined = tokens
    ? {
        cacheRead: tokens.cacheRead,
        cacheWrite: tokens.cacheWrite,
        input: tokens.input ?? 0,
        output: tokens.output ?? 0,
        reasoning: tokens.reasoning,
      }
    : undefined;

  return { costUsd, durationMs, result: resultText, sessionId, tokenUsage };
}

// =============================================================================
// Exports
// =============================================================================

export {
  buildOpencodeArguments,
  buildOpencodeEnv,
  checkOpencodeAvailable,
  DEFAULT_HARD_TIMEOUT_MS,
  invokeOpencode,
  normalizeOpencodeResult,
  OPENCODE_PERMISSION_VALUE,
  type OpencodeEvent,
};

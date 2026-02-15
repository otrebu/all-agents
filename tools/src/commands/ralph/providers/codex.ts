/**
 * OpenAI Codex provider implementation for Ralph
 *
 * Provides registry-compatible headless (`codex exec --json`) and supervised
 * (`codex exec`) execution paths with timeout handling, JSONL parsing,
 * and failure normalization.
 *
 * @see docs/planning/milestones/004-MULTI-CLI/providers/codex.md
 */
/* eslint-disable unicorn/no-nested-ternary, no-nested-ternary, function-name/starts-with-verb, @typescript-eslint/naming-convention, @typescript-eslint/init-declarations, @typescript-eslint/no-unnecessary-condition, no-continue, no-await-in-loop, promise/avoid-new, unicorn/no-array-callback-reference */

import type { ModelInfo } from "./models-static";
import type {
  AgentResult,
  CodexConfig,
  InvocationOptions,
  ProviderFailureOutcome,
  ProviderFailureReason,
  TokenUsage,
} from "./types";

import { cacheCodexSessionPayload } from "./session-codex";
import { killProcessGracefully, markTimerAsNonBlocking } from "./utils";

// =============================================================================
// Types
// =============================================================================

/** Parsed Codex JSONL event */
interface CodexEvent {
  /** Optional cost metadata */
  cost?: unknown;
  /** Failure metadata */
  error?: unknown;
  /** Nested item payload emitted by newer Codex JSONL streams */
  item?: { message?: unknown; text?: unknown; type?: string };
  /** Message or content payload */
  message?: unknown;
  /** Legacy/alternate text payload */
  output?: unknown;
  /** Alternative nested payload */
  part?: {
    message?: unknown;
    reason?: string;
    text?: unknown;
    textPrefix?: string;
    usage?: unknown;
    usageInfo?: unknown;
  };
  /** Failure reason */
  reason?: string;
  /** Inline text payload */
  text?: string;
  /** Alternate thread field */
  thread?: { id?: string };
  /** Final thread/session identifier */
  thread_id?: string;
  /** Optional timestamp */
  timestamp?: number;
  /** Event type discriminator */
  type?: string;
  /** Optional token metadata */
  usage?: unknown;
}

/** Parsed exit outcomes for headless execution */
type ExitOutcome = "exited" | "hard_timeout";

type TerminationSignal = "SIGINT" | "SIGTERM";

// =============================================================================
// Constants
// =============================================================================

/** Default hard timeout for Codex headless execution */
const DEFAULT_HARD_TIMEOUT_MS = 3_600_000;

const CODEX_DISCOVERY_COMMANDS: Array<Array<string>> = [
  ["models", "--json"],
  ["models", "list", "--json"],
  ["models"],
  ["model", "list"],
];

const CODEX_DISCOVERY_MODEL_PATTERN =
  /\b(?!https?:\/\/)[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9._-]+\b/gu;

/** Codex signal exit codes (128 + signal number) */
const SIGNAL_EXIT_CODE = { SIGINT: 130, SIGTERM: 143 } as const;
const OPENAI_MODEL_PREFIX = "openai/";

/** Failure heuristics for Codex output and error surfaces */
const CODEX_FAILURE_REASON_RULES: Array<{
  patterns: Array<string>;
  reason: ProviderFailureReason;
}> = [
  {
    patterns: ["interrupted", "sigint", "sigterm", "cancelled", "canceled"],
    reason: "interrupted",
  },
  { patterns: ["timed out", "timeout", "hard timeout"], reason: "timeout" },
  {
    patterns: [
      "api key",
      "unauthorized",
      "authentication",
      "forbidden",
      "invalid credentials",
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
    patterns: ["malformed", "parse", "json", "empty jsonl"],
    reason: "malformed_output",
  },
  {
    patterns: [
      "rate limit",
      "temporarily unavailable",
      "overloaded",
      "connection",
      "network",
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
      "not found in path",
      "install:",
      "not enabled",
      "configuration",
    ],
    reason: "configuration",
  },
];

/**
 * Build command arguments for Codex headless mode.
 */
function buildCodexHeadlessArguments(
  config: CodexConfig,
  prompt: string,
): Array<string> {
  const args = ["exec", "--json", "--full-auto", "--skip-git-repo-check"];

  if (config.model !== undefined && config.model !== "") {
    const normalizedModel = normalizeCodexModel(config.model);
    if (normalizedModel !== "") {
      args.push("--model", normalizedModel);
    }
  }

  args.push("--", prompt);
  return args;
}

/**
 * Build command arguments for Codex supervised mode.
 */
function buildCodexSupervisedArguments(
  config: CodexConfig,
  prompt: string,
): Array<string> {
  const args = ["exec", "--skip-git-repo-check"];

  if (config.model !== undefined && config.model !== "") {
    const normalizedModel = normalizeCodexModel(config.model);
    if (normalizedModel !== "") {
      args.push("--model", normalizedModel);
    }
  }

  args.push("--", prompt);
  return args;
}

/**
 * Check if `codex` binary is available in PATH.
 */
async function checkCodexAvailable(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", "codex"], {
      stderr: "pipe",
      stdout: "pipe",
    });
    return (await proc.exited) === 0;
  } catch {
    return false;
  }
}

function coerceCodexCostHint(
  record: Record<string, unknown>,
): ModelInfo["costHint"] {
  const input = readNumber(
    readNestedCost(record, "input") ??
      readNestedCost(record, "input_tokens") ??
      readNestedCost(record, "input_tokens_total"),
  );

  if (input === undefined) {
    return "standard";
  }

  if (input <= 0) {
    return "cheap";
  }
  if (input >= 10) {
    return "expensive";
  }
  return "standard";
}

/**
 * Read entire stream text while firing an activity callback on each chunk.
 */
async function collectStreamText(
  stream: ReadableStream<Uint8Array>,
  onActivity?: () => void,
): Promise<string> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  const chunks: Array<string> = [];

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      onActivity?.();
      chunks.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Ignore stream teardown errors
    }
  }

  return chunks.join("");
}

function dedupeById(models: Array<ModelInfo>): Array<ModelInfo> {
  const seen = new Set<string>();
  return models.filter((model) => {
    if (seen.has(model.id)) {
      return false;
    }
    seen.add(model.id);
    return true;
  });
}

function discoverCodexModels(): Array<ModelInfo> {
  if (!isCommandAvailable("codex")) {
    return [];
  }

  for (const command of CODEX_DISCOVERY_COMMANDS) {
    const output = runCodexDiscoveryCommand(command);
    if (output === null) {
      continue;
    }
    const models = parseCodexDiscoveryOutput(output);
    if (models.length > 0) {
      return models;
    }
  }

  return [];
}

/**
 * Enforce supervised TTY requirements for Codex.
 */
function ensureInteractiveTty(): void {
  const hasInteractiveTty = process.stdin.isTTY && process.stdout.isTTY;
  if (!hasInteractiveTty) {
    throw new Error(
      "Codex supervised mode requires an interactive TTY (stdin/stdout).\n" +
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

function extractCodexModelRecords(
  record: Record<string, unknown>,
): Array<unknown> {
  const candidateKeys = ["models", "items", "result", "data", "entries"];
  for (const key of candidateKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function extractFailureMessage(event: CodexEvent): string {
  if (isRecord(event.error)) {
    const nestedMessage = getNested(event.error, "message");
    if (typeof nestedMessage === "string" && nestedMessage.trim() !== "") {
      return parseStructuredErrorMessage(nestedMessage);
    }
  }

  const candidates = [
    event.message,
    event.reason,
    event.part?.reason,
    event.error,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      return parseStructuredErrorMessage(candidate);
    }
  }

  return "Codex turn failed.";
}

function extractTextFromEvent(event: CodexEvent): string {
  if (event.item !== undefined) {
    const itemType = typeof event.item.type === "string" ? event.item.type : "";
    if (itemType === "reasoning") {
      return "";
    }
    if (typeof event.item.text === "string" && event.item.text !== "") {
      return event.item.text;
    }
    if (typeof event.item.message === "string" && event.item.message !== "") {
      return event.item.message;
    }
  }

  if (typeof event.text === "string" && event.text !== "") {
    return event.text;
  }
  if (
    typeof event.output === "string" &&
    event.output !== "" &&
    event.output !== "[object Object]"
  ) {
    return event.output;
  }
  if (typeof event.message === "string" && event.message !== "") {
    return event.message;
  }
  if (event.part !== undefined) {
    if (typeof event.part.text === "string" && event.part.text !== "") {
      return event.part.text;
    }
    if (typeof event.part.message === "string" && event.part.message !== "") {
      return event.part.message;
    }
  }

  return "";
}

function extractThreadId(event: CodexEvent): string {
  if (typeof event.thread_id === "string" && event.thread_id !== "") {
    return event.thread_id;
  }

  if (
    event.thread !== undefined &&
    typeof event.thread.id === "string" &&
    event.thread.id !== ""
  ) {
    return event.thread.id;
  }

  return "";
}

function getCodexFailureReason(
  normalizedMessage: string,
): ProviderFailureReason | undefined {
  for (const rule of CODEX_FAILURE_REASON_RULES) {
    if (rule.patterns.some((pattern) => normalizedMessage.includes(pattern))) {
      return rule.reason;
    }
  }
  return undefined;
}

function getFailureMessageFromStdout(stdout: string): string {
  if (stdout.trim() === "") {
    return "";
  }

  try {
    const events = parseCodexEvents(stdout);
    const failedEvent = events.find(
      (event) => event.type === "turn.failed" || event.type === "error",
    );
    if (failedEvent === undefined) {
      return "";
    }
    return extractFailureMessage(failedEvent);
  } catch {
    return "";
  }
}

function getNested(record: Record<string, unknown>, key: string): unknown {
  const value = record[key];
  return value ?? undefined;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Registry-compatible Codex invoker.
 */
async function invokeCodex(options: InvocationOptions): Promise<AgentResult> {
  if (!(await checkCodexAvailable())) {
    throw new Error(
      "Codex binary not found in PATH.\n" +
        "Install: npm install -g @openai/codex\n" +
        "See: https://github.com/openai/codex-cli for more information.",
    );
  }

  if (options.mode === "supervised") {
    return invokeCodexSupervised(options);
  }

  return invokeCodexHeadless(options);
}

/**
 * Headless invocation path: `codex exec --json`.
 */
async function invokeCodexHeadless(
  options: InvocationOptions,
): Promise<AgentResult> {
  const config = options.config as CodexConfig;
  const args = buildCodexHeadlessArguments(config, options.prompt);
  const startTime = Date.now();
  const timeoutMs = config.timeoutMs ?? DEFAULT_HARD_TIMEOUT_MS;

  const proc = Bun.spawn(["codex", ...args], {
    cwd: config.workingDirectory,
    stderr: "pipe",
    stdin: "ignore",
    stdout: "pipe",
  });

  const stdoutPromise = new Response(proc.stdout).text();
  const stderrPromise = collectStreamText(proc.stderr);

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
    void killProcessGracefully(proc, 0);
  }

  function handleSigint(): void {
    handleInterrupt("SIGINT");
  }

  function handleSigterm(): void {
    handleInterrupt("SIGTERM");
  }

  process.prependListener("SIGINT", handleSigint);
  process.prependListener("SIGTERM", handleSigterm);

  const exitPromise: Promise<ExitOutcome> = (async (): Promise<ExitOutcome> => {
    try {
      await proc.exited;
      return "exited";
    } catch {
      return "exited";
    }
  })();

  const hardTimeoutPromise = new Promise<ExitOutcome>((resolve): void => {
    const timer = setTimeout(() => {
      resolve("hard_timeout");
    }, timeoutMs);
    markTimerAsNonBlocking(timer);
  });

  const outcome = await Promise.race([exitPromise, hardTimeoutPromise]).finally(
    () => {
      process.removeListener("SIGINT", handleSigint);
      process.removeListener("SIGTERM", handleSigterm);
    },
  );

  if (signalState.interruptedBy !== null) {
    return propagateInterruptToParent(signalState.interruptedBy);
  }

  if (outcome === "hard_timeout") {
    const elapsed = Date.now() - startTime;
    await killProcessGracefully(proc, 0);
    throw new Error(`Codex timed out after ${elapsed}ms`);
  }

  const stdout = await stdoutPromise;
  const stderr = await stderrPromise;

  if (proc.exitCode !== 0) {
    const failureFromStdout = getFailureMessageFromStdout(stdout);
    const trimmedStderr = stderr.trim();
    const details =
      failureFromStdout === ""
        ? trimmedStderr === ""
          ? stdout.trim()
          : trimmedStderr
        : failureFromStdout;
    throw new Error(
      `Codex exited with code ${String(proc.exitCode)}: ${details || "(no output)"}`,
    );
  }

  const result = normalizeCodexResult(stdout, Date.now() - startTime);
  cacheCodexSessionPayload(
    result.sessionId,
    stdout,
    config.workingDirectory ?? process.cwd(),
  );
  return result;
}

/**
 * Interactive Codex invocation path: `codex exec ...` (TTY required).
 */
async function invokeCodexSupervised(
  options: InvocationOptions,
): Promise<AgentResult> {
  ensureInteractiveTty();

  const config = options.config as CodexConfig;
  const args = buildCodexSupervisedArguments(config, options.prompt);
  const startTime = Date.now();

  const proc = Bun.spawn(["codex", ...args], {
    cwd: config.workingDirectory,
    stderr: "inherit",
    stdin: "inherit",
    stdout: "inherit",
  });

  await proc.exited;

  const durationMs = Date.now() - startTime;

  if (proc.signalCode === "SIGINT" || proc.signalCode === "SIGTERM") {
    return propagateInterruptToParent(proc.signalCode);
  }

  const interruptionFromExit = exitCodeToSignal(proc.exitCode);
  if (interruptionFromExit !== null) {
    return propagateInterruptToParent(interruptionFromExit);
  }

  if (proc.exitCode !== 0) {
    throw new Error(
      `Codex supervised session exited with code ${String(proc.exitCode)}`,
    );
  }

  return {
    costUsd: 0,
    durationMs,
    result: "",
    sessionId: "",
    tokenUsage: undefined,
  };
}

function isCommandAvailable(command: string): boolean {
  try {
    const proc = Bun.spawnSync(["which", command], {
      stderr: "pipe",
      stdout: "pipe",
    });
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Map Codex invocation failures into provider-neutral retry semantics.
 */
function mapCodexInvocationError(error: unknown): ProviderFailureOutcome {
  const message =
    error instanceof Error && error.message !== ""
      ? error.message
      : String(error);
  const normalized = message.toLowerCase();

  const reasonFromMessage =
    getCodexFailureReason(normalized) ??
    ("unknown" satisfies ProviderFailureReason);

  const status =
    reasonFromMessage === "timeout" || reasonFromMessage === "transport"
      ? "retryable"
      : "fatal";

  return { message, provider: "codex", reason: reasonFromMessage, status };
}

function normalizeCodexModel(model: string): string {
  const trimmed = model.trim();
  if (!trimmed.startsWith(OPENAI_MODEL_PREFIX)) {
    return trimmed;
  }

  const normalized = trimmed.slice(OPENAI_MODEL_PREFIX.length).trim();
  return normalized === "" ? trimmed : normalized;
}

/**
 * Parse Codex JSONL output and normalize to AgentResult.
 *
 * Expected event stream includes:
 * - thread.started (thread_id)
 * - turn.completed (successful answer)
 * - turn.failed (error)
 *
 * The parser concatenates text-like fields across all events and prefers
 * `turn.completed` to declare success; `turn.failed` always wins.
 */
function normalizeCodexResult(
  jsonlOutput: string,
  elapsedFallbackMs: number,
): AgentResult {
  const events = parseCodexEvents(jsonlOutput);

  const failedEvent = events.find((event) => event.type === "turn.failed");
  if (failedEvent !== undefined) {
    throw new Error(extractFailureMessage(failedEvent));
  }

  const completedEvent = events.find(
    (event) => event.type === "turn.completed",
  );
  if (completedEvent === undefined) {
    throw new Error("No turn.completed event found in Codex output");
  }

  const resultText = events.map(extractTextFromEvent).join("");
  if (resultText.trim() === "") {
    throw new Error("No final message found in Codex output");
  }

  const sessionId = extractThreadId(
    events.find((event) => event.type === "thread.started") ?? events[0] ?? {},
  );

  const startEvent = events.find((event) => event.type === "thread.started");
  const startTimestamp =
    typeof startEvent?.timestamp === "number"
      ? startEvent.timestamp
      : undefined;
  const finishTimestamp =
    typeof completedEvent.timestamp === "number"
      ? completedEvent.timestamp
      : undefined;
  const durationMs =
    startTimestamp === undefined || finishTimestamp === undefined
      ? elapsedFallbackMs
      : finishTimestamp - startTimestamp;

  const costCandidate = completedEvent.cost;
  const costUsd = typeof costCandidate === "number" ? costCandidate : 0;
  const usageCandidate = completedEvent.part?.usage ?? completedEvent.usage;
  const tokenUsage = toTokenUsage(usageCandidate);

  return { costUsd, durationMs, result: resultText, sessionId, tokenUsage };
}

function parseCodexDiscoveryOutput(output: string): Array<ModelInfo> {
  const discoveredAt = new Date().toISOString().split("T")[0] ?? "";
  const lines = output.trim();
  if (lines === "") {
    return [];
  }

  const models: Array<ModelInfo> = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(lines);
  } catch {
    parsed = null;
  }

  if (parsed === null) {
    for (const line of output.split("\n")) {
      models.push(...parseCodexModelLine(line, discoveredAt));
    }
    return dedupeById(models);
  }

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (isRecord(entry)) {
        const model = toModelFromCodexRecord(entry, discoveredAt);
        if (model !== null) {
          models.push(model);
        }
      }
    }
    return dedupeById(models);
  }

  if (isRecord(parsed)) {
    const nestedModels = extractCodexModelRecords(parsed);
    for (const entry of nestedModels) {
      if (isRecord(entry)) {
        const model = toModelFromCodexRecord(entry, discoveredAt);
        if (model !== null) {
          models.push(model);
        }
      }
    }

    if (models.length > 0) {
      return dedupeById(models);
    }

    const model = toModelFromCodexRecord(parsed, discoveredAt);
    if (model !== null) {
      return [model];
    }
  }

  return dedupeById(parseCodexModelLine(lines, discoveredAt));
}

function parseCodexEvents(jsonlOutput: string): Array<CodexEvent> {
  const lines = jsonlOutput.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    throw new Error("Empty JSONL output from Codex");
  }

  const events: Array<CodexEvent> = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line) as CodexEvent);
    } catch {
      throw new Error(
        `Malformed JSON line in Codex output: ${line.slice(0, 120)}`,
      );
    }
  }

  return events;
}

function parseCodexModelLine(
  line: string,
  discoveredAt: string,
): Array<ModelInfo> {
  const models: Array<ModelInfo> = [];
  for (const match of line.matchAll(CODEX_DISCOVERY_MODEL_PATTERN)) {
    const raw = match[0];
    if (raw === undefined) {
      continue;
    }
    models.push({
      cliFormat: raw,
      costHint: "standard",
      discoveredAt,
      id: raw,
      provider: "codex",
    });
  }
  return models;
}

function parseStructuredErrorMessage(rawMessage: string): string {
  const trimmed = rawMessage.trim();
  if (!trimmed.startsWith("{")) {
    return trimmed;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isRecord(parsed)) {
      const detail = getNested(parsed, "detail");
      if (typeof detail === "string" && detail.trim() !== "") {
        return detail.trim();
      }

      const message = getNested(parsed, "message");
      if (typeof message === "string" && message.trim() !== "") {
        return message.trim();
      }
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function propagateInterruptToParent(signal: TerminationSignal): never {
  try {
    process.kill(process.pid, signal);
  } catch {
    // Ignore kill failures and surface a descriptive fallback error.
  }

  throw new Error(`Codex supervised session interrupted by ${signal}`);
}

function readNestedCost(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const nested = getNested(record, "cost");
  if (!isRecord(nested)) {
    return undefined;
  }

  const nestedCost = getNested(nested, key);
  const inputCost = isRecord(nestedCost)
    ? getNested(nestedCost, "input")
    : undefined;
  if (readNumber(inputCost) !== undefined) {
    return readNumber(inputCost);
  }

  return readNumber(nestedCost);
}

// =============================================================================
// Main functions
// =============================================================================

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function runCodexDiscoveryCommand(command: Array<string>): null | string {
  try {
    const proc = Bun.spawnSync(["codex", ...command], {
      stderr: "pipe",
      stdout: "pipe",
    });
    if (proc.exitCode !== 0) {
      return null;
    }

    const output = new TextDecoder().decode(proc.stdout);
    return output.trim();
  } catch {
    return null;
  }
}

function toModelFromCodexRecord(
  record: Record<string, unknown>,
  discoveredAt: string,
): ModelInfo | null {
  const providerId =
    readString(record.providerID) ??
    readString(record.provider_id) ??
    readString(record.provider);
  const rawId =
    readString(record.id) ??
    readString(record.model) ??
    readString(record.model_id) ??
    readString(record.name);
  if (rawId === undefined) {
    return null;
  }

  const cliFormat = rawId.includes("/")
    ? rawId
    : providerId === undefined
      ? rawId
      : `${providerId}/${rawId}`;
  if (cliFormat.includes(" ")) {
    return null;
  }

  return {
    cliFormat,
    costHint: coerceCodexCostHint(record),
    discoveredAt,
    id: cliFormat,
    provider: "codex",
  };
}

function toTokenUsage(usage: unknown): TokenUsage | undefined {
  if (usage === null || usage === undefined || typeof usage !== "object") {
    return undefined;
  }

  const parsed = usage as Record<string, unknown>;
  const input =
    typeof parsed.input === "number"
      ? parsed.input
      : typeof parsed.prompt_tokens === "number"
        ? parsed.prompt_tokens
        : undefined;
  const output =
    typeof parsed.output === "number"
      ? parsed.output
      : typeof parsed.completion_tokens === "number"
        ? parsed.completion_tokens
        : undefined;

  if (input === undefined && output === undefined) {
    return undefined;
  }

  const reasoning =
    typeof parsed.reasoning === "number"
      ? parsed.reasoning
      : typeof parsed.reasoning_tokens === "number"
        ? parsed.reasoning_tokens
        : undefined;

  const cacheRead =
    typeof parsed.cacheRead === "number"
      ? parsed.cacheRead
      : typeof parsed.cache_read === "number"
        ? parsed.cache_read
        : undefined;
  const cacheWrite =
    typeof parsed.cacheWrite === "number"
      ? parsed.cacheWrite
      : typeof parsed.cache_write === "number"
        ? parsed.cache_write
        : undefined;
  const resolvedInput = input ?? 0;
  const resolvedOutput = output ?? 0;

  return {
    cacheRead,
    cacheWrite,
    input: resolvedInput,
    output: resolvedOutput,
    reasoning,
  };
}

// =============================================================================
// Exports
// =============================================================================

export {
  buildCodexHeadlessArguments,
  buildCodexSupervisedArguments,
  checkCodexAvailable,
  DEFAULT_HARD_TIMEOUT_MS,
  discoverCodexModels,
  invokeCodex,
  invokeCodexHeadless,
  invokeCodexSupervised,
  mapCodexInvocationError,
  normalizeCodexResult,
  parseCodexEvents,
};

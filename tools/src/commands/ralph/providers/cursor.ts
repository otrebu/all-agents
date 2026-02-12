import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  AgentResult,
  CursorConfig,
  InvocationOptions,
  TokenUsage,
} from "./types";

import { executeWithTimeout, parseJsonl } from "./utils";

interface CursorEvent extends Record<string, unknown> {
  content?: unknown;
  cost?: unknown;
  duration_ms?: unknown;
  result?: unknown;
  session_id?: unknown;
  text?: unknown;
  type?: unknown;
  usage?: unknown;
}

type CursorSignal = "SIGINT" | "SIGTERM";

const CURSOR_BINARY_CANDIDATES = ["agent", "cursor-agent"] as const;
const DEFAULT_CURSOR_TIMEOUT_MS = 3_600_000;
const RALPH_CURSOR_SESSION_DIR = ".ralph/sessions/cursor";
const SIGNAL_EXIT_CODE = { SIGINT: 130, SIGTERM: 143 } as const;

function buildCursorHeadlessArguments(
  config: CursorConfig,
  prompt: string,
): Array<string> {
  const args = ["-p", "--output-format", "stream-json"];

  if (config.model !== undefined && config.model !== "") {
    args.push("--model", config.model);
  }

  args.push("--", prompt);
  return args;
}

function buildCursorSupervisedArguments(
  config: CursorConfig,
  prompt: string,
): Array<string> {
  const args: Array<string> = [];

  if (config.model !== undefined && config.model !== "") {
    args.push("--model", config.model);
  }

  if (prompt !== "") {
    args.push("--", prompt);
  }

  return args;
}

async function checkCursorBinaryAvailable(binary: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", binary], {
      stderr: "pipe",
      stdout: "pipe",
    });
    return (await proc.exited) === 0;
  } catch {
    return false;
  }
}

function ensureInteractiveTty(): void {
  const hasInteractiveTty = process.stdin.isTTY && process.stdout.isTTY;
  if (!hasInteractiveTty) {
    throw new Error(
      "Cursor supervised mode requires an interactive TTY (stdin/stdout).\n" +
        "Run this command in a terminal session, or use '--headless' for non-interactive environments.",
    );
  }
}

function exitCodeToSignal(
  exitCode: null | number | undefined,
): CursorSignal | null {
  if (exitCode === SIGNAL_EXIT_CODE.SIGINT) {
    return "SIGINT";
  }
  if (exitCode === SIGNAL_EXIT_CODE.SIGTERM) {
    return "SIGTERM";
  }
  return null;
}

function extractCursorTokenUsage(payload: CursorEvent): TokenUsage | undefined {
  const { usage } = payload;
  if (!isRecord(usage)) {
    return undefined;
  }

  const input =
    readNumber(usage, ["input_tokens", "inputTokens", "input"]) ??
    readNumber(usage, ["prompt_tokens"]);
  const output = readNumber(usage, [
    "output_tokens",
    "outputTokens",
    "output",
    "completion_tokens",
  ]);

  if (input === undefined && output === undefined) {
    return undefined;
  }

  const cache = isRecord(usage.cache) ? usage.cache : undefined;
  const cacheRead =
    readNumber(usage, ["cache_read", "cacheRead"]) ??
    (cache === undefined ? undefined : readNumber(cache, ["read"]));
  const cacheWrite =
    readNumber(usage, ["cache_write", "cacheWrite"]) ??
    (cache === undefined ? undefined : readNumber(cache, ["write"]));
  const reasoning = readNumber(usage, ["reasoning_tokens", "reasoning"]);

  return {
    cacheRead,
    cacheWrite,
    input: input ?? 0,
    output: output ?? 0,
    reasoning,
  };
}

async function invokeCursor(options: InvocationOptions): Promise<AgentResult> {
  if (options.mode === "supervised") {
    return invokeCursorSupervised(options);
  }

  return invokeCursorHeadless(options);
}

async function invokeCursorHeadless(
  options: InvocationOptions,
): Promise<AgentResult> {
  const config = options.config as CursorConfig;
  const binary = await resolveCursorBinary();

  if (binary === undefined) {
    throw new Error(
      "Cursor binary not found in PATH. Tried: agent, cursor-agent.\n" +
        "Install Cursor and ensure either binary is available on PATH.",
    );
  }

  const timeoutMs = config.timeoutMs ?? DEFAULT_CURSOR_TIMEOUT_MS;
  const execution = await executeWithTimeout({
    args: buildCursorHeadlessArguments(config, options.prompt),
    command: binary,
    cwd: config.workingDirectory,
    gracePeriodMs: 0,
    stallDetection: { hardTimeoutMs: timeoutMs, stallTimeoutMs: 0 },
  });

  if (execution.timedOut) {
    throw new Error(
      `Cursor timed out after ${execution.durationMs}ms. ` +
        "This may indicate a non-interactive Cursor hang.",
    );
  }

  if (execution.exitCode !== 0) {
    const details = execution.stdout.trim();
    throw new Error(
      `Cursor exited with code ${String(execution.exitCode)}: ${details || "(no output)"}`,
    );
  }

  const result = normalizeCursorResult(execution.stdout);
  if (config.persistSession !== false) {
    const workingDirectory = config.workingDirectory ?? process.cwd();
    saveCursorSessionPayload(
      result.sessionId,
      workingDirectory,
      execution.stdout,
    );
  }
  return result;
}

async function invokeCursorSupervised(
  options: InvocationOptions,
): Promise<AgentResult> {
  ensureInteractiveTty();

  const config = options.config as CursorConfig;
  const binary = await resolveCursorBinary();

  if (binary === undefined) {
    throw new Error(
      "Cursor binary not found in PATH. Tried: agent, cursor-agent.\n" +
        "Install Cursor and ensure either binary is available on PATH.",
    );
  }

  const args = buildCursorSupervisedArguments(config, options.prompt);
  const startTime = Date.now();

  const proc = Bun.spawn([binary, ...args], {
    cwd: config.workingDirectory,
    stderr: "inherit",
    stdin: "inherit",
    stdout: "inherit",
  });

  await proc.exited;

  const durationMs = Date.now() - startTime;

  if (proc.signalCode === "SIGINT" || proc.signalCode === "SIGTERM") {
    throw new Error(
      `Cursor supervised session interrupted by ${proc.signalCode}`,
    );
  }

  const interruptionFromExit = exitCodeToSignal(proc.exitCode);
  if (interruptionFromExit !== null) {
    throw new Error(
      `Cursor supervised session interrupted by ${interruptionFromExit}`,
    );
  }

  if (proc.exitCode !== 0) {
    throw new Error(
      `Cursor supervised session exited with code ${String(proc.exitCode)}`,
    );
  }

  return { costUsd: 0, durationMs, result: "", sessionId: "" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeCursorResult(rawOutput: string): AgentResult {
  const trimmed = rawOutput.trim();
  if (trimmed === "") {
    throw new Error("Empty output from Cursor");
  }

  const parsed = tryParseJsonPayload(trimmed);
  if (parsed !== undefined) {
    return normalizeCursorStructuredPayload(parsed);
  }

  const events = parseJsonl<CursorEvent>(trimmed).filter((event) =>
    isRecord(event),
  );
  if (events.length === 0) {
    throw new Error(
      "Unable to parse Cursor output as JSON or JSONL structured payload",
    );
  }

  return normalizeCursorStructuredPayload(events);
}

function normalizeCursorStructuredPayload(payload: unknown): AgentResult {
  const events = Array.isArray(payload)
    ? payload.filter((entry): entry is CursorEvent => isRecord(entry))
    : [payload].filter((entry): entry is CursorEvent => isRecord(entry));

  if (events.length === 0) {
    throw new Error("Cursor output did not contain a JSON object payload");
  }

  const resultEvent =
    events.findLast((entry) => readString(entry, ["type"]) === "result") ??
    events.findLast((entry) => readString(entry, ["result"]) !== undefined) ??
    events.at(-1);

  const assistantText = events
    .filter((entry) => readString(entry, ["type"]) === "assistant")
    .map((entry) => readString(entry, ["content", "text"]) ?? "")
    .join("");

  const text =
    (resultEvent === undefined
      ? undefined
      : readString(resultEvent, ["result", "content", "text", "message"])) ??
    assistantText;

  const durationMs =
    (resultEvent === undefined
      ? undefined
      : readNumber(resultEvent, ["duration_ms", "durationMs"])) ?? 0;

  const costUsd =
    (resultEvent === undefined
      ? undefined
      : readNumber(resultEvent, [
          "total_cost_usd",
          "cost_usd",
          "costUsd",
          "cost",
        ])) ?? 0;

  const sessionId =
    (resultEvent === undefined
      ? undefined
      : readString(resultEvent, [
          "session_id",
          "sessionId",
          "chat_id",
          "chatId",
        ])) ??
    events
      .map((entry) =>
        readString(entry, ["session_id", "sessionId", "chat_id", "chatId"]),
      )
      .find((value): value is string => value !== undefined) ??
    "";

  const tokenUsage =
    resultEvent === undefined
      ? undefined
      : extractCursorTokenUsage(resultEvent);

  return { costUsd, durationMs, result: text, sessionId, tokenUsage };
}

function readNumber(
  payload: Record<string, unknown>,
  keys: Array<string>,
): number | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function readString(
  payload: Record<string, unknown>,
  keys: Array<string>,
): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return undefined;
}

async function resolveCursorBinary(): Promise<string | undefined> {
  for (const candidate of CURSOR_BINARY_CANDIDATES) {
    // eslint-disable-next-line no-await-in-loop -- candidate fallback order is intentional
    if (await checkCursorBinaryAvailable(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function saveCursorSessionPayload(
  sessionId: string,
  workingDirectory: string,
  payload: string,
): void {
  if (sessionId === "" || payload.trim() === "") {
    return;
  }

  try {
    const sessionDirectory = path.join(
      workingDirectory,
      RALPH_CURSOR_SESSION_DIR,
    );
    mkdirSync(sessionDirectory, { recursive: true });
    writeFileSync(
      path.join(sessionDirectory, `${sessionId}.jsonl`),
      payload,
      "utf8",
    );
  } catch {
    // Best-effort persistence for post-iteration telemetry.
  }
}

function tryParseJsonPayload(rawOutput: string): unknown {
  try {
    return JSON.parse(rawOutput) as unknown;
  } catch {
    return undefined;
  }
}

export {
  buildCursorHeadlessArguments,
  buildCursorSupervisedArguments,
  checkCursorBinaryAvailable,
  CURSOR_BINARY_CANDIDATES,
  DEFAULT_CURSOR_TIMEOUT_MS,
  ensureInteractiveTty,
  extractCursorTokenUsage,
  invokeCursor,
  invokeCursorHeadless,
  invokeCursorSupervised,
  normalizeCursorResult,
  resolveCursorBinary,
  saveCursorSessionPayload,
};

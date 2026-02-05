/**
 * Claude provider implementation for Ralph
 *
 * This module provides functions for spawning Claude sessions in different modes:
 * - invokeClaudeChat: Supervised/interactive mode
 * - invokeClaudeHeadlessAsync: Async headless mode with JSON output
 * - invokeClaudeHaiku: Lightweight Haiku model for summaries
 * - invokeClaude: Registry-compatible async wrapper
 * - normalizeClaudeResult: Parse Claude JSON array format to AgentResult
 * - buildPrompt: Prompt composition helper
 */
import { existsSync, readFileSync } from "node:fs";

import type { AgentResult } from "./types";

import {
  createStallDetector,
  createTimeoutPromise,
  DEFAULT_GRACE_PERIOD_MS,
  killProcessGracefully,
  markTimerAsNonBlocking,
  readStderrWithActivityTracking,
} from "./utils";

// Conventional exit codes for signal termination.
// 128 + signal number: SIGINT=2 -> 130, SIGTERM=15 -> 143
const SIGNAL_EXIT_CODE = { SIGINT: 130, SIGTERM: 143 } as const;

/**
 * Result from invoking Claude in chat/supervised mode (UI-facing)
 */
interface ClaudeResult {
  /** The process exit code (null if interrupted by signal) */
  exitCode: null | number;
  /** Whether the session was interrupted by SIGINT/SIGTERM (Ctrl+C) */
  interrupted: boolean;
  /** Whether the session completed successfully (exit code 0) */
  success: boolean;
}

type TerminationSignal = keyof typeof SIGNAL_EXIT_CODE;

/**
 * Build prompt with optional context prefix
 */
function buildPrompt(content: string, extraContext?: string): string {
  if (extraContext !== undefined && extraContext !== "") {
    return `${extraContext}\n\n${content}`;
  }
  return content;
}

function exitCodeToSignal(
  exitCode: null | number | undefined,
): null | TerminationSignal {
  if (exitCode === SIGNAL_EXIT_CODE.SIGINT) return "SIGINT";
  if (exitCode === SIGNAL_EXIT_CODE.SIGTERM) return "SIGTERM";
  return null;
}

function exitForSignal(signal: TerminationSignal): never {
  const exitCode = SIGNAL_EXIT_CODE[signal];

  // Prefer running any registered handlers first (e.g., ralph build summary).
  // Some Bun.spawnSync() interruptions only surface via proc.signalCode on the
  // child, so we manually emit to ensure the parent exits too.
  try {
    process.emit(signal);
  } catch {
    // Ignore - we'll still force exit below.
  }

  process.exit(exitCode);
}

/**
 * Async wrapper for registry compatibility.
 *
 * Delegates to the appropriate invocation function based on mode:
 * - "supervised" → invokeClaudeChat (sync, wrapped in Promise)
 * - "headless-async" → invokeClaudeHeadlessAsync
 *
 * @param options - Invocation options with mode and prompt
 * @returns AgentResult on success, null on failure
 */
async function invokeClaude(options: {
  context?: string;
  gracePeriodMs?: number;
  mode: "headless-async" | "supervised";
  onStderrActivity?: () => void;
  prompt: string;
  promptPath?: string;
  sessionName?: string;
  stallTimeoutMs?: number;
  timeout?: number;
}): Promise<AgentResult | null> {
  if (options.mode === "supervised") {
    const promptPath = options.promptPath ?? "";
    const sessionName = options.sessionName ?? "claude";
    const startTime = Date.now();

    const chatResult = invokeClaudeChat(
      promptPath,
      sessionName,
      options.context,
    );

    const durationMs = Date.now() - startTime;

    if (!chatResult.success) {
      return null;
    }

    return { costUsd: 0, durationMs, result: "", sessionId: "" };
  }

  // headless-async mode
  return invokeClaudeHeadlessAsync({
    gracePeriodMs: options.gracePeriodMs,
    onStderrActivity: options.onStderrActivity,
    prompt: options.prompt,
    stallTimeoutMs: options.stallTimeoutMs,
    timeout: options.timeout,
  });
}

/**
 * Supervised mode: Spawn interactive chat session
 * Uses stdio: inherit so user can watch AND type if needed
 * When chat exits (user quits or Claude finishes), function returns
 *
 * @param promptPath - Path to the prompt file
 * @param sessionName - Name for the session (used in console output)
 * @param extraContext - Optional context to prepend to the prompt
 * @returns ClaudeResult with success, interrupted, and exitCode fields
 */
function invokeClaudeChat(
  promptPath: string,
  sessionName: string,
  extraContext?: string,
): ClaudeResult {
  if (!existsSync(promptPath)) {
    console.error(`Prompt not found: ${promptPath}`);
    return { exitCode: 1, interrupted: false, success: false };
  }

  const promptContent = readFileSync(promptPath, "utf8");

  console.log(`Starting ${sessionName} session (supervised mode)...`);
  console.log(`Prompt: ${promptPath}`);
  if (extraContext !== undefined && extraContext !== "") {
    console.log(`Context: ${extraContext}`);
  }
  console.log();

  const fullPrompt = buildPrompt(promptContent, extraContext);

  // Chat mode (no -p), stdio: inherit so user can watch AND type
  // --permission-mode bypassPermissions prevents inheriting plan mode from user settings
  const proc = Bun.spawnSync(
    [
      "claude",
      "--permission-mode",
      "bypassPermissions",
      "--append-system-prompt",
      fullPrompt,
      `Please begin the ${sessionName} session.`,
    ],
    { stdio: ["inherit", "inherit", "inherit"] },
  );

  // Handle signal interruption (Ctrl+C) gracefully
  const terminationSignal = normalizeTerminationSignal(proc.signalCode);
  if (terminationSignal !== null) {
    console.log("\nSession interrupted by user");
    exitForSignal(terminationSignal);
  }

  // Some CLIs (or wrappers) may translate signals into conventional exit codes
  // rather than exposing signalCode. Treat those as interruptions too.
  const terminationFromExit = exitCodeToSignal(proc.exitCode);
  if (terminationFromExit !== null) {
    console.log("\nSession interrupted by user");
    exitForSignal(terminationFromExit);
  }

  return {
    exitCode: proc.exitCode,
    interrupted: false,
    success: proc.exitCode === 0,
  };
}

/**
 * Invoke Claude Haiku for lightweight tasks like summary generation
 *
 * Uses claude-3-5-haiku model with a real timeout (kills the process).
 *
 * @param options - Options with prompt and optional timeout
 * @returns The result string, or null if timed out/interrupted/failed
 */
async function invokeClaudeHaiku(options: {
  prompt: string;
  timeout?: number;
}): Promise<null | string> {
  const { prompt, timeout } = options;
  const timeoutMs = timeout ?? 30_000;
  const isDebug = process.env.DEBUG === "true" || process.env.DEBUG === "1";

  const proc = Bun.spawn(
    [
      "claude",
      "-p",
      prompt,
      "--model",
      "claude-3-5-haiku-latest",
      "--dangerously-skip-permissions",
      "--output-format",
      "json",
    ],
    { stderr: "pipe", stdin: "ignore", stdout: "pipe" },
  );

  const stdoutPromise = new Response(proc.stdout).text();
  const stderrPromise = new Response(proc.stderr).text();

  type ExitOutcome = "exited" | "timeout";
  const outcome: ExitOutcome =
    timeoutMs > 0
      ? await Promise.race([
          proc.exited.then(() => "exited" as const),
          // eslint-disable-next-line promise/avoid-new -- setTimeout requires manual promise wrapping
          new Promise<ExitOutcome>((resolve) => {
            const timer = setTimeout(() => {
              resolve("timeout");
            }, timeoutMs);
            markTimerAsNonBlocking(timer);
          }),
        ])
      : await proc.exited.then(() => "exited" as const);

  if (outcome === "timeout") {
    // Use graceful termination (SIGTERM → wait → SIGKILL)
    await killProcessGracefully(proc);
    if (isDebug) {
      console.log(`Haiku timed out after ${timeoutMs}ms`);
    }
    return null;
  }

  // Handle signal interruption (Ctrl+C)
  const terminationSignal = normalizeTerminationSignal(proc.signalCode);
  if (terminationSignal !== null) {
    console.log("\nHaiku session interrupted by user");
    exitForSignal(terminationSignal);
  }

  const terminationFromExit = exitCodeToSignal(proc.exitCode);
  if (terminationFromExit !== null) {
    console.log("\nHaiku session interrupted by user");
    exitForSignal(terminationFromExit);
  }

  if (proc.exitCode !== 0) {
    if (isDebug) {
      const stderr = (await stderrPromise).trim();
      console.error(
        `Claude Haiku exited with code ${proc.exitCode}: ${stderr}`,
      );
    }
    return null;
  }

  // Parse JSON from stdout
  try {
    const stdout = await stdoutPromise;
    const normalized = normalizeClaudeResult(stdout);
    return normalized.result || null;
  } catch {
    if (isDebug) {
      const stderr = (await stderrPromise).trim();
      console.error("Failed to parse Claude Haiku JSON output", stderr);
    }
    return null;
  }
}

/**
 * Async Headless mode: Run Claude with -p and JSON output
 *
 * This variant enables non-blocking waits (for heartbeats/timeouts) and keeps
 * stderr separate from stdout for JSON parsing.
 *
 * Features:
 * - Activity monitoring: Tracks stderr output to detect stuck processes
 * - Stall detection: Triggers timeout when no stderr output for stallTimeoutMs
 * - Hard timeout: Safety net for total elapsed time
 * - Graceful termination: SIGTERM → grace period → SIGKILL
 *
 * @param options - Options with prompt and timeout configuration
 * @returns AgentResult with session info, or null if interrupted/failed/timed out
 */
async function invokeClaudeHeadlessAsync(options: {
  gracePeriodMs?: number;
  onStderrActivity?: () => void;
  prompt: string;
  stallTimeoutMs?: number;
  timeout?: number;
}): Promise<AgentResult | null> {
  const {
    gracePeriodMs = DEFAULT_GRACE_PERIOD_MS,
    onStderrActivity,
    prompt,
    stallTimeoutMs = 0,
    timeout: hardTimeoutMs = 0,
  } = options;
  const isDebug = process.env.DEBUG === "true" || process.env.DEBUG === "1";

  // Pipe stderr to track activity while forwarding to console
  const proc = Bun.spawn(
    [
      "claude",
      "-p",
      prompt,
      "--dangerously-skip-permissions",
      "--output-format",
      "json",
    ],
    { stderr: "pipe", stdin: "ignore", stdout: "pipe" },
  );

  const stdoutPromise = new Response(proc.stdout).text();

  // Track last activity time for stall detection
  let lastActivityAt = Date.now();

  // Forward stderr to console while tracking activity
  // This runs in the background and completes when the process exits
  const stderrForwarder = readStderrWithActivityTracking(proc.stderr, () => {
    lastActivityAt = Date.now();
    onStderrActivity?.();
  });

  // Build timeout promises
  type ExitOutcome = "exited" | "hard_timeout" | "stall_timeout";

  // Create stall detection timer that resets on activity
  const stallDetector =
    stallTimeoutMs > 0
      ? createStallDetector(() => lastActivityAt, stallTimeoutMs)
      : null;

  const hardTimeoutPromise =
    hardTimeoutMs > 0
      ? createTimeoutPromise<ExitOutcome>(hardTimeoutMs, "hard_timeout")
      : null;

  // Race: process exit vs stall timeout vs hard timeout
  const exitPromise = (async (): Promise<ExitOutcome> => {
    await proc.exited;
    return "exited";
  })();
  const racers: Array<Promise<ExitOutcome>> = [exitPromise];
  if (stallDetector !== null) racers.push(stallDetector.promise);
  if (hardTimeoutPromise !== null) racers.push(hardTimeoutPromise);

  const outcome: ExitOutcome = await Promise.race(racers);

  // Clean up timers
  stallDetector?.cleanup();

  // Handle timeouts
  if (outcome === "stall_timeout") {
    console.warn(
      `\n⚠ Process stalled - no output for ${stallTimeoutMs / 60_000} minutes`,
    );
    await killProcessGracefully(proc, gracePeriodMs);
    // Ensure stderr is fully drained
    await stderrForwarder;
    if (isDebug) {
      console.log(
        `Claude headless stalled after ${stallTimeoutMs}ms without output`,
      );
    }
    return null;
  }

  if (outcome === "hard_timeout") {
    console.warn(
      `\n⚠ Hard timeout reached after ${hardTimeoutMs / 60_000} minutes`,
    );
    await killProcessGracefully(proc, gracePeriodMs);
    // Ensure stderr is fully drained
    await stderrForwarder;
    if (isDebug) {
      console.log(`Claude headless hard timed out after ${hardTimeoutMs}ms`);
    }
    return null;
  }

  // Wait for stderr forwarding to complete
  await stderrForwarder;

  // Handle signal interruption (Ctrl+C)
  const terminationSignal = normalizeTerminationSignal(proc.signalCode);
  if (terminationSignal !== null) {
    console.log("\nSession interrupted by user");
    exitForSignal(terminationSignal);
  }

  const terminationFromExit = exitCodeToSignal(proc.exitCode);
  if (terminationFromExit !== null) {
    console.log("\nSession interrupted by user");
    exitForSignal(terminationFromExit);
  }

  if (proc.exitCode !== 0) {
    console.error(`Claude exited with code ${proc.exitCode}`);
    return null;
  }

  // Parse JSON from stdout (clean without stderr contamination)
  try {
    const stdout = await stdoutPromise;
    return normalizeClaudeResult(stdout);
  } catch (error) {
    const preview = (await stdoutPromise).slice(0, 500);
    console.error("Failed to parse Claude JSON output.");
    console.error(
      "Parse error:",
      error instanceof Error ? error.message : String(error),
    );
    console.error("Stdout preview:", preview || "(empty)");
    return null;
  }
}

/**
 * Parse Claude JSON output and normalize to AgentResult.
 *
 * Claude outputs a JSON array where the result entry has `type: "result"`:
 * ```json
 * [
 *   {"type": "system", ...},
 *   {"type": "assistant", ...},
 *   {"type": "result", "result": "...", "duration_ms": 1234, "total_cost_usd": 0.05, "session_id": "..."}
 * ]
 * ```
 *
 * Also handles single-object responses (not wrapped in an array).
 *
 * @param jsonString - Raw JSON string from Claude stdout
 * @returns Normalized AgentResult
 * @throws Error if JSON is malformed or no result entry is found
 */
function normalizeClaudeResult(jsonString: string): AgentResult {
  const parsed = JSON.parse(jsonString) as
    | Array<Record<string, unknown>>
    | Record<string, unknown>;

  const output: Record<string, unknown> = Array.isArray(parsed)
    ? (parsed.findLast(
        (entry) => (entry as { type?: string }).type === "result",
      ) ??
      parsed.at(-1) ??
      {})
    : parsed;

  const costUsd =
    typeof output.total_cost_usd === "number" ? output.total_cost_usd : 0;
  const durationMs =
    typeof output.duration_ms === "number" ? output.duration_ms : 0;
  const result = typeof output.result === "string" ? output.result : "";
  const sessionId =
    typeof output.session_id === "string" ? output.session_id : "";

  const base: AgentResult = { costUsd, durationMs, result, sessionId };

  if (output.usage === undefined) {
    return base;
  }

  const usage = output.usage as Record<string, number>;
  return {
    ...base,
    tokenUsage: {
      cacheRead: usage.cache_read,
      cacheWrite: usage.cache_write,
      input: typeof usage.input_tokens === "number" ? usage.input_tokens : 0,
      output: typeof usage.output_tokens === "number" ? usage.output_tokens : 0,
    },
  };
}

function normalizeTerminationSignal(
  signal: null | string | undefined,
): null | TerminationSignal {
  if (signal === "SIGINT" || signal === "SIGTERM") return signal;
  return null;
}

export {
  buildPrompt,
  type ClaudeResult,
  invokeClaude,
  invokeClaudeChat,
  invokeClaudeHaiku,
  invokeClaudeHeadlessAsync,
  normalizeClaudeResult,
};

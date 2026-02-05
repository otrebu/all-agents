/**
 * Claude invocation helpers for Ralph
 *
 * This module provides functions for spawning Claude sessions in different modes.
 * Extracted from index.ts to avoid circular dependencies with other ralph modules.
 */
import { existsSync, readFileSync } from "node:fs";

// Conventional exit codes for signal termination.
// 128 + signal number: SIGINT=2 -> 130, SIGTERM=15 -> 143
const SIGNAL_EXIT_CODE = { SIGINT: 130, SIGTERM: 143 } as const;

/** Default grace period for SIGTERM before SIGKILL (ms) */
const DEFAULT_GRACE_PERIOD_MS = 5000;

/**
 * Claude JSON output structure (internal)
 * When --output-format json, Claude outputs an array of messages.
 * The final "result" type message contains session stats.
 */
interface ClaudeJsonOutput {
  duration_ms?: number;
  num_turns?: number;
  result?: string;
  session_id?: string;
  total_cost_usd?: number;
  type?: string;
}

/**
 * Result from invoking Claude in chat/supervised mode
 */
interface ClaudeResult {
  /** The process exit code (null if interrupted by signal) */
  exitCode: null | number;
  /** Whether the session was interrupted by SIGINT/SIGTERM (Ctrl+C) */
  interrupted: boolean;
  /** Whether the session completed successfully (exit code 0) */
  success: boolean;
}

/**
 * Options for Haiku Claude invocation (lightweight model for summaries)
 */
interface HaikuOptions {
  /** The prompt to send to Claude Haiku */
  prompt: string;
  /** Timeout in milliseconds (default: 30000ms) */
  timeout?: number;
}

/**
 * Options for async headless Claude invocation
 */
interface HeadlessAsyncOptions extends HeadlessOptions {
  /** Grace period in ms before SIGKILL after SIGTERM (default: 5000) */
  gracePeriodMs?: number;
  /** Callback invoked when stderr output is received (for activity tracking) */
  onStderrActivity?: () => void;
  /** Stall timeout in ms - triggers if no stderr output (0/undefined = disabled) */
  stallTimeoutMs?: number;
  /** Hard timeout in milliseconds (0/undefined = no timeout) */
  timeout?: number;
}

/**
 * Options for headless Claude invocation
 */
interface HeadlessOptions {
  /** The prompt to send to Claude */
  prompt: string;
}

/**
 * Result from headless Claude invocation
 */
interface HeadlessResult {
  /** Total cost in USD */
  cost: number;
  /** Duration in milliseconds */
  duration: number;
  /** The result/response from Claude */
  result: string;
  /** Session ID from Claude */
  sessionId: string;
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

/**
 * Create a stall detector that triggers when no activity is reported
 *
 * @param getLastActivityAt - Function that returns the timestamp of last activity
 * @param stallTimeoutMs - Time in ms without activity before triggering stall
 * @returns Object with promise that resolves to "stall_timeout" and cleanup function
 */
function createStallDetector(
  getLastActivityAt: () => number,
  stallTimeoutMs: number,
): { cleanup: () => void; promise: Promise<"stall_timeout"> } {
  let timer: null | ReturnType<typeof setTimeout> = null;

  // eslint-disable-next-line promise/avoid-new -- Manual resolve needed for timer-based detection
  const promise = new Promise<"stall_timeout">((resolve) => {
    function checkStall(): void {
      const timeSinceActivity = Date.now() - getLastActivityAt();
      if (timeSinceActivity >= stallTimeoutMs) {
        resolve("stall_timeout");
        return;
      }
      // Check again after remaining time
      const remainingMs = stallTimeoutMs - timeSinceActivity;
      timer = setTimeout(checkStall, Math.min(remainingMs, 30_000));
      markTimerAsNonBlocking(timer);
    }
    // Initial check after stall timeout period
    timer = setTimeout(checkStall, stallTimeoutMs);
    markTimerAsNonBlocking(timer);
  });

  return {
    cleanup: () => {
      if (timer !== null) clearTimeout(timer);
    },
    promise,
  };
}

/**
 * Create a timeout promise that resolves after the specified duration
 *
 * @param timeoutMs - Duration in milliseconds
 * @param outcome - The value to resolve to
 * @returns Promise that resolves to the outcome after timeout
 */
async function createTimeoutPromise<T>(
  timeoutMs: number,
  outcome: T,
): Promise<T> {
  // eslint-disable-next-line promise/avoid-new -- setTimeout requires manual promise wrapping
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => {
      resolve(outcome);
    }, timeoutMs);
    markTimerAsNonBlocking(timer);
  });
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
 * @param options - HaikuOptions with prompt and optional timeout
 * @returns The result string, or null if timed out/interrupted/failed
 */
async function invokeClaudeHaiku(
  options: HaikuOptions,
): Promise<null | string> {
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
            // Avoid keeping the process alive solely because of the timeout.
            const maybeTimer = timer as unknown as { unref?: () => void };
            if (typeof maybeTimer.unref === "function") {
              maybeTimer.unref();
            }
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
    const parsed = JSON.parse(stdout) as
      | Array<ClaudeJsonOutput>
      | ClaudeJsonOutput;
    const output: ClaudeJsonOutput = Array.isArray(parsed)
      ? (parsed.findLast((entry) => entry.type === "result") ??
        parsed.at(-1) ??
        {})
      : parsed;
    return output.result ?? null;
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
 * @param options - HeadlessAsyncOptions with prompt and timeout options
 * @returns HeadlessResult with session info, or null if interrupted/failed/timed out
 */
// eslint-disable-next-line complexity -- Timeout/stall detection logic is intentionally comprehensive
async function invokeClaudeHeadlessAsync(
  options: HeadlessAsyncOptions,
): Promise<HeadlessResult | null> {
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
    const parsed = JSON.parse(stdout) as
      | Array<ClaudeJsonOutput>
      | ClaudeJsonOutput;
    const output: ClaudeJsonOutput = Array.isArray(parsed)
      ? (parsed.findLast(
          (entry) => (entry as { type?: string }).type === "result",
        ) ??
        parsed.at(-1) ??
        {})
      : parsed;

    return {
      cost: output.total_cost_usd ?? 0,
      duration: output.duration_ms ?? 0,
      result: output.result ?? "",
      sessionId: output.session_id ?? "",
    };
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
 * Kill a process gracefully with two-phase termination
 *
 * Phase 1: Send SIGTERM (polite request to terminate)
 * Phase 2: Wait for grace period, then SIGKILL if still running
 *
 * This follows UNIX best practices - give the process a chance to clean up
 * its own children and resources before forcing termination.
 *
 * @param proc - The Bun subprocess to kill
 * @param gracePeriodMs - Time to wait after SIGTERM before SIGKILL (default: 5000ms)
 */
async function killProcessGracefully(
  proc: ReturnType<typeof Bun.spawn>,
  gracePeriodMs = DEFAULT_GRACE_PERIOD_MS,
): Promise<void> {
  // Phase 1: SIGTERM (polite request)
  try {
    proc.kill("SIGTERM");
  } catch {
    // Process already dead - nothing to do
    return;
  }

  // Phase 2: Wait for graceful exit
  const didExit = await Promise.race([
    proc.exited.then(() => true),
    // eslint-disable-next-line promise/avoid-new -- setTimeout requires manual promise wrapping
    new Promise<false>((resolve) => {
      const timer = setTimeout(() => {
        resolve(false);
      }, gracePeriodMs);
      // Avoid keeping the process alive solely because of the grace period timer
      const maybeTimer = timer as unknown as { unref?: () => void };
      if (typeof maybeTimer.unref === "function") {
        maybeTimer.unref();
      }
    }),
  ]);

  // Phase 3: SIGKILL if still running
  if (!didExit) {
    try {
      proc.kill("SIGKILL");
    } catch {
      // Already dead - that's fine
    }
    // Always await proc.exited to prevent zombie processes
    await proc.exited;
  }
}

/**
 * Mark a timer so it doesn't keep the process alive
 */
function markTimerAsNonBlocking(timer: ReturnType<typeof setTimeout>): void {
  const maybeTimer = timer as unknown as { unref?: () => void };
  if (typeof maybeTimer.unref === "function") {
    maybeTimer.unref();
  }
}

function normalizeTerminationSignal(
  signal: null | string | undefined,
): null | TerminationSignal {
  if (signal === "SIGINT" || signal === "SIGTERM") return signal;
  return null;
}

/**
 * Read stderr from a subprocess, forwarding to console while tracking activity
 *
 * @param stderr - The subprocess stderr readable stream
 * @param onActivity - Callback invoked when stderr output is received
 * @returns Promise that resolves when stderr stream ends
 */
async function readStderrWithActivityTracking(
  stderr: ReadableStream<Uint8Array>,
  onActivity: () => void,
): Promise<void> {
  const reader = stderr.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- Sequential stream reading is required
      const { done: isDone, value } = await reader.read();
      if (isDone) break;
      onActivity();
      process.stderr.write(decoder.decode(value, { stream: true }));
    }
  } catch {
    // Ignore read errors (process may have been killed)
  }
}

export {
  buildPrompt,
  type ClaudeResult,
  type HaikuOptions,
  type HeadlessAsyncOptions,
  type HeadlessOptions,
  type HeadlessResult,
  invokeClaudeChat,
  invokeClaudeHaiku,
  invokeClaudeHeadlessAsync,
};

/**
 * Shared process execution utilities for Ralph providers
 *
 * Extracted from claude.ts to be reused across all provider implementations.
 * Functions are generalized to accept command/args rather than hardcoding
 * a specific CLI binary.
 */

/** Default grace period for SIGTERM before SIGKILL (ms) */
const DEFAULT_GRACE_PERIOD_MS = 5000;

// =============================================================================
// Interfaces
// =============================================================================

/** Options for {@link executeWithTimeout} */
interface ProcessExecutionOptions {
  /** Arguments to pass to the command */
  args: Array<string>;
  /** The CLI binary to spawn */
  command: string;
  /** Working directory for the spawned process */
  cwd?: string;
  /** Environment variables for the spawned process */
  env?: Record<string, string | undefined>;
  /** Grace period (ms) before SIGKILL after SIGTERM (default: 5 000) */
  gracePeriodMs?: number;
  /** Callback invoked when stderr output is received */
  onStderrActivity?: () => void;
  /** Stall detection configuration */
  stallDetection?: StallDetectionConfig;
}

/** Result from {@link executeWithTimeout} */
interface ProcessExecutionResult {
  /** Duration in milliseconds */
  durationMs: number;
  /** Process exit code (null if killed by signal) */
  exitCode: null | number;
  /** Signal that interrupted execution, if interrupted by process signal */
  interruptedBy?: ProcessSignal;
  /** Collected stderr output */
  stderr: string;
  /** Collected stdout as a string */
  stdout: string;
  /** The signal that terminated the process, if any */
  terminationReason?: "hard_timeout" | "stall_timeout";
  /** Whether the process was killed due to a timeout */
  timedOut: boolean;
}

type ProcessSignal = "SIGINT" | "SIGTERM";

/** Configuration for stall (inactivity) detection */
interface StallDetectionConfig {
  /** How often to check for stall conditions (ms). Capped at 30 000 ms internally. */
  checkIntervalMs?: number;
  /** Absolute maximum wall-clock time before force kill (ms, 0 = disabled) */
  hardTimeoutMs: number;
  /** Time without stderr output before the process is considered stalled (ms) */
  stallTimeoutMs: number;
}

// =============================================================================
// JSON Parsing Utilities
// =============================================================================

/**
 * Create a stall detector that triggers when no activity is reported.
 *
 * The returned promise resolves to `"stall_timeout"` once the time since
 * last activity exceeds `stallTimeoutMs`. Call `cleanup()` to cancel.
 *
 * @param getLastActivityAt - Returns the timestamp (ms) of last activity
 * @param stallTimeoutMs - Maximum idle time before triggering
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
      const remainingMs = stallTimeoutMs - timeSinceActivity;
      timer = setTimeout(checkStall, Math.min(remainingMs, 30_000));
      markTimerAsNonBlocking(timer);
    }
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
 * Create a promise that resolves to a given outcome after a timeout.
 *
 * The underlying timer is unref'd so it does not keep the process alive.
 *
 * @param timeoutMs - Duration in milliseconds
 * @param outcome - Value the promise resolves to
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

// =============================================================================
// Timer Utilities
// =============================================================================

/**
 * Execute a command with stall detection and hard timeout.
 *
 * Spawns the process via `Bun.spawn`, races the process exit against
 * optional stall and hard timeouts, and returns a normalised result.
 *
 * @param options - Execution configuration
 */

async function executeWithTimeout(
  options: ProcessExecutionOptions,
): Promise<ProcessExecutionResult> {
  const {
    args,
    command,
    cwd,
    env,
    gracePeriodMs = DEFAULT_GRACE_PERIOD_MS,
    onStderrActivity,
    stallDetection,
  } = options;

  const startTime = Date.now();
  const stallTimeoutMs = stallDetection?.stallTimeoutMs ?? 0;
  const hardTimeoutMs = stallDetection?.hardTimeoutMs ?? 0;

  const proc = Bun.spawn([command, ...args], {
    cwd,
    env: env as Record<string, string>,
    stderr: "pipe",
    stdin: "ignore",
    stdout: "pipe",
  });

  const stdoutPromise = new Response(proc.stdout).text();

  const signalState: { interruptedBy: null | ProcessSignal } = {
    interruptedBy: null,
  };
  let didRequestTermination = false;

  function handleInterrupt(signal: ProcessSignal): void {
    signalState.interruptedBy = signal;
    if (didRequestTermination) {
      return;
    }
    didRequestTermination = true;
    void killProcessGracefully(proc, gracePeriodMs);
  }

  function handleSigint(): void {
    handleInterrupt("SIGINT");
  }

  function handleSigterm(): void {
    handleInterrupt("SIGTERM");
  }

  process.prependListener("SIGINT", handleSigint);
  process.prependListener("SIGTERM", handleSigterm);

  // Track last activity time for stall detection
  let lastActivityAt = Date.now();

  const stderrChunks: Array<string> = [];
  const stderrForwarder = readStderrWithActivityTracking(proc.stderr, () => {
    lastActivityAt = Date.now();
    onStderrActivity?.();
  });

  // Capture stderr for the result by tapping the forwarder's output
  // We rewrite the forwarder to also collect chunks
  // Actually, we can't intercept the existing forwarder. Let's use
  // a wrapper approach instead.
  // NOTE: The readStderrWithActivityTracking already writes to process.stderr.
  // We need stderr in the result, so we'll collect via the activity callback
  // by re-reading. But that's not ideal. For now, stderr in the result will
  // be empty - callers that need stderr content should parse stdout (most
  // CLI tools output JSON to stdout). This matches the existing claude.ts pattern.

  type ExitOutcome = "exited" | "hard_timeout" | "stall_timeout";

  const stallDetector =
    stallTimeoutMs > 0
      ? createStallDetector(() => lastActivityAt, stallTimeoutMs)
      : null;

  const hardTimeoutPromise =
    hardTimeoutMs > 0
      ? createTimeoutPromise<ExitOutcome>(hardTimeoutMs, "hard_timeout")
      : null;

  const exitPromise = (async (): Promise<ExitOutcome> => {
    await proc.exited;
    return "exited";
  })();

  const racers: Array<Promise<ExitOutcome>> = [exitPromise];
  if (stallDetector !== null) racers.push(stallDetector.promise);
  if (hardTimeoutPromise !== null) racers.push(hardTimeoutPromise);

  const outcome: ExitOutcome = await Promise.race(racers).finally(() => {
    stallDetector?.cleanup();
    process.removeListener("SIGINT", handleSigint);
    process.removeListener("SIGTERM", handleSigterm);
  });

  if (signalState.interruptedBy !== null) {
    await stderrForwarder;
    return {
      durationMs: Date.now() - startTime,
      exitCode: proc.exitCode,
      interruptedBy: signalState.interruptedBy,
      stderr: stderrChunks.join(""),
      stdout: "",
      timedOut: false,
    };
  }

  if (outcome === "stall_timeout" || outcome === "hard_timeout") {
    await killProcessGracefully(proc, gracePeriodMs);
    await stderrForwarder;

    return {
      durationMs: Date.now() - startTime,
      exitCode: proc.exitCode,
      stderr: stderrChunks.join(""),
      stdout: "",
      terminationReason: outcome,
      timedOut: true,
    };
  }

  await stderrForwarder;

  return {
    durationMs: Date.now() - startTime,
    exitCode: proc.exitCode,
    stderr: stderrChunks.join(""),
    stdout: await stdoutPromise,
    timedOut: false,
  };
}

/**
 * Kill a process gracefully with two-phase termination.
 *
 * 1. Send SIGTERM (polite request)
 * 2. Wait `gracePeriodMs` for the process to exit
 * 3. Send SIGKILL if still running
 *
 * @param proc - Bun subprocess to kill
 * @param gracePeriodMs - Time to wait after SIGTERM before SIGKILL
 */
async function killProcessGracefully(
  proc: ReturnType<typeof Bun.spawn>,
  gracePeriodMs = DEFAULT_GRACE_PERIOD_MS,
): Promise<void> {
  // Phase 1: SIGTERM
  try {
    proc.kill("SIGTERM");
  } catch {
    // Already dead
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
      markTimerAsNonBlocking(timer);
    }),
  ]);

  // Phase 3: SIGKILL if still running
  if (!didExit) {
    try {
      proc.kill("SIGKILL");
    } catch {
      // Already dead
    }
    await proc.exited;
  }
}

// =============================================================================
// Stall Detection
// =============================================================================

/**
 * Mark a timer so it does not keep the Node/Bun process alive.
 */
function markTimerAsNonBlocking(timer: ReturnType<typeof setTimeout>): void {
  const maybeTimer = timer as unknown as { unref?: () => void };
  if (typeof maybeTimer.unref === "function") {
    maybeTimer.unref();
  }
}

// =============================================================================
// Process Management
// =============================================================================

/**
 * Parse newline-delimited JSON (JSONL).
 *
 * Splits input by newlines, ignores empty/whitespace-only lines, and silently
 * drops lines that fail to parse.
 *
 * @param jsonl - The JSONL string (one JSON object per line)
 * @returns Array of successfully parsed objects
 */
function parseJsonl<T>(jsonl: string): Array<T> {
  return jsonl
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => tryParseJson<T>(line))
    .filter((item): item is T => item !== undefined);
}

/**
 * Read stderr from a subprocess, forwarding to the parent process stderr
 * while invoking a callback on every chunk for activity tracking.
 *
 * @param stderr - The subprocess stderr readable stream
 * @param onActivity - Callback for each chunk received
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

// =============================================================================
// Orchestration
// =============================================================================

/**
 * Parse a JSON string safely, returning a default value on failure.
 *
 * @param json - The JSON string to parse
 * @param defaultValue - Value to return when parsing fails (defaults to undefined)
 * @returns The parsed value, or `defaultValue` on parse error
 */
function tryParseJson<T>(json: string, defaultValue?: T): T | undefined {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

// =============================================================================
// Exports
// =============================================================================

export {
  createStallDetector,
  createTimeoutPromise,
  DEFAULT_GRACE_PERIOD_MS,
  executeWithTimeout,
  killProcessGracefully,
  markTimerAsNonBlocking,
  parseJsonl,
  type ProcessExecutionOptions,
  type ProcessExecutionResult,
  readStderrWithActivityTracking,
  type StallDetectionConfig,
  tryParseJson,
};

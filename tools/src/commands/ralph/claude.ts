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
  /** Optional timeout in milliseconds (0/undefined = no timeout) */
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
    try {
      proc.kill("SIGKILL");
    } catch {
      /* ignore */
    }
    await proc.exited;
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
 * Headless mode: Run Claude with -p and JSON output
 *
 * Uses stdio: ['inherit', 'pipe', 'inherit'] to separate stderr from stdout.
 * This is CRITICAL for JSON parsing - stderr messages (progress, warnings)
 * would contaminate stdout and break JSON.parse().
 *
 * @param options - HeadlessOptions with prompt and optional maxBuffer
 * @returns HeadlessResult with session info, or null if interrupted/failed
 */
function invokeClaudeHeadless(options: HeadlessOptions): HeadlessResult | null {
  const { prompt } = options;

  // Headless mode: -p with JSON output
  // CRITICAL: Use ['ignore', 'pipe', 'inherit'] to separate stderr from stdout
  // - stdin: ignore (headless mode doesn't need interactive input)
  // - stdout: pipe (capture for JSON parsing)
  // - stderr: inherit (show progress to user, don't mix with JSON)
  const proc = Bun.spawnSync(
    [
      "claude",
      "-p",
      prompt,
      "--dangerously-skip-permissions",
      "--output-format",
      "json",
    ],
    { stdio: ["ignore", "pipe", "inherit"] },
  );

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

  // Parse JSON from stdout (now clean without stderr contamination)
  // Claude outputs JSON array: [{type:"system",...}, {type:"assistant",...}, {type:"result",...}]
  // We need the last element with type:"result"
  try {
    const stdout = proc.stdout.toString("utf8");
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
    // Handle invalid JSON from Claude CLI (known issue: https://github.com/anthropics/claude-code/issues/19060)
    // The CLI sometimes returns empty or invalid responses due to rate limiting, network issues, or API timeouts
    const preview = proc.stdout.toString("utf8").slice(0, 500);
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
 * Async Headless mode: Run Claude with -p and JSON output
 *
 * This variant enables non-blocking waits (for heartbeats/timeouts) and keeps
 * stderr separate from stdout for JSON parsing.
 *
 * @param options - HeadlessAsyncOptions with prompt and optional timeout
 * @returns HeadlessResult with session info, or null if interrupted/failed
 */
async function invokeClaudeHeadlessAsync(
  options: HeadlessAsyncOptions,
): Promise<HeadlessResult | null> {
  const { prompt, timeout } = options;
  const timeoutMs = timeout ?? 0;
  const isDebug = process.env.DEBUG === "true" || process.env.DEBUG === "1";

  const proc = Bun.spawn(
    [
      "claude",
      "-p",
      prompt,
      "--dangerously-skip-permissions",
      "--output-format",
      "json",
    ],
    { stderr: "inherit", stdin: "ignore", stdout: "pipe" },
  );

  const stdoutPromise = new Response(proc.stdout).text();

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
    try {
      proc.kill("SIGKILL");
    } catch {
      /* ignore */
    }
    await proc.exited;
    if (isDebug) {
      console.log(`Claude headless timed out after ${timeoutMs}ms`);
    }
    return null;
  }

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

function normalizeTerminationSignal(
  signal: null | string | undefined,
): null | TerminationSignal {
  if (signal === "SIGINT" || signal === "SIGTERM") return signal;
  return null;
}

export {
  buildPrompt,
  type ClaudeResult,
  type HaikuOptions,
  type HeadlessOptions,
  type HeadlessResult,
  invokeClaudeChat,
  invokeClaudeHaiku,
  invokeClaudeHeadless,
  invokeClaudeHeadlessAsync,
};

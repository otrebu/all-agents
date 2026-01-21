/**
 * Claude invocation helpers for Ralph
 *
 * This module provides functions for spawning Claude sessions in different modes.
 * Extracted from index.ts to avoid circular dependencies with other ralph modules.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/**
 * Claude JSON output structure (internal)
 */
interface ClaudeJsonOutput {
  duration_ms?: number;
  num_turns?: number;
  result?: string;
  session_id?: string;
  total_cost_usd?: number;
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
  /** Maximum buffer size for stdout in bytes (default: 10MB) */
  maxBuffer?: number;
  /** The prompt to send to Claude Haiku */
  prompt: string;
  /** Timeout in milliseconds (default: 30000ms) */
  timeout?: number;
}

/**
 * Options for headless Claude invocation
 */
interface HeadlessOptions {
  /** Maximum buffer size for stdout in bytes (default: 50MB) */
  maxBuffer?: number;
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
  const result = spawnSync(
    "claude",
    [
      "--permission-mode",
      "bypassPermissions",
      "--append-system-prompt",
      fullPrompt,
      `Please begin the ${sessionName} session.`,
    ],
    { stdio: "inherit" },
  );

  // Handle signal interruption (Ctrl+C) gracefully
  if (result.signal === "SIGINT" || result.signal === "SIGTERM") {
    console.log("\nSession interrupted by user");
    return { exitCode: null, interrupted: true, success: true };
  }

  if (result.error !== undefined) {
    console.error(`Failed to start Claude: ${result.error.message}`);
    return { exitCode: 1, interrupted: false, success: false };
  }

  return {
    exitCode: result.status,
    interrupted: false,
    success: result.status === 0,
  };
}

/**
 * Invoke Claude Haiku for lightweight tasks like summary generation
 *
 * Uses claude-3-5-haiku model with configurable timeout. Designed for
 * quick, low-cost operations where full Opus/Sonnet is overkill.
 *
 * @param options - HaikuOptions with prompt, optional timeout, and maxBuffer
 * @returns The result string, or null if timed out/interrupted/failed
 */
function invokeClaudeHaiku(options: HaikuOptions): null | string {
  const { maxBuffer = 10 * 1024 * 1024, prompt, timeout = 30_000 } = options;

  // Haiku mode: -p with JSON output, specific model, and timeout
  const result = spawnSync(
    "claude",
    [
      "-p",
      prompt,
      "--model",
      "claude-3-5-haiku-latest",
      "--dangerously-skip-permissions",
      "--output-format",
      "json",
    ],
    {
      encoding: "utf8",
      maxBuffer,
      stdio: ["inherit", "pipe", "inherit"],
      timeout,
    },
  );

  // Handle signal interruption (Ctrl+C)
  if (result.signal === "SIGINT" || result.signal === "SIGTERM") {
    console.log("\nHaiku session interrupted by user");
    return null;
  }

  // Handle timeout (ETIMEDOUT) gracefully - return null instead of crashing
  if (result.error !== undefined) {
    const errorWithCode = result.error as { code?: string } & Error;
    if (errorWithCode.code === "ETIMEDOUT") {
      console.log(`Haiku invocation timed out after ${timeout}ms`);
      return null;
    }
    console.error(`Failed to start Claude Haiku: ${result.error.message}`);
    return null;
  }

  if (result.status !== 0) {
    console.error(`Claude Haiku exited with code ${result.status}`);
    return null;
  }

  // Parse JSON from stdout
  try {
    const output: ClaudeJsonOutput = JSON.parse(
      result.stdout,
    ) as ClaudeJsonOutput;
    return output.result ?? null;
  } catch {
    console.error("Failed to parse Claude Haiku JSON output");
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
  const { maxBuffer = 50 * 1024 * 1024, prompt } = options;

  // Headless mode: -p with JSON output
  // CRITICAL: Use ['inherit', 'pipe', 'inherit'] to separate stderr from stdout
  // - stdin: inherit (allow input if needed)
  // - stdout: pipe (capture for JSON parsing)
  // - stderr: inherit (show progress to user, don't mix with JSON)
  const result = spawnSync(
    "claude",
    ["-p", prompt, "--dangerously-skip-permissions", "--output-format", "json"],
    { encoding: "utf8", maxBuffer, stdio: ["inherit", "pipe", "inherit"] },
  );

  // Handle signal interruption (Ctrl+C)
  if (result.signal === "SIGINT" || result.signal === "SIGTERM") {
    console.log("\nSession interrupted by user");
    return null;
  }

  if (result.error !== undefined) {
    console.error(`Failed to start Claude: ${result.error.message}`);
    return null;
  }

  if (result.status !== 0) {
    console.error(`Claude exited with code ${result.status}`);
    return null;
  }

  // Parse JSON from stdout (now clean without stderr contamination)
  const output: ClaudeJsonOutput = JSON.parse(
    result.stdout,
  ) as ClaudeJsonOutput;

  return {
    cost: output.total_cost_usd ?? 0,
    duration: output.duration_ms ?? 0,
    result: output.result ?? "",
    sessionId: output.session_id ?? "",
  };
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
};

/**
 * ClaudeService - Effect-based wrapper for Claude CLI invocations
 *
 * This service wraps external Claude CLI calls using Bun.spawnSync and provides:
 * - Type-safe error handling with Effect error types
 * - Cost tracking integrated into response types
 * - Proper handling of process spawn errors, timeouts, and exit codes
 *
 * @module
 */

/* eslint-disable unicorn/throw-new-error */

import { Context, Data, Effect, Layer } from "effect";
import { existsSync, readFileSync } from "node:fs";

// =============================================================================
// Types (Internal)
// =============================================================================

/**
 * Options for interactive chat Claude invocation
 */
interface ChatOptions {
  /** Optional context to prepend to the prompt */
  readonly extraContext?: string;
  /** Path to the prompt file */
  readonly promptPath: string;
  /** Name for the session (used in console output) */
  readonly sessionName: string;
}

// =============================================================================
// Types (Exported)
// =============================================================================

/**
 * Result from interactive chat Claude invocation
 */
interface ClaudeChatResult {
  /** The process exit code (null if interrupted by signal) */
  readonly exitCode: null | number;
  /** Whether the session was interrupted by SIGINT/SIGTERM (Ctrl+C) */
  readonly interrupted: boolean;
  /** Whether the session completed successfully (exit code 0) */
  readonly success: boolean;
}

/**
 * Union of all Claude-related errors
 */
type ClaudeError =
  | ClaudeExitError
  | ClaudeInterruptedError
  | ClaudeParseError
  | ClaudeSpawnError;

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
 * Result from headless Claude invocation
 */
interface ClaudeResponse {
  /** Total cost in USD */
  readonly cost: number;
  /** Duration in milliseconds */
  readonly duration: number;
  /** Number of turns in the conversation */
  readonly numTurns: number;
  /** The result/response from Claude */
  readonly result: string;
  /** Session ID from Claude */
  readonly sessionId: string;
}

/**
 * ClaudeService interface for external Claude invocations
 */
interface ClaudeServiceImpl {
  /**
   * Invoke Claude in interactive chat mode
   * Uses stdio: inherit so user can watch AND type if needed
   */
  readonly chat: (
    options: ChatOptions,
  ) => Effect.Effect<ClaudeChatResult, ClaudeError>;

  /**
   * Invoke Claude Haiku for lightweight tasks like summary generation
   * Uses claude-3-5-haiku model for quick, low-cost operations
   */
  readonly haiku: (options: HaikuOptions) => Effect.Effect<string, ClaudeError>;

  /**
   * Invoke Claude in headless mode with JSON output
   * Returns structured response with cost, duration, result, and sessionId
   */
  readonly headless: (
    options: HeadlessOptions,
  ) => Effect.Effect<ClaudeResponse, ClaudeError>;
}

/**
 * Options for Haiku Claude invocation (lightweight model for summaries)
 */
interface HaikuOptions {
  /** The prompt to send to Claude Haiku */
  readonly prompt: string;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Options for headless Claude invocation
 */
interface HeadlessOptions {
  /** Optional model to use (defaults to current default) */
  readonly model?: string;
  /** The prompt to send to Claude */
  readonly prompt: string;
}

/**
 * Error when Claude CLI exits with non-zero exit code
 */
class ClaudeExitError extends Data.TaggedError("ClaudeExitError")<{
  readonly exitCode: number;
  readonly message: string;
  readonly stderr?: string;
}> {}

/**
 * Error when Claude CLI was interrupted by signal (SIGINT/SIGTERM)
 */
class ClaudeInterruptedError extends Data.TaggedError(
  "ClaudeInterruptedError",
)<{ readonly message: string; readonly signal: string }> {}

/**
 * Error parsing JSON output from Claude CLI
 */
class ClaudeParseError extends Data.TaggedError("ClaudeParseError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly rawOutput: string;
}> {}

/**
 * ClaudeService tag for Effect dependency injection
 */
class ClaudeService extends Context.Tag("ClaudeService")<
  ClaudeService,
  ClaudeServiceImpl
>() {}

// =============================================================================
// Service Tag
// =============================================================================

/**
 * Error spawning or executing Claude CLI process
 */
class ClaudeSpawnError extends Data.TaggedError("ClaudeSpawnError")<{
  readonly cause?: unknown;
  readonly command: Array<string>;
  readonly message: string;
}> {}

// =============================================================================
// Helper Functions
// =============================================================================

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
 * Check for non-zero exit code and return appropriate error
 */
function checkExitCode(
  exitCode: null | number,
  stderr?: string,
): Effect.Effect<void, ClaudeExitError> {
  if (exitCode !== null && exitCode !== 0) {
    return Effect.fail(
      new ClaudeExitError({
        exitCode,
        message: `Claude exited with code ${exitCode}`,
        stderr,
      }),
    );
  }
  return Effect.void;
}

/**
 * Check for signal interruption and return appropriate error
 * Bun.spawnSync returns signalCode as string | undefined
 */
function checkSignalInterruption(
  signalCode: string | undefined,
): Effect.Effect<void, ClaudeInterruptedError> {
  if (signalCode === "SIGINT" || signalCode === "SIGTERM") {
    return Effect.fail(
      new ClaudeInterruptedError({
        message: `Session interrupted by ${signalCode}`,
        signal: signalCode,
      }),
    );
  }
  return Effect.void;
}

/**
 * Parse JSON output from Claude CLI
 * Claude outputs JSON array: [{type:"system",...}, {type:"assistant",...}, {type:"result",...}]
 */
function parseClaudeJsonOutput(
  stdout: string,
): Effect.Effect<ClaudeResponse, ClaudeParseError> {
  return Effect.try({
    catch: (error) =>
      new ClaudeParseError({
        cause: error,
        message: `Failed to parse Claude JSON output: ${error instanceof Error ? error.message : String(error)}`,
        rawOutput: stdout.slice(0, 500),
      }),
    try: () => {
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
        numTurns: output.num_turns ?? 0,
        result: output.result ?? "",
        sessionId: output.session_id ?? "",
      };
    },
  });
}

// =============================================================================
// Live Implementation
// =============================================================================

/**
 * Live implementation of ClaudeService
 */
const makeLiveService: ClaudeServiceImpl = {
  chat: (options: ChatOptions) =>
    Effect.gen(function* chatGenerator() {
      // Check if prompt file exists
      if (!existsSync(options.promptPath)) {
        return yield* Effect.fail(
          new ClaudeSpawnError({
            command: ["claude"],
            message: `Prompt not found: ${options.promptPath}`,
          }),
        );
      }

      const promptContent = readFileSync(options.promptPath, "utf8");
      const fullPrompt = buildPrompt(promptContent, options.extraContext);

      // Spawn Claude in chat mode
      // --permission-mode bypassPermissions prevents inheriting plan mode from user settings
      const proc = Bun.spawnSync(
        [
          "claude",
          "--permission-mode",
          "bypassPermissions",
          "--append-system-prompt",
          fullPrompt,
          `Please begin the ${options.sessionName} session.`,
        ],
        { stdio: ["inherit", "inherit", "inherit"] },
      );

      // Check for signal interruption (treat as success with interrupted flag)
      if (proc.signalCode === "SIGINT" || proc.signalCode === "SIGTERM") {
        const result: ClaudeChatResult = {
          exitCode: null,
          interrupted: true,
          success: true,
        };
        return result;
      }

      const result: ClaudeChatResult = {
        exitCode: proc.exitCode,
        interrupted: false,
        success: proc.exitCode === 0,
      };
      return result;
    }),

  haiku: (options: HaikuOptions) =>
    Effect.gen(function* haikuGenerator() {
      const command = [
        "claude",
        "-p",
        options.prompt,
        "--model",
        "claude-3-5-haiku-latest",
        "--dangerously-skip-permissions",
        "--output-format",
        "json",
      ];

      const proc = Bun.spawnSync(command, {
        stdio: ["ignore", "pipe", "inherit"],
      });

      // Check for signal interruption
      yield* checkSignalInterruption(proc.signalCode);

      // Check for non-zero exit code
      yield* checkExitCode(proc.exitCode);

      // Parse JSON output
      const stdout = proc.stdout.toString("utf8");
      const response = yield* parseClaudeJsonOutput(stdout);

      return response.result;
    }),

  headless: (options: HeadlessOptions) =>
    Effect.gen(function* headlessGenerator() {
      const command = [
        "claude",
        "-p",
        options.prompt,
        "--dangerously-skip-permissions",
        "--output-format",
        "json",
      ];

      // Add model if specified
      if (options.model !== undefined && options.model !== "") {
        command.push("--model", options.model);
      }

      // CRITICAL: Use ['inherit', 'pipe', 'inherit'] to separate stderr from stdout
      // - stdin: inherit (allow input if needed)
      // - stdout: pipe (capture for JSON parsing)
      // - stderr: inherit (show progress to user, don't mix with JSON)
      const proc = Bun.spawnSync(command, {
        stdio: ["inherit", "pipe", "inherit"],
      });

      // Check for signal interruption
      yield* checkSignalInterruption(proc.signalCode);

      // Check for non-zero exit code
      yield* checkExitCode(proc.exitCode);

      // Parse JSON output
      const stdout = proc.stdout.toString("utf8");
      return yield* parseClaudeJsonOutput(stdout);
    }),
};

/**
 * Live layer for ClaudeService
 */
const ClaudeServiceLive = Layer.succeed(ClaudeService, makeLiveService);

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a test ClaudeService with mock implementations
 */
function makeTestClaudeService(
  overrides: Partial<ClaudeServiceImpl> = {},
): Layer.Layer<ClaudeService> {
  const mockService: ClaudeServiceImpl = {
    chat:
      overrides.chat ??
      (() =>
        Effect.succeed({ exitCode: 0, interrupted: false, success: true })),
    haiku: overrides.haiku ?? (() => Effect.succeed("Mock Haiku response")),
    headless:
      overrides.headless ??
      (() =>
        Effect.succeed({
          cost: 0.01,
          duration: 1000,
          numTurns: 1,
          result: "Mock headless response",
          sessionId: "mock-session-id",
        })),
  };

  return Layer.succeed(ClaudeService, mockService);
}

// =============================================================================
// Exports
// =============================================================================

export {
  ClaudeExitError,
  ClaudeInterruptedError,
  ClaudeParseError,
  ClaudeService,
  ClaudeServiceLive,
  ClaudeSpawnError,
  makeTestClaudeService,
};

export type {
  ChatOptions,
  ClaudeChatResult,
  ClaudeError,
  ClaudeResponse,
  ClaudeServiceImpl,
  HaikuOptions,
  HeadlessOptions,
};

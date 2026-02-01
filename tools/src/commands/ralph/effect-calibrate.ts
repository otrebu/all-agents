/**
 * Effect-based calibration module for Ralph autonomous build system
 *
 * This module provides Effect wrappers for the Ralph calibration commands:
 * - Calibration checks use ClaudeService for analysis
 * - File operations use FileSystemService
 * - Interactive prompts wrapped in Effect
 *
 * @see context/workflows/ralph/calibration/intention-drift.md
 * @see context/workflows/ralph/calibration/technical-drift.md
 * @see context/workflows/ralph/calibration/self-improvement.md
 */

/* eslint-disable unicorn/throw-new-error */

import {
  type ClaudeError,
  type ClaudeResponse,
  ClaudeService,
  type FileNotFoundError,
  type FileReadError,
  FileSystem,
  Logger,
} from "@tools/lib/effect";
import { Context, Data, Effect, Layer } from "effect";
import path from "node:path";

import type { RalphConfig, Subtask, SubtasksFile } from "./types";

import { loadSubtasksFileEffect } from "./effect-status";

// =============================================================================
// Types
// =============================================================================

/**
 * Union of all calibration-related errors
 */
type CalibrateError =
  | CalibrationPromptNotFoundError
  | ClaudeError
  | ConfigNotFoundError
  | FileNotFoundError
  | FileReadError
  | NoSessionsError
  | NoSubtasksError;

/**
 * Options for calibration checks
 */
interface CalibrateOptions {
  /** Context root path (repo root) */
  readonly contextRoot: string;
  /** Skip approval even if config says 'suggest' */
  readonly force?: boolean;
  /** Require approval even if config says 'autofix' */
  readonly review?: boolean;
  /** Path to subtasks.json file */
  readonly subtasksPath: string;
}

/**
 * Result of a calibration check
 */
interface CalibrateResult {
  /** The check type that was run */
  readonly checkType: CalibrateSubcommand;
  /** Optional Claude response if headless */
  readonly response?: ClaudeResponse;
  /** Whether the check ran successfully */
  readonly success: boolean;
}

/**
 * Valid calibrate subcommands
 */
type CalibrateSubcommand = "all" | "improve" | "intention" | "technical";

/**
 * RalphConfigService interface for loading Ralph configuration
 */
interface RalphConfigServiceImpl {
  /**
   * Load Ralph configuration from aaa.config.json
   */
  readonly load: () => Effect.Effect<
    RalphConfig,
    ConfigNotFoundError,
    FileSystem
  >;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error when calibration prompt file is not found
 */
class CalibrationPromptNotFoundError extends Data.TaggedError(
  "CalibrationPromptNotFoundError",
)<{ readonly message: string; readonly promptPath: string }> {}

/**
 * Error when config file is not found
 */
class ConfigNotFoundError extends Data.TaggedError("ConfigNotFoundError")<{
  readonly message: string;
  readonly path: string;
}> {}

/**
 * Error when no completed sessions are available for analysis
 */
class NoSessionsError extends Data.TaggedError("NoSessionsError")<{
  readonly message: string;
}> {}

/**
 * Error when no subtasks with commitHash are available for analysis
 */
class NoSubtasksError extends Data.TaggedError("NoSubtasksError")<{
  readonly message: string;
}> {}

/**
 * RalphConfigService tag for Effect dependency injection
 */
class RalphConfigService extends Context.Tag("RalphConfigService")<
  RalphConfigService,
  RalphConfigServiceImpl
>() {}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determine approval mode based on config and CLI flags
 */
function getApprovalMode(
  config: RalphConfig,
  options: CalibrateOptions,
): string {
  if (options.force === true) {
    return "force";
  }
  if (options.review === true) {
    return "review";
  }
  return "auto";
}

/**
 * Get completed subtasks with sessionId
 */
function getCompletedSessionIds(subtasksFile: SubtasksFile): string {
  return subtasksFile.subtasks
    .filter((s) => s.done && s.sessionId !== undefined && s.sessionId !== "")
    .map((s) => s.sessionId)
    .join(",");
}

/**
 * Get completed subtasks with commitHash
 */
function getCompletedWithCommitHash(
  subtasksFile: SubtasksFile,
): Array<Subtask> {
  return subtasksFile.subtasks.filter(
    (s) => s.done && s.commitHash !== undefined && s.commitHash !== "",
  );
}

// =============================================================================
// Calibration Check Effects
// =============================================================================

/**
 * Run all calibration checks sequentially using Effect
 */
function runAllChecksEffect(
  options: CalibrateOptions,
): Effect.Effect<
  Array<CalibrateResult>,
  CalibrateError,
  ClaudeService | FileSystem | Logger | RalphConfigService
> {
  return Effect.gen(function* runAllGen() {
    const logger = yield* Logger;

    const intentionResult = yield* runIntentionCheckEffect(options);
    yield* logger.info("");

    const technicalResult = yield* runTechnicalCheckEffect(options);
    yield* logger.info("");

    const improveResult = yield* runImproveCheckEffect(options);

    return [intentionResult, technicalResult, improveResult];
  });
}

/**
 * Run calibration check(s) based on subcommand using Effect
 */
function runCalibrateEffect(
  subcommand: CalibrateSubcommand,
  options: CalibrateOptions,
): Effect.Effect<
  Array<CalibrateResult>,
  CalibrateError,
  ClaudeService | FileSystem | Logger | RalphConfigService
> {
  switch (subcommand) {
    case "all": {
      return runAllChecksEffect(options);
    }
    case "improve": {
      return runImproveCheckEffect(options).pipe(
        Effect.map((result) => [result]),
      );
    }
    case "intention": {
      return runIntentionCheckEffect(options).pipe(
        Effect.map((result) => [result]),
      );
    }
    case "technical": {
      return runTechnicalCheckEffect(options).pipe(
        Effect.map((result) => [result]),
      );
    }
    default: {
      // This should not happen due to TypeScript narrowing
      const unknownSubcommand: never = subcommand;
      return Effect.fail(
        new CalibrationPromptNotFoundError({
          message: `Unknown subcommand: ${String(unknownSubcommand)}`,
          promptPath: "",
        }),
      );
    }
  }
}

/**
 * Run self-improvement analysis using Effect
 *
 * Analyzes session logs from completed subtasks for inefficiencies
 * and proposes improvements to prompts, skills, and documentation.
 */
function runImproveCheckEffect(
  options: CalibrateOptions,
): Effect.Effect<
  CalibrateResult,
  CalibrateError,
  ClaudeService | FileSystem | Logger | RalphConfigService
> {
  return Effect.gen(function* improveCheckGen() {
    const fs = yield* FileSystem;
    const claude = yield* ClaudeService;
    const configService = yield* RalphConfigService;
    const logger = yield* Logger;

    const { contextRoot, subtasksPath } = options;

    yield* logger.info("=== Running Self-Improvement Analysis ===");

    // Verify prompt exists
    const promptPath = path.join(
      contextRoot,
      "context/workflows/ralph/calibration/self-improvement.md",
    );
    const hasPrompt = yield* fs.exists(promptPath);
    if (!hasPrompt) {
      return yield* Effect.fail(
        new CalibrationPromptNotFoundError({
          message: `Self-improvement prompt not found: ${promptPath}`,
          promptPath,
        }),
      );
    }

    // Load subtasks
    const subtasksFile = yield* loadSubtasksFileEffect(subtasksPath);

    // Load config and check selfImprovement mode
    const config = yield* configService.load();
    const selfImproveMode = (config.selfImprovement?.mode ??
      "suggest") as string;

    // Check for "off" mode - skip analysis entirely
    if (selfImproveMode === "off") {
      yield* logger.info(
        "Self-improvement analysis is disabled in aaa.config.json",
      );
      return { checkType: "improve", success: true };
    }

    // Get session IDs from completed subtasks
    const sessionIds = getCompletedSessionIds(subtasksFile);
    if (sessionIds === "") {
      yield* logger.info(
        "No completed subtasks with sessionId found. Nothing to analyze.",
      );
      return { checkType: "improve", success: true };
    }

    yield* logger.info(`Found sessionIds: ${sessionIds}`);
    yield* logger.info(`Self-improvement mode: ${selfImproveMode}`);

    // Read the prompt file
    const promptContent = yield* fs.readFile(promptPath);

    // Build the prompt with context
    const unifiedConfigPath = path.join(contextRoot, "aaa.config.json");
    const prompt = `Execute self-improvement analysis.

Follow the instructions in @${promptPath}

Subtasks file: @${subtasksPath}

Config file: @${unifiedConfigPath}

Session IDs to analyze: ${sessionIds}

Self-improvement mode: ${selfImproveMode}
- If 'suggest': Create task files only, require user approval before applying changes
- If 'autofix': Apply changes directly to target files (CLAUDE.md, prompts, skills) without creating task files

IMPORTANT: You MUST output a readable markdown summary to stdout following the format in the self-improvement.md prompt.
The summary should include:
- Session ID and subtask title
- Findings organized by inefficiency type (Tool Misuse, Wasted Reads, Backtracking, Excessive Iterations)
- Recommendations for improvements
- Reference to any task files created (in 'suggest' mode) or changes applied (in 'autofix' mode)

TASK FILE CREATION (when mode is 'suggest' and inefficiencies are found):
When you find inefficiencies that warrant improvement, create task files at:
  docs/planning/tasks/self-improve-YYYY-MM-DD-N.md
where YYYY-MM-DD is today's date and N is a sequential number (01, 02, etc).

Each task file should follow the format in self-improvement.md:
- Task title describing the improvement
- Source (session ID that revealed the inefficiency)
- Problem description
- Proposed change (specific change to make)
- Target file (CLAUDE.md, prompts, skills)
- Risk level (low/medium/high)
- Acceptance criteria

Analyze session logs from completed subtasks for inefficiencies.
Handle improvements based on the mode above.

${promptContent}`;

    // Run Claude for analysis
    yield* logger.info("Invoking Claude for self-improvement analysis...");
    const response = yield* claude.headless({ prompt });

    yield* logger.info("");
    yield* logger.info("=== Self-Improvement Analysis Complete ===");

    return { checkType: "improve", response, success: true };
  });
}

/**
 * Run intention drift check using Effect
 *
 * Analyzes completed subtasks with commitHash to detect when code
 * diverges from the intended behavior defined in planning docs.
 */
function runIntentionCheckEffect(
  options: CalibrateOptions,
): Effect.Effect<
  CalibrateResult,
  CalibrateError,
  ClaudeService | FileSystem | Logger | RalphConfigService
> {
  return Effect.gen(function* intentionCheckGen() {
    const fs = yield* FileSystem;
    const claude = yield* ClaudeService;
    const configService = yield* RalphConfigService;
    const logger = yield* Logger;

    const { contextRoot, subtasksPath } = options;

    yield* logger.info("=== Running Intention Drift Check ===");

    // Verify prompt exists
    const promptPath = path.join(
      contextRoot,
      "context/workflows/ralph/calibration/intention-drift.md",
    );
    const hasPrompt = yield* fs.exists(promptPath);
    if (!hasPrompt) {
      return yield* Effect.fail(
        new CalibrationPromptNotFoundError({
          message: `Intention drift prompt not found: ${promptPath}`,
          promptPath,
        }),
      );
    }

    // Load subtasks
    const subtasksFile = yield* loadSubtasksFileEffect(subtasksPath);

    // Check for completed subtasks with commitHash
    const completed = getCompletedWithCommitHash(subtasksFile);
    if (completed.length === 0) {
      yield* logger.info(
        "No completed subtasks with commitHash found. Nothing to analyze.",
      );
      return { checkType: "intention", success: true };
    }

    // Load config and determine approval mode
    const config = yield* configService.load();
    const approvalMode = getApprovalMode(config, options);
    yield* logger.info(`Approval mode: ${approvalMode}`);

    // Read the prompt file
    const promptContent = yield* fs.readFile(promptPath);

    // Build the prompt with context
    const prompt = `Execute intention drift analysis.

Follow the instructions in @${promptPath}

Subtasks file: @${subtasksPath}

Context files:
@${path.join(contextRoot, "CLAUDE.md")}
@${path.join(contextRoot, "docs/planning/PROGRESS.md")}
@${path.join(contextRoot, "docs/planning/VISION.md")}

Approval mode: ${approvalMode}
- If 'autofix': Create drift task files automatically
- If 'suggest' or 'review': Show findings and ask for approval before creating task files
- If 'force': Create drift task files without asking

Analyze all completed subtasks with commitHash and output a summary to stdout.
If drift is detected, create task files in docs/planning/tasks/ as specified in the prompt.

${promptContent}`;

    // Run Claude for analysis
    yield* logger.info("Invoking Claude for intention drift analysis...");
    const response = yield* claude.headless({ prompt });

    yield* logger.info("");
    yield* logger.info("=== Intention Drift Check Complete ===");

    return { checkType: "intention", response, success: true };
  });
}

/**
 * Run technical drift check using Effect
 *
 * Analyzes completed subtasks with commitHash to detect code quality
 * issues and technical debt.
 */
function runTechnicalCheckEffect(
  options: CalibrateOptions,
): Effect.Effect<
  CalibrateResult,
  CalibrateError,
  ClaudeService | FileSystem | Logger | RalphConfigService
> {
  return Effect.gen(function* technicalCheckGen() {
    const fs = yield* FileSystem;
    const claude = yield* ClaudeService;
    const configService = yield* RalphConfigService;
    const logger = yield* Logger;

    const { contextRoot, subtasksPath } = options;

    yield* logger.info("=== Running Technical Drift Check ===");

    // Verify prompt exists
    const promptPath = path.join(
      contextRoot,
      "context/workflows/ralph/calibration/technical-drift.md",
    );
    const hasPrompt = yield* fs.exists(promptPath);
    if (!hasPrompt) {
      yield* logger.info(
        `Note: Technical drift prompt not found: ${promptPath}`,
      );
      yield* logger.info("Technical drift checking is not yet implemented.");
      return { checkType: "technical", success: true };
    }

    // Load subtasks
    const subtasksFile = yield* loadSubtasksFileEffect(subtasksPath);

    // Check for completed subtasks with commitHash
    const completed = getCompletedWithCommitHash(subtasksFile);
    if (completed.length === 0) {
      yield* logger.info(
        "No completed subtasks with commitHash found. Nothing to analyze.",
      );
      return { checkType: "technical", success: true };
    }

    // Load config and determine approval mode
    const config = yield* configService.load();
    const approvalMode = getApprovalMode(config, options);

    // Read the prompt file
    const promptContent = yield* fs.readFile(promptPath);

    // Build the prompt with context
    const prompt = `Execute technical drift analysis.

Follow the instructions in @${promptPath}

Subtasks file: @${subtasksPath}

Context files:
@${path.join(contextRoot, "CLAUDE.md")}

Approval mode: ${approvalMode}

Analyze code quality issues in completed subtasks and output a summary to stdout.

${promptContent}`;

    // Run Claude for analysis
    yield* logger.info("Invoking Claude for technical drift analysis...");
    const response = yield* claude.headless({ prompt });

    yield* logger.info("");
    yield* logger.info("=== Technical Drift Check Complete ===");

    return { checkType: "technical", response, success: true };
  });
}

// =============================================================================
// Service Implementations
// =============================================================================

/**
 * Live implementation of RalphConfigService
 */
const makeRalphConfigService: RalphConfigServiceImpl = {
  load: () =>
    Effect.gen(function* loadConfigGen() {
      const fs = yield* FileSystem;

      // Try to load from context root
      const configPath = "aaa.config.json";
      const hasConfig = yield* fs.exists(configPath);

      if (!hasConfig) {
        // Return default config if file doesn't exist
        const defaultConfig: RalphConfig = {
          selfImprovement: { mode: "suggest" },
        };
        return defaultConfig;
      }

      const config = yield* Effect.tryPromise({
        catch: () =>
          new ConfigNotFoundError({
            message: `Failed to load config from ${configPath}`,
            path: configPath,
          }),
        try: async () => {
          const content = await fs.readFile(configPath).pipe(Effect.runPromise);
          const parsed = JSON.parse(content) as { ralph?: RalphConfig };
          const emptyConfig: RalphConfig = {};
          return parsed.ralph ?? emptyConfig;
        },
      });

      return config;
    }),
};

// =============================================================================
// Layers
// =============================================================================

/**
 * Live layer for RalphConfigService
 */
const RalphConfigServiceLive = Layer.succeed(
  RalphConfigService,
  makeRalphConfigService,
);

// =============================================================================
// Exports
// =============================================================================

export {
  CalibrationPromptNotFoundError,
  ConfigNotFoundError,
  getApprovalMode,
  getCompletedSessionIds,
  getCompletedWithCommitHash,
  NoSessionsError,
  NoSubtasksError,
  RalphConfigService,
  RalphConfigServiceLive,
  runAllChecksEffect,
  runCalibrateEffect,
  runImproveCheckEffect,
  runIntentionCheckEffect,
  runTechnicalCheckEffect,
};

export type {
  CalibrateError,
  CalibrateOptions,
  CalibrateResult,
  CalibrateSubcommand,
  RalphConfigServiceImpl,
};

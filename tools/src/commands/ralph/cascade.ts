/**
 * Cascade orchestration module for Ralph autonomous development framework
 *
 * This module implements cascade mode - the ability to chain Ralph levels together:
 * roadmap → stories → tasks → subtasks → build → calibrate
 *
 * Features:
 * - Level ordering and validation
 * - Cascade target validation (forward-only)
 * - TTY-aware prompting between levels
 *
 * @see docs/planning/milestones/003-ralph-workflow/tasks/TASK-002-cascade-module.md
 */

import * as readline from "node:readline";

import type { BuildOptions } from "./types";

import runBuild from "./build";
import { type CalibrateSubcommand, runCalibrate } from "./calibrate";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for cascade execution
 *
 * Contains context needed to execute cascade levels, plus cascade-specific settings.
 */
interface CascadeFromOptions {
  /** Run calibration every N build iterations (0 = disabled) */
  calibrateEvery?: number;
  /** Repository root path */
  contextRoot: string;
  /** Skip confirmation prompts between cascade levels (for CI/automation) */
  headless?: boolean;
  /** Path to subtasks.json file */
  subtasksPath: string;
}

/**
 * Result of a cascade execution
 *
 * Tracks which levels completed successfully and where the cascade stopped
 */
interface CascadeFromResult {
  /** Levels that completed successfully */
  completedLevels: Array<string>;
  /** Error message if cascade failed, null on success */
  error: null | string;
  /** Level where cascade stopped (on error or user abort), null if completed */
  stoppedAt: null | string;
  /** Whether the cascade completed all requested levels */
  success: boolean;
}

/**
 * Definition of a cascade level with metadata
 */
interface CascadeLevelDefinition {
  /** Human-readable name of the level */
  name: string;
  /** Numeric order in cascade sequence (lower = earlier) */
  order: number;
  /** Whether this level requires a milestone to be specified */
  requiresMilestone: boolean;
}

/**
 * Options for runLevel dispatcher
 *
 * Contains the minimum context needed to execute any cascade level.
 * Additional options are derived or defaulted within each level's handler.
 */
interface RunLevelOptions {
  /** Run calibration every N build iterations (0 = disabled) */
  calibrateEvery?: number;
  /** Repository root path */
  contextRoot: string;
  /** Path to subtasks.json file */
  subtasksPath: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Ordered array of cascade levels
 *
 * Defines the progression from high-level planning (roadmap) through
 * implementation (build) to quality assurance (calibrate).
 */
const LEVELS: ReadonlyArray<CascadeLevelDefinition> = [
  { name: "roadmap", order: 0, requiresMilestone: false },
  { name: "stories", order: 1, requiresMilestone: true },
  { name: "tasks", order: 2, requiresMilestone: true },
  { name: "subtasks", order: 3, requiresMilestone: true },
  { name: "build", order: 4, requiresMilestone: true },
  { name: "calibrate", order: 5, requiresMilestone: true },
] as const;

/**
 * Valid level names for cascade targets
 */
type CascadeLevelName =
  | "build"
  | "calibrate"
  | "roadmap"
  | "stories"
  | "subtasks"
  | "tasks";

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Find a level definition by name
 *
 * @param name - Level name to find
 * @returns Level definition or undefined if not found
 */
function findLevel(name: string): CascadeLevelDefinition | undefined {
  return LEVELS.find((level) => level.name === name);
}

/**
 * Get levels in range between start and target (exclusive of start, inclusive of target)
 *
 * Returns the levels that need to be executed when cascading from 'from' to 'to'.
 * Does NOT include the 'from' level (it's already done when cascade starts).
 *
 * @param from - Starting level name (already completed)
 * @param to - Target level name (inclusive)
 * @returns Array of level names to execute, or empty array if invalid
 *
 * @example
 * getLevelsInRange("stories", "build") // Returns ["tasks", "subtasks", "build"]
 * getLevelsInRange("subtasks", "calibrate") // Returns ["build", "calibrate"]
 */
function getLevelsInRange(from: string, to: string): Array<string> {
  const fromLevel = findLevel(from);
  const toLevel = findLevel(to);

  // Return empty array for invalid inputs
  if (fromLevel === undefined || toLevel === undefined) {
    return [];
  }

  // Return empty array if 'to' is not after 'from'
  if (toLevel.order <= fromLevel.order) {
    return [];
  }

  // Filter levels that are after 'from' and up to/including 'to'
  return LEVELS.filter(
    (level) => level.order > fromLevel.order && level.order <= toLevel.order,
  ).map((level) => level.name);
}

/**
 * Get list of valid level names for error messages
 *
 * @returns Comma-separated list of valid level names
 */
function getValidLevelNames(): string {
  return LEVELS.map((level) => level.name).join(", ");
}

/**
 * Check if a string is a valid cascade level name
 *
 * @param name - String to check
 * @returns true if valid level name
 */
function isValidLevelName(name: string): name is CascadeLevelName {
  return LEVELS.some((level) => level.name === name);
}

/**
 * Prompt user to continue to next cascade level
 *
 * Checks process.stdin.isTTY before prompting:
 * - TTY mode: Shows prompt and waits for user response
 * - Non-TTY mode: Returns true (continue) without blocking
 *
 * @param completed - Name of the level that just completed
 * @param next - Name of the next level to run
 * @returns Promise resolving to true to continue, false to abort
 *
 * @example
 * const shouldContinue = await promptContinue("stories", "tasks");
 * if (!shouldContinue) {
 *   console.log("Cascade aborted by user");
 *   return;
 * }
 */
async function promptContinue(
  completed: string,
  next: string,
): Promise<boolean> {
  // Check if running in TTY mode
  if (!process.stdin.isTTY) {
    console.log(
      `Non-interactive mode: continuing from ${completed} to ${next}...`,
    );
    return true;
  }

  // Interactive prompt using readline
  // eslint-disable-next-line promise/avoid-new -- readline requires manual Promise wrapping
  return new Promise<boolean>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Handle Ctrl+C explicitly - propagate to process-level handler
    rl.on("SIGINT", () => {
      rl.close();
      process.emit("SIGINT");
    });

    rl.question(
      `\n✓ Completed ${completed}. Continue to ${next}? [Y/n]: `,
      (answer) => {
        rl.close();
        const normalized = answer.trim().toLowerCase();
        // Default to yes (empty answer), explicit 'n' or 'no' to abort
        if (normalized === "n" || normalized === "no") {
          resolve(false);
        } else {
          resolve(true);
        }
      },
    );
  });
}

/**
 * Execute a cascade from one level to another
 *
 * Orchestrates the execution of multiple Ralph levels in sequence:
 * 1. Validates the cascade direction (must be forward)
 * 2. Determines which levels to execute
 * 3. Executes each level in order
 * 4. Prompts user for continuation between levels (unless headless)
 *
 * @param start - Starting level (already completed, not re-executed)
 * @param target - Target level to cascade to (inclusive)
 * @param options - Cascade options including contextRoot, subtasksPath, and headless flag
 * @returns CascadeFromResult with completion status and details
 *
 * @example
 * // Cascade from subtasks to calibrate
 * const result = await runCascadeFrom('subtasks', 'calibrate', {
 *   contextRoot: '/path/to/repo',
 *   subtasksPath: '/path/to/subtasks.json',
 * });
 * if (!result.success) {
 *   console.error(`Cascade failed at ${result.stoppedAt}: ${result.error}`);
 * }
 */
async function runCascadeFrom(
  start: string,
  target: string,
  options: CascadeFromOptions,
): Promise<CascadeFromResult> {
  const runOptions: RunLevelOptions = {
    calibrateEvery: options.calibrateEvery,
    contextRoot: options.contextRoot,
    subtasksPath: options.subtasksPath,
  };

  // Step 1: Validate cascade direction
  const validationError = validateCascadeTarget(start, target);
  if (validationError !== null) {
    return {
      completedLevels: [],
      error: validationError,
      stoppedAt: start,
      success: false,
    };
  }

  // Step 2: Get levels to execute
  const levelsToExecute = getLevelsInRange(start, target);
  if (levelsToExecute.length === 0) {
    return {
      completedLevels: [],
      error: `No levels between '${start}' and '${target}'`,
      stoppedAt: start,
      success: false,
    };
  }

  // Step 3: Execute each level in sequence
  const completedLevels: Array<string> = [];
  let lastCompletedLevel = start;
  let isFirstLevel = true;

  for (const currentLevel of levelsToExecute) {
    // Prompt for continuation between levels (unless headless or first level)
    if (!isFirstLevel && options.headless !== true) {
      // eslint-disable-next-line no-await-in-loop -- Must await user prompt before proceeding
      const shouldContinue = await promptContinue(
        lastCompletedLevel,
        currentLevel,
      );
      if (!shouldContinue) {
        return {
          completedLevels,
          error: "User aborted cascade",
          stoppedAt: currentLevel,
          success: false,
        };
      }
    }
    isFirstLevel = false;

    console.log(`\n=== Running cascade level: ${currentLevel} ===\n`);

    // Execute the level
    // eslint-disable-next-line no-await-in-loop -- Levels must execute sequentially
    const levelError = await runLevel(currentLevel, runOptions);
    if (levelError !== null) {
      return {
        completedLevels,
        error: levelError,
        stoppedAt: currentLevel,
        success: false,
      };
    }

    // Track completion
    completedLevels.push(currentLevel);
    lastCompletedLevel = currentLevel;
  }

  // All levels completed successfully
  return { completedLevels, error: null, stoppedAt: null, success: true };
}

/**
 * Execute a single cascade level
 *
 * Dispatches to the appropriate function based on level name:
 * - 'build' → runBuild()
 * - 'calibrate' → runCalibrate('all')
 *
 * Note: Planning levels (roadmap, stories, tasks, subtasks) are not yet
 * implemented as they require interactive Claude sessions.
 *
 * @param level - Level name to execute
 * @param options - Options containing contextRoot and subtasksPath
 * @returns Error message string on failure, null on success
 *
 * @example
 * const error = await runLevel('build', { contextRoot: '/path/to/repo', subtasksPath: '/path/to/subtasks.json' });
 * if (error !== null) {
 *   console.error(`Level failed: ${error}`);
 * }
 */
async function runLevel(
  level: string,
  options: RunLevelOptions,
): Promise<null | string> {
  const { calibrateEvery = 0, contextRoot, subtasksPath } = options;

  // Validate level name
  if (!isValidLevelName(level)) {
    return `Invalid level '${level}'. Valid levels: ${getValidLevelNames()}`;
  }

  switch (level) {
    case "build": {
      // Build default options for runBuild
      const buildOptions: BuildOptions = {
        calibrateEvery,
        interactive: false,
        maxIterations: 0,
        mode: "headless",
        quiet: false,
        skipSummary: false,
        subtasksPath,
        validateFirst: false,
      };

      try {
        await runBuild(buildOptions, contextRoot);
        return null;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `Build failed: ${message}`;
      }
    }

    case "calibrate": {
      const calibrateSubcommand: CalibrateSubcommand = "all";
      const didSucceed = runCalibrate(calibrateSubcommand, {
        contextRoot,
        subtasksPath,
      });
      return didSucceed ? null : "Calibration failed";
    }

    case "roadmap":
    case "stories":
    case "subtasks":
    case "tasks": {
      // Planning levels require interactive Claude sessions
      // They will be implemented when the cascade CLI integration is done
      return `Level '${level}' is a planning level and is not yet implemented for cascade execution`;
    }

    default: {
      // TypeScript exhaustiveness check - level is validated before switch,
      // so this should never be reached. Using String() to handle never type.
      return `Unknown level '${String(level)}'`;
    }
  }
}

// =============================================================================
// Main Cascade Loop
// =============================================================================

/**
 * Validate cascade target direction
 *
 * Cascades can only flow forward (higher order numbers).
 * For example: tasks → build is valid, build → tasks is invalid.
 *
 * @param from - Starting level name
 * @param to - Target level name
 * @returns Error message if invalid, null if valid
 *
 * @example
 * validateCascadeTarget("tasks", "stories") // Returns error (backward)
 * validateCascadeTarget("subtasks", "build") // Returns null (valid)
 */
function validateCascadeTarget(from: string, to: string): null | string {
  // Validate 'from' level
  if (!isValidLevelName(from)) {
    return `Invalid starting level '${from}'. Valid levels: ${getValidLevelNames()}`;
  }

  // Validate 'to' level
  if (!isValidLevelName(to)) {
    return `Invalid target level '${to}'. Valid levels: ${getValidLevelNames()}`;
  }

  const fromLevel = findLevel(from);
  const toLevel = findLevel(to);

  // Should never happen after isValidLevelName checks, but TypeScript needs this
  if (fromLevel === undefined || toLevel === undefined) {
    return "Internal error: level not found";
  }

  // Check direction - must go forward (higher order)
  if (toLevel.order <= fromLevel.order) {
    return `Cannot cascade backward from '${from}' to '${to}'. Cascade must flow forward through: ${getValidLevelNames()}`;
  }

  return null;
}

// =============================================================================
// Exports
// =============================================================================

export {
  type CascadeFromOptions,
  type CascadeFromResult,
  type CascadeLevelDefinition,
  type CascadeLevelName,
  getLevelsInRange,
  getValidLevelNames,
  isValidLevelName,
  LEVELS,
  promptContinue,
  runCascadeFrom,
  runLevel,
  type RunLevelOptions,
  validateCascadeTarget,
};

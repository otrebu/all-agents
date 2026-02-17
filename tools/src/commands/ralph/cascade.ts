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

import { type ApprovalsConfig, loadAaaConfig } from "@tools/lib/config";
import * as readline from "node:readline";

import type { ProviderType } from "./providers/types";
import type { BuildOptions } from "./types";

import {
  type ApprovalAction,
  type ApprovalContext,
  type ApprovalGate,
  evaluateApproval,
  finalizeExitUnstaged,
  handleNotifyWait,
  prepareExitUnstaged,
  promptApproval,
} from "./approvals";
import runBuild from "./build";
import { type CalibrateSubcommand, runCalibrate } from "./calibrate";
import {
  type ApprovalGateCardData,
  renderApprovalGateCard,
  renderEventLine,
  renderPhaseCard,
} from "./display";
import { createPipelineRenderer } from "./pipeline-renderer";
import raiseSigint from "./signal";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of an approval gate check.
 */
type ApprovalResult = "aborted" | "continue" | "exit-unstaged";

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
  /** Skip approvals by forcing write actions at all gates (`--force`) */
  forceFlag?: boolean;
  /** Optional level to resume from; overrides the runCascadeFrom start argument */
  fromLevel?: string;
  /** Skip confirmation prompts between cascade levels (for CI/automation) */
  headless?: boolean;
  /** Absolute or workspace path to the milestone directory */
  milestonePath?: string;
  /** Provider model identifier to propagate across cascaded levels */
  model?: string;
  /** Optional runner used to execute planning levels inside cascade */
  planningLevelRunner?: PlanningLevelRunner;
  /** Provider selection to propagate across cascaded levels */
  provider?: ProviderType;
  /** Require approvals by forcing gate review behavior (`--review`) */
  reviewFlag?: boolean;
  /** Path to subtasks.json file */
  subtasksPath: string;
  /** Run pre-build validation before cascading into build level */
  validateFirst?: boolean;
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
 * Approval context with optional metadata used for exit-unstaged handling.
 */
interface CheckApprovalContext extends ApprovalContext {
  cascadeTarget?: string;
  milestonePath?: string;
}

/**
 * Callback used by cascade orchestration to execute planning levels.
 */
type PlanningLevelRunner = (
  level: "subtasks" | "tasks",
  options: PlanningLevelRunnerOptions,
) => Promise<null | string>;

/**
 * Options passed to a planning-level runner invoked by runLevel().
 */
interface PlanningLevelRunnerOptions {
  /** Repository root path */
  contextRoot: string;
  /** Resolved milestone root path */
  milestonePath: string;
  /** Provider model identifier to pass through to build/calibrate */
  model?: string;
  /** Provider selection for planning invocation */
  provider?: ProviderType;
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
  /** Skip approvals by forcing write actions at all gates (`--force`) */
  forceFlag?: boolean;
  /** Resolved milestone root path for milestone-scoped planning levels */
  milestonePath?: string;
  /** Provider model identifier to pass through to build/calibrate */
  model?: string;
  /** Optional runner used to execute planning levels inside cascade */
  planningLevelRunner?: PlanningLevelRunner;
  /** Provider selection to pass through to build/calibrate */
  provider?: ProviderType;
  /** Require approvals by forcing gate review behavior (`--review`) */
  reviewFlag?: boolean;
  /** Path to subtasks.json file */
  subtasksPath: string;
  /** Run pre-build validation before build level */
  validateFirst?: boolean;
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

/**
 * Cascade levels with runnable adapters in runLevel().
 *
 * tasks/subtasks run through an injected planning runner.
 */
const EXECUTABLE_LEVELS: ReadonlySet<CascadeLevelName> = new Set([
  "build",
  "calibrate",
  "subtasks",
  "tasks",
]);

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Build approval context from cascade options.
 */
function buildApprovalContext(options: CascadeFromOptions): ApprovalContext {
  return {
    forceFlag: options.forceFlag === true,
    isTTY: Boolean(process.stdin.isTTY) && options.headless !== true,
    reviewFlag: options.reviewFlag === true,
  };
}

/**
 * Check approval gate before executing a cascade level.
 */
function buildApprovalGateCardData(cardContext: {
  approvalConfig: ApprovalsConfig | undefined;
  context: CheckApprovalContext;
  gate: ApprovalGate;
  level: CascadeLevelName;
  resolvedAction: ApprovalAction;
}): ApprovalGateCardData {
  const { approvalConfig, context, gate, level, resolvedAction } = cardContext;

  return {
    actionOptions: [
      { color: "green", key: "Y", label: "Approve and continue" },
      { color: "red", key: "n", label: "Abort cascade" },
      { color: "yellow", key: "e", label: "Edit files first" },
    ],
    configMode: approvalConfig?.[gate] ?? "suggest",
    executionMode: context.isTTY ? "supervised" : "headless",
    gateName: gate,
    resolvedAction,
    summaryLines: [`Generated artifacts for ${level} level`],
  };
}

// eslint-disable-next-line max-params -- callback hook is needed for renderer wait-state wiring
async function checkApprovalGate(
  level: CascadeLevelName,
  approvalConfig: ApprovalsConfig | undefined,
  context: CheckApprovalContext,
  onWaiting?: (gateName: ApprovalGate) => void,
): Promise<ApprovalResult> {
  const gate = levelToGate(level);

  if (gate === null) {
    return "continue";
  }

  const action: ApprovalAction = evaluateApproval(
    gate,
    approvalConfig,
    context,
  );
  const gateCardData = buildApprovalGateCardData({
    approvalConfig,
    context,
    gate,
    level,
    resolvedAction: action,
  });

  switch (action) {
    case "exit-unstaged": {
      if (onWaiting !== undefined) {
        onWaiting(gate);
      }
      console.log(renderApprovalGateCard(gateCardData));
      console.log(
        `[Approval] exit-unstaged for ${gate} - manual review required`,
      );
      if (
        context.cascadeTarget !== undefined &&
        context.milestonePath !== undefined
      ) {
        prepareExitUnstaged({
          cascadeTarget: context.cascadeTarget,
          gate,
          level,
          milestonePath: context.milestonePath,
        });
      }
      return "exit-unstaged";
    }

    case "notify-wait": {
      if (onWaiting !== undefined) {
        onWaiting(gate);
      }
      const summary = `Proceeding with ${level} level`;
      await handleNotifyWait(gate, approvalConfig, summary, gateCardData);
      return "continue";
    }

    case "prompt": {
      if (onWaiting !== undefined) {
        onWaiting(gate);
      }
      const summary = `Proceeding with ${level} level`;
      const isApproved = await promptApproval(gate, summary, gateCardData);
      return isApproved ? "continue" : "aborted";
    }

    case "write": {
      console.log(renderApprovalGateCard(gateCardData));
      return "continue";
    }

    default: {
      return "continue";
    }
  }
}

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
 * Get runnable cascade targets from a specific starting level.
 */
function getSupportedCascadeTargets(
  from: CascadeLevelName,
): Array<CascadeLevelName> {
  const fromLevel = findLevel(from);
  if (fromLevel === undefined) {
    return [];
  }

  const supportedTargets: Array<CascadeLevelName> = [];

  for (const candidate of LEVELS) {
    if (candidate.order > fromLevel.order && isValidLevelName(candidate.name)) {
      const pathLevels = getLevelsInRange(from, candidate.name);
      const isRunnablePath = pathLevels.every(
        (levelName) =>
          isValidLevelName(levelName) && isExecutableLevel(levelName),
      );

      if (isRunnablePath) {
        supportedTargets.push(candidate.name);
      }
    }
  }

  return supportedTargets;
}

/**
 * Get unsupported (non-executable) levels in a cascade path.
 */
function getUnsupportedLevelsInPath(
  from: CascadeLevelName,
  to: CascadeLevelName,
): Array<CascadeLevelName> {
  const unsupportedLevels: Array<CascadeLevelName> = [];

  for (const level of getLevelsInRange(from, to)) {
    if (isValidLevelName(level) && !isExecutableLevel(level)) {
      unsupportedLevels.push(level);
    }
  }

  return unsupportedLevels;
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
 * Check whether a level can be dispatched by runLevel().
 */
function isExecutableLevel(level: CascadeLevelName): boolean {
  return EXECUTABLE_LEVELS.has(level);
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
 * Map cascade level to approval gate.
 */
function levelToGate(level: CascadeLevelName): ApprovalGate | null {
  const mapping: Record<CascadeLevelName, ApprovalGate | null> = {
    build: null,
    calibrate: null,
    roadmap: "createRoadmap",
    stories: "createStories",
    subtasks: "createSubtasks",
    tasks: "createTasks",
  };

  return mapping[level];
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
      renderEventLine({
        domain: "CASCADE",
        message: `Non-interactive mode: continuing from ${completed} to ${next}`,
        state: "INFO",
      }),
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
      raiseSigint();
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
  const aaaConfig = loadAaaConfig();
  const approvalConfig = aaaConfig.ralph?.approvals;
  const approvalContext = buildApprovalContext(options);
  const resolvedMilestonePath = options.milestonePath ?? options.contextRoot;
  const effectiveStart = options.fromLevel ?? start;

  if (options.fromLevel !== undefined && !isValidLevelName(options.fromLevel)) {
    return {
      completedLevels: [],
      error: `Invalid level '${options.fromLevel}'. Valid levels: ${getValidLevelNames()}`,
      stoppedAt: options.fromLevel,
      success: false,
    };
  }

  const runOptions: RunLevelOptions = {
    calibrateEvery: options.calibrateEvery,
    contextRoot: options.contextRoot,
    forceFlag: options.forceFlag,
    milestonePath: options.milestonePath,
    model: options.model,
    planningLevelRunner: options.planningLevelRunner,
    provider: options.provider,
    reviewFlag: options.reviewFlag,
    subtasksPath: options.subtasksPath,
    validateFirst: options.validateFirst,
  };

  // Step 1: Validate cascade direction
  const validationError = validateCascadeTarget(effectiveStart, target);
  if (validationError !== null) {
    return {
      completedLevels: [],
      error: validationError,
      stoppedAt: effectiveStart,
      success: false,
    };
  }

  // Step 2: Get levels to execute
  const levelsToExecute = getLevelsInRange(effectiveStart, target);
  if (levelsToExecute.length === 0) {
    return {
      completedLevels: [],
      error: `No levels between '${effectiveStart}' and '${target}'`,
      stoppedAt: effectiveStart,
      success: false,
    };
  }

  const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const renderer = createPipelineRenderer(
    levelsToExecute,
    options.headless === true,
    isTTY,
  );

  // Step 3: Execute each level in sequence
  const completedLevels: Array<string> = [];
  let lastCompletedLevel = effectiveStart;
  let isFirstLevel = true;

  try {
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

      if (!isValidLevelName(currentLevel)) {
        return {
          completedLevels,
          error: `Invalid level '${currentLevel}'. Valid levels: ${getValidLevelNames()}`,
          stoppedAt: currentLevel,
          success: false,
        };
      }

      renderer.startPhase(currentLevel);
      const phaseStartedAt = Date.now();

      const approvalGate = levelToGate(currentLevel);

      // eslint-disable-next-line no-await-in-loop -- Approval must be checked per level before execution
      const approvalResult = await checkApprovalGate(
        currentLevel,
        approvalConfig,
        {
          ...approvalContext,
          cascadeTarget: target,
          milestonePath: resolvedMilestonePath,
        },
        (gateName) => {
          renderer.setApprovalWait(gateName);
        },
      );

      if (approvalResult === "aborted") {
        return {
          completedLevels,
          error: "Aborted by user at approval prompt",
          stoppedAt: currentLevel,
          success: false,
        };
      }

      renderer.startPhase(currentLevel);
      renderer.suspend();

      console.log(
        renderPhaseCard({
          domain: "CASCADE",
          lines: [
            `Target: ${target}`,
            `Completed so far: ${completedLevels.length}/${levelsToExecute.length}`,
          ],
          state: "START",
          title: `Running level: ${currentLevel}`,
        }),
      );

      // Execute the level
      // eslint-disable-next-line no-await-in-loop -- Levels must execute sequentially
      const levelError = await (async () => {
        try {
          return await runLevel(currentLevel, runOptions);
        } finally {
          renderer.resume();
        }
      })();
      if (levelError !== null) {
        return {
          completedLevels,
          error: levelError,
          stoppedAt: currentLevel,
          success: false,
        };
      }

      renderer.completePhase({
        costUsd: 0,
        filesChanged: 0,
        timeElapsedMs: Math.max(0, Date.now() - phaseStartedAt),
      });

      if (approvalResult === "exit-unstaged") {
        if (approvalGate === null) {
          return {
            completedLevels,
            error: "Internal error: exit-unstaged without approval gate",
            stoppedAt: currentLevel,
            success: false,
          };
        }

        finalizeExitUnstaged(
          {
            cascadeTarget: target,
            gate: approvalGate,
            level: currentLevel,
            milestonePath: resolvedMilestonePath,
          },
          `Generated artifacts for ${currentLevel} level.`,
        );

        return {
          completedLevels,
          error: null,
          stoppedAt: currentLevel,
          success: false,
        };
      }

      // Track completion
      completedLevels.push(currentLevel);
      lastCompletedLevel = currentLevel;
      console.log(
        renderEventLine({
          domain: "CASCADE",
          message: `Completed level: ${currentLevel}`,
          state: "DONE",
        }),
      );
    }

    // All levels completed successfully
    return { completedLevels, error: null, stoppedAt: null, success: true };
  } finally {
    renderer.stop();
  }
}

/**
 * Execute a single cascade level
 *
 * Dispatches to the appropriate function based on level name:
 * - 'tasks'/'subtasks' → planningLevelRunner() when provided
 * - 'build' → runBuild()
 * - 'calibrate' → runCalibrate('all')
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
  const {
    calibrateEvery = 0,
    contextRoot,
    forceFlag: isForceFlag,
    milestonePath,
    model,
    planningLevelRunner,
    provider,
    reviewFlag: isReviewFlag,
    subtasksPath,
    validateFirst: shouldValidateFirst = false,
  } = options;

  // Validate level name
  if (!isValidLevelName(level)) {
    return `Invalid level '${level}'. Valid levels: ${getValidLevelNames()}`;
  }

  switch (level) {
    case "build": {
      // Build default options for runBuild
      const buildOptions: BuildOptions = {
        calibrateEvery,
        force: isForceFlag === true,
        interactive: false,
        maxIterations: 0,
        mode: "headless",
        model,
        provider,
        quiet: false,
        review: isReviewFlag === true,
        skipSummary: false,
        subtasksPath,
        validateFirst: shouldValidateFirst,
      };

      try {
        await runBuild(buildOptions, contextRoot);
        return null;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `Build failed: ${message}`;
      }
    }

    case "subtasks":
    case "tasks": {
      if (milestonePath === undefined || milestonePath === "") {
        return `Level '${level}' requires a milestone path for cascade execution`;
      }

      if (planningLevelRunner === undefined) {
        return `Level '${level}' requires a planning-level runner for cascade execution`;
      }

      return planningLevelRunner(level, {
        contextRoot,
        milestonePath,
        model,
        provider,
      });
    }

    case "calibrate": {
      const calibrateSubcommand: CalibrateSubcommand = "all";
      const didSucceed = await runCalibrate(calibrateSubcommand, {
        contextRoot,
        force: isForceFlag,
        model,
        provider,
        review: isReviewFlag,
        subtasksPath,
      });
      return didSucceed ? null : "Calibration failed";
    }

    case "roadmap":
    case "stories": {
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

  const supportedTargets = getSupportedCascadeTargets(from);
  if (!supportedTargets.includes(to)) {
    const unsupportedLevels = getUnsupportedLevelsInPath(from, to);
    const supportedList =
      supportedTargets.length === 0 ? "none" : supportedTargets.join(", ");
    const unsupportedList =
      unsupportedLevels.length === 0 ? "none" : unsupportedLevels.join(", ");

    return `Cascade from '${from}' to '${to}' is not executable yet. Unsupported levels in path: ${unsupportedList}. Supported targets from '${from}': ${supportedList}.`;
  }

  return null;
}

// =============================================================================
// Exports
// =============================================================================

export {
  type ApprovalResult,
  buildApprovalContext,
  type CascadeFromOptions,
  type CascadeFromResult,
  type CascadeLevelDefinition,
  type CascadeLevelName,
  type CheckApprovalContext,
  checkApprovalGate,
  getLevelsInRange,
  getValidLevelNames,
  isValidLevelName,
  LEVELS,
  levelToGate,
  type PlanningLevelRunner,
  type PlanningLevelRunnerOptions,
  promptContinue,
  runCascadeFrom,
  runLevel,
  type RunLevelOptions,
  validateCascadeTarget,
};

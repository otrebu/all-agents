/**
 * Build loop for Ralph autonomous development framework
 *
 * This module implements the core iteration loop that:
 * 1. Loads subtasks from subtasks.json
 * 2. Gets the next pending subtask
 * 3. Tracks retry attempts per subtask
 * 4. Invokes Claude in supervised or headless mode
 * 5. Reloads subtasks.json after each iteration to check completion
 *
 * @see docs/planning/ralph-migration-implementation-plan.md
 */

import { findProjectRoot } from "@tools/utils/paths";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import * as readline from "node:readline";

import type { BuildOptions, Subtask } from "./types";

import { runCalibrate } from "./calibrate";
import { buildPrompt, invokeClaudeChat, invokeClaudeHeadless } from "./claude";
import {
  countRemaining,
  getMilestoneFromSubtasks,
  getNextSubtask,
  loadSubtasksFile,
} from "./config";
import {
  renderBuildSummary,
  renderInvocationHeader,
  renderIterationEnd,
  renderIterationStart,
  renderMarkdown,
  renderResponseHeader,
} from "./display";
import { executeHook } from "./hooks";
import {
  type PostIterationResult,
  runPostIterationHook,
} from "./post-iteration";
import { discoverRecentSession } from "./session";

// =============================================================================
// Constants
// =============================================================================

/** Default prompt path relative to context root */
const ITERATION_PROMPT_PATH =
  "context/workflows/ralph/building/ralph-iteration.md";

// =============================================================================
// Types
// =============================================================================

/**
 * Context for headless iteration processing
 */
interface HeadlessIterationContext {
  contextRoot: string;
  currentAttempts: number;
  currentSubtask: Subtask;
  iteration: number;
  maxIterations: number;
  prompt: string;
  remaining: number;
  shouldSkipSummary: boolean;
  subtasksPath: string;
}

/**
 * Result from headless iteration processing
 */
interface HeadlessIterationResult {
  costUsd: number;
  didComplete: boolean;
  durationMs: number;
  hookResult: null | PostIterationResult;
}

/**
 * Options for periodic calibration
 */
interface PeriodicCalibrationOptions {
  calibrateEvery: number;
  contextRoot: string;
  iteration: number;
  subtasksPath: string;
}

/**
 * Context for supervised iteration processing
 */
interface SupervisedIterationContext {
  contextRoot: string;
  currentAttempts: number;
  currentSubtask: Subtask;
  iteration: number;
  maxIterations: number;
  remaining: number;
  subtasksPath: string;
}

/**
 * Result from supervised iteration processing
 */
interface SupervisedIterationResult {
  didComplete: boolean;
  hookResult: null | PostIterationResult;
}

// =============================================================================
// Interactive Prompts
// =============================================================================

/**
 * Build the iteration prompt with subtask context
 *
 * @param contextRoot - Repository root path
 * @param subtasksPath - Path to subtasks.json file
 * @returns Full prompt string for Claude
 */
function buildIterationPrompt(
  contextRoot: string,
  subtasksPath: string,
): string {
  const promptPath = path.join(contextRoot, ITERATION_PROMPT_PATH);

  if (!existsSync(promptPath)) {
    throw new Error(`Iteration prompt not found: ${promptPath}`);
  }

  const promptContent = readFileSync(promptPath, "utf8");

  // Derive PROGRESS.md location from subtasks.json location
  const subtasksDirectory = path.dirname(subtasksPath);
  const progressPath = path.join(subtasksDirectory, "PROGRESS.md");

  // Build context with file references (Claude will read them)
  const extraContext = `Execute one iteration of the Ralph build loop.

Follow the instructions in @${promptPath}

Subtasks file: @${subtasksPath}

Context files:
@${path.join(contextRoot, "CLAUDE.md")}
@${progressPath}

After completing ONE subtask:
1. Update subtasks.json with done: true, completedAt, commitHash, sessionId
2. Append to PROGRESS.md
3. Create the commit
4. STOP - do not continue to the next subtask`;

  return buildPrompt(promptContent, extraContext);
}

// =============================================================================
// Build Loop Implementation
// =============================================================================

/**
 * Check if max iterations exceeded and handle failure
 *
 * @returns true if exceeded and should exit, false to continue
 */
async function handleMaxIterationsExceeded(
  currentAttempts: number,
  maxIterations: number,
  subtaskId: string,
): Promise<boolean> {
  if (maxIterations <= 0 || currentAttempts <= maxIterations) {
    return false;
  }

  console.error(
    `\nError: Max iterations (${maxIterations}) exceeded for subtask: ${subtaskId}`,
  );
  console.error(`Subtask failed after ${maxIterations} attempts`);

  await executeHook("onMaxIterationsExceeded", {
    message: `Subtask ${subtaskId} failed after ${maxIterations} attempts`,
    subtaskId,
  });

  return true;
}

/**
 * Process a single headless iteration
 *
 * @returns Result with cost, duration, diary entry, and completion status
 */
function processHeadlessIteration(
  context: HeadlessIterationContext,
): HeadlessIterationResult | null {
  const {
    contextRoot,
    currentAttempts,
    currentSubtask,
    iteration,
    maxIterations,
    prompt,
    remaining,
    shouldSkipSummary,
    subtasksPath,
  } = context;

  console.log(renderInvocationHeader("headless"));
  console.log();

  // Time Claude invocation for metrics
  const claudeStart = Date.now();
  const result = invokeClaudeHeadless({ prompt });
  const claudeMs = Date.now() - claudeStart;

  if (result === null) {
    console.error("Claude headless invocation failed or was interrupted");
    return null;
  }

  // Display result with markdown rendering
  console.log(`\n${renderResponseHeader()}`);
  console.log(renderMarkdown(result.result));
  console.log();

  // Reload subtasks to check if current one was completed
  const postIterationSubtasks = loadSubtasksFile(subtasksPath);
  const postRemaining = countRemaining(postIterationSubtasks.subtasks);
  const didComplete = postRemaining < remaining;
  const milestone = getMilestoneFromSubtasks(postIterationSubtasks);
  const iterationStatus = didComplete ? "completed" : "retrying";

  // Use target project root for logs (not all-agents)
  const projectRoot = findProjectRoot() ?? contextRoot;
  const hookResult = runPostIterationHook({
    claudeMs,
    costUsd: result.cost,
    iterationNumber: currentAttempts,
    maxAttempts: maxIterations,
    milestone,
    mode: "headless",
    remaining: postRemaining,
    repoRoot: projectRoot,
    sessionId: result.sessionId,
    skipSummary: shouldSkipSummary,
    status: iterationStatus,
    subtask: currentSubtask,
    subtasksPath,
  });

  // Display iteration end box
  if (hookResult !== null) {
    const { diaryPath, entry, sessionPath } = hookResult;
    console.log(
      renderIterationEnd({
        attempt: currentAttempts,
        costUsd: result.cost,
        diaryPath,
        durationMs: result.duration,
        filesChanged: entry.filesChanged?.length ?? 0,
        iteration,
        keyFindings: entry.keyFindings,
        maxAttempts: maxIterations,
        remaining: postRemaining,
        sessionPath: sessionPath ?? undefined,
        status: iterationStatus,
        subtaskId: currentSubtask.id,
        subtaskTitle: currentSubtask.title,
        summary: entry.summary,
        toolCalls: entry.toolCalls,
      }),
    );
  }

  return {
    costUsd: result.cost,
    didComplete,
    durationMs: result.duration,
    hookResult,
  };
}

/**
 * Process a single supervised iteration
 *
 * Captures session timing, discovers session file after completion,
 * and runs post-iteration hook to generate metrics and diary entry.
 *
 * @returns Result with completion status and hook result, or null on failure
 */
function processSupervisedIteration(
  context: SupervisedIterationContext,
): null | SupervisedIterationResult {
  const {
    contextRoot,
    currentAttempts,
    currentSubtask,
    iteration,
    maxIterations,
    remaining,
    subtasksPath,
  } = context;

  console.log(renderInvocationHeader("supervised"));
  console.log();

  // Derive PROGRESS.md location from subtasks.json location
  const subtasksDirectory = path.dirname(subtasksPath);
  const progressPath = path.join(subtasksDirectory, "PROGRESS.md");

  // Capture start time for session discovery
  const startTime = Date.now();

  const chatResult = invokeClaudeChat(
    path.join(contextRoot, ITERATION_PROMPT_PATH),
    "build iteration",
    `Subtasks file: @${subtasksPath}\n\nContext files:\n@${path.join(contextRoot, "CLAUDE.md")}\n@${progressPath}`,
  );

  if (!chatResult.success && !chatResult.interrupted) {
    console.error("Supervised session failed");
    process.exit(chatResult.exitCode ?? 1);
  }

  // Calculate elapsed time for Claude invocation
  const claudeMs = Date.now() - startTime;

  console.log("\nSupervised session completed");

  // Discover the session file created during the interactive session
  const discoveredSession = discoverRecentSession(startTime);

  // Reload subtasks to check completion status
  const postIterationSubtasks = loadSubtasksFile(subtasksPath);
  const postRemaining = countRemaining(postIterationSubtasks.subtasks);
  const didComplete = postRemaining < remaining;
  const milestone = getMilestoneFromSubtasks(postIterationSubtasks);
  const iterationStatus = didComplete ? "completed" : "retrying";

  // Run post-iteration hook if session was discovered
  let hookResult: null | PostIterationResult = null;
  if (discoveredSession !== null) {
    // Use target project root for logs
    const projectRoot = findProjectRoot() ?? contextRoot;

    hookResult = runPostIterationHook({
      claudeMs,
      iterationNumber: currentAttempts,
      maxAttempts: maxIterations,
      milestone,
      mode: "supervised",
      remaining: postRemaining,
      repoRoot: projectRoot,
      sessionId: discoveredSession.sessionId,
      skipSummary: true,
      status: iterationStatus,
      subtask: currentSubtask,
      subtasksPath,
    });

    // Display iteration end box with metrics
    if (hookResult !== null) {
      const { diaryPath, entry, sessionPath } = hookResult;
      console.log(
        renderIterationEnd({
          attempt: currentAttempts,
          diaryPath,
          durationMs: claudeMs,
          filesChanged: entry.filesChanged?.length ?? 0,
          iteration,
          keyFindings: entry.keyFindings,
          maxAttempts: maxIterations,
          remaining: postRemaining,
          sessionPath: sessionPath ?? undefined,
          status: iterationStatus,
          subtaskId: currentSubtask.id,
          subtaskTitle: currentSubtask.title,
          summary: entry.summary,
          toolCalls: entry.toolCalls,
        }),
      );
    }
  }

  return { didComplete, hookResult };
}

/**
 * Prompt user to continue to next iteration
 *
 * Checks process.stdin.isTTY before prompting:
 * - TTY mode: Shows prompt and waits for user response
 * - Non-TTY mode: Returns true (continue) without blocking
 *
 * @returns Promise resolving to true to continue, false to abort
 */
async function promptContinue(): Promise<boolean> {
  // Check if running in TTY mode
  if (!process.stdin.isTTY) {
    console.log("Non-interactive mode detected, continuing automatically...");
    return true;
  }

  // Interactive prompt using readline
  // eslint-disable-next-line promise/avoid-new -- readline requires manual Promise wrapping
  return new Promise<boolean>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      "Continue to next iteration? [Y/n] (Ctrl+C to abort): ",
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
 * Run the build loop
 *
 * Iterates through subtasks, invoking Claude for each until all are done
 * or max iterations is exceeded for a subtask.
 *
 * @param options - Build configuration options
 * @param contextRoot - Repository root path
 * @returns Promise<void> - Async function that runs the build loop
 */
async function runBuild(
  options: BuildOptions,
  contextRoot: string,
): Promise<void> {
  const {
    calibrateEvery,
    interactive: isInteractive,
    maxIterations,
    mode,
    skipSummary: shouldSkipSummary,
    subtasksPath,
    validateFirst: shouldValidateFirst,
  } = options;

  // Validate subtasks file exists
  if (!existsSync(subtasksPath)) {
    console.error(`Subtasks file not found: ${subtasksPath}`);
    console.error(`Create one with: aaa ralph plan subtasks --task <task-id>`);
    process.exit(1);
  }

  // Track retry attempts per subtask ID
  const attempts = new Map<string, number>();

  // Track subtasks completed during this build run
  const completedThisRun: Array<{ attempts: number; id: string }> = [];

  // Build summary tracking
  let totalCompleted = 0;
  let totalFailed = 0;
  let totalCost = 0;
  let totalDuration = 0;
  const allFilesChanged = new Set<string>();

  // Optional pre-build validation (TODO: implement in SUB-025/26)
  if (shouldValidateFirst) {
    console.log(
      "Pre-build validation requested but not yet implemented in TypeScript",
    );
    console.log("Continuing with build...\n");
  }

  let iteration = 1;

  // Main iteration loop
  for (;;) {
    // Reload subtasks file to get latest state
    const subtasksFile = loadSubtasksFile(subtasksPath);
    const remaining = countRemaining(subtasksFile.subtasks);

    // Check if all subtasks are complete
    if (remaining === 0) {
      console.log("\n");
      console.log(
        renderBuildSummary({
          completed: totalCompleted,
          failed: totalFailed,
          totalCostUsd: totalCost,
          totalDurationMs: totalDuration,
          totalFilesChanged: allFilesChanged.size,
          totalIterations: iteration - 1,
        }),
      );
      return;
    }

    // Get the next pending subtask
    const currentSubtask = getNextSubtask(subtasksFile.subtasks);

    if (currentSubtask === null) {
      console.error("Error: Could not determine next subtask");
      process.exit(1);
    }

    // Track attempts for this specific subtask
    const currentAttempts = (attempts.get(currentSubtask.id) ?? 0) + 1;
    attempts.set(currentSubtask.id, currentAttempts);

    // Check if we've exceeded max iterations for this subtask
    // eslint-disable-next-line no-await-in-loop -- Must check before continuing
    const didExceedMaxIterations = await handleMaxIterationsExceeded(
      currentAttempts,
      maxIterations,
      currentSubtask.id,
    );
    if (didExceedMaxIterations) {
      totalFailed += 1;
      process.exit(1);
    }

    // Display iteration start box
    console.log("\n");
    console.log(
      renderIterationStart({
        attempt: currentAttempts,
        iteration,
        maxAttempts: maxIterations,
        remaining,
        subtaskId: currentSubtask.id,
        subtaskTitle: currentSubtask.title,
      }),
    );

    // Build the prompt
    const prompt = buildIterationPrompt(contextRoot, subtasksPath);

    // Invoke Claude based on mode
    let didComplete = false;
    let filesChangedThisIteration: Array<string> = [];

    if (mode === "headless") {
      const headlessResult = processHeadlessIteration({
        contextRoot,
        currentAttempts,
        currentSubtask,
        iteration,
        maxIterations,
        prompt,
        remaining,
        shouldSkipSummary,
        subtasksPath,
      });

      if (headlessResult === null) {
        process.exit(1);
      }

      totalCost += headlessResult.costUsd;
      totalDuration += headlessResult.durationMs;
      ({ didComplete } = headlessResult);
      filesChangedThisIteration =
        headlessResult.hookResult?.entry.filesChanged ?? [];
    } else {
      const supervisedResult = processSupervisedIteration({
        contextRoot,
        currentAttempts,
        currentSubtask,
        iteration,
        maxIterations,
        remaining,
        subtasksPath,
      });

      if (supervisedResult === null) {
        process.exit(1);
      }

      ({ didComplete } = supervisedResult);
      filesChangedThisIteration =
        supervisedResult.hookResult?.entry.filesChanged ?? [];

      if (didComplete) {
        console.log(`\nSubtask ${currentSubtask.id} completed successfully`);
      }
    }

    // Handle completion tracking
    if (didComplete) {
      totalCompleted += 1;
      attempts.delete(currentSubtask.id);
      completedThisRun.push({
        attempts: currentAttempts,
        id: currentSubtask.id,
      });
    }

    // Track files changed
    for (const file of filesChangedThisIteration) {
      allFilesChanged.add(file);
    }

    // Interactive mode: prompt for continuation
    if (isInteractive) {
      // eslint-disable-next-line no-await-in-loop -- Interactive prompt must block
      const shouldContinue = await promptContinue();
      if (!shouldContinue) {
        console.log("\nBuild loop aborted by user");
        return;
      }
    }

    iteration += 1;

    // Run calibration every N iterations (if enabled)
    runPeriodicCalibration({
      calibrateEvery,
      contextRoot,
      iteration,
      subtasksPath,
    });
  }
}

/**
 * Run periodic calibration if enabled and due
 * Placed after runBuild for alphabetical sorting per lint rules.
 */
function runPeriodicCalibration(options: PeriodicCalibrationOptions): void {
  const { calibrateEvery, contextRoot, iteration, subtasksPath } = options;
  if (calibrateEvery > 0 && iteration % calibrateEvery === 0) {
    console.log(
      `\n=== Running calibration (every ${calibrateEvery} iterations) ===\n`,
    );
    runCalibrate("all", { contextRoot, subtasksPath });
  }
}

// =============================================================================
// Exports
// =============================================================================

export default runBuild;

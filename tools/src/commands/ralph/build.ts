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
import chalk from "chalk";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import * as readline from "node:readline";

import type { BuildOptions, Subtask } from "./types";

import { runCalibrate } from "./calibrate";
import {
  buildPrompt,
  invokeClaudeChat,
  invokeClaudeHeadlessAsync,
} from "./claude";
import {
  countRemaining,
  getMilestoneFromSubtasks,
  getNextSubtask,
  loadSubtasksFile,
} from "./config";
import {
  renderBuildPracticalSummary,
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
import { getMilestoneLogsDirectory, readIterationDiary } from "./status";
import { generateBuildSummary } from "./summary";

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
 * Options for checking if max iterations exceeded
 */
interface MaxIterationsCheckOptions {
  currentAttempts: number;
  maxIterations: number;
  milestone?: string;
  subtaskId: string;
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
 * Options for firing the onSubtaskComplete hook
 */
interface SubtaskCompleteHookOptions {
  hookResult: null | PostIterationResult;
  subtask: Subtask;
}

/**
 * Context for summary generation (populated during build)
 * Used by signal handlers to generate summary on interrupt
 */
interface SummaryContext {
  /** Subtasks completed during this build run */
  completedThisRun: Array<{ attempts: number; id: string }>;
  /** Suppress terminal summary output */
  quiet: boolean;
  /** Path to subtasks file */
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
// Module-Level State for Signal Handling
// =============================================================================

/**
 * Flag to prevent double summary generation
 * Set to true after summary is generated (normal completion or interrupt)
 */
let hasSummaryBeenGenerated = false;

/**
 * Context for summary generation (set by runBuild, used by signal handlers)
 * Null until runBuild initializes it
 */
let summaryContext: null | SummaryContext = null;

// =============================================================================
// Build Helpers
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
  currentSubtask: Subtask,
  subtasksPath: string,
): string {
  const promptPath = path.join(contextRoot, ITERATION_PROMPT_PATH);

  if (!existsSync(promptPath)) {
    throw new Error(`Iteration prompt not found: ${promptPath}`);
  }

  const promptContent = readFileSync(promptPath, "utf8");

  // Use the canonical PROGRESS.md location relative to the target repo root.
  const projectRoot = findProjectRoot() ?? contextRoot;
  const progressPath = path.join(projectRoot, "docs/planning/PROGRESS.md");

  const subtaskJson = JSON.stringify(currentSubtask, null, 2);

  // Build context with assigned subtask and paths (avoid inlining large files)
  const extraContext =
    `Execute one iteration of the Ralph build loop.

Work ONLY on the assigned subtask below. Do not pick a different subtask.

Assigned subtask:
\`\`\`json
${subtaskJson}
\`\`\`

Subtasks file path: ${subtasksPath}
Progress log path: ${progressPath}

If you need to inspect the queue, do not read the entire subtasks file; use ` +
    `jq to view only pending items.

After completing the assigned subtask (${currentSubtask.id}):
1. Update subtasks.json for ${currentSubtask.id} with done: true, completedAt, commitHash, sessionId
2. Append to PROGRESS.md
3. Create the commit
4. STOP - do not continue to the next subtask`;

  return buildPrompt(promptContent, extraContext);
}

/**
 * Fire the onSubtaskComplete hook with metrics from the iteration result
 *
 * @param options - Subtask and hook result containing metrics
 */
async function fireSubtaskCompleteHook(
  options: SubtaskCompleteHookOptions,
): Promise<void> {
  const { hookResult, subtask } = options;
  const entry = hookResult?.entry;
  const claudeMs = entry?.timing?.claudeMs;

  await executeHook("onSubtaskComplete", {
    costUsd: entry?.costUsd,
    duration: claudeMs === undefined ? undefined : formatDuration(claudeMs),
    filesChanged: entry?.filesChanged?.length,
    linesAdded: entry?.linesAdded,
    linesRemoved: entry?.linesRemoved,
    message: `Subtask ${subtask.id} completed: ${subtask.title}`,
    milestone: entry?.milestone,
    sessionId: entry?.sessionId,
    subtaskId: subtask.id,
  });
}

/**
 * Format duration in milliseconds to human-readable string
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "2m 30s" or "45s")
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Generate summary and exit with the specified code
 *
 * Generates a practical build summary from diary entries and completed subtasks,
 * writes the summary file, displays it to the terminal, and exits.
 * Prevents double execution via hasSummaryBeenGenerated flag.
 *
 * @param exitCode - Exit code to use (130 for SIGINT, 143 for SIGTERM)
 */
function generateSummaryAndExit(exitCode: number): void {
  // Prevent double execution
  if (hasSummaryBeenGenerated) {
    process.exit(exitCode);
    return;
  }
  hasSummaryBeenGenerated = true;

  // If no context available, can't generate summary
  if (summaryContext === null) {
    console.log("\n\nBuild interrupted before any iterations completed.");
    process.exit(exitCode);
    return;
  }

  const { completedThisRun, quiet: isQuiet, subtasksPath } = summaryContext;

  // If nothing was completed this run, just exit
  if (completedThisRun.length === 0) {
    if (!isQuiet) {
      console.log("\n\nBuild interrupted. No subtasks completed this run.");
    }
    process.exit(exitCode);
    return;
  }

  if (!isQuiet) {
    console.log("\n\nGenerating build summary before exit...\n");
  }

  try {
    // Read diary entries for summary generation
    const logsDirectory = getMilestoneLogsDirectory(subtasksPath);
    const diaryEntries = readIterationDiary(logsDirectory);

    // Load current subtasks file for remaining count
    const subtasksFile = loadSubtasksFile(subtasksPath);

    // Generate the summary
    const summary = generateBuildSummary(
      completedThisRun,
      diaryEntries,
      subtasksFile,
    );

    // Render summary to terminal (unless quiet mode)
    if (!isQuiet) {
      console.log(renderBuildPracticalSummary(summary));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to generate summary: ${message}`);
  }

  process.exit(exitCode);
}

/**
 * Get the latest commit hash from the repository
 *
 * @param projectRoot - Repository root path
 * @returns Commit hash or null if git command fails
 */
function getLatestCommitHash(projectRoot: string): null | string {
  const proc = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
    cwd: projectRoot,
  });
  if (proc.exitCode !== 0) return null;
  return proc.stdout.toString("utf8").trim();
}

/**
 * Check if max iterations exceeded and handle failure
 *
 * @returns true if exceeded and should exit, false to continue
 */
async function handleMaxIterationsExceeded(
  options: MaxIterationsCheckOptions,
): Promise<boolean> {
  const { currentAttempts, maxIterations, milestone, subtaskId } = options;

  if (maxIterations <= 0 || currentAttempts <= maxIterations) {
    return false;
  }

  console.error(
    `\nError: Max iterations (${maxIterations}) exceeded for subtask: ${subtaskId}`,
  );
  console.error(`Subtask failed after ${maxIterations} attempts`);

  await executeHook("onMaxIterationsExceeded", {
    iterationNumber: currentAttempts,
    maxIterations,
    message: `Subtask ${subtaskId} failed after ${maxIterations} attempts`,
    milestone,
    subtaskId,
  });

  return true;
}

// =============================================================================
// Build Loop Implementation
// =============================================================================

/**
 * Process a single headless iteration
 *
 * @returns Result with cost, duration, diary entry, and completion status
 */
async function processHeadlessIteration(
  context: HeadlessIterationContext,
): Promise<HeadlessIterationResult | null> {
  const {
    contextRoot,
    currentAttempts,
    currentSubtask,
    iteration,
    maxIterations,
    prompt,
    shouldSkipSummary,
    subtasksPath,
  } = context;

  console.log(renderInvocationHeader("headless"));
  console.log();

  // Use target project root for logs (not all-agents)
  const projectRoot = findProjectRoot() ?? contextRoot;

  // Capture commit hash before Claude invocation
  const commitBefore = getLatestCommitHash(projectRoot);

  // Time Claude invocation for metrics
  const claudeStart = Date.now();
  const stopHeartbeat = startHeartbeat("Claude", 30_000);
  let result: {
    cost: number;
    duration: number;
    result: string;
    sessionId: string;
  } | null = null;
  try {
    result = await invokeClaudeHeadlessAsync({ prompt });
  } finally {
    stopHeartbeat();
  }
  const claudeMs = Date.now() - claudeStart;

  // Capture commit hash after Claude invocation
  const commitAfter = getLatestCommitHash(projectRoot);

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
  const didComplete =
    postIterationSubtasks.subtasks.find((s) => s.id === currentSubtask.id)
      ?.done === true;
  const milestone = getMilestoneFromSubtasks(postIterationSubtasks);
  const iterationStatus = didComplete ? "completed" : "retrying";

  let hookResult: null | PostIterationResult = null;
  try {
    const stopPostIterationHeartbeat = startHeartbeat("Post-iteration", 30_000);
    try {
      hookResult = await runPostIterationHook({
        claudeMs,
        commitAfter,
        commitBefore,
        contextRoot,
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
    } finally {
      stopPostIterationHeartbeat();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      chalk.yellow(`⚠ Post-iteration hook failed: ${errorMessage}`),
    );
    // Continue without hook result - build loop proceeds
  }

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
        linesAdded: entry.linesAdded,
        linesRemoved: entry.linesRemoved,
        maxAttempts: maxIterations,
        remaining: postRemaining,
        sessionPath: sessionPath ?? undefined,
        status: iterationStatus,
        subtaskId: currentSubtask.id,
        subtaskTitle: currentSubtask.title,
        summary: entry.summary,
        tokenUsage: entry.tokenUsage,
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
async function processSupervisedIteration(
  context: SupervisedIterationContext,
): Promise<null | SupervisedIterationResult> {
  const {
    contextRoot,
    currentAttempts,
    currentSubtask,
    iteration,
    maxIterations,
    subtasksPath,
  } = context;

  console.log(renderInvocationHeader("supervised"));
  console.log();

  // Use target project root for logs
  const projectRoot = findProjectRoot() ?? contextRoot;

  // PROGRESS.md is referenced relative to the target repo root in the iteration prompt.
  const progressPath = path.join(projectRoot, "docs/planning/PROGRESS.md");

  // Capture commit hash before Claude invocation
  const commitBefore = getLatestCommitHash(projectRoot);

  // Capture start time for session discovery
  const startTime = Date.now();

  const chatResult = invokeClaudeChat(
    path.join(contextRoot, ITERATION_PROMPT_PATH),
    "build iteration",
    `Work ONLY on the assigned subtask below. Do not pick a different subtask.\n\nAssigned subtask:\n${JSON.stringify(currentSubtask, null, 2)}\n\nSubtasks file path: ${subtasksPath}\nProgress log path: ${progressPath}`,
  );

  if (!chatResult.success && !chatResult.interrupted) {
    console.error("Supervised session failed");
    process.exit(chatResult.exitCode ?? 1);
  }

  // Capture commit hash after Claude invocation
  const commitAfter = getLatestCommitHash(projectRoot);

  // Calculate elapsed time for Claude invocation
  const claudeMs = Date.now() - startTime;

  console.log("\nSupervised session completed");

  // Discover the session file created during the interactive session
  const discoveredSession = discoverRecentSession(startTime);

  // Reload subtasks to check completion status
  const postIterationSubtasks = loadSubtasksFile(subtasksPath);
  const postRemaining = countRemaining(postIterationSubtasks.subtasks);
  const didComplete =
    postIterationSubtasks.subtasks.find((s) => s.id === currentSubtask.id)
      ?.done === true;
  const milestone = getMilestoneFromSubtasks(postIterationSubtasks);
  const iterationStatus = didComplete ? "completed" : "retrying";

  // Run post-iteration hook if session was discovered
  let hookResult: null | PostIterationResult = null;
  if (discoveredSession !== null) {
    hookResult = await runPostIterationHook({
      claudeMs,
      commitAfter,
      commitBefore,
      contextRoot,
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
          linesAdded: entry.linesAdded,
          linesRemoved: entry.linesRemoved,
          maxAttempts: maxIterations,
          remaining: postRemaining,
          sessionPath: sessionPath ?? undefined,
          status: iterationStatus,
          subtaskId: currentSubtask.id,
          subtaskTitle: currentSubtask.title,
          summary: entry.summary,
          tokenUsage: entry.tokenUsage,
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

    // Handle Ctrl+C explicitly - propagate to process-level handler
    rl.on("SIGINT", () => {
      rl.close();
      process.emit("SIGINT");
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

// =============================================================================
// Interactive Prompts
// =============================================================================

/**
 * Register signal handlers for graceful shutdown
 *
 * SIGINT (Ctrl+C): exit code 130
 * SIGTERM: exit code 143
 *
 * Removes existing handlers first to prevent accumulation
 * when runBuild() is called multiple times (e.g., cascade mode).
 */
function registerSignalHandlers(): void {
  // Remove existing handlers to prevent accumulation
  process.removeAllListeners("SIGINT");
  process.removeAllListeners("SIGTERM");

  process.on("SIGINT", () => {
    generateSummaryAndExit(130);
  });

  process.on("SIGTERM", () => {
    generateSummaryAndExit(143);
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
    quiet: isQuiet,
    skipSummary: shouldSkipSummary,
    subtasksPath,
    validateFirst: shouldValidateFirst,
  } = options;

  // Reset module-level state for cascade mode / multiple runBuild() calls
  hasSummaryBeenGenerated = false;
  summaryContext = null;

  // Register signal handlers for graceful summary on interrupt
  registerSignalHandlers();

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

  // Initialize summary context for signal handlers
  summaryContext = { completedThisRun, quiet: isQuiet, subtasksPath };

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
      if (!isQuiet) {
        console.log("\n");
      }

      // Generate practical summary
      const logsDirectory = getMilestoneLogsDirectory(subtasksPath);
      const diaryEntries = readIterationDiary(logsDirectory);
      const summary = generateBuildSummary(
        completedThisRun,
        diaryEntries,
        subtasksFile,
      );

      // Render practical summary to terminal (unless quiet mode)
      if (!isQuiet) {
        console.log(renderBuildPracticalSummary(summary));
      }

      // Fire onMilestoneComplete hook
      const milestone = getMilestoneFromSubtasks(subtasksFile);
      // eslint-disable-next-line no-await-in-loop -- Must await before returning
      await executeHook("onMilestoneComplete", {
        message: `Milestone ${milestone} completed! All ${completedThisRun.length} subtasks done.`,
        milestone,
      });

      // Mark summary as generated to prevent double execution on signal
      hasSummaryBeenGenerated = true;
      return;
    }

    // Get the next pending subtask
    const currentSubtask = getNextSubtask(subtasksFile.subtasks);

    if (currentSubtask === null) {
      const milestone = getMilestoneFromSubtasks(subtasksFile);
      const pending = subtasksFile.subtasks.filter((s) => !s.done);
      const blockedList = pending
        .map((s) => {
          const blockedBy = s.blockedBy ?? [];
          const deps =
            blockedBy.length === 0
              ? "(no blockedBy listed)"
              : blockedBy.join(", ");
          return `- ${s.id}: blockedBy ${deps}`;
        })
        .join("\n");

      console.error("Error: No runnable subtasks found.");
      console.error(
        "All remaining subtasks appear blocked by incomplete dependencies.",
      );
      if (blockedList !== "") {
        console.error(`\nPending subtasks:\n${blockedList}`);
      }

      // eslint-disable-next-line no-await-in-loop -- Must notify before exiting
      await executeHook("onValidationFail", {
        message: `No runnable subtasks found for milestone ${milestone}. All remaining subtasks appear blocked.`,
        milestone,
      });

      process.exit(1);
    }

    // Track attempts for this specific subtask
    const currentAttempts = (attempts.get(currentSubtask.id) ?? 0) + 1;

    // Check if we've exceeded max iterations for this subtask
    // eslint-disable-next-line no-await-in-loop -- Must check before continuing
    const didExceedMaxIterations = await handleMaxIterationsExceeded({
      currentAttempts,
      maxIterations,
      milestone: getMilestoneFromSubtasks(subtasksFile),
      subtaskId: currentSubtask.id,
    });
    if (didExceedMaxIterations) {
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
    const prompt = buildIterationPrompt(
      contextRoot,
      currentSubtask,
      subtasksPath,
    );

    // Invoke Claude based on mode
    let didComplete = false;
    let iterationHookResult: null | PostIterationResult = null;

    if (mode === "headless") {
      // eslint-disable-next-line no-await-in-loop -- Must await before continuing
      const headlessResult = await processHeadlessIteration({
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
        // Claude invocation failed (API error, rate limit, network issue)
        // Do not count this attempt - will retry on next iteration
        console.log(
          chalk.yellow(
            "\n⚠ Claude invocation failed. Will retry on next iteration.\n",
          ),
        );
        didComplete = false;
      } else {
        attempts.set(currentSubtask.id, currentAttempts);
        ({ didComplete, hookResult: iterationHookResult } = headlessResult);
      }
    } else {
      // eslint-disable-next-line no-await-in-loop -- Must await before continuing
      const supervisedResult = await processSupervisedIteration({
        contextRoot,
        currentAttempts,
        currentSubtask,
        iteration,
        maxIterations,
        remaining,
        subtasksPath,
      });

      if (supervisedResult === null) {
        // Claude invocation failed (API error, rate limit, network issue)
        // Do not count this attempt - will retry on next iteration
        console.log(
          chalk.yellow(
            "\n⚠ Claude invocation failed. Will retry on next iteration.\n",
          ),
        );
        didComplete = false;
      } else {
        attempts.set(currentSubtask.id, currentAttempts);
        ({ didComplete, hookResult: iterationHookResult } = supervisedResult);
      }

      if (didComplete) {
        console.log(`\nSubtask ${currentSubtask.id} completed successfully`);
      }
    }

    // Handle completion tracking
    if (didComplete) {
      attempts.delete(currentSubtask.id);
      completedThisRun.push({
        attempts: currentAttempts,
        id: currentSubtask.id,
      });

      // Fire onSubtaskComplete hook with metrics from iteration result
      // eslint-disable-next-line no-await-in-loop -- Must await before continuing
      await fireSubtaskCompleteHook({
        hookResult: iterationHookResult,
        subtask: currentSubtask,
      });
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

// =============================================================================
// Build Loop Implementation
// =============================================================================

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

/**
 * Start a periodic heartbeat log while waiting for a long-running operation.
 *
 * NOTE: Requires an async wait to allow timers to run (won't work with spawnSync).
 */
function startHeartbeat(label: string, intervalMs = 30_000): () => void {
  const startedAt = Date.now();
  const VERBOSE_INTERVAL_MS = 10 * 60 * 1000;
  let hasPendingDots = false;
  let nextVerboseAt = startedAt + VERBOSE_INTERVAL_MS;

  function writeHeartbeat(text: string): void {
    try {
      process.stdout.write(text);
    } catch {
      // Extremely rare, but avoid crashing the build loop.
      console.log(text);
    }
  }

  const timer = setInterval(() => {
    writeHeartbeat(".");
    hasPendingDots = true;

    const now = Date.now();
    if (now >= nextVerboseAt) {
      const elapsed = now - startedAt;
      writeHeartbeat("\n");
      hasPendingDots = false;
      console.log(
        chalk.dim(`[${label}] still running (${formatDuration(elapsed)})...`),
      );
      nextVerboseAt = now + VERBOSE_INTERVAL_MS;
    }
  }, intervalMs);

  // Avoid keeping the process alive solely because of the heartbeat.
  const maybeTimer = timer as unknown as { unref?: () => void };
  if (typeof maybeTimer.unref === "function") {
    maybeTimer.unref();
  }

  return () => {
    clearInterval(timer);
    if (hasPendingDots) {
      writeHeartbeat("\n");
      hasPendingDots = false;
    }
  };
}

// =============================================================================
// Exports
// =============================================================================

export default runBuild;

/**
 * Build loop for Ralph autonomous development framework
 *
 * This module implements the core iteration loop that:
 * 1. Loads subtasks from subtasks.json
 * 2. Gets the next pending subtask
 * 3. Tracks retry attempts per subtask
 * 4. Invokes the selected provider in supervised or headless mode
 * 5. Reloads subtasks.json after each iteration to check completion
 *
 * @see docs/planning/ralph-migration-implementation-plan.md
 */

import { findProjectRoot } from "@tools/utils/paths";
import chalk from "chalk";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import * as readline from "node:readline";

import type { ProviderType } from "./providers/types";

import { checkSubtasksSize, SUBTASKS_TOKEN_SOFT_LIMIT } from "./archive";
import {
  checkAssignedCompletionInvariant,
  formatCompletionInvariantViolation,
} from "./build-invariant";
import { runCalibrate } from "./calibrate";
import {
  countRemaining,
  getMilestoneFromSubtasks,
  getNextSubtask,
  getPendingSubtasks,
  loadRalphConfig,
  loadSubtasksFile,
  loadTimeoutConfig,
  saveSubtasksFile,
} from "./config";
import {
  renderBuildPracticalSummary,
  renderEventLine,
  renderInvocationHeader,
  renderIterationEnd,
  renderIterationStart,
  renderMarkdown,
  renderPhaseCard,
  renderResponseHeader,
} from "./display";
import { executeHook } from "./hooks";
import {
  type PostIterationResult,
  runPostIterationHook,
} from "./post-iteration";
import { buildPrompt } from "./providers/claude";
import {
  getModelsForProvider,
  validateModelSelection,
} from "./providers/models";
import {
  formatProviderFailureOutcome,
  invokeWithProviderOutcome,
  resolveProvider,
  validateProviderInvocationPreflight,
} from "./providers/registry";
import { discoverRecentSessionForProvider } from "./providers/session-adapter";
import { applyAndSaveProposal } from "./queue-ops";
import { getSessionJsonlPath } from "./session";
import { getMilestoneLogsDirectory, readIterationDiary } from "./status";
import { generateBuildSummary } from "./summary";
import {
  type BuildOptions,
  getProviderTimingMs,
  type QueueOperation,
  type QueueProposal,
  type Subtask,
} from "./types";
import {
  validateAllSubtasks,
  writeValidationProposalArtifact,
  writeValidationQueueApplyLogEntry,
} from "./validation";

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
  model?: string;
  prompt: string;
  provider: ProviderType;
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
  force: boolean;
  iteration: number;
  model?: string;
  provider: ProviderType;
  review: boolean;
  subtasksPath: string;
}

/**
 * Options for enforcing single-subtask completion per iteration.
 */
interface SingleSubtaskInvariantOptions {
  assignedSubtaskId: string;
  preSubtasks: Array<Subtask>;
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
 * Summary stats for a subtask queue.
 */
interface SubtaskQueueStats {
  completed: number;
  pending: number;
  total: number;
}

/**
 * A single line of size guidance output for oversized subtasks files.
 */
interface SubtasksSizeGuidanceLine {
  message: string;
  tone: "dim" | "red" | "yellow";
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
  model?: string;
  provider: ProviderType;
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

type ValidationProposalMode = "auto-apply" | "prompt" | "review";

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
 * Build shared assignment context consumed by both headless and supervised modes.
 */
function buildIterationContext(
  currentSubtask: Subtask,
  subtasksPath: string,
  progressPath: string,
): string {
  const subtaskJson = JSON.stringify(currentSubtask, null, 2);
  return `Execute one iteration of the Ralph build loop.

Work ONLY on the assigned subtask below. Do not pick a different subtask.

Assigned subtask:
\`\`\`json
${subtaskJson}
\`\`\`

Subtasks file path: ${subtasksPath}
Progress log path: ${progressPath}

After completing the assigned subtask (${currentSubtask.id}):
1. Append to PROGRESS.md
2. Create the commit
3. STOP - do not continue to the next subtask

Do NOT modify subtasks.json — the build loop handles completion tracking.`;
}

/**
 * Build the iteration prompt with subtask context
 *
 * @param contextRoot - Repository root path
 * @param subtasksPath - Path to subtasks.json file
 * @returns Full prompt string for the selected provider
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

  const progressPath = resolveProgressPath(contextRoot);
  const extraContext = buildIterationContext(
    currentSubtask,
    subtasksPath,
    progressPath,
  );

  return buildPrompt(promptContent, extraContext);
}

/**
 * Enforce the one-subtask-per-iteration invariant.
 *
 * Returns whether the assigned subtask transitioned from done:false to done:true.
 * Exits with non-zero status when unexpected subtasks were completed.
 */
function enforceSingleSubtaskInvariant(
  options: SingleSubtaskInvariantOptions,
): boolean {
  const { assignedSubtaskId, preSubtasks, subtasksPath } = options;
  const postIterationSubtasksFile = loadSubtasksFile(subtasksPath);
  const completionInvariant = checkAssignedCompletionInvariant({
    assignedSubtaskId,
    postSubtasks: postIterationSubtasksFile.subtasks,
    preSubtasks,
  });

  if (completionInvariant.isViolation) {
    console.error(
      chalk.red(`\n${formatCompletionInvariantViolation(completionInvariant)}`),
    );
    process.exit(1);
  }

  return completionInvariant.completedIds.includes(assignedSubtaskId);
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
  const providerMs = getProviderTimingMs(entry?.timing);

  await executeHook("onSubtaskComplete", {
    costUsd: entry?.costUsd,
    duration: providerMs === undefined ? undefined : formatDuration(providerMs),
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

function getNextRunnableSubtask(
  subtasks: Array<Subtask>,
  skippedSubtaskIds: null | Set<string>,
): null | Subtask {
  if (skippedSubtaskIds === null || skippedSubtaskIds.size === 0) {
    return getNextSubtask(subtasks);
  }

  return (
    subtasks.find(
      (subtask) => !subtask.done && !skippedSubtaskIds.has(subtask.id),
    ) ?? null
  );
}

/**
 * Summarize pending/completed totals for a subtask list.
 */
function getSubtaskQueueStats(subtasks: Array<Subtask>): SubtaskQueueStats {
  const total = subtasks.length;
  const pending = countRemaining(subtasks);
  return { completed: total - pending, pending, total };
}

/**
 * Build contextual size warning lines for oversized subtasks.json files.
 */
function getSubtasksSizeGuidanceLines(options: {
  queueStats: SubtaskQueueStats;
  sizeCheck: { exceeded: boolean; hardLimitExceeded: boolean; tokens: number };
  subtasksPath: string;
}): Array<SubtasksSizeGuidanceLine> {
  const { queueStats, sizeCheck, subtasksPath } = options;
  if (!sizeCheck.exceeded) {
    return [];
  }

  const lines: Array<SubtasksSizeGuidanceLine> = [];
  const tokensK = Math.round(sizeCheck.tokens / 1000);
  const limitK = Math.round(SUBTASKS_TOKEN_SOFT_LIMIT / 1000);
  const archiveCommand = `Run: aaa ralph archive subtasks --subtasks ${subtasksPath}`;

  lines.push({
    message: `  subtasks.json is ~${tokensK}K tokens (limit: ${limitK}K)`,
    tone: "yellow",
  });

  if (queueStats.pending === 0) {
    lines.push({
      message: `  Queue status: ${queueStats.total} total, 0 pending (build has nothing to execute).`,
      tone: "dim",
    });
    if (queueStats.completed > 0) {
      lines.push({
        message: `  Optional housekeeping: ${archiveCommand}`,
        tone: "dim",
      });
    }
    return lines;
  }

  if (queueStats.completed > 0) {
    lines.push({ message: `  ${archiveCommand}`, tone: "dim" });
  } else {
    lines.push({
      message:
        "  No completed subtasks to archive yet; keep queue entries compact to stay below hard limits.",
      tone: "dim",
    });
  }

  if (sizeCheck.hardLimitExceeded) {
    lines.push({
      message:
        "  Provider invocation may not be able to update this file via Edit tool.",
      tone: "red",
    });
    lines.push({
      message: "  Use jq for in-place updates of the assigned subtask only.",
      tone: "dim",
    });
  }

  return lines;
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

/**
 * Validate model selection and exit with formatted error if invalid.
 *
 * If model is undefined, does nothing (model is optional).
 * If valid, logs the model + cliFormat.
 * If invalid, logs error with suggestions and exits.
 *
 * @param model - User-provided model ID (undefined = skip validation)
 * @param provider - Target provider to validate against
 */
function handleModelValidation(
  model: string | undefined,
  provider: ProviderType,
): void {
  if (model === undefined) {
    return;
  }

  if (provider === "cursor") {
    const hasDiscoveredCursorModels = getModelsForProvider("cursor").length > 0;
    if (hasDiscoveredCursorModels) {
      const result = validateModelSelection(model, provider);
      if (result.valid) {
        console.log(chalk.dim(`Using model: ${model} (${result.cliFormat})`));
        return;
      }

      console.error(chalk.red(`\nError: ${result.error}`));
      if (result.suggestions.length > 0) {
        console.error(chalk.yellow("\nDid you mean:"));
        for (const suggestion of result.suggestions) {
          console.error(chalk.yellow(`  - ${suggestion}`));
        }
      }
      process.exit(1);
    }

    console.log(
      chalk.yellow(
        `Cursor model '${model}' is passed through without validation because no Cursor models are registered.\n` +
          "Run 'aaa ralph refresh-models --provider cursor' to enable strict validation.",
      ),
    );
    return;
  }

  const result = validateModelSelection(model, provider);
  if (result.valid) {
    console.log(chalk.dim(`Using model: ${model} (${result.cliFormat})`));
    return;
  }
  console.error(chalk.red(`\nError: ${result.error}`));
  if (result.suggestions.length > 0) {
    console.error(chalk.yellow("\nDid you mean:"));
    for (const suggestion of result.suggestions) {
      console.error(chalk.yellow(`  - ${suggestion}`));
    }
  }
  process.exit(1);
}

async function handleNoRunnableSubtasks(options: {
  milestone: string;
  skippedSubtaskIds: null | Set<string>;
  subtasks: Array<Subtask>;
}): Promise<void> {
  const { milestone, skippedSubtaskIds, subtasks } = options;

  const pending = subtasks.filter((s) => !s.done);
  const skippedPending = pending.filter(
    (subtask) => skippedSubtaskIds?.has(subtask.id) === true,
  );
  const remainingPending = pending.filter(
    (subtask) => skippedSubtaskIds?.has(subtask.id) !== true,
  );
  const skippedList = skippedPending
    .map((subtask) => `- ${subtask.id}: ${subtask.title}`)
    .join("\n");
  const remainingList = remainingPending
    .map((subtask) => `- ${subtask.id}: ${subtask.title}`)
    .join("\n");

  console.error("Error: No runnable subtasks found.");
  if (skippedPending.length > 0) {
    console.error(
      `Pre-build validation skipped ${skippedPending.length} pending subtask(s).`,
    );
    if (skippedList !== "") {
      console.error(`\nSkipped subtasks:\n${skippedList}`);
    }
  }
  if (remainingPending.length > 0) {
    console.error(
      "Pending subtasks remain, but none are runnable in the current selection.",
    );
    if (remainingList !== "") {
      console.error(`\nPending subtasks:\n${remainingList}`);
    }
  }

  const noRunnableReason =
    skippedPending.length > 0 && remainingPending.length === 0
      ? `No runnable subtasks found for milestone ${milestone}. ${skippedPending.length} subtask(s) were skipped by pre-build validation.`
      : `No runnable subtasks found for milestone ${milestone}. Pending subtasks remain but none are runnable.`;

  await executeHook("onValidationFail", {
    message: noRunnableReason,
    milestone,
  });
}

// =============================================================================
// Build Loop Implementation
// =============================================================================

/**
 * Log model selection based on whether the queue has runnable work.
 */
function logModelSelection(options: {
  hasPendingSubtasks: boolean;
  model: string | undefined;
  provider: ProviderType;
}): void {
  const { hasPendingSubtasks, model, provider } = options;

  if (hasPendingSubtasks) {
    handleModelValidation(model, provider);
    return;
  }

  if (model !== undefined) {
    console.log(chalk.dim(`Using model: ${model}`));
  }
}

/**
 * Render and print subtasks size guidance to the terminal.
 */
function logSubtasksSizeGuidance(options: {
  queueStats: SubtaskQueueStats;
  sizeCheck: { exceeded: boolean; hardLimitExceeded: boolean; tokens: number };
  subtasksPath: string;
}): void {
  const sizeGuidance = getSubtasksSizeGuidanceLines(options);
  if (sizeGuidance.length === 0) {
    return;
  }

  console.log();
  for (const line of sizeGuidance) {
    if (line.tone === "red") {
      console.log(chalk.red(line.message));
    } else if (line.tone === "yellow") {
      console.log(chalk.yellow(line.message));
    } else {
      console.log(chalk.dim(line.message));
    }
  }
  console.log();
}

/**
 * Mark a subtask as complete in subtasks.json with full metadata.
 *
 * Mirrors the logic in `ralph subtasks complete` (index.ts) so that
 * the build loop owns completion tracking instead of the sub-agent.
 */
function markSubtaskComplete(options: {
  commitHash: string;
  contextRoot: string;
  sessionId: string;
  subtaskId: string;
  subtasksPath: string;
}): void {
  const { commitHash, contextRoot, sessionId, subtaskId, subtasksPath } =
    options;
  const subtasksFile = loadSubtasksFile(subtasksPath);
  const target = subtasksFile.subtasks.find((s) => s.id === subtaskId);
  if (target === undefined || target.done) return;

  target.done = true;
  target.completedAt = new Date().toISOString();
  target.commitHash = commitHash;
  target.sessionId = sessionId;
  const repoRoot = findProjectRoot() ?? contextRoot;
  target.sessionRepoRoot = repoRoot;
  const logPath = getSessionJsonlPath(sessionId, repoRoot);
  if (logPath === null) {
    delete target.sessionLogPath;
  } else {
    target.sessionLogPath = logPath;
  }
  saveSubtasksFile(subtasksPath, subtasksFile);
}

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
    model,
    prompt,
    provider,
    shouldSkipSummary,
    subtasksPath,
  } = context;

  console.log(renderInvocationHeader("headless", provider));
  console.log();

  // Use target project root for logs (not all-agents)
  const projectRoot = findProjectRoot() ?? contextRoot;

  // Capture commit hash before provider invocation
  const commitBefore = getLatestCommitHash(projectRoot);

  // Load timeout configuration
  const timeoutConfig = loadTimeoutConfig();
  const stallTimeoutMs = timeoutConfig.stallMinutes * 60 * 1000;
  const hardTimeoutMs = timeoutConfig.hardMinutes * 60 * 1000;
  const gracePeriodMs = timeoutConfig.graceSeconds * 1000;

  // Time provider invocation for metrics
  const providerStart = Date.now();
  const stopHeartbeat = startHeartbeat(provider, 30_000);
  const invocationOutcome = await (async () => {
    try {
      return await invokeWithProviderOutcome(provider, {
        gracePeriodMs,
        mode: "headless",
        model,
        onStderrActivity: () => {
          // Activity tracking is handled internally, but we could extend
          // the heartbeat here if needed in the future
        },
        prompt,
        stallTimeoutMs,
        timeout: hardTimeoutMs,
        workingDirectory: projectRoot,
      });
    } finally {
      stopHeartbeat();
    }
  })();
  const providerMs = Date.now() - providerStart;

  // Capture commit hash after provider invocation
  const commitAfter = getLatestCommitHash(projectRoot);

  if (invocationOutcome.status !== "success") {
    const formatted = formatProviderFailureOutcome(invocationOutcome);
    if (invocationOutcome.status === "fatal") {
      console.error(chalk.red(`\n✖ ${formatted}`));
      process.exit(1);
    }
    console.log(chalk.yellow(`\n⚠ ${formatted}`));
    return null;
  }

  const { result } = invocationOutcome;

  // Display result with markdown rendering
  console.log(`\n${renderResponseHeader(provider)}`);
  console.log(renderMarkdown(result.result));
  console.log();

  // Build loop owns completion: mark subtask done if a new commit was made
  if (commitBefore !== commitAfter && commitAfter !== null) {
    markSubtaskComplete({
      commitHash: commitAfter,
      contextRoot,
      sessionId: result.sessionId,
      subtaskId: currentSubtask.id,
      subtasksPath,
    });
  }

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
        commitAfter,
        commitBefore,
        contextRoot,
        costUsd: result.costUsd,
        iterationNumber: currentAttempts,
        maxAttempts: maxIterations,
        milestone,
        mode: "headless",
        provider,
        providerMs,
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
        costUsd: result.costUsd,
        diaryPath,
        durationMs: result.durationMs,
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
    costUsd: result.costUsd,
    didComplete,
    durationMs: result.durationMs,
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
    model,
    provider,
    subtasksPath,
  } = context;

  console.log(renderInvocationHeader("supervised", provider));
  console.log();

  // Use target project root for logs
  const projectRoot = findProjectRoot() ?? contextRoot;
  const progressPath = resolveProgressPath(contextRoot);
  const iterationContext = buildIterationContext(
    currentSubtask,
    subtasksPath,
    progressPath,
  );

  // Capture commit hash before provider invocation
  const commitBefore = getLatestCommitHash(projectRoot);

  // Capture invocation start for timing + session fallback discovery
  const invocationStart = Date.now();

  const invocationOutcome = await invokeWithProviderOutcome(provider, {
    context: iterationContext,
    mode: "supervised",
    model,
    promptPath: path.join(contextRoot, ITERATION_PROMPT_PATH),
    sessionName: "build iteration",
    workingDirectory: projectRoot,
  });

  if (invocationOutcome.status !== "success") {
    const formatted = formatProviderFailureOutcome(invocationOutcome);
    if (invocationOutcome.status === "fatal") {
      console.error(chalk.red(`\n✖ ${formatted}`));
      process.exit(1);
    }
    console.log(chalk.yellow(`\n⚠ ${formatted}`));
    return null;
  }

  const supervisedResult = invocationOutcome.result;

  // Capture commit hash after provider invocation
  const commitAfter = getLatestCommitHash(projectRoot);

  // Calculate elapsed time for provider invocation
  const providerMs = Date.now() - invocationStart;

  // Prefer provider-native session capture, then provider adapter discovery.
  const hasProviderSessionId = supervisedResult.sessionId !== "";
  const discoveredSession = hasProviderSessionId
    ? null
    : discoverRecentSessionForProvider(provider, invocationStart, projectRoot);
  const sessionId = hasProviderSessionId
    ? supervisedResult.sessionId
    : (discoveredSession?.sessionId ?? "");

  const sessionSuffix =
    sessionId === "" ? "" : ` (session: ${sessionId.slice(0, 12)}...)`;
  console.log(
    `\n${provider} interactive supervised session completed${sessionSuffix}`,
  );

  // Build loop owns completion: mark subtask done if a new commit was made
  if (commitBefore !== commitAfter && commitAfter !== null) {
    markSubtaskComplete({
      commitHash: commitAfter,
      contextRoot,
      sessionId,
      subtaskId: currentSubtask.id,
      subtasksPath,
    });
  }

  // Reload subtasks to check completion status
  const postIterationSubtasks = loadSubtasksFile(subtasksPath);
  const postRemaining = countRemaining(postIterationSubtasks.subtasks);
  const didComplete =
    postIterationSubtasks.subtasks.find((s) => s.id === currentSubtask.id)
      ?.done === true;
  const milestone = getMilestoneFromSubtasks(postIterationSubtasks);
  const iterationStatus = didComplete ? "completed" : "retrying";

  // Run post-iteration hook when a session ID is available
  let hookResult: null | PostIterationResult = null;
  if (sessionId !== "") {
    hookResult = await runPostIterationHook({
      commitAfter,
      commitBefore,
      contextRoot,
      iterationNumber: currentAttempts,
      maxAttempts: maxIterations,
      milestone,
      mode: "supervised",
      provider,
      providerMs,
      remaining: postRemaining,
      repoRoot: projectRoot,
      sessionId,
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
          durationMs: providerMs,
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

async function resolveApprovalForValidationProposal(options: {
  proposalMode: ValidationProposalMode;
  proposalPath: string;
}): Promise<boolean> {
  const { proposalMode, proposalPath } = options;

  if (proposalMode === "auto-apply") {
    return true;
  }

  const isExplicitApprovalRequired = proposalMode === "review";
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(
      "Validation proposal requires approval, but no TTY is available.",
    );
    console.error(`Review proposal artifact: ${proposalPath}`);
    return false;
  }

  const question = isExplicitApprovalRequired
    ? "Apply staged validation proposal after review? [y/N] "
    : "Apply staged validation proposal before build starts? [Y/n] ";

  // eslint-disable-next-line promise/avoid-new -- readline requires callback API
  return new Promise<boolean>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on("error", () => {
      rl.close();
      resolve(false);
    });

    rl.on("SIGINT", () => {
      rl.close();
      process.emit("SIGINT");
      resolve(false);
    });

    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      if (isExplicitApprovalRequired) {
        resolve(normalized === "y" || normalized === "yes");
        return;
      }

      resolve(!(normalized === "n" || normalized === "no"));
    });
  });
}

/**
 * Resolve model selection with priority:
 * CLI flag > config file
 */
function resolveModel(modelOverride?: string): string | undefined {
  if (modelOverride !== undefined && modelOverride !== "") {
    return modelOverride;
  }

  try {
    const config = loadRalphConfig();
    return config.model;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the canonical PROGRESS.md path relative to the target repo root.
 */
function resolveProgressPath(contextRoot: string): string {
  const projectRoot = findProjectRoot() ?? contextRoot;
  return path.join(projectRoot, "docs/planning/PROGRESS.md");
}

/**
 * Resolve provider selection and exit with a clean error if invalid.
 */
async function resolveProviderOrExit(
  providerOverride: string | undefined,
): Promise<ProviderType> {
  try {
    return await resolveProvider({ cliFlag: providerOverride });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
    throw new Error(message);
  }
}

async function resolveSkippedSubtaskIds(options: {
  contextRoot: string;
  mode: "headless" | "supervised";
  model?: string;
  provider: ProviderType;
  shouldForceProposalApply: boolean;
  shouldRequireProposalReview: boolean;
  shouldValidateFirst: boolean;
  subtasksPath: string;
}): Promise<null | Set<string>> {
  const {
    contextRoot,
    mode,
    model,
    provider,
    shouldForceProposalApply,
    shouldRequireProposalReview,
    shouldValidateFirst,
    subtasksPath,
  } = options;
  if (!shouldValidateFirst) {
    return null;
  }

  const initialSubtasksFile = loadSubtasksFile(subtasksPath);
  const pendingSubtasks = getPendingSubtasks(initialSubtasksFile.subtasks);
  if (pendingSubtasks.length === 0) {
    console.log(
      renderEventLine({
        domain: "VALIDATE",
        message: "Pre-build validation skipped (no pending subtasks)",
        state: "SKIP",
      }),
    );
    return null;
  }

  console.log(
    renderEventLine({
      domain: "VALIDATE",
      message: `Pre-build validation starting before iteration phase (${pendingSubtasks.length} pending subtasks)`,
      state: "START",
    }),
  );

  const milestonePath = path.dirname(subtasksPath);
  const validationResult = await validateAllSubtasks(
    pendingSubtasks,
    { mode, model, provider, subtasksPath },
    milestonePath,
    contextRoot,
  );

  console.log(
    renderEventLine({
      domain: "VALIDATE",
      message: `Pre-build validation complete (${validationResult.aligned} aligned, ${validationResult.skippedSubtasks.length} skipped)`,
      state: "DONE",
    }),
  );

  const defaultRemoveOperations = validationResult.skippedSubtasks.map(
    (skipped): QueueOperation => ({ id: skipped.subtaskId, type: "remove" }),
  );
  const operations = validationResult.operations ?? defaultRemoveOperations;

  if (operations.length > 0) {
    const proposalMode = resolveValidationProposalMode({
      mode,
      shouldForceProposalApply,
      shouldRequireProposalReview,
    });
    const proposal: QueueProposal = {
      fingerprint: initialSubtasksFile.fingerprint,
      operations,
      source: "validation",
      timestamp: new Date().toISOString(),
    };
    const proposalPath = writeValidationProposalArtifact(
      milestonePath,
      proposal,
      {
        aligned: validationResult.aligned,
        skipped: validationResult.skippedSubtasks.length,
        total: pendingSubtasks.length,
      },
    );

    console.log(
      renderEventLine({
        domain: "VALIDATE",
        message: `Validation proposal staged: ${proposalPath}`,
        state: "INFO",
      }),
    );

    const didApprove = await resolveApprovalForValidationProposal({
      proposalMode,
      proposalPath,
    });
    if (!didApprove) {
      console.error(
        "Build paused: validation proposal not approved. Re-run with --force to auto-apply.",
      );
      process.exit(1);
    }

    const summary = applyAndSaveProposal(subtasksPath, proposal);

    const state = summary.applied ? "DONE" : "SKIP";
    const message = summary.applied
      ? `Validation proposal applied (${summary.operationsApplied} operation(s), queue ${summary.subtasksBefore} -> ${summary.subtasksAfter})`
      : "Validation proposal skipped (queue changed before apply)";
    console.log(renderEventLine({ domain: "VALIDATE", message, state }));
    writeValidationQueueApplyLogEntry(milestonePath, {
      applied: summary.applied,
      fingerprints: {
        after: summary.fingerprintAfter,
        before: summary.fingerprintBefore,
      },
      operationCount: summary.operationsApplied,
      source: proposal.source,
      summary: message,
    });
  }

  return new Set(validationResult.skippedSubtasks.map((s) => s.subtaskId));
}

function resolveValidationProposalMode(options: {
  mode: "headless" | "supervised";
  shouldForceProposalApply: boolean;
  shouldRequireProposalReview: boolean;
}): ValidationProposalMode {
  const { mode, shouldForceProposalApply, shouldRequireProposalReview } =
    options;
  if (shouldForceProposalApply) {
    return "auto-apply";
  }
  if (shouldRequireProposalReview) {
    return "review";
  }
  if (mode === "headless") {
    return "auto-apply";
  }
  return "prompt";
}

/**
 * Run the build loop
 *
 * Iterates through subtasks, invoking the selected provider until all are done
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
    force: shouldForceProposalApply,
    interactive: isInteractive,
    maxIterations,
    mode,
    model: modelOverride,
    quiet: isQuiet,
    review: shouldRequireProposalReview,
    skipSummary: shouldSkipSummary,
    subtasksPath,
    validateFirst: shouldValidateFirst,
  } = options;

  // Validate subtasks file exists before provider/model setup.
  if (!existsSync(subtasksPath)) {
    console.error(`Subtasks file not found: ${subtasksPath}`);
    console.error(`Create one with: aaa ralph plan subtasks --task <task-id>`);
    process.exit(1);
  }

  const initialSubtasksFile = loadSubtasksFile(subtasksPath);
  const initialQueueStats = getSubtaskQueueStats(initialSubtasksFile.subtasks);
  const hasPendingSubtasks = initialQueueStats.pending > 0;

  // Select provider (CLI flag > env var > default)
  const provider = await resolveProviderOrExit(options.provider);

  // Select model (CLI flag > config) and validate against provider registry.
  // Skip strict validation when queue has no runnable work.
  const model = resolveModel(modelOverride);

  // Reset module-level state for cascade mode / multiple runBuild() calls
  hasSummaryBeenGenerated = false;
  summaryContext = null;

  // Register signal handlers for graceful summary on interrupt
  registerSignalHandlers();

  // Fail fast on provider/mode support only when there is work to execute.
  if (hasPendingSubtasks) {
    await runProviderPreflightOrExit(provider, mode);
  }

  // Track retry attempts per subtask ID
  const attempts = new Map<string, number>();

  // Track subtasks completed during this build run
  const completedThisRun: Array<{ attempts: number; id: string }> = [];

  // Initialize summary context for signal handlers
  summaryContext = { completedThisRun, quiet: isQuiet, subtasksPath };

  // eslint-disable-next-line perfectionist/sort-union-types -- Keep declared order for SUB-412 acceptance criteria
  let skippedSubtaskIds: Set<string> | null = null;
  skippedSubtaskIds = await resolveSkippedSubtaskIds({
    contextRoot,
    mode,
    model,
    provider,
    shouldForceProposalApply,
    shouldRequireProposalReview,
    shouldValidateFirst,
    subtasksPath,
  });

  console.log(
    renderPhaseCard({
      domain: "BUILD",
      lines: [
        `Queue: ${initialQueueStats.pending} pending / ${initialQueueStats.total} total (${initialQueueStats.completed} completed)`,
      ],
      state: "START",
      title: "Starting build loop",
    }),
  );
  if (maxIterations === 0) {
    console.log(
      renderEventLine({
        domain: "BUILD",
        message: "Max iterations per subtask: unlimited (0)",
        state: "INFO",
      }),
    );
  } else {
    console.log(
      renderEventLine({
        domain: "BUILD",
        message: `Max iterations per subtask: ${maxIterations}`,
        state: "INFO",
      }),
    );
  }

  console.log(
    renderEventLine({
      domain: "BUILD",
      message: `Using provider: ${provider}`,
      state: "INFO",
    }),
  );

  logModelSelection({ hasPendingSubtasks, model, provider });

  // Pre-build size check: warn if subtasks.json is getting large
  const sizeCheck = checkSubtasksSize(subtasksPath);
  logSubtasksSizeGuidance({
    queueStats: initialQueueStats,
    sizeCheck,
    subtasksPath,
  });

  console.log(
    renderEventLine({
      domain: "BUILD",
      message: "Iteration phase starting",
      state: "START",
    }),
  );

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

      // Explicit clean exit to ensure process terminates after successful build
      // This prevents hanging when provider subprocesses have internal Stop events
      process.exit(0);
    }

    // Get the next pending subtask, excluding items skipped by pre-build validation
    const currentSubtask = getNextRunnableSubtask(
      subtasksFile.subtasks,
      skippedSubtaskIds,
    );

    if (currentSubtask === null) {
      const milestone = getMilestoneFromSubtasks(subtasksFile);
      // eslint-disable-next-line no-await-in-loop -- Must notify before exiting
      await handleNoRunnableSubtasks({
        milestone,
        skippedSubtaskIds,
        subtasks: subtasksFile.subtasks,
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

    // Invoke selected provider based on mode
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
        model,
        prompt,
        provider,
        remaining,
        shouldSkipSummary,
        subtasksPath,
      });

      if (headlessResult === null) {
        // Retryable provider outcome: count the attempt and retry.
        attempts.set(currentSubtask.id, currentAttempts);
        console.log(
          chalk.yellow(
            `\n⚠ Retryable provider outcome. Will retry on next iteration.\n`,
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
        model,
        provider,
        remaining,
        subtasksPath,
      });

      if (supervisedResult === null) {
        // Retryable provider outcome: count the attempt and retry.
        attempts.set(currentSubtask.id, currentAttempts);
        console.log(
          chalk.yellow(
            `\n⚠ Retryable provider outcome. Will retry on next iteration.\n`,
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

    didComplete = enforceSingleSubtaskInvariant({
      assignedSubtaskId: currentSubtask.id,
      preSubtasks: subtasksFile.subtasks,
      subtasksPath,
    });

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

    // Run calibration every N iterations (if enabled)
    // eslint-disable-next-line no-await-in-loop -- Must await calibration before next iteration
    await runPeriodicCalibration({
      calibrateEvery,
      contextRoot,
      force: shouldForceProposalApply,
      iteration,
      model,
      provider,
      review: shouldRequireProposalReview,
      subtasksPath,
    });

    iteration += 1;
  }
}

// =============================================================================
// Build Loop Implementation
// =============================================================================

/**
 * Run periodic calibration if enabled and due
 * Placed after runBuild for alphabetical sorting per lint rules.
 */
async function runPeriodicCalibration(
  options: PeriodicCalibrationOptions,
): Promise<void> {
  const {
    calibrateEvery,
    contextRoot,
    force: shouldForceProposalApply,
    iteration,
    model,
    provider,
    review: shouldRequireProposalReview,
    subtasksPath,
  } = options;
  if (calibrateEvery > 0 && iteration % calibrateEvery === 0) {
    console.log();
    console.log(
      renderPhaseCard({
        domain: "CALIBRATE",
        lines: [
          `Triggered by periodic setting (every ${calibrateEvery} iterations)`,
        ],
        state: "START",
        title: "Running calibration",
      }),
    );
    await runCalibrate("all", {
      contextRoot,
      force: shouldForceProposalApply,
      model,
      provider,
      review: shouldRequireProposalReview,
      subtasksPath,
    });
  }
}

/**
 * Enforce provider capability gating and binary availability before build starts.
 */
async function runProviderPreflightOrExit(
  provider: ProviderType,
  mode: "headless" | "supervised",
): Promise<void> {
  try {
    await validateProviderInvocationPreflight(provider, mode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
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

export {
  buildIterationContext,
  buildIterationPrompt,
  getSubtaskQueueStats,
  getSubtasksSizeGuidanceLines,
  resolveApprovalForValidationProposal,
  resolveSkippedSubtaskIds,
  resolveValidationProposalMode,
};
export default runBuild;

/**
 * Task execution loop for Ralph prototype
 *
 * This module handles iterating through tasks and invoking Claude:
 * - Iterates through pending tasks from tasks.json
 * - Invokes Claude with task context and acceptance criteria
 * - Detects TASK_DONE signal to mark complete
 * - Detects TASK_BLOCKED signal to handle failures
 * - Respects --max-iterations limit
 *
 * @see tasks.json structure from planning.ts
 */

import chalk from "chalk";
import { readFileSync, writeFileSync } from "node:fs";

import { type HeadlessResult, invokeClaudeHeadless } from "./claude";
import { type GeneratedTask, type GeneratedTasksFile } from "./planning";
import {
  appendProgressLog,
  getSessionPaths,
  readSessionState,
  type SessionPaths,
  updateSessionState,
} from "./temporary-session";

// =============================================================================
// Types
// =============================================================================

/**
 * Result from the full execution loop
 */
interface ExecutionLoopResult {
  /** Number of tasks that were blocked */
  blockedCount: number;
  /** Number of tasks completed */
  completedCount: number;
  /** Error message if loop failed */
  error?: string;
  /** Number of iterations executed */
  iterationsUsed: number;
  /** Whether the loop completed successfully (all tasks done or max iterations) */
  success: boolean;
}

/**
 * Options for the execution loop
 */
interface ExecutionOptions {
  /** Maximum number of iterations (default 10) */
  maxIterations?: number;
  /** Whether this is a resumed session */
  resume?: boolean;
  /** Session directory path */
  sessionDirectory: string;
}

/**
 * Track whether a shutdown has been requested
 */
let isShutdownPending = false;

/**
 * Current session directory for signal handler
 */
let currentSessionDirectory: null | string = null;

/**
 * Result from a single task execution attempt
 */
interface TaskExecutionResult {
  /** Reason for blocking (if status is 'blocked') */
  blockedReason?: string;
  /** Error message if execution failed */
  error?: string;
  /** Whether the task was completed successfully */
  status: "blocked" | "complete" | "error" | "in_progress";
  /** Task ID that was executed */
  taskId: number;
}

/**
 * Check if shutdown was requested
 */
function isShutdownRequested(): boolean {
  return isShutdownPending;
}

/**
 * Setup SIGINT handler for graceful shutdown
 *
 * @param sessionDirectory - Path to session directory
 */
function setupSignalHandler(sessionDirectory: string): void {
  currentSessionDirectory = sessionDirectory;

  process.on("SIGINT", () => {
    if (isShutdownPending) {
      // Second SIGINT, force exit
      process.exit(1);
    }

    isShutdownPending = true;
    console.log(chalk.yellow("\n\nInterrupted! Saving state..."));

    if (currentSessionDirectory !== null) {
      updateSessionState(currentSessionDirectory, { status: "interrupted" });
      appendProgressLog(currentSessionDirectory, "Session interrupted by user");
    }

    console.log(
      chalk.dim("State saved. Resume with: aaa ralph prototype --resume"),
    );
    process.exit(0);
  });
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default maximum iterations
 */
const DEFAULT_MAX_ITERATIONS = 10;

/**
 * Signal that indicates task is complete
 */
const TASK_DONE_SIGNAL = "TASK_DONE";

/**
 * Signal that indicates task is blocked
 */
const TASK_BLOCKED_SIGNAL = "TASK_BLOCKED";

/**
 * Prompt template for task execution
 */
const EXECUTION_PROMPT_TEMPLATE = `Execute ONE task iteration. Follow these phases IN ORDER:

TASK: {TASK_TITLE}

ACCEPTANCE CRITERIA:
{ACCEPTANCE_CRITERIA}

## Phase 1: Implement
Write the code. Be direct - minimal file reading.

## Phase 2: Verify
For each criterion, run a verification command:
- File exists: test -f path && echo PASS
- Content check: grep -q "pattern" file && echo PASS
- Build works: bun run build or npm run build

## Phase 3: Commit
git add <files> && git commit -m "feat: {TASK_TITLE}"

## Phase 4: Done
If ALL criteria pass: output TASK_DONE
If blocked: output TASK_BLOCKED: <reason>

STOP after Phase 4. Do not continue to other tasks.
`;

// =============================================================================
// Task File Operations
// =============================================================================

/**
 * Build the execution prompt for a task
 *
 * @param task - The task to execute
 * @returns Formatted prompt string
 */
function buildExecutionPrompt(task: GeneratedTask): string {
  const criteriaList = task.acceptanceCriteria.map((c) => `- ${c}`).join("\n");

  return EXECUTION_PROMPT_TEMPLATE.replace("{TASK_TITLE}", task.title)
    .replace("{ACCEPTANCE_CRITERIA}", criteriaList)
    .replace("{TASK_TITLE}", task.title);
}

/**
 * Check if Claude's response contains the TASK_BLOCKED signal
 *
 * @param response - Claude's response text
 * @returns Blocked reason or null if not blocked
 */
function detectTaskBlocked(response: string): null | string {
  const match = new RegExp(`${TASK_BLOCKED_SIGNAL}:\\s*(.+?)(?:\\n|$)`).exec(
    response,
  );
  if (match?.[1] !== undefined) {
    return match[1].trim();
  }

  // Also check for just TASK_BLOCKED without reason
  if (response.includes(TASK_BLOCKED_SIGNAL)) {
    return "No reason provided";
  }

  return null;
}

/**
 * Check if Claude's response contains the TASK_DONE signal
 *
 * @param response - Claude's response text
 * @returns True if task is done
 */
function detectTaskDone(response: string): boolean {
  return response.includes(TASK_DONE_SIGNAL);
}

/**
 * Execute a single task
 *
 * @param task - The task to execute
 * @param sessionDirectory - Path to session directory
 * @returns Execution result
 */
function executeTask(
  task: GeneratedTask,
  sessionDirectory: string,
): TaskExecutionResult {
  // Mark task as in_progress
  updateTaskStatus(sessionDirectory, task.id, "in_progress");

  console.log(chalk.blue(`\n▶ Executing task ${task.id}: ${task.title}`));
  console.log(chalk.dim("─".repeat(60)));

  const prompt = buildExecutionPrompt(task);
  const result: HeadlessResult | null = invokeClaudeHeadless({ prompt });

  if (result === null) {
    return {
      error: "Claude invocation failed",
      status: "error",
      taskId: task.id,
    };
  }

  // Check for TASK_DONE signal
  if (detectTaskDone(result.result)) {
    updateTaskStatus(sessionDirectory, task.id, "complete");
    console.log(chalk.green(`✓ Task ${task.id} completed`));
    return { status: "complete", taskId: task.id };
  }

  // Check for TASK_BLOCKED signal
  const blockedReason = detectTaskBlocked(result.result);
  if (blockedReason !== null) {
    console.log(chalk.yellow(`⚠ Task ${task.id} blocked: ${blockedReason}`));
    return { blockedReason, status: "blocked", taskId: task.id };
  }

  // No signal detected - task still in progress
  console.log(
    chalk.dim(`Task ${task.id} iteration complete, no completion signal`),
  );
  return { status: "in_progress", taskId: task.id };
}

// =============================================================================
// Signal Detection
// =============================================================================

/**
 * Get the next pending task
 *
 * @param tasksFile - Tasks file to search
 * @returns Next pending task or null if none found
 */
function getNextPendingTask(
  tasksFile: GeneratedTasksFile,
): GeneratedTask | null {
  // First check for in_progress tasks (resume scenario)
  const inProgress = tasksFile.tasks.find((t) => t.status === "in_progress");
  if (inProgress !== undefined) {
    return inProgress;
  }

  // Then find first pending task
  return tasksFile.tasks.find((t) => t.status === "pending") ?? null;
}

/**
 * Read tasks from session directory
 *
 * @param sessionDirectory - Path to session directory
 * @returns Parsed tasks file or null if read failed
 */
function readTasksFile(sessionDirectory: string): GeneratedTasksFile | null {
  const paths: SessionPaths = getSessionPaths(sessionDirectory);

  try {
    const content = readFileSync(paths.tasksJson, "utf8");
    return JSON.parse(content) as GeneratedTasksFile;
  } catch {
    return null;
  }
}

// =============================================================================
// Prompt Building
// =============================================================================

/**
 * Run the execution loop
 *
 * Iterates through pending tasks, invoking Claude for each one.
 * Stops when all tasks are complete, max iterations reached, or a task is blocked.
 *
 * @param options - Execution options
 * @returns Execution loop result
 */
function runExecutionLoop(options: ExecutionOptions): ExecutionLoopResult {
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  let completedCount = 0;
  let blockedCount = 0;

  // Setup signal handler for graceful shutdown
  setupSignalHandler(options.sessionDirectory);

  // Read current state to determine starting iteration
  const currentState = readSessionState(options.sessionDirectory);
  let startIteration = 1;

  if (options.resume === true && currentState !== null) {
    startIteration = currentState.currentIteration + 1;
    console.log(chalk.bold("\n🔄 Resuming execution loop"));
    console.log(chalk.dim(`Resuming from iteration ${startIteration}`));
    appendProgressLog(
      options.sessionDirectory,
      `Resuming session from iteration ${startIteration}`,
    );
  } else {
    console.log(chalk.bold("\n🚀 Starting execution loop"));
    appendProgressLog(options.sessionDirectory, "Starting execution loop");
  }
  console.log(chalk.dim(`Max iterations: ${maxIterations}`));

  // Update state to running
  updateSessionState(options.sessionDirectory, { status: "running" });

  let iterationsUsed = startIteration - 1;

  for (
    let iteration = startIteration;
    iteration <= maxIterations;
    iteration += 1
  ) {
    // Check for shutdown request
    if (isShutdownRequested()) {
      return {
        blockedCount,
        completedCount,
        error: "Shutdown requested",
        iterationsUsed,
        success: false,
      };
    }

    iterationsUsed = iteration;

    // Update state with current iteration
    updateSessionState(options.sessionDirectory, {
      currentIteration: iteration,
    });

    // Read current tasks state
    const tasksFile = readTasksFile(options.sessionDirectory);
    if (tasksFile === null) {
      updateSessionState(options.sessionDirectory, { status: "failed" });
      appendProgressLog(
        options.sessionDirectory,
        "ERROR: Failed to read tasks.json",
      );
      return {
        blockedCount,
        completedCount,
        error: "Failed to read tasks.json",
        iterationsUsed,
        success: false,
      };
    }

    // Get next task to execute
    const nextTask = getNextPendingTask(tasksFile);
    if (nextTask === null) {
      console.log(chalk.green("\n✓ All tasks completed!"));
      updateSessionState(options.sessionDirectory, { status: "completed" });
      appendProgressLog(options.sessionDirectory, "All tasks completed");
      return { blockedCount, completedCount, iterationsUsed, success: true };
    }

    console.log(chalk.dim(`\n[Iteration ${iteration}/${maxIterations}]`));
    appendProgressLog(
      options.sessionDirectory,
      `Iteration ${iteration}: Starting task ${nextTask.id} - ${nextTask.title}`,
    );

    // Execute the task
    const result = executeTask(nextTask, options.sessionDirectory);

    switch (result.status) {
      case "blocked": {
        blockedCount += 1;
        // Stop on blocked task
        console.log(
          chalk.yellow(
            `\n⚠ Stopping: Task ${result.taskId} is blocked: ${result.blockedReason}`,
          ),
        );
        updateSessionState(options.sessionDirectory, { status: "failed" });
        appendProgressLog(
          options.sessionDirectory,
          `Task ${result.taskId} BLOCKED: ${result.blockedReason}`,
        );
        return {
          blockedCount,
          completedCount,
          error: `Task ${result.taskId} blocked: ${result.blockedReason}`,
          iterationsUsed,
          success: false,
        };
      }
      case "complete": {
        completedCount += 1;
        appendProgressLog(
          options.sessionDirectory,
          `Task ${result.taskId} COMPLETED`,
        );
        break;
      }
      case "error": {
        console.log(
          chalk.red(
            `\n✗ Error executing task ${result.taskId}: ${result.error}`,
          ),
        );
        updateSessionState(options.sessionDirectory, { status: "failed" });
        appendProgressLog(
          options.sessionDirectory,
          `Task ${result.taskId} ERROR: ${result.error}`,
        );
        return {
          blockedCount,
          completedCount,
          error: result.error,
          iterationsUsed,
          success: false,
        };
      }
      // No default
    }
    // status === "in_progress" means we continue to next iteration
    if (result.status === "in_progress") {
      appendProgressLog(
        options.sessionDirectory,
        `Task ${result.taskId} still in progress`,
      );
    }
  }

  console.log(chalk.yellow(`\n⚠ Max iterations (${maxIterations}) reached`));
  updateSessionState(options.sessionDirectory, { status: "interrupted" });
  appendProgressLog(
    options.sessionDirectory,
    `Max iterations (${maxIterations}) reached`,
  );
  return { blockedCount, completedCount, iterationsUsed, success: false };
}

// =============================================================================
// Task Execution
// =============================================================================

/**
 * Update a task's status in the tasks file
 *
 * @param sessionDirectory - Path to session directory
 * @param taskId - ID of task to update
 * @param status - New status
 * @returns Updated tasks file or null if update failed
 */
function updateTaskStatus(
  sessionDirectory: string,
  taskId: number,
  status: "complete" | "in_progress" | "pending",
): GeneratedTasksFile | null {
  const tasksFile = readTasksFile(sessionDirectory);
  if (tasksFile === null) {
    return null;
  }

  const task = tasksFile.tasks.find((t) => t.id === taskId);
  if (task === undefined) {
    return null;
  }

  task.status = status;
  writeTasksFile(sessionDirectory, tasksFile);
  return tasksFile;
}

// =============================================================================
// Execution Loop
// =============================================================================

/**
 * Write tasks to session directory
 *
 * @param sessionDirectory - Path to session directory
 * @param tasksFile - Tasks file to write
 */
function writeTasksFile(
  sessionDirectory: string,
  tasksFile: GeneratedTasksFile,
): void {
  const paths: SessionPaths = getSessionPaths(sessionDirectory);
  writeFileSync(paths.tasksJson, JSON.stringify(tasksFile, null, 2));
}

// =============================================================================
// Exports
// =============================================================================

export {
  buildExecutionPrompt,
  DEFAULT_MAX_ITERATIONS,
  detectTaskBlocked,
  detectTaskDone,
  executeTask,
  type ExecutionLoopResult,
  type ExecutionOptions,
  getNextPendingTask,
  isShutdownRequested,
  readTasksFile,
  runExecutionLoop,
  setupSignalHandler,
  TASK_BLOCKED_SIGNAL,
  TASK_DONE_SIGNAL,
  type TaskExecutionResult,
  updateTaskStatus,
  writeTasksFile,
};

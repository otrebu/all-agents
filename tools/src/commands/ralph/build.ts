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

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import * as readline from "node:readline";

import type { BuildOptions } from "./types";

import { runCalibrate } from "./calibrate";
import { buildPrompt, invokeClaudeChat, invokeClaudeHeadless } from "./claude";
import {
  countRemaining,
  getMilestoneFromSubtasks,
  getNextSubtask,
  loadSubtasksFile,
} from "./config";
import { renderMarkdown } from "./display";
import { executeHook } from "./hooks";
import { runPostIterationHook } from "./post-iteration";

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
 * Options for periodic calibration
 */
interface PeriodicCalibrationOptions {
  calibrateEvery: number;
  contextRoot: string;
  iteration: number;
  subtasksPath: string;
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

  // Build context with file references (Claude will read them)
  const extraContext = `Execute one iteration of the Ralph build loop.

Follow the instructions in @${promptPath}

Subtasks file: @${subtasksPath}

Context files:
@${path.join(contextRoot, "CLAUDE.md")}
@${path.join(contextRoot, "docs/planning/PROGRESS.md")}

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
      console.log("\nAll subtasks complete!");
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

    // Check if we've exceeded max iterations for this subtask (0 = unlimited)
    if (maxIterations > 0 && currentAttempts > maxIterations) {
      console.error(
        `\nError: Max iterations (${maxIterations}) exceeded for subtask: ${currentSubtask.id}`,
      );
      console.error(`Subtask failed after ${maxIterations} attempts`);

      // Execute onMaxIterationsExceeded hook
      // eslint-disable-next-line no-await-in-loop -- Hook must complete before exit
      await executeHook("onMaxIterationsExceeded", {
        message: `Subtask ${currentSubtask.id} failed after ${maxIterations} attempts`,
        subtaskId: currentSubtask.id,
      });

      process.exit(1);
    }

    // Display iteration header
    const attemptDisplay =
      maxIterations > 0
        ? `${currentAttempts}/${maxIterations}`
        : `${currentAttempts}`;
    console.log(
      `\n=== Build Iteration ${iteration} ` +
        `(Subtask: ${currentSubtask.id}, ` +
        `Attempt: ${attemptDisplay}, ` +
        `${remaining} subtasks remaining) ===\n`,
    );

    // Build the prompt
    const prompt = buildIterationPrompt(contextRoot, subtasksPath);

    // Invoke Claude based on mode
    if (mode === "headless") {
      console.log("Invoking Claude (headless mode)...\n");

      const result = invokeClaudeHeadless({ prompt });

      if (result === null) {
        console.error("Claude headless invocation failed or was interrupted");
        process.exit(1);
      }

      // Display result with markdown rendering
      console.log("\n--- Claude Response ---");
      renderMarkdown(result.result);
      console.log();

      // Display stats
      const durationSeconds = Math.round(result.duration / 1000);
      const costFormatted = result.cost.toFixed(2);
      console.log(`--- Stats: ${durationSeconds}s | $${costFormatted} ---\n`);

      // Post-iteration hook for headless mode
      // Reload subtasks to check if current one was completed
      const postIterationSubtasks = loadSubtasksFile(subtasksPath);
      const postRemaining = countRemaining(postIterationSubtasks.subtasks);
      const didComplete = postRemaining < remaining;
      const milestone = getMilestoneFromSubtasks(postIterationSubtasks);

      runPostIterationHook({
        iterationNumber: currentAttempts,
        milestone,
        repoRoot: contextRoot,
        sessionId: result.sessionId,
        status: didComplete ? "completed" : "retrying",
        subtask: currentSubtask,
      });
    } else {
      // Supervised mode - user watches and can type
      console.log(
        "Invoking Claude (supervised mode - you can type if needed)...\n",
      );

      const chatResult = invokeClaudeChat(
        path.join(contextRoot, ITERATION_PROMPT_PATH),
        "build iteration",
        `Subtasks file: @${subtasksPath}\n\nContext files:\n@${path.join(contextRoot, "CLAUDE.md")}\n@${path.join(contextRoot, "docs/planning/PROGRESS.md")}`,
      );

      if (!chatResult.success && !chatResult.interrupted) {
        console.error("Supervised session failed");
        process.exit(chatResult.exitCode ?? 1);
      }

      console.log("\nSupervised session completed");
    }

    // For supervised mode, reload subtasks to check if current one was completed
    if (mode === "supervised") {
      const updatedSubtasks = loadSubtasksFile(subtasksPath);
      const newRemaining = countRemaining(updatedSubtasks.subtasks);

      if (newRemaining < remaining) {
        console.log(`\nSubtask ${currentSubtask.id} completed successfully`);
      }
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

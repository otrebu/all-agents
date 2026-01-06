import * as p from "@clack/prompts";
import log from "@lib/log";
import { execa } from "execa";
import { readFileSync } from "node:fs";
import ora from "ora";

import { buildPrompt, isCompleteSignal } from "./prompt";
import {
  ClaudeError,
  type IterationResult,
  type PRD,
  PRDError,
  PRDSchema,
  type RunOptions,
} from "./types";

// 10 minutes per iteration - Claude needs time to implement features
const CLAUDE_TIMEOUT_MS = 600_000;

/**
 * Execute a single Claude iteration
 */
async function executeClaude(prompt: string): Promise<string> {
  try {
    const result = await execa(
      "claude",
      ["--permission-mode", "acceptEdits", prompt],
      { stdio: "pipe", timeout: CLAUDE_TIMEOUT_MS },
    );
    return result.stdout;
  } catch (error) {
    const execaError = error as { exitCode?: number; message?: string };
    throw new ClaudeError(
      execaError.message ?? "Claude subprocess failed",
      execaError.exitCode,
    );
  }
}

/**
 * Error handler wrapper for CLI
 */
async function executeRalphRun(options: RunOptions): Promise<void> {
  try {
    await runRalph(options);
  } catch (error) {
    if (error instanceof PRDError) {
      log.error(`PRD Error: ${error.message}`);
    } else if (error instanceof ClaudeError) {
      log.error(`Claude Error: ${error.message}`);
      if (error.exitCode !== undefined) {
        log.dim(`Exit code: ${error.exitCode}`);
      }
    } else if (error instanceof Error) {
      log.error(`Unexpected error: ${error.message}`);
    }
    process.exit(1);
  }
}

/**
 * Load and validate PRD from file
 */
function loadPRD(prdPath: string): PRD {
  let rawContent = "";
  try {
    rawContent = readFileSync(prdPath, "utf8");
  } catch (error) {
    throw new PRDError(`Cannot read PRD file: ${prdPath}`, error as Error);
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(rawContent);
  } catch (error) {
    throw new PRDError(`Invalid JSON in PRD file: ${prdPath}`, error as Error);
  }

  const result = PRDSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new PRDError(`PRD validation failed:\n${issues}`);
  }

  return result.data;
}

/**
 * Prompt user for action in interactive mode.
 * Returns true to continue, false to stop.
 */
async function promptInteractiveAction(
  iteration: number,
  prdPath: string,
): Promise<boolean> {
  const action = await p.select({
    message: `Iteration ${iteration} complete. Continue?`,
    options: [
      { label: "Continue", value: "continue" as const },
      { label: "View diff", value: "diff" as const },
      { label: "View PRD", value: "prd" as const },
      { label: "Stop", value: "stop" as const },
    ],
  });

  if (p.isCancel(action)) {
    return false;
  }

  switch (action) {
    case "continue": {
      return true;
    }
    case "diff": {
      await showGitDiff();
      return promptInteractiveAction(iteration, prdPath);
    }
    case "prd": {
      showPRDStatus(prdPath);
      return promptInteractiveAction(iteration, prdPath);
    }
    case "stop": {
      return false;
    }
    default: {
      // Exhaustive check
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

/**
 * Run the iteration loop with fixed count
 */
async function runFixedLoop(options: RunOptions): Promise<void> {
  for (let index = 1; index <= options.iterationCount; index += 1) {
    const spinner = ora(`Iteration ${index}/${options.iterationCount}`).start();

    try {
      // Await in loop is intentional - iterations must run sequentially
      // eslint-disable-next-line no-await-in-loop
      const result = await runSingleIteration(
        options.prdPath,
        options.progressPath,
      );

      if (result.completed) {
        spinner.succeed(`Iteration ${index}: PRD complete!`);
        log.success("\nAll features implemented.");
        return;
      }

      spinner.succeed(`Iteration ${index} complete`);
    } catch (error) {
      spinner.fail(`Iteration ${index} failed`);
      throw error;
    }
  }

  log.info(`\nCompleted ${options.iterationCount} iterations.`);
}

/**
 * Run the iteration loop with human approval after each iteration
 */
async function runInteractiveLoop(options: RunOptions): Promise<void> {
  const maxIterations = options.iterationCount;
  let iteration = 0;

  while (shouldContinueInteractiveLoop(iteration, maxIterations)) {
    iteration += 1;
    const iterationLabel =
      maxIterations > 0 ? `${iteration}/${maxIterations}` : `${iteration}`;
    const spinner = ora(`Iteration ${iterationLabel}`).start();

    try {
      // Await in loop is intentional - iterations must run sequentially
      // eslint-disable-next-line no-await-in-loop
      const result = await runSingleIteration(
        options.prdPath,
        options.progressPath,
      );

      if (result.completed) {
        spinner.succeed(`Iteration ${iteration}: PRD complete!`);
        log.success("\nAll features implemented.");
        return;
      }

      spinner.succeed(`Iteration ${iteration} complete`);
    } catch (error) {
      spinner.fail(`Iteration ${iteration} failed`);
      throw error;
    }

    // eslint-disable-next-line no-await-in-loop
    const shouldContinue = await promptInteractiveAction(
      iteration,
      options.prdPath,
    );
    if (!shouldContinue) {
      log.info("\nStopped by user.");
      return;
    }
  }

  log.info(`\nCompleted ${iteration} iterations.`);
}

/**
 * Main entry point: select and run the appropriate loop based on mode
 */
async function runRalph(options: RunOptions): Promise<void> {
  // Validate PRD exists before starting
  loadPRD(options.prdPath);

  log.header("\nRalph - PRD Implementation Harness\n");
  log.dim(`PRD: ${options.prdPath}`);
  log.dim(`Progress: ${options.progressPath}`);
  log.dim(`Mode: ${options.mode}`);
  if (options.mode === "fixed") {
    log.dim(`Iterations: ${options.iterationCount}`);
  }
  log.plain("");

  switch (options.mode) {
    case "fixed": {
      return runFixedLoop(options);
    }
    case "interactive": {
      return runInteractiveLoop(options);
    }
    case "unlimited": {
      return runUnlimitedLoop(options);
    }
    default: {
      // Exhaustive check
      const _exhaustive: never = options.mode;
      return _exhaustive;
    }
  }
}

/**
 * Run a single iteration of the PRD implementation loop
 */
async function runSingleIteration(
  prdPath: string,
  progressPath: string,
): Promise<IterationResult> {
  const prd = loadPRD(prdPath);
  const prompt = buildPrompt(prdPath, progressPath, prd);

  const output = await executeClaude(prompt);

  if (isCompleteSignal(output)) {
    return { completed: true };
  }

  return { completed: false };
}

/**
 * Run the iteration loop until <complete/> signal
 */
async function runUnlimitedLoop(options: RunOptions): Promise<void> {
  let iteration = 0;
  let isComplete = false;

  while (!isComplete) {
    iteration += 1;
    const spinner = ora(`Iteration ${iteration}`).start();

    try {
      // Await in loop is intentional - iterations must run sequentially
      // eslint-disable-next-line no-await-in-loop
      const result = await runSingleIteration(
        options.prdPath,
        options.progressPath,
      );

      if (result.completed) {
        spinner.succeed(`Iteration ${iteration}: PRD complete!`);
        log.success("\nAll features implemented.");
        isComplete = true;
      } else {
        spinner.succeed(`Iteration ${iteration} complete`);
      }
    } catch (error) {
      spinner.fail(`Iteration ${iteration} failed`);
      throw error;
    }
  }
}

/**
 * Check if the interactive loop should continue.
 * Zero means unlimited iterations.
 */
function shouldContinueInteractiveLoop(
  iteration: number,
  maxIterations: number,
): boolean {
  if (maxIterations === 0) {
    return true;
  }
  return iteration < maxIterations;
}

/**
 * Show git diff for interactive mode
 */
async function showGitDiff(): Promise<void> {
  try {
    const { stdout } = await execa("git", ["diff", "--stat"]);
    log.plain(`\n${stdout}\n`);
  } catch {
    log.warn("Could not show git diff");
  }
}

/**
 * Show PRD status for interactive mode
 */
function showPRDStatus(prdPath: string): void {
  try {
    const prd = loadPRD(prdPath);
    const done = prd.features.filter((f) => f.status === "done").length;
    const pending = prd.features.filter((f) => f.status === "pending").length;
    const inProgress = prd.features.filter(
      (f) => f.status === "in_progress",
    ).length;
    const blocked = prd.features.filter((f) => f.status === "blocked").length;

    log.plain(`\nPRD Status: ${prd.name}`);
    log.plain(`  Done: ${done}/${prd.features.length}`);
    log.plain(`  Pending: ${pending}`);
    log.plain(`  In Progress: ${inProgress}`);
    log.plain(`  Blocked: ${blocked}\n`);
  } catch {
    log.warn("Could not read PRD status");
  }
}

export { executeRalphRun, runRalph };

/**
 * Calibration module for Ralph autonomous build system
 *
 * This module provides calibration checks to detect drift and improve performance:
 * - runIntentionCheck() - Detect when code diverges from planning docs
 * - runTechnicalCheck() - Detect code quality issues and technical debt
 * - runImproveCheck() - Analyze session logs for inefficiencies
 * - runCalibrate() - Dispatch to correct check based on subcommand
 *
 * @see context/workflows/ralph/calibration/intention-drift.md
 * @see context/workflows/ralph/calibration/technical-drift.md
 * @see context/workflows/ralph/calibration/self-improvement.md
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ProviderType } from "./providers/types";
import type { RalphConfig, Subtask, SubtasksFile } from "./types";

import {
  getCompletedSubtasks,
  loadRalphConfig,
  loadSubtasksFile,
  loadTimeoutConfig,
} from "./config";
import { invokeWithProvider, resolveProvider } from "./providers/registry";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for calibration checks
 */
interface CalibrateOptions {
  /** Context root path (repo root) */
  contextRoot: string;
  /** Skip approval even if config says 'suggest' */
  force?: boolean;
  /** Model override for calibration invocation */
  model?: string;
  /** Provider override for calibration invocation */
  provider?: string;
  /** Require approval even if config says 'autofix' */
  review?: boolean;
  /** Path to subtasks.json file */
  subtasksPath: string;
}

/**
 * Valid calibrate subcommands
 */
type CalibrateSubcommand = "all" | "improve" | "intention" | "technical";

// =============================================================================
// Approval Mode Logic
// =============================================================================

/**
 * Determine approval mode based on config and CLI flags
 *
 * CLI overrides:
 * - --force → "force" (skip approval)
 * - --review → "review" (require approval)
 *
 * @param config - Ralph configuration
 * @param options - CLI options with force/review flags
 * @returns Approval mode string
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
  // Default to "auto" if not specified in config
  return "auto";
}

// =============================================================================
// Subtask Helpers
// =============================================================================

/**
 * Get session IDs from completed subtasks
 *
 * @param subtasksFile - Loaded subtasks file
 * @returns Comma-separated list of session IDs
 */
function getCompletedSessionIds(subtasksFile: SubtasksFile): string {
  return getCompletedSubtasks(subtasksFile.subtasks)
    .filter((s) => s.sessionId !== undefined && s.sessionId !== "")
    .map((s) => s.sessionId)
    .join(",");
}

/**
 * Get completed subtasks with commitHash
 *
 * @param subtasksFile - Loaded subtasks file
 * @returns Array of completed subtasks that have commitHash
 */
function getCompletedWithCommitHash(
  subtasksFile: SubtasksFile,
): Array<Subtask> {
  return getCompletedSubtasks(subtasksFile.subtasks).filter(
    (s) => s.commitHash !== undefined && s.commitHash !== "",
  );
}

/**
 * Load subtasks file, returning null on error (logs error message)
 *
 * @param subtasksPath - Path to subtasks file
 * @returns SubtasksFile or null on error
 */
function loadSubtasksFileOrNull(subtasksPath: string): null | SubtasksFile {
  try {
    return loadSubtasksFile(subtasksPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return null;
  }
}

// =============================================================================
// Intention Drift Check
// =============================================================================

/**
 * Run calibration check(s) based on subcommand
 *
 * Dispatches to the correct check function based on the subcommand:
 * - intention: runIntentionCheck()
 * - technical: runTechnicalCheck()
 * - improve: runImproveCheck()
 * - all: runs all three sequentially
 *
 * @param subcommand - The calibration subcommand
 * @param options - Calibrate options
 * @returns true if all checks succeeded
 */
async function runCalibrate(
  subcommand: CalibrateSubcommand,
  options: CalibrateOptions,
): Promise<boolean> {
  // Select provider (CLI flag > env var > config > auto-detect)
  const provider = await resolveProvider({ cliFlag: options.provider });
  const { model } = options;
  console.log(`Using provider: ${provider}`);
  if (model !== undefined && model !== "") {
    console.log(`Using model: ${model}`);
  }

  switch (subcommand) {
    case "all": {
      const isIntentionOk = await runIntentionCheck(options, provider, model);
      console.log();

      const isTechnicalOk = await runTechnicalCheck(options, provider, model);
      console.log();

      const isImproveOk = await runImproveCheck(options, provider, model);

      return isIntentionOk && isTechnicalOk && isImproveOk;
    }
    case "improve": {
      return runImproveCheck(options, provider, model);
    }
    case "intention": {
      return runIntentionCheck(options, provider, model);
    }
    case "technical": {
      return runTechnicalCheck(options, provider, model);
    }
    default: {
      // This should not happen due to validation in index.ts
      // Cast to string to handle the never type in template literal
      console.error(`Error: Unknown subcommand: ${subcommand as string}`);
      return false;
    }
  }
}

// =============================================================================
// Technical Drift Check
// =============================================================================

/**
 * Run self-improvement analysis
 *
 * Analyzes session logs from completed subtasks for inefficiencies
 * and proposes improvements to prompts, skills, and documentation.
 *
 * Uses: context/workflows/ralph/calibration/self-improvement.md
 *
 * @param options - Calibrate options
 * @returns true if check ran successfully
 */
async function runImproveCheck(
  options: CalibrateOptions,
  provider: ProviderType,
  model?: string,
): Promise<boolean> {
  console.log("=== Running Self-Improvement Analysis ===");

  const { contextRoot, subtasksPath } = options;

  // Verify prompt exists
  const promptPath = path.join(
    contextRoot,
    "context/workflows/ralph/calibration/self-improvement.md",
  );
  if (!existsSync(promptPath)) {
    console.error(`Error: Self-improvement prompt not found: ${promptPath}`);
    return false;
  }

  // Load subtasks
  const subtasksFile = loadSubtasksFileOrNull(subtasksPath);
  if (subtasksFile === null) {
    return false;
  }

  // Load config and check selfImprovement mode
  // Uses unified config loader (no explicit path needed)
  const config = loadRalphConfig();
  // Mode is "suggest", "autofix", or "off"
  const selfImproveMode = (config.selfImprovement?.mode ?? "suggest") as string;

  // Check for "off" mode - skip analysis entirely
  if (selfImproveMode === "off") {
    console.log("Self-improvement analysis is disabled in aaa.config.json");
    return true;
  }

  // Get session IDs from completed subtasks
  const sessionIds = getCompletedSessionIds(subtasksFile);
  if (sessionIds === "") {
    console.log(
      "No completed subtasks with sessionId found. Nothing to analyze.",
    );
    return true;
  }

  console.log(`Found sessionIds: ${sessionIds}`);
  console.log(`Self-improvement mode: ${selfImproveMode}`);

  // Read the prompt file
  const promptContent = readFileSync(promptPath, "utf8");

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

  // Run provider for analysis with timeout protection
  console.log(`Invoking ${provider} for self-improvement analysis...`);
  const timeoutConfig = loadTimeoutConfig();
  try {
    const result = await invokeWithProvider(provider, {
      gracePeriodMs: timeoutConfig.graceSeconds * 1000,
      mode: "headless",
      model,
      prompt,
      stallTimeoutMs: timeoutConfig.stallMinutes * 60 * 1000,
      timeout: timeoutConfig.hardMinutes * 60 * 1000,
    });

    if (result === null) {
      console.error(
        "Self-improvement analysis failed, was interrupted, or timed out",
      );
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Self-improvement analysis error: ${message}`);
    return false;
  }

  console.log();
  console.log("=== Self-Improvement Analysis Complete ===");
  return true;
}

// =============================================================================
// Self-Improvement Check
// =============================================================================

/**
 * Run intention drift check
 *
 * Analyzes completed subtasks with commitHash to detect when code
 * diverges from the intended behavior defined in planning docs.
 *
 * Uses: context/workflows/ralph/calibration/intention-drift.md
 *
 * @param options - Calibrate options
 * @returns true if check ran successfully
 */
async function runIntentionCheck(
  options: CalibrateOptions,
  provider: ProviderType,
  model?: string,
): Promise<boolean> {
  console.log("=== Running Intention Drift Check ===");

  const { contextRoot, subtasksPath } = options;

  // Verify prompt exists
  const promptPath = path.join(
    contextRoot,
    "context/workflows/ralph/calibration/intention-drift.md",
  );
  if (!existsSync(promptPath)) {
    console.error(`Error: Intention drift prompt not found: ${promptPath}`);
    return false;
  }

  // Load subtasks
  const subtasksFile = loadSubtasksFileOrNull(subtasksPath);
  if (subtasksFile === null) {
    return false;
  }

  // Check for completed subtasks with commitHash
  const completed = getCompletedWithCommitHash(subtasksFile);
  if (completed.length === 0) {
    console.log(
      "No completed subtasks with commitHash found. Nothing to analyze.",
    );
    return true;
  }

  // Load config and determine approval mode
  // Uses unified config loader (no explicit path needed)
  const config = loadRalphConfig();
  const approvalMode = getApprovalMode(config, options);
  console.log(`Approval mode: ${approvalMode}`);

  // Read the prompt file
  const promptContent = readFileSync(promptPath, "utf8");

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

  // Run provider for analysis with timeout protection
  console.log(`Invoking ${provider} for intention drift analysis...`);
  const timeoutConfig = loadTimeoutConfig();
  try {
    const result = await invokeWithProvider(provider, {
      gracePeriodMs: timeoutConfig.graceSeconds * 1000,
      mode: "headless",
      model,
      prompt,
      stallTimeoutMs: timeoutConfig.stallMinutes * 60 * 1000,
      timeout: timeoutConfig.hardMinutes * 60 * 1000,
    });

    if (result === null) {
      console.error(
        "Intention drift analysis failed, was interrupted, or timed out",
      );
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Intention drift analysis error: ${message}`);
    return false;
  }

  console.log();
  console.log("=== Intention Drift Check Complete ===");
  return true;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Run technical drift check
 *
 * Analyzes completed subtasks with commitHash to detect code quality
 * issues and technical debt.
 *
 * Uses: context/workflows/ralph/calibration/technical-drift.md
 *
 * @param options - Calibrate options
 * @returns true if check ran successfully
 */
async function runTechnicalCheck(
  options: CalibrateOptions,
  provider: ProviderType,
  model?: string,
): Promise<boolean> {
  console.log("=== Running Technical Drift Check ===");

  const { contextRoot, subtasksPath } = options;

  // Verify prompt exists
  const promptPath = path.join(
    contextRoot,
    "context/workflows/ralph/calibration/technical-drift.md",
  );
  if (!existsSync(promptPath)) {
    console.log(`Note: Technical drift prompt not found: ${promptPath}`);
    console.log("Technical drift checking is not yet implemented.");
    return true;
  }

  // Load subtasks
  const subtasksFile = loadSubtasksFileOrNull(subtasksPath);
  if (subtasksFile === null) {
    return false;
  }

  // Check for completed subtasks with commitHash
  const completed = getCompletedWithCommitHash(subtasksFile);
  if (completed.length === 0) {
    console.log(
      "No completed subtasks with commitHash found. Nothing to analyze.",
    );
    return true;
  }

  // Load config and determine approval mode
  // Uses unified config loader (no explicit path needed)
  const config = loadRalphConfig();
  const approvalMode = getApprovalMode(config, options);

  // Read the prompt file
  const promptContent = readFileSync(promptPath, "utf8");

  // Build the prompt with context
  const prompt = `Execute technical drift analysis.

Follow the instructions in @${promptPath}

Subtasks file: @${subtasksPath}

Context files:
@${path.join(contextRoot, "CLAUDE.md")}

Approval mode: ${approvalMode}

Analyze code quality issues in completed subtasks and output a summary to stdout.

${promptContent}`;

  // Run provider for analysis with timeout protection
  console.log(`Invoking ${provider} for technical drift analysis...`);
  const timeoutConfig = loadTimeoutConfig();
  try {
    const result = await invokeWithProvider(provider, {
      gracePeriodMs: timeoutConfig.graceSeconds * 1000,
      mode: "headless",
      model,
      prompt,
      stallTimeoutMs: timeoutConfig.stallMinutes * 60 * 1000,
      timeout: timeoutConfig.hardMinutes * 60 * 1000,
    });

    if (result === null) {
      console.error(
        "Technical drift analysis failed, was interrupted, or timed out",
      );
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Technical drift analysis error: ${message}`);
    return false;
  }

  console.log();
  console.log("=== Technical Drift Check Complete ===");
  return true;
}

// =============================================================================
// Exports
// =============================================================================

export {
  type CalibrateOptions,
  type CalibrateSubcommand,
  runCalibrate,
  runImproveCheck,
  runIntentionCheck,
  runTechnicalCheck,
};

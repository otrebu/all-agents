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

import type { RalphConfig, Subtask, SubtasksFile } from "./types";

import { invokeClaudeHeadless } from "./claude";
import {
  getCompletedSubtasks,
  loadRalphConfig,
  loadSubtasksFile,
} from "./config";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for calibration checks
 */
interface CalibrateOptions {
  /** Context root path (repo root) */
  contextRoot: string;
  /** Skip approval even if config says 'always' */
  force?: boolean;
  /** Require approval even if config says 'auto' */
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
function runCalibrate(
  subcommand: CalibrateSubcommand,
  options: CalibrateOptions,
): boolean {
  switch (subcommand) {
    case "all": {
      const isIntentionOk = runIntentionCheck(options);
      console.log();

      const isTechnicalOk = runTechnicalCheck(options);
      console.log();

      const isImproveOk = runImproveCheck(options);

      return isIntentionOk && isTechnicalOk && isImproveOk;
    }
    case "improve": {
      return runImproveCheck(options);
    }
    case "intention": {
      return runIntentionCheck(options);
    }
    case "technical": {
      return runTechnicalCheck(options);
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
function runImproveCheck(options: CalibrateOptions): boolean {
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
  const configPath = path.join(contextRoot, "ralph.config.json");
  const config = loadRalphConfig(configPath);
  // Mode could be "always", "auto", or potentially "never" (not in schema but bash script handles it)
  const selfImproveMode = (config.selfImprovement?.mode ?? "always") as string;

  // Check for "never" mode - skip analysis entirely
  // Note: "never" is not in the schema but is supported for backward compatibility
  if (selfImproveMode === "never") {
    console.log("Self-improvement analysis is disabled in ralph.config.json");
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
  const prompt = `Execute self-improvement analysis.

Follow the instructions in @${promptPath}

Subtasks file: @${subtasksPath}

Config file: @${configPath}

Session IDs to analyze: ${sessionIds}

Self-improvement mode: ${selfImproveMode}
- If 'always': Create task files only, require user approval before applying changes
- If 'auto': Apply changes directly to target files (CLAUDE.md, prompts, skills) without creating task files

IMPORTANT: You MUST output a readable markdown summary to stdout following the format in the self-improvement.md prompt.
The summary should include:
- Session ID and subtask title
- Findings organized by inefficiency type (Tool Misuse, Wasted Reads, Backtracking, Excessive Iterations)
- Recommendations for improvements
- Reference to any task files created (in 'always' mode) or changes applied (in 'auto' mode)

TASK FILE CREATION (when mode is 'always' and inefficiencies are found):
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
  console.log("Invoking Claude for self-improvement analysis...");
  const result = invokeClaudeHeadless({ prompt });

  if (result === null) {
    console.error("Self-improvement analysis failed or was interrupted");
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
function runIntentionCheck(options: CalibrateOptions): boolean {
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
  const config = loadRalphConfig(path.join(contextRoot, "ralph.config.json"));
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
- If 'auto': Create drift task files automatically
- If 'always' or 'review': Show findings and ask for approval before creating task files
- If 'force': Create drift task files without asking

Analyze all completed subtasks with commitHash and output a summary to stdout.
If drift is detected, create task files in docs/planning/tasks/ as specified in the prompt.

${promptContent}`;

  // Run Claude for analysis
  console.log("Invoking Claude for intention drift analysis...");
  const result = invokeClaudeHeadless({ prompt });

  if (result === null) {
    console.error("Intention drift analysis failed or was interrupted");
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
function runTechnicalCheck(options: CalibrateOptions): boolean {
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
  const config = loadRalphConfig(path.join(contextRoot, "ralph.config.json"));
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

  // Run Claude for analysis
  console.log("Invoking Claude for technical drift analysis...");
  const result = invokeClaudeHeadless({ prompt });

  if (result === null) {
    console.error("Technical drift analysis failed or was interrupted");
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

/**
 * Post-iteration hook for Ralph autonomous build system
 *
 * This module handles post-iteration processing:
 * - runPostIterationHook() - Main entry point, orchestrates all post-iteration actions
 * - generateSummary() - Uses Haiku with timeout for summary generation
 * - writeDiaryEntry() - Appends JSON line to logs/iterations.jsonl
 * - getFilesChanged() - Uses git diff + session log fallback
 *
 * The hook only runs in headless mode (when sessionId is provided).
 * In supervised mode, the session is interactive and no automatic
 * summary/diary is generated.
 */

import { execSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

import type { IterationDiaryEntry, IterationStatus, Subtask } from "./types";

import { invokeClaudeHaiku } from "./claude";
import {
  calculateDurationMs,
  countToolCalls,
  getFilesFromSession,
  getSessionJsonlPath,
} from "./session";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for running the post-iteration hook
 */
interface PostIterationOptions {
  /** Current iteration attempt number (1 = first try) */
  iterationNumber?: number;
  /** Name of the milestone this subtask belongs to */
  milestone?: string;
  /** Repository root path for session discovery */
  repoRoot: string;
  /** Claude session ID (required - hook is skipped without this) */
  sessionId: string;
  /** The iteration status */
  status: IterationStatus;
  /** The subtask that was processed */
  subtask: Subtask;
}

/**
 * Result from Haiku summary generation
 */
interface SummaryResult {
  /** Key findings from the iteration */
  keyFindings: Array<string>;
  /** Brief summary of what happened */
  summary: string;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms >= 60_000) {
    const minutes = Math.floor(ms / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
  if (ms >= 1000) {
    return `${Math.floor(ms / 1000)}s`;
  }
  return `${ms}ms`;
}

// =============================================================================
// Summary Generation
// =============================================================================

/**
 * Generate iteration summary using Claude Haiku
 *
 * Uses the iteration-summary.md prompt template with placeholder substitution.
 * Falls back to a default summary if Haiku fails or times out.
 *
 * @param options - PostIterationOptions containing subtask and session info
 * @param sessionPath - Path to session JSONL file
 * @returns SummaryResult with summary text and key findings
 */
function generateSummary(
  options: PostIterationOptions,
  sessionPath: null | string,
): SummaryResult {
  const {
    iterationNumber = 1,
    milestone = "",
    repoRoot,
    status,
    subtask,
  } = options;

  // Skip Haiku if no session (Haiku can't read files in -p mode anyway)
  if (sessionPath === null) {
    return {
      keyFindings: [],
      summary: `Iteration ${status} for ${subtask.id}: ${subtask.title}`,
    };
  }

  const promptPath = `${repoRoot}/context/workflows/ralph/hooks/iteration-summary.md`;

  // Check if prompt template exists
  if (!existsSync(promptPath)) {
    console.log("Prompt template not found, using default summary");
    return {
      keyFindings: [],
      summary: `Iteration ${status} for ${subtask.id}: ${subtask.title}`,
    };
  }

  // Read and substitute placeholders in prompt template
  let promptContent = readFileSync(promptPath, "utf8");
  promptContent = promptContent
    .replaceAll("{{SUBTASK_ID}}", subtask.id)
    .replaceAll("{{STATUS}}", status)
    .replaceAll("{{SESSION_JSONL_PATH}}", sessionPath)
    .replaceAll("{{SUBTASK_TITLE}}", subtask.title)
    .replaceAll("{{MILESTONE}}", milestone)
    .replaceAll("{{TASK_REF}}", subtask.taskRef)
    .replaceAll("{{ITERATION_NUM}}", String(iterationNumber));

  // Invoke Haiku with 30 second timeout
  console.log("Generating iteration summary with Haiku...");
  const result = invokeClaudeHaiku({ prompt: promptContent, timeout: 30_000 });

  if (result === null) {
    console.log("Haiku summary generation failed, using default");
    return {
      keyFindings: [],
      summary: `Iteration ${status} for ${subtask.id}: ${subtask.title}`,
    };
  }

  // Parse JSON from Haiku response
  try {
    // The result may be inside a code block, try to extract JSON
    let jsonString = result;

    // Try to find JSON in code block
    const codeBlockMatch = /```(?:json)?\s*(?<content>[\s\S]*?)```/.exec(
      result,
    );
    if (codeBlockMatch !== null) {
      jsonString = codeBlockMatch.groups?.content ?? result;
    }

    // Try to find JSON object directly
    const jsonMatch = /\{[\s\S]*\}/.exec(jsonString);
    if (jsonMatch !== null) {
      jsonString = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonString.trim()) as {
      keyFindings?: Array<string>;
      summary?: string;
    };

    return {
      keyFindings: parsed.keyFindings ?? [],
      summary: parsed.summary ?? `Iteration ${status} for ${subtask.id}`,
    };
  } catch {
    console.log("Failed to parse Haiku response as JSON, using raw text");
    // Use the raw result as summary, truncated
    const summary = result.slice(0, 200);
    return { keyFindings: [], summary };
  }
}

// =============================================================================
// Files Changed
// =============================================================================

/**
 * Get list of files changed during the iteration
 *
 * Uses git diff to find recently modified tracked files.
 * Falls back to session log extraction if git shows no changes.
 *
 * @param sessionPath - Path to session JSONL file (for fallback)
 * @param repoRoot - Repository root path for git commands
 * @returns Array of file paths (max 50)
 */
function getFilesChanged(
  sessionPath: null | string,
  repoRoot: string,
): Array<string> {
  const files = new Set<string>();

  // Try git diff first (staged + unstaged)
  try {
    // Get staged files
    const staged = execSync("git diff --cached --name-only", {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();

    if (staged !== "") {
      for (const file of staged.split("\n")) {
        if (file !== "") {
          files.add(file);
        }
      }
    }

    // Get unstaged modified files
    const unstaged = execSync("git diff --name-only", {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();

    if (unstaged !== "") {
      for (const file of unstaged.split("\n")) {
        if (file !== "") {
          files.add(file);
        }
      }
    }
  } catch (error) {
    // Log git error, continue to fallback
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Git diff failed (using session fallback): ${message}`);
  }

  // If no git changes found, try to extract from session log
  if (files.size === 0 && sessionPath !== null) {
    const sessionFiles = getFilesFromSession(sessionPath);
    for (const file of sessionFiles) {
      files.add(file);
    }
  }

  // Limit to 50 files
  return [...files].slice(0, 50);
}

// =============================================================================
// Main Hook
// =============================================================================

/**
 * Run the post-iteration hook
 *
 * This hook is ONLY run in headless mode (when sessionId is provided).
 * In supervised mode, the user is watching and no automatic processing occurs.
 *
 * The hook:
 * 1. Finds the session JSONL file
 * 2. Generates a summary using Haiku
 * 3. Collects metrics (tool calls, duration, files changed)
 * 4. Writes a diary entry to logs/iterations.jsonl
 *
 * @param options - PostIterationOptions with session and subtask info
 * @returns The diary entry that was written, or null if hook was skipped
 */
function runPostIterationHook(
  options: PostIterationOptions,
): IterationDiaryEntry | null {
  const {
    iterationNumber = 1,
    milestone = "",
    repoRoot,
    sessionId,
    status,
    subtask,
  } = options;

  // Skip hook if no session ID (supervised mode has no session capture)
  if (sessionId === "") {
    console.log(
      "Skipping post-iteration hook: no session ID (supervised mode)",
    );
    return null;
  }

  console.log("\n=== Post-Iteration Hook ===");
  console.log(`Subtask: ${subtask.id}`);
  console.log(`Status: ${status}`);
  console.log(`Session: ${sessionId}`);

  // Find session JSONL path
  const sessionPath = getSessionJsonlPath(sessionId, repoRoot);
  if (sessionPath === null) {
    console.log("Warning: Could not find session JSONL file");
  } else {
    console.log(`Session file: ${sessionPath}`);
  }

  // Generate summary using Haiku
  const summaryResult = generateSummary(options, sessionPath);

  // Collect metrics
  const toolCalls = sessionPath === null ? 0 : countToolCalls(sessionPath);
  const duration = sessionPath === null ? 0 : calculateDurationMs(sessionPath);
  const filesChanged = getFilesChanged(sessionPath, repoRoot);

  // Build diary entry
  const timestamp = new Date().toISOString();
  const diaryEntry: IterationDiaryEntry = {
    duration,
    errors: [],
    filesChanged,
    iterationNum: iterationNumber,
    keyFindings: summaryResult.keyFindings,
    milestone,
    sessionId,
    status,
    subtaskId: subtask.id,
    summary: summaryResult.summary,
    taskRef: subtask.taskRef,
    timestamp,
    toolCalls,
  };

  // Write to diary
  const diaryPath = `${repoRoot}/logs/iterations.jsonl`;
  writeDiaryEntry(diaryEntry, diaryPath);

  // Log summary
  console.log("\n=== Iteration Summary ===");
  console.log(`Status: ${status}`);
  console.log(`Summary: ${summaryResult.summary}`);
  console.log(`Duration: ${formatDuration(duration)}`);
  console.log(`Tool calls: ${toolCalls}`);
  console.log(`Files changed: ${filesChanged.length}`);
  if (summaryResult.keyFindings.length > 0) {
    console.log(`Key findings: ${summaryResult.keyFindings.join(", ")}`);
  }
  console.log("=== End Post-Iteration Hook ===\n");

  return diaryEntry;
}

// =============================================================================
// Diary Entry
// =============================================================================

/**
 * Write an iteration diary entry to logs/iterations.jsonl
 *
 * Creates the logs directory if it doesn't exist.
 * Appends a single JSON line to the JSONL file.
 *
 * @param entry - The diary entry to write
 * @param diaryPath - Path to the diary file (default: logs/iterations.jsonl)
 */
function writeDiaryEntry(entry: IterationDiaryEntry, diaryPath: string): void {
  try {
    // Ensure logs directory exists
    const directory = dirname(diaryPath);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    // Append JSON line to diary file
    const jsonLine = JSON.stringify(entry);
    appendFileSync(diaryPath, `${jsonLine}\n`, "utf8");

    console.log(`Diary entry written to: ${diaryPath}`);
  } catch (error) {
    // Log but don't crash build loop
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to write diary entry: ${message}`);
  }
}

// =============================================================================
// Exports
// =============================================================================

export {
  formatDuration,
  generateSummary,
  getFilesChanged,
  type PostIterationOptions,
  runPostIterationHook,
  type SummaryResult,
  writeDiaryEntry,
};

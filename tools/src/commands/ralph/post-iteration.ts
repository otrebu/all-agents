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
  /** Total cost in USD for this iteration */
  costUsd?: number;
  /** Current iteration attempt number (1 = first try) */
  iterationNumber?: number;
  /** Maximum retry attempts configured */
  maxAttempts?: number;
  /** Name of the milestone this subtask belongs to */
  milestone?: string;
  /** Number of remaining subtasks after this iteration */
  remaining?: number;
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
 * Result from post-iteration hook
 */
interface PostIterationResult {
  /** Path to diary JSONL file */
  diaryPath: string;
  /** The diary entry that was written */
  entry: IterationDiaryEntry;
  /** Path to session JSONL file (if found) */
  sessionPath: null | string;
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
    return {
      keyFindings: [],
      summary: `Iteration ${status} for ${subtask.id}: ${subtask.title}`,
    };
  }

  // Read session content to pass directly (Haiku can't read files with -p flag)
  let sessionContent = "";
  try {
    const rawContent = readFileSync(sessionPath, "utf8");
    // Extract last ~50 lines or 10KB, whichever is smaller
    const lines = rawContent.split("\n").slice(-50);
    sessionContent = lines.join("\n").slice(-10_000);
  } catch {
    sessionContent = "(session log unavailable)";
  }

  // Read and substitute placeholders in prompt template
  let promptContent = readFileSync(promptPath, "utf8");
  promptContent = promptContent
    .replaceAll("{{SUBTASK_ID}}", subtask.id)
    .replaceAll("{{STATUS}}", status)
    .replaceAll("{{SESSION_CONTENT}}", sessionContent)
    .replaceAll("{{SUBTASK_TITLE}}", subtask.title)
    .replaceAll("{{MILESTONE}}", milestone)
    .replaceAll("{{TASK_REF}}", subtask.taskRef)
    .replaceAll("{{ITERATION_NUM}}", String(iterationNumber));

  // Invoke Haiku with 30 second timeout
  const result = invokeClaudeHaiku({ prompt: promptContent, timeout: 30_000 });

  if (result === null) {
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
  } catch {
    // Git failed, fall back to session log extraction
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
 * @returns Result with diary entry and paths, or null if hook was skipped
 */
function runPostIterationHook(
  options: PostIterationOptions,
): null | PostIterationResult {
  const {
    costUsd,
    iterationNumber = 1,
    milestone = "",
    repoRoot,
    sessionId,
    status,
    subtask,
  } = options;

  // Skip hook if no session ID (supervised mode has no session capture)
  if (sessionId === "") {
    return null;
  }

  // Find session JSONL path
  const sessionPath = getSessionJsonlPath(sessionId, repoRoot);

  // Generate summary using Haiku (silent - no console output)
  const summaryResult = generateSummary(options, sessionPath);

  // Collect metrics
  const toolCalls = sessionPath === null ? 0 : countToolCalls(sessionPath);
  const duration = sessionPath === null ? 0 : calculateDurationMs(sessionPath);
  const filesChanged = getFilesChanged(sessionPath, repoRoot);

  // Build diary entry
  const timestamp = new Date().toISOString();
  const diaryEntry: IterationDiaryEntry = {
    costUsd,
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

  return { diaryPath, entry: diaryEntry, sessionPath };
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
  generateSummary,
  getFilesChanged,
  type PostIterationOptions,
  type PostIterationResult,
  runPostIterationHook,
  type SummaryResult,
  writeDiaryEntry,
};

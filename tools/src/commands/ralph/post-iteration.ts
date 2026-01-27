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

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

import type {
  IterationDiaryEntry,
  IterationStatus,
  IterationTiming,
  Subtask,
} from "./types";

import { invokeClaudeHaiku } from "./claude";
import { getIterationLogPath } from "./config";
import {
  calculateDurationMs,
  countToolCalls,
  getFilesFromSession,
  getSessionJsonlPath,
  getTokenUsageFromSession,
} from "./session";

// =============================================================================
// Types
// =============================================================================

/**
 * Result from getLinesChanged()
 */
interface LinesChangedResult {
  /** Total lines added across all files */
  linesAdded: number;
  /** Total lines removed across all files */
  linesRemoved: number;
}

/**
 * Options for running the post-iteration hook
 */
interface PostIterationOptions {
  /** Time spent in Claude Code invocation (ms) - passed from build.ts */
  claudeMs?: number;
  /** Git commit hash after Claude invocation completed */
  commitAfter?: null | string;
  /** Git commit hash before Claude invocation started */
  commitBefore?: null | string;
  /** Total cost in USD for this iteration */
  costUsd?: number;
  /** Current iteration attempt number (1 = first try) */
  iterationNumber?: number;
  /** Maximum retry attempts configured */
  maxAttempts?: number;
  /** Name of the milestone this subtask belongs to */
  milestone?: string;
  /** Execution mode: 'headless' or 'supervised' */
  mode?: "headless" | "supervised";
  /** Number of remaining subtasks after this iteration */
  remaining?: number;
  /** Repository root path for session discovery */
  repoRoot: string;
  /** Claude session ID (required - hook is skipped without this) */
  sessionId: string;
  /** Skip Haiku summary generation to reduce latency and cost */
  skipSummary?: boolean;
  /** The iteration status */
  status: IterationStatus;
  /** The subtask that was processed */
  subtask: Subtask;
  /** Path to the subtasks.json file - used to derive milestone-scoped log path */
  subtasksPath: string;
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

// =============================================================================
// Summary Generation
// =============================================================================

/**
 * Result from Haiku summary generation
 */
interface SummaryResult {
  /** Key findings from the iteration */
  keyFindings: Array<string>;
  /** Brief summary of what happened */
  summary: string;
  /** Time spent generating summary (ms) */
  summaryMs: number;
}

// =============================================================================
// Lines Changed
// =============================================================================

/**
 * Generate iteration summary using Claude Haiku
 *
 * Uses the iteration-summary.md prompt template with placeholder substitution.
 * Falls back to a default summary if Haiku fails or times out.
 * When skipSummary is true, returns a placeholder summary immediately.
 *
 * @param options - PostIterationOptions containing subtask and session info
 * @param sessionPath - Path to session JSONL file
 * @returns SummaryResult with summary text, key findings, and timing
 */
function generateSummary(
  options: PostIterationOptions,
  sessionPath: null | string,
): SummaryResult {
  const {
    iterationNumber = 1,
    milestone = "",
    repoRoot,
    skipSummary: shouldSkipSummary = false,
    status,
    subtask,
  } = options;

  const summaryStart = Date.now();

  // Skip Haiku if skipSummary is true
  if (shouldSkipSummary) {
    return {
      keyFindings: [],
      summary: `[skipped] Iteration ${status} for ${subtask.id}: ${subtask.title}`,
      summaryMs: Date.now() - summaryStart,
    };
  }

  // Skip Haiku if no session (Haiku can't read files in -p mode anyway)
  if (sessionPath === null) {
    return {
      keyFindings: [],
      summary: `Iteration ${status} for ${subtask.id}: ${subtask.title}`,
      summaryMs: Date.now() - summaryStart,
    };
  }

  const promptPath = `${repoRoot}/context/workflows/ralph/hooks/iteration-summary.md`;

  // Check if prompt template exists
  if (!existsSync(promptPath)) {
    return {
      keyFindings: [],
      summary: `Iteration ${status} for ${subtask.id}: ${subtask.title}`,
      summaryMs: Date.now() - summaryStart,
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
  // SESSION_CONTENT is substituted LAST to prevent template corruption if session contains {{
  let promptContent = readFileSync(promptPath, "utf8");
  promptContent = promptContent
    .replaceAll("{{SUBTASK_ID}}", subtask.id)
    .replaceAll("{{STATUS}}", status)
    .replaceAll("{{SUBTASK_TITLE}}", subtask.title)
    .replaceAll("{{MILESTONE}}", milestone)
    .replaceAll("{{TASK_REF}}", subtask.taskRef)
    .replaceAll("{{ITERATION_NUM}}", String(iterationNumber))
    .replaceAll("{{SESSION_CONTENT}}", sessionContent);

  // Invoke Haiku with 30 second timeout
  const result = invokeClaudeHaiku({ prompt: promptContent, timeout: 30_000 });

  if (result === null || result.trim() === "") {
    return {
      keyFindings: [],
      summary: `Iteration ${status} for ${subtask.id}: ${subtask.title}`,
      summaryMs: Date.now() - summaryStart,
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
      summaryMs: Date.now() - summaryStart,
    };
  } catch {
    // Use the raw result as summary, truncated
    const summary = result.slice(0, 200);
    return { keyFindings: [], summary, summaryMs: Date.now() - summaryStart };
  }
}

// =============================================================================
// Files Changed
// =============================================================================

/**
 * Get lines added/removed between two commit hashes
 *
 * Uses git diff --numstat to count insertions and deletions
 * across all commits in the range. This accurately measures
 * what Claude committed during an iteration.
 *
 * @param repoRoot - Repository root path for git commands
 * @param before - Commit hash before Claude invocation
 * @param after - Commit hash after Claude invocation
 * @returns LinesChangedResult with totals
 */
function getCommitRangeLines(
  repoRoot: string,
  before: null | string,
  after: null | string,
): LinesChangedResult {
  if (before === null || after === null || before === after) {
    return { linesAdded: 0, linesRemoved: 0 };
  }

  const proc = Bun.spawnSync(
    ["git", "diff", "--numstat", `${before}..${after}`],
    { cwd: repoRoot },
  );

  if (proc.exitCode !== 0) {
    return { linesAdded: 0, linesRemoved: 0 };
  }

  // Parse numstat output
  const output = proc.stdout.toString("utf8");
  let added = 0;
  let removed = 0;

  for (const line of output.split("\n")) {
    const parts = line.split("\t");
    if (parts.length >= 2) {
      const a = Number.parseInt(parts[0] ?? "", 10);
      const r = Number.parseInt(parts[1] ?? "", 10);
      if (!Number.isNaN(a)) added += a;
      if (!Number.isNaN(r)) removed += r;
    }
  }

  return { linesAdded: added, linesRemoved: removed };
}

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

  // Primary source: extract from session log (Write/Edit tool uses)
  // This captures what Claude actually edited, even if already committed
  if (sessionPath !== null) {
    const sessionFiles = getFilesFromSession(sessionPath);
    for (const file of sessionFiles) {
      // Normalize to relative path if absolute
      const relativePath = file.startsWith(repoRoot)
        ? file.slice(repoRoot.length + 1)
        : file;
      files.add(relativePath);
    }
  }

  // Secondary: add any uncommitted git changes
  try {
    const stagedProc = Bun.spawnSync(
      ["git", "diff", "--cached", "--name-only"],
      { cwd: repoRoot },
    );
    const staged = stagedProc.stdout.toString("utf8").trim();

    if (staged !== "") {
      for (const file of staged.split("\n")) {
        if (file !== "") {
          files.add(file);
        }
      }
    }

    const unstagedProc = Bun.spawnSync(["git", "diff", "--name-only"], {
      cwd: repoRoot,
    });
    const unstaged = unstagedProc.stdout.toString("utf8").trim();

    if (unstaged !== "") {
      for (const file of unstaged.split("\n")) {
        if (file !== "") {
          files.add(file);
        }
      }
    }
  } catch {
    // Git failed, session files already captured above
  }

  // Filter out noise (diary files, lock files, etc.)
  const filtered = [...files].filter(
    (f) =>
      !f.includes("iterations.jsonl") &&
      !f.endsWith(".lock") &&
      !f.endsWith("lock.json"),
  );

  // Limit to 50 files
  return filtered.slice(0, 50);
}

/**
 * Get lines added/removed during the iteration
 *
 * Uses git diff --numstat to count insertions and deletions.
 * Includes both staged and unstaged changes.
 * Falls back to git show --numstat HEAD when no uncommitted changes exist
 * (handles case where Claude already committed during the iteration).
 *
 * @param repoRoot - Repository root path for git commands
 * @returns LinesChangedResult with totals
 */
function getLinesChanged(repoRoot: string): LinesChangedResult {
  let linesAdded = 0;
  let linesRemoved = 0;

  try {
    // Get staged changes
    const stagedProc = Bun.spawnSync(["git", "diff", "--cached", "--numstat"], {
      cwd: repoRoot,
    });
    const staged = stagedProc.stdout.toString("utf8");

    const stagedResult = parseNumstat(staged);
    linesAdded += stagedResult.linesAdded;
    linesRemoved += stagedResult.linesRemoved;

    // Get unstaged changes
    const unstagedProc = Bun.spawnSync(["git", "diff", "--numstat"], {
      cwd: repoRoot,
    });
    const unstaged = unstagedProc.stdout.toString("utf8");

    const unstagedResult = parseNumstat(unstaged);
    linesAdded += unstagedResult.linesAdded;
    linesRemoved += unstagedResult.linesRemoved;

    // Fallback: if no uncommitted changes, get lines from the latest commit
    // This handles the case where Claude already committed during the iteration
    if (linesAdded === 0 && linesRemoved === 0) {
      const headProc = Bun.spawnSync(["git", "show", "--numstat", "HEAD"], {
        cwd: repoRoot,
      });
      const headCommit = headProc.stdout.toString("utf8");

      const headResult = parseNumstat(headCommit);
      ({ linesAdded, linesRemoved } = headResult);
    }
  } catch {
    // Git failed, return zeros
  }

  return { linesAdded, linesRemoved };
}

/**
 * Parse git diff --numstat output to sum lines added/removed
 *
 * @param numstatOutput - Raw output from git diff --numstat
 * @returns LinesChangedResult with totals
 */
function parseNumstat(numstatOutput: string): LinesChangedResult {
  let linesAdded = 0;
  let linesRemoved = 0;

  const lines = numstatOutput.split("\n").filter((line) => line.trim() !== "");

  for (const line of lines) {
    // Format: "insertions\tdeletions\tfilename"
    // Binary files show as "-\t-\tfilename"
    const parts = line.split("\t");
    const added = parts[0];
    const removed = parts[1];

    // Skip if parts are missing or binary files (shown as "-")
    if (
      added === undefined ||
      removed === undefined ||
      added === "-" ||
      removed === "-"
    ) {
      // eslint-disable-next-line no-continue -- skip invalid lines
      continue;
    }

    const addedNumber = Number.parseInt(added, 10);
    const removedNumber = Number.parseInt(removed, 10);

    if (!Number.isNaN(addedNumber)) {
      linesAdded += addedNumber;
    }
    if (!Number.isNaN(removedNumber)) {
      linesRemoved += removedNumber;
    }
  }

  return { linesAdded, linesRemoved };
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
 * 2. Generates a summary using Haiku (with timing)
 * 3. Collects metrics (tool calls, duration, files changed) with timing
 * 4. Writes a diary entry to logs/iterations.jsonl with timing breakdown
 *
 * @param options - PostIterationOptions with session and subtask info
 * @returns Result with diary entry and paths, or null if hook was skipped
 */
function runPostIterationHook(
  options: PostIterationOptions,
): null | PostIterationResult {
  const hookStart = Date.now();

  const {
    claudeMs = 0,
    commitAfter,
    commitBefore,
    costUsd,
    iterationNumber = 1,
    milestone = "",
    mode,
    repoRoot,
    sessionId,
    status,
    subtask,
    subtasksPath,
  } = options;

  // Skip hook if no session ID (supervised mode has no session capture)
  if (sessionId === "") {
    return null;
  }

  // Find session JSONL path
  const sessionPath = getSessionJsonlPath(sessionId, repoRoot);

  // Generate summary using Haiku (silent - no console output)
  const summaryResult = generateSummary(options, sessionPath);

  // Collect metrics with timing
  const metricsStart = Date.now();
  const toolCalls = sessionPath === null ? 0 : countToolCalls(sessionPath);
  const duration = sessionPath === null ? 0 : calculateDurationMs(sessionPath);
  const filesChanged = getFilesChanged(sessionPath, repoRoot);

  // If commits are different, use commit range diff to accurately measure what Claude committed
  // If same (Claude didn't commit), fall back to staged+unstaged changes
  const hasValidCommitRange =
    commitBefore !== null &&
    commitBefore !== undefined &&
    commitBefore !== "" &&
    commitAfter !== null &&
    commitAfter !== undefined &&
    commitAfter !== "" &&
    commitBefore !== commitAfter;
  const { linesAdded, linesRemoved } = hasValidCommitRange
    ? getCommitRangeLines(repoRoot, commitBefore, commitAfter)
    : getLinesChanged(repoRoot);

  const tokenUsage =
    sessionPath === null ? undefined : getTokenUsageFromSession(sessionPath);
  const metricsMs = Date.now() - metricsStart;

  // Calculate hook total time
  const hookMs = Date.now() - hookStart;

  // Build timing breakdown
  const timing: IterationTiming = {
    claudeMs,
    hookMs,
    metricsMs,
    summaryMs: summaryResult.summaryMs,
  };

  // Build diary entry
  const timestamp = new Date().toISOString();
  const diaryEntry: IterationDiaryEntry = {
    costUsd,
    duration,
    errors: [],
    filesChanged,
    iterationNum: iterationNumber,
    keyFindings: summaryResult.keyFindings,
    linesAdded,
    linesRemoved,
    milestone,
    mode,
    sessionId,
    status,
    subtaskId: subtask.id,
    summary: summaryResult.summary,
    taskRef: subtask.taskRef,
    timestamp,
    timing,
    tokenUsage,
    toolCalls,
    type: "iteration",
  };

  // Write to diary - use milestone-scoped path
  const diaryPath = getIterationLogPath(subtasksPath);
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
  getLinesChanged,
  type LinesChangedResult,
  parseNumstat,
  type PostIterationOptions,
  type PostIterationResult,
  runPostIterationHook,
  type SummaryResult,
  writeDiaryEntry,
};

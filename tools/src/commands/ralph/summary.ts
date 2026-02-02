/**
 * Build summary generation for Ralph autonomous build system
 *
 * This module provides practical summary functionality:
 * - BuildPracticalSummary / CompletedSubtaskInfo types
 * - generateBuildSummary() - aggregates diary entries for completed subtasks
 * - getCommitRange() - extracts start/end commit hashes from subtasks
 *
 * No LLM calls - pure TypeScript aggregation of existing data.
 */

import type { IterationDiaryEntry, Subtask, SubtasksFile } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Practical summary of a build run
 */
interface BuildPracticalSummary {
  /** Git commit range for this build */
  commitRange: CommitRange;
  /** Number of subtasks remaining after this run */
  remaining: number;
  /** Aggregate stats for this build */
  stats: BuildStats;
  /** List of completed subtasks with summaries */
  subtasks: Array<CompletedSubtaskInfo>;
}

/**
 * Stats for the build run
 */
interface BuildStats {
  /** Number of subtasks completed this run */
  completed: number;
  /** Total cost in USD */
  costUsd: number;
  /** Total duration in milliseconds */
  durationMs: number;
  /** Number of subtasks that failed (exceeded max attempts) */
  failed: number;
  /** Total files changed across all iterations */
  filesChanged: number;
  /** Total lines added across all iterations */
  linesAdded: number;
  /** Total lines removed across all iterations */
  linesRemoved: number;
  /** Maximum context window size reached across all iterations */
  maxContextTokens: number;
  /** Total output tokens generated */
  outputTokens: number;
}

/**
 * Git commit range for the build
 */
interface CommitRange {
  /** Ending commit hash (last completed subtask) */
  endHash: null | string;
  /** Starting commit hash (first completed subtask this run) */
  startHash: null | string;
}

/**
 * Information about a completed subtask for the summary
 */
interface CompletedSubtaskInfo {
  /** Number of attempts it took to complete */
  attempts: number;
  /** Subtask ID */
  id: string;
  /** Summary from the diary entry */
  summary: string;
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Generate a practical summary from diary entries and completed subtask IDs
 *
 * No LLM calls - pure TypeScript aggregation.
 *
 * @param completedThisRun - Array of { id, attempts } for subtasks completed this run
 * @param diaryEntries - All diary entries from the logs directory
 * @param subtasksFile - The subtasks file to get remaining count
 * @returns BuildPracticalSummary with stats, subtask info, and commit range
 */
function generateBuildSummary(
  completedThisRun: Array<{ attempts: number; id: string }>,
  diaryEntries: Array<IterationDiaryEntry>,
  subtasksFile: SubtasksFile,
): BuildPracticalSummary {
  const completedIds = new Set(completedThisRun.map((c) => c.id));

  // Build a map of id -> attempts for quick lookup
  const attemptsMap = new Map<string, number>();
  for (const item of completedThisRun) {
    attemptsMap.set(item.id, item.attempts);
  }

  // Filter diary entries to only those for subtasks completed this run
  // and get the LAST entry for each subtask (most recent = final completion)
  const entriesBySubtask = new Map<string, IterationDiaryEntry>();
  for (const entry of diaryEntries) {
    if (completedIds.has(entry.subtaskId)) {
      // Keep the latest entry for each subtask
      const existing = entriesBySubtask.get(entry.subtaskId);
      if (
        !existing ||
        new Date(entry.timestamp) > new Date(existing.timestamp)
      ) {
        entriesBySubtask.set(entry.subtaskId, entry);
      }
    }
  }

  // Build subtask info list
  const subtasks: Array<CompletedSubtaskInfo> = [];
  for (const item of completedThisRun) {
    const entry = entriesBySubtask.get(item.id);
    subtasks.push({
      attempts: item.attempts,
      id: item.id,
      summary: entry?.summary ?? `Completed ${item.id}`,
    });
  }

  // Aggregate stats from all iterations for completed subtasks
  let totalCostUsd = 0;
  let totalDurationMs = 0;
  const allFilesChanged = new Set<string>();
  let failedCount = 0;
  let maxContextTokens = 0;
  let totalOutputTokens = 0;
  let totalLinesAdded = 0;
  let totalLinesRemoved = 0;

  // Count all entries (not just final) for aggregate stats
  for (const entry of diaryEntries) {
    if (completedIds.has(entry.subtaskId)) {
      totalCostUsd += entry.costUsd ?? 0;
      totalDurationMs += entry.duration ?? 0;
      // Deduplicate files across iterations
      for (const file of entry.filesChanged ?? []) {
        allFilesChanged.add(file);
      }
      if (entry.status === "failed") {
        failedCount += 1;
      }
      // Aggregate token usage - track max context, sum outputs
      if (entry.tokenUsage !== undefined) {
        maxContextTokens = Math.max(
          maxContextTokens,
          entry.tokenUsage.contextTokens,
        );
        totalOutputTokens += entry.tokenUsage.outputTokens;
      }
      // Aggregate line counts
      totalLinesAdded += entry.linesAdded ?? 0;
      totalLinesRemoved += entry.linesRemoved ?? 0;
    }
  }

  // Get commit range from subtasks file
  const commitRange = getCommitRange(subtasksFile, completedThisRun);

  // Count remaining subtasks
  const remaining = subtasksFile.subtasks.filter((s) => !s.done).length;

  return {
    commitRange,
    remaining,
    stats: {
      completed: completedThisRun.length,
      costUsd: totalCostUsd,
      durationMs: totalDurationMs,
      failed: failedCount,
      filesChanged: allFilesChanged.size,
      linesAdded: totalLinesAdded,
      linesRemoved: totalLinesRemoved,
      maxContextTokens,
      outputTokens: totalOutputTokens,
    },
    subtasks,
  };
}

/**
 * Extract git commit range from subtasks file based on completed subtasks this run
 *
 * @param subtasksFile - The subtasks file containing commit hashes
 * @param completedThisRun - Array of { id } for subtasks completed this run
 * @returns CommitRange with startHash and endHash
 */
function getCommitRange(
  subtasksFile: SubtasksFile,
  completedThisRun: Array<{ id: string }>,
): CommitRange {
  const completedIds = new Set(completedThisRun.map((c) => c.id));

  // Find all subtasks completed this run that have commit hashes
  const subtasksWithHashes: Array<Subtask> = subtasksFile.subtasks.filter(
    (s) =>
      completedIds.has(s.id) &&
      s.commitHash !== undefined &&
      s.commitHash !== "",
  );

  if (subtasksWithHashes.length === 0) {
    return { endHash: null, startHash: null };
  }

  // Sort by completedAt timestamp to find first and last
  subtasksWithHashes.sort((a, b) => {
    const dateA = new Date(a.completedAt ?? 0).getTime();
    const dateB = new Date(b.completedAt ?? 0).getTime();
    return dateA - dateB;
  });

  const first = subtasksWithHashes[0];
  const last = subtasksWithHashes.at(-1);

  return {
    endHash: last?.commitHash ?? null,
    startHash: first?.commitHash ?? null,
  };
}

// =============================================================================
// Exports
// =============================================================================

export {
  type BuildPracticalSummary,
  type BuildStats,
  type CommitRange,
  type CompletedSubtaskInfo,
  generateBuildSummary,
  getCommitRange,
};

/**
 * Build summary generation for Ralph autonomous build system
 *
 * This module provides practical summary functionality:
 * - BuildPracticalSummary / CompletedSubtaskInfo types
 * - generateBuildSummary() - aggregates diary entries for completed subtasks
 * - getCommitRange() - extracts start/end commit hashes from subtasks
 * - writeBuildSummaryFile() - writes BUILD-SUMMARY-{timestamp}.md
 *
 * No LLM calls - pure TypeScript aggregation of existing data.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
// Helper Functions
// =============================================================================

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDurationForMarkdown(ms: number): string {
  const seconds = Math.floor(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0 && remainingSeconds === 0) {
    return `${hours}h`;
  }
  if (remainingSeconds === 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
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
  let totalFilesChanged = 0;
  let failedCount = 0;

  // Count all entries (not just final) for aggregate stats
  for (const entry of diaryEntries) {
    if (completedIds.has(entry.subtaskId)) {
      totalCostUsd += entry.costUsd ?? 0;
      totalDurationMs += entry.duration ?? 0;
      totalFilesChanged += entry.filesChanged?.length ?? 0;
      if (entry.status === "failed") {
        failedCount += 1;
      }
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
      filesChanged: totalFilesChanged,
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

/**
 * Write a BUILD-SUMMARY markdown file with stats, git diff, and subtask list
 *
 * @param summary - The BuildPracticalSummary to write
 * @param repoRoot - Repository root directory
 * @param milestone - Optional milestone name for the filename
 * @returns Path to the written file
 */
function writeBuildSummaryFile(
  summary: BuildPracticalSummary,
  repoRoot: string,
  milestone?: string,
): string {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const filename = `BUILD-SUMMARY-${timestamp}.md`;

  // Write to milestone logs directory if we have one, otherwise to repo root
  const outputDirectory =
    milestone !== undefined && milestone !== ""
      ? join(repoRoot, "docs", "planning", "milestones", milestone)
      : repoRoot;

  // Ensure output directory exists
  if (!existsSync(outputDirectory)) {
    mkdirSync(outputDirectory, { recursive: true });
  }

  const outputPath = join(outputDirectory, filename);

  // Build the markdown content
  const lines: Array<string> = [];

  // Title
  lines.push("# Build Summary");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  if (milestone !== undefined && milestone !== "") {
    lines.push(`Milestone: ${milestone}`);
  }
  lines.push("");

  // Stats section
  lines.push("## Stats");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Completed | ${summary.stats.completed} |`);
  lines.push(`| Failed | ${summary.stats.failed} |`);
  lines.push(
    `| Duration | ${formatDurationForMarkdown(summary.stats.durationMs)} |`,
  );
  lines.push(`| Cost | $${summary.stats.costUsd.toFixed(2)} |`);
  lines.push(`| Files Changed | ${summary.stats.filesChanged} |`);
  lines.push(`| Remaining | ${summary.remaining} |`);
  lines.push("");

  // Git diff section
  if (
    summary.commitRange.startHash !== null &&
    summary.commitRange.endHash !== null
  ) {
    lines.push("## Git Changes");
    lines.push("");
    lines.push("```bash");
    lines.push(
      `git diff ${summary.commitRange.startHash}^..${summary.commitRange.endHash}`,
    );
    lines.push("```");
    lines.push("");

    // Try to get git diff stat
    try {
      const diffStat = execSync(
        `git diff --stat ${summary.commitRange.startHash}^..${summary.commitRange.endHash}`,
        { cwd: repoRoot, encoding: "utf8" },
      ).trim();

      if (diffStat !== "") {
        lines.push("### Diff Stat");
        lines.push("");
        lines.push("```");
        lines.push(diffStat);
        lines.push("```");
        lines.push("");
      }
    } catch {
      // Git diff stat failed, skip it
    }
  }

  // Completed subtasks section
  lines.push("## Completed Subtasks");
  lines.push("");

  if (summary.subtasks.length === 0) {
    lines.push("*No subtasks completed this run*");
  } else {
    for (const subtask of summary.subtasks) {
      const retryNote =
        subtask.attempts > 1 ? ` (${subtask.attempts} attempts)` : "";
      lines.push(`- **${subtask.id}**${retryNote}: ${subtask.summary}`);
    }
  }
  lines.push("");

  // Write the file
  writeFileSync(outputPath, lines.join("\n"), "utf8");

  return outputPath;
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
  writeBuildSummaryFile,
};

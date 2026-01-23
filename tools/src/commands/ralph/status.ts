/**
 * Ralph status display
 *
 * This module provides the runStatus() function that displays:
 * - Configuration status (ralph.config.json present or not)
 * - Subtasks queue info (milestone, progress bar, last completed, next pending)
 * - Iteration diary stats (iterations, success rate, avg tool calls)
 *
 * Note: Originally ported from tools/src/commands/ralph/scripts/status.sh (now deleted)
 */

import chalk from "chalk";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { IterationDiaryEntry, Subtask } from "./types";

import {
  getCompletedSubtasks,
  getMilestoneFromSubtasks,
  getNextSubtask,
  loadSubtasksFile,
} from "./config";
import { formatTimestamp, renderProgressBar, truncate } from "./display";
import { normalizeStatus } from "./types";

// =============================================================================
// Constants
// =============================================================================

const BOX_WIDTH = 64;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Color a success rate based on thresholds
 * - >= 80%: green
 * - >= 50%: yellow
 * - < 50%: red
 */
function formatSuccessRate(rate: number): string {
  const formatted = `${rate.toFixed(1)}%`;
  if (rate >= 80) {
    return chalk.green(formatted);
  }
  if (rate >= 50) {
    return chalk.yellow(formatted);
  }
  return chalk.red(formatted);
}

/**
 * Calculate diary statistics
 */
function getDiaryStats(entries: Array<IterationDiaryEntry>): {
  avgToolCalls: number;
  successRate: number;
  total: number;
} {
  if (entries.length === 0) {
    return { avgToolCalls: 0, successRate: 0, total: 0 };
  }

  let successCount = 0;
  let totalToolCalls = 0;

  for (const entry of entries) {
    const status = normalizeStatus(entry.status);
    if (status === "completed") {
      successCount += 1;
    }
    if (typeof entry.toolCalls === "number") {
      totalToolCalls += entry.toolCalls;
    }
  }

  return {
    avgToolCalls: totalToolCalls / entries.length,
    successRate: (successCount / entries.length) * 100,
    total: entries.length,
  };
}

/**
 * Get the last completed subtask sorted by completedAt timestamp
 */
function getLastCompletedSubtask(subtasks: Array<Subtask>): null | Subtask {
  const completed = getCompletedSubtasks(subtasks).filter(
    (s) => s.completedAt !== undefined,
  );

  if (completed.length === 0) {
    return null;
  }

  // Sort by completedAt timestamp (latest first)
  completed.sort((a, b) => {
    const dateA = new Date(a.completedAt ?? 0).getTime();
    const dateB = new Date(b.completedAt ?? 0).getTime();
    return dateB - dateA;
  });

  return completed[0] ?? null;
}

/**
 * Read and parse iteration diary JSONL file
 */
function readIterationDiary(diaryPath: string): Array<IterationDiaryEntry> {
  if (!existsSync(diaryPath)) {
    return [];
  }

  try {
    const content = readFileSync(diaryPath, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);

    return lines
      .map((line) => {
        try {
          return JSON.parse(line) as IterationDiaryEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is IterationDiaryEntry => entry !== null);
  } catch {
    return [];
  }
}

/**
 * Render the configuration section
 */
function renderConfigSection(configPath: string): void {
  console.log(chalk.bold("Configuration"));
  console.log("─────────────");
  if (existsSync(configPath)) {
    console.log(`  Config: ${chalk.green("Found")} (ralph.config.json)`);
  } else {
    console.log(`  Config: ${chalk.dim("Not found")}`);
  }
  console.log();
}

/**
 * Render iteration stats when diary exists
 */
function renderDiaryStats(diaryPath: string): void {
  const entries = readIterationDiary(diaryPath);

  if (entries.length === 0) {
    console.log(chalk.dim("  No iterations recorded yet"));
    return;
  }

  const stats = getDiaryStats(entries);

  console.log(`  Iterations: ${chalk.blue(String(stats.total))}`);
  console.log(`  Success rate: ${formatSuccessRate(stats.successRate)}`);
  if (stats.avgToolCalls > 0) {
    console.log(
      `  Avg tool calls: ${chalk.blue(stats.avgToolCalls.toFixed(1))}`,
    );
  }
}

/**
 * Render the header box
 */
function renderHeader(): void {
  console.log();
  console.log(chalk.bold(`╔${"═".repeat(BOX_WIDTH - 2)}╗`));
  console.log(
    chalk.bold(`║${"Ralph Build Status".padStart(41).padEnd(BOX_WIDTH - 2)}║`),
  );
  console.log(chalk.bold(`╚${"═".repeat(BOX_WIDTH - 2)}╝`));
  console.log();
}

/**
 * Render the iteration stats section
 */
function renderIterationSection(diaryPath: string): void {
  console.log(chalk.bold("Iteration Stats"));
  console.log("───────────────");

  if (existsSync(diaryPath)) {
    renderDiaryStats(diaryPath);
  } else {
    console.log(
      chalk.dim("  No iteration diary found at: logs/iterations.jsonl"),
    );
  }

  console.log();
}

/**
 * Render subtask queue details when file exists
 */
function renderSubtaskDetails(subtasksPath: string): void {
  try {
    const subtasksFile = loadSubtasksFile(subtasksPath);
    const { subtasks } = subtasksFile;

    // Milestone
    const milestone = getMilestoneFromSubtasks(subtasksFile);
    if (milestone !== "unknown") {
      console.log(`  Milestone: ${chalk.cyan(milestone)}`);
    }

    if (subtasks.length === 0) {
      console.log(chalk.dim("  No subtasks defined (empty queue)"));
      return;
    }

    const completed = getCompletedSubtasks(subtasks);
    const total = subtasks.length;
    const doneCount = completed.length;

    // Progress bar
    console.log(`  Progress: ${renderProgressBar(doneCount, total)}`);

    // Last completed
    const lastCompleted = getLastCompletedSubtask(subtasks);
    if (lastCompleted !== null) {
      const formattedTs = formatTimestamp(lastCompleted.completedAt);
      console.log(
        `  Last done: ${chalk.green(lastCompleted.id)} (${chalk.dim(formattedTs)})`,
      );
    }

    // Next subtask
    const next = getNextSubtask(subtasks);
    if (next !== null) {
      console.log(`  Next up:   ${chalk.yellow(next.id)}`);
      if (next.title) {
        const truncatedTitle = truncate(next.title, 50);
        console.log(`             ${chalk.dim(truncatedTitle)}`);
      }
    } else if (doneCount === total) {
      console.log(`  Next up:   ${chalk.green("All complete!")}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`  Error loading subtasks: ${message}`));
  }
}

/**
 * Render the subtasks queue section
 */
function renderSubtasksSection(subtasksPath: string): void {
  console.log(chalk.bold("Subtasks Queue"));
  console.log("──────────────");

  if (existsSync(subtasksPath)) {
    renderSubtaskDetails(subtasksPath);
  } else {
    console.log(chalk.dim(`  No subtasks file found at: ${subtasksPath}`));
    console.log(
      chalk.dim(
        "  Run 'aaa ralph init' or create subtasks.json to get started.",
      ),
    );
  }
  console.log();
}

// =============================================================================
// Main Status Function
// =============================================================================

/**
 * Run the Ralph status command
 *
 * Displays:
 * - Config status (ralph.config.json present or not)
 * - Subtasks queue info (milestone, progress bar, last completed, next pending)
 * - Iteration diary stats (iterations, success rate, avg tool calls)
 *
 * @param subtasksPath - Path to subtasks.json file
 * @param contextRoot - Root directory for finding config and logs
 */
function runStatus(subtasksPath: string, contextRoot: string): void {
  const configPath = path.join(contextRoot, "ralph.config.json");
  const diaryPath = path.join(contextRoot, "logs/iterations.jsonl");

  renderHeader();
  renderConfigSection(configPath);
  renderSubtasksSection(subtasksPath);
  renderIterationSection(diaryPath);
}

// =============================================================================
// Exports
// =============================================================================

export default runStatus;
export { runStatus };

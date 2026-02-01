/**
 * Effect-based status display for Ralph autonomous development framework
 *
 * This module provides Effect wrappers for the Ralph status command:
 * - Terminal output uses Effect context for display (Logger service)
 * - File operations use Effect with proper error handling
 * - All display functions wrapped in Effect for composability
 *
 * @see tools/src/commands/ralph/status.ts for original implementation
 */

import {
  type FileNotFoundError,
  type FileReadError,
  FileSystem,
  Logger,
} from "@tools/lib/effect";
import chalk from "chalk";
import { Effect } from "effect";
import path from "node:path";

import type { IterationDiaryEntry, Subtask, SubtasksFile } from "./types";

import { formatTimestamp, renderProgressBar, truncate } from "./display";
import { normalizeStatus } from "./types";

// =============================================================================
// Constants
// =============================================================================

const BOX_WIDTH = 64;

// =============================================================================
// Types
// =============================================================================

/**
 * Diary statistics result
 */
interface DiaryStats {
  readonly avgToolCalls: number;
  readonly successRate: number;
  readonly total: number;
}

/**
 * Options for Effect-based status display
 */
interface StatusOptions {
  /** Root directory for finding config and logs */
  readonly contextRoot: string;
  /** Path to subtasks.json file */
  readonly subtasksPath: string;
}

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
 * Calculate diary statistics from entries
 */
function getDiaryStats(entries: Array<IterationDiaryEntry>): DiaryStats {
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
  const completed = subtasks
    .filter((s) => s.done && s.completedAt !== undefined)
    .sort((a, b) => {
      const dateA = new Date(a.completedAt ?? 0).getTime();
      const dateB = new Date(b.completedAt ?? 0).getTime();
      return dateB - dateA;
    });

  return completed[0] ?? null;
}

/**
 * Derive the milestone log directory from subtasks path
 */
function getMilestoneLogsDirectory(subtasksPath: string): string {
  const milestoneRoot = path.dirname(subtasksPath);
  if (milestoneRoot && milestoneRoot !== ".") {
    return path.join(milestoneRoot, "logs");
  }
  return "docs/planning/milestones/_orphan/logs";
}

/**
 * Load subtasks file using Effect
 */
function loadSubtasksFileEffect(
  subtasksPath: string,
): Effect.Effect<SubtasksFile, FileNotFoundError | FileReadError, FileSystem> {
  return Effect.gen(function* loadSubtasksGen() {
    const fs = yield* FileSystem;
    return yield* fs.readJson<SubtasksFile>(subtasksPath);
  });
}

// =============================================================================
// Effect-based File Operations
// =============================================================================

/**
 * Parse a single JSONL line into a diary entry
 */
function parseDiaryLine(line: string): IterationDiaryEntry | null {
  try {
    return JSON.parse(line) as IterationDiaryEntry;
  } catch {
    return null;
  }
}

/**
 * Read and parse iteration diary from a logs directory using Effect
 */
function readIterationDiaryEffect(
  logsDirectory: string,
): Effect.Effect<
  Array<IterationDiaryEntry>,
  FileNotFoundError | FileReadError,
  FileSystem
> {
  return Effect.gen(function* readIterationGen() {
    const fs = yield* FileSystem;

    const hasLogsDirectory = yield* fs.exists(logsDirectory);
    if (!hasLogsDirectory) {
      return [];
    }

    // Get all .jsonl files in the logs directory
    const files = yield* fs.readDirectory(logsDirectory);
    const jsonlFiles = files
      .filter((file) => file.endsWith(".jsonl"))
      .map((file) => path.join(logsDirectory, file));

    if (jsonlFiles.length === 0) {
      return [];
    }

    // Read all files and aggregate entries
    const allEntriesNested = yield* Effect.all(
      jsonlFiles.map((file) =>
        readSingleDiaryFileEffect(file).pipe(
          Effect.catchAll(() =>
            Effect.succeed([] as Array<IterationDiaryEntry>),
          ),
        ),
      ),
      { concurrency: 5 },
    );

    const allEntries = allEntriesNested.flat();

    // Sort entries by timestamp for consistent stats
    allEntries.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateA - dateB;
    });

    return allEntries;
  });
}

/**
 * Read and parse a single JSONL file into diary entries using Effect
 */
function readSingleDiaryFileEffect(
  filePath: string,
): Effect.Effect<
  Array<IterationDiaryEntry>,
  FileNotFoundError | FileReadError,
  FileSystem
> {
  return Effect.gen(function* readDiaryGen() {
    const fs = yield* FileSystem;

    const hasFile = yield* fs.exists(filePath);
    if (!hasFile) {
      return [];
    }

    const content = yield* fs.readFile(filePath);
    const lines = content.trim().split("\n").filter(Boolean);

    return lines
      .map((line) => parseDiaryLine(line))
      .filter((entry): entry is IterationDiaryEntry => entry !== null);
  });
}

// =============================================================================
// Display Functions (Effect-wrapped)
// =============================================================================

/**
 * Render the configuration section using Effect Logger
 */
function renderConfigSectionEffect(
  configPath: string,
): Effect.Effect<void, never, FileSystem | Logger> {
  return Effect.gen(function* renderConfigGen() {
    const fs = yield* FileSystem;
    const logger = yield* Logger;

    yield* logger.log(chalk.bold("Configuration"));
    yield* logger.log("─────────────");

    const hasConfig = yield* fs.exists(configPath);
    yield* logger.log(
      hasConfig
        ? `  Config: ${chalk.green("Found")} (aaa.config.json)`
        : `  Config: ${chalk.dim("Not found")} (using defaults)`,
    );
    yield* logger.log("");
  });
}

/**
 * Render diary stats when entries exist
 */
function renderDiaryStatsEffect(
  entries: Array<IterationDiaryEntry>,
): Effect.Effect<void, never, Logger> {
  return Effect.gen(function* renderDiaryGen() {
    const logger = yield* Logger;

    if (entries.length === 0) {
      yield* logger.log(chalk.dim("  No iterations recorded yet"));
      return;
    }

    const stats = getDiaryStats(entries);

    yield* logger.log(`  Iterations: ${chalk.blue(String(stats.total))}`);
    yield* logger.log(
      `  Success rate: ${formatSuccessRate(stats.successRate)}`,
    );
    if (stats.avgToolCalls > 0) {
      yield* logger.log(
        `  Avg tool calls: ${chalk.blue(stats.avgToolCalls.toFixed(1))}`,
      );
    }
  });
}

/**
 * Render the header box using Effect Logger
 */
function renderHeaderEffect(): Effect.Effect<void, never, Logger> {
  return Effect.gen(function* renderHeaderGen() {
    const logger = yield* Logger;
    yield* logger.log("");
    yield* logger.log(chalk.bold(`╔${"═".repeat(BOX_WIDTH - 2)}╗`));
    yield* logger.log(
      chalk.bold(
        `║${"Ralph Build Status".padStart(41).padEnd(BOX_WIDTH - 2)}║`,
      ),
    );
    yield* logger.log(chalk.bold(`╚${"═".repeat(BOX_WIDTH - 2)}╝`));
    yield* logger.log("");
  });
}

/**
 * Render the iteration stats section using Effect
 */
function renderIterationSectionEffect(
  logsDirectory: string,
): Effect.Effect<void, FileNotFoundError | FileReadError, FileSystem | Logger> {
  return Effect.gen(function* renderIterationGen() {
    const fs = yield* FileSystem;
    const logger = yield* Logger;

    yield* logger.log(chalk.bold("Iteration Stats"));
    yield* logger.log("───────────────");

    const hasLogsDirectory = yield* fs.exists(logsDirectory);
    if (!hasLogsDirectory) {
      yield* logger.log(
        chalk.dim(`  No iteration logs found at: ${logsDirectory}`),
      );
      yield* logger.log("");
      return;
    }

    const entries = yield* readIterationDiaryEffect(logsDirectory).pipe(
      Effect.catchAll(() => Effect.succeed([] as Array<IterationDiaryEntry>)),
    );

    yield* renderDiaryStatsEffect(entries);
    yield* logger.log("");
  });
}

/**
 * Render subtask details when file exists
 */
function renderSubtaskDetailsEffect(
  subtasksFile: SubtasksFile,
): Effect.Effect<void, never, Logger> {
  return Effect.gen(function* renderDetailsGen() {
    const logger = yield* Logger;
    const { metadata, subtasks } = subtasksFile;

    // Milestone
    const milestone = metadata?.milestoneRef ?? "unknown";
    if (milestone !== "unknown") {
      yield* logger.log(`  Milestone: ${chalk.cyan(milestone)}`);
    }

    if (subtasks.length === 0) {
      yield* logger.log(chalk.dim("  No subtasks defined (empty queue)"));
      return;
    }

    const completed = subtasks.filter((s) => s.done);
    const total = subtasks.length;
    const doneCount = completed.length;

    // Progress bar
    yield* logger.log(`  Progress: ${renderProgressBar(doneCount, total)}`);

    // Last completed
    const lastCompleted = getLastCompletedSubtask(subtasks);
    if (lastCompleted !== null) {
      const formattedTs = formatTimestamp(lastCompleted.completedAt);
      yield* logger.log(
        `  Last done: ${chalk.green(lastCompleted.id)} (${chalk.dim(formattedTs)})`,
      );
    }

    // Next subtask
    const next = subtasks.find((s) => !s.done);
    if (next !== undefined) {
      yield* logger.log(`  Next up:   ${chalk.yellow(next.id)}`);
      if (next.title) {
        const truncatedTitle = truncate(next.title, 50);
        yield* logger.log(`             ${chalk.dim(truncatedTitle)}`);
      }
    } else if (doneCount === total) {
      yield* logger.log(`  Next up:   ${chalk.green("All complete!")}`);
    }
  });
}

/**
 * Render the subtasks queue section using Effect
 */
function renderSubtasksSectionEffect(
  subtasksPath: string,
): Effect.Effect<void, FileNotFoundError | FileReadError, FileSystem | Logger> {
  return Effect.gen(function* renderSubtasksGen() {
    const fs = yield* FileSystem;
    const logger = yield* Logger;

    yield* logger.log(chalk.bold("Subtasks Queue"));
    yield* logger.log("──────────────");

    const hasSubtasks = yield* fs.exists(subtasksPath);
    if (!hasSubtasks) {
      yield* logger.log(
        chalk.dim(`  No subtasks file found at: ${subtasksPath}`),
      );
      yield* logger.log(
        chalk.dim(
          "  Run 'aaa ralph init' or create subtasks.json to get started.",
        ),
      );
      yield* logger.log("");
      return;
    }

    // Load and render subtask details
    const subtasksFileResult = yield* Effect.either(
      loadSubtasksFileEffect(subtasksPath),
    );

    if (subtasksFileResult._tag === "Left") {
      const error = subtasksFileResult.left;
      yield* logger.log(
        chalk.red(`  Error loading subtasks: ${error.message}`),
      );
    } else {
      yield* renderSubtaskDetailsEffect(subtasksFileResult.right);
    }

    yield* logger.log("");
  });
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Run the Ralph status command using Effect
 *
 * Displays:
 * - Config status (aaa.config.json present or not)
 * - Subtasks queue info (milestone, progress bar, last completed, next pending)
 * - Iteration diary stats (iterations, success rate, avg tool calls)
 *
 * Uses Logger service for all terminal output (Effect context for display).
 */
function runStatusEffect(
  options: StatusOptions,
): Effect.Effect<void, FileNotFoundError | FileReadError, FileSystem | Logger> {
  return Effect.gen(function* runStatusGen() {
    const { contextRoot, subtasksPath } = options;
    const configPath = path.join(contextRoot, "aaa.config.json");
    const logsDirectory = getMilestoneLogsDirectory(subtasksPath);

    yield* renderHeaderEffect();
    yield* renderConfigSectionEffect(configPath);
    yield* renderSubtasksSectionEffect(subtasksPath);
    yield* renderIterationSectionEffect(logsDirectory);
  });
}

// =============================================================================
// Exports
// =============================================================================

export {
  getDiaryStats,
  getMilestoneLogsDirectory,
  loadSubtasksFileEffect,
  readIterationDiaryEffect,
  readSingleDiaryFileEffect,
  renderConfigSectionEffect,
  renderDiaryStatsEffect,
  renderHeaderEffect,
  renderIterationSectionEffect,
  renderSubtaskDetailsEffect,
  renderSubtasksSectionEffect,
  runStatusEffect,
};

export type { DiaryStats, StatusOptions };

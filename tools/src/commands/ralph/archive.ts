/**
 * Archive command for Ralph autonomous build system
 *
 * Provides functions to archive completed subtasks and old PROGRESS.md sessions
 * to keep working files within context limits.
 *
 * @see docs/planning/milestones/{milestone}/archive/
 */

import chalk from "chalk";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import type { SubtasksFile } from "./types";

import { loadSubtasksFile, saveSubtasksFile } from "./config";

// =============================================================================
// Constants
// =============================================================================

/** Soft limit for subtasks.json token count (warning threshold) */
const SUBTASKS_TOKEN_SOFT_LIMIT = 20_000;

/** Hard limit for subtasks.json token count (Edit tool fails) */
const SUBTASKS_TOKEN_HARD_LIMIT = 25_000;

/** Average characters per token (rough estimate for English text) */
const CHARS_PER_TOKEN = 4;

/** Maximum sessions to keep in PROGRESS.md after archiving */
const MAX_PROGRESS_SESSIONS = 5;

// =============================================================================
// Types
// =============================================================================

/**
 * Options for the archive command
 */
interface ArchiveOptions {
  /** Milestone name (for naming and path resolution) */
  milestone?: string;
  /** Archive old PROGRESS.md sessions */
  progress?: boolean;
  /** Archive completed subtasks */
  subtasks?: boolean;
  /** Path to subtasks.json (for --subtasks mode) */
  subtasksPath?: string;
}

// =============================================================================
// Token Estimation
// =============================================================================

/**
 * Check if subtasks file exceeds the soft limit
 *
 * @param subtasksPath - Path to subtasks.json file
 * @returns Object with exceeded flag and current token count
 */
function checkSubtasksSize(subtasksPath: string): {
  exceeded: boolean;
  hardLimitExceeded: boolean;
  tokens: number;
} {
  const tokens = getSubtasksTokenEstimate(subtasksPath);
  return {
    exceeded: tokens > SUBTASKS_TOKEN_SOFT_LIMIT,
    hardLimitExceeded: tokens > SUBTASKS_TOKEN_HARD_LIMIT,
    tokens,
  };
}

/**
 * Compute estimated token count for a string
 *
 * Uses a rough heuristic of ~4 characters per token for English text.
 * This is an approximation - actual tokenization varies by model.
 *
 * @param content - String content to estimate
 * @returns Estimated token count
 */
function computeTokenEstimate(content: string): number {
  return Math.ceil(content.length / CHARS_PER_TOKEN);
}

/**
 * Find the next archive file number
 *
 * Scans the archive directory for existing files and returns the next number.
 *
 * @param archiveDirectory - Path to archive directory
 * @param prefix - File prefix (e.g., "subtasks")
 * @returns Next available number (e.g., 2 if 001-subtasks.json exists)
 */
function findNextArchiveNumber(
  archiveDirectory: string,
  prefix: string,
): number {
  if (!existsSync(archiveDirectory)) {
    return 1;
  }

  try {
    const files = readdirSync(archiveDirectory);
    const pattern = new RegExp(`^(?<num>\\d{3})-${prefix}\\.json$`);

    let maxNumber = 0;
    for (const file of files) {
      const match = pattern.exec(file);
      if (match?.groups?.num !== undefined) {
        const fileNumber = Number.parseInt(match.groups.num, 10);
        if (fileNumber > maxNumber) {
          maxNumber = fileNumber;
        }
      }
    }

    return maxNumber + 1;
  } catch {
    return 1;
  }
}

// =============================================================================
// Archive Helpers
// =============================================================================

/**
 * Get estimated token count for a subtasks file
 *
 * @param subtasksPath - Path to subtasks.json file
 * @returns Token estimate, or 0 if file doesn't exist
 */
function getSubtasksTokenEstimate(subtasksPath: string): number {
  if (!existsSync(subtasksPath)) {
    return 0;
  }

  try {
    const content = readFileSync(subtasksPath, "utf8");
    return computeTokenEstimate(content);
  } catch {
    return 0;
  }
}

/**
 * Move completed subtasks from a subtasks file to an archive
 *
 * Moves completed subtasks to an archive file and keeps only pending ones
 * in the original file.
 *
 * @param subtasksPath - Path to subtasks.json file
 * @returns Object with counts and archive path
 */
function moveCompletedSubtasksToArchive(subtasksPath: string): {
  archivedCount: number;
  archivePath: string;
  pendingCount: number;
} {
  const subtasksFile = loadSubtasksFile(subtasksPath);
  const { $schema, metadata, subtasks } = subtasksFile;

  const completed = subtasks.filter((s) => s.done);
  const pending = subtasks.filter((s) => !s.done);

  if (completed.length === 0) {
    throw new Error("No completed subtasks to archive");
  }

  // Determine archive directory (sibling to subtasks.json)
  const subtasksDirectory = dirname(subtasksPath);
  const archiveDirectory = join(subtasksDirectory, "archive");

  // Create archive directory if needed
  if (!existsSync(archiveDirectory)) {
    mkdirSync(archiveDirectory, { recursive: true });
  }

  // Get next archive number
  const archiveNumber = findNextArchiveNumber(archiveDirectory, "subtasks");
  const paddedNumber = String(archiveNumber).padStart(3, "0");
  const archiveFileName = `${paddedNumber}-subtasks.json`;
  const archivePath = join(archiveDirectory, archiveFileName);

  // Create archive file with completed subtasks
  const archiveMetadata: SubtasksFile["metadata"] = { ...metadata };
  const archiveFile: SubtasksFile = {
    $schema,
    metadata: archiveMetadata,
    subtasks: completed,
  };

  writeFileSync(
    archivePath,
    `${JSON.stringify(archiveFile, null, 2)}\n`,
    "utf8",
  );

  // Update original file with only pending subtasks
  subtasksFile.subtasks = pending;
  saveSubtasksFile(subtasksPath, subtasksFile);

  return {
    archivedCount: completed.length,
    archivePath,
    pendingCount: pending.length,
  };
}

/**
 * Move old sessions from PROGRESS.md to an archive
 *
 * Keeps the most recent sessions in PROGRESS.md and archives older ones.
 *
 * @param progressPath - Path to PROGRESS.md file
 * @param maxSessions - Maximum sessions to keep (default: 5)
 * @returns Object with counts and archive path, or null if no archiving needed
 */
function moveOldProgressSessionsToArchive(
  progressPath: string,
  maxSessions: number = MAX_PROGRESS_SESSIONS,
): { archivedCount: number; archivePath: string; keptCount: number } | null {
  if (!existsSync(progressPath)) {
    throw new Error(`PROGRESS.md not found: ${progressPath}`);
  }

  const content = readFileSync(progressPath, "utf8");
  const sessions = parseProgressSessions(content);

  if (sessions.length <= maxSessions) {
    return null;
  }

  // Split into sessions to archive and keep
  const toArchive = sessions.slice(0, sessions.length - maxSessions);
  const toKeep = sessions.slice(sessions.length - maxSessions);

  // Determine archive directory
  const progressDirectory = dirname(progressPath);
  const archiveDirectory = join(progressDirectory, "archive");

  // Create archive directory if needed
  if (!existsSync(archiveDirectory)) {
    mkdirSync(archiveDirectory, { recursive: true });
  }

  // Get next archive number
  const archiveNumber = findNextArchiveNumber(archiveDirectory, "PROGRESS");
  const paddedNumber = String(archiveNumber).padStart(3, "0");
  const archiveFileName = `${paddedNumber}-PROGRESS.md`;
  const archivePath = join(archiveDirectory, archiveFileName);

  // Create archive file
  const archiveHeader = `# Archived Progress Sessions\n\nArchived at: ${new Date().toISOString()}\nOriginal file: ${progressPath}\n\n`;
  const archiveContent =
    archiveHeader + toArchive.map((s) => s.content).join("\n\n");
  writeFileSync(archivePath, archiveContent, "utf8");

  // Update original file
  const headerMatch = /^(?<header># .+?\n(?:\n.*?(?=\n## ))?)/s.exec(content);
  const header = headerMatch?.groups?.header ?? "# PROGRESS.md\n\n";
  const newContent = header + toKeep.map((s) => s.content).join("\n\n");
  writeFileSync(progressPath, newContent, "utf8");

  return {
    archivedCount: toArchive.length,
    archivePath,
    keptCount: toKeep.length,
  };
}

/**
 * Parse PROGRESS.md into sessions by date headers
 *
 * @param content - PROGRESS.md content
 * @returns Array of session objects with date and content
 */
function parseProgressSessions(
  content: string,
): Array<{ content: string; date: string }> {
  const sessions: Array<{ content: string; date: string }> = [];
  const lines = content.split("\n");

  let currentDate = "";
  let currentContent: Array<string> = [];

  for (const line of lines) {
    const dateMatch = /^## (?<date>\d{4}-\d{2}-\d{2})/.exec(line);
    if (dateMatch?.groups?.date !== undefined) {
      // Save previous session if any
      if (currentDate !== "") {
        sessions.push({
          content: currentContent.join("\n"),
          date: currentDate,
        });
      }
      currentDate = dateMatch.groups.date;
      currentContent = [line];
    } else if (currentDate !== "") {
      currentContent.push(line);
    }
  }

  // Save last session
  if (currentDate !== "") {
    sessions.push({ content: currentContent.join("\n"), date: currentDate });
  }

  return sessions;
}

// =============================================================================
// CLI Command Implementation
// =============================================================================

/**
 * Run the archive command
 *
 * @param options - Archive options
 * @param contextRoot - Repository root path
 */
function runArchive(options: ArchiveOptions, contextRoot: string): void {
  const {
    milestone,
    progress: isProgressMode,
    subtasks: isSubtasksMode,
    subtasksPath,
  } = options;

  // Default: archive subtasks if no specific mode specified
  const shouldArchiveSubtasks =
    isSubtasksMode === true || isProgressMode !== true;
  const shouldArchiveProgress = isProgressMode === true;

  if (shouldArchiveSubtasks) {
    if (subtasksPath === undefined) {
      console.error(chalk.red("Error: --subtasks-path is required"));
      process.exit(1);
    }

    if (!existsSync(subtasksPath)) {
      console.error(
        chalk.red(`Error: Subtasks file not found: ${subtasksPath}`),
      );
      process.exit(1);
    }

    try {
      const result = moveCompletedSubtasksToArchive(subtasksPath);
      console.log(
        chalk.green(`Archived ${result.archivedCount} completed subtasks`),
      );
      console.log(chalk.dim(`  Archive: ${result.archivePath}`));
      console.log(
        chalk.dim(`  Remaining: ${result.pendingCount} pending subtasks`),
      );

      // Show new size
      const newSize = checkSubtasksSize(subtasksPath);
      console.log(
        chalk.dim(`  New size: ~${Math.round(newSize.tokens / 1000)}K tokens`),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  }

  if (shouldArchiveProgress) {
    // Determine PROGRESS.md path
    const progressPath = join(contextRoot, "docs/planning/PROGRESS.md");

    if (!existsSync(progressPath)) {
      console.error(chalk.red(`Error: PROGRESS.md not found: ${progressPath}`));
      process.exit(1);
    }

    try {
      const result = moveOldProgressSessionsToArchive(progressPath);
      if (result === null) {
        console.log(
          chalk.dim("PROGRESS.md has few sessions - no archiving needed"),
        );
      } else {
        console.log(
          chalk.green(`Archived ${result.archivedCount} old sessions`),
        );
        console.log(chalk.dim(`  Archive: ${result.archivePath}`));
        console.log(
          chalk.dim(`  Remaining: ${result.keptCount} recent sessions`),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  }

  // milestone is available for future use (e.g., naming conventions)
  void milestone;
}

// =============================================================================
// Exports
// =============================================================================

export {
  type ArchiveOptions,
  checkSubtasksSize,
  computeTokenEstimate,
  getSubtasksTokenEstimate,
  moveCompletedSubtasksToArchive,
  moveOldProgressSessionsToArchive,
  runArchive,
  SUBTASKS_TOKEN_HARD_LIMIT,
  SUBTASKS_TOKEN_SOFT_LIMIT,
};

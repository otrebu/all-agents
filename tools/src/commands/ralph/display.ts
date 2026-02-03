/**
 * Display utilities for Ralph CLI output
 *
 * This module provides formatting and rendering functions for:
 * - Progress bars for subtask completion
 * - Status boxes for information display
 * - Duration and timestamp formatting
 * - Status coloring (completed/failed/retrying)
 * - Markdown rendering with marked-terminal
 *
 * @see tools/lib/log.ts for logging utilities
 */

import boxenLib, { type Options as BoxenOptions } from "boxen";
import chalk from "chalk";
import { marked, type MarkedExtension } from "marked";
// @ts-expect-error - marked-terminal has no types for v7
import { markedTerminal } from "marked-terminal";
import stringWidth from "string-width";
import supportsHyperlinks from "supports-hyperlinks";
import wrapAnsi from "wrap-ansi";

import type { BuildPracticalSummary } from "./summary";
import type { CascadeResult, IterationStatus, TokenUsage } from "./types";

// Box width for iteration displays (defined early for marked config)
const BOX_WIDTH = 68;
// 64 = BOX_WIDTH minus borders and padding
const BOX_INNER_WIDTH = BOX_WIDTH - 4;

// Configure marked with terminal renderer
/* eslint-disable @typescript-eslint/no-unsafe-call */
marked.use(
  markedTerminal({
    reflowText: true,
    tab: 2,
    width: BOX_INNER_WIDTH,
  }) as MarkedExtension,
);
/* eslint-enable @typescript-eslint/no-unsafe-call */

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Data for build summary box
 */
interface BuildSummaryData {
  /** Number of completed iterations */
  completed: number;
  /** Number of failed iterations */
  failed: number;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Total files changed */
  totalFilesChanged: number;
  /** Total number of iterations */
  totalIterations: number;
}

// =============================================================================
// Duration and Time Formatting
// =============================================================================

/**
 * Data for rendering iteration boxes
 */
interface IterationDisplayData {
  /** Attempt number (1-based) */
  attempt: number;
  /** Total cost in USD */
  costUsd?: number;
  /** Path to diary JSONL file */
  diaryPath?: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Number of files changed */
  filesChanged?: number;
  /** Current iteration number */
  iteration: number;
  /** Key findings bullets */
  keyFindings?: Array<string>;
  /** Number of lines added */
  linesAdded?: number;
  /** Number of lines removed */
  linesRemoved?: number;
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Remaining subtasks count */
  remaining: number;
  /** Path to session JSONL file */
  sessionPath?: string;
  /** Iteration outcome status */
  status?: IterationStatus;
  /** Subtask ID */
  subtaskId: string;
  /** Subtask title */
  subtaskTitle: string;
  /** Summary text */
  summary?: string;
  /** Token usage from the iteration */
  tokenUsage?: TokenUsage;
  /** Number of tool calls */
  toolCalls?: number;
}

/**
 * Data for plan subtasks summary box (headless mode output)
 */
interface PlanSubtasksSummaryData {
  /** Number of subtasks actually added this run (for pre-check display) */
  addedCount?: number;
  /** Total cost in USD */
  costUsd: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if generation failed */
  error?: string;
  /** Target milestone name */
  milestone?: string;
  /** Path where subtasks.json was written */
  outputPath: string;
  /** Claude session ID */
  sessionId: string;
  /** Sizing mode used */
  sizeMode: "large" | "medium" | "small";
  /** Task refs skipped because they already had subtasks */
  skippedTasks?: Array<string>;
  /** Source of the subtasks */
  source: {
    /** Number of findings (for review mode) */
    findingsCount?: number;
    /** File path (for file or review mode) */
    path?: string;
    /** Description text (for text mode) */
    text?: string;
    /** Source type */
    type: "file" | "review" | "text";
  };
  /** Reference to parent story */
  storyRef?: string;
  /** Generated subtasks (empty on error) */
  subtasks: Array<{ id: string; title: string }>;
  /** Total subtasks now in file after this run (for pre-check display) */
  totalCount?: number;
}

// =============================================================================
// Status Coloring
// =============================================================================

/**
 * Ensure a number is valid for display (handle NaN, Infinity, undefined)
 *
 * @param value - Number to validate
 * @param defaultValue - Default value if invalid (default 0)
 * @returns Valid number (never NaN or Infinity)
 */
function ensureValidNumber(
  value: number | undefined,
  defaultValue = 0,
): number {
  if (value === undefined || !Number.isFinite(value)) {
    return defaultValue;
  }
  return value;
}

/**
 * Format a duration in milliseconds as a human-readable string
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string like "2m 15s" or "45s"
 *
 * @example
 * formatDuration(135000) // "2m 15s"
 * formatDuration(45000)  // "45s"
 * formatDuration(3723000) // "1h 2m 3s"
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ensureValidNumber(ms) / 1000);

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

/**
 * Generate clickable path lines for session and diary paths
 *
 * @param sessionPath - Optional session file path
 * @param diaryPath - Optional diary file path
 * @param separatorWidth - Width of separator line above paths
 * @returns Array of formatted lines (empty if no paths)
 */
function formatPathLines(
  sessionPath: string | undefined,
  diaryPath: string | undefined,
  separatorWidth: number,
): Array<string> {
  if (sessionPath === undefined && diaryPath === undefined) {
    return [];
  }
  const lines: Array<string> = [];
  lines.push("─".repeat(separatorWidth));
  // Show full paths - let them wrap naturally, don't truncate
  const home = process.env.HOME ?? "";
  if (sessionPath !== undefined) {
    const displayPath = sessionPath.replace(home, "~");
    lines.push(`${chalk.dim("Session")}  ${displayPath}`);
  }
  if (diaryPath !== undefined) {
    const displayPath = diaryPath.replace(home, "~");
    lines.push(`${chalk.dim("Diary")}    ${displayPath}`);
  }
  return lines;
}

/**
 * Format current time as HH:MM:SS for display in iteration boxes
 *
 * @returns Formatted string like "14:32:17"
 */
function formatTimeOfDay(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

/**
 * Format an ISO 8601 timestamp for display
 *
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns Formatted string like "2024-01-21 14:30" or "N/A" if invalid
 */
function formatTimestamp(isoTimestamp: string | undefined): string {
  if (isoTimestamp === undefined || isoTimestamp === "") {
    return "N/A";
  }

  try {
    const date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) {
      return isoTimestamp;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return isoTimestamp;
  }
}

/**
 * Format a token count as a human-readable string
 *
 * @param count - Number of tokens
 * @returns Formatted string like "42K" or "1.2M" or "532"
 *
 * @example
 * formatTokenCount(532) // "532"
 * formatTokenCount(42312) // "42K"
 * formatTokenCount(1234567) // "1.2M"
 */
function formatTokenCount(count: number): string {
  const safeCount = ensureValidNumber(count);
  if (safeCount >= 1_000_000) {
    const millions = safeCount / 1_000_000;
    return millions >= 10
      ? `${Math.round(millions)}M`
      : `${millions.toFixed(1)}M`;
  }
  if (safeCount >= 1000) {
    const thousands = safeCount / 1000;
    return thousands >= 10
      ? `${Math.round(thousands)}K`
      : `${thousands.toFixed(1)}K`;
  }
  return String(safeCount);
}

// =============================================================================
// Markdown Rendering
// =============================================================================

/**
 * Format token usage as a display line
 *
 * @param tokenUsage - Token usage data from the iteration
 * @returns Formatted string like "Ctx: 80K" or null if no tokens
 */
function formatTokenLine(tokenUsage: TokenUsage | undefined): null | string {
  if (tokenUsage === undefined) {
    return null;
  }

  const contextTokens = ensureValidNumber(tokenUsage.contextTokens);
  if (contextTokens === 0) {
    return null;
  }

  const ctxLabel = chalk.dim("Ctx:");
  const ctxValue = chalk.yellow(formatTokenCount(contextTokens));

  return `${ctxLabel} ${ctxValue}`;
}

/**
 * Apply color to status text based on iteration outcome
 *
 * @param status - The iteration status
 * @returns Chalk-colored status string
 *   - completed: green
 *   - failed: red
 *   - retrying: yellow
 */
function getColoredStatus(status: IterationStatus): string {
  switch (status) {
    case "completed": {
      return chalk.green(status);
    }
    case "failed": {
      return chalk.red(status);
    }
    case "retrying": {
      return chalk.yellow(status);
    }
    default: {
      return status;
    }
  }
}

// =============================================================================
// Status Box Rendering
// =============================================================================

/**
 * Get box border color based on iteration status
 */
function getStatusBorderColor(
  status: IterationStatus | undefined,
): BoxenOptions["borderColor"] {
  switch (status) {
    case "completed": {
      return "green";
    }
    case "failed": {
      return "red";
    }
    case "retrying": {
      return "yellow";
    }
    default: {
      return "cyan";
    }
  }
}

// =============================================================================
// Iteration Box Types
// =============================================================================

/**
 * Create a clickable terminal path that opens in file manager/editor
 *
 * Uses supports-hyperlinks for proper terminal detection (iTerm 3.1+,
 * WezTerm, VS Code 1.72+, Ghostty, Windows Terminal, VTE 0.50+).
 * Falls back to plain path for unsupported terminals.
 *
 * @param fullPath - Absolute file path
 * @param maxLength - Max display length (truncates middle if exceeded)
 * @returns Clickable path (OSC 8) or plain path with ~ abbreviation
 */
function makeClickablePath(fullPath: string, maxLength?: number): string {
  const home = process.env.HOME ?? "";
  let displayPath = fullPath.replace(home, "~");

  // Truncate middle if too long
  if (maxLength !== undefined && displayPath.length > maxLength) {
    const ellipsis = "...";
    const availableLength = maxLength - ellipsis.length;
    const startLength = Math.ceil(availableLength / 2);
    const endLength = Math.floor(availableLength / 2);
    displayPath =
      displayPath.slice(0, startLength) +
      ellipsis +
      displayPath.slice(-endLength);
  }

  // Use supports-hyperlinks for proper terminal detection
  if (supportsHyperlinks.stdout) {
    const fileUrl = `file://${fullPath}`;
    // OSC 8 hyperlink: \x1b]8;;URL\x1b\\TEXT\x1b]8;;\x1b\\
    return `\x1b]8;;${fileUrl}\x1b\\${displayPath}\x1b]8;;\x1b\\`;
  }

  // Fallback: plain path (user can cmd+click in some terminals)
  return displayPath;
}

/**
 * Render practical build summary box (at end of build run or on interrupt)
 *
 * Shows: stats (completed/failed/cost/duration/files), git commit range with diff command,
 * bullet list of completed subtasks with summaries and retry counts, and remaining count.
 *
 * @param summary - BuildPracticalSummary with stats, subtasks, commitRange, remaining
 * @returns Formatted boxen box string
 */
function renderBuildPracticalSummary(summary: BuildPracticalSummary): string {
  const { commitRange, stats, subtasks } = summary;
  const innerWidth = BOX_WIDTH - 4;

  // Sanitize all numeric values to prevent boxen crashes
  const completed = ensureValidNumber(stats.completed);
  const failed = ensureValidNumber(stats.failed);
  const costUsd = ensureValidNumber(stats.costUsd);
  const durationMs = ensureValidNumber(stats.durationMs);
  const filesChanged = ensureValidNumber(stats.filesChanged);
  const linesAdded = ensureValidNumber(stats.linesAdded);
  const linesRemoved = ensureValidNumber(stats.linesRemoved);
  const remaining = ensureValidNumber(summary.remaining);

  const lines: Array<string> = [];

  // Stats line 1: Completed  3    Failed  0    Cost  $0.42    Duration  5m 32s    Files  12    Lines  +42/-3
  const completedLabel = chalk.dim("Completed");
  const completedValue =
    completed > 0 ? chalk.green.bold(String(completed)) : chalk.dim("0");
  const failedLabel = chalk.dim("Failed");
  const failedValue =
    failed > 0 ? chalk.red.bold(String(failed)) : chalk.dim("0");
  const costLabel = chalk.dim("Cost");
  const costValue = chalk.magenta(`$${costUsd.toFixed(2)}`);
  const durationLabel = chalk.dim("Duration");
  const durationValue = chalk.cyan(formatDuration(durationMs));
  const filesLabel = chalk.dim("Files");
  const filesValue = chalk.blue(String(filesChanged));
  const linesLabel = chalk.dim("Lines");
  const linesValue = `${chalk.green(`+${linesAdded}`)}/${chalk.red(`-${linesRemoved}`)}`;

  const statsLine = `${completedLabel} ${completedValue}   ${failedLabel} ${failedValue}   ${costLabel} ${costValue}   ${durationLabel} ${durationValue}   ${filesLabel} ${filesValue}   ${linesLabel} ${linesValue}`;
  lines.push(statsLine);

  // Stats line 2: Tokens - MaxCtx: 120K  Out: 7K
  const maxContextTokens = ensureValidNumber(stats.maxContextTokens);
  const outputTokens = ensureValidNumber(stats.outputTokens);
  const totalTokens = maxContextTokens + outputTokens;
  if (totalTokens > 0) {
    const ctxLabel = chalk.dim("MaxCtx:");
    const ctxValue = chalk.yellow(formatTokenCount(maxContextTokens));
    const outLabel = chalk.dim("Out:");
    const outValue = chalk.yellow(formatTokenCount(outputTokens));
    const tokensLine = `${chalk.dim("Tokens")}  ${ctxLabel} ${ctxValue}  ${outLabel} ${outValue}`;
    lines.push(tokensLine);
  }

  // Git commit range
  if (commitRange.startHash !== null && commitRange.endHash !== null) {
    lines.push("");
    lines.push(chalk.dim("Git changes:"));
    const diffCmd = `git diff ${commitRange.startHash}^..${commitRange.endHash}`;
    lines.push(`  ${chalk.yellow(diffCmd)}`);
  }

  // Completed subtasks with summaries
  if (subtasks.length > 0) {
    lines.push("");
    lines.push(chalk.dim("Completed:"));
    for (const subtask of subtasks) {
      const retryNote =
        subtask.attempts > 1
          ? chalk.yellow(` (${subtask.attempts} attempts)`)
          : "";
      const idPart = chalk.cyan(subtask.id);
      lines.push(`  ${idPart}${retryNote}`);
      if (
        subtask.summary !== "" &&
        subtask.summary !== `Completed ${subtask.id}`
      ) {
        // Wrap summary text instead of truncating - indent by 4 spaces
        const wrappedSummary = wrapText(subtask.summary, innerWidth - 4);
        for (const line of wrappedSummary) {
          lines.push(`    ${chalk.dim(line)}`);
        }
      }
    }
  }

  // Remaining count
  lines.push("");
  const remainingText =
    remaining > 0
      ? `${chalk.yellow(String(remaining))} subtasks remaining`
      : chalk.green("All subtasks complete!");
  lines.push(remainingText);

  return renderSafeBox(lines.join("\n"), {
    borderColor: stats.failed > 0 ? "yellow" : "green",
    borderStyle: "double",
    padding: { bottom: 0, left: 1, right: 1, top: 0 },
    title: "Build Summary",
    titleAlignment: "center",
    width: BOX_WIDTH,
  });
}

/**
 * Render build summary box (at end of all iterations)
 */
function renderBuildSummary(data: BuildSummaryData): string {
  const {
    completed,
    failed,
    totalCostUsd,
    totalDurationMs,
    totalFilesChanged,
    totalIterations,
  } = data;

  // Format labels
  const iterationsLabel = chalk.dim("Iterations");
  const completedLabel = chalk.dim("Completed");
  const failedLabel = chalk.dim("Failed");
  const durationLabel = chalk.dim("Duration");
  const costLabel = chalk.dim("Total Cost");
  const filesLabel = chalk.dim("Files");

  // Format values
  const iterationsValue = chalk.bold(String(totalIterations));
  const completedValue = chalk.green.bold(String(completed));
  const failedValue =
    failed > 0 ? chalk.red.bold(String(failed)) : chalk.dim("0");
  const durationValue = chalk.cyan(formatDuration(totalDurationMs));
  const costValue = chalk.magenta(`$${totalCostUsd.toFixed(2)}`);
  const filesValue = chalk.blue(String(totalFilesChanged));

  // Two-row layout with padding
  const row1 = `${iterationsLabel}    ${iterationsValue}          ${completedLabel}   ${completedValue}         ${failedLabel}   ${failedValue}`;
  const row2 = `${durationLabel}      ${durationValue}      ${costLabel}  ${costValue}     ${filesLabel}    ${filesValue}`;

  const lines = [row1, row2];

  return renderSafeBox(lines.join("\n"), {
    borderColor: "white",
    borderStyle: "double",
    padding: { bottom: 0, left: 1, right: 1, top: 0 },
    title: "Build Complete",
    titleAlignment: "center",
    width: BOX_WIDTH,
  });
}

/**
 * Render cascade progress line showing level progression
 *
 * Displays a visual progression through cascade levels with:
 * - Completed levels shown in brackets with ✓
 * - Current level shown in brackets with ◉
 * - Remaining levels shown without brackets
 *
 * @param current - Name of the level currently executing
 * @param completed - Array of level names that have completed
 * @param remaining - Array of level names still to be executed
 * @returns Styled progress string like "[stories] ✓ → [tasks] ◉ → subtasks → build"
 *
 * @example
 * renderCascadeProgress('tasks', ['stories'], ['subtasks', 'build'])
 * // Returns: "[stories] ✓ → [tasks] ◉ → subtasks → build"
 */
function renderCascadeProgress(
  current: string,
  completed: Array<string>,
  remaining: Array<string>,
): string {
  const parts: Array<string> = [];

  // Completed levels: [level] ✓ in green
  for (const level of completed) {
    parts.push(chalk.green(`[${level}] ✓`));
  }

  // Current level: [level] ◉ in cyan bold
  parts.push(chalk.cyan.bold(`[${current}] ◉`));

  // Remaining levels: just the name in dim
  for (const level of remaining) {
    parts.push(chalk.dim(level));
  }

  // Join with arrows
  return parts.join(chalk.dim(" → "));
}

/**
 * Render cascade summary box showing cascade execution results
 *
 * Displays a boxen-formatted summary with:
 * - Success/failure status header
 * - List of completed levels
 * - Where cascade stopped (if not fully complete)
 * - Error message (if cascade failed)
 *
 * @param result - CascadeResult from runCascadeFrom()
 * @returns Boxen-formatted string suitable for console output
 *
 * @example
 * const result = { success: true, completedLevels: ['build', 'calibrate'], error: null, stoppedAt: null };
 * console.log(renderCascadeSummary(result));
 */
function renderCascadeSummary(result: CascadeResult): string {
  const innerWidth = BOX_WIDTH - 4;
  const lines: Array<string> = [];

  // Status header
  if (result.success) {
    lines.push(chalk.green.bold("✓ Cascade Complete"));
  } else {
    lines.push(chalk.red.bold("✗ Cascade Stopped"));
  }

  lines.push("─".repeat(innerWidth));

  // Completed levels
  if (result.completedLevels.length > 0) {
    lines.push(chalk.dim("Completed levels:"));
    for (const level of result.completedLevels) {
      lines.push(`  ${chalk.green("✓")} ${chalk.cyan(level)}`);
    }
  } else {
    lines.push(chalk.dim("No levels completed"));
  }

  // Stopped at (if not success)
  if (result.stoppedAt !== null) {
    lines.push("");
    lines.push(
      `${chalk.yellow("Stopped at:")} ${chalk.yellow.bold(result.stoppedAt)}`,
    );
  }

  // Error message (if present)
  if (result.error !== null) {
    lines.push("");
    lines.push(`${chalk.red("Error:")} ${result.error}`);
  }

  return renderSafeBox(lines.join("\n"), {
    borderColor: result.success ? "green" : "red",
    borderStyle: "round",
    padding: { bottom: 0, left: 1, right: 1, top: 0 },
    title: "Cascade Summary",
    titleAlignment: "center",
    width: BOX_WIDTH,
  });
}

/**
 * Render a styled separator for Claude invocation
 *
 * @param mode - "headless" or "supervised" execution mode
 * @returns Styled line like "──────────── Invoking Claude (headless) ────────────"
 */
function renderInvocationHeader(mode: "headless" | "supervised"): string {
  const label = ` Invoking Claude (${mode}) `;
  const lineChar = "─";
  const totalWidth = BOX_WIDTH;
  const sideLength = Math.floor((totalWidth - label.length) / 2);
  return chalk.dim(
    `${lineChar.repeat(sideLength)}${label}${lineChar.repeat(sideLength)}`,
  );
}

/**
 * Render iteration END box (colored border based on status)
 */
function renderIterationEnd(data: IterationDisplayData): string {
  const {
    diaryPath,
    keyFindings = [],
    sessionPath,
    status = "retrying",
    subtaskId,
    subtaskTitle,
    summary = "",
    tokenUsage,
  } = data;

  // Sanitize ALL numeric values to prevent boxen crashes
  const attempt = ensureValidNumber(data.attempt, 1);
  const iteration = ensureValidNumber(data.iteration, 1);
  const maxAttempts = ensureValidNumber(data.maxAttempts, 1);
  const costUsd = ensureValidNumber(data.costUsd);
  const durationMs = ensureValidNumber(data.durationMs);
  const filesChanged = ensureValidNumber(data.filesChanged);
  const linesAdded = ensureValidNumber(data.linesAdded);
  const linesRemoved = ensureValidNumber(data.linesRemoved);
  const remaining = ensureValidNumber(data.remaining);
  const toolCalls = ensureValidNumber(data.toolCalls);

  const attemptText =
    maxAttempts > 0
      ? `Attempt ${attempt}/${maxAttempts}`
      : `Attempt ${attempt}`;
  const remainingText = chalk.dim(`${remaining} remaining`);

  const innerWidth = BOX_WIDTH - 4;
  const leftPart = attemptText;
  const rightPart = `${remaining} remaining`;
  const padding = innerWidth - leftPart.length - rightPart.length;

  // Status icon and colored status
  const statusIcons: Record<IterationStatus, string> = {
    completed: "✓",
    failed: "✗",
    retrying: "↻",
  };
  const statusIcon = statusIcons[status];
  const statusColored = getColoredStatus(status);

  // Format metrics
  const durationText = chalk.cyan(formatDuration(durationMs));
  const costText = chalk.magenta(`$${costUsd.toFixed(2)}`);
  const callsText = chalk.blue(`${toolCalls} calls`);
  const filesText = chalk.blue(`${filesChanged} files`);
  const linesText = `${chalk.green(`+${linesAdded}`)}/${chalk.red(`-${linesRemoved}`)}`;

  const metricsLine = `${statusIcon} ${statusColored}    ${durationText}    ${costText}    ${callsText}    ${filesText}    ${linesText}`;

  // Build content lines
  const lines = [
    `${chalk.cyan.bold(subtaskId)}  ${truncate(subtaskTitle, innerWidth - subtaskId.length - 2)}`,
    `${attemptText}${" ".repeat(Math.max(1, padding))}${remainingText}`,
    "─".repeat(innerWidth),
    metricsLine,
  ];

  // Add token usage line when present with non-zero values
  const tokenLine = formatTokenLine(tokenUsage);
  if (tokenLine !== null) {
    lines.push(tokenLine);
  }

  // Add summary if present
  if (summary !== "") {
    lines.push("");
    const wrappedSummary = wrapText(summary, innerWidth);
    for (const line of wrappedSummary) {
      lines.push(line);
    }
  }

  // Add key findings if present
  if (keyFindings.length > 0) {
    lines.push("");
    for (const finding of keyFindings.slice(0, 5)) {
      lines.push(`${chalk.dim("•")} ${truncate(finding, innerWidth - 2)}`);
    }
  }

  // Add retry indicator for failed status
  if (status === "retrying") {
    lines.push("");
    lines.push(chalk.yellow("→ Retrying with error context..."));
  }

  // Add clickable paths section
  lines.push(...formatPathLines(sessionPath, diaryPath, innerWidth));

  return renderSafeBox(lines.join("\n"), {
    borderColor: getStatusBorderColor(status),
    borderStyle: "round",
    padding: { bottom: 0, left: 1, right: 1, top: 0 },
    title: `Iteration ${iteration} @ ${formatTimeOfDay()}`,
    titleAlignment: "left",
    width: BOX_WIDTH,
  });
}

/**
 * Render iteration START box (cyan border, shows iteration/subtask/attempt)
 */
function renderIterationStart(data: IterationDisplayData): string {
  const { subtaskId, subtaskTitle } = data;

  // Sanitize numeric values to prevent boxen crashes
  const attempt = ensureValidNumber(data.attempt, 1);
  const iteration = ensureValidNumber(data.iteration, 1);
  const maxAttempts = ensureValidNumber(data.maxAttempts, 1);
  const remaining = ensureValidNumber(data.remaining);

  const attemptText =
    maxAttempts > 0
      ? `Attempt ${attempt}/${maxAttempts}`
      : `Attempt ${attempt}`;
  const remainingText = chalk.dim(`${remaining} remaining`);

  // Calculate padding for right-aligned remaining count
  // (BOX_WIDTH - 4 accounts for box borders and padding)
  const innerWidth = BOX_WIDTH - 4;
  const leftPart = attemptText;
  const rightPart = `${remaining} remaining`;
  const padding = innerWidth - leftPart.length - rightPart.length;

  const lines = [
    `${chalk.cyan.bold(subtaskId)}  ${truncate(subtaskTitle, innerWidth - subtaskId.length - 2)}`,
    `${attemptText}${" ".repeat(Math.max(1, padding))}${remainingText}`,
  ];

  return renderSafeBox(lines.join("\n"), {
    borderColor: "cyan",
    borderStyle: "round",
    dimBorder: true,
    padding: { bottom: 0, left: 1, right: 1, top: 0 },
    title: `Iteration ${iteration}`,
    titleAlignment: "left",
    width: BOX_WIDTH,
  });
}

// =============================================================================
// Text Formatting
// =============================================================================

/**
 * Render markdown content for terminal display
 *
 * Uses marked-terminal for rich ANSI rendering.
 *
 * @param markdown - Markdown content to render
 * @returns Rendered content with ANSI styling
 */
function renderMarkdown(markdown: string): string {
  return marked(markdown) as string;
}

// =============================================================================
// Clickable Paths
// =============================================================================

/**
 * Render plan subtasks summary box (for headless mode output)
 *
 * Shows: stats (created/duration/cost), source info, configuration,
 * subtask list (truncated if many), output path, and next step.
 *
 * @param data - PlanSubtasksSummaryData with generation results
 * @returns Formatted boxen box string
 */
function renderPlanSubtasksSummary(data: PlanSubtasksSummaryData): string {
  const {
    costUsd,
    durationMs,
    error,
    milestone,
    outputPath,
    sizeMode,
    source,
    storyRef,
    subtasks,
  } = data;

  const innerWidth = BOX_WIDTH - 4;
  const lines: Array<string> = [];

  // Stats line: Created N   Duration Xs   Cost $X.XX
  const hasSubtasks = subtasks.length > 0;
  const createdPart = hasSubtasks
    ? `${chalk.dim("Created")} ${chalk.cyan.bold(String(subtasks.length))}   `
    : "";
  const durationPart = `${chalk.dim("Duration")} ${chalk.cyan(formatDuration(durationMs))}`;
  const costPart = `${chalk.dim("Cost")} ${chalk.magenta(`$${costUsd.toFixed(2)}`)}`;
  lines.push(`${createdPart}${durationPart}   ${costPart}`);

  // Separator
  lines.push("─".repeat(innerWidth));

  // Source info - skip if source duplicates storyRef
  const isStorySource =
    source.type === "file" &&
    storyRef !== undefined &&
    source.path === storyRef;

  if (!isStorySource) {
    const sourceLabels: Record<
      PlanSubtasksSummaryData["source"]["type"],
      string
    > = {
      file: "Source (file):",
      review: "Source (review):",
      text: "Source (text):",
    };
    const sourceLabel = sourceLabels[source.type];
    // Calculate max path length: innerWidth minus label width and spacing
    // "Source (review):" is the longest label at 16 chars
    const sourceLabelWidth = 16;

    if (source.type === "text" && source.text !== undefined) {
      const truncatedText = truncate(
        source.text,
        innerWidth - sourceLabelWidth,
      );
      lines.push(`${chalk.dim(sourceLabel)} ${truncatedText}`);
    } else if (source.path !== undefined) {
      const maxPathLength = innerWidth - sourceLabelWidth;
      if (source.type === "review" && source.findingsCount !== undefined) {
        // For review mode, include findings count in display
        const suffix = ` (${source.findingsCount} findings)`;
        const truncatedPath = makeClickablePath(
          source.path,
          maxPathLength - suffix.length,
        );
        lines.push(`${chalk.dim(sourceLabel)} ${truncatedPath}${suffix}`);
      } else {
        const truncatedPath = makeClickablePath(source.path, maxPathLength);
        lines.push(`${chalk.dim(sourceLabel)} ${truncatedPath}`);
      }
    }
  }

  // Configuration: milestone, size mode, story ref
  if (milestone !== undefined) {
    lines.push(`${chalk.dim("Milestone:")} ${milestone}`);
  }
  lines.push(`${chalk.dim("Size mode:")} ${sizeMode}`);
  if (storyRef !== undefined) {
    // "Story:" label is 7 chars, apply path truncation
    const storyLabelWidth = 7;
    const truncatedStoryPath = makeClickablePath(
      storyRef,
      innerWidth - storyLabelWidth,
    );
    lines.push(`${chalk.dim("Story:")} ${truncatedStoryPath}`);
  }

  // Separator before subtasks or error
  lines.push("─".repeat(innerWidth));

  if (error === undefined && hasSubtasks) {
    // Success state - list subtasks
    lines.push(chalk.dim("Subtasks:"));
    const maxDisplay = 8;
    const displaySubtasks = subtasks.slice(0, maxDisplay);
    for (const st of displaySubtasks) {
      const idPart = chalk.cyan.bold(st.id);
      const titlePart = truncate(st.title, innerWidth - st.id.length - 4);
      lines.push(`  ${idPart}  ${titlePart}`);
    }
    if (subtasks.length > maxDisplay) {
      lines.push(chalk.dim(`  (showing ${maxDisplay} of ${subtasks.length})`));
    }

    // Output path and next step
    lines.push("─".repeat(innerWidth));
    lines.push(
      `${chalk.dim("Output:")} ${makeClickablePath(outputPath, innerWidth - 8)}`,
    );
    lines.push("");
    const nextCmd =
      milestone === undefined
        ? "aaa ralph build"
        : `aaa ralph build --milestone ${milestone}`;
    lines.push(`${chalk.green("Next:")} ${nextCmd}`);
  } else if (error !== undefined) {
    // Error state
    lines.push(`${chalk.yellow("⚠")} ${error}`);
    lines.push(`${chalk.dim("Expected:")} ${outputPath}`);
    lines.push("");
    lines.push(`${chalk.dim("Check session log:")} logs/planning.jsonl`);
  }

  // Determine box title and color based on success/error
  const title = hasSubtasks ? "Subtasks Generated" : "Subtasks Generation";
  const borderColor = error === undefined ? "green" : "yellow";

  return renderSafeBox(lines.join("\n"), {
    borderColor,
    borderStyle: "double",
    padding: { bottom: 0, left: 1, right: 1, top: 0 },
    title,
    titleAlignment: "center",
    width: BOX_WIDTH,
  });
}

// =============================================================================
// Plan Subtasks Summary
// =============================================================================

/**
 * Render a progress bar showing completion status
 *
 * @param completed - Number of completed items
 * @param total - Total number of items
 * @param width - Width of the bar in characters (default 20)
 * @returns Progress bar string like "[████████░░░░░░░░░░░░] 8/20 (40%)"
 */
function renderProgressBar(
  completed: number,
  total: number,
  width = 20,
): string {
  if (total === 0) {
    return `[${chalk.dim("░".repeat(width))}] 0/0 (0%)`;
  }

  const percentage = Math.floor((completed / total) * 100);
  const filledCount = Math.floor((completed / total) * width);
  const emptyCount = width - filledCount;

  const filled = chalk.green("█".repeat(filledCount));
  const empty = "░".repeat(emptyCount);

  return `[${filled}${empty}] ${completed}/${total} (${percentage}%)`;
}

// =============================================================================
// Iteration Box Rendering
// =============================================================================

// BOX_WIDTH defined at top of file for marked config

/**
 * Render a styled separator for Claude response output
 *
 * @returns Styled line like "──────────────── Claude Response ────────────────"
 */
function renderResponseHeader(): string {
  const label = " Claude Response ";
  const lineChar = "─";
  const totalWidth = BOX_WIDTH;
  const labelLength = label.length;
  const sideLength = Math.floor((totalWidth - labelLength) / 2);
  return `${lineChar.repeat(sideLength)}${chalk.cyan(label)}${lineChar.repeat(sideLength)}`;
}

/**
 * Safe boxen wrapper that catches width-related crashes
 *
 * Boxen can crash with RangeError when content width exceeds box width.
 * This wrapper catches such errors and provides a plain-text fallback.
 *
 * @param content - Content to display in box
 * @param options - Boxen options
 * @returns Boxed content or plain fallback on error
 */
function renderSafeBox(content: string, options: BoxenOptions): string {
  try {
    return boxenLib(content, options);
  } catch {
    // Fallback: return content with simple border
    const title = options.title ?? "";
    const width = Math.min(68, Math.max(title.length + 4, 40));
    const border = "─".repeat(width);
    return `${border}\n${title}\n${border}\n${content}\n${border}`;
  }
}

/**
 * Render a status box with a title and content lines
 *
 * @param title - Box title
 * @param lines - Content lines to display
 * @returns Formatted box string with borders
 */
function renderStatusBox(title: string, lines: Array<string>): string {
  const output: Array<string> = [];

  // Title with underline
  output.push(chalk.bold(title));
  output.push("─".repeat(title.length));

  // Content
  for (const line of lines) {
    output.push(`  ${line}`);
  }

  output.push("");

  return output.join("\n");
}

// =============================================================================
// Text Formatting
// =============================================================================

/**
 * Truncate a string to a maximum length, adding ellipsis if needed
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length (default 50)
 * @returns Truncated text with "..." if it was too long
 */
/**
 * Truncate text based on display width (handles emojis + ANSI codes)
 *
 * Uses string-width to properly measure visual width, not string length.
 * This prevents boxen crashes when emojis/ANSI make str.length != display width.
 */
function truncate(text: string, maxWidth = 50): string {
  const width = stringWidth(text);
  if (width <= maxWidth) {
    return text;
  }
  // Truncate character by character until we fit
  let result = "";
  let currentWidth = 0;
  for (const char of text) {
    const charWidth = stringWidth(char);
    if (currentWidth + charWidth + 3 > maxWidth) {
      return `${result}...`;
    }
    result += char;
    currentWidth += charWidth;
  }
  return `${result}...`;
}

/**
 * Wrap text to fit within box width (ANSI-aware)
 *
 * Uses wrap-ansi to properly handle ANSI escape sequences (colors, styles)
 * without counting them toward line length.
 */
function wrapText(text: string, width: number): Array<string> {
  return wrapAnsi(text, width, {
    hard: false,
    trim: true,
    wordWrap: true,
  }).split("\n");
}

// =============================================================================
// Exports
// =============================================================================

// Export colorStatus as alias for getColoredStatus for API consistency
const colorStatus = getColoredStatus;

export {
  BOX_WIDTH,
  type BuildSummaryData,
  colorStatus,
  formatDuration,
  formatTimestamp,
  formatTokenCount,
  getColoredStatus,
  type IterationDisplayData,
  makeClickablePath,
  type PlanSubtasksSummaryData,
  renderBuildPracticalSummary,
  renderBuildSummary,
  renderCascadeProgress,
  renderCascadeSummary,
  renderInvocationHeader,
  renderIterationEnd,
  renderIterationStart,
  renderMarkdown,
  renderPlanSubtasksSummary,
  renderProgressBar,
  renderResponseHeader,
  renderStatusBox,
  truncate,
};

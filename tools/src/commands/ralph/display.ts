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

import boxen, { type Options as BoxenOptions } from "boxen";
import chalk from "chalk";
import { marked, type MarkedExtension } from "marked";
// @ts-expect-error - marked-terminal has no types for v7
// eslint-disable-next-line import/namespace
import { markedTerminal } from "marked-terminal";
import supportsHyperlinks from "supports-hyperlinks";
import wrapAnsi from "wrap-ansi";

import type { IterationStatus } from "./types";

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
  /** Number of tool calls */
  toolCalls?: number;
}

// =============================================================================
// Status Coloring
// =============================================================================

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
// Progress Bar Rendering
// =============================================================================

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

// =============================================================================
// Markdown Rendering
// =============================================================================

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

  return boxen(lines.join("\n"), {
    borderColor: "white",
    borderStyle: "double",
    padding: { bottom: 0, left: 1, right: 1, top: 0 },
    title: "Build Complete",
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
    attempt,
    costUsd = 0,
    diaryPath,
    durationMs = 0,
    filesChanged = 0,
    iteration,
    keyFindings = [],
    maxAttempts,
    remaining,
    sessionPath,
    status = "retrying",
    subtaskId,
    subtaskTitle,
    summary = "",
    toolCalls = 0,
  } = data;

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

  const metricsLine = `${statusIcon} ${statusColored}    ${durationText}    ${costText}    ${callsText}    ${filesText}`;

  // Build content lines
  const lines = [
    `${chalk.cyan.bold(subtaskId)}  ${truncate(subtaskTitle, innerWidth - subtaskId.length - 2)}`,
    `${attemptText}${" ".repeat(Math.max(1, padding))}${remainingText}`,
    "─".repeat(innerWidth),
    metricsLine,
  ];

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
  // Label "Session  " or "Diary    " = 9 chars, so max path = innerWidth - 9
  const maxPathLength = innerWidth - 9;
  if (sessionPath !== undefined || diaryPath !== undefined) {
    lines.push("─".repeat(innerWidth));
    if (sessionPath !== undefined) {
      lines.push(
        `${chalk.dim("Session")}  ${makeClickablePath(sessionPath, maxPathLength)}`,
      );
    }
    if (diaryPath !== undefined) {
      lines.push(
        `${chalk.dim("Diary")}    ${makeClickablePath(diaryPath, maxPathLength)}`,
      );
    }
  }

  return boxen(lines.join("\n"), {
    borderColor: getStatusBorderColor(status),
    borderStyle: "round",
    padding: { bottom: 0, left: 1, right: 1, top: 0 },
    title: `Iteration ${iteration} @ ${formatTimeOfDay()}`,
    titleAlignment: "left",
    width: BOX_WIDTH,
  });
}

// =============================================================================
// Text Formatting
// =============================================================================

/**
 * Render iteration START box (cyan border, shows iteration/subtask/attempt)
 */
function renderIterationStart(data: IterationDisplayData): string {
  const {
    attempt,
    iteration,
    maxAttempts,
    remaining,
    subtaskId,
    subtaskTitle,
  } = data;

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

  return boxen(lines.join("\n"), {
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
// Clickable Paths
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
// Iteration Box Rendering
// =============================================================================

// BOX_WIDTH defined at top of file for marked config

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

/**
 * Truncate a string to a maximum length, adding ellipsis if needed
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length (default 50)
 * @returns Truncated text with "..." if it was too long
 */
function truncate(text: string, maxLength = 50): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
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
  type BuildSummaryData,
  colorStatus,
  formatDuration,
  formatTimestamp,
  getColoredStatus,
  type IterationDisplayData,
  makeClickablePath,
  renderBuildSummary,
  renderInvocationHeader,
  renderIterationEnd,
  renderIterationStart,
  renderMarkdown,
  renderProgressBar,
  renderResponseHeader,
  renderStatusBox,
  truncate,
};

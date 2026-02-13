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

import type { ApprovalGate } from "./approvals";
import type { ProviderType } from "./providers/types";
import type { BuildPracticalSummary } from "./summary";
import type {
  ApprovalGatePreview,
  CascadeResult,
  CompactPreviewData,
  IterationStatus,
  PipelineFooterData,
  PipelineHeaderData,
  PipelinePhaseNode,
  PipelineStep,
  StepAnnotation,
  TokenUsage,
} from "./types";

// Box width for iteration displays (defined early for marked config)
const BOX_WIDTH = 68;
// 64 = BOX_WIDTH minus borders and padding
const BOX_INNER_WIDTH = BOX_WIDTH - 4;

const MARKER_ADDED = "+";
const MARKER_REPLACED = "~";
const MARKER_STRUCK = "×";

const STEP_INDENT_WIDTH = 3;
const STEP_MARKER_WIDTH = 3;

type CascadePhaseState =
  | "completed"
  | "failed"
  | "pending"
  | "running"
  | "timed-wait"
  | "waiting";

const CASCADE_SYMBOL_COMPLETED = "✓";
const CASCADE_SYMBOL_RUNNING = "◉";
const CASCADE_SYMBOL_WAITING = "‖";
const CASCADE_SYMBOL_TIMED_WAIT = "~";
const CASCADE_SYMBOL_FAILED = "✗";
const CASCADE_SYMBOL_PENDING = "○";

interface ApprovalGateActionOption {
  color: "green" | "red" | "yellow";
  key: string;
  label: string;
}

interface ApprovalGateCardData {
  actionOptions: Array<ApprovalGateActionOption>;
  configMode: string;
  executionMode: "headless" | "supervised";
  gateName: ApprovalGate;
  resolvedAction: string;
  summaryLines: Array<string>;
}

interface ApprovalGateRenderOptions {
  force?: boolean;
  review?: boolean;
}

interface StepAnnotationFormatOptions {
  flag: string;
  indentWidth?: number;
  marker: string;
  stepText: string;
}

const annotationMarkerColors: Record<
  StepAnnotation["effect"],
  (text: string) => string
> = { added: chalk.green, replaced: chalk.yellow, struck: chalk.dim };

// Configure marked with terminal renderer
const markedTerminalFactory = markedTerminal as unknown as (options: {
  reflowText: boolean;
  tab: number;
  width: number;
}) => MarkedExtension;

marked.use(
  markedTerminalFactory({ reflowText: true, tab: 2, width: BOX_INNER_WIDTH }),
);

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

interface CommandBannerData {
  lines: Array<string>;
  title: string;
  tone?: VisualTone;
}

type EventDomain =
  | "BUILD"
  | "CALIBRATE"
  | "CASCADE"
  | "MILESTONES"
  | "MODELS"
  | "PLAN"
  | "STATUS"
  | "SUBTASKS"
  | "VALIDATE";

interface EventLineData {
  domain: EventDomain;
  message: string;
  state: EventState;
}

type EventState = "DONE" | "FAIL" | "INFO" | "SKIP" | "START" | "WAIT";

/** Options for formatCreatedPart helper */
interface FormatCreatedPartOptions {
  addedCount: number | undefined;
  hasSubtasks: boolean;
  subtasksLength: number;
  totalCount: number | undefined;
}

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

interface PhaseCardData {
  domain: EventDomain;
  lines?: Array<string>;
  state: EventState;
  title: string;
  tone?: VisualTone;
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
  /** Provider session ID */
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

type VisualTone = "default" | "error" | "info" | "success" | "warning";

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
 * Format the "Created" part of the stats line
 *
 * @param options - Formatting options
 * @returns Formatted string like "Created 3 (Total: 10)   " or "Created 5   " or ""
 */
function formatCreatedPart(options: FormatCreatedPartOptions): string {
  const { addedCount, hasSubtasks, subtasksLength, totalCount } = options;
  if (!hasSubtasks) {
    return "";
  }
  // Use new format when both counts are provided, otherwise fallback
  return addedCount !== undefined && totalCount !== undefined
    ? `${chalk.dim("Created")} ${chalk.cyan.bold(String(addedCount))} ${chalk.dim("(Total:")} ${chalk.cyan(String(totalCount))}${chalk.dim(")")}   `
    : `${chalk.dim("Created")} ${chalk.cyan.bold(String(subtasksLength))}   `;
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

function formatGateName(gate: ApprovalGate): string {
  const gateBody = gate.replace(/^create/, "").replace(/^on/, "");
  const spaced = gateBody
    .replaceAll(/(?<capital>[A-Z])/g, " $<capital>")
    .trim();

  if (gate.startsWith("create")) {
    return `Create ${spaced}`;
  }

  return `${spaced[0]?.toUpperCase() ?? ""}${spaced.slice(1)}`;
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
 * Format the skipped tasks section
 *
 * @param lines - Array to append lines to
 * @param skippedTasks - Array of task refs that were skipped
 */
function formatSkippedSection(
  lines: Array<string>,
  skippedTasks: Array<string>,
): void {
  const skippedCount = skippedTasks.length;
  const maxSkippedDisplay = 5;
  const plural = skippedCount === 1 ? "" : "s";
  lines.push(
    `${chalk.yellow("Skipped:")} ${skippedCount} task${plural} (already have subtasks)`,
  );
  // Show up to 5 task refs
  const displaySkipped = skippedTasks.slice(0, maxSkippedDisplay);
  for (const taskReference of displaySkipped) {
    lines.push(`  ${chalk.dim("•")} ${chalk.dim(taskReference)}`);
  }
  if (skippedTasks.length > maxSkippedDisplay) {
    const remaining = skippedTasks.length - maxSkippedDisplay;
    lines.push(`  ${chalk.dim(`... and ${remaining} more`)}`);
  }
}

/**
 * Format source info section for plan subtasks summary
 *
 * @param lines - Array to append lines to
 * @param source - Source data from PlanSubtasksSummaryData
 * @param innerWidth - Inner box width for truncation
 */
function formatSourceInfo(
  lines: Array<string>,
  source: PlanSubtasksSummaryData["source"],
  innerWidth: number,
): void {
  const sourceLabels: Record<
    PlanSubtasksSummaryData["source"]["type"],
    string
  > = {
    file: "Source (file):",
    review: "Source (review):",
    text: "Source (text):",
  };
  const sourceLabel = sourceLabels[source.type];
  // "Source (review):" is the longest label at 16 chars
  const sourceLabelWidth = 16;

  if (source.type === "text" && source.text !== undefined) {
    const truncatedText = truncate(source.text, innerWidth - sourceLabelWidth);
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

/**
 * Render a pipeline step with optional annotation marker and right-aligned flag tag.
 */
function formatStepWithAnnotation(
  options: StepAnnotationFormatOptions,
): string {
  const { flag, indentWidth = STEP_INDENT_WIDTH, marker, stepText } = options;
  const indent = " ".repeat(indentWidth);
  const markerPart = `${marker}  `;
  const flagTag = chalk.dim(`[${flag}]`);

  const maxStepTextWidth = Math.max(
    1,
    BOX_WIDTH - indentWidth - STEP_MARKER_WIDTH - stringWidth(flagTag) - 1,
  );
  const truncatedStepText = truncate(stepText, maxStepTextWidth);

  const spacingWidth = Math.max(
    1,
    BOX_WIDTH -
      indentWidth -
      stringWidth(markerPart) -
      stringWidth(truncatedStepText) -
      stringWidth(flagTag),
  );

  return `${indent}${markerPart}${truncatedStepText}${" ".repeat(spacingWidth)}${flagTag}`;
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

function formatTwoColumnRow(
  leftText: string,
  rightText: string,
  innerWidth: number,
): string {
  let safeRight = rightText;
  if (stringWidth(safeRight) > innerWidth) {
    safeRight = truncate(safeRight, innerWidth);
  }

  const rightWidth = stringWidth(safeRight);
  if (leftText === "") {
    return `${" ".repeat(Math.max(0, innerWidth - rightWidth))}${safeRight}`;
  }

  if (safeRight === "") {
    return stringWidth(leftText) > innerWidth
      ? truncate(leftText, innerWidth)
      : leftText;
  }

  const availableLeftWidth = innerWidth - rightWidth - 1;
  if (availableLeftWidth <= 0) {
    return safeRight;
  }

  const safeLeft =
    stringWidth(leftText) > availableLeftWidth
      ? truncate(leftText, availableLeftWidth)
      : leftText;

  const spacingWidth = Math.max(
    1,
    innerWidth - stringWidth(safeLeft) - rightWidth,
  );
  return `${safeLeft}${" ".repeat(spacingWidth)}${safeRight}`;
}

// =============================================================================
// Markdown Rendering
// =============================================================================

function getColoredEventLabel(label: string, state: EventState): string {
  switch (state) {
    case "DONE": {
      return chalk.green.bold(label);
    }
    case "FAIL": {
      return chalk.red.bold(label);
    }
    case "INFO": {
      return chalk.cyan(label);
    }
    case "SKIP": {
      return chalk.yellow.bold(label);
    }
    case "START": {
      return chalk.cyan.bold(label);
    }
    case "WAIT": {
      return chalk.yellow(label);
    }
    default: {
      return label;
    }
  }
}

// =============================================================================
// Plan Subtasks Summary Helpers
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

/**
 * Get display label for a provider key.
 */
function getProviderLabel(provider: ProviderType): string {
  const labels: Record<ProviderType, string> = {
    claude: "Claude",
    codex: "Codex",
    cursor: "Cursor",
    gemini: "Gemini",
    opencode: "OpenCode",
    pi: "Pi",
  };
  return labels[provider];
}

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

function getToneBorderColor(tone: VisualTone): BoxenOptions["borderColor"] {
  switch (tone) {
    case "error": {
      return "red";
    }
    case "info": {
      return "cyan";
    }
    case "success": {
      return "green";
    }
    case "warning": {
      return "yellow";
    }
    default: {
      return "white";
    }
  }
}

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

function renderAnnotatedStep(step: PipelineStep): string {
  if (step.annotation === undefined) {
    return step.text;
  }

  const markerByEffect: Record<StepAnnotation["effect"], string> = {
    added: MARKER_ADDED,
    replaced: MARKER_REPLACED,
    struck: MARKER_STRUCK,
  };

  const markerText = markerByEffect[step.annotation.effect];
  const marker = annotationMarkerColors[step.annotation.effect](markerText);
  const styledStepText =
    step.annotation.effect === "struck"
      ? chalk.dim.strikethrough(step.text)
      : annotationMarkerColors[step.annotation.effect](step.text);

  return formatStepWithAnnotation({
    flag: step.annotation.flag,
    marker,
    stepText: styledStepText,
  });
}

function renderApprovalGateCard(data: ApprovalGateCardData): string {
  const maxSummaryLines = data.summaryLines.length > 10 ? 5 : 10;
  const visibleSummary = data.summaryLines.slice(0, maxSummaryLines);
  const remainingSummaryCount =
    data.summaryLines.length - visibleSummary.length;
  const sectionSeparator = chalk.dim("─".repeat(BOX_INNER_WIDTH));
  const colorByOption: Record<
    ApprovalGateActionOption["color"],
    typeof chalk.green
  > = {
    green: chalk.green.bold,
    red: chalk.red.bold,
    yellow: chalk.yellow.bold,
  };

  const lines: Array<string> = [
    chalk.cyan.bold(`APPROVE: ${formatGateName(data.gateName)}`),
    sectionSeparator,
    ...visibleSummary.map((line) => `  ${truncate(line, BOX_INNER_WIDTH - 2)}`),
    ...(remainingSummaryCount > 0
      ? [chalk.dim(`  ... and ${remainingSummaryCount} more`)]
      : []),
    sectionSeparator,
    truncate(
      `${chalk.dim("Config:")} ${chalk.cyan(data.configMode)}    ${chalk.dim("Mode:")} ${chalk.cyan(data.executionMode)}    ${chalk.dim("Action:")} ${chalk.cyan(data.resolvedAction)}`,
      BOX_INNER_WIDTH,
    ),
    sectionSeparator,
    ...data.actionOptions.map((option) => {
      const color = colorByOption[option.color];
      return `${color(`[${option.key}]`)} ${option.label}`;
    }),
  ];

  return renderSafeBox(lines.join("\n"), {
    borderStyle: "round",
    padding: 1,
    width: BOX_WIDTH,
  });
}

/**
 * Render a one-line approval gate preview.
 */
function renderApprovalGatePreview(
  gateName: string,
  resolvedAction: ApprovalGatePreview["resolvedAction"],
  options: ApprovalGateRenderOptions = {},
): string {
  const actionLabel = (() => {
    switch (resolvedAction) {
      case "exit-unstaged": {
        return chalk.yellow("⚠ EXIT-UNSTAGED");
      }
      case "notify-wait": {
        return chalk.cyan("NOTIFY-WAIT");
      }
      case "prompt": {
        return chalk.yellow("PROMPT");
      }
      case "write": {
        return chalk.green.dim("SKIP");
      }
      default: {
        return resolvedAction;
      }
    }
  })();

  let marker = "";
  if (resolvedAction === "write" && options.force === true) {
    marker = ` ${chalk.dim("[force]")}`;
  }
  if (resolvedAction === "prompt" && options.review === true) {
    marker = ` ${chalk.dim("[review]")}`;
  }

  return `GATE ${gateName} -> ${actionLabel}${marker}`;
}

// =============================================================================
// Status Box Rendering
// =============================================================================

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

// =============================================================================
// Iteration Box Types
// =============================================================================

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
    parts.push(chalk.green(`[${level}] ${CASCADE_SYMBOL_COMPLETED}`));
  }

  // Current level: [level] ◉ in cyan bold
  parts.push(chalk.cyan.bold(`[${current}] ${CASCADE_SYMBOL_RUNNING}`));

  // Remaining levels: just the name in dim
  for (const level of remaining) {
    parts.push(chalk.dim(level));
  }

  // Join with arrows
  return parts.join(chalk.dim(" → "));
}

/**
 * Render cascade progress for explicit phase states.
 */
function renderCascadeProgressWithStates(
  levels: Array<string>,
  phaseStates: Partial<Record<string, CascadePhaseState>>,
): string {
  const parts = levels.map((level) => {
    const state = phaseStates[level] ?? "pending";
    const label = `[${level}]`;

    switch (state) {
      case "completed": {
        return chalk.green(`${label} ${CASCADE_SYMBOL_COMPLETED}`);
      }
      case "failed": {
        return chalk.red(`${label} ${CASCADE_SYMBOL_FAILED}`);
      }
      case "pending": {
        return chalk.dim(`${label} ${CASCADE_SYMBOL_PENDING}`);
      }
      case "running": {
        return chalk.cyan.bold(`${label} ${CASCADE_SYMBOL_RUNNING}`);
      }
      case "timed-wait": {
        return chalk.yellow(`${label} ${CASCADE_SYMBOL_TIMED_WAIT}`);
      }
      case "waiting": {
        return chalk.yellow(`${label} ${CASCADE_SYMBOL_WAITING}`);
      }
      default: {
        return chalk.dim(`${label} ${CASCADE_SYMBOL_PENDING}`);
      }
    }
  });

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
 * Render a collapsed pipeline phase as a one-line tree row.
 */
function renderCollapsedPhase(
  node: PipelinePhaseNode,
  isLast: boolean,
): string {
  const connector = isLast ? "└─" : "├─";
  const gatePart =
    node.summary.gateStatus === undefined
      ? ""
      : `  ${renderGateStatusIndicator(node.summary.gateStatus)}`;

  return `${connector} ${chalk.cyan(node.name)}  ${chalk.dim(node.summary.description)}  ${chalk.dim(node.summary.timeEstimate)}${gatePart}`;
}

function renderCommandBanner(data: CommandBannerData): string {
  const { lines, title, tone = "info" } = data;
  return renderSafeBox(lines.join("\n"), {
    borderColor: getToneBorderColor(tone),
    borderStyle: "double",
    padding: { bottom: 0, left: 1, right: 1, top: 0 },
    title: chalk.bold(title),
    titleAlignment: "center",
    width: BOX_WIDTH,
  });
}

/**
 * Render compact single-level preview banner.
 */
function renderCompactPreview(data: CompactPreviewData): string {
  const lines = [
    `${chalk.dim("  Milestone")}   ${chalk.cyan(data.milestone)}`,
    formatTwoColumnRow(
      `${chalk.dim("  Provider")}    ${chalk.cyan(data.provider)}`,
      `${chalk.dim("Model")}   ${chalk.cyan(data.model)}`,
      BOX_INNER_WIDTH,
    ),
    `${chalk.dim("  Queue")}       ${chalk.cyan(data.queueStats)}`,
    `${chalk.dim("  Next")}        ${chalk.cyan(data.nextSubtask)}`,
    formatTwoColumnRow(
      `${chalk.dim("  Mode")}        ${chalk.cyan(data.mode)}`,
      `${chalk.dim("Validate")}  ${chalk.cyan(data.validateStatus)}`,
      BOX_INNER_WIDTH,
    ),
    "─".repeat(BOX_INNER_WIDTH),
    `${chalk.dim("  Pipeline")}    ${chalk.cyan(data.pipelineSummary)}`,
    `${chalk.dim("  Gates")}       ${chalk.cyan(data.gatesSummary)}`,
  ];

  return renderSafeBox(lines.join("\n"), {
    borderColor: "white",
    borderStyle: "double",
    padding: { bottom: 0, left: 1, right: 1, top: 0 },
    title: data.title ?? "Ralph Build",
    titleAlignment: "center",
    width: BOX_WIDTH,
  });
}

function renderEventLine(data: EventLineData): string {
  const { domain, message, state } = data;
  const label = `[${domain}] [${state}]`;
  const coloredLabel = getColoredEventLabel(label, state);
  return `${coloredLabel} ${message}`;
}

/**
 * Render an expanded pipeline phase with section detail lines.
 */
function renderExpandedPhase(node: PipelinePhaseNode): Array<string> {
  const sectionLabelWidth = 7;
  const sectionPrefix = "│  ";
  const continuationPrefix = `${sectionPrefix}${" ".repeat(sectionLabelWidth)}`;

  function renderSection(label: string, entries: Array<string>): Array<string> {
    if (entries.length === 0) {
      return [`${sectionPrefix}${chalk.dim(label.padEnd(sectionLabelWidth))}`];
    }

    const [firstEntry, ...restEntries] = entries;
    return [
      `${sectionPrefix}${chalk.dim(label.padEnd(sectionLabelWidth))} ${firstEntry}`,
      ...restEntries.map((entry) => `${continuationPrefix} ${entry}`),
    ];
  }

  const lines = [
    `▾ ${chalk.cyan(node.name)}  ${chalk.dim(node.summary.description)}  ${chalk.dim(node.summary.timeEstimate)}`,
    ...renderSection("READS", node.expandedDetail.reads),
    ...renderSection(
      "STEPS",
      node.expandedDetail.steps.map((step) => renderAnnotatedStep(step)),
    ),
    ...renderSection("WRITES", node.expandedDetail.writes),
  ];

  return lines;
}

/**
 * Render a short gate status tag for collapsed phase summaries.
 */
function renderGateStatusIndicator(
  status: "APPROVAL" | "auto" | "SKIP",
): string {
  switch (status) {
    case "APPROVAL": {
      return chalk.yellow("[APPROVAL]");
    }
    case "auto": {
      return chalk.green("auto");
    }
    case "SKIP": {
      return chalk.yellow("[SKIP]");
    }
    default: {
      return status;
    }
  }
}

/**
 * Render a styled separator for provider invocation
 *
 * @param mode - "headless" or "supervised" execution mode
 * @returns Styled line like "──────────── Invoking OpenCode (headless) ────────────"
 */
function renderInvocationHeader(
  mode: "headless" | "supervised",
  provider: ProviderType = "claude",
): string {
  const label = ` Invoking ${getProviderLabel(provider)} (${mode}) `;
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

function renderPhaseCard(data: PhaseCardData): string {
  const { domain, lines = [], state, title, tone } = data;
  let toneOrDefault: VisualTone = tone ?? "info";
  if (tone === undefined) {
    switch (state) {
      case "DONE": {
        toneOrDefault = "success";
        break;
      }
      case "FAIL": {
        toneOrDefault = "error";
        break;
      }
      case "SKIP": {
        toneOrDefault = "warning";
        break;
      }
      default: {
        break;
      }
    }
  }

  const content = [
    renderEventLine({ domain, message: title, state }),
    ...lines,
  ];

  return renderSafeBox(content.join("\n"), {
    borderColor: getToneBorderColor(toneOrDefault),
    borderStyle: "round",
    padding: { bottom: 0, left: 1, right: 1, top: 0 },
    width: BOX_WIDTH,
  });
}

/**
 * Render pipeline footer lines (to embed inside an existing plan box).
 */
function renderPipelineFooter(data: PipelineFooterData): Array<string> {
  const gatesRight =
    data.gatesStatus === undefined || data.gatesStatus === ""
      ? `${chalk.dim("Gates:")} ${chalk.cyan(String(data.phaseGateCount))}`
      : `${chalk.dim("Gates:")} ${chalk.cyan(String(data.phaseGateCount))} ${chalk.dim(data.gatesStatus)}`;
  const costText = `${chalk.dim("Est. cost:")} ${chalk.magenta(data.estimatedCost)}`;
  const nextStepText =
    data.nextStep === "dry-run"
      ? "To execute: remove --dry-run flag"
      : "Proceed? [Y/n]:";
  const lines = [
    "─".repeat(BOX_INNER_WIDTH),
    formatTwoColumnRow(
      `${chalk.dim("Phases:")} ${chalk.cyan(String(data.phaseCount))}`,
      gatesRight,
      BOX_INNER_WIDTH,
    ),
    formatTwoColumnRow(
      `${chalk.dim("Est. time:")} ${chalk.cyan(`~${data.estimatedMinutes} min`)}`,
      costText,
      BOX_INNER_WIDTH,
    ),
  ];

  if (data.warnings !== undefined && data.warnings.length > 0) {
    lines.push("");
    for (const warning of data.warnings) {
      lines.push(`${chalk.yellow("⚠")} ${chalk.yellow(warning)}`);
    }
  }

  lines.push("");
  lines.push(nextStepText);
  return lines;
}

/**
 * Render a pipeline preview header box.
 */
function renderPipelineHeader(data: PipelineHeaderData): string {
  const providerWithModel =
    data.model === undefined
      ? data.provider
      : `${data.provider} (${data.model})`;

  const commandRow = `${chalk.dim("  Command:   ")}${chalk.cyan(data.commandLine)}`;
  const milestoneLeft =
    data.milestone === undefined
      ? ""
      : `${chalk.dim("  Milestone: ")}${chalk.cyan(data.milestone)}`;
  const providerRight = `${chalk.dim("Provider: ")}${chalk.cyan(providerWithModel)}`;
  const modeLeft = `${chalk.dim("  Mode:      ")}${chalk.cyan(data.mode)}`;
  const approvalsRight = `${chalk.dim("Approvals: ")}${chalk.cyan(data.approvalsStatus)}`;

  const lines = [
    commandRow,
    formatTwoColumnRow(milestoneLeft, providerRight, BOX_INNER_WIDTH),
    formatTwoColumnRow(modeLeft, approvalsRight, BOX_INNER_WIDTH),
  ];

  return renderSafeBox(lines.join("\n"), {
    borderColor: "white",
    borderStyle: "double",
    padding: { bottom: 0, left: 1, right: 1, top: 0 },
    title: "Ralph Pipeline Plan",
    titleAlignment: "center",
    width: BOX_WIDTH,
  });
}

/**
 * Render the full pipeline tree for mixed expanded/collapsed phases.
 */
function renderPipelineTree(
  nodes: Array<PipelinePhaseNode>,
  gateOptions: ApprovalGateRenderOptions = {},
): Array<string> {
  const lines: Array<string> = [];

  for (const [index, node] of nodes.entries()) {
    const isLast = index === nodes.length - 1;

    if (node.expanded) {
      const expandedLines = renderExpandedPhase(node);
      const connector = isLast ? "└─" : "├─";
      const [firstLine, ...detailLines] = expandedLines;

      if (firstLine !== undefined) {
        lines.push(`${connector} ${firstLine}`);
      }

      const detailPrefix = isLast ? "   " : "│  ";
      for (const detailLine of detailLines) {
        lines.push(`${detailPrefix}${detailLine}`);
      }

      if (node.expandedDetail.gate !== undefined) {
        lines.push(
          `${detailPrefix}│  ${renderApprovalGatePreview(
            node.expandedDetail.gate.gateName,
            node.expandedDetail.gate.resolvedAction,
            gateOptions,
          )}`,
        );
      }
    } else {
      lines.push(renderCollapsedPhase(node, isLast));
    }

    if (!isLast) {
      lines.push("│");
    }
  }

  return lines;
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
    addedCount,
    costUsd,
    durationMs,
    error,
    milestone,
    outputPath,
    sizeMode,
    skippedTasks,
    source,
    storyRef,
    subtasks,
    totalCount,
  } = data;

  const innerWidth = BOX_WIDTH - 4;
  const lines: Array<string> = [];

  // Stats line: Created X (Total: Y)   Duration Xs   Cost $X.XX
  // Falls back to "Created N" when new count fields aren't provided
  const hasSubtasks = subtasks.length > 0;
  const createdPart = formatCreatedPart({
    addedCount,
    hasSubtasks,
    subtasksLength: subtasks.length,
    totalCount,
  });
  const durationPart = `${chalk.dim("Duration")} ${chalk.cyan(formatDuration(durationMs))}`;
  const costPart = `${chalk.dim("Cost")} ${chalk.magenta(`$${costUsd.toFixed(2)}`)}`;
  lines.push(`${createdPart}${durationPart}   ${costPart}`);

  // Skipped section: show when tasks were skipped due to existing subtasks
  if (skippedTasks !== undefined && skippedTasks.length > 0) {
    formatSkippedSection(lines, skippedTasks);
  }

  // Separator
  lines.push("─".repeat(innerWidth));

  // Source info - skip if source duplicates storyRef
  const isStorySource =
    source.type === "file" &&
    storyRef !== undefined &&
    source.path === storyRef;

  if (!isStorySource) {
    formatSourceInfo(lines, source, innerWidth);
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
 * Render a styled separator for provider response output
 *
 * @returns Styled line like "─────────────── OpenCode Response ───────────────"
 */
function renderResponseHeader(provider: ProviderType = "claude"): string {
  const label = ` ${getProviderLabel(provider)} Response `;
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
  type ApprovalGateCardData,
  BOX_WIDTH,
  type BuildSummaryData,
  CASCADE_SYMBOL_COMPLETED,
  CASCADE_SYMBOL_FAILED,
  CASCADE_SYMBOL_PENDING,
  CASCADE_SYMBOL_RUNNING,
  CASCADE_SYMBOL_TIMED_WAIT,
  CASCADE_SYMBOL_WAITING,
  type CascadePhaseState,
  colorStatus,
  type CommandBannerData,
  type EventDomain,
  type EventLineData,
  type EventState,
  formatDuration,
  formatStepWithAnnotation,
  formatTimestamp,
  formatTokenCount,
  formatTwoColumnRow,
  getColoredStatus,
  type IterationDisplayData,
  makeClickablePath,
  MARKER_ADDED,
  MARKER_REPLACED,
  MARKER_STRUCK,
  type PhaseCardData,
  type PlanSubtasksSummaryData,
  renderAnnotatedStep,
  renderApprovalGateCard,
  renderApprovalGatePreview,
  renderBuildPracticalSummary,
  renderBuildSummary,
  renderCascadeProgress,
  renderCascadeProgressWithStates,
  renderCascadeSummary,
  renderCollapsedPhase,
  renderCommandBanner,
  renderCompactPreview,
  renderEventLine,
  renderExpandedPhase,
  renderGateStatusIndicator,
  renderInvocationHeader,
  renderIterationEnd,
  renderIterationStart,
  renderMarkdown,
  renderPhaseCard,
  renderPipelineFooter,
  renderPipelineHeader,
  renderPipelineTree,
  renderPlanSubtasksSummary,
  renderProgressBar,
  renderResponseHeader,
  renderStatusBox,
  truncate,
  type VisualTone,
};

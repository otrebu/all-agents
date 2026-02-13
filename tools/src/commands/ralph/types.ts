/**
 * Shared types for Ralph autonomous build system
 *
 * This module provides the type definitions for:
 * - Subtask queue (subtasks.json)
 * - Ralph configuration (ralph.config.json)
 * - Iteration diary entries (logs/iterations.jsonl)
 *
 * @see docs/planning/schemas/subtasks.schema.json
 * @see docs/planning/schemas/ralph-config.schema.json
 * @see docs/planning/schemas/iteration-diary.schema.json
 */

import { createHash } from "node:crypto";

import type { ProviderType } from "./providers/types";

// =============================================================================
// Build State Types
// =============================================================================

/**
 * Build options that control provider execution behavior.
 */
interface BuildExecutionOptions {
  /** Preview execution plan without running providers */
  dryRun?: boolean;
  /** Pause between iterations for user confirmation */
  interactive: boolean;
  /** Execution mode: supervised (watch) or headless (JSON capture) */
  mode: "headless" | "supervised";
  /** Model to use (validated against registry before provider invocation) */
  model?: string;
  /** AI provider to use (default: "claude") */
  provider?: ProviderType;
  /** Suppress terminal summary output */
  quiet: boolean;
}

/**
 * Options for the build loop.
 */
type BuildOptions = BuildExecutionOptions & BuildQueueOptions;

/**
 * Build options that control queue handling and orchestration.
 */
interface BuildQueueOptions {
  /** Run calibration every N iterations (0 = disabled) */
  calibrateEvery: number;
  /** Skip validation proposal approval prompts and auto-apply proposals */
  force: boolean;
  /** Maximum iterations per subtask (0 = unlimited) */
  maxIterations: number;
  /** Require explicit approval before applying validation proposals */
  review: boolean;
  /** Skip lightweight summary generation in headless mode to reduce latency and cost */
  skipSummary: boolean;
  /** Path to subtasks.json file */
  subtasksPath: string;
  /** Run pre-build validation before starting */
  validateFirst: boolean;
}

// =============================================================================
// Cascade Types
// =============================================================================

/**
 * Calibration entry persisted to a milestone daily log file.
 */
interface CalibrationLogEntry {
  milestone?: string;
  mode?: "headless" | "supervised";
  operationCount?: number;
  sessionId?: string;
  source?: string;
  summary: string;
  taskRef?: string;
  timestamp: string;
  type: "calibration";
}

/**
 * Definition of a cascade level
 *
 * Represents a single level in the Ralph cascade hierarchy
 * (roadmap → stories → tasks → subtasks → build → calibrate)
 */
interface CascadeLevel {
  /** Human-readable name of the level (e.g., 'stories', 'build') */
  name: string;
  /** Numeric order in the cascade sequence (lower = earlier) */
  order: number;
}

/**
 * Options for cascade execution
 *
 * Controls how Ralph cascades through planning levels
 * (roadmap → stories → tasks → subtasks → build → calibrate)
 */
interface CascadeOptions {
  /** Interval for running calibration (e.g., every N subtasks completed) */
  calibrateEvery: number;
  /** Preview execution plan without running providers */
  dryRun?: boolean;
  /** Skip confirmation prompts between cascade levels */
  force: boolean;
  /** Run without TTY prompts (for CI/automation) */
  headless: boolean;
  /** Target milestone path or name for cascade scope */
  milestone: string;
}

// =============================================================================
// Ralph Configuration Types (matches ralph-config.schema.json)
// =============================================================================

/**
 * Result of a cascade execution
 *
 * Tracks which levels completed and where the cascade stopped
 */
interface CascadeResult {
  /** Levels that completed successfully (e.g., ['stories', 'tasks']) */
  completedLevels: Array<string>;
  /** Error message if cascade failed, null on success */
  error: null | string;
  /** Level where cascade stopped (on error or user abort), null if completed */
  stoppedAt: null | string;
  /** Whether the cascade completed all requested levels */
  success: boolean;
}

// =============================================================================
// Pipeline Preview Rendering Types
// =============================================================================

/**
 * One-line summary rendered for a collapsed pipeline phase.
 */
interface CollapsedPhaseSummary {
  /** One-line phase description */
  description: string;
  /** Optional gate indicator tag for collapsed one-line display */
  gateIndicator?: string;
  /** Estimated duration text (for example: "~5 min") */
  timeEstimate: string;
}

/**
 * Entry type discriminator for milestone daily JSONL logs.
 */
type DailyLogEntryType =
  | "calibration"
  | "iteration"
  | "planning"
  | "queue-apply"
  | "queue-proposal"
  | "subtask-review"
  | "validation";

/**
 * Full section detail rendered for an expanded pipeline phase.
 */
interface ExpandedPhaseDetail {
  /** Optional approval gate detail shown for this phase */
  gate?: string;
  /** Inputs consumed by this phase */
  reads: Array<string>;
  /** Process steps performed by this phase */
  steps: Array<PipelineStep>;
  /** Outputs produced by this phase */
  writes: Array<string>;
}

/** Hook action types */
type HookAction = "log" | "notify" | "pause";

/**
 * Configuration for a hook
 */
interface HookConfig {
  /** Actions to execute when this hook is triggered */
  actions: Array<HookAction>;
}

/**
 * Hook configuration container
 */
interface HooksConfig {
  /** Actions to execute when a critical severity finding is detected during code review */
  onCriticalFinding?: Array<string>;
  /** Actions to execute after each build iteration completes */
  onIterationComplete?: Array<string>;
  /** Actions to execute when a subtask exceeds the retry limit */
  onMaxIterationsExceeded?: Array<string>;
  /** Actions to execute when all subtasks in a milestone are done */
  onMilestoneComplete?: Array<string>;
  /** Actions to execute when code review completes */
  onReviewComplete?: Array<string>;
  /** Actions to execute when a subtask is completed */
  onSubtaskComplete?: Array<string>;
  /** Actions to execute when pre-build validation fails */
  onValidationFail?: Array<string>;
}

/**
 * Entry in the iteration diary
 *
 * Iteration records can coexist with planning/validation/calibration records in
 * milestone-scoped daily JSONL files. Status metrics should only consume
 * iteration records.
 */
interface IterationDiaryEntry {
  /** Total cost in USD for this iteration */
  costUsd?: number;
  /** Duration of the iteration in seconds */
  duration?: number;
  /** Error messages encountered during this iteration */
  errors?: Array<string>;
  /** List of files modified during this iteration */
  filesChanged?: Array<string>;
  /** Which iteration attempt this was (1 = first try) */
  iterationNum?: number;
  /** Key findings or insights from this iteration */
  keyFindings?: Array<string>;
  /** Number of lines added during this iteration */
  linesAdded?: number;
  /** Number of lines removed during this iteration */
  linesRemoved?: number;
  /** Name of the milestone this subtask belongs to */
  milestone?: string;
  /** Execution mode: 'headless' or 'supervised' */
  mode?: "headless" | "supervised";
  /** Provider session ID */
  sessionId: string;
  /** Outcome of this iteration */
  status: IterationStatus;
  /** ID of the subtask this iteration worked on */
  subtaskId: string;
  /** Brief summary of what happened in this iteration */
  summary: string;
  /** Reference to parent task */
  taskRef?: string;
  /** ISO 8601 timestamp when this iteration completed */
  timestamp: string;
  /** Timing breakdown for this iteration */
  timing?: IterationTiming;
  /** Token usage for this iteration */
  tokenUsage?: TokenUsage;
  /** Number of tool calls made during this iteration */
  toolCalls?: number;
  /**
   * Entry type discriminator for daily log files.
   */
  type?: DailyLogEntryType;
}

/**
 * Status of an iteration
 * - completed: subtask was completed successfully
 * - failed: iteration gave up on the subtask
 * - retrying: will retry the subtask
 */
type IterationStatus = "completed" | "failed" | "retrying";

/**
 * Timing breakdown for an iteration
 * Tracks where time is spent during a Ralph build iteration
 */
interface IterationTiming {
  /** Legacy field from older diary entries (pre provider-neutral naming) */
  claudeMs?: number;
  /** Time spent in post-iteration hook (ms) */
  hookMs: number;
  /** Time spent collecting metrics (ms) */
  metricsMs: number;
  /** Time spent in provider invocation (ms) */
  providerMs?: number;
  /** Time spent generating lightweight summary (ms) */
  summaryMs: number;
}

/**
 * Subtasks payload loaded from disk with a computed replay fingerprint.
 */
interface LoadedSubtasksFile extends SubtasksFile {
  /** Current queue replay fingerprint computed from id+done snapshot */
  fingerprint: QueueFingerprint;
}

/**
 * Header metadata rendered above a pipeline preview diagram.
 */
interface PipelineHeaderData {
  /** Approval-mode summary text */
  approvalsStatus: string;
  /** Human-readable command line (without `aaa ralph`) */
  commandLine: string;
  /** Optional milestone label */
  milestone?: string;
  /** Execution mode text */
  mode: string;
  /** Optional model name shown in provider field */
  model?: string;
  /** Provider label */
  provider: string;
}

/**
 * Tree node model for pipeline phase rendering.
 */
interface PipelinePhaseNode {
  /** Expanded vs collapsed rendering mode for this phase */
  expanded: boolean;
  /** Expanded mode detail sections */
  expandedDetail: ExpandedPhaseDetail;
  /** Display name of the phase */
  name: string;
  /** Collapsed mode one-line summary */
  summary: CollapsedPhaseSummary;
}

/**
 * Renderable pipeline step entry with optional flag annotation metadata.
 */
interface PipelineStep {
  /** Optional annotation describing a flag-induced mutation */
  annotation?: StepAnnotation;
  /** Step text shown in the phase STEPS section */
  text: string;
}

/**
 * Extended configuration for post-iteration hooks
 */
interface PostIterationHookConfig extends HookConfig {
  /** Path to diary file */
  diaryPath?: string;
  /** Whether this hook is enabled */
  enabled?: boolean;
  /** Model to use for summary generation */
  model?: string;
}

/**
 * Queue proposal apply event emitted after proposal handling.
 */
interface QueueApplyLogEntry {
  afterFingerprint?: QueueFingerprint;
  applied: boolean;
  beforeFingerprint?: QueueFingerprint;
  operationCount: number;
  sessionId?: string;
  source: string;
  summary: string;
  timestamp: string;
  type: "queue-apply";
}

/** Insert a new subtask at an exact queue index. */
interface QueueCreateOperation {
  atIndex: number;
  subtask: QueueSubtaskDraft;
  type: "create";
}

/**
 * Fingerprint for replay protection when applying queue proposals.
 *
 * The hash is computed from queue order and done-state snapshots
 * (`<subtask.id>:<0|1>` joined by `|`) using SHA-256.
 */
interface QueueFingerprint {
  /** SHA-256 hex digest of queue id+done snapshot */
  hash: string;
}

/**
 * Union of deterministic queue mutation operations.
 */
type QueueOperation =
  | QueueCreateOperation
  | QueueRemoveOperation
  | QueueReorderOperation
  | QueueSplitOperation
  | QueueUpdateOperation;

/**
 * Queue mutation proposal emitted by validation/calibration.
 */
interface QueueProposal {
  /** Replay-protection snapshot captured before proposal generation */
  fingerprint: QueueFingerprint;
  /** Ordered deterministic operations to apply */
  operations: Array<QueueOperation>;
  /** Origin of proposal generation (for audit/debugging) */
  source: string;
  /** ISO 8601 timestamp for proposal generation */
  timestamp: string;
}

// =============================================================================
// Subtask Types (matches subtasks.schema.json)
// =============================================================================

/**
 * Queue proposal event emitted from validation or calibration.
 */
interface QueueProposalLogEntry {
  operationCount: number;
  proposal: QueueProposal;
  sessionId?: string;
  source: string;
  summary: string;
  timestamp: string;
  type: "queue-proposal";
}

/** Remove a pending subtask by ID. */
interface QueueRemoveOperation {
  id: string;
  type: "remove";
}

// =============================================================================
// Queue Operation Types
// =============================================================================

/** Move an existing subtask to an exact queue index. */
interface QueueReorderOperation {
  id: string;
  toIndex: number;
  type: "reorder";
}

/** Replace one subtask with multiple deterministic children. */
interface QueueSplitOperation {
  id: string;
  subtasks: Array<QueueSubtaskDraft>;
  type: "split";
}

/**
 * Minimal payload needed to create deterministic new subtasks.
 */
type QueueSubtaskDraft = {
  /** Optional explicit ID; when omitted, apply-time allocates canonical SUB-### */
  id?: string;
  /** Optional story linkage */
  storyRef?: null | string;
} & Pick<
  Subtask,
  "acceptanceCriteria" | "description" | "filesToRead" | "taskRef" | "title"
>;

/** Patch mutable fields on an existing pending subtask. */
interface QueueUpdateOperation {
  changes: Partial<
    Pick<
      Subtask,
      | "acceptanceCriteria"
      | "description"
      | "filesToRead"
      | "storyRef"
      | "title"
    >
  >;
  id: string;
  type: "update";
}

/**
 * Root structure of ralph config section in aaa.config.json
 *
 * Note: Notification config (formerly ntfy) is now in the top-level
 * notify section of aaa.config.json, not here.
 */
interface RalphConfig {
  /** Hook configuration */
  hooks?: HooksConfig;
  /** Lightweight model for summary tasks (provider-specific model string) */
  lightweightModel?: string;
  /** Default model override */
  model?: string;
  /** Default provider selection */
  provider?: ProviderType;
  /** Self-improvement configuration */
  selfImprovement?: SelfImprovementConfig;
}

/**
 * Self-improvement configuration
 */
interface SelfImprovementConfig {
  /** Mode for handling self-improvement suggestions */
  mode: "autofix" | "off" | "suggest";
}

/**
 * Annotation metadata for a single pipeline step.
 */
interface StepAnnotation {
  /** Annotation effect to render in the pipeline diagram */
  effect: "added" | "replaced" | "struck";
  /** Flag responsible for this annotation effect */
  flag: string;
}

/**
 * Individual subtask in the work queue
 * Represents atomic work units for Ralph iterations
 */
interface Subtask {
  /** Plain English descriptions of how to verify the subtask is complete */
  acceptanceCriteria: Array<string>;
  /** Git commit hash that completed this subtask */
  commitHash?: string;
  /** Git commit message - helps calibration trace intent */
  commitMessage?: string;
  /** Timestamp when subtask was completed (ISO 8601) */
  completedAt?: string;
  /** Detailed description of what needs to be implemented */
  description: string;
  /** Whether the subtask has been completed */
  done: boolean;
  /** Files and docs to read before implementing */
  filesToRead: Array<string>;
  /** Unique subtask identifier (e.g., 'SUB-001') */
  id: string;
  /** Provider session ID that completed this subtask */
  sessionId?: string;
  /** Absolute canonical path to session JSONL when known at completion time */
  sessionLogPath?: string;
  /** Repository root used to deterministically resolve session logs for this subtask */
  sessionRepoRoot?: string;
  /** Reference to grandparent story if task has one */
  storyRef?: null | string;
  /** Reference to parent task (e.g., 'TASK-001') */
  taskRef: string;
  /** Short descriptive title for commit messages and progress tracking */
  title: string;
}

/**
 * Subtask metadata for queue-level information
 */
interface SubtaskMetadata {
  /** Reference to parent milestone (e.g., 'mvp', 'beta') */
  milestoneRef?: string;
  /** Whether this queue covers a milestone or single story */
  scope?: "milestone" | "story";
  /** Reference to parent story. Required when scope is 'story'. */
  storyRef?: string;
}

/**
 * Root structure of subtasks.json
 */
interface SubtasksFile {
  /** JSON Schema reference for validation */
  $schema?: string;
  /** Optional metadata about this subtasks queue */
  metadata?: SubtaskMetadata;
  /** The queue of subtasks for autonomous agents to process */
  subtasks: Array<Subtask>;
}

/**
 * Token usage for an iteration
 * Tracks token consumption from provider session telemetry
 */
interface TokenUsage {
  /** Final context window size (input + cached tokens at last API call) */
  contextTokens: number;
  /** Output tokens generated (summed across all API calls for cost tracking) */
  outputTokens: number;
}

/**
 * Validation entry persisted to a milestone daily log file.
 */
interface ValidationLogEntry {
  aligned?: boolean;
  issueType?: string;
  milestone?: string;
  operationCount?: number;
  sessionId?: string;
  source?: string;
  subtaskId?: string;
  suggestion?: string;
  summary: string;
  taskRef?: string;
  timestamp: string;
  type: "validation";
}

/**
 * Compute replay-protection fingerprint from queue id+done state.
 */
function computeFingerprint(
  subtasks: Array<Pick<Subtask, "done" | "id">>,
): QueueFingerprint {
  const snapshot = subtasks
    .map((subtask) => `${subtask.id}:${subtask.done ? "1" : "0"}`)
    .join("|");

  return { hash: createHash("sha256").update(snapshot).digest("hex") };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Resolve provider invocation timing from either new or legacy timing fields.
 */
function getProviderTimingMs(
  timing: IterationTiming | undefined,
): number | undefined {
  if (timing === undefined) {
    return undefined;
  }

  if (typeof timing.providerMs === "number") {
    return timing.providerMs;
  }

  if (typeof timing.claudeMs === "number") {
    return timing.claudeMs;
  }

  return undefined;
}

/**
 * Normalize diary payloads for backward compatibility with legacy logs.
 */
function normalizeIterationDiaryEntry(
  entry: IterationDiaryEntry,
): IterationDiaryEntry {
  const normalizedStatus = normalizeStatus(entry.status);
  const normalizedTiming = normalizeIterationTiming(entry.timing);

  if (normalizedStatus === entry.status && normalizedTiming === entry.timing) {
    return entry;
  }

  return { ...entry, status: normalizedStatus, timing: normalizedTiming };
}

/**
 * Normalize timing payloads so legacy `claudeMs` logs expose `providerMs` too.
 */
function normalizeIterationTiming(
  timing: IterationTiming | undefined,
): IterationTiming | undefined {
  if (timing === undefined) {
    return undefined;
  }

  const providerMs = getProviderTimingMs(timing);
  if (providerMs === undefined) {
    return timing;
  }

  if (timing.providerMs === providerMs) {
    return timing;
  }

  return { ...timing, providerMs };
}

/**
 * Normalize status values for backward compatibility
 *
 * Legacy values are mapped to current values:
 * - 'success' → 'completed'
 * - 'failure' → 'failed'
 * - 'partial' → 'retrying'
 *
 * @param raw - Raw status string (may be legacy or current)
 * @returns Normalized IterationStatus value
 */
function normalizeStatus(raw: string): IterationStatus {
  switch (raw) {
    case "completed":
    case "success": {
      return "completed";
    }
    case "failed":
    case "failure": {
      return "failed";
    }
    case "partial":
    case "retrying": {
      return "retrying";
    }
    default: {
      // Safe default for unknown status values
      return "failed";
    }
  }
}

// =============================================================================
// Exports
// =============================================================================

export {
  type BuildExecutionOptions,
  type BuildOptions,
  type BuildQueueOptions,
  type CalibrationLogEntry,
  type CascadeLevel,
  type CascadeOptions,
  type CascadeResult,
  type CollapsedPhaseSummary,
  computeFingerprint,
  type DailyLogEntryType,
  type ExpandedPhaseDetail,
  getProviderTimingMs,
  type HookAction,
  type HookConfig,
  type HooksConfig,
  type IterationDiaryEntry,
  type IterationStatus,
  type IterationTiming,
  type LoadedSubtasksFile,
  normalizeIterationDiaryEntry,
  normalizeIterationTiming,
  normalizeStatus,
  type PipelineHeaderData,
  type PipelinePhaseNode,
  type PipelineStep,
  type PostIterationHookConfig,
  type QueueApplyLogEntry,
  type QueueFingerprint,
  type QueueOperation,
  type QueueProposal,
  type QueueProposalLogEntry,
  type QueueSubtaskDraft,
  type RalphConfig,
  type SelfImprovementConfig,
  type StepAnnotation,
  type Subtask,
  type SubtaskMetadata,
  type SubtasksFile,
  type TokenUsage,
  type ValidationLogEntry,
};

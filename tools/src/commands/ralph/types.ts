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

// =============================================================================
// Build State Types
// =============================================================================

/**
 * Options for the build loop
 */
interface BuildOptions {
  /** Pause between iterations for user confirmation */
  interactive: boolean;
  /** Maximum retry attempts per subtask */
  maxIterations: number;
  /** Execution mode: supervised (watch) or headless (JSON capture) */
  mode: "headless" | "supervised";
  /** Path to subtasks.json file */
  subtasksPath: string;
  /** Run pre-build validation before starting */
  validateFirst: boolean;
}

// =============================================================================
// Ralph Configuration Types (matches ralph-config.schema.json)
// =============================================================================

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
  /** Actions to execute after each build iteration completes */
  onIterationComplete?: Array<string>;
  /** Actions to execute when a subtask exceeds the retry limit */
  onMaxIterationsExceeded?: Array<string>;
  /** Actions to execute when all subtasks in a milestone are done */
  onMilestoneComplete?: Array<string>;
  /** Actions to execute when pre-build validation fails */
  onValidationFail?: Array<string>;
}

/**
 * Entry in the iteration diary (logs/iterations.jsonl)
 * Tracks Ralph iteration outcomes for status reporting and calibration
 */
interface IterationDiaryEntry {
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
  /** Name of the milestone this subtask belongs to */
  milestone?: string;
  /** Claude Code session ID */
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
  /** Number of tool calls made during this iteration */
  toolCalls?: number;
}

/**
 * Status of an iteration
 * - completed: subtask was completed successfully
 * - failed: iteration gave up on the subtask
 * - retrying: will retry the subtask
 */
type IterationStatus = "completed" | "failed" | "retrying";

/**
 * ntfy push notification configuration
 */
interface NtfyConfig {
  /** ntfy server URL */
  server: string;
  /** ntfy topic to publish to */
  topic: string;
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
  /** Pause after every iteration */
  pauseAlways?: boolean;
  /** Pause when iteration fails */
  pauseOnFailure?: boolean;
  /** Pause when iteration succeeds */
  pauseOnSuccess?: boolean;
}

/**
 * Root structure of ralph.config.json
 */
interface RalphConfig {
  /** Hook configuration */
  hooks?: HooksConfig;
  /** ntfy push notification configuration */
  ntfy?: NtfyConfig;
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

// =============================================================================
// Subtask Types (matches subtasks.schema.json)
// =============================================================================

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
  /** Claude Code session ID that completed this subtask */
  sessionId?: string;
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
  /** Optional metadata about this subtasks queue */
  metadata?: SubtaskMetadata;
  /** The queue of subtasks for autonomous agents to process */
  subtasks: Array<Subtask>;
}

// =============================================================================
// Utility Functions
// =============================================================================

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
  type BuildOptions,
  type HookAction,
  type HookConfig,
  type HooksConfig,
  type IterationDiaryEntry,
  type IterationStatus,
  normalizeStatus,
  type NtfyConfig,
  type PostIterationHookConfig,
  type RalphConfig,
  type SelfImprovementConfig,
  type Subtask,
  type SubtaskMetadata,
  type SubtasksFile,
};

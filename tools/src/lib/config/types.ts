import { z } from "zod";

// =============================================================================
// Priority Type (reused from notify/types.ts)
// =============================================================================

/**
 * Notification priority levels
 * Maps to ntfy numeric values: min=1, low=2, default=3, high=4, max=5
 */
const priorities = ["min", "low", "default", "high", "max"] as const;
type Priority = (typeof priorities)[number];

const prioritySchema = z.enum(priorities);

// =============================================================================
// Notify Section
// =============================================================================

/**
 * Quiet hours configuration
 * During quiet hours, notifications are sent with low priority (no sound)
 */
interface QuietHoursConfig {
  /** Whether quiet hours are enabled */
  enabled: boolean;
  /** Hour to end quiet hours (0-23) */
  endHour: number;
  /** Hour to start quiet hours (0-23) */
  startHour: number;
}

const quietHoursSchema = z.object({
  enabled: z.boolean(),
  endHour: z.number().int().min(0).max(23),
  startHour: z.number().int().min(0).max(23),
});

/**
 * Event-specific notification configuration
 * Allows routing different events to different topics with different priorities
 */
interface EventConfig {
  /** Whether this event is enabled (defaults to true if omitted) */
  enabled?: boolean;
  /** Override priority for this event */
  priority?: Priority;
  /** Optional tags for the notification */
  tags?: Array<string>;
  /** Override topic for this event */
  topic?: string;
}

const eventConfigSchema = z.object({
  enabled: z.boolean().optional(),
  priority: prioritySchema.optional(),
  tags: z.array(z.string()).optional(),
  topic: z.string().optional(),
});

/**
 * Notify section of the unified config
 */
interface NotifySection {
  /** Default priority when not specified per-event */
  defaultPriority?: Priority;
  /** Default topic when not specified per-event */
  defaultTopic?: string;
  /** Whether notifications are enabled globally */
  enabled?: boolean;
  /** Event-specific routing configuration */
  events?: Record<string, EventConfig>;
  /** Quiet hours configuration */
  quietHours?: QuietHoursConfig;
  /** ntfy server URL */
  server?: string;
  /** Default notification title */
  title?: string;
  /** ntfy username for Basic Auth */
  username?: string;
}

const notifySectionSchema = z.object({
  defaultPriority: prioritySchema.optional(),
  defaultTopic: z.string().optional(),
  enabled: z.boolean().optional(),
  events: z.record(z.string(), eventConfigSchema).optional(),
  quietHours: quietHoursSchema.optional(),
  server: z.string().url().optional(),
  title: z.string().optional(),
  username: z.string().optional(),
});

// =============================================================================
// Ralph Section
// =============================================================================

/** Hook action types */
type HookAction = "log" | "notify" | "pause";

const hookActionSchema = z.enum(["log", "notify", "pause"]);

/**
 * Hook configuration for Ralph build lifecycle events
 */
interface HooksConfig {
  /** Actions to execute after each build iteration completes */
  onIterationComplete?: Array<HookAction>;
  /** Actions to execute when a subtask exceeds the retry limit */
  onMaxIterationsExceeded?: Array<HookAction>;
  /** Actions to execute when all subtasks in a milestone are done */
  onMilestoneComplete?: Array<HookAction>;
  /** Actions to execute when a subtask is completed */
  onSubtaskComplete?: Array<HookAction>;
  /** Actions to execute when pre-build validation fails */
  onValidationFail?: Array<HookAction>;
}

const hooksConfigSchema = z.object({
  onIterationComplete: z.array(hookActionSchema).optional(),
  onMaxIterationsExceeded: z.array(hookActionSchema).optional(),
  onMilestoneComplete: z.array(hookActionSchema).optional(),
  onSubtaskComplete: z.array(hookActionSchema).optional(),
  onValidationFail: z.array(hookActionSchema).optional(),
});

/**
 * Self-improvement mode for Ralph
 */
type SelfImprovementMode = "autofix" | "off" | "suggest";

const selfImprovementModeSchema = z.enum(["autofix", "off", "suggest"]);

/**
 * Approval mode for artifact creation gates
 * - "always": Explicit approval required; prompt in TTY or exit with unstaged in headless
 * - "auto": Immediate write without prompting (fastest, good for trusted automation)
 * - "suggest": Show artifact and pause; prompt in TTY or notify-wait in headless
 */
type ApprovalMode = "always" | "auto" | "suggest";

const approvalModeSchema = z.enum(["always", "auto", "suggest"]);

/**
 * Approval gate names - artifact creation events that can trigger approval
 */
const approvalGates = [
  "correctionTasks",
  "createAtomicDocs",
  "createRoadmap",
  "createStories",
  "createSubtasks",
  "createTasks",
  "onDriftDetected",
  "promptChanges",
] as const;

type ApprovalGate = (typeof approvalGates)[number];

/**
 * Approval configuration for artifact creation gates
 *
 * Gates define checkpoints where Ralph can pause for user approval before
 * creating artifacts. Each gate can be set to a different approval mode.
 *
 * Gate triggers:
 * - createRoadmap: Generating roadmap.md
 * - createStories: Generating story files
 * - createTasks: Generating task files
 * - createSubtasks: Generating subtasks.json
 * - createAtomicDocs: Generating @context docs
 * - onDriftDetected: Calibration detects drift
 * - correctionTasks: Creating correction tasks from drift
 * - promptChanges: Modifying prompt files
 */
interface ApprovalsConfig {
  /** Approval mode when modifying correction tasks */
  correctionTasks?: ApprovalMode;
  /** Approval mode when generating @context docs */
  createAtomicDocs?: ApprovalMode;
  /** Approval mode when generating roadmap.md */
  createRoadmap?: ApprovalMode;
  /** Approval mode when generating story files */
  createStories?: ApprovalMode;
  /** Approval mode when generating subtasks.json */
  createSubtasks?: ApprovalMode;
  /** Approval mode when generating task files */
  createTasks?: ApprovalMode;
  /** Approval mode when calibration detects drift */
  onDriftDetected?: ApprovalMode;
  /** Approval mode when modifying prompt files */
  promptChanges?: ApprovalMode;
  /** Seconds to wait in suggest mode before proceeding (default: 180) */
  suggestWaitSeconds?: number;
}

const approvalsConfigSchema = z.object({
  correctionTasks: approvalModeSchema.optional(),
  createAtomicDocs: approvalModeSchema.optional(),
  createRoadmap: approvalModeSchema.optional(),
  createStories: approvalModeSchema.optional(),
  createSubtasks: approvalModeSchema.optional(),
  createTasks: approvalModeSchema.optional(),
  onDriftDetected: approvalModeSchema.optional(),
  promptChanges: approvalModeSchema.optional(),
  suggestWaitSeconds: z.number().int().min(0).optional(),
});

/**
 * Self-improvement configuration
 */
interface SelfImprovementConfig {
  /** Mode for handling self-improvement suggestions */
  mode?: SelfImprovementMode;
}

const selfImprovementConfigSchema = z.object({
  mode: selfImprovementModeSchema.optional(),
});

/**
 * Timeout configuration for Ralph build processes
 *
 * Two-layer detection system:
 * - Stall detection: Catches stuck processes fast (no stderr output)
 * - Hard timeout: Safety net for edge cases (total elapsed time)
 */
interface TimeoutsConfig {
  /** Grace period in seconds before SIGKILL after SIGTERM (default: 5) */
  graceSeconds?: number;
  /** Hard timeout in minutes - safety net for edge cases (default: 60) */
  hardMinutes?: number;
  /** Stall detection threshold in minutes - no stderr output (default: 10) */
  stallMinutes?: number;
}

const timeoutsConfigSchema = z.object({
  graceSeconds: z.number().int().min(1).optional(),
  hardMinutes: z.number().int().min(1).optional(),
  stallMinutes: z.number().int().min(1).optional(),
});

/**
 * Build configuration for Ralph
 */
interface BuildConfig {
  /** Run calibration every N iterations (0 = disabled) */
  calibrateEvery?: number;
  /** Maximum iterations per subtask (0 = unlimited) */
  maxIterations?: number;
}

const buildConfigSchema = z.object({
  calibrateEvery: z.number().int().min(0).optional(),
  maxIterations: z.number().int().min(0).optional(),
});

/**
 * Ralph section of the unified config
 */
/** Valid provider values for Ralph config */
type RalphProvider =
  | "claude"
  | "codex"
  | "cursor"
  | "gemini"
  | "opencode"
  | "pi";

interface RalphSection {
  /** Approvals configuration */
  approvals?: ApprovalsConfig;
  /** Build configuration */
  build?: BuildConfig;
  /** Hook configuration */
  hooks?: HooksConfig;
  /** Lightweight model for summary tasks */
  lightweightModel?: string;
  /** Default model override */
  model?: string;
  /** Default provider selection */
  provider?: RalphProvider;
  /** Self-improvement configuration */
  selfImprovement?: SelfImprovementConfig;
  /** Timeout configuration for build processes */
  timeouts?: TimeoutsConfig;
}

const ralphProviderSchema = z.enum([
  "claude",
  "codex",
  "cursor",
  "gemini",
  "opencode",
  "pi",
]);

const ralphSectionSchema = z.object({
  approvals: approvalsConfigSchema.optional(),
  build: buildConfigSchema.optional(),
  hooks: hooksConfigSchema.optional(),
  lightweightModel: z.string().optional(),
  model: z.string().optional(),
  provider: ralphProviderSchema.optional(),
  selfImprovement: selfImprovementConfigSchema.optional(),
  timeouts: timeoutsConfigSchema.optional(),
});

// =============================================================================
// Review Section
// =============================================================================

/**
 * Review section of the unified config
 */
interface ReviewSection {
  /** Severity threshold for auto-fix suggestions */
  autoFixThreshold?: number;
  /** Path to the review diary file */
  diaryPath?: string;
}

const reviewSectionSchema = z.object({
  autoFixThreshold: z.number().int().min(1).max(5).optional(),
  diaryPath: z.string().optional(),
});

// =============================================================================
// Research Section
// =============================================================================

/**
 * GitHub research configuration
 */
interface GithubResearchConfig {
  /** Maximum number of results to fetch */
  maxResults?: number;
}

const githubResearchConfigSchema = z.object({
  maxResults: z.number().int().min(1).optional(),
});

/**
 * Parallel search configuration
 */
interface ParallelResearchConfig {
  /** Maximum number of results to fetch */
  maxResults?: number;
}

const parallelResearchConfigSchema = z.object({
  maxResults: z.number().int().min(1).optional(),
});

/**
 * Research section of the unified config
 */
interface ResearchSection {
  /** GitHub search configuration */
  github?: GithubResearchConfig;
  /** Output directory for research results */
  outputDir?: string;
  /** Parallel search configuration */
  parallel?: ParallelResearchConfig;
}

const researchSectionSchema = z.object({
  github: githubResearchConfigSchema.optional(),
  outputDir: z.string().optional(),
  parallel: parallelResearchConfigSchema.optional(),
});

// =============================================================================
// Unified AaaConfig
// =============================================================================

/**
 * Unified configuration for the entire aaa CLI
 * All commands read from this single config file (aaa.config.json)
 */
interface AaaConfig {
  /** JSON Schema reference for IDE support */
  $schema?: string;
  /** Enable debug mode across all commands */
  debug?: boolean;
  /** Notification configuration */
  notify?: NotifySection;
  /** Ralph autonomous build configuration */
  ralph?: RalphSection;
  /** Research command configuration */
  research?: ResearchSection;
  /** Code review configuration */
  review?: ReviewSection;
}

const aaaConfigSchema = z.object({
  $schema: z.string().optional(),
  debug: z.boolean().optional(),
  notify: notifySectionSchema.optional(),
  ralph: ralphSectionSchema.optional(),
  research: researchSectionSchema.optional(),
  review: reviewSectionSchema.optional(),
});

// =============================================================================
// Exports
// =============================================================================

export {
  type AaaConfig,
  aaaConfigSchema,
  type ApprovalGate,
  approvalGates,
  type ApprovalMode,
  approvalModeSchema,
  type ApprovalsConfig,
  approvalsConfigSchema,
  type BuildConfig,
  buildConfigSchema,
  type EventConfig,
  eventConfigSchema,
  type GithubResearchConfig,
  githubResearchConfigSchema,
  type HookAction,
  hookActionSchema,
  type HooksConfig,
  hooksConfigSchema,
  type NotifySection,
  notifySectionSchema,
  type ParallelResearchConfig,
  parallelResearchConfigSchema,
  priorities,
  type Priority,
  prioritySchema,
  type QuietHoursConfig,
  quietHoursSchema,
  type RalphProvider,
  ralphProviderSchema,
  type RalphSection,
  ralphSectionSchema,
  type ResearchSection,
  researchSectionSchema,
  type ReviewSection,
  reviewSectionSchema,
  type SelfImprovementConfig,
  selfImprovementConfigSchema,
  type SelfImprovementMode,
  selfImprovementModeSchema,
  type TimeoutsConfig,
  timeoutsConfigSchema,
};

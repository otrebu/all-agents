import type {
  AaaConfig,
  ApprovalsConfig,
  DryRunConfig,
  NotifySection,
  RalphSection,
  ResearchSection,
  ReviewSection,
  TimeoutsConfig,
} from "./types";

/**
 * Default notify section configuration
 */
export const DEFAULT_NOTIFY: NotifySection = {
  defaultPriority: "high",
  defaultTopic: "",
  enabled: true,
  events: {
    "claude:permissionPrompt": { priority: "max", tags: ["warning"] },
    "claude:stop": { enabled: false },
    "ralph:maxIterationsExceeded": {
      priority: "max",
      tags: ["rotating_light"],
    },
    "ralph:milestoneComplete": { priority: "high", tags: ["tada"] },
    "ralph:subtaskComplete": { priority: "default" },
    "ralph:validationFail": { priority: "high", tags: ["warning"] },
  },
  quietHours: { enabled: false, endHour: 8, startHour: 22 },
  server: "https://ntfy.sh",
  title: "aaa notify",
  username: "admin",
};

/**
 * Default approvals configuration
 *
 * Gate defaults provide sensible safety for new users:
 * - createStories: "always" - stories define scope, require explicit approval
 * - createTasks: "suggest" - tasks are reviewed but auto-proceed after timeout
 * - createSubtasks: "auto" - subtasks are low-risk, write immediately
 * - onDriftDetected: "always" - drift is important, require explicit approval
 *
 * Gates not listed here default to undefined at runtime and fall back to
 * "suggest" via the ?? operator in approval-checking code.
 */
export const DEFAULT_APPROVALS: ApprovalsConfig = {
  createStories: "always",
  createSubtasks: "auto",
  createTasks: "suggest",
  onDriftDetected: "always",
  suggestWaitSeconds: 180,
};

/**
 * Default timeout configuration for Ralph build processes
 *
 * Two-layer detection:
 * - stallMinutes: Catches stuck processes fast (no stderr output for 25min)
 * - hardMinutes: Safety net for edge cases (60min total elapsed)
 * - graceSeconds: Time to wait after SIGTERM before SIGKILL (5s)
 */
export const DEFAULT_TIMEOUTS: TimeoutsConfig = {
  graceSeconds: 5,
  hardMinutes: 60,
  stallMinutes: 25,
};

/**
 * Default dry-run rendering behavior.
 */
export const DEFAULT_DRY_RUN: DryRunConfig = { format: "pretty" };

/**
 * Default ralph section configuration
 */
export const DEFAULT_RALPH: RalphSection = {
  approvals: DEFAULT_APPROVALS,
  build: { calibrateEvery: 0, maxIterations: 3 },
  dryRun: DEFAULT_DRY_RUN,
  hooks: {
    onIterationComplete: ["log"],
    onMaxIterationsExceeded: ["log", "notify", "pause"],
    onMilestoneComplete: ["log", "notify"],
    onSubtaskComplete: ["log"],
    onValidationFail: ["log", "notify"],
  },
  selfImprovement: { mode: "suggest" },
  timeouts: DEFAULT_TIMEOUTS,
};

/**
 * Default research section configuration
 */
export const DEFAULT_RESEARCH: ResearchSection = {
  github: { maxResults: 10 },
  outputDir: "docs/research",
  parallel: { maxResults: 15 },
};

/**
 * Default review section configuration
 */
export const DEFAULT_REVIEW: ReviewSection = {
  autoFixThreshold: 3,
  diaryPath: "logs/reviews.jsonl",
};

/**
 * Default configuration for the aaa CLI
 * All sections have sensible defaults that work out of the box
 */
export const DEFAULT_AAA_CONFIG: AaaConfig = {
  debug: false,
  notify: DEFAULT_NOTIFY,
  ralph: DEFAULT_RALPH,
  research: DEFAULT_RESEARCH,
  review: DEFAULT_REVIEW,
};

import type {
  AaaConfig,
  NotifySection,
  RalphSection,
  ResearchSection,
  ReviewSection,
} from "./types";

/**
 * Default notify section configuration
 */
export const DEFAULT_NOTIFY: NotifySection = {
  defaultPriority: "default",
  defaultTopic: "",
  enabled: true,
  events: {},
  quietHours: { enabled: false, endHour: 8, startHour: 22 },
  server: "https://ntfy.sh",
  title: "aaa",
};

/**
 * Default ralph section configuration
 */
export const DEFAULT_RALPH: RalphSection = {
  build: { calibrateEvery: 0, maxIterations: 3 },
  hooks: {
    onIterationComplete: ["log"],
    onMaxIterationsExceeded: ["log", "notify", "pause"],
    onMilestoneComplete: ["log", "notify"],
    onSubtaskComplete: ["log"],
    onValidationFail: ["log", "notify"],
  },
  selfImprovement: { mode: "suggest" },
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

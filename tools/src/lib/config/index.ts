/**
 * Unified configuration for the aaa CLI
 *
 * This module provides:
 * - loadAaaConfig() - Load configuration with fallback to legacy files
 * - DEFAULT_AAA_CONFIG - Default values for all sections
 * - env - Typed environment variables for secrets
 * - Type exports for all config sections
 *
 * @example
 * ```typescript
 * import { loadAaaConfig, env } from "@tools/lib/config";
 *
 * const config = loadAaaConfig();
 * const password = env.NTFY_PASSWORD; // From environment
 * const topic = config.notify?.defaultTopic; // From config file
 * ```
 */

// Defaults
export {
  DEFAULT_AAA_CONFIG,
  DEFAULT_NOTIFY,
  DEFAULT_RALPH,
  DEFAULT_RESEARCH,
  DEFAULT_REVIEW,
} from "./defaults";

// Environment variables
export { env, type Env, envSchema } from "./env";

// Loader
export { CONFIG_FILENAME, loadAaaConfig } from "./loader";

// Types
export {
  type AaaConfig,
  aaaConfigSchema,
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
} from "./types";

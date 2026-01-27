/**
 * Unified configuration loader for the aaa CLI
 *
 * This module provides:
 * - loadAaaConfig() - Load from aaa.config.json with fallback to legacy files
 * - Deep merging with defaults for missing fields
 * - Zod validation with graceful error handling
 *
 * @see .claude/plans/linked-snuggling-locket.md
 */

import { findProjectRoot } from "@tools/utils/paths";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type {
  AaaConfig,
  HooksConfig,
  NotifySection,
  Priority,
  QuietHoursConfig,
  RalphSection,
  ResearchSection,
  ReviewSection,
  SelfImprovementConfig,
} from "./types";

import {
  DEFAULT_AAA_CONFIG,
  DEFAULT_NOTIFY,
  DEFAULT_RALPH,
  DEFAULT_RESEARCH,
  DEFAULT_REVIEW,
} from "./defaults";
import { aaaConfigSchema } from "./types";

// =============================================================================
// Constants
// =============================================================================

/** Primary config file name */
const CONFIG_FILENAME = "aaa.config.json";

/** Legacy Ralph config path (project root) */
const LEGACY_RALPH_CONFIG = "ralph.config.json";

/** Legacy notify config path (user home) */
const LEGACY_NOTIFY_CONFIG = join(homedir(), ".config", "aaa", "notify.json");

// =============================================================================
// Types
// =============================================================================

/** Legacy notify config structure */
interface LegacyNotifyConfig {
  defaultPriority?: Priority;
  enabled?: boolean;
  quietHours?: QuietHoursConfig;
  server?: string;
  title?: string;
  topic?: string;
}

/** Legacy ralph config structure */
interface LegacyRalphConfig {
  hooks?: HooksConfig;
  selfImprovement?: SelfImprovementConfig;
}

// =============================================================================
// Main Loader
// =============================================================================

/**
 * Load unified aaa configuration
 *
 * Resolution order:
 * 1. aaa.config.json in project root
 * 2. Fallback to legacy files (ralph.config.json, ~/.config/aaa/notify.json) with deprecation warning
 * 3. Use defaults if nothing found
 *
 * Error handling:
 * - Invalid JSON logs warning and returns defaults (does not throw)
 * - Invalid schema logs warning and returns defaults (does not throw)
 * - Missing file returns defaults silently
 *
 * @param configPath - Optional override path (for testing)
 * @returns Complete AaaConfig with all fields populated via deep merge with defaults
 */
function loadAaaConfig(configPath?: string): AaaConfig {
  const projectRoot = findProjectRoot() ?? process.cwd();
  const primaryPath = configPath ?? join(projectRoot, CONFIG_FILENAME);

  // Try primary config file
  if (existsSync(primaryPath)) {
    try {
      const content = readFileSync(primaryPath, "utf8");
      const parsed = JSON.parse(content) as Partial<AaaConfig>;

      // Validate with Zod
      const result = aaaConfigSchema.safeParse(parsed);

      if (!result.success) {
        console.warn(
          `Warning: Invalid ${CONFIG_FILENAME} (using defaults):`,
          result.error.flatten().fieldErrors,
        );
        return { ...DEFAULT_AAA_CONFIG };
      }

      // Deep merge with defaults for each section
      return mergeWithDefaults(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Warning: Failed to parse ${CONFIG_FILENAME} (using defaults):`,
        message,
      );
      return { ...DEFAULT_AAA_CONFIG };
    }
  }

  // Try legacy config files
  const legacyNotify = loadLegacyNotifyConfig();
  const legacyRalph = loadLegacyRalphConfig(projectRoot);

  if (legacyRalph !== null || legacyNotify !== null) {
    const merged: Partial<AaaConfig> = { ...legacyRalph, ...legacyNotify };
    return mergeWithDefaults(merged);
  }

  // No config found - return defaults
  return { ...DEFAULT_AAA_CONFIG };
}

// =============================================================================
// Legacy Config Loading
// =============================================================================

/**
 * Attempt to load legacy ~/.config/aaa/notify.json and convert to AaaConfig format
 *
 * @returns Partial AaaConfig with notify section, or null if not found
 */
function loadLegacyNotifyConfig(): null | Partial<AaaConfig> {
  if (!existsSync(LEGACY_NOTIFY_CONFIG)) {
    return null;
  }

  try {
    const content = readFileSync(LEGACY_NOTIFY_CONFIG, "utf8");
    const parsed = JSON.parse(content) as LegacyNotifyConfig;

    console.warn(
      `Warning: ~/.config/aaa/notify.json is deprecated. Migrate to ${CONFIG_FILENAME}`,
    );

    // Map legacy format to new format
    // Legacy has: topic, title, server, defaultPriority, quietHours, enabled
    // New has: defaultTopic (not topic), same for others
    const notify: NotifySection = {
      defaultPriority: parsed.defaultPriority,
      defaultTopic: parsed.topic,
      enabled: parsed.enabled,
      quietHours: parsed.quietHours,
      server: parsed.server,
      title: parsed.title,
    };
    return { notify };
  } catch {
    // Invalid JSON - skip legacy file
    return null;
  }
}

/**
 * Attempt to load legacy ralph.config.json and convert to AaaConfig format
 *
 * @returns Partial AaaConfig with ralph section, or null if not found
 */
function loadLegacyRalphConfig(projectRoot: string): null | Partial<AaaConfig> {
  const legacyPath = join(projectRoot, LEGACY_RALPH_CONFIG);

  if (!existsSync(legacyPath)) {
    return null;
  }

  try {
    const content = readFileSync(legacyPath, "utf8");
    const parsed = JSON.parse(content) as LegacyRalphConfig;

    console.warn(
      `Warning: ralph.config.json is deprecated. Migrate to ${CONFIG_FILENAME}`,
    );

    // Map legacy format to new format
    const ralph: RalphSection = {
      hooks: parsed.hooks,
      selfImprovement: parsed.selfImprovement,
    };
    return { ralph };
  } catch {
    // Invalid JSON - skip legacy file
    return null;
  }
}

// =============================================================================
// Deep Merge Utility
// =============================================================================

/**
 * Deep merge two objects, with source overriding target
 *
 * - Handles nested objects recursively
 * - Arrays are replaced, not merged
 * - undefined in source preserves target
 *
 * @internal Exported for testing purposes
 */
function mergeDeep<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    // Skip undefined values - preserve target
    if (sourceValue === undefined) {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (
      sourceValue !== null &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge nested objects
      (result as Record<keyof T, unknown>)[key] = mergeDeep(
        targetValue as object,
        sourceValue as Partial<typeof targetValue>,
      );
    } else {
      // Overwrite with source value (including null)
      (result as Record<keyof T, unknown>)[key] = sourceValue;
    }
  }

  return result;
}

// =============================================================================
// Section Mergers
// =============================================================================

function mergeNotify(
  defaultValue: NotifySection,
  userValue?: NotifySection,
): NotifySection {
  if (!userValue) return defaultValue;
  return {
    ...defaultValue,
    ...userValue,
    quietHours: userValue.quietHours
      ? { ...defaultValue.quietHours, ...userValue.quietHours }
      : defaultValue.quietHours,
  };
}

function mergeRalph(
  defaultValue: RalphSection,
  userValue?: RalphSection,
): RalphSection {
  if (!userValue) return defaultValue;
  return {
    ...defaultValue,
    ...userValue,
    build: userValue.build
      ? { ...defaultValue.build, ...userValue.build }
      : defaultValue.build,
    hooks: userValue.hooks
      ? { ...defaultValue.hooks, ...userValue.hooks }
      : defaultValue.hooks,
    selfImprovement: userValue.selfImprovement
      ? { ...defaultValue.selfImprovement, ...userValue.selfImprovement }
      : defaultValue.selfImprovement,
  };
}

function mergeResearch(
  defaultValue: ResearchSection,
  userValue?: ResearchSection,
): ResearchSection {
  if (!userValue) return defaultValue;
  return {
    ...defaultValue,
    ...userValue,
    github: userValue.github
      ? { ...defaultValue.github, ...userValue.github }
      : defaultValue.github,
    parallel: userValue.parallel
      ? { ...defaultValue.parallel, ...userValue.parallel }
      : defaultValue.parallel,
  };
}

function mergeReview(
  defaultValue: ReviewSection,
  userValue?: ReviewSection,
): ReviewSection {
  if (!userValue) return defaultValue;
  return { ...defaultValue, ...userValue };
}

/**
 * Deep merge user config with defaults
 *
 * Each section is merged independently to preserve nested structures
 */
function mergeWithDefaults(userConfig: Partial<AaaConfig>): AaaConfig {
  return {
    $schema: userConfig.$schema,
    debug: userConfig.debug ?? DEFAULT_AAA_CONFIG.debug,
    notify: mergeNotify(DEFAULT_NOTIFY, userConfig.notify),
    ralph: mergeRalph(DEFAULT_RALPH, userConfig.ralph),
    research: mergeResearch(DEFAULT_RESEARCH, userConfig.research),
    review: mergeReview(DEFAULT_REVIEW, userConfig.review),
  };
}

// =============================================================================
// Exports
// =============================================================================

export { CONFIG_FILENAME, LEGACY_NOTIFY_CONFIG, loadAaaConfig, mergeDeep };

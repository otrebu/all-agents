/**
 * Effect-based configuration management for the notify command
 *
 * Provides:
 * - Effect-based config loading and saving
 * - Quiet hours logic as Effect combinators
 * - Integration with ConfigService
 *
 * @module
 */

/* eslint-disable import/exports-last */

import type {
  FileNotFoundError,
  FileReadError,
  PathResolutionError,
} from "@tools/lib/effect";

import {
  CONFIG_FILENAME,
  DEFAULT_NOTIFY,
  type NotifySection,
} from "@tools/lib/config";
import { Config, FileSystem, FileWriteError } from "@tools/lib/effect";
import { findProjectRoot } from "@tools/utils/paths";
import { Effect } from "effect";
import { join } from "node:path";

import type { NotifyConfig, Priority, QuietHoursConfig } from "./types";

import { notifyConfigSchema } from "./types";

// =============================================================================
// Constants
// =============================================================================

/**
 * Default notify configuration
 * Maps from unified config defaults to the legacy NotifyConfig interface
 */
export const DEFAULT_NOTIFY_CONFIG: NotifyConfig = {
  $schemaVersion: 1,
  defaultPriority: "high",
  enabled: true,
  quietHours: { enabled: false, endHour: 8, startHour: 22 },
  server: "https://ntfy.sh",
  title: "aaa notify",
  topic: "",
  username: "admin",
};

// =============================================================================
// Effect Functions - Config Loading
// =============================================================================

/**
 * Get the config path for the current context
 * Returns aaa.config.json in project root
 */
export function getConfigPathEffect(): Effect.Effect<string> {
  return Effect.sync(() => {
    const projectRoot = findProjectRoot() ?? process.cwd();
    return join(projectRoot, CONFIG_FILENAME);
  });
}

/**
 * Synchronous check for quiet hours (utility function)
 */
export function isInQuietHoursSync(
  config: QuietHoursConfig,
  now: Date = new Date(),
): boolean {
  if (!config.enabled) return false;

  const hour = now.getHours();
  const { endHour, startHour } = config;

  // Edge case: start === end means disabled
  if (startHour === endHour) return false;

  // Spans midnight (22:00 - 08:00)
  if (startHour > endHour) {
    return hour >= startHour || hour < endHour;
  }

  // Same day (01:00 - 06:00)
  return hour >= startHour && hour < endHour;
}

/**
 * Load notify configuration using ConfigService
 *
 * Uses the unified config loader and extracts the notify section.
 *
 * @returns Effect yielding NotifyConfig
 */
export function loadNotifyConfigEffect(): Effect.Effect<
  NotifyConfig,
  never,
  Config
> {
  return Effect.gen(function* loadConfig() {
    const configService = yield* Config;

    // Use unified config loader - loadWithDefaults never fails
    const aaaConfig = yield* configService.loadWithDefaults();
    const notify = aaaConfig.notify ?? DEFAULT_NOTIFY;

    // Map the unified NotifySection to the NotifyConfig interface
    return mapNotifySectionToConfig(notify);
  });
}

/**
 * Resolve priority with quiet hours fallback
 *
 * @param options - Priority resolution options
 * @returns Effect yielding resolved priority
 */
export function resolvePriorityEffect(options: {
  cliPriority?: Priority;
  defaultPriority: Priority;
  envPriority?: Priority;
  eventPriority?: Priority;
  quietHours: QuietHoursConfig;
}): Effect.Effect<Priority> {
  const {
    cliPriority,
    defaultPriority,
    envPriority,
    eventPriority,
    quietHours,
  } = options;

  return Effect.sync(() => {
    // CLI flag has highest priority
    if (cliPriority !== undefined) {
      return cliPriority;
    }
    // Event config priority
    if (eventPriority !== undefined) {
      return eventPriority;
    }
    // Environment variable priority
    if (envPriority !== undefined) {
      return envPriority;
    }
    // Quiet hours check - use low during quiet hours
    if (isInQuietHoursSync(quietHours)) {
      return "low";
    }
    // Config default
    return defaultPriority;
  });
}

/**
 * Save notify configuration to aaa.config.json
 *
 * Writes the notify section to the unified config file.
 *
 * @param config - Configuration to save
 * @returns Effect that completes on success or fails with FileWriteError
 */
export function saveNotifyConfigEffect(
  config: NotifyConfig,
): Effect.Effect<
  void,
  FileNotFoundError | FileReadError | FileWriteError | PathResolutionError,
  FileSystem
> {
  return Effect.gen(function* saveConfig() {
    const fs = yield* FileSystem;

    // Validate before saving
    const result = notifyConfigSchema.safeParse(config);
    if (!result.success) {
      yield* Effect.fail(
        new FileWriteError({
          message: `Invalid config: ${result.error.message}`,
          path: "aaa.config.json",
        }),
      );
      // Never reached but needed for type inference
      return;
    }

    // Get config path
    const projectRoot = findProjectRoot() ?? process.cwd();
    const unifiedPath = join(projectRoot, CONFIG_FILENAME);

    // Load existing config to preserve other sections
    const existingConfig = yield* fs
      .readJson<Record<string, unknown>>(unifiedPath)
      .pipe(
        Effect.catchTag("FileNotFoundError", () => Effect.succeed({})),
        Effect.catchTag("FileReadError", () => Effect.succeed({})),
      );

    /*
     * Map NotifyConfig to NotifySection format
     * Note: legacy uses topic, unified uses defaultTopic
     */
    const notifySection: NotifySection = {
      defaultPriority: config.defaultPriority,
      defaultTopic: config.topic,
      enabled: config.enabled,
      quietHours: config.quietHours,
      server: config.server,
      title: config.title,
    };

    // Merge notify section into existing config
    const updatedConfig = { ...existingConfig, notify: notifySection };

    // Write config file
    yield* fs.writeJson(unifiedPath, updatedConfig);
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map unified NotifySection to the legacy NotifyConfig interface
 */
function mapNotifySectionToConfig(notify: NotifySection): NotifyConfig {
  return {
    $schemaVersion: 1,
    defaultPriority:
      notify.defaultPriority ?? DEFAULT_NOTIFY_CONFIG.defaultPriority,
    enabled: notify.enabled ?? DEFAULT_NOTIFY_CONFIG.enabled,
    quietHours: notify.quietHours ?? DEFAULT_NOTIFY_CONFIG.quietHours,
    server: notify.server ?? DEFAULT_NOTIFY_CONFIG.server,
    title: notify.title ?? DEFAULT_NOTIFY_CONFIG.title,
    topic: notify.defaultTopic ?? DEFAULT_NOTIFY_CONFIG.topic,
    username: notify.username ?? DEFAULT_NOTIFY_CONFIG.username,
  };
}

// =============================================================================
// Re-exports
// =============================================================================

export { getConfigPath, isInQuietHours, loadNotifyConfig } from "./config";

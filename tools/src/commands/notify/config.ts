/**
 * Configuration management for the notify command
 *
 * This module provides:
 * - loadNotifyConfig() - Load notify config from unified aaa.config.json
 * - saveNotifyConfig() - Write config to aaa.config.json (or legacy path for testing)
 * - isInQuietHours() - Check if current time is within quiet hours
 *
 * Primary config: aaa.config.json in project root
 * Legacy fallback: ~/.config/aaa/notify.json (handled by unified loader)
 */

import {
  CONFIG_FILENAME,
  DEFAULT_NOTIFY,
  loadAaaConfig,
  type NotifySection,
} from "@tools/lib/config";
import { findProjectRoot } from "@tools/utils/paths";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { NotifyConfig, QuietHoursConfig } from "./types";

import { notifyConfigSchema } from "./types";

// =============================================================================
// Constants
// =============================================================================

/**
 * Legacy path to notify config file (for backward compatibility)
 */
const LEGACY_CONFIG_PATH = join(homedir(), ".config", "aaa", "notify.json");

/**
 * Default notify configuration
 * Maps from unified config defaults to the legacy NotifyConfig interface
 */
const DEFAULT_NOTIFY_CONFIG: NotifyConfig = {
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
// Functions (alphabetically sorted)
// =============================================================================

/**
 * Get the config path for the current context
 *
 * Returns aaa.config.json in project root if it exists or if the legacy
 * path doesn't exist. Falls back to legacy path if only that exists.
 */
function getConfigPath(): string {
  const projectRoot = findProjectRoot() ?? process.cwd();
  const unifiedPath = join(projectRoot, CONFIG_FILENAME);

  // Prefer unified config path if it exists or legacy doesn't exist
  if (existsSync(unifiedPath) || !existsSync(LEGACY_CONFIG_PATH)) {
    return unifiedPath;
  }

  // Fall back to legacy path only if it exists and unified doesn't
  return LEGACY_CONFIG_PATH;
}

/**
 * Check if current time is within quiet hours
 *
 * Handles both same-day spans (01:00-06:00) and overnight spans (22:00-08:00).
 *
 * @param config - Quiet hours configuration
 * @param now - Optional Date to check (defaults to current time)
 * @returns true if within quiet hours, false otherwise
 *
 * @example
 * // Overnight span: 22:00-08:00
 * isInQuietHours({ enabled: true, startHour: 22, endHour: 8 })
 * // At 23:00 → true
 * // At 03:00 → true
 * // At 10:00 → false
 *
 * @example
 * // Same-day span: 01:00-06:00
 * isInQuietHours({ enabled: true, startHour: 1, endHour: 6 })
 * // At 03:00 → true
 * // At 08:00 → false
 */
function isInQuietHours(
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
 * Load notify configuration from unified aaa.config.json
 *
 * Loads configuration from the unified config loader and extracts the notify section.
 * Falls back to legacy ~/.config/aaa/notify.json via the unified loader's fallback mechanism.
 *
 * Resolution order (handled by unified loader):
 * 1. aaa.config.json in project root
 * 2. Legacy ~/.config/aaa/notify.json with deprecation warning
 * 3. Default configuration
 *
 * @param configPath - Optional override path (for testing only). When provided,
 *                     bypasses the unified loader and reads directly from the legacy file.
 *                     This is kept for backward compatibility with existing tests.
 * @returns NotifyConfig with all fields populated
 */
function loadNotifyConfig(configPath?: string): NotifyConfig {
  // If a specific configPath is provided (testing scenario), use legacy loading
  // This maintains backward compatibility with existing tests that pass explicit paths
  if (configPath !== undefined) {
    return loadNotifyConfigLegacy(configPath);
  }

  // Use unified config loader and extract notify section
  const aaaConfig = loadAaaConfig();
  const notify = aaaConfig.notify ?? DEFAULT_NOTIFY;

  // Map the unified NotifySection to the NotifyConfig interface
  return mapNotifySectionToConfig(notify);
}

/**
 * Legacy config loading for backward compatibility with tests
 *
 * @internal
 * @param configPath - Path to legacy notify.json
 * @returns Parsed NotifyConfig object
 */
function loadNotifyConfigLegacy(configPath: string): NotifyConfig {
  if (!existsSync(configPath)) {
    return { ...DEFAULT_NOTIFY_CONFIG };
  }

  try {
    const content = readFileSync(configPath, "utf8");
    const parsed = JSON.parse(content) as Partial<NotifyConfig>;

    // Merge quietHours with defaults
    const parsedQuietHours = parsed.quietHours;
    const quietHours = parsedQuietHours
      ? { ...DEFAULT_NOTIFY_CONFIG.quietHours, ...parsedQuietHours }
      : DEFAULT_NOTIFY_CONFIG.quietHours;

    // Merge with defaults for any missing fields
    const merged = { ...DEFAULT_NOTIFY_CONFIG, ...parsed, quietHours };

    // Validate with Zod
    const result = notifyConfigSchema.safeParse(merged);
    if (!result.success) {
      throw new Error(`Invalid config: ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TypeError(`Invalid JSON in ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Map unified NotifySection to the legacy NotifyConfig interface
 *
 * Note: unified uses defaultTopic, legacy uses topic
 *
 * @internal
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

/**
 * Save notify configuration to legacy path (for testing)
 *
 * @internal
 */
function saveLegacyNotifyConfig(
  config: NotifyConfig,
  configPath: string,
): void {
  // Create parent directory if needed
  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write atomically with formatted JSON
  const content = JSON.stringify(config, null, 2);
  writeFileSync(configPath, `${content}\n`, "utf8");
}

/**
 * Save notify configuration to aaa.config.json
 *
 * Writes the notify section to the unified config file (aaa.config.json) in the
 * project root. For backward compatibility with tests, an explicit configPath can
 * be provided which writes to the legacy format.
 *
 * @param config - Configuration to save
 * @param configPath - Optional override path (for testing). When provided, writes
 *                     to that path in legacy format instead of unified config.
 * @throws Error if write fails
 */
function saveNotifyConfig(config: NotifyConfig, configPath?: string): void {
  // Validate before saving
  const result = notifyConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`);
  }

  // If explicit path provided (testing), use legacy format
  if (configPath !== undefined) {
    saveLegacyNotifyConfig(config, configPath);
    return;
  }

  // Write to unified aaa.config.json
  const projectRoot = findProjectRoot() ?? process.cwd();
  const unifiedPath = join(projectRoot, CONFIG_FILENAME);

  // Load existing config to preserve other sections
  let existingConfig: Record<string, unknown> = {};
  if (existsSync(unifiedPath)) {
    try {
      const content = readFileSync(unifiedPath, "utf8");
      existingConfig = JSON.parse(content) as Record<string, unknown>;
    } catch {
      // If file exists but can't be parsed, start fresh
    }
  }

  // Map NotifyConfig to NotifySection format
  // Note: legacy uses topic, unified uses defaultTopic
  const notifySection: NotifySection = {
    defaultPriority: config.defaultPriority,
    defaultTopic: config.topic,
    enabled: config.enabled,
    quietHours: config.quietHours,
    server: config.server,
    title: config.title,
  };

  // Merge notify section into existing config
  existingConfig.notify = notifySection;

  // Create parent directory if needed
  const dir = dirname(unifiedPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write atomically with formatted JSON
  const content = JSON.stringify(existingConfig, null, 2);
  writeFileSync(unifiedPath, `${content}\n`, "utf8");
}

// =============================================================================
// Exports
// =============================================================================

export {
  DEFAULT_NOTIFY_CONFIG,
  getConfigPath,
  isInQuietHours,
  LEGACY_CONFIG_PATH,
  loadNotifyConfig,
  saveNotifyConfig,
};

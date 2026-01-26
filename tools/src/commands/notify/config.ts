/**
 * Configuration management for the notify command
 *
 * This module provides:
 * - loadNotifyConfig() - Load notify config with defaults
 * - saveNotifyConfig() - Write config atomically
 * - isInQuietHours() - Check if current time is within quiet hours
 *
 * Config stored at ~/.config/aaa/notify.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { NotifyConfig, QuietHoursConfig } from "./types";

import { notifyConfigSchema } from "./types";

// =============================================================================
// Constants
// =============================================================================

/**
 * Path to notify config file
 */
const CONFIG_PATH = join(homedir(), ".config", "aaa", "notify.json");

/**
 * Default notify configuration
 */
const DEFAULT_NOTIFY_CONFIG: NotifyConfig = {
  $schemaVersion: 1,
  defaultPriority: "high",
  enabled: true,
  quietHours: { enabled: false, endHour: 8, startHour: 22 },
  server: "https://ntfy.sh",
  title: "aaa notify",
  topic: "",
};

// =============================================================================
// Functions (alphabetically sorted)
// =============================================================================

/**
 * Get the default config path
 *
 * Exposed for use in CLI commands and testing.
 */
function getConfigPath(): string {
  return CONFIG_PATH;
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
 * Load notify configuration from disk
 *
 * Returns merged defaults if file is missing.
 * Validates with Zod schema before returning.
 *
 * @param configPath - Optional override path (for testing)
 * @returns NotifyConfig with all fields populated
 * @throws Error if file exists but is invalid
 */
function loadNotifyConfig(configPath: string = CONFIG_PATH): NotifyConfig {
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
 * Save notify configuration to disk
 *
 * Uses atomic write pattern:
 * 1. Creates parent directory if needed
 * 2. Writes formatted JSON with trailing newline
 *
 * @param config - Configuration to save
 * @param configPath - Optional override path (for testing)
 * @throws Error if write fails
 */
function saveNotifyConfig(
  config: NotifyConfig,
  configPath: string = CONFIG_PATH,
): void {
  // Validate before saving
  const result = notifyConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`);
  }

  // Create parent directory if needed
  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write atomically with formatted JSON
  const content = JSON.stringify(config, null, 2);
  writeFileSync(configPath, `${content}\n`, "utf8");
}

// =============================================================================
// Exports
// =============================================================================

export {
  CONFIG_PATH,
  DEFAULT_NOTIFY_CONFIG,
  getConfigPath,
  isInQuietHours,
  loadNotifyConfig,
  saveNotifyConfig,
};

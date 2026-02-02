/**
 * Configuration management for the notify command
 *
 * This module provides:
 * - loadNotifyConfig() - Load notify config from unified aaa.config.json
 * - saveNotifyConfig() - Write config to aaa.config.json
 * - isInQuietHours() - Check if current time is within quiet hours
 *
 * Primary config: aaa.config.json in project root
 */

import {
  CONFIG_FILENAME,
  DEFAULT_NOTIFY,
  loadAaaConfig,
  type NotifySection,
} from "@tools/lib/config";
import { findProjectRoot } from "@tools/utils/paths";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { NotifyConfig, QuietHoursConfig } from "./types";

import { notifyConfigSchema } from "./types";

// =============================================================================
// Constants
// =============================================================================

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
 * Returns aaa.config.json in project root.
 */
function getConfigPath(): string {
  const projectRoot = findProjectRoot() ?? process.cwd();
  return join(projectRoot, CONFIG_FILENAME);
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
 *
 * Resolution order (handled by unified loader):
 * 1. aaa.config.json in project root
 * 2. Default configuration
 *
 * @returns NotifyConfig with all fields populated
 */
function loadNotifyConfig(): NotifyConfig {
  // Use unified config loader and extract notify section
  const aaaConfig = loadAaaConfig();
  const notify = aaaConfig.notify ?? DEFAULT_NOTIFY;

  // Map the unified NotifySection to the NotifyConfig interface
  return mapNotifySectionToConfig(notify);
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
 * Save notify configuration to aaa.config.json
 *
 * Writes the notify section to the unified config file (aaa.config.json) in the
 * project root.
 *
 * @param config - Configuration to save
 * @throws Error if write fails
 */
function saveNotifyConfig(config: NotifyConfig): void {
  // Validate before saving
  const result = notifyConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`);
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
  loadNotifyConfig,
  saveNotifyConfig,
};

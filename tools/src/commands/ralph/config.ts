/**
 * Configuration and subtask file management for Ralph autonomous build system
 *
 * This module provides:
 * - loadRalphConfig() - Load ralph.config.json with defaults
 * - loadSubtasksFile() / saveSubtasksFile() - Read/write subtasks.json
 * - Query helpers for subtask status and progress
 *
 * @see docs/planning/schemas/ralph-config.schema.json
 * @see docs/planning/schemas/subtasks.schema.json
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

import type { RalphConfig, Subtask, SubtasksFile } from "./types";

// =============================================================================
// Configuration Loading
// =============================================================================

/**
 * Default Ralph configuration when ralph.config.json is missing
 */
const DEFAULT_CONFIG: RalphConfig = {
  hooks: {
    onIterationComplete: ["log"],
    onMaxIterationsExceeded: ["log", "notify", "pause"],
    onMilestoneComplete: ["log", "notify"],
    onValidationFail: ["log", "notify"],
  },
  selfImprovement: { mode: "suggest" },
};

/**
 * Count remaining (pending) subtasks
 *
 * @param subtasks - Array of subtasks to count
 * @returns Number of subtasks where done === false
 */
function countRemaining(subtasks: Array<Subtask>): number {
  return subtasks.filter((s) => !s.done).length;
}

// =============================================================================
// Subtasks File Management
// =============================================================================

/**
 * Get all completed subtasks
 *
 * @param subtasks - Array of subtasks to filter
 * @returns Array of subtasks where done === true
 */
function getCompletedSubtasks(subtasks: Array<Subtask>): Array<Subtask> {
  return subtasks.filter((s) => s.done);
}

/**
 * Extract milestone reference from subtasks file metadata
 *
 * @param subtasksFile - SubtasksFile object to read from
 * @returns Milestone reference string, or "unknown" if not set
 */
function getMilestoneFromSubtasks(subtasksFile: SubtasksFile): string {
  return subtasksFile.metadata?.milestoneRef ?? "unknown";
}

// =============================================================================
// Query Helpers
// =============================================================================

/**
 * Get the next subtask to work on
 *
 * Returns the first pending subtask in queue order, or null if all done.
 *
 * @param subtasks - Array of subtasks to search
 * @returns First pending subtask, or null if none remain
 */
function getNextSubtask(subtasks: Array<Subtask>): null | Subtask {
  return subtasks.find((s) => !s.done) ?? null;
}

/**
 * Get all pending (not done) subtasks
 *
 * @param subtasks - Array of subtasks to filter
 * @returns Array of subtasks where done === false
 */
function getPendingSubtasks(subtasks: Array<Subtask>): Array<Subtask> {
  return subtasks.filter((s) => !s.done);
}

/**
 * Load Ralph configuration from ralph.config.json
 *
 * Returns default configuration if the file doesn't exist.
 * Throws if the file exists but contains invalid JSON.
 *
 * @param configPath - Path to ralph.config.json (default: "ralph.config.json")
 * @returns Parsed RalphConfig object
 */
function loadRalphConfig(configPath = "ralph.config.json"): RalphConfig {
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(configPath, "utf8");
    const parsed = JSON.parse(content) as RalphConfig;

    // Merge with defaults for any missing fields
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      hooks: { ...DEFAULT_CONFIG.hooks, ...parsed.hooks },
      selfImprovement: parsed.selfImprovement ?? DEFAULT_CONFIG.selfImprovement,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ralph.config.json: ${message}`);
  }
}

/**
 * Load subtasks file from disk
 *
 * Throws a clear error if the file doesn't exist or contains invalid JSON.
 *
 * @param subtasksPath - Path to subtasks.json file
 * @returns Parsed SubtasksFile object
 * @throws Error if file is missing or invalid
 */
function loadSubtasksFile(subtasksPath: string): SubtasksFile {
  if (!existsSync(subtasksPath)) {
    throw new Error(
      `Subtasks file not found: ${subtasksPath}\n` +
        `Create one with: aaa ralph plan subtasks --task <task-id>`,
    );
  }

  try {
    const content = readFileSync(subtasksPath, "utf8");
    return JSON.parse(content) as SubtasksFile;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse subtasks file ${subtasksPath}: ${message}`,
    );
  }
}

/**
 * Save subtasks file to disk with formatted JSON
 *
 * Writes with 2-space indentation for readability.
 *
 * @param subtasksPath - Path to subtasks.json file
 * @param data - SubtasksFile object to write
 */
function saveSubtasksFile(subtasksPath: string, data: SubtasksFile): void {
  const content = JSON.stringify(data, null, 2);
  writeFileSync(subtasksPath, `${content}\n`, "utf8");
}

// =============================================================================
// Exports
// =============================================================================

export {
  countRemaining,
  DEFAULT_CONFIG,
  getCompletedSubtasks,
  getMilestoneFromSubtasks,
  getNextSubtask,
  getPendingSubtasks,
  loadRalphConfig,
  loadSubtasksFile,
  saveSubtasksFile,
};

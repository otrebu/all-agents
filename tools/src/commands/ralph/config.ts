/**
 * Configuration and subtask file management for Ralph autonomous build system
 *
 * This module provides:
 * - loadRalphConfig() - Load Ralph config from unified aaa.config.json
 * - loadSubtasksFile() / saveSubtasksFile() - Read/write subtasks.json
 * - Query helpers for subtask status and progress
 *
 * @see docs/planning/schemas/ralph-config.schema.json
 * @see docs/planning/schemas/subtasks.schema.json
 */

import { DEFAULT_RALPH, loadAaaConfig } from "@tools/lib/config";
import { findProjectRoot } from "@tools/utils/paths";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

import type { RalphConfig, Subtask, SubtasksFile } from "./types";

// =============================================================================
// Configuration Loading
// =============================================================================

/**
 * Default Ralph configuration
 *
 * Note: This is kept for backward compatibility. The actual defaults come from
 * the unified config loader (DEFAULT_RALPH in lib/config/defaults.ts).
 * The values are kept in sync to ensure consistent behavior.
 */
const DEFAULT_CONFIG: RalphConfig = {
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
 * Count subtasks in a subtasks file
 *
 * @param subtasksPath - Path to subtasks.json file
 * @returns Number of subtasks in the file, or 0 if file doesn't exist or has errors
 */
function countSubtasksInFile(subtasksPath: string): number {
  if (!existsSync(subtasksPath)) {
    return 0;
  }

  try {
    const content = readFileSync(subtasksPath, "utf8");
    const parsed = JSON.parse(content) as SubtasksFile;

    if (!Array.isArray(parsed.subtasks)) {
      return 0;
    }

    return parsed.subtasks.length;
  } catch {
    return 0;
  }
}

/**
 * Discover task files from a milestone path
 *
 * Lists all .md files in the milestone's tasks directory.
 *
 * @param milestonePath - Path to the milestone root directory
 * @returns Array of task file paths, or empty array if tasks directory doesn't exist
 *
 * @example
 * const tasks = discoverTasksFromMilestone('docs/planning/milestones/003-ralph-workflow');
 * // Returns: ['docs/planning/.../tasks/TASK-001-foo.md', 'docs/planning/.../tasks/TASK-002-bar.md']
 */
function discoverTasksFromMilestone(milestonePath: string): Array<string> {
  const tasksDirectory = join(milestonePath, "tasks");

  if (!existsSync(tasksDirectory)) {
    return [];
  }

  try {
    const entries = readdirSync(tasksDirectory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => join(tasksDirectory, entry.name))
      .sort();
  } catch {
    return [];
  }
}

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
 * Get existing taskRef values from a subtasks file
 *
 * Scans a subtasks file and returns a Set of all unique taskRef values
 * from pending (not done) subtasks. This enables pre-checking which tasks
 * already have subtasks before invoking Claude for generation.
 *
 * @param subtasksPath - Path to subtasks.json file
 * @returns Set of unique taskRef values from pending subtasks, or empty Set if file doesn't exist or has errors
 *
 * @example
 * const existing = getExistingTaskReferences('docs/planning/milestones/003-ralph-workflow/subtasks.json');
 * if (existing.has('TASK-001')) {
 *   console.log('TASK-001 already has subtasks');
 * }
 */
function getExistingTaskReferences(subtasksPath: string): Set<string> {
  if (!existsSync(subtasksPath)) {
    return new Set<string>();
  }

  try {
    const content = readFileSync(subtasksPath, "utf8");
    const parsed = JSON.parse(content) as SubtasksFile;

    if (!Array.isArray(parsed.subtasks)) {
      return new Set<string>();
    }

    // Collect unique taskRefs from pending (not done) subtasks
    const taskReferences = new Set<string>();
    for (const subtask of parsed.subtasks) {
      if (!subtask.done && subtask.taskRef) {
        taskReferences.add(subtask.taskRef);
      }
    }

    return taskReferences;
  } catch {
    // Fail silently - return empty Set on parse errors
    return new Set<string>();
  }
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
 * Get the path to the daily log file for a milestone
 *
 * Returns a path in the format: {milestoneRoot}/logs/{YYYY-MM-DD}.jsonl
 * Uses UTC date to ensure consistency across time zones.
 *
 * @param milestoneRoot - Root directory of the milestone (e.g., docs/planning/milestones/002-ralph)
 * @returns Full path to the daily JSONL log file
 */
function getMilestoneLogPath(milestoneRoot: string): string {
  const utcDate = new Date().toISOString().split("T")[0];
  return join(milestoneRoot, "logs", `${utcDate}.jsonl`);
}

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
 * Load Ralph configuration from unified aaa.config.json
 *
 * Loads configuration from the unified config loader and extracts the ralph section.
 * Falls back to legacy ralph.config.json via the unified loader's fallback mechanism.
 *
 * Resolution order (handled by unified loader):
 * 1. aaa.config.json in project root
 * 2. Legacy ralph.config.json with deprecation warning
 * 3. Default configuration
 *
 * @param configPath - Optional override path (for testing only). When provided,
 *                     bypasses the unified loader and reads directly from the legacy file.
 *                     This is kept for backward compatibility with existing tests.
 * @returns Parsed RalphConfig object
 */
function loadRalphConfig(configPath?: string): RalphConfig {
  // If a specific configPath is provided (testing scenario), use legacy loading
  // This maintains backward compatibility with existing tests that pass explicit paths
  if (configPath !== undefined) {
    return loadRalphConfigLegacy(configPath);
  }

  // Use unified config loader and extract ralph section
  const aaaConfig = loadAaaConfig();
  const ralph = aaaConfig.ralph ?? DEFAULT_RALPH;

  // Map the unified RalphSection to the RalphConfig interface
  // The interfaces are compatible but we need to ensure proper typing
  return {
    hooks: ralph.hooks
      ? {
          onIterationComplete: ralph.hooks.onIterationComplete,
          onMaxIterationsExceeded: ralph.hooks.onMaxIterationsExceeded,
          onMilestoneComplete: ralph.hooks.onMilestoneComplete,
          onSubtaskComplete: ralph.hooks.onSubtaskComplete,
          onValidationFail: ralph.hooks.onValidationFail,
        }
      : DEFAULT_CONFIG.hooks,
    // Map unified SelfImprovementConfig to ralph's SelfImprovementConfig
    // Ensure mode has a value (unified config has it optional, ralph requires it)
    selfImprovement: { mode: ralph.selfImprovement?.mode ?? "suggest" },
  };
}

/**
 * Legacy config loading for backward compatibility with tests
 *
 * @internal
 * @param configPath - Path to ralph.config.json
 * @returns Parsed RalphConfig object
 */
function loadRalphConfigLegacy(configPath: string): RalphConfig {
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

// =============================================================================
// Milestone Resolution
// =============================================================================

/**
 * Relative path to milestone directories from project root
 */
const MILESTONES_RELATIVE_PATH = "docs/planning/milestones";

/**
 * Get the full path to the milestones directory
 *
 * @returns Full path to docs/planning/milestones from project root
 */
function getMilestonesBasePath(): string {
  const projectRoot = findProjectRoot() ?? process.cwd();
  return join(projectRoot, MILESTONES_RELATIVE_PATH);
}

/**
 * List available milestone directories
 *
 * @returns Array of milestone directory names (excluding _orphan and files)
 */
function listAvailableMilestones(): Array<string> {
  const basePath = getMilestonesBasePath();

  if (!existsSync(basePath)) {
    return [];
  }

  try {
    const entries = readdirSync(basePath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Resolve a milestone identifier to its full path
 *
 * Handles three cases:
 * 1. Full/absolute path - returns as-is if it exists
 * 2. Milestone name - searches docs/planning/milestones/<name>/
 * 3. Not found - throws error with available milestones listed
 *
 * @param nameOrPath - Either a full path or milestone name (e.g., '003-ralph-workflow')
 * @returns Full path to the milestone directory
 * @throws Error if milestone not found, with available milestones listed
 *
 * @example
 * resolveMilestonePath('/full/path/to/milestone') // returns input unchanged
 * resolveMilestonePath('003-ralph-workflow') // returns 'docs/planning/milestones/003-ralph-workflow'
 * resolveMilestonePath('nonexistent') // throws Error with available milestones
 */
function resolveMilestonePath(nameOrPath: string): string {
  // Case 1: If input is an absolute path or a path that exists, return as-is
  if (isAbsolute(nameOrPath)) {
    if (existsSync(nameOrPath)) {
      return nameOrPath;
    }
    throw new Error(`Milestone path not found: ${nameOrPath}`);
  }

  // Case 2: If input looks like a relative path (contains /) and exists
  if (nameOrPath.includes("/") && existsSync(nameOrPath)) {
    return nameOrPath;
  }

  // Case 3: Treat as milestone name, search in milestones directory
  const basePath = getMilestonesBasePath();
  const milestonePath = join(basePath, nameOrPath);
  if (existsSync(milestonePath)) {
    return milestonePath;
  }

  // Case 4: Not found - list available milestones
  const availableMilestones = listAvailableMilestones();
  const milestoneList =
    availableMilestones.length > 0
      ? availableMilestones.join(", ")
      : "(none found)";

  throw new Error(
    `Milestone not found: ${nameOrPath}\n` +
      `Available milestones: ${milestoneList}`,
  );
}

// =============================================================================
// Log Path Helpers
// =============================================================================

/**
 * Default milestone for orphaned logs (when milestone cannot be determined)
 */
const ORPHAN_MILESTONE_ROOT = "docs/planning/milestones/_orphan";

/**
 * Append subtasks to an existing subtasks file, or create a new one
 *
 * Merges new subtasks with existing ones, skipping duplicates by ID.
 * Creates a new file with default schema and metadata if none exists.
 *
 * @param subtasksPath - Path to subtasks.json file
 * @param newSubtasks - Array of new subtasks to append
 * @param metadata - Optional metadata to use if creating a new file
 * @returns Object with counts of added and skipped subtasks
 * @throws Error if newSubtasks is not an array
 * @throws Error if existing file has invalid JSON or format
 * @throws Error if file operations fail
 */
function appendSubtasksToFile(
  subtasksPath: string,
  newSubtasks: Array<Subtask>,
  metadata?: SubtasksFile["metadata"],
): { added: number; skipped: number } {
  // Parameter validation
  if (!Array.isArray(newSubtasks)) {
    throw new TypeError("newSubtasks must be an array");
  }

  let existingFile: SubtasksFile = {
    $schema: "../../schemas/subtasks.schema.json",
    metadata: metadata ?? { scope: "milestone" },
    subtasks: [],
  };

  if (existsSync(subtasksPath)) {
    // Error handling for load
    try {
      existingFile = loadSubtasksFile(subtasksPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load existing subtasks from ${subtasksPath}: ${message}`,
      );
    }
  }

  // Array validation for existing subtasks
  const existingSubtasks = existingFile.subtasks;
  if (!Array.isArray(existingSubtasks)) {
    throw new TypeError(
      `Invalid subtasks.json format: 'subtasks' must be an array`,
    );
  }

  const existingIds = new Set<string>(existingSubtasks.map((s) => s.id));

  // Filter out duplicates and append
  const subtasksToAdd = newSubtasks.filter((s) => !existingIds.has(s.id));
  const skipped = newSubtasks.length - subtasksToAdd.length;

  existingFile.subtasks = [...existingSubtasks, ...subtasksToAdd];

  // Error handling for save
  try {
    saveSubtasksFile(subtasksPath, existingFile);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save subtasks to ${subtasksPath}: ${message}`);
  }

  return { added: subtasksToAdd.length, skipped };
}

/**
 * Get the path to the iteration log file for a subtasks file
 *
 * Derives the milestone root from the subtasks.json parent directory.
 * Falls back to _orphan/logs/ if the milestone cannot be determined.
 *
 * @param subtasksPath - Path to the subtasks.json file
 * @returns Full path to the daily iteration JSONL log file
 *
 * @example
 * // subtasksPath: docs/planning/milestones/002-ralph/subtasks.json
 * // returns: docs/planning/milestones/002-ralph/logs/2026-01-26.jsonl
 *
 * @example
 * // subtasksPath: "" (empty)
 * // returns: docs/planning/milestones/_orphan/logs/2026-01-26.jsonl
 */
function getIterationLogPath(subtasksPath: string): string {
  if (!subtasksPath) {
    return getMilestoneLogPath(ORPHAN_MILESTONE_ROOT);
  }

  const milestoneRoot = dirname(subtasksPath);

  // If dirname returns "." or empty, route to orphan
  if (!milestoneRoot || milestoneRoot === ".") {
    return getMilestoneLogPath(ORPHAN_MILESTONE_ROOT);
  }

  return getMilestoneLogPath(milestoneRoot);
}

/**
 * Get the path to the planning log file for a milestone
 *
 * Used by planning commands (ralph plan) to log planning activity.
 *
 * @param milestonePath - Root directory of the milestone
 * @returns Full path to the daily planning JSONL log file
 *
 * @example
 * // milestonePath: docs/planning/milestones/002-ralph
 * // returns: docs/planning/milestones/002-ralph/logs/2026-01-26.jsonl
 */
function getPlanningLogPath(milestonePath: string): string {
  return getMilestoneLogPath(milestonePath);
}

/**
 * Save subtasks file to disk
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
  appendSubtasksToFile,
  countRemaining,
  countSubtasksInFile,
  DEFAULT_CONFIG,
  discoverTasksFromMilestone,
  getCompletedSubtasks,
  getExistingTaskReferences,
  getIterationLogPath,
  getMilestoneFromSubtasks,
  getMilestoneLogPath,
  getMilestonesBasePath,
  getNextSubtask,
  getPendingSubtasks,
  getPlanningLogPath,
  listAvailableMilestones,
  loadRalphConfig,
  loadSubtasksFile,
  MILESTONES_RELATIVE_PATH,
  ORPHAN_MILESTONE_ROOT,
  resolveMilestonePath,
  saveSubtasksFile,
};

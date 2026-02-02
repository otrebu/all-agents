/**
 * Cascade orchestration module for Ralph autonomous development framework
 *
 * This module implements cascade mode - the ability to chain Ralph levels together:
 * roadmap → stories → tasks → subtasks → build → calibrate
 *
 * Features:
 * - Level ordering and validation
 * - Cascade target validation (forward-only)
 * - TTY-aware prompting between levels
 *
 * @see docs/planning/milestones/003-ralph-workflow/tasks/TASK-002-cascade-module.md
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Definition of a cascade level with metadata
 */
interface CascadeLevelDefinition {
  /** Human-readable name of the level */
  name: string;
  /** Numeric order in cascade sequence (lower = earlier) */
  order: number;
  /** Whether this level requires a milestone to be specified */
  requiresMilestone: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Ordered array of cascade levels
 *
 * Defines the progression from high-level planning (roadmap) through
 * implementation (build) to quality assurance (calibrate).
 */
const LEVELS: ReadonlyArray<CascadeLevelDefinition> = [
  { name: "roadmap", order: 0, requiresMilestone: false },
  { name: "stories", order: 1, requiresMilestone: true },
  { name: "tasks", order: 2, requiresMilestone: true },
  { name: "subtasks", order: 3, requiresMilestone: true },
  { name: "build", order: 4, requiresMilestone: true },
  { name: "calibrate", order: 5, requiresMilestone: true },
] as const;

/**
 * Valid level names for cascade targets
 */
type CascadeLevelName =
  | "build"
  | "calibrate"
  | "roadmap"
  | "stories"
  | "subtasks"
  | "tasks";

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Find a level definition by name
 *
 * @param name - Level name to find
 * @returns Level definition or undefined if not found
 */
function findLevel(name: string): CascadeLevelDefinition | undefined {
  return LEVELS.find((level) => level.name === name);
}

/**
 * Get levels in range between start and target (exclusive of start, inclusive of target)
 *
 * Returns the levels that need to be executed when cascading from 'from' to 'to'.
 * Does NOT include the 'from' level (it's already done when cascade starts).
 *
 * @param from - Starting level name (already completed)
 * @param to - Target level name (inclusive)
 * @returns Array of level names to execute, or empty array if invalid
 *
 * @example
 * getLevelsInRange("stories", "build") // Returns ["tasks", "subtasks", "build"]
 * getLevelsInRange("subtasks", "calibrate") // Returns ["build", "calibrate"]
 */
function getLevelsInRange(from: string, to: string): Array<string> {
  const fromLevel = findLevel(from);
  const toLevel = findLevel(to);

  // Return empty array for invalid inputs
  if (fromLevel === undefined || toLevel === undefined) {
    return [];
  }

  // Return empty array if 'to' is not after 'from'
  if (toLevel.order <= fromLevel.order) {
    return [];
  }

  // Filter levels that are after 'from' and up to/including 'to'
  return LEVELS.filter(
    (level) => level.order > fromLevel.order && level.order <= toLevel.order,
  ).map((level) => level.name);
}

/**
 * Get list of valid level names for error messages
 *
 * @returns Comma-separated list of valid level names
 */
function getValidLevelNames(): string {
  return LEVELS.map((level) => level.name).join(", ");
}

/**
 * Check if a string is a valid cascade level name
 *
 * @param name - String to check
 * @returns true if valid level name
 */
function isValidLevelName(name: string): name is CascadeLevelName {
  return LEVELS.some((level) => level.name === name);
}

/**
 * Validate cascade target direction
 *
 * Cascades can only flow forward (higher order numbers).
 * For example: tasks → build is valid, build → tasks is invalid.
 *
 * @param from - Starting level name
 * @param to - Target level name
 * @returns Error message if invalid, null if valid
 *
 * @example
 * validateCascadeTarget("tasks", "stories") // Returns error (backward)
 * validateCascadeTarget("subtasks", "build") // Returns null (valid)
 */
function validateCascadeTarget(from: string, to: string): null | string {
  // Validate 'from' level
  if (!isValidLevelName(from)) {
    return `Invalid starting level '${from}'. Valid levels: ${getValidLevelNames()}`;
  }

  // Validate 'to' level
  if (!isValidLevelName(to)) {
    return `Invalid target level '${to}'. Valid levels: ${getValidLevelNames()}`;
  }

  const fromLevel = findLevel(from);
  const toLevel = findLevel(to);

  // Should never happen after isValidLevelName checks, but TypeScript needs this
  if (fromLevel === undefined || toLevel === undefined) {
    return "Internal error: level not found";
  }

  // Check direction - must go forward (higher order)
  if (toLevel.order <= fromLevel.order) {
    return `Cannot cascade backward from '${from}' to '${to}'. Cascade must flow forward through: ${getValidLevelNames()}`;
  }

  return null;
}

// =============================================================================
// Exports
// =============================================================================

export {
  type CascadeLevelDefinition,
  type CascadeLevelName,
  getLevelsInRange,
  getValidLevelNames,
  isValidLevelName,
  LEVELS,
  validateCascadeTarget,
};

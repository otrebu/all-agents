/**
 * Unit tests for cascade.ts
 *
 * Tests the cascade orchestration module:
 * - LEVELS constant
 * - validateCascadeTarget()
 * - getLevelsInRange()
 * - promptContinue() - TTY detection behavior
 */

import {
  getLevelsInRange,
  getValidLevelNames,
  isValidLevelName,
  LEVELS,
  promptContinue,
  validateCascadeTarget,
} from "@tools/commands/ralph/cascade";
import { describe, expect, test } from "bun:test";

// =============================================================================
// LEVELS Constant Tests
// =============================================================================

describe("LEVELS constant", () => {
  test("defines all expected levels in order", () => {
    const levelNames = LEVELS.map((level) => level.name);
    expect(levelNames).toEqual([
      "roadmap",
      "stories",
      "tasks",
      "subtasks",
      "build",
      "calibrate",
    ]);
  });

  test("has sequential order values starting from 0", () => {
    const orders = LEVELS.map((level) => level.order);
    expect(orders).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("only roadmap does not require milestone", () => {
    const withoutMilestone = LEVELS.filter((l) => !l.requiresMilestone);
    expect(withoutMilestone).toHaveLength(1);
    expect(withoutMilestone[0]?.name).toBe("roadmap");
  });
});

// =============================================================================
// isValidLevelName Tests
// =============================================================================

describe("isValidLevelName", () => {
  test("returns true for valid level names", () => {
    expect(isValidLevelName("roadmap")).toBe(true);
    expect(isValidLevelName("stories")).toBe(true);
    expect(isValidLevelName("tasks")).toBe(true);
    expect(isValidLevelName("subtasks")).toBe(true);
    expect(isValidLevelName("build")).toBe(true);
    expect(isValidLevelName("calibrate")).toBe(true);
  });

  test("returns false for invalid level names", () => {
    expect(isValidLevelName("invalid")).toBe(false);
    expect(isValidLevelName("")).toBe(false);
    expect(isValidLevelName("ROADMAP")).toBe(false);
    expect(isValidLevelName("plan")).toBe(false);
  });
});

// =============================================================================
// getValidLevelNames Tests
// =============================================================================

describe("getValidLevelNames", () => {
  test("returns comma-separated list of level names", () => {
    const result = getValidLevelNames();
    expect(result).toBe("roadmap, stories, tasks, subtasks, build, calibrate");
  });
});

// =============================================================================
// validateCascadeTarget Tests
// =============================================================================

describe("validateCascadeTarget", () => {
  test("returns null for valid forward cascade", () => {
    expect(validateCascadeTarget("roadmap", "stories")).toBeNull();
    expect(validateCascadeTarget("stories", "tasks")).toBeNull();
    expect(validateCascadeTarget("tasks", "subtasks")).toBeNull();
    expect(validateCascadeTarget("subtasks", "build")).toBeNull();
    expect(validateCascadeTarget("build", "calibrate")).toBeNull();
  });

  test("returns null for multi-level forward cascade", () => {
    expect(validateCascadeTarget("roadmap", "calibrate")).toBeNull();
    expect(validateCascadeTarget("stories", "build")).toBeNull();
    expect(validateCascadeTarget("tasks", "calibrate")).toBeNull();
  });

  test("returns error for backward cascade", () => {
    const error = validateCascadeTarget("tasks", "stories");
    expect(error).not.toBeNull();
    expect(error).toContain("Cannot cascade backward");
    expect(error).toContain("from 'tasks' to 'stories'");
  });

  test("returns error for same level cascade", () => {
    const error = validateCascadeTarget("tasks", "tasks");
    expect(error).not.toBeNull();
    expect(error).toContain("Cannot cascade backward");
  });

  test("returns error for invalid from level", () => {
    const error = validateCascadeTarget("invalid", "build");
    expect(error).not.toBeNull();
    expect(error).toContain("Invalid starting level 'invalid'");
    expect(error).toContain("Valid levels:");
  });

  test("returns error for invalid to level", () => {
    const error = validateCascadeTarget("tasks", "invalid");
    expect(error).not.toBeNull();
    expect(error).toContain("Invalid target level 'invalid'");
    expect(error).toContain("Valid levels:");
  });
});

// =============================================================================
// getLevelsInRange Tests
// =============================================================================

describe("getLevelsInRange", () => {
  test("returns levels between start and target (exclusive start, inclusive end)", () => {
    const result = getLevelsInRange("stories", "build");
    expect(result).toEqual(["tasks", "subtasks", "build"]);
  });

  test("returns single level for adjacent levels", () => {
    expect(getLevelsInRange("roadmap", "stories")).toEqual(["stories"]);
    expect(getLevelsInRange("tasks", "subtasks")).toEqual(["subtasks"]);
    expect(getLevelsInRange("build", "calibrate")).toEqual(["calibrate"]);
  });

  test("returns all subsequent levels for full cascade", () => {
    const result = getLevelsInRange("roadmap", "calibrate");
    expect(result).toEqual([
      "stories",
      "tasks",
      "subtasks",
      "build",
      "calibrate",
    ]);
  });

  test("returns empty array for backward cascade", () => {
    expect(getLevelsInRange("build", "stories")).toEqual([]);
    expect(getLevelsInRange("calibrate", "roadmap")).toEqual([]);
  });

  test("returns empty array for same level", () => {
    expect(getLevelsInRange("tasks", "tasks")).toEqual([]);
  });

  test("returns empty array for invalid from level", () => {
    expect(getLevelsInRange("invalid", "build")).toEqual([]);
  });

  test("returns empty array for invalid to level", () => {
    expect(getLevelsInRange("tasks", "invalid")).toEqual([]);
  });

  test("subtasks to calibrate returns build and calibrate", () => {
    const result = getLevelsInRange("subtasks", "calibrate");
    expect(result).toEqual(["build", "calibrate"]);
  });
});

// =============================================================================
// promptContinue Tests
// =============================================================================

describe("promptContinue", () => {
  test("returns true immediately in non-TTY mode", async () => {
    // In test environment, process.stdin.isTTY is typically undefined/false
    // which means promptContinue should return true without blocking
    const shouldContinue = await promptContinue("stories", "tasks");
    expect(shouldContinue).toBe(true);
  });
});

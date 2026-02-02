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
  runCascadeFrom,
  runLevel,
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

// =============================================================================
// runLevel Tests
// =============================================================================

describe("runLevel", () => {
  const options = {
    contextRoot: "/nonexistent/path",
    subtasksPath: "/nonexistent/subtasks.json",
  };

  test("returns error for invalid level name", async () => {
    const error = await runLevel("invalid", options);
    expect(error).not.toBeNull();
    expect(error).toContain("Invalid level 'invalid'");
    expect(error).toContain("Valid levels:");
  });

  test("returns error for planning levels (not yet implemented)", async () => {
    const roadmapError = await runLevel("roadmap", options);
    expect(roadmapError).toContain("planning level");
    expect(roadmapError).toContain("not yet implemented");

    const storiesError = await runLevel("stories", options);
    expect(storiesError).toContain("planning level");

    const tasksError = await runLevel("tasks", options);
    expect(tasksError).toContain("planning level");

    const subtasksError = await runLevel("subtasks", options);
    expect(subtasksError).toContain("planning level");
  });

  test("accepts options with contextRoot and subtasksPath", async () => {
    // Verify the function accepts the expected options shape
    // The build/calibrate levels will fail due to missing files,
    // but we're testing that the options are accepted
    const error = await runLevel("calibrate", options);
    // Should fail due to missing file, not due to options validation
    expect(error).not.toContain("Invalid level");
  });
});

// =============================================================================
// runCascadeFrom Tests
// =============================================================================

describe("runCascadeFrom", () => {
  const options = {
    contextRoot: "/nonexistent/path",
    headless: true,
    subtasksPath: "/nonexistent/subtasks.json",
  };

  test("returns error for invalid starting level", async () => {
    const result = await runCascadeFrom("invalid", "build", options);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid starting level 'invalid'");
    expect(result.completedLevels).toEqual([]);
    expect(result.stoppedAt).toBe("invalid");
  });

  test("returns error for invalid target level", async () => {
    const result = await runCascadeFrom("tasks", "invalid", options);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid target level 'invalid'");
    expect(result.completedLevels).toEqual([]);
    expect(result.stoppedAt).toBe("tasks");
  });

  test("returns error for backward cascade", async () => {
    const result = await runCascadeFrom("build", "tasks", options);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot cascade backward");
    expect(result.completedLevels).toEqual([]);
    expect(result.stoppedAt).toBe("build");
  });

  test("returns error for same level cascade", async () => {
    const result = await runCascadeFrom("tasks", "tasks", options);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot cascade backward");
    expect(result.completedLevels).toEqual([]);
  });

  test("validates cascade direction using validateCascadeTarget", async () => {
    const result = await runCascadeFrom("calibrate", "roadmap", options);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot cascade backward");
  });

  test("uses getLevelsInRange to get levels to execute", async () => {
    // Since planning levels aren't implemented, cascading from roadmap to stories
    // will attempt to run stories and fail with "not yet implemented"
    const result = await runCascadeFrom("roadmap", "stories", options);
    expect(result.success).toBe(false);
    expect(result.error).toContain("planning level");
    expect(result.stoppedAt).toBe("stories");
  });

  test("proceeds through multiple levels in headless mode", async () => {
    // In headless mode, promptContinue is skipped
    // Will fail at first planning level (stories)
    const result = await runCascadeFrom("roadmap", "tasks", options);
    expect(result.stoppedAt).toBe("stories");
    expect(result.completedLevels).toEqual([]);
  });

  test("returns CascadeResult with correct shape", async () => {
    const result = await runCascadeFrom("roadmap", "stories", options);
    expect(typeof result.success).toBe("boolean");
    expect(Array.isArray(result.completedLevels)).toBe(true);
    expect(result.error === null || typeof result.error === "string").toBe(
      true,
    );
    expect(
      result.stoppedAt === null || typeof result.stoppedAt === "string",
    ).toBe(true);
  });

  test("stops at first failing level and reports it in stoppedAt", async () => {
    const result = await runCascadeFrom("roadmap", "calibrate", options);
    expect(result.success).toBe(false);
    // First level after roadmap is stories
    expect(result.stoppedAt).toBe("stories");
    expect(result.completedLevels).toEqual([]);
    expect(result.error).toContain("planning level");
  });

  test("accepts headless option to skip prompts", async () => {
    // Verify headless mode works (already used in other tests)
    const result = await runCascadeFrom("roadmap", "stories", {
      contextRoot: "/nonexistent",
      headless: true,
      subtasksPath: "/nonexistent/subtasks.json",
    });
    expect(result.stoppedAt).toBe("stories");
  });
});

/**
 * E2E tests for cascade module validation functions
 *
 * Tests cascade validation logic through direct module imports.
 * Since cascade functions are internal utilities (not CLI commands),
 * these tests verify the exported functions work correctly.
 *
 * Note: There is also a unit test file at tools/tests/lib/cascade.test.ts
 * that provides more comprehensive coverage. This E2E test focuses on
 * validating the core validation functions that will be used by CLI commands.
 */

import {
  getLevelsInRange,
  validateCascadeTarget,
} from "@tools/commands/ralph/cascade";
import { describe, expect, test } from "bun:test";

// =============================================================================
// validateCascadeTarget E2E Tests
// =============================================================================

describe("cascade E2E - validateCascadeTarget", () => {
  test("backward cascade returns error", () => {
    const error = validateCascadeTarget("tasks", "stories");
    expect(error).not.toBeNull();
    expect(error).toContain("Cannot cascade backward");
    expect(error).toContain("from 'tasks' to 'stories'");
  });

  test("forward cascade to executable levels returns null (valid)", () => {
    expect(validateCascadeTarget("subtasks", "build")).toBeNull();
    expect(validateCascadeTarget("subtasks", "calibrate")).toBeNull();
    expect(validateCascadeTarget("build", "calibrate")).toBeNull();
  });

  test("forward cascade through planning levels returns error (not executable)", () => {
    const storiesError = validateCascadeTarget("stories", "calibrate");
    expect(storiesError).not.toBeNull();
    expect(storiesError).toContain("not executable yet");
    expect(storiesError).toContain("tasks, subtasks");

    const roadmapError = validateCascadeTarget("roadmap", "subtasks");
    expect(roadmapError).not.toBeNull();
    expect(roadmapError).toContain("not executable yet");
  });

  test("same level cascade returns error", () => {
    const error = validateCascadeTarget("build", "build");
    expect(error).not.toBeNull();
    expect(error).toContain("Cannot cascade backward");
  });

  test("invalid starting level returns error with valid options", () => {
    const error = validateCascadeTarget("invalid", "build");
    expect(error).not.toBeNull();
    expect(error).toContain("Invalid starting level 'invalid'");
    expect(error).toContain("Valid levels:");
    expect(error).toContain("roadmap");
    expect(error).toContain("calibrate");
  });

  test("invalid target level returns error with valid options", () => {
    const error = validateCascadeTarget("subtasks", "invalid");
    expect(error).not.toBeNull();
    expect(error).toContain("Invalid target level 'invalid'");
    expect(error).toContain("Valid levels:");
  });
});

// =============================================================================
// getLevelsInRange E2E Tests
// =============================================================================

describe("cascade E2E - getLevelsInRange", () => {
  test("returns correct level sequence for stories to build", () => {
    const levels = getLevelsInRange("stories", "build");
    expect(levels).toEqual(["tasks", "subtasks", "build"]);
  });

  test("returns correct level sequence for subtasks to calibrate", () => {
    const levels = getLevelsInRange("subtasks", "calibrate");
    expect(levels).toEqual(["build", "calibrate"]);
  });

  test("returns single level for adjacent levels", () => {
    expect(getLevelsInRange("roadmap", "stories")).toEqual(["stories"]);
    expect(getLevelsInRange("build", "calibrate")).toEqual(["calibrate"]);
  });

  test("returns all levels for full cascade", () => {
    const levels = getLevelsInRange("roadmap", "calibrate");
    expect(levels).toEqual([
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

  test("returns empty array for invalid level names", () => {
    expect(getLevelsInRange("invalid", "build")).toEqual([]);
    expect(getLevelsInRange("tasks", "invalid")).toEqual([]);
  });
});

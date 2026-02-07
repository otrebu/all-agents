/**
 * Unit tests for build.ts hook integration
 *
 * These tests verify that:
 * - onMilestoneComplete hook fires when all subtasks complete (remaining === 0)
 * - onSubtaskComplete hook fires when individual subtask completes (didComplete === true)
 *
 * The tests use grep to verify the correct hook calls exist in build.ts code
 * since unit testing the full runBuild function would require mocking Claude invocations.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Read build.ts content for static analysis
const testDirectory = dirname(fileURLToPath(import.meta.url));
const BUILD_TS_PATH = join(testDirectory, "../../src/commands/ralph/build.ts");
const buildContent = readFileSync(BUILD_TS_PATH, "utf8");

describe("build.ts hook integration", () => {
  describe("onMilestoneComplete hook", () => {
    test("hook is called when remaining === 0", () => {
      // Verify the hook call exists in the remaining === 0 block
      const milestoneHookPattern =
        /if\s*\(\s*remaining\s*===\s*0\s*\)[\s\S]*?executeHook\s*\(\s*["']onMilestoneComplete["']/;
      expect(milestoneHookPattern.test(buildContent)).toBe(true);
    });

    test("hook context includes milestone identifier", () => {
      // Verify the hook message includes milestone info
      expect(buildContent).toContain("Milestone");
      expect(buildContent).toContain("completed");
    });
  });

  describe("onSubtaskComplete hook", () => {
    test("hook is called when didComplete is true", () => {
      // Verify the helper function call exists in the didComplete block
      const subtaskHookPattern =
        /if\s*\(\s*didComplete\s*\)[\s\S]*?fireSubtaskCompleteHook\s*\(/;
      expect(subtaskHookPattern.test(buildContent)).toBe(true);
    });

    test("helper function invokes executeHook with onSubtaskComplete", () => {
      // Verify the helper function calls executeHook with correct event
      expect(buildContent).toContain('executeHook("onSubtaskComplete"');
    });

    test("hook context includes subtaskId", () => {
      // Verify the hook context includes subtaskId field
      expect(buildContent).toContain("subtaskId: subtask.id");
    });

    test("hook message includes subtask title", () => {
      // Verify the hook message includes subtask details
      expect(buildContent).toContain("subtask.title");
    });
  });

  describe("hook import", () => {
    test("executeHook is imported from hooks module", () => {
      expect(buildContent).toContain('import { executeHook } from "./hooks"');
    });
  });
});

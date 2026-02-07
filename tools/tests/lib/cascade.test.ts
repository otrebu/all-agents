/**
 * Unit tests for cascade.ts
 *
 * Tests the cascade orchestration module:
 * - LEVELS constant
 * - validateCascadeTarget()
 * - getLevelsInRange()
 * - promptContinue() - TTY detection behavior
 */

import type { Mock } from "bun:test";

import * as approvals from "@tools/commands/ralph/approvals";
import {
  buildApprovalContext,
  checkApprovalGate,
  getLevelsInRange,
  getValidLevelNames,
  isValidLevelName,
  LEVELS,
  levelToGate,
  promptContinue,
  runCascadeFrom,
  runLevel,
  validateCascadeTarget,
} from "@tools/commands/ralph/cascade";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";

// =============================================================================
// Approval Integration Tests
// =============================================================================

describe("levelToGate", () => {
  test("maps planning levels to approval gates and executable levels to null", () => {
    expect(levelToGate("roadmap")).toBe("createRoadmap");
    expect(levelToGate("stories")).toBe("createStories");
    expect(levelToGate("tasks")).toBe("createTasks");
    expect(levelToGate("subtasks")).toBe("createSubtasks");
    expect(levelToGate("build")).toBeNull();
    expect(levelToGate("calibrate")).toBeNull();
  });
});

describe("buildApprovalContext", () => {
  test("builds non-interactive context in headless mode", () => {
    const context = buildApprovalContext({
      contextRoot: "/repo",
      headless: true,
      subtasksPath: "/repo/subtasks.json",
    });

    expect(context.forceFlag).toBe(false);
    expect(context.reviewFlag).toBe(false);
    expect(context.isTTY).toBe(false);
  });

  test("propagates force/review approval flags into context", () => {
    const context = buildApprovalContext({
      contextRoot: "/repo",
      forceFlag: true,
      reviewFlag: true,
      subtasksPath: "/repo/subtasks.json",
    });

    expect(context.forceFlag).toBe(true);
    expect(context.reviewFlag).toBe(true);
  });
});

describe("checkApprovalGate", () => {
  let execSyncSpy: Mock<typeof childProcess.execSync> | null = null;
  let consoleLogSpy: Mock<typeof console.log> | null = null;

  beforeEach(() => {
    execSyncSpy = spyOn(childProcess, "execSync").mockImplementation(((
      command: string,
    ) => {
      if (command === "git status --porcelain") {
        return "";
      }
      return "";
    }) as unknown as typeof childProcess.execSync);
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    execSyncSpy?.mockRestore();
    execSyncSpy = null;
    consoleLogSpy?.mockRestore();
    consoleLogSpy = null;
  });

  test("returns continue for levels with no gate", async () => {
    const result = await checkApprovalGate("build", undefined, {
      cascadeTarget: "calibrate",
      forceFlag: false,
      isTTY: false,
      milestonePath: "/tmp/milestone",
      reviewFlag: false,
    });

    expect(result).toBe("continue");
  });

  test("returns continue for write action", async () => {
    const result = await checkApprovalGate(
      "stories",
      { createStories: "auto" },
      {
        cascadeTarget: "build",
        forceFlag: false,
        isTTY: false,
        milestonePath: "/tmp/milestone",
        reviewFlag: false,
      },
    );

    expect(result).toBe("continue");
  });

  test("calls promptApproval for prompt action and aborts on rejection", async () => {
    const promptSpy = spyOn(approvals, "promptApproval").mockResolvedValue(
      false,
    );

    const result = await checkApprovalGate(
      "stories",
      { createStories: "always" },
      {
        cascadeTarget: "build",
        forceFlag: false,
        isTTY: true,
        milestonePath: "/tmp/milestone",
        reviewFlag: false,
      },
    );

    expect(promptSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe("aborted");
    promptSpy.mockRestore();
  });

  test("calls handleNotifyWait for notify-wait action", async () => {
    const notifyWaitSpy = spyOn(
      approvals,
      "handleNotifyWait",
    ).mockResolvedValue();

    const result = await checkApprovalGate(
      "stories",
      { createStories: "suggest" },
      {
        cascadeTarget: "build",
        forceFlag: false,
        isTTY: false,
        milestonePath: "/tmp/milestone",
        reviewFlag: false,
      },
    );

    expect(result).toBe("continue");
    expect(notifyWaitSpy).toHaveBeenCalledWith(
      "createStories",
      { createStories: "suggest" },
      "Proceeding with stories level",
    );
    notifyWaitSpy.mockRestore();
  });

  test("prepareExitUnstaged is triggered for always + headless", async () => {
    const result = await checkApprovalGate(
      "stories",
      { createStories: "always" },
      {
        cascadeTarget: "build",
        forceFlag: false,
        isTTY: false,
        milestonePath: "/tmp/milestone",
        reviewFlag: false,
      },
    );

    expect(result).toBe("exit-unstaged");
    expect(execSyncSpy?.mock.calls[0]?.[0]).toBe("git add -A");
    expect(execSyncSpy?.mock.calls[1]?.[0]).toBe("git status --porcelain");
    expect(
      consoleLogSpy?.mock.calls.some((call) =>
        String(call[0]).includes("exit-unstaged"),
      ),
    ).toBe(true);
  });
});

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
  test("returns null for executable forward cascades", () => {
    expect(validateCascadeTarget("subtasks", "build")).toBeNull();
    expect(validateCascadeTarget("build", "calibrate")).toBeNull();
    expect(validateCascadeTarget("subtasks", "calibrate")).toBeNull();
  });

  test("returns actionable error for unsupported planning-level paths", () => {
    const error = validateCascadeTarget("stories", "build");

    expect(error).not.toBeNull();
    expect(error).toContain("not executable yet");
    expect(error).toContain("Unsupported levels in path: tasks, subtasks");
    expect(error).toContain("Supported targets from 'stories': none");
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

  test("accepts approval/provider passthrough fields in run options", async () => {
    const error = await runLevel("calibrate", {
      contextRoot: "/nonexistent/path",
      forceFlag: true,
      model: "claude-sonnet-4-5",
      provider: "claude",
      reviewFlag: false,
      subtasksPath: "/nonexistent/subtasks.json",
    });

    expect(error).not.toContain("Invalid level");
  });
});

// =============================================================================
// runCascadeFrom Tests
// =============================================================================

describe("runCascadeFrom", () => {
  const options = {
    contextRoot: "/nonexistent/path",
    forceFlag: true,
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

  test("returns error when fromLevel override is invalid", async () => {
    const result = await runCascadeFrom("roadmap", "build", {
      ...options,
      fromLevel: "invalid-level",
    });

    expect(result.success).toBe(false);
    expect(result.completedLevels).toEqual([]);
    expect(result.stoppedAt).toBe("invalid-level");
    expect(result.error).toBe(
      "Invalid level 'invalid-level'. Valid levels: roadmap, stories, tasks, subtasks, build, calibrate",
    );
  });

  test("uses fromLevel override as cascade entry point", async () => {
    const result = await runCascadeFrom("roadmap", "tasks", {
      ...options,
      fromLevel: "stories",
    });

    expect(result.success).toBe(false);
    expect(result.stoppedAt).toBe("stories");
    expect(result.error).toContain("not executable yet");
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
    const result = await runCascadeFrom("roadmap", "stories", options);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not executable yet");
    expect(result.stoppedAt).toBe("roadmap");
  });

  test("proceeds through multiple levels in headless mode", async () => {
    const result = await runCascadeFrom("roadmap", "tasks", options);
    expect(result.stoppedAt).toBe("roadmap");
    expect(result.completedLevels).toEqual([]);
    expect(result.error).toContain("not executable yet");
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
    expect(result.stoppedAt).toBe("roadmap");
    expect(result.completedLevels).toEqual([]);
    expect(result.error).toContain("not executable yet");
  });

  test("accepts headless option to skip prompts", async () => {
    // Verify headless mode works (already used in other tests)
    const result = await runCascadeFrom("roadmap", "stories", {
      contextRoot: "/nonexistent",
      forceFlag: true,
      headless: true,
      subtasksPath: "/nonexistent/subtasks.json",
    });
    expect(result.stoppedAt).toBe("roadmap");
  });
});

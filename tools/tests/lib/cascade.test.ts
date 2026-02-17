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
import * as pipelineRenderer from "@tools/commands/ralph/pipeline-renderer";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";

type PipelineRenderer = ReturnType<
  typeof pipelineRenderer.createPipelineRenderer
>;

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
    expect(promptSpy).toHaveBeenCalledWith(
      "createStories",
      "Proceeding with stories level",
      expect.objectContaining({ gateName: "createStories" }),
    );
    expect(result).toBe("aborted");
    promptSpy.mockRestore();
  });

  test("passes approval gate card data to promptApproval in always + tty mode", async () => {
    const promptSpy = spyOn(approvals, "promptApproval").mockResolvedValue(
      true,
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

    expect(result).toBe("continue");
    expect(promptSpy).toHaveBeenCalledWith(
      "createStories",
      "Proceeding with stories level",
      expect.objectContaining({
        configMode: "always",
        executionMode: "supervised",
        gateName: "createStories",
        resolvedAction: "prompt",
      }),
    );

    promptSpy.mockRestore();
  });

  test("notifies waiting callback when prompt action is selected", async () => {
    const evaluateSpy = spyOn(approvals, "evaluateApproval").mockReturnValue(
      "prompt",
    );
    const promptSpy = spyOn(approvals, "promptApproval").mockResolvedValue(
      true,
    );
    const waitingEvents: Array<string> = [];

    const result = await checkApprovalGate(
      "tasks",
      { createTasks: "always" },
      {
        cascadeTarget: "build",
        forceFlag: false,
        isTTY: true,
        milestonePath: "/tmp/milestone",
        reviewFlag: false,
      },
      (gateName) => {
        waitingEvents.push(gateName);
      },
    );

    expect(result).toBe("continue");
    expect(waitingEvents).toEqual(["createTasks"]);

    evaluateSpy.mockRestore();
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
      expect.objectContaining({
        executionMode: "headless",
        gateName: "createStories",
        resolvedAction: "notify-wait",
      }),
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
    expect(validateCascadeTarget("stories", "subtasks")).toBeNull();
    expect(validateCascadeTarget("stories", "build")).toBeNull();
    expect(validateCascadeTarget("tasks", "calibrate")).toBeNull();
    expect(validateCascadeTarget("subtasks", "build")).toBeNull();
    expect(validateCascadeTarget("build", "calibrate")).toBeNull();
    expect(validateCascadeTarget("subtasks", "calibrate")).toBeNull();
  });

  test("returns actionable error for unsupported roadmap paths", () => {
    const error = validateCascadeTarget("roadmap", "subtasks");

    expect(error).not.toBeNull();
    expect(error).toContain("not executable yet");
    expect(error).toContain("Unsupported levels in path: stories");
    expect(error).toContain("Supported targets from 'roadmap': none");
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

  test("returns error for roadmap/stories planning levels (not yet implemented)", async () => {
    const roadmapError = await runLevel("roadmap", options);
    expect(roadmapError).toContain("planning level");
    expect(roadmapError).toContain("not yet implemented");

    const storiesError = await runLevel("stories", options);
    expect(storiesError).toContain("planning level");
    expect(storiesError).toContain("not yet implemented");
  });

  test("requires milestone path for tasks/subtasks planning levels", async () => {
    const tasksError = await runLevel("tasks", options);
    expect(tasksError).toContain("requires a milestone path");

    const subtasksError = await runLevel("subtasks", options);
    expect(subtasksError).toContain("requires a milestone path");
  });

  test("requires planning-level runner for tasks/subtasks planning levels", async () => {
    const tasksError = await runLevel("tasks", {
      ...options,
      milestonePath: "/tmp/milestone",
    });
    expect(tasksError).toContain("planning-level runner");

    const subtasksError = await runLevel("subtasks", {
      ...options,
      milestonePath: "/tmp/milestone",
    });
    expect(subtasksError).toContain("planning-level runner");
  });

  test("delegates tasks/subtasks planning levels to runner", async () => {
    const planningRunnerHost = {
      runner: async () => await Promise.resolve(null as null | string),
    };
    const planningRunner = spyOn(planningRunnerHost, "runner");

    const tasksError = await runLevel("tasks", {
      ...options,
      milestonePath: "/tmp/milestone",
      planningLevelRunner: planningRunner,
    });
    expect(tasksError).toBeNull();

    const subtasksError = await runLevel("subtasks", {
      ...options,
      milestonePath: "/tmp/milestone",
      planningLevelRunner: planningRunner,
    });
    expect(subtasksError).toBeNull();

    expect(planningRunner).toHaveBeenCalledWith("tasks", {
      contextRoot: "/nonexistent/path",
      milestonePath: "/tmp/milestone",
      model: undefined,
      provider: undefined,
    });
    expect(planningRunner).toHaveBeenCalledWith("subtasks", {
      contextRoot: "/nonexistent/path",
      milestonePath: "/tmp/milestone",
      model: undefined,
      provider: undefined,
    });

    planningRunner.mockRestore();
  });

  test("accepts options with contextRoot and subtasksPath", async () => {
    // Verify the function accepts the expected options shape
    // The build/calibrate levels will fail due to missing files,
    // but we're testing that the options are accepted
    const error = await runLevel("calibrate", options);
    // Should fail due to missing file, not due to options validation
    // error is null on success or a string on failure
    if (error !== null) {
      expect(error).not.toContain("Invalid level");
    }
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

    // error is null on success or a string on failure
    if (error !== null) {
      expect(error).not.toContain("Invalid level");
    }
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
    expect(result.stoppedAt).toBe("tasks");
    expect(result.error).toContain("requires a milestone path");
  });

  test("executes tasks/subtasks when planning runner and milestone path are provided", async () => {
    const planningRunnerHost = {
      runner: async () => await Promise.resolve(null as null | string),
    };
    const planningRunner = spyOn(planningRunnerHost, "runner");

    const result = await runCascadeFrom("stories", "subtasks", {
      ...options,
      milestonePath: "/tmp/milestone",
      planningLevelRunner: planningRunner,
    });

    expect(result.success).toBe(true);
    expect(result.completedLevels).toEqual(["tasks", "subtasks"]);
    expect(result.error).toBeNull();
    expect(result.stoppedAt).toBeNull();
    expect(planningRunner).toHaveBeenNthCalledWith(1, "tasks", {
      contextRoot: "/nonexistent/path",
      milestonePath: "/tmp/milestone",
      model: undefined,
      provider: undefined,
    });
    expect(planningRunner).toHaveBeenNthCalledWith(2, "subtasks", {
      contextRoot: "/nonexistent/path",
      milestonePath: "/tmp/milestone",
      model: undefined,
      provider: undefined,
    });

    planningRunner.mockRestore();
  });

  test("fails on tasks/subtasks cascade when planning runner is missing", async () => {
    const result = await runCascadeFrom("stories", "subtasks", {
      ...options,
      milestonePath: "/tmp/milestone",
    });

    expect(result.success).toBe(false);
    expect(result.completedLevels).toEqual([]);
    expect(result.stoppedAt).toBe("tasks");
    expect(result.error).toContain("planning-level runner");
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

  test("wires PipelineRenderer lifecycle across cascade levels", async () => {
    const startPhaseCalls: Array<string> = [];
    const setApprovalWaitCalls: Array<string> = [];
    const completePhaseCalls: Array<unknown> = [];
    let stopCallCount = 0;

    const rendererFactorySpy = spyOn(
      pipelineRenderer,
      "createPipelineRenderer",
    ).mockImplementation(() => {
      const rendererDouble: PipelineRenderer = {
        completePhase: (metrics) => {
          completePhaseCalls.push(metrics);
        },
        resume: () => {},
        setApprovalWait: (gateName) => {
          setApprovalWaitCalls.push(gateName);
        },
        startPhase: (name) => {
          startPhaseCalls.push(name);
        },
        stop: () => {
          stopCallCount += 1;
        },
        suspend: () => {},
        updateSubtask: (...args: [string, string, number, number]) => {
          void args;
        },
      };

      return rendererDouble;
    });
    const evaluateApprovalSpy = spyOn(
      approvals,
      "evaluateApproval",
    ).mockReturnValue("notify-wait");
    const notifyWaitSpy = spyOn(
      approvals,
      "handleNotifyWait",
    ).mockResolvedValue();

    const result = await runCascadeFrom("stories", "subtasks", {
      contextRoot: "/repo",
      headless: true,
      milestonePath: "/tmp/milestone",
      planningLevelRunner: async () => await Promise.resolve(null),
      subtasksPath: "/repo/subtasks.json",
    });

    expect(result).toEqual({
      completedLevels: ["tasks", "subtasks"],
      error: null,
      stoppedAt: null,
      success: true,
    });

    const rendererCall = rendererFactorySpy.mock.calls[0];
    if (rendererCall === undefined) {
      throw new Error("Expected renderer snapshot");
    }
    const [phaseNames, isHeadless, isTTY] = rendererCall;
    expect(isHeadless).toBe(true);
    expect(isTTY).toBe(false);
    expect(phaseNames).toEqual(["tasks", "subtasks"]);

    expect(startPhaseCalls).toContain("tasks");
    expect(startPhaseCalls).toContain("subtasks");
    expect(startPhaseCalls.filter((call) => call === "tasks").length).toBe(2);
    expect(startPhaseCalls.filter((call) => call === "subtasks").length).toBe(
      2,
    );
    expect(setApprovalWaitCalls[0]).toBe("createTasks");
    expect(setApprovalWaitCalls[1]).toBe("createSubtasks");
    expect(completePhaseCalls).toHaveLength(2);
    expect(completePhaseCalls[0]).toMatchObject({
      costUsd: 0,
      filesChanged: 0,
    });
    expect(completePhaseCalls[1]).toMatchObject({
      costUsd: 0,
      filesChanged: 0,
    });
    expect(stopCallCount).toBe(1);
    expect(rendererFactorySpy).toHaveBeenCalledTimes(1);
    expect(evaluateApprovalSpy).toHaveBeenCalledTimes(2);
    expect(notifyWaitSpy).toHaveBeenCalledTimes(2);

    rendererFactorySpy.mockRestore();
    evaluateApprovalSpy.mockRestore();
    notifyWaitSpy.mockRestore();
  });

  test("renders waiting cascade state before promptApproval", async () => {
    const evaluateApprovalSpy = spyOn(
      approvals,
      "evaluateApproval",
    ).mockReturnValue("prompt");
    const eventOrder: Array<string> = [];
    const rendererFactorySpy = spyOn(
      pipelineRenderer,
      "createPipelineRenderer",
    ).mockImplementation(() => {
      const rendererDouble: PipelineRenderer = {
        completePhase: () => {},
        resume: () => {},
        setApprovalWait: () => {
          eventOrder.push("render-waiting");
        },
        startPhase: () => {},
        stop: () => {},
        suspend: () => {},
        updateSubtask: (...args: [string, string, number, number]) => {
          void args;
        },
      };
      return rendererDouble;
    });

    const promptSpy = spyOn(approvals, "promptApproval").mockImplementation(
      async () => {
        eventOrder.push("prompt");
        await Promise.resolve();
        return true;
      },
    );

    const result = await runCascadeFrom("stories", "tasks", {
      contextRoot: "/repo",
      headless: true,
      milestonePath: "/tmp/milestone",
      planningLevelRunner: async () => await Promise.resolve(null),
      subtasksPath: "/repo/subtasks.json",
    });

    expect(result.success).toBe(true);

    const waitingRenderIndex = eventOrder.indexOf("render-waiting");
    const promptIndex = eventOrder.indexOf("prompt");

    expect(waitingRenderIndex).toBeGreaterThanOrEqual(0);
    expect(promptIndex).toBeGreaterThanOrEqual(0);
    expect(waitingRenderIndex).toBeLessThan(promptIndex);

    evaluateApprovalSpy.mockRestore();
    rendererFactorySpy.mockRestore();
    promptSpy.mockRestore();
  });

  test("renders waiting cascade state before handleNotifyWait", async () => {
    const evaluateApprovalSpy = spyOn(
      approvals,
      "evaluateApproval",
    ).mockReturnValue("notify-wait");
    const eventOrder: Array<string> = [];
    const rendererFactorySpy = spyOn(
      pipelineRenderer,
      "createPipelineRenderer",
    ).mockImplementation(() => {
      const rendererDouble: PipelineRenderer = {
        completePhase: () => {},
        resume: () => {},
        setApprovalWait: () => {
          eventOrder.push("render-waiting");
        },
        startPhase: () => {},
        stop: () => {},
        suspend: () => {},
        updateSubtask: (...args: [string, string, number, number]) => {
          void args;
        },
      };
      return rendererDouble;
    });

    const notifyWaitSpy = spyOn(
      approvals,
      "handleNotifyWait",
    ).mockImplementation(async () => {
      eventOrder.push("notify");
      await Promise.resolve();
    });

    const result = await runCascadeFrom("stories", "tasks", {
      contextRoot: "/repo",
      headless: true,
      milestonePath: "/tmp/milestone",
      planningLevelRunner: async () => await Promise.resolve(null),
      subtasksPath: "/repo/subtasks.json",
    });

    expect(result.success).toBe(true);

    const waitingRenderIndex = eventOrder.indexOf("render-waiting");
    const notifyIndex = eventOrder.indexOf("notify");

    expect(waitingRenderIndex).toBeGreaterThanOrEqual(0);
    expect(notifyIndex).toBeGreaterThanOrEqual(0);
    expect(waitingRenderIndex).toBeLessThan(notifyIndex);

    evaluateApprovalSpy.mockRestore();
    rendererFactorySpy.mockRestore();
    notifyWaitSpy.mockRestore();
  });
});

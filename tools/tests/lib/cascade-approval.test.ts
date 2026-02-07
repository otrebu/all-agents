import type { Mock } from "bun:test";

import * as approvals from "@tools/commands/ralph/approvals";
import {
  buildApprovalContext,
  checkApprovalGate,
  levelToGate,
} from "@tools/commands/ralph/cascade";
import { afterEach, describe, expect, spyOn, test } from "bun:test";

describe("levelToGate", () => {
  test("returns correct gate mapping for all levels", () => {
    expect(levelToGate("roadmap")).toBe("createRoadmap");
    expect(levelToGate("stories")).toBe("createStories");
    expect(levelToGate("tasks")).toBe("createTasks");
    expect(levelToGate("subtasks")).toBe("createSubtasks");
    expect(levelToGate("build")).toBeNull();
    expect(levelToGate("calibrate")).toBeNull();
  });
});

describe("buildApprovalContext", () => {
  const isOriginalTTY: boolean | undefined = process.stdin.isTTY;

  afterEach(() => {
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: isOriginalTTY,
    });
  });

  test("sets forceFlag and reviewFlag from options", () => {
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });

    const context = buildApprovalContext({
      contextRoot: "/repo",
      forceFlag: true,
      reviewFlag: true,
      subtasksPath: "/repo/subtasks.json",
    });

    expect(context.forceFlag).toBe(true);
    expect(context.reviewFlag).toBe(true);
  });

  test("sets isTTY false when headless is true", () => {
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });

    const context = buildApprovalContext({
      contextRoot: "/repo",
      headless: true,
      subtasksPath: "/repo/subtasks.json",
    });

    expect(context.isTTY).toBe(false);
  });

  test("sets isTTY true when stdin is tty and not headless", () => {
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });

    const context = buildApprovalContext({
      contextRoot: "/repo",
      subtasksPath: "/repo/subtasks.json",
    });

    expect(context.isTTY).toBe(true);
  });
});

describe("checkApprovalGate", () => {
  let consoleLogSpy: Mock<typeof console.log> | null = null;

  afterEach(() => {
    consoleLogSpy?.mockRestore();
    consoleLogSpy = null;
  });

  test("returns continue for null gate levels", async () => {
    const result = await checkApprovalGate("build", undefined, {
      forceFlag: false,
      isTTY: false,
      reviewFlag: false,
    });

    expect(result).toBe("continue");
  });

  test("dispatches write action to continue", async () => {
    const evaluateSpy = spyOn(approvals, "evaluateApproval").mockReturnValue(
      "write",
    );

    const result = await checkApprovalGate("stories", undefined, {
      forceFlag: false,
      isTTY: true,
      reviewFlag: false,
    });

    expect(evaluateSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe("continue");
    evaluateSpy.mockRestore();
  });

  test("dispatches prompt action and returns aborted on rejection", async () => {
    const evaluateSpy = spyOn(approvals, "evaluateApproval").mockReturnValue(
      "prompt",
    );
    const promptSpy = spyOn(approvals, "promptApproval").mockResolvedValue(
      false,
    );

    const result = await checkApprovalGate("tasks", undefined, {
      forceFlag: false,
      isTTY: true,
      reviewFlag: false,
    });

    expect(promptSpy).toHaveBeenCalledWith("createTasks", expect.any(String));
    expect(result).toBe("aborted");
    promptSpy.mockRestore();
    evaluateSpy.mockRestore();
  });

  test("dispatches notify-wait action to continue", async () => {
    const evaluateSpy = spyOn(approvals, "evaluateApproval").mockReturnValue(
      "notify-wait",
    );
    const notifyWaitSpy = spyOn(
      approvals,
      "handleNotifyWait",
    ).mockImplementation(async () => {});

    const result = await checkApprovalGate("subtasks", undefined, {
      forceFlag: false,
      isTTY: false,
      reviewFlag: false,
    });

    expect(result).toBe("continue");
    expect(notifyWaitSpy).toHaveBeenCalledTimes(1);
    const firstCall = notifyWaitSpy.mock.calls[0];
    expect(firstCall?.[0]).toBe("createSubtasks");
    expect(firstCall?.[1]).toBeUndefined();
    expect(firstCall?.[2]).toBe("Proceeding with subtasks level");
    notifyWaitSpy.mockRestore();
    evaluateSpy.mockRestore();
  });

  test("dispatches exit-unstaged action", async () => {
    const evaluateSpy = spyOn(approvals, "evaluateApproval").mockReturnValue(
      "exit-unstaged",
    );
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    const result = await checkApprovalGate("roadmap", undefined, {
      forceFlag: false,
      isTTY: false,
      reviewFlag: false,
    });

    expect(result).toBe("exit-unstaged");
    expect(
      consoleLogSpy.mock.calls.some((call) =>
        String(call[0]).includes("exit-unstaged"),
      ),
    ).toBe(true);
    evaluateSpy.mockRestore();
  });
});

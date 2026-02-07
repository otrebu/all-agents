import type {
  CalibrateOptions,
  CalibrateSubcommand,
} from "@tools/commands/ralph/calibrate";
import type * as CascadeModule from "@tools/commands/ralph/cascade";
import type { BuildOptions } from "@tools/commands/ralph/types";

import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";

type RunCascadeFromFunction = typeof CascadeModule.runCascadeFrom;
type RunLevelFunction = typeof CascadeModule.runLevel;

const runBuildMock = mock(
  async (_options: BuildOptions, _contextRoot: string): Promise<void> => {
    void _options;
    void _contextRoot;
    await Promise.resolve();
  },
);

const runCalibrateMock = mock(
  async (
    _subcommand: CalibrateSubcommand,
    _options: CalibrateOptions,
  ): Promise<boolean> => {
    void _subcommand;
    void _options;
    await Promise.resolve();
    return true;
  },
);

void mock.module("@tools/commands/ralph/build", () => ({
  default: runBuildMock,
}));

void mock.module("@tools/commands/ralph/calibrate", () => ({
  runCalibrate: runCalibrateMock,
}));

async function runCascadeFromPlaceholder(
  _start: string,
  _target: string,
  _options: Parameters<RunCascadeFromFunction>[2],
): ReturnType<RunCascadeFromFunction> {
  void _start;
  void _target;
  void _options;
  await Promise.resolve();
  return { completedLevels: [], error: null, stoppedAt: null, success: true };
}

let runCascadeFrom: RunCascadeFromFunction = runCascadeFromPlaceholder;

async function runLevelPlaceholder(
  _level: string,
  _options: Parameters<RunLevelFunction>[1],
): ReturnType<RunLevelFunction> {
  void _level;
  void _options;
  await Promise.resolve();
  return null;
}

let runLevel: RunLevelFunction = runLevelPlaceholder;

describe("cascade provider/model forwarding", () => {
  beforeAll(async () => {
    const cascadeModule = await import("@tools/commands/ralph/cascade");
    ({ runCascadeFrom, runLevel } = cascadeModule);
  });

  beforeEach(() => {
    runBuildMock.mockClear();
    runCalibrateMock.mockClear();
  });

  test("runLevel('build') forwards provider/model to runBuild", async () => {
    const error = await runLevel("build", {
      contextRoot: "/repo",
      model: "openai/gpt-5.3-codex",
      provider: "opencode",
      subtasksPath: "/repo/subtasks.json",
    });

    expect(error).toBeNull();
    expect(runBuildMock).toHaveBeenCalledTimes(1);

    const buildCall = runBuildMock.mock.calls[0];
    if (buildCall === undefined) {
      throw new Error("Expected runBuild call");
    }

    const [buildOptions, contextRoot] = buildCall;
    expect(contextRoot).toBe("/repo");
    expect(buildOptions).toMatchObject({
      model: "openai/gpt-5.3-codex",
      provider: "opencode",
      subtasksPath: "/repo/subtasks.json",
    });
  });

  test("runLevel('calibrate') forwards provider/model to runCalibrate", async () => {
    const error = await runLevel("calibrate", {
      contextRoot: "/repo",
      forceFlag: true,
      model: "openai/gpt-5.3-codex",
      provider: "opencode",
      reviewFlag: false,
      subtasksPath: "/repo/subtasks.json",
    });

    expect(error).toBeNull();
    expect(runCalibrateMock).toHaveBeenCalledTimes(1);

    const calibrateCall = runCalibrateMock.mock.calls[0];
    if (calibrateCall === undefined) {
      throw new Error("Expected runCalibrate call");
    }

    const [subcommand, calibrateOptions] = calibrateCall;
    expect(subcommand).toBe("all");
    expect(calibrateOptions).toMatchObject({
      contextRoot: "/repo",
      force: true,
      model: "openai/gpt-5.3-codex",
      provider: "opencode",
      review: false,
      subtasksPath: "/repo/subtasks.json",
    });
  });

  test("runCascadeFrom preserves provider/model through level handoff", async () => {
    const result = await runCascadeFrom("build", "calibrate", {
      contextRoot: "/repo",
      headless: true,
      model: "openai/gpt-5.3-codex",
      provider: "opencode",
      subtasksPath: "/repo/subtasks.json",
    });

    expect(result).toMatchObject({
      completedLevels: ["calibrate"],
      error: null,
      stoppedAt: null,
      success: true,
    });
    expect(runCalibrateMock).toHaveBeenCalledTimes(1);

    const calibrateCall = runCalibrateMock.mock.calls[0];
    if (calibrateCall === undefined) {
      throw new Error("Expected runCalibrate call");
    }

    const [, calibrateOptions] = calibrateCall;
    expect(calibrateOptions).toMatchObject({
      model: "openai/gpt-5.3-codex",
      provider: "opencode",
    });
  });

  test("runCascadeFrom remains backward-compatible when provider/model omitted", async () => {
    const result = await runCascadeFrom("build", "calibrate", {
      contextRoot: "/repo",
      headless: true,
      subtasksPath: "/repo/subtasks.json",
    });

    expect(result.success).toBe(true);
    expect(runCalibrateMock).toHaveBeenCalledTimes(1);

    const calibrateCall = runCalibrateMock.mock.calls[0];
    if (calibrateCall === undefined) {
      throw new Error("Expected runCalibrate call");
    }

    const [, calibrateOptions] = calibrateCall;
    expect(calibrateOptions).toMatchObject({
      contextRoot: "/repo",
      model: undefined,
      provider: undefined,
      subtasksPath: "/repo/subtasks.json",
    });
  });
});

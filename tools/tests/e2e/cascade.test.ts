/**
 * E2E tests for cascade validation and CLI pipeline behavior
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
import { getContextRoot } from "@tools/utils/paths";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execa, type ResultPromise } from "execa";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");
const CLI_ENTRY = join(import.meta.dir, "../../src/cli.ts");

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

  test("forward cascade through executable planning levels returns null (valid)", () => {
    expect(validateCascadeTarget("stories", "subtasks")).toBeNull();
    expect(validateCascadeTarget("stories", "calibrate")).toBeNull();

    const roadmapError = validateCascadeTarget("roadmap", "subtasks");
    expect(roadmapError).not.toBeNull();
    expect(roadmapError).toContain("not executable yet");
    expect(roadmapError).toContain("Unsupported levels in path: stories");
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

describe("cascade E2E - CLI pipeline header", () => {
  let temporaryDirectory = "";
  const runningProcesses = new Set<ResultPromise>();

  function trackProcess(process: ResultPromise): ResultPromise {
    runningProcesses.add(process);
    return process;
  }

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `cascade-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    for (const process of runningProcesses) {
      if (process.exitCode === null && process.pid !== undefined) {
        try {
          process.kill("SIGKILL");
        } catch {
          // Ignore cleanup failures.
        }
      }
    }
    runningProcesses.clear();

    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("cascade shows phase transitions in header", async () => {
    const milestoneDirectory = join(temporaryDirectory, "test-milestone");
    const storiesDirectory = join(milestoneDirectory, "stories");
    const tasksDirectory = join(milestoneDirectory, "tasks");
    mkdirSync(storiesDirectory, { recursive: true });
    mkdirSync(tasksDirectory, { recursive: true });

    writeFileSync(
      join(storiesDirectory, "001-story.md"),
      "# Story\n\nPipeline header test story\n",
    );
    writeFileSync(
      join(tasksDirectory, "001-task.md"),
      "# Task\n\nPipeline header test task\n",
    );
    writeFileSync(
      join(milestoneDirectory, "subtasks.json"),
      JSON.stringify(
        {
          metadata: { milestoneRef: "test-milestone", scope: "milestone" },
          subtasks: [
            {
              acceptanceCriteria: ["Already complete"],
              description: "Existing subtask keeps build phase fast",
              done: true,
              filesToRead: [],
              id: "SUB-001",
              taskRef: "001-task",
              title: "Completed seed",
            },
          ],
        },
        null,
        2,
      ),
    );

    const mockClaudePath = join(temporaryDirectory, "claude");
    writeFileSync(
      mockClaudePath,
      `#!/bin/bash
cat <<'JSON'
[{"type":"result","result":"ok","duration_ms":5,"total_cost_usd":0.0,"session_id":"sess-cascade-header"}]
JSON
`,
      { mode: 0o755 },
    );

    const command = `PATH="${temporaryDirectory}:${process.env.PATH ?? ""}" bun "${CLI_ENTRY}" ralph plan stories --milestone "${milestoneDirectory}" --from subtasks --cascade calibrate --headless --force`;
    const childProcess = trackProcess(
      execa("script", ["-qec", command, "/dev/null"], {
        cwd: TOOLS_DIR,
        env: { ...process.env, TERM: "xterm-256color" },
        reject: false,
        timeout: 10_000,
      }),
    );

    const { exitCode, stdout } = await childProcess;
    const output = typeof stdout === "string" ? stdout : String(stdout ?? "");

    expect(exitCode).toBe(0);
    expect(output).toContain("[build]");
    expect(output).toContain("[calibrate]");
    expect(output).toContain("→");
    expect(output).toMatch(/\[build\][^\n]*✓/);
  }, 20_000);

  test("cascade shows waiting symbol at approval gate and transitions after approval", async () => {
    const milestoneDirectory = join(temporaryDirectory, "prompt-milestone");
    const storiesDirectory = join(milestoneDirectory, "stories");
    mkdirSync(storiesDirectory, { recursive: true });

    writeFileSync(
      join(storiesDirectory, "001-story.md"),
      "# Story\n\nPrompt approval gate waiting symbol test\n",
    );

    const mockClaudePath = join(temporaryDirectory, "claude");
    writeFileSync(
      mockClaudePath,
      `#!/bin/bash
cat <<'JSON'
[{"type":"result","result":"ok","duration_ms":5,"total_cost_usd":0.0,"session_id":"sess-cascade-wait"}]
JSON
`,
      { mode: 0o755 },
    );

    const command = `PATH="${temporaryDirectory}:${process.env.PATH ?? ""}" bun "${CLI_ENTRY}" ralph plan stories --milestone "${milestoneDirectory}" --cascade tasks --review`;
    const childProcess = trackProcess(
      execa("script", ["-qec", command, "/dev/null"], {
        cwd: TOOLS_DIR,
        env: { ...process.env, TERM: "xterm-256color" },
        input: "y\n",
        reject: false,
        timeout: 20_000,
      }),
    );

    const { exitCode, stdout } = await childProcess;
    const output = typeof stdout === "string" ? stdout : String(stdout ?? "");

    expect(exitCode).toBe(0);
    expect(output).toMatch(/\[tasks\][^\n]*‖/);
    expect(output).toMatch(/\[tasks\][^\n]*(?:◉|✓)/);

    const waitingIndex = output.search(/\[tasks\][^\n]*‖/);
    const resumedAfterWaiting = output
      .slice(waitingIndex + 1)
      .search(/\[tasks\][^\n]*(?:◉|✓)/);
    expect(waitingIndex).toBeGreaterThanOrEqual(0);
    expect(resumedAfterWaiting).toBeGreaterThanOrEqual(0);
  }, 30_000);
});

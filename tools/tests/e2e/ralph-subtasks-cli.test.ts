import { getContextRoot } from "@tools/utils/paths";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execa } from "execa";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

describe("ralph subtasks append/prepend CLI", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `ralph-subtasks-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("append --help includes --subtasks, --file, and --dry-run", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "ralph", "subtasks", "append", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("--subtasks <path>");
    expect(stdout).toContain("--file <path>");
    expect(stdout).toContain("--dry-run");
  });

  test("prepend --help includes --subtasks, --file, and --dry-run", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "ralph", "subtasks", "prepend", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("--subtasks <path>");
    expect(stdout).toContain("--file <path>");
    expect(stdout).toContain("--dry-run");
  });

  test("append --dry-run prints JSON and does not write", async () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    writeFileSync(
      subtasksPath,
      JSON.stringify(
        {
          metadata: { milestoneRef: "test", scope: "milestone" },
          subtasks: [
            {
              acceptanceCriteria: ["existing"],
              description: "existing",
              done: false,
              filesToRead: [],
              id: "SUB-001",
              taskRef: "TASK-001",
              title: "existing",
            },
            {
              acceptanceCriteria: ["existing"],
              description: "existing",
              done: false,
              filesToRead: [],
              id: "SUB-002",
              taskRef: "TASK-001",
              title: "existing 2",
            },
          ],
        },
        null,
        2,
      ),
    );

    const payloadPath = join(temporaryDirectory, "payload.json");
    writeFileSync(
      payloadPath,
      JSON.stringify(
        [
          {
            acceptanceCriteria: ["a"],
            description: "new one",
            filesToRead: ["tools/src/commands/ralph/index.ts"],
            taskRef: "TASK-001",
            title: "new one",
          },
          {
            acceptanceCriteria: ["b"],
            description: "new two",
            filesToRead: ["tools/src/commands/ralph/config.ts"],
            taskRef: "TASK-001",
            title: "new two",
          },
        ],
        null,
        2,
      ),
    );

    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "ralph",
        "subtasks",
        "append",
        "--subtasks",
        subtasksPath,
        "--file",
        payloadPath,
        "--dry-run",
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);

    const parsed = JSON.parse(stdout) as {
      afterCount: number;
      allocatedIds: Array<string>;
      beforeCount: number;
      command: string;
      dryRun: boolean;
    };

    expect(parsed.command).toBe("append");
    expect(parsed.dryRun).toBe(true);
    expect(parsed.beforeCount).toBe(2);
    expect(parsed.afterCount).toBe(4);
    expect(parsed.allocatedIds).toEqual(["SUB-003", "SUB-004"]);

    const queueAfter = JSON.parse(readFileSync(subtasksPath, "utf8")) as {
      subtasks: Array<{ id: string }>;
    };
    expect(queueAfter.subtasks).toHaveLength(2);
    expect(queueAfter.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-001",
      "SUB-002",
    ]);
  });

  test("prepend --dry-run prints JSON and does not write", async () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    writeFileSync(
      subtasksPath,
      JSON.stringify(
        {
          metadata: { milestoneRef: "test", scope: "milestone" },
          subtasks: [
            {
              acceptanceCriteria: ["existing"],
              description: "existing",
              done: false,
              filesToRead: [],
              id: "SUB-009",
              taskRef: "TASK-001",
              title: "existing",
            },
            {
              acceptanceCriteria: ["existing"],
              description: "existing",
              done: false,
              filesToRead: [],
              id: "SUB-010",
              taskRef: "TASK-001",
              title: "existing 2",
            },
          ],
        },
        null,
        2,
      ),
    );

    const inputPayload = {
      acceptanceCriteria: ["new"],
      description: "new first",
      filesToRead: ["tools/src/commands/ralph/queue-ops.ts"],
      taskRef: "TASK-001",
      title: "new first",
    };

    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "ralph",
        "subtasks",
        "prepend",
        "--subtasks",
        subtasksPath,
        "--dry-run",
      ],
      { cwd: TOOLS_DIR, input: JSON.stringify(inputPayload) },
    );

    expect(exitCode).toBe(0);

    const parsed = JSON.parse(stdout) as {
      afterCount: number;
      allocatedIds: Array<string>;
      beforeCount: number;
      command: string;
      dryRun: boolean;
    };

    expect(parsed.command).toBe("prepend");
    expect(parsed.dryRun).toBe(true);
    expect(parsed.beforeCount).toBe(2);
    expect(parsed.afterCount).toBe(3);
    expect(parsed.allocatedIds).toEqual(["SUB-011"]);

    const queueAfter = JSON.parse(readFileSync(subtasksPath, "utf8")) as {
      subtasks: Array<{ id: string }>;
    };
    expect(queueAfter.subtasks).toHaveLength(2);
    expect(queueAfter.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-009",
      "SUB-010",
    ]);
  });
});

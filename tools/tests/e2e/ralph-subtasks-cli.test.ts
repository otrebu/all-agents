import { computeFingerprint } from "@tools/commands/ralph/types";
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

describe("ralph subtasks queue mutation CLI", () => {
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

  test("append writes new subtasks to queue tail with allocated IDs", async () => {
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

    const payloadPath = join(temporaryDirectory, "append-payload.json");
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

    const { exitCode } = await execa(
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
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    const queueAfter = JSON.parse(readFileSync(subtasksPath, "utf8")) as {
      subtasks: Array<{ id: string }>;
    };
    expect(queueAfter.subtasks).toHaveLength(4);
    expect(queueAfter.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-001",
      "SUB-002",
      "SUB-003",
      "SUB-004",
    ]);
  });

  test("prepend writes new subtasks to queue head with allocated IDs", async () => {
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

    const payloadPath = join(temporaryDirectory, "prepend-payload.json");
    writeFileSync(
      payloadPath,
      JSON.stringify(
        [
          {
            acceptanceCriteria: ["new first"],
            description: "new first",
            filesToRead: ["tools/src/commands/ralph/queue-ops.ts"],
            taskRef: "TASK-001",
            title: "new first",
          },
          {
            acceptanceCriteria: ["new second"],
            description: "new second",
            filesToRead: ["tools/src/commands/ralph/index.ts"],
            taskRef: "TASK-001",
            title: "new second",
          },
        ],
        null,
        2,
      ),
    );

    const { exitCode } = await execa(
      "bun",
      [
        "run",
        "dev",
        "ralph",
        "subtasks",
        "prepend",
        "--subtasks",
        subtasksPath,
        "--file",
        payloadPath,
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    const queueAfter = JSON.parse(readFileSync(subtasksPath, "utf8")) as {
      subtasks: Array<{ id: string }>;
    };
    expect(queueAfter.subtasks).toHaveLength(4);
    expect(queueAfter.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-011",
      "SUB-012",
      "SUB-009",
      "SUB-010",
    ]);
  });

  test("file on disk reflects expected count and order after append then prepend", async () => {
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

    const appendPayloadPath = join(
      temporaryDirectory,
      "append-single-payload.json",
    );
    writeFileSync(
      appendPayloadPath,
      JSON.stringify(
        {
          acceptanceCriteria: ["append"],
          description: "append one",
          filesToRead: ["tools/src/commands/ralph/index.ts"],
          taskRef: "TASK-001",
          title: "append one",
        },
        null,
        2,
      ),
    );

    const prependPayloadPath = join(
      temporaryDirectory,
      "prepend-single-payload.json",
    );
    writeFileSync(
      prependPayloadPath,
      JSON.stringify(
        {
          acceptanceCriteria: ["prepend"],
          description: "prepend one",
          filesToRead: ["tools/src/commands/ralph/queue-ops.ts"],
          taskRef: "TASK-001",
          title: "prepend one",
        },
        null,
        2,
      ),
    );

    const appendResult = await execa(
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
        appendPayloadPath,
      ],
      { cwd: TOOLS_DIR },
    );
    expect(appendResult.exitCode).toBe(0);

    const prependResult = await execa(
      "bun",
      [
        "run",
        "dev",
        "ralph",
        "subtasks",
        "prepend",
        "--subtasks",
        subtasksPath,
        "--file",
        prependPayloadPath,
      ],
      { cwd: TOOLS_DIR },
    );
    expect(prependResult.exitCode).toBe(0);

    const queueAfter = JSON.parse(readFileSync(subtasksPath, "utf8")) as {
      subtasks: Array<{ id: string }>;
    };
    expect(queueAfter.subtasks).toHaveLength(4);
    expect(queueAfter.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-004",
      "SUB-001",
      "SUB-002",
      "SUB-003",
    ]);
  });

  test("diff shows readable queue change summary", async () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    const baseQueue = {
      subtasks: [
        {
          acceptanceCriteria: ["existing"],
          description: "existing",
          done: false,
          filesToRead: [],
          id: "SUB-001",
          taskRef: "TASK-001",
          title: "First",
        },
      ],
    };
    writeFileSync(subtasksPath, JSON.stringify(baseQueue, null, 2));

    const proposalPath = join(temporaryDirectory, "proposal.json");
    writeFileSync(
      proposalPath,
      JSON.stringify(
        {
          fingerprint: computeFingerprint(baseQueue.subtasks),
          operations: [
            {
              changes: { title: "First updated" },
              id: "SUB-001",
              type: "update",
            },
            {
              atIndex: 1,
              subtask: {
                acceptanceCriteria: ["new"],
                description: "new",
                filesToRead: ["tools/src/commands/ralph/index.ts"],
                taskRef: "TASK-001",
                title: "Second",
              },
              type: "create",
            },
          ],
          source: "test",
          timestamp: "2026-02-10T00:00:00Z",
        },
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
        "diff",
        "--proposal",
        proposalPath,
        "--subtasks",
        subtasksPath,
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Queue diff for");
    expect(stdout).toContain("Added (1):");
    expect(stdout).toContain("Updated (1):");
    expect(stdout).toContain('"First" -> "First updated"');
  });

  test("diff --json returns machine-parseable output", async () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    const baseQueue = {
      subtasks: [
        {
          acceptanceCriteria: ["existing"],
          description: "existing",
          done: false,
          filesToRead: [],
          id: "SUB-001",
          taskRef: "TASK-001",
          title: "First",
        },
      ],
    };
    writeFileSync(subtasksPath, JSON.stringify(baseQueue, null, 2));

    const proposalPath = join(temporaryDirectory, "proposal.json");
    writeFileSync(
      proposalPath,
      JSON.stringify(
        {
          fingerprint: computeFingerprint(baseQueue.subtasks),
          operations: [
            {
              atIndex: 1,
              subtask: {
                acceptanceCriteria: ["new"],
                description: "new",
                filesToRead: [],
                taskRef: "TASK-001",
                title: "Second",
              },
              type: "create",
            },
          ],
          source: "test",
          timestamp: "2026-02-10T00:00:00Z",
        },
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
        "diff",
        "--proposal",
        proposalPath,
        "--subtasks",
        subtasksPath,
        "--json",
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout) as {
      added: Array<{ id: string }>;
      changes: number;
      command: string;
      operations: number;
      subtasksAfter: number;
      subtasksBefore: number;
    };

    expect(parsed.command).toBe("diff");
    expect(parsed.operations).toBe(1);
    expect(parsed.subtasksBefore).toBe(1);
    expect(parsed.subtasksAfter).toBe(2);
    expect(parsed.changes).toBeGreaterThan(0);
    expect(parsed.added.map((entry) => entry.id)).toEqual(["SUB-002"]);
  });

  test("apply writes proposal changes deterministically", async () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    const baseQueue = {
      subtasks: [
        {
          acceptanceCriteria: ["existing"],
          description: "existing",
          done: false,
          filesToRead: [],
          id: "SUB-001",
          taskRef: "TASK-001",
          title: "First",
        },
      ],
    };
    writeFileSync(subtasksPath, JSON.stringify(baseQueue, null, 2));

    const proposalPath = join(temporaryDirectory, "proposal.json");
    writeFileSync(
      proposalPath,
      JSON.stringify(
        {
          fingerprint: computeFingerprint(baseQueue.subtasks),
          operations: [
            {
              changes: { title: "First updated" },
              id: "SUB-001",
              type: "update",
            },
            {
              atIndex: 1,
              subtask: {
                acceptanceCriteria: ["new"],
                description: "new",
                filesToRead: ["tools/src/commands/ralph/queue-ops.ts"],
                taskRef: "TASK-001",
                title: "Second",
              },
              type: "create",
            },
          ],
          source: "test",
          timestamp: "2026-02-10T00:00:00Z",
        },
        null,
        2,
      ),
    );

    const { exitCode } = await execa(
      "bun",
      [
        "run",
        "dev",
        "ralph",
        "subtasks",
        "apply",
        "--proposal",
        proposalPath,
        "--subtasks",
        subtasksPath,
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    const queueAfter = JSON.parse(readFileSync(subtasksPath, "utf8")) as {
      subtasks: Array<{ id: string; title: string }>;
    };
    expect(queueAfter.subtasks).toHaveLength(2);
    expect(queueAfter.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-001",
      "SUB-002",
    ]);
    expect(queueAfter.subtasks[0]?.title).toBe("First updated");
    expect(queueAfter.subtasks[1]?.title).toBe("Second");
  });

  test("apply fails with actionable error on fingerprint mismatch", async () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    const baseQueue = {
      subtasks: [
        {
          acceptanceCriteria: ["existing"],
          description: "existing",
          done: false,
          filesToRead: [],
          id: "SUB-001",
          taskRef: "TASK-001",
          title: "First",
        },
      ],
    };
    writeFileSync(subtasksPath, JSON.stringify(baseQueue, null, 2));

    const proposalPath = join(temporaryDirectory, "proposal.json");
    writeFileSync(
      proposalPath,
      JSON.stringify(
        {
          fingerprint: { hash: "not-the-current-fingerprint" },
          operations: [],
          source: "test",
          timestamp: "2026-02-10T00:00:00Z",
        },
        null,
        2,
      ),
    );

    const { exitCode, stderr } = await execa(
      "bun",
      [
        "run",
        "dev",
        "ralph",
        "subtasks",
        "apply",
        "--proposal",
        proposalPath,
        "--subtasks",
        subtasksPath,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Fingerprint mismatch");
    expect(stderr).toContain("Action: regenerate the proposal");
  });
});

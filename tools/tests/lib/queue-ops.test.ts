import {
  appendSubtasksToFile,
  loadSubtasksFile,
} from "@tools/commands/ralph/config";
import applyQueueOperations, {
  applyAndSaveProposal,
} from "@tools/commands/ralph/queue-ops";
import {
  computeFingerprint,
  type QueueProposal,
  type Subtask,
  type SubtasksFile,
} from "@tools/commands/ralph/types";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function makeProposal(
  file: SubtasksFile,
  operations: QueueProposal["operations"],
): QueueProposal {
  return {
    fingerprint: computeFingerprint(file.subtasks),
    operations,
    source: "unit-test",
    timestamp: "2026-02-10T12:00:00Z",
  };
}

function makeSubtask(id: string, isDone = false, title = id): Subtask {
  return {
    acceptanceCriteria: [`${id} AC`],
    description: `${id} description`,
    done: isDone,
    filesToRead: ["tools/src/commands/ralph/queue-ops.ts"],
    id,
    taskRef: "TASK-001",
    title,
  };
}

function makeSubtasksFile(subtasks: Array<Subtask>): SubtasksFile {
  return { subtasks };
}

describe("applyQueueOperations", () => {
  test("exports applyQueueOperations", () => {
    expect(typeof applyQueueOperations).toBe("function");
  });

  test("create inserts at target index and allocates next canonical SUB id", () => {
    const input = makeSubtasksFile([
      makeSubtask("SUB-001"),
      makeSubtask("SUB-002"),
    ]);
    const proposal = makeProposal(input, [
      {
        atIndex: 0,
        subtask: {
          acceptanceCriteria: ["new AC"],
          description: "new description",
          filesToRead: ["docs/planning/PROGRESS.md"],
          taskRef: "TASK-002",
          title: "Created",
        },
        type: "create",
      },
    ]);

    const result = applyQueueOperations(input, proposal);

    expect(result.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-003",
      "SUB-001",
      "SUB-002",
    ]);
    expect(result.subtasks[0]?.done).toBe(false);
    expect(result.subtasks[0]?.title).toBe("Created");
  });

  test("create at middle index inserts between existing subtasks", () => {
    const input = makeSubtasksFile([
      makeSubtask("SUB-001"),
      makeSubtask("SUB-002"),
      makeSubtask("SUB-003"),
    ]);
    const proposal = makeProposal(input, [
      {
        atIndex: 1,
        subtask: {
          acceptanceCriteria: ["inserted AC"],
          description: "inserted description",
          filesToRead: ["docs/planning/PROGRESS.md"],
          taskRef: "TASK-002",
          title: "Inserted",
        },
        type: "create",
      },
    ]);

    const result = applyQueueOperations(input, proposal);

    expect(result.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-001",
      "SUB-004",
      "SUB-002",
      "SUB-003",
    ]);
    expect(result.subtasks[1]?.title).toBe("Inserted");
  });

  test("prepend create operations preserve draft order at queue front", () => {
    const input = makeSubtasksFile([
      makeSubtask("SUB-001"),
      makeSubtask("SUB-002"),
    ]);
    const proposal = makeProposal(input, [
      {
        atIndex: 0,
        subtask: {
          acceptanceCriteria: ["first AC"],
          description: "first description",
          filesToRead: ["first"],
          taskRef: "TASK-001",
          title: "First corrective",
        },
        type: "create",
      },
      {
        atIndex: 1,
        subtask: {
          acceptanceCriteria: ["second AC"],
          description: "second description",
          filesToRead: ["second"],
          taskRef: "TASK-001",
          title: "Second corrective",
        },
        type: "create",
      },
    ]);

    const result = applyQueueOperations(input, proposal);

    expect(result.subtasks.map((subtask) => subtask.title)).toEqual([
      "First corrective",
      "Second corrective",
      "SUB-001",
      "SUB-002",
    ]);
  });

  test("update modifies pending subtasks", () => {
    const input = makeSubtasksFile([makeSubtask("SUB-001")]);
    const proposal = makeProposal(input, [
      {
        changes: {
          acceptanceCriteria: ["updated AC"],
          description: "updated description",
          title: "Updated title",
        },
        id: "SUB-001",
        type: "update",
      },
    ]);

    const result = applyQueueOperations(input, proposal);

    expect(result.subtasks[0]?.title).toBe("Updated title");
    expect(result.subtasks[0]?.description).toBe("updated description");
    expect(result.subtasks[0]?.acceptanceCriteria).toEqual(["updated AC"]);
  });

  test("remove deletes pending subtasks", () => {
    const input = makeSubtasksFile([
      makeSubtask("SUB-001"),
      makeSubtask("SUB-002"),
    ]);
    const proposal = makeProposal(input, [{ id: "SUB-001", type: "remove" }]);

    const result = applyQueueOperations(input, proposal);

    expect(result.subtasks.map((subtask) => subtask.id)).toEqual(["SUB-002"]);
  });

  test("reorder changes array positions", () => {
    const input = makeSubtasksFile([
      makeSubtask("SUB-001"),
      makeSubtask("SUB-002"),
      makeSubtask("SUB-003"),
    ]);
    const proposal = makeProposal(input, [
      { id: "SUB-001", toIndex: 2, type: "reorder" },
    ]);

    const result = applyQueueOperations(input, proposal);

    expect(result.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-002",
      "SUB-003",
      "SUB-001",
    ]);
  });

  test("split replaces one pending subtask with multiple new subtasks", () => {
    const input = makeSubtasksFile([
      makeSubtask("SUB-001"),
      makeSubtask("SUB-005"),
      makeSubtask("SUB-010"),
    ]);
    const proposal = makeProposal(input, [
      {
        id: "SUB-005",
        subtasks: [
          {
            acceptanceCriteria: ["child 1 AC"],
            description: "child 1",
            filesToRead: ["a"],
            taskRef: "TASK-001",
            title: "Child 1",
          },
          {
            acceptanceCriteria: ["child 2 AC"],
            description: "child 2",
            filesToRead: ["b"],
            taskRef: "TASK-001",
            title: "Child 2",
          },
        ],
        type: "split",
      },
    ]);

    const result = applyQueueOperations(input, proposal);

    expect(result.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-001",
      "SUB-011",
      "SUB-012",
      "SUB-010",
    ]);
    expect(result.subtasks[1]?.title).toBe("Child 1");
    expect(result.subtasks[2]?.title).toBe("Child 2");
  });

  test("second application of same proposal is no-op via fingerprint replay protection", () => {
    const input = makeSubtasksFile([makeSubtask("SUB-001")]);
    const proposal = makeProposal(input, [
      {
        atIndex: 0,
        subtask: {
          acceptanceCriteria: ["new AC"],
          description: "new description",
          filesToRead: ["x"],
          taskRef: "TASK-001",
          title: "Created",
        },
        type: "create",
      },
    ]);

    const first = applyQueueOperations(input, proposal);
    const second = applyQueueOperations(first, proposal);

    expect(first.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-002",
      "SUB-001",
    ]);
    expect(second.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-002",
      "SUB-001",
    ]);
  });

  test("throws actionable errors for immutable completed subtasks and missing targets", () => {
    const withCompleted = makeSubtasksFile([makeSubtask("SUB-001", true)]);
    const immutableProposal = makeProposal(withCompleted, [
      { changes: { title: "should fail" }, id: "SUB-001", type: "update" },
    ]);
    expect(() =>
      applyQueueOperations(withCompleted, immutableProposal),
    ).toThrow(/Cannot update SUB-001: completed subtasks are immutable/);

    const missingTargetInput = makeSubtasksFile([makeSubtask("SUB-001")]);
    const missingTargetProposal = makeProposal(missingTargetInput, [
      { id: "SUB-999", type: "remove" },
    ]);
    expect(() =>
      applyQueueOperations(missingTargetInput, missingTargetProposal),
    ).toThrow(/Cannot remove SUB-999: subtask not found/);

    const invalidCreateProposal = makeProposal(missingTargetInput, [
      {
        atIndex: -1,
        subtask: {
          acceptanceCriteria: ["invalid"],
          description: "invalid",
          filesToRead: ["x"],
          taskRef: "TASK-001",
          title: "Invalid",
        },
        type: "create",
      },
    ]);

    expect(() =>
      applyQueueOperations(missingTargetInput, invalidCreateProposal),
    ).toThrow(/Cannot create subtask: atIndex -1 is out of range/);

    const outOfRangeCreateProposal = makeProposal(missingTargetInput, [
      {
        atIndex: 2,
        subtask: {
          acceptanceCriteria: ["invalid"],
          description: "invalid",
          filesToRead: ["x"],
          taskRef: "TASK-001",
          title: "Invalid",
        },
        type: "create",
      },
    ]);

    expect(() =>
      applyQueueOperations(missingTargetInput, outOfRangeCreateProposal),
    ).toThrow(/Cannot create subtask: atIndex 2 is out of range/);
  });
});

describe("appendSubtasksToFile", () => {
  let testDirectory = "";
  let subtasksPath = "";

  beforeEach(() => {
    testDirectory = join(tmpdir(), `queue-append-test-${Date.now()}`);
    mkdirSync(testDirectory, { recursive: true });
    subtasksPath = join(testDirectory, "subtasks.json");
  });

  afterEach(() => {
    if (existsSync(testDirectory)) {
      rmSync(testDirectory, { force: true, recursive: true });
    }
  });

  test("appends to new file when queue does not exist", () => {
    const result = appendSubtasksToFile(subtasksPath, [makeSubtask("SUB-001")]);

    expect(result).toEqual({ added: 1, skipped: 0 });
    expect(existsSync(subtasksPath)).toBe(true);
    expect(
      loadSubtasksFile(subtasksPath).subtasks.map((subtask) => subtask.id),
    ).toEqual(["SUB-001"]);
  });

  test("appends to existing file", () => {
    appendSubtasksToFile(subtasksPath, [makeSubtask("SUB-001")]);

    const result = appendSubtasksToFile(subtasksPath, [
      makeSubtask("SUB-002"),
      makeSubtask("SUB-003"),
    ]);

    expect(result).toEqual({ added: 2, skipped: 0 });
    expect(
      loadSubtasksFile(subtasksPath).subtasks.map((subtask) => subtask.id),
    ).toEqual(["SUB-001", "SUB-002", "SUB-003"]);
  });

  test("skips duplicate IDs already present in queue", () => {
    appendSubtasksToFile(subtasksPath, [makeSubtask("SUB-001")]);

    const result = appendSubtasksToFile(subtasksPath, [
      makeSubtask("SUB-001"),
      makeSubtask("SUB-002"),
    ]);

    expect(result).toEqual({ added: 1, skipped: 1 });
    expect(
      loadSubtasksFile(subtasksPath).subtasks.map((subtask) => subtask.id),
    ).toEqual(["SUB-001", "SUB-002"]);
  });

  test("returns zero counts for empty incoming array", () => {
    const result = appendSubtasksToFile(subtasksPath, []);

    expect(result).toEqual({ added: 0, skipped: 0 });
    expect(loadSubtasksFile(subtasksPath).subtasks).toEqual([]);
  });
});

describe("applyAndSaveProposal", () => {
  let testDirectory = "";
  let subtasksPath = "";

  beforeEach(() => {
    testDirectory = join(tmpdir(), `queue-ops-test-${Date.now()}`);
    mkdirSync(testDirectory, { recursive: true });
    subtasksPath = join(testDirectory, "subtasks.json");
  });

  afterEach(() => {
    if (existsSync(testDirectory)) {
      rmSync(testDirectory, { force: true, recursive: true });
    }
  });

  test("round-trip load -> propose -> apply -> save -> reload matches expected queue state", () => {
    writeFileSync(
      subtasksPath,
      JSON.stringify(
        {
          metadata: { milestoneRef: "test-milestone", scope: "milestone" },
          subtasks: [
            {
              acceptanceCriteria: ["initial"],
              description: "seed",
              done: false,
              filesToRead: ["tools/src/commands/ralph/queue-ops.ts"],
              id: "SUB-001",
              status: "pending",
              taskRef: "TASK-001",
              title: "Seed",
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const loaded = loadSubtasksFile(subtasksPath);
    expect(typeof loaded.fingerprint.hash).toBe("string");
    expect(loaded.fingerprint.hash.length).toBeGreaterThan(0);

    const proposal = makeProposal(loaded, [
      { changes: { title: "Seed updated" }, id: "SUB-001", type: "update" },
      {
        atIndex: 0,
        subtask: {
          acceptanceCriteria: ["created"],
          description: "created",
          filesToRead: ["tools/src/commands/ralph/config.ts"],
          taskRef: "TASK-001",
          title: "Created",
        },
        type: "create",
      },
    ]);

    const summary = applyAndSaveProposal(subtasksPath, proposal);
    const reloaded = loadSubtasksFile(subtasksPath);
    const savedRaw = JSON.parse(readFileSync(subtasksPath, "utf8")) as {
      subtasks: Array<Record<string, unknown>>;
    };

    expect(summary.applied).toBe(true);
    expect(summary.operationsApplied).toBe(2);
    expect(summary.subtasksBefore).toBe(1);
    expect(summary.subtasksAfter).toBe(2);
    expect(summary.fingerprintBefore).toBe(loaded.fingerprint.hash);
    expect(summary.fingerprintAfter).toBe(reloaded.fingerprint.hash);

    expect(reloaded.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-002",
      "SUB-001",
    ]);
    expect(reloaded.subtasks[0]?.title).toBe("Created");
    expect(reloaded.subtasks[1]?.title).toBe("Seed updated");
    expect(savedRaw.subtasks[0]?.status).toBeUndefined();
  });
});

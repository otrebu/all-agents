import applyQueueOperations from "@tools/commands/ralph/queue-ops";
import {
  computeFingerprint,
  type QueueProposal,
  type Subtask,
  type SubtasksFile,
} from "@tools/commands/ralph/types";
import { describe, expect, test } from "bun:test";

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

  test("create appends and allocates next canonical SUB id", () => {
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
      "SUB-001",
      "SUB-002",
      "SUB-003",
    ]);
    expect(result.subtasks[2]?.done).toBe(false);
    expect(result.subtasks[2]?.title).toBe("Created");
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
      "SUB-001",
      "SUB-002",
    ]);
    expect(second.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-001",
      "SUB-002",
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
  });
});

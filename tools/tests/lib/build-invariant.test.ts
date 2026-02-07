import {
  checkAssignedCompletionInvariant,
  detectDoneTransitions,
} from "@tools/commands/ralph/build-invariant";
import { describe, expect, test } from "bun:test";

function createSnapshot(
  id: string,
  isDone: boolean,
): { done: boolean; id: string } {
  return { done: isDone, id };
}

describe("build invariant completion transition checks", () => {
  test("allows only assigned subtask completion", () => {
    const pre = [
      createSnapshot("SUB-001", false),
      createSnapshot("SUB-002", false),
    ];
    const post = [
      createSnapshot("SUB-001", true),
      createSnapshot("SUB-002", false),
    ];

    const result = checkAssignedCompletionInvariant({
      assignedSubtaskId: "SUB-001",
      postSubtasks: post,
      preSubtasks: pre,
    });

    expect(result.isViolation).toBe(false);
    expect(result.completedIds).toEqual(["SUB-001"]);
    expect(result.unexpectedCompletionIds).toEqual([]);
  });

  test("flags violation when assigned and extra subtasks complete", () => {
    const pre = [
      createSnapshot("SUB-001", false),
      createSnapshot("SUB-002", false),
      createSnapshot("SUB-003", false),
    ];
    const post = [
      createSnapshot("SUB-001", true),
      createSnapshot("SUB-002", true),
      createSnapshot("SUB-003", false),
    ];

    const result = checkAssignedCompletionInvariant({
      assignedSubtaskId: "SUB-001",
      postSubtasks: post,
      preSubtasks: pre,
    });

    expect(result.isViolation).toBe(true);
    expect(result.completedIds).toEqual(["SUB-001", "SUB-002"]);
    expect(result.unexpectedCompletionIds).toEqual(["SUB-002"]);
  });

  test("flags violation when only extra subtask completes", () => {
    const pre = [
      createSnapshot("SUB-001", false),
      createSnapshot("SUB-002", false),
    ];
    const post = [
      createSnapshot("SUB-001", false),
      createSnapshot("SUB-002", true),
    ];

    const result = checkAssignedCompletionInvariant({
      assignedSubtaskId: "SUB-001",
      postSubtasks: post,
      preSubtasks: pre,
    });

    expect(result.isViolation).toBe(true);
    expect(result.completedIds).toEqual(["SUB-002"]);
    expect(result.unexpectedCompletionIds).toEqual(["SUB-002"]);
  });

  test("ignores metadata-only edits and no done transitions", () => {
    const pre = [
      createSnapshot("SUB-001", false),
      createSnapshot("SUB-002", true),
    ];
    const post = [
      createSnapshot("SUB-001", false),
      createSnapshot("SUB-002", true),
    ];

    const transitions = detectDoneTransitions(pre, post);
    const result = checkAssignedCompletionInvariant({
      assignedSubtaskId: "SUB-001",
      postSubtasks: post,
      preSubtasks: pre,
    });

    expect(transitions).toEqual([]);
    expect(result.isViolation).toBe(false);
    expect(result.completedIds).toEqual([]);
  });

  test("handles reordered subtask arrays robustly", () => {
    const pre = [
      createSnapshot("SUB-001", false),
      createSnapshot("SUB-002", false),
      createSnapshot("SUB-003", true),
    ];
    const post = [
      createSnapshot("SUB-003", true),
      createSnapshot("SUB-001", true),
      createSnapshot("SUB-002", false),
    ];

    const transitions = detectDoneTransitions(pre, post);
    const result = checkAssignedCompletionInvariant({
      assignedSubtaskId: "SUB-001",
      postSubtasks: post,
      preSubtasks: pre,
    });

    expect(transitions).toEqual(["SUB-001"]);
    expect(result.isViolation).toBe(false);
    expect(result.unexpectedCompletionIds).toEqual([]);
  });
});

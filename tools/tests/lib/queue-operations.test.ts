import { hasFingerprintMismatch } from "@tools/commands/ralph/index";
import { parseQueueOperation } from "@tools/commands/ralph/queue-ops";
import {
  computeFingerprint,
  type QueueOperation,
  type QueueProposal,
  type Subtask,
} from "@tools/commands/ralph/types";
import { describe, expect, test } from "bun:test";

function makeSubtask(id: string, isDone = false): Subtask {
  return {
    acceptanceCriteria: ["AC"],
    description: `${id} description`,
    done: isDone,
    filesToRead: ["tools/src/commands/ralph/index.ts"],
    id,
    taskRef: "TASK-001",
    title: id,
  };
}

describe("queue operation types", () => {
  test("supports create, update, remove, reorder, and split variants", () => {
    const operations: Array<QueueOperation> = [
      {
        atIndex: 0,
        subtask: {
          acceptanceCriteria: ["AC-1"],
          description: "create item",
          filesToRead: ["tools/src/commands/ralph/types.ts"],
          taskRef: "TASK-001",
          title: "Created subtask",
        },
        type: "create",
      },
      { changes: { title: "Updated title" }, id: "SUB-001", type: "update" },
      { id: "SUB-002", type: "remove" },
      { id: "SUB-003", toIndex: 1, type: "reorder" },
      {
        id: "SUB-004",
        subtasks: [
          {
            acceptanceCriteria: ["split ac"],
            description: "split child",
            filesToRead: ["docs/planning/PROGRESS.md"],
            taskRef: "TASK-001",
            title: "Split child",
          },
        ],
        type: "split",
      },
    ];

    expect(operations).toHaveLength(5);
    expect(operations.map((operation) => operation.type)).toEqual([
      "create",
      "update",
      "remove",
      "reorder",
      "split",
    ]);
  });

  test("QueueProposal carries required fields", () => {
    const proposal: QueueProposal = {
      fingerprint: { hash: "abc123" },
      operations: [{ id: "SUB-001", type: "remove" }],
      source: "validation",
      timestamp: "2026-02-10T12:00:00Z",
    };

    expect(proposal.operations).toHaveLength(1);
    expect(proposal.fingerprint.hash).toBe("abc123");
    expect(proposal.source).toBe("validation");
    expect(proposal.timestamp).toBe("2026-02-10T12:00:00Z");
  });
});

describe("computeFingerprint", () => {
  test("returns deterministic hash for same queue snapshot", () => {
    const queueState = [
      { done: false, id: "SUB-001" },
      { done: true, id: "SUB-002" },
    ];

    const first = computeFingerprint(queueState);
    const second = computeFingerprint(queueState);

    expect(first).toEqual(second);
    expect(first.hash).toHaveLength(64);
  });

  test("changes hash when done state changes", () => {
    const baseline = computeFingerprint([
      { done: false, id: "SUB-001" },
      { done: false, id: "SUB-002" },
    ]);

    const mutated = computeFingerprint([
      { done: false, id: "SUB-001" },
      { done: true, id: "SUB-002" },
    ]);

    expect(mutated.hash).not.toBe(baseline.hash);
  });
});

describe("hasFingerprintMismatch", () => {
  test("returns mismatched false when proposal fingerprint matches queue", () => {
    const queue = [makeSubtask("SUB-001"), makeSubtask("SUB-002", true)];
    const fingerprint = computeFingerprint(queue).hash;

    const result = hasFingerprintMismatch(
      {
        fingerprint: { hash: fingerprint },
        operations: [],
        source: "unit-test",
        timestamp: "2026-02-10T12:00:00Z",
      },
      queue,
    );

    expect(result).toEqual({
      current: fingerprint,
      mismatched: false,
      proposal: fingerprint,
    });
  });

  test("returns mismatched true when proposal fingerprint differs", () => {
    const queue = [makeSubtask("SUB-001")];

    const result = hasFingerprintMismatch(
      {
        fingerprint: { hash: "stale-hash" },
        operations: [],
        source: "unit-test",
        timestamp: "2026-02-10T12:00:00Z",
      },
      queue,
    );

    expect(result.mismatched).toBe(true);
    expect(result.current).toBe(computeFingerprint(queue).hash);
    expect(result.proposal).toBe("stale-hash");
  });

  test("supports empty queue fingerprint comparison", () => {
    const queue: Array<Subtask> = [];
    const fingerprint = computeFingerprint(queue).hash;

    const result = hasFingerprintMismatch(
      {
        fingerprint: { hash: fingerprint },
        operations: [],
        source: "unit-test",
        timestamp: "2026-02-10T12:00:00Z",
      },
      queue,
    );

    expect(result.mismatched).toBe(false);
    expect(result.current).toBe(fingerprint);
  });
});

describe("parseQueueOperation", () => {
  test("throws error for unsupported operation type", () => {
    expect(() => parseQueueOperation({ type: "invalid-op" })).toThrow(
      /Unsupported queue operation type: invalid-op/,
    );
  });
});

import {
  areStringArraysEqual,
  buildQueueDiffSummary,
  hasFingerprintMismatch,
  parseStringArrayField,
  readQueueProposalFromFile,
} from "@tools/commands/ralph/subtask-helpers";
import { computeFingerprint, type Subtask } from "@tools/commands/ralph/types";
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

function makeSubtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    acceptanceCriteria: ["ac"],
    description: "desc",
    done: false,
    filesToRead: ["a.ts"],
    id: "SUB-001",
    taskRef: "TASK-001",
    title: "title",
    ...overrides,
  };
}

describe("subtask-helpers", () => {
  test("areStringArraysEqual compares values and order", () => {
    expect(areStringArraysEqual(["a", "b"], ["a", "b"])).toBe(true);
    expect(areStringArraysEqual(["a", "b"], ["b", "a"])).toBe(false);
    expect(areStringArraysEqual(["a"], ["a", "b"])).toBe(false);
  });

  test("buildQueueDiffSummary reports add/remove/update/reorder", () => {
    const before = [
      makeSubtask({ id: "SUB-001", title: "one" }),
      makeSubtask({ id: "SUB-002", title: "two" }),
    ];
    const after = [
      makeSubtask({ id: "SUB-002", title: "two-updated" }),
      makeSubtask({ id: "SUB-003", title: "three" }),
    ];

    const summary = buildQueueDiffSummary(before, after);
    expect(summary.added.map((subtask) => subtask.id)).toEqual(["SUB-003"]);
    expect(summary.removed.map((subtask) => subtask.id)).toEqual(["SUB-001"]);
    expect(summary.updated.map((entry) => entry.after.id)).toEqual(["SUB-002"]);
    expect(summary.reordered.map((entry) => entry.id)).toEqual(["SUB-002"]);
  });

  test("hasFingerprintMismatch compares proposal and queue state", () => {
    const subtasks = [makeSubtask({ done: false, id: "SUB-001" })];
    const currentFingerprint = computeFingerprint(subtasks).hash;
    const matching = hasFingerprintMismatch(
      {
        fingerprint: { hash: currentFingerprint },
        operations: [],
        source: "test",
        timestamp: "2026-01-01T00:00:00Z",
      },
      subtasks,
    );
    expect(matching.mismatched).toBe(false);

    const mismatched = hasFingerprintMismatch(
      {
        fingerprint: { hash: "different" },
        operations: [],
        source: "test",
        timestamp: "2026-01-01T00:00:00Z",
      },
      subtasks,
    );
    expect(mismatched.mismatched).toBe(true);
  });

  test("parseStringArrayField throws on non-string members", () => {
    expect(() => {
      parseStringArrayField("filesToRead", ["valid", 123]);
    }).toThrow("Subtask payload requires filesToRead as array of strings");
  });

  test("readQueueProposalFromFile parses valid proposal", () => {
    const temporaryDirectory = mkdtempSync(
      path.join(tmpdir(), "subtask-helpers-"),
    );
    const proposalPath = path.join(temporaryDirectory, "proposal.json");

    writeFileSync(
      proposalPath,
      JSON.stringify({
        fingerprint: { hash: "abc" },
        operations: [],
        source: "test",
        timestamp: "2026-01-01T00:00:00Z",
      }),
      "utf8",
    );

    try {
      expect(readQueueProposalFromFile(proposalPath)).toEqual({
        fingerprint: { hash: "abc" },
        operations: [],
        source: "test",
        timestamp: "2026-01-01T00:00:00Z",
      });
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });
});

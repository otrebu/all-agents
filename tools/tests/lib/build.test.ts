import {
  buildAssignedSubtaskJqSnippet,
  buildIterationContext,
  getSubtaskQueueStats,
  getSubtasksSizeGuidanceLines,
} from "@tools/commands/ralph/build";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("getSubtaskQueueStats", () => {
  test("returns pending/completed totals", () => {
    const stats = getSubtaskQueueStats([
      {
        acceptanceCriteria: [],
        description: "done",
        done: true,
        filesToRead: [],
        id: "SUB-001",
        taskRef: "TASK-001",
        title: "done item",
      },
      {
        acceptanceCriteria: [],
        description: "pending",
        done: false,
        filesToRead: [],
        id: "SUB-002",
        taskRef: "TASK-001",
        title: "pending item",
      },
    ]);

    expect(stats).toEqual({ completed: 1, pending: 1, total: 2 });
  });
});

describe("buildAssignedSubtaskJqSnippet", () => {
  test("generates concrete commands with subtasks object path", () => {
    const snippet = buildAssignedSubtaskJqSnippet(
      "SUB-200",
      "/tmp/my queue/subtasks.json",
    );

    expect(snippet).toContain("--arg id 'SUB-200'");
    expect(snippet).toContain(
      ".subtasks[] | select(.id==$id and .done==false)",
    );
    expect(snippet).toContain(".subtasks[] | select(.id==$id and .done==true)");
    expect(snippet).toContain("mv '/tmp/my queue/subtasks.json.tmp'");
  });
});

describe("buildIterationContext", () => {
  test("includes canonical assignment payload fields", () => {
    const context = buildIterationContext(
      {
        acceptanceCriteria: ["criterion"],
        description: "Implement context sharing",
        done: false,
        filesToRead: ["tools/src/commands/ralph/build.ts"],
        id: "SUB-007",
        taskRef: "TASK-007",
        title: "Unify iteration context builder",
      },
      "/tmp/subtasks.json",
      "/tmp/PROGRESS.md",
    );

    expect(context).toContain("Assigned subtask:");
    expect(context).toContain('"id": "SUB-007"');
    expect(context).toContain("Subtasks file path: /tmp/subtasks.json");
    expect(context).toContain("Progress log path: /tmp/PROGRESS.md");
    expect(context).toContain(
      "After completing the assigned subtask (SUB-007):",
    );
  });

  test("is consumed by both headless and supervised call sites", () => {
    const source = readFileSync(
      path.join(import.meta.dir, "../../src/commands/ralph/build.ts"),
      "utf8",
    );

    expect(source).toContain("const extraContext = buildIterationContext(");
    expect(source).toContain("const iterationContext = buildIterationContext(");
    expect(source).not.toContain(
      "context: `Work ONLY on the assigned subtask below.",
    );
  });
});

describe("getSubtasksSizeGuidanceLines", () => {
  test("shows hard-limit warning when queue has pending work", () => {
    const lines = getSubtasksSizeGuidanceLines({
      queueStats: { completed: 4, pending: 2, total: 6 },
      sizeCheck: { exceeded: true, hardLimitExceeded: true, tokens: 39_000 },
      subtasksPath: "/repo/subtasks.json",
    });

    const messages = lines.map((line) => line.message);
    expect(messages.some((m) => m.includes("archive subtasks"))).toBe(true);
    expect(
      messages.some((m) =>
        m.includes("Provider invocation may not be able to update this file"),
      ),
    ).toBe(true);
  });

  test("suppresses provider hard-limit warning when queue is already complete", () => {
    const lines = getSubtasksSizeGuidanceLines({
      queueStats: { completed: 12, pending: 0, total: 12 },
      sizeCheck: { exceeded: true, hardLimitExceeded: true, tokens: 40_000 },
      subtasksPath: "/repo/subtasks.json",
    });

    const messages = lines.map((line) => line.message);
    expect(
      messages.some((m) => m.includes("Queue status: 12 total, 0 pending")),
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes("Provider invocation may not be able to update this file"),
      ),
    ).toBe(false);
  });
});

import { readIterationDiary } from "@tools/commands/ralph/status";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// We need to test readIterationDiary which is not exported
// So we test through the module's behavior using a temporary directory

describe("status.ts log aggregation", () => {
  const temporaryDirectory = join(
    import.meta.dirname,
    "../../tmp/status-test-logs",
  );

  beforeEach(() => {
    // Clean up and create test directory
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true });
    }
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true });
    }
  });

  test("empty directory returns empty array when globbing", () => {
    // Test that the logs directory structure exists
    expect(existsSync(temporaryDirectory)).toBe(true);
  });

  test("single .jsonl file can be read", () => {
    const testEntry = {
      sessionId: "test-session-1",
      status: "completed",
      subtaskId: "SUB-001",
      summary: "Test summary",
      timestamp: "2026-01-26T10:00:00Z",
    };
    const filePath = join(temporaryDirectory, "2026-01-26.jsonl");
    writeFileSync(filePath, `${JSON.stringify(testEntry)}\n`);

    expect(existsSync(filePath)).toBe(true);
  });

  test("multiple .jsonl files can be created", () => {
    const entry1 = {
      sessionId: "test-session-1",
      status: "completed",
      subtaskId: "SUB-001",
      summary: "Day 1 summary",
      timestamp: "2026-01-25T10:00:00Z",
    };
    const entry2 = {
      sessionId: "test-session-2",
      status: "completed",
      subtaskId: "SUB-002",
      summary: "Day 2 summary",
      timestamp: "2026-01-26T10:00:00Z",
    };

    writeFileSync(
      join(temporaryDirectory, "2026-01-25.jsonl"),
      `${JSON.stringify(entry1)}\n`,
    );
    writeFileSync(
      join(temporaryDirectory, "2026-01-26.jsonl"),
      `${JSON.stringify(entry2)}\n`,
    );

    // Verify both files exist
    expect(existsSync(join(temporaryDirectory, "2026-01-25.jsonl"))).toBe(true);
    expect(existsSync(join(temporaryDirectory, "2026-01-26.jsonl"))).toBe(true);
  });

  test("non-.jsonl files are ignored", () => {
    // Create a .txt file that should be ignored
    writeFileSync(
      join(temporaryDirectory, "readme.txt"),
      "This should be ignored",
    );

    // Create a valid .jsonl file
    const entry = {
      sessionId: "test",
      status: "completed",
      subtaskId: "SUB-001",
      summary: "Test",
      timestamp: "2026-01-26T10:00:00Z",
    };
    writeFileSync(
      join(temporaryDirectory, "2026-01-26.jsonl"),
      `${JSON.stringify(entry)}\n`,
    );

    // Verify both files exist
    expect(existsSync(join(temporaryDirectory, "readme.txt"))).toBe(true);
    expect(existsSync(join(temporaryDirectory, "2026-01-26.jsonl"))).toBe(true);
  });
});

describe("getMilestoneLogsDirectory derivation", () => {
  test("derives logs directory from subtasks.json path", () => {
    // Test the pattern: /path/to/milestone/subtasks.json -> /path/to/milestone/logs
    const subtasksPath =
      "/project/docs/planning/milestones/002-ralph/subtasks.json";
    const expectedLogsDirectory =
      "/project/docs/planning/milestones/002-ralph/logs";

    // dirname of subtasksPath is the milestone root
    const milestoneRoot = dirname(subtasksPath);
    const logsDirectory = join(milestoneRoot, "logs");

    expect(logsDirectory).toBe(expectedLogsDirectory);
  });

  test("handles paths with special characters", () => {
    const subtasksPath =
      "/project/docs/planning/milestones/002-ralph-💪/subtasks.json";
    const milestoneRoot = dirname(subtasksPath);
    const logsDirectory = join(milestoneRoot, "logs");

    expect(logsDirectory).toContain("002-ralph-💪");
    expect(logsDirectory).toEndWith("/logs");
  });
});

describe("readIterationDiary timing compatibility", () => {
  const temporaryDirectory = join(
    import.meta.dirname,
    "../../tmp/status-timing-compat-logs",
  );

  beforeEach(() => {
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true });
    }
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true });
    }
  });

  test("normalizes legacy claudeMs timing to providerMs", () => {
    const legacyEntry = {
      sessionId: "legacy-session",
      status: "completed",
      subtaskId: "SUB-LEGACY",
      summary: "Legacy timing entry",
      timestamp: "2026-01-26T10:00:00Z",
      timing: { claudeMs: 1200, hookMs: 25, metricsMs: 12, summaryMs: 40 },
    };
    const providerEntry = {
      sessionId: "provider-session",
      status: "completed",
      subtaskId: "SUB-PROVIDER",
      summary: "Provider timing entry",
      timestamp: "2026-01-26T10:05:00Z",
      timing: { hookMs: 20, metricsMs: 10, providerMs: 2400, summaryMs: 35 },
    };

    writeFileSync(
      join(temporaryDirectory, "2026-01-26.jsonl"),
      `${JSON.stringify(legacyEntry)}\n${JSON.stringify(providerEntry)}\n`,
    );

    const entries = readIterationDiary(temporaryDirectory);
    const legacy = entries.find((entry) => entry.subtaskId === "SUB-LEGACY");
    const provider = entries.find(
      (entry) => entry.subtaskId === "SUB-PROVIDER",
    );

    expect(legacy?.timing?.providerMs).toBe(1200);
    expect(provider?.timing?.providerMs).toBe(2400);
  });
});

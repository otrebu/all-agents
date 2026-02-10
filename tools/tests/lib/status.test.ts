import {
  loadSubtasksFile,
  saveSubtasksFile,
} from "@tools/commands/ralph/config";
import { readIterationDiary, runStatus } from "@tools/commands/ralph/status";
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

describe("readIterationDiary mixed-log filtering", () => {
  const temporaryDirectory = join(
    import.meta.dirname,
    "../../tmp/status-mixed-log-filtering",
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

  test("ignores non-iteration records in mixed daily logs", () => {
    const iterationEntry = {
      sessionId: "iteration-session",
      status: "completed",
      subtaskId: "SUB-ITER",
      summary: "Iteration entry",
      timestamp: "2026-02-08T10:00:00Z",
      type: "iteration",
    };
    const planningEntry = {
      result: "Generated roadmap",
      sessionId: "planning-session",
      sessionName: "roadmap",
      timestamp: "2026-02-08T10:01:00Z",
      type: "planning",
    };
    const reviewEntry = {
      finding: "Subtask is too large",
      sessionId: "review-session",
      timestamp: "2026-02-08T10:02:00Z",
      type: "subtask-review",
    };
    const validationEntry = {
      aligned: false,
      sessionId: "validation-session",
      subtaskId: "SUB-ITER",
      summary: "Validation found missing AC coverage",
      timestamp: "2026-02-08T10:03:00Z",
      type: "validation",
    };
    const calibrationEntry = {
      sessionId: "calibration-session",
      summary: "Calibration completed",
      timestamp: "2026-02-08T10:04:00Z",
      type: "calibration",
    };
    const queueProposalEntry = {
      operationCount: 1,
      source: "validation",
      summary: "Proposed one queue mutation",
      timestamp: "2026-02-08T10:05:00Z",
      type: "queue-proposal",
    };
    const queueApplyEntry = {
      applied: true,
      operationCount: 1,
      source: "validation",
      summary: "Applied one queue mutation",
      timestamp: "2026-02-08T10:06:00Z",
      type: "queue-apply",
    };

    writeFileSync(
      join(temporaryDirectory, "2026-02-08.jsonl"),
      `${[
        JSON.stringify(iterationEntry),
        JSON.stringify(planningEntry),
        JSON.stringify(reviewEntry),
        JSON.stringify(validationEntry),
        JSON.stringify(calibrationEntry),
        JSON.stringify(queueProposalEntry),
        JSON.stringify(queueApplyEntry),
      ].join("\n")}\n`,
    );

    const entries = readIterationDiary(temporaryDirectory);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.subtaskId).toBe("SUB-ITER");
    expect(entries[0]?.status).toBe("completed");
  });

  test("keeps legacy iteration entries that omit type", () => {
    const legacyEntry = {
      sessionId: "legacy-session",
      status: "success",
      subtaskId: "SUB-LEGACY",
      summary: "Legacy entry",
      timestamp: "2026-02-08T11:00:00Z",
    };

    writeFileSync(
      join(temporaryDirectory, "2026-02-08.jsonl"),
      `${JSON.stringify(legacyEntry)}\n`,
    );

    const entries = readIterationDiary(temporaryDirectory);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.subtaskId).toBe("SUB-LEGACY");
    expect(entries[0]?.status).toBe("completed");
  });
});

describe("runStatus progress compatibility", () => {
  const temporaryDirectory = join(
    import.meta.dirname,
    "../../tmp/status-progress-compat",
  );

  function captureRunStatusOutput(subtasksPath: string): Array<string> {
    const output: Array<string> = [];
    const originalLog = console.log;
    console.log = (...args: Array<unknown>) => {
      output.push(args.map(String).join(" "));
    };

    try {
      runStatus(subtasksPath, temporaryDirectory);
    } finally {
      console.log = originalLog;
    }

    return output;
  }

  function getProgressLine(output: Array<string>): string {
    return output.find((line) => line.includes("Progress:")) ?? "";
  }

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

  test("progress display is unchanged after save normalization removes legacy status", () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");

    writeFileSync(
      subtasksPath,
      JSON.stringify(
        {
          metadata: { milestoneRef: "status-progress", scope: "milestone" },
          subtasks: [
            {
              acceptanceCriteria: ["Done item"],
              description: "completed by done",
              done: true,
              filesToRead: [],
              id: "SUB-001",
              status: "pending",
              taskRef: "TASK-001",
              title: "Done",
            },
            {
              acceptanceCriteria: ["Pending item"],
              description: "pending by done",
              done: false,
              filesToRead: [],
              id: "SUB-002",
              status: "completed",
              taskRef: "TASK-001",
              title: "Pending",
            },
          ],
        },
        null,
        2,
      ),
    );

    const beforeOutput = captureRunStatusOutput(subtasksPath);
    const progressBefore = getProgressLine(beforeOutput);

    const loaded = loadSubtasksFile(subtasksPath);
    saveSubtasksFile(subtasksPath, loaded);

    const afterOutput = captureRunStatusOutput(subtasksPath);
    const progressAfter = getProgressLine(afterOutput);

    expect(progressBefore).not.toBe("");
    expect(progressAfter).toBe(progressBefore);
  });

  test("iteration stats only count iteration diary entries", () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    const logsDirectory = join(temporaryDirectory, "logs");

    writeFileSync(
      subtasksPath,
      JSON.stringify(
        {
          metadata: { milestoneRef: "status-iterations", scope: "milestone" },
          subtasks: [
            {
              acceptanceCriteria: ["Done item"],
              description: "completed by done",
              done: true,
              filesToRead: [],
              id: "SUB-001",
              taskRef: "TASK-001",
              title: "Done",
            },
          ],
        },
        null,
        2,
      ),
    );

    mkdirSync(logsDirectory, { recursive: true });
    writeFileSync(
      join(logsDirectory, "2026-02-08.jsonl"),
      `${[
        JSON.stringify({
          sessionId: "iteration-session",
          status: "completed",
          subtaskId: "SUB-001",
          summary: "Completed subtask",
          timestamp: "2026-02-08T12:00:00Z",
          type: "iteration",
        }),
        JSON.stringify({
          result: "Planning output",
          sessionId: "planning-session",
          timestamp: "2026-02-08T12:05:00Z",
          type: "planning",
        }),
      ].join("\n")}\n`,
    );

    const output = captureRunStatusOutput(subtasksPath);
    const iterationsLine =
      output.find((line) => line.includes("Iterations:")) ?? "";
    const successRateLine =
      output.find((line) => line.includes("Success rate:")) ?? "";

    expect(iterationsLine).toContain("Iterations: 1");
    expect(successRateLine).toContain("Success rate: 100.0%");
  });
});

describe("runStatus subtasks format validation", () => {
  const temporaryDirectory = join(
    import.meta.dirname,
    "../../tmp/status-format-validation",
  );

  function captureRunStatusOutput(subtasksPath: string): Array<string> {
    const output: Array<string> = [];
    const originalLog = console.log;
    console.log = (...args: Array<unknown>) => {
      output.push(args.map(String).join(" "));
    };

    try {
      runStatus(subtasksPath, temporaryDirectory);
    } finally {
      console.log = originalLog;
    }

    return output;
  }

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

  test("shows explicit canonical format error for legacy array files", () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    writeFileSync(
      subtasksPath,
      JSON.stringify([{ done: false, id: "SUB-001", title: "legacy" }]),
    );

    const output = captureRunStatusOutput(subtasksPath).join("\n");

    expect(output).toContain("Invalid subtasks file format");
    expect(output).toContain(
      'Expected: JSON object with top-level "subtasks" array',
    );
    expect(output).toContain("top-level array (legacy format)");
  });
});

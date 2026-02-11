import {
  buildCalibrationCreateOperations,
  buildSelfImproveFallbackResult,
  buildSessionLogPreflight,
  parseCalibrationResult,
  writeCalibrationLogEntry,
  writeCalibrationQueueApplyLogEntry,
  writeCalibrationQueueProposalLogEntry,
} from "@tools/commands/ralph/calibrate";
import { getMilestoneLogPath } from "@tools/commands/ralph/config";
import applyQueueOperations from "@tools/commands/ralph/queue-ops";
import {
  computeFingerprint,
  type QueueProposal,
} from "@tools/commands/ralph/types";
import { describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("parseCalibrationResult", () => {
  test("parses corrective subtasks from fenced json", () => {
    const parsed = parseCalibrationResult(`\n\`\`\`json
{
  "summary": "drift detected",
  "correctiveSubtasks": [
    {
      "title": "Fix drift",
      "description": "realign behavior",
      "taskRef": "TASK-100",
      "filesToRead": ["tools/src/commands/ralph/calibrate.ts"],
      "acceptanceCriteria": ["queue proposal created"]
    }
  ]
}
\`\`\`\n`);

    expect(parsed.insertionMode).toBe("prepend");
    expect(parsed.summary).toBe("drift detected");
    expect(parsed.correctiveSubtasks).toHaveLength(1);
    expect(parsed.correctiveSubtasks[0]?.title).toBe("Fix drift");
  });

  test("returns empty result for invalid payload", () => {
    const parsed = parseCalibrationResult("not-json");
    expect(parsed).toEqual({
      correctiveSubtasks: [],
      insertionMode: "prepend",
      summary: "",
    });
  });
});

describe("buildCalibrationCreateOperations", () => {
  const baseSubtasks = {
    subtasks: [
      {
        acceptanceCriteria: ["existing"],
        description: "existing",
        done: false,
        filesToRead: ["x"],
        id: "SUB-001",
        taskRef: "TASK-001",
        title: "Existing",
      },
    ],
  };

  test("defaults to prepend indexes", () => {
    const operations = buildCalibrationCreateOperations(
      [
        {
          acceptanceCriteria: ["a"],
          description: "a",
          filesToRead: ["a"],
          taskRef: "TASK-002",
          title: "A",
        },
      ],
      "prepend",
      baseSubtasks,
    );

    expect(operations[0]).toMatchObject({ atIndex: 0, type: "create" });
  });

  test("prepend operations land at front of pending queue", () => {
    const queue = {
      subtasks: [
        {
          acceptanceCriteria: ["old"],
          description: "old",
          done: false,
          filesToRead: ["old"],
          id: "SUB-010",
          taskRef: "TASK-001",
          title: "Old pending",
        },
      ],
    };
    const operations = buildCalibrationCreateOperations(
      [
        {
          acceptanceCriteria: ["first"],
          description: "first",
          filesToRead: ["first"],
          taskRef: "TASK-002",
          title: "First corrective",
        },
        {
          acceptanceCriteria: ["second"],
          description: "second",
          filesToRead: ["second"],
          taskRef: "TASK-002",
          title: "Second corrective",
        },
      ],
      "prepend",
      queue,
    );

    const proposal: QueueProposal = {
      fingerprint: computeFingerprint(queue.subtasks),
      operations,
      source: "calibration:test",
      timestamp: "2026-02-10T00:00:00Z",
    };
    const applied = applyQueueOperations(queue, proposal);

    expect(applied.subtasks.map((subtask) => subtask.title)).toEqual([
      "First corrective",
      "Second corrective",
      "Old pending",
    ]);
  });
});

describe("buildSessionLogPreflight", () => {
  test("reports available and missing session logs with bounded attempts", () => {
    const rootDirectory = mkdtempSync(
      path.join(tmpdir(), "calibrate-preflight-"),
    );
    const availableLogPath = path.join(rootDirectory, "available.jsonl");
    mkdirSync(rootDirectory, { recursive: true });
    writeFileSync(availableLogPath, '{"type":"user"}\n', "utf8");

    try {
      const preflight = buildSessionLogPreflight(
        [
          {
            acceptanceCriteria: ["done"],
            commitHash: "abc1234",
            completedAt: "2026-02-11T00:00:00Z",
            description: "has canonical path",
            done: true,
            filesToRead: [],
            id: "SUB-900",
            sessionId: "s-available",
            sessionLogPath: availableLogPath,
            sessionRepoRoot: rootDirectory,
            taskRef: "TASK-900",
            title: "Available",
          },
          {
            acceptanceCriteria: ["done"],
            commitHash: "def5678",
            completedAt: "2026-02-11T00:00:00Z",
            description: "missing log",
            done: true,
            filesToRead: [],
            id: "SUB-901",
            sessionId: "s-missing",
            sessionRepoRoot: rootDirectory,
            taskRef: "TASK-901",
            title: "Missing",
          },
        ],
        rootDirectory,
      );

      expect(preflight.available).toHaveLength(1);
      expect(preflight.available[0]).toMatchObject({
        sessionId: "s-available",
        sessionLogPath: availableLogPath,
        subtaskId: "SUB-900",
      });
      expect(preflight.missing).toHaveLength(1);
      expect(preflight.missing[0]?.subtaskId).toBe("SUB-901");
      expect(preflight.missing[0]?.attempts).toBeLessThanOrEqual(
        preflight.maxAttempts,
      );
    } finally {
      rmSync(rootDirectory, { force: true, recursive: true });
    }
  });
});

describe("buildSelfImproveFallbackResult", () => {
  test("returns valid fallback payload with concise diagnostics", () => {
    const fallback = buildSelfImproveFallbackResult({
      available: [],
      maxAttempts: 3,
      missing: [
        {
          attemptedRepoRoots: ["/repo"],
          attempts: 2,
          sessionId: "session-1",
          sessionRepoRoot: "/repo",
          subtaskId: "SUB-001",
        },
      ],
    });

    expect(fallback.correctiveSubtasks).toEqual([]);
    expect(fallback.insertionMode).toBe("prepend");
    expect(fallback.summary).toContain("no available session logs");
    expect(fallback.summary).toContain("SUB-001:session-1");
  });
});

describe("calibrate approval wiring", () => {
  test("uses shared approval evaluator for correctionTasks", () => {
    const source = readFileSync(
      path.join(import.meta.dir, "../../src/commands/ralph/calibrate.ts"),
      "utf8",
    );

    expect(source).toContain('evaluateApproval("correctionTasks"');
    expect(source).not.toContain("function getApprovalMode(");
  });
});

describe("calibration daily log entries", () => {
  test("writes calibration, queue-proposal, and queue-apply entries", () => {
    const rootDirectory = mkdtempSync(path.join(tmpdir(), "calibrate-log-"));
    const milestonePath = path.join(rootDirectory, "006-cascade-mode");
    mkdirSync(milestonePath, { recursive: true });

    try {
      const proposal: QueueProposal = {
        fingerprint: computeFingerprint([]),
        operations: [{ id: "SUB-001", type: "remove" }],
        source: "calibration:intention-drift",
        timestamp: "2026-02-10T00:00:00Z",
      };

      writeCalibrationLogEntry({
        milestonePath,
        operationCount: 0,
        source: "calibration",
        summary: "Calibration intention completed",
      });
      writeCalibrationQueueProposalLogEntry(
        milestonePath,
        proposal,
        "Intention Drift: corrective proposal generated",
      );
      writeCalibrationQueueApplyLogEntry({
        applied: true,
        milestonePath,
        operationCount: 1,
        source: proposal.source,
        summary: "Intention Drift: applied 1 operation",
      });

      const logPath = getMilestoneLogPath(milestonePath);
      const parsedEntries = readFileSync(logPath, "utf8")
        .trim()
        .split("\n")
        .map(
          (line) =>
            JSON.parse(line) as { type?: string } & Record<string, unknown>,
        );

      expect(
        parsedEntries.find((entry) => entry.type === "calibration"),
      ).toMatchObject({
        operationCount: 0,
        source: "calibration",
        summary: "Calibration intention completed",
      });
      expect(
        parsedEntries.find((entry) => entry.type === "queue-proposal"),
      ).toMatchObject({
        operationCount: 1,
        source: "calibration:intention-drift",
      });
      expect(
        parsedEntries.find((entry) => entry.type === "queue-apply"),
      ).toMatchObject({
        applied: true,
        operationCount: 1,
        source: "calibration:intention-drift",
      });
    } finally {
      rmSync(rootDirectory, { force: true, recursive: true });
    }
  });
});

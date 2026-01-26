/**
 * Unit tests for summary.ts
 *
 * Tests the BuildPracticalSummary types and functions:
 * - generateBuildSummary()
 * - getCommitRange()
 * - writeBuildSummaryFile()
 */

import type {
  IterationDiaryEntry,
  SubtasksFile,
} from "@tools/commands/ralph/types";

import {
  generateBuildSummary,
  getCommitRange,
  writeBuildSummaryFile,
} from "@tools/commands/ralph/summary";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockDiaryEntry(
  subtaskId: string,
  overrides?: Partial<IterationDiaryEntry>,
): IterationDiaryEntry {
  return {
    costUsd: 0.05,
    duration: 30_000,
    filesChanged: ["file1.ts", "file2.ts"],
    sessionId: "test-session",
    status: "completed",
    subtaskId,
    summary: `Completed ${subtaskId} successfully`,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function createMockSubtasksFile(
  subtasks: Array<{
    commitHash?: string;
    completedAt?: string;
    done: boolean;
    id: string;
  }>,
): SubtasksFile {
  return {
    metadata: { milestoneRef: "test-milestone", scope: "milestone" },
    subtasks: subtasks.map((s) => ({
      acceptanceCriteria: ["Test AC"],
      commitHash: s.commitHash,
      completedAt: s.completedAt,
      description: `Description for ${s.id}`,
      done: s.done,
      filesToRead: [],
      id: s.id,
      taskRef: "test-task",
      title: `Title for ${s.id}`,
    })),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("generateBuildSummary", () => {
  test("returns empty summary for no completed subtasks", () => {
    const completedThisRun: Array<{ attempts: number; id: string }> = [];
    const diaryEntries: Array<IterationDiaryEntry> = [];
    const subtasksFile = createMockSubtasksFile([
      { done: false, id: "SUB-001" },
      { done: false, id: "SUB-002" },
    ]);

    const summary = generateBuildSummary(
      completedThisRun,
      diaryEntries,
      subtasksFile,
    );

    expect(summary.subtasks).toHaveLength(0);
    expect(summary.stats.completed).toBe(0);
    expect(summary.remaining).toBe(2);
    expect(summary.commitRange.startHash).toBeNull();
    expect(summary.commitRange.endHash).toBeNull();
  });

  test("aggregates stats from diary entries for completed subtasks", () => {
    const completedThisRun = [
      { attempts: 1, id: "SUB-001" },
      { attempts: 2, id: "SUB-002" },
    ];
    const diaryEntries: Array<IterationDiaryEntry> = [
      createMockDiaryEntry("SUB-001", { costUsd: 0.1, duration: 60_000 }),
      createMockDiaryEntry("SUB-002", {
        costUsd: 0.05,
        duration: 30_000,
        status: "retrying",
      }),
      createMockDiaryEntry("SUB-002", {
        costUsd: 0.08,
        duration: 45_000,
        status: "completed",
      }),
    ];
    const subtasksFile = createMockSubtasksFile([
      {
        commitHash: "abc123",
        completedAt: "2026-01-26T10:00:00Z",
        done: true,
        id: "SUB-001",
      },
      {
        commitHash: "def456",
        completedAt: "2026-01-26T11:00:00Z",
        done: true,
        id: "SUB-002",
      },
      { done: false, id: "SUB-003" },
    ]);

    const summary = generateBuildSummary(
      completedThisRun,
      diaryEntries,
      subtasksFile,
    );

    expect(summary.subtasks).toHaveLength(2);
    expect(summary.stats.completed).toBe(2);
    expect(summary.stats.costUsd).toBeCloseTo(0.23, 2);
    expect(summary.stats.durationMs).toBe(135_000);
    expect(summary.remaining).toBe(1);
  });

  test("uses latest diary entry summary for each subtask", () => {
    const completedThisRun = [{ attempts: 2, id: "SUB-001" }];
    const diaryEntries: Array<IterationDiaryEntry> = [
      createMockDiaryEntry("SUB-001", {
        summary: "First attempt failed",
        timestamp: "2026-01-26T10:00:00Z",
      }),
      createMockDiaryEntry("SUB-001", {
        summary: "Second attempt succeeded",
        timestamp: "2026-01-26T10:30:00Z",
      }),
    ];
    const subtasksFile = createMockSubtasksFile([
      {
        commitHash: "abc123",
        completedAt: "2026-01-26T10:30:00Z",
        done: true,
        id: "SUB-001",
      },
    ]);

    const summary = generateBuildSummary(
      completedThisRun,
      diaryEntries,
      subtasksFile,
    );

    expect(summary.subtasks[0]?.summary).toBe("Second attempt succeeded");
    expect(summary.subtasks[0]?.attempts).toBe(2);
  });

  test("handles subtasks without diary entries", () => {
    const completedThisRun = [{ attempts: 1, id: "SUB-001" }];
    const diaryEntries: Array<IterationDiaryEntry> = [];
    const subtasksFile = createMockSubtasksFile([
      { done: true, id: "SUB-001" },
    ]);

    const summary = generateBuildSummary(
      completedThisRun,
      diaryEntries,
      subtasksFile,
    );

    expect(summary.subtasks).toHaveLength(1);
    expect(summary.subtasks[0]?.summary).toBe("Completed SUB-001");
  });
});

describe("getCommitRange", () => {
  test("returns null for no completed subtasks with hashes", () => {
    const subtasksFile = createMockSubtasksFile([
      { done: false, id: "SUB-001" },
      { done: false, id: "SUB-002" },
    ]);
    const completedThisRun = [{ id: "SUB-001" }];

    const range = getCommitRange(subtasksFile, completedThisRun);

    expect(range.startHash).toBeNull();
    expect(range.endHash).toBeNull();
  });

  test("returns same hash for single completed subtask", () => {
    const subtasksFile = createMockSubtasksFile([
      {
        commitHash: "abc123",
        completedAt: "2026-01-26T10:00:00Z",
        done: true,
        id: "SUB-001",
      },
    ]);
    const completedThisRun = [{ id: "SUB-001" }];

    const range = getCommitRange(subtasksFile, completedThisRun);

    expect(range.startHash).toBe("abc123");
    expect(range.endHash).toBe("abc123");
  });

  test("returns range for multiple completed subtasks", () => {
    const subtasksFile = createMockSubtasksFile([
      {
        commitHash: "first111",
        completedAt: "2026-01-26T09:00:00Z",
        done: true,
        id: "SUB-001",
      },
      {
        commitHash: "middle222",
        completedAt: "2026-01-26T10:00:00Z",
        done: true,
        id: "SUB-002",
      },
      {
        commitHash: "last333",
        completedAt: "2026-01-26T11:00:00Z",
        done: true,
        id: "SUB-003",
      },
    ]);
    const completedThisRun = [
      { id: "SUB-001" },
      { id: "SUB-002" },
      { id: "SUB-003" },
    ];

    const range = getCommitRange(subtasksFile, completedThisRun);

    expect(range.startHash).toBe("first111");
    expect(range.endHash).toBe("last333");
  });

  test("only considers subtasks completed this run", () => {
    const subtasksFile = createMockSubtasksFile([
      {
        commitHash: "old000",
        completedAt: "2026-01-25T10:00:00Z",
        done: true,
        id: "SUB-000",
      },
      {
        commitHash: "new111",
        completedAt: "2026-01-26T10:00:00Z",
        done: true,
        id: "SUB-001",
      },
    ]);
    const completedThisRun = [{ id: "SUB-001" }];

    const range = getCommitRange(subtasksFile, completedThisRun);

    expect(range.startHash).toBe("new111");
    expect(range.endHash).toBe("new111");
  });
});

describe("writeBuildSummaryFile", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(tmpdir(), `ralph-summary-test-${Date.now()}`);
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true });
    }
  });

  test("writes summary file to repo root", () => {
    const summary = {
      commitRange: { endHash: null, startHash: null },
      remaining: 5,
      stats: {
        completed: 2,
        costUsd: 0.15,
        durationMs: 90_000,
        failed: 0,
        filesChanged: 10,
      },
      subtasks: [
        { attempts: 1, id: "SUB-001", summary: "First subtask done" },
        { attempts: 2, id: "SUB-002", summary: "Second subtask done" },
      ],
    };

    const outputPath = writeBuildSummaryFile(summary, temporaryDirectory);

    expect(existsSync(outputPath)).toBe(true);
    expect(outputPath).toContain("BUILD-SUMMARY-");
    expect(outputPath).toContain(temporaryDirectory);
  });

  test("includes stats in markdown content", () => {
    const summary = {
      commitRange: { endHash: null, startHash: null },
      remaining: 3,
      stats: {
        completed: 5,
        costUsd: 0.5,
        durationMs: 180_000,
        failed: 1,
        filesChanged: 25,
      },
      subtasks: [],
    };

    const outputPath = writeBuildSummaryFile(summary, temporaryDirectory);
    const content = readFileSync(outputPath, "utf8");

    expect(content).toContain("# Build Summary");
    expect(content).toContain("| Completed | 5 |");
    expect(content).toContain("| Failed | 1 |");
    expect(content).toContain("| Duration | 3m |");
    expect(content).toContain("| Cost | $0.50 |");
    expect(content).toContain("| Files Changed | 25 |");
    expect(content).toContain("| Remaining | 3 |");
  });

  test("includes git diff command when commit range exists", () => {
    const summary = {
      commitRange: { endHash: "def456", startHash: "abc123" },
      remaining: 0,
      stats: {
        completed: 2,
        costUsd: 0.1,
        durationMs: 60_000,
        failed: 0,
        filesChanged: 5,
      },
      subtasks: [],
    };

    const outputPath = writeBuildSummaryFile(summary, temporaryDirectory);
    const content = readFileSync(outputPath, "utf8");

    expect(content).toContain("## Git Changes");
    expect(content).toContain("git diff abc123^..def456");
  });

  test("includes completed subtasks with retry counts", () => {
    const summary = {
      commitRange: { endHash: null, startHash: null },
      remaining: 2,
      stats: {
        completed: 2,
        costUsd: 0.2,
        durationMs: 120_000,
        failed: 0,
        filesChanged: 8,
      },
      subtasks: [
        { attempts: 1, id: "SUB-001", summary: "Single attempt success" },
        { attempts: 3, id: "SUB-002", summary: "Third time's the charm" },
      ],
    };

    const outputPath = writeBuildSummaryFile(summary, temporaryDirectory);
    const content = readFileSync(outputPath, "utf8");

    expect(content).toContain("## Completed Subtasks");
    expect(content).toContain("- **SUB-001**: Single attempt success");
    expect(content).toContain(
      "- **SUB-002** (3 attempts): Third time's the charm",
    );
  });

  test("writes to milestone directory when provided", () => {
    const summary = {
      commitRange: { endHash: null, startHash: null },
      remaining: 0,
      stats: {
        completed: 1,
        costUsd: 0.05,
        durationMs: 30_000,
        failed: 0,
        filesChanged: 2,
      },
      subtasks: [],
    };

    const outputPath = writeBuildSummaryFile(
      summary,
      temporaryDirectory,
      "test-milestone",
    );
    const content = readFileSync(outputPath, "utf8");

    expect(outputPath).toContain(
      join("docs", "planning", "milestones", "test-milestone"),
    );
    expect(content).toContain("Milestone: test-milestone");
  });

  test("handles empty subtasks list", () => {
    const summary = {
      commitRange: { endHash: null, startHash: null },
      remaining: 10,
      stats: {
        completed: 0,
        costUsd: 0,
        durationMs: 0,
        failed: 0,
        filesChanged: 0,
      },
      subtasks: [],
    };

    const outputPath = writeBuildSummaryFile(summary, temporaryDirectory);
    const content = readFileSync(outputPath, "utf8");

    expect(content).toContain("*No subtasks completed this run*");
  });
});

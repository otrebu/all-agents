import type { Subtask } from "@tools/commands/ralph/types";

import {
  appendSubtasksToFile,
  getIterationLogPath,
  getMilestoneLogPath,
  getPlanningLogPath,
  loadSubtasksFile,
  ORPHAN_MILESTONE_ROOT,
} from "@tools/commands/ralph/config";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("getMilestoneLogPath", () => {
  test("function is exported", () => {
    expect(typeof getMilestoneLogPath).toBe("function");
  });

  test("returns path with logs directory", () => {
    const result = getMilestoneLogPath("/some/milestone/root");
    expect(result).toContain("/logs/");
  });

  test("returns path with .jsonl extension", () => {
    const result = getMilestoneLogPath("/some/milestone/root");
    expect(result).toEndWith(".jsonl");
  });

  test("returns path with YYYY-MM-DD date format", () => {
    const result = getMilestoneLogPath("/some/milestone/root");
    // Extract the filename (last segment after last /)
    const filename = result.split("/").pop() ?? "";
    // Should match YYYY-MM-DD.jsonl pattern
    expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}\.jsonl$/);
  });

  test("uses UTC date", () => {
    const result = getMilestoneLogPath("/milestone");
    const expectedDate = new Date().toISOString().split("T")[0] ?? "";
    expect(result).toContain(expectedDate);
  });

  test("preserves milestone root path", () => {
    const milestoneRoot =
      "/home/user/project/docs/planning/milestones/002-ralph";
    const result = getMilestoneLogPath(milestoneRoot);
    expect(result).toStartWith(milestoneRoot);
  });

  test("handles paths with special characters", () => {
    const milestoneRoot = "/home/user/docs/planning/milestones/002-ralph-💪";
    const result = getMilestoneLogPath(milestoneRoot);
    expect(result).toStartWith(milestoneRoot);
    expect(result).toContain("/logs/");
  });
});

describe("getIterationLogPath", () => {
  test("function is exported", () => {
    expect(typeof getIterationLogPath).toBe("function");
  });

  test("derives milestone root from subtasks.json parent directory", () => {
    const subtasksPath =
      "/project/docs/planning/milestones/002-ralph/subtasks.json";
    const result = getIterationLogPath(subtasksPath);
    expect(result).toStartWith("/project/docs/planning/milestones/002-ralph");
    expect(result).toContain("/logs/");
  });

  test("returns path with .jsonl extension", () => {
    const result = getIterationLogPath(
      "/project/milestones/test/subtasks.json",
    );
    expect(result).toEndWith(".jsonl");
  });

  test("returns path with YYYY-MM-DD date format", () => {
    const result = getIterationLogPath(
      "/project/milestones/test/subtasks.json",
    );
    const filename = result.split("/").pop() ?? "";
    expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}\.jsonl$/);
  });

  test("handles empty subtasksPath by routing to _orphan", () => {
    const result = getIterationLogPath("");
    expect(result).toContain(ORPHAN_MILESTONE_ROOT);
    expect(result).toContain("/logs/");
  });

  test("handles '.' dirname by routing to _orphan", () => {
    // When subtasksPath is just "subtasks.json", dirname returns "."
    const result = getIterationLogPath("subtasks.json");
    expect(result).toContain(ORPHAN_MILESTONE_ROOT);
  });

  test("handles paths with special characters", () => {
    const subtasksPath =
      "/project/docs/planning/milestones/002-ralph-💪/subtasks.json";
    const result = getIterationLogPath(subtasksPath);
    expect(result).toContain("002-ralph-💪");
    expect(result).toContain("/logs/");
  });
});

describe("getPlanningLogPath", () => {
  test("function is exported", () => {
    expect(typeof getPlanningLogPath).toBe("function");
  });

  test("calls getMilestoneLogPath with milestonePath", () => {
    const milestonePath = "/project/docs/planning/milestones/002-ralph";
    const result = getPlanningLogPath(milestonePath);
    // Should produce same result as getMilestoneLogPath
    const expected = getMilestoneLogPath(milestonePath);
    expect(result).toBe(expected);
  });

  test("returns path with logs directory", () => {
    const result = getPlanningLogPath("/some/milestone");
    expect(result).toContain("/logs/");
  });

  test("returns path with .jsonl extension", () => {
    const result = getPlanningLogPath("/some/milestone");
    expect(result).toEndWith(".jsonl");
  });

  test("returns path with YYYY-MM-DD date format", () => {
    const result = getPlanningLogPath("/some/milestone");
    const filename = result.split("/").pop() ?? "";
    expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}\.jsonl$/);
  });
});

describe("ORPHAN_MILESTONE_ROOT", () => {
  test("constant is exported", () => {
    expect(typeof ORPHAN_MILESTONE_ROOT).toBe("string");
  });

  test("points to _orphan milestone directory", () => {
    expect(ORPHAN_MILESTONE_ROOT).toContain("_orphan");
    expect(ORPHAN_MILESTONE_ROOT).toContain("milestones");
  });
});

describe("appendSubtasksToFile", () => {
  let testDirectory = "";
  let testPath = "";

  beforeEach(() => {
    testDirectory = join(tmpdir(), `config-test-${Date.now()}`);
    mkdirSync(testDirectory, { recursive: true });
    testPath = join(testDirectory, "subtasks.json");
  });

  afterEach(() => {
    if (existsSync(testDirectory)) {
      rmSync(testDirectory, { recursive: true });
    }
  });

  function createSubtask(id: string): Subtask {
    return {
      acceptanceCriteria: ["Test AC"],
      description: "Test description",
      done: false,
      filesToRead: [],
      id,
      taskRef: "TASK-001",
      title: `Test subtask ${id}`,
    };
  }

  test("creates new file when none exists", () => {
    const subtasks = [createSubtask("SUB-001")];
    const result = appendSubtasksToFile(testPath, subtasks);

    expect(result.added).toBe(1);
    expect(result.skipped).toBe(0);
    expect(existsSync(testPath)).toBe(true);

    const loaded = loadSubtasksFile(testPath);
    expect(loaded.subtasks).toHaveLength(1);
    expect(loaded.subtasks[0]?.id).toBe("SUB-001");
  });

  test("appends to existing file", () => {
    // Create initial file
    const initial = [createSubtask("SUB-001")];
    appendSubtasksToFile(testPath, initial);

    // Append more
    const additional = [createSubtask("SUB-002"), createSubtask("SUB-003")];
    const result = appendSubtasksToFile(testPath, additional);

    expect(result.added).toBe(2);
    expect(result.skipped).toBe(0);

    const loaded = loadSubtasksFile(testPath);
    expect(loaded.subtasks).toHaveLength(3);
  });

  test("skips duplicates by ID", () => {
    // Create initial file
    const initial = [createSubtask("SUB-001"), createSubtask("SUB-002")];
    appendSubtasksToFile(testPath, initial);

    // Try to add duplicates - SUB-001 is duplicate, SUB-003 is new
    const withDupes = [createSubtask("SUB-001"), createSubtask("SUB-003")];
    const result = appendSubtasksToFile(testPath, withDupes);

    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);

    const loaded = loadSubtasksFile(testPath);
    expect(loaded.subtasks).toHaveLength(3);
    expect(loaded.subtasks.map((s) => s.id)).toEqual([
      "SUB-001",
      "SUB-002",
      "SUB-003",
    ]);
  });

  test("preserves existing metadata", () => {
    // Create file with metadata
    writeFileSync(
      testPath,
      JSON.stringify({
        $schema: "../../schemas/subtasks.schema.json",
        metadata: { milestoneRef: "test-milestone", scope: "milestone" },
        subtasks: [createSubtask("SUB-001")],
      }),
    );

    // Append more
    appendSubtasksToFile(testPath, [createSubtask("SUB-002")]);

    const loaded = loadSubtasksFile(testPath);
    expect(loaded.metadata?.milestoneRef).toBe("test-milestone");
  });

  test("uses provided metadata for new file", () => {
    const subtasks = [createSubtask("SUB-001")];
    const metadata = {
      milestoneRef: "my-milestone",
      scope: "milestone" as const,
    };
    appendSubtasksToFile(testPath, subtasks, metadata);

    const loaded = loadSubtasksFile(testPath);
    expect(loaded.metadata?.milestoneRef).toBe("my-milestone");
  });

  test("throws when existing file has invalid JSON", () => {
    writeFileSync(testPath, "{invalid json}");
    expect(() =>
      appendSubtasksToFile(testPath, [createSubtask("SUB-001")]),
    ).toThrow();
  });

  test("handles empty array of new subtasks", () => {
    const result = appendSubtasksToFile(testPath, []);
    expect(result.added).toBe(0);
    expect(result.skipped).toBe(0);
  });

  test("throws when subtasks field is not an array", () => {
    writeFileSync(testPath, JSON.stringify({ subtasks: "not an array" }));
    expect(() =>
      appendSubtasksToFile(testPath, [createSubtask("SUB-001")]),
    ).toThrow(/must be an array/);
  });

  test("throws when newSubtasks is not an array", () => {
    // @ts-expect-error Testing runtime validation
    expect(() => appendSubtasksToFile(testPath, "not an array")).toThrow(
      /must be an array/,
    );
  });
});

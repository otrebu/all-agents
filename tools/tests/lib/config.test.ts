import {
  getIterationLogPath,
  getMilestoneLogPath,
  getPlanningLogPath,
  ORPHAN_MILESTONE_ROOT,
} from "@tools/commands/ralph/config";
import { describe, expect, test } from "bun:test";

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

import { getMilestoneLogPath } from "@tools/commands/ralph/config";
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

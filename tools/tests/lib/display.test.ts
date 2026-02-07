/**
 * Tests for display.ts rendering utilities
 */

import type { BuildPracticalSummary } from "@tools/commands/ralph/summary";
import type { CascadeResult } from "@tools/commands/ralph/types";

import {
  formatDuration,
  formatTokenCount,
  type PlanSubtasksSummaryData,
  renderBuildPracticalSummary,
  renderCascadeProgress,
  renderCascadeSummary,
  renderInvocationHeader,
  renderPlanSubtasksSummary,
  renderResponseHeader,
  truncate,
} from "@tools/commands/ralph/display";
import { describe, expect, test } from "bun:test";

describe("display utilities", () => {
  describe("formatDuration", () => {
    test("formats seconds only", () => {
      expect(formatDuration(45_000)).toBe("45s");
    });

    test("formats minutes and seconds", () => {
      expect(formatDuration(135_000)).toBe("2m 15s");
    });

    test("formats minutes only when no remaining seconds", () => {
      expect(formatDuration(120_000)).toBe("2m");
    });

    test("formats hours, minutes, and seconds", () => {
      expect(formatDuration(3_723_000)).toBe("1h 2m 3s");
    });
  });

  describe("truncate", () => {
    test("returns short text unchanged", () => {
      expect(truncate("hello", 10)).toBe("hello");
    });

    test("truncates long text with ellipsis", () => {
      expect(truncate("hello world this is a long string", 15)).toBe(
        "hello world ...",
      );
    });
  });

  describe("formatTokenCount", () => {
    test("formats small numbers as-is", () => {
      expect(formatTokenCount(532)).toBe("532");
    });

    test("formats thousands with K suffix", () => {
      expect(formatTokenCount(42_312)).toBe("42K");
    });

    test("formats small thousands with decimal", () => {
      expect(formatTokenCount(7000)).toBe("7.0K");
    });

    test("formats millions with M suffix", () => {
      expect(formatTokenCount(1_234_567)).toBe("1.2M");
    });

    test("formats large millions without decimal", () => {
      expect(formatTokenCount(15_000_000)).toBe("15M");
    });

    test("handles zero", () => {
      expect(formatTokenCount(0)).toBe("0");
    });
  });

  describe("renderBuildPracticalSummary", () => {
    test("renders box with Build Summary title", () => {
      const summary: BuildPracticalSummary = {
        commitRange: { endHash: null, startHash: null },
        remaining: 5,
        stats: {
          completed: 3,
          costUsd: 1.25,
          durationMs: 300_000,
          failed: 0,
          filesChanged: 12,
          linesAdded: 42,
          linesRemoved: 8,
          maxContextTokens: 120_000,
          outputTokens: 7000,
        },
        subtasks: [
          { attempts: 1, id: "SUB-001", summary: "First subtask completed" },
          { attempts: 2, id: "SUB-002", summary: "Second subtask (retry)" },
          { attempts: 1, id: "SUB-003", summary: "Third subtask done" },
        ],
      };

      const result = renderBuildPracticalSummary(summary);

      // Should contain Build Summary title
      expect(result).toContain("Build Summary");

      // Should contain stats
      expect(result).toContain("Completed");
      expect(result).toContain("3");
      expect(result).toContain("Failed");
      expect(result).toContain("Cost");
      expect(result).toContain("$1.25");
      expect(result).toContain("Duration");
      expect(result).toContain("Files");
      expect(result).toContain("12");

      // Should contain subtask IDs
      expect(result).toContain("SUB-001");
      expect(result).toContain("SUB-002");
      expect(result).toContain("SUB-003");

      // Should show retry count for SUB-002
      expect(result).toContain("2 attempts");

      // Should show remaining count
      expect(result).toContain("5");
      expect(result).toContain("remaining");
    });

    test("shows git diff command when commit range exists", () => {
      const summary: BuildPracticalSummary = {
        commitRange: { endHash: "def456", startHash: "abc123" },
        remaining: 0,
        stats: {
          completed: 1,
          costUsd: 0.5,
          durationMs: 60_000,
          failed: 0,
          filesChanged: 5,
          linesAdded: 25,
          linesRemoved: 3,
          maxContextTokens: 80_000,
          outputTokens: 3000,
        },
        subtasks: [{ attempts: 1, id: "SUB-001", summary: "Done" }],
      };

      const result = renderBuildPracticalSummary(summary);

      expect(result).toContain("git diff");
      expect(result).toContain("abc123");
      expect(result).toContain("def456");
    });

    test("shows all complete message when remaining is 0", () => {
      const summary: BuildPracticalSummary = {
        commitRange: { endHash: null, startHash: null },
        remaining: 0,
        stats: {
          completed: 1,
          costUsd: 0.25,
          durationMs: 30_000,
          failed: 0,
          filesChanged: 3,
          linesAdded: 15,
          linesRemoved: 2,
          maxContextTokens: 50_000,
          outputTokens: 1500,
        },
        subtasks: [{ attempts: 1, id: "SUB-001", summary: "Done" }],
      };

      const result = renderBuildPracticalSummary(summary);

      expect(result).toContain("All subtasks complete");
    });

    test("function is exported", () => {
      expect(typeof renderBuildPracticalSummary).toBe("function");
    });

    test("displays token usage when present", () => {
      const summary: BuildPracticalSummary = {
        commitRange: { endHash: null, startHash: null },
        remaining: 0,
        stats: {
          completed: 1,
          costUsd: 0.5,
          durationMs: 60_000,
          failed: 0,
          filesChanged: 5,
          linesAdded: 50,
          linesRemoved: 10,
          maxContextTokens: 120_000,
          outputTokens: 7000,
        },
        subtasks: [{ attempts: 1, id: "SUB-001", summary: "Done" }],
      };

      const result = renderBuildPracticalSummary(summary);

      // Should display token info
      expect(result).toContain("Tokens");
      expect(result).toContain("MaxCtx:");
      expect(result).toContain("Out:");
      // maxContextTokens = 120K
      expect(result).toContain("120K");
      // outputTokens < 10K so shows decimal
      expect(result).toContain("7.0K");
    });

    test("does not display tokens when all zero", () => {
      const summary: BuildPracticalSummary = {
        commitRange: { endHash: null, startHash: null },
        remaining: 0,
        stats: {
          completed: 1,
          costUsd: 0.5,
          durationMs: 60_000,
          failed: 0,
          filesChanged: 5,
          linesAdded: 20,
          linesRemoved: 5,
          maxContextTokens: 0,
          outputTokens: 0,
        },
        subtasks: [{ attempts: 1, id: "SUB-001", summary: "Done" }],
      };

      const result = renderBuildPracticalSummary(summary);

      // Should NOT display tokens line when all zero
      expect(result).not.toContain("MaxCtx:");
    });
  });

  describe("renderCascadeProgress", () => {
    test("renders correct format with completed, current, and remaining levels", () => {
      const result = renderCascadeProgress(
        "tasks",
        ["stories"],
        ["subtasks", "build"],
      );

      // Should contain completed level with check mark
      expect(result).toContain("[stories]");
      expect(result).toContain("✓");

      // Should contain current level with bullet
      expect(result).toContain("[tasks]");
      expect(result).toContain("◉");

      // Should contain remaining levels without brackets
      expect(result).toContain("subtasks");
      expect(result).toContain("build");

      // Should contain arrows
      expect(result).toContain("→");
    });

    test("handles empty completed levels", () => {
      const result = renderCascadeProgress(
        "stories",
        [],
        ["tasks", "subtasks"],
      );

      expect(result).toContain("[stories]");
      expect(result).toContain("◉");
      expect(result).toContain("tasks");
      expect(result).toContain("subtasks");
    });

    test("handles empty remaining levels", () => {
      const result = renderCascadeProgress("calibrate", ["build"], []);

      expect(result).toContain("[build]");
      expect(result).toContain("✓");
      expect(result).toContain("[calibrate]");
      expect(result).toContain("◉");
    });

    test("handles multiple completed levels", () => {
      const result = renderCascadeProgress(
        "subtasks",
        ["stories", "tasks"],
        ["build"],
      );

      expect(result).toContain("[stories]");
      expect(result).toContain("[tasks]");
      expect(result).toContain("[subtasks]");
      expect(result).toContain("build");
    });
  });

  describe("renderCascadeSummary", () => {
    test("renders success state correctly", () => {
      const result: CascadeResult = {
        completedLevels: ["build", "calibrate"],
        error: null,
        stoppedAt: null,
        success: true,
      };

      const output = renderCascadeSummary(result);

      expect(output).toContain("Cascade Summary");
      expect(output).toContain("Cascade Complete");
      expect(output).toContain("build");
      expect(output).toContain("calibrate");
      expect(output).toContain("✓");
    });

    test("renders failure state with error message", () => {
      const result: CascadeResult = {
        completedLevels: ["build"],
        error: "Calibration failed",
        stoppedAt: "calibrate",
        success: false,
      };

      const output = renderCascadeSummary(result);

      expect(output).toContain("Cascade Summary");
      expect(output).toContain("Cascade Stopped");
      expect(output).toContain("build");
      expect(output).toContain("Stopped at:");
      expect(output).toContain("calibrate");
      expect(output).toContain("Error:");
      expect(output).toContain("Calibration failed");
    });

    test("renders empty completed levels state", () => {
      const result: CascadeResult = {
        completedLevels: [],
        error: "Invalid cascade target",
        stoppedAt: "tasks",
        success: false,
      };

      const output = renderCascadeSummary(result);

      expect(output).toContain("No levels completed");
      expect(output).toContain("Invalid cascade target");
    });

    test("function is exported", () => {
      expect(typeof renderCascadeSummary).toBe("function");
    });

    test("function accepts CascadeResult type", () => {
      const result: CascadeResult = {
        completedLevels: ["build"],
        error: null,
        stoppedAt: null,
        success: true,
      };

      // Should not throw
      const output = renderCascadeSummary(result);
      expect(typeof output).toBe("string");
    });
  });

  describe("renderPlanSubtasksSummary", () => {
    test("shows only Story line when source.path equals storyRef", () => {
      const data: PlanSubtasksSummaryData = {
        costUsd: 1.5,
        durationMs: 60_000,
        outputPath: "/path/to/subtasks.json",
        sessionId: "test-session",
        sizeMode: "medium",
        source: { path: "/path/to/story.md", type: "file" },
        storyRef: "/path/to/story.md",
        subtasks: [{ id: "SUB-001", title: "Test subtask" }],
      };

      const result = renderPlanSubtasksSummary(data);

      // Should show Story line
      expect(result).toContain("Story:");
      expect(result).toContain("/path/to/story.md");

      // Should NOT show duplicate Source (file) line
      expect(result).not.toContain("Source (file):");
    });

    test("shows both Source and Story lines when they differ", () => {
      const data: PlanSubtasksSummaryData = {
        costUsd: 1.5,
        durationMs: 60_000,
        outputPath: "/path/to/subtasks.json",
        sessionId: "test-session",
        sizeMode: "medium",
        source: { path: "/path/to/task.md", type: "file" },
        storyRef: "/path/to/story.md",
        subtasks: [{ id: "SUB-001", title: "Test subtask" }],
      };

      const result = renderPlanSubtasksSummary(data);

      // Should show both lines since paths differ
      expect(result).toContain("Source (file):");
      expect(result).toContain("Story:");
    });

    test("shows Source line when source type is not file", () => {
      const data: PlanSubtasksSummaryData = {
        costUsd: 1.5,
        durationMs: 60_000,
        outputPath: "/path/to/subtasks.json",
        sessionId: "test-session",
        sizeMode: "medium",
        source: { path: "/path/to/review.json", type: "review" },
        storyRef: "/path/to/review.json",
        subtasks: [{ id: "SUB-001", title: "Test subtask" }],
      };

      const result = renderPlanSubtasksSummary(data);

      // Should show Source line for review type even if path matches storyRef
      expect(result).toContain("Source (review):");
    });

    test("shows Source line when storyRef is undefined", () => {
      const data: PlanSubtasksSummaryData = {
        costUsd: 1.5,
        durationMs: 60_000,
        outputPath: "/path/to/subtasks.json",
        sessionId: "test-session",
        sizeMode: "medium",
        source: { path: "/path/to/file.md", type: "file" },
        subtasks: [{ id: "SUB-001", title: "Test subtask" }],
      };

      const result = renderPlanSubtasksSummary(data);

      // Should show Source line when there's no storyRef
      expect(result).toContain("Source (file):");
    });

    test("function is exported", () => {
      expect(typeof renderPlanSubtasksSummary).toBe("function");
    });
  });

  describe("provider-aware headers", () => {
    test("renders invocation header with default Claude provider", () => {
      const result = renderInvocationHeader("headless");

      expect(result).toContain("Invoking Claude (headless)");
    });

    test("renders invocation header with OpenCode provider", () => {
      const result = renderInvocationHeader("headless", "opencode");

      expect(result).toContain("Invoking OpenCode (headless)");
    });

    test("renders response header with default Claude provider", () => {
      const result = renderResponseHeader();

      expect(result).toContain("Claude Response");
    });

    test("renders response header with OpenCode provider", () => {
      const result = renderResponseHeader("opencode");

      expect(result).toContain("OpenCode Response");
    });
  });
});

/**
 * Tests for display.ts rendering utilities
 */

import type { BuildPracticalSummary } from "@tools/commands/ralph/summary";

import {
  formatDuration,
  renderBuildPracticalSummary,
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
        },
        subtasks: [{ attempts: 1, id: "SUB-001", summary: "Done" }],
      };

      const result = renderBuildPracticalSummary(summary);

      expect(result).toContain("All subtasks complete");
    });

    test("function is exported", () => {
      expect(typeof renderBuildPracticalSummary).toBe("function");
    });
  });
});

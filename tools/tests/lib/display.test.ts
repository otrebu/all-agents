/**
 * Tests for display.ts rendering utilities
 */

import type { BuildPracticalSummary } from "@tools/commands/ralph/summary";
import type {
  CascadeResult,
  PipelinePhaseNode,
} from "@tools/commands/ralph/types";

import {
  formatDuration,
  formatTokenCount,
  type PlanSubtasksSummaryData,
  renderBuildPracticalSummary,
  renderCascadeProgress,
  renderCascadeSummary,
  renderCollapsedPhase,
  renderCommandBanner,
  renderEventLine,
  renderExpandedPhase,
  renderInvocationHeader,
  renderPhaseCard,
  renderPipelineTree,
  renderPlanSubtasksSummary,
  renderResponseHeader,
  truncate,
} from "@tools/commands/ralph/display";
import { describe, expect, test } from "bun:test";
import chalk from "chalk";

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

  describe("renderCollapsedPhase", () => {
    function createCollapsedNode(
      gateIndicator?: string,
      name = "tasks",
    ): PipelinePhaseNode {
      return {
        expanded: false,
        expandedDetail: { reads: [], steps: [], writes: [] },
        name,
        summary: {
          description: "Break stories into task files",
          gateIndicator,
          timeEstimate: "~5 min",
        },
      };
    }

    test("renders non-last connector with gate indicator", () => {
      const output = renderCollapsedPhase(
        createCollapsedNode("[APPROVAL]"),
        false,
      );

      expect(output).toContain("├─");
      expect(output).toContain("tasks");
      expect(output).toContain("Break stories into task files");
      expect(output).toContain("~5 min");
      expect(output).toContain("[APPROVAL]");
      expect(output.includes("\n")).toBe(false);
    });

    test("renders last connector without gate indicator", () => {
      const output = renderCollapsedPhase(createCollapsedNode(), true);

      expect(output).toContain("└─");
      expect(output).toContain("tasks");
      expect(output).toContain("Break stories into task files");
      expect(output).toContain("~5 min");
      expect(output).not.toContain("[APPROVAL]");
      expect(output.includes("\n")).toBe(false);
    });
  });

  describe("renderExpandedPhase", () => {
    function createExpandedNode(overrides?: {
      gate?: null | string;
      reads?: Array<string>;
      steps?: Array<string>;
      writes?: Array<string>;
    }): PipelinePhaseNode {
      return {
        expanded: true,
        expandedDetail: {
          gate: overrides?.gate ?? undefined,
          reads: overrides?.reads ?? ["milestones/M1/MILESTONE.md"],
          steps: overrides?.steps ?? [
            "1. Read milestone description",
            "2. Generate story files",
          ],
          writes: overrides?.writes ?? ["stories/S-NNN-*.md"],
        },
        name: "stories",
        summary: {
          description: "Generate story files from MILESTONE.md",
          timeEstimate: "~3 min",
        },
      };
    }

    test("renders expanded layout with READS, STEPS, WRITES, and GATE sections", () => {
      const output = renderExpandedPhase(
        createExpandedNode({ gate: "createStories → SKIP (--force)" }),
      );

      expect(output[0]).toContain("▾");
      expect(output[0]).toContain("stories");
      expect(output[1]).toContain("│  READS");
      expect(output[2]).toContain("│  STEPS");
      expect(output[3]).toContain("│         ");
      expect(output[4]).toContain("│  WRITES");
      expect(output[5]).toContain("│  GATE");
      expect(output[5]).toContain("createStories → SKIP (--force)");
    });

    test("omits GATE section when gate is undefined or null", () => {
      const withoutGate = renderExpandedPhase(createExpandedNode());
      const nullGate = renderExpandedPhase(createExpandedNode({ gate: null }));

      expect(withoutGate.some((line) => line.includes("GATE"))).toBe(false);
      expect(nullGate.some((line) => line.includes("GATE"))).toBe(false);
    });

    test("applies chalk styles and handles empty reads/writes arrays", () => {
      const output = renderExpandedPhase(
        createExpandedNode({ gate: "none", reads: [], writes: [] }),
      );

      expect(output[0]).toContain(chalk.cyan("stories"));
      expect(output[1]).toContain(chalk.dim("READS"));
      expect(output[2]).toContain(chalk.dim("STEPS"));
      expect(output[4]).toContain(chalk.dim("WRITES"));
      expect(output[5]).toContain(chalk.dim("GATE"));
      expect(output[5]).toContain(chalk.yellow("none"));
    });
  });

  describe("renderPipelineTree", () => {
    function createPhaseNode(options: {
      description: string;
      expanded: boolean;
      gate?: string;
      gateIndicator?: string;
      name: string;
      reads?: Array<string>;
      steps?: Array<string>;
      timeEstimate: string;
      writes?: Array<string>;
    }): PipelinePhaseNode {
      return {
        expanded: options.expanded,
        expandedDetail: {
          gate: options.gate,
          reads: options.reads ?? [],
          steps: options.steps ?? [],
          writes: options.writes ?? [],
        },
        name: options.name,
        summary: {
          description: options.description,
          gateIndicator: options.gateIndicator,
          timeEstimate: options.timeEstimate,
        },
      };
    }

    test("renders a single expanded-only phase", () => {
      const output = renderPipelineTree([
        createPhaseNode({
          description: "Generate story files from MILESTONE.md",
          expanded: true,
          name: "stories",
          reads: ["milestones/M1/MILESTONE.md"],
          steps: ["1. Read milestone description"],
          timeEstimate: "~3 min",
          writes: ["stories/S-NNN-*.md"],
        }),
      ]);

      expect(output[0]).toContain("└─");
      expect(output[0]).toContain("▾");
      expect(output[0]).toContain("stories");
      expect(output.some((line) => line.includes("READS"))).toBe(true);
      expect(output.some((line) => line === "│")).toBe(false);
    });

    test("renders a 2-phase mixed tree with continuation line", () => {
      const output = renderPipelineTree([
        createPhaseNode({
          description: "Generate story files from MILESTONE.md",
          expanded: true,
          name: "stories",
          reads: ["milestones/M1/MILESTONE.md"],
          steps: ["1. Read milestone description"],
          timeEstimate: "~3 min",
          writes: ["stories/S-NNN-*.md"],
        }),
        createPhaseNode({
          description: "Break stories into task files",
          expanded: false,
          gateIndicator: "[APPROVAL]",
          name: "tasks",
          timeEstimate: "~5 min",
        }),
      ]);

      expect(output[0]).toContain("├─");
      expect(output[0]).toContain("▾ stories");
      expect(output.some((line) => line === "│")).toBe(true);
      expect(output.at(-1)).toContain("└─");
      expect(output.at(-1)).toContain("tasks");
      expect(output.at(-1)).toContain("[APPROVAL]");
    });

    test("renders a 4-phase mixed tree matching Example 1 structure", () => {
      const output = renderPipelineTree([
        createPhaseNode({
          description: "Generate story files from MILESTONE.md",
          expanded: true,
          gate: "createStories → SKIP (--force)",
          name: "stories",
          reads: ["milestones/M1/MILESTONE.md", "ROADMAP.md"],
          steps: ["1. Read milestone description", "2. Generate story files"],
          timeEstimate: "~3 min",
          writes: ["stories/S-NNN-*.md"],
        }),
        createPhaseNode({
          description: "Break stories into task files",
          expanded: false,
          gateIndicator: "[APPROVAL]",
          name: "tasks",
          timeEstimate: "~5 min",
        }),
        createPhaseNode({
          description: "Slice tasks into atomic subtask queue",
          expanded: false,
          gateIndicator: "[APPROVAL]",
          name: "subtasks",
          timeEstimate: "~8 min",
        }),
        createPhaseNode({
          description: "Execute subtask queue",
          expanded: false,
          gateIndicator: "auto",
          name: "build",
          timeEstimate: "~45 min",
        }),
      ]);

      expect(output[0]).toContain("├─");
      expect(output[0]).toContain("▾ stories");
      expect(output.some((line) => line.includes("│  │  READS"))).toBe(true);
      expect(
        output.some((line) => line.includes("createStories → SKIP (--force)")),
      ).toBe(true);
      expect(output.some((line) => line.includes("├─ tasks"))).toBe(true);
      expect(output.some((line) => line.includes("├─ subtasks"))).toBe(true);
      expect(output.at(-1)).toContain("└─ build");
      expect(output.at(-1)).toContain("auto");
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

  describe("visual style primitives", () => {
    test("renders command banner with title and lines", () => {
      const result = renderCommandBanner({
        lines: ["queue: docs/planning/milestones/demo/subtasks.json"],
        title: "RALPH PLAN SUBTASKS (HEADLESS)",
      });

      expect(result).toContain("RALPH PLAN SUBTASKS (HEADLESS)");
      expect(result).toContain(
        "queue: docs/planning/milestones/demo/subtasks.json",
      );
    });

    test("renders event line with domain and state", () => {
      const result = renderEventLine({
        domain: "PLAN",
        message: "Phase 2/4 complete",
        state: "DONE",
      });

      expect(result).toContain("[PLAN] [DONE]");
      expect(result).toContain("Phase 2/4 complete");
    });

    test("renders phase card with event title and details", () => {
      const result = renderPhaseCard({
        domain: "CASCADE",
        lines: ["from: subtasks", "to: build"],
        state: "START",
        title: "Handoff subtasks -> build",
      });

      expect(result).toContain("[CASCADE] [START]");
      expect(result).toContain("Handoff subtasks -> build");
      expect(result).toContain("from: subtasks");
      expect(result).toContain("to: build");
    });
  });
});

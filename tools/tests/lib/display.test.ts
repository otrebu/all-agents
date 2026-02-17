/**
 * Tests for display.ts rendering utilities
 */

import type { BuildPracticalSummary } from "@tools/commands/ralph/summary";
import type {
  ApprovalGatePreview,
  CascadeResult,
  PipelinePhaseNode,
  PipelineStep,
} from "@tools/commands/ralph/types";

import {
  BOX_WIDTH,
  CASCADE_SYMBOL_COMPLETED,
  CASCADE_SYMBOL_FAILED,
  CASCADE_SYMBOL_PENDING,
  CASCADE_SYMBOL_RUNNING,
  CASCADE_SYMBOL_TIMED_WAIT,
  CASCADE_SYMBOL_WAITING,
  formatDuration,
  formatStepWithAnnotation,
  formatTokenCount,
  formatTwoColumnRow,
  MARKER_ADDED,
  MARKER_REPLACED,
  MARKER_STRUCK,
  type PlanSubtasksSummaryData,
  renderAnnotatedStep,
  renderApprovalGateCard,
  renderApprovalGatePreview,
  renderBuildPracticalSummary,
  renderCascadeProgress,
  renderCascadeProgressWithStates,
  renderCascadeSummary,
  renderCollapsedPhase,
  renderCommandBanner,
  renderCompactPreview,
  renderEventLine,
  renderExpandedPhase,
  renderGateStatusIndicator,
  renderInvocationHeader,
  renderPhaseCard,
  renderPipelineFooter,
  renderPipelineHeader,
  renderPipelineTree,
  renderPlanSubtasksSummary,
  renderResponseHeader,
  truncate,
} from "@tools/commands/ralph/display";
import { describe, expect, test } from "bun:test";
import chalk from "chalk";
import stringWidth from "string-width";

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

  describe("renderCascadeProgressWithStates", () => {
    test("renders waiting phases with yellow pause-bars symbol", () => {
      const result = renderCascadeProgressWithStates(["stories", "tasks"], {
        stories: "completed",
        tasks: "waiting",
      });

      expect(result).toContain(CASCADE_SYMBOL_WAITING);
      expect(result).toContain(
        chalk.yellow(`[tasks] ${CASCADE_SYMBOL_WAITING}`),
      );
    });

    test("renders all six cascade symbol states with expected colors", () => {
      const result = renderCascadeProgressWithStates(
        ["done", "active", "gate", "delay", "stopped", "queued"],
        {
          active: "running",
          delay: "timed-wait",
          done: "completed",
          gate: "waiting",
          queued: "pending",
          stopped: "failed",
        },
      );

      expect(result).toContain(
        chalk.green(`[done] ${CASCADE_SYMBOL_COMPLETED}`),
      );
      expect(result).toContain(
        chalk.cyan.bold(`[active] ${CASCADE_SYMBOL_RUNNING}`),
      );
      expect(result).toContain(
        chalk.yellow(`[gate] ${CASCADE_SYMBOL_WAITING}`),
      );
      expect(result).toContain(
        chalk.yellow(`[delay] ${CASCADE_SYMBOL_TIMED_WAIT}`),
      );
      expect(result).toContain(chalk.red(`[stopped] ${CASCADE_SYMBOL_FAILED}`));
      expect(result).toContain(chalk.dim(`[queued] ${CASCADE_SYMBOL_PENDING}`));
    });

    test("keeps waiting visually distinct from running and pending", () => {
      const result = renderCascadeProgressWithStates(
        ["waiting-level", "running-level", "pending-level"],
        {
          "pending-level": "pending",
          "running-level": "running",
          "waiting-level": "waiting",
        },
      );

      expect(result).toContain(
        chalk.yellow(`[waiting-level] ${CASCADE_SYMBOL_WAITING}`),
      );
      expect(result).toContain(
        chalk.cyan.bold(`[running-level] ${CASCADE_SYMBOL_RUNNING}`),
      );
      expect(result).toContain(
        chalk.dim(`[pending-level] ${CASCADE_SYMBOL_PENDING}`),
      );

      expect(result).not.toContain(
        chalk.yellow(`[waiting-level] ${CASCADE_SYMBOL_RUNNING}`),
      );
      expect(result).not.toContain(
        chalk.yellow(`[waiting-level] ${CASCADE_SYMBOL_PENDING}`),
      );
    });
  });

  describe("renderCollapsedPhase", () => {
    function createCollapsedNode(
      gateStatus?: "APPROVAL" | "auto" | "SKIP",
      name = "tasks",
    ): PipelinePhaseNode {
      return {
        expanded: false,
        expandedDetail: { reads: [], steps: [], writes: [] },
        name,
        summary: {
          description: "Break stories into task files",
          gateStatus,
          timeEstimate: "~5 min",
        },
      };
    }

    test("renders non-last connector with gate indicator", () => {
      const output = renderCollapsedPhase(
        createCollapsedNode("APPROVAL"),
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

  describe("renderGateStatusIndicator", () => {
    test("returns [APPROVAL] indicator in yellow", () => {
      const output = renderGateStatusIndicator("APPROVAL");

      expect(output).toContain("[APPROVAL]");
      expect(output).toContain(chalk.yellow("[APPROVAL]"));
    });

    test("returns auto indicator in green", () => {
      const output = renderGateStatusIndicator("auto");

      expect(output).toContain("auto");
      expect(output).toContain(chalk.green("auto"));
    });

    test("returns [SKIP] indicator in yellow", () => {
      const output = renderGateStatusIndicator("SKIP");

      expect(output).toContain("[SKIP]");
      expect(output).toContain(chalk.yellow("[SKIP]"));
    });
  });

  describe("renderApprovalGatePreview", () => {
    test("renders SKIP with [force] marker in dim green", () => {
      const output = renderApprovalGatePreview("createTasks", "write", {
        force: true,
      });

      expect(output).toContain("GATE createTasks ->");
      expect(output).toContain("SKIP");
      expect(output).toContain("[force]");
      expect(output).toContain(chalk.green.dim("SKIP"));
    });

    test("renders PROMPT with [review] marker in yellow", () => {
      const output = renderApprovalGatePreview("createStories", "prompt", {
        review: true,
      });

      expect(output).toContain("PROMPT");
      expect(output).toContain("[review]");
      expect(output).toContain(chalk.yellow("PROMPT"));
    });

    test("renders notify-wait action in cyan", () => {
      const output = renderApprovalGatePreview("createSubtasks", "notify-wait");

      expect(output).toContain("NOTIFY-WAIT");
      expect(output).toContain(chalk.cyan("NOTIFY-WAIT"));
    });

    test("renders exit-unstaged action with warning symbol in yellow", () => {
      const output = renderApprovalGatePreview(
        "createRoadmap",
        "exit-unstaged",
      );

      expect(output).toContain("EXIT-UNSTAGED");
      expect(output).toContain("⚠");
      expect(output).toContain(chalk.yellow("⚠ EXIT-UNSTAGED"));
    });
  });

  describe("renderApprovalGateCard", () => {
    const baseData = {
      actionOptions: [
        { color: "green" as const, key: "Y", label: "Approve and continue" },
        { color: "red" as const, key: "n", label: "Abort cascade" },
        { color: "yellow" as const, key: "e", label: "Edit files first" },
      ],
      configMode: "suggest",
      executionMode: "supervised" as const,
      gateName: "createStories" as const,
      resolvedAction: "prompt",
      summaryLines: [
        "stories/001-STORY-preview.md",
        "stories/002-STORY-flow.md",
      ],
    };

    test("returns a non-empty boxen string with formatted gate name", () => {
      const output = renderApprovalGateCard(baseData);

      expect(output.length).toBeGreaterThan(0);
      expect(output).toContain("Create Stories");
      expect(output).toContain("╭");
      expect(output).toContain("╯");
    });

    test("includes summary, context, and action options sections", () => {
      const output = renderApprovalGateCard(baseData);

      expect(output).toContain("stories/001-STORY-preview.md");
      expect(output).toContain("Config:");
      expect(output).toContain("Mode:");
      expect(output).toContain("Action:");
      expect(output).toContain("[Y]");
      expect(output).toContain("[n]");
      expect(output).toContain("[e]");
    });

    test("truncates summary list for more than 10 files", () => {
      const output = renderApprovalGateCard({
        ...baseData,
        summaryLines: Array.from(
          { length: 12 },
          (_, index) => `stories/${String(index + 1).padStart(3, "0")}.md`,
        ),
      });

      expect(output).toContain("stories/001.md");
      expect(output).toContain("stories/005.md");
      expect(output).not.toContain("stories/006.md");
      expect(output).toContain("... and 7 more");
    });

    test("ensures rendered card lines do not exceed BOX_WIDTH", () => {
      const output = renderApprovalGateCard({
        ...baseData,
        summaryLines: [
          "stories/001-STORY-this-is-an-intentionally-very-long-file-name-to-check-width-truncation-and-safety.md",
        ],
      });

      for (const line of output.split("\n")) {
        expect(stringWidth(line)).toBeLessThanOrEqual(BOX_WIDTH);
      }
    });

    test.each([
      ["createStories", "Create Stories"],
      ["createSubtasks", "Create Subtasks"],
      ["onDriftDetected", "Drift Detected"],
    ] as const)("formats gate name %s as %s", (gateName, expectedLabel) => {
      const output = renderApprovalGateCard({ ...baseData, gateName });

      expect(output).toContain(expectedLabel);
    });
  });

  describe("renderExpandedPhase", () => {
    function createGate(
      resolvedAction: ApprovalGatePreview["resolvedAction"],
      reason?: string,
    ): ApprovalGatePreview {
      return {
        configValue: "suggest",
        gateName: "createStories",
        reason,
        resolvedAction,
      };
    }

    function createExpandedNode(overrides?: {
      gate?: ApprovalGatePreview;
      reads?: Array<string>;
      steps?: Array<PipelineStep>;
      writes?: Array<string>;
    }): PipelinePhaseNode {
      return {
        expanded: true,
        expandedDetail: {
          gate: overrides?.gate ?? undefined,
          reads: overrides?.reads ?? ["milestones/M1/MILESTONE.md"],
          steps: overrides?.steps ?? [
            { text: "1. Read milestone description" },
            { text: "2. Generate story files" },
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

    test("renders expanded layout with READS, STEPS, and WRITES sections", () => {
      const output = renderExpandedPhase(
        createExpandedNode({ gate: createGate("write") }),
      );

      expect(output[0]).toContain("▾");
      expect(output[0]).toContain("stories");
      expect(output[1]).toContain("│  READS");
      expect(output[2]).toContain("│  STEPS");
      expect(output[3]).toContain("│         ");
      expect(output[4]).toContain("│  WRITES");
      expect(output.some((line) => line.includes("GATE"))).toBe(false);
    });

    test("omits GATE section when gate is undefined", () => {
      const withoutGate = renderExpandedPhase(createExpandedNode());

      expect(withoutGate.some((line) => line.includes("GATE"))).toBe(false);
    });

    test("applies chalk styles and handles empty reads/writes arrays", () => {
      const output = renderExpandedPhase(
        createExpandedNode({
          gate: createGate("write"),
          reads: [],
          writes: [],
        }),
      );

      expect(output[0]).toContain(chalk.cyan("stories"));
      expect(output[1]).toContain(chalk.dim("READS"));
      expect(output[2]).toContain(chalk.dim("STEPS"));
      expect(output[4]).toContain(chalk.dim("WRITES"));
      expect(output.some((line) => line.includes("GATE"))).toBe(false);
    });

    test("renders mixed annotated and unannotated steps in Example 1 style", () => {
      const output = renderExpandedPhase(
        createExpandedNode({
          reads: ["milestones/M1/MILESTONE.md, ROADMAP.md"],
          steps: [
            { text: "1. Read milestone description" },
            {
              annotation: { effect: "replaced", flag: "headless" },
              text: "2. Single-pass autonomous generation",
            },
            {
              annotation: { effect: "replaced", flag: "headless" },
              text: "3. Generate without iteration",
            },
            { text: "4. Number stories (S-001, S-002...)" },
            { text: "5. Write each as separate file" },
            {
              annotation: { effect: "added", flag: "force" },
              text: "6. Auto-approve all changes",
            },
          ],
          writes: ["stories/S-NNN-*.md"],
        }),
      );
      const step1Line = output.find((line) =>
        line.includes("1. Read milestone description"),
      );
      const step2Line = output.find((line) =>
        line.includes("2. Single-pass autonomous generation"),
      );
      const step3Line = output.find((line) =>
        line.includes("3. Generate without iteration"),
      );
      const step4Line = output.find((line) =>
        line.includes("4. Number stories (S-001, S-002...)"),
      );
      const step5Line = output.find((line) =>
        line.includes("5. Write each as separate file"),
      );
      const step6Line = output.find((line) =>
        line.includes("6. Auto-approve all changes"),
      );
      const readsLine = output.find((line) => line.includes("READS"));
      const writesLine = output.find((line) => line.includes("WRITES"));

      expect(step1Line).toBeDefined();
      expect(step1Line).toContain(chalk.dim("STEPS"));

      expect(step2Line).toBeDefined();
      expect(step2Line).toContain(chalk.yellow(MARKER_REPLACED));
      expect(step2Line).toContain("[headless]");

      expect(step3Line).toBeDefined();
      expect(step3Line).toContain(chalk.yellow(MARKER_REPLACED));
      expect(step3Line).toContain("[headless]");

      expect(step4Line).toBeDefined();
      expect(step4Line).not.toContain("[");

      expect(step5Line).toBeDefined();
      expect(step5Line).not.toContain("[");

      expect(step6Line).toBeDefined();
      expect(step6Line).toContain(chalk.green(MARKER_ADDED));
      expect(step6Line).toContain("[force]");

      expect(readsLine).toBeDefined();
      expect(readsLine).not.toContain(MARKER_ADDED);
      expect(readsLine).not.toContain(MARKER_REPLACED);
      expect(readsLine).not.toContain(MARKER_STRUCK);
      expect(readsLine).not.toContain("[headless]");
      expect(readsLine).not.toContain("[force]");

      expect(writesLine).toBeDefined();
      expect(writesLine).not.toContain(MARKER_ADDED);
      expect(writesLine).not.toContain(MARKER_REPLACED);
      expect(writesLine).not.toContain(MARKER_STRUCK);
      expect(writesLine).not.toContain("[headless]");
      expect(writesLine).not.toContain("[force]");
    });
  });

  describe("renderPipelineTree", () => {
    function createGate(
      resolvedAction: ApprovalGatePreview["resolvedAction"],
      reason?: string,
      gateName = "createStories",
    ): ApprovalGatePreview {
      return { configValue: "suggest", gateName, reason, resolvedAction };
    }

    function createPhaseNode(options: {
      description: string;
      expanded: boolean;
      gate?: ApprovalGatePreview;
      gateStatus?: "APPROVAL" | "auto" | "SKIP";
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
          steps: (options.steps ?? []).map((text) => ({ text })),
          writes: options.writes ?? [],
        },
        name: options.name,
        summary: {
          description: options.description,
          gateStatus: options.gateStatus,
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
          gateStatus: "APPROVAL",
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
          gate: createGate("write"),
          name: "stories",
          reads: ["milestones/M1/MILESTONE.md", "ROADMAP.md"],
          steps: ["1. Read milestone description", "2. Generate story files"],
          timeEstimate: "~3 min",
          writes: ["stories/S-NNN-*.md"],
        }),
        createPhaseNode({
          description: "Break stories into task files",
          expanded: false,
          gateStatus: "APPROVAL",
          name: "tasks",
          timeEstimate: "~5 min",
        }),
        createPhaseNode({
          description: "Slice tasks into atomic subtask queue",
          expanded: false,
          gateStatus: "APPROVAL",
          name: "subtasks",
          timeEstimate: "~8 min",
        }),
        createPhaseNode({
          description: "Execute subtask queue",
          expanded: false,
          gateStatus: "auto",
          name: "build",
          timeEstimate: "~45 min",
        }),
      ]);

      expect(output[0]).toContain("├─");
      expect(output[0]).toContain("▾ stories");
      expect(output.some((line) => line.includes("│  │  READS"))).toBe(true);
      expect(
        output.some((line) => line.includes("GATE createStories -> SKIP")),
      ).toBe(true);
      expect(output.some((line) => line.includes("├─ tasks"))).toBe(true);
      expect(output.some((line) => line.includes("├─ subtasks"))).toBe(true);
      expect(output.at(-1)).toContain("└─ build");
      expect(output.at(-1)).toContain("auto");
    });

    test("renders [force] and [review] markers on gate lines", () => {
      const output = renderPipelineTree(
        [
          createPhaseNode({
            description: "Generate story files from MILESTONE.md",
            expanded: true,
            gate: createGate("write"),
            name: "stories",
            reads: ["milestones/M1/MILESTONE.md"],
            steps: ["1. Generate stories"],
            timeEstimate: "~3 min",
            writes: ["stories/S-NNN-*.md"],
          }),
          createPhaseNode({
            description: "Break stories into task files",
            expanded: true,
            gate: createGate("prompt", undefined, "createTasks"),
            name: "tasks",
            reads: ["stories/S-NNN-*.md"],
            steps: ["1. Generate tasks"],
            timeEstimate: "~5 min",
            writes: ["tasks/T-NNN-*.md"],
          }),
        ],
        { force: true, review: true },
      );

      expect(
        output.some((line) => line.includes("GATE createStories -> SKIP")),
      ).toBe(true);
      expect(output.some((line) => line.includes("[force]"))).toBe(true);
      expect(
        output.some((line) => line.includes("GATE createStories -> PROMPT")),
      ).toBe(false);
      expect(
        output.some((line) =>
          line.includes("GATE createStories -> NOTIFY-WAIT"),
        ),
      ).toBe(false);
      expect(
        output.some((line) =>
          line.includes("GATE createStories -> ⚠ EXIT-UNSTAGED"),
        ),
      ).toBe(false);
      expect(
        output.some((line) => line.includes("GATE createStories ->")),
      ).toBe(true);
      expect(
        output.some((line) =>
          line.includes("GATE createTasks -> PROMPT [review]"),
        ),
      ).toBe(true);
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
      expect(stringWidth(result)).toBe(BOX_WIDTH);
    });

    test("renders invocation header with OpenCode provider", () => {
      const result = renderInvocationHeader("headless", "opencode");

      expect(result).toContain("Invoking OpenCode (headless)");
      expect(stringWidth(result)).toBe(BOX_WIDTH);
    });

    test("renders invocation header at exact width for odd divider splits", () => {
      const result = renderInvocationHeader("supervised", "pi");

      expect(result).toContain("Invoking Pi (supervised)");
      expect(stringWidth(result)).toBe(BOX_WIDTH);
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

  describe("renderAnnotatedStep", () => {
    test("renders added annotation with '+' marker and green styling", () => {
      const output = renderAnnotatedStep({
        annotation: { effect: "added", flag: "validate-first" },
        text: "0. Pre-build validation",
      });

      expect(output).toContain(chalk.green(MARKER_ADDED));
      expect(output).toContain(chalk.green("0. Pre-build validation"));
      expect(output).toContain("[validate-first]");
    });

    test("renders replaced annotation with '~' marker and yellow styling", () => {
      const output = renderAnnotatedStep({
        annotation: { effect: "replaced", flag: "headless" },
        text: "2. Single-pass autonomous generation",
      });

      expect(output).toContain(chalk.yellow(MARKER_REPLACED));
      expect(output).toContain(
        chalk.yellow("2. Single-pass autonomous generation"),
      );
      expect(output).toContain("[headless]");
    });

    test("renders struck annotation with '×' marker and dim strikethrough text", () => {
      const output = renderAnnotatedStep({
        annotation: { effect: "struck", flag: "force" },
        text: "3. Prompt for approval",
      });

      expect(output).toContain(chalk.dim(MARKER_STRUCK));
      expect(output).toContain(
        chalk.dim.strikethrough("3. Prompt for approval"),
      );
      expect(output).toContain("[force]");
    });

    test("returns plain step text when annotation is absent", () => {
      const output = renderAnnotatedStep({
        text: "4. Write each as separate file",
      });

      expect(output).toBe("4. Write each as separate file");
      expect(output).not.toContain(MARKER_ADDED);
      expect(output).not.toContain(MARKER_REPLACED);
      expect(output).not.toContain(MARKER_STRUCK);
      expect(output).not.toContain("[");
    });

    test("includes a right-padded flag tag for annotated steps", () => {
      const output = renderAnnotatedStep({
        annotation: { effect: "added", flag: "force" },
        text: "6. Auto-approve all changes",
      });

      expect(output).toContain("[force]");
      expect(output).toMatch(/\s\[force\]$/);
    });
  });

  describe("formatStepWithAnnotation", () => {
    test("right-aligns tag for short step text", () => {
      const output = formatStepWithAnnotation({
        flag: "force",
        marker: chalk.green(MARKER_ADDED),
        stepText: chalk.green("Short"),
      });

      expect(stringWidth(output)).toBe(BOX_WIDTH);
      expect(output).toContain("[force]");
      expect(output).toMatch(/^\s{3}/);
    });

    test("right-aligns tag for medium step text", () => {
      const output = formatStepWithAnnotation({
        flag: "headless",
        marker: chalk.yellow(MARKER_REPLACED),
        stepText: chalk.yellow("2. Single-pass autonomous generation"),
      });

      expect(stringWidth(output)).toBe(BOX_WIDTH);
      expect(output).toContain("[headless]");
    });

    test("right-aligns tag for long step text", () => {
      const output = formatStepWithAnnotation({
        flag: "validate-first",
        marker: chalk.yellow(MARKER_REPLACED),
        stepText: chalk.yellow(
          "3. Run plan validation before writing subtask queue and stories",
        ),
      });

      expect(stringWidth(output)).toBe(BOX_WIDTH);
      expect(output).toContain("[validate-first]");
    });

    test("truncates step text when step and flag exceed available width", () => {
      const output = formatStepWithAnnotation({
        flag: "very-long-flag-name",
        marker: chalk.dim(MARKER_STRUCK),
        stepText: chalk.dim.strikethrough(
          "This is a very long step text that should be truncated to preserve right alignment",
        ),
      });

      expect(output).toContain("...");
      expect(output).toContain("[very-long-flag-name]");
      expect(stringWidth(output)).toBe(BOX_WIDTH);
    });
  });

  describe("formatTwoColumnRow", () => {
    test("right-aligns right column for plain strings", () => {
      const output = formatTwoColumnRow(
        "  Milestone: M1",
        "Provider: claude (opus-4)",
        BOX_WIDTH - 4,
      );

      expect(stringWidth(output)).toBe(BOX_WIDTH - 4);
      expect(output).toContain("Milestone: M1");
      expect(output).toContain("Provider: claude (opus-4)");
      expect(output).toMatch(/M1\s+Provider: claude \(opus-4\)$/);
    });

    test("measures ANSI-colored columns safely", () => {
      const output = formatTwoColumnRow(
        `${chalk.dim("Mode:")} ${chalk.cyan("headless")}`,
        `${chalk.dim("Approvals:")} ${chalk.yellow("skipped (--force)")}`,
        BOX_WIDTH - 4,
      );

      expect(stringWidth(output)).toBe(BOX_WIDTH - 4);
      expect(output).toContain("Mode:");
      expect(output).toContain("headless");
      expect(output).toContain("Approvals:");
      expect(output).toContain("skipped (--force)");
    });
  });

  describe("renderPipelineHeader", () => {
    test("renders double-border header with all fields", () => {
      const output = renderPipelineHeader({
        approvalsStatus: "skipped (--force)",
        commandLine: "plan stories --cascade build",
        milestone: "M1",
        mode: "headless",
        model: "opus-4",
        provider: "claude",
      });

      expect(output).toContain("╔");
      expect(output).toContain("Ralph Pipeline Plan");
      expect(output).toContain("Command:");
      expect(output).toContain("plan stories --cascade build");
      expect(output).toContain("Milestone:");
      expect(output).toContain("M1");
      expect(output).toContain("Provider:");
      expect(output).toContain("claude (opus-4)");
      expect(output).toContain("Mode:");
      expect(output).toContain("headless");
      expect(output).toContain("Approvals:");
      expect(output).toContain("skipped (--force)");
    });

    test("omits milestone segment and model parenthetical when optional fields are missing", () => {
      const output = renderPipelineHeader({
        approvalsStatus: "required",
        commandLine: "build",
        mode: "supervised",
        provider: "claude",
      });

      expect(output).toContain("Ralph Pipeline Plan");
      expect(output).toContain("Command:");
      expect(output).toContain("build");
      expect(output).not.toContain("Milestone:");
      expect(output).toContain("Provider:");
      expect(output).toContain("claude");
      expect(output).not.toContain("(undefined)");
      expect(output).toContain("Mode:");
      expect(output).toContain("supervised");
      expect(output).toContain("Approvals:");
      expect(output).toContain("required");
    });
  });

  describe("renderPipelineFooter", () => {
    test("renders totals, warnings, and dry-run next step", () => {
      const lines = renderPipelineFooter({
        estimatedCost: "$0.20 - $0.60 (planning only)",
        estimatedMinutes: 61,
        gatesStatus: "skipped (--force)",
        nextStep: "dry-run",
        phaseCount: 4,
        phaseGateCount: 3,
        warnings: [
          "--force skips all approval gates",
          "--headless disables interactive prompts",
        ],
      });

      expect(lines[0]).toBe("─".repeat(BOX_WIDTH - 4));
      expect(lines[1]).toContain(chalk.dim("Phases:"));
      expect(lines[1]).toContain(chalk.cyan("4"));
      expect(lines[1]).toContain(chalk.dim("Gates:"));
      expect(lines[1]).toContain(chalk.cyan("3"));
      expect(lines[2]).toContain(chalk.dim("Est. time:"));
      expect(lines[2]).toContain(chalk.cyan("~61 min"));
      expect(lines[2]).toContain(chalk.dim("Est. cost:"));
      expect(lines[2]).toContain(
        chalk.magenta("$0.20 - $0.60 (planning only)"),
      );
      expect(lines).toContain(
        `${chalk.yellow("⚠")} ${chalk.yellow("--force skips all approval gates")}`,
      );
      expect(lines).toContain(
        `${chalk.yellow("⚠")} ${chalk.yellow("--headless disables interactive prompts")}`,
      );
      expect(lines.at(-1)).toBe("To execute: remove --dry-run flag");
    });

    test("omits warnings and renders prompt next step", () => {
      const lines = renderPipelineFooter({
        estimatedCost: "$0.05 - $0.12",
        estimatedMinutes: 12,
        nextStep: "prompt",
        phaseCount: 1,
        phaseGateCount: 0,
      });

      expect(lines.some((line) => line.includes("⚠"))).toBe(false);
      expect(lines.at(-1)).toBe("Proceed? [Y/n]:");
    });

    test("renders continue next step for auto-run previews", () => {
      const lines = renderPipelineFooter({
        estimatedCost: "$0.05 - $0.12",
        estimatedMinutes: 12,
        nextStep: "continue",
        phaseCount: 1,
        phaseGateCount: 0,
      });

      expect(lines.at(-1)).toBe("Execution continues below...");
    });
  });

  describe("renderCompactPreview", () => {
    test("renders Example 3-style compact build preview", () => {
      const output = renderCompactPreview({
        gatesSummary: "none (--force not set, will prompt on validation fail)",
        milestone: "006-cascade-mode-for-good",
        mode: "supervised",
        model: "sonnet",
        nextSubtask: "SUB-045  Wire cascade --from flag to CLI",
        pipelineSummary: "build",
        provider: "Claude",
        queueStats: "12 pending / 34 total (22 completed, 64%)",
        validateStatus: "off",
      });

      expect(output).toContain("╔");
      expect(output).toContain("Ralph Build");
      expect(output).toContain("Milestone");
      expect(output).toContain("006-cascade-mode-for-good");
      expect(output).toContain("Provider");
      expect(output).toContain("Claude");
      expect(output).toContain("Model");
      expect(output).toContain("sonnet");
      expect(output).toContain("Queue");
      expect(output).toContain("12 pending / 34 total");
      expect(output).toContain("Next");
      expect(output).toContain("SUB-045");
      expect(output).toContain("Mode");
      expect(output).toContain("Validate");
      expect(output).toContain("Pipeline");
      expect(output).toContain("build");
      expect(output).toContain("Gates");
      expect(output).toContain(
        "none (--force not set, will prompt on validation",
      );
      expect(output).toContain("fail)");
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

    test("renders review domain event lines", () => {
      const result = renderEventLine({
        domain: "REVIEW",
        message: "Phase 1/2 started",
        state: "START",
      });

      expect(result).toContain("[REVIEW] [START]");
      expect(result).toContain("Phase 1/2 started");
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

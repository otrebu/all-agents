import {
  extractDiffSummary,
  mergeCalibrationResults,
  resolveFilesToRead,
  resolvePlanningChain,
} from "@tools/commands/ralph/calibrate";
import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "../../..");

describe("extractDiffSummary", () => {
  test("returns patch, filesChanged, and statSummary for a commit", () => {
    const commitHash = execSync("git rev-list --max-count=1 --no-merges HEAD", {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();

    const summary = extractDiffSummary(commitHash, "SUB-031", repoRoot);
    expect(summary.commitHash).toBe(commitHash);
    expect(summary.subtaskId).toBe("SUB-031");
    expect(summary.statSummary).toContain(`commit ${commitHash}`);
    expect(summary.patch).toContain(`commit ${commitHash}`);
    expect(summary.filesChanged.length).toBeGreaterThan(0);
  });
});

describe("resolvePlanningChain", () => {
  const milestonePath = path.join(
    repoRoot,
    "docs/planning/milestones/006-cascade-mode-for-good",
  );

  test("returns null when taskRef cannot be resolved", () => {
    const context = resolvePlanningChain(
      { id: "SUB-X", taskRef: "TASK-NOT-REAL" },
      milestonePath,
    );
    expect(context).toBeNull();
  });

  test("resolves WS-01 section from MILESTONE.md", () => {
    const context = resolvePlanningChain(
      { id: "SUB-X", taskRef: "WS-01-queue-operation-engine" },
      milestonePath,
    );
    expect(context).not.toBeNull();
    expect(context?.milestoneSection).toContain("WS-01 Queue Operation Engine");
  });
});

describe("resolveFilesToRead", () => {
  test("resolves @context prefixes and returns content with token estimates", () => {
    const files = resolveFilesToRead(
      [
        "@context/workflows/ralph/calibration/intention-drift.md",
        "@context/does-not-exist.md",
      ],
      repoRoot,
      repoRoot,
    );

    expect(files).toHaveLength(1);
    expect(path.isAbsolute(files[0]?.path ?? "")).toBe(true);
    expect(files[0]?.path).toContain("context/workflows/ralph/calibration");
    expect((files[0]?.content.length ?? 0) > 0).toBe(true);
    expect((files[0]?.tokenEstimate ?? 0) > 0).toBe(true);
  });
});

describe("mergeCalibrationResults", () => {
  test("concatenates and deduplicates corrective subtasks by similar title", () => {
    const merged = mergeCalibrationResults([
      {
        correctiveSubtasks: [
          {
            acceptanceCriteria: ["one"],
            description: "desc",
            filesToRead: ["a.ts"],
            taskRef: "TASK-100",
            title: "Add planning chain parser",
          },
        ],
        insertionMode: "prepend",
        summary: "Batch 1",
      },
      {
        correctiveSubtasks: [
          {
            acceptanceCriteria: ["two"],
            description: "desc",
            filesToRead: ["b.ts"],
            taskRef: "TASK-100",
            title: "Add planning-chain parser",
          },
          {
            acceptanceCriteria: ["three"],
            description: "desc",
            filesToRead: ["c.ts"],
            taskRef: "TASK-101",
            title: "Create session signal detector",
          },
        ],
        insertionMode: "prepend",
        summary: "Batch 2",
      },
    ]);

    expect(merged.correctiveSubtasks).toHaveLength(2);
    expect(merged.summary).toContain("Batch 1");
    expect(merged.summary).toContain("Batch 2");
  });
});

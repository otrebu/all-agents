import {
  formatMilestoneDirectoryName,
  formatStoryFilename,
  formatTaskFilename,
  nextArtifactNumber,
  nextMilestoneNumber,
  nextSubtaskId,
} from "@tools/commands/ralph/naming";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("naming", () => {
  let testDirectory = "";

  beforeEach(() => {
    testDirectory = join(tmpdir(), `naming-test-${Date.now()}`);
    mkdirSync(testDirectory, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDirectory)) {
      rmSync(testDirectory, { recursive: true });
    }
  });

  test("nextMilestoneNumber scans only numeric milestone directories", () => {
    const milestonesDirectory = join(testDirectory, "milestones");
    mkdirSync(milestonesDirectory, { recursive: true });

    mkdirSync(join(milestonesDirectory, "_orphan"));
    mkdirSync(join(milestonesDirectory, "001-setup"));
    mkdirSync(join(milestonesDirectory, "010-consolidate-simplify"));
    mkdirSync(join(milestonesDirectory, "notes"));
    writeFileSync(join(milestonesDirectory, "999-not-a-directory"), "");

    expect(nextMilestoneNumber(milestonesDirectory)).toBe("011");
    expect(formatMilestoneDirectoryName("Consolidate + Simplify", "011")).toBe(
      "011-consolidate-simplify",
    );
  });

  test("nextArtifactNumber supports sparse folder numbering", () => {
    const storiesDirectory = join(testDirectory, "stories");
    mkdirSync(storiesDirectory, { recursive: true });

    writeFileSync(join(storiesDirectory, "001-STORY-intro.md"), "");
    writeFileSync(join(storiesDirectory, "005-STORY-state-machine.md"), "");
    writeFileSync(join(storiesDirectory, "010-STORY-queue-api.md"), "");
    writeFileSync(join(storiesDirectory, "README.md"), "");

    const nextNumber = nextArtifactNumber(storiesDirectory);
    expect(nextNumber).toBe("011");
    expect(formatStoryFilename("shared-context-builder", nextNumber)).toBe(
      "011-STORY-shared-context-builder.md",
    );
    expect(formatTaskFilename("build-print-parity", nextNumber)).toBe(
      "011-TASK-build-print-parity.md",
    );
  });

  test("story and task formatters default to 001 numbering", () => {
    expect(formatStoryFilename("context-parity")).toBe(
      "001-STORY-context-parity.md",
    );
    expect(formatTaskFilename("subtask-cli-surface")).toBe(
      "001-TASK-subtask-cli-surface.md",
    );
  });

  test("nextSubtaskId allocates from the target queue file only", () => {
    const milestoneA = join(testDirectory, "005-consolidate-simplify");
    const milestoneB = join(testDirectory, "999-other");
    mkdirSync(milestoneA, { recursive: true });
    mkdirSync(milestoneB, { recursive: true });

    const subtasksA = join(milestoneA, "subtasks.json");
    const subtasksB = join(milestoneB, "subtasks.json");

    writeFileSync(
      subtasksA,
      JSON.stringify(
        { subtasks: [{ id: "SUB-001" }, { id: "SUB-004" }, { id: "X-100" }] },
        null,
        2,
      ),
    );
    writeFileSync(
      subtasksB,
      JSON.stringify({ subtasks: [{ id: "SUB-999" }] }, null, 2),
    );

    expect(nextSubtaskId(subtasksA)).toBe("SUB-005");
  });
});

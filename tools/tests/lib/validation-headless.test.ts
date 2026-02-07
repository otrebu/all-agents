import type { Subtask } from "@tools/commands/ralph/types";
import type {
  SkippedSubtask,
  ValidationResult,
} from "@tools/commands/ralph/validation";
import type { Mock } from "bun:test";

import {
  generateValidationFeedback,
  handleHeadlessValidationFailure,
} from "@tools/commands/ralph/validation";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

function createSubtask(storyReference: null | string = "STORY-002"): Subtask {
  return {
    acceptanceCriteria: ["AC-1"],
    description: "Validation feedback markdown generation",
    done: false,
    filesToRead: ["tools/src/commands/ralph/validation.ts"],
    id: "SUB-408",
    storyRef: storyReference,
    taskRef: "TASK-019-validation-headless",
    title: "Add SkippedSubtask type and generateValidationFeedback",
  };
}

describe("generateValidationFeedback", () => {
  test("includes all required sections and metadata", () => {
    const subtask = createSubtask("STORY-002-prebuild-validation");
    const result: ValidationResult = {
      aligned: false,
      issueType: "too_broad",
      reason: "This subtask contains implementation work outside parent scope.",
      suggestion: "Split this into focused subtasks with one concern each.",
    };

    const output = generateValidationFeedback(subtask, result);

    expect(output).toContain("# Validation Feedback: SUB-408");
    expect(output).toContain("**Generated:**");
    expect(output).toContain(
      "**Subtask:** SUB-408 - Add SkippedSubtask type and generateValidationFeedback",
    );
    expect(output).toContain("**Issue Type:** Too Broad");
    expect(output).toContain(
      "**Task Reference:** TASK-019-validation-headless",
    );
    expect(output).toContain(
      "**Story Reference:** STORY-002-prebuild-validation",
    );
    expect(output).toContain("## Validation Failure");
    expect(output).toContain(
      "This subtask contains implementation work outside parent scope.",
    );
    expect(output).toContain("## Suggested Fix");
    expect(output).toContain(
      "Split this into focused subtasks with one concern each.",
    );
    expect(output).toContain("## Subtask Definition");
    expect(output).toContain("```json");
    expect(output).toContain('"id": "SUB-408"');
    expect(output).toContain("## How to Resolve");
    expect(output).toContain("1. **Fix subtask:**");
    expect(output).toContain("2. **Skip validation:**");
    expect(output).toContain("3. **Remove subtask:**");
  });

  test("includes suggested fix section when suggestion is defined", () => {
    const output = generateValidationFeedback(createSubtask(), {
      aligned: false,
      issueType: "scope_creep",
      reason: "Adds implementation beyond requested work.",
      suggestion:
        "Constrain the implementation to requested acceptance criteria.",
    });

    expect(output).toContain("## Suggested Fix");
    expect(output).toContain(
      "Constrain the implementation to requested acceptance criteria.",
    );
  });

  test("omits suggested fix section when suggestion is undefined", () => {
    const output = generateValidationFeedback(createSubtask(), {
      aligned: false,
      issueType: "unfaithful",
      reason: "Subtask diverges from parent story intent.",
    });

    expect(output).not.toContain("## Suggested Fix");
  });

  test("includes story reference when provided and omits it when null", () => {
    const result: ValidationResult = {
      aligned: false,
      reason: "Needs alignment updates.",
    };

    const withStory = generateValidationFeedback(
      createSubtask("STORY-002"),
      result,
    );
    const withoutStory = generateValidationFeedback(
      createSubtask(null),
      result,
    );

    expect(withStory).toContain("**Story Reference:** STORY-002");
    expect(withoutStory).not.toContain("**Story Reference:**");
  });

  test("uses unknown issue label and default reason when missing", () => {
    const output = generateValidationFeedback(createSubtask(), {
      aligned: false,
    });

    expect(output).toContain("**Issue Type:** Unknown");
    expect(output).toContain("No reason provided.");
  });
});

describe("validation headless exports", () => {
  test("supports SkippedSubtask type", () => {
    const skipped: SkippedSubtask = {
      feedbackPath:
        "docs/planning/milestones/003-ralph-workflow/feedback/2026-02-07_validation_SUB-408.md",
      issueType: "too_narrow",
      reason: "Subtask is too narrow to satisfy parent acceptance criteria.",
      subtaskId: "SUB-408",
    };

    expect(skipped.subtaskId).toBe("SUB-408");
    expect(skipped.feedbackPath).toContain("validation_SUB-408.md");
  });
});

describe("handleHeadlessValidationFailure", () => {
  let milestoneDirectory = "";
  let logSpy: Mock<typeof console.log> | null = null;

  beforeEach(() => {
    milestoneDirectory = mkdtempSync(
      path.join(tmpdir(), "validation-headless-"),
    );
    logSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(milestoneDirectory, { force: true, recursive: true });
    logSpy?.mockRestore();
    logSpy = null;
  });

  test("creates feedback directory and writes validation feedback file", () => {
    const subtask: Subtask = {
      ...createSubtask("STORY-002-prebuild-validation"),
      id: "SUB-409",
      title: "Write headless validation feedback file",
    };
    const result: ValidationResult = {
      aligned: false,
      issueType: "too_narrow",
      reason: "The subtask misses required file I/O behavior.",
      suggestion: "Add feedback file creation and return path handling.",
    };
    const relativeMilestonePath = path.relative(
      process.cwd(),
      milestoneDirectory,
    );

    const filePath = handleHeadlessValidationFailure(
      subtask,
      result,
      relativeMilestonePath,
    );
    const feedbackDirectory = path.join(
      path.resolve(milestoneDirectory),
      "feedback",
    );

    expect(existsSync(feedbackDirectory)).toBe(true);
    expect(path.isAbsolute(filePath)).toBe(true);
    expect(filePath).toBe(
      path.join(feedbackDirectory, path.basename(filePath)),
    );

    const files = readdirSync(feedbackDirectory);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2}_validation_SUB-409\.md$/);
    expect(filePath).toBe(path.join(feedbackDirectory, files[0] ?? ""));

    const content = readFileSync(filePath, "utf8");
    const expectedContent = generateValidationFeedback(subtask, result);
    const generatedLinePattern = /\*\*Generated:\*\* .+/;
    expect(content.replace(generatedLinePattern, "**Generated:** <ts>")).toBe(
      expectedContent.replace(generatedLinePattern, "**Generated:** <ts>"),
    );
    expect(content).toContain("# Validation Feedback: SUB-409");
    expect(content).toContain("The subtask misses required file I/O behavior.");

    expect(logSpy).not.toBeNull();
    expect(logSpy).toHaveBeenCalledWith(
      `[Validation:SUB-409] Wrote feedback: ${filePath}`,
    );
  });
});

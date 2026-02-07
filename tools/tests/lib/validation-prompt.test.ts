import type { Subtask } from "@tools/commands/ralph/types";

import {
  buildValidationPrompt,
  resolveParentStory,
  resolveParentTask,
} from "@tools/commands/ralph/validation";
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function createPrompt(
  contextRoot: string,
  content = "Base validation prompt",
): void {
  const promptDirectory = join(contextRoot, "context/workflows/ralph/building");
  mkdirSync(promptDirectory, { recursive: true });
  writeFileSync(join(promptDirectory, "pre-build-validation.md"), content);
}

function createStory(
  milestonePath: string,
  fileName: string,
  content: string,
): void {
  const storiesDirectory = join(milestonePath, "stories");
  mkdirSync(storiesDirectory, { recursive: true });
  writeFileSync(join(storiesDirectory, fileName), content);
}

function createSubtask(taskReference: string): Subtask {
  return {
    acceptanceCriteria: ["AC-1"],
    description: "Validate prompt chain assembly",
    done: false,
    filesToRead: [],
    id: "SUB-402",
    taskRef: taskReference,
    title: "Parent chain test",
  };
}

function createTask(
  milestonePath: string,
  fileName: string,
  content: string,
): void {
  const tasksDirectory = join(milestonePath, "tasks");
  mkdirSync(tasksDirectory, { recursive: true });
  writeFileSync(join(tasksDirectory, fileName), content);
}

function runWithTemporaryDirectory(
  prefix: string,
  run: (directory: string) => void,
): void {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  try {
    run(directory);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

describe("buildValidationPrompt", () => {
  test("assembles full parent chain (subtask, task, story)", () => {
    runWithTemporaryDirectory("validation-prompt-full-", (root) => {
      const contextRoot = join(root, "repo");
      const milestonePath = join(root, "milestone");
      createPrompt(contextRoot);

      createTask(
        milestonePath,
        "TASK-017-validation-invoke.md",
        [
          "# Task",
          "",
          "**Story:** [STORY-002-prebuild-validation](../stories/STORY-002-prebuild-validation.md)",
          "",
          "Task body content",
        ].join("\n"),
      );
      createStory(
        milestonePath,
        "STORY-002-prebuild-validation.md",
        "# Story\n\nStory body content",
      );

      const prompt = buildValidationPrompt(
        createSubtask("TASK-017-validation-invoke"),
        milestonePath,
        contextRoot,
      );

      expect(prompt).toContain("Base validation prompt");
      expect(prompt).toContain("## Subtask Definition");
      expect(prompt).toContain('"id": "SUB-402"');
      expect(prompt).toContain("## Parent Task");
      expect(prompt).toContain("Task body content");
      expect(prompt).toContain("## Parent Story");
      expect(prompt).toContain("Story body content");
    });
  });

  test("includes parent task placeholder when task file is missing", () => {
    runWithTemporaryDirectory("validation-prompt-missing-task-", (root) => {
      const contextRoot = join(root, "repo");
      const milestonePath = join(root, "milestone");
      createPrompt(contextRoot);

      const prompt = buildValidationPrompt(
        createSubtask("TASK-999-missing"),
        milestonePath,
        contextRoot,
      );

      expect(prompt).toContain("## Parent Task");
      expect(prompt).toContain("*Not found: TASK-999-missing*");
      expect(prompt).not.toContain("## Parent Story");
    });
  });

  test("includes parent story placeholder when story file is missing", () => {
    runWithTemporaryDirectory("validation-prompt-missing-story-", (root) => {
      const contextRoot = join(root, "repo");
      const milestonePath = join(root, "milestone");
      createPrompt(contextRoot);
      createTask(
        milestonePath,
        "TASK-017-validation-invoke.md",
        [
          "# Task",
          "",
          "**Story:** [STORY-404-missing](../stories/STORY-404-missing.md)",
          "",
          "Task body content",
        ].join("\n"),
      );

      const prompt = buildValidationPrompt(
        createSubtask("TASK-017-validation-invoke"),
        milestonePath,
        contextRoot,
      );

      expect(prompt).toContain("## Parent Story");
      expect(prompt).toContain("*Not found: STORY-404-missing*");
    });
  });

  test("omits parent story section when task markdown has no story link", () => {
    runWithTemporaryDirectory("validation-prompt-no-storyref-", (root) => {
      const contextRoot = join(root, "repo");
      const milestonePath = join(root, "milestone");
      createPrompt(contextRoot);
      createTask(
        milestonePath,
        "TASK-017-validation-invoke.md",
        "# Task\n\nTask body content without story link",
      );

      const prompt = buildValidationPrompt(
        createSubtask("TASK-017-validation-invoke"),
        milestonePath,
        contextRoot,
      );

      expect(prompt).toContain("Task body content without story link");
      expect(prompt).not.toContain("## Parent Story");
    });
  });

  test("throws when prompt template file is missing", () => {
    runWithTemporaryDirectory("validation-prompt-no-template-", (root) => {
      const contextRoot = join(root, "repo");
      const milestonePath = join(root, "milestone");

      expect(() =>
        buildValidationPrompt(
          createSubtask("TASK-017-validation-invoke"),
          milestonePath,
          contextRoot,
        ),
      ).toThrow("Validation prompt not found");
    });
  });
});

describe("parent chain resolvers", () => {
  test("resolveParentTask extracts storyRef from markdown story link", () => {
    runWithTemporaryDirectory("validation-resolve-task-", (root) => {
      const milestonePath = join(root, "milestone");
      createTask(
        milestonePath,
        "TASK-050-example.md",
        [
          "## Task",
          "",
          "**Story:** [STORY-123-customer-login](../stories/STORY-123-customer-login.md)",
          "",
          "Task body",
        ].join("\n"),
      );

      const resolved = resolveParentTask("TASK-050", milestonePath);

      expect(resolved.storyRef).toBe("STORY-123-customer-login");
      expect(resolved.taskContent).toContain("Task body");
    });
  });

  test("resolveParentTask returns null storyRef when story pattern is absent", () => {
    runWithTemporaryDirectory("validation-resolve-task-no-story-", (root) => {
      const milestonePath = join(root, "milestone");
      createTask(
        milestonePath,
        "TASK-050-example.md",
        "# Task\n\nNo story line",
      );

      const resolved = resolveParentTask("TASK-050", milestonePath);

      expect(resolved.storyRef).toBeNull();
      expect(resolved.taskContent).toContain("No story line");
    });
  });

  test("resolveParentTask returns nulls when tasks directory is missing", () => {
    runWithTemporaryDirectory(
      "validation-resolve-task-missing-dir-",
      (root) => {
        const resolved = resolveParentTask("TASK-050", join(root, "milestone"));

        expect(resolved).toEqual({ storyRef: null, taskContent: null });
      },
    );
  });

  test("resolveParentStory returns null when story file is missing", () => {
    runWithTemporaryDirectory("validation-resolve-story-missing-", (root) => {
      const milestonePath = join(root, "milestone");
      mkdirSync(join(milestonePath, "stories"), { recursive: true });

      expect(resolveParentStory("STORY-999", milestonePath)).toBeNull();
    });
  });
});

import { createStory } from "@tools/commands/story";
import { createTask } from "@tools/commands/task";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("milestone-scoped task/story creation", () => {
  let temporaryDirectory = "";
  let milestoneDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `task-story-milestone-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    milestoneDirectory = join(temporaryDirectory, "005-consolidate-simplify");
    mkdirSync(milestoneDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("createTask with --milestone writes to milestone tasks directory", () => {
    const result = createTask("foo", { milestone: milestoneDirectory });
    const expectedPath = join(milestoneDirectory, "tasks", "001-TASK-foo.md");

    expect(result.filepath).toBe(expectedPath);
    expect(result.number).toBe("001");
    expect(existsSync(expectedPath)).toBe(true);

    const content = readFileSync(expectedPath, "utf8");
    expect(content).toContain("## Task: foo");
  });

  test("createStory with --milestone writes to milestone stories directory", () => {
    const result = createStory("foo", { milestone: milestoneDirectory });
    const expectedPath = join(
      milestoneDirectory,
      "stories",
      "001-STORY-foo.md",
    );

    expect(result.filepath).toBe(expectedPath);
    expect(result.number).toBe("001");
    expect(existsSync(expectedPath)).toBe(true);

    const content = readFileSync(expectedPath, "utf8");
    expect(content).toContain("## Story: foo");
  });
});

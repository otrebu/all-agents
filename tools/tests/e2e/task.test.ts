import { getContextRoot } from "@tools/utils/paths";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execa } from "execa";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

describe("task E2E", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    // Create unique temp directory for each test (sync to avoid race conditions)
    temporaryDirectory = join(
      tmpdir(),
      `task-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directory
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  // Help and basic CLI
  test("task --help shows usage", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "task", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Task management utilities");
  });

  test("task create --help shows --dir option", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "task", "create", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--dir");
    expect(stdout).toContain("Custom tasks directory");
  });

  test("task create requires name argument", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "task", "create"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("missing required argument");
  });

  // Core functionality
  test("create: first task in empty dir is 001", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "task",
        "create",
        "my-first-task",
        "--dir",
        temporaryDirectory,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("001-my-first-task.md");
    expect(stdout).toContain(temporaryDirectory);

    // Verify file exists
    const files = readdirSync(temporaryDirectory);
    expect(files).toContain("001-my-first-task.md");
  });

  test("create: increments from existing task", async () => {
    // Pre-create a task file
    writeFileSync(join(temporaryDirectory, "001-existing-task.md"), "");

    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "task",
        "create",
        "second-task",
        "--dir",
        temporaryDirectory,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("002-second-task.md");

    const files = readdirSync(temporaryDirectory);
    expect(files).toContain("001-existing-task.md");
    expect(files).toContain("002-second-task.md");
  });

  test("create: handles gaps in numbering (uses max + 1)", async () => {
    // Create tasks with gap: 001, 005
    writeFileSync(join(temporaryDirectory, "001-first.md"), "");
    writeFileSync(join(temporaryDirectory, "005-fifth.md"), "");

    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "task", "create", "new-task", "--dir", temporaryDirectory],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("006-new-task.md");
  });

  test("create: ignores non-task files", async () => {
    // Create files that don't match task pattern
    writeFileSync(join(temporaryDirectory, "readme.md"), "");
    writeFileSync(join(temporaryDirectory, "notes.txt"), "");
    writeFileSync(join(temporaryDirectory, "random-file.md"), "");

    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "task",
        "create",
        "first-real-task",
        "--dir",
        temporaryDirectory,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("001-first-real-task.md");
  });

  test("create: creates directory if missing", async () => {
    const nestedDirectory = join(temporaryDirectory, "nested", "tasks", "here");

    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "task", "create", "nested-task", "--dir", nestedDirectory],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("001-nested-task.md");
    expect(existsSync(nestedDirectory)).toBe(true);

    const files = readdirSync(nestedDirectory);
    expect(files).toContain("001-nested-task.md");
  });

  test("create: outputs full filepath to stdout", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "task",
        "create",
        "path-test",
        "--dir",
        temporaryDirectory,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    // stdout should be the full path
    const expectedPath = join(temporaryDirectory, "001-path-test.md");
    expect(stdout.trim()).toBe(expectedPath);
  });

  test("create: handles multiple sequential creates", async () => {
    // Create three tasks in sequence
    await execa(
      "bun",
      ["run", "dev", "task", "create", "task-a", "--dir", temporaryDirectory],
      { cwd: TOOLS_DIR },
    );
    await execa(
      "bun",
      ["run", "dev", "task", "create", "task-b", "--dir", temporaryDirectory],
      { cwd: TOOLS_DIR },
    );
    const { stdout } = await execa(
      "bun",
      ["run", "dev", "task", "create", "task-c", "--dir", temporaryDirectory],
      { cwd: TOOLS_DIR },
    );

    expect(stdout).toContain("003-task-c.md");

    const files = readdirSync(temporaryDirectory).sort();
    expect(files).toEqual(["001-task-a.md", "002-task-b.md", "003-task-c.md"]);
  });
});

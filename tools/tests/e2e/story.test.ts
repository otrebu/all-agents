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

describe("story E2E", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `story-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  // Help and basic CLI
  test("story --help shows usage", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "story", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Story management utilities");
  });

  test("story create --help shows --dir option", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "story", "create", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--dir");
    expect(stdout).toContain("Custom stories directory");
  });

  test("story create requires name argument", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "story", "create"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("missing required argument");
  });

  // Core functionality
  test("create: first story in empty dir is 001", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "story",
        "create",
        "user-authentication",
        "--dir",
        temporaryDirectory,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("001-user-authentication.md");
    expect(stdout).toContain(temporaryDirectory);

    const files = readdirSync(temporaryDirectory);
    expect(files).toContain("001-user-authentication.md");
  });

  test("create: increments from existing story", async () => {
    writeFileSync(join(temporaryDirectory, "001-existing-story.md"), "");

    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "story",
        "create",
        "second-story",
        "--dir",
        temporaryDirectory,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("002-second-story.md");

    const files = readdirSync(temporaryDirectory);
    expect(files).toContain("001-existing-story.md");
    expect(files).toContain("002-second-story.md");
  });

  test("create: handles gaps in numbering (uses max + 1)", async () => {
    writeFileSync(join(temporaryDirectory, "001-first.md"), "");
    writeFileSync(join(temporaryDirectory, "005-fifth.md"), "");

    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "story",
        "create",
        "new-story",
        "--dir",
        temporaryDirectory,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("006-new-story.md");
  });

  test("create: ignores non-story files", async () => {
    writeFileSync(join(temporaryDirectory, "readme.md"), "");
    writeFileSync(join(temporaryDirectory, "notes.txt"), "");
    writeFileSync(join(temporaryDirectory, "random-file.md"), "");

    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "story",
        "create",
        "first-real-story",
        "--dir",
        temporaryDirectory,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("001-first-real-story.md");
  });

  test("create: creates directory if missing", async () => {
    const nestedDirectory = join(
      temporaryDirectory,
      "nested",
      "stories",
      "here",
    );

    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "story",
        "create",
        "nested-story",
        "--dir",
        nestedDirectory,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("001-nested-story.md");
    expect(existsSync(nestedDirectory)).toBe(true);

    const files = readdirSync(nestedDirectory);
    expect(files).toContain("001-nested-story.md");
  });

  test("create: outputs full filepath to stdout", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "story",
        "create",
        "path-test",
        "--dir",
        temporaryDirectory,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    const expectedPath = join(temporaryDirectory, "001-path-test.md");
    expect(stdout.trim()).toBe(expectedPath);
  });

  test("create: handles multiple sequential creates", async () => {
    await execa(
      "bun",
      ["run", "dev", "story", "create", "story-a", "--dir", temporaryDirectory],
      { cwd: TOOLS_DIR },
    );
    await execa(
      "bun",
      ["run", "dev", "story", "create", "story-b", "--dir", temporaryDirectory],
      { cwd: TOOLS_DIR },
    );
    const { stdout } = await execa(
      "bun",
      ["run", "dev", "story", "create", "story-c", "--dir", temporaryDirectory],
      { cwd: TOOLS_DIR },
    );

    expect(stdout).toContain("003-story-c.md");

    const files = readdirSync(temporaryDirectory).sort();
    expect(files).toEqual([
      "001-story-a.md",
      "002-story-b.md",
      "003-story-c.md",
    ]);
  });
});

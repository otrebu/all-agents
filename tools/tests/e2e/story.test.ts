import { getContextRoot } from "@tools/utils/paths";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execa } from "execa";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
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
    expect(stdout).toContain("--milestone");
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

  test("create with --milestone writes to milestone stories directory", async () => {
    const milestoneDirectory = join(
      temporaryDirectory,
      "005-consolidate-simplify",
    );
    mkdirSync(milestoneDirectory, { recursive: true });

    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "story",
        "create",
        "foo",
        "--milestone",
        milestoneDirectory,
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    const expectedPath = join(
      milestoneDirectory,
      "stories",
      "001-STORY-foo.md",
    );
    expect(stdout.trim()).toBe(expectedPath);
    expect(existsSync(expectedPath)).toBe(true);
  });

  test("create without --milestone and without --dir shows deprecation warning", async () => {
    const { exitCode, stderr, stdout } = await execa(
      "bun",
      ["run", "dev", "story", "create", "legacy-default-warning-test"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stderr).toContain("deprecated");
    expect(stderr).toContain("--milestone");

    const createdPath = stdout.trim();
    if (createdPath !== "" && existsSync(createdPath)) {
      rmSync(createdPath, { force: true });
    }
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

  test("create: file contains template with story name", async () => {
    const { stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "story",
        "create",
        "user-auth",
        "--dir",
        temporaryDirectory,
      ],
      { cwd: TOOLS_DIR },
    );

    const filepath = stdout.trim();
    const content = readFileSync(filepath, "utf8");

    // Verify template sections exist
    expect(content).toContain("## Story: user-auth");
    expect(content).toContain("### Narrative");
    expect(content).toContain("### Persona");
    expect(content).toContain("### Context");
    expect(content).toContain("### Acceptance Criteria");
    expect(content).toContain("### Tasks");
    expect(content).toContain("### Notes");
  });

  // story concat
  test("story concat --help shows usage", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "story", "concat", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--milestone");
    expect(stdout).toContain("--output");
    expect(stdout).toContain("Concatenate milestone stories");
  });

  test("concat requires --milestone option", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "story", "concat"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("--milestone");
  });

  test("concat with --milestone writes bundle to stdout with story separators", async () => {
    const milestoneDirectory = join(temporaryDirectory, "099-concat-test");
    const storiesDirectory = join(milestoneDirectory, "stories");
    mkdirSync(storiesDirectory, { recursive: true });
    writeFileSync(
      join(storiesDirectory, "001-STORY-alpha.md"),
      "## Story: alpha\n\nFirst story body.\n",
    );
    writeFileSync(
      join(storiesDirectory, "002-STORY-bravo.md"),
      "## Story: bravo\n\nSecond story body.\n",
    );

    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "story", "concat", "--milestone", milestoneDirectory],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("---STORY: 001-STORY-alpha---");
    expect(stdout).toContain("First story body.");
    expect(stdout).toContain("---STORY: 002-STORY-bravo---");
    expect(stdout).toContain("Second story body.");

    // Ordering: alpha (001) must appear before bravo (002)
    const alphaIndex = stdout.indexOf("---STORY: 001-STORY-alpha---");
    const bravoIndex = stdout.indexOf("---STORY: 002-STORY-bravo---");
    expect(alphaIndex).toBeLessThan(bravoIndex);
  });

  test("concat with --output writes bundle to file and prints output path", async () => {
    const milestoneDirectory = join(temporaryDirectory, "099-output-test");
    const storiesDirectory = join(milestoneDirectory, "stories");
    mkdirSync(storiesDirectory, { recursive: true });
    writeFileSync(
      join(storiesDirectory, "001-STORY-one.md"),
      "## Story: one\n\nContent.\n",
    );

    const outputPath = join(temporaryDirectory, "bundle.md");
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "story",
        "concat",
        "--milestone",
        milestoneDirectory,
        "--output",
        outputPath,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe(outputPath);
    expect(existsSync(outputPath)).toBe(true);

    const bundleContent = readFileSync(outputPath, "utf8");
    expect(bundleContent).toContain("---STORY: 001-STORY-one---");
    expect(bundleContent).toContain("Content.");
  });

  test("concat fails when milestone has no stories directory", async () => {
    const milestoneDirectory = join(temporaryDirectory, "099-empty-milestone");
    mkdirSync(milestoneDirectory, { recursive: true });

    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "story", "concat", "--milestone", milestoneDirectory],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("No stories directory found");
  });

  test("concat fails when stories directory is empty", async () => {
    const milestoneDirectory = join(temporaryDirectory, "099-stories-empty");
    const storiesDirectory = join(milestoneDirectory, "stories");
    mkdirSync(storiesDirectory, { recursive: true });

    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "story", "concat", "--milestone", milestoneDirectory],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("No story files found");
  });

  test("concat ignores non-markdown files", async () => {
    const milestoneDirectory = join(temporaryDirectory, "099-mixed-files");
    const storiesDirectory = join(milestoneDirectory, "stories");
    mkdirSync(storiesDirectory, { recursive: true });
    writeFileSync(
      join(storiesDirectory, "001-STORY-real.md"),
      "## Story: real\n\nReal content.\n",
    );
    writeFileSync(join(storiesDirectory, "notes.txt"), "Should be ignored.");

    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "story", "concat", "--milestone", milestoneDirectory],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Real content.");
    expect(stdout).not.toContain("Should be ignored.");
  });
});

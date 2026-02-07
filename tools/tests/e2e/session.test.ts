/**
 * E2E tests for aaa session command
 *
 * Tests CLI command structure for session file management.
 * Tests actual session lookup functionality where possible.
 */

import { getContextRoot } from "@tools/utils/paths";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execa } from "execa";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

describe("session E2E - help and basic CLI", () => {
  test("session --help shows all subcommands", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "session", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Manage and retrieve Claude session files");
    expect(stdout).toContain("path");
    expect(stdout).toContain("current");
    expect(stdout).toContain("cat");
    expect(stdout).toContain("list");
  });

  test("session path --help shows options", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "session", "path", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Get session file path by ID or from commit");
    expect(stdout).toContain("--commit");
    expect(stdout).toContain("session-id");
  });

  test("session current --help shows description", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "session", "current", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain(
      "Get current session ID from .claude/current-session",
    );
  });
});

describe("session E2E - path subcommand errors", () => {
  test("session path without arguments shows error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "session", "path"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Must provide session ID or --commit");
  });

  test("session path with non-existent session ID shows error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "session", "path", "non-existent-session-id-12345"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Session not found");
  });

  test("session path --commit with invalid commit shows error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "session", "path", "--commit", "invalid-commit-hash"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    // Either git error or no trailer found
    expect(stderr.length).toBeGreaterThan(0);
  });
});

describe("session E2E - current subcommand", () => {
  let temporaryDirectory = "";
  let originalCwd = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `session-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("session current shows error when .claude/current-session doesn't exist", async () => {
    // Run from temp dir where there's no .claude/current-session
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", join(TOOLS_DIR, "src/cli.ts"), "session", "current"],
      { cwd: temporaryDirectory, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("No current session found");
  });

  test("session current outputs session ID when file exists", async () => {
    // Create a .claude/current-session file in temp dir
    const claudeDirectory = join(temporaryDirectory, ".claude");
    mkdirSync(claudeDirectory, { recursive: true });
    const testSessionId = "test-session-id-abc123";
    writeFileSync(join(claudeDirectory, "current-session"), testSessionId);

    // Also need a git repo for findProjectRoot to work
    await execa("git", ["init"], { cwd: temporaryDirectory });

    const { exitCode, stdout } = await execa(
      "bun",
      ["run", join(TOOLS_DIR, "src/cli.ts"), "session", "current"],
      { cwd: temporaryDirectory },
    );

    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe(testSessionId);
  });

  test("session current shows error when file is empty", async () => {
    // Create an empty .claude/current-session file
    const claudeDirectory = join(temporaryDirectory, ".claude");
    mkdirSync(claudeDirectory, { recursive: true });
    writeFileSync(join(claudeDirectory, "current-session"), "");

    // Also need a git repo for findProjectRoot to work
    await execa("git", ["init"], { cwd: temporaryDirectory });

    const { exitCode, stderr } = await execa(
      "bun",
      ["run", join(TOOLS_DIR, "src/cli.ts"), "session", "current"],
      { cwd: temporaryDirectory, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("No current session found");
  });
});

// Note: Tests for commits lacking cc-session-id removed - repo state dependent

describe("session E2E - cat subcommand", () => {
  test("session cat --help shows options", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "session", "cat", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Output session JSONL content to stdout");
    expect(stdout).toContain("--commit");
    expect(stdout).toContain("session-id");
  });

  test("session cat without arguments shows error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "session", "cat"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Must provide session ID or --commit");
  });

  test("session cat with non-existent session ID shows error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "session", "cat", "non-existent-session-id-12345"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Session not found");
  });

  // Note: Test for commits lacking cc-session-id removed - repo state dependent
});

describe("session E2E - list subcommand", () => {
  test("session list --help shows options", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "session", "list", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("List recent sessions for current project");
    expect(stdout).toContain("--limit");
    expect(stdout).toContain("--verbose");
  });

  test("session list outputs session IDs (machine-parseable)", async () => {
    // This test verifies the command runs without error
    // In a real environment with sessions, it would output session IDs
    const { exitCode, stderr, stdout } = await execa(
      "bun",
      ["run", "dev", "session", "list", "--limit", "5"],
      { cwd: TOOLS_DIR, reject: false },
    );

    // Either succeeds with output or fails with "No sessions found"
    if (exitCode === 0) {
      // Outputs should be UUIDs (session IDs), one per line
      const lines = stdout
        .trim()
        .split("\n")
        .filter((l: string) => l !== "");
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.length).toBeLessThanOrEqual(5);
    } else {
      expect(stderr).toContain("No sessions found");
    }
  });

  test("session list --verbose outputs table format", async () => {
    const { exitCode, stderr, stdout } = await execa(
      "bun",
      ["run", "dev", "session", "list", "--limit", "3", "--verbose"],
      { cwd: TOOLS_DIR, reject: false },
    );

    // Either succeeds with table or fails with "No sessions found"
    if (exitCode === 0) {
      expect(stdout).toContain("SESSION ID");
      expect(stdout).toContain("MODIFIED");
      expect(stdout).toContain("SIZE");
    } else {
      expect(stderr).toContain("No sessions found");
    }
  });

  test("session list --limit with invalid value shows error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "session", "list", "--limit", "abc"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("--limit must be a positive integer");
  });

  test("session list --limit 0 shows error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "session", "list", "--limit", "0"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("--limit must be a positive integer");
  });
});

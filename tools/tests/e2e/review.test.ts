/**
 * E2E tests for aaa review command
 *
 * Tests CLI command structure and flag validation.
 */

import { getContextRoot } from "@tools/utils/paths";
import { describe, expect, test } from "bun:test";
import { execa } from "execa";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

describe("review E2E - help and basic CLI", () => {
  test("review --help shows all options", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "review", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Run parallel multi-agent code review");
    expect(stdout).toContain("--supervised");
    expect(stdout).toContain("--headless");
    expect(stdout).toContain("--dry-run");
    expect(stdout).toContain("--require-approval");
  });

  test("review --help shows require-approval option description", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "review", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Pause after triage");
    expect(stdout).toContain("require-approval");
  });

  test("review status --help works", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "review", "status", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Display review history and statistics");
  });
});

describe("review E2E - flag validation", () => {
  test("--dry-run without --headless shows error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "review", "--dry-run"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("--dry-run requires --headless");
  });

  test("--require-approval without --headless shows error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "review", "--require-approval"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("--require-approval requires --headless");
  });

  test("--supervised and --headless together shows error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "review", "--supervised", "--headless"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Cannot specify both --supervised and --headless");
  });

  test("review without flags shows mode prompt", async () => {
    const { exitCode, stdout } = await execa("bun", ["run", "dev", "review"], {
      cwd: TOOLS_DIR,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Code Review Mode Selection");
    expect(stdout).toContain("--supervised");
    expect(stdout).toContain("--headless");
  });
});

describe("review E2E - diff target flags", () => {
  test("--help shows all diff target flags", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "review", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("--base <branch>");
    expect(stdout).toContain("--range <range>");
    expect(stdout).toContain("--staged-only");
    expect(stdout).toContain("--unstaged-only");
  });

  test("multiple diff target flags shows mutual exclusion error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "review", "--base", "main", "--staged-only"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Cannot specify multiple diff target flags");
  });

  test("--range and --unstaged-only shows mutual exclusion error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "review", "--range", "main..HEAD", "--unstaged-only"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Cannot specify multiple diff target flags");
  });

  test("invalid --range format shows error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "review", "--range", "invalid-format"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Invalid --range format");
    expect(stderr).toContain("<from>..<to>");
  });

  test("--base flag is accepted (shows mode prompt)", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "review", "--base", "main"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Code Review Mode Selection");
  });

  test("--staged-only flag is accepted (shows mode prompt)", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "review", "--staged-only"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Code Review Mode Selection");
  });

  test("--unstaged-only flag is accepted (shows mode prompt)", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "review", "--unstaged-only"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Code Review Mode Selection");
  });

  test("--range with valid format is accepted (shows mode prompt)", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "review", "--range", "main..HEAD"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Code Review Mode Selection");
  });
});

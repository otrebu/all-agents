/**
 * E2E tests for --provider CLI flag
 *
 * Verifies the --provider flag is recognized by both
 * ralph build and review commands.
 */

import { getContextRoot } from "@tools/utils/paths";
import { describe, expect, test } from "bun:test";
import { execa } from "execa";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

describe("--provider CLI flag", () => {
  test("ralph build --help shows --provider option", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "ralph", "build", "--help"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--provider");
  });

  test("review --help shows --provider option", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "review", "--help"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--provider");
  });

  test("ralph plan stories --help shows --provider and --model options", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "ralph", "plan", "stories", "--help"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--provider");
    expect(stdout).toContain("--model");
  });

  test("ralph plan tasks --help shows --provider and --model options", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "ralph", "plan", "tasks", "--help"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--provider");
    expect(stdout).toContain("--model");
  });

  test("ralph models --provider claude --json prints model table", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "ralph", "models", "--provider", "claude", "--json"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('"models"');
    expect(stdout).toContain('"claude-sonnet-4"');
  });

  test("ralph models rejects invalid provider", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "ralph", "models", "--provider", "not-a-provider"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("Unknown provider");
  });

  test("ralph build rejects invalid provider", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      [
        "run",
        "dev",
        "ralph",
        "build",
        "--provider",
        "invalid-provider",
        "--subtasks",
        "/nonexistent/subtasks.json",
      ],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("Unknown provider");
  });

  test("ralph build accepts claude as provider", async () => {
    // This will fail because subtasks file doesn't exist, but it
    // should get past provider selection (exit code 1 from missing file, not from provider)
    const { exitCode, stderr } = await execa(
      "bun",
      [
        "run",
        "dev",
        "ralph",
        "build",
        "--provider",
        "claude",
        "--subtasks",
        "/nonexistent/subtasks.json",
      ],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Subtasks file not found");
  });
});

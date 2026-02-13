import { getContextRoot } from "@tools/utils/paths";
import { describe, expect, test } from "bun:test";
import { execa } from "execa";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

describe("aaa CLI", () => {
  // Basic CLI
  test("--help shows usage and commands", async () => {
    const { exitCode, stdout } = await execa("bun", ["run", "dev", "--help"], {
      cwd: TOOLS_DIR,
    });
    expect(exitCode).toBe(0);
    expect(stdout).toContain("All-Agents CLI Toolkit");
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("gh-search");
    expect(stdout).toContain("gemini-research");
    expect(stdout).toContain("parallel-search");
    expect(stdout).toContain("setup");
    expect(stdout).toContain("uninstall");
  });

  test("--version shows version", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "--version"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    // Check version matches semver pattern (e.g., "1.14.1")
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  test("setup --help includes --worktree option", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "setup", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--worktree [path]");
  });

  test("unknown command fails with error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "nonexistent-command"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("unknown command");
  });

  // Missing arguments
  test("gh-search requires query", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "gh-search"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("missing required argument");
  });

  test("gemini-research requires query", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "gemini-research"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("missing required argument");
  });

  test("parallel-search requires --objective", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "parallel-search"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("required option");
    expect(stderr).toContain("--objective");
  });

  // API key errors
  test("parallel-search shows helpful error without API key", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "parallel-search", "--objective", "test query"],
      {
        cwd: TOOLS_DIR,
        env: { ...process.env, AAA_PARALLEL_API_KEY: "", PARALLEL_API_KEY: "" },
        reject: false,
      },
    );
    expect(exitCode).toBe(1);
    expect(stdout).toContain("platform.parallel.ai");
  });
});

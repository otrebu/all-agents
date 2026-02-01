import { describe, expect, test } from "bun:test";
import { execa } from "execa";

describe("aaa CLI", () => {
  // Basic CLI
  test("--help shows usage and commands", async () => {
    const { exitCode, stdout } = await execa("bun", ["run", "dev", "--help"]);
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
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "dev",
      "--version",
    ]);
    expect(exitCode).toBe(0);
    // Version is read from package.json, check it's a valid semver
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  test("unknown command fails with error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "nonexistent-command"],
      { reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("unknown command");
  });

  // Missing arguments
  test("gh-search requires query", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "gh-search"],
      { reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("missing required argument");
  });

  test("gemini-research requires query", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "gemini-research"],
      { reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("missing required argument");
  });

  test("parallel-search requires --objective", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "parallel-search"],
      { reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("required option");
    expect(stderr).toContain("--objective");
  });

  // API key errors
  test("parallel-search shows helpful error without API key", async () => {
    const { exitCode, stderr, stdout } = await execa(
      "bun",
      ["run", "dev", "parallel-search", "--objective", "test query"],
      {
        env: { ...process.env, AAA_PARALLEL_API_KEY: "", PARALLEL_API_KEY: "" },
        reject: false,
      },
    );
    expect(exitCode).toBe(1);
    // Message may be in stdout or stderr depending on how ora/console output
    const output = `${stdout}\n${stderr}`;
    expect(output).toContain("platform.parallel.ai");
  });
});

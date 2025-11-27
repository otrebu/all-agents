import { execa } from "execa";
import { describe, expect, it } from "vitest";

describe("aaa CLI E2E", () => {
  it("should display help with --help", async () => {
    const { exitCode, stdout } = await execa("bun", ["run", "dev", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("All-Agents CLI Toolkit");
    expect(stdout).toContain("Usage:");
  });

  it("should display version with --version", async () => {
    const { exitCode, stdout } = await execa("bun", ["run", "dev", "--version"]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("1.0.0");
  });

  it("should show error for unknown command", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "nonexistent-command"],
      { reject: false }
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("unknown command");
  });

  it("should list all available commands in help", async () => {
    const { exitCode, stdout } = await execa("bun", ["run", "dev", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("gh-search");
    expect(stdout).toContain("parallel-search");
    expect(stdout).toContain("gemini-research");
  });
});

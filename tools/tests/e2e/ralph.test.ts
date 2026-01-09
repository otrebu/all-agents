import { runCommand } from "@lib/spawn";
import { getContextRoot } from "@tools/utils/paths";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

describe("ralph E2E", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `ralph-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  // Help and basic CLI
  test("ralph --help shows usage", async () => {
    const { exitCode, stdout } = await runCommand(
      ["bun", "run", "dev", "ralph", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("PRD-driven iterative Claude harness");
  });

  test("ralph init --help shows options", async () => {
    const { exitCode, stdout } = await runCommand(
      ["bun", "run", "dev", "ralph", "init", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--output");
    expect(stdout).toContain("Create a template PRD file");
  });

  test("ralph run --help shows all options", async () => {
    const { exitCode, stdout } = await runCommand(
      ["bun", "run", "dev", "ralph", "run", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--prd");
    expect(stdout).toContain("--progress");
    expect(stdout).toContain("--unlimited");
    expect(stdout).toContain("--interactive");
    expect(stdout).toContain("--dangerous");
  });

  test("ralph run with missing PRD shows error", async () => {
    const prdPath = join(temporaryDirectory, "nonexistent.json");

    const { exitCode, stderr } = await runCommand(
      ["bun", "run", "dev", "ralph", "run", "--prd", prdPath],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("PRD not found");
  });

  test("ralph init creates template PRD", async () => {
    const prdPath = join(temporaryDirectory, "prd.json");

    const { exitCode, stdout } = await runCommand(
      ["bun", "run", "dev", "ralph", "init", "--output", prdPath],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Created");
    expect(existsSync(prdPath)).toBe(true);

    const rawContent = readFileSync(prdPath, "utf8");
    const content = JSON.parse(rawContent) as Array<{
      description: string;
      id: string;
    }>;
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(1);
    const firstFeature = content[0];
    if (firstFeature === undefined) {
      throw new Error("Expected feature to exist");
    }
    expect(firstFeature.id).toBe("001-example-feature");
  });

  test("ralph init refuses to overwrite existing PRD", async () => {
    const prdPath = join(temporaryDirectory, "prd.json");

    // Create first
    await runCommand(
      ["bun", "run", "dev", "ralph", "init", "--output", prdPath],
      { cwd: TOOLS_DIR },
    );

    // Try to create again
    const { exitCode, stderr } = await runCommand(
      ["bun", "run", "dev", "ralph", "init", "--output", prdPath],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("already exists");
  });
});

import { getContextRoot } from "@tools/utils/paths";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execa } from "execa";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "ralph", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("PRD-driven iterative Claude harness");
  });

  test("ralph init --help shows options", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "ralph", "init", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--prd");
    expect(stdout).toContain("Create a new PRD interactively");
  });

  test("ralph run --help shows all options", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "ralph", "run", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--prd");
    expect(stdout).toContain("--progress");
    expect(stdout).toContain("--iterations");
    expect(stdout).toContain("--once");
    expect(stdout).toContain("--unlimited");
    expect(stdout).toContain("--interactive");
  });

  test("ralph run with missing PRD shows error", async () => {
    const prdPath = join(temporaryDirectory, "nonexistent.json");

    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "ralph", "run", "--prd", prdPath],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("PRD Error");
    expect(stderr).toContain("Cannot read PRD file");
  });

  test("ralph run with invalid JSON shows error", async () => {
    const prdPath = join(temporaryDirectory, "invalid.json");
    writeFileSync(prdPath, "not valid json {");

    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "ralph", "run", "--prd", prdPath],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("PRD Error");
    expect(stderr).toContain("Invalid JSON");
  });

  test("ralph run with invalid PRD schema shows validation error", async () => {
    const prdPath = join(temporaryDirectory, "invalid-schema.json");
    writeFileSync(
      prdPath,
      JSON.stringify({
        name: "test",
        // Missing required fields: description, testCommand, features
      }),
    );

    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "ralph", "run", "--prd", prdPath],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("PRD Error");
    expect(stderr).toContain("validation failed");
  });
});

describe("ralph PRD schema validation", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `ralph-schema-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("validates feature testSteps is required", async () => {
    const prdPath = join(temporaryDirectory, "missing-teststeps.json");
    writeFileSync(
      prdPath,
      JSON.stringify({
        description: "test project",
        features: [
          {
            category: "functional",
            description: "A feature",
            id: "feat-1",
            priority: "high",
            status: "pending",
            // Missing testSteps
          },
        ],
        name: "test",
        testCommand: "pnpm test",
      }),
    );

    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "ralph", "run", "--prd", prdPath],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("testSteps");
  });

  test("validates feature priority values", async () => {
    const prdPath = join(temporaryDirectory, "invalid-priority.json");
    writeFileSync(
      prdPath,
      JSON.stringify({
        description: "test project",
        features: [
          {
            category: "functional",
            description: "A feature",
            id: "feat-1",
            // Invalid priority value - should be high/medium/low
            priority: "critical",
            status: "pending",
            testSteps: ["Test it"],
          },
        ],
        name: "test",
        testCommand: "pnpm test",
      }),
    );

    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "ralph", "run", "--prd", prdPath],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("validation failed");
  });

  test("accepts valid PRD with all required fields", async () => {
    const prdPath = join(temporaryDirectory, "valid.json");
    const progressPath = join(temporaryDirectory, "progress.md");

    writeFileSync(
      prdPath,
      JSON.stringify({
        description: "A test project",
        features: [
          {
            category: "functional",
            description: "First feature",
            id: "feat-1",
            priority: "high",
            status: "pending",
            testSteps: ["Run the test"],
          },
        ],
        name: "test-project",
        testCommand: "echo 'test passed'",
      }),
    );

    // This test validates PRD loading succeeds (no PRD Error).
    // Claude will fail because it's not available, but that's expected.
    // We use a short timeout since we only need to verify PRD validation.
    const { stderr } = await execa(
      "bun",
      [
        "run",
        "dev",
        "ralph",
        "run",
        "--prd",
        prdPath,
        "--progress",
        progressPath,
        "--once",
      ],
      { cwd: TOOLS_DIR, reject: false, timeout: 3000 },
    );

    // If we get a PRD Error, validation failed. Any other error (Claude, timeout) is fine.
    const hasPRDError = stderr.includes("PRD Error");
    expect(hasPRDError).toBe(false);
  });
});

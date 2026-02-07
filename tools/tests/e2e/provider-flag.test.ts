/**
 * E2E tests for --provider CLI flag
 *
 * Verifies the --provider flag is recognized by both
 * ralph build and review commands.
 */

import { getContextRoot } from "@tools/utils/paths";
import { describe, expect, test } from "bun:test";
import { execa } from "execa";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

function createTemporaryOpencodeBinary(): {
  cleanup: () => void;
  directory: string;
} {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "aaa-opencode-bin-"));
  const binaryPath = join(temporaryDirectory, "opencode");

  writeFileSync(binaryPath, "#!/usr/bin/env bash\nexit 0\n", "utf8");
  chmodSync(binaryPath, 0o755);

  return {
    cleanup: () => {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    },
    directory: temporaryDirectory,
  };
}

function createTemporarySubtasksFile(): { cleanup: () => void; path: string } {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "aaa-provider-flag-"));
  const filePath = join(temporaryDirectory, "subtasks.json");

  writeFileSync(
    filePath,
    JSON.stringify(
      {
        metadata: { milestoneRef: "tmp-provider-mode", scope: "milestone" },
        subtasks: [
          {
            acceptanceCriteria: ["Command fails during preflight"],
            description: "Temporary fixture for provider preflight tests",
            done: false,
            filesToRead: [],
            id: "SUB-900",
            taskRef: "900-provider-preflight",
            title: "Provider preflight fixture",
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  return {
    cleanup: () => {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    },
    path: filePath,
  };
}

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

  test("ralph build fails with TTY guidance for opencode supervised mode", async () => {
    const fixture = createTemporarySubtasksFile();
    const fakeOpencode = createTemporaryOpencodeBinary();

    try {
      const { exitCode, stderr } = await execa(
        "bun",
        [
          "run",
          "dev",
          "ralph",
          "build",
          "--provider",
          "opencode",
          "--subtasks",
          fixture.path,
        ],
        {
          cwd: TOOLS_DIR,
          env: {
            ...process.env,
            PATH: `${fakeOpencode.directory}:${process.env.PATH ?? ""}`,
          },
          reject: false,
        },
      );
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("requires an interactive TTY");
      expect(stderr).toContain("--headless");
    } finally {
      fixture.cleanup();
      fakeOpencode.cleanup();
    }
  });

  test("ralph build fails fast for providers not enabled in runtime", async () => {
    const fixture = createTemporarySubtasksFile();

    try {
      const { exitCode, stderr } = await execa(
        "bun",
        [
          "run",
          "dev",
          "ralph",
          "build",
          "--provider",
          "codex",
          "--headless",
          "--subtasks",
          fixture.path,
        ],
        { cwd: TOOLS_DIR, reject: false },
      );
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("not enabled in this Ralph runtime");
    } finally {
      fixture.cleanup();
    }
  });
});

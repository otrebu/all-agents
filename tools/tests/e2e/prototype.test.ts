import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execa } from "execa";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TEST_TMP_DIR = "/tmp/prototype-test";

/**
 * Helper to clean up test sessions
 */
async function cleanTestSessions(): Promise<void> {
  // Clean up any ralph-prototype-* directories in /tmp
  const { stdout } = await execa("ls", ["/tmp"], { reject: false });
  const directories = stdout
    .split("\n")
    .filter((d) => d.startsWith("ralph-prototype-"));
  for (const directory of directories) {
    rmSync(`/tmp/${directory}`, { force: true, recursive: true });
  }
}

describe("aaa ralph prototype", () => {
  beforeEach(async () => {
    // Ensure test temp directory exists
    if (!existsSync(TEST_TMP_DIR)) {
      mkdirSync(TEST_TMP_DIR, { recursive: true });
    }
    // Clean up any existing test sessions
    await cleanTestSessions();
  });

  afterEach(async () => {
    // Clean up test temp directory
    if (existsSync(TEST_TMP_DIR)) {
      rmSync(TEST_TMP_DIR, { force: true, recursive: true });
    }
    // Clean up test sessions
    await cleanTestSessions();
  });

  // ---------------------------------------------------------------------------
  // Help & Basic CLI
  // ---------------------------------------------------------------------------

  test("--help shows prototype command usage", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "--help",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Rapid prototyping");
    expect(stdout).toContain("--file");
    expect(stdout).toContain("--no-interactive");
    expect(stdout).toContain("--resume");
    expect(stdout).toContain("--max-iterations");
    expect(stdout).toContain("--unlimited");
  });

  // ---------------------------------------------------------------------------
  // Inline Goal Mode
  // ---------------------------------------------------------------------------

  test("inline goal without TTY shows TTY error", async () => {
    // Without TTY, wizard should fail with helpful error
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "ralph", "prototype", "Build something"],
      { reject: false, timeout: 5000 },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("TTY");
    expect(stderr).toContain("--no-interactive");
    expect(stderr).toContain("--file");
  });

  test("--no-interactive option is recognized in help", async () => {
    const { stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "--help",
    ]);
    expect(stdout).toContain("--no-interactive");
    expect(stdout).toContain("-n");
    expect(stdout).toContain("Skip interactive wizard");
  });

  // ---------------------------------------------------------------------------
  // File Input Mode (--file)
  // ---------------------------------------------------------------------------

  test("--file option is recognized in help", async () => {
    const { stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "--help",
    ]);
    expect(stdout).toContain("--file");
    expect(stdout).toContain("-f");
    expect(stdout).toContain("Read goal from a file");
  });

  test("--file with non-existent file shows error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "ralph", "prototype", "--file", "/nonexistent/file.md"],
      { reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("File not found");
  });

  test("--file with empty file shows error", async () => {
    const emptyFile = join(TEST_TMP_DIR, "empty.md");
    writeFileSync(emptyFile, "");

    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "ralph", "prototype", "--file", emptyFile],
      { reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("File is empty");
  });

  // ---------------------------------------------------------------------------
  // Resume Functionality (--resume)
  // ---------------------------------------------------------------------------

  test("--resume with no sessions shows error", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "ralph", "prototype", "--resume"],
      { reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("No resumable session");
  });

  // ---------------------------------------------------------------------------
  // Session Management: status
  // ---------------------------------------------------------------------------

  test("status subcommand shows no sessions message", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "status",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("No prototype sessions found");
  });

  test("status subcommand --help works", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "status",
      "--help",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("current/recent session status");
  });

  // ---------------------------------------------------------------------------
  // Session Management: list
  // ---------------------------------------------------------------------------

  test("list subcommand shows no sessions message", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "list",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("No prototype sessions found");
  });

  test("list subcommand --help works", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "list",
      "--help",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("List all sessions");
  });

  // ---------------------------------------------------------------------------
  // Session Management: cancel
  // ---------------------------------------------------------------------------

  test("cancel subcommand with no session shows message", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "cancel",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("No running session to cancel");
  });

  test("cancel subcommand --help works", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "cancel",
      "--help",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Cancel running session");
  });

  // ---------------------------------------------------------------------------
  // Session Management: clean
  // ---------------------------------------------------------------------------

  test("clean subcommand removes old sessions", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "clean",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Removed");
    expect(stdout).toContain("session(s)");
  });

  test("clean --all removes all sessions", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "clean",
      "--all",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Removed all");
    expect(stdout).toContain("session(s)");
  });

  test("clean --days option works", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "clean",
      "--days",
      "30",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("older than 30 days");
  });

  test("clean subcommand --help works", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "clean",
      "--help",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Remove old sessions");
    expect(stdout).toContain("--days");
    expect(stdout).toContain("--all");
  });

  // ---------------------------------------------------------------------------
  // CLI Options
  // ---------------------------------------------------------------------------

  test("--max-iterations option is recognized", async () => {
    const { stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "--help",
    ]);
    expect(stdout).toContain("--max-iterations");
    expect(stdout).toContain("-m");
  });

  test("--unlimited option is recognized", async () => {
    const { stdout } = await execa("bun", [
      "run",
      "dev",
      "ralph",
      "prototype",
      "--help",
    ]);
    expect(stdout).toContain("--unlimited");
    expect(stdout).toContain("-u");
  });
});

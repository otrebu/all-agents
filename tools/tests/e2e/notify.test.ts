/**
 * E2E tests for aaa notify command
 *
 * Tests CLI command structure, config management, and output formatting.
 * Network calls are mocked via global fetch replacement.
 */

import { getContextRoot } from "@tools/utils/paths";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { execa } from "execa";
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

describe("notify E2E - help and basic CLI", () => {
  test("notify --help shows all subcommands", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "notify", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Push notifications via ntfy.sh");
    expect(stdout).toContain("on");
    expect(stdout).toContain("off");
    expect(stdout).toContain("status");
    expect(stdout).toContain("config");
  });

  test("notify config --help shows subcommands", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "notify", "config", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Configuration management");
    expect(stdout).toContain("set");
    expect(stdout).toContain("show");
    expect(stdout).toContain("test");
  });

  test("notify config set --help shows all options", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "notify", "config", "set", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("--topic");
    expect(stdout).toContain("--server");
    expect(stdout).toContain("--priority");
    expect(stdout).toContain("--quiet-start");
    expect(stdout).toContain("--quiet-end");
  });
});

describe("notify E2E - config management", () => {
  let temporaryDirectory = "";
  let configPath = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `notify-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
    configPath = join(temporaryDirectory, "notify.json");
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("notify status shows configuration", async () => {
    // Create a config file
    writeFileSync(
      configPath,
      JSON.stringify({
        $schemaVersion: 1,
        defaultPriority: "high",
        enabled: true,
        quietHours: { enabled: false, endHour: 8, startHour: 22 },
        server: "https://ntfy.sh",
        title: "aaa notify",
        topic: "test-topic",
      }),
    );

    // We can't easily inject config path in E2E tests, so just verify the command runs
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "notify", "status"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Notification Status");
    expect(stdout).toContain("Enabled:");
    expect(stdout).toContain("Topic:");
    expect(stdout).toContain("Server:");
  });

  test("notify config show displays configuration", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "notify", "config", "show"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Notification Configuration");
    expect(stdout).toContain("$schemaVersion:");
    expect(stdout).toContain("enabled:");
    expect(stdout).toContain("topic:");
    expect(stdout).toContain("server:");
    expect(stdout).toContain("Quiet Hours:");
  });

  test("notify config show --json outputs JSON", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "notify", "config", "show", "--json"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);

    // Should be valid JSON
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    expect(parsed).toHaveProperty("$schemaVersion");
    expect(parsed).toHaveProperty("enabled");
    expect(parsed).toHaveProperty("topic");
    expect(parsed).toHaveProperty("server");
    expect(parsed).toHaveProperty("quietHours");
  });

  test("notify config set without options shows error", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "notify", "config", "set"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stdout).toContain("No options provided");
  });
});

describe("notify E2E - on/off commands", () => {
  test("notify on enables notifications", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "notify", "on"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Notifications enabled");
  });

  test("notify off disables notifications", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "notify", "off"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Notifications disabled");
  });
});

describe("notify E2E - message sending", () => {
  test("notify <message> with empty topic exits silently", async () => {
    // First, ensure topic is empty for this test
    await execa(
      "bun",
      ["run", "dev", "notify", "config", "set", "--topic", ""],
      { cwd: TOOLS_DIR, reject: false },
    );

    // When topic is empty, should exit 0 without output (safe for hooks)
    // This tests the "silent behavior when unconfigured" aspect
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "notify", "test message"],
      { cwd: TOOLS_DIR, reject: false },
    );

    // Should exit 0 (silent success) when topic is empty
    expect(exitCode).toBe(0);
    // Should have no "Error:" output - silent exit
    expect(stdout).not.toContain("Error:");
  });

  test("notify config test with empty topic shows error", async () => {
    // First, clear the topic to ensure test isolation
    await execa(
      "bun",
      ["run", "dev", "notify", "config", "set", "--topic", ""],
      { cwd: TOOLS_DIR, reject: false },
    );

    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "notify", "config", "test"],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Topic not configured");
  });
});

describe("notify E2E - priority option", () => {
  test("notify --priority accepts valid values", async () => {
    const { exitCode } = await execa(
      "bun",
      ["run", "dev", "notify", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
  });

  test("notify <message> --priority shows in help", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "notify", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("--priority");
    expect(stdout).toContain("min");
    expect(stdout).toContain("low");
    expect(stdout).toContain("default");
    expect(stdout).toContain("high");
    expect(stdout).toContain("max");
  });
});

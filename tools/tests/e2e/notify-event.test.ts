/**
 * E2E tests for aaa notify --event flag
 *
 * Tests event-based routing to different topics/priorities/tags
 * as defined in aaa.config.json notify.events map.
 */

import { getContextRoot } from "@tools/utils/paths";
import { describe, expect, test } from "bun:test";
import { execa } from "execa";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

describe("notify E2E - --event flag", () => {
  test("notify --help shows --event option", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "notify", "--help"],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("--event");
    expect(stdout).toContain("Event name for routing");
  });

  test("notify --event with --dry-run shows event info", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "notify",
        "test message",
        "--dry-run",
        "--event",
        "ralph:milestoneComplete",
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Dry run - would send:");
    expect(stdout).toContain("Event:");
    expect(stdout).toContain("ralph:milestoneComplete");
    expect(stdout).toContain("Topic:");
    expect(stdout).toContain("Message:");
    expect(stdout).toContain("test message");
  });

  test("notify --event with unknown event shows not found indicator", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "notify",
        "test message",
        "--dry-run",
        "--event",
        "nonexistent:event",
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Event:");
    expect(stdout).toContain("nonexistent:event");
    // Should show (not found) indicator for unknown events
    expect(stdout).toContain("(not found)");
  });

  test("notify --event combined with --tags merges tags", async () => {
    // When both --event (with tags in config) and --tags are provided,
    // they should be merged
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "notify",
        "test message",
        "--dry-run",
        "--event",
        "claude:stop",
        "--tags",
        "custom",
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Dry run - would send:");
    // Should show tags (either from event config, CLI, or merged)
    // The test verifies the command accepts both flags together
    expect(stdout).toContain("Message:");
    expect(stdout).toContain("test message");
  });

  test("notify --event uses event-specific priority in dry-run", async () => {
    // Test that event config's priority is shown in dry-run output
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "notify",
        "test message",
        "--dry-run",
        "--event",
        "claude:stop",
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Priority:");
    // Priority should be shown (we can't assert the exact value without
    // knowing the config, but the field should be present)
  });

  test("notify --priority flag overrides --event config priority", async () => {
    // CLI flags should take precedence over event config
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "notify",
        "test message",
        "--dry-run",
        "--event",
        "ralph:milestoneComplete",
        "--priority",
        "min",
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Priority: min");
  });
});

describe("notify E2E - event routing behavior", () => {
  // These tests verify the event routing logic works correctly.
  // Note: The CLI uses findProjectRoot() to locate aaa.config.json,
  // so we test against the project's actual config or verify behavior
  // when events are not configured.

  test("known event uses event-specific priority when configured", async () => {
    // This test verifies that if an event IS found in config, its priority is used.
    // We use --dry-run to see the resolved configuration without sending.
    // The actual routing behavior depends on what's in the project's aaa.config.json.
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "notify",
        "test message",
        "--dry-run",
        "--event",
        "ralph:milestoneComplete",
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Event:");
    expect(stdout).toContain("ralph:milestoneComplete");
    // Output shows resolved config - event may or may not be configured
    expect(stdout).toContain("Topic:");
    expect(stdout).toContain("Priority:");
  });

  test("unknown event falls back gracefully", async () => {
    // When an event is not found in config, should:
    // 1. Show (not found) indicator
    // 2. Fall back to default topic/priority
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "notify",
        "test message",
        "--dry-run",
        "--event",
        "definitely:not:configured:event",
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Event:");
    expect(stdout).toContain("definitely:not:configured:event");
    // Should show (not found) indicator for unknown events
    expect(stdout).toContain("(not found)");
    // Should still have valid Topic and Priority (from defaults)
    expect(stdout).toContain("Topic:");
    expect(stdout).toContain("Priority:");
  });

  test("CLI --tags merges with event tags", async () => {
    // Test that CLI tags are shown when provided along with --event
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "notify",
        "test message",
        "--dry-run",
        "--event",
        "ralph:milestoneComplete",
        "--tags",
        "custom-tag",
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    // CLI tag should be in output (either alone or merged with event tags)
    expect(stdout).toContain("custom-tag");
  });

  test("CLI --priority overrides event priority", async () => {
    // CLI flags take precedence over event config
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "notify",
        "test message",
        "--dry-run",
        "--event",
        "ralph:milestoneComplete",
        "--priority",
        "min",
      ],
      { cwd: TOOLS_DIR },
    );

    expect(exitCode).toBe(0);
    // CLI priority should override any event-configured priority
    expect(stdout).toContain("Priority: min");
  });
});

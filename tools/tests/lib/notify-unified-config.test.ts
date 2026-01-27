/**
 * Tests for notify config loading from unified aaa.config.json
 *
 * These tests verify that loadNotifyConfig() correctly extracts
 * the notify section from the unified config and maps it to
 * the legacy NotifyConfig interface.
 *
 * @see SUB-092
 */

import type { NotifyConfig } from "@tools/commands/notify/types";

import {
  loadNotifyConfig,
  saveNotifyConfig,
} from "@tools/commands/notify/config";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("notify unified config integration", () => {
  let temporaryDirectory = "";
  let originalCwd = "";

  beforeEach(() => {
    temporaryDirectory = join(tmpdir(), `notify-unified-test-${Date.now()}`);
    mkdirSync(temporaryDirectory, { recursive: true });
    // Create .git directory to make it look like a project root
    mkdirSync(join(temporaryDirectory, ".git"), { recursive: true });
    // Save original cwd
    originalCwd = process.cwd();
    // Change to temp directory
    process.chdir(temporaryDirectory);
  });

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd);
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true });
    }
  });

  describe("loadNotifyConfig() without explicit path", () => {
    test("loads config when aaa.config.json exists", () => {
      // Create aaa.config.json with known values
      const unifiedConfig = {
        notify: { defaultTopic: "test-topic-aaa", enabled: true },
      };
      writeFileSync(
        join(temporaryDirectory, "aaa.config.json"),
        JSON.stringify(unifiedConfig, null, 2),
      );

      const config = loadNotifyConfig();

      expect(config.$schemaVersion).toBe(1);
      expect(config.enabled).toBe(true);
      expect(config.topic).toBe("test-topic-aaa");
      // Default for server when not specified
      expect(config.server).toBe("https://ntfy.sh");
    });

    test("loads notify section from aaa.config.json", () => {
      const unifiedConfig = {
        notify: {
          defaultPriority: "low",
          defaultTopic: "my-unified-topic",
          enabled: false,
          quietHours: { enabled: true, endHour: 6, startHour: 23 },
          server: "https://custom.ntfy.sh",
          title: "Custom Title",
        },
      };
      writeFileSync(
        join(temporaryDirectory, "aaa.config.json"),
        JSON.stringify(unifiedConfig, null, 2),
      );

      const config = loadNotifyConfig();

      expect(config.topic).toBe("my-unified-topic");
      expect(config.defaultPriority).toBe("low");
      expect(config.enabled).toBe(false);
      expect(config.server).toBe("https://custom.ntfy.sh");
      expect(config.title).toBe("Custom Title");
      expect(config.quietHours.enabled).toBe(true);
      expect(config.quietHours.startHour).toBe(23);
      expect(config.quietHours.endHour).toBe(6);
    });

    test("maps defaultTopic to topic correctly", () => {
      const unifiedConfig = { notify: { defaultTopic: "topic-from-unified" } };
      writeFileSync(
        join(temporaryDirectory, "aaa.config.json"),
        JSON.stringify(unifiedConfig, null, 2),
      );

      const config = loadNotifyConfig();

      // defaultTopic in unified config should map to topic in NotifyConfig
      expect(config.topic).toBe("topic-from-unified");
    });

    test("preserves other sections when present", () => {
      const unifiedConfig = {
        notify: { defaultTopic: "my-topic", enabled: true },
        ralph: { hooks: { onMilestoneComplete: ["log", "notify"] } },
      };
      writeFileSync(
        join(temporaryDirectory, "aaa.config.json"),
        JSON.stringify(unifiedConfig, null, 2),
      );

      // Loading notify config should work even with other sections
      const config = loadNotifyConfig();
      expect(config.topic).toBe("my-topic");
    });
  });

  describe("saveNotifyConfig() without explicit path", () => {
    test("writes to aaa.config.json", () => {
      const config: NotifyConfig = {
        $schemaVersion: 1,
        defaultPriority: "high",
        enabled: true,
        quietHours: { enabled: false, endHour: 8, startHour: 22 },
        server: "https://ntfy.sh",
        title: "test",
        topic: "saved-topic",
      };

      saveNotifyConfig(config);

      // Should have created aaa.config.json
      const configPath = join(temporaryDirectory, "aaa.config.json");
      expect(existsSync(configPath)).toBe(true);

      // Should have notify section with topic mapped to defaultTopic
      const content = JSON.parse(readFileSync(configPath, "utf8")) as Record<
        string,
        unknown
      >;
      const notify = content.notify as Record<string, unknown>;
      expect(notify).toBeDefined();
      expect(notify.defaultTopic).toBe("saved-topic");
      expect(notify.enabled).toBe(true);
    });

    test("preserves existing sections when saving", () => {
      // Create existing config with ralph section
      const existingConfig = {
        ralph: { hooks: { onMilestoneComplete: ["log", "notify"] } },
      };
      writeFileSync(
        join(temporaryDirectory, "aaa.config.json"),
        JSON.stringify(existingConfig, null, 2),
      );

      // Save notify config
      const config: NotifyConfig = {
        $schemaVersion: 1,
        defaultPriority: "high",
        enabled: true,
        quietHours: { enabled: false, endHour: 8, startHour: 22 },
        server: "https://ntfy.sh",
        title: "test",
        topic: "my-topic",
      };
      saveNotifyConfig(config);

      // Ralph section should be preserved
      const content = JSON.parse(
        readFileSync(join(temporaryDirectory, "aaa.config.json"), "utf8"),
      ) as Record<string, unknown>;
      expect(content.ralph).toBeDefined();
      const ralph = content.ralph as Record<string, unknown>;
      const hooks = ralph.hooks as Record<string, unknown>;
      expect(hooks.onMilestoneComplete).toEqual(["log", "notify"]);
    });

    test("round-trip: save then load returns same values", () => {
      const config: NotifyConfig = {
        $schemaVersion: 1,
        defaultPriority: "max",
        enabled: false,
        quietHours: { enabled: true, endHour: 7, startHour: 21 },
        server: "https://my.ntfy.sh",
        title: "My Notifications",
        topic: "round-trip-topic",
      };

      saveNotifyConfig(config);
      const loaded = loadNotifyConfig();

      // All values should round-trip correctly
      expect(loaded.topic).toBe(config.topic);
      expect(loaded.defaultPriority).toBe(config.defaultPriority);
      expect(loaded.enabled).toBe(config.enabled);
      expect(loaded.server).toBe(config.server);
      expect(loaded.title).toBe(config.title);
      expect(loaded.quietHours.enabled).toBe(config.quietHours.enabled);
      expect(loaded.quietHours.startHour).toBe(config.quietHours.startHour);
      expect(loaded.quietHours.endHour).toBe(config.quietHours.endHour);
    });
  });
});

import type {
  NotifyConfig,
  QuietHoursConfig,
} from "@tools/commands/notify/types";

import {
  DEFAULT_NOTIFY_CONFIG,
  isInQuietHours,
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

describe("notify config", () => {
  describe("DEFAULT_NOTIFY_CONFIG", () => {
    test("has sensible defaults", () => {
      expect(DEFAULT_NOTIFY_CONFIG.$schemaVersion).toBe(1);
      expect(DEFAULT_NOTIFY_CONFIG.enabled).toBe(true);
      expect(DEFAULT_NOTIFY_CONFIG.server).toBe("https://ntfy.sh");
      expect(DEFAULT_NOTIFY_CONFIG.topic).toBe("");
      expect(DEFAULT_NOTIFY_CONFIG.title).toBe("aaa notify");
      expect(DEFAULT_NOTIFY_CONFIG.defaultPriority).toBe("high");
    });

    test("has quiet hours disabled by default", () => {
      expect(DEFAULT_NOTIFY_CONFIG.quietHours.enabled).toBe(false);
      expect(DEFAULT_NOTIFY_CONFIG.quietHours.startHour).toBe(22);
      expect(DEFAULT_NOTIFY_CONFIG.quietHours.endHour).toBe(8);
    });
  });

  describe("isInQuietHours", () => {
    function createQuietHoursConfig(
      isEnabled: boolean,
      startHour: number,
      endHour: number,
    ): QuietHoursConfig {
      return { enabled: isEnabled, endHour, startHour };
    }

    test("returns false when disabled", () => {
      const config = createQuietHoursConfig(false, 22, 8);
      const midnight = new Date(2026, 0, 26, 0, 0);
      expect(isInQuietHours(config, midnight)).toBe(false);
    });

    test("returns false when start === end (disabled)", () => {
      const config = createQuietHoursConfig(true, 22, 22);
      const midnight = new Date(2026, 0, 26, 0, 0);
      expect(isInQuietHours(config, midnight)).toBe(false);
    });

    describe("overnight spans (22:00-08:00)", () => {
      const config = createQuietHoursConfig(true, 22, 8);

      test("23:00 is within quiet hours", () => {
        const time = new Date(2026, 0, 26, 23, 0);
        expect(isInQuietHours(config, time)).toBe(true);
      });

      test("22:00 is within quiet hours (start boundary)", () => {
        const time = new Date(2026, 0, 26, 22, 0);
        expect(isInQuietHours(config, time)).toBe(true);
      });

      test("03:00 is within quiet hours (after midnight)", () => {
        const time = new Date(2026, 0, 26, 3, 0);
        expect(isInQuietHours(config, time)).toBe(true);
      });

      test("07:59 is within quiet hours", () => {
        const time = new Date(2026, 0, 26, 7, 59);
        expect(isInQuietHours(config, time)).toBe(true);
      });

      test("08:00 is NOT within quiet hours (end boundary)", () => {
        const time = new Date(2026, 0, 26, 8, 0);
        expect(isInQuietHours(config, time)).toBe(false);
      });

      test("10:00 is NOT within quiet hours", () => {
        const time = new Date(2026, 0, 26, 10, 0);
        expect(isInQuietHours(config, time)).toBe(false);
      });

      test("21:59 is NOT within quiet hours", () => {
        const time = new Date(2026, 0, 26, 21, 59);
        expect(isInQuietHours(config, time)).toBe(false);
      });
    });

    describe("same-day spans (01:00-06:00)", () => {
      const config = createQuietHoursConfig(true, 1, 6);

      test("03:00 is within quiet hours", () => {
        const time = new Date(2026, 0, 26, 3, 0);
        expect(isInQuietHours(config, time)).toBe(true);
      });

      test("01:00 is within quiet hours (start boundary)", () => {
        const time = new Date(2026, 0, 26, 1, 0);
        expect(isInQuietHours(config, time)).toBe(true);
      });

      test("05:59 is within quiet hours", () => {
        const time = new Date(2026, 0, 26, 5, 59);
        expect(isInQuietHours(config, time)).toBe(true);
      });

      test("06:00 is NOT within quiet hours (end boundary)", () => {
        const time = new Date(2026, 0, 26, 6, 0);
        expect(isInQuietHours(config, time)).toBe(false);
      });

      test("00:00 is NOT within quiet hours", () => {
        const time = new Date(2026, 0, 26, 0, 0);
        expect(isInQuietHours(config, time)).toBe(false);
      });

      test("08:00 is NOT within quiet hours", () => {
        const time = new Date(2026, 0, 26, 8, 0);
        expect(isInQuietHours(config, time)).toBe(false);
      });
    });

    describe("edge cases", () => {
      test("full day span (0-23) includes most hours", () => {
        const config = createQuietHoursConfig(true, 0, 23);
        expect(isInQuietHours(config, new Date(2026, 0, 26, 0, 0))).toBe(true);
        expect(isInQuietHours(config, new Date(2026, 0, 26, 12, 0))).toBe(true);
        expect(isInQuietHours(config, new Date(2026, 0, 26, 22, 0))).toBe(true);
        expect(isInQuietHours(config, new Date(2026, 0, 26, 23, 0))).toBe(
          false,
        );
      });

      test("narrow span (23-0) only includes hour 23", () => {
        const config = createQuietHoursConfig(true, 23, 0);
        expect(isInQuietHours(config, new Date(2026, 0, 26, 23, 0))).toBe(true);
        expect(isInQuietHours(config, new Date(2026, 0, 26, 0, 0))).toBe(false);
        expect(isInQuietHours(config, new Date(2026, 0, 26, 22, 0))).toBe(
          false,
        );
      });
    });
  });

  describe("loadNotifyConfig", () => {
    let temporaryDirectory = "";

    beforeEach(() => {
      temporaryDirectory = join(tmpdir(), `notify-config-test-${Date.now()}`);
      mkdirSync(temporaryDirectory, { recursive: true });
    });

    afterEach(() => {
      if (existsSync(temporaryDirectory)) {
        rmSync(temporaryDirectory, { recursive: true });
      }
    });

    test("returns defaults when file missing", () => {
      const configPath = join(temporaryDirectory, "notify.json");
      const config = loadNotifyConfig(configPath);

      expect(config).toEqual(DEFAULT_NOTIFY_CONFIG);
    });

    test("loads valid config file", () => {
      const configPath = join(temporaryDirectory, "notify.json");
      const customConfig: NotifyConfig = {
        $schemaVersion: 1,
        defaultPriority: "low",
        enabled: false,
        quietHours: { enabled: true, endHour: 6, startHour: 23 },
        server: "https://custom.ntfy.sh",
        title: "Custom Title",
        topic: "my-custom-topic",
      };
      writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loaded = loadNotifyConfig(configPath);
      expect(loaded).toEqual(customConfig);
    });

    test("merges partial config with defaults", () => {
      const configPath = join(temporaryDirectory, "notify.json");
      const partialConfig = {
        $schemaVersion: 1,
        defaultPriority: "low",
        enabled: true,
        quietHours: { enabled: false, endHour: 8, startHour: 22 },
        server: "https://ntfy.sh",
        title: "aaa notify",
        topic: "my-topic",
      };
      writeFileSync(configPath, JSON.stringify(partialConfig, null, 2));

      const loaded = loadNotifyConfig(configPath);
      expect(loaded.topic).toBe("my-topic");
      expect(loaded.defaultPriority).toBe("low");
      // Other fields from defaults
      expect(loaded.server).toBe("https://ntfy.sh");
    });

    test("merges nested quietHours with defaults", () => {
      const configPath = join(temporaryDirectory, "notify.json");
      const partialConfig = {
        $schemaVersion: 1,
        defaultPriority: "high",
        enabled: true,
        quietHours: { enabled: true, endHour: 8, startHour: 22 },
        server: "https://ntfy.sh",
        title: "aaa notify",
        topic: "",
      };
      writeFileSync(configPath, JSON.stringify(partialConfig, null, 2));

      const loaded = loadNotifyConfig(configPath);
      expect(loaded.quietHours.enabled).toBe(true);
      expect(loaded.quietHours.startHour).toBe(22);
      expect(loaded.quietHours.endHour).toBe(8);
    });

    test("throws on invalid JSON", () => {
      const configPath = join(temporaryDirectory, "notify.json");
      writeFileSync(configPath, "{ invalid json }");

      expect(() => loadNotifyConfig(configPath)).toThrow(/Invalid JSON/);
    });

    test("throws on invalid config structure", () => {
      const configPath = join(temporaryDirectory, "notify.json");
      const invalidConfig = {
        $schemaVersion: 1,
        defaultPriority: "invalid-priority",
        enabled: true,
        quietHours: { enabled: false, endHour: 8, startHour: 22 },
        server: "https://ntfy.sh",
        title: "test",
        topic: "",
      };
      writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

      expect(() => loadNotifyConfig(configPath)).toThrow(/Invalid config/);
    });
  });

  describe("saveNotifyConfig", () => {
    let temporaryDirectory = "";

    beforeEach(() => {
      temporaryDirectory = join(tmpdir(), `notify-config-test-${Date.now()}`);
      mkdirSync(temporaryDirectory, { recursive: true });
    });

    afterEach(() => {
      if (existsSync(temporaryDirectory)) {
        rmSync(temporaryDirectory, { recursive: true });
      }
    });

    test("saves valid config", () => {
      const configPath = join(temporaryDirectory, "notify.json");
      const config: NotifyConfig = {
        $schemaVersion: 1,
        defaultPriority: "high",
        enabled: true,
        quietHours: { enabled: false, endHour: 8, startHour: 22 },
        server: "https://ntfy.sh",
        title: "test",
        topic: "my-topic",
      };

      saveNotifyConfig(config, configPath);

      const loaded = loadNotifyConfig(configPath);
      expect(loaded).toEqual(config);
    });

    test("creates parent directories", () => {
      const configPath = join(
        temporaryDirectory,
        "nested",
        "deep",
        "notify.json",
      );
      const config = { ...DEFAULT_NOTIFY_CONFIG };

      saveNotifyConfig(config, configPath);

      expect(existsSync(configPath)).toBe(true);
    });

    test("overwrites existing config", () => {
      const configPath = join(temporaryDirectory, "notify.json");

      saveNotifyConfig(
        { ...DEFAULT_NOTIFY_CONFIG, topic: "first" },
        configPath,
      );
      saveNotifyConfig(
        { ...DEFAULT_NOTIFY_CONFIG, topic: "second" },
        configPath,
      );

      const loaded = loadNotifyConfig(configPath);
      expect(loaded.topic).toBe("second");
    });

    test("writes formatted JSON with trailing newline", () => {
      const configPath = join(temporaryDirectory, "notify.json");
      const config = { ...DEFAULT_NOTIFY_CONFIG };

      saveNotifyConfig(config, configPath);

      const content = readFileSync(configPath, "utf8");
      expect(content.endsWith("\n")).toBe(true);
      // Should be formatted (not minified)
      expect(content).toContain("\n  ");
    });

    test("throws on invalid config", () => {
      const configPath = join(temporaryDirectory, "notify.json");
      const invalidConfig = {
        ...DEFAULT_NOTIFY_CONFIG,
        defaultPriority: "invalid",
      } as unknown as NotifyConfig;

      expect(() => {
        saveNotifyConfig(invalidConfig, configPath);
      }).toThrow(/Invalid config/);
    });
  });
});

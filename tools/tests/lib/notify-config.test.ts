import type { QuietHoursConfig } from "@tools/commands/notify/types";

import {
  DEFAULT_NOTIFY_CONFIG,
  isInQuietHours,
} from "@tools/commands/notify/config";
import { describe, expect, test } from "bun:test";

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
});

import {
  type NotifyConfig,
  notifyConfigSchema,
  NtfyError,
  NtfyNetworkError,
  NtfyRateLimitError,
  NtfyValidationError,
  priorities,
  prioritySchema,
  type QuietHoursConfig,
  quietHoursSchema,
} from "@tools/commands/notify/types";
import { describe, expect, test } from "bun:test";

describe("notify types", () => {
  describe("Priority type", () => {
    test("priorities array contains all valid values", () => {
      expect(priorities).toEqual(["min", "low", "default", "high", "max"]);
    });

    test("prioritySchema accepts valid priorities", () => {
      for (const priority of priorities) {
        expect(prioritySchema.safeParse(priority).success).toBe(true);
      }
    });

    test("prioritySchema rejects invalid priorities", () => {
      expect(prioritySchema.safeParse("invalid").success).toBe(false);
      expect(prioritySchema.safeParse("").success).toBe(false);
      expect(prioritySchema.safeParse(123).success).toBe(false);
    });
  });

  describe("QuietHoursConfig", () => {
    test("quietHoursSchema accepts valid config", () => {
      const valid: QuietHoursConfig = {
        enabled: true,
        endHour: 8,
        startHour: 22,
      };
      expect(quietHoursSchema.safeParse(valid).success).toBe(true);
    });

    test("quietHoursSchema accepts edge hours (0 and 23)", () => {
      const earlyMorning: QuietHoursConfig = {
        enabled: true,
        endHour: 6,
        startHour: 0,
      };
      expect(quietHoursSchema.safeParse(earlyMorning).success).toBe(true);

      const lateNight: QuietHoursConfig = {
        enabled: true,
        endHour: 5,
        startHour: 23,
      };
      expect(quietHoursSchema.safeParse(lateNight).success).toBe(true);
    });

    test("quietHoursSchema rejects invalid hours", () => {
      const negativeHour = { enabled: true, endHour: 8, startHour: -1 };
      expect(quietHoursSchema.safeParse(negativeHour).success).toBe(false);

      const hourTooHigh = { enabled: true, endHour: 24, startHour: 22 };
      expect(quietHoursSchema.safeParse(hourTooHigh).success).toBe(false);
    });

    test("quietHoursSchema rejects non-integer hours", () => {
      const floatHour = { enabled: true, endHour: 8, startHour: 22.5 };
      expect(quietHoursSchema.safeParse(floatHour).success).toBe(false);
    });
  });

  describe("NotifyConfig", () => {
    const validConfig: NotifyConfig = {
      $schemaVersion: 1,
      defaultPriority: "high",
      enabled: true,
      quietHours: { enabled: false, endHour: 8, startHour: 22 },
      server: "https://ntfy.sh",
      title: "aaa notify",
      topic: "my-topic",
    };

    test("notifyConfigSchema accepts valid config", () => {
      expect(notifyConfigSchema.safeParse(validConfig).success).toBe(true);
    });

    test("notifyConfigSchema accepts all priority values", () => {
      for (const priority of priorities) {
        const config = { ...validConfig, defaultPriority: priority };
        expect(notifyConfigSchema.safeParse(config).success).toBe(true);
      }
    });

    test("notifyConfigSchema accepts empty topic (unconfigured state)", () => {
      const unconfigured = { ...validConfig, topic: "" };
      expect(notifyConfigSchema.safeParse(unconfigured).success).toBe(true);
    });

    test("notifyConfigSchema rejects invalid server URL", () => {
      const invalidServer = { ...validConfig, server: "not-a-url" };
      expect(notifyConfigSchema.safeParse(invalidServer).success).toBe(false);
    });

    test("notifyConfigSchema rejects empty title", () => {
      const emptyTitle = { ...validConfig, title: "" };
      expect(notifyConfigSchema.safeParse(emptyTitle).success).toBe(false);
    });

    test("notifyConfigSchema rejects invalid schema version", () => {
      const zeroVersion = { ...validConfig, $schemaVersion: 0 };
      expect(notifyConfigSchema.safeParse(zeroVersion).success).toBe(false);

      const negativeVersion = { ...validConfig, $schemaVersion: -1 };
      expect(notifyConfigSchema.safeParse(negativeVersion).success).toBe(false);
    });

    test("notifyConfigSchema rejects missing required fields", () => {
      const noEnabled = { ...validConfig };
      delete (noEnabled as Record<string, unknown>).enabled;
      expect(notifyConfigSchema.safeParse(noEnabled).success).toBe(false);
    });
  });

  describe("Error classes", () => {
    test("NtfyError has correct name property", () => {
      const error = new NtfyError("test error");
      expect(error.name).toBe("NtfyError");
      expect(error.message).toBe("test error");
      expect(error instanceof Error).toBe(true);
    });

    test("NtfyValidationError has correct name property", () => {
      const error = new NtfyValidationError("invalid input");
      expect(error.name).toBe("NtfyValidationError");
      expect(error.message).toBe("invalid input");
      expect(error instanceof Error).toBe(true);
    });

    test("NtfyNetworkError has correct name and cause property", () => {
      const cause = new Error("connection failed");
      const error = new NtfyNetworkError("network error", cause);
      expect(error.name).toBe("NtfyNetworkError");
      expect(error.message).toBe("network error");
      expect(error.cause).toBe(cause);
      expect(error instanceof Error).toBe(true);
    });

    test("NtfyNetworkError works without cause", () => {
      const error = new NtfyNetworkError("network error");
      expect(error.name).toBe("NtfyNetworkError");
      expect(error.cause).toBeUndefined();
    });

    test("NtfyRateLimitError has correct name and retryAfter property", () => {
      const error = new NtfyRateLimitError("rate limited", 60);
      expect(error.name).toBe("NtfyRateLimitError");
      expect(error.message).toBe("rate limited");
      expect(error.retryAfter).toBe(60);
      expect(error instanceof Error).toBe(true);
    });

    test("NtfyRateLimitError works without retryAfter", () => {
      const error = new NtfyRateLimitError("rate limited");
      expect(error.name).toBe("NtfyRateLimitError");
      expect(error.retryAfter).toBeUndefined();
    });
  });
});

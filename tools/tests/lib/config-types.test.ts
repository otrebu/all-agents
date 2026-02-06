import {
  type AaaConfig,
  aaaConfigSchema,
  type EventConfig,
  eventConfigSchema,
  type HooksConfig,
  hooksConfigSchema,
  type NotifySection,
  notifySectionSchema,
  priorities,
  prioritySchema,
  type QuietHoursConfig,
  quietHoursSchema,
  type RalphSection,
  ralphSectionSchema,
  type ResearchSection,
  researchSectionSchema,
  type ReviewSection,
  reviewSectionSchema,
} from "@tools/lib/config/types";
import { describe, expect, test } from "bun:test";

// =============================================================================
// Priority Tests
// =============================================================================

describe("prioritySchema", () => {
  test("accepts valid priority values", () => {
    for (const p of priorities) {
      expect(prioritySchema.parse(p)).toBe(p);
    }
  });

  test("rejects invalid priority values", () => {
    expect(() => prioritySchema.parse("invalid")).toThrow();
    expect(() => prioritySchema.parse("")).toThrow();
    expect(() => prioritySchema.parse(123)).toThrow();
  });

  test("priorities array has correct values", () => {
    expect(priorities).toEqual(["min", "low", "default", "high", "max"]);
  });
});

// =============================================================================
// Quiet Hours Tests
// =============================================================================

describe("quietHoursSchema", () => {
  test("accepts valid quiet hours config", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      endHour: 8,
      startHour: 22,
    };
    expect(quietHoursSchema.parse(config)).toEqual(config);
  });

  test("accepts boundary hour values (0 and 23)", () => {
    const config: QuietHoursConfig = {
      enabled: true,
      endHour: 0,
      startHour: 23,
    };
    expect(quietHoursSchema.parse(config)).toEqual(config);
  });

  test("rejects hours outside 0-23 range", () => {
    expect(() =>
      quietHoursSchema.parse({ enabled: true, endHour: 24, startHour: 22 }),
    ).toThrow();
    expect(() =>
      quietHoursSchema.parse({ enabled: true, endHour: 8, startHour: -1 }),
    ).toThrow();
  });

  test("rejects non-integer hours", () => {
    expect(() =>
      quietHoursSchema.parse({ enabled: true, endHour: 8.5, startHour: 22 }),
    ).toThrow();
  });
});

// =============================================================================
// Event Config Tests
// =============================================================================

describe("eventConfigSchema", () => {
  test("accepts full event config", () => {
    const config: EventConfig = {
      priority: "high",
      tags: ["warning", "sos"],
      topic: "critical",
    };
    expect(eventConfigSchema.parse(config)).toEqual(config);
  });

  test("accepts partial event config", () => {
    expect(eventConfigSchema.parse({ priority: "max" })).toEqual({
      priority: "max",
    });
    expect(eventConfigSchema.parse({ topic: "builds" })).toEqual({
      topic: "builds",
    });
    expect(eventConfigSchema.parse({ tags: ["tada"] })).toEqual({
      tags: ["tada"],
    });
  });

  test("accepts empty event config", () => {
    expect(eventConfigSchema.parse({})).toEqual({});
  });

  test("rejects invalid priority in event config", () => {
    expect(() => eventConfigSchema.parse({ priority: "ultra-high" })).toThrow();
  });

  test("accepts enabled field set to true", () => {
    const config: EventConfig = { enabled: true };
    expect(eventConfigSchema.parse(config)).toEqual({ enabled: true });
  });

  test("accepts enabled field set to false", () => {
    const config: EventConfig = { enabled: false };
    expect(eventConfigSchema.parse(config)).toEqual({ enabled: false });
  });

  test("accepts full event config with enabled field", () => {
    const config: EventConfig = {
      enabled: false,
      priority: "high",
      tags: ["alert", "failure"],
      topic: "critical",
    };
    expect(eventConfigSchema.parse(config)).toEqual(config);
  });

  test("enabled field defaults to undefined when omitted", () => {
    const config = eventConfigSchema.parse({ priority: "default" });
    expect(config.enabled).toBeUndefined();
  });
});

// =============================================================================
// Notify Section Tests
// =============================================================================

describe("notifySectionSchema", () => {
  test("accepts full notify config", () => {
    const config: NotifySection = {
      defaultPriority: "high",
      defaultTopic: "my-project",
      enabled: true,
      events: {
        "claude:stop": { priority: "default", topic: "claude" },
        "ralph:milestoneComplete": {
          priority: "high",
          tags: ["tada"],
          topic: "builds",
        },
      },
      quietHours: { enabled: true, endHour: 8, startHour: 22 },
      server: "https://ntfy.sh",
      title: "AAA Notification",
    };
    expect(notifySectionSchema.parse(config)).toEqual(config);
  });

  test("accepts empty notify config", () => {
    expect(notifySectionSchema.parse({})).toEqual({});
  });

  test("accepts notify config with events map", () => {
    const config: NotifySection = {
      events: {
        "ralph:maxIterationsExceeded": {
          priority: "max",
          tags: ["warning", "sos"],
          topic: "critical",
        },
        "ralph:subtaskComplete": { priority: "default" },
      },
    };
    expect(notifySectionSchema.parse(config)).toEqual(config);
  });

  test("rejects invalid server URL", () => {
    expect(() => notifySectionSchema.parse({ server: "not-a-url" })).toThrow();
  });
});

// =============================================================================
// Hooks Config Tests
// =============================================================================

describe("hooksConfigSchema", () => {
  test("accepts full hooks config", () => {
    const config: HooksConfig = {
      onIterationComplete: ["log"],
      onMaxIterationsExceeded: ["log", "notify", "pause"],
      onMilestoneComplete: ["log", "notify"],
      onSubtaskComplete: ["log", "notify"],
      onValidationFail: ["log", "notify"],
    };
    expect(hooksConfigSchema.parse(config)).toEqual(config);
  });

  test("accepts empty hooks config", () => {
    expect(hooksConfigSchema.parse({})).toEqual({});
  });

  test("accepts single hook action", () => {
    expect(
      hooksConfigSchema.parse({ onMilestoneComplete: ["notify"] }),
    ).toEqual({ onMilestoneComplete: ["notify"] });
  });

  test("rejects invalid hook action", () => {
    expect(() =>
      hooksConfigSchema.parse({ onMilestoneComplete: ["invalid"] }),
    ).toThrow();
  });
});

// =============================================================================
// Ralph Section Tests
// =============================================================================

describe("ralphSectionSchema", () => {
  test("accepts full ralph config", () => {
    const config: RalphSection = {
      build: { calibrateEvery: 5, maxIterations: 3 },
      hooks: {
        onMaxIterationsExceeded: ["log", "notify", "pause"],
        onMilestoneComplete: ["log", "notify"],
      },
      selfImprovement: { mode: "suggest" },
    };
    expect(ralphSectionSchema.parse(config)).toEqual(config);
  });

  test("accepts empty ralph config", () => {
    expect(ralphSectionSchema.parse({})).toEqual({});
  });

  test("accepts ralph config with only build settings", () => {
    const config: RalphSection = { build: { maxIterations: 10 } };
    expect(ralphSectionSchema.parse(config)).toEqual(config);
  });

  test("accepts provider and model defaults in ralph config", () => {
    const config: RalphSection = {
      lightweightModel: "claude-3-5-haiku-latest",
      model: "claude-sonnet-4",
      provider: "opencode",
    };
    expect(ralphSectionSchema.parse(config)).toEqual(config);
  });

  test("rejects negative maxIterations", () => {
    expect(() =>
      ralphSectionSchema.parse({ build: { maxIterations: -1 } }),
    ).toThrow();
  });

  test("rejects invalid provider value", () => {
    expect(() => ralphSectionSchema.parse({ provider: "invalid" })).toThrow();
  });

  test("accepts zero for calibrateEvery (disabled)", () => {
    expect(ralphSectionSchema.parse({ build: { calibrateEvery: 0 } })).toEqual({
      build: { calibrateEvery: 0 },
    });
  });
});

// =============================================================================
// Review Section Tests
// =============================================================================

describe("reviewSectionSchema", () => {
  test("accepts full review config", () => {
    const config: ReviewSection = {
      autoFixThreshold: 3,
      diaryPath: "logs/reviews.jsonl",
    };
    expect(reviewSectionSchema.parse(config)).toEqual(config);
  });

  test("accepts empty review config", () => {
    expect(reviewSectionSchema.parse({})).toEqual({});
  });

  test("accepts autoFixThreshold at boundaries (1 and 5)", () => {
    expect(reviewSectionSchema.parse({ autoFixThreshold: 1 })).toEqual({
      autoFixThreshold: 1,
    });
    expect(reviewSectionSchema.parse({ autoFixThreshold: 5 })).toEqual({
      autoFixThreshold: 5,
    });
  });

  test("rejects autoFixThreshold outside 1-5 range", () => {
    expect(() => reviewSectionSchema.parse({ autoFixThreshold: 0 })).toThrow();
    expect(() => reviewSectionSchema.parse({ autoFixThreshold: 6 })).toThrow();
  });
});

// =============================================================================
// Research Section Tests
// =============================================================================

describe("researchSectionSchema", () => {
  test("accepts full research config", () => {
    const config: ResearchSection = {
      github: { maxResults: 10 },
      outputDir: "docs/research",
      parallel: { maxResults: 15 },
    };
    expect(researchSectionSchema.parse(config)).toEqual(config);
  });

  test("accepts empty research config", () => {
    expect(researchSectionSchema.parse({})).toEqual({});
  });

  test("rejects maxResults less than 1", () => {
    expect(() =>
      researchSectionSchema.parse({ github: { maxResults: 0 } }),
    ).toThrow();
  });
});

// =============================================================================
// AaaConfig Tests
// =============================================================================

describe("aaaConfigSchema", () => {
  test("accepts full config matching plan example", () => {
    const config: AaaConfig = {
      $schema: "./docs/planning/schemas/aaa-config.schema.json",
      debug: false,
      notify: {
        defaultPriority: "high",
        defaultTopic: "my-project",
        enabled: true,
        events: {
          "claude:permissionPrompt": { priority: "max", topic: "critical" },
          "claude:stop": { priority: "default", topic: "claude" },
          "ralph:maxIterationsExceeded": {
            priority: "max",
            tags: ["warning", "sos"],
            topic: "critical",
          },
          "ralph:milestoneComplete": {
            priority: "high",
            tags: ["tada"],
            topic: "builds",
          },
          "ralph:subtaskComplete": { priority: "default" },
        },
        quietHours: { enabled: true, endHour: 8, startHour: 22 },
        server: "https://ntfy.sh",
      },
      ralph: {
        build: { calibrateEvery: 0, maxIterations: 3 },
        hooks: {
          onIterationComplete: ["log"],
          onMaxIterationsExceeded: ["log", "notify", "pause"],
          onMilestoneComplete: ["log", "notify"],
          onSubtaskComplete: ["log", "notify"],
          onValidationFail: ["log", "notify"],
        },
        selfImprovement: { mode: "suggest" },
      },
      research: {
        github: { maxResults: 10 },
        outputDir: "docs/research",
        parallel: { maxResults: 15 },
      },
      review: { autoFixThreshold: 3, diaryPath: "logs/reviews.jsonl" },
    };
    expect(aaaConfigSchema.parse(config)).toEqual(config);
  });

  test("accepts empty config", () => {
    expect(aaaConfigSchema.parse({})).toEqual({});
  });

  test("accepts config with only some sections", () => {
    const config: AaaConfig = { debug: true, notify: { enabled: true } };
    expect(aaaConfigSchema.parse(config)).toEqual(config);
  });

  test("accepts config with $schema reference", () => {
    const config: AaaConfig = {
      $schema: "./docs/planning/schemas/aaa-config.schema.json",
    };
    expect(aaaConfigSchema.parse(config)).toEqual(config);
  });

  test("validates nested sections independently", () => {
    // Valid notify, invalid ralph should fail
    expect(() =>
      aaaConfigSchema.parse({
        notify: { enabled: true },
        ralph: { build: { maxIterations: -5 } },
      }),
    ).toThrow();
  });
});

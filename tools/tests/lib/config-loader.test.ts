import type { AaaConfig } from "@tools/lib/config/types";
import type { Mock } from "bun:test";

import { DEFAULT_AAA_CONFIG } from "@tools/lib/config/defaults";
import { CONFIG_FILENAME, loadAaaConfig } from "@tools/lib/config/loader";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("loadAaaConfig", () => {
  let temporaryDirectory = "";
  let consoleWarnSpy: Mock<typeof console.warn> | null = null;

  beforeEach(() => {
    temporaryDirectory = join(tmpdir(), `aaa-config-test-${Date.now()}`);
    mkdirSync(temporaryDirectory, { recursive: true });
    consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true });
    }
    consoleWarnSpy?.mockRestore();
  });

  test("returns defaults when config missing", () => {
    const configPath = join(temporaryDirectory, CONFIG_FILENAME);
    const config = loadAaaConfig(configPath);

    // When primary config doesn't exist, loader returns defaults
    expect(typeof config.debug).toBe("boolean");
    expect(config.notify).toBeDefined();
    expect(config.ralph?.build?.maxIterations).toBeDefined();
  });

  test("loads valid config file and merges with defaults", () => {
    const configPath = join(temporaryDirectory, CONFIG_FILENAME);
    const customConfig: Partial<AaaConfig> = {
      debug: true,
      notify: { defaultTopic: "my-project", enabled: false },
    };
    writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

    const loaded = loadAaaConfig(configPath);

    // Custom values
    expect(loaded.debug).toBe(true);
    expect(loaded.notify?.defaultTopic).toBe("my-project");
    expect(loaded.notify?.enabled).toBe(false);

    // Default values for unspecified fields
    expect(loaded.notify?.server).toBe(DEFAULT_AAA_CONFIG.notify?.server);
    expect(loaded.ralph?.build?.maxIterations).toBe(
      DEFAULT_AAA_CONFIG.ralph?.build?.maxIterations,
    );
  });

  test("deep merges nested notify.quietHours", () => {
    const configPath = join(temporaryDirectory, CONFIG_FILENAME);
    const customConfig: Partial<AaaConfig> = {
      notify: { quietHours: { enabled: true, endHour: 7, startHour: 23 } },
    };
    writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

    const loaded = loadAaaConfig(configPath);

    // Custom quiet hours
    expect(loaded.notify?.quietHours?.enabled).toBe(true);
    expect(loaded.notify?.quietHours?.startHour).toBe(23);
    expect(loaded.notify?.quietHours?.endHour).toBe(7);

    // Other notify defaults
    expect(loaded.notify?.server).toBe(DEFAULT_AAA_CONFIG.notify?.server);
  });

  test("deep merges nested ralph.hooks", () => {
    const configPath = join(temporaryDirectory, CONFIG_FILENAME);
    const customConfig: Partial<AaaConfig> = {
      ralph: { hooks: { onMilestoneComplete: ["log", "notify", "pause"] } },
    };
    writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

    const loaded = loadAaaConfig(configPath);

    // Custom hooks
    expect(loaded.ralph?.hooks?.onMilestoneComplete).toEqual([
      "log",
      "notify",
      "pause",
    ]);

    // Default hooks for unspecified events
    expect(loaded.ralph?.hooks?.onIterationComplete).toEqual(
      DEFAULT_AAA_CONFIG.ralph?.hooks?.onIterationComplete,
    );
  });

  test("logs warning and returns defaults for invalid JSON", () => {
    const configPath = join(temporaryDirectory, CONFIG_FILENAME);
    writeFileSync(configPath, "{ invalid json }");

    const config = loadAaaConfig(configPath);

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(config).toEqual(DEFAULT_AAA_CONFIG);
  });

  test("logs warning and returns defaults for invalid schema", () => {
    const configPath = join(temporaryDirectory, CONFIG_FILENAME);
    const invalidConfig = { notify: { defaultPriority: "invalid-priority" } };
    writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

    const config = loadAaaConfig(configPath);

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(config).toEqual(DEFAULT_AAA_CONFIG);
  });

  test("preserves $schema field from config", () => {
    const configPath = join(temporaryDirectory, CONFIG_FILENAME);
    const customConfig: Partial<AaaConfig> = {
      $schema: "./docs/planning/schemas/aaa-config.schema.json",
      debug: true,
    };
    writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

    const loaded = loadAaaConfig(configPath);

    expect(loaded.$schema).toBe(
      "./docs/planning/schemas/aaa-config.schema.json",
    );
  });

  test("handles empty config file (valid empty object)", () => {
    const configPath = join(temporaryDirectory, CONFIG_FILENAME);
    writeFileSync(configPath, "{}");

    const loaded = loadAaaConfig(configPath);

    // Should return all defaults
    expect(loaded.debug).toBe(DEFAULT_AAA_CONFIG.debug);
    expect(loaded.notify).toEqual(DEFAULT_AAA_CONFIG.notify);
    expect(loaded.ralph).toEqual(DEFAULT_AAA_CONFIG.ralph);
  });

  test("handles config with only some sections", () => {
    const configPath = join(temporaryDirectory, CONFIG_FILENAME);
    const partialConfig: Partial<AaaConfig> = {
      research: { outputDir: "custom/research" },
    };
    writeFileSync(configPath, JSON.stringify(partialConfig, null, 2));

    const loaded = loadAaaConfig(configPath);

    // Custom research
    expect(loaded.research?.outputDir).toBe("custom/research");

    // Default values for other sections
    expect(loaded.notify).toEqual(DEFAULT_AAA_CONFIG.notify);
    expect(loaded.ralph).toEqual(DEFAULT_AAA_CONFIG.ralph);
    expect(loaded.review).toEqual(DEFAULT_AAA_CONFIG.review);
  });

  test("handles notify.events map", () => {
    const configPath = join(temporaryDirectory, CONFIG_FILENAME);
    const customConfig: Partial<AaaConfig> = {
      notify: {
        events: {
          "claude:stop": { priority: "default" },
          "ralph:milestoneComplete": {
            priority: "high",
            tags: ["tada"],
            topic: "builds",
          },
        },
      },
    };
    writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

    const loaded = loadAaaConfig(configPath);

    expect(loaded.notify?.events?.["ralph:milestoneComplete"]).toEqual({
      priority: "high",
      tags: ["tada"],
      topic: "builds",
    });
    expect(loaded.notify?.events?.["claude:stop"]).toEqual({
      priority: "default",
    });
  });

  test("requires complete quietHours when provided", () => {
    const configPath = join(temporaryDirectory, CONFIG_FILENAME);
    // When quietHours is provided, all fields must be present per Zod schema
    const customConfig = {
      notify: { quietHours: { enabled: true, endHour: 7, startHour: 23 } },
    };
    writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

    const loaded = loadAaaConfig(configPath);

    expect(loaded.notify?.quietHours?.enabled).toBe(true);
    expect(loaded.notify?.quietHours?.startHour).toBe(23);
    expect(loaded.notify?.quietHours?.endHour).toBe(7);
  });

  test("uses default quietHours when not provided", () => {
    const configPath = join(temporaryDirectory, CONFIG_FILENAME);
    // When quietHours is omitted entirely, defaults are used
    const customConfig = {
      notify: {
        defaultTopic: "my-topic",
        // quietHours omitted - should get defaults
      },
    };
    writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

    const loaded = loadAaaConfig(configPath);

    expect(loaded.notify?.quietHours?.enabled).toBe(
      DEFAULT_AAA_CONFIG.notify?.quietHours?.enabled,
    );
    expect(loaded.notify?.quietHours?.startHour).toBe(
      DEFAULT_AAA_CONFIG.notify?.quietHours?.startHour,
    );
    expect(loaded.notify?.quietHours?.endHour).toBe(
      DEFAULT_AAA_CONFIG.notify?.quietHours?.endHour,
    );
  });
});

describe("CONFIG_FILENAME", () => {
  test("exports correct filename", () => {
    expect(CONFIG_FILENAME).toBe("aaa.config.json");
  });
});

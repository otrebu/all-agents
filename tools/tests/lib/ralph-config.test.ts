/**
 * Tests for Ralph config loading from unified aaa.config.json
 */
import type { Mock } from "bun:test";

import {
  DEFAULT_CONFIG,
  getMilestonesBasePath,
  listAvailableMilestones,
  loadRalphConfig,
  resolveMilestonePath,
} from "@tools/commands/ralph/config";
import * as unifiedConfig from "@tools/lib/config/loader";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("loadRalphConfig", () => {
  describe("with unified config", () => {
    let loadAaaConfigSpy: Mock<typeof unifiedConfig.loadAaaConfig> | null =
      null;

    afterEach(() => {
      loadAaaConfigSpy?.mockRestore();
    });

    test("calls loadAaaConfig and extracts ralph section", () => {
      loadAaaConfigSpy = spyOn(unifiedConfig, "loadAaaConfig").mockReturnValue({
        debug: false,
        notify: { enabled: true },
        ralph: {
          hooks: {
            onIterationComplete: ["log"],
            onMaxIterationsExceeded: ["log", "notify"],
            onMilestoneComplete: ["log"],
            onSubtaskComplete: ["log"],
            onValidationFail: ["log"],
          },
          selfImprovement: { mode: "autofix" },
        },
        research: {},
        review: {},
      });

      const config = loadRalphConfig();

      expect(loadAaaConfigSpy).toHaveBeenCalled();
      expect(config.hooks).toBeDefined();
      expect(config.hooks?.onMaxIterationsExceeded).toEqual(["log", "notify"]);
      expect(config.selfImprovement?.mode).toBe("autofix");
    });

    test("uses defaults when ralph section is undefined", () => {
      loadAaaConfigSpy = spyOn(unifiedConfig, "loadAaaConfig").mockReturnValue({
        debug: false,
        notify: { enabled: true },
        ralph: undefined,
        research: {},
        review: {},
      });

      const config = loadRalphConfig();

      expect(config.hooks).toBeDefined();
      expect(config.selfImprovement?.mode).toBe("suggest");
    });

    test("uses default selfImprovement mode when not specified", () => {
      loadAaaConfigSpy = spyOn(unifiedConfig, "loadAaaConfig").mockReturnValue({
        debug: false,
        notify: { enabled: true },
        ralph: {
          hooks: { onIterationComplete: ["log"] },
          selfImprovement: undefined,
        },
        research: {},
        review: {},
      });

      const config = loadRalphConfig();

      expect(config.selfImprovement?.mode).toBe("suggest");
    });

    test("extracts all hook types correctly", () => {
      loadAaaConfigSpy = spyOn(unifiedConfig, "loadAaaConfig").mockReturnValue({
        debug: false,
        notify: { enabled: true },
        ralph: {
          hooks: {
            onIterationComplete: ["log"],
            onMaxIterationsExceeded: ["log", "notify", "pause"],
            onMilestoneComplete: ["log", "notify"],
            onSubtaskComplete: ["notify"],
            onValidationFail: ["log"],
          },
        },
        research: {},
        review: {},
      });

      const config = loadRalphConfig();

      expect(config.hooks?.onIterationComplete).toEqual(["log"]);
      expect(config.hooks?.onMaxIterationsExceeded).toEqual([
        "log",
        "notify",
        "pause",
      ]);
      expect(config.hooks?.onMilestoneComplete).toEqual(["log", "notify"]);
      expect(config.hooks?.onSubtaskComplete).toEqual(["notify"]);
      expect(config.hooks?.onValidationFail).toEqual(["log"]);
    });
  });

  describe("legacy config loading (with configPath parameter)", () => {
    let temporaryDirectory = "";

    beforeEach(() => {
      temporaryDirectory = join(tmpdir(), `ralph-config-test-${Date.now()}`);
      mkdirSync(temporaryDirectory, { recursive: true });
    });

    afterEach(() => {
      if (existsSync(temporaryDirectory)) {
        rmSync(temporaryDirectory, { recursive: true });
      }
    });

    test("uses legacy loader when configPath is provided", () => {
      const configPath = join(temporaryDirectory, "ralph.config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          hooks: { onIterationComplete: ["notify"] },
          selfImprovement: { mode: "off" },
        }),
      );

      const config = loadRalphConfig(configPath);

      expect(config.hooks?.onIterationComplete).toEqual(["notify"]);
      expect(config.selfImprovement?.mode).toBe("off");
    });

    test("returns defaults when legacy config file does not exist", () => {
      const configPath = join(temporaryDirectory, "nonexistent.json");

      const config = loadRalphConfig(configPath);

      expect(config.hooks).toEqual(DEFAULT_CONFIG.hooks);
      expect(config.selfImprovement?.mode).toBe("suggest");
    });

    test("merges legacy config with defaults", () => {
      const configPath = join(temporaryDirectory, "ralph.config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          hooks: {
            onIterationComplete: ["notify"],
            // Other hooks not specified - should get defaults
          },
        }),
      );

      const config = loadRalphConfig(configPath);

      expect(config.hooks?.onIterationComplete).toEqual(["notify"]);
      // These should come from defaults
      expect(config.hooks?.onMaxIterationsExceeded).toEqual([
        "log",
        "notify",
        "pause",
      ]);
      expect(config.hooks?.onMilestoneComplete).toEqual(["log", "notify"]);
      expect(config.selfImprovement?.mode).toBe("suggest");
    });

    test("throws on invalid JSON in legacy config", () => {
      const configPath = join(temporaryDirectory, "ralph.config.json");
      writeFileSync(configPath, "not valid json {{{");

      expect(() => loadRalphConfig(configPath)).toThrow(
        "Failed to parse ralph.config.json",
      );
    });
  });
});

describe("resolveMilestonePath", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(tmpdir(), `milestone-test-${Date.now()}`);
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true });
    }
  });

  test("returns absolute path unchanged when it exists", () => {
    // Use the temporary directory as an existing absolute path
    const result = resolveMilestonePath(temporaryDirectory);
    expect(result).toBe(temporaryDirectory);
  });

  test("throws for absolute path that does not exist", () => {
    const nonexistentPath = join(temporaryDirectory, "nonexistent-milestone");
    expect(() => resolveMilestonePath(nonexistentPath)).toThrow(
      "Milestone path not found",
    );
  });

  test("returns relative path unchanged when it exists", () => {
    // Use a known existing relative path (the milestones base itself)
    const basePath = getMilestonesBasePath();
    const result = resolveMilestonePath(basePath);
    expect(result).toBe(basePath);
  });

  test("resolves milestone name to full path", () => {
    // Use an existing milestone from the real project
    const basePath = getMilestonesBasePath();
    const result = resolveMilestonePath("001-ralph");
    expect(result).toBe(join(basePath, "001-ralph"));
  });

  test("resolves milestone name with emoji to full path", () => {
    // Test milestone with emoji (002-ralph-💪)
    const basePath = getMilestonesBasePath();
    const result = resolveMilestonePath("002-ralph-💪");
    expect(result).toBe(join(basePath, "002-ralph-💪"));
  });

  test("throws for nonexistent milestone name with available list", () => {
    expect(() => resolveMilestonePath("nonexistent-milestone")).toThrow(
      /Available milestones/,
    );
  });

  test("error message includes actual milestone names", () => {
    try {
      resolveMilestonePath("nonexistent-milestone");
      expect(true).toBe(false);
    } catch (error) {
      const { message } = error as Error;
      expect(message).toContain("Milestone not found: nonexistent-milestone");
      expect(message).toContain("Available milestones:");
      expect(message).toMatch(/001-ralph|002-ralph|003-ralph/);
    }
  });
});

describe("listAvailableMilestones", () => {
  test("returns array of milestone names", () => {
    const milestones = listAvailableMilestones();
    expect(Array.isArray(milestones)).toBe(true);
    expect(milestones.length).toBeGreaterThan(0);
  });

  test("excludes directories starting with underscore", () => {
    const milestones = listAvailableMilestones();
    const hasUnderscore = milestones.some((name) => name.startsWith("_"));
    expect(hasUnderscore).toBe(false);
  });

  test("returns sorted milestone names", () => {
    const milestones = listAvailableMilestones();
    const sorted = [...milestones].sort();
    expect(milestones).toEqual(sorted);
  });

  test("includes known milestones", () => {
    const milestones = listAvailableMilestones();
    // These should exist in the real project
    expect(milestones).toContain("001-ralph");
    expect(milestones).toContain("003-ralph-workflow");
  });
});

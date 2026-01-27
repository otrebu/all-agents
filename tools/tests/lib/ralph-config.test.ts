/**
 * Tests for Ralph config loading from unified aaa.config.json
 */
import type { Mock } from "bun:test";

import { DEFAULT_CONFIG, loadRalphConfig } from "@tools/commands/ralph/config";
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

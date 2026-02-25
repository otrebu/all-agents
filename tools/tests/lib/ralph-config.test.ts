/**
 * Tests for Ralph config loading from unified aaa.config.json
 */
import type { Mock } from "bun:test";

import {
  DEFAULT_CONFIG,
  deleteSubtaskFragments,
  getExistingTaskReferences,
  getMilestonesBasePath,
  listAvailableMilestones,
  loadRalphConfig,
  mergeSubtaskFragments,
  resolveMilestonePath,
} from "@tools/commands/ralph/config";
import * as unifiedConfig from "@tools/lib/config/loader";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
          lightweightModel: "claude-3-5-haiku-latest",
          model: "claude-sonnet-4",
          provider: "claude",
          selfImprovement: { mode: "autofix" },
        },
        research: {},
        review: {},
      });

      const config = loadRalphConfig();

      expect(loadAaaConfigSpy).toHaveBeenCalled();
      expect(config.hooks).toBeDefined();
      expect(config.hooks?.onMaxIterationsExceeded).toEqual(["log", "notify"]);
      expect(config.provider).toBe("claude");
      expect(config.model).toBe("claude-sonnet-4");
      expect(config.lightweightModel).toBe("claude-3-5-haiku-latest");
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
      expect(config.provider).toBeUndefined();
      expect(config.model).toBeUndefined();
      expect(config.lightweightModel).toBeUndefined();
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

describe("getExistingTaskReferences", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(tmpdir(), `task-refs-test-${Date.now()}`);
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true });
    }
  });

  test("returns empty Set when file does not exist", () => {
    const nonexistentPath = join(temporaryDirectory, "nonexistent.json");
    const result = getExistingTaskReferences(nonexistentPath);
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  test("throws on invalid JSON", () => {
    const invalidPath = join(temporaryDirectory, "invalid.json");
    writeFileSync(invalidPath, "not valid json {{{");
    expect(() => getExistingTaskReferences(invalidPath)).toThrow(
      "Failed to parse subtasks file",
    );
  });

  test("throws when subtasks is not an array", () => {
    const invalidPath = join(temporaryDirectory, "invalid-format.json");
    writeFileSync(invalidPath, JSON.stringify({ subtasks: "not an array" }));
    expect(() => getExistingTaskReferences(invalidPath)).toThrow(
      "Invalid subtasks file format",
    );
  });

  test("throws explicit error for legacy top-level array format", () => {
    const legacyPath = join(temporaryDirectory, "legacy-array.json");
    writeFileSync(legacyPath, JSON.stringify([{ done: false, id: "SUB-001" }]));
    expect(() => getExistingTaskReferences(legacyPath)).toThrow(
      "top-level array (legacy format)",
    );
  });

  test("returns Set of taskRefs from pending subtasks only", () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    writeFileSync(
      subtasksPath,
      JSON.stringify({
        subtasks: [
          { done: false, id: "SUB-001", taskRef: "TASK-001" },
          { done: true, id: "SUB-002", taskRef: "TASK-002" },
          { done: false, id: "SUB-003", taskRef: "TASK-001" },
          { done: false, id: "SUB-004", taskRef: "TASK-003" },
        ],
      }),
    );
    const result = getExistingTaskReferences(subtasksPath);
    expect(result.size).toBe(2);
    expect(result.has("TASK-001")).toBe(true);
    expect(result.has("TASK-003")).toBe(true);
    expect(result.has("TASK-002")).toBe(false);
  });

  test("returns unique taskRefs (dedupes)", () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    writeFileSync(
      subtasksPath,
      JSON.stringify({
        subtasks: [
          { done: false, id: "SUB-001", taskRef: "TASK-001" },
          { done: false, id: "SUB-002", taskRef: "TASK-001" },
          { done: false, id: "SUB-003", taskRef: "TASK-001" },
        ],
      }),
    );
    const result = getExistingTaskReferences(subtasksPath);
    expect(result.size).toBe(1);
    expect(result.has("TASK-001")).toBe(true);
  });

  test("handles empty subtasks array", () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    writeFileSync(subtasksPath, JSON.stringify({ subtasks: [] }));
    const result = getExistingTaskReferences(subtasksPath);
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  test("handles subtasks without taskRef field", () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    writeFileSync(
      subtasksPath,
      JSON.stringify({
        subtasks: [
          { done: false, id: "SUB-001" },
          { done: false, id: "SUB-002", taskRef: "TASK-001" },
        ],
      }),
    );
    const result = getExistingTaskReferences(subtasksPath);
    expect(result.size).toBe(1);
    expect(result.has("TASK-001")).toBe(true);
  });
});

describe("mergeSubtaskFragments", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(tmpdir(), `merge-fragments-test-${Date.now()}`);
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("returns zero counts when no fragment files are present", () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");

    const result = mergeSubtaskFragments(temporaryDirectory, subtasksPath);

    expect(result).toEqual({ cleaned: 0, fragments: 0, merged: 0 });
    expect(existsSync(subtasksPath)).toBe(false);
  });

  test("merges fragment files into subtasks.json and cleans up fragments", () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    const fragmentOnePath = join(temporaryDirectory, ".subtasks-task-001.json");
    const fragmentTwoPath = join(temporaryDirectory, ".subtasks-task-002.json");

    writeFileSync(
      fragmentOnePath,
      JSON.stringify([
        {
          acceptanceCriteria: ["schema exists"],
          description: "Create schema",
          done: false,
          filesToRead: ["packages/data/prisma/schema.prisma"],
          id: "SUB-001",
          taskRef: "TASK-001",
          title: "Create schema",
        },
        {
          acceptanceCriteria: ["tests pass"],
          description: "Add unit tests",
          done: false,
          filesToRead: ["packages/data/src/schemas/scheduled-report.ts"],
          id: "SUB-002",
          taskRef: "TASK-001",
          title: "Add tests",
        },
      ]),
    );

    writeFileSync(
      fragmentTwoPath,
      JSON.stringify([
        {
          acceptanceCriteria: ["route returns data"],
          description: "Implement endpoint",
          done: false,
          filesToRead: ["apps/api/src/procedures/reports/scheduled.ts"],
          id: "SUB-003",
          taskRef: "TASK-002",
          title: "Implement endpoint",
        },
      ]),
    );

    const result = mergeSubtaskFragments(temporaryDirectory, subtasksPath, {
      milestoneRef: "report-scheduling-email",
      scope: "milestone",
    });

    expect(result).toEqual({ cleaned: 2, fragments: 2, merged: 3 });
    expect(existsSync(fragmentOnePath)).toBe(false);
    expect(existsSync(fragmentTwoPath)).toBe(false);

    const subtasksFile = JSON.parse(readFileSync(subtasksPath, "utf8")) as {
      metadata?: { milestoneRef?: string; scope?: string };
      subtasks: Array<{ id: string }>;
    };
    expect(subtasksFile.metadata?.scope).toBe("milestone");
    expect(subtasksFile.metadata?.milestoneRef).toBe("report-scheduling-email");
    expect(subtasksFile.subtasks.map((subtask) => subtask.id)).toEqual([
      "SUB-001",
      "SUB-002",
      "SUB-003",
    ]);
  });

  test("throws on malformed fragment JSON and keeps fragments for debugging", () => {
    const subtasksPath = join(temporaryDirectory, "subtasks.json");
    const fragmentPath = join(temporaryDirectory, ".subtasks-task-001.json");
    writeFileSync(fragmentPath, "not-json");

    expect(() =>
      mergeSubtaskFragments(temporaryDirectory, subtasksPath),
    ).toThrow("Failed to parse subtask fragment");

    expect(existsSync(fragmentPath)).toBe(true);
    expect(existsSync(subtasksPath)).toBe(false);
  });
});

describe("deleteSubtaskFragments", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(tmpdir(), `cleanup-fragments-test-${Date.now()}`);
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("deletes fragment files and returns count", () => {
    writeFileSync(
      join(temporaryDirectory, ".subtasks-task-001.json"),
      JSON.stringify([{ done: false, id: "SUB-001" }]),
    );
    writeFileSync(
      join(temporaryDirectory, ".subtasks-task-002.json"),
      JSON.stringify([{ done: false, id: "SUB-002" }]),
    );

    const cleaned = deleteSubtaskFragments(temporaryDirectory);

    expect(cleaned).toBe(2);
    expect(
      existsSync(join(temporaryDirectory, ".subtasks-task-001.json")),
    ).toBe(false);
    expect(
      existsSync(join(temporaryDirectory, ".subtasks-task-002.json")),
    ).toBe(false);
  });

  test("returns 0 when no fragment files exist", () => {
    const cleaned = deleteSubtaskFragments(temporaryDirectory);
    expect(cleaned).toBe(0);
  });

  test("returns 0 for non-existent directory", () => {
    const cleaned = deleteSubtaskFragments(join(temporaryDirectory, "nope"));
    expect(cleaned).toBe(0);
  });

  test("ignores non-fragment files", () => {
    writeFileSync(
      join(temporaryDirectory, ".subtasks-task-001.json"),
      JSON.stringify([{ done: false, id: "SUB-001" }]),
    );
    writeFileSync(
      join(temporaryDirectory, "subtasks.json"),
      JSON.stringify({ subtasks: [] }),
    );
    writeFileSync(join(temporaryDirectory, "README.md"), "# Hello");

    const cleaned = deleteSubtaskFragments(temporaryDirectory);

    expect(cleaned).toBe(1);
    expect(
      existsSync(join(temporaryDirectory, ".subtasks-task-001.json")),
    ).toBe(false);
    expect(existsSync(join(temporaryDirectory, "subtasks.json"))).toBe(true);
    expect(existsSync(join(temporaryDirectory, "README.md"))).toBe(true);
  });
});

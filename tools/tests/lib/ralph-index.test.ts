import * as ralphConfig from "@tools/commands/ralph/config";
import {
  parseCliSubtaskDraft,
  parseCliSubtaskDrafts,
  readQueueProposalFromFile,
  resolveMilestoneFromOptions,
  validateApprovalFlags,
} from "@tools/commands/ralph/index";
import { describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("validateApprovalFlags", () => {
  test("returns void when neither flag is set", () => {
    expect(() => {
      validateApprovalFlags(false, false);
    }).not.toThrow();
  });

  test("returns void when only one flag is set", () => {
    expect(() => {
      validateApprovalFlags(true, false);
    }).not.toThrow();
    expect(() => {
      validateApprovalFlags(false, true);
    }).not.toThrow();
  });

  test("prints error and exits when both flags are true", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit:${code}`);
    });

    try {
      expect(() => {
        validateApprovalFlags(true, true);
      }).toThrow("process.exit:1");
      expect(errorSpy).toHaveBeenCalledWith(
        "Cannot use --force and --review together",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      errorSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });
});

describe("resolveMilestoneFromOptions", () => {
  test("--milestone takes priority over --output-dir", () => {
    const resolvedMilestonePath = resolveMilestoneFromOptions(
      "005-consolidate-simplify",
      undefined,
      "docs/planning/milestones/006-cascade-mode-for-good",
    );

    expect(resolvedMilestonePath).toBeDefined();
    expect(resolvedMilestonePath).toContain(
      path.join("docs", "planning", "milestones", "005-consolidate-simplify"),
    );
  });

  test("--story takes priority over --output-dir", () => {
    const resolvedMilestonePath = resolveMilestoneFromOptions(
      undefined,
      "001-provider-foundation",
      "docs/planning/milestones/006-cascade-mode-for-good",
    );

    expect(resolvedMilestonePath).toBeDefined();
    expect(resolvedMilestonePath).toContain(
      path.join("docs", "planning", "milestones", "004-MULTI-CLI"),
    );
  });

  test("extracts milestone root from --output-dir milestone path", () => {
    const resolvedMilestonePath = resolveMilestoneFromOptions(
      undefined,
      undefined,
      path.join(
        "docs",
        "planning",
        "milestones",
        "006-cascade-mode-for-good",
        "feedback",
      ),
    );

    expect(resolvedMilestonePath).toBeDefined();
    expect(resolvedMilestonePath).toContain(
      path.join("docs", "planning", "milestones", "006-cascade-mode-for-good"),
    );
  });

  test("returns undefined when --output-dir is not a milestone path", () => {
    const resolvedMilestonePath = resolveMilestoneFromOptions(
      undefined,
      undefined,
      "docs/planning/feedback",
    );

    expect(resolvedMilestonePath).toBeUndefined();
  });

  test("returns undefined when --milestone, --story, and --output-dir are all undefined", () => {
    const resolvedMilestonePath = resolveMilestoneFromOptions(
      undefined,
      undefined,
      void 0,
    );

    expect(resolvedMilestonePath).toBeUndefined();
  });

  test("resolves planning log path from output-dir milestone instead of _orphan", () => {
    const getPlanningLogPathSpy = spyOn(ralphConfig, "getPlanningLogPath");
    const resolvedMilestonePath = resolveMilestoneFromOptions(
      undefined,
      undefined,
      path.join(
        "docs",
        "planning",
        "milestones",
        "006-cascade-mode-for-good",
        "feedback",
      ),
    );

    expect(resolvedMilestonePath).toBeDefined();
    expect(resolvedMilestonePath).toContain(
      path.join("docs", "planning", "milestones", "006-cascade-mode-for-good"),
    );

    if (resolvedMilestonePath === undefined || resolvedMilestonePath === null) {
      throw new Error("Expected milestone path to resolve");
    }

    const planningLogPath = ralphConfig.getPlanningLogPath(
      resolvedMilestonePath,
    );
    expect(getPlanningLogPathSpy).toHaveBeenCalledWith(resolvedMilestonePath);
    expect(getPlanningLogPathSpy).not.toHaveBeenCalledWith(undefined);
    const utcDate = new Date().toISOString().split("T")[0];
    expect(planningLogPath).toBe(
      path.join(resolvedMilestonePath, "logs", `${utcDate}.jsonl`),
    );
    expect(planningLogPath).not.toContain("_orphan");
  });
});

describe("plan cascade preview", () => {
  test("prints workflow preview for non-dry-run cascade runs", () => {
    const source = readFileSync(
      path.join(import.meta.dir, "../../src/commands/ralph/index.ts"),
      "utf8",
    );

    const commands = ["roadmap", "stories", "tasks", "subtasks"];

    for (const commandName of commands) {
      const commandStart = source.indexOf(`new Command("${commandName}")`);
      expect(commandStart).toBeGreaterThan(-1);
      const nextCommandStart = source.indexOf(
        'new Command("',
        commandStart + 1,
      );
      const commandBlock =
        nextCommandStart === -1
          ? source.slice(commandStart)
          : source.slice(commandStart, nextCommandStart);

      expect(commandBlock).toContain('message: "Workflow preview"');
      expect(commandBlock).toContain(
        'printDryRunPlan(plan, { nextStep: "continue" });',
      );
    }
  });
});

describe("parseCliSubtaskDraft", () => {
  const validDraft = {
    acceptanceCriteria: ["criterion"],
    description: "Implement behavior",
    filesToRead: ["tools/src/commands/ralph/index.ts"],
    storyRef: "STORY-001",
    taskRef: "TASK-001",
    title: "Do thing",
  };

  test("throws when title is missing", () => {
    expect(() => {
      parseCliSubtaskDraft({ ...validDraft, title: undefined });
    }).toThrow("Subtask payload requires non-empty string field: title");
  });

  test("throws when description is missing", () => {
    expect(() => {
      parseCliSubtaskDraft({ ...validDraft, description: undefined });
    }).toThrow("Subtask payload requires non-empty string field: description");
  });

  test("throws when storyRef type is invalid", () => {
    expect(() => {
      parseCliSubtaskDraft({ ...validDraft, storyRef: 123 });
    }).toThrow("Subtask payload field storyRef must be string or null");
  });

  test("throws on null input", () => {
    expect(() => {
      parseCliSubtaskDraft(null);
    }).toThrow("Subtask payload entries must be JSON objects");
  });

  test("returns parsed draft for valid input", () => {
    expect(parseCliSubtaskDraft(validDraft)).toEqual(validDraft);
  });
});

describe("parseCliSubtaskDrafts", () => {
  test("throws with parse error details on malformed JSON", () => {
    expect(() => {
      parseCliSubtaskDrafts("{");
    }).toThrow("Failed to parse subtask JSON:");
  });

  test("throws when payload is an empty array", () => {
    expect(() => {
      parseCliSubtaskDrafts("[]");
    }).toThrow("Subtask payload must include at least one subtask entry");
  });

  test("wraps single object payload into one draft", () => {
    const drafts = parseCliSubtaskDrafts(
      JSON.stringify({
        acceptanceCriteria: ["criterion"],
        description: "Implement behavior",
        filesToRead: ["tools/src/commands/ralph/index.ts"],
        taskRef: "TASK-001",
        title: "Do thing",
      }),
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.title).toBe("Do thing");
  });

  test("unwraps object payload with subtasks array", () => {
    const drafts = parseCliSubtaskDrafts(
      JSON.stringify({
        subtasks: [
          {
            acceptanceCriteria: ["criterion"],
            description: "Implement behavior",
            filesToRead: ["tools/src/commands/ralph/index.ts"],
            taskRef: "TASK-001",
            title: "Do thing",
          },
        ],
      }),
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.taskRef).toBe("TASK-001");
  });
});

describe("readQueueProposalFromFile", () => {
  test("throws when proposal file is missing", () => {
    expect(() => {
      readQueueProposalFromFile(
        path.join(tmpdir(), `missing-${Date.now()}.json`),
      );
    }).toThrow(/ENOENT|no such file or directory/i);
  });

  test("throws when proposal JSON is invalid", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "ralph-index-test-"));
    try {
      const proposalPath = path.join(directory, "proposal.json");
      writeFileSync(proposalPath, "{");

      expect(() => {
        readQueueProposalFromFile(proposalPath);
      }).toThrow("Failed to parse proposal JSON:");
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  test("throws when operations field is missing", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "ralph-index-test-"));
    try {
      const proposalPath = path.join(directory, "proposal.json");
      writeFileSync(
        proposalPath,
        JSON.stringify({
          fingerprint: { hash: "abc" },
          source: "test",
          timestamp: "2026-02-10T00:00:00Z",
        }),
      );

      expect(() => {
        readQueueProposalFromFile(proposalPath);
      }).toThrow("Proposal requires operations array");
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  test("returns proposal for valid file", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "ralph-index-test-"));
    try {
      const proposalPath = path.join(directory, "proposal.json");
      writeFileSync(
        proposalPath,
        JSON.stringify({
          fingerprint: { hash: "abc" },
          operations: [{ id: "SUB-001", type: "remove" }],
          source: "test",
          timestamp: "2026-02-10T00:00:00Z",
        }),
      );

      expect(readQueueProposalFromFile(proposalPath)).toEqual({
        fingerprint: { hash: "abc" },
        operations: [{ id: "SUB-001", type: "remove" }],
        source: "test",
        timestamp: "2026-02-10T00:00:00Z",
      });
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});

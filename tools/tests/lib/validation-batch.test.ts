import type { BatchValidationResult } from "@tools/commands/ralph/validation";
import type { Mock } from "bun:test";

import { getMilestoneLogPath } from "@tools/commands/ralph/config";
import * as hooks from "@tools/commands/ralph/hooks";
import * as summaryProvider from "@tools/commands/ralph/providers/summary";
import {
  computeFingerprint,
  type QueueProposal,
  type Subtask,
} from "@tools/commands/ralph/types";
import {
  getMilestoneFromPath,
  printValidationSummary,
  validateAllSubtasks,
  writeValidationProposalArtifact,
  writeValidationQueueApplyLogEntry,
} from "@tools/commands/ralph/validation";
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as readline from "node:readline";

function createSubtask(id: string): Subtask {
  return {
    acceptanceCriteria: ["AC-1"],
    description: "Batch validation orchestration",
    done: false,
    filesToRead: ["tools/src/commands/ralph/validation.ts"],
    id,
    taskRef: "TASK-020-validation-batch",
    title: `Subtask ${id}`,
  };
}

function createValidationFixture(): {
  cleanup: () => void;
  contextRoot: string;
  milestonePath: string;
  subtasksPath: string;
} {
  const rootDirectory = mkdtempSync(path.join(tmpdir(), "validation-batch-"));
  const contextRoot = path.join(rootDirectory, "repo");
  const milestonePath = path.join(
    rootDirectory,
    "docs/planning/milestones/003-ralph-workflow",
  );
  const promptPath = path.join(
    contextRoot,
    "context/workflows/ralph/building/pre-build-validation.md",
  );
  const subtasksPath = path.join(milestonePath, "subtasks.json");

  mkdirSync(path.dirname(promptPath), { recursive: true });
  mkdirSync(path.dirname(subtasksPath), { recursive: true });
  writeFileSync(promptPath, "Base validation prompt", "utf8");
  writeFileSync(subtasksPath, JSON.stringify({ subtasks: [] }), "utf8");

  return {
    cleanup: () => {
      rmSync(rootDirectory, { force: true, recursive: true });
    },
    contextRoot,
    milestonePath,
    subtasksPath,
  };
}

describe("validateAllSubtasks", () => {
  const stdinTtyDescriptor = Object.getOwnPropertyDescriptor(
    process.stdin,
    "isTTY",
  );
  const stdoutTtyDescriptor = Object.getOwnPropertyDescriptor(
    process.stdout,
    "isTTY",
  );

  let createInterfaceSpy: Mock<typeof readline.createInterface> | null = null;

  function restoreTtyState(): void {
    if (stdinTtyDescriptor !== undefined) {
      Object.defineProperty(process.stdin, "isTTY", stdinTtyDescriptor);
    }
    if (stdoutTtyDescriptor !== undefined) {
      Object.defineProperty(process.stdout, "isTTY", stdoutTtyDescriptor);
    }
  }

  afterEach(() => {
    createInterfaceSpy?.mockRestore();
    createInterfaceSpy = null;
    restoreTtyState();
  });

  test("returns success when all subtasks are aligned", async () => {
    const fixture = createValidationFixture();
    const invokeSpy = spyOn(
      summaryProvider,
      "invokeProviderSummary",
    ).mockResolvedValue('{"aligned": true}');
    const hookSpy = spyOn(hooks, "executeHook");
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    try {
      const result = await validateAllSubtasks(
        [createSubtask("SUB-413"), createSubtask("SUB-414")],
        {
          mode: "headless",
          provider: "claude",
          subtasksPath: fixture.subtasksPath,
        },
        fixture.milestonePath,
        fixture.contextRoot,
      );

      expect(result).toEqual({
        aligned: 2,
        skippedSubtasks: [],
        success: true,
        total: 2,
      });
      const logPath = getMilestoneLogPath(fixture.milestonePath);
      const logLines = readFileSync(logPath, "utf8").trim().split("\n");
      const parsedEntries = logLines.map(
        (line) =>
          JSON.parse(line) as { type?: string } & Record<string, unknown>,
      );
      const validationEntry = parsedEntries.find(
        (entry) => entry.type === "validation",
      );

      expect(validationEntry).toMatchObject({
        aligned: true,
        operationCount: 0,
        source: "validation",
      });
      expect(hookSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      hookSpy.mockRestore();
      invokeSpy.mockRestore();
      fixture.cleanup();
    }
  });

  test("counts supervised failure as aligned when user chooses continue", async () => {
    const fixture = createValidationFixture();
    const invokeSpy = spyOn(
      summaryProvider,
      "invokeProviderSummary",
    ).mockResolvedValue(
      '{"aligned": false, "issue_type": "too_broad", "reason": "Needs split"}',
    );
    const hookSpy = spyOn(hooks, "executeHook");
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      configurable: true,
      value: true,
    });

    /* eslint-disable promise/prefer-await-to-callbacks -- readline mock intentionally uses callbacks */
    createInterfaceSpy = spyOn(readline, "createInterface").mockReturnValue({
      close: () => {},
      on: () => undefined as unknown as readline.Interface,
      question: (
        _prompt: string,
        callback: (value: string) => void,
      ): readline.Interface => {
        callback("n");
        return undefined as unknown as readline.Interface;
      },
    } as unknown as readline.Interface);
    /* eslint-enable promise/prefer-await-to-callbacks */

    try {
      const result = await validateAllSubtasks(
        [createSubtask("SUB-411")],
        {
          mode: "supervised",
          provider: "claude",
          subtasksPath: fixture.subtasksPath,
        },
        fixture.milestonePath,
        fixture.contextRoot,
      );

      expect(result).toEqual({
        aligned: 1,
        skippedSubtasks: [],
        success: true,
        total: 1,
      });
      expect(hookSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      hookSpy.mockRestore();
      invokeSpy.mockRestore();
      fixture.cleanup();
    }
  });

  test("adds failed subtask to skippedSubtasks in supervised mode when user chooses skip", async () => {
    const fixture = createValidationFixture();
    const invokeSpy = spyOn(
      summaryProvider,
      "invokeProviderSummary",
    ).mockResolvedValue(
      '{"aligned": false, "issue_type": "scope_creep", "reason": "Expands beyond task"}',
    );
    const hookSpy = spyOn(hooks, "executeHook");
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      configurable: true,
      value: true,
    });

    /* eslint-disable promise/prefer-await-to-callbacks -- readline mock intentionally uses callbacks */
    createInterfaceSpy = spyOn(readline, "createInterface").mockReturnValue({
      close: () => {},
      on: () => undefined as unknown as readline.Interface,
      question: (
        _prompt: string,
        callback: (value: string) => void,
      ): readline.Interface => {
        callback("y");
        return undefined as unknown as readline.Interface;
      },
    } as unknown as readline.Interface);
    /* eslint-enable promise/prefer-await-to-callbacks */

    try {
      const result = await validateAllSubtasks(
        [createSubtask("SUB-415")],
        {
          mode: "supervised",
          provider: "claude",
          subtasksPath: fixture.subtasksPath,
        },
        fixture.milestonePath,
        fixture.contextRoot,
      );

      expect(result.aligned).toBe(0);
      expect(result.operations).toEqual([{ id: "SUB-415", type: "remove" }]);
      expect(result.success).toBe(false);
      expect(result.total).toBe(1);
      expect(result.skippedSubtasks).toHaveLength(1);

      const skippedSubtask = result.skippedSubtasks[0];
      expect(skippedSubtask?.issueType).toBe("scope_creep");
      expect(skippedSubtask?.reason).toBe("Expands beyond task");
      expect(skippedSubtask?.subtaskId).toBe("SUB-415");
      expect(skippedSubtask?.feedbackPath).toContain("feedback/");
      expect(existsSync(skippedSubtask?.feedbackPath ?? "")).toBe(true);
      expect(hookSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      hookSpy.mockRestore();
      invokeSpy.mockRestore();
      fixture.cleanup();
    }
  });

  test("handles headless failures with feedback file and hook execution", async () => {
    const fixture = createValidationFixture();
    const invokeSpy = spyOn(
      summaryProvider,
      "invokeProviderSummary",
    ).mockResolvedValue(
      '{"aligned": false, "issue_type": "unfaithful", "reason": "Diverges from parent"}',
    );
    const hookSpy = spyOn(hooks, "executeHook").mockResolvedValue({
      actionsExecuted: ["log"],
      errors: [],
      success: true,
    });
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    try {
      const result = await validateAllSubtasks(
        [createSubtask("SUB-412")],
        {
          mode: "headless",
          provider: "claude",
          subtasksPath: fixture.subtasksPath,
        },
        fixture.milestonePath,
        fixture.contextRoot,
      );

      expect(result.aligned).toBe(0);
      expect(result.operations).toEqual([{ id: "SUB-412", type: "remove" }]);
      expect(result.success).toBe(false);
      expect(result.total).toBe(1);
      expect(result.skippedSubtasks).toHaveLength(1);
      expect(result.skippedSubtasks[0]?.issueType).toBe("unfaithful");
      expect(result.skippedSubtasks[0]?.reason).toBe("Diverges from parent");
      expect(result.skippedSubtasks[0]?.subtaskId).toBe("SUB-412");
      expect(result.skippedSubtasks[0]?.feedbackPath).toContain("feedback/");
      expect(existsSync(result.skippedSubtasks[0]?.feedbackPath ?? "")).toBe(
        true,
      );

      expect(hookSpy).toHaveBeenCalledWith("onValidationFail", {
        message: "Subtask SUB-412 failed validation: Diverges from parent",
        milestone: "003-ralph-workflow",
        subtaskId: "SUB-412",
      });
    } finally {
      logSpy.mockRestore();
      hookSpy.mockRestore();
      invokeSpy.mockRestore();
      fixture.cleanup();
    }
  });
});

describe("printValidationSummary", () => {
  test("prints all-aligned message", () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    try {
      printValidationSummary(3, 3, []);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("All aligned"),
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  test("prints skipped summary with subtask IDs and formatted issue labels", () => {
    const skipped: BatchValidationResult["skippedSubtasks"] = [
      {
        feedbackPath: "/p",
        issueType: "scope_creep",
        reason: "drift",
        subtaskId: "SUB-001",
      },
      {
        feedbackPath: "/p2",
        issueType: "too_narrow",
        reason: "too specific",
        subtaskId: "SUB-002",
      },
    ];
    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    try {
      printValidationSummary(3, 1, skipped);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("2 skipped due to misalignment"),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("SUB-001 (Scope Creep)"),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("SUB-002 (Too Narrow)"),
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("/p"));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("/p2"));
    } finally {
      logSpy.mockRestore();
    }
  });
});

describe("getMilestoneFromPath", () => {
  test("returns basename from milestone path", () => {
    expect(getMilestoneFromPath("/path/to/003-ralph-workflow")).toBe(
      "003-ralph-workflow",
    );
  });
});

describe("validation queue event logging", () => {
  test("writes queue-proposal and queue-apply entries to milestone daily log", () => {
    const fixture = createValidationFixture();

    try {
      const proposal: QueueProposal = {
        fingerprint: computeFingerprint([]),
        operations: [{ id: "SUB-001", type: "remove" }],
        source: "validation",
        timestamp: "2026-02-10T00:00:00Z",
      };
      writeValidationProposalArtifact(fixture.milestonePath, proposal, {
        aligned: 0,
        skipped: 1,
        total: 1,
      });
      writeValidationQueueApplyLogEntry(fixture.milestonePath, {
        applied: true,
        fingerprints: { after: "after-hash", before: "before-hash" },
        operationCount: 1,
        source: "validation",
        summary: "Validation proposal applied",
      });

      const logPath = getMilestoneLogPath(fixture.milestonePath);
      const parsedEntries = readFileSync(logPath, "utf8")
        .trim()
        .split("\n")
        .map(
          (line) =>
            JSON.parse(line) as { type?: string } & Record<string, unknown>,
        );

      const queueProposal = parsedEntries.find(
        (entry) => entry.type === "queue-proposal",
      );
      const queueApply = parsedEntries.find(
        (entry) => entry.type === "queue-apply",
      );

      expect(queueProposal).toMatchObject({
        operationCount: 1,
        source: "validation",
      });
      expect(typeof queueProposal?.summary).toBe("string");
      expect(String(queueProposal?.summary)).toContain(
        "Validation proposal generated",
      );
      expect(queueApply).toMatchObject({
        afterFingerprint: { hash: "after-hash" },
        applied: true,
        beforeFingerprint: { hash: "before-hash" },
        operationCount: 1,
        source: "validation",
      });
    } finally {
      fixture.cleanup();
    }
  });
});

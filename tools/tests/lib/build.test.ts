import {
  buildAssignedSubtaskJqSnippet,
  buildIterationContext,
  getSubtaskQueueStats,
  getSubtasksSizeGuidanceLines,
  resolveApprovalForValidationProposal,
  resolveValidationProposalMode,
} from "@tools/commands/ralph/build";
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as readline from "node:readline";

describe("getSubtaskQueueStats", () => {
  test("returns pending/completed totals", () => {
    const stats = getSubtaskQueueStats([
      {
        acceptanceCriteria: [],
        description: "done",
        done: true,
        filesToRead: [],
        id: "SUB-001",
        taskRef: "TASK-001",
        title: "done item",
      },
      {
        acceptanceCriteria: [],
        description: "pending",
        done: false,
        filesToRead: [],
        id: "SUB-002",
        taskRef: "TASK-001",
        title: "pending item",
      },
    ]);

    expect(stats).toEqual({ completed: 1, pending: 1, total: 2 });
  });
});

describe("buildAssignedSubtaskJqSnippet", () => {
  test("generates concrete commands with subtasks object path", () => {
    const snippet = buildAssignedSubtaskJqSnippet(
      "SUB-200",
      "/tmp/my queue/subtasks.json",
    );

    expect(snippet).toContain("--arg id 'SUB-200'");
    expect(snippet).toContain(
      ".subtasks[] | select(.id==$id and .done==false)",
    );
    expect(snippet).toContain(".subtasks[] | select(.id==$id and .done==true)");
    expect(snippet).toContain("mv '/tmp/my queue/subtasks.json.tmp'");
  });
});

describe("buildIterationContext", () => {
  test("includes canonical assignment payload fields", () => {
    const context = buildIterationContext(
      {
        acceptanceCriteria: ["criterion"],
        description: "Implement context sharing",
        done: false,
        filesToRead: ["tools/src/commands/ralph/build.ts"],
        id: "SUB-007",
        taskRef: "TASK-007",
        title: "Unify iteration context builder",
      },
      "/tmp/subtasks.json",
      "/tmp/PROGRESS.md",
    );

    expect(context).toContain("Assigned subtask:");
    expect(context).toContain('"id": "SUB-007"');
    expect(context).toContain("Subtasks file path: /tmp/subtasks.json");
    expect(context).toContain("Progress log path: /tmp/PROGRESS.md");
    expect(context).toContain(
      "After completing the assigned subtask (SUB-007):",
    );
  });

  test("is consumed by both headless and supervised call sites", () => {
    const source = readFileSync(
      path.join(import.meta.dir, "../../src/commands/ralph/build.ts"),
      "utf8",
    );

    expect(source).toContain("const extraContext = buildIterationContext(");
    expect(source).toContain("const iterationContext = buildIterationContext(");
    expect(source).not.toContain(
      "context: `Work ONLY on the assigned subtask below.",
    );
  });

  test("passes the same assignment payload inputs at both call sites", () => {
    const source = readFileSync(
      path.join(import.meta.dir, "../../src/commands/ralph/build.ts"),
      "utf8",
    );

    const headlessCall =
      /const extraContext = buildIterationContext\(\s*currentSubtask,\s*subtasksPath,\s*progressPath,\s*\);/m;
    const supervisedCall =
      /const iterationContext = buildIterationContext\(\s*currentSubtask,\s*subtasksPath,\s*progressPath,\s*\);/m;

    expect(headlessCall.test(source)).toBe(true);
    expect(supervisedCall.test(source)).toBe(true);
  });
});

describe("getSubtasksSizeGuidanceLines", () => {
  test("shows hard-limit warning when queue has pending work", () => {
    const lines = getSubtasksSizeGuidanceLines({
      queueStats: { completed: 4, pending: 2, total: 6 },
      sizeCheck: { exceeded: true, hardLimitExceeded: true, tokens: 39_000 },
      subtasksPath: "/repo/subtasks.json",
    });

    const messages = lines.map((line) => line.message);
    expect(messages.some((m) => m.includes("archive subtasks"))).toBe(true);
    expect(
      messages.some((m) =>
        m.includes("Provider invocation may not be able to update this file"),
      ),
    ).toBe(true);
  });

  test("suppresses provider hard-limit warning when queue is already complete", () => {
    const lines = getSubtasksSizeGuidanceLines({
      queueStats: { completed: 12, pending: 0, total: 12 },
      sizeCheck: { exceeded: true, hardLimitExceeded: true, tokens: 40_000 },
      subtasksPath: "/repo/subtasks.json",
    });

    const messages = lines.map((line) => line.message);
    expect(
      messages.some((m) => m.includes("Queue status: 12 total, 0 pending")),
    ).toBe(true);
    expect(
      messages.some((m) =>
        m.includes("Provider invocation may not be able to update this file"),
      ),
    ).toBe(false);
  });

  test("handles large completed queues (50+) with pending=0 gracefully", () => {
    const lines = getSubtasksSizeGuidanceLines({
      queueStats: { completed: 55, pending: 0, total: 55 },
      sizeCheck: { exceeded: true, hardLimitExceeded: true, tokens: 42_000 },
      subtasksPath: "/repo/subtasks.json",
    });

    const messages = lines.map((line) => line.message);
    expect(
      messages.some((m) => m.includes("Queue status: 55 total, 0 pending")),
    ).toBe(true);
    expect(messages.some((m) => m.includes("archive subtasks"))).toBe(true);
    expect(
      messages.some((m) =>
        m.includes("Provider invocation may not be able to update this file"),
      ),
    ).toBe(false);
  });
});

describe("resolveValidationProposalMode", () => {
  test("uses force flag to auto-apply in supervised mode", () => {
    const mode = resolveValidationProposalMode({
      mode: "supervised",
      shouldForceProposalApply: true,
      shouldRequireProposalReview: false,
    });

    expect(mode).toBe("auto-apply");
  });

  test("uses review flag to require approval", () => {
    const mode = resolveValidationProposalMode({
      mode: "headless",
      shouldForceProposalApply: false,
      shouldRequireProposalReview: true,
    });

    expect(mode).toBe("review");
  });

  test("defaults to prompt in supervised mode", () => {
    const mode = resolveValidationProposalMode({
      mode: "supervised",
      shouldForceProposalApply: false,
      shouldRequireProposalReview: false,
    });

    expect(mode).toBe("prompt");
  });

  test("defaults to auto-apply in headless mode", () => {
    const mode = resolveValidationProposalMode({
      mode: "headless",
      shouldForceProposalApply: false,
      shouldRequireProposalReview: false,
    });

    expect(mode).toBe("auto-apply");
  });
});

describe("resolveApprovalForValidationProposal", () => {
  const stdinTtyDescriptor = Object.getOwnPropertyDescriptor(
    process.stdin,
    "isTTY",
  );
  const stdoutTtyDescriptor = Object.getOwnPropertyDescriptor(
    process.stdout,
    "isTTY",
  );

  afterEach(() => {
    if (stdinTtyDescriptor !== undefined) {
      Object.defineProperty(process.stdin, "isTTY", stdinTtyDescriptor);
    }
    if (stdoutTtyDescriptor !== undefined) {
      Object.defineProperty(process.stdout, "isTTY", stdoutTtyDescriptor);
    }
  });

  test("force mode auto-applies without prompting", async () => {
    const proposalMode = resolveValidationProposalMode({
      mode: "supervised",
      shouldForceProposalApply: true,
      shouldRequireProposalReview: false,
    });
    const createInterfaceSpy = spyOn(readline, "createInterface");

    const isApproved = await resolveApprovalForValidationProposal({
      proposalMode,
      proposalPath: "/tmp/force-proposal.json",
    });

    expect(isApproved).toBe(true);
    expect(createInterfaceSpy).not.toHaveBeenCalled();
    createInterfaceSpy.mockRestore();
  });

  test("review mode stages proposal for explicit approval", async () => {
    const proposalMode = resolveValidationProposalMode({
      mode: "headless",
      shouldForceProposalApply: false,
      shouldRequireProposalReview: true,
    });
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      configurable: true,
      value: true,
    });

    let prompt = "";
    /* eslint-disable promise/prefer-await-to-callbacks -- readline mock intentionally uses callbacks */
    const createInterfaceSpy = spyOn(
      readline,
      "createInterface",
    ).mockReturnValue({
      close: mock(() => {}),
      on: mock(() => undefined as unknown as readline.Interface),
      question: (
        value: string,
        callback: (answer: string) => void,
      ): readline.Interface => {
        prompt = value;
        callback("yes");
        return undefined as unknown as readline.Interface;
      },
    } as unknown as readline.Interface);
    /* eslint-enable promise/prefer-await-to-callbacks */

    const isApproved = await resolveApprovalForValidationProposal({
      proposalMode,
      proposalPath: "/tmp/review-proposal.json",
    });

    expect(prompt).toContain("after review");
    expect(isApproved).toBe(true);
    expect(createInterfaceSpy).toHaveBeenCalledTimes(1);
    createInterfaceSpy.mockRestore();
  });

  test("default supervised mode prompts before applying", async () => {
    const proposalMode = resolveValidationProposalMode({
      mode: "supervised",
      shouldForceProposalApply: false,
      shouldRequireProposalReview: false,
    });
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      configurable: true,
      value: true,
    });

    let prompt = "";
    /* eslint-disable promise/prefer-await-to-callbacks -- readline mock intentionally uses callbacks */
    const createInterfaceSpy = spyOn(
      readline,
      "createInterface",
    ).mockReturnValue({
      close: mock(() => {}),
      on: mock(() => undefined as unknown as readline.Interface),
      question: (
        value: string,
        callback: (answer: string) => void,
      ): readline.Interface => {
        prompt = value;
        callback("n");
        return undefined as unknown as readline.Interface;
      },
    } as unknown as readline.Interface);
    /* eslint-enable promise/prefer-await-to-callbacks */

    const isApproved = await resolveApprovalForValidationProposal({
      proposalMode,
      proposalPath: "/tmp/default-supervised-proposal.json",
    });

    expect(prompt).toContain("before build starts");
    expect(isApproved).toBe(false);
    expect(createInterfaceSpy).toHaveBeenCalledTimes(1);
    createInterfaceSpy.mockRestore();
  });

  test("default headless mode auto-applies", async () => {
    const proposalMode = resolveValidationProposalMode({
      mode: "headless",
      shouldForceProposalApply: false,
      shouldRequireProposalReview: false,
    });
    const createInterfaceSpy = spyOn(readline, "createInterface");

    const isApproved = await resolveApprovalForValidationProposal({
      proposalMode,
      proposalPath: "/tmp/default-headless-proposal.json",
    });

    expect(isApproved).toBe(true);
    expect(createInterfaceSpy).not.toHaveBeenCalled();
    createInterfaceSpy.mockRestore();
  });
});

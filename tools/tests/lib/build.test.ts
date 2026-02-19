import {
  buildIterationContext,
  getSubtaskQueueStats,
  getSubtasksSizeGuidanceLines,
  resolveApprovalForValidationProposal,
  resolveValidationProposalMode,
  selectCompletionCommitHash,
} from "@tools/commands/ralph/build";
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
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

describe("selectCompletionCommitHash", () => {
  function runGit(cwd: string, args: Array<string>): string {
    const proc = Bun.spawnSync(["git", ...args], {
      cwd,
      stderr: "pipe",
      stdout: "pipe",
    });
    if (proc.exitCode !== 0) {
      throw new Error(Buffer.from(proc.stderr).toString("utf8"));
    }
    return Buffer.from(proc.stdout).toString("utf8").trim();
  }

  test("prefers implementation commit when HEAD is tracking-only", () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), "build-commit-select-"));

    try {
      runGit(repoRoot, ["init"]);
      runGit(repoRoot, ["config", "user.name", "Ralph Tester"]);
      runGit(repoRoot, ["config", "user.email", "ralph@example.com"]);

      writeFileSync(path.join(repoRoot, "README.md"), "# test\n", "utf8");
      runGit(repoRoot, ["add", "."]);
      runGit(repoRoot, ["commit", "-m", "chore: bootstrap"]);
      const commitBefore = runGit(repoRoot, ["rev-parse", "HEAD"]);

      mkdirSync(path.join(repoRoot, "src"), { recursive: true });
      writeFileSync(path.join(repoRoot, "src", "feature.ts"), "export {};\n");
      runGit(repoRoot, ["add", "."]);
      runGit(repoRoot, ["commit", "-m", "feat(SUB-123): implement feature"]);
      const implementationHash = runGit(repoRoot, ["rev-parse", "HEAD"]);

      mkdirSync(path.join(repoRoot, "docs/planning"), { recursive: true });
      writeFileSync(
        path.join(repoRoot, "docs/planning/PROGRESS.md"),
        "updated tracking\n",
        "utf8",
      );
      runGit(repoRoot, ["add", "."]);
      runGit(repoRoot, [
        "commit",
        "-m",
        "chore(SUB-123): update tracking files",
      ]);
      const commitAfter = runGit(repoRoot, ["rev-parse", "HEAD"]);

      const selected = selectCompletionCommitHash({
        commitAfter,
        commitBefore,
        projectRoot: repoRoot,
        subtaskId: "SUB-123",
      });

      expect(selected).toBe(implementationHash);
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("prefers subtask-tagged implementation commit over newer unrelated commits", () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), "build-commit-tagged-"));

    try {
      runGit(repoRoot, ["init"]);
      runGit(repoRoot, ["config", "user.name", "Ralph Tester"]);
      runGit(repoRoot, ["config", "user.email", "ralph@example.com"]);

      writeFileSync(path.join(repoRoot, "README.md"), "# test\n", "utf8");
      runGit(repoRoot, ["add", "."]);
      runGit(repoRoot, ["commit", "-m", "chore: bootstrap"]);
      const commitBefore = runGit(repoRoot, ["rev-parse", "HEAD"]);

      mkdirSync(path.join(repoRoot, "src"), { recursive: true });
      writeFileSync(path.join(repoRoot, "src", "auth.ts"), "export {};\n");
      runGit(repoRoot, ["add", "."]);
      runGit(repoRoot, ["commit", "-m", "feat(SUB-090): add auth helper"]);
      const taggedHash = runGit(repoRoot, ["rev-parse", "HEAD"]);

      writeFileSync(
        path.join(repoRoot, "src", "cleanup.ts"),
        "export const cleanup = true;\n",
        "utf8",
      );
      runGit(repoRoot, ["add", "."]);
      runGit(repoRoot, ["commit", "-m", "fix: unrelated cleanup"]);
      const commitAfter = runGit(repoRoot, ["rev-parse", "HEAD"]);

      const selected = selectCompletionCommitHash({
        commitAfter,
        commitBefore,
        projectRoot: repoRoot,
        subtaskId: "SUB-090",
      });

      expect(selected).toBe(taggedHash);
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
  });

  test("falls back to HEAD when every commit in range is tracking-only", () => {
    const repoRoot = mkdtempSync(
      path.join(tmpdir(), "build-commit-tracking-only-"),
    );

    try {
      runGit(repoRoot, ["init"]);
      runGit(repoRoot, ["config", "user.name", "Ralph Tester"]);
      runGit(repoRoot, ["config", "user.email", "ralph@example.com"]);

      writeFileSync(path.join(repoRoot, "README.md"), "# test\n", "utf8");
      runGit(repoRoot, ["add", "."]);
      runGit(repoRoot, ["commit", "-m", "chore: bootstrap"]);
      const commitBefore = runGit(repoRoot, ["rev-parse", "HEAD"]);

      mkdirSync(path.join(repoRoot, "docs/planning"), { recursive: true });
      writeFileSync(
        path.join(repoRoot, "docs/planning/PROGRESS.md"),
        "tracking only\n",
        "utf8",
      );
      runGit(repoRoot, ["add", "."]);
      runGit(repoRoot, ["commit", "-m", "chore(SUB-404): update tracking"]);
      const commitAfter = runGit(repoRoot, ["rev-parse", "HEAD"]);

      const selected = selectCompletionCommitHash({
        commitAfter,
        commitBefore,
        projectRoot: repoRoot,
        subtaskId: "SUB-404",
      });

      expect(selected).toBe(commitAfter);
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
    }
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
    expect(
      messages.some((m) =>
        m.includes("aaa ralph subtasks complete --milestone"),
      ),
    ).toBe(true);
    expect(messages.some((m) => m.includes("Use jq"))).toBe(false);
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

describe("signal handler ownership", () => {
  test("registers build signal handlers via owned references", () => {
    const source = readFileSync(
      path.join(import.meta.dir, "../../src/commands/ralph/build.ts"),
      "utf8",
    );

    expect(source).toContain("let registeredSigintHandler");
    expect(source).toContain("let registeredSigtermHandler");
    expect(source).toContain('process.removeListener("SIGINT"');
    expect(source).toContain('process.removeListener("SIGTERM"');
    expect(source).not.toContain('process.removeAllListeners("SIGINT")');
    expect(source).not.toContain('process.removeAllListeners("SIGTERM")');
    expect(source).toContain(
      "const unregisterSignalHandlers = registerSignalHandlers(() => {",
    );
    expect(source).toContain("unregisterSignalHandlers();");
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

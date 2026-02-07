import type { Mock } from "bun:test";

import {
  evaluateApproval,
  finalizeExitUnstaged,
  gitCheckpoint,
  prepareExitUnstaged,
  writeFeedbackFile,
} from "@tools/commands/ralph/approvals";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("approvals E2E - gitCheckpoint", () => {
  let execSyncSpy: Mock<typeof childProcess.execSync> | null = null;

  afterEach(() => {
    execSyncSpy?.mockRestore();
    execSyncSpy = null;
  });

  test("returns false when working tree is clean", () => {
    execSyncSpy = spyOn(childProcess, "execSync").mockImplementation(((
      command: string,
    ) => {
      if (command === "git status --porcelain") {
        return "";
      }
      return "";
    }) as unknown as typeof childProcess.execSync);

    const didCreate = gitCheckpoint("createStories");

    expect(didCreate).toBe(false);
    expect(execSyncSpy.mock.calls).toHaveLength(2);
    expect(execSyncSpy.mock.calls[0]?.[0]).toBe("git add -A");
    expect(execSyncSpy.mock.calls[1]?.[0]).toBe("git status --porcelain");
  });

  test("creates checkpoint commit when changes exist", () => {
    execSyncSpy = spyOn(childProcess, "execSync").mockImplementation(((
      command: string,
    ) => {
      if (command === "git status --porcelain") {
        return "M tools/src/commands/ralph/approvals.ts";
      }
      return "";
    }) as unknown as typeof childProcess.execSync);

    const didCreate = gitCheckpoint("createStories");

    expect(didCreate).toBe(true);
    expect(execSyncSpy.mock.calls[0]?.[0]).toBe("git add -A");
    expect(execSyncSpy.mock.calls[1]?.[0]).toBe("git status --porcelain");
    expect(execSyncSpy.mock.calls[2]?.[0]).toBe(
      'git commit -m "chore(ralph): checkpoint before createStories"',
    );
  });
});

describe("approvals E2E - writeFeedbackFile", () => {
  let milestoneDirectory = "";

  beforeEach(() => {
    milestoneDirectory = mkdtempSync(path.join(tmpdir(), "approvals-e2e-"));
  });

  afterEach(() => {
    rmSync(milestoneDirectory, { force: true, recursive: true });
  });

  test("creates feedback file with instructions and resume command", () => {
    const filePath = writeFeedbackFile({
      cascadeTarget: "build",
      gate: "createStories",
      level: "stories",
      milestonePath: milestoneDirectory,
      summary: "Generated 3 stories.",
    });
    const milestoneName = path.basename(milestoneDirectory);
    const content = readFileSync(filePath, "utf8");

    expect(existsSync(filePath)).toBe(true);
    expect(filePath).toContain(`${path.sep}feedback${path.sep}`);
    expect(content).toContain("### Approve");
    expect(content).toContain("### Reject");
    expect(content).toContain("### Modify");
    expect(content).toContain(
      `aaa ralph plan --milestone ${milestoneName} --cascade build --from tasks`,
    );
  });
});

describe("approvals E2E - exit-unstaged integration", () => {
  let execSyncSpy: Mock<typeof childProcess.execSync> | null = null;
  let logSpy: Mock<typeof console.log> | null = null;
  let milestoneDirectory = "";

  beforeEach(() => {
    milestoneDirectory = mkdtempSync(
      path.join(tmpdir(), "approvals-exit-unstaged-e2e-"),
    );
    execSyncSpy = spyOn(childProcess, "execSync").mockImplementation(((
      command: string,
    ) => {
      if (command === "git status --porcelain") {
        return "M docs/planning/PROGRESS.md";
      }
      return "";
    }) as unknown as typeof childProcess.execSync);
    logSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    execSyncSpy?.mockRestore();
    logSpy?.mockRestore();
    rmSync(milestoneDirectory, { force: true, recursive: true });
    execSyncSpy = null;
    logSpy = null;
  });

  test("returns exit-unstaged, checkpoints, executes level, writes feedback, and prints instructions", () => {
    const action = evaluateApproval(
      "createStories",
      { createStories: "always" },
      { forceFlag: false, isTTY: false, reviewFlag: false },
    );
    expect(action).toBe("exit-unstaged");

    const context = {
      cascadeTarget: "build",
      gate: "createStories" as const,
      level: "stories",
      milestonePath: milestoneDirectory,
    };

    prepareExitUnstaged(context);

    const generatedFile = path.join(milestoneDirectory, "stories-generated.md");
    writeFileSync(generatedFile, "# generated stories\n", "utf8");
    expect(existsSync(generatedFile)).toBe(true);

    finalizeExitUnstaged(context, "Generated artifacts for stories level.");

    const feedbackDirectory = path.join(milestoneDirectory, "feedback");
    const feedbackFiles = readdirSync(feedbackDirectory);
    expect(feedbackFiles.length).toBe(1);

    const feedbackPath = path.join(feedbackDirectory, feedbackFiles[0] ?? "");
    const feedbackContent = readFileSync(feedbackPath, "utf8");
    const output = (logSpy?.mock.calls ?? []).flat().join("\n");
    const milestoneName = path.basename(milestoneDirectory);

    expect(execSyncSpy?.mock.calls[0]?.[0]).toBe("git add -A");
    expect(execSyncSpy?.mock.calls[1]?.[0]).toBe("git status --porcelain");
    expect(execSyncSpy?.mock.calls[2]?.[0]).toBe(
      'git commit -m "chore(ralph): checkpoint before createStories"',
    );

    expect(feedbackContent).toContain("### Approve");
    expect(feedbackContent).toContain("### Reject");
    expect(feedbackContent).toContain("### Modify");
    expect(feedbackContent).toContain(
      `aaa ralph plan --milestone ${milestoneName} --cascade build --from tasks`,
    );

    expect(output).toContain("APPROVAL REQUIRED");
    expect(output).toContain("Approve:");
    expect(output).toContain("Reject:");
    expect(output).toContain("Modify:");
    expect(output).toContain("Resume:");
    expect(output).toContain("Details:");
  });
});

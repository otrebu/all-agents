import type { Mock } from "bun:test";

import * as notifyClient from "@tools/commands/notify/client";
import {
  type ApprovalAction,
  type ApprovalContext,
  DEFAULT_SUGGEST_WAIT_SECONDS,
  evaluateApproval,
  finalizeExitUnstaged,
  formatGateName,
  getNextLevel,
  gitCheckpoint,
  handleNotifyWait,
  prepareExitUnstaged,
  printExitInstructions,
  promptApproval,
  sleep,
  writeFeedbackFile,
} from "@tools/commands/ralph/approvals";
import * as displayModule from "@tools/commands/ralph/display";
import * as configModule from "@tools/lib/config";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import * as childProcess from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as readline from "node:readline";

describe("evaluateApproval", () => {
  test('returns "write" when --force is set', () => {
    const result = evaluateApproval(
      "createTasks",
      { createTasks: "always" },
      { forceFlag: true, isTTY: false, reviewFlag: false },
    );

    expect(result).toBe("write");
  });

  test('returns "prompt" for always + tty', () => {
    expect(
      evaluateApproval(
        "createTasks",
        { createTasks: "always" },
        { forceFlag: false, isTTY: true, reviewFlag: false },
      ),
    ).toBe("prompt");
  });

  test('returns "exit-unstaged" for always + headless', () => {
    expect(
      evaluateApproval(
        "createTasks",
        { createTasks: "always" },
        { forceFlag: false, isTTY: false, reviewFlag: false },
      ),
    ).toBe("exit-unstaged");
  });

  test('returns "notify-wait" for suggest + headless', () => {
    expect(
      evaluateApproval(
        "createTasks",
        { createTasks: "suggest" },
        { forceFlag: false, isTTY: false, reviewFlag: false },
      ),
    ).toBe("notify-wait");
  });
});

describe("formatGateName", () => {
  test("formats createStories as Create Stories", () => {
    expect(formatGateName("createStories")).toBe("Create Stories");
  });

  test("formats createRoadmap as Create Roadmap", () => {
    expect(formatGateName("createRoadmap")).toBe("Create Roadmap");
  });

  test("formats onDriftDetected as Drift Detected", () => {
    expect(formatGateName("onDriftDetected")).toBe("Drift Detected");
  });

  test("formats correctionTasks as Correction Tasks", () => {
    expect(formatGateName("correctionTasks")).toBe("Correction Tasks");
  });
});

describe("getNextLevel", () => {
  test('returns "tasks" for "stories"', () => {
    expect(getNextLevel("stories")).toBe("tasks");
  });

  test('returns "build" for "subtasks"', () => {
    expect(getNextLevel("subtasks")).toBe("build");
  });

  test("returns null for calibrate", () => {
    expect(getNextLevel("calibrate")).toBeNull();
  });
});

describe("gitCheckpoint", () => {
  let execSyncSpy: Mock<typeof childProcess.execSync> | null = null;
  let warnSpy: Mock<typeof console.warn> | null = null;

  beforeEach(() => {
    warnSpy = spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    execSyncSpy?.mockRestore();
    warnSpy?.mockRestore();
    execSyncSpy = null;
    warnSpy = null;
  });

  test("stages all changes and commits when dirty", () => {
    execSyncSpy = spyOn(childProcess, "execSync").mockImplementation(((
      command: string,
    ) => {
      if (command === "git status --porcelain") {
        return "M tools/src/commands/ralph/approvals.ts";
      }
      return "";
    }) as unknown as typeof childProcess.execSync);

    const didCreate = gitCheckpoint("createTasks");

    expect(didCreate).toBe(true);
    expect(execSyncSpy.mock.calls[0]?.[0]).toBe("git add -A");
    expect(execSyncSpy.mock.calls[1]?.[0]).toBe("git status --porcelain");
    expect(execSyncSpy.mock.calls[2]?.[0]).toBe(
      'git commit -m "chore(ralph): checkpoint before createTasks"',
    );
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
  });

  test("catches git errors and warns", () => {
    execSyncSpy = spyOn(childProcess, "execSync").mockImplementation(() => {
      throw new Error("git failed");
    });

    const didCreate = gitCheckpoint("createRoadmap");

    expect(didCreate).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy?.mock.calls[0]?.[0])).toContain(
      "Failed to create checkpoint",
    );
  });
});

describe("writeFeedbackFile", () => {
  let milestoneDirectory = "";

  beforeEach(() => {
    milestoneDirectory = mkdtempSync(path.join(tmpdir(), "approvals-test-"));
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

    const content = readFileSync(filePath, "utf8");
    const milestoneName = path.basename(milestoneDirectory);

    expect(filePath).toContain(`${path.sep}feedback${path.sep}`);
    expect(content).toContain("# Approval Required: Create Stories");
    expect(content).toContain("Generated:");
    expect(content).toContain("Level: stories");
    expect(content).toContain(`Milestone: ${milestoneName}`);
    expect(content).toContain("Generated 3 stories.");
    expect(content).toContain("### Approve");
    expect(content).toContain("### Reject");
    expect(content).toContain("### Modify");
    expect(content).toContain(
      `aaa ralph plan --milestone ${milestoneName} --cascade build --from tasks`,
    );
  });
});

describe("printExitInstructions", () => {
  let logSpy: Mock<typeof console.log> | null = null;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy?.mockRestore();
    logSpy = null;
  });

  test("prints approval header, instructions, resume command, and feedback path", () => {
    const feedbackPath = "/tmp/milestone/feedback/2026-02-07_createStories.md";
    const resumeCommand =
      "aaa ralph plan --milestone 003-ralph --cascade build --from tasks";

    printExitInstructions(feedbackPath, resumeCommand);

    const output = (logSpy?.mock.calls ?? []).flat().join("\n");
    expect(output).toContain(
      "============================================================",
    );
    expect(output).toContain("APPROVAL REQUIRED");
    expect(output).toContain("Approve:");
    expect(output).toContain("Reject:");
    expect(output).toContain("Modify:");
    expect(output).toContain(resumeCommand);
    expect(output).toContain(feedbackPath);
  });
});

describe("exit-unstaged flow", () => {
  let execSyncSpy: Mock<typeof childProcess.execSync> | null = null;
  let logSpy: Mock<typeof console.log> | null = null;
  let milestoneDirectory = "";

  beforeEach(() => {
    milestoneDirectory = mkdtempSync(
      path.join(tmpdir(), "approvals-flow-test-"),
    );
    logSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    execSyncSpy?.mockRestore();
    logSpy?.mockRestore();
    rmSync(milestoneDirectory, { force: true, recursive: true });
    execSyncSpy = null;
    logSpy = null;
  });

  test("prepareExitUnstaged runs checkpoint logic", () => {
    execSyncSpy = spyOn(childProcess, "execSync").mockImplementation(((
      command: string,
    ) => {
      if (command === "git status --porcelain") {
        return "";
      }
      return "";
    }) as unknown as typeof childProcess.execSync);

    prepareExitUnstaged({
      cascadeTarget: "build",
      gate: "createTasks",
      level: "tasks",
      milestonePath: milestoneDirectory,
    });

    expect(execSyncSpy.mock.calls[0]?.[0]).toBe("git add -A");
    expect(execSyncSpy.mock.calls[1]?.[0]).toBe("git status --porcelain");
  });

  test("finalizeExitUnstaged writes feedback file and prints instructions", () => {
    finalizeExitUnstaged(
      {
        cascadeTarget: "build",
        gate: "createTasks",
        level: "tasks",
        milestonePath: milestoneDirectory,
      },
      "Generated tasks for story.",
    );

    const feedbackDirectory = path.join(milestoneDirectory, "feedback");
    const output = (logSpy?.mock.calls ?? []).flat().join("\n");

    expect(output).toContain("APPROVAL REQUIRED");
    expect(output).toContain("Resume:");
    expect(output).toContain(feedbackDirectory);
  });
});

describe("promptApproval", () => {
  let consoleLogSpy: Mock<typeof console.log> | null = null;
  let createInterfaceSpy: Mock<typeof readline.createInterface> | null = null;

  afterEach(() => {
    consoleLogSpy?.mockRestore();
    createInterfaceSpy?.mockRestore();
    consoleLogSpy = null;
    createInterfaceSpy = null;
  });

  async function callPromptApproval(
    answer: string,
  ): Promise<{
    closeMock: Mock<() => void>;
    isApproved: boolean;
    prompt: string;
  }> {
    let prompt = "";
    const closeMock = mock(() => {});

    createInterfaceSpy = spyOn(readline, "createInterface").mockReturnValue({
      close: closeMock,
      on: mock(() => undefined as unknown as readline.Interface),
      // eslint-disable-next-line promise/prefer-await-to-callbacks -- readline question API is callback-based
      question: (questionPrompt: string, callback: (value: string) => void) => {
        prompt = questionPrompt;
        // eslint-disable-next-line promise/prefer-await-to-callbacks -- readline API requires callback invocation
        callback(answer);
        return undefined as unknown as readline.Interface;
      },
    } as unknown as readline.Interface);

    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});

    const isApproved = await promptApproval(
      "createStories",
      "Creating 2 stories",
    );
    return { closeMock, isApproved, prompt };
  }

  test("shows exact approval prompt text", async () => {
    const { prompt } = await callPromptApproval("");
    expect(prompt).toBe("Approve? [Y/n]: ");
  });

  test("returns false for n/no", async () => {
    const approvals = await Promise.all(
      ["n", "no"].map(async (answer) => {
        const { isApproved } = await callPromptApproval(answer);
        return isApproved;
      }),
    );
    expect(approvals).toEqual([false, false]);
  });

  test("renders approval gate card before prompting when card data is provided", async () => {
    const renderedCard = "[approval-card]";
    const renderCardSpy = spyOn(
      displayModule,
      "renderApprovalGateCard",
    ).mockReturnValue(renderedCard);
    const closeMock = mock(() => {});
    let isCardLoggedBeforePrompt = false;

    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
    createInterfaceSpy = spyOn(readline, "createInterface").mockReturnValue({
      close: closeMock,
      on: mock(() => undefined as unknown as readline.Interface),
      question: (_questionPrompt: string, done: (value: string) => void) => {
        isCardLoggedBeforePrompt =
          consoleLogSpy?.mock.calls.some((call) => call[0] === renderedCard) ??
          false;
        done("");
        return undefined as unknown as readline.Interface;
      },
    } as unknown as readline.Interface);

    await promptApproval("createStories", "Creating 2 stories", {
      actionOptions: [
        { color: "green", key: "Y", label: "Approve and continue" },
      ],
      configMode: "always",
      executionMode: "supervised",
      gateName: "createStories",
      resolvedAction: "prompt",
      summaryLines: ["Generated artifacts for stories level"],
    });

    expect(renderCardSpy).toHaveBeenCalledTimes(1);
    expect(isCardLoggedBeforePrompt).toBe(true);

    renderCardSpy.mockRestore();
  });
});

describe("sleep", () => {
  test("resolves after the requested milliseconds", async () => {
    const setTimeoutSpy = spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: (...args: Array<unknown>) => void,
      ms?: number,
    ): ReturnType<typeof setTimeout> => {
      void ms;
      // eslint-disable-next-line promise/prefer-await-to-callbacks -- timer mock executes callback immediately
      callback();
      return undefined as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout);

    await sleep(25);

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 25);
    setTimeoutSpy.mockRestore();
  });
});

describe("handleNotifyWait", () => {
  let loadConfigSpy: Mock<typeof configModule.loadAaaConfig> | null = null;
  let notificationSpy: Mock<typeof notifyClient.sendNotification> | null = null;
  let logSpy: Mock<typeof console.log> | null = null;
  let warnSpy: Mock<typeof console.warn> | null = null;
  let setTimeoutSpy: Mock<typeof globalThis.setTimeout> | null = null;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
    warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    setTimeoutSpy = spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: (...args: Array<unknown>) => void,
      ms?: number,
    ): ReturnType<typeof setTimeout> => {
      void ms;
      // eslint-disable-next-line promise/prefer-await-to-callbacks -- timer mock executes callback immediately
      callback();
      return undefined as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout);
  });

  afterEach(() => {
    loadConfigSpy?.mockRestore();
    notificationSpy?.mockRestore();
    logSpy?.mockRestore();
    warnSpy?.mockRestore();
    setTimeoutSpy?.mockRestore();
    loadConfigSpy = null;
    notificationSpy = null;
    logSpy = null;
    warnSpy = null;
    setTimeoutSpy = null;
  });

  test("sends notification and waits suggestWaitSeconds before continuing", async () => {
    loadConfigSpy = spyOn(configModule, "loadAaaConfig").mockReturnValue({
      notify: {
        defaultTopic: "ralph",
        enabled: true,
        server: "https://ntfy.example.com",
        username: "alice",
      },
    });
    notificationSpy = spyOn(notifyClient, "sendNotification").mockResolvedValue(
      { event: "message", id: "id-1", success: true, time: 1 },
    );

    await handleNotifyWait(
      "createStories",
      { suggestWaitSeconds: 5 },
      "Proceeding with stories level",
    );

    expect(notificationSpy).toHaveBeenCalledWith({
      message: "Proceeding with stories level\n\nProceeding in 5 seconds...",
      priority: "default",
      server: "https://ntfy.example.com",
      title: "Ralph: Create Stories",
      topic: "ralph",
      username: "alice",
    });
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    expect(
      logSpy?.mock.calls.some((call) =>
        String(call[0]).includes("Notification sent"),
      ),
    ).toBe(true);
  });

  test("skips notification when notify is disabled and still waits", async () => {
    loadConfigSpy = spyOn(configModule, "loadAaaConfig").mockReturnValue({
      notify: {
        defaultTopic: "ralph",
        enabled: false,
        server: "https://ntfy.example.com",
      },
    });
    notificationSpy = spyOn(notifyClient, "sendNotification").mockResolvedValue(
      { event: "message", id: "id-1", success: true, time: 1 },
    );

    await handleNotifyWait(
      "createTasks",
      { suggestWaitSeconds: 2 },
      "Proceeding with tasks level",
    );

    expect(notificationSpy).not.toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    expect(
      logSpy?.mock.calls.some((call) =>
        String(call[0]).includes("Notification skipped"),
      ),
    ).toBe(true);
  });

  test("skips notification when server or topic is missing and still waits", async () => {
    loadConfigSpy = spyOn(configModule, "loadAaaConfig").mockReturnValue({
      notify: { enabled: true, server: "https://ntfy.example.com" },
    });
    notificationSpy = spyOn(notifyClient, "sendNotification").mockResolvedValue(
      { event: "message", id: "id-1", success: true, time: 1 },
    );

    await handleNotifyWait(
      "createSubtasks",
      { suggestWaitSeconds: 4 },
      "Proceeding with subtasks level",
    );

    expect(notificationSpy).not.toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 4000);
    expect(
      logSpy?.mock.calls.some((call) =>
        String(call[0]).includes("Notification skipped"),
      ),
    ).toBe(true);
  });

  test("defaults to 180 seconds when suggestWaitSeconds is undefined", async () => {
    loadConfigSpy = spyOn(configModule, "loadAaaConfig").mockReturnValue({
      notify: {
        defaultTopic: "ralph",
        enabled: true,
        server: "https://ntfy.example.com",
      },
    });
    notificationSpy = spyOn(notifyClient, "sendNotification").mockResolvedValue(
      { event: "message", id: "id-1", success: true, time: 1 },
    );

    await handleNotifyWait(
      "createRoadmap",
      {},
      "Proceeding with roadmap level",
    );

    expect(DEFAULT_SUGGEST_WAIT_SECONDS).toBe(180);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 180_000);
  });

  test("falls back to default wait seconds and continues on notification errors", async () => {
    loadConfigSpy = spyOn(configModule, "loadAaaConfig").mockReturnValue({
      notify: {
        defaultTopic: "ralph",
        enabled: true,
        server: "https://ntfy.example.com",
      },
    });
    notificationSpy = spyOn(notifyClient, "sendNotification").mockRejectedValue(
      new Error("network down"),
    );

    await handleNotifyWait(
      "createRoadmap",
      undefined,
      "Proceeding with roadmap level",
    );

    expect(DEFAULT_SUGGEST_WAIT_SECONDS).toBe(180);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 180_000);
    expect(
      warnSpy?.mock.calls.some((call) =>
        String(call[0]).includes("Failed to send notification"),
      ),
    ).toBe(true);
    expect(
      logSpy?.mock.calls.some((call) =>
        String(call[0]).includes("Wait complete"),
      ),
    ).toBe(true);
  });
});

describe("approvals module exports", () => {
  test("exports core functions and types", () => {
    expect(typeof evaluateApproval).toBe("function");
    expect(typeof gitCheckpoint).toBe("function");
    expect(typeof getNextLevel).toBe("function");
    expect(typeof writeFeedbackFile).toBe("function");
    expect(typeof printExitInstructions).toBe("function");
    expect(typeof prepareExitUnstaged).toBe("function");
    expect(typeof finalizeExitUnstaged).toBe("function");
    expect(typeof formatGateName).toBe("function");
    expect(typeof handleNotifyWait).toBe("function");
    expect(typeof promptApproval).toBe("function");
    expect(typeof sleep).toBe("function");
    expect(DEFAULT_SUGGEST_WAIT_SECONDS).toBe(180);

    const action: ApprovalAction = "write";
    const context: ApprovalContext = {
      forceFlag: false,
      isTTY: true,
      reviewFlag: false,
    };

    expect(action).toBe("write");
    expect(context.isTTY).toBe(true);
  });
});

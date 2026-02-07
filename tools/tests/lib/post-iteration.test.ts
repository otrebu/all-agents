import type { PostIterationOptions } from "@tools/commands/ralph/post-iteration";
import type { Mock } from "bun:test";

import {
  generateSummary,
  runPostIterationHook,
} from "@tools/commands/ralph/post-iteration";
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
import { join, resolve } from "node:path";

const contextRoot = resolve(import.meta.dir, "../../..");

function createBaseOptions(
  overrides: Partial<PostIterationOptions> = {},
): PostIterationOptions {
  return {
    contextRoot,
    repoRoot: contextRoot,
    sessionId: "session-test-001",
    status: "completed",
    subtask: {
      acceptanceCriteria: ["AC-1"],
      description: "Test subtask description",
      done: false,
      filesToRead: [],
      id: "SUB-001",
      taskRef: "TASK-001",
      title: "Test subtask title",
    },
    subtasksPath: join(contextRoot, "subtasks.json"),
    ...overrides,
  };
}

describe("generateSummary provider fallback", () => {
  let warnSpy: Mock<typeof console.warn> | null = null;

  afterEach(() => {
    warnSpy?.mockRestore();
    warnSpy = null;
  });

  test("falls back cleanly on claude summary failure", async () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "aaa-summary-claude-"),
    );
    const sessionPath = join(temporaryDirectory, "session.jsonl");
    writeFileSync(sessionPath, '{"type":"assistant","text":"hello"}\n');

    try {
      const seenProviders: Array<string> = [];
      const result = await generateSummary(
        createBaseOptions({ provider: "claude" }),
        sessionPath,
        async ({ provider }) => {
          seenProviders.push(provider);
          await Promise.resolve();
          return null;
        },
      );

      expect(seenProviders).toEqual(["claude"]);
      expect(result.keyFindings).toEqual([]);
      expect(result.summary).toBe(
        "Iteration completed for SUB-001: Test subtask title",
      );
      expect(result.summaryMs).toBeGreaterThanOrEqual(0);
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("falls back cleanly on opencode summary failure", async () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "aaa-summary-opencode-"),
    );
    const sessionPath = join(temporaryDirectory, "session.jsonl");
    writeFileSync(sessionPath, '{"type":"assistant","text":"hello"}\n');

    try {
      const seenProviders: Array<string> = [];
      const result = await generateSummary(
        createBaseOptions({ provider: "opencode", status: "retrying" }),
        sessionPath,
        async ({ provider }) => {
          seenProviders.push(provider);
          await Promise.resolve();
          return null;
        },
      );

      expect(seenProviders).toEqual(["opencode"]);
      expect(result.keyFindings).toEqual([]);
      expect(result.summary).toBe(
        "Iteration retrying for SUB-001: Test subtask title",
      );
      expect(result.summaryMs).toBeGreaterThanOrEqual(0);
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("substitutes expected variables and applies SESSION_CONTENT last", async () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "aaa-summary-template-"),
    );
    const promptDirectory = join(
      temporaryDirectory,
      "context/workflows/ralph/hooks",
    );
    mkdirSync(promptDirectory, { recursive: true });

    const promptPath = join(promptDirectory, "iteration-summary.md");
    writeFileSync(
      promptPath,
      [
        "ID={{SUBTASK_ID}}",
        "STATUS={{STATUS}}",
        "TITLE={{SUBTASK_TITLE}}",
        "DESC={{SUBTASK_DESCRIPTION}}",
        "MILESTONE={{MILESTONE}}",
        "TASK={{TASK_REF}}",
        "ITER={{ITERATION_NUM}}",
        "PATH={{SESSION_JSONL_PATH}}",
        "SESSION={{SESSION_CONTENT}}",
        "JSONL={{SESSION_JSONL_CONTENT}}",
      ].join("\n"),
      "utf8",
    );

    const sessionPath = join(temporaryDirectory, "session.jsonl");
    writeFileSync(sessionPath, "line1\n{{STATUS}}\nline3\n", "utf8");

    let promptSeenByInvoker = "";

    try {
      const result = await generateSummary(
        createBaseOptions({
          contextRoot: temporaryDirectory,
          iterationNumber: 7,
          milestone: "003-ralph-workflow",
        }),
        sessionPath,
        async ({ prompt }) => {
          promptSeenByInvoker = prompt;
          await Promise.resolve();
          return JSON.stringify({ keyFindings: [], summary: "ok" });
        },
      );

      expect(result.summary).toBe("ok");
      expect(promptSeenByInvoker).toContain("ID=SUB-001");
      expect(promptSeenByInvoker).toContain("STATUS=completed");
      expect(promptSeenByInvoker).toContain("TITLE=Test subtask title");
      expect(promptSeenByInvoker).toContain("DESC=Test subtask description");
      expect(promptSeenByInvoker).toContain("MILESTONE=003-ralph-workflow");
      expect(promptSeenByInvoker).toContain("TASK=TASK-001");
      expect(promptSeenByInvoker).toContain("ITER=7");
      expect(promptSeenByInvoker).toContain(`PATH=${sessionPath}`);
      expect(promptSeenByInvoker).toContain(
        "SESSION=line1\n{{STATUS}}\nline3\n",
      );
      expect(promptSeenByInvoker).toContain("JSONL=line1\n{{STATUS}}\nline3\n");
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("handles null/undefined template inputs gracefully", async () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "aaa-summary-template-nullish-"),
    );
    const promptDirectory = join(
      temporaryDirectory,
      "context/workflows/ralph/hooks",
    );
    mkdirSync(promptDirectory, { recursive: true });

    const promptPath = join(promptDirectory, "iteration-summary.md");
    writeFileSync(
      promptPath,
      [
        "DESC={{SUBTASK_DESCRIPTION}}",
        "PATH={{SESSION_JSONL_PATH}}",
        "JSONL={{SESSION_JSONL_CONTENT}}",
      ].join("\n"),
      "utf8",
    );

    const warningSpy = spyOn(console, "warn").mockImplementation(() => {});

    try {
      const result = await generateSummary(
        createBaseOptions({
          contextRoot: temporaryDirectory,
          subtask: {
            ...createBaseOptions().subtask,
            description: undefined as unknown as string,
          },
        }),
        "",
        async ({ prompt }) => {
          expect(prompt).toContain("DESC=");
          expect(prompt).toContain("PATH=");
          expect(prompt).toContain("JSONL=(session log unavailable)");
          await Promise.resolve();
          return JSON.stringify({ keyFindings: [], summary: "safe-nullish" });
        },
      );

      expect(result.summary).toBe("safe-nullish");
      expect(warningSpy).not.toHaveBeenCalledWith(
        "Template variable {{SUBTASK_DESCRIPTION}} not provided",
      );
      expect(warningSpy).not.toHaveBeenCalledWith(
        "Template variable {{SESSION_JSONL_PATH}} not provided",
      );
      expect(warningSpy).not.toHaveBeenCalledWith(
        "Template variable {{SESSION_JSONL_CONTENT}} not provided",
      );
    } finally {
      warningSpy.mockRestore();
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("uses empty SESSION_JSONL_PATH when sessionPath is null", async () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "aaa-summary-template-null-path-"),
    );
    const promptDirectory = join(
      temporaryDirectory,
      "context/workflows/ralph/hooks",
    );
    mkdirSync(promptDirectory, { recursive: true });

    const promptPath = join(promptDirectory, "iteration-summary.md");
    writeFileSync(
      promptPath,
      [
        "PATH={{SESSION_JSONL_PATH}}",
        "SESSION={{SESSION_CONTENT}}",
        "JSONL={{SESSION_JSONL_CONTENT}}",
      ].join("\n"),
      "utf8",
    );

    const warningSpy = spyOn(console, "warn").mockImplementation(() => {});

    try {
      const result = await generateSummary(
        createBaseOptions({ contextRoot: temporaryDirectory }),
        null,
        async ({ prompt }) => {
          expect(prompt).toContain("PATH=");
          expect(prompt).toContain("SESSION=(session log unavailable)");
          expect(prompt).toContain("JSONL=(session log unavailable)");
          await Promise.resolve();
          return JSON.stringify({ keyFindings: [], summary: "null-path-safe" });
        },
      );

      expect(result.summary).toBe("null-path-safe");
      expect(warningSpy).not.toHaveBeenCalledWith(
        "Template variable {{SESSION_JSONL_PATH}} not provided",
      );
    } finally {
      warningSpy.mockRestore();
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("warns for missing template variables without breaking summary", async () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "aaa-summary-template-warn-"),
    );
    const promptDirectory = join(
      temporaryDirectory,
      "context/workflows/ralph/hooks",
    );
    mkdirSync(promptDirectory, { recursive: true });

    writeFileSync(
      join(promptDirectory, "iteration-summary.md"),
      "Missing={{NOT_A_REAL_VARIABLE}}\nPath={{SESSION_JSONL_PATH}}\nID={{SUBTASK_ID}}\n{{SESSION_CONTENT}}",
      "utf8",
    );

    const sessionPath = join(temporaryDirectory, "session.jsonl");
    writeFileSync(sessionPath, "log line", "utf8");

    warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    try {
      const result = await generateSummary(
        createBaseOptions({ contextRoot: temporaryDirectory }),
        sessionPath,
        async ({ prompt }) => {
          expect(prompt).toContain("Missing={{NOT_A_REAL_VARIABLE}}");
          expect(prompt).toContain(`Path=${sessionPath}`);
          expect(prompt).toContain("ID=SUB-001");
          expect(prompt).toContain("log line");
          await Promise.resolve();
          return JSON.stringify({ keyFindings: [], summary: "safe" });
        },
      );

      expect(result.summary).toBe("safe");
      expect(warnSpy).toHaveBeenCalledWith(
        "Template variable {{NOT_A_REAL_VARIABLE}} not provided",
      );
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });
});

describe("runPostIterationHook diary telemetry", () => {
  test("writes provider-neutral timing field to diary entries", async () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "aaa-post-iteration-diary-"),
    );
    const milestoneDirectory = join(temporaryDirectory, "milestone");
    mkdirSync(milestoneDirectory, { recursive: true });
    const subtasksPath = join(milestoneDirectory, "subtasks.json");
    writeFileSync(subtasksPath, JSON.stringify({ subtasks: [] }), "utf8");

    try {
      const hookResult = await runPostIterationHook(
        createBaseOptions({
          provider: "opencode",
          providerMs: 4321,
          repoRoot: temporaryDirectory,
          sessionId: "session-test-opencode",
          skipSummary: true,
          subtasksPath,
        }),
      );

      expect(hookResult).not.toBeNull();
      if (hookResult === null) {
        throw new Error("expected hook result");
      }

      expect(hookResult.entry.timing?.providerMs).toBe(4321);
      expect(hookResult.entry.timing?.claudeMs).toBeUndefined();
      expect(existsSync(hookResult.diaryPath)).toBe(true);

      const diaryContent = readFileSync(hookResult.diaryPath, "utf8").trim();
      const lastLine = diaryContent.split("\n").at(-1) ?? "{}";
      const parsed = JSON.parse(lastLine) as {
        timing?: { claudeMs?: number; providerMs?: number };
      };

      expect(parsed.timing?.providerMs).toBe(4321);
      expect(parsed.timing?.claudeMs).toBeUndefined();
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });
});

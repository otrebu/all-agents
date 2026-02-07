import type { PostIterationOptions } from "@tools/commands/ralph/post-iteration";

import {
  generateSummary,
  runPostIterationHook,
} from "@tools/commands/ralph/post-iteration";
import { describe, expect, test } from "bun:test";
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

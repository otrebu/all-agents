import { extractSignals } from "@tools/commands/ralph/session-analysis";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("session-analysis detectors", () => {
  const testDirectory = join(tmpdir(), `session-analysis-test-${Date.now()}`);

  beforeAll(() => {
    if (!existsSync(testDirectory)) {
      mkdirSync(testDirectory, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(testDirectory)) {
      rmSync(testDirectory, { recursive: true });
    }
  });

  test("FilesTooBigDetector identifies exceeds maximum allowed tokens tool_result lines", async () => {
    const sessionPath = join(testDirectory, "files-too-big.jsonl");
    writeSession(sessionPath, [
      {
        content:
          "Read failed: file '/repo/docs/planning/PROGRESS.md' exceeds maximum allowed tokens (34567 tokens)",
        is_error: true,
        type: "tool_result",
      },
    ]);

    const report = await extractSignals(sessionPath, "session-files-too-big");
    expect(report.signals.filesTooBig).toHaveLength(1);
    expect(report.signals.filesTooBig[0]).toEqual({
      file: "/repo/docs/planning/PROGRESS.md",
      line: 1,
      tokens: 34_567,
    });
  });

  test("FileNotFoundDetector captures is_error true and missing-file message with tool name", async () => {
    const sessionPath = join(testDirectory, "file-not-found.jsonl");
    writeSession(sessionPath, [
      {
        id: "tool-1",
        input: { file_path: "context/missing.md" },
        name: "Read",
        type: "tool_use",
      },
      {
        content: "File does not exist: context/missing.md",
        is_error: true,
        tool_use_id: "tool-1",
        type: "tool_result",
      },
    ]);

    const report = await extractSignals(sessionPath, "session-file-not-found");
    expect(report.signals.filesNotFound).toHaveLength(1);
    expect(report.signals.filesNotFound[0]).toEqual({
      file: "context/missing.md",
      line: 2,
      tool: "Read",
    });
  });

  test("StuckLoopDetector detects repeated 3-tool sequence with same input hashes", async () => {
    const sessionPath = join(testDirectory, "stuck-loop.jsonl");
    writeSession(sessionPath, [
      { input: { file_path: "a.ts" }, name: "Read", type: "tool_use" },
      {
        input: { path: "src/**/*.ts", pattern: "foo" },
        name: "Grep",
        type: "tool_use",
      },
      {
        input: {
          file_path: "a.ts",
          new_string: "const x = 2;",
          old_string: "const x = 1;",
        },
        name: "Edit",
        type: "tool_use",
      },
      { input: { file_path: "a.ts" }, name: "Read", type: "tool_use" },
      {
        input: { path: "src/**/*.ts", pattern: "foo" },
        name: "Grep",
        type: "tool_use",
      },
      {
        input: {
          file_path: "a.ts",
          new_string: "const x = 2;",
          old_string: "const x = 1;",
        },
        name: "Edit",
        type: "tool_use",
      },
    ]);

    const report = await extractSignals(sessionPath, "session-stuck-loop");
    expect(report.signals.stuckLoops).toHaveLength(1);
    expect(report.signals.stuckLoops[0]?.repetitions).toBe(2);
    expect(report.signals.stuckLoops[0]?.startLine).toBe(1);
    expect(report.signals.stuckLoops[0]?.endLine).toBe(6);
    expect(report.signals.stuckLoops[0]?.pattern).toContain("Read:");
    expect(report.signals.stuckLoops[0]?.pattern).toContain("Grep:");
    expect(report.signals.stuckLoops[0]?.pattern).toContain("Edit:");
  });

  test("BacktrackDetector captures exact and partial Edit reversals per file", async () => {
    const sessionPath = join(testDirectory, "backtrack.jsonl");
    writeSession(sessionPath, [
      {
        input: {
          file_path: "src/exact.ts",
          new_string: "const value = 2;",
          old_string: "const value = 1;",
        },
        name: "Edit",
        type: "tool_use",
      },
      {
        input: {
          file_path: "src/exact.ts",
          new_string: "const value = 1;",
          old_string: "const value = 2;",
        },
        name: "Edit",
        type: "tool_use",
      },
      {
        input: {
          file_path: "src/partial.ts",
          new_string: "logger.info('x')",
          old_string: "console.log('x')",
        },
        name: "Edit",
        type: "tool_use",
      },
      {
        input: {
          file_path: "src/partial.ts",
          new_string: "console.log('x', extra)",
          old_string: "logger.info('x')",
        },
        name: "Edit",
        type: "tool_use",
      },
    ]);

    const report = await extractSignals(sessionPath, "session-backtrack");
    expect(report.signals.editBacktracking).toHaveLength(2);

    const exactSignal = report.signals.editBacktracking.find(
      (signal) => signal.type === "exact",
    );
    expect(exactSignal).toEqual({
      file: "src/exact.ts",
      firstEditLine: 1,
      reversalLine: 2,
      type: "exact",
    });

    const partialSignal = report.signals.editBacktracking.find(
      (signal) => signal.type === "partial",
    );
    expect(partialSignal).toEqual({
      file: "src/partial.ts",
      firstEditLine: 3,
      reversalLine: 4,
      type: "partial",
    });
  });
});

function writeSession(
  sessionPath: string,
  lines: Array<Record<string, unknown>>,
): void {
  writeFileSync(
    sessionPath,
    `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`,
    "utf8",
  );
}

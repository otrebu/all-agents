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
    expect(report.signals.filesTooBig).toEqual([
      { file: "/repo/docs/planning/PROGRESS.md", line: 1, tokens: 34_567 },
    ]);
  });

  test("FileNotFoundDetector captures missing-file errors with originating tool name", async () => {
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
    expect(report.signals.filesNotFound).toEqual([
      { file: "context/missing.md", line: 2, tool: "Read" },
    ]);
  });

  test("StuckLoopDetector detects repeated 3-tool sequence with same input hashes", async () => {
    const sessionPath = join(testDirectory, "stuck-loop.jsonl");
    writeSession(sessionPath, buildRepeatedLoopLines());

    const report = await extractSignals(sessionPath, "session-stuck-loop");
    expect(report.signals.stuckLoops).toHaveLength(1);
    expect(report.signals.stuckLoops[0]?.repetitions).toBe(2);
    expect(report.signals.stuckLoops[0]?.startLine).toBe(1);
    expect(report.signals.stuckLoops[0]?.endLine).toBe(6);
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
    expect(
      report.signals.editBacktracking.find((signal) => signal.type === "exact"),
    ).toEqual({
      file: "src/exact.ts",
      firstEditLine: 1,
      reversalLine: 2,
      type: "exact",
    });
    expect(
      report.signals.editBacktracking.find(
        (signal) => signal.type === "partial",
      ),
    ).toEqual({
      file: "src/partial.ts",
      firstEditLine: 3,
      reversalLine: 4,
      type: "partial",
    });
  });

  test("ExplorationDetector flags 10+ read-only tool calls without production writes", async () => {
    const sessionPath = join(testDirectory, "exploration.jsonl");
    const lines = Array.from({ length: 10 }, (_, index) => ({
      input: { file_path: `src/file-${index}.ts` },
      name: getReadToolName(index),
      type: "tool_use",
    }));
    writeSession(sessionPath, lines);

    const report = await extractSignals(sessionPath, "session-exploration");
    expect(report.signals.explorationWithoutProduction).toHaveLength(1);
    expect(report.signals.explorationWithoutProduction[0]).toMatchObject({
      endLine: 10,
      readCount: 10,
      startLine: 1,
    });
    expect(report.signals.explorationWithoutProduction[0]?.readFiles).toContain(
      "src/file-0.ts",
    );
  });

  test("SelfCorrectionDetector matches at least 8 correction phrases in assistant text", async () => {
    const sessionPath = join(testDirectory, "self-corrections.jsonl");
    writeSession(sessionPath, [
      {
        message: {
          content: [
            {
              text: "Actually, wait, hold on - I was wrong. Let me reconsider and correction: on second thought I need to correct this. Oops, sorry. Let me backtrack.",
              type: "text",
            },
          ],
          role: "assistant",
        },
      },
    ]);

    const report = await extractSignals(
      sessionPath,
      "session-self-corrections",
    );
    expect(report.signals.selfCorrections).toHaveLength(1);
    expect(
      report.signals.selfCorrections[0]?.matchedPhrases.length,
    ).toBeGreaterThanOrEqual(8);
  });

  test("TokenAccelerationDetector flags sessions where input_tokens grow more than 3x", async () => {
    const sessionPath = join(testDirectory, "token-acceleration.jsonl");
    writeSession(sessionPath, [
      { message: { role: "assistant", usage: { input_tokens: 500 } } },
      { message: { role: "assistant", usage: { input_tokens: 1700 } } },
    ]);

    const report = await extractSignals(
      sessionPath,
      "session-token-acceleration",
    );
    expect(report.signals.tokenAcceleration).toEqual({
      endTokens: 1700,
      multiplier: 3.4,
      startTokens: 500,
    });
  });

  test("TestFixLoopDetector detects repeated test-edit-test cycles with same error signature", async () => {
    const sessionPath = join(testDirectory, "test-fix-loop.jsonl");
    writeSession(sessionPath, [
      {
        id: "test-1",
        input: { command: "bun test tools/tests/lib/session-analysis.test.ts" },
        name: "Bash",
        type: "tool_use",
      },
      {
        content:
          "FAIL session-analysis.test.ts\nError: expected 1 to be 2\nline 44",
        is_error: true,
        tool_use_id: "test-1",
        type: "tool_result",
      },
      {
        input: {
          file_path: "tools/src/commands/ralph/session-analysis.ts",
          new_string: "const value = 2;",
          old_string: "const value = 1;",
        },
        name: "Edit",
        type: "tool_use",
      },
      {
        id: "test-2",
        input: { command: "bun test tools/tests/lib/session-analysis.test.ts" },
        name: "Bash",
        type: "tool_use",
      },
      {
        content:
          "FAIL session-analysis.test.ts\nError: expected 5 to be 6\nline 99",
        is_error: true,
        tool_use_id: "test-2",
        type: "tool_result",
      },
      {
        input: {
          file_path: "tools/src/commands/ralph/session-analysis.ts",
          new_string: "const value = 3;",
          old_string: "const value = 2;",
        },
        name: "Edit",
        type: "tool_use",
      },
      {
        id: "test-3",
        input: { command: "bun test tools/tests/lib/session-analysis.test.ts" },
        name: "Bash",
        type: "tool_use",
      },
      {
        content:
          "FAIL session-analysis.test.ts\nError: expected 8 to be 9\nline 123",
        is_error: true,
        tool_use_id: "test-3",
        type: "tool_result",
      },
    ]);

    const report = await extractSignals(sessionPath, "session-test-fix");
    expect(report.signals.testFixLoops).toHaveLength(1);
    expect(report.signals.testFixLoops[0]).toMatchObject({
      cycles: 2,
      startLine: 2,
    });
  });

  test("composite offTrackScore is normalized by session length and constrained to 0..1", async () => {
    const shortPath = join(testDirectory, "composite-short.jsonl");
    const longPath = join(testDirectory, "composite-long.jsonl");

    const sharedSignalLines = [
      ...buildRepeatedLoopLines(),
      {
        message: {
          content: [
            {
              text: "Actually wait, I was wrong. Let me reconsider.",
              type: "text",
            },
          ],
          role: "assistant",
          usage: { input_tokens: 100 },
        },
      },
      { message: { role: "assistant", usage: { input_tokens: 450 } } },
    ];
    writeSession(shortPath, sharedSignalLines);
    writeSession(longPath, [
      ...sharedSignalLines,
      ...Array.from({ length: 120 }, () => ({
        message: {
          content: [{ text: "steady progress update", type: "text" }],
          role: "assistant",
        },
      })),
    ]);

    const shortReport = await extractSignals(
      shortPath,
      "session-composite-short",
    );
    const longReport = await extractSignals(longPath, "session-composite-long");

    expect(shortReport.offTrackScore).toBeGreaterThan(0);
    expect(shortReport.offTrackScore).toBeLessThanOrEqual(1);
    expect(longReport.offTrackScore).toBeGreaterThanOrEqual(0);
    expect(longReport.offTrackScore).toBeLessThanOrEqual(1);
    expect(longReport.offTrackScore).toBeLessThan(shortReport.offTrackScore);
  });

  test("extractSignals returns complete OffTrackReport contract", async () => {
    const sessionPath = join(testDirectory, "extract-signals-contract.jsonl");
    writeSession(sessionPath, [
      {
        id: "r1",
        input: { file_path: "src/a.ts" },
        name: "Read",
        type: "tool_use",
      },
      {
        message: {
          content: [{ text: "Actually, hold on.", type: "text" }],
          role: "assistant",
          usage: { input_tokens: 200, output_tokens: 50 },
        },
      },
    ]);

    const report = await extractSignals(sessionPath, "session-contract");
    expect(report.sessionId).toBe("session-contract");
    expect(typeof report.durationMs).toBe("number");
    expect(Array.isArray(report.filesRead)).toBe(true);
    expect(Array.isArray(report.filesWritten)).toBe(true);
    expect(typeof report.totalMessages).toBe("number");
    expect(typeof report.totalToolCalls).toBe("number");
    expect(typeof report.offTrackScore).toBe("number");
    expect(report.offTrackScore).toBeGreaterThanOrEqual(0);
    expect(report.offTrackScore).toBeLessThanOrEqual(1);
    expect(report.signals).toHaveProperty("filesTooBig");
    expect(report.signals).toHaveProperty("filesNotFound");
    expect(report.signals).toHaveProperty("stuckLoops");
    expect(report.signals).toHaveProperty("editBacktracking");
    expect(report.signals).toHaveProperty("explorationWithoutProduction");
    expect(report.signals).toHaveProperty("selfCorrections");
    expect(report.signals).toHaveProperty("tokenAcceleration");
    expect(report.signals).toHaveProperty("testFixLoops");
  });
});

function buildRepeatedLoopLines(): Array<Record<string, unknown>> {
  return [
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
  ];
}

function getReadToolName(index: number): "Glob" | "Grep" | "Read" {
  if (index % 3 === 0) {
    return "Glob";
  }
  if (index % 2 === 0) {
    return "Grep";
  }
  return "Read";
}

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

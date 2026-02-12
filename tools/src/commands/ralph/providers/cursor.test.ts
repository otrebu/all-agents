import { describe, expect, test } from "bun:test";

import { buildCursorHeadlessArguments, normalizeCursorResult } from "./cursor";

describe("buildCursorHeadlessArguments", () => {
  test("includes headless flags, model, and prompt separator", () => {
    const args = buildCursorHeadlessArguments(
      { model: "cursor-fast", provider: "cursor" },
      "Implement feature X",
    );

    expect(args).toEqual([
      "-p",
      "--output-format",
      "stream-json",
      "--model",
      "cursor-fast",
      "--",
      "Implement feature X",
    ]);
  });

  test("omits model when unset", () => {
    const args = buildCursorHeadlessArguments({ provider: "cursor" }, "ping");

    expect(args).toEqual([
      "-p",
      "--output-format",
      "stream-json",
      "--",
      "ping",
    ]);
  });
});

describe("normalizeCursorResult", () => {
  test("parses single JSON payload", () => {
    const output = JSON.stringify({
      duration_ms: 1200,
      result: "done",
      session_id: "cur_123",
      total_cost_usd: 0.02,
      usage: {
        cache_read: 5,
        cache_write: 1,
        input_tokens: 100,
        output_tokens: 25,
      },
    });

    const result = normalizeCursorResult(output);
    expect(result).toEqual({
      costUsd: 0.02,
      durationMs: 1200,
      result: "done",
      sessionId: "cur_123",
      tokenUsage: {
        cacheRead: 5,
        cacheWrite: 1,
        input: 100,
        output: 25,
        reasoning: undefined,
      },
    });
  });

  test("parses JSONL stream payload", () => {
    const jsonl = [
      '{"type":"system","session_id":"cur_abc"}',
      '{"type":"assistant","content":"partial "}',
      '{"type":"assistant","content":"answer"}',
      '{"type":"result","result":"final answer","duration_ms":900}',
    ].join("\n");

    const result = normalizeCursorResult(jsonl);
    expect(result.costUsd).toBe(0);
    expect(result.durationMs).toBe(900);
    expect(result.result).toBe("final answer");
    expect(result.sessionId).toBe("cur_abc");
  });

  test("throws for non-JSON output", () => {
    expect(() => normalizeCursorResult("plain text response")).toThrow(
      "Unable to parse Cursor output as JSON or JSONL structured payload",
    );
  });
});

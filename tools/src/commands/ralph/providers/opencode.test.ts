/**
 * Unit tests for OpenCode JSONL parsing and normalizeOpencodeResult()
 *
 * Tests use static JSONL fixtures to verify deterministic parsing behavior.
 * Each fixture documents a specific OpenCode output scenario:
 *
 * - opencode-success.jsonl   : Normal completion with step_start, text, step_finish
 * - opencode-partial.jsonl   : Incomplete stream (simulates Issue #8203 hang)
 * - opencode-error.jsonl     : Error response (step_finish with reason:"error")
 * - opencode-empty.jsonl     : Empty stream
 * - opencode-multiline.jsonl : Multiple text events requiring concatenation
 *
 * @see docs/planning/milestones/004-MULTI-CLI/tasks/TASK-047-opencode-parser-tests.md
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { normalizeOpencodeResult } from "./opencode";

// =============================================================================
// Fixture Loading
// =============================================================================

const FIXTURES_DIR = join(import.meta.dir, "__fixtures__");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf8");
}

// =============================================================================
// Success Fixture Tests
// =============================================================================

describe("normalizeOpencodeResult - success fixture", () => {
  test("extracts result text from text event", () => {
    const jsonl = loadFixture("opencode-success.jsonl");
    const result = normalizeOpencodeResult(jsonl);

    expect(result.result).toBe("Task completed successfully.");
  });

  test("extracts costUsd from step_finish", () => {
    const jsonl = loadFixture("opencode-success.jsonl");
    const result = normalizeOpencodeResult(jsonl);

    expect(result.costUsd).toBe(0.0025);
  });

  test("extracts sessionId from step_start", () => {
    const jsonl = loadFixture("opencode-success.jsonl");
    const result = normalizeOpencodeResult(jsonl);

    expect(result.sessionId).toBe("ses_abc123");
  });

  test("calculates durationMs from timestamps", () => {
    const jsonl = loadFixture("opencode-success.jsonl");
    const result = normalizeOpencodeResult(jsonl);

    // step_finish timestamp (1704067201000) - step_start timestamp (1704067200000) = 1000
    expect(result.durationMs).toBe(1000);
  });

  test("extracts tokenUsage from step_finish", () => {
    const jsonl = loadFixture("opencode-success.jsonl");
    const result = normalizeOpencodeResult(jsonl);

    expect(result.tokenUsage).toBeDefined();
    expect(result.tokenUsage?.input).toBe(1500);
    expect(result.tokenUsage?.output).toBe(250);
    expect(result.tokenUsage?.reasoning).toBe(100);
    expect(result.tokenUsage?.cacheRead).toBe(0);
    expect(result.tokenUsage?.cacheWrite).toBe(0);
  });
});

// =============================================================================
// Multiline Fixture Tests
// =============================================================================

describe("normalizeOpencodeResult - multiline fixture", () => {
  test("concatenates text from multiple text events", () => {
    const jsonl = loadFixture("opencode-multiline.jsonl");
    const result = normalizeOpencodeResult(jsonl);

    expect(result.result).toBe(
      "First line of output.\nSecond line of output.\nThird and final line.",
    );
  });

  test("extracts costUsd from multiline stream", () => {
    const jsonl = loadFixture("opencode-multiline.jsonl");
    const result = normalizeOpencodeResult(jsonl);

    expect(result.costUsd).toBe(0.015);
  });

  test("extracts sessionId from multiline stream", () => {
    const jsonl = loadFixture("opencode-multiline.jsonl");
    const result = normalizeOpencodeResult(jsonl);

    expect(result.sessionId).toBe("ses_multi001");
  });

  test("extracts full tokenUsage from multiline stream", () => {
    const jsonl = loadFixture("opencode-multiline.jsonl");
    const result = normalizeOpencodeResult(jsonl);

    expect(result.tokenUsage).toEqual({
      cacheRead: 2000,
      cacheWrite: 500,
      input: 5000,
      output: 1200,
      reasoning: 300,
    });
  });
});

// =============================================================================
// Partial Fixture Tests (Issue #8203 simulation)
// =============================================================================

describe("normalizeOpencodeResult - partial fixture (Issue #8203)", () => {
  test("throws when step_finish is missing", () => {
    const jsonl = loadFixture("opencode-partial.jsonl");

    expect(() => normalizeOpencodeResult(jsonl)).toThrow(
      'No step_finish event with reason "stop" found in OpenCode output',
    );
  });
});

// =============================================================================
// Error Fixture Tests
// =============================================================================

describe("normalizeOpencodeResult - error fixture", () => {
  test('throws when step_finish has reason "error" instead of "stop"', () => {
    const jsonl = loadFixture("opencode-error.jsonl");

    expect(() => normalizeOpencodeResult(jsonl)).toThrow(
      'No step_finish event with reason "stop" found in OpenCode output',
    );
  });
});

// =============================================================================
// Empty Fixture Tests
// =============================================================================

describe("normalizeOpencodeResult - empty fixture", () => {
  test("throws on empty stream", () => {
    const jsonl = loadFixture("opencode-empty.jsonl");

    expect(() => normalizeOpencodeResult(jsonl)).toThrow(
      "Empty JSONL output from OpenCode",
    );
  });
});

// =============================================================================
// Malformed JSON Tests
// =============================================================================

describe("normalizeOpencodeResult - malformed JSON", () => {
  test("throws on invalid JSON line", () => {
    const jsonl =
      '{"type":"step_start"}\nnot valid json\n{"type":"step_finish"}';

    expect(() => normalizeOpencodeResult(jsonl)).toThrow(
      "Malformed JSON line in OpenCode output",
    );
  });

  test("includes truncated line content in error message", () => {
    const longBadLine = "x".repeat(200);
    const jsonl = `{"type":"step_start"}\n${longBadLine}`;

    expect(() => normalizeOpencodeResult(jsonl)).toThrow("Malformed JSON line");
  });

  test("throws on bare string input", () => {
    expect(() => normalizeOpencodeResult("just a string")).toThrow(
      "Malformed JSON line",
    );
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("normalizeOpencodeResult - edge cases", () => {
  test("handles empty string input", () => {
    expect(() => normalizeOpencodeResult("")).toThrow(
      "Empty JSONL output from OpenCode",
    );
  });

  test("handles whitespace-only input", () => {
    expect(() => normalizeOpencodeResult("  \n  \n  ")).toThrow(
      "Empty JSONL output from OpenCode",
    );
  });

  test("handles step_finish without step_start (no sessionId)", () => {
    const jsonl = [
      '{"type":"text","timestamp":1704067200100,"part":{"text":"Hello"}}',
      '{"type":"step_finish","timestamp":1704067201000,"part":{"reason":"stop","cost":0.001,"tokens":{"input":100,"output":10}}}',
    ].join("\n");

    const result = normalizeOpencodeResult(jsonl);
    expect(result.sessionId).toBe("");
    expect(result.result).toBe("Hello");
    expect(result.costUsd).toBe(0.001);
  });

  test("handles step_finish without tokens", () => {
    const jsonl = [
      '{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_no_tokens"}',
      '{"type":"step_finish","timestamp":1704067201000,"part":{"reason":"stop","cost":0.002}}',
    ].join("\n");

    const result = normalizeOpencodeResult(jsonl);
    expect(result.tokenUsage).toBeUndefined();
    expect(result.costUsd).toBe(0.002);
  });

  test("handles step_finish without cost", () => {
    const jsonl = [
      '{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_no_cost"}',
      '{"type":"step_finish","timestamp":1704067201000,"part":{"reason":"stop","tokens":{"input":100,"output":10}}}',
    ].join("\n");

    const result = normalizeOpencodeResult(jsonl);
    expect(result.costUsd).toBe(0);
  });

  test("handles text event with null text field", () => {
    const jsonl = [
      '{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_null"}',
      '{"type":"text","timestamp":1704067200100,"part":{"text":null}}',
      '{"type":"text","timestamp":1704067200200,"part":{"text":"valid text"}}',
      '{"type":"step_finish","timestamp":1704067201000,"part":{"reason":"stop","cost":0.001,"tokens":{"input":100,"output":10}}}',
    ].join("\n");

    const result = normalizeOpencodeResult(jsonl);
    expect(result.result).toBe("valid text");
  });

  test("handles text event with missing part", () => {
    const jsonl = [
      '{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_missing_part"}',
      '{"type":"text","timestamp":1704067200100}',
      '{"type":"text","timestamp":1704067200200,"part":{"text":"has text"}}',
      '{"type":"step_finish","timestamp":1704067201000,"part":{"reason":"stop","cost":0.001,"tokens":{"input":100,"output":10}}}',
    ].join("\n");

    const result = normalizeOpencodeResult(jsonl);
    expect(result.result).toBe("has text");
  });

  test("handles no text events (empty result)", () => {
    const jsonl = [
      '{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_no_text"}',
      '{"type":"step_finish","timestamp":1704067201000,"part":{"reason":"stop","cost":0.001,"tokens":{"input":100,"output":10}}}',
    ].join("\n");

    const result = normalizeOpencodeResult(jsonl);
    expect(result.result).toBe("");
  });

  test("handles missing timestamps (durationMs defaults to 0)", () => {
    const jsonl = [
      '{"type":"step_start","sessionID":"ses_no_ts"}',
      '{"type":"text","part":{"text":"Hello"}}',
      '{"type":"step_finish","part":{"reason":"stop","cost":0.001,"tokens":{"input":100,"output":10}}}',
    ].join("\n");

    const result = normalizeOpencodeResult(jsonl);
    expect(result.durationMs).toBe(0);
  });

  test("handles extra whitespace between lines", () => {
    const jsonl = [
      '{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_ws"}',
      "",
      '  {"type":"text","timestamp":1704067200100,"part":{"text":"Hello"}}  ',
      "",
      '{"type":"step_finish","timestamp":1704067201000,"part":{"reason":"stop","cost":0.001,"tokens":{"input":100,"output":10}}}',
      "",
    ].join("\n");

    const result = normalizeOpencodeResult(jsonl);
    expect(result.result).toBe("Hello");
    expect(result.sessionId).toBe("ses_ws");
  });

  test("handles tokens with missing optional fields", () => {
    const jsonl = [
      '{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_partial_tokens"}',
      '{"type":"step_finish","timestamp":1704067201000,"part":{"reason":"stop","cost":0.001,"tokens":{"input":500,"output":100}}}',
    ].join("\n");

    const result = normalizeOpencodeResult(jsonl);
    expect(result.tokenUsage).toEqual({
      cacheRead: undefined,
      cacheWrite: undefined,
      input: 500,
      output: 100,
      reasoning: undefined,
    });
  });

  test("ignores unknown event types", () => {
    const jsonl = [
      '{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_unknown"}',
      '{"type":"tool_call","timestamp":1704067200050,"part":{"name":"read_file"}}',
      '{"type":"text","timestamp":1704067200100,"part":{"text":"Result"}}',
      '{"type":"tool_result","timestamp":1704067200150,"part":{"output":"file contents"}}',
      '{"type":"step_finish","timestamp":1704067201000,"part":{"reason":"stop","cost":0.005,"tokens":{"input":1000,"output":200}}}',
    ].join("\n");

    const result = normalizeOpencodeResult(jsonl);
    expect(result.result).toBe("Result");
    expect(result.costUsd).toBe(0.005);
  });
});

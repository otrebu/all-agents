import {
  buildPrompt,
  normalizeClaudeResult,
} from "@tools/commands/ralph/providers/claude";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// =============================================================================
// Fixtures
// =============================================================================

const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf8");
}

// =============================================================================
// normalizeClaudeResult Tests
// =============================================================================

describe("normalizeClaudeResult", () => {
  test("parses successful response with all fields", () => {
    const json = loadFixture("claude-success.json");
    const result = normalizeClaudeResult(json);

    expect(result.result).toBe(
      "Task completed successfully.\n\nAll changes have been applied.",
    );
    expect(result.costUsd).toBe(0.0847);
    expect(result.durationMs).toBe(45_230);
    expect(result.sessionId).toBe("abc-123-def-456");
    expect(result.tokenUsage).toBeDefined();
    expect(result.tokenUsage?.input).toBe(15_200);
    expect(result.tokenUsage?.output).toBe(3400);
    expect(result.tokenUsage?.cacheRead).toBe(12_000);
    expect(result.tokenUsage?.cacheWrite).toBe(800);
  });

  test("parses minimal response with only required fields", () => {
    const json = loadFixture("claude-minimal.json");
    const result = normalizeClaudeResult(json);

    expect(result.result).toBe("Done.");
    expect(result.costUsd).toBe(0);
    expect(result.durationMs).toBe(0);
    expect(result.sessionId).toBe("");
    expect(result.tokenUsage).toBeUndefined();
  });

  test("parses error response", () => {
    const json = loadFixture("claude-error.json");
    const result = normalizeClaudeResult(json);

    expect(result.result).toBe("");
    expect(result.costUsd).toBe(0.25);
    expect(result.durationMs).toBe(120_000);
    expect(result.sessionId).toBe("err-session-789");
  });

  test("throws on malformed JSON", () => {
    const json = loadFixture("claude-malformed.txt");
    expect(() => normalizeClaudeResult(json)).toThrow();
  });

  test("handles single object (not array)", () => {
    const json = JSON.stringify({
      duration_ms: 1000,
      result: "single object",
      session_id: "sess-1",
      total_cost_usd: 0.01,
      type: "result",
    });
    const result = normalizeClaudeResult(json);

    expect(result.result).toBe("single object");
    expect(result.costUsd).toBe(0.01);
    expect(result.durationMs).toBe(1000);
    expect(result.sessionId).toBe("sess-1");
  });

  test("finds result entry even when not last in array", () => {
    const json = JSON.stringify([
      { type: "system" },
      {
        duration_ms: 5000,
        result: "middle result",
        session_id: "mid-1",
        total_cost_usd: 0.02,
        type: "result",
      },
      { content: "trailing non-result entry", type: "assistant" },
    ]);

    // findLast finds the last "result" type entry, not the array's last element
    const result = normalizeClaudeResult(json);
    expect(result.result).toBe("middle result");
    expect(result.costUsd).toBe(0.02);
  });

  test("falls back to last array element when no result type", () => {
    const json = JSON.stringify([
      { type: "system" },
      {
        duration_ms: 2000,
        result: "fallback",
        total_cost_usd: 0.03,
        type: "assistant",
      },
    ]);
    const result = normalizeClaudeResult(json);

    expect(result.result).toBe("fallback");
    expect(result.costUsd).toBe(0.03);
  });

  test("returns defaults for empty array", () => {
    const json = "[]";
    const result = normalizeClaudeResult(json);

    expect(result.result).toBe("");
    expect(result.costUsd).toBe(0);
    expect(result.durationMs).toBe(0);
    expect(result.sessionId).toBe("");
  });
});

// =============================================================================
// buildPrompt Tests
// =============================================================================

describe("buildPrompt", () => {
  test("returns content when no extra context", () => {
    expect(buildPrompt("hello")).toBe("hello");
  });

  test("returns content when extra context is empty string", () => {
    expect(buildPrompt("hello", "")).toBe("hello");
  });

  test("prepends extra context with double newline", () => {
    expect(buildPrompt("hello", "context")).toBe("context\n\nhello");
  });
});

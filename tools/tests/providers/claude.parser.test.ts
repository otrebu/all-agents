import { normalizeClaudeResult } from "@tools/commands/ralph/providers/claude";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// =============================================================================
// Fixture Helpers
// =============================================================================

const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures", "claude");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf8");
}

// =============================================================================
// normalizeClaudeResult — Complete Result Parsing
// =============================================================================

describe("normalizeClaudeResult", () => {
  describe("complete result parsing", () => {
    test("extracts all fields from full success fixture", () => {
      const json = loadFixture("claude-success.json");
      const result = normalizeClaudeResult(json);

      expect(result.result).toBe(
        "Task completed successfully.\n\nAll changes have been applied.",
      );
      expect(result.costUsd).toBe(0.0847);
      expect(result.durationMs).toBe(45_230);
      expect(result.sessionId).toBe("abc-123-def-456");
    });

    test("extracts token usage from full success fixture", () => {
      const json = loadFixture("claude-success.json");
      const result = normalizeClaudeResult(json);

      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage?.input).toBe(15_200);
      expect(result.tokenUsage?.output).toBe(3400);
      expect(result.tokenUsage?.cacheRead).toBe(12_000);
      expect(result.tokenUsage?.cacheWrite).toBe(800);
    });
  });

  // ===========================================================================
  // Minimal Success Fixture
  // ===========================================================================

  describe("minimal success fixture", () => {
    test("parses result with only required fields", () => {
      const json = loadFixture("claude-success-minimal.json");
      const result = normalizeClaudeResult(json);

      expect(result.result).toBe("Done.");
    });

    test("defaults numeric fields to 0 when absent", () => {
      const json = loadFixture("claude-success-minimal.json");
      const result = normalizeClaudeResult(json);

      expect(result.costUsd).toBe(0);
      expect(result.durationMs).toBe(0);
    });

    test("defaults sessionId to empty string when absent", () => {
      const json = loadFixture("claude-success-minimal.json");
      const result = normalizeClaudeResult(json);

      expect(result.sessionId).toBe("");
    });

    test("omits tokenUsage when no usage field", () => {
      const json = loadFixture("claude-success-minimal.json");
      const result = normalizeClaudeResult(json);

      expect(result.tokenUsage).toBeUndefined();
    });
  });

  // ===========================================================================
  // Error Fixture
  // ===========================================================================

  describe("error response", () => {
    test("parses error fixture and extracts cost/duration", () => {
      const json = loadFixture("claude-error.json");
      const result = normalizeClaudeResult(json);

      expect(result.result).toBe("");
      expect(result.costUsd).toBe(0.25);
      expect(result.durationMs).toBe(120_000);
      expect(result.sessionId).toBe("err-session-789");
    });
  });

  // ===========================================================================
  // Malformed JSON
  // ===========================================================================

  describe("malformed JSON", () => {
    test("throws on invalid JSON", () => {
      const json = loadFixture("claude-malformed.txt");
      expect(() => normalizeClaudeResult(json)).toThrow();
    });

    test("throws SyntaxError specifically", () => {
      const json = loadFixture("claude-malformed.txt");
      expect(() => normalizeClaudeResult(json)).toThrow(SyntaxError);
    });
  });

  // ===========================================================================
  // Empty Array
  // ===========================================================================

  describe("empty array", () => {
    test("returns defaults for empty array", () => {
      const json = loadFixture("claude-empty-array.json");
      const result = normalizeClaudeResult(json);

      expect(result.result).toBe("");
      expect(result.costUsd).toBe(0);
      expect(result.durationMs).toBe(0);
      expect(result.sessionId).toBe("");
      expect(result.tokenUsage).toBeUndefined();
    });
  });

  // ===========================================================================
  // No Result Entry
  // ===========================================================================

  describe("no result entry", () => {
    test("falls back to last array element when no result type", () => {
      const json = loadFixture("claude-no-result-entry.json");
      const result = normalizeClaudeResult(json);

      // Falls back to last element (assistant entry), which has no AgentResult fields
      expect(result.result).toBe("");
      expect(result.costUsd).toBe(0);
      expect(result.durationMs).toBe(0);
    });
  });

  // ===========================================================================
  // Partial Result
  // ===========================================================================

  describe("partial result", () => {
    test("handles result entry missing session_id", () => {
      const json = loadFixture("claude-partial-result.json");
      const result = normalizeClaudeResult(json);

      expect(result.sessionId).toBe("");
    });

    test("handles result entry missing usage/tokenUsage", () => {
      const json = loadFixture("claude-partial-result.json");
      const result = normalizeClaudeResult(json);

      expect(result.tokenUsage).toBeUndefined();
    });

    test("extracts present fields from partial result", () => {
      const json = loadFixture("claude-partial-result.json");
      const result = normalizeClaudeResult(json);

      expect(result.result).toBe("Partial task done.");
      expect(result.costUsd).toBe(0.01);
      expect(result.durationMs).toBe(5000);
    });
  });

  // ===========================================================================
  // Numeric String Conversion
  // ===========================================================================

  describe("numeric string conversion", () => {
    test("treats string cost as 0 (not a number)", () => {
      const json = JSON.stringify([
        {
          duration_ms: 1000,
          result: "test",
          total_cost_usd: "0.05",
          type: "result",
        },
      ]);
      const result = normalizeClaudeResult(json);

      // normalizeClaudeResult checks typeof === "number", strings default to 0
      expect(result.costUsd).toBe(0);
    });

    test("treats string duration as 0 (not a number)", () => {
      const json = JSON.stringify([
        {
          duration_ms: "5000",
          result: "test",
          total_cost_usd: 0.01,
          type: "result",
        },
      ]);
      const result = normalizeClaudeResult(json);

      expect(result.durationMs).toBe(0);
    });

    test("handles actual numeric values correctly", () => {
      const json = JSON.stringify([
        {
          duration_ms: 12_345,
          result: "test",
          total_cost_usd: 0.99,
          type: "result",
        },
      ]);
      const result = normalizeClaudeResult(json);

      expect(result.costUsd).toBe(0.99);
      expect(result.durationMs).toBe(12_345);
    });
  });
});

/**
 * Unit tests for OpenCode provider implementation
 *
 * Tests normalizeOpencodeResult() JSONL parsing, buildOpencodeEnv() permission
 * bypass setup, buildOpencodeArguments() model format handling, and exported constants.
 *
 * Uses static JSONL fixtures from __fixtures__/ and inline test data.
 *
 * @see docs/planning/milestones/004-MULTI-CLI/tasks/TASK-045-opencode-implementation.md
 */

import type { OpencodeConfig } from "@tools/commands/ralph/providers/types";

import {
  buildOpencodeArguments,
  buildOpencodeEnv,
  DEFAULT_HARD_TIMEOUT_MS,
  normalizeOpencodeResult,
  OPENCODE_PERMISSION_VALUE,
} from "@tools/commands/ralph/providers/opencode";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// =============================================================================
// Fixture Loading
// =============================================================================

const FIXTURES_DIR = join(
  import.meta.dir,
  "../../src/commands/ralph/providers/__fixtures__",
);

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf8");
}

// =============================================================================
// normalizeOpencodeResult — Valid JSONL
// =============================================================================

describe("normalizeOpencodeResult - valid JSONL fixture", () => {
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

  test("supports cache tokens from modern nested cache shape", () => {
    const jsonl = [
      '{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_nested_cache"}',
      '{"type":"step_finish","timestamp":1704067201000,"part":{"reason":"stop","cost":0.001,"tokens":{"input":100,"output":10,"cache":{"read":7,"write":3}}}}',
    ].join("\n");

    const result = normalizeOpencodeResult(jsonl);
    expect(result.tokenUsage?.cacheRead).toBe(7);
    expect(result.tokenUsage?.cacheWrite).toBe(3);
  });
});

// =============================================================================
// normalizeOpencodeResult — Multi-line Streams
// =============================================================================

describe("normalizeOpencodeResult - multi-line streams", () => {
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
// normalizeOpencodeResult — Missing step_finish
// =============================================================================

describe("normalizeOpencodeResult - missing step_finish", () => {
  test("throws when step_finish is missing (Issue #8203 hang simulation)", () => {
    const jsonl = loadFixture("opencode-partial.jsonl");

    expect(() => normalizeOpencodeResult(jsonl)).toThrow(
      'No step_finish event with reason "stop" found in OpenCode output',
    );
  });

  test('throws when step_finish has reason "error" instead of "stop"', () => {
    const jsonl = loadFixture("opencode-error.jsonl");

    expect(() => normalizeOpencodeResult(jsonl)).toThrow(
      'No step_finish event with reason "stop" found in OpenCode output',
    );
  });
});

// =============================================================================
// normalizeOpencodeResult — Empty Input
// =============================================================================

describe("normalizeOpencodeResult - empty input", () => {
  test("throws on empty fixture file", () => {
    const jsonl = loadFixture("opencode-empty.jsonl");

    expect(() => normalizeOpencodeResult(jsonl)).toThrow(
      "Empty JSONL output from OpenCode",
    );
  });

  test("throws on empty string", () => {
    expect(() => normalizeOpencodeResult("")).toThrow(
      "Empty JSONL output from OpenCode",
    );
  });

  test("throws on whitespace-only input", () => {
    expect(() => normalizeOpencodeResult("  \n  \n  ")).toThrow(
      "Empty JSONL output from OpenCode",
    );
  });
});

// =============================================================================
// normalizeOpencodeResult — Malformed JSON
// =============================================================================

describe("normalizeOpencodeResult - malformed JSON", () => {
  test("throws on invalid JSON line", () => {
    const jsonl =
      '{"type":"step_start"}\nnot valid json\n{"type":"step_finish"}';

    expect(() => normalizeOpencodeResult(jsonl)).toThrow(
      "Malformed JSON line in OpenCode output",
    );
  });

  test("throws on bare string input", () => {
    expect(() => normalizeOpencodeResult("just a string")).toThrow(
      "Malformed JSON line",
    );
  });
});

// =============================================================================
// buildOpencodeEnv — Permission Bypass Verification
// =============================================================================

describe("buildOpencodeEnv - permission bypass", () => {
  test("includes OPENCODE_PERMISSION in environment", () => {
    const env = buildOpencodeEnv();

    expect(env.OPENCODE_PERMISSION).toBe('{"*":"allow"}');
  });

  test("OPENCODE_PERMISSION matches exported constant", () => {
    const env = buildOpencodeEnv();

    expect(env.OPENCODE_PERMISSION).toBe(OPENCODE_PERMISSION_VALUE);
  });

  test("inherits current process environment", () => {
    const env = buildOpencodeEnv();

    // PATH should always exist in the environment
    expect(env.PATH).toBeDefined();
    expect(env.PATH).toBe(process.env.PATH);
  });

  test("OPENCODE_PERMISSION overrides any existing value", () => {
    // Even if OPENCODE_PERMISSION is already set in process.env,
    // buildOpencodeEnv should override it with the automation value
    const originalValue = process.env.OPENCODE_PERMISSION;
    try {
      process.env.OPENCODE_PERMISSION = "custom_value";
      const env = buildOpencodeEnv();

      expect(env.OPENCODE_PERMISSION).toBe('{"*":"allow"}');
    } finally {
      // Restore original value
      if (originalValue === undefined) {
        delete process.env.OPENCODE_PERMISSION;
      } else {
        process.env.OPENCODE_PERMISSION = originalValue;
      }
    }
  });
});

// =============================================================================
// buildOpencodeArguments — Model Format Validation
// =============================================================================

describe("buildOpencodeArguments - model format", () => {
  test("uses opencode run subcommand", () => {
    const config: OpencodeConfig = { provider: "opencode" };
    const args = buildOpencodeArguments(config, "test prompt");

    expect(args[0]).toBe("run");
  });

  test("includes --format json flag", () => {
    const config: OpencodeConfig = { provider: "opencode" };
    const args = buildOpencodeArguments(config, "test prompt");

    expect(args).toContain("--format");
    expect(args).toContain("json");
    // Verify order: --format comes before json
    const formatIndex = args.indexOf("--format");
    expect(args[formatIndex + 1]).toBe("json");
  });

  test("passes prompt as positional message argument", () => {
    const config: OpencodeConfig = { provider: "opencode" };
    const args = buildOpencodeArguments(config, "build the feature");

    expect(args).not.toContain("--prompt");
    expect(args.at(-1)).toBe("build the feature");
  });

  test("includes --model with provider/model format", () => {
    const config: OpencodeConfig = {
      model: "anthropic/claude-sonnet-4-20250514",
      provider: "opencode",
    };
    const args = buildOpencodeArguments(config, "test");

    expect(args).toContain("--model");
    const modelIndex = args.indexOf("--model");
    expect(args[modelIndex + 1]).toBe("anthropic/claude-sonnet-4-20250514");
  });

  test("supports openai model format", () => {
    const config: OpencodeConfig = {
      model: "openai/gpt-4o",
      provider: "opencode",
    };
    const args = buildOpencodeArguments(config, "test");

    const modelIndex = args.indexOf("--model");
    expect(args[modelIndex + 1]).toBe("openai/gpt-4o");
  });

  test("supports google model format", () => {
    const config: OpencodeConfig = {
      model: "google/gemini-2.5-pro-preview-05-06",
      provider: "opencode",
    };
    const args = buildOpencodeArguments(config, "test");

    const modelIndex = args.indexOf("--model");
    expect(args[modelIndex + 1]).toBe("google/gemini-2.5-pro-preview-05-06");
  });

  test("omits --model when model is undefined", () => {
    const config: OpencodeConfig = { provider: "opencode" };
    const args = buildOpencodeArguments(config, "test");

    expect(args).not.toContain("--model");
  });

  test("omits --model when model is empty string", () => {
    const config: OpencodeConfig = { model: "", provider: "opencode" };
    const args = buildOpencodeArguments(config, "test");

    expect(args).not.toContain("--model");
  });
});

// =============================================================================
// Exported Constants
// =============================================================================

describe("exported constants", () => {
  test("DEFAULT_HARD_TIMEOUT_MS is 60 minutes", () => {
    expect(DEFAULT_HARD_TIMEOUT_MS).toBe(3_600_000);
  });

  test("OPENCODE_PERMISSION_VALUE grants all permissions", () => {
    const parsed = JSON.parse(OPENCODE_PERMISSION_VALUE) as Record<
      string,
      string
    >;
    expect(parsed["*"]).toBe("allow");
  });
});

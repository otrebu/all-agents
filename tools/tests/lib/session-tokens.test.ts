import type { TokenUsage } from "@tools/commands/ralph/types";

import { getTokenUsageFromSession } from "@tools/commands/ralph/session";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("getTokenUsageFromSession", () => {
  const testDirectory = join(tmpdir(), `session-tokens-test-${Date.now()}`);

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

  test("function is exported", () => {
    expect(typeof getTokenUsageFromSession).toBe("function");
  });

  test("returns zeros for missing file", () => {
    const result = getTokenUsageFromSession("/nonexistent/path/session.jsonl");
    expect(result).toEqual({
      contextTokens: 0,
      outputTokens: 0,
    } satisfies TokenUsage);
  });

  test("returns zeros for empty file", () => {
    const emptyPath = join(testDirectory, "empty.jsonl");
    writeFileSync(emptyPath, "");
    const result = getTokenUsageFromSession(emptyPath);
    expect(result).toEqual({
      contextTokens: 0,
      outputTokens: 0,
    } satisfies TokenUsage);
  });

  test("extracts token usage from single entry", () => {
    const singleEntryPath = join(testDirectory, "single.jsonl");
    const entry = {
      message: {
        usage: {
          cache_creation_input_tokens: 100,
          cache_read_input_tokens: 200,
          input_tokens: 50,
          output_tokens: 75,
        },
      },
      type: "assistant",
    };
    writeFileSync(singleEntryPath, `${JSON.stringify(entry)}\n`);

    const result = getTokenUsageFromSession(singleEntryPath);
    // Context = cache_read + cache_creation + input = 200 + 100 + 50 = 350
    expect(result).toEqual({
      contextTokens: 350,
      outputTokens: 75,
    } satisfies TokenUsage);
  });

  test("tracks final context from multiple entries (not sum)", () => {
    const multiPath = join(testDirectory, "multi.jsonl");
    const entries = [
      {
        message: {
          usage: {
            cache_creation_input_tokens: 100,
            cache_read_input_tokens: 200,
            input_tokens: 50,
            output_tokens: 75,
          },
        },
        type: "assistant",
      },
      {
        message: {
          usage: {
            cache_creation_input_tokens: 50,
            cache_read_input_tokens: 300,
            input_tokens: 25,
            output_tokens: 100,
          },
        },
        type: "assistant",
      },
      {
        message: {
          usage: {
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 500,
            input_tokens: 10,
            output_tokens: 50,
          },
        },
        type: "assistant",
      },
    ];
    writeFileSync(
      multiPath,
      entries.map((entry) => JSON.stringify(entry)).join("\n"),
    );

    const result = getTokenUsageFromSession(multiPath);
    // Context = LAST entry only: 0 + 500 + 10 = 510
    // Output = summed: 75 + 100 + 50 = 225
    expect(result).toEqual({
      contextTokens: 510,
      outputTokens: 225,
    } satisfies TokenUsage);
  });

  test("ignores lines without usage data", () => {
    const mixedPath = join(testDirectory, "mixed.jsonl");
    const entries = [
      { summary: "Test summary", type: "summary" },
      {
        message: {
          usage: {
            cache_creation_input_tokens: 100,
            cache_read_input_tokens: 200,
            input_tokens: 50,
            output_tokens: 75,
          },
        },
        type: "assistant",
      },
      { message: "Hello", type: "user" },
    ];
    writeFileSync(
      mixedPath,
      entries.map((entry) => JSON.stringify(entry)).join("\n"),
    );

    const result = getTokenUsageFromSession(mixedPath);
    // Context = 100 + 200 + 50 = 350
    expect(result).toEqual({
      contextTokens: 350,
      outputTokens: 75,
    } satisfies TokenUsage);
  });

  test("handles missing usage fields gracefully", () => {
    const partialPath = join(testDirectory, "partial.jsonl");
    const entries = [
      {
        message: { usage: { input_tokens: 50, output_tokens: 75 } },
        type: "assistant",
      },
      {
        message: { usage: { cache_read_input_tokens: 200 } },
        type: "assistant",
      },
    ];
    writeFileSync(
      partialPath,
      entries.map((entry) => JSON.stringify(entry)).join("\n"),
    );

    const result = getTokenUsageFromSession(partialPath);
    // Last entry only: cache_read=200, others default to 0, context=200
    // Output summed: 75 + 0 = 75
    expect(result).toEqual({
      contextTokens: 200,
      outputTokens: 75,
    } satisfies TokenUsage);
  });

  test("skips malformed JSON lines", () => {
    const malformedPath = join(testDirectory, "malformed.jsonl");
    const content = [
      "not valid json",
      JSON.stringify({
        message: { usage: { input_tokens: 50, output_tokens: 75 } },
        type: "assistant",
      }),
      "{incomplete: json",
    ].join("\n");
    writeFileSync(malformedPath, content);

    const result = getTokenUsageFromSession(malformedPath);
    // Context = input_tokens only (no cache fields) = 50
    expect(result).toEqual({
      contextTokens: 50,
      outputTokens: 75,
    } satisfies TokenUsage);
  });

  test("handles real session JSONL format", () => {
    const realPath = join(testDirectory, "real-format.jsonl");
    const entries = [
      {
        isSidechain: false,
        message: {
          content: [{ text: "Hello", type: "text" }],
          id: "msg_123",
          model: "claude-opus-4-5-20251101",
          role: "assistant",
          stop_reason: "end_turn",
          type: "message",
          usage: {
            cache_creation: { ephemeral_1h_input_tokens: 0 },
            cache_creation_input_tokens: 1449,
            cache_read_input_tokens: 17_761,
            input_tokens: 9,
            output_tokens: 315,
            service_tier: "standard",
          },
        },
        parentUuid: "abc-123",
        requestId: "req_123",
        sessionId: "session-123",
        timestamp: "2026-01-26T10:00:00.000Z",
        type: "assistant",
        userType: "external",
        uuid: "def-456",
        version: "2.1.4",
      },
    ];
    writeFileSync(
      realPath,
      entries.map((entry) => JSON.stringify(entry)).join("\n"),
    );

    const result = getTokenUsageFromSession(realPath);
    // Context = 1449 + 17761 + 9 = 19219
    expect(result).toEqual({
      contextTokens: 19_219,
      outputTokens: 315,
    } satisfies TokenUsage);
  });
});

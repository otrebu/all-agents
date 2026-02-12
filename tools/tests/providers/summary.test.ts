import {
  DEFAULT_LIGHTWEIGHT_MODELS,
  invokeProviderSummary,
  normalizeSummaryResultText,
  resolveLightweightModelForProvider,
} from "@tools/commands/ralph/providers/summary";
import { describe, expect, mock, test } from "bun:test";

describe("provider summary model resolution", () => {
  test("uses configured model when provided", () => {
    const model = resolveLightweightModelForProvider(
      "claude",
      "claude-sonnet-4-20250514",
    );
    expect(model).toBe("claude-sonnet-4-20250514");
  });

  test("uses claude default lightweight model when unset", () => {
    expect(resolveLightweightModelForProvider("claude")).toBe(
      "claude-3-5-haiku-latest",
    );
  });

  test("uses opencode default lightweight model when unset", () => {
    expect(resolveLightweightModelForProvider("opencode")).toBe(
      "anthropic/claude-3-5-haiku-latest",
    );
  });

  test("uses cursor default lightweight model when unset", () => {
    expect(resolveLightweightModelForProvider("cursor")).toBe("auto");
  });

  test("returns undefined for providers without summary defaults", () => {
    expect(resolveLightweightModelForProvider("codex")).toBeUndefined();
  });

  test("exposes defaults map for claude, cursor, and opencode", () => {
    expect(DEFAULT_LIGHTWEIGHT_MODELS.claude).toBe("claude-3-5-haiku-latest");
    expect(DEFAULT_LIGHTWEIGHT_MODELS.cursor).toBe("auto");
    expect(DEFAULT_LIGHTWEIGHT_MODELS.opencode).toBe(
      "anthropic/claude-3-5-haiku-latest",
    );
  });
});

describe("normalizeSummaryResultText", () => {
  test("trims non-empty summary text", () => {
    expect(normalizeSummaryResultText("  hello world  ")).toBe("hello world");
  });

  test("returns null for empty summary text", () => {
    expect(normalizeSummaryResultText("   ")).toBeNull();
  });
});

describe("invokeProviderSummary", () => {
  test("returns null for unsupported providers", async () => {
    const result = await invokeProviderSummary({
      prompt: "test prompt",
      provider: "codex",
    });

    expect(result).toBeNull();
  });

  test("uses cursor summary invoker when provider is cursor", async () => {
    const invokeCursor = mock(async (_options: unknown) => {
      void _options;
      await Promise.resolve();
      return {
        costUsd: 0,
        durationMs: 5,
        result: "  cursor summary  ",
        sessionId: "cursor-ses-1",
      };
    });

    const result = await invokeProviderSummary(
      { prompt: "test prompt", provider: "cursor" },
      { invokeCursor },
    );

    expect(result).toBe("cursor summary");
    expect(invokeCursor).toHaveBeenCalledTimes(1);
    expect(invokeCursor).toHaveBeenCalledWith({
      config: {
        model: "auto",
        persistSession: false,
        provider: "cursor",
        timeoutMs: 30_000,
      },
      mode: "headless-async",
      prompt: "test prompt",
    });
  });

  test("returns null when cursor summary text is blank", async () => {
    const result = await invokeProviderSummary(
      { prompt: "test prompt", provider: "cursor" },
      {
        invokeCursor: async () => {
          await Promise.resolve();
          return {
            costUsd: 0,
            durationMs: 5,
            result: "   ",
            sessionId: "cursor-ses-2",
          };
        },
      },
    );

    expect(result).toBeNull();
  });
});

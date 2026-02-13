import {
  DEFAULT_LIGHTWEIGHT_MODELS,
  invokeProviderSummary,
  resolveLightweightModelForProvider,
} from "@tools/commands/ralph/providers/summary";
import { describe, expect, test } from "bun:test";

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

  test("uses codex default lightweight model when unset", () => {
    expect(resolveLightweightModelForProvider("codex")).toBe(
      "openai/gpt-5.1-codex-mini",
    );
  });

  test("exposes defaults map for claude and opencode", () => {
    expect(DEFAULT_LIGHTWEIGHT_MODELS.claude).toBe("claude-3-5-haiku-latest");
    expect(DEFAULT_LIGHTWEIGHT_MODELS.opencode).toBe(
      "anthropic/claude-3-5-haiku-latest",
    );
    expect(DEFAULT_LIGHTWEIGHT_MODELS.codex).toBe("openai/gpt-5.1-codex-mini");
  });
});

describe("invokeProviderSummary", () => {
  test("returns null for unsupported providers", async () => {
    const result = await invokeProviderSummary({
      prompt: "test prompt",
      provider: "gemini",
    });

    expect(result).toBeNull();
  });
});

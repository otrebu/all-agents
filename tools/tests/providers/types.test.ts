import {
  type AgentResult,
  type ClaudeConfig,
  type CodexConfig,
  type CursorConfig,
  type GeminiConfig,
  type InvocationMode,
  type OpencodeConfig,
  type PiConfig,
  PROVIDER_BINARIES,
  type ProviderConfig,
  type ProviderType,
} from "@tools/commands/ralph/providers/types";
import { describe, expect, test } from "bun:test";

// =============================================================================
// PROVIDER_BINARIES Tests
// =============================================================================

describe("PROVIDER_BINARIES", () => {
  const allProviders: Array<ProviderType> = [
    "claude",
    "opencode",
    "codex",
    "gemini",
    "pi",
    "cursor",
  ];

  test("maps all 6 providers", () => {
    expect(Object.keys(PROVIDER_BINARIES)).toHaveLength(6);
  });

  test("has entry for every ProviderType value", () => {
    for (const provider of allProviders) {
      expect(PROVIDER_BINARIES[provider]).toBeDefined();
      expect(typeof PROVIDER_BINARIES[provider]).toBe("string");
    }
  });

  test("maps providers to correct binary names", () => {
    expect(PROVIDER_BINARIES.claude).toBe("claude");
    expect(PROVIDER_BINARIES.opencode).toBe("opencode");
    expect(PROVIDER_BINARIES.codex).toBe("codex");
    expect(PROVIDER_BINARIES.gemini).toBe("gemini");
    expect(PROVIDER_BINARIES.pi).toBe("pi");
    expect(PROVIDER_BINARIES.cursor).toBe("agent");
  });
});

// =============================================================================
// Discriminated Union Narrowing Tests
// =============================================================================

/**
 * Helper to extract provider name from a ProviderConfig using type narrowing.
 * Demonstrates that the discriminated union narrows correctly in a switch.
 */
function getProviderName(config: ProviderConfig): string {
  switch (config.provider) {
    case "claude": {
      const _narrowed: ClaudeConfig = config;
      return _narrowed.provider;
    }
    case "codex": {
      const _narrowed: CodexConfig = config;
      return _narrowed.provider;
    }
    case "cursor": {
      const _narrowed: CursorConfig = config;
      return _narrowed.provider;
    }
    case "gemini": {
      const _narrowed: GeminiConfig = config;
      return _narrowed.provider;
    }
    case "opencode": {
      const _narrowed: OpencodeConfig = config;
      return _narrowed.provider;
    }
    case "pi": {
      const _narrowed: PiConfig = config;
      return _narrowed.provider;
    }
    default: {
      throw new Error(`Unknown provider`);
    }
  }
}

describe("discriminated union narrowing", () => {
  test("narrows each provider config correctly via switch", () => {
    const configs: Array<ProviderConfig> = [
      { provider: "claude" },
      { model: "anthropic/claude-sonnet-4", provider: "opencode" },
      { model: "gpt-4o", provider: "codex" },
      { model: "gemini-2.0-flash", provider: "gemini" },
      { provider: "pi" },
      { provider: "cursor" },
    ];

    const providers: Array<string> = [];
    for (const config of configs) {
      providers.push(getProviderName(config));
    }

    expect(providers).toEqual([
      "claude",
      "opencode",
      "codex",
      "gemini",
      "pi",
      "cursor",
    ]);
  });

  test("provider-specific fields accessible after narrowing", () => {
    // Use a helper that accepts ProviderConfig and narrows to access model
    function getModel(config: ProviderConfig): string | undefined {
      if (config.provider === "opencode") {
        return config.model;
      }
      return undefined;
    }

    const config: ProviderConfig = {
      model: "anthropic/claude-sonnet-4",
      provider: "opencode",
    };

    expect(getProviderName(config)).toBe("opencode");
    expect(getModel(config)).toBe("anthropic/claude-sonnet-4");
  });

  test("all 6 providers are handled exhaustively", () => {
    const configs: Array<ProviderConfig> = [
      { provider: "claude" },
      { provider: "codex" },
      { provider: "cursor" },
      { provider: "gemini" },
      { provider: "opencode" },
      { provider: "pi" },
    ];

    expect(configs.map((config) => getProviderName(config))).toHaveLength(6);
  });
});

// =============================================================================
// AgentResult Shape Tests
// =============================================================================

describe("AgentResult shape", () => {
  test("accepts result with all required fields", () => {
    const result: AgentResult = {
      costUsd: 0.05,
      durationMs: 12_345,
      result: "Task completed",
      sessionId: "session-abc-123",
    };
    expect(result.costUsd).toBe(0.05);
    expect(result.durationMs).toBe(12_345);
    expect(result.sessionId).toBe("session-abc-123");
    expect(result.result).toBe("Task completed");
    expect(result.tokenUsage).toBeUndefined();
  });

  test("accepts result with token usage", () => {
    const result: AgentResult = {
      costUsd: 0.1,
      durationMs: 30_000,
      result: "Done",
      sessionId: "session-xyz",
      tokenUsage: {
        cacheRead: 500,
        cacheWrite: 100,
        input: 1000,
        output: 2000,
        reasoning: 300,
      },
    };
    expect(result.tokenUsage?.input).toBe(1000);
    expect(result.tokenUsage?.output).toBe(2000);
    expect(result.tokenUsage?.reasoning).toBe(300);
    expect(result.tokenUsage?.cacheRead).toBe(500);
    expect(result.tokenUsage?.cacheWrite).toBe(100);
  });

  test("accepts result with minimal token usage (only required fields)", () => {
    const result: AgentResult = {
      costUsd: 0,
      durationMs: 0,
      result: "",
      sessionId: "",
      tokenUsage: { input: 0, output: 0 },
    };
    expect(result.tokenUsage?.input).toBe(0);
    expect(result.tokenUsage?.reasoning).toBeUndefined();
  });
});

// =============================================================================
// InvocationMode Tests
// =============================================================================

describe("InvocationMode", () => {
  test("has exactly 3 values", () => {
    const modes: Array<InvocationMode> = [
      "supervised",
      "headless-sync",
      "headless-async",
    ];
    expect(modes).toHaveLength(3);
  });
});

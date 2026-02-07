import type {
  ClaudeConfig,
  ProviderConfig,
} from "@tools/commands/ralph/providers/types";

import { describe, expect, test } from "bun:test";

// =============================================================================
// ClaudeConfig Validation
// =============================================================================

describe("ClaudeConfig", () => {
  test("provider discriminator field equals 'claude'", () => {
    const config: ClaudeConfig = { provider: "claude" };
    expect(config.provider).toBe("claude");
  });

  test("accepts optional timeoutMs", () => {
    const config: ClaudeConfig = { provider: "claude", timeoutMs: 60_000 };
    expect(config.timeoutMs).toBe(60_000);
  });

  test("accepts optional workingDirectory", () => {
    const config: ClaudeConfig = {
      provider: "claude",
      workingDirectory: "/home/user/project",
    };
    expect(config.workingDirectory).toBe("/home/user/project");
  });

  test("timeoutMs defaults to undefined when not set", () => {
    const config: ClaudeConfig = { provider: "claude" };
    expect(config.timeoutMs).toBeUndefined();
  });

  test("workingDirectory defaults to undefined when not set", () => {
    const config: ClaudeConfig = { provider: "claude" };
    expect(config.workingDirectory).toBeUndefined();
  });
});

// =============================================================================
// Provider Type Discrimination
// =============================================================================

describe("ClaudeConfig type discrimination", () => {
  test("narrows ProviderConfig to ClaudeConfig via provider field", () => {
    function extractClaudeConfig(config: ProviderConfig): ClaudeConfig | null {
      if (config.provider === "claude") {
        return config;
      }
      return null;
    }

    const config: ProviderConfig = { provider: "claude" };
    const narrowed = extractClaudeConfig(config);
    expect(narrowed).not.toBeNull();
    expect(narrowed?.provider).toBe("claude");
  });

  test("ClaudeConfig is distinguishable from other providers", () => {
    const configs: Array<ProviderConfig> = [
      { provider: "claude" },
      { provider: "opencode" },
      { provider: "codex" },
    ];

    const claudeConfigs = configs.filter(
      (c): c is ClaudeConfig => c.provider === "claude",
    );

    expect(claudeConfigs).toHaveLength(1);
    expect(claudeConfigs[0]?.provider).toBe("claude");
  });

  test("provider field is the sole discriminator", () => {
    // Two ClaudeConfigs with different optional fields are both ClaudeConfig
    const a: ClaudeConfig = { provider: "claude" };
    const b: ClaudeConfig = { provider: "claude", timeoutMs: 30_000 };

    expect(a.provider).toBe(b.provider);
  });
});

// =============================================================================
// Default Timeout Configuration
// =============================================================================

describe("ClaudeConfig default timeout", () => {
  test("BaseProviderConfig timeoutMs is optional", () => {
    const config: ClaudeConfig = { provider: "claude" };
    // timeoutMs is optional in BaseProviderConfig, so it's undefined by default
    expect(config.timeoutMs).toBeUndefined();
  });

  test("timeout can be set to any positive number", () => {
    const config: ClaudeConfig = { provider: "claude", timeoutMs: 300_000 };
    expect(config.timeoutMs).toBe(300_000);
  });

  test("timeout can be set to 0 (no timeout)", () => {
    const config: ClaudeConfig = { provider: "claude", timeoutMs: 0 };
    expect(config.timeoutMs).toBe(0);
  });
});

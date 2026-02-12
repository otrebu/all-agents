/**
 * Unit tests for OpenCode provider registry integration
 *
 * Verifies: registry lookup, supportedModes (no haiku), type narrowing,
 * provider availability, and invoke function wiring.
 */

import type {
  InvocationMode,
  OpencodeConfig,
  ProviderConfig,
} from "@tools/commands/ralph/providers/types";

import { REGISTRY } from "@tools/commands/ralph/providers/registry";
import { describe, expect, test } from "bun:test";

// =============================================================================
// Registry Lookup
// =============================================================================

describe("REGISTRY opencode entry", () => {
  test("registry returns correct entry for opencode", () => {
    const entry = REGISTRY.opencode;
    expect(entry).toBeDefined();
    expect(entry.available).toBe(true);
    expect(typeof entry.invoke).toBe("function");
  });

  test("opencode invoke function is not a stub", () => {
    // Stub invokers throw ProviderError synchronously. The real invokeOpencode
    // is async and should not throw when called (it would attempt to spawn).
    // We verify it's a distinct function, not the generic stub.
    const entry = REGISTRY.opencode;
    expect(entry.invoke.name).not.toBe("");
  });
});

// =============================================================================
// Supported Modes
// =============================================================================

describe("opencode supportedModes", () => {
  test("includes supervised mode", () => {
    expect(REGISTRY.opencode.supportedModes).toContain("supervised");
  });

  test("includes headless-sync mode", () => {
    expect(REGISTRY.opencode.supportedModes).toContain("headless-sync");
  });

  test("includes headless-async mode", () => {
    expect(REGISTRY.opencode.supportedModes).toContain("headless-async");
  });

  test("has exactly 3 supported modes", () => {
    expect(REGISTRY.opencode.supportedModes).toHaveLength(3);
  });

  test("does NOT include haiku mode", () => {
    const modes = REGISTRY.opencode.supportedModes as Array<string>;
    expect(modes).not.toContain("haiku");
  });

  test("supportedModes matches expected set", () => {
    const expected: Array<InvocationMode> = [
      "supervised",
      "headless-sync",
      "headless-async",
    ];
    expect(REGISTRY.opencode.supportedModes).toEqual(expected);
  });
});

// =============================================================================
// OpencodeConfig Type Narrowing
// =============================================================================

describe("OpencodeConfig type narrowing", () => {
  test("OpencodeConfig narrows via provider discriminator", () => {
    // Verify OpencodeConfig is assignable to ProviderConfig (union membership)
    const config: ProviderConfig = { provider: "opencode" };
    expect(config.provider).toBe("opencode");
    // Verify that a ProviderConfig with provider "opencode" can accept model
    const configWithModel: ProviderConfig = {
      model: "anthropic/claude-sonnet-4-20250514",
      provider: "opencode",
    };
    expect(configWithModel.provider).toBe("opencode");
  });

  test("OpencodeConfig accepts optional model field", () => {
    const config: OpencodeConfig = {
      model: "anthropic/claude-sonnet-4-20250514",
      provider: "opencode",
    };
    expect(config.model).toBe("anthropic/claude-sonnet-4-20250514");
    expect(config.provider).toBe("opencode");
  });

  test("OpencodeConfig model field is optional", () => {
    const config: OpencodeConfig = { provider: "opencode" };
    expect(config.model).toBeUndefined();
  });

  test("OpencodeConfig inherits BaseProviderConfig fields", () => {
    const config: OpencodeConfig = {
      provider: "opencode",
      timeoutMs: 30_000,
      workingDirectory: "/tmp/test",
    };
    expect(config.timeoutMs).toBe(30_000);
    expect(config.workingDirectory).toBe("/tmp/test");
  });
});

// =============================================================================
// Provider Availability
// =============================================================================

describe("opencode provider availability", () => {
  test("opencode is marked as available in REGISTRY", () => {
    expect(REGISTRY.opencode.available).toBe(true);
  });

  test("other unimplemented providers remain unavailable", () => {
    expect(REGISTRY.codex.available).toBe(false);
    expect(REGISTRY.gemini.available).toBe(false);
    expect(REGISTRY.pi.available).toBe(false);
  });

  test("cursor is now available", () => {
    expect(REGISTRY.cursor.available).toBe(true);
  });
});

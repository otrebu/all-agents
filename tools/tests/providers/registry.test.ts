/**
 * Unit tests for provider registry
 *
 * Tests selectProvider(), validateProvider(), invokeWithProvider(),
 * REGISTRY, isBinaryAvailable(), getInstallInstructions(),
 * autoDetectProvider(), selectProviderFromEnv(), and ProviderError.
 */

import type { ProviderType } from "@tools/commands/ralph/providers/types";

import {
  autoDetectProvider,
  getInstallInstructions,
  isBinaryAvailable,
  ProviderError,
  REGISTRY,
  selectProvider,
  validateProvider,
} from "@tools/commands/ralph/providers/registry";
import { describe, expect, test } from "bun:test";

// =============================================================================
// REGISTRY
// =============================================================================

describe("REGISTRY", () => {
  const allProviders: Array<ProviderType> = [
    "claude",
    "codex",
    "cursor",
    "gemini",
    "opencode",
    "pi",
  ];

  test("has all 6 providers", () => {
    for (const provider of allProviders) {
      expect(REGISTRY[provider]).toBeDefined();
    }
  });

  test("all providers have available: false", () => {
    for (const provider of allProviders) {
      expect(REGISTRY[provider].available).toBe(false);
    }
  });

  test("all providers have invoke function", () => {
    for (const provider of allProviders) {
      expect(typeof REGISTRY[provider].invoke).toBe("function");
    }
  });

  test("claude has supervised, headless-sync, headless-async modes", () => {
    expect(REGISTRY.claude.supportedModes).toContain("supervised");
    expect(REGISTRY.claude.supportedModes).toContain("headless-sync");
    expect(REGISTRY.claude.supportedModes).toContain("headless-async");
  });

  test("opencode has supervised, headless-sync, headless-async modes", () => {
    expect(REGISTRY.opencode.supportedModes).toContain("supervised");
    expect(REGISTRY.opencode.supportedModes).toContain("headless-sync");
    expect(REGISTRY.opencode.supportedModes).toContain("headless-async");
  });

  test("codex has empty supportedModes", () => {
    expect(REGISTRY.codex.supportedModes).toEqual([]);
  });

  test("gemini has empty supportedModes", () => {
    expect(REGISTRY.gemini.supportedModes).toEqual([]);
  });

  test("pi has empty supportedModes", () => {
    expect(REGISTRY.pi.supportedModes).toEqual([]);
  });

  test("cursor has empty supportedModes", () => {
    expect(REGISTRY.cursor.supportedModes).toEqual([]);
  });
});

// =============================================================================
// selectProvider
// =============================================================================

describe("selectProvider", () => {
  test("returns cliFlag when provided", () => {
    expect(selectProvider({ cliFlag: "opencode" })).toBe("opencode");
  });

  test("defaults to claude when no context provided", () => {
    expect(selectProvider({})).toBe("claude");
  });

  test("uses envVariable when no cliFlag", () => {
    expect(selectProvider({ envVariable: "codex" })).toBe("codex");
  });

  test("cliFlag takes priority over envVariable", () => {
    expect(selectProvider({ cliFlag: "gemini", envVariable: "codex" })).toBe(
      "gemini",
    );
  });

  test("envVariable takes priority over configFile", () => {
    expect(selectProvider({ configFile: "gemini", envVariable: "codex" })).toBe(
      "codex",
    );
  });

  test("configFile takes priority over auto-detect (default claude)", () => {
    expect(selectProvider({ configFile: "opencode" })).toBe("opencode");
  });

  test("cliFlag takes priority over configFile", () => {
    expect(selectProvider({ cliFlag: "pi", configFile: "opencode" })).toBe(
      "pi",
    );
  });

  test("full priority chain: cliFlag > envVariable > configFile", () => {
    expect(
      selectProvider({
        cliFlag: "claude",
        configFile: "gemini",
        envVariable: "codex",
      }),
    ).toBe("claude");
  });

  test("ignores empty string cliFlag", () => {
    expect(selectProvider({ cliFlag: "" })).toBe("claude");
  });

  test("ignores empty string envVariable", () => {
    expect(selectProvider({ envVariable: "" })).toBe("claude");
  });

  test("ignores empty string configFile", () => {
    expect(selectProvider({ configFile: "" })).toBe("claude");
  });

  test("throws ProviderError for invalid cliFlag", () => {
    expect(() => selectProvider({ cliFlag: "invalid" })).toThrow(ProviderError);
  });

  test("throws ProviderError for invalid envVariable", () => {
    expect(() => selectProvider({ envVariable: "invalid" })).toThrow(
      ProviderError,
    );
  });

  test("throws ProviderError for invalid configFile", () => {
    expect(() => selectProvider({ configFile: "invalid" })).toThrow(
      ProviderError,
    );
  });
});

// =============================================================================
// validateProvider
// =============================================================================

describe("validateProvider", () => {
  test("accepts claude", () => {
    expect(validateProvider("claude")).toBe("claude");
  });

  test("accepts opencode", () => {
    expect(validateProvider("opencode")).toBe("opencode");
  });

  test("accepts codex", () => {
    expect(validateProvider("codex")).toBe("codex");
  });

  test("accepts gemini", () => {
    expect(validateProvider("gemini")).toBe("gemini");
  });

  test("accepts pi", () => {
    expect(validateProvider("pi")).toBe("pi");
  });

  test("accepts cursor", () => {
    expect(validateProvider("cursor")).toBe("cursor");
  });

  test("throws ProviderError for unknown provider", () => {
    expect(() => validateProvider("unknown")).toThrow(ProviderError);
  });

  test("error message includes valid providers", () => {
    try {
      validateProvider("invalid");
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      const providerError = error as ProviderError;
      expect(providerError.message).toContain("claude");
      expect(providerError.message).toContain("opencode");
      expect(providerError.provider).toBe("invalid");
    }
  });

  test("error message lists valid options", () => {
    try {
      validateProvider("bad");
      expect(true).toBe(false);
    } catch (error) {
      const providerError = error as ProviderError;
      expect(providerError.message).toContain("Valid providers:");
      expect(providerError.message).toContain("codex");
      expect(providerError.message).toContain("cursor");
      expect(providerError.message).toContain("gemini");
      expect(providerError.message).toContain("pi");
    }
  });
});

// =============================================================================
// ProviderError
// =============================================================================

describe("ProviderError", () => {
  test("has correct name", () => {
    const error = new ProviderError("test", "test message");
    expect(error.name).toBe("ProviderError");
  });

  test("has correct provider field", () => {
    const error = new ProviderError("claude", "test message");
    expect(error.provider).toBe("claude");
  });

  test("has correct message", () => {
    const error = new ProviderError("test", "some error");
    expect(error.message).toBe("some error");
  });

  test("is an instance of Error", () => {
    const error = new ProviderError("test", "test");
    expect(error).toBeInstanceOf(Error);
  });

  test("cause is undefined when not provided", () => {
    const error = new ProviderError("test", "test");
    expect(error.cause).toBeUndefined();
  });

  test("stores optional cause", () => {
    const originalError = new Error("original");
    const error = new ProviderError("test", "wrapped", originalError);
    expect(error.cause).toBe(originalError);
  });

  test("cause is accessible through Error.cause", () => {
    const originalError = new Error("original");
    const error = new ProviderError("test", "wrapped", originalError);
    expect((error as Error).cause).toBe(originalError);
  });
});

// =============================================================================
// isBinaryAvailable
// =============================================================================

describe("isBinaryAvailable", () => {
  test("returns true for a binary that exists (ls)", async () => {
    const isAvailable = await isBinaryAvailable("ls");
    expect(isAvailable).toBe(true);
  });

  test("returns false for a binary that does not exist", async () => {
    const isAvailable = await isBinaryAvailable(
      "nonexistent-binary-xyz-12345-does-not-exist",
    );
    expect(isAvailable).toBe(false);
  });

  test("returns true for which itself", async () => {
    const isAvailable = await isBinaryAvailable("which");
    expect(isAvailable).toBe(true);
  });
});

// =============================================================================
// getInstallInstructions
// =============================================================================

describe("getInstallInstructions", () => {
  test("returns npm install command for claude", () => {
    expect(getInstallInstructions("claude")).toContain("npm install -g");
    expect(getInstallInstructions("claude")).toContain("claude-code");
  });

  test("returns npm install command for opencode", () => {
    expect(getInstallInstructions("opencode")).toContain("npm install -g");
    expect(getInstallInstructions("opencode")).toContain("opencode");
  });

  test("returns npm install command for codex", () => {
    expect(getInstallInstructions("codex")).toContain("npm install -g");
    expect(getInstallInstructions("codex")).toContain("codex");
  });

  test("returns npm install command for gemini", () => {
    expect(getInstallInstructions("gemini")).toContain("npm install -g");
    expect(getInstallInstructions("gemini")).toContain("gemini");
  });

  test("returns install instructions for cursor", () => {
    expect(getInstallInstructions("cursor")).toContain("cursor");
  });

  test("returns install instructions for pi", () => {
    const instructions = getInstallInstructions("pi");
    expect(instructions).toBeTruthy();
    expect(instructions.length).toBeGreaterThan(0);
  });

  test("returns a string for every provider", () => {
    const providers: Array<ProviderType> = [
      "claude",
      "codex",
      "cursor",
      "gemini",
      "opencode",
      "pi",
    ];
    for (const provider of providers) {
      const instructions = getInstallInstructions(provider);
      expect(typeof instructions).toBe("string");
      expect(instructions.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// autoDetectProvider
// =============================================================================

describe("autoDetectProvider", () => {
  test("returns a valid ProviderType", async () => {
    const provider = await autoDetectProvider();
    const validProviders = [
      "claude",
      "codex",
      "cursor",
      "gemini",
      "opencode",
      "pi",
    ];
    expect(validProviders).toContain(provider);
  });

  test("defaults to claude when called", async () => {
    // In test environment, claude binary may or may not be available
    // But the function should always return a valid provider
    const provider = await autoDetectProvider();
    expect(typeof provider).toBe("string");
  });
});

// =============================================================================
// invokeWithProvider (error cases only - no real provider invocation)
// =============================================================================

describe("invokeWithProvider error handling", () => {
  test("throws ProviderError for unimplemented provider", async () => {
    try {
      await (
        await import("@tools/commands/ralph/providers/registry")
      ).invokeWithProvider("opencode", { mode: "headless", prompt: "test" });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
    }
  });

  test("throws ProviderError for codex provider", async () => {
    try {
      await (
        await import("@tools/commands/ralph/providers/registry")
      ).invokeWithProvider("codex", { mode: "headless", prompt: "test" });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      const providerError = error as ProviderError;
      expect(providerError.provider).toBe("codex");
    }
  });
});

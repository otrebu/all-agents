/**
 * Unit tests for provider registry
 *
 * Tests selectProvider(), validateProvider(), and invokeWithProvider() logic.
 */

import {
  ProviderError,
  selectProvider,
  validateProvider,
} from "@tools/commands/ralph/providers/registry";
import { afterEach, describe, expect, test } from "bun:test";

describe("selectProvider", () => {
  const originalEnv = process.env.RALPH_PROVIDER;

  afterEach(() => {
    // Restore env
    if (originalEnv === undefined) {
      delete process.env.RALPH_PROVIDER;
    } else {
      process.env.RALPH_PROVIDER = originalEnv;
    }
  });

  test("returns override when provided", () => {
    expect(selectProvider("opencode")).toBe("opencode");
  });

  test("defaults to claude when no override and no env var", () => {
    delete process.env.RALPH_PROVIDER;
    expect(selectProvider()).toBe("claude");
  });

  test("uses RALPH_PROVIDER env var when no override", () => {
    process.env.RALPH_PROVIDER = "codex";
    expect(selectProvider()).toBe("codex");
  });

  test("CLI override takes priority over env var", () => {
    process.env.RALPH_PROVIDER = "codex";
    expect(selectProvider("gemini")).toBe("gemini");
  });

  test("ignores empty string override", () => {
    delete process.env.RALPH_PROVIDER;
    expect(selectProvider("")).toBe("claude");
  });

  test("ignores empty env var", () => {
    process.env.RALPH_PROVIDER = "";
    expect(selectProvider()).toBe("claude");
  });

  test("throws ProviderError for invalid override", () => {
    expect(() => selectProvider("invalid")).toThrow(ProviderError);
  });

  test("throws ProviderError for invalid env var", () => {
    process.env.RALPH_PROVIDER = "invalid";
    expect(() => selectProvider()).toThrow(ProviderError);
  });
});

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
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      const providerError = error as ProviderError;
      expect(providerError.message).toContain("claude");
      expect(providerError.message).toContain("opencode");
      expect(providerError.provider).toBe("invalid");
    }
  });
});

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
});

import {
  REFRESH_HINT,
  validateModelSelection,
} from "@tools/commands/ralph/providers/models";
import { describe, expect, test } from "bun:test";

// =============================================================================
// validateModelSelection - Valid Models
// =============================================================================

describe("validateModelSelection - valid model", () => {
  test("returns valid with correct cliFormat for Claude model", () => {
    const result = validateModelSelection("claude-sonnet-4", "claude");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.cliFormat).toBe("claude-sonnet-4-20250514");
    }
  });

  test("returns valid with correct cliFormat for OpenCode model", () => {
    const result = validateModelSelection("gpt-4o", "opencode");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.cliFormat).toBe("openai/gpt-4o");
    }
  });

  test("returns valid for cheap Claude model", () => {
    const result = validateModelSelection("claude-haiku", "claude");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.cliFormat).toBe("claude-3-5-haiku-latest");
    }
  });

  test("returns valid for expensive Claude model", () => {
    const result = validateModelSelection("claude-opus-4", "claude");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.cliFormat).toBe("claude-opus-4-20250514");
    }
  });
});

// =============================================================================
// validateModelSelection - Unknown Model
// =============================================================================

describe("validateModelSelection - unknown model", () => {
  test("returns invalid with error for unknown model", () => {
    const result = validateModelSelection("gpt-5-turbo", "opencode");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("gpt-5-turbo");
      expect(result.error).toContain("opencode");
    }
  });

  test("includes suggestions from the same provider", () => {
    const result = validateModelSelection("nonexistent-model", "opencode");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.suggestions.length).toBeGreaterThan(0);
      // All suggestions should be opencode models
      expect(result.suggestions).toContain("gpt-4o");
    }
  });

  test("limits suggestions to 5 maximum", () => {
    const result = validateModelSelection("unknown-model", "opencode");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.suggestions.length).toBeLessThanOrEqual(5);
    }
  });

  test("error message includes refresh-models hint", () => {
    const result = validateModelSelection("nonexistent", "claude");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("refresh-models");
    }
  });

  test("suggestions are sorted alphabetically", () => {
    const result = validateModelSelection("nonexistent", "opencode");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const sorted = [...result.suggestions].sort();
      expect(result.suggestions).toEqual(sorted);
    }
  });
});

// =============================================================================
// validateModelSelection - Wrong Provider
// =============================================================================

describe("validateModelSelection - wrong provider", () => {
  test("returns invalid when model belongs to different provider", () => {
    const result = validateModelSelection("claude-sonnet-4", "opencode");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("claude");
      expect(result.error).toContain("opencode");
    }
  });

  test("error names the correct provider for the model", () => {
    const result = validateModelSelection("gpt-4o", "claude");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("opencode");
      expect(result.error).toContain("claude");
    }
  });

  test("suggests alternatives for the current provider", () => {
    const result = validateModelSelection("claude-sonnet-4", "opencode");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.suggestions.length).toBeGreaterThan(0);
      // Suggestions should include opencode models, not claude models
      expect(result.suggestions).toContain("gpt-4o");
    }
  });

  test("wrong-provider error includes refresh-models hint", () => {
    const result = validateModelSelection("gpt-4o", "claude");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("refresh-models");
    }
  });
});

// =============================================================================
// REFRESH_HINT constant
// =============================================================================

describe("REFRESH_HINT", () => {
  test("contains refresh-models command", () => {
    expect(REFRESH_HINT).toContain("refresh-models");
  });

  test("is included in all error messages", () => {
    const unknownResult = validateModelSelection("nonexistent", "claude");
    const wrongProviderResult = validateModelSelection("gpt-4o", "claude");

    expect(unknownResult.valid).toBe(false);
    expect(wrongProviderResult.valid).toBe(false);

    if (!unknownResult.valid) {
      expect(unknownResult.error).toContain(REFRESH_HINT);
    }
    if (!wrongProviderResult.valid) {
      expect(wrongProviderResult.error).toContain(REFRESH_HINT);
    }
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("validateModelSelection - edge cases", () => {
  test("returns empty suggestions for provider with no models", () => {
    const result = validateModelSelection("some-model", "codex");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.suggestions).toEqual([]);
    }
  });

  test("suggestions for claude provider are all claude models", () => {
    const result = validateModelSelection("nonexistent", "claude");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      // Claude has 3 models, should suggest all of them
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions).toContain("claude-haiku");
      expect(result.suggestions).toContain("claude-opus-4");
      expect(result.suggestions).toContain("claude-sonnet-4");
    }
  });
});

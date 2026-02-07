import {
  getModelById,
  REFRESH_HINT,
  validateModelSelection,
} from "@tools/commands/ralph/providers/models";
import { describe, expect, test } from "bun:test";

// =============================================================================
// validateModelSelection - Valid Models
// =============================================================================

describe("validateModelSelection - valid model", () => {
  test("returns valid with correct cliFormat for Claude model", () => {
    const result = validateModelSelection("claude-sonnet-4-5", "claude");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.cliFormat).toBe("claude-sonnet-4-5");
    }
  });

  test("returns valid with correct cliFormat for OpenCode model", () => {
    const result = validateModelSelection("openai/gpt-5.2-codex", "opencode");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.cliFormat).toBe("openai/gpt-5.2-codex");
    }
  });

  test("returns valid for cheap Claude model", () => {
    const result = validateModelSelection("claude-haiku-4-5", "claude");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.cliFormat).toBe("claude-haiku-4-5");
    }
  });

  test("returns valid for expensive Claude model", () => {
    const result = validateModelSelection("claude-opus-4-6", "claude");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.cliFormat).toBe("claude-opus-4-6");
    }
  });

  test("returns valid for Claude Code alias", () => {
    const result = validateModelSelection("sonnet", "claude");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.cliFormat).toBe("claude-sonnet-4-5-20250929");
    }
  });

  test("returns valid for fully-qualified OpenCode model ID", () => {
    const result = validateModelSelection("openai/gpt-5.3-codex", "opencode");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.cliFormat).toBe("openai/gpt-5.3-codex");
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
    const result = validateModelSelection("claude-sonnet-4-5", "opencode");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("claude");
      expect(result.error).toContain("opencode");
    }
  });

  test("suggests alternatives for the current provider", () => {
    const result = validateModelSelection("claude-sonnet-4-5", "opencode");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.suggestions.length).toBeGreaterThan(0);
    }
  });

  test("wrong-provider error includes refresh-models hint", () => {
    const result = validateModelSelection("claude-opus-4-6", "opencode");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("refresh-models");
    }
  });
});

// =============================================================================
// cliFormat fallback lookup
// =============================================================================

describe("getModelById - cliFormat fallback", () => {
  test("finds model by ID", () => {
    const model = getModelById("claude-opus-4-6");
    expect(model).toBeDefined();
    expect(model?.cliFormat).toBe("claude-opus-4-6");
  });

  test("finds model by cliFormat when ID doesn't match", () => {
    // "sonnet" alias has cliFormat "claude-sonnet-4-5-20250929"
    const model = getModelById("claude-sonnet-4-5-20250929");
    expect(model).toBeDefined();
    expect(model?.provider).toBe("claude");
  });

  test("returns undefined for completely unknown model", () => {
    const model = getModelById("totally-fake-model");
    expect(model).toBeUndefined();
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
    const wrongProviderResult = validateModelSelection(
      "claude-opus-4-6",
      "opencode",
    );

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

  test("suggestions for claude provider include claude models", () => {
    const result = validateModelSelection("nonexistent", "claude");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeLessThanOrEqual(5);
      // All suggestions should be for Claude provider
      for (const s of result.suggestions) {
        expect(s).toMatch(/claude|sonnet|opus|haiku|default|opusplan/);
      }
    }
  });
});

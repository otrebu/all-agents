import {
  DISCOVERED_MODELS,
  getAllModels,
  getModelById,
  getModelCompletions,
  getModelCompletionsForProvider,
  getModelsForProvider,
  type ModelInfo,
  validateModelForProvider,
} from "@tools/commands/ralph/providers/models";
import { STATIC_MODELS } from "@tools/commands/ralph/providers/models-static";
import { afterEach, describe, expect, test } from "bun:test";

// =============================================================================
// Static Model Count & Field Presence
// =============================================================================

describe("STATIC_MODELS", () => {
  test("contains exactly 7 baseline models", () => {
    expect(STATIC_MODELS).toHaveLength(7);
  });

  test("every model has required fields: id, provider, cliFormat, costHint", () => {
    for (const model of STATIC_MODELS) {
      expect(typeof model.id).toBe("string");
      expect(typeof model.provider).toBe("string");
      expect(typeof model.cliFormat).toBe("string");
      expect(["cheap", "standard", "expensive"]).toContain(model.costHint);
    }
  });

  test("contains 3 Claude models", () => {
    const claude = STATIC_MODELS.filter((m) => m.provider === "claude");
    expect(claude).toHaveLength(3);
  });

  test("contains 4 OpenCode models", () => {
    const opencode = STATIC_MODELS.filter((m) => m.provider === "opencode");
    expect(opencode).toHaveLength(4);
  });

  test("Claude models use native cliFormat (no slash)", () => {
    const claude = STATIC_MODELS.filter((m) => m.provider === "claude");
    for (const model of claude) {
      expect(model.cliFormat).not.toContain("/");
    }
  });

  test("OpenCode models use provider/model cliFormat (with slash)", () => {
    const opencode = STATIC_MODELS.filter((m) => m.provider === "opencode");
    for (const model of opencode) {
      expect(model.cliFormat).toContain("/");
    }
  });
});

// =============================================================================
// getModelsForProvider
// =============================================================================

describe("getModelsForProvider", () => {
  test("returns only Claude models for 'claude'", () => {
    const models = getModelsForProvider("claude");
    expect(models).toHaveLength(3);
    for (const m of models) {
      expect(m.provider).toBe("claude");
    }
  });

  test("returns only OpenCode models for 'opencode'", () => {
    const models = getModelsForProvider("opencode");
    expect(models).toHaveLength(4);
    for (const m of models) {
      expect(m.provider).toBe("opencode");
    }
  });

  test("returns empty array for provider with no models", () => {
    const models = getModelsForProvider("codex");
    expect(models).toHaveLength(0);
  });
});

// =============================================================================
// getModelById
// =============================================================================

describe("getModelById", () => {
  test("returns correct model for known ID", () => {
    const model = getModelById("claude-sonnet-4");
    expect(model).toBeDefined();
    expect(model?.provider).toBe("claude");
    expect(model?.cliFormat).toBe("claude-sonnet-4-20250514");
    expect(model?.costHint).toBe("standard");
  });

  test("returns correct model for OpenCode ID", () => {
    const model = getModelById("gpt-4o");
    expect(model).toBeDefined();
    expect(model?.provider).toBe("opencode");
    expect(model?.cliFormat).toBe("openai/gpt-4o");
  });

  test("returns undefined for unknown model ID", () => {
    const model = getModelById("nonexistent-model");
    expect(model).toBeUndefined();
  });
});

// =============================================================================
// getModelCompletions
// =============================================================================

describe("getModelCompletions", () => {
  test("returns a sorted string array", () => {
    const completions = getModelCompletions();
    expect(Array.isArray(completions)).toBe(true);
    for (const c of completions) {
      expect(typeof c).toBe("string");
    }
    const sorted = [...completions].sort();
    expect(completions).toEqual(sorted);
  });

  test("contains all 7 model IDs", () => {
    const completions = getModelCompletions();
    expect(completions).toHaveLength(7);
  });

  test("contains specific known model IDs", () => {
    const completions = getModelCompletions();
    expect(completions).toContain("claude-sonnet-4");
    expect(completions).toContain("gpt-4o");
    expect(completions).toContain("claude-haiku-opencode");
  });
});

// =============================================================================
// getModelCompletionsForProvider
// =============================================================================

describe("getModelCompletionsForProvider", () => {
  test("returns only Claude model IDs for 'claude'", () => {
    const completions = getModelCompletionsForProvider("claude");
    expect(completions).toHaveLength(3);
    for (const id of completions) {
      const model = getModelById(id);
      expect(model?.provider).toBe("claude");
    }
  });

  test("returns sorted array for OpenCode", () => {
    const completions = getModelCompletionsForProvider("opencode");
    const sorted = [...completions].sort();
    expect(completions).toEqual(sorted);
  });

  test("returns empty array for provider with no models", () => {
    const completions = getModelCompletionsForProvider("gemini");
    expect(completions).toHaveLength(0);
  });
});

// =============================================================================
// validateModelForProvider
// =============================================================================

describe("validateModelForProvider", () => {
  test("returns cliFormat for valid model", () => {
    const result = validateModelForProvider("claude-sonnet-4", "claude");
    expect(result).toBe("claude-sonnet-4-20250514");
  });

  test("returns cliFormat for valid OpenCode model", () => {
    const result = validateModelForProvider("gpt-4o", "opencode");
    expect(result).toBe("openai/gpt-4o");
  });

  test("throws with suggestions for unknown model", () => {
    expect(() => validateModelForProvider("gpt-5", "opencode")).toThrow(
      /Unknown model 'gpt-5'/,
    );
    expect(() => validateModelForProvider("gpt-5", "opencode")).toThrow(
      /Did you mean:/,
    );
    expect(() => validateModelForProvider("gpt-5", "opencode")).toThrow(
      /refresh-models/,
    );
  });

  test("throws for wrong-provider model", () => {
    expect(() =>
      validateModelForProvider("claude-sonnet-4", "opencode"),
    ).toThrow(/belongs to provider 'claude'/);
    expect(() =>
      validateModelForProvider("claude-sonnet-4", "opencode"),
    ).toThrow(/Did you mean:/);
  });

  test("throws for model from different provider with refresh hint", () => {
    expect(() => validateModelForProvider("gpt-4o", "claude")).toThrow(
      /refresh-models/,
    );
  });
});

// =============================================================================
// getAllModels - Static Precedence Over Dynamic
// =============================================================================

describe("getAllModels", () => {
  afterEach(() => {
    // Clean up any dynamic models added during tests
    DISCOVERED_MODELS.length = 0;
  });

  test("returns all 7 static models when no dynamic models exist", () => {
    const models = getAllModels();
    expect(models).toHaveLength(7);
  });

  test("static models take precedence over dynamic with same ID", () => {
    // Push a dynamic model with conflicting ID
    const dynamicModel: ModelInfo = {
      cliFormat: "overridden/claude-sonnet-4",
      costHint: "cheap",
      discoveredAt: "2026-02-05",
      id: "claude-sonnet-4",
      provider: "opencode",
    };
    DISCOVERED_MODELS.push(dynamicModel);

    const models = getAllModels();
    const sonnet = models.find((m) => m.id === "claude-sonnet-4");

    // Static version should win
    expect(sonnet?.provider).toBe("claude");
    expect(sonnet?.cliFormat).toBe("claude-sonnet-4-20250514");

    // Only one entry for this ID
    const dupes = models.filter((m) => m.id === "claude-sonnet-4");
    expect(dupes).toHaveLength(1);
  });

  test("includes unique dynamic models alongside static", () => {
    const dynamicModel: ModelInfo = {
      cliFormat: "google/gemini-2.5-pro",
      costHint: "standard",
      discoveredAt: "2026-02-05",
      id: "gemini-2.5-pro",
      provider: "opencode",
    };
    DISCOVERED_MODELS.push(dynamicModel);

    // 7 static + 1 new dynamic
    const models = getAllModels();
    expect(models).toHaveLength(8);

    const gemini = getModelById("gemini-2.5-pro");
    expect(gemini).toBeDefined();
    expect(gemini?.cliFormat).toBe("google/gemini-2.5-pro");
  });
});

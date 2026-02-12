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
import { afterAll, beforeEach, describe, expect, test } from "bun:test";

const DISCOVERED_MODELS_SNAPSHOT = [...DISCOVERED_MODELS];

beforeEach(() => {
  DISCOVERED_MODELS.length = 0;
});

afterAll(() => {
  DISCOVERED_MODELS.length = 0;
  DISCOVERED_MODELS.push(...DISCOVERED_MODELS_SNAPSHOT);
});

// =============================================================================
// Static Model Count & Field Presence
// =============================================================================

describe("STATIC_MODELS", () => {
  test("contains 44 baseline models", () => {
    expect(STATIC_MODELS).toHaveLength(44);
  });

  test("every model has required fields: id, provider, cliFormat, costHint", () => {
    for (const model of STATIC_MODELS) {
      expect(typeof model.id).toBe("string");
      expect(typeof model.provider).toBe("string");
      expect(typeof model.cliFormat).toBe("string");
      expect(["cheap", "standard", "expensive"]).toContain(model.costHint);
    }
  });

  test("contains 10 Claude models (including aliases)", () => {
    const claude = STATIC_MODELS.filter((m) => m.provider === "claude");
    expect(claude).toHaveLength(10);
  });

  test("contains 34 OpenCode models", () => {
    const opencode = STATIC_MODELS.filter((m) => m.provider === "opencode");
    expect(opencode).toHaveLength(34);
  });

  test("OpenCode models use provider/model cliFormat (with slash)", () => {
    const opencode = STATIC_MODELS.filter((m) => m.provider === "opencode");
    for (const model of opencode) {
      expect(model.cliFormat).toContain("/");
    }
  });

  test("includes Claude Code aliases", () => {
    const aliases = STATIC_MODELS.filter(
      (m) => m.description === "Claude Code alias",
    );
    expect(aliases.length).toBeGreaterThanOrEqual(4);
    const aliasIds = aliases.map((m) => m.id);
    expect(aliasIds).toContain("sonnet");
    expect(aliasIds).toContain("opus");
    expect(aliasIds).toContain("haiku");
  });

  test("includes current model identifiers", () => {
    const ids = STATIC_MODELS.map((m) => m.id);
    expect(ids).toContain("claude-opus-4-6");
    expect(ids).toContain("claude-sonnet-4-5");
    expect(ids).toContain("openai/gpt-5.3-codex");
    expect(ids).toContain("openai/gpt-5.2-codex");
    expect(ids).toContain("github-copilot/claude-opus-4.6");
  });
});

// =============================================================================
// getModelsForProvider
// =============================================================================

describe("getModelsForProvider", () => {
  test("returns only Claude models for 'claude'", () => {
    const models = getModelsForProvider("claude");
    expect(models).toHaveLength(10);
    for (const m of models) {
      expect(m.provider).toBe("claude");
    }
  });

  test("returns only OpenCode models for 'opencode'", () => {
    const models = getModelsForProvider("opencode");
    expect(models).toHaveLength(34);
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
  test("returns correct model for known Claude ID", () => {
    const model = getModelById("claude-sonnet-4-5");
    expect(model).toBeDefined();
    expect(model?.provider).toBe("claude");
    expect(model?.cliFormat).toBe("claude-sonnet-4-5");
    expect(model?.costHint).toBe("standard");
  });

  test("returns correct model for OpenCode fully-qualified ID", () => {
    const model = getModelById("openai/gpt-5.2-codex");
    expect(model).toBeDefined();
    expect(model?.provider).toBe("opencode");
    expect(model?.cliFormat).toBe("openai/gpt-5.2-codex");
  });

  test("returns correct model for Claude Code alias", () => {
    const model = getModelById("sonnet");
    expect(model).toBeDefined();
    expect(model?.provider).toBe("claude");
    expect(model?.cliFormat).toBe("claude-sonnet-4-5-20250929");
  });

  test("finds model by cliFormat fallback", () => {
    const model = getModelById("claude-sonnet-4-5-20250929");
    expect(model).toBeDefined();
    expect(model?.provider).toBe("claude");
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

  test("contains all 44 model IDs", () => {
    const completions = getModelCompletions();
    expect(completions).toHaveLength(44);
  });

  test("contains specific known model IDs", () => {
    const completions = getModelCompletions();
    expect(completions).toContain("claude-sonnet-4-5");
    expect(completions).toContain("openai/gpt-5.2-codex");
    expect(completions).toContain("sonnet");
  });
});

// =============================================================================
// getModelCompletionsForProvider
// =============================================================================

describe("getModelCompletionsForProvider", () => {
  test("returns only Claude model IDs for 'claude'", () => {
    const completions = getModelCompletionsForProvider("claude");
    expect(completions).toHaveLength(10);
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
  test("returns cliFormat for valid Claude model", () => {
    const result = validateModelForProvider("claude-sonnet-4-5", "claude");
    expect(result).toBe("claude-sonnet-4-5");
  });

  test("returns cliFormat for valid OpenCode model", () => {
    const result = validateModelForProvider("openai/gpt-5.2-codex", "opencode");
    expect(result).toBe("openai/gpt-5.2-codex");
  });

  test("throws with suggestions for unknown model", () => {
    expect(() =>
      validateModelForProvider("nonexistent-model", "opencode"),
    ).toThrow(/Unknown model 'nonexistent-model'/);
    expect(() =>
      validateModelForProvider("nonexistent-model", "opencode"),
    ).toThrow(/Did you mean:/);
    expect(() =>
      validateModelForProvider("nonexistent-model", "opencode"),
    ).toThrow(/refresh-models/);
  });

  test("throws for wrong-provider model", () => {
    expect(() =>
      validateModelForProvider("claude-sonnet-4-5", "opencode"),
    ).toThrow(/belongs to provider 'claude'/);
    expect(() =>
      validateModelForProvider("claude-sonnet-4-5", "opencode"),
    ).toThrow(/Did you mean:/);
  });

  test("throws for model from different provider with refresh hint", () => {
    expect(() =>
      validateModelForProvider("claude-opus-4-6", "opencode"),
    ).toThrow(/refresh-models/);
  });
});

// =============================================================================
// getAllModels - Static Precedence Over Dynamic
// =============================================================================

describe("getAllModels", () => {
  test("returns all 44 static models when no dynamic models exist", () => {
    const models = getAllModels();
    expect(models).toHaveLength(44);
  });

  test("static models take precedence over dynamic with same ID", () => {
    const dynamicModel: ModelInfo = {
      cliFormat: "overridden/claude-sonnet-4-5",
      costHint: "cheap",
      discoveredAt: "2026-02-05",
      id: "claude-sonnet-4-5",
      provider: "opencode",
    };
    DISCOVERED_MODELS.push(dynamicModel);

    const models = getAllModels();
    const sonnet = models.find((m) => m.id === "claude-sonnet-4-5");

    // Static version should win
    expect(sonnet?.provider).toBe("claude");
    expect(sonnet?.cliFormat).toBe("claude-sonnet-4-5");

    // Only one entry for this ID
    const dupes = models.filter((m) => m.id === "claude-sonnet-4-5");
    expect(dupes).toHaveLength(1);
  });

  test("includes unique dynamic models alongside static", () => {
    const dynamicModel: ModelInfo = {
      cliFormat: "google/gemini-2.5-pro",
      costHint: "standard",
      discoveredAt: "2026-02-05",
      id: "google/gemini-2.5-pro",
      provider: "opencode",
    };
    DISCOVERED_MODELS.push(dynamicModel);

    // 44 static + 1 new dynamic
    const models = getAllModels();
    expect(models).toHaveLength(45);

    const gemini = getModelById("google/gemini-2.5-pro");
    expect(gemini).toBeDefined();
    expect(gemini?.cliFormat).toBe("google/gemini-2.5-pro");
  });
});

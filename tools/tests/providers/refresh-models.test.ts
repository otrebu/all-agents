import type { ModelInfo } from "@tools/commands/ralph/providers/models-static";

import { STATIC_MODELS } from "@tools/commands/ralph/providers/models-static";
import {
  DISCOVERABLE_PROVIDERS,
  filterDuplicates,
  generateDynamicFileContent,
  parseOpencodeModelsOutput,
} from "@tools/commands/ralph/refresh-models";
import { describe, expect, test } from "bun:test";

// =============================================================================
// parseOpencodeModelsOutput
// =============================================================================

describe("parseOpencodeModelsOutput", () => {
  test("parses valid model array with all fields", () => {
    const input = [
      {
        cliFormat: "google/gemini-2.5-pro-preview-05-06",
        costHint: "standard",
        id: "gemini-2.5-pro",
        name: "gemini-2.5-pro",
      },
      {
        cliFormat: "openai/o3-mini",
        costHint: "cheap",
        id: "o3-mini",
        name: "o3-mini",
      },
    ];

    const result = parseOpencodeModelsOutput(input);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("gemini-2.5-pro");
    expect(result[0]?.cliFormat).toBe("google/gemini-2.5-pro-preview-05-06");
    expect(result[0]?.costHint).toBe("standard");
    expect(result[0]?.provider).toBe("opencode");
    expect(result[0]?.discoveredAt).toBeDefined();
    expect(result[1]?.id).toBe("o3-mini");
    expect(result[1]?.costHint).toBe("cheap");
  });

  test("derives friendly ID from cliFormat when name is missing", () => {
    const input = [{ cliFormat: "provider/my-model-name", id: "some-model" }];

    const result = parseOpencodeModelsOutput(input);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("my-model-name");
  });

  test("uses id as fallback when cliFormat has no slash and no name", () => {
    const input = [{ id: "simple-model" }];

    const result = parseOpencodeModelsOutput(input);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("simple-model");
    expect(result[0]?.cliFormat).toBe("simple-model");
  });

  test("defaults costHint to standard for unknown values", () => {
    const input = [{ cliFormat: "test/test", costHint: "unknown", id: "test" }];

    const result = parseOpencodeModelsOutput(input);
    expect(result[0]?.costHint).toBe("standard");
  });

  test("returns empty array for non-array input", () => {
    const result = parseOpencodeModelsOutput({ models: [] });
    expect(result).toHaveLength(0);
  });

  test("returns empty array for null input", () => {
    const result = parseOpencodeModelsOutput(null);
    expect(result).toHaveLength(0);
  });

  test("skips entries without id", () => {
    const input = [
      { cliFormat: "provider/model" },
      { cliFormat: "provider/valid", id: "valid" },
      { cliFormat: "provider/empty-id", id: "" },
    ];

    const result = parseOpencodeModelsOutput(input);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("valid");
  });

  test("skips non-object entries", () => {
    const input = ["string", 42, null, { cliFormat: "p/valid", id: "valid" }];

    const result = parseOpencodeModelsOutput(input);
    expect(result).toHaveLength(1);
  });

  test("sets discoveredAt to ISO date format (YYYY-MM-DD)", () => {
    const input = [{ cliFormat: "p/test", id: "test" }];

    const result = parseOpencodeModelsOutput(input);
    expect(result[0]?.discoveredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("sets provider to opencode for all entries", () => {
    const input = [
      { cliFormat: "p/a", id: "a" },
      { cliFormat: "p/b", id: "b" },
    ];

    const result = parseOpencodeModelsOutput(input);
    for (const model of result) {
      expect(model.provider).toBe("opencode");
    }
  });
});

// =============================================================================
// filterDuplicates
// =============================================================================

describe("filterDuplicates", () => {
  test("removes models with IDs matching STATIC_MODELS", () => {
    const discovered: Array<ModelInfo> = [
      {
        cliFormat: "openai/gpt-4o",
        costHint: "standard",
        discoveredAt: "2026-02-06",
        // gpt-4o exists in STATIC_MODELS
        id: "gpt-4o",
        provider: "opencode",
      },
      {
        cliFormat: "google/gemini-2.5-pro",
        costHint: "standard",
        discoveredAt: "2026-02-06",
        // gemini-2.5-pro does NOT exist in STATIC_MODELS
        id: "gemini-2.5-pro",
        provider: "opencode",
      },
    ];

    const result = filterDuplicates(discovered);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("gemini-2.5-pro");
  });

  test("returns all models when none match static IDs", () => {
    const discovered: Array<ModelInfo> = [
      {
        cliFormat: "google/gemini-flash",
        costHint: "cheap",
        discoveredAt: "2026-02-06",
        id: "gemini-flash",
        provider: "opencode",
      },
    ];

    const result = filterDuplicates(discovered);
    expect(result).toHaveLength(1);
  });

  test("returns empty array when all models match static IDs", () => {
    const discovered: Array<ModelInfo> = STATIC_MODELS.map((m) => ({
      ...m,
      discoveredAt: "2026-02-06",
    }));

    const result = filterDuplicates(discovered);
    expect(result).toHaveLength(0);
  });

  test("returns empty array for empty input", () => {
    const result = filterDuplicates([]);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// generateDynamicFileContent
// =============================================================================

describe("generateDynamicFileContent", () => {
  test("generates valid TypeScript with auto-generated header", () => {
    const content = generateDynamicFileContent([]);
    expect(content).toContain("Auto-generated by `aaa ralph refresh-models`");
    expect(content).toContain("Do not edit manually");
    expect(content).toContain("Generated:");
    expect(content).toContain("DISCOVERED_MODELS");
    expect(content).toContain("export { DISCOVERED_MODELS }");
  });

  test("generates empty array when no models provided", () => {
    const content = generateDynamicFileContent([]);
    expect(content).toContain(
      "const DISCOVERED_MODELS: Array<ModelInfo> = [];",
    );
  });

  test("includes import for ModelInfo type", () => {
    const content = generateDynamicFileContent([]);
    expect(content).toContain(
      'import type { ModelInfo } from "./models-static"',
    );
  });

  test("generates model entries with all fields", () => {
    const models: Array<ModelInfo> = [
      {
        cliFormat: "google/gemini-2.5-pro",
        costHint: "standard",
        discoveredAt: "2026-02-06",
        id: "gemini-2.5-pro",
        provider: "opencode",
      },
    ];

    const content = generateDynamicFileContent(models);
    expect(content).toContain('"google/gemini-2.5-pro"');
    expect(content).toContain('"standard"');
    expect(content).toContain('"2026-02-06"');
    expect(content).toContain('"gemini-2.5-pro"');
    expect(content).toContain('"opencode"');
  });

  test("sorts models by provider then by ID", () => {
    const models: Array<ModelInfo> = [
      {
        cliFormat: "p/z-model",
        costHint: "standard",
        id: "z-model",
        provider: "opencode",
      },
      {
        cliFormat: "p/a-model",
        costHint: "cheap",
        id: "a-model",
        provider: "opencode",
      },
    ];

    const content = generateDynamicFileContent(models);
    const aIndex = content.indexOf('"a-model"');
    const zIndex = content.indexOf('"z-model"');
    expect(aIndex).toBeLessThan(zIndex);
  });

  test("includes generation timestamp in ISO format", () => {
    const content = generateDynamicFileContent([]);
    // Match ISO date pattern in the Generated: comment
    expect(content).toMatch(/Generated: \d{4}-\d{2}-\d{2}T/);
  });
});

// =============================================================================
// DISCOVERABLE_PROVIDERS
// =============================================================================

describe("DISCOVERABLE_PROVIDERS", () => {
  test("includes opencode", () => {
    expect(DISCOVERABLE_PROVIDERS).toContain("opencode");
  });

  test("is a non-empty array", () => {
    expect(DISCOVERABLE_PROVIDERS.length).toBeGreaterThan(0);
  });
});

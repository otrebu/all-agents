import type { ModelInfo } from "@tools/commands/ralph/providers/models-static";

import { STATIC_MODELS } from "@tools/commands/ralph/providers/models-static";
import {
  deriveFriendlyId,
  DISCOVERABLE_PROVIDERS,
  filterDuplicates,
  generateDynamicFileContent,
  parseCursorModelsOutput,
  parseOpencodeModelsOutput,
} from "@tools/commands/ralph/refresh-models";
import { describe, expect, test } from "bun:test";

// =============================================================================
// parseOpencodeModelsOutput (verbose format)
// =============================================================================

describe("parseOpencodeModelsOutput", () => {
  test("parses verbose output with header + JSON blocks", () => {
    const input = [
      "openai/gpt-5.3-codex",
      JSON.stringify(
        {
          cost: { input: 15, output: 60 },
          id: "gpt-5.3-codex",
          name: "GPT-5.3 Codex",
          providerID: "openai",
        },
        null,
        2,
      ),
      "github-copilot/gpt-4o",
      JSON.stringify(
        {
          cost: { input: 2.5, output: 10 },
          id: "gpt-4o",
          name: "GPT-4o",
          providerID: "github-copilot",
        },
        null,
        2,
      ),
    ].join("\n");

    const result = parseOpencodeModelsOutput(input);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("openai/gpt-5.3-codex");
    expect(result[0]?.cliFormat).toBe("openai/gpt-5.3-codex");
    expect(result[0]?.costHint).toBe("expensive");
    expect(result[0]?.provider).toBe("opencode");
    expect(result[0]?.discoveredAt).toBeDefined();
    expect(result[1]?.id).toBe("github-copilot/gpt-4o");
    expect(result[1]?.costHint).toBe("standard");
  });

  test("derives cost hint from cost.input field", () => {
    const input = [
      "opencode/free-model",
      JSON.stringify({
        cost: { input: 0, output: 0 },
        id: "free-model",
        providerID: "opencode",
      }),
      "openai/expensive-model",
      JSON.stringify({
        cost: { input: 15, output: 60 },
        id: "expensive-model",
        providerID: "openai",
      }),
      "openai/standard-model",
      JSON.stringify({
        cost: { input: 5, output: 15 },
        id: "standard-model",
        providerID: "openai",
      }),
    ].join("\n");

    const result = parseOpencodeModelsOutput(input);
    expect(result).toHaveLength(3);
    expect(result[0]?.costHint).toBe("cheap");
    expect(result[1]?.costHint).toBe("expensive");
    expect(result[2]?.costHint).toBe("standard");
  });

  test("uses header as cliFormat and derives fully-qualified ID", () => {
    const input = [
      "provider/my-model-name",
      JSON.stringify({ id: "my-model-name", providerID: "provider" }),
    ].join("\n");

    const result = parseOpencodeModelsOutput(input);
    expect(result).toHaveLength(1);
    expect(result[0]?.cliFormat).toBe("provider/my-model-name");
    expect(result[0]?.id).toBe("provider/my-model-name");
  });

  test("returns empty array for non-string input", () => {
    const result = parseOpencodeModelsOutput([{ id: "test" }]);
    expect(result).toHaveLength(0);
  });

  test("returns empty array for null input", () => {
    const result = parseOpencodeModelsOutput(null);
    expect(result).toHaveLength(0);
  });

  test("returns empty array for empty string", () => {
    const result = parseOpencodeModelsOutput("");
    expect(result).toHaveLength(0);
  });

  test("skips blocks with invalid JSON", () => {
    const input = [
      "provider/good-model",
      JSON.stringify({ id: "good-model", providerID: "provider" }),
      "provider/bad-model",
      "not valid json {{{",
      "provider/another-good",
      JSON.stringify({ id: "another-good", providerID: "provider" }),
    ].join("\n");

    const result = parseOpencodeModelsOutput(input);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("provider/good-model");
    expect(result[1]?.id).toBe("provider/another-good");
  });

  test("sets discoveredAt to ISO date format (YYYY-MM-DD)", () => {
    const input = [
      "provider/test",
      JSON.stringify({ id: "test", providerID: "provider" }),
    ].join("\n");

    const result = parseOpencodeModelsOutput(input);
    expect(result[0]?.discoveredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("sets provider to opencode for all entries", () => {
    const input = [
      "openai/model-a",
      JSON.stringify({ id: "model-a", providerID: "openai" }),
      "github-copilot/model-b",
      JSON.stringify({ id: "model-b", providerID: "github-copilot" }),
    ].join("\n");

    const result = parseOpencodeModelsOutput(input);
    for (const model of result) {
      expect(model.provider).toBe("opencode");
    }
  });

  test("handles pretty-printed JSON blocks", () => {
    const input = [
      "opencode/big-pickle",
      JSON.stringify(
        {
          cost: { input: 0, output: 0 },
          id: "big-pickle",
          name: "Big Pickle",
          providerID: "opencode",
        },
        null,
        2,
      ),
    ].join("\n");

    const result = parseOpencodeModelsOutput(input);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("opencode/big-pickle");
    expect(result[0]?.cliFormat).toBe("opencode/big-pickle");
  });
});

// =============================================================================
// parseCursorModelsOutput (list-models text format)
// =============================================================================

describe("parseCursorModelsOutput", () => {
  test("parses cursor model list lines into cursor ModelInfo records", () => {
    const input = [
      "Available models",
      "",
      "gpt-5.3-codex - GPT-5.3 Codex",
      "gpt-5.3-codex-fast - GPT-5.3 Codex Fast",
      "opus-4.6-thinking - Claude 4.6 Opus (Thinking)  (current, default)",
      "Tip: use --model <id> to switch.",
    ].join("\n");

    const result = parseCursorModelsOutput(input);
    expect(result).toHaveLength(3);
    expect(result[0]?.provider).toBe("cursor");
    expect(result[0]?.id).toBe("gpt-5.3-codex");
    expect(result[0]?.cliFormat).toBe("gpt-5.3-codex");
  });

  test("strips ANSI escape sequences before parsing", () => {
    const input =
      "\u001b[2K\u001b[GLoading models…\n\u001b[2K\u001b[1A\u001b[2K\u001b[GAvailable models\n\ngpt-5.2-codex-high-fast - GPT-5.2 Codex High Fast";

    const result = parseCursorModelsOutput(input);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("gpt-5.2-codex-high-fast");
    expect(result[0]?.provider).toBe("cursor");
  });

  test("returns empty array for non-string input", () => {
    const result = parseCursorModelsOutput(42);
    expect(result).toHaveLength(0);
  });

  test("returns empty array for empty string", () => {
    const result = parseCursorModelsOutput("");
    expect(result).toHaveLength(0);
  });

  test("does not classify gemini as mini-cost hint", () => {
    const input = "gemini-3-pro - Gemini 3 Pro";
    const result = parseCursorModelsOutput(input);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("gemini-3-pro");
    expect(result[0]?.costHint).toBe("standard");
  });
});

// =============================================================================
// deriveFriendlyId
// =============================================================================

describe("deriveFriendlyId", () => {
  test("returns cliFormat when it contains a slash", () => {
    const result = deriveFriendlyId({}, "openai/gpt-4o", "gpt-4o");
    expect(result).toBe("openai/gpt-4o");
  });

  test("returns fallback when it contains a slash", () => {
    const result = deriveFriendlyId({}, "gpt-4o", "openai/gpt-4o");
    expect(result).toBe("openai/gpt-4o");
  });

  test("constructs provider/fallback from record.providerID", () => {
    const result = deriveFriendlyId(
      { providerID: "openai" },
      "gpt-4o",
      "gpt-4o",
    );
    expect(result).toBe("openai/gpt-4o");
  });

  test("falls back to record.provider when providerID missing", () => {
    const result = deriveFriendlyId(
      { provider: "github-copilot" },
      "gpt-4o",
      "gpt-4o",
    );
    expect(result).toBe("github-copilot/gpt-4o");
  });

  test("returns plain fallback when no provider info available", () => {
    const result = deriveFriendlyId({}, "gpt-4o", "gpt-4o");
    expect(result).toBe("gpt-4o");
  });
});

// =============================================================================
// filterDuplicates
// =============================================================================

describe("filterDuplicates", () => {
  test("removes models with IDs matching STATIC_MODELS", () => {
    // Use an actual static model ID from the expanded registry
    const staticId = STATIC_MODELS[0]?.id ?? "";
    const discovered: Array<ModelInfo> = [
      {
        cliFormat: staticId,
        costHint: "standard",
        discoveredAt: "2026-02-06",
        id: staticId,
        provider: "opencode",
      },
      {
        cliFormat: "google/gemini-2.5-pro",
        costHint: "standard",
        discoveredAt: "2026-02-06",
        id: "google/gemini-2.5-pro",
        provider: "opencode",
      },
    ];

    const result = filterDuplicates(discovered);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("google/gemini-2.5-pro");
  });

  test("returns all models when none match static IDs", () => {
    const discovered: Array<ModelInfo> = [
      {
        cliFormat: "google/gemini-flash",
        costHint: "cheap",
        discoveredAt: "2026-02-06",
        id: "google/gemini-flash",
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
        id: "google/gemini-2.5-pro",
        provider: "opencode",
      },
    ];

    const content = generateDynamicFileContent(models);
    expect(content).toContain('"google/gemini-2.5-pro"');
    expect(content).toContain('"standard"');
    expect(content).toContain('"2026-02-06"');
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
    expect(content).toMatch(/Generated: \d{4}-\d{2}-\d{2}T/);
  });
});

// =============================================================================
// DISCOVERABLE_PROVIDERS
// =============================================================================

describe("DISCOVERABLE_PROVIDERS", () => {
  test("includes cursor", () => {
    expect(DISCOVERABLE_PROVIDERS).toContain("cursor");
  });

  test("includes opencode", () => {
    expect(DISCOVERABLE_PROVIDERS).toContain("opencode");
  });

  test("is a non-empty array", () => {
    expect(DISCOVERABLE_PROVIDERS.length).toBeGreaterThan(0);
  });
});

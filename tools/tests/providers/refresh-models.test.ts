import type { ModelInfo } from "@tools/commands/ralph/providers/models-static";
import type * as RefreshModelsModule from "@tools/commands/ralph/refresh-models";

import { DISCOVERED_MODELS } from "@tools/commands/ralph/providers/models-dynamic";
import { STATIC_MODELS } from "@tools/commands/ralph/providers/models-static";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

void mock.module("../src/commands/ralph/config", () => ({
  loadRalphConfig: () => ({}),
}));

void mock.module("@tools/commands/ralph/config", () => ({
  loadRalphConfig: () => ({}),
}));

let refreshModelsModule: null | typeof RefreshModelsModule = null;

beforeAll(async () => {
  refreshModelsModule = await import("@tools/commands/ralph/refresh-models");
});

interface SpawnSyncResult {
  exitCode: number;
  stderr: Uint8Array;
  stdout: Uint8Array;
}

function getRefreshModelsModule(): typeof RefreshModelsModule {
  if (refreshModelsModule === null) {
    throw new Error("refresh models module not loaded");
  }
  return refreshModelsModule;
}

const originalSpawnSync = Bun.spawnSync;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const DYNAMIC_MODELS_PATH_ENV = "AAA_RALPH_DYNAMIC_MODELS_PATH";
const originalDynamicModelsPathEnv = process.env[DYNAMIC_MODELS_PATH_ENV];
const consoleLines: Array<string> = [];

function makeSpawnSyncResult(
  exitCode: number,
  stdout: string,
  stderr = "",
): SpawnSyncResult {
  return {
    exitCode,
    stderr: Buffer.from(stderr, "utf8"),
    stdout: Buffer.from(stdout, "utf8"),
  };
}

function setupCodexSpawnSyncMockWithOutput(output: string): void {
  Object.assign(Bun, {
    spawnSync: mock((command: Array<string>) => {
      if (command[0] === "which") {
        return makeSpawnSyncResult(0, "/usr/local/bin/codex\n");
      }
      if (command[0] === "codex") {
        const commandText = command.slice(1).join(" ");
        if (commandText === "models --json") {
          return makeSpawnSyncResult(0, output);
        }
        if (
          commandText === "models list --json" ||
          commandText === "models" ||
          commandText === "model list"
        ) {
          return makeSpawnSyncResult(0, "");
        }

        return makeSpawnSyncResult(0, "");
      }
      return makeSpawnSyncResult(1, "", "unexpected command");
    }),
  });
}

function setupCodexSpawnSyncMockWithOutputs(
  outputs: Record<string, string>,
): void {
  Object.assign(Bun, {
    spawnSync: mock((command: Array<string>) => {
      if (command[0] === "which") {
        return outputs.which === undefined
          ? makeSpawnSyncResult(0, "/usr/local/bin/codex\n")
          : makeSpawnSyncResult(0, outputs.which);
      }

      if (command[0] === "codex") {
        const commandText = command.slice(1).join(" ");
        if (outputs[commandText] !== undefined) {
          return makeSpawnSyncResult(0, outputs[commandText]);
        }
        return makeSpawnSyncResult(0, "");
      }

      return makeSpawnSyncResult(1, "", "unexpected command");
    }),
  });
}

function setupCursorSpawnSyncMockWithOutput(output: string): void {
  Object.assign(Bun, {
    spawnSync: mock((command: Array<string>) => {
      if (command[0] === "which") {
        if (command[1] === "agent" || command[1] === "cursor-agent") {
          return makeSpawnSyncResult(0, `/usr/local/bin/${command[1]}\n`);
        }
        return makeSpawnSyncResult(1, "", "not found");
      }

      if (
        (command[0] === "agent" || command[0] === "cursor-agent") &&
        command[1] === "--list-models"
      ) {
        return makeSpawnSyncResult(0, output);
      }

      return makeSpawnSyncResult(1, "", "unexpected command");
    }),
  });
}

afterEach(() => {
  DISCOVERED_MODELS.length = 0;
});

beforeEach(() => {
  Bun.spawnSync = originalSpawnSync;
  consoleLines.length = 0;
  console.log = mock((...lines: Array<unknown>) => {
    consoleLines.push(lines.map(String).join(" "));
  }) as typeof console.log;
  console.warn = mock(() => {}) as typeof console.warn;
  console.error = mock(() => {}) as typeof console.error;
});

afterEach(() => {
  Bun.spawnSync = originalSpawnSync;
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  if (originalDynamicModelsPathEnv === undefined) {
    Reflect.deleteProperty(process.env, DYNAMIC_MODELS_PATH_ENV);
  } else {
    process.env[DYNAMIC_MODELS_PATH_ENV] = originalDynamicModelsPathEnv;
  }
});

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

    const result = getRefreshModelsModule().parseOpencodeModelsOutput(input);
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

    const result = getRefreshModelsModule().parseOpencodeModelsOutput(input);
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

    const result = getRefreshModelsModule().parseOpencodeModelsOutput(input);
    expect(result).toHaveLength(1);
    expect(result[0]?.cliFormat).toBe("provider/my-model-name");
    expect(result[0]?.id).toBe("provider/my-model-name");
  });

  test("returns empty array for non-string input", () => {
    const result = getRefreshModelsModule().parseOpencodeModelsOutput([
      { id: "test" },
    ]);
    expect(result).toHaveLength(0);
  });

  test("returns empty array for null input", () => {
    const result = getRefreshModelsModule().parseOpencodeModelsOutput(null);
    expect(result).toHaveLength(0);
  });

  test("returns empty array for empty string", () => {
    const result = getRefreshModelsModule().parseOpencodeModelsOutput("");
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

    const result = getRefreshModelsModule().parseOpencodeModelsOutput(input);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("provider/good-model");
    expect(result[1]?.id).toBe("provider/another-good");
  });

  test("sets discoveredAt to ISO date format (YYYY-MM-DD)", () => {
    const input = [
      "provider/test",
      JSON.stringify({ id: "test", providerID: "provider" }),
    ].join("\n");

    const result = getRefreshModelsModule().parseOpencodeModelsOutput(input);
    expect(result[0]?.discoveredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("sets provider to opencode for all entries", () => {
    const input = [
      "openai/model-a",
      JSON.stringify({ id: "model-a", providerID: "openai" }),
      "github-copilot/model-b",
      JSON.stringify({ id: "model-b", providerID: "github-copilot" }),
    ].join("\n");

    const result = getRefreshModelsModule().parseOpencodeModelsOutput(input);
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

    const result = getRefreshModelsModule().parseOpencodeModelsOutput(input);
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

    const result = getRefreshModelsModule().parseCursorModelsOutput(input);
    expect(result).toHaveLength(3);
    expect(result[0]?.provider).toBe("cursor");
    expect(result[0]?.id).toBe("gpt-5.3-codex");
    expect(result[0]?.cliFormat).toBe("gpt-5.3-codex");
  });

  test("strips ANSI escape sequences before parsing", () => {
    const input =
      "\u001b[2K\u001b[GLoading models…\n\u001b[2K\u001b[1A\u001b[2K\u001b[GAvailable models\n\ngpt-5.2-codex-high-fast - GPT-5.2 Codex High Fast";

    const result = getRefreshModelsModule().parseCursorModelsOutput(input);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("gpt-5.2-codex-high-fast");
    expect(result[0]?.provider).toBe("cursor");
  });

  test("returns empty array for non-string input", () => {
    const result = getRefreshModelsModule().parseCursorModelsOutput(42);
    expect(result).toHaveLength(0);
  });

  test("returns empty array for empty string", () => {
    const result = getRefreshModelsModule().parseCursorModelsOutput("");
    expect(result).toHaveLength(0);
  });

  test("does not classify gemini as mini-cost hint", () => {
    const input = "gemini-3-pro - Gemini 3 Pro";
    const result = getRefreshModelsModule().parseCursorModelsOutput(input);
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
    const result = getRefreshModelsModule().deriveFriendlyId(
      {},
      "openai/gpt-4o",
      "gpt-4o",
    );
    expect(result).toBe("openai/gpt-4o");
  });

  test("returns fallback when it contains a slash", () => {
    const result = getRefreshModelsModule().deriveFriendlyId(
      {},
      "gpt-4o",
      "openai/gpt-4o",
    );
    expect(result).toBe("openai/gpt-4o");
  });

  test("constructs provider/fallback from record.providerID", () => {
    const result = getRefreshModelsModule().deriveFriendlyId(
      { providerID: "openai" },
      "gpt-4o",
      "gpt-4o",
    );
    expect(result).toBe("openai/gpt-4o");
  });

  test("falls back to record.provider when providerID missing", () => {
    const result = getRefreshModelsModule().deriveFriendlyId(
      { provider: "github-copilot" },
      "gpt-4o",
      "gpt-4o",
    );
    expect(result).toBe("github-copilot/gpt-4o");
  });

  test("returns plain fallback when no provider info available", () => {
    const result = getRefreshModelsModule().deriveFriendlyId(
      {},
      "gpt-4o",
      "gpt-4o",
    );
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

    const result = getRefreshModelsModule().filterDuplicates(discovered);
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

    const result = getRefreshModelsModule().filterDuplicates(discovered);
    expect(result).toHaveLength(1);
  });

  test("returns empty array when all models match static IDs", () => {
    const discovered: Array<ModelInfo> = STATIC_MODELS.map((m) => ({
      ...m,
      discoveredAt: "2026-02-06",
    }));

    const result = getRefreshModelsModule().filterDuplicates(discovered);
    expect(result).toHaveLength(0);
  });

  test("skips models already stored in the dynamic registry", () => {
    const existingModel: ModelInfo = {
      cliFormat: "google/gemini-3-plus",
      costHint: "standard",
      discoveredAt: "2026-02-06",
      id: "google/gemini-3-plus",
      provider: "opencode",
    };

    DISCOVERED_MODELS.push(existingModel);

    const discovered: Array<ModelInfo> = [
      existingModel,
      {
        cliFormat: "google/gemini-3-flash",
        costHint: "standard",
        discoveredAt: "2026-02-06",
        id: "google/gemini-3-flash",
        provider: "opencode",
      },
    ];

    const result = getRefreshModelsModule().filterDuplicates(discovered);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("google/gemini-3-plus");
    expect(result[1]?.id).toBe("google/gemini-3-flash");
  });

  test("returns empty array for empty input", () => {
    const result = getRefreshModelsModule().filterDuplicates([]);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// generateDynamicFileContent
// =============================================================================

describe("generateDynamicFileContent", () => {
  test("generates valid JSON payload with metadata", () => {
    const content = getRefreshModelsModule().generateDynamicFileContent([]);
    const parsed = JSON.parse(content) as {
      generatedAt: string;
      models: Array<unknown>;
      version: number;
    };
    expect(parsed.version).toBe(1);
    expect(parsed.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Array.isArray(parsed.models)).toBe(true);
  });

  test("generates empty models array when no models provided", () => {
    const content = getRefreshModelsModule().generateDynamicFileContent([]);
    const parsed = JSON.parse(content) as { models: Array<unknown> };
    expect(parsed.models).toHaveLength(0);
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

    const content = getRefreshModelsModule().generateDynamicFileContent(models);
    const parsed = JSON.parse(content) as {
      models: Array<{
        cliFormat: string;
        costHint: string;
        discoveredAt: string;
        id: string;
        provider: string;
      }>;
    };
    expect(parsed.models).toHaveLength(1);
    expect(parsed.models[0]).toEqual({
      cliFormat: "google/gemini-2.5-pro",
      costHint: "standard",
      discoveredAt: "2026-02-06",
      id: "google/gemini-2.5-pro",
      provider: "opencode",
    });
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

    const content = getRefreshModelsModule().generateDynamicFileContent(models);
    const parsed = JSON.parse(content) as { models: Array<{ id: string }> };
    expect(parsed.models.map((model) => model.id)).toEqual([
      "a-model",
      "z-model",
    ]);
  });

  test("includes generation timestamp in ISO format", () => {
    const content = getRefreshModelsModule().generateDynamicFileContent([]);
    const parsed = JSON.parse(content) as { generatedAt: string };
    expect(parsed.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// =============================================================================
// getDynamicModelsPath
// =============================================================================

describe("getDynamicModelsPath", () => {
  test("uses env override path when configured", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "ralph-path-"));
    const overridePath = path.join(
      temporaryDirectory,
      "custom",
      "dynamic.json",
    );
    process.env[DYNAMIC_MODELS_PATH_ENV] = overridePath;

    try {
      expect(getRefreshModelsModule().getDynamicModelsPath()).toBe(
        overridePath,
      );
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });
});

// =============================================================================
// DISCOVERABLE_PROVIDERS
// =============================================================================

describe("DISCOVERABLE_PROVIDERS", () => {
  test("includes cursor", () => {
    expect(getRefreshModelsModule().DISCOVERABLE_PROVIDERS).toContain("cursor");
  });

  test("excludes codex", () => {
    expect(getRefreshModelsModule().DISCOVERABLE_PROVIDERS).not.toContain(
      "codex",
    );
  });

  test("includes opencode", () => {
    expect(getRefreshModelsModule().DISCOVERABLE_PROVIDERS).toContain(
      "opencode",
    );
  });

  test("is a non-empty array", () => {
    expect(
      getRefreshModelsModule().DISCOVERABLE_PROVIDERS.length,
    ).toBeGreaterThan(0);
  });
});

// =============================================================================
// buildNextDynamicModels
// =============================================================================

describe("buildNextDynamicModels", () => {
  test("preserves existing models when new models are discovered", () => {
    const existing: Array<ModelInfo> = [
      {
        cliFormat: "openai/gpt-5-old",
        costHint: "standard",
        discoveredAt: "2026-02-01",
        id: "openai/gpt-5-old",
        provider: "codex",
      },
    ];
    const discovered: Array<ModelInfo> = [
      {
        cliFormat: "openai/gpt-5-new",
        costHint: "expensive",
        discoveredAt: "2026-02-10",
        id: "openai/gpt-5-new",
        provider: "codex",
      },
    ];

    const result = getRefreshModelsModule().buildNextDynamicModels({
      discovered,
      existing,
      isPrune: false,
      successfulProviders: ["codex"],
    });

    expect(result.nextModels.map((model) => model.id)).toEqual([
      "openai/gpt-5-new",
      "openai/gpt-5-old",
    ]);
    expect(result.summary.added).toBe(1);
    expect(result.summary.removed).toBe(0);
  });

  test("prunes only refreshed successful providers", () => {
    const existing: Array<ModelInfo> = [
      {
        cliFormat: "openai/gpt-5-old",
        costHint: "standard",
        discoveredAt: "2026-02-01",
        id: "openai/gpt-5-old",
        provider: "codex",
      },
      {
        cliFormat: "provider-b/retained-opencode-model",
        costHint: "expensive",
        discoveredAt: "2026-02-01",
        id: "provider-b/retained-opencode-model",
        provider: "opencode",
      },
    ];
    const discovered: Array<ModelInfo> = [
      {
        cliFormat: "openai/gpt-5-new",
        costHint: "expensive",
        discoveredAt: "2026-02-10",
        id: "openai/gpt-5-new",
        provider: "codex",
      },
    ];

    const result = getRefreshModelsModule().buildNextDynamicModels({
      discovered,
      existing,
      isPrune: true,
      successfulProviders: ["codex"],
    });

    expect(result.nextModels.map((model) => model.id)).toEqual([
      "openai/gpt-5-new",
      "provider-b/retained-opencode-model",
    ]);
    expect(result.summary.removed).toBe(1);
  });

  test("does not prune providers that failed discovery", () => {
    const existing: Array<ModelInfo> = [
      {
        cliFormat: "openai/gpt-5-old",
        costHint: "standard",
        discoveredAt: "2026-02-01",
        id: "openai/gpt-5-old",
        provider: "codex",
      },
    ];

    const result = getRefreshModelsModule().buildNextDynamicModels({
      discovered: [],
      existing,
      isPrune: true,
      successfulProviders: [],
    });

    expect(result.nextModels).toHaveLength(1);
    expect(result.nextModels[0]?.id).toBe("openai/gpt-5-old");
    expect(result.summary.removed).toBe(0);
  });
});

// =============================================================================
// runRefreshModels
// =============================================================================

describe("runRefreshModels", () => {
  test("throws for codex provider because model discovery is unsupported", () => {
    expect(() => {
      getRefreshModelsModule().runRefreshModels({ provider: "codex" });
    }).toThrow(/does not support model discovery/i);
  });

  test("writes discovered models to env override path and creates directories", () => {
    const temporaryDirectory = mkdtempSync(
      path.join(tmpdir(), "ralph-refresh-"),
    );
    const dynamicModelsPath = path.join(
      temporaryDirectory,
      "nested",
      "models-dynamic.json",
    );
    process.env[DYNAMIC_MODELS_PATH_ENV] = dynamicModelsPath;

    setupCursorSpawnSyncMockWithOutput(
      ["Available models", "", "gpt-5.3-codex - GPT-5.3 Codex"].join("\n"),
    );

    try {
      getRefreshModelsModule().runRefreshModels({ provider: "cursor" });
      expect(existsSync(dynamicModelsPath)).toBe(true);

      const raw = readFileSync(dynamicModelsPath, "utf8");
      const parsed = JSON.parse(raw) as { models: Array<{ id: string }> };
      expect(parsed.models.map((model) => model.id)).toContain("gpt-5.3-codex");
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("discovers codex models via discoverFromProviders", () => {
    const output = JSON.stringify([
      { id: "gpt-5.1-codex", providerID: "openai" },
    ]);
    setupCodexSpawnSyncMockWithOutput(output);

    const models = getRefreshModelsModule().discoverFromProviders(["codex"]);
    expect(models).toHaveLength(1);
    expect(models[0]?.id).toBe("openai/gpt-5.1-codex");
    expect(models[0]?.provider).toBe("codex");
    expect(models[0]?.cliFormat).toBe("openai/gpt-5.1-codex");
  });

  test("discovers codex models from plain-text fallback output", () => {
    const output = ["openai/gpt-5.3-codex", "provider-b/gpt-mini"].join("\n");
    setupCodexSpawnSyncMockWithOutputs({
      "model list": "",
      models: output,
      "models --json": "",
      "models list --json": "",
    });

    const models = getRefreshModelsModule().discoverFromProviders(["codex"]);
    expect(models).toHaveLength(2);
    expect(models.map((m) => m.id)).toEqual([
      "openai/gpt-5.3-codex",
      "provider-b/gpt-mini",
    ]);
  });

  test("throws for unknown provider flag", () => {
    expect(() => {
      getRefreshModelsModule().runRefreshModels({ provider: "not-a-provider" });
    }).toThrow();
  });

  test("throws for providers that do not support discovery", () => {
    expect(() => {
      getRefreshModelsModule().runRefreshModels({ provider: "claude" });
    }).toThrow(/does not support model discovery/i);
  });
});

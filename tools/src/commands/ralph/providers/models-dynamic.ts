/* eslint-disable perfectionist/sort-modules, no-continue, prefer-destructuring */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ModelInfo } from "./models-static";
import type { ProviderType } from "./types";

interface DynamicModelsPayload {
  generatedAt?: unknown;
  models?: unknown;
  version?: unknown;
}

const VALID_COST_HINTS = new Set(["cheap", "expensive", "standard"]);
const VALID_PROVIDERS = new Set([
  "claude",
  "codex",
  "cursor",
  "gemini",
  "opencode",
  "pi",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isProviderType(value: string): value is ProviderType {
  return VALID_PROVIDERS.has(value);
}

function isCostHint(value: string): value is ModelInfo["costHint"] {
  return VALID_COST_HINTS.has(value);
}

function parseModelRecord(value: unknown): ModelInfo | null {
  if (!isRecord(value)) {
    return null;
  }

  const cliFormat = value.cliFormat;
  const costHint = value.costHint;
  const discoveredAt = value.discoveredAt;
  const id = value.id;
  const provider = value.provider;

  if (
    typeof cliFormat !== "string" ||
    typeof costHint !== "string" ||
    typeof id !== "string" ||
    typeof provider !== "string" ||
    !isCostHint(costHint) ||
    !isProviderType(provider)
  ) {
    return null;
  }

  if (discoveredAt !== undefined && typeof discoveredAt !== "string") {
    return null;
  }

  return { cliFormat, costHint, discoveredAt, id, provider };
}

function loadDiscoveredModels(): Array<ModelInfo> {
  const dynamicModelsPath = path.join(
    import.meta.dirname,
    "models-dynamic.json",
  );
  if (!existsSync(dynamicModelsPath)) {
    return [];
  }

  try {
    const raw = readFileSync(dynamicModelsPath, "utf8");
    const parsed = JSON.parse(raw) as DynamicModelsPayload;
    if (!isRecord(parsed) || !Array.isArray(parsed.models)) {
      return [];
    }

    const models: Array<ModelInfo> = [];
    const seenIds = new Set<string>();
    for (const candidate of parsed.models) {
      const model = parseModelRecord(candidate);
      if (model === null || seenIds.has(model.id)) {
        continue;
      }
      seenIds.add(model.id);
      models.push(model);
    }
    return models;
  } catch {
    return [];
  }
}

const DISCOVERED_MODELS: Array<ModelInfo> = loadDiscoveredModels();

// eslint-disable-next-line import/prefer-default-export -- named export required for code generation consistency
export { DISCOVERED_MODELS };

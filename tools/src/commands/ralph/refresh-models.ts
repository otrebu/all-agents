/**
 * refresh-models command - discover available models from CLI providers
 *
 * Queries providers that support model listing (starting with OpenCode),
 * updates models-dynamic.json, and merges discovered models
 * with the static baseline.
 *
 * @see docs/planning/milestones/004-MULTI-CLI/tasks/TASK-050-dynamic-discovery.md
 */
/* eslint-disable perfectionist/sort-modules, no-continue, no-nested-ternary, unicorn/no-nested-ternary */

import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { ModelInfo } from "./providers/models-static";
import type { ProviderType } from "./providers/types";

import { discoverCodexModels } from "./providers/codex";
import { DISCOVERED_MODELS } from "./providers/models-dynamic";
import { STATIC_MODELS } from "./providers/models-static";
import { REGISTRY, validateProvider } from "./providers/registry";

// =============================================================================
// Types
// =============================================================================

interface RefreshOptions {
  isDryRun?: boolean;
  isPrune?: boolean;
  provider?: string;
}

interface BuildNextDynamicModelsInput {
  discovered: Array<ModelInfo>;
  existing: Array<ModelInfo>;
  isPrune: boolean;
  successfulProviders: Array<ProviderType>;
}

interface BuildNextDynamicModelsResult {
  nextModels: Array<ModelInfo>;
  summary: RefreshSummary;
}

interface DynamicModelsPayload {
  generatedAt: string;
  models: Array<ModelInfo>;
  version: 1;
}

interface ProviderDiscoveryOutcome {
  didSucceed: boolean;
  models: Array<ModelInfo>;
  provider: ProviderType;
}

interface RefreshSummary {
  added: number;
  removed: number;
  unchanged: number;
  updated: number;
}

// =============================================================================
// Provider Discovery
// =============================================================================

/** Providers that support model listing */
const CURSOR_BINARY_CANDIDATES = ["agent", "cursor-agent"] as const;
const DISCOVERABLE_PROVIDERS: Array<ProviderType> = Object.entries(REGISTRY)
  .filter(
    ([, providerCapabilities]) => providerCapabilities.supportsModelDiscovery,
  )
  .map(([provider]) => provider as ProviderType)
  .sort();

/**
 * Derive a stable registry model ID from discovered model record data.
 *
 * For strict table-based validation, prefer fully-qualified provider/model IDs.
 */
function deriveFriendlyId(
  record: Record<string, unknown>,
  cliFormat: string,
  fallback: string,
): string {
  if (cliFormat.includes("/")) {
    return cliFormat;
  }
  if (fallback.includes("/")) {
    return fallback;
  }

  const providerId =
    extractStringField(record, "providerID") ??
    extractStringField(record, "provider");

  if (providerId !== undefined && providerId !== "") {
    return `${providerId}/${fallback}`;
  }

  return fallback;
}

/**
 * Discover models from Cursor Agent via `agent --list-models`.
 *
 * Uses the same binary fallback strategy as runtime invocation:
 * try `agent`, then `cursor-agent`.
 */
function discoverCursorModels(): Array<ModelInfo> {
  const binary = resolveCursorDiscoveryBinary();
  if (binary === null) {
    console.warn("Warning: cursor agent CLI not found, skipping...");
    return [];
  }

  try {
    const proc = Bun.spawnSync([binary, "--list-models"], {
      stderr: "pipe",
      stdout: "pipe",
      timeout: 20_000,
    });

    if (proc.exitCode !== 0) {
      const stderr = proc.stderr.toString().trim();
      console.error(
        `Error discovering cursor models: ${stderr || `exit code ${proc.exitCode}`}`,
      );
      return [];
    }

    const stdout = proc.stdout.toString();
    if (stdout.trim() === "") {
      return [];
    }

    return parseCursorModelsOutput(stdout);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error discovering cursor models: ${message}`);
    return [];
  }
}

/**
 * Discover models from a list of providers.
 * Each provider is queried independently; failures are logged and skipped.
 */
function discoverFromProviders(
  providers: Array<ProviderType>,
): Array<ModelInfo> {
  return discoverFromProvidersWithStatus(providers).flatMap(
    (outcome) => outcome.models,
  );
}

function discoverFromProvidersWithStatus(
  providers: Array<ProviderType>,
): Array<ProviderDiscoveryOutcome> {
  const outcomes: Array<ProviderDiscoveryOutcome> = [];
  for (const provider of providers) {
    if (!isProviderBinaryAvailable(provider)) {
      console.warn(
        `Warning: ${provider} CLI not found in PATH, skipping discovery.`,
      );
      outcomes.push({ didSucceed: false, models: [], provider });
      continue;
    }

    try {
      if (provider === "cursor") {
        outcomes.push({
          didSucceed: true,
          models: discoverCursorModels(),
          provider,
        });
        continue;
      }

      if (provider === "opencode") {
        outcomes.push({
          didSucceed: true,
          models: discoverOpencodeModels(),
          provider,
        });
        continue;
      }

      if (provider === "codex") {
        outcomes.push({
          didSucceed: true,
          models: discoverCodexModels(),
          provider,
        });
        continue;
      }

      outcomes.push({ didSucceed: true, models: [], provider });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error discovering ${provider} models: ${message}`);
      outcomes.push({ didSucceed: false, models: [], provider });
    }
  }

  return outcomes;
}

/**
 * Discover models from the OpenCode CLI via `opencode models --verbose`
 *
 * Spawns the opencode binary, parses verbose output, and maps to ModelInfo[].
 * Returns empty array if CLI is not installed or command fails.
 */
function discoverOpencodeModels(): Array<ModelInfo> {
  try {
    const proc = Bun.spawnSync(["opencode", "models", "--verbose"], {
      stderr: "pipe",
      stdout: "pipe",
    });

    if (proc.exitCode !== 0) {
      const stderr = proc.stderr.toString().trim();
      console.error(
        `Error discovering opencode models: ${stderr || `exit code ${proc.exitCode}`}`,
      );
      return [];
    }

    const stdout = proc.stdout.toString().trim();
    if (stdout === "") {
      return [];
    }

    return parseOpencodeModelsOutput(stdout);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error discovering opencode models: ${message}`);
    return [];
  }
}

function extractStringField(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function isProviderBinaryAvailable(provider: ProviderType): boolean {
  if (provider === "cursor") {
    return CURSOR_BINARY_CANDIDATES.some((binary) => {
      try {
        const proc = Bun.spawnSync(["which", binary], {
          stderr: "pipe",
          stdout: "pipe",
        });
        return proc.exitCode === 0;
      } catch {
        return false;
      }
    });
  }

  const binary =
    provider === "opencode"
      ? "opencode"
      : provider === "codex"
        ? "codex"
        : null;
  if (binary === null) {
    return true;
  }

  try {
    const proc = Bun.spawnSync(["which", binary], {
      stderr: "pipe",
      stdout: "pipe",
    });
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

function hasModelChanged(previous: ModelInfo, next: ModelInfo): boolean {
  return (
    previous.cliFormat !== next.cliFormat ||
    previous.costHint !== next.costHint ||
    previous.discoveredAt !== next.discoveredAt ||
    previous.id !== next.id ||
    previous.provider !== next.provider
  );
}

/**
 * Filter out discovered models whose IDs match static models.
 * Static models always take precedence.
 */
function filterDuplicates(discovered: Array<ModelInfo>): Array<ModelInfo> {
  const staticIds = new Set(STATIC_MODELS.map((m) => m.id));
  return discovered.filter((m) => !staticIds.has(m.id));
}

function sortModels(models: Array<ModelInfo>): Array<ModelInfo> {
  return [...models].sort((a, b) => {
    if (a.provider < b.provider) return -1;
    if (a.provider > b.provider) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}

function uniqueById(models: Array<ModelInfo>): Array<ModelInfo> {
  const byId = new Map<string, ModelInfo>();
  for (const model of models) {
    byId.set(model.id, model);
  }
  return [...byId.values()];
}

function buildNextDynamicModels(
  input: BuildNextDynamicModelsInput,
): BuildNextDynamicModelsResult {
  const existing = uniqueById(filterDuplicates(input.existing));
  const discovered = uniqueById(filterDuplicates(input.discovered));

  const existingById = new Map(existing.map((model) => [model.id, model]));
  const nextById = new Map(existingById);
  for (const model of discovered) {
    nextById.set(model.id, model);
  }

  if (input.isPrune) {
    const successfulProviders = new Set(input.successfulProviders);
    const discoveredByProvider = new Map<ProviderType, Set<string>>();
    for (const model of discovered) {
      const existingIds = discoveredByProvider.get(model.provider);
      if (existingIds === undefined) {
        discoveredByProvider.set(model.provider, new Set([model.id]));
      } else {
        existingIds.add(model.id);
      }
    }

    for (const [id, model] of nextById) {
      if (!successfulProviders.has(model.provider)) {
        continue;
      }

      const discoveredIdsForProvider =
        discoveredByProvider.get(model.provider) ?? new Set<string>();
      if (!discoveredIdsForProvider.has(id)) {
        nextById.delete(id);
      }
    }
  }

  const nextModels = sortModels([...nextById.values()]);
  let added = 0;
  let unchanged = 0;
  let updated = 0;
  for (const model of nextModels) {
    const previous = existingById.get(model.id);
    if (previous === undefined) {
      added += 1;
      continue;
    }

    if (hasModelChanged(previous, model)) {
      updated += 1;
      continue;
    }

    unchanged += 1;
  }

  let removed = 0;
  for (const [id] of existingById) {
    if (!nextById.has(id)) {
      removed += 1;
    }
  }

  return { nextModels, summary: { added, removed, unchanged, updated } };
}

// =============================================================================
// File Generation
// =============================================================================

/**
 * Generate the content of models-dynamic.json from discovered models
 */
function generateDynamicFileContent(models: Array<ModelInfo>): string {
  const payload: DynamicModelsPayload = {
    generatedAt: new Date().toISOString(),
    models: sortModels(models),
    version: 1,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Get the path to models-dynamic.json
 */
function getDynamicModelsPath(): string {
  return path.join(import.meta.dirname, "providers", "models-dynamic.json");
}

function parseCursorCostHint(
  modelId: string,
  displayName: string,
): "cheap" | "expensive" | "standard" {
  const tokenized = `${modelId} ${displayName}`
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter((token) => token !== "");

  const tokenSet = new Set(tokenized);

  if (
    tokenSet.has("fast") ||
    tokenSet.has("flash") ||
    tokenSet.has("haiku") ||
    tokenSet.has("low") ||
    tokenSet.has("mini")
  ) {
    return "cheap";
  }

  if (
    tokenSet.has("high") ||
    tokenSet.has("max") ||
    tokenSet.has("opus") ||
    tokenSet.has("thinking") ||
    tokenSet.has("xhigh")
  ) {
    return "expensive";
  }

  return "standard";
}

function parseCursorModelLine(
  line: string,
  discoveredAt: string,
): ModelInfo | undefined {
  const trimmed = line.trim();
  if (
    trimmed === "" ||
    trimmed.startsWith("Available models") ||
    trimmed.startsWith("Loading models") ||
    trimmed.startsWith("Tip:")
  ) {
    return undefined;
  }

  const match = /^(?<id>[a-zA-Z0-9._/-]+)\s+-\s+(?<displayName>.+)$/u.exec(
    trimmed,
  );
  const modelId = match?.groups?.id;
  const displayName = match?.groups?.displayName;
  if (modelId === undefined || displayName === undefined) {
    return undefined;
  }

  return {
    cliFormat: modelId,
    costHint: parseCursorCostHint(modelId, displayName),
    discoveredAt,
    id: modelId,
    provider: "cursor",
  };
}

/**
 * Parse `agent --list-models` plain-text output into ModelInfo[].
 */
function parseCursorModelsOutput(data: unknown): Array<ModelInfo> {
  if (typeof data !== "string") {
    console.error("Error: cursor models output is not a string");
    return [];
  }

  if (data.trim() === "") {
    return [];
  }

  const cleanOutput = removeCursorControlSequences(data).replaceAll("\r", "");
  const discoveredAt = new Date().toISOString().split("T")[0] ?? "";
  const discovered = new Map<string, ModelInfo>();

  for (const rawLine of cleanOutput.split("\n")) {
    const model = parseCursorModelLine(rawLine, discoveredAt);
    if (model !== undefined) {
      discovered.set(model.id, model);
    }
  }

  return [...discovered.values()];
}

/**
 * Parse the verbose output from `opencode models --verbose` into ModelInfo[]
 *
 * Format: each model is a `provider/model-id` header line followed by a
 * `{...}` JSON metadata block. We split on header lines, parse each JSON
 * blob, and map to ModelInfo[].
 */
function parseOpencodeModelsOutput(data: unknown): Array<ModelInfo> {
  if (typeof data !== "string") {
    console.error("Error: opencode models output is not a string");
    return [];
  }

  if (data.trim() === "") {
    return [];
  }

  const now = new Date().toISOString().split("T")[0] ?? "";
  const models: Array<ModelInfo> = [];

  // Split into blocks: each block starts with a header line (provider/model-id)
  // followed by a JSON object. Header lines match "word/word" at line start.
  const headerPattern = /^(?<header>[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+)$/;
  const lines = data.split("\n");
  // eslint-disable-next-line @typescript-eslint/init-declarations -- reassigned in loop
  let currentHeader: string | undefined;
  let jsonLines: Array<string> = [];

  function processBlock(): void {
    if (currentHeader === undefined || jsonLines.length === 0) {
      return;
    }
    try {
      const record = JSON.parse(jsonLines.join("\n")) as Record<
        string,
        unknown
      >;
      const id =
        typeof record.id === "string"
          ? record.id
          : (currentHeader.split("/").pop() ?? currentHeader);
      const cliFormat = currentHeader;

      // Derive cost hint from cost data if available
      const cost = record.cost as Record<string, unknown> | undefined;
      const inputCost = typeof cost?.input === "number" ? cost.input : 0;
      let costHint: "cheap" | "expensive" | "standard" = "standard";
      if (inputCost === 0) {
        costHint = "cheap";
      } else if (inputCost >= 10) {
        costHint = "expensive";
      }

      const friendlyId = deriveFriendlyId(record, cliFormat, id);

      models.push({
        cliFormat,
        costHint,
        discoveredAt: now,
        id: friendlyId,
        provider: "opencode" as ProviderType,
      });
    } catch {
      // Skip blocks with unparseable JSON
    }
    jsonLines = [];
  }

  for (const line of lines) {
    const match = headerPattern.exec(line.trim());
    if (match?.groups?.header === undefined) {
      jsonLines.push(line);
    } else {
      processBlock();
      currentHeader = match.groups.header;
      jsonLines = [];
    }
  }
  processBlock();

  return models;
}

function removeCursorControlSequences(value: string): string {
  let index = 0;
  let output = "";

  while (index < value.length) {
    const character = value[index];
    const next = value[index + 1];

    if (character !== "\u001b") {
      output += character;
      index += 1;
    } else if (next === "[") {
      // CSI sequence: ESC [ ... final-byte
      index += 2;
      while (index < value.length) {
        const codePoint = value.codePointAt(index);
        index += 1;
        if (codePoint !== undefined && codePoint >= 64 && codePoint <= 126) {
          break;
        }
      }
    } else if (next === "]") {
      // OSC sequence: ESC ] ... BEL OR ESC \\
      index += 2;
      while (index < value.length) {
        const current = value[index];
        if (current === "\u0007") {
          index += 1;
          break;
        }

        if (current === "\u001b" && value[index + 1] === "\\") {
          index += 2;
          break;
        }

        index += 1;
      }
    } else {
      // Single-character escape sequence.
      index += 2;
    }
  }

  return output;
}

function resolveCursorDiscoveryBinary(): null | string {
  for (const candidate of CURSOR_BINARY_CANDIDATES) {
    const proc = Bun.spawnSync(["which", candidate], {
      stderr: "pipe",
      stdout: "pipe",
    });
    if (proc.exitCode === 0) {
      return candidate;
    }
  }

  return null;
}

// =============================================================================
// Main Command Logic
// =============================================================================

/**
 * Run the refresh-models pipeline:
 * 1. Discover models from providers
 * 2. Filter duplicates against static registry
 * 3. Write or preview results
 */
function runRefreshModels(options: RefreshOptions): void {
  const { isDryRun = false, isPrune = false, provider } = options;

  // Validate provider flag first
  const providersToRefresh: Array<ProviderType> =
    provider === undefined
      ? [...DISCOVERABLE_PROVIDERS]
      : [validateProvider(provider)];

  for (const providerToRefresh of providersToRefresh) {
    if (!REGISTRY[providerToRefresh].supportsModelDiscovery) {
      throw new Error(
        `Provider '${providerToRefresh}' does not support model discovery.`,
      );
    }
  }

  if (providersToRefresh.length === 0) {
    console.log("No providers available for model discovery.");
    return;
  }

  // Discover models from each provider
  const outcomes = discoverFromProvidersWithStatus(providersToRefresh);
  const allDiscovered = outcomes.flatMap((outcome) => outcome.models);
  const successfulProviders = outcomes
    .filter((outcome) => outcome.didSucceed)
    .map((outcome) => outcome.provider);

  const existing = uniqueById(filterDuplicates(DISCOVERED_MODELS));
  const { nextModels, summary } = buildNextDynamicModels({
    discovered: allDiscovered,
    existing,
    isPrune,
    successfulProviders,
  });

  // Dry-run mode: print without writing
  if (isDryRun) {
    if (summary.added + summary.updated + summary.removed === 0) {
      console.log("No model registry changes (dry run).");
      return;
    }

    if (summary.updated === 0 && summary.removed === 0) {
      const existingIds = new Set(existing.map((model) => model.id));
      const newlyAdded = nextModels.filter(
        (model) => !existingIds.has(model.id),
      );
      console.log(`Discovered ${newlyAdded.length} new models (dry run):`);
      for (const model of newlyAdded) {
        console.log(`  ${model.id} -> ${model.cliFormat} (${model.provider})`);
      }
      return;
    }

    console.log(
      `Model registry changes (dry run): +${summary.added} ~${summary.updated} -${summary.removed}`,
    );
    return;
  }

  if (summary.added + summary.updated + summary.removed === 0) {
    console.log("No model registry changes.");
    return;
  }

  // Write the dynamic models file
  const content = generateDynamicFileContent(nextModels);
  const filePath = getDynamicModelsPath();

  // Ensure the directory exists
  const directory = path.dirname(filePath);
  if (!existsSync(directory)) {
    throw new Error(`Providers directory not found: ${directory}`);
  }

  writeFileSync(filePath, content, "utf8");
  console.log(
    `Updated dynamic model registry: +${summary.added} ~${summary.updated} -${summary.removed}`,
  );
  console.log(`Updated: ${filePath}`);
}

// =============================================================================
// Exports
// =============================================================================

export {
  buildNextDynamicModels,
  deriveFriendlyId,
  DISCOVERABLE_PROVIDERS,
  discoverCursorModels,
  discoverFromProviders,
  discoverFromProvidersWithStatus,
  discoverOpencodeModels,
  filterDuplicates,
  generateDynamicFileContent,
  getDynamicModelsPath,
  parseCursorModelsOutput,
  parseOpencodeModelsOutput,
  resolveCursorDiscoveryBinary,
  runRefreshModels,
};

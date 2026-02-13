/**
 * refresh-models command - discover available models from CLI providers
 *
 * Queries providers that support model listing (starting with OpenCode),
 * generates a new models-dynamic.ts file, and merges discovered models
 * with the static baseline.
 *
 * @see docs/planning/milestones/004-MULTI-CLI/tasks/TASK-050-dynamic-discovery.md
 */

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
  provider?: string;
}

// =============================================================================
// Provider Discovery
// =============================================================================

/** Providers that support model discovery */
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
 * Discover models from a list of providers.
 * Each provider is queried independently; failures are logged and skipped.
 */
function discoverFromProviders(
  providers: Array<ProviderType>,
): Array<ModelInfo> {
  const results: Array<ModelInfo> = [];
  for (const p of providers) {
    if (p === "opencode") {
      results.push(...discoverOpencodeModels());
    } else if (p === "codex") {
      results.push(...discoverCodexModels());
    }
    // Future providers can be added here
  }
  return results;
}

/**
 * Discover models from the OpenCode CLI via `opencode models --verbose`
 *
 * Spawns the opencode binary, parses verbose output, and maps to ModelInfo[].
 * Returns empty array if CLI is not installed or command fails.
 */
function discoverOpencodeModels(): Array<ModelInfo> {
  // Check if opencode is installed
  const whichProc = Bun.spawnSync(["which", "opencode"], {
    stderr: "pipe",
    stdout: "pipe",
  });
  if (whichProc.exitCode !== 0) {
    console.warn("Warning: opencode CLI not found, skipping...");
    return [];
  }

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

/**
 * Filter out discovered models whose IDs match static models.
 * Static models always take precedence.
 */
function filterDuplicates(discovered: Array<ModelInfo>): Array<ModelInfo> {
  const staticIds = new Set(STATIC_MODELS.map((m) => m.id));
  const dynamicIds = new Set(DISCOVERED_MODELS.map((m) => m.id));
  return discovered.filter(
    (m) => !staticIds.has(m.id) && !dynamicIds.has(m.id),
  );
}

// =============================================================================
// File Generation
// =============================================================================

/**
 * Generate the content of models-dynamic.ts from discovered models
 */
function generateDynamicFileContent(models: Array<ModelInfo>): string {
  const timestamp = new Date().toISOString();

  // Sort by provider, then by ID
  const sorted = [...models].sort((a, b) => {
    if (a.provider < b.provider) return -1;
    if (a.provider > b.provider) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  const lines: Array<string> = [];
  lines.push(
    "// Auto-generated by `aaa ralph refresh-models`",
    "// Do not edit manually - changes will be overwritten on next refresh",
    `// Generated: ${timestamp}`,
    "",
    'import type { ModelInfo } from "./models-static";',
    "",
    "// eslint-disable-next-line import/prefer-default-export -- named export required for code generation consistency",
  );

  if (sorted.length === 0) {
    lines.push("const DISCOVERED_MODELS: Array<ModelInfo> = [];");
  } else {
    lines.push("const DISCOVERED_MODELS: Array<ModelInfo> = [");
    for (const model of sorted) {
      lines.push("  {");
      lines.push(`    cliFormat: ${JSON.stringify(model.cliFormat)},`);
      lines.push(`    costHint: ${JSON.stringify(model.costHint)},`);
      if (model.discoveredAt !== undefined) {
        lines.push(`    discoveredAt: ${JSON.stringify(model.discoveredAt)},`);
      }
      lines.push(`    id: ${JSON.stringify(model.id)},`);
      lines.push(`    provider: ${JSON.stringify(model.provider)},`);
      lines.push("  },");
    }
    lines.push("];");
  }

  lines.push("", "export { DISCOVERED_MODELS };", "");

  return lines.join("\n");
}

/**
 * Get the path to models-dynamic.ts
 */
function getDynamicModelsPath(): string {
  return path.join(import.meta.dirname, "providers", "models-dynamic.ts");
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
  const { isDryRun = false, provider } = options;

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
  const allDiscovered = discoverFromProviders(providersToRefresh);

  // Filter out duplicates against static registry
  const unique = filterDuplicates(allDiscovered);

  if (unique.length === 0) {
    console.log("No new models discovered.");
    return;
  }

  // Dry-run mode: print without writing
  if (isDryRun) {
    console.log(`Discovered ${unique.length} new models (dry run):`);
    for (const model of unique) {
      console.log(`  ${model.id} -> ${model.cliFormat} (${model.provider})`);
    }
    return;
  }

  // Write the dynamic models file
  const content = generateDynamicFileContent(unique);
  const filePath = getDynamicModelsPath();

  // Ensure the directory exists
  const directory = path.dirname(filePath);
  if (!existsSync(directory)) {
    throw new Error(`Providers directory not found: ${directory}`);
  }

  writeFileSync(filePath, content, "utf8");
  console.log(`Discovered ${unique.length} new models`);
  console.log(`Updated: ${filePath}`);
}

// =============================================================================
// Exports
// =============================================================================

export {
  deriveFriendlyId,
  DISCOVERABLE_PROVIDERS,
  discoverFromProviders,
  discoverOpencodeModels,
  filterDuplicates,
  generateDynamicFileContent,
  getDynamicModelsPath,
  parseOpencodeModelsOutput,
  runRefreshModels,
};

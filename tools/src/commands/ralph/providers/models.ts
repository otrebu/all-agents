/**
 * Model registry - merges static + dynamic models and provides lookup/validation
 *
 * Static models take precedence over dynamic models with the same ID,
 * ensuring baseline models are never overridden by discovery.
 *
 * @see docs/planning/milestones/004-MULTI-CLI/tasks/TASK-049-static-registry.md
 */

import type { ModelInfo } from "./models-static";
import type { ProviderType } from "./types";

import { DISCOVERED_MODELS } from "./models-dynamic";
import { STATIC_MODELS } from "./models-static";

// =============================================================================
// Validation Result Types
// =============================================================================

/** Failed model validation result */
interface ModelValidationFailure {
  error: string;
  suggestions: Array<string>;
  valid: false;
}

/** Result of validateModelSelection() */
type ModelValidationResult = ModelValidationFailure | ModelValidationSuccess;

/** Successful model validation result */
interface ModelValidationSuccess {
  cliFormat: string;
  valid: true;
}

// =============================================================================
// Provider-Specific Model Helpers
// =============================================================================

const CODEX_COMPATIBLE_MODEL_PATTERN = /(?:^|[./-])codex(?=[./-]|$)/i;
const REFRESH_HINT =
  "Run 'aaa ralph models' to see available models. Use 'aaa ralph refresh-models' to update discovered models.";
const CODEX_PROVIDER_HINT =
  "Run 'aaa ralph models --provider codex' to see known codex-compatible models. " +
  "You can also pass newly released codex model IDs directly.";

/** Merge static + dynamic models. Static takes precedence on ID conflicts. */
function getAllModels(): Array<ModelInfo> {
  const staticIds = new Set(STATIC_MODELS.map((m) => m.id));
  const uniqueDynamic = DISCOVERED_MODELS.filter((m) => !staticIds.has(m.id));
  return [...STATIC_MODELS, ...uniqueDynamic];
}

function getCodexCompatibleModels(models: Array<ModelInfo>): Array<ModelInfo> {
  return models
    .filter((model) => isCodexCompatibleModel(model))
    .map((model) => ({ ...model, provider: "codex" }));
}

// =============================================================================
// Registry Functions
// =============================================================================

/** Look up a model by ID or cliFormat */
function getModelById(id: string): ModelInfo | undefined {
  return getAllModels().find((m) => m.id === id || m.cliFormat === id);
}

/** Sorted unique model ID list for tab completion */
function getModelCompletions(): Array<string> {
  return [...new Set(getAllModels().map((m) => m.id))].sort();
}

/** Provider-specific sorted completions */
function getModelCompletionsForProvider(provider: ProviderType): Array<string> {
  return getModelsForProvider(provider)
    .map((m) => m.id)
    .sort();
}

function getModelForProvider(
  modelId: string,
  provider: ProviderType,
): ModelInfo | undefined {
  const model = getModelById(modelId);
  if (model === undefined) {
    return undefined;
  }

  if (model.provider === provider) {
    return model;
  }

  if (provider === "codex" && isCodexCompatibleModel(model)) {
    return { ...model, provider: "codex" };
  }

  return model;
}

/** Filter models by provider */
function getModelsForProvider(provider: ProviderType): Array<ModelInfo> {
  if (provider === "codex") {
    return getCodexCompatibleModels(getAllModels());
  }

  return getAllModels().filter((m) => m.provider === provider);
}

function getProviderValidationHint(provider: ProviderType): string {
  if (provider === "codex") {
    return CODEX_PROVIDER_HINT;
  }

  return REFRESH_HINT;
}

function isCodexCompatibleModel(model: ModelInfo): boolean {
  return (
    CODEX_COMPATIBLE_MODEL_PATTERN.test(model.id) ||
    CODEX_COMPATIBLE_MODEL_PATTERN.test(model.cliFormat)
  );
}

function isCodexPassThroughModel(modelId: string): boolean {
  return (
    modelId.trim() !== "" &&
    !/\s/u.test(modelId) &&
    CODEX_COMPATIBLE_MODEL_PATTERN.test(modelId)
  );
}

/**
 * Validate a model ID for a given provider.
 * Returns cliFormat on success, throws a helpful error on failure.
 */
function validateModelForProvider(
  modelId: string,
  provider: ProviderType,
): string {
  const model = getModelForProvider(modelId, provider);
  const normalizedModelId = modelId.trim();

  if (!model) {
    if (provider === "codex" && isCodexPassThroughModel(normalizedModelId)) {
      return normalizedModelId;
    }

    const suggestions = getModelsForProvider(provider)
      .map((m) => m.id)
      .slice(0, 5);
    const hint = getProviderValidationHint(provider);
    throw new Error(
      `Unknown model '${modelId}' for provider '${provider}'\n` +
        `Did you mean: ${suggestions.join(", ")}?\n${hint}`,
    );
  }

  if (model.provider !== provider) {
    const providerModels = getModelsForProvider(provider)
      .map((m) => m.id)
      .slice(0, 5);
    const hint = getProviderValidationHint(provider);
    throw new Error(
      `Model '${modelId}' belongs to provider '${model.provider}', ` +
        `not '${provider}'\n` +
        `Did you mean: ${providerModels.join(", ")}?\n${hint}`,
    );
  }

  return model.cliFormat;
}

/**
 * Validate a model selection for a given provider.
 *
 * Returns a result object instead of throwing, making it suitable for
 * CLI integration where the caller formats the error and exits.
 *
 * @param modelId - User-provided model identifier
 * @param provider - Target provider to validate against
 * @returns Validation result with cliFormat on success, error + suggestions on failure
 */
function validateModelSelection(
  modelId: string,
  provider: ProviderType,
): ModelValidationResult {
  const model = getModelForProvider(modelId, provider);
  const normalizedModelId = modelId.trim();

  if (!model) {
    if (provider === "codex" && isCodexPassThroughModel(normalizedModelId)) {
      return { cliFormat: normalizedModelId, valid: true };
    }

    const suggestions = getModelsForProvider(provider)
      .map((m) => m.id)
      .sort()
      .slice(0, 5);
    const hint = getProviderValidationHint(provider);
    return {
      error: `Unknown model '${modelId}' for provider '${provider}'. ${hint}`,
      suggestions,
      valid: false,
    };
  }

  if (model.provider !== provider) {
    const suggestions = getModelsForProvider(provider)
      .map((m) => m.id)
      .sort()
      .slice(0, 5);
    const hint = getProviderValidationHint(provider);
    return {
      error: `Model '${modelId}' belongs to provider '${model.provider}', not '${provider}'. ${hint}`,
      suggestions,
      valid: false,
    };
  }

  return { cliFormat: model.cliFormat, valid: true };
}

// =============================================================================
// Exports
// =============================================================================

export { DISCOVERED_MODELS } from "./models-dynamic";
export {
  getAllModels,
  getModelById,
  getModelCompletions,
  getModelCompletionsForProvider,
  getModelsForProvider,
  type ModelValidationResult,
  REFRESH_HINT,
  validateModelForProvider,
  validateModelSelection,
};

export type { ModelInfo } from "./models-static";

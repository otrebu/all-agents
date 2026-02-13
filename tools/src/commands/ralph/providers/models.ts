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

function getCodexCompatibleModels(models: Array<ModelInfo>): Array<ModelInfo> {
  return models
    .filter((model) => isCodexCompatibleModel(model))
    .map((model) => ({ ...model, provider: "codex" }));
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

function isCodexCompatibleModel(model: ModelInfo): boolean {
  return (
    CODEX_COMPATIBLE_MODEL_PATTERN.test(model.id) ||
    CODEX_COMPATIBLE_MODEL_PATTERN.test(model.cliFormat)
  );
}

// =============================================================================
// Constants
// =============================================================================

const REFRESH_HINT =
  "Run 'aaa ralph models' to see available models. Use 'aaa ralph refresh-models' to update discovered models.";

// =============================================================================
// Registry Functions
// =============================================================================

/** Merge static + dynamic models. Static takes precedence on ID conflicts. */
function getAllModels(): Array<ModelInfo> {
  const staticIds = new Set(STATIC_MODELS.map((m) => m.id));
  const uniqueDynamic = DISCOVERED_MODELS.filter((m) => !staticIds.has(m.id));
  return [...STATIC_MODELS, ...uniqueDynamic];
}

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

/** Filter models by provider */
function getModelsForProvider(provider: ProviderType): Array<ModelInfo> {
  if (provider === "codex") {
    return getCodexCompatibleModels(getAllModels());
  }

  return getAllModels().filter((m) => m.provider === provider);
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

  if (!model) {
    const suggestions = getModelsForProvider(provider)
      .map((m) => m.id)
      .slice(0, 5);
    throw new Error(
      `Unknown model '${modelId}' for provider '${provider}'\n` +
        `Did you mean: ${suggestions.join(", ")}?\n${REFRESH_HINT}`,
    );
  }

  if (model.provider !== provider) {
    const providerModels = getModelsForProvider(provider)
      .map((m) => m.id)
      .slice(0, 5);
    throw new Error(
      `Model '${modelId}' belongs to provider '${model.provider}', ` +
        `not '${provider}'\n` +
        `Did you mean: ${providerModels.join(", ")}?\n${REFRESH_HINT}`,
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

  if (!model) {
    const suggestions = getModelsForProvider(provider)
      .map((m) => m.id)
      .sort()
      .slice(0, 5);
    return {
      error: `Unknown model '${modelId}' for provider '${provider}'. ${REFRESH_HINT}`,
      suggestions,
      valid: false,
    };
  }

  if (model.provider !== provider) {
    const suggestions = getModelsForProvider(provider)
      .map((m) => m.id)
      .sort()
      .slice(0, 5);
    return {
      error: `Model '${modelId}' belongs to provider '${model.provider}', not '${provider}'. ${REFRESH_HINT}`,
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

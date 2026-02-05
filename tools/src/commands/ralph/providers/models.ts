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

import { STATIC_MODELS } from "./models-static";

// =============================================================================
// Dynamic Models Placeholder (populated by TASK-050 refresh-models)
// =============================================================================

const DISCOVERED_MODELS: Array<ModelInfo> = [];

// =============================================================================
// Registry Functions
// =============================================================================

/** Merge static + dynamic models. Static takes precedence on ID conflicts. */
function getAllModels(): Array<ModelInfo> {
  const staticIds = new Set(STATIC_MODELS.map((m) => m.id));
  const uniqueDynamic = DISCOVERED_MODELS.filter((m) => !staticIds.has(m.id));
  return [...STATIC_MODELS, ...uniqueDynamic];
}

/** Look up a model by ID */
function getModelById(id: string): ModelInfo | undefined {
  return getAllModels().find((m) => m.id === id);
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
  const model = getModelById(modelId);

  if (!model) {
    const suggestions = getModelsForProvider(provider)
      .map((m) => m.id)
      .slice(0, 5);
    throw new Error(
      `Unknown model '${modelId}' for provider '${provider}'\n` +
        `Did you mean: ${suggestions.join(", ")}?\n` +
        `Run 'aaa ralph refresh-models' to discover new models.`,
    );
  }

  if (model.provider !== provider) {
    const providerModels = getModelsForProvider(provider)
      .map((m) => m.id)
      .slice(0, 5);
    throw new Error(
      `Model '${modelId}' belongs to provider '${model.provider}', ` +
        `not '${provider}'\n` +
        `Did you mean: ${providerModels.join(", ")}?\n` +
        `Run 'aaa ralph refresh-models' to discover new models.`,
    );
  }

  return model.cliFormat;
}

// =============================================================================
// Exports
// =============================================================================

export {
  DISCOVERED_MODELS,
  getAllModels,
  getModelById,
  getModelCompletions,
  getModelCompletionsForProvider,
  getModelsForProvider,
  validateModelForProvider,
};

export type { ModelInfo } from "./models-static";

/**
 * Static model registry - baseline models that always work
 *
 * These models are committed to the repo and provide a safety net:
 * ralph works out of the box without requiring model discovery.
 *
 * @see docs/planning/milestones/004-MULTI-CLI/tasks/TASK-049-static-registry.md
 */

import type { ProviderType } from "./types";

// =============================================================================
// ModelInfo Interface
// =============================================================================

interface ModelInfo {
  /** Format required by the provider's CLI (e.g., "openai/gpt-4o") */
  cliFormat: string;
  /** Cost category to guide model selection */
  costHint: "cheap" | "expensive" | "standard";
  /** Optional human-readable description */
  description?: string;
  /** ISO date when dynamically discovered (only for dynamic models) */
  discoveredAt?: string;
  /** User-friendly model identifier (e.g., "gpt-4o") */
  id: string;
  /** Which provider this model belongs to */
  provider: ProviderType;
}

// =============================================================================
// Static Baseline Models
// =============================================================================

const STATIC_MODELS: Array<ModelInfo> = [
  // Claude models (native CLI format)
  {
    cliFormat: "claude-sonnet-4-20250514",
    costHint: "standard",
    id: "claude-sonnet-4",
    provider: "claude",
  },
  {
    cliFormat: "claude-3-5-haiku-latest",
    costHint: "cheap",
    id: "claude-haiku",
    provider: "claude",
  },
  {
    cliFormat: "claude-opus-4-20250514",
    costHint: "expensive",
    id: "claude-opus-4",
    provider: "claude",
  },

  // OpenCode models (provider/model format)
  {
    cliFormat: "openai/gpt-4o",
    costHint: "standard",
    id: "gpt-4o",
    provider: "opencode",
  },
  {
    cliFormat: "openai/gpt-4o-mini",
    costHint: "cheap",
    id: "gpt-4o-mini",
    provider: "opencode",
  },
  {
    cliFormat: "anthropic/claude-sonnet-4-20250514",
    costHint: "standard",
    id: "claude-sonnet-opencode",
    provider: "opencode",
  },
  {
    cliFormat: "anthropic/claude-3-5-haiku-latest",
    costHint: "cheap",
    id: "claude-haiku-opencode",
    provider: "opencode",
  },
];

// =============================================================================
// Exports
// =============================================================================

export { type ModelInfo, STATIC_MODELS };

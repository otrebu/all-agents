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
    cliFormat: "claude-haiku-4-5",
    costHint: "cheap",
    id: "claude-haiku-4-5",
    provider: "claude",
  },
  {
    cliFormat: "claude-haiku-4-5-20251001",
    costHint: "cheap",
    id: "claude-haiku-4-5-20251001",
    provider: "claude",
  },
  {
    cliFormat: "claude-opus-4-6",
    costHint: "expensive",
    id: "claude-opus-4-6",
    provider: "claude",
  },
  {
    cliFormat: "claude-sonnet-4-5",
    costHint: "standard",
    id: "claude-sonnet-4-5",
    provider: "claude",
  },
  {
    cliFormat: "claude-sonnet-4-5-20250929",
    costHint: "standard",
    id: "claude-sonnet-4-5-20250929",
    provider: "claude",
  },

  // Claude aliases accepted by Claude Code
  {
    cliFormat: "claude-opus-4-6",
    costHint: "expensive",
    description: "Claude Code alias",
    id: "default",
    provider: "claude",
  },
  {
    cliFormat: "claude-haiku-4-5-20251001",
    costHint: "cheap",
    description: "Claude Code alias",
    id: "haiku",
    provider: "claude",
  },
  {
    cliFormat: "claude-opus-4-6",
    costHint: "expensive",
    description: "Claude Code alias",
    id: "opus",
    provider: "claude",
  },
  {
    cliFormat: "claude-opus-4-6",
    costHint: "expensive",
    description: "Claude Code alias",
    id: "opusplan",
    provider: "claude",
  },
  {
    cliFormat: "claude-sonnet-4-5-20250929",
    costHint: "standard",
    description: "Claude Code alias",
    id: "sonnet",
    provider: "claude",
  },

  // OpenCode models (provider/model format)
  {
    cliFormat: "github-copilot/claude-haiku-4.5",
    costHint: "cheap",
    id: "github-copilot/claude-haiku-4.5",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/claude-opus-4.5",
    costHint: "expensive",
    id: "github-copilot/claude-opus-4.5",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/claude-opus-4.6",
    costHint: "expensive",
    id: "github-copilot/claude-opus-4.6",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/claude-opus-41",
    costHint: "expensive",
    id: "github-copilot/claude-opus-41",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/claude-sonnet-4",
    costHint: "standard",
    id: "github-copilot/claude-sonnet-4",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/claude-sonnet-4.5",
    costHint: "standard",
    id: "github-copilot/claude-sonnet-4.5",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/gemini-2.5-pro",
    costHint: "standard",
    id: "github-copilot/gemini-2.5-pro",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/gemini-3-flash-preview",
    costHint: "cheap",
    id: "github-copilot/gemini-3-flash-preview",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/gemini-3-pro-preview",
    costHint: "standard",
    id: "github-copilot/gemini-3-pro-preview",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/gpt-4.1",
    costHint: "standard",
    id: "github-copilot/gpt-4.1",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/gpt-4o",
    costHint: "standard",
    id: "github-copilot/gpt-4o",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/gpt-5",
    costHint: "standard",
    id: "github-copilot/gpt-5",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/gpt-5-mini",
    costHint: "cheap",
    id: "github-copilot/gpt-5-mini",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/gpt-5.1",
    costHint: "standard",
    id: "github-copilot/gpt-5.1",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/gpt-5.1-codex",
    costHint: "standard",
    id: "github-copilot/gpt-5.1-codex",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/gpt-5.1-codex-max",
    costHint: "expensive",
    id: "github-copilot/gpt-5.1-codex-max",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/gpt-5.1-codex-mini",
    costHint: "cheap",
    id: "github-copilot/gpt-5.1-codex-mini",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/gpt-5.2",
    costHint: "standard",
    id: "github-copilot/gpt-5.2",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/gpt-5.2-codex",
    costHint: "expensive",
    id: "github-copilot/gpt-5.2-codex",
    provider: "opencode",
  },
  {
    cliFormat: "github-copilot/grok-code-fast-1",
    costHint: "cheap",
    id: "github-copilot/grok-code-fast-1",
    provider: "opencode",
  },
  {
    cliFormat: "kimi-for-coding/k2p5",
    costHint: "standard",
    id: "kimi-for-coding/k2p5",
    provider: "opencode",
  },
  {
    cliFormat: "kimi-for-coding/kimi-k2-thinking",
    costHint: "standard",
    id: "kimi-for-coding/kimi-k2-thinking",
    provider: "opencode",
  },
  {
    cliFormat: "opencode/big-pickle",
    costHint: "standard",
    id: "opencode/big-pickle",
    provider: "opencode",
  },
  {
    cliFormat: "opencode/glm-4.7-free",
    costHint: "cheap",
    id: "opencode/glm-4.7-free",
    provider: "opencode",
  },
  {
    cliFormat: "opencode/gpt-5-nano",
    costHint: "cheap",
    id: "opencode/gpt-5-nano",
    provider: "opencode",
  },
  {
    cliFormat: "opencode/kimi-k2.5-free",
    costHint: "cheap",
    id: "opencode/kimi-k2.5-free",
    provider: "opencode",
  },
  {
    cliFormat: "opencode/minimax-m2.1-free",
    costHint: "cheap",
    id: "opencode/minimax-m2.1-free",
    provider: "opencode",
  },
  {
    cliFormat: "opencode/trinity-large-preview-free",
    costHint: "cheap",
    id: "opencode/trinity-large-preview-free",
    provider: "opencode",
  },
  {
    cliFormat: "openai/gpt-5.1-codex",
    costHint: "standard",
    id: "openai/gpt-5.1-codex",
    provider: "opencode",
  },
  {
    cliFormat: "openai/gpt-5.1-codex-max",
    costHint: "expensive",
    id: "openai/gpt-5.1-codex-max",
    provider: "opencode",
  },
  {
    cliFormat: "openai/gpt-5.1-codex-mini",
    costHint: "cheap",
    id: "openai/gpt-5.1-codex-mini",
    provider: "opencode",
  },
  {
    cliFormat: "openai/gpt-5.2",
    costHint: "standard",
    id: "openai/gpt-5.2",
    provider: "opencode",
  },
  {
    cliFormat: "openai/gpt-5.2-codex",
    costHint: "expensive",
    id: "openai/gpt-5.2-codex",
    provider: "opencode",
  },
  {
    cliFormat: "openai/gpt-5.3-codex",
    costHint: "expensive",
    id: "openai/gpt-5.3-codex",
    provider: "opencode",
  },
  {
    cliFormat: "openai/gpt-5.3-codex-spark",
    costHint: "expensive",
    id: "openai/gpt-5.3-codex-spark",
    provider: "opencode",
  },
];

// =============================================================================
// Exports
// =============================================================================

export { type ModelInfo, STATIC_MODELS };

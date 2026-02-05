/**
 * Provider registry for Ralph multi-CLI support
 *
 * Central hub for provider selection and invocation. Wraps provider-specific
 * functions behind a unified interface so build.ts and review/index.ts can
 * work with any supported provider.
 *
 * @see docs/planning/milestones/004-MULTI-CLI/tasks/TASK-037-provider-registry.md
 */

import type { AgentResult, ProviderType } from "./types";

import { invokeClaudeChat, invokeClaudeHeadlessAsync } from "../claude";

// =============================================================================
// Types
// =============================================================================

/** Options for headless provider invocation */
interface HeadlessProviderOptions {
  /** Grace period in ms before SIGKILL after SIGTERM */
  gracePeriodMs?: number;
  mode: "headless";
  /** Callback invoked on stderr activity */
  onStderrActivity?: () => void;
  /** The prompt to send */
  prompt: string;
  /** Stall timeout in ms (0 = disabled) */
  stallTimeoutMs?: number;
  /** Hard timeout in ms (0 = disabled) */
  timeout?: number;
}

/** Union of provider invocation options, discriminated by mode */
type ProviderInvokeOptions =
  | HeadlessProviderOptions
  | SupervisedProviderOptions;

/** Options for supervised provider invocation */
interface SupervisedProviderOptions {
  /** Extra context to prepend to prompt */
  context?: string;
  mode: "supervised";
  /** Path to prompt file */
  promptPath: string;
  /** Session name for display */
  sessionName: string;
}

/** Error thrown when a provider operation fails */
class ProviderError extends Error {
  readonly provider: string;

  constructor(provider: string, message: string) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
  }
}

// =============================================================================
// Valid Providers
// =============================================================================

const VALID_PROVIDERS = new Set<string>([
  "claude",
  "codex",
  "cursor",
  "gemini",
  "opencode",
  "pi",
]);

// =============================================================================
// Provider Invocation
// =============================================================================

/**
 * Invoke Claude in headless mode and normalize result to AgentResult
 */
async function invokeClaudeHeadless(
  options: HeadlessProviderOptions,
): Promise<AgentResult | null> {
  const result = await invokeClaudeHeadlessAsync({
    gracePeriodMs: options.gracePeriodMs,
    onStderrActivity: options.onStderrActivity,
    prompt: options.prompt,
    stallTimeoutMs: options.stallTimeoutMs,
    timeout: options.timeout,
  });

  if (result === null) {
    return null;
  }

  return {
    costUsd: result.cost,
    durationMs: result.duration,
    result: result.result,
    sessionId: result.sessionId,
  };
}

/**
 * Invoke Claude in supervised mode and normalize result to AgentResult
 *
 * Note: Supervised mode runs interactively (stdio: inherit), so the
 * result text is empty and cost is not captured. Signal interruption
 * is handled internally by invokeClaudeChat (process.exit).
 */
function invokeClaudeSupervised(
  options: SupervisedProviderOptions,
): AgentResult | null {
  const startTime = Date.now();

  const chatResult = invokeClaudeChat(
    options.promptPath,
    options.sessionName,
    options.context,
  );

  const durationMs = Date.now() - startTime;

  // invokeClaudeChat handles signal interruption internally (process.exit)
  // If it returns, interrupted is always false
  if (!chatResult.success) {
    return null;
  }

  return { costUsd: 0, durationMs, result: "", sessionId: "" };
}

/**
 * Invoke a provider with the given options
 *
 * Routes to the appropriate provider-specific function based on the
 * provider type. Currently only "claude" is implemented; other providers
 * will be added in future tasks.
 *
 * For headless mode: returns AgentResult with cost, duration, result, sessionId
 * For supervised mode: returns AgentResult with durationMs (cost/result not captured)
 *
 * @param provider - Which provider to use
 * @param options - Invocation options (discriminated by mode)
 * @returns AgentResult on success, null on failure
 */
async function invokeWithProvider(
  provider: ProviderType,
  options: ProviderInvokeOptions,
): Promise<AgentResult | null> {
  if (provider !== "claude") {
    throw new ProviderError(
      provider,
      `Provider '${provider}' is not yet implemented. Currently only 'claude' is supported.`,
    );
  }

  if (options.mode === "headless") {
    return invokeClaudeHeadless(options);
  }

  return invokeClaudeSupervised(options);
}

// =============================================================================
// Provider Selection
// =============================================================================

/**
 * Select the provider to use based on priority:
 * CLI flag > env var (RALPH_PROVIDER) > config > default ("claude")
 *
 * @param override - Explicit provider from CLI flag (highest priority)
 * @returns Validated ProviderType
 */
function selectProvider(override?: string): ProviderType {
  // Priority 1: CLI flag override
  if (override !== undefined && override !== "") {
    return validateProvider(override);
  }

  // Priority 2: Environment variable
  const envProvider = process.env.RALPH_PROVIDER;
  if (envProvider !== undefined && envProvider !== "") {
    return validateProvider(envProvider);
  }

  // Priority 3: Default to claude
  return "claude";
}

/**
 * Validate that a string is a valid ProviderType
 *
 * @param provider - String to validate
 * @returns Valid ProviderType
 * @throws ProviderError if invalid
 */
function validateProvider(provider: string): ProviderType {
  if (!VALID_PROVIDERS.has(provider)) {
    const valid = [...VALID_PROVIDERS].sort().join(", ");
    throw new ProviderError(
      provider,
      `Unknown provider: ${provider}. Valid providers: ${valid}`,
    );
  }
  return provider as ProviderType;
}

// =============================================================================
// Exports
// =============================================================================

export {
  type HeadlessProviderOptions,
  invokeWithProvider,
  ProviderError,
  type ProviderInvokeOptions,
  selectProvider,
  type SupervisedProviderOptions,
  validateProvider,
};

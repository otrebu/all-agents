/**
 * Provider registry and factory for multi-CLI support
 *
 * Manages provider registration, discovery, and instantiation.
 * All providers are registered here and can be retrieved by name.
 */

import type { AIProvider, BaseProviderConfig, ProviderInfo } from "./types";

// Provider instances registry
const providers = new Map<string, AIProvider>();

// Provider factories registry
const factories = new Map<
  string,
  (config?: BaseProviderConfig) => AIProvider
>();

/**
 * Clear provider cache
 * Useful for testing or when configuration changes
 */
function clearProviderCache(): void {
  providers.clear();
}

/**
 * Get available providers (those with CLI installed)
 */
function getAvailableProviders(): Array<ProviderInfo> {
  return listProviders().filter((p) => p.available);
}

/**
 * Get default provider name
 * Returns 'claude' if available, otherwise first available provider
 */
function getDefaultProviderName(): string {
  if (isProviderAvailable("claude")) {
    return "claude";
  }

  const available = getAvailableProviders();
  const first = available[0];
  if (first !== undefined) {
    return first.name;
  }

  return "claude";
}

/**
 * Get a provider instance by name
 * Creates instance if not already cached
 * @param name - Provider name
 * @param config - Optional provider configuration
 * @returns Provider instance
 * @throws ProviderError if provider not found
 */
function getProvider(name: string, config?: BaseProviderConfig): AIProvider {
  // Return cached instance if available and no custom config
  if (!config && providers.has(name)) {
    const cached = providers.get(name);
    if (cached !== undefined) {
      return cached;
    }
  }

  // Create new instance
  const factory = factories.get(name);
  if (!factory) {
    throw new Error(
      `Provider '${name}' is not registered. Available providers: ${listProviderNames().join(", ")}`,
    );
  }

  const provider = factory(config);

  // Cache instance only if using default config
  if (!config) {
    providers.set(name, provider);
  }

  return provider;
}

/**
 * Get provider description
 */
function getProviderDescription(name: string): string {
  const descriptions: Record<string, string> = {
    claude: "Anthropic Claude Code CLI - Full-featured with cost tracking",
    codex: "OpenAI Codex CLI - Structured output support",
    cursor: "Cursor CLI - Fast composer model with IDE integration",
    gemini: "Google Gemini CLI - Free tier with sandbox mode",
    opencode: "OpenCode CLI - Multi-provider support with 75+ models",
  };

  return descriptions[name] ?? `${name} provider`;
}

/**
 * Check if a provider is registered
 * @param name - Provider name
 */
function hasProvider(name: string): boolean {
  return factories.has(name);
}

/**
 * Initialize all built-in providers
 * Call this once at application startup
 */
async function initializeProviders(): Promise<void> {
  const providerModules = [
    "./claude",
    "./opencode",
    "./cursor",
    "./gemini",
    "./codex",
  ];

  // Dynamic import loop - intentional any usage for module loading
  /* eslint-disable no-await-in-loop, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
  for (const modulePath of providerModules) {
    try {
      const providerModule = await import(modulePath);
      if (providerModule.register !== undefined) {
        providerModule.register();
      }
    } catch {
      // Provider module may not exist yet during development
    }
  }
  /* eslint-enable no-await-in-loop, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
}

/**
 * Check if a provider CLI is available in PATH
 * @param name - Provider name
 */
function isProviderAvailable(name: string): boolean {
  try {
    const provider = getProvider(name);
    return provider.isAvailable();
  } catch {
    return false;
  }
}

/**
 * List all registered provider names
 */
function listProviderNames(): Array<string> {
  return [...factories.keys()];
}

/**
 * Get information about all providers
 * @returns Array of provider info objects
 */
function listProviders(): Array<ProviderInfo> {
  const result: Array<ProviderInfo> = [];

  for (const [name, factory] of factories) {
    try {
      const provider = factory();
      result.push({
        available: provider.isAvailable(),
        command: provider.command,
        defaultModel: provider.getDefaultModel(),
        description: getProviderDescription(name),
        name: provider.name,
      });
    } catch {
      // If factory fails, provider is not properly configured
      result.push({
        available: false,
        command: name,
        defaultModel: "unknown",
        description: getProviderDescription(name),
        name,
      });
    }
  }

  return result;
}

/**
 * Register a provider factory
 * @param name - Provider name (e.g., 'claude', 'opencode')
 * @param factory - Factory function that creates provider instance
 */
function registerProvider(
  name: string,
  factory: (config?: BaseProviderConfig) => AIProvider,
): void {
  factories.set(name, factory);
}

// Export everything at the end
export {
  clearProviderCache,
  getAvailableProviders,
  getDefaultProviderName,
  getProvider,
  hasProvider,
  initializeProviders,
  isProviderAvailable,
  listProviderNames,
  listProviders,
  registerProvider,
};

export {
  type AIProvider,
  type BaseProviderConfig,
  type ProviderError,
  type ProviderInfo,
} from "./types";

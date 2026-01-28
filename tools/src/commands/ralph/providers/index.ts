/**
 * Provider registry and factory for multi-CLI support
 * 
 * Manages provider registration, discovery, and instantiation.
 * All providers are registered here and can be retrieved by name.
 */

import type { AIProvider, BaseProviderConfig, ProviderInfo } from './types';

import { ProviderError } from './types';

// Provider instances registry
const providers = new Map<string, AIProvider>();

// Provider factories registry
const factories = new Map<string, (config?: BaseProviderConfig) => AIProvider>();

/**
 * Clear provider cache
 * Useful for testing or when configuration changes
 */
export function clearProviderCache(): void {
  providers.clear();
}

/**
 * Get available providers (those with CLI installed)
 */
export function getAvailableProviders(): Array<ProviderInfo> {
  return listProviders().filter(p => p.available);
}

/**
 * Get default provider name
 * Returns 'claude' if available, otherwise first available provider
 */
export function getDefaultProviderName(): string {
  if (isProviderAvailable('claude')) {
    return 'claude';
  }
  
  const available = getAvailableProviders();
  const first = available[0];
  if (first !== undefined) {
    return first.name;
  }
  
  return 'claude'; // Fallback even if not available
}

/**
 * Get a provider instance by name
 * Creates instance if not already cached
 * @param name - Provider name
 * @param config - Optional provider configuration
 * @returns Provider instance
 * @throws ProviderError if provider not found
 */
export function getProvider(name: string, config?: BaseProviderConfig): AIProvider {
  // Return cached instance if available and no custom config
  if (!config && providers.has(name)) {
    return providers.get(name)!;
  }
  
  // Create new instance
  const factory = factories.get(name);
  if (!factory) {
    throw new ProviderError(
      'not-installed',
      `Provider '${name}' is not registered. Available providers: ${listProviderNames().join(', ')}`,
      name
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
 * Check if a provider is registered
 * @param name - Provider name
 */
export function hasProvider(name: string): boolean {
  return factories.has(name);
}

/**
 * Initialize all built-in providers
 * Call this once at application startup
 */
export async function initializeProviders(): Promise<void> {
  // Import and register providers dynamically to avoid circular dependencies
  const providerModules = [
    './claude',
    './opencode',
    './cursor',
    './gemini',
    './codex',
  ];
  
  for (const modulePath of providerModules) {
    try {
      const module = await import(modulePath);
      if (module.register) {
        module.register();
      }
    } catch (error) {
      // Provider module may not exist yet during development
      console.warn(`Failed to load provider module: ${modulePath}`, error);
    }
  }
}

/**
 * Check if a provider CLI is available in PATH
 * @param name - Provider name
 */
export function isProviderAvailable(name: string): boolean {
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
export function listProviderNames(): Array<string> {
  return [...factories.keys()];
}

/**
 * Get information about all providers
 * @returns Array of provider info objects
 */
export function listProviders(): Array<ProviderInfo> {
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
        defaultModel: 'unknown',
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
export function registerProvider(
  name: string,
  factory: (config?: BaseProviderConfig) => AIProvider
): void {
  factories.set(name, factory);
}

/**
 * Get provider description
 */
function getProviderDescription(name: string): string {
  const descriptions: Record<string, string> = {
    claude: 'Anthropic Claude Code CLI - Full-featured with cost tracking',
    codex: 'OpenAI Codex CLI - Structured output support',
    cursor: 'Cursor CLI - Fast composer model with IDE integration',
    gemini: 'Google Gemini CLI - Free tier with sandbox mode',
    opencode: 'OpenCode CLI - Multi-provider support with 75+ models',
  };
  
  return descriptions[name] || `${name} provider`;
}

// Export types
export type { AIProvider, BaseProviderConfig, ProviderInfo } from './types';
export { ProviderError } from './types';

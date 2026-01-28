/**
 * Opencode CLI provider adapter for Ralph
 * 
 * Implements the AIProvider interface for Opencode CLI.
 * Status: STUB - Implementation pending
 */

import type {
  AIProvider,
  ChatOptions,
  HeadlessOptions,
  HeadlessResult,
  LightweightOptions,
  OpencodeProviderConfig,
  ProviderResult,
} from "./types";

import { registerProvider } from "./index";

/**
 * Opencode provider implementation
 * Status: STUB - Full implementation pending
 */
class OpencodeProvider implements AIProvider {
  readonly command = "opencode";
  readonly name = "opencode";
  
  private config: OpencodeProviderConfig;
  
  constructor(config: OpencodeProviderConfig = {}) {
    this.config = config;
  }
  
  getContextFileNames(): Array<string> {
    return ["AGENTS.md"];
  }
  
  getDefaultModel(): string {
    return this.config.model ?? "anthropic/claude-3-5-sonnet-latest";
  }
  
  invokeChat(options: ChatOptions): ProviderResult {
    // TODO: Implement opencode chat mode
    console.warn("Opencode chat mode not yet implemented");
    return {
      exitCode: 1,
      interrupted: false,
      success: false,
    };
  }
  
  invokeHeadless(options: HeadlessOptions): HeadlessResult | null {
    // TODO: Implement opencode headless mode
    // Command: opencode run "prompt" --format json [--model ...]
    console.warn("Opencode headless mode not yet implemented");
    return null;
  }
  
  invokeLightweight(options: LightweightOptions): null | string {
    // TODO: Implement lightweight mode
    console.warn("Opencode lightweight mode not yet implemented");
    return null;
  }
  
  isAvailable(): boolean {
    try {
      const proc = Bun.spawnSync(["which", this.command]);
      return proc.exitCode === 0;
    } catch {
      return false;
    }
  }
  
  isValidModel(_model: string): boolean {
    // Opencode supports 75+ providers, any model string is potentially valid
    return true;
  }
}

export function createOpencodeProvider(config?: OpencodeProviderConfig): OpencodeProvider {
  return new OpencodeProvider(config);
}

export function register(): void {
  registerProvider("opencode", (config) => createOpencodeProvider(config as OpencodeProviderConfig));
}

// Auto-register
register();

export default OpencodeProvider;

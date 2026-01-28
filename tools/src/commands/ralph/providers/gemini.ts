/**
 * Gemini CLI provider adapter for Ralph
 * 
 * Implements the AIProvider interface for Google Gemini CLI.
 * Status: STUB - Implementation pending
 */

import type {
  AIProvider,
  ChatOptions,
  GeminiProviderConfig,
  HeadlessOptions,
  HeadlessResult,
  LightweightOptions,
  ProviderResult,
} from "./types";

import { registerProvider } from "./index";

/**
 * Gemini provider implementation
 * Status: STUB - Full implementation pending
 * 
 * Note: Gemini uses binary session storage (not human-readable)
 * and does not provide cost tracking in output.
 */
class GeminiProvider implements AIProvider {
  readonly command = "gemini";
  readonly name = "gemini";
  
  private config: GeminiProviderConfig;
  
  constructor(config: GeminiProviderConfig = {}) {
    this.config = config;
  }
  
  getContextFileNames(): Array<string> {
    // Gemini does not support GEMINI.md context files
    return ["AGENTS.md"];
  }
  
  getDefaultModel(): string {
    return this.config.model ?? "gemini-2.5-flash-lite";
  }
  
  invokeChat(options: ChatOptions): ProviderResult {
    // TODO: Implement gemini chat mode
    console.warn("Gemini chat mode not yet implemented");
    return {
      exitCode: 1,
      interrupted: false,
      success: false,
    };
  }
  
  invokeHeadless(options: HeadlessOptions): HeadlessResult | null {
    // TODO: Implement gemini headless mode
    // Command: gemini -p "prompt" --output-format json [--sandbox]
    // Note: No cost tracking in output, rate limit: 60 req/min (free tier)
    console.warn("Gemini headless mode not yet implemented");
    return null;
  }
  
  invokeLightweight(options: LightweightOptions): null | string {
    // TODO: Implement lightweight mode
    console.warn("Gemini lightweight mode not yet implemented");
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
    return true;
  }
}

export function createGeminiProvider(config?: GeminiProviderConfig): GeminiProvider {
  return new GeminiProvider(config);
}

export function register(): void {
  registerProvider("gemini", (config) => createGeminiProvider(config as GeminiProviderConfig));
}

// Auto-register
register();

export default GeminiProvider;

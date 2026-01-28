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
 * Create Gemini provider instance
 * Status: STUB - Full implementation pending
 *
 * Note: Gemini uses binary session storage (not human-readable)
 * and does not provide cost tracking in output.
 */
function createGeminiProvider(config: GeminiProviderConfig = {}): AIProvider {
  const command = "gemini";
  const name = "gemini";

  return {
    command,

    getContextFileNames(): Array<string> {
      // Gemini does not support GEMINI.md context files
      return ["AGENTS.md"];
    },

    getDefaultModel(): string {
      return config.model ?? "gemini-2.5-flash-lite";
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invokeChat(_options: ChatOptions): ProviderResult {
      // TODO: Implement gemini chat mode
      console.warn("Gemini chat mode not yet implemented");
      return { exitCode: 1, interrupted: false, success: false };
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invokeHeadless(_options: HeadlessOptions): HeadlessResult | null {
      // TODO: Implement gemini headless mode
      // Command: gemini -p "prompt" --output-format json [--sandbox]
      // Note: No cost tracking in output, rate limit: 60 req/min (free tier)
      console.warn("Gemini headless mode not yet implemented");
      return null;
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invokeLightweight(_options: LightweightOptions): null | string {
      // TODO: Implement lightweight mode
      console.warn("Gemini lightweight mode not yet implemented");
      return null;
    },

    isAvailable(): boolean {
      try {
        const proc = Bun.spawnSync(["which", command]);
        return proc.exitCode === 0;
      } catch {
        return false;
      }
    },

    isValidModel(): boolean {
      return true;
    },

    name,
  };
}

function register(): void {
  registerProvider("gemini", (config) =>
    createGeminiProvider(config as GeminiProviderConfig),
  );
}

// Auto-register
register();

export { createGeminiProvider, register };

export default createGeminiProvider;

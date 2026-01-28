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
 * Create Opencode provider instance
 * Status: STUB - Full implementation pending
 */
function createOpencodeProvider(
  config: OpencodeProviderConfig = {},
): AIProvider {
  const command = "opencode";
  const name = "opencode";

  return {
    command,

    getContextFileNames(): Array<string> {
      return ["AGENTS.md"];
    },

    getDefaultModel(): string {
      return config.model ?? "anthropic/claude-3-5-sonnet-latest";
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invokeChat(_options: ChatOptions): ProviderResult {
      // TODO: Implement opencode chat mode
      console.warn("Opencode chat mode not yet implemented");
      return { exitCode: 1, interrupted: false, success: false };
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invokeHeadless(_options: HeadlessOptions): HeadlessResult | null {
      // TODO: Implement opencode headless mode
      // Command: opencode run "prompt" --format json [--model ...]
      console.warn("Opencode headless mode not yet implemented");
      return null;
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invokeLightweight(_options: LightweightOptions): null | string {
      // TODO: Implement lightweight mode
      console.warn("Opencode lightweight mode not yet implemented");
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
      // Opencode supports 75+ providers, any model string is potentially valid
      return true;
    },

    name,
  };
}

function register(): void {
  registerProvider("opencode", (config) =>
    createOpencodeProvider(config as OpencodeProviderConfig),
  );
}

// Auto-register
register();

export { createOpencodeProvider, register };

export default createOpencodeProvider;

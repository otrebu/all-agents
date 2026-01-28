/**
 * Cursor CLI provider adapter for Ralph
 *
 * Implements the AIProvider interface for Cursor CLI.
 * Status: STUB - Implementation pending
 */

import type {
  AIProvider,
  ChatOptions,
  CursorProviderConfig,
  HeadlessOptions,
  HeadlessResult,
  LightweightOptions,
  ProviderResult,
} from "./types";

import { registerProvider } from "./index";

/**
 * Create Cursor provider instance
 * Status: STUB - Full implementation pending
 */
function createCursorProvider(config: CursorProviderConfig = {}): AIProvider {
  const command = "agent";
  const name = "cursor";

  return {
    command,

    getContextFileNames(): Array<string> {
      return [".cursor/rules/", "AGENTS.md", "CLAUDE.md"];
    },

    getDefaultModel(): string {
      return config.model ?? "composer-1";
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invokeChat(_options: ChatOptions): ProviderResult {
      // TODO: Implement cursor chat mode
      console.warn("Cursor chat mode not yet implemented");
      return { exitCode: 1, interrupted: false, success: false };
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invokeHeadless(_options: HeadlessOptions): HeadlessResult | null {
      // TODO: Implement cursor headless mode
      // Command: agent -p [--force] --output-format json [--model ...]
      // Note: --force flag required for file modifications (security concern)
      console.warn("Cursor headless mode not yet implemented");
      return null;
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    invokeLightweight(_options: LightweightOptions): null | string {
      // TODO: Implement lightweight mode
      console.warn("Cursor lightweight mode not yet implemented");
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
      // Cursor supports multiple models, validation happens at runtime
      return true;
    },

    name,
  };
}

function register(): void {
  registerProvider("cursor", (config) =>
    createCursorProvider(config as CursorProviderConfig),
  );
}

// Auto-register
register();

export { createCursorProvider, register };

export default createCursorProvider;

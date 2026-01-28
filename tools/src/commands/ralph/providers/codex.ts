/**
 * Codex CLI provider adapter for Ralph
 *
 * Implements the AIProvider interface for OpenAI Codex CLI.
 * Status: STUB - Implementation pending
 */

import type {
  AIProvider,
  ChatOptions,
  CodexProviderConfig,
  HeadlessOptions,
  HeadlessResult,
  LightweightOptions,
  ProviderResult,
} from "./types";

import { registerProvider } from "./index";

/**
 * Codex provider implementation
 * Status: STUB - Full implementation pending
 *
 * Note: Codex does not provide cost tracking in output.
 * Supports structured output with --output-schema.
 */
class CodexProvider implements AIProvider {
  readonly command = "codex";
  readonly name = "codex";

  private config: CodexProviderConfig;

  constructor(config: CodexProviderConfig = {}) {
    this.config = config;
  }

  getContextFileNames(): Array<string> {
    return ["CODEX.md", "AGENTS.md"];
  }

  getDefaultModel(): string {
    return this.config.model ?? "gpt-5.2-codex";
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  invokeChat(_options: ChatOptions): ProviderResult {
    // TODO: Implement codex chat mode
    console.warn("Codex chat mode not yet implemented");
    return { exitCode: 1, interrupted: false, success: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  invokeHeadless(_options: HeadlessOptions): HeadlessResult | null {
    // TODO: Implement codex headless mode
    // Command: codex exec "prompt" --json [--model ...] [--output-schema ...]
    // Note: No cost tracking, JSON Lines output format
    console.warn("Codex headless mode not yet implemented");
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  invokeLightweight(_options: LightweightOptions): null | string {
    // TODO: Implement lightweight mode
    console.warn("Codex lightweight mode not yet implemented");
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

  isValidModel(): boolean {
    return true;
  }
}

function createCodexProvider(config?: CodexProviderConfig): CodexProvider {
  return new CodexProvider(config);
}

function registerCodex(): void {
  registerProvider("codex", (config) =>
    createCodexProvider(config as CodexProviderConfig),
  );
}

// Auto-register
registerCodex();

export { createCodexProvider, registerCodex as register };

export default CodexProvider;

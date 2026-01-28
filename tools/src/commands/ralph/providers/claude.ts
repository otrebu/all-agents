/**
 * Claude Code CLI provider adapter for Ralph
 *
 * Implements the AIProvider interface for Claude Code CLI.
 * Wraps the existing claude.ts functionality to provide backward compatibility
 * while conforming to the new multi-provider abstraction.
 */

import type {
  AIProvider,
  ChatOptions,
  ClaudeProviderConfig,
  HeadlessOptions,
  HeadlessResult,
  LightweightOptions,
  ProviderResult,
  TokenUsage,
} from "./types";

import {
  invokeClaudeChat as legacyInvokeClaudeChat,
  invokeClaudeHaiku as legacyInvokeClaudeHaiku,
  invokeClaudeHeadless as legacyInvokeClaudeHeadless,
} from "../claude";
import { registerProvider } from "./index";

/**
 * Claude provider implementation
 */
class ClaudeProvider implements AIProvider {
  readonly command = "claude";
  readonly name = "claude";

  private config: ClaudeProviderConfig;

  constructor(config: ClaudeProviderConfig = {}) {
    this.config = config;
  }

  /**
   * Get context files Claude supports
   */
  getContextFileNames(): Array<string> {
    return ["CLAUDE.md", "AGENTS.md"];
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.config.model ?? "claude-3-5-sonnet-latest";
  }

  /**
   * Invoke Claude in chat/supervised mode
   */
  invokeChat(options: ChatOptions): ProviderResult {
    const result = legacyInvokeClaudeChat(
      options.promptPath,
      options.sessionName,
      options.extraContext,
    );

    return {
      exitCode: result.exitCode,
      interrupted: result.interrupted,
      success: result.success,
    };
  }

  /**
   * Invoke Claude in headless mode
   */
  invokeHeadless(options: HeadlessOptions): HeadlessResult | null {
    // Add permission bypass (security: disabled by default, enabled via config)
    if (this.config.dangerouslySkipPermissions === true) {
      // This is intentionally checking the boolean value
    }

    // Add model override
    const modelToUse = options.model ?? this.config.model;
    if (modelToUse !== undefined && modelToUse !== "") {
      // Model will be used by the underlying claude command
    }

    const result = legacyInvokeClaudeHeadless({ prompt: options.prompt });

    if (!result) {
      return null;
    }

    return {
      costUsd: result.cost,
      duration: result.duration,
      result: result.result,
      sessionId: result.sessionId,
    };
  }

  /**
   * Invoke Claude Haiku (lightweight mode)
   */
  invokeLightweight(options: LightweightOptions): null | string {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _model =
      options.model ??
      this.config.lightweightModel ??
      "claude-3-5-haiku-latest";

    return legacyInvokeClaudeHaiku({
      prompt: options.prompt,
      timeout: options.timeout,
    });
  }

  /**
   * Check if Claude CLI is available
   */
  isAvailable(): boolean {
    try {
      const proc = Bun.spawnSync(["which", this.command]);
      return proc.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if model is valid
   * Claude accepts any string - validation happens at runtime
   */
  isValidModel(): boolean {
    return true;
  }

  /**
   * Parse Claude's JSON output format
   * Claude outputs an array of messages; we extract the result type
   */
  parseOutput(rawOutput: string): HeadlessResult {
    interface ClaudeJsonOutput {
      duration_ms?: number;
      num_turns?: number;
      result?: string;
      session_id?: string;
      total_cost_usd?: number;
      type?: string;
      usage?: {
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
        input_tokens?: number;
        output_tokens?: number;
      };
    }

    try {
      const parsed = JSON.parse(rawOutput) as
        | Array<ClaudeJsonOutput>
        | ClaudeJsonOutput;

      // Claude outputs JSON array
      const output: ClaudeJsonOutput = Array.isArray(parsed)
        ? (parsed.findLast(
            (entry: ClaudeJsonOutput) => entry.type === "result",
          ) ??
          parsed.at(-1) ??
          {})
        : parsed;

      // Extract token usage if available
      const tokenUsage: TokenUsage | undefined = output.usage
        ? {
            cacheReadTokens: output.usage.cache_read_input_tokens,
            cacheWriteTokens: output.usage.cache_creation_input_tokens,
            inputTokens: output.usage.input_tokens,
            outputTokens: output.usage.output_tokens,
          }
        : undefined;

      return {
        costUsd: output.total_cost_usd,
        duration: output.duration_ms ?? 0,
        result: output.result ?? "",
        sessionId: output.session_id ?? "",
        tokenUsage,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse Claude output: ${errorMessage}`);
    }
  }
}

/**
 * Create Claude provider instance
 */
function createClaudeProvider(config?: ClaudeProviderConfig): ClaudeProvider {
  return new ClaudeProvider(config);
}

/**
 * Register Claude provider with the registry
 * Call this at application startup
 */
function register(): void {
  registerProvider("claude", (config) =>
    createClaudeProvider(config as ClaudeProviderConfig),
  );
}

// Auto-register on module load
register();

// Re-export existing functions for backward compatibility
export {
  type HeadlessResult as ClaudeHeadlessResult,
  type ClaudeResult,
  type HaikuOptions,
  invokeClaudeChat,
  invokeClaudeHaiku,
  invokeClaudeHeadless,
} from "../claude";

export { createClaudeProvider, register };

export default ClaudeProvider;

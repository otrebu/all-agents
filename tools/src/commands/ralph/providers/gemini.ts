/**
 * Gemini CLI provider adapter for Ralph
 *
 * Implements the AIProvider interface for Google Gemini CLI.
 */

import type {
  AIProvider,
  ChatOptions,
  GeminiProviderConfig,
  HeadlessOptions,
  HeadlessResult,
  LightweightOptions,
  ProviderResult,
  TokenUsage,
} from "./types";

import { registerProvider } from "./index";

interface GeminiModelStats {
  tokens?: {
    cached?: number;
    candidates?: number;
    input?: number;
    thoughts?: number;
    total?: number;
  };
}

interface GeminiStats {
  models?: Record<string, GeminiModelStats>;
}

/**
 * Create Gemini provider instance
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

    /**
     * Invoke Gemini in interactive chat mode
     * Uses headless mode for now as primary interface
     */
    invokeChat(options: ChatOptions): ProviderResult {
      // For chat mode, we spawn the gemini command interactively
      // Gemini uses -i flag for interactive mode after prompt
      const args = ["-p", `@${options.promptPath}`, "-i"];

      if (options.model !== undefined && options.model !== "") {
        args.push("-m", options.model);
      }

      try {
        // 5 min default timeout
        const timeout = config.timeout ?? 300_000;
        const proc = Bun.spawnSync({
          cmd: [command, ...args],
          cwd: options.cwd,
          timeout,
        });

        const { exitCode, signalCode } = proc;
        const isInterrupted = signalCode === "SIGINT";

        return {
          exitCode,
          interrupted: isInterrupted,
          sessionId: undefined,
          success: exitCode === 0 && !isInterrupted,
        };
      } catch {
        return {
          exitCode: 1,
          interrupted: false,
          success: false,
        };
      }
    },

    /**
     * Invoke Gemini in headless mode
     * Command: gemini -p "prompt" --output-format json [--sandbox]
     */
    invokeHeadless(options: HeadlessOptions): HeadlessResult | null {
      const args = [
        "-p",
        options.prompt,
        "--output-format",
        "json",
      ];

      // Add sandbox mode if enabled in config or options
      if (config.sandbox === true) {
        args.push("--sandbox");
      }

      // Add model override if specified
      const modelToUse = options.model ?? config.model;
      if (modelToUse !== undefined && modelToUse !== "") {
        args.push("-m", modelToUse);
      }

      // Add extra flags if provided
      if (options.extraFlags) {
        args.push(...options.extraFlags);
      }

      // 2 min default timeout
      const timeout = config.timeout ?? 120_000;

      try {
        const startTime = Date.now();
        const proc = Bun.spawnSync({
          cmd: [command, ...args],
          cwd: options.cwd,
          timeout,
        });
        const duration = Date.now() - startTime;

        if (proc.exitCode !== 0) {
          const stderr = new TextDecoder().decode(proc.stderr);
          console.error(`Gemini headless failed: ${stderr}`);
          return null;
        }

        const stdout = new TextDecoder().decode(proc.stdout);
        return parseGeminiOutput(stdout, duration);
      } catch (error) {
        console.error(
          "Gemini headless execution failed:",
          error instanceof Error ? error.message : String(error),
        );
        return null;
      }
    },

    /**
     * Invoke Gemini with lightweight model for summaries
     * Default: gemini-2.5-flash-lite
     */
    invokeLightweight(options: LightweightOptions): null | string {
      const lightweightModel =
        options.model ?? config.model ?? "gemini-2.5-flash-lite";

      const result = this.invokeHeadless({
        model: lightweightModel,
        prompt: options.prompt,
      });

      return result?.result ?? null;
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

/**
 * Extract token usage from Gemini stats
 */
function extractTokenUsage(stats: GeminiStats | undefined): TokenUsage | undefined {
  if (stats?.models) {
    const modelNames = Object.keys(stats.models);
    const firstModelName = modelNames[0];
    if (firstModelName !== undefined) {
      const firstModel = stats.models[firstModelName];
      if (firstModel?.tokens) {
        return {
          cacheReadTokens: firstModel.tokens.cached,
          inputTokens: firstModel.tokens.input,
          outputTokens: firstModel.tokens.candidates,
          reasoningTokens: firstModel.tokens.thoughts,
        };
      }
    }
  }
  return undefined;
}

/**
 * Parse Gemini JSON output into HeadlessResult
 */
function parseGeminiOutput(stdout: string, duration: number): HeadlessResult | null {
  interface GeminiJsonOutput {
    response?: string;
    session_id?: string;
    stats?: GeminiStats;
  }

  try {
    // Clean up potential markdown code block wrappers
    const cleanOutput = stdout
      .replace(/^```json\s*/, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const parsed = JSON.parse(cleanOutput) as GeminiJsonOutput;

    // Extract session ID and response
    const sessionId = parsed.session_id ?? "";
    const result = parsed.response ?? "";

    // Extract token usage from stats.models
    const tokenUsage = extractTokenUsage(parsed.stats);

    return {
      duration,
      result,
      sessionId,
      tokenUsage,
      // Note: Gemini does not provide cost tracking
    };
  } catch (error) {
    console.error(
      "Failed to parse Gemini output:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
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

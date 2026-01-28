/**
 * Cursor CLI provider adapter for Ralph
 *
 * Implements the AIProvider interface for Cursor CLI.
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

    invokeChat(options: ChatOptions): ProviderResult {
      const args = [command];

      // Cursor accepts prompt via file path or stdin
      args.push("--prompt", options.promptPath);

      if (options.cwd !== undefined && options.cwd !== "") {
        args.push("--cwd", options.cwd);
      }

      const timeout = config.timeout ?? 0;
      const spawnOptions: {
        stdio: ["inherit", "inherit", "inherit"];
        timeout?: number;
      } = {
        stdio: ["inherit", "inherit", "inherit"],
      };

      if (timeout > 0) {
        spawnOptions.timeout = timeout;
      }

      const { exitCode, signalCode } = Bun.spawnSync(args, spawnOptions);
      const isInterrupted = signalCode === "SIGINT" || signalCode === "SIGTERM";

      return {
        exitCode,
        interrupted: isInterrupted,
        success: exitCode === 0,
      };
    },

    invokeHeadless(options: HeadlessOptions): HeadlessResult | null {
      const args = [command, "-p", "--output-format", "json"];

      // Add --force only if explicitly enabled (security: disabled by default)
      if (config.dangerouslyAllowForceWrites === true) {
        args.push("--force");
      }

      // Add model if specified
      const modelToUse = options.model ?? config.model;
      if (modelToUse !== undefined && modelToUse !== "") {
        args.push("--model", modelToUse);
      }

      // Add extra flags if provided
      if (options.extraFlags !== undefined && options.extraFlags.length > 0) {
        args.push(...options.extraFlags);
      }

      // Add the prompt as the last argument
      args.push(options.prompt);

      const timeout = config.timeout ?? 0;
      const spawnOptions: {
        cwd?: string;
        stdio: [null, "pipe", "pipe"];
        timeout?: number;
      } = {
        stdio: [null, "pipe", "pipe"],
      };

      if (options.cwd !== undefined && options.cwd !== "") {
        spawnOptions.cwd = options.cwd;
      }

      if (timeout > 0) {
        spawnOptions.timeout = timeout;
      }

      try {
        const result = Bun.spawnSync(args, spawnOptions);

        if (result.exitCode !== 0) {
          const stderr = result.stderr.toString();
          console.error(`Cursor headless failed with exit code ${result.exitCode}: ${stderr}`);
          return null;
        }

        const output = result.stdout.toString().trim();
        if (output.length === 0) {
          console.error("Cursor headless returned empty output");
          return null;
        }

        // Parse Cursor JSON output (single JSON object, not array)
        interface CursorJsonOutput {
          duration_ms?: number;
          is_error?: boolean;
          result?: string;
          session_id?: string;
          type?: string;
        }

        try {
          const parsed = JSON.parse(output) as CursorJsonOutput;

          return {
            duration: parsed.duration_ms ?? 0,
            rawOutput: output,
            result: parsed.result ?? "",
            sessionId: parsed.session_id ?? "",
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Failed to parse Cursor output: ${errorMessage}`);
          return null;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Cursor headless execution failed: ${errorMessage}`);
        return null;
      }
    },

    invokeLightweight(options: LightweightOptions): null | string {
      // Use lightweight model (composer-1 is the default lightweight model for Cursor)
      const lightweightModel = options.model ?? config.model ?? "composer-1";

      const result = this.invokeHeadless({
        cwd: undefined,
        extraFlags: undefined,
        model: lightweightModel,
        prompt: options.prompt,
      });

      if (result === null) {
        return null;
      }

      return result.result;
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

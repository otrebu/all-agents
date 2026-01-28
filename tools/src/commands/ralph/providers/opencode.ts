/**
 * Opencode CLI provider adapter for Ralph
 *
 * Implements the AIProvider interface for Opencode CLI.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import type {
  AIProvider,
  ChatOptions,
  HeadlessOptions,
  HeadlessResult,
  LightweightOptions,
  OpencodeProviderConfig,
  ProviderResult,
  TokenUsage,
} from "./types";

import { registerProvider } from "./index";

interface MessagePartUpdatedEvent extends OpencodeEvent {
  properties?: {
    part?: {
      text?: string;
    };
  };
  type: "message.part.updated";
}

interface MessageUpdatedEvent extends OpencodeEvent {
  properties?: {
    info?: {
      cost?: number;
      time?: {
        completed?: string;
        created?: string;
      };
      tokens?: {
        input?: number;
        output?: number;
      };
    };
  };
  type: "message.updated";
}

/**
 * Opencode NDJSON event types
 */
interface OpencodeEvent {
  id?: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
  type: string;
}

interface SessionCreatedEvent extends OpencodeEvent {
  id: string;
  type: "session.created";
}

/**
 * Create Opencode provider instance
 */
function createOpencodeProvider(
  config: OpencodeProviderConfig = {},
): AIProvider {
  const command = "opencode";
  const name = "opencode";
  const defaultModel = config.model ?? "anthropic/claude-3-5-sonnet-latest";
  const lightweightModel =
    config.lightweightModel ?? "anthropic/claude-3-5-haiku-latest";

  return {
    command,

    getContextFileNames(): Array<string> {
      return ["AGENTS.md"];
    },

    getDefaultModel(): string {
      return defaultModel;
    },

    invokeChat(options: ChatOptions): ProviderResult {
      if (!existsSync(options.promptPath)) {
        console.error(`Prompt not found: ${options.promptPath}`);
        return { exitCode: 1, interrupted: false, success: false };
      }

      const promptContent = readFileSync(options.promptPath, "utf8");

      console.log(
        `Starting ${options.sessionName} session with Opencode (supervised mode)...`,
      );
      console.log(`Prompt: ${options.promptPath}`);
      if (options.extraContext) {
        console.log(`Context: ${options.extraContext}`);
      }
      console.log();

      const fullPrompt = options.extraContext
        ? `${options.extraContext}\n\n${promptContent}`
        : promptContent;

      // Build args with model if specified
      const spawnArguments = ["run"];
      
      // Add model if specified
      const modelToUse = options.model ?? defaultModel;
      if (modelToUse) {
        spawnArguments.push("--model", modelToUse);
      }

      // Use spawnSync with stdin input to keep session interactive
      // Passing prompt via stdin allows opencode to stay in interactive mode
      // vs passing as argument which processes it as one-shot
      const proc = spawnSync(command, spawnArguments, {
        cwd: options.cwd,
        input: fullPrompt,
        stdio: ["pipe", "inherit", "inherit"],
      });

      // Handle signal interruption (Ctrl+C) gracefully
      if (proc.signal === "SIGINT" || proc.signal === "SIGTERM") {
        console.log("\nSession interrupted by user");
        return { exitCode: null, interrupted: true, success: true };
      }

      return {
        exitCode: proc.status,
        interrupted: false,
        success: proc.status === 0,
      };
    },

    invokeHeadless(options: HeadlessOptions): HeadlessResult | null {
      const args = [command, "run", options.prompt, "--format", "json"];

      // Add model if specified
      const modelToUse = options.model ?? defaultModel;
      if (modelToUse) {
        args.push("--model", modelToUse);
      }

      // Add extra flags if provided
      if (options.extraFlags) {
        args.push(...options.extraFlags);
      }

      const proc = Bun.spawnSync(args, {
        cwd: options.cwd,
        stdio: ["ignore", "pipe", "inherit"],
      });

      // Handle signal interruption (Ctrl+C)
      if (proc.signalCode === "SIGINT" || proc.signalCode === "SIGTERM") {
        console.log("\nSession interrupted by user");
        return null;
      }

      if (proc.exitCode !== 0) {
        console.error(`Opencode exited with code ${proc.exitCode}`);
        return null;
      }

      const stdout = proc.stdout.toString("utf8");
      return parseOpencodeOutput(stdout);
    },

    invokeLightweight(options: LightweightOptions): null | string {
      const modelToUse = options.model ?? lightweightModel;
      const timeout = options.timeout ?? 60_000;

      const headlessOptions: HeadlessOptions = {
        extraFlags: ["--timeout", timeout.toString()],
        model: modelToUse,
        prompt: options.prompt,
      };

      const result = this.invokeHeadless(headlessOptions);
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
      // Opencode supports 75+ providers, any model string is potentially valid
      return true;
    },

    name,
  };
}

/**
 * Parse Opencode NDJSON output
 * Returns accumulated result text and metadata
 */
function parseOpencodeOutput(stdout: string): HeadlessResult | null {
  const lines = stdout.trim().split("\n");
  let sessionId = "";
  let resultText = "";
  let costUsd: number | undefined;
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let startTime: string | undefined;
  let endTime: string | undefined;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    try {
      const event = JSON.parse(trimmedLine) as OpencodeEvent;

      switch (event.type) {
        case "message.part.updated": {
          const partEvent = event as MessagePartUpdatedEvent;
          if (partEvent.properties?.part?.text) {
            resultText += partEvent.properties.part.text;
          }
          break;
        }
        case "message.updated": {
          const messageEvent = event as MessageUpdatedEvent;
          if (messageEvent.properties?.info?.cost !== undefined) {
            costUsd = messageEvent.properties.info.cost;
          }
          if (messageEvent.properties?.info?.tokens?.input !== undefined) {
            inputTokens = messageEvent.properties.info.tokens.input;
          }
          if (messageEvent.properties?.info?.tokens?.output !== undefined) {
            outputTokens = messageEvent.properties.info.tokens.output;
          }
          if (messageEvent.properties?.info?.time?.created) {
            startTime = messageEvent.properties.info.time.created;
          }
          if (messageEvent.properties?.info?.time?.completed) {
            endTime = messageEvent.properties.info.time.completed;
          }
          break;
        }
        case "session.created": {
          const sessionEvent = event as SessionCreatedEvent;
          sessionId = sessionEvent.id ?? "";
          break;
        }
      }
    } catch {
      // Skip malformed JSON lines
      continue;
    }
  }

  if (!sessionId) {
    return null;
  }

  // Calculate duration
  let duration = 0;
  if (startTime && endTime) {
    duration =
      new Date(endTime).getTime() - new Date(startTime).getTime();
  }

  // Build token usage if available
  const tokenUsage: TokenUsage | undefined =
    inputTokens !== undefined || outputTokens !== undefined
      ? { inputTokens, outputTokens }
      : undefined;

  return {
    costUsd,
    duration,
    rawOutput: stdout,
    result: resultText,
    sessionId,
    tokenUsage,
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

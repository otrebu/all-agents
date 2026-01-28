/**
 * Codex CLI provider adapter for Ralph
 *
 * Implements the AIProvider interface for OpenAI Codex CLI.
 */

import { existsSync, readFileSync } from "node:fs";

import type {
  AIProvider,
  ChatOptions,
  CodexProviderConfig,
  HeadlessOptions,
  HeadlessResult,
  LightweightOptions,
  ProviderResult,
  TokenUsage,
} from "./types";

import { registerProvider } from "./index";

/**
 * Codex JSONL event types
 */
interface CodexJsonEvent {
  error?: {
    message?: string;
  };
  item?: {
    change_type?: string;
    file_path?: string;
    text?: string;
    type?: string;
  };
  message?: string;
  thread_id?: string;
  type: string;
  usage?: {
    cached_input_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Result of parsing Codex JSONL output
 */
interface ParsedCodexOutput {
  cachedInputTokens: number;
  filesChanged: Array<string>;
  inputTokens: number;
  outputTokens: number;
  result: string;
  sessionId: string;
}

/**
 * Create Codex provider instance
 *
 * Note: Codex does not provide cost tracking in output.
 * Supports structured output with --output-schema.
 */
function createCodexProvider(config: CodexProviderConfig = {}): AIProvider {
  const command = "codex";
  const name = "codex";

  const parseCodexOutput = (lines: Array<string>): ParsedCodexOutput => {
    let sessionId = "";
    let result = "";
    let filesChanged: Array<string> = [];
    let inputTokens = 0;
    let cachedInputTokens = 0;
    let outputTokens = 0;

    for (const line of lines) {
      try {
        const event = JSON.parse(line) as CodexJsonEvent;

        switch (event.type) {
          case "error": {
            console.error(
              "Codex error:",
              event.message ?? "Unknown error",
            );
            // Don't fail immediately - reconnection events are okay
            if (!isReconnectionEvent(event)) {
              return createEmptyResult();
            }
            break;
          }
          case "item.completed": {
            const itemResult = handleItemCompleted(
              event,
              result,
              filesChanged,
            );
            result = itemResult.result;
            filesChanged = itemResult.filesChanged;
            break;
          }
          case "thread.started": {
            sessionId = handleThreadStarted(event);
            break;
          }
          case "turn.completed": {
            const usage = handleTurnCompleted(event);
            inputTokens = usage.inputTokens;
            cachedInputTokens = usage.cachedInputTokens;
            outputTokens = usage.outputTokens;
            break;
          }
          case "turn.failed": {
            console.error(
              "Codex turn failed:",
              event.error?.message ?? "Unknown error",
            );
            return createEmptyResult();
          }
          default: {
            // Ignore unknown event types
            break;
          }
        }
      } catch {
        // Skip lines that aren't valid JSON
        console.warn(
          "Failed to parse Codex JSONL line:",
          line.slice(0, 100),
        );
      }
    }

    return {
      cachedInputTokens,
      filesChanged,
      inputTokens,
      outputTokens,
      result,
      sessionId,
    };
  };

  return {
    command,

    getContextFileNames(): Array<string> {
      return ["CODEX.md", "AGENTS.md"];
    },

    getDefaultModel(): string {
      return config.model ?? "gpt-5.2-codex";
    },

    invokeChat(options: ChatOptions): ProviderResult {
      if (!existsSync(options.promptPath)) {
        console.error(`Prompt not found: ${options.promptPath}`);
        return { exitCode: 1, interrupted: false, success: false };
      }

      const promptContent = readFileSync(options.promptPath, "utf8");

      console.log(
        `Starting ${options.sessionName} session with Codex (interactive mode)...`,
      );
      console.log(`Prompt: ${options.promptPath}`);
      const hasExtraContext =
        options.extraContext !== undefined && options.extraContext !== "";
      if (hasExtraContext) {
        console.log(`Context: ${options.extraContext}`);
      }
      console.log();

      const fullPrompt = hasExtraContext
        ? `${options.extraContext}\n\n${promptContent}`
        : promptContent;

      // Interactive mode: spawn codex with prompt
      // Use -a on-request for approval-based mode
      const proc = Bun.spawnSync(
        ["codex", "-a", "on-request", fullPrompt],
        { stdio: ["inherit", "inherit", "inherit"] },
      );

      // Handle signal interruption (Ctrl+C) gracefully
      if (proc.signalCode === "SIGINT" || proc.signalCode === "SIGTERM") {
        console.log("\nSession interrupted by user");
        return { exitCode: null, interrupted: true, success: true };
      }

      return {
        exitCode: proc.exitCode,
        interrupted: false,
        success: proc.exitCode === 0,
      };
    },

    invokeHeadless(options: HeadlessOptions): HeadlessResult | null {
      const timeout = config.timeout ?? 120_000;
      const model = options.model ?? config.model ?? "gpt-5.2-codex";
      const sandbox = config.sandbox ?? "workspace-write";

      const args = [
        "exec",
        "--json",
        "--model",
        model,
        "--sandbox",
        sandbox,
        ...(options.extraFlags ?? []),
        ...(config.extraFlags ?? []),
        options.prompt,
      ];

      // Start timer for duration
      const startTime = Date.now();

      const proc = Bun.spawnSync(["codex", ...args], {
        stdio: ["ignore", "pipe", "inherit"],
        timeout,
      });

      const duration = Date.now() - startTime;

      // Handle signal interruption (Ctrl+C)
      if (proc.signalCode === "SIGINT" || proc.signalCode === "SIGTERM") {
        console.log("\nCodex session interrupted by user");
        return null;
      }

      // Check for timeout
      if (proc.signalCode === "SIGKILL") {
        console.error("Codex session timed out");
        return null;
      }

      if (proc.exitCode !== 0) {
        console.error(`Codex exited with code ${proc.exitCode}`);
        return null;
      }

      // Parse JSONL output
      const stdout = proc.stdout.toString("utf8");
      const lines = stdout
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);

      const parsedOutput = parseCodexOutput(lines);
      const {
        cachedInputTokens,
        filesChanged,
        inputTokens,
        outputTokens,
        result,
        sessionId,
      } = parsedOutput;

      // If we got empty result from error, return null
      if (sessionId === "" && result === "") {
        return null;
      }

      // Build token usage if we have any token data
      const tokenUsage: TokenUsage | undefined =
        inputTokens > 0 || outputTokens > 0
          ? {
              cacheReadTokens: cachedInputTokens,
              inputTokens,
              outputTokens,
            }
          : undefined;

      return {
        duration,
        filesChanged:
          filesChanged.length > 0 ? filesChanged : undefined,
        rawOutput: stdout,
        result,
        sessionId,
        tokenUsage,
        // No cost tracking in Codex output
      };
    },

    invokeLightweight(options: LightweightOptions): null | string {
      const model = options.model ?? config.model ?? "gpt-5.2-codex";
      const timeout = options.timeout ?? config.timeout ?? 60_000;

      // Lightweight mode uses headless execution with a lightweight model
      const args = [
        "exec",
        "--json",
        "--model",
        model,
        "--sandbox",
        "read-only",
        options.prompt,
      ];

      const proc = Bun.spawnSync(["codex", ...args], {
        stdio: ["ignore", "pipe", "inherit"],
        timeout,
      });

      // Handle signal interruption (Ctrl+C)
      if (proc.signalCode === "SIGINT" || proc.signalCode === "SIGTERM") {
        console.log("\nCodex lightweight session interrupted by user");
        return null;
      }

      if (proc.exitCode !== 0) {
        console.error(
          `Codex lightweight exited with code ${proc.exitCode}`,
        );
        return null;
      }

      // Parse JSONL output and extract the agent_message result
      const stdout = proc.stdout.toString("utf8");
      const lines = stdout
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);

      for (const line of lines) {
        try {
          const event = JSON.parse(line) as CodexJsonEvent;
          if (
            event.type === "item.completed" &&
            event.item?.type === "agent_message" &&
            event.item.text !== undefined &&
            event.item.text !== ""
          ) {
            return event.item.text;
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

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

/**
 * Create empty/failed result
 */
function createEmptyResult(): ParsedCodexOutput {
  return {
    cachedInputTokens: 0,
    filesChanged: [],
    inputTokens: 0,
    outputTokens: 0,
    result: "",
    sessionId: "",
  };
}

/**
 * Handle item.completed event
 */
function handleItemCompleted(
  event: CodexJsonEvent,
  currentResult: string,
  currentFiles: Array<string>,
): { filesChanged: Array<string>; result: string } {
  let result = currentResult;
  const filesChanged = [...currentFiles];

  if (event.item !== undefined) {
    const { file_path: filePath, text, type } = event.item;
    // Extract result from agent_message
    if (type === "agent_message" && text !== undefined && text !== "") {
      result = text;
    }
    // Track file changes
    if (type === "file_change" && filePath !== undefined && filePath !== "") {
      filesChanged.push(filePath);
    }
  }

  return { filesChanged, result };
}

/**
 * Handle thread.started event
 */
function handleThreadStarted(event: CodexJsonEvent): string {
  if (event.thread_id !== undefined && event.thread_id !== "") {
    return event.thread_id;
  }
  return "";
}

/**
 * Handle turn.completed event
 */
function handleTurnCompleted(
  event: CodexJsonEvent,
): { cachedInputTokens: number; inputTokens: number; outputTokens: number } {
  if (event.usage !== undefined) {
    const { cached_input_tokens, input_tokens, output_tokens } = event.usage;
    return {
      cachedInputTokens: cached_input_tokens ?? 0,
      inputTokens: input_tokens ?? 0,
      outputTokens: output_tokens ?? 0,
    };
  }
  return { cachedInputTokens: 0, inputTokens: 0, outputTokens: 0 };
}

/**
 * Check if error is a reconnection event
 */
function isReconnectionEvent(event: CodexJsonEvent): boolean {
  const hasReconnecting = event.message?.includes("Reconnecting") ?? false;
  const hasReconnect = event.message?.includes("reconnect") ?? false;
  return hasReconnecting || hasReconnect;
}

function register(): void {
  registerProvider("codex", (config) =>
    createCodexProvider(config as CodexProviderConfig),
  );
}

// Auto-register
register();

export { createCodexProvider, register };

export default createCodexProvider;

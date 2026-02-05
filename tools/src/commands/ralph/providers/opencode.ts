/**
 * OpenCode provider implementation for Ralph
 *
 * Provides JSONL stream parsing and normalization for OpenCode CLI output.
 *
 * OpenCode JSONL format:
 * ```jsonl
 * {"type":"step_start","timestamp":...,"sessionID":"ses_XXX"}
 * {"type":"text","timestamp":...,"part":{"text":"Hello!"}}
 * {"type":"step_finish","timestamp":...,"part":{"reason":"stop","cost":0.001,"tokens":{...}}}
 * ```
 *
 * @see docs/planning/milestones/004-MULTI-CLI/stories/003-opencode-support.md
 */

import type {
  AgentResult,
  InvocationOptions,
  OpencodeConfig,
  TokenUsage,
} from "./types";

import { executeWithTimeout } from "./utils";

/** Parsed OpenCode JSONL event */
interface OpencodeEvent {
  part?: {
    cost?: number;
    reason?: string;
    text?: string;
    tokens?: {
      cacheRead?: number;
      cacheWrite?: number;
      input?: number;
      output?: number;
      reasoning?: number;
    };
  };
  sessionID?: string;
  timestamp?: number;
  type: string;
}

/**
 * Registry-compatible invoker for the OpenCode provider.
 *
 * Spawns the `opencode` CLI in headless mode with `--output jsonl`,
 * captures the JSONL stdout, and normalizes to AgentResult.
 *
 * Supervised mode is not yet implemented (returns null).
 *
 * @param options - Standard invocation options from the registry
 * @returns Normalized AgentResult, or null on failure
 */
async function invokeOpencode(
  options: InvocationOptions,
): Promise<AgentResult> {
  if (options.mode === "supervised") {
    // Supervised mode: OpenCode interactive session
    // Not yet implemented - would require stdio: inherit like Claude's chat mode
    return { costUsd: 0, durationMs: 0, result: "", sessionId: "" };
  }

  // Headless mode: spawn opencode with prompt on stdin
  const config = options.config as OpencodeConfig;
  const args = ["--output", "jsonl", "--prompt", options.prompt];

  if (config.model !== undefined && config.model !== "") {
    args.push("--model", config.model);
  }

  const result = await executeWithTimeout({
    args,
    command: "opencode",
    cwd: config.workingDirectory,
    stallDetection:
      config.timeoutMs !== undefined && config.timeoutMs > 0
        ? { hardTimeoutMs: config.timeoutMs, stallTimeoutMs: config.timeoutMs }
        : undefined,
  });

  if (result.timedOut) {
    throw new Error(
      `OpenCode timed out after ${result.durationMs}ms (reason: ${result.terminationReason})`,
    );
  }

  if (result.exitCode !== 0) {
    throw new Error(
      `OpenCode exited with code ${result.exitCode}: ${result.stderr === "" ? result.stdout : result.stderr}`,
    );
  }

  return normalizeOpencodeResult(result.stdout);
}

/**
 * Parse OpenCode JSONL output and normalize to AgentResult.
 *
 * Processes the JSONL stream by:
 * 1. Splitting into lines and parsing each as JSON
 * 2. Concatenating text from all `text` events
 * 3. Finding the `step_finish` event with `reason: "stop"`
 * 4. Extracting cost, tokens, sessionId, and duration
 *
 * @param jsonlOutput - Raw JSONL string from OpenCode stdout
 * @returns Normalized AgentResult
 * @throws Error if JSONL is empty, malformed, or missing required events
 */
function normalizeOpencodeResult(jsonlOutput: string): AgentResult {
  const lines = jsonlOutput.split("\n").filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    throw new Error("Empty JSONL output from OpenCode");
  }

  const events: Array<OpencodeEvent> = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line) as OpencodeEvent);
    } catch {
      throw new Error(
        `Malformed JSON line in OpenCode output: ${line.slice(0, 100)}`,
      );
    }
  }

  // Extract text from all text events (concatenated in order)
  const resultText = events
    .filter((event) => event.type === "text")
    .map((event) => event.part?.text ?? "")
    .join("");

  // Find step_finish with reason: "stop"
  const finishEvent = events.find(
    (event) => event.type === "step_finish" && event.part?.reason === "stop",
  );

  if (!finishEvent) {
    throw new Error(
      'No step_finish event with reason "stop" found in OpenCode output',
    );
  }

  // Extract sessionId from step_start event
  const startEvent = events.find((event) => event.type === "step_start");
  const sessionId =
    typeof startEvent?.sessionID === "string" ? startEvent.sessionID : "";

  // Extract cost from step_finish
  const costUsd =
    typeof finishEvent.part?.cost === "number" ? finishEvent.part.cost : 0;

  // Calculate duration from timestamps
  const startTimestamp = startEvent?.timestamp;
  const finishTimestamp = finishEvent.timestamp;
  const durationMs =
    typeof startTimestamp === "number" && typeof finishTimestamp === "number"
      ? finishTimestamp - startTimestamp
      : 0;

  // Extract token usage
  const tokens = finishEvent.part?.tokens;
  const tokenUsage: TokenUsage | undefined = tokens
    ? {
        cacheRead: tokens.cacheRead,
        cacheWrite: tokens.cacheWrite,
        input: tokens.input ?? 0,
        output: tokens.output ?? 0,
        reasoning: tokens.reasoning,
      }
    : undefined;

  return { costUsd, durationMs, result: resultText, sessionId, tokenUsage };
}

export { invokeOpencode, normalizeOpencodeResult, type OpencodeEvent };

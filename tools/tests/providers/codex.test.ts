/**
 * Unit tests for OpenAI Codex provider implementation
 *
 * Tests command argument construction, JSONL parsing, token usage extraction,
 * and result normalization behavior.
 */
/* eslint-disable */

import type { CodexConfig } from "@tools/commands/ralph/providers/types";

import {
  buildCodexHeadlessArguments,
  buildCodexSupervisedArguments,
  discoverCodexModels,
  normalizeCodexResult,
  parseCodexEvents,
} from "@tools/commands/ralph/providers/codex";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

interface SpawnSyncResult {
  exitCode: number;
  stderr: Uint8Array;
  stdout: Uint8Array;
}

function makeSpawnSyncResult(
  exitCode: number,
  stdout: string,
  stderr = "",
): SpawnSyncResult {
  return {
    exitCode,
    stderr: Buffer.from(stderr, "utf8"),
    stdout: Buffer.from(stdout, "utf8"),
  };
}

function mockCodexDiscovery(commandOutputs: Record<string, string>): void {
  Object.assign(Bun, {
    spawnSync: mock((command: Array<string>) => {
      if (command[0] === "which") {
        return commandOutputs.which === undefined
          ? makeSpawnSyncResult(0, "/usr/local/bin/codex\n")
          : makeSpawnSyncResult(0, commandOutputs.which);
      }
      if (command[0] === "codex") {
        const commandText = command.slice(1).join(" ");
        if (Object.hasOwn(commandOutputs, commandText)) {
          return makeSpawnSyncResult(0, commandOutputs[commandText]);
        }
        return makeSpawnSyncResult(0, "");
      }
      return makeSpawnSyncResult(1, "", "unexpected command");
    }),
  });
}

const originalSpawnSync = Bun.spawnSync;
beforeEach(() => {
  Bun.spawnSync = originalSpawnSync;
});
afterEach(() => {
  Bun.spawnSync = originalSpawnSync;
});

describe("buildCodexHeadlessArguments", () => {
  test("includes exec, json, and skip-git-repo-check flags", () => {
    const config: CodexConfig = { provider: "codex" };
    const args = buildCodexHeadlessArguments(config, "hello");

    expect(args[0]).toBe("exec");
    expect(args).toContain("--json");
    expect(args).toContain("--skip-git-repo-check");
  });

  test("passes model to --model when provided", () => {
    const config: CodexConfig = {
      model: "openai/gpt-5.2-codex",
      provider: "codex",
    };
    const args = buildCodexHeadlessArguments(config, "hello");

    const modelIndex = args.indexOf("--model");
    expect(modelIndex).not.toBe(-1);
    expect(args[modelIndex + 1]).toBe("openai/gpt-5.2-codex");
  });

  test("places prompt after double-dash separator", () => {
    const config: CodexConfig = { provider: "codex" };
    const args = buildCodexHeadlessArguments(config, "hello");

    const separatorIndex = args.indexOf("--");
    expect(separatorIndex).not.toBe(-1);
    expect(args.at(separatorIndex + 1)).toBe("hello");
  });
});

describe("buildCodexSupervisedArguments", () => {
  test("includes exec and skip-git-repo-check flags", () => {
    const config: CodexConfig = { provider: "codex" };
    const args = buildCodexSupervisedArguments(config, "hello");

    expect(args[0]).toBe("exec");
    expect(args).toContain("--skip-git-repo-check");
  });

  test("passes model to --model when provided", () => {
    const config: CodexConfig = {
      model: "openai/gpt-5.1-codex-mini",
      provider: "codex",
    };
    const args = buildCodexSupervisedArguments(config, "hello");

    const modelIndex = args.indexOf("--model");
    expect(modelIndex).not.toBe(-1);
    expect(args[modelIndex + 1]).toBe("openai/gpt-5.1-codex-mini");
  });
});

describe("parseCodexEvents", () => {
  test("parses valid JSONL into event objects", () => {
    const jsonl = [
      '{"type":"thread.started","thread_id":"thread_1","timestamp":1700000000000}',
      '{"type":"text","text":"hello"}',
      '{"type":"turn.completed","message":"done","timestamp":1700000000100}',
    ].join("\n");

    const events = parseCodexEvents(jsonl);

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe("thread.started");
    expect(events[1]).toHaveProperty("text", "hello");
    expect(events[2]).toHaveProperty("type", "turn.completed");
  });

  test("throws with malformed JSON input", () => {
    const jsonl = '{"type":"thread.started"}\nnot json';

    expect(() => parseCodexEvents(jsonl)).toThrow(
      "Malformed JSON line in Codex output",
    );
  });
});

describe("normalizeCodexResult", () => {
  test("extracts result text and session id from event stream", () => {
    const jsonl = [
      '{"type":"thread.started","thread_id":"thread_abc","timestamp":1000}',
      '{"type":"text","text":"Task "}',
      '{"type":"turn.completed","message":"works","cost":0.003,"timestamp":2200,"part":{"usage":{"input":15,"output":3,"reasoning":2,"cacheRead":1,"cacheWrite":4}}}',
    ].join("\n");

    const result = normalizeCodexResult(jsonl, 500);

    expect(result.sessionId).toBe("thread_abc");
    expect(result.result).toBe("Task works");
    expect(result.costUsd).toBe(0.003);
    expect(result.durationMs).toBe(1200);
    expect(result.tokenUsage).toEqual({
      cacheRead: 1,
      cacheWrite: 4,
      input: 15,
      output: 3,
      reasoning: 2,
    });
  });

  test("supports text extraction from output and part.message fields", () => {
    const jsonl = [
      '{"type":"thread.started","thread_id":"thread_2","timestamp":2000}',
      '{"type":"text","output":"A"}',
      '{"type":"text","part":{"message":"B"}}',
      '{"type":"turn.completed","message":"C","timestamp":3200,"part":{"usage":{"prompt_tokens":1,"completion_tokens":2}}}',
    ].join("\n");

    const result = normalizeCodexResult(jsonl, 2000);

    expect(result.result).toBe("ABC");
    expect(result.tokenUsage).toEqual({
      cacheRead: undefined,
      cacheWrite: undefined,
      input: 1,
      output: 2,
      reasoning: undefined,
    });
  });

  test("throws when no final completion event exists", () => {
    const jsonl =
      '{"type":"thread.started","thread_id":"thread_3","timestamp":1000}';

    expect(() => normalizeCodexResult(jsonl, 0)).toThrow(
      "No turn.completed event found in Codex output",
    );
  });

  test("throws when no result text exists even after completion", () => {
    const jsonl = [
      '{"type":"thread.started","thread_id":"thread_4","timestamp":1000}',
      '{"type":"turn.completed","timestamp":2000}',
    ].join("\n");

    expect(() => normalizeCodexResult(jsonl, 2000)).toThrow(
      "No final message found in Codex output",
    );
  });
});

// =============================================================================
// Discovery
// =============================================================================

describe("discoverCodexModels", () => {
  test("parses json array output from codex models command", () => {
    mockCodexDiscovery({
      "models --json": JSON.stringify([
        { cost: { input: 12 }, id: "gpt-5.3-codex", providerID: "openai" },
        { cost: { input: 1 }, id: "gpt-5-codex", provider_id: "openai" },
      ]),
    });

    const discovered = discoverCodexModels();
    expect(discovered).toHaveLength(2);
    expect(discovered[0]).toEqual({
      cliFormat: "openai/gpt-5.3-codex",
      costHint: "expensive",
      discoveredAt: expect.any(String),
      id: "openai/gpt-5.3-codex",
      provider: "codex",
    });
    expect(discovered[1]).toEqual({
      cliFormat: "openai/gpt-5-codex",
      costHint: "standard",
      discoveredAt: expect.any(String),
      id: "openai/gpt-5-codex",
      provider: "codex",
    });
  });

  test("falls back to models list output when --json formats are unavailable", () => {
    mockCodexDiscovery({
      "model list": "",
      models: "openai/gpt-4o-codex\nprovider-b/gpt-dev",
      "models --json": "",
      "models list --json": "",
    });

    const discovered = discoverCodexModels();
    expect(discovered).toHaveLength(2);
    expect(discovered[0]?.id).toBe("openai/gpt-4o-codex");
    expect(discovered[1]?.id).toBe("provider-b/gpt-dev");
  });

  test("returns empty list when codex is unavailable", () => {
    mockCodexDiscovery({
      "model list": "",
      models: "",
      "models --json": "",
      "models list --json": "",
      which: "",
    });
    Bun.spawnSync = mock((command: Array<string>) => {
      if (command[0] === "which") {
        return makeSpawnSyncResult(1, "", "not found");
      }
      return makeSpawnSyncResult(1, "", "unexpected command");
    });

    expect(discoverCodexModels()).toEqual([]);
  });
});

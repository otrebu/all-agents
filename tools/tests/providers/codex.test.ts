/**
 * Unit tests for OpenAI Codex provider implementation
 *
 * Tests command argument construction, JSONL parsing, token usage extraction,
 * result normalization behavior, and cache-based model discovery.
 */
/* eslint-disable */

import type { CodexConfig } from "@tools/commands/ralph/providers/types";

import {
  buildCodexHeadlessArguments,
  buildCodexSupervisedArguments,
  discoverCodexModels,
  mapCodexInvocationError,
  normalizeCodexResult,
  parseCodexEvents,
  readCodexModelsCache,
} from "@tools/commands/ralph/providers/codex";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

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

function makeSpawnSyncSubprocess(
  exitCode: number,
  stdout: string,
  stderr = "",
): ReturnType<typeof Bun.spawnSync> {
  const result = makeSpawnSyncResult(exitCode, stdout, stderr);
  return {
    ...result,
    pid: 0,
    resourceUsage: undefined,
    success: exitCode === 0,
  } as unknown as ReturnType<typeof Bun.spawnSync>;
}

function parseSpawnSyncCommand(command: unknown): Array<string> {
  if (Array.isArray(command)) {
    return command;
  }

  if (
    command !== null &&
    typeof command === "object" &&
    "cmd" in command &&
    Array.isArray((command as { cmd: unknown }).cmd)
  ) {
    return (command as { cmd: Array<string> }).cmd;
  }

  return [];
}

function mockWhichCodexAvailable(): void {
  Object.assign(Bun, {
    spawnSync: mock((command: unknown) => {
      const args = parseSpawnSyncCommand(command);
      if (args[0] === "which") {
        return makeSpawnSyncSubprocess(0, "/usr/local/bin/codex\n");
      }
      return makeSpawnSyncSubprocess(1, "", "unexpected command");
    }),
  });
}

function mockWhichCodexUnavailable(): void {
  Object.assign(Bun, {
    spawnSync: mock((command: unknown) => {
      const args = parseSpawnSyncCommand(command);
      if (args[0] === "which") {
        return makeSpawnSyncSubprocess(1, "", "not found");
      }
      return makeSpawnSyncSubprocess(1, "", "unexpected command");
    }),
  });
}

/**
 * Write a temporary models_cache.json file and return its path.
 */
function writeTempModelsCache(content: unknown): {
  cachePath: string;
  cleanup: () => void;
} {
  const dir = mkdtempSync(path.join(tmpdir(), "codex-test-"));
  const cachePath = path.join(dir, "models_cache.json");
  writeFileSync(cachePath, JSON.stringify(content, null, 2), "utf8");
  return {
    cachePath,
    cleanup: () => rmSync(dir, { force: true, recursive: true }),
  };
}

const originalSpawnSync = Bun.spawnSync;
beforeEach(() => {
  Bun.spawnSync = originalSpawnSync;
});
afterEach(() => {
  Bun.spawnSync = originalSpawnSync;
});

describe("buildCodexHeadlessArguments", () => {
  test("includes exec, json, and yolo flag", () => {
    const config: CodexConfig = { provider: "codex" };
    const args = buildCodexHeadlessArguments(config, "hello");

    expect(args[0]).toBe("--yolo");
    expect(args).toContain("exec");
    expect(args).toContain("--json");
    expect(args).toContain("--yolo");
    expect(args).toContain("--skip-git-repo-check");
    expect(args).not.toContain("--dangerously-bypass-approvals-and-sandbox");
    expect(args).not.toContain("--ask-for-approval");
    expect(args).not.toContain("--sandbox");
  });

  test("passes model to --model when provided", () => {
    const config: CodexConfig = {
      model: "openai/gpt-5.2-codex",
      provider: "codex",
    };
    const args = buildCodexHeadlessArguments(config, "hello");

    const modelIndex = args.indexOf("--model");
    expect(modelIndex).not.toBe(-1);
    expect(args[modelIndex + 1]).toBe("gpt-5.2-codex");
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
    expect(args[modelIndex + 1]).toBe("gpt-5.1-codex-mini");
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
    expect(events.at(0)).toHaveProperty("type", "thread.started");
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

  test("extracts final message from item.completed payloads", () => {
    const jsonl = [
      '{"type":"thread.started","thread_id":"thread_item","timestamp":2000}',
      '{"type":"item.completed","item":{"type":"reasoning","text":"internal"}}',
      '{"type":"item.completed","item":{"type":"agent_message","text":"Final answer"}}',
      '{"type":"turn.completed","timestamp":2600}',
    ].join("\n");

    const result = normalizeCodexResult(jsonl, 600);

    expect(result.result).toBe("Final answer");
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
// Discovery (cache-based)
// =============================================================================

describe("readCodexModelsCache", () => {
  test("parses models from cache file with visibility filtering", () => {
    const { cachePath, cleanup } = writeTempModelsCache({
      fetched_at: "2026-03-10T08:57:14.073620Z",
      models: [
        { slug: "gpt-5.4", description: "Latest model", visibility: "list" },
        {
          slug: "gpt-5.3-codex",
          description: "Codex model",
          visibility: "list",
        },
        { slug: "gpt-5-codex", description: "Hidden", visibility: "hide" },
      ],
    });

    try {
      const models = readCodexModelsCache(cachePath);
      expect(models).toHaveLength(2);
      expect(models[0]?.id).toBe("gpt-5.4");
      expect(models[0]?.cliFormat).toBe("gpt-5.4");
      expect(models[0]?.provider).toBe("codex");
      expect(models[0]?.costHint).toBe("standard");
      expect(models[1]?.id).toBe("gpt-5.3-codex");
    } finally {
      cleanup();
    }
  });

  test("infers cost hint from model slug naming conventions", () => {
    const { cachePath, cleanup } = writeTempModelsCache({
      models: [
        { slug: "gpt-5.1-codex-mini", visibility: "list" },
        { slug: "gpt-5.1-codex-max", visibility: "list" },
        { slug: "gpt-5.3-codex-spark", visibility: "list" },
        { slug: "gpt-5.4", visibility: "list" },
      ],
    });

    try {
      const models = readCodexModelsCache(cachePath);
      expect(models).toHaveLength(4);
      expect(models[0]?.costHint).toBe("cheap"); // mini
      expect(models[1]?.costHint).toBe("expensive"); // max
      expect(models[2]?.costHint).toBe("expensive"); // spark
      expect(models[3]?.costHint).toBe("standard"); // normal
    } finally {
      cleanup();
    }
  });

  test("returns empty array when cache file does not exist", () => {
    const models = readCodexModelsCache("/nonexistent/path/models_cache.json");
    expect(models).toEqual([]);
  });

  test("returns empty array when cache file is malformed JSON", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "codex-test-"));
    const cachePath = path.join(dir, "models_cache.json");
    writeFileSync(cachePath, "not valid json {{{", "utf8");

    try {
      const models = readCodexModelsCache(cachePath);
      expect(models).toEqual([]);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  test("returns empty array when cache has no models array", () => {
    const { cachePath, cleanup } = writeTempModelsCache({
      fetched_at: "2026-03-10T08:57:14.073620Z",
    });

    try {
      const models = readCodexModelsCache(cachePath);
      expect(models).toEqual([]);
    } finally {
      cleanup();
    }
  });

  test("skips entries without a slug field", () => {
    const { cachePath, cleanup } = writeTempModelsCache({
      models: [
        { description: "No slug", visibility: "list" },
        { slug: "gpt-5.4", visibility: "list" },
      ],
    });

    try {
      const models = readCodexModelsCache(cachePath);
      expect(models).toHaveLength(1);
      expect(models[0]?.id).toBe("gpt-5.4");
    } finally {
      cleanup();
    }
  });

  test("includes models with no visibility field (not hidden)", () => {
    const { cachePath, cleanup } = writeTempModelsCache({
      models: [
        { slug: "gpt-5.4" },
        { slug: "gpt-5-hidden", visibility: "hide" },
      ],
    });

    try {
      const models = readCodexModelsCache(cachePath);
      expect(models).toHaveLength(1);
      expect(models[0]?.id).toBe("gpt-5.4");
    } finally {
      cleanup();
    }
  });

  test("sets discoveredAt to ISO date format", () => {
    const { cachePath, cleanup } = writeTempModelsCache({
      models: [{ slug: "gpt-5.4", visibility: "list" }],
    });

    try {
      const models = readCodexModelsCache(cachePath);
      expect(models[0]?.discoveredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    } finally {
      cleanup();
    }
  });
});

describe("discoverCodexModels", () => {
  test("reads models from cache when codex is available", () => {
    mockWhichCodexAvailable();
    const { cachePath, cleanup } = writeTempModelsCache({
      models: [
        { slug: "gpt-5.4", visibility: "list" },
        { slug: "gpt-5.3-codex", visibility: "list" },
      ],
    });

    try {
      const discovered = discoverCodexModels(cachePath);
      expect(discovered).toHaveLength(2);
      expect(discovered[0]?.id).toBe("gpt-5.4");
      expect(discovered[1]?.id).toBe("gpt-5.3-codex");
    } finally {
      cleanup();
    }
  });

  test("returns empty list when codex is unavailable", () => {
    mockWhichCodexUnavailable();
    expect(discoverCodexModels()).toEqual([]);
  });

  test("returns empty list when cache file does not exist", () => {
    mockWhichCodexAvailable();
    const discovered = discoverCodexModels("/nonexistent/models_cache.json");
    expect(discovered).toEqual([]);
  });
});

describe("mapCodexInvocationError", () => {
  test("classifies ChatGPT account model entitlement failures as model/fatal", () => {
    const outcome = mapCodexInvocationError(
      new Error(
        "Codex exited with code 1: The 'gpt-5.2-codex-xhigh-fast' model is not supported when using Codex with a ChatGPT account.",
      ),
    );

    expect(outcome.reason).toBe("model");
    expect(outcome.status).toBe("fatal");
  });
});

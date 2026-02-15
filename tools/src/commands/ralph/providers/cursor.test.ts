import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildCursorHeadlessArguments,
  invokeCursorSupervised,
  normalizeCursorResult,
} from "./cursor";

interface CursorFixtureScenario {
  events: Array<Record<string, unknown>>;
  expectedContains: string;
  name: string;
}

function loadCursorStreamJsonFixtures(): Array<CursorFixtureScenario> {
  const fixturePath = join(
    import.meta.dir,
    "../../../../tests/fixtures/cursor/stream-json-events.json",
  );
  const raw = readFileSync(fixturePath, "utf8");
  const parsed = JSON.parse(raw) as {
    scenarios?: Array<CursorFixtureScenario>;
  };

  return parsed.scenarios ?? [];
}

describe("buildCursorHeadlessArguments", () => {
  test("includes headless flags, model, and prompt separator", () => {
    const args = buildCursorHeadlessArguments(
      { model: "cursor-fast", provider: "cursor" },
      "Implement feature X",
    );

    expect(args).toEqual([
      "-p",
      "--output-format",
      "stream-json",
      "--model",
      "cursor-fast",
      "--",
      "Implement feature X",
    ]);
  });

  test("omits model when unset", () => {
    const args = buildCursorHeadlessArguments({ provider: "cursor" }, "ping");

    expect(args).toEqual([
      "-p",
      "--output-format",
      "stream-json",
      "--",
      "ping",
    ]);
  });
});

function createClosedStream(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close();
    },
  });
}

function createSpawnProcess(options: {
  exitCode: number;
  signalCode?: null | string;
}): ReturnType<typeof Bun.spawn> {
  return {
    exitCode: options.exitCode,
    exited: Promise.resolve(options.exitCode),
    kill: mock(() => {}),
    pid: 12_345,
    signalCode: options.signalCode ?? null,
    stderr: createClosedStream(),
    stdout: createClosedStream(),
  } as unknown as ReturnType<typeof Bun.spawn>;
}

function parseSpawnCommand(command: unknown): Array<string> {
  if (Array.isArray(command)) {
    return command.filter(
      (value): value is string => typeof value === "string",
    );
  }

  if (
    command !== null &&
    typeof command === "object" &&
    "cmd" in command &&
    Array.isArray((command as { cmd: unknown }).cmd)
  ) {
    return (command as { cmd: Array<unknown> }).cmd.filter(
      (value): value is string => typeof value === "string",
    );
  }

  return [];
}

describe("invokeCursorSupervised interrupt propagation", () => {
  const originalSpawn = Bun.spawn;
  const originalProcessKill = process.kill;
  const stdinTtyDescriptor = Object.getOwnPropertyDescriptor(
    process.stdin,
    "isTTY",
  );
  const stdoutTtyDescriptor = Object.getOwnPropertyDescriptor(
    process.stdout,
    "isTTY",
  );

  beforeEach(() => {
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    Bun.spawn = originalSpawn;
    process.kill = originalProcessKill;
    if (stdinTtyDescriptor !== undefined) {
      Object.defineProperty(process.stdin, "isTTY", stdinTtyDescriptor);
    }
    if (stdoutTtyDescriptor !== undefined) {
      Object.defineProperty(process.stdout, "isTTY", stdoutTtyDescriptor);
    }
  });

  test("re-emits SIGINT when child exits with SIGINT signalCode", async () => {
    const propagatedSignals: Array<string> = [];
    Bun.spawn = mock((command: unknown): ReturnType<typeof Bun.spawn> => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createSpawnProcess({ exitCode: 0 });
      }

      return createSpawnProcess({ exitCode: 130, signalCode: "SIGINT" });
    });
    process.kill = mock((pid: number, signal?: number | string) => {
      if (pid === process.pid && typeof signal === "string") {
        propagatedSignals.push(signal);
      }
      return true;
    }) as typeof process.kill;

    try {
      await invokeCursorSupervised({
        config: { provider: "cursor" },
        mode: "supervised",
        prompt: "test prompt",
      });
      throw new Error("Expected supervised cursor invocation to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("interrupted by SIGINT");
    }

    expect(propagatedSignals).toContain("SIGINT");
  });

  test("re-emits SIGINT when child exits with signal exit code 130", async () => {
    const propagatedSignals: Array<string> = [];
    Bun.spawn = mock((command: unknown): ReturnType<typeof Bun.spawn> => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createSpawnProcess({ exitCode: 0 });
      }

      return createSpawnProcess({ exitCode: 130 });
    });
    process.kill = mock((pid: number, signal?: number | string) => {
      if (pid === process.pid && typeof signal === "string") {
        propagatedSignals.push(signal);
      }
      return true;
    }) as typeof process.kill;

    try {
      await invokeCursorSupervised({
        config: { provider: "cursor" },
        mode: "supervised",
        prompt: "test prompt",
      });
      throw new Error("Expected supervised cursor invocation to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("interrupted by SIGINT");
    }

    expect(propagatedSignals).toContain("SIGINT");
  });
});

describe("normalizeCursorResult", () => {
  test("parses single JSON payload", () => {
    const output = JSON.stringify({
      duration_ms: 1200,
      result: "done",
      session_id: "cur_123",
      total_cost_usd: 0.02,
      usage: {
        cache_read: 5,
        cache_write: 1,
        input_tokens: 100,
        output_tokens: 25,
      },
    });

    const result = normalizeCursorResult(output);
    expect(result).toEqual({
      costUsd: 0.02,
      durationMs: 1200,
      result: "done",
      sessionId: "cur_123",
      tokenUsage: {
        cacheRead: 5,
        cacheWrite: 1,
        input: 100,
        output: 25,
        reasoning: undefined,
      },
    });
  });

  test("parses JSONL stream payload", () => {
    const jsonl = [
      '{"type":"system","session_id":"cur_abc"}',
      '{"type":"assistant","content":"partial "}',
      '{"type":"assistant","content":"answer"}',
      '{"type":"result","result":"final answer","duration_ms":900}',
    ].join("\n");

    const result = normalizeCursorResult(jsonl);
    expect(result.costUsd).toBe(0);
    expect(result.durationMs).toBe(900);
    expect(result.result).toBe("final answer");
    expect(result.sessionId).toBe("cur_abc");
  });

  test("extracts nested assistant message content when result text missing", () => {
    const jsonl = [
      '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"nested "},{"type":"text","text":"content"}]},"session_id":"cur_nested"}',
      '{"type":"result","duration_ms":450}',
    ].join("\n");

    const result = normalizeCursorResult(jsonl);
    expect(result.result).toBe("nested content");
    expect(result.durationMs).toBe(450);
    expect(result.sessionId).toBe("cur_nested");
  });

  test("extracts nested result content text objects", () => {
    const output = JSON.stringify({
      duration_ms: 800,
      result: { content: { text: "deep result text" } },
      session_id: "cur_deep",
    });

    const result = normalizeCursorResult(output);
    expect(result.result).toBe("deep result text");
    expect(result.sessionId).toBe("cur_deep");
  });

  test("throws when result event reports explicit error", () => {
    const output = JSON.stringify({
      error: { message: "Permission denied by policy" },
      is_error: true,
      subtype: "error_permission",
      type: "result",
    });

    expect(() => normalizeCursorResult(output)).toThrow(
      "Permission denied by policy",
    );
  });

  test("throws for non-JSON output", () => {
    expect(() => normalizeCursorResult("plain text response")).toThrow(
      "Unable to parse Cursor output as JSON or JSONL structured payload",
    );
  });
});

describe("normalizeCursorResult fixtures", () => {
  const scenarios = loadCursorStreamJsonFixtures();

  for (const scenario of scenarios) {
    test(`parses cursor fixture: ${scenario.name}`, () => {
      const result = normalizeCursorResult(JSON.stringify(scenario.events));
      expect(result.result).toContain(scenario.expectedContains);
      expect(result.sessionId).not.toBe("");
    });
  }
});

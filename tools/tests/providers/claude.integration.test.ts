/**
 * Integration tests for Claude provider subprocess lifecycle.
 *
 * Tests Bun.spawn mocking, stall detection, termination escalation,
 * exit code handling, and JSON output parsing — all without the real
 * Claude CLI installed.
 */
import { invokeClaudeHeadlessAsync } from "@tools/commands/ralph/providers/claude";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// =============================================================================
// Mock Utilities
// =============================================================================

/**
 * Create a mock process object compatible with the return type of Bun.spawn.
 *
 * Returns:
 * - `proc` — the mock process with controllable stdout/stderr/kill/exited
 * - `resolveExited(code)` — resolve the `exited` promise with a given exit code
 * - `stderr` — stream controller for stderr
 * - `stdout` — stream controller for stdout
 */
function createMockProcess(): {
  proc: {
    exitCode: null | number;
    exited: Promise<number>;
    kill: ReturnType<typeof mock>;
    pid: number;
    signalCode: null | string;
    stderr: ReadableStream<Uint8Array>;
    stdout: ReadableStream<Uint8Array>;
  };
  resolveExited: (code: number) => void;
  stderr: ReturnType<typeof createMockStream>;
  stdout: ReturnType<typeof createMockStream>;
} {
  const stdoutCtrl = createMockStream();
  const stderrCtrl = createMockStream();

  const exitedControl = Promise.withResolvers<number>();
  const exitedPromise = exitedControl.promise;

  const proc = {
    exitCode: null as null | number,
    exited: exitedPromise,
    kill: mock(() => {}),
    pid: 99_999,
    signalCode: null as null | string,
    stderr: stderrCtrl.stream,
    stdout: stdoutCtrl.stream,
  };

  return {
    proc,
    resolveExited(code: number) {
      proc.exitCode = code;
      exitedControl.resolve(code);
    },
    stderr: stderrCtrl,
    stdout: stdoutCtrl,
  };
}

/**
 * Create a controllable ReadableStream that mimics subprocess stdout/stderr.
 *
 * Returns:
 * - `stream` — the ReadableStream to pass as proc.stdout / proc.stderr
 * - `push(data)` — enqueue a UTF-8 chunk
 * - `close()` — signal end-of-stream
 */
function createMockStream(): {
  close: () => void;
  push: (data: string) => void;
  stream: ReadableStream<Uint8Array>;
} {
  let controller: null | ReadableStreamDefaultController<Uint8Array> = null;
  let isClosed = false;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  return {
    close() {
      if (!isClosed) {
        isClosed = true;
        if (controller === null) {
          return;
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
    push(data: string) {
      if (!isClosed && controller !== null) {
        controller.enqueue(encoder.encode(data));
      }
    },
    stream,
  };
}

// =============================================================================
// Fixture Helpers
// =============================================================================

const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf8");
}

// =============================================================================
// Test Setup / Teardown
// =============================================================================

const originalSpawn = Bun.spawn;
const originalStderrWrite = process.stderr.write;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  // Suppress noisy stderr/console output during tests
  process.stderr.write = mock(() => true) as typeof process.stderr.write;
  console.warn = mock(() => {});
  console.error = mock(() => {});
});

afterEach(() => {
  Bun.spawn = originalSpawn;
  process.stderr.write = originalStderrWrite;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

afterAll(() => {
  Bun.spawn = originalSpawn;
  process.stderr.write = originalStderrWrite;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// =============================================================================
// Subprocess Spawning
// =============================================================================

describe("subprocess spawning", () => {
  test("Bun.spawn called with correct args for headless mode", async () => {
    let capturedArguments: unknown = null;
    let capturedOptions: unknown = null;

    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, {
      spawn: mock((spawnCommand: unknown, spawnOptions: unknown) => {
        capturedArguments = spawnCommand;
        capturedOptions = spawnOptions;
        return proc;
      }),
    });

    // Exit immediately with success
    setTimeout(() => {
      stdout.push("[]");
      stdout.close();
      stderr.close();
      resolveExited(0);
    }, 5);

    await invokeClaudeHeadlessAsync({ prompt: "test prompt" });

    expect(capturedArguments).toEqual([
      "claude",
      "-p",
      "test prompt",
      "--dangerously-skip-permissions",
      "--output-format",
      "json",
    ]);

    expect(capturedOptions).toEqual(
      expect.objectContaining({
        stderr: "pipe",
        stdin: "ignore",
        stdout: "pipe",
      }),
    );
  });
});

// =============================================================================
// Stall Detection
// =============================================================================

describe("stall detection", () => {
  test("triggers SIGTERM after stall timeout without stderr activity", async () => {
    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, { spawn: mock(() => proc) });

    // When kill is called, simulate the process dying
    proc.kill = mock(() => {
      stderr.close();
      stdout.close();
      resolveExited(1);
    });

    const startTime = Date.now();

    const result = await invokeClaudeHeadlessAsync({
      gracePeriodMs: 50,
      prompt: "test",
      stallTimeoutMs: 100,
    });

    const elapsed = Date.now() - startTime;

    expect(result).toBeNull();
    expect(proc.kill).toHaveBeenCalledWith("SIGTERM");
    // Should trigger around 100ms (stall) — allow margin
    expect(elapsed).toBeGreaterThanOrEqual(80);
    expect(elapsed).toBeLessThan(500);
  });

  test("stall timer resets when stderr data is emitted", async () => {
    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, { spawn: mock(() => proc) });

    // When kill is called, simulate the process dying
    proc.kill = mock(() => {
      stderr.close();
      stdout.close();
      resolveExited(1);
    });

    const startTime = Date.now();

    // Emit stderr data at 50ms to reset the stall timer
    // Without reset, stall would trigger at ~100ms
    // With reset at 50ms, stall triggers at ~150ms (50ms + 100ms)
    setTimeout(() => {
      stderr.push("progress output\n");
    }, 50);

    const result = await invokeClaudeHeadlessAsync({
      gracePeriodMs: 50,
      prompt: "test",
      stallTimeoutMs: 100,
    });

    const elapsed = Date.now() - startTime;

    expect(result).toBeNull();
    expect(proc.kill).toHaveBeenCalledWith("SIGTERM");
    // With the reset at 50ms, stall triggers at ~150ms, not ~100ms
    expect(elapsed).toBeGreaterThanOrEqual(120);
  });

  test("onStderrActivity callback is invoked on stderr output", async () => {
    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, { spawn: mock(() => proc) });

    proc.kill = mock(() => {
      stderr.close();
      stdout.close();
      resolveExited(1);
    });

    const activitySpy = mock(() => {});

    // Emit some stderr data before stall triggers
    setTimeout(() => {
      stderr.push("data\n");
    }, 20);

    await invokeClaudeHeadlessAsync({
      gracePeriodMs: 50,
      onStderrActivity: activitySpy,
      prompt: "test",
      stallTimeoutMs: 100,
    });

    expect(activitySpy).toHaveBeenCalled();
  });
});

// =============================================================================
// Watchdog Termination
// =============================================================================

describe("watchdog termination", () => {
  test("triggers SIGTERM when watchdog requests termination", async () => {
    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, { spawn: mock(() => proc) });

    const signals: Array<string> = [];
    proc.kill = mock((signal?: number | string) => {
      signals.push(signal as string);
      if (signal === "SIGTERM") {
        stderr.close();
        stdout.close();
        resolveExited(143);
      }
    });

    const shouldTerminate = mock(() => true);

    const result = await invokeClaudeHeadlessAsync({
      gracePeriodMs: 50,
      prompt: "test",
      watchdog: {
        checkIntervalMs: 10,
        reason: "test watchdog",
        shouldTerminate,
      },
    });

    expect(result).toBeNull();
    expect(shouldTerminate).toHaveBeenCalled();
    expect(proc.kill).toHaveBeenCalledWith("SIGTERM");
    expect(signals).toContain("SIGTERM");
    expect(signals).not.toContain("SIGKILL");
  });
});

// =============================================================================
// Termination Escalation
// =============================================================================

describe("termination escalation", () => {
  test("SIGKILL sent after grace period when SIGTERM does not cause exit", async () => {
    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, { spawn: mock(() => proc) });

    const signals: Array<string> = [];
    proc.kill = mock((signal?: number | string) => {
      signals.push(signal as string);
      if (signal === "SIGKILL") {
        // Process only dies on SIGKILL
        stderr.close();
        stdout.close();
        resolveExited(137);
      }
      // SIGTERM does NOT cause exit — forces grace period timeout
    });

    const result = await invokeClaudeHeadlessAsync({
      gracePeriodMs: 50,
      prompt: "test",
      stallTimeoutMs: 100,
    });

    expect(result).toBeNull();
    expect(signals).toContain("SIGTERM");
    expect(signals).toContain("SIGKILL");
    // SIGTERM should come before SIGKILL
    expect(signals.indexOf("SIGTERM")).toBeLessThan(signals.indexOf("SIGKILL"));
  });

  test("no SIGKILL when process exits after SIGTERM within grace period", async () => {
    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, { spawn: mock(() => proc) });

    const signals: Array<string> = [];
    proc.kill = mock((signal?: number | string) => {
      signals.push(signal as string);
      if (signal === "SIGTERM") {
        // Process exits promptly on SIGTERM
        stderr.close();
        stdout.close();
        resolveExited(143);
      }
    });

    const result = await invokeClaudeHeadlessAsync({
      gracePeriodMs: 50,
      prompt: "test",
      stallTimeoutMs: 100,
    });

    expect(result).toBeNull();
    expect(signals).toContain("SIGTERM");
    expect(signals).not.toContain("SIGKILL");
  });
});

// =============================================================================
// Exit Code Handling
// =============================================================================

describe("exit code handling", () => {
  test("exit code 0 returns successful AgentResult with parsed JSON fields", async () => {
    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, { spawn: mock(() => proc) });

    const fixtureJson = loadFixture("claude-success.json");

    setTimeout(() => {
      stdout.push(fixtureJson);
      stdout.close();
      stderr.close();
      resolveExited(0);
    }, 5);

    const result = await invokeClaudeHeadlessAsync({ prompt: "test" });

    if (!result) throw new Error("Expected non-null AgentResult");

    expect(result.costUsd).toBe(0.0847);
    expect(result.durationMs).toBe(45_230);
    expect(result.sessionId).toBe("abc-123-def-456");
    expect(result.result).toBe(
      "Task completed successfully.\n\nAll changes have been applied.",
    );
    expect(result.tokenUsage).toBeDefined();
    expect(result.tokenUsage?.input).toBe(15_200);
    expect(result.tokenUsage?.output).toBe(3400);
    expect(result.tokenUsage?.cacheRead).toBe(12_000);
    expect(result.tokenUsage?.cacheWrite).toBe(800);
  });

  test("exit code 1 returns null (general error)", async () => {
    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, { spawn: mock(() => proc) });

    setTimeout(() => {
      stdout.close();
      stderr.close();
      resolveExited(1);
    }, 5);

    const result = await invokeClaudeHeadlessAsync({ prompt: "test" });
    expect(result).toBeNull();
  });

  test("exit code 2 returns null (usage error)", async () => {
    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, { spawn: mock(() => proc) });

    setTimeout(() => {
      stdout.close();
      stderr.close();
      resolveExited(2);
    }, 5);

    const result = await invokeClaudeHeadlessAsync({ prompt: "test" });
    expect(result).toBeNull();
  });

  test("exit code 127 returns null (command not found)", async () => {
    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, { spawn: mock(() => proc) });

    setTimeout(() => {
      stdout.close();
      stderr.close();
      resolveExited(127);
    }, 5);

    const result = await invokeClaudeHeadlessAsync({ prompt: "test" });
    expect(result).toBeNull();
  });
});

// =============================================================================
// JSON Output Parsing (Integration)
// =============================================================================

describe("JSON output parsing", () => {
  test("Claude JSON array output parsed to AgentResult with costUsd, durationMs, sessionId", async () => {
    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, { spawn: mock(() => proc) });

    const json = JSON.stringify([
      { session_id: "sess-integration-1", type: "system" },
      { message: { content: "Working on it..." }, type: "assistant" },
      {
        duration_ms: 8500,
        result: "Integration test completed.",
        session_id: "sess-integration-1",
        total_cost_usd: 0.123,
        type: "result",
        usage: {
          cache_read: 5000,
          cache_write: 200,
          input_tokens: 10_000,
          output_tokens: 2000,
        },
      },
    ]);

    setTimeout(() => {
      stdout.push(json);
      stdout.close();
      stderr.close();
      resolveExited(0);
    }, 5);

    const result = await invokeClaudeHeadlessAsync({ prompt: "test" });

    if (!result) throw new Error("Expected non-null AgentResult");

    expect(result.costUsd).toBe(0.123);
    expect(result.durationMs).toBe(8500);
    expect(result.sessionId).toBe("sess-integration-1");
    expect(result.result).toBe("Integration test completed.");
    expect(result.tokenUsage).toEqual({
      cacheRead: 5000,
      cacheWrite: 200,
      input: 10_000,
      output: 2000,
    });
  });

  test("malformed JSON stdout returns null", async () => {
    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, { spawn: mock(() => proc) });

    setTimeout(() => {
      stdout.push("this is not valid json {{{");
      stdout.close();
      stderr.close();
      resolveExited(0);
    }, 5);

    const result = await invokeClaudeHeadlessAsync({ prompt: "test" });
    expect(result).toBeNull();
  });

  test("empty stdout returns null on parse error", async () => {
    const { proc, resolveExited, stderr, stdout } = createMockProcess();
    Object.assign(Bun, { spawn: mock(() => proc) });

    setTimeout(() => {
      stdout.close();
      stderr.close();
      resolveExited(0);
    }, 5);

    const result = await invokeClaudeHeadlessAsync({ prompt: "test" });
    expect(result).toBeNull();
  });
});

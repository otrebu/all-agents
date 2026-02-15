/**
 * Integration tests for Cursor provider subprocess lifecycle.
 *
 * Covers headless timeout/success/non-zero/parse failures/binary missing,
 * plus supervised TTY gating, interrupt propagation, non-zero exit, and success.
 */
/* eslint-disable */

import type { InvocationOptions } from "@tools/commands/ralph/providers/types";

import { invokeCursor } from "@tools/commands/ralph/providers/cursor";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";

type BunSpawnResult = ReturnType<typeof Bun.spawn>;

interface MockSpawnProcess {
  exitCode: null | number;
  exited: Promise<number>;
  kill: ReturnType<typeof mock>;
  pid: number;
  signalCode: null | string;
  stderr: ReadableStream<Uint8Array>;
  stdout: ReadableStream<Uint8Array>;
}

function parseSpawnCommand(command: unknown): Array<string> {
  if (Array.isArray(command)) {
    return command as Array<string>;
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

function createMockProcess(): {
  proc: MockSpawnProcess;
  resolveExited: (code: number) => void;
  stderr: ReturnType<typeof createMockStream>;
  stdout: ReturnType<typeof createMockStream>;
} {
  const stdoutCtrl = createMockStream();
  const stderrCtrl = createMockStream();

  const exitedControl = Promise.withResolvers<number>();

  const proc = {
    exitCode: null as null | number,
    exited: exitedControl.promise,
    kill: mock(() => {}),
    pid: 44_444,
    signalCode: null as null | string,
    stderr: stderrCtrl.stream,
    stdout: stdoutCtrl.stream,
  } as MockSpawnProcess;

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

function createWhichMockProcess(found: boolean): BunSpawnResult {
  const stdoutCtrl = createMockStream();
  const stderrCtrl = createMockStream();

  if (found) {
    stdoutCtrl.push("/usr/local/bin/agent\n");
  }

  stdoutCtrl.close();
  stderrCtrl.close();

  return {
    exitCode: found ? 0 : 1,
    exited: Promise.resolve(found ? 0 : 1),
    kill: mock(() => {}),
    pid: 55_555,
    signalCode: null,
    stderr: stderrCtrl.stream,
    stdout: stdoutCtrl.stream,
  } as unknown as BunSpawnResult;
}

function makeOptions(overrides?: {
  mode?: InvocationOptions["mode"];
  prompt?: string;
  timeoutMs?: number;
}): InvocationOptions {
  return {
    config: { provider: "cursor" as const, timeoutMs: overrides?.timeoutMs },
    mode: overrides?.mode ?? "headless-async",
    prompt: overrides?.prompt ?? "test prompt",
  };
}

const originalSpawn = Bun.spawn;
const originalProcessKill = process.kill;
const originalStderrWrite = process.stderr.write;
const originalConsoleError = console.error;
const originalStdinIsTTYDescriptor = Object.getOwnPropertyDescriptor(
  process.stdin,
  "isTTY",
);
const originalStdoutIsTTYDescriptor = Object.getOwnPropertyDescriptor(
  process.stdout,
  "isTTY",
);

function restoreTtyState(): void {
  if (originalStdinIsTTYDescriptor === undefined) {
    delete (process.stdin as { isTTY?: boolean }).isTTY;
  } else {
    Object.defineProperty(process.stdin, "isTTY", originalStdinIsTTYDescriptor);
  }

  if (originalStdoutIsTTYDescriptor === undefined) {
    delete (process.stdout as { isTTY?: boolean }).isTTY;
  } else {
    Object.defineProperty(
      process.stdout,
      "isTTY",
      originalStdoutIsTTYDescriptor,
    );
  }
}

function setTtyState(isStdinTTY: boolean, isStdoutTTY: boolean): void {
  Object.defineProperty(process.stdin, "isTTY", {
    configurable: true,
    value: isStdinTTY,
  });
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: isStdoutTTY,
  });
}

let activeMockProcesses: Array<{
  resolveExited: (code: number) => void;
  stderr: ReturnType<typeof createMockStream>;
  stdout: ReturnType<typeof createMockStream>;
}> = [];
let activeTimers: Array<ReturnType<typeof setTimeout>> = [];

beforeEach(() => {
  activeMockProcesses = [];
  activeTimers = [];
  process.kill = mock(() => true) as typeof process.kill;
  process.stderr.write = mock(() => true) as typeof process.stderr.write;
  console.error = mock(() => {});
  restoreTtyState();
});

afterEach(() => {
  for (const activeProcess of activeMockProcesses) {
    activeProcess.stdout.close();
    activeProcess.stderr.close();
    activeProcess.resolveExited(137);
  }
  activeMockProcesses = [];

  for (const timer of activeTimers) {
    clearTimeout(timer);
  }
  activeTimers = [];

  Bun.spawn = originalSpawn;
  process.kill = originalProcessKill;
  process.stderr.write = originalStderrWrite;
  console.error = originalConsoleError;
  restoreTtyState();
});

afterAll(() => {
  Bun.spawn = originalSpawn;
  process.kill = originalProcessKill;
  process.stderr.write = originalStderrWrite;
  console.error = originalConsoleError;
  restoreTtyState();
});

describe("headless lifecycle", () => {
  test("enforces hard timeout for hung process", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    const signals: Array<string> = [];

    Bun.spawn = mock((command: unknown): BunSpawnResult => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createWhichMockProcess(true);
      }
      return mockProc.proc as unknown as BunSpawnResult;
    });

    mockProc.proc.kill = mock((signal?: number | string) => {
      signals.push(String(signal));
      if (signal === "SIGKILL") {
        mockProc.stdout.close();
        mockProc.stderr.close();
        mockProc.resolveExited(137);
      }
    });

    try {
      await invokeCursor(makeOptions({ timeoutMs: 40 }));
      throw new Error("Expected invokeCursor to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toContain("timed out");
    }

    expect(signals).toContain("SIGTERM");
    expect(signals).toContain("SIGKILL");
  });

  test("returns AgentResult after valid JSON completion", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);

    Bun.spawn = mock((command: unknown): BunSpawnResult => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createWhichMockProcess(true);
      }
      return mockProc.proc as unknown as BunSpawnResult;
    });

    const completionTimer = setTimeout(() => {
      mockProc.stdout.push(
        JSON.stringify({
          duration_ms: 123,
          result: "cursor headless success",
          session_id: "cur_int_001",
          total_cost_usd: 0.01,
          type: "result",
          usage: { input_tokens: 10, output_tokens: 2 },
        }),
      );
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(0);
    }, 5);
    activeTimers.push(completionTimer);

    const result = await invokeCursor(makeOptions({ timeoutMs: 2000 }));

    expect(result.result).toBe("cursor headless success");
    expect(result.sessionId).toBe("cur_int_001");
    expect(result.costUsd).toBe(0.01);
    expect(result.tokenUsage?.input).toBe(10);
    expect(result.tokenUsage?.output).toBe(2);
  });

  test("maps non-zero exit to failure", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);

    Bun.spawn = mock((command: unknown): BunSpawnResult => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createWhichMockProcess(true);
      }
      return mockProc.proc as unknown as BunSpawnResult;
    });

    const completionTimer = setTimeout(() => {
      mockProc.stdout.push("permission denied");
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(9);
    }, 5);
    activeTimers.push(completionTimer);

    try {
      await invokeCursor(makeOptions({ timeoutMs: 2000 }));
      throw new Error("Expected invokeCursor to throw");
    } catch (error: unknown) {
      const message = (error as Error).message;
      expect(message).toContain("exited with code 9");
      expect(message).toContain("permission denied");
    }
  });

  test("propagates malformed-output parse failure", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);

    Bun.spawn = mock((command: unknown): BunSpawnResult => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createWhichMockProcess(true);
      }
      return mockProc.proc as unknown as BunSpawnResult;
    });

    const completionTimer = setTimeout(() => {
      mockProc.stdout.push("{ definitely not valid json }");
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(0);
    }, 5);
    activeTimers.push(completionTimer);

    try {
      await invokeCursor(makeOptions({ timeoutMs: 2000 }));
      throw new Error("Expected invokeCursor to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toContain(
        "Unable to parse Cursor output",
      );
    }
  });

  test("throws clear error when cursor binary is missing", async () => {
    Bun.spawn = mock((): BunSpawnResult => createWhichMockProcess(false));

    try {
      await invokeCursor(makeOptions({ timeoutMs: 2000 }));
      throw new Error("Expected invokeCursor to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toContain(
        "Cursor binary not found in PATH",
      );
    }

    const spawnCalls = (Bun.spawn as ReturnType<typeof mock>).mock.calls;
    const whichTargets = spawnCalls
      .map((call: Array<unknown>) => parseSpawnCommand(call.at(0)).at(1))
      .filter((value): value is string => typeof value === "string");
    expect(whichTargets).toEqual(["agent", "cursor-agent"]);
  });
});

describe("supervised lifecycle", () => {
  test("requires interactive TTY before launching", async () => {
    setTtyState(false, false);

    Bun.spawn = mock(
      (): ReturnType<typeof Bun.spawn> => createWhichMockProcess(true),
    );

    try {
      await invokeCursor({
        config: { provider: "cursor" },
        mode: "supervised",
        prompt: "test prompt",
      });
      throw new Error("Expected invokeCursor to throw");
    } catch (error: unknown) {
      const { message } = error as Error;
      expect(message).toContain("interactive TTY");
      expect(message).toContain("--headless");
    }

    expect((Bun.spawn as ReturnType<typeof mock>).mock.calls).toHaveLength(0);
  });

  test("propagates interrupt for supervised process signal", async () => {
    setTtyState(true, true);

    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    const propagatedSignals: Array<string> = [];

    mockProc.proc.signalCode = "SIGINT";

    Bun.spawn = mock((command: unknown): BunSpawnResult => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createWhichMockProcess(true);
      }
      return mockProc.proc as unknown as BunSpawnResult;
    });
    process.kill = mock((pid: number, signal?: number | string) => {
      if (pid === process.pid && typeof signal === "string") {
        propagatedSignals.push(signal);
      }
      return true;
    }) as typeof process.kill;

    const completionTimer = setTimeout(() => {
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(130);
    }, 5);
    activeTimers.push(completionTimer);

    try {
      await invokeCursor({
        config: { provider: "cursor" },
        mode: "supervised",
        prompt: "test prompt",
      });
      throw new Error("Expected invokeCursor to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toContain("interrupted by SIGINT");
    }

    expect(propagatedSignals).toContain("SIGINT");
  });

  test("maps supervised non-zero exit to failure", async () => {
    setTtyState(true, true);

    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);

    Bun.spawn = mock((command: unknown): BunSpawnResult => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createWhichMockProcess(true);
      }
      return mockProc.proc as unknown as BunSpawnResult;
    });

    const completionTimer = setTimeout(() => {
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(2);
    }, 5);
    activeTimers.push(completionTimer);

    try {
      await invokeCursor({
        config: { provider: "cursor" },
        mode: "supervised",
        prompt: "test prompt",
      });
      throw new Error("Expected invokeCursor to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toContain("exited with code 2");
    }
  });

  test("returns empty result for successful supervised run", async () => {
    setTtyState(true, true);

    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);

    Bun.spawn = mock((command: unknown): BunSpawnResult => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createWhichMockProcess(true);
      }
      return mockProc.proc as unknown as BunSpawnResult;
    });

    const completionTimer = setTimeout(() => {
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(0);
    }, 5);
    activeTimers.push(completionTimer);

    const result = await invokeCursor({
      config: { provider: "cursor" },
      mode: "supervised",
      prompt: "test prompt",
    });

    expect(result.costUsd).toBe(0);
    expect(result.result).toBe("");
    expect(result.sessionId).toBe("");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    const spawnCalls = (Bun.spawn as ReturnType<typeof mock>).mock.calls;
    const supervisedCall = spawnCalls.find((call: Array<unknown>) => {
      const args = parseSpawnCommand(call.at(0));
      return args[0] === "agent";
    });

    expect(supervisedCall).toBeDefined();
  });
});

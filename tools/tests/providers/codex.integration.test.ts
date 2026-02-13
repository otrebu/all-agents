/**
 * Integration tests for Codex provider subprocess lifecycle.
 *
 * Covers hard timeout behavior, successful completion parsing, non-zero exit
 * handling, invalid JSON parsing, and supervised PTY/interrupt behavior.
 */
/* eslint-disable */

import type { InvocationOptions } from "@tools/commands/ralph/providers/types";

import { invokeCodex } from "@tools/commands/ralph/providers/codex";
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

// =============================================================================
// Mock Utilities
// =============================================================================

function createMockProcess(): {
  proc: MockSpawnProcess;
  resolveExited: (code: number) => void;
  stderr: ReturnType<typeof createMockStream>;
  stdout: ReturnType<typeof createMockStream>;
} {
  const stdoutCtrl = createMockStream();
  const stderrCtrl = createMockStream();

  // eslint-disable-next-line @typescript-eslint/init-declarations -- assigned in Promise ctor
  let resolveExited!: (code: number) => void;
  const exitedPromise = new Promise<number>((resolve) => {
    resolveExited = resolve;
  });

  const proc = {
    exitCode: null as null | number,
    exited: exitedPromise,
    kill: mock(() => {}),
    pid: 55_555,
    signalCode: null as null | string,
    stderr: stderrCtrl.stream,
    stdout: stdoutCtrl.stream,
  } as MockSpawnProcess;

  return {
    proc,
    resolveExited(code: number) {
      proc.exitCode = code;
      resolveExited(code);
    },
    stderr: stderrCtrl,
    stdout: stdoutCtrl,
  };
}

function createMockStream(): {
  close: () => void;
  push: (data: string) => void;
  stream: ReadableStream<Uint8Array>;
} {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
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
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
    push(data: string) {
      if (!isClosed) {
        controller.enqueue(encoder.encode(data));
      }
    },
    stream,
  };
}

function createWhichMockProcess(): ReturnType<typeof Bun.spawn> {
  const stdoutCtrl = createMockStream();
  const stderrCtrl = createMockStream();

  stdoutCtrl.push("/usr/local/bin/codex\n");
  stdoutCtrl.close();
  stderrCtrl.close();

  return {
    exitCode: 0,
    exited: Promise.resolve(0),
    kill: mock(() => {}),
    pid: 66_666,
    signalCode: null,
    stderr: stderrCtrl.stream,
    stdout: stdoutCtrl.stream,
  } as unknown as ReturnType<typeof Bun.spawn>;
}

function makeOptions(overrides?: {
  mode?: InvocationOptions["mode"];
  prompt?: string;
  timeoutMs?: number;
}): InvocationOptions {
  return {
    config: { provider: "codex" as const, timeoutMs: overrides?.timeoutMs },
    mode: overrides?.mode ?? "headless-async",
    prompt: overrides?.prompt ?? "test prompt",
  };
}

// =============================================================================
// Mocks and Fixtures
// =============================================================================

const originalSpawn = Bun.spawn;
const originalPrependListener = process.prependListener;
const originalRemoveListener = process.removeListener;
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

const VALID_JSONL = [
  '{"type":"thread.started","thread_id":"thread-123","timestamp":1700000000000}',
  '{"type":"text","text":"ok"}',
  '{"type":"turn.completed","timestamp":1700000000500,"part":{"message":"done","usage":{"input":10,"output":2}}}',
].join("\n");

const MALFORMED_JSONL = '{"type":"thread.started"}\n{bad json}';

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
  process.prependListener = originalPrependListener;
  process.removeListener = originalRemoveListener;
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
  process.prependListener = originalPrependListener;
  process.removeListener = originalRemoveListener;
  process.stderr.write = originalStderrWrite;
  console.error = originalConsoleError;
  restoreTtyState();
});

afterAll(() => {
  Bun.spawn = originalSpawn;
  process.prependListener = originalPrependListener;
  process.removeListener = originalRemoveListener;
  process.stderr.write = originalStderrWrite;
  console.error = originalConsoleError;
  restoreTtyState();
});

// =============================================================================
// Lifecycle Tests
// =============================================================================

describe("headless lifecycle", () => {
  test("enforces hard timeout for hung process", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);

    Bun.spawn = mock((command: unknown): ReturnType<typeof Bun.spawn> => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createWhichMockProcess();
      }
      return mockProc.proc as unknown as BunSpawnResult;
    });

    mockProc.proc.kill = mock((signal?: number | string) => {
      if (signal === "SIGKILL" || signal === "SIGTERM") {
        mockProc.stdout.close();
        mockProc.stderr.close();
        mockProc.resolveExited(137);
      }
    });

    try {
      await invokeCodex(makeOptions({ timeoutMs: 40 }));
      throw new Error("Expected invokeCodex to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toContain("timed out");
    }

    expect(mockProc.proc.kill).toHaveBeenCalledWith("SIGTERM");
  });

  test("returns AgentResult after valid JSONL completion", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);

    Bun.spawn = mock((command: unknown): ReturnType<typeof Bun.spawn> => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createWhichMockProcess();
      }
      return mockProc.proc as unknown as BunSpawnResult;
    });

    const exitTimer = setTimeout(() => {
      mockProc.stdout.push(VALID_JSONL);
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(0);
    }, 5);
    activeTimers.push(exitTimer);

    const result = await invokeCodex(makeOptions({ timeoutMs: 2000 }));

    expect(result.sessionId).toBe("thread-123");
    expect(result.costUsd).toBe(0);
    expect(result.result).toContain("ok");
  });

  test("maps non-zero exit to failure", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);

    Bun.spawn = mock((command: unknown): ReturnType<typeof Bun.spawn> => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createWhichMockProcess();
      }
      return mockProc.proc as unknown as BunSpawnResult;
    });

    const exitTimer = setTimeout(() => {
      mockProc.stderr.push("auth failed");
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(1);
    }, 5);
    activeTimers.push(exitTimer);

    try {
      await invokeCodex(makeOptions({ timeoutMs: 2000 }));
      throw new Error("Expected invokeCodex to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toContain("exited with code 1");
      expect((error as Error).message).toContain("auth failed");
    }
  });

  test("throws on malformed JSON lines", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);

    Bun.spawn = mock((command: unknown): ReturnType<typeof Bun.spawn> => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createWhichMockProcess();
      }
      return mockProc.proc as unknown as BunSpawnResult;
    });

    const exitTimer = setTimeout(() => {
      mockProc.stdout.push(MALFORMED_JSONL);
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(0);
    }, 5);
    activeTimers.push(exitTimer);

    try {
      await invokeCodex(makeOptions({ timeoutMs: 2000 }));
      throw new Error("Expected invokeCodex to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toContain("Malformed JSON");
    }
  });
});

describe("supervised lifecycle", () => {
  test("requires interactive TTY before launching", async () => {
    setTtyState(false, false);
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);

    Bun.spawn = mock(
      (): ReturnType<typeof Bun.spawn> => createWhichMockProcess(),
    );

    try {
      await invokeCodex({
        config: { provider: "codex" },
        mode: "supervised",
        prompt: "test prompt",
      });
      throw new Error("Expected invokeCodex to throw");
    } catch (error: unknown) {
      const { message } = error as Error;
      expect(message).toContain("interactive TTY");
      expect(message).toContain("--headless");
    }

    const spawnCalls = (Bun.spawn as ReturnType<typeof mock>).mock.calls;
    const didSpawnInteractive = spawnCalls.some((call: Array<unknown>) => {
      const args = parseSpawnCommand(call.at(0));
      return args[0] === "codex" && args[1] !== "resume";
    });
    expect(didSpawnInteractive).toBe(false);
  });

  test("handles interrupt in supervised mode by propagating error", async () => {
    setTtyState(true, true);
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    const signals: Array<string> = [];

    Bun.spawn = mock((command: unknown): ReturnType<typeof Bun.spawn> => {
      const args = parseSpawnCommand(command);
      if (args[0] === "which") {
        return createWhichMockProcess();
      }
      return mockProc.proc as unknown as ReturnType<typeof Bun.spawn>;
    });

    mockProc.proc.kill = mock((signal?: number | string) => {
      signals.push(String(signal));
      if (signal === "SIGKILL") {
        mockProc.stdout.close();
        mockProc.stderr.close();
        mockProc.resolveExited(137);
      }
    });

    const signalListeners = new Map<string, () => void>();
    process.prependListener = mock((event: string, listener: () => void) => {
      signalListeners.set(event, listener);
      return process;
    }) as typeof process.prependListener;
    process.removeListener = mock((event: string, listener: () => void) => {
      const current = signalListeners.get(event);
      if (current === listener) {
        signalListeners.delete(event);
      }
      return process;
    }) as typeof process.removeListener;

    const interruptTimer = setTimeout(() => {
      signalListeners.get("SIGINT")?.();
    }, 5);
    activeTimers.push(interruptTimer);

    try {
      await invokeCodex({
        config: { provider: "codex" },
        mode: "supervised",
        prompt: "test prompt",
      });
      throw new Error("Expected invokeCodex to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toContain("interrupted by SIGINT");
    }

    expect(signals).toContain("SIGTERM");
    expect(signals).toContain("SIGKILL");
  });
});

/**
 * Integration tests for OpenCode provider lifecycle handling.
 *
 * Tests the `invokeOpencode` function's process lifecycle using mocked
 * Bun.spawn processes to simulate:
 * - Issue #8203: hung process that never exits and produces no output
 * - Normal completion before timeout
 * - Error exit before timeout
 * - Process that outputs then hangs
 * - Supervised PTY gating and interruption cleanup
 * - Supervised session ID capture
 *
 * All tests use short timeouts (10-100ms) for fast, deterministic execution.
 *
 * @see docs/planning/milestones/004-MULTI-CLI/tasks/TASK-048-opencode-timeout-tests.md
 */

import type { InvocationOptions } from "@tools/commands/ralph/providers/types";

import { invokeOpencode } from "@tools/commands/ralph/providers/opencode";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";

// =============================================================================
// Mock Utilities
// =============================================================================

/**
 * Create a mock process object compatible with the return type of Bun.spawn.
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

  // eslint-disable-next-line @typescript-eslint/init-declarations -- assigned synchronously in Promise constructor
  let resolveExited!: (value: number) => void;
  // eslint-disable-next-line promise/avoid-new -- Controllable mock promise
  const exitedPromise = new Promise<number>((resolve) => {
    resolveExited = resolve;
  });

  const proc = {
    exitCode: null as null | number,
    exited: exitedPromise,
    kill: mock(() => {}),
    pid: 88_888,
    signalCode: null as null | string,
    stderr: stderrCtrl.stream,
    stdout: stdoutCtrl.stream,
  };

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

/**
 * Create a controllable ReadableStream that mimics subprocess stdout/stderr.
 */
function createMockStream(): {
  close: () => void;
  push: (data: string) => void;
  stream: ReadableStream<Uint8Array>;
} {
  // eslint-disable-next-line @typescript-eslint/init-declarations -- assigned synchronously in start()
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

/**
 * Create a mock process for `opencode session list --format json`.
 */
function createSessionListMockProcess(
  jsonOutput: string,
): ReturnType<typeof createMockProcess>["proc"] {
  const stdoutCtrl = createMockStream();
  const stderrCtrl = createMockStream();

  stdoutCtrl.push(jsonOutput);
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
  };
}

/**
 * Create a mock process for the `which opencode` availability check.
 * Always exits with code 0 (binary found).
 */
function createWhichMockProcess(): ReturnType<
  typeof createMockProcess
>["proc"] {
  const stdoutCtrl = createMockStream();
  const stderrCtrl = createMockStream();

  stdoutCtrl.push("/usr/local/bin/opencode\n");
  stdoutCtrl.close();
  stderrCtrl.close();

  return {
    exitCode: 0,
    exited: Promise.resolve(0),
    kill: mock(() => {}),
    pid: 77_777,
    signalCode: null,
    stderr: stderrCtrl.stream,
    stdout: stdoutCtrl.stream,
  };
}

/**
 * Install a Bun.spawn mock that routes `which` calls to an availability mock
 * and `opencode` calls to the provided mock process.
 */
function installSpawnMock(
  mainMock: ReturnType<typeof createMockProcess>,
  options?: { sessionListJson?: string },
): void {
  const sessionListJson = options?.sessionListJson ?? "[]";

  Object.assign(Bun, {
    spawn: mock((cmd: unknown) => {
      const commandArguments = cmd as Array<string>;
      if (commandArguments[0] === "which") {
        return createWhichMockProcess();
      }
      if (
        commandArguments[0] === "opencode" &&
        commandArguments[1] === "session" &&
        commandArguments[2] === "list"
      ) {
        return createSessionListMockProcess(sessionListJson);
      }
      return mainMock.proc;
    }),
  });
}

/** Standard invocation options with short timeout for testing */
function makeOptions(overrides?: {
  mode?: InvocationOptions["mode"];
  timeoutMs?: number;
}): InvocationOptions {
  return {
    config: {
      provider: "opencode" as const,
      timeoutMs: overrides?.timeoutMs ?? 50,
    },
    mode: overrides?.mode ?? "headless-sync",
    prompt: "test prompt",
  };
}

// =============================================================================
// JSONL Fixtures (inline for integration tests)
// =============================================================================

const VALID_JSONL = [
  '{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_int_001"}',
  '{"type":"text","timestamp":1704067200100,"part":{"text":"Integration test result."}}',
  '{"type":"step_finish","timestamp":1704067201000,"part":{"reason":"stop","cost":0.005,"tokens":{"input":2000,"output":500,"reasoning":0,"cacheRead":0,"cacheWrite":0}}}',
].join("\n");

// =============================================================================
// Test Setup / Teardown
// =============================================================================

const originalSpawn = Bun.spawn;
const originalStderrWrite = process.stderr.write;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalPrependListener = process.prependListener;
const originalRemoveListener = process.removeListener;
const originalStdinIsTTYDescriptor = Object.getOwnPropertyDescriptor(
  process.stdin,
  "isTTY",
);
const originalStdoutIsTTYDescriptor = Object.getOwnPropertyDescriptor(
  process.stdout,
  "isTTY",
);

/** Track mock processes for cleanup */
let activeMockProcesses: Array<{
  resolveExited: (code: number) => void;
  stderr: ReturnType<typeof createMockStream>;
  stdout: ReturnType<typeof createMockStream>;
}> = [];

/** Track active timers for cleanup */
const activeTimers: Array<ReturnType<typeof setTimeout>> = [];

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

beforeEach(() => {
  activeMockProcesses = [];

  // Suppress noisy stderr/console output during tests
  process.stderr.write = mock(() => true) as typeof process.stderr.write;
  console.error = mock(() => {});
  console.warn = mock(() => {});
  process.prependListener = originalPrependListener;
  process.removeListener = originalRemoveListener;
  restoreTtyState();
});

afterEach(() => {
  // Kill all mock processes
  for (const mockProcess of activeMockProcesses) {
    mockProcess.stdout.close();
    mockProcess.stderr.close();
    mockProcess.resolveExited(137);
  }
  activeMockProcesses = [];

  // Clear all tracked timers
  for (const timer of activeTimers) {
    clearTimeout(timer);
  }
  activeTimers.length = 0;

  // Restore mocks
  Bun.spawn = originalSpawn;
  process.stderr.write = originalStderrWrite;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  process.prependListener = originalPrependListener;
  process.removeListener = originalRemoveListener;
  restoreTtyState();
});

afterAll(() => {
  Bun.spawn = originalSpawn;
  process.stderr.write = originalStderrWrite;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  process.prependListener = originalPrependListener;
  process.removeListener = originalRemoveListener;
  restoreTtyState();
});

// =============================================================================
// Hung Process — Issue #8203 (no output, never exits)
// =============================================================================

describe("hung process (Issue #8203)", () => {
  test("SIGKILL sent after hard timeout for process that never exits", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    // Track kill signals
    const signals: Array<string> = [];
    mockProc.proc.kill = mock((signal?: number | string) => {
      signals.push(signal as string);
      if (signal === "SIGKILL") {
        mockProc.stdout.close();
        mockProc.stderr.close();
        mockProc.resolveExited(137);
      }
    });

    try {
      await invokeOpencode(makeOptions({ timeoutMs: 50 }));
      throw new Error("Expected invokeOpencode to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toMatch(/timed out/i);
    }

    // killProcessGracefully(proc, 0) sends SIGTERM then immediately SIGKILL
    expect(signals).toContain("SIGTERM");
    expect(signals).toContain("SIGKILL");
  });

  test("timeout error message references Issue #8203", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    mockProc.proc.kill = mock((signal?: number | string) => {
      if (signal === "SIGKILL") {
        mockProc.stdout.close();
        mockProc.stderr.close();
        mockProc.resolveExited(137);
      }
    });

    try {
      await invokeOpencode(makeOptions({ timeoutMs: 50 }));
      throw new Error("Expected invokeOpencode to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toMatch(/8203/);
    }
  });

  test("console.error log references Issue #8203 on timeout", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    mockProc.proc.kill = mock((signal?: number | string) => {
      if (signal === "SIGKILL") {
        mockProc.stdout.close();
        mockProc.stderr.close();
        mockProc.resolveExited(137);
      }
    });

    try {
      await invokeOpencode(makeOptions({ timeoutMs: 50 }));
    } catch {
      // Expected to throw
    }

    // Verify console.error was called with Issue #8203 reference
    const errorCalls = (console.error as ReturnType<typeof mock>).mock.calls;
    const hasIssueReference = errorCalls.some((call: Array<unknown>) =>
      String(call[0]).includes("Issue #8203"),
    );
    expect(hasIssueReference).toBe(true);
  });

  test("timeout triggers within expected duration", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    mockProc.proc.kill = mock((signal?: number | string) => {
      if (signal === "SIGKILL") {
        mockProc.stdout.close();
        mockProc.stderr.close();
        mockProc.resolveExited(137);
      }
    });

    const startTime = Date.now();

    try {
      await invokeOpencode(makeOptions({ timeoutMs: 80 }));
    } catch {
      // Expected
    }

    const elapsed = Date.now() - startTime;
    // Should trigger around 80ms — allow generous margin for CI
    expect(elapsed).toBeGreaterThanOrEqual(60);
    expect(elapsed).toBeLessThan(500);
  });
});

// =============================================================================
// Normal Completion — Process exits before timeout
// =============================================================================

describe("normal completion before timeout", () => {
  test("returns AgentResult when process completes successfully", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    // Process completes quickly with valid JSONL
    setTimeout(() => {
      mockProc.stdout.push(VALID_JSONL);
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(0);
    }, 5);

    const result = await invokeOpencode(makeOptions({ timeoutMs: 2000 }));

    expect(result.result).toBe("Integration test result.");
    expect(result.costUsd).toBe(0.005);
    expect(result.sessionId).toBe("ses_int_001");
  });

  test("does not send SIGKILL on normal completion", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    const signals: Array<string> = [];
    mockProc.proc.kill = mock((signal?: number | string) => {
      signals.push(signal as string);
    });

    setTimeout(() => {
      mockProc.stdout.push(VALID_JSONL);
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(0);
    }, 5);

    await invokeOpencode(makeOptions({ timeoutMs: 2000 }));

    expect(signals).not.toContain("SIGKILL");
    expect(signals).not.toContain("SIGTERM");
  });

  test("does not throw timeout error on normal completion", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    setTimeout(() => {
      mockProc.stdout.push(VALID_JSONL);
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(0);
    }, 5);

    // Should resolve, not reject
    const result = await invokeOpencode(makeOptions({ timeoutMs: 2000 }));
    expect(result).toBeDefined();
    expect(result.result).toBeTruthy();
  });
});

// =============================================================================
// Error Exit — Process errors before timeout
// =============================================================================

describe("error exit before timeout", () => {
  test("propagates original error on non-zero exit code", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    setTimeout(() => {
      mockProc.stderr.push("API key invalid");
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(1);
    }, 5);

    try {
      await invokeOpencode(makeOptions({ timeoutMs: 2000 }));
      throw new Error("Expected invokeOpencode to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toMatch(/exited with code 1/i);
    }
  });

  test("error includes stderr content", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    setTimeout(() => {
      mockProc.stderr.push("rate limit exceeded");
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(1);
    }, 5);

    try {
      await invokeOpencode(makeOptions({ timeoutMs: 2000 }));
      throw new Error("Expected invokeOpencode to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toMatch(/rate limit exceeded/);
    }
  });

  test("does not trigger timeout on early error exit", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    const signals: Array<string> = [];
    mockProc.proc.kill = mock((signal?: number | string) => {
      signals.push(signal as string);
    });

    setTimeout(() => {
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(2);
    }, 5);

    try {
      await invokeOpencode(makeOptions({ timeoutMs: 2000 }));
    } catch {
      // Expected error
    }

    // No signals should have been sent — error exit, not timeout
    expect(signals).not.toContain("SIGKILL");
    expect(signals).not.toContain("SIGTERM");
  });

  test("error message does not reference Issue #8203 on normal error", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    setTimeout(() => {
      mockProc.stderr.push("some error");
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(1);
    }, 5);

    try {
      await invokeOpencode(makeOptions({ timeoutMs: 2000 }));
      throw new Error("Expected invokeOpencode to throw");
    } catch (error: unknown) {
      const { message } = error as Error;
      // Normal error exit should reference exit code, not Issue #8203 timeout
      expect(message).toContain("exited with code 1");
      expect(message).not.toContain("timed out");
    }
  });
});

// =============================================================================
// Output Then Hang — Process outputs then hangs
// =============================================================================

describe("process that outputs then hangs", () => {
  test("hard timeout still triggers SIGKILL when process outputs then hangs", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    const signals: Array<string> = [];
    mockProc.proc.kill = mock((signal?: number | string) => {
      signals.push(signal as string);
      if (signal === "SIGKILL") {
        mockProc.stdout.close();
        mockProc.stderr.close();
        mockProc.resolveExited(137);
      }
    });

    // Push partial output (step_start + text, but no step_finish) then hang
    setTimeout(() => {
      mockProc.stdout.push(
        '{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_hang"}\n' +
          '{"type":"text","timestamp":1704067200100,"part":{"text":"Partial output before hang."}}\n',
      );
      // Process does NOT close stdout, does NOT exit — simulates hang after partial output
    }, 5);

    try {
      await invokeOpencode(makeOptions({ timeoutMs: 80 }));
      throw new Error("Expected invokeOpencode to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toMatch(/timed out/i);
    }

    expect(signals).toContain("SIGKILL");
  });

  test("timeout error still references Issue #8203 when output precedes hang", async () => {
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    mockProc.proc.kill = mock((signal?: number | string) => {
      if (signal === "SIGKILL") {
        mockProc.stdout.close();
        mockProc.stderr.close();
        mockProc.resolveExited(137);
      }
    });

    // Push some output then hang
    setTimeout(() => {
      mockProc.stdout.push(
        '{"type":"step_start","timestamp":1704067200000,"sessionID":"ses_hang2"}\n',
      );
    }, 5);

    try {
      await invokeOpencode(makeOptions({ timeoutMs: 80 }));
      throw new Error("Expected invokeOpencode to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toMatch(/8203/);
    }
  });
});

// =============================================================================
// Supervised Lifecycle
// =============================================================================

describe("supervised lifecycle", () => {
  test("fails with clear guidance when no interactive TTY is available", async () => {
    setTtyState(false, false);

    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);
    installSpawnMock(mockProc);

    try {
      await invokeOpencode(
        makeOptions({ mode: "supervised", timeoutMs: 2000 }),
      );
      throw new Error("Expected invokeOpencode to throw");
    } catch (error: unknown) {
      const { message } = error as Error;
      expect(message).toContain("requires an interactive TTY");
      expect(message).toContain("--headless");
    }

    // `which opencode` is called, but interactive spawn should never run.
    const spawnCalls = (Bun.spawn as ReturnType<typeof mock>).mock.calls;
    const didSpawnInteractiveOpencode = spawnCalls.some(
      (call: Array<unknown>) => {
        const [args] = call as [Array<string>];
        return args[0] === "opencode" && args[1] !== "session";
      },
    );
    expect(didSpawnInteractiveOpencode).toBe(false);
  });

  test("captures session ID after successful interactive supervised run", async () => {
    setTtyState(true, true);

    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);

    // Use process.cwd() so the directory-match tier in resolveSupervisedSessionId
    // always selects the correct session regardless of which CWD the test runner uses.
    // Previously hardcoded to "/home/otrebu/dev/all-agents/tools", which only matched
    // when tests ran from that exact directory — causing flaky session ID resolution.
    const expectedDirectory = process.cwd();

    installSpawnMock(mockProc, {
      sessionListJson: JSON.stringify([
        {
          directory: expectedDirectory,
          id: "ses_supervised_001",
          updated: Date.now() + 1000,
        },
        {
          directory: "/tmp/other-project",
          id: "ses_other_project",
          updated: Date.now() + 2000,
        },
      ]),
    });

    const completeTimer = setTimeout(() => {
      mockProc.stdout.close();
      mockProc.stderr.close();
      mockProc.resolveExited(0);
    }, 5);
    activeTimers.push(completeTimer);

    const result = await invokeOpencode(
      makeOptions({ mode: "supervised", timeoutMs: 2000 }),
    );

    expect(result.sessionId).toBe("ses_supervised_001");
    expect(result.result).toBe("");
    expect(result.costUsd).toBe(0);
  });

  test("interrupt path terminates supervised provider process", async () => {
    setTtyState(true, true);

    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);

    const signals: Array<string> = [];
    mockProc.proc.kill = mock((signal?: number | string) => {
      signals.push(String(signal));
      if (signal === "SIGKILL") {
        mockProc.stdout.close();
        mockProc.stderr.close();
        mockProc.resolveExited(137);
      }
    });

    installSpawnMock(mockProc);

    const signalHandlers = new Map<string, () => void>();
    process.prependListener = mock((event: string, listener: () => void) => {
      signalHandlers.set(event, listener);
      return process;
    }) as typeof process.prependListener;
    process.removeListener = mock((event: string, listener: () => void) => {
      const current = signalHandlers.get(event);
      if (current === listener) {
        signalHandlers.delete(event);
      }
      return process;
    }) as typeof process.removeListener;

    const interruptTimer = setTimeout(() => {
      signalHandlers.get("SIGINT")?.();
    }, 5);
    activeTimers.push(interruptTimer);

    try {
      await invokeOpencode(
        makeOptions({ mode: "supervised", timeoutMs: 2000 }),
      );
      throw new Error("Expected invokeOpencode to throw");
    } catch (error: unknown) {
      expect((error as Error).message).toContain("interrupted by SIGINT");
    }

    expect(signals).toContain("SIGTERM");
    expect(signals).toContain("SIGKILL");
  });
});

// =============================================================================
// Cleanup Verification
// =============================================================================

describe("cleanup", () => {
  test("afterEach kills all tracked mock processes", () => {
    // This test verifies the cleanup mechanism works by creating a mock process
    // and confirming that the test infrastructure properly tracks it
    const mockProc = createMockProcess();
    activeMockProcesses.push(mockProc);

    // The activeMockProcesses array should contain our mock
    expect(activeMockProcesses.length).toBe(1);
    // afterEach will clean this up — verified by subsequent tests not seeing stale state
  });

  test("no stale processes from previous tests", () => {
    // If afterEach cleanup worked, activeMockProcesses is empty at the start
    // (beforeEach resets it)
    expect(activeMockProcesses.length).toBe(0);
  });

  test("Bun.spawn is restored after each test", () => {
    // If afterEach cleanup worked, Bun.spawn should be the original
    expect(Bun.spawn).toBe(originalSpawn);
  });
});

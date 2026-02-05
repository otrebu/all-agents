import {
  createStallDetector,
  createTimeoutPromise,
  killProcessGracefully,
  markTimerAsNonBlocking,
  parseJsonl,
  tryParseJson,
} from "@tools/commands/ralph/providers/utils";
import { afterEach, describe, expect, test } from "bun:test";

// =============================================================================
// tryParseJson Tests
// =============================================================================

describe("tryParseJson", () => {
  test("parses valid JSON object", () => {
    const result = tryParseJson<{ name: string }>('{"name":"alice"}');
    expect(result).toEqual({ name: "alice" });
  });

  test("parses valid JSON array", () => {
    const result = tryParseJson<Array<number>>("[1,2,3]");
    expect(result).toEqual([1, 2, 3]);
  });

  test("parses valid JSON primitives", () => {
    expect(tryParseJson<number>("42")).toBe(42);
    expect(tryParseJson<string>('"hello"')).toBe("hello");
    expect(tryParseJson<boolean>("true")).toBe(true);
    expect(tryParseJson<null>("null")).toBeNull();
  });

  test("returns defaultValue for invalid JSON", () => {
    const fallback = { error: true };
    const result = tryParseJson<{ error: boolean }>("not valid json", fallback);
    expect(result).toBe(fallback);
  });

  test("returns undefined when no defaultValue and JSON is invalid", () => {
    const result = tryParseJson("{{broken}}");
    expect(result).toBeUndefined();
  });

  test("returns defaultValue for empty string", () => {
    const result = tryParseJson<Array<unknown>>("", []);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// parseJsonl Tests
// =============================================================================

describe("parseJsonl", () => {
  test("parses multiple JSON lines", () => {
    const input = '{"a":1}\n{"a":2}\n{"a":3}';
    const result = parseJsonl<{ a: number }>(input);
    expect(result).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
  });

  test("filters out empty lines", () => {
    const input = '{"a":1}\n\n\n{"a":2}\n';
    const result = parseJsonl<{ a: number }>(input);
    expect(result).toEqual([{ a: 1 }, { a: 2 }]);
  });

  test("filters out whitespace-only lines", () => {
    const input = '{"a":1}\n   \n\t\n{"a":2}';
    const result = parseJsonl<{ a: number }>(input);
    expect(result).toEqual([{ a: 1 }, { a: 2 }]);
  });

  test("handles invalid JSON lines gracefully (drops them)", () => {
    const input = '{"a":1}\nnot json\n{"a":3}';
    const result = parseJsonl<{ a: number }>(input);
    expect(result).toEqual([{ a: 1 }, { a: 3 }]);
  });

  test("returns empty array for empty string", () => {
    expect(parseJsonl("")).toEqual([]);
  });

  test("returns empty array when all lines are invalid", () => {
    expect(parseJsonl("bad\nworse\nterrible")).toEqual([]);
  });
});

// =============================================================================
// createTimeoutPromise Tests
// =============================================================================

describe("createTimeoutPromise", () => {
  test("resolves with specified outcome after timeout", async () => {
    const start = Date.now();
    const result = await createTimeoutPromise(50, "done");
    const elapsed = Date.now() - start;

    expect(result).toBe("done");
    // Allow small timing variance
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  test("resolves with typed outcome", async () => {
    const result = await createTimeoutPromise<"hard_timeout">(
      10,
      "hard_timeout",
    );
    expect(result).toBe("hard_timeout");
  });
});

// =============================================================================
// createStallDetector Tests
// =============================================================================

describe("createStallDetector", () => {
  // eslint-disable-next-line @typescript-eslint/init-declarations -- afterEach handles reassignment
  let cleanupFunction: (() => void) | undefined;

  afterEach(() => {
    cleanupFunction?.();
    cleanupFunction = undefined;
  });

  test("resolves to stall_timeout when activity stops", async () => {
    const activityTime = Date.now();
    const detector = createStallDetector(() => activityTime, 50);
    cleanupFunction = detector.cleanup;

    const result = await detector.promise;
    expect(result).toBe("stall_timeout");
  });

  test("cleanup prevents resolution", async () => {
    const detector = createStallDetector(() => Date.now(), 50);
    // Immediately clean up — the promise should never resolve
    detector.cleanup();

    const raceResult = await Promise.race([
      detector.promise.then(() => "resolved" as const),
      createTimeoutPromise(100, "not_resolved" as const),
    ]);

    expect(raceResult).toBe("not_resolved");
  });

  test("delays resolution while activity is recent", async () => {
    let lastActivity = Date.now();
    const detector = createStallDetector(() => lastActivity, 80);
    cleanupFunction = detector.cleanup;

    // Simulate continued activity for 60ms (less than stall threshold)
    const intervalId = setInterval(() => {
      lastActivity = Date.now();
    }, 20);

    // After 60ms stop activity
    setTimeout(() => {
      clearInterval(intervalId);
    }, 60);

    const start = Date.now();
    const result = await detector.promise;
    const elapsed = Date.now() - start;

    expect(result).toBe("stall_timeout");
    // Should take at least 60ms (activity) + 80ms (stall) ≈ 140ms
    // Use generous lower bound due to timer granularity
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});

// =============================================================================
// killProcessGracefully Tests
// =============================================================================

describe("killProcessGracefully", () => {
  test("sends SIGTERM first", async () => {
    // Spawn a process that sleeps for a long time
    const proc = Bun.spawn(["sleep", "60"], {
      stderr: "pipe",
      stdin: "ignore",
      stdout: "pipe",
    });

    // Give it a moment to start
    await Bun.sleep(20);

    await killProcessGracefully(proc, 500);

    // Process should be dead - SIGTERM exit code is 143 (128 + 15)
    const exitCode = await proc.exited;
    expect(exitCode === 143 || proc.signalCode === "SIGTERM").toBe(true);
  });

  test("sends SIGKILL after grace period if process ignores SIGTERM", async () => {
    // Spawn a process that traps SIGTERM and ignores it
    const proc = Bun.spawn(["bash", "-c", "trap '' TERM; sleep 60"], {
      stderr: "pipe",
      stdin: "ignore",
      stdout: "pipe",
    });

    await Bun.sleep(50);

    const start = Date.now();
    await killProcessGracefully(proc, 200);
    const elapsed = Date.now() - start;

    // Should have waited ~200ms grace period before SIGKILL
    expect(elapsed).toBeGreaterThanOrEqual(150);

    // SIGKILL exit code is 137 (128 + 9)
    const exitCode = await proc.exited;
    expect(exitCode === 137 || proc.signalCode === "SIGKILL").toBe(true);
  });

  test("handles already-dead process gracefully", async () => {
    const proc = Bun.spawn(["true"], {
      stderr: "pipe",
      stdin: "ignore",
      stdout: "pipe",
    });
    // Wait for it to finish naturally
    await proc.exited;

    // Should not throw
    await killProcessGracefully(proc, 100);
  });
});

// =============================================================================
// markTimerAsNonBlocking Tests
// =============================================================================

describe("markTimerAsNonBlocking", () => {
  test("does not throw on a regular timer", () => {
    const timer = setTimeout(() => {}, 1000);
    expect(() => {
      markTimerAsNonBlocking(timer);
    }).not.toThrow();
    clearTimeout(timer);
  });
});

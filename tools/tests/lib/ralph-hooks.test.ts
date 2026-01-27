/**
 * Unit tests for Ralph hooks module
 *
 * Tests:
 * - hookNameToEventName conversion
 * - executeNotifyAction CLI invocation pattern
 */

import type { RalphConfig } from "@tools/commands/ralph/types";
import type { Subprocess } from "bun";

import { hookNameToEventName } from "@tools/commands/ralph/hooks";
import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

/**
 * Minimal mock subprocess for testing Bun.spawn calls.
 * Only includes fields used by executeNotifyAction.
 */
type MockSubprocess = Pick<
  Subprocess,
  "exitCode" | "exited" | "stderr" | "stdout"
>;

// Helper to create minimal valid RalphConfig
function createConfig(ntfy: { server: string; topic: string }): RalphConfig {
  return { hooks: {}, ntfy, selfImprovement: { mode: "suggest" } };
}

describe("hookNameToEventName", () => {
  test("converts onMaxIterationsExceeded to ralph:maxIterationsExceeded", () => {
    expect(hookNameToEventName("onMaxIterationsExceeded")).toBe(
      "ralph:maxIterationsExceeded",
    );
  });

  test("converts onMilestoneComplete to ralph:milestoneComplete", () => {
    expect(hookNameToEventName("onMilestoneComplete")).toBe(
      "ralph:milestoneComplete",
    );
  });

  test("converts onSubtaskComplete to ralph:subtaskComplete", () => {
    expect(hookNameToEventName("onSubtaskComplete")).toBe(
      "ralph:subtaskComplete",
    );
  });

  test("converts onValidationFail to ralph:validationFail", () => {
    expect(hookNameToEventName("onValidationFail")).toBe(
      "ralph:validationFail",
    );
  });

  test("converts onIterationComplete to ralph:iterationComplete", () => {
    expect(hookNameToEventName("onIterationComplete")).toBe(
      "ralph:iterationComplete",
    );
  });

  test("handles hook names without on prefix", () => {
    expect(hookNameToEventName("customHook")).toBe("ralph:customHook");
  });

  test("handles single character after on prefix", () => {
    expect(hookNameToEventName("onX")).toBe("ralph:x");
  });
});

describe("executeNotifyAction CLI invocation", () => {
  // Track original Bun.spawn for restoration
  const originalSpawn = Bun.spawn;
  let spawnCalls: Array<{ cmd: ReadonlyArray<string>; options: unknown }> = [];

  beforeEach(() => {
    spawnCalls = [];
  });

  afterAll(() => {
    // Restore original spawn
    Bun.spawn = originalSpawn;
  });

  test("executeNotifyAction calls CLI with correct arguments", async () => {
    // Import the module fresh to test
    const { executeNotifyAction } = await import("@tools/commands/ralph/hooks");

    // Create a mock spawn that records calls and returns success
    const mockSpawn = mock(
      (cmd: ReadonlyArray<string>, options: unknown): MockSubprocess => {
        spawnCalls.push({ cmd, options });
        return {
          exitCode: 0,
          exited: Promise.resolve(0),
          stderr: new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
          stdout: new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
        };
      },
    );

    // Override Bun.spawn with mock (test-only mutation)
    Object.assign(Bun, { spawn: mockSpawn });

    const didSend = await executeNotifyAction(
      "onMaxIterationsExceeded",
      { message: "Test message" },
      createConfig({ server: "", topic: "test" }),
    );

    expect(didSend).toBe(true);
    expect(spawnCalls.length).toBe(1);

    const call = spawnCalls[0];
    if (call === undefined) {
      throw new Error("Expected spawn call to be recorded");
    }
    expect(call.cmd[0]).toBe("aaa");
    expect(call.cmd[1]).toBe("notify");
    expect(call.cmd[2]).toBe("--event");
    expect(call.cmd[3]).toBe("ralph:maxIterationsExceeded");
    expect(call.cmd[4]).toBe("--quiet");
    expect(call.cmd[5]).toBe("Test message");
  });

  test("executeNotifyAction returns false on CLI failure", async () => {
    const { executeNotifyAction } = await import("@tools/commands/ralph/hooks");

    // Mock spawn that returns non-zero exit
    const mockSpawn = mock((): MockSubprocess => {
      return {
        exitCode: 1,
        exited: Promise.resolve(1),
        stderr: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("Error message"));
            controller.close();
          },
        }),
        stdout: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
      };
    });

    // Override Bun.spawn with mock (test-only mutation)
    Object.assign(Bun, { spawn: mockSpawn });

    const didSend = await executeNotifyAction(
      "onMaxIterationsExceeded",
      { message: "Test message" },
      createConfig({ server: "", topic: "test" }),
    );

    expect(didSend).toBe(false);
  });
});

describe("executeNotifyFallback", () => {
  const originalFetch = globalThis.fetch;

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns false when ntfy topic not configured", async () => {
    const { executeNotifyFallback } =
      await import("@tools/commands/ralph/hooks");

    const didSend = await executeNotifyFallback(
      "onMaxIterationsExceeded",
      { message: "Test message" },
      createConfig({ server: "", topic: "" }),
    );

    expect(didSend).toBe(false);
  });

  test("returns false when ntfy topic is placeholder", async () => {
    const { executeNotifyFallback } =
      await import("@tools/commands/ralph/hooks");

    const didSend = await executeNotifyFallback(
      "onMaxIterationsExceeded",
      { message: "Test message" },
      createConfig({ server: "", topic: "your-ntfy-topic" }),
    );

    expect(didSend).toBe(false);
  });

  test("sends notification via fetch when configured", async () => {
    const { executeNotifyFallback } =
      await import("@tools/commands/ralph/hooks");

    let didCallFetch = false;
    let fetchUrl = "";
    let fetchOptions: RequestInit = {};

    globalThis.fetch = mock(
      // eslint-disable-next-line @typescript-eslint/require-await -- Mock fetch returns Promise
      async (url: string | URL, options?: RequestInit): Promise<Response> => {
        didCallFetch = true;
        fetchUrl = url.toString();
        fetchOptions = options ?? {};
        return new Response("OK", { status: 200 });
      },
    ) as unknown as typeof fetch;

    const didSend = await executeNotifyFallback(
      "onMaxIterationsExceeded",
      { message: "Test message" },
      createConfig({ server: "https://test.ntfy.sh", topic: "test-topic" }),
    );

    expect(didSend).toBe(true);
    expect(didCallFetch).toBe(true);
    expect(fetchUrl).toBe("https://test.ntfy.sh/test-topic");
    expect(fetchOptions.method).toBe("POST");
    expect(fetchOptions.body).toBe("Test message");
  });

  test("uses default server when not specified", async () => {
    const { executeNotifyFallback } =
      await import("@tools/commands/ralph/hooks");

    let fetchUrl = "";

    globalThis.fetch = mock(
      // eslint-disable-next-line @typescript-eslint/require-await -- Mock fetch returns Promise
      async (url: string | URL): Promise<Response> => {
        fetchUrl = url.toString();
        return new Response("OK", { status: 200 });
      },
    ) as unknown as typeof fetch;

    await executeNotifyFallback(
      "onMaxIterationsExceeded",
      { message: "Test message" },
      createConfig({ server: "", topic: "test-topic" }),
    );

    expect(fetchUrl).toBe("https://ntfy.sh/test-topic");
  });
});

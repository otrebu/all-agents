/**
 * Unit tests for Ralph hooks module
 *
 * Tests:
 * - hookNameToEventName conversion
 * - executeNotifyAction CLI invocation pattern
 */

import type { Subprocess } from "bun";

import {
  formatNotificationMessage,
  hookNameToEventName,
} from "@tools/commands/ralph/hooks";
import * as configLoader from "@tools/lib/config/loader";
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

/**
 * Minimal mock subprocess for testing Bun.spawn calls.
 * Only includes fields used by executeNotifyAction.
 */
type MockSubprocess = Pick<
  Subprocess,
  "exitCode" | "exited" | "stderr" | "stdout"
>;

// =============================================================================
// formatNotificationMessage Tests
// =============================================================================

describe("formatNotificationMessage", () => {
  test("returns base message only when no metrics present", () => {
    const result = formatNotificationMessage("onSubtaskComplete", {
      message: "Completed SUB-190",
    });

    expect(result).toBe("Completed SUB-190");
  });

  test("appends all metrics when fully populated", () => {
    const result = formatNotificationMessage("onSubtaskComplete", {
      costUsd: 0.23,
      filesChanged: 3,
      linesAdded: 45,
      linesRemoved: 12,
      message: "Completed SUB-190",
      sessionId: "abc12345-defg-6789-hijk",
    });

    expect(result).toBe(
      "Completed SUB-190\nFiles: 3 | Lines: +45/-12 | Cost: $0.23 | Session: abc12345",
    );
  });

  test("handles partial metrics - only files changed", () => {
    const result = formatNotificationMessage("onSubtaskComplete", {
      filesChanged: 5,
      message: "Test message",
    });

    expect(result).toBe("Test message\nFiles: 5");
  });

  test("handles partial metrics - only lines added", () => {
    const result = formatNotificationMessage("onSubtaskComplete", {
      linesAdded: 100,
      message: "Test message",
    });

    expect(result).toBe("Test message\nLines: +100/-0");
  });

  test("handles partial metrics - only lines removed", () => {
    const result = formatNotificationMessage("onSubtaskComplete", {
      linesRemoved: 50,
      message: "Test message",
    });

    expect(result).toBe("Test message\nLines: +0/-50");
  });

  test("handles partial metrics - only cost", () => {
    const result = formatNotificationMessage("onSubtaskComplete", {
      costUsd: 1.5,
      message: "Test message",
    });

    expect(result).toBe("Test message\nCost: $1.50");
  });

  test("handles partial metrics - only session ID", () => {
    const result = formatNotificationMessage("onSubtaskComplete", {
      message: "Test message",
      sessionId: "12345678-1234-1234-1234-123456789012",
    });

    expect(result).toBe("Test message\nSession: 12345678");
  });

  test("truncates session ID to first 8 characters", () => {
    const result = formatNotificationMessage("onSubtaskComplete", {
      message: "Test",
      sessionId: "abcdefghijklmnop",
    });

    expect(result).toBe("Test\nSession: abcdefgh");
  });

  test("skips empty session ID", () => {
    const result = formatNotificationMessage("onSubtaskComplete", {
      message: "Test message",
      sessionId: "",
    });

    expect(result).toBe("Test message");
  });

  test("formats cost with two decimal places", () => {
    const result = formatNotificationMessage("onSubtaskComplete", {
      costUsd: 0.1,
      message: "Test",
    });

    expect(result).toBe("Test\nCost: $0.10");
  });

  test("combines multiple partial metrics correctly", () => {
    const result = formatNotificationMessage("onSubtaskComplete", {
      costUsd: 0.05,
      filesChanged: 2,
      message: "Test",
    });

    expect(result).toBe("Test\nFiles: 2 | Cost: $0.05");
  });
});

// =============================================================================
// hookNameToEventName Tests
// =============================================================================

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

    const didSend = await executeNotifyAction("onMaxIterationsExceeded", {
      message: "Test message",
    });

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

    const didSend = await executeNotifyAction("onMaxIterationsExceeded", {
      message: "Test message",
    });

    expect(didSend).toBe(false);
  });
});

describe("executeNotifyFallback", () => {
  const originalFetch = globalThis.fetch;

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns false when notify.defaultTopic not configured", async () => {
    // Mock the unified config loader to return empty topic
    const loadAaaConfigSpy = spyOn(
      configLoader,
      "loadAaaConfig",
    ).mockReturnValue({
      debug: false,
      notify: { defaultTopic: "", server: "" },
      ralph: {},
      research: {},
      review: {},
    });

    const { executeNotifyFallback } =
      await import("@tools/commands/ralph/hooks");

    const didSend = await executeNotifyFallback("onMaxIterationsExceeded", {
      message: "Test message",
    });

    expect(didSend).toBe(false);
    loadAaaConfigSpy.mockRestore();
  });

  test("returns false when notify.defaultTopic is placeholder", async () => {
    // Mock the unified config loader to return placeholder topic
    const loadAaaConfigSpy = spyOn(
      configLoader,
      "loadAaaConfig",
    ).mockReturnValue({
      debug: false,
      notify: { defaultTopic: "your-ntfy-topic", server: "" },
      ralph: {},
      research: {},
      review: {},
    });

    const { executeNotifyFallback } =
      await import("@tools/commands/ralph/hooks");

    const didSend = await executeNotifyFallback("onMaxIterationsExceeded", {
      message: "Test message",
    });

    expect(didSend).toBe(false);
    loadAaaConfigSpy.mockRestore();
  });

  test("sends notification via fetch when configured", async () => {
    // Mock the unified config loader
    const loadAaaConfigSpy = spyOn(
      configLoader,
      "loadAaaConfig",
    ).mockReturnValue({
      debug: false,
      notify: { defaultTopic: "test-topic", server: "https://test.ntfy.sh" },
      ralph: {},
      research: {},
      review: {},
    });

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

    const didSend = await executeNotifyFallback("onMaxIterationsExceeded", {
      message: "Test message",
    });

    expect(didSend).toBe(true);
    expect(didCallFetch).toBe(true);
    expect(fetchUrl).toBe("https://test.ntfy.sh/test-topic");
    expect(fetchOptions.method).toBe("POST");
    expect(fetchOptions.body).toBe("Test message");
    loadAaaConfigSpy.mockRestore();
  });

  test("uses default server when not specified", async () => {
    // Mock the unified config loader with empty server
    const loadAaaConfigSpy = spyOn(
      configLoader,
      "loadAaaConfig",
    ).mockReturnValue({
      debug: false,
      notify: { defaultTopic: "test-topic", server: "" },
      ralph: {},
      research: {},
      review: {},
    });

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

    await executeNotifyFallback("onMaxIterationsExceeded", {
      message: "Test message",
    });

    expect(fetchUrl).toBe("https://ntfy.sh/test-topic");
    loadAaaConfigSpy.mockRestore();
  });
});

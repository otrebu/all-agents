import {
  invokeClaudeChat,
  invokeClaudeHeadlessAsync,
} from "@tools/commands/ralph/providers/claude";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function toTextStream(text: string): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      controller.enqueue(text);
      controller.close();
    },
  });
}

const originalConsoleLog = console.log;
const originalSpawn = Bun.spawn;
const originalSpawnSync = Bun.spawnSync;

afterEach(() => {
  (Bun as { spawn: typeof Bun.spawn }).spawn = originalSpawn;
  (Bun as { spawnSync: typeof Bun.spawnSync }).spawnSync = originalSpawnSync;
  console.log = originalConsoleLog;
});

describe("Claude provider model forwarding", () => {
  test("invokeClaudeChat passes --model when model is provided", () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "ralph-claude-test-"),
    );
    const promptPath = join(temporaryDirectory, "prompt.md");
    try {
      writeFileSync(promptPath, "Test prompt");

      console.log = mock(() => {});
      let capturedArguments: Array<string> = [];
      (Bun as { spawnSync: typeof Bun.spawnSync }).spawnSync = ((args) => {
        capturedArguments = [...(args as Array<string>)];
        return { exitCode: 0, signalCode: null } as unknown as ReturnType<
          typeof Bun.spawnSync
        >;
      }) as typeof Bun.spawnSync;

      const result = invokeClaudeChat(promptPath, "stories", {
        extraContext: "ctx",
        model: "claude-sonnet-4",
      });

      expect(result.success).toBe(true);
      expect(capturedArguments).toContain("--model");
      expect(capturedArguments).toContain("claude-sonnet-4");
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("invokeClaudeChat defaults to claude-opus-4-8 at effort=xhigh when model is undefined", () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "ralph-claude-test-"),
    );
    const promptPath = join(temporaryDirectory, "prompt.md");
    try {
      writeFileSync(promptPath, "Test prompt");

      console.log = mock(() => {});
      let capturedArguments: Array<string> = [];
      (Bun as { spawnSync: typeof Bun.spawnSync }).spawnSync = ((args) => {
        capturedArguments = [...(args as Array<string>)];
        return { exitCode: 0, signalCode: null } as unknown as ReturnType<
          typeof Bun.spawnSync
        >;
      }) as typeof Bun.spawnSync;

      const result = invokeClaudeChat(promptPath, "stories", {
        extraContext: "ctx",
      });

      expect(result.success).toBe(true);
      expect(capturedArguments).toContain("--model");
      expect(capturedArguments).toContain("claude-opus-4-8");
      expect(capturedArguments).toContain("--effort");
      expect(capturedArguments).toContain("xhigh");
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("invokeClaudeHeadlessAsync passes --model when model is provided", async () => {
    let capturedArguments: Array<string> = [];
    const stdinMock = {
      end: mock(() => {}),
      flush: mock(() => {}),
      write: mock(() => 0),
    };
    (Bun as { spawn: typeof Bun.spawn }).spawn = ((args) => {
      capturedArguments = [...(args as Array<string>)];
      return {
        exitCode: 0,
        exited: Promise.resolve(0),
        signalCode: null,
        stderr: toTextStream(""),
        stdin: stdinMock,
        stdout: toTextStream(
          '[{"type":"result","result":"ok","duration_ms":1,"total_cost_usd":0.1,"session_id":"ses_1"}]',
        ),
      } as unknown as ReturnType<typeof Bun.spawn>;
    }) as typeof Bun.spawn;

    const result = await invokeClaudeHeadlessAsync({
      model: "claude-sonnet-4",
      prompt: "hello",
    });

    expect(result?.result).toBe("ok");
    expect(capturedArguments).toContain("--model");
    expect(capturedArguments).toContain("claude-sonnet-4");
    // Prompt should be piped via stdin, not in CLI args
    expect(capturedArguments).not.toContain("hello");
    expect(stdinMock.write).toHaveBeenCalledWith("hello");
    expect(stdinMock.end).toHaveBeenCalled();
  });

  test("invokeClaudeHeadlessAsync forwards explicit --effort over env/default", async () => {
    let capturedArguments: Array<string> = [];
    const stdinMock = {
      end: mock(() => {}),
      flush: mock(() => {}),
      write: mock(() => 0),
    };
    const previousEnv = process.env.RALPH_CLAUDE_EFFORT;
    process.env.RALPH_CLAUDE_EFFORT = "medium";
    (Bun as { spawn: typeof Bun.spawn }).spawn = ((args) => {
      capturedArguments = [...(args as Array<string>)];
      return {
        exitCode: 0,
        exited: Promise.resolve(0),
        signalCode: null,
        stderr: toTextStream(""),
        stdin: stdinMock,
        stdout: toTextStream(
          '[{"type":"result","result":"ok","duration_ms":1,"total_cost_usd":0,"session_id":"ses_x"}]',
        ),
      } as unknown as ReturnType<typeof Bun.spawn>;
    }) as typeof Bun.spawn;

    try {
      await invokeClaudeHeadlessAsync({ effort: "low", prompt: "hi" });
      const effortIndex = capturedArguments.indexOf("--effort");
      expect(effortIndex).toBeGreaterThanOrEqual(0);
      // Explicit "low" wins over env "medium"
      expect(capturedArguments[effortIndex + 1]).toBe("low");
    } finally {
      // eslint-disable-next-line require-atomic-updates -- restoring captured env in finally is safe
      process.env.RALPH_CLAUDE_EFFORT = previousEnv;
      if (previousEnv === undefined) {
        delete process.env.RALPH_CLAUDE_EFFORT;
      }
    }
  });

  test("invokeClaudeHeadlessAsync reads RALPH_CLAUDE_EFFORT when caller omits effort", async () => {
    let capturedArguments: Array<string> = [];
    const stdinMock = {
      end: mock(() => {}),
      flush: mock(() => {}),
      write: mock(() => 0),
    };
    const previousEnv = process.env.RALPH_CLAUDE_EFFORT;
    process.env.RALPH_CLAUDE_EFFORT = "high";
    (Bun as { spawn: typeof Bun.spawn }).spawn = ((args) => {
      capturedArguments = [...(args as Array<string>)];
      return {
        exitCode: 0,
        exited: Promise.resolve(0),
        signalCode: null,
        stderr: toTextStream(""),
        stdin: stdinMock,
        stdout: toTextStream(
          '[{"type":"result","result":"ok","duration_ms":1,"total_cost_usd":0,"session_id":"ses_y"}]',
        ),
      } as unknown as ReturnType<typeof Bun.spawn>;
    }) as typeof Bun.spawn;

    try {
      await invokeClaudeHeadlessAsync({ prompt: "hi" });
      const effortIndex = capturedArguments.indexOf("--effort");
      expect(effortIndex).toBeGreaterThanOrEqual(0);
      expect(capturedArguments[effortIndex + 1]).toBe("high");
    } finally {
      // eslint-disable-next-line require-atomic-updates -- restoring captured env in finally is safe
      process.env.RALPH_CLAUDE_EFFORT = previousEnv;
      if (previousEnv === undefined) {
        delete process.env.RALPH_CLAUDE_EFFORT;
      }
    }
  });
});

import {
  discoverRecentSessionForProvider,
  extractSessionMetricsForProvider,
  resolveSessionForProvider,
} from "@tools/commands/ralph/providers/session-adapter";
import {
  cacheCodexSessionPayload,
  clearCodexSessionPayloadsForTests,
} from "@tools/commands/ralph/providers/session-codex";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

describe("provider session adapters", () => {
  const originalSpawnSync = Bun.spawnSync;
  const originalClaudeConfigDirectory = process.env.CLAUDE_CONFIG_DIR;

  afterAll(() => {
    Bun.spawnSync = originalSpawnSync;
    if (originalClaudeConfigDirectory === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR;
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDirectory;
    }
  });

  beforeEach(() => {
    Bun.spawnSync = originalSpawnSync;
  });

  afterEach(() => {
    Bun.spawnSync = originalSpawnSync;
  });

  test("claude adapter resolves session and extracts metrics", () => {
    const testRoot = mkdtempSync(join(tmpdir(), "aaa-session-claude-"));
    const repoRoot = join(testRoot, "repo");
    const claudeConfigDirectory = join(testRoot, ".claude");
    const projectsDirectory = join(claudeConfigDirectory, "projects");
    const dashPath = repoRoot.replaceAll("/", "-").replaceAll(".", "-");
    const sessionId = "claude-session-001";
    const sessionDirectory = join(projectsDirectory, dashPath);
    const sessionPath = join(sessionDirectory, `${sessionId}.jsonl`);

    mkdirSync(repoRoot, { recursive: true });
    mkdirSync(sessionDirectory, { recursive: true });

    const payload = [
      '{"timestamp":"2026-02-06T10:00:00.000Z","type":"assistant"}',
      '{"timestamp":"2026-02-06T10:00:01.000Z","type":"tool_use","name":"Write","input":{"file_path":"/tmp/example-repo/src/new.ts"}}',
      '{"timestamp":"2026-02-06T10:00:02.000Z","type":"tool_use","name":"Edit","input":{"file_path":"src/existing.ts"}}',
      '{"timestamp":"2026-02-06T10:00:03.000Z","message":{"usage":{"cache_creation_input_tokens":100,"cache_read_input_tokens":200,"input_tokens":50,"output_tokens":10}}}',
      '{"timestamp":"2026-02-06T10:00:04.000Z","message":{"usage":{"cache_creation_input_tokens":0,"cache_read_input_tokens":400,"input_tokens":20,"output_tokens":5}}}',
    ].join("\n");
    writeFileSync(sessionPath, payload, "utf8");

    process.env.CLAUDE_CONFIG_DIR = claudeConfigDirectory;

    try {
      const resolved = resolveSessionForProvider("claude", sessionId, repoRoot);
      expect(resolved).not.toBeNull();

      if (resolved === null) {
        throw new Error("expected resolved claude session");
      }

      const metrics = extractSessionMetricsForProvider(
        "claude",
        resolved,
        repoRoot,
      );
      expect(metrics.durationMs).toBe(4000);
      expect(metrics.toolCalls).toBe(2);
      expect(metrics.filesChanged).toContain("/tmp/example-repo/src/new.ts");
      expect(metrics.filesChanged).toContain("src/existing.ts");
      expect(metrics.tokenUsage).toEqual({
        contextTokens: 420,
        outputTokens: 15,
      });

      const discovered = discoverRecentSessionForProvider(
        "claude",
        Date.now() - 60_000,
        repoRoot,
      );
      expect(discovered?.sessionId).toBe(sessionId);
    } finally {
      rmSync(testRoot, { force: true, recursive: true });
    }
  });

  test("opencode adapter discovers most recent directory-matched session", () => {
    const now = Date.now();
    const repoRoot = "/tmp/project-alpha";

    Object.assign(Bun, {
      spawnSync: mock((command: Array<string>) => {
        if (
          command[0] === "opencode" &&
          command[1] === "session" &&
          command[2] === "list"
        ) {
          return makeSpawnSyncResult(
            0,
            JSON.stringify([
              {
                directory: "/tmp/other-project",
                id: "ses_other",
                updated: now + 1000,
              },
              { directory: repoRoot, id: "ses_target", updated: now + 500 },
            ]),
          );
        }

        return makeSpawnSyncResult(1, "", "unexpected command");
      }),
    });

    const discovered = discoverRecentSessionForProvider(
      "opencode",
      now,
      repoRoot,
    );
    expect(discovered?.sessionId).toBe("ses_target");
  });

  test("opencode adapter resolves export payload and extracts metrics", () => {
    const repoRoot = "/tmp/opencode-repo";
    const sessionId = "ses_export_001";

    const exportPayload = {
      info: {
        time: { created: 1_704_067_200_000, updated: 1_704_067_205_000 },
      },
      messages: [
        {
          info: {
            role: "assistant",
            tokens: { cache: { read: 10, write: 5 }, input: 100, output: 20 },
          },
          parts: [
            {
              state: { input: { filePath: `${repoRoot}/src/new.ts` } },
              tool: "write",
              type: "tool",
            },
            {
              state: { input: { path: "src/existing.ts" } },
              tool: "edit",
              type: "tool",
            },
            {
              state: { input: { filePath: `${repoRoot}/README.md` } },
              tool: "read",
              type: "tool",
            },
          ],
        },
        {
          info: {
            role: "assistant",
            tokens: { cache: { read: 25, write: 0 }, input: 50, output: 30 },
          },
          parts: [
            {
              state: { input: { path: "src/ignored.ts" } },
              tool: "bash",
              type: "tool",
            },
          ],
        },
      ],
    };

    Object.assign(Bun, {
      spawnSync: mock((command: Array<string>) => {
        if (command[0] === "opencode" && command[1] === "export") {
          return makeSpawnSyncResult(
            0,
            `Exporting session: ${sessionId}${JSON.stringify(exportPayload)}`,
          );
        }
        return makeSpawnSyncResult(1, "", "unexpected command");
      }),
    });

    const resolved = resolveSessionForProvider("opencode", sessionId, repoRoot);
    expect(resolved).not.toBeNull();

    if (resolved === null) {
      throw new Error("expected resolved opencode session");
    }

    const metrics = extractSessionMetricsForProvider(
      "opencode",
      resolved,
      repoRoot,
    );
    expect(metrics.durationMs).toBe(5000);
    expect(metrics.toolCalls).toBe(4);
    expect(metrics.filesChanged).toEqual(["src/new.ts", "src/existing.ts"]);
    expect(metrics.tokenUsage).toEqual({ contextTokens: 75, outputTokens: 50 });
  });

  test("unsupported providers degrade to null/default metrics", () => {
    const discovered = discoverRecentSessionForProvider(
      "cursor",
      Date.now(),
      "/tmp/repo",
    );
    expect(discovered).toBeNull();

    const resolved = resolveSessionForProvider(
      "cursor",
      "ses_123",
      "/tmp/repo",
    );
    expect(resolved).toBeNull();
  });

  test("codex adapter resolves cached payload and extracts metrics", () => {
    const repoRoot = "/tmp/codex-repo";
    const sessionId = "thread-codex-123";
    const payload = [
      '{"type":"thread.started","thread_id":"thread-codex-123","timestamp":1010}',
      '{"type":"text","output":"Done","timestamp":1200}',
      '{"type":"turn.completed","timestamp":2010,"part":{"usage":{"input":42,"output":11,"reasoning":7,"cache_read":3,"cache_write":1}}}',
    ].join("\n");

    clearCodexSessionPayloadsForTests();
    cacheCodexSessionPayload(sessionId, payload, repoRoot);

    const discovered = discoverRecentSessionForProvider(
      "codex",
      Date.now(),
      repoRoot,
    );
    expect(discovered).not.toBeNull();
    expect(discovered?.sessionId).toBe(sessionId);

    const resolved = resolveSessionForProvider("codex", sessionId, repoRoot);
    expect(resolved).not.toBeNull();

    if (resolved === null) {
      throw new Error("expected resolved codex session");
    }

    const metrics = extractSessionMetricsForProvider(
      "codex",
      resolved,
      repoRoot,
    );
    expect(metrics.durationMs).toBe(1000);
    expect(metrics.tokenUsage).toEqual({
      cacheRead: 3,
      cacheWrite: 1,
      input: 42,
      output: 11,
      reasoning: 7,
    });
  });

  test("codex adapter resolves persisted payload after in-memory cache is cleared", () => {
    const repoRoot = "/tmp/codex-repo-persist";
    const sessionId = "thread-codex-persist";
    const payload = [
      '{"type":"thread.started","thread_id":"thread-codex-persist","timestamp":1010}',
      '{"type":"turn.completed","timestamp":2010,"part":{"usage":{"input":17,"output":5,"cache_read":2,"cache_write":0}}}',
    ].join("\n");

    clearCodexSessionPayloadsForTests();
    cacheCodexSessionPayload(sessionId, payload, repoRoot);
    clearCodexSessionPayloadsForTests();

    const resolved = resolveSessionForProvider("codex", sessionId, repoRoot);
    expect(resolved).not.toBeNull();

    if (resolved === null) {
      throw new Error("expected resolved codex session");
    }

    const metrics = extractSessionMetricsForProvider(
      "codex",
      resolved,
      repoRoot,
    );
    expect(metrics.durationMs).toBe(1000);
    expect(metrics.tokenUsage).toEqual({
      cacheRead: 2,
      cacheWrite: 0,
      input: 17,
      output: 5,
      reasoning: undefined,
    });
  });
});

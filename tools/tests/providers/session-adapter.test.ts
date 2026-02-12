import {
  discoverRecentSessionForProvider,
  extractSessionMetricsForProvider,
  resolveSessionForProvider,
} from "@tools/commands/ralph/providers/session-adapter";
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
  const originalCursorConfigDirectory = process.env.CURSOR_CONFIG_DIR;

  afterAll(() => {
    Bun.spawnSync = originalSpawnSync;
    if (originalClaudeConfigDirectory === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR;
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDirectory;
    }

    if (originalCursorConfigDirectory === undefined) {
      delete process.env.CURSOR_CONFIG_DIR;
    } else {
      process.env.CURSOR_CONFIG_DIR = originalCursorConfigDirectory;
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

  test("cursor adapter resolves transcript payload and extracts metrics", () => {
    const testRoot = mkdtempSync(join(tmpdir(), "aaa-session-cursor-"));
    const repoRoot = join(testRoot, "repo");
    const cursorConfigDirectory = join(testRoot, ".cursor-test");
    const encodedPath = repoRoot
      .replaceAll("/", "-")
      .replaceAll(".", "-")
      .replace(/^-+/u, "");
    const transcriptDirectory = join(
      cursorConfigDirectory,
      "projects",
      encodedPath,
      "agent-transcripts",
    );
    const sessionId = "cursor-session-001";
    const transcriptPath = join(transcriptDirectory, `${sessionId}.txt`);

    mkdirSync(repoRoot, { recursive: true });
    mkdirSync(transcriptDirectory, { recursive: true });

    const payload = [
      `{"type":"system","session_id":"${sessionId}","timestamp_ms":1000}`,
      '{"type":"tool_call","subtype":"started","tool_call":{"writeToolCall":{"args":{"path":"src/new.ts"}}},"timestamp_ms":1100}',
      `{"type":"tool_call","subtype":"started","tool_call":{"editToolCall":{"args":{"filePath":"${repoRoot}/src/existing.ts"}}},"timestamp_ms":1200}`,
      `{"type":"result","duration_ms":3000,"session_id":"${sessionId}","usage":{"input_tokens":200,"output_tokens":30,"cache_read":50},"timestamp_ms":4000}`,
    ].join("\n");
    writeFileSync(transcriptPath, payload, "utf8");

    process.env.CURSOR_CONFIG_DIR = cursorConfigDirectory;

    try {
      const resolved = resolveSessionForProvider("cursor", sessionId, repoRoot);
      expect(resolved).not.toBeNull();

      if (resolved === null) {
        throw new Error("expected resolved cursor session");
      }

      const metrics = extractSessionMetricsForProvider(
        "cursor",
        resolved,
        repoRoot,
      );

      expect(metrics.durationMs).toBe(3000);
      expect(metrics.toolCalls).toBe(2);
      expect(metrics.filesChanged).toContain("src/new.ts");
      expect(metrics.filesChanged).toContain("src/existing.ts");
      expect(metrics.tokenUsage).toEqual({
        contextTokens: 250,
        outputTokens: 30,
      });

      const discovered = discoverRecentSessionForProvider(
        "cursor",
        Date.now() - 60_000,
        repoRoot,
      );
      expect(discovered?.sessionId).toBe(sessionId);
    } finally {
      if (originalCursorConfigDirectory === undefined) {
        delete process.env.CURSOR_CONFIG_DIR;
      } else {
        process.env.CURSOR_CONFIG_DIR = originalCursorConfigDirectory;
      }
      rmSync(testRoot, { force: true, recursive: true });
    }
  });

  test("unsupported providers degrade to null/default metrics", () => {
    const discovered = discoverRecentSessionForProvider(
      "codex",
      Date.now(),
      "/tmp/repo",
    );
    expect(discovered).toBeNull();

    const resolved = resolveSessionForProvider("codex", "ses_123", "/tmp/repo");
    expect(resolved).toBeNull();
  });
});

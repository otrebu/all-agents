/**
 * Codex session adapter.
 *
 * Codex does not expose stable session paths, so this adapter
 * provides both process-local caching and best-effort disk persistence
 * for headless invocations.
 *
 * - Headless invocation payloads are cached by thread/session ID.
 * - Supervised session discovery is best-effort and uses cache recency.
 * - If an in-memory entry is unavailable, resolution falls back to persisted
 *   output snapshots in the local cache directory.
 *
 * This keeps metrics extraction provider-agnostic while avoiding
 * false assumptions about Codex filesystem layouts.
 */
/* eslint-disable function-name/starts-with-verb, complexity, no-continue, no-nested-ternary, unicorn/no-nested-ternary, @typescript-eslint/no-unnecessary-condition */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { TokenUsage } from "../types";
import type {
  ProviderSession,
  ProviderSessionAdapter,
} from "./session-adapter";

interface CodexCachedSession {
  capturedAt: number;
  path: string;
  payload: string;
  repoRoot: string;
}

interface CodexEvent {
  part?: { usage?: unknown; usageInfo?: unknown };
  timestamp?: number;
  type?: string;
  usage?: unknown;
}

interface DiscoveredSession {
  path: string;
  sessionId: string;
}

const CODEX_SESSION_SUPERVISED_LOOKBACK_MS = 10_000;
const CODEX_SESSION_PAYLOAD_LIMIT = 50;
const CODEX_SESSION_ROOT = path.join(tmpdir(), "aaa-ralph", "codex-sessions");
const CODEX_SESSION_PAYLOADS = new Map<string, CodexCachedSession>();

function cacheCodexSessionPayload(
  sessionId: string,
  payload: string,
  repoRoot: string,
): void {
  if (sessionId === "") {
    return;
  }

  CODEX_SESSION_PAYLOADS.set(sessionId, {
    capturedAt: Date.now(),
    path: getCodexSessionPath(sessionId),
    payload,
    repoRoot,
  });
  writeSessionToDisk(sessionId, payload);

  if (CODEX_SESSION_PAYLOADS.size <= CODEX_SESSION_PAYLOAD_LIMIT) {
    return;
  }

  const oldest = [...CODEX_SESSION_PAYLOADS.entries()]
    .map(([id, cached]) => ({ cached, id }))
    .sort((left, right) => left.cached.capturedAt - right.cached.capturedAt)[0];

  if (oldest !== undefined) {
    CODEX_SESSION_PAYLOADS.delete(oldest.id);
  }
}

function clearCodexSessionPayloadsForTests(): void {
  CODEX_SESSION_PAYLOADS.clear();
}

function decodeCodexEvents(payload: string): Array<CodexEvent> {
  const events: Array<CodexEvent> = [];
  for (const line of payload.split("\n")) {
    if (line.trim() === "") {
      continue;
    }

    try {
      events.push(JSON.parse(line) as CodexEvent);
      // eslint-disable-next-line no-empty -- malformed payload lines are unsupported
    } catch {}
  }
  return events;
}

function discoverCodexRecentSession(
  afterTimestamp: number,
  repoRoot: string,
): DiscoveredSession | null {
  const threshold = afterTimestamp - CODEX_SESSION_SUPERVISED_LOOKBACK_MS;
  const normalizedRepoRoot = repoRoot.replace(/\/$/, "");

  const candidates = [...CODEX_SESSION_PAYLOADS.entries()]
    .map(([sessionId, cached]) => ({ cached, sessionId }))
    .filter((entry) => entry.cached.capturedAt >= threshold)
    .filter(
      (entry) =>
        entry.cached.repoRoot === "" ||
        entry.cached.repoRoot === normalizedRepoRoot,
    )
    .sort((left, right) => right.cached.capturedAt - left.cached.capturedAt);

  if (candidates.length === 0) {
    return null;
  }

  const recentSession = candidates.at(0);
  if (recentSession === undefined) {
    return null;
  }

  return {
    path: recentSession.cached.path,
    sessionId: recentSession.sessionId,
  };
}

function extractCandidatePath(
  input: Record<string, unknown>,
  ...keys: Array<string>
): string {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value !== "") {
      return value;
    }
  }
  return "";
}

function extractCodexDurationMs(session: ProviderSession): number {
  const events = decodeCodexEvents(session.payload);
  const startEvent = events.find((event) => event.type === "thread.started");
  const endEvent = events.find((event) => event.type === "turn.completed");

  const startTimestamp =
    typeof startEvent?.timestamp === "number"
      ? startEvent.timestamp
      : undefined;
  const endTimestamp =
    typeof endEvent?.timestamp === "number" ? endEvent.timestamp : undefined;

  if (
    startTimestamp === undefined ||
    endTimestamp === undefined ||
    startTimestamp > endTimestamp
  ) {
    return 0;
  }

  return endTimestamp - startTimestamp;
}

function extractCodexFilesChanged(
  session: ProviderSession,
  repoRoot: string,
): Array<string> {
  const files = new Set<string>();
  for (const event of decodeCodexEvents(session.payload)) {
    if (typeof event.part !== "object" || event.part === null) {
      continue;
    }

    const usageLike = event.part as {
      input?: Record<string, unknown>;
      message?: unknown;
      output?: unknown;
      usage?: unknown;
    };
    const { input } = usageLike;
    if (input === undefined || input === null || typeof input !== "object") {
      continue;
    }

    const candidate = extractCandidatePath(input, "file_path", "path");
    const normalized = normalizePath(candidate, repoRoot);
    if (normalized !== null) {
      files.add(normalized);
    }
  }

  return [...files].slice(0, 50);
}

function extractCodexTokenUsage(
  session: ProviderSession,
): TokenUsage | undefined {
  const events = decodeCodexEvents(session.payload);
  const terminal = events.find((event) => event.type === "turn.completed");
  if (terminal === undefined) {
    return undefined;
  }

  const usage = terminal.part?.usage ?? terminal.usage;
  if (usage === undefined || usage === null || typeof usage !== "object") {
    return undefined;
  }

  const parsed = usage as Record<string, unknown>;
  const input =
    typeof parsed.input === "number"
      ? parsed.input
      : typeof parsed.prompt_tokens === "number"
        ? parsed.prompt_tokens
        : undefined;
  const output =
    typeof parsed.output === "number"
      ? parsed.output
      : typeof parsed.completion_tokens === "number"
        ? parsed.completion_tokens
        : undefined;
  const reasoning =
    typeof parsed.reasoning === "number"
      ? parsed.reasoning
      : typeof parsed.reasoning_tokens === "number"
        ? parsed.reasoning_tokens
        : undefined;
  const cacheRead =
    typeof parsed.cacheRead === "number"
      ? parsed.cacheRead
      : typeof parsed.cache_read === "number"
        ? parsed.cache_read
        : undefined;
  const cacheWrite =
    typeof parsed.cacheWrite === "number"
      ? parsed.cacheWrite
      : typeof parsed.cache_write === "number"
        ? parsed.cache_write
        : undefined;

  if (
    input === undefined &&
    output === undefined &&
    reasoning === undefined &&
    cacheRead === undefined &&
    cacheWrite === undefined
  ) {
    return undefined;
  }

  return {
    cacheRead,
    cacheWrite,
    input: input ?? 0,
    output: output ?? 0,
    reasoning,
  };
}

function extractCodexToolCalls(session: ProviderSession): number {
  return decodeCodexEvents(session.payload).filter(
    (event) =>
      event.type === "tool" ||
      event.type === "tool_call" ||
      event.type === "tool_result",
  ).length;
}

function getCodexSessionPath(sessionId: string): string {
  const safeSessionId = sanitizeSessionId(sessionId);
  return path.join(CODEX_SESSION_ROOT, `${safeSessionId}.jsonl`);
}

function normalizePath(rawPath: string, repoRoot: string): null | string {
  if (rawPath === "") {
    return null;
  }
  if (rawPath.startsWith("http") || rawPath.includes("*")) {
    return null;
  }
  if (rawPath.startsWith(`${repoRoot}/`)) {
    return rawPath.slice(repoRoot.length + 1);
  }
  return rawPath;
}

function readSessionFromDisk(sessionId: string): null | string {
  const sessionPath = getCodexSessionPath(sessionId);
  if (!existsSync(sessionPath)) {
    return null;
  }

  try {
    return readFileSync(sessionPath, "utf8");
  } catch {
    return null;
  }
}

function resolveCodexSession(
  sessionId: string,
  repoRoot: string,
): null | ProviderSession {
  const cached = CODEX_SESSION_PAYLOADS.get(sessionId);
  if (cached === undefined) {
    const persistedPayload = readSessionFromDisk(sessionId);
    if (persistedPayload === null || persistedPayload.trim() === "") {
      return null;
    }

    cacheCodexSessionPayload(sessionId, persistedPayload, repoRoot);
    return {
      path: getCodexSessionPath(sessionId),
      payload: persistedPayload,
      sessionId,
    };
  }

  return { path: cached.path, payload: cached.payload, sessionId };
}

function sanitizeSessionId(sessionId: string): string {
  return sessionId.replaceAll(/[\\/]/g, "_");
}

function writeSessionToDisk(sessionId: string, payload: string): void {
  const sessionPath = getCodexSessionPath(sessionId);
  try {
    mkdirSync(CODEX_SESSION_ROOT, { recursive: true });
    writeFileSync(sessionPath, payload, "utf8");
  } catch {
    // Persisting to disk is best-effort; metrics still work from memory cache.
  }
}

const CODEX_SESSION_ADAPTER: ProviderSessionAdapter = {
  discoverRecentSession: (afterTimestamp: number, repoRoot: string) =>
    discoverCodexRecentSession(afterTimestamp, repoRoot),
  extractDurationMs: (session: ProviderSession) =>
    extractCodexDurationMs(session),
  extractFilesChanged: (session: ProviderSession, repoRoot: string) =>
    extractCodexFilesChanged(session, repoRoot),
  extractTokenUsage: (session: ProviderSession) =>
    extractCodexTokenUsage(session),
  extractToolCalls: (session: ProviderSession) =>
    extractCodexToolCalls(session),
  resolveSession: (sessionId: string, repoRoot: string) =>
    resolveCodexSession(sessionId, repoRoot),
};

export {
  cacheCodexSessionPayload,
  clearCodexSessionPayloadsForTests,
  CODEX_SESSION_ADAPTER,
};

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import type { TokenUsage } from "../types";
import type {
  ProviderSession,
  ProviderSessionAdapter,
} from "./session-adapter";
import type { DiscoveredSession } from "./session-claude";

interface CursorEvent extends Record<string, unknown> {
  session_id?: unknown;
  subtype?: unknown;
  timestamp_ms?: unknown;
  tool_call?: unknown;
  type?: unknown;
  usage?: unknown;
}

interface CursorSessionCandidate {
  modifiedMs: number;
  path: string;
  sessionId: string;
}

const CURSOR_FILE_MUTATION_TOOLS = new Set<string>([
  "addfile",
  "applypatch",
  "deletefile",
  "edit",
  "multiedit",
  "updatefile",
  "write",
]);

const CURSOR_SUPERVISED_SESSION_LOOKBACK_MS = 120_000;

function discoverRecentCursorSession(
  afterTimestamp: number,
  repoRoot: string,
): DiscoveredSession | null {
  const threshold = afterTimestamp - CURSOR_SUPERVISED_SESSION_LOOKBACK_MS;

  const localRalphSessions = listCursorSessionCandidates(
    getCursorRalphSessionDirectory(repoRoot),
    ".jsonl",
  );
  const recentRalphSession = pickRecentCursorSession(
    localRalphSessions,
    threshold,
  );
  if (recentRalphSession !== null) {
    return recentRalphSession;
  }

  const transcriptSessions = listCursorSessionCandidates(
    getCursorTranscriptDirectory(repoRoot),
    ".txt",
  );

  return pickRecentCursorSession(transcriptSessions, threshold);
}

function extractCursorDurationMs(payload: string): number {
  const events = parseCursorEvents(payload);
  if (events.length === 0) {
    return 0;
  }

  const resultEvent =
    events.findLast((event) => readString(event, ["type"]) === "result") ??
    events.at(-1);

  if (resultEvent !== undefined) {
    const explicitDuration = readNumber(resultEvent, [
      "duration_ms",
      "durationMs",
    ]);
    if (explicitDuration !== undefined) {
      return explicitDuration >= 0 ? explicitDuration : 0;
    }
  }

  const timestamps = events
    .map((event) => readNumber(event, ["timestamp_ms", "timestampMs"]))
    .filter((value): value is number => value !== undefined);

  const start = timestamps[0];
  const end = timestamps.at(-1);
  if (start === undefined || end === undefined) {
    return 0;
  }

  return end >= start ? end - start : 0;
}

function extractCursorFilesChanged(
  payload: string,
  repoRoot: string,
): Array<string> {
  const events = parseCursorEvents(payload).filter(
    (event) => readString(event, ["type"]) === "tool_call",
  );

  const startedEvents = events.filter(
    (event) => readString(event, ["subtype"]) === "started",
  );
  const candidateEvents = startedEvents.length > 0 ? startedEvents : events;

  const files = new Set<string>();

  for (const event of candidateEvents) {
    const toolCall = event.tool_call;
    if (!isRecord(toolCall)) {
      // eslint-disable-next-line no-continue -- only object tool_call payloads contain args
      continue;
    }

    for (const [toolCallName, toolCallPayload] of Object.entries(toolCall)) {
      const normalizedToolName = normalizeCursorToolName(toolCallName);
      if (!CURSOR_FILE_MUTATION_TOOLS.has(normalizedToolName)) {
        // eslint-disable-next-line no-continue -- skip non-mutating tools
        continue;
      }

      if (!isRecord(toolCallPayload)) {
        // eslint-disable-next-line no-continue -- skip malformed tool payloads
        continue;
      }

      const args = isRecord(toolCallPayload.args)
        ? toolCallPayload.args
        : undefined;
      if (args === undefined) {
        // eslint-disable-next-line no-continue -- no args means no path to extract
        continue;
      }

      const rawPath = readString(args, [
        "destination_path",
        "destinationPath",
        "file_path",
        "filePath",
        "path",
        "target_path",
        "targetPath",
      ]);

      const normalized = normalizePath(rawPath, repoRoot);
      if (normalized !== null) {
        files.add(normalized);
      }
    }
  }

  return [...files].slice(0, 50);
}

function extractCursorTokenUsage(payload: string): TokenUsage | undefined {
  const events = parseCursorEvents(payload);
  if (events.length === 0) {
    return undefined;
  }

  const resultEvent =
    events.findLast((event) => readString(event, ["type"]) === "result") ??
    events.at(-1);
  if (resultEvent === undefined) {
    return undefined;
  }

  const usage = isRecord(resultEvent.usage) ? resultEvent.usage : undefined;
  if (usage === undefined) {
    return undefined;
  }

  const input =
    readNumber(usage, [
      "input",
      "input_tokens",
      "inputTokens",
      "prompt_tokens",
    ]) ?? 0;
  const output =
    readNumber(usage, [
      "completion_tokens",
      "output",
      "output_tokens",
      "outputTokens",
    ]) ?? 0;
  const cacheRead = readNumber(usage, ["cache_read", "cacheRead"]) ?? 0;
  const cacheWrite = readNumber(usage, ["cache_write", "cacheWrite"]) ?? 0;

  if (input === 0 && output === 0 && cacheRead === 0 && cacheWrite === 0) {
    return undefined;
  }

  return {
    contextTokens: input + cacheRead + cacheWrite,
    outputTokens: output,
  };
}

function extractCursorToolCalls(payload: string): number {
  const events = parseCursorEvents(payload).filter(
    (event) => readString(event, ["type"]) === "tool_call",
  );

  if (events.length === 0) {
    return 0;
  }

  const startedCount = events.filter(
    (event) => readString(event, ["subtype"]) === "started",
  ).length;

  return startedCount > 0 ? startedCount : events.length;
}

function getCursorConfigDirectory(): string {
  return process.env.CURSOR_CONFIG_DIR ?? path.join(homedir(), ".cursor");
}

function getCursorProjectDirectory(repoRoot: string): string {
  const normalizedRepoRoot = path.resolve(repoRoot);
  const encodedPath = normalizedRepoRoot
    .replaceAll("/", "-")
    .replaceAll(".", "-")
    .replace(/^-+/u, "");

  return path.join(getCursorProjectsDirectory(), encodedPath);
}

function getCursorProjectsDirectory(): string {
  return path.join(getCursorConfigDirectory(), "projects");
}

function getCursorRalphSessionDirectory(repoRoot: string): string {
  return path.join(path.resolve(repoRoot), ".ralph", "sessions", "cursor");
}

function getCursorTranscriptDirectory(repoRoot: string): string {
  return path.join(getCursorProjectDirectory(repoRoot), "agent-transcripts");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function listCursorSessionCandidates(
  directory: string,
  extension: ".jsonl" | ".txt",
): Array<CursorSessionCandidate> {
  if (!existsSync(directory)) {
    return [];
  }

  try {
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
      .map((entry) => {
        const filePath = path.join(directory, entry.name);
        const stats = statSync(filePath);
        return {
          modifiedMs: stats.mtimeMs,
          path: filePath,
          sessionId: entry.name.slice(0, -extension.length),
        };
      })
      .filter((entry) => entry.sessionId !== "")
      .sort((a, b) => b.modifiedMs - a.modifiedMs);
  } catch {
    return [];
  }
}

function normalizeCursorToolName(rawName: string): string {
  return rawName
    .replace(/ToolCall$/u, "")
    .replaceAll("_", "")
    .replaceAll("-", "")
    .toLowerCase();
}

function normalizePath(
  rawPath: string | undefined,
  repoRoot: string,
): null | string {
  if (rawPath === undefined || rawPath === "") {
    return null;
  }
  if (rawPath.startsWith("http") || rawPath.includes("*")) {
    return null;
  }

  const normalizedRepoRoot = path.resolve(repoRoot);
  const normalizedPath = path.resolve(rawPath);

  if (normalizedPath.startsWith(`${normalizedRepoRoot}${path.sep}`)) {
    return path.relative(normalizedRepoRoot, normalizedPath);
  }

  return rawPath;
}

function parseCursorEvents(payload: string): Array<CursorEvent> {
  const trimmed = payload.trim();
  if (trimmed === "") {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is CursorEvent => isRecord(entry));
    }
    if (isRecord(parsed)) {
      return [parsed];
    }
  } catch {
    // Fall through to JSONL parsing.
  }

  const events: Array<CursorEvent> = [];
  for (const line of trimmed.split("\n")) {
    if (line.trim() === "") {
      // eslint-disable-next-line no-continue -- skip blank lines in JSONL payload
      continue;
    }

    try {
      const parsed = JSON.parse(line) as unknown;
      if (isRecord(parsed)) {
        events.push(parsed);
      }
    } catch {
      // Ignore malformed lines for resilience.
    }
  }

  return events;
}

function pickRecentCursorSession(
  candidates: Array<CursorSessionCandidate>,
  threshold: number,
): DiscoveredSession | null {
  const recent = candidates.find(
    (candidate) => candidate.modifiedMs >= threshold,
  );
  if (recent !== undefined) {
    return { path: recent.path, sessionId: recent.sessionId };
  }

  const latest = candidates[0];
  if (latest === undefined) {
    return null;
  }

  return { path: latest.path, sessionId: latest.sessionId };
}

function readNumber(
  payload: Record<string, unknown>,
  keys: Array<string>,
): number | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function readString(
  payload: Record<string, unknown>,
  keys: Array<string>,
): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return undefined;
}

function resolveCursorSession(
  sessionId: string,
  repoRoot: string,
): null | ProviderSession {
  const sessionPath = resolveCursorSessionPath(sessionId, repoRoot);
  if (sessionPath === null) {
    return null;
  }

  try {
    const payload = readFileSync(sessionPath, "utf8");
    return { path: sessionPath, payload, sessionId };
  } catch {
    return null;
  }
}

function resolveCursorSessionPath(
  sessionId: string,
  repoRoot: string,
): null | string {
  const ralphSessionPath = path.join(
    getCursorRalphSessionDirectory(repoRoot),
    `${sessionId}.jsonl`,
  );
  if (existsSync(ralphSessionPath)) {
    return ralphSessionPath;
  }

  const transcriptPath = path.join(
    getCursorTranscriptDirectory(repoRoot),
    `${sessionId}.txt`,
  );
  if (existsSync(transcriptPath)) {
    return transcriptPath;
  }

  return null;
}

const CURSOR_SESSION_ADAPTER: ProviderSessionAdapter = {
  discoverRecentSession: (afterTimestamp: number, repoRoot: string) =>
    discoverRecentCursorSession(afterTimestamp, repoRoot),
  extractDurationMs: (session: ProviderSession) =>
    extractCursorDurationMs(session.payload),
  extractFilesChanged: (session: ProviderSession, repoRoot: string) =>
    extractCursorFilesChanged(session.payload, repoRoot),
  extractTokenUsage: (session: ProviderSession) =>
    extractCursorTokenUsage(session.payload),
  extractToolCalls: (session: ProviderSession) =>
    extractCursorToolCalls(session.payload),
  resolveSession: (sessionId: string, repoRoot: string) =>
    resolveCursorSession(sessionId, repoRoot),
};

export {
  CURSOR_SESSION_ADAPTER,
  discoverRecentCursorSession,
  extractCursorDurationMs,
  extractCursorFilesChanged,
  extractCursorTokenUsage,
  extractCursorToolCalls,
  resolveCursorSession,
  resolveCursorSessionPath,
};

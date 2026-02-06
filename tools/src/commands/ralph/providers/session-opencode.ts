import path from "node:path";

import type { TokenUsage } from "../types";
import type {
  ProviderSession,
  ProviderSessionAdapter,
} from "./session-adapter";
import type { DiscoveredSession } from "./session-claude";

import {
  OPENCODE_SESSION_SCAN_LIMIT,
  OPENCODE_SUPERVISED_SESSION_LOOKBACK_MS,
} from "./opencode";

interface OpencodeExport {
  info?: { time?: { created?: number; updated?: number } };
  messages?: Array<OpencodeExportMessage>;
}

interface OpencodeExportMessage {
  info?: {
    role?: string;
    time?: { completed?: number; created?: number };
    tokens?: {
      cache?: { read?: number; write?: number };
      input?: number;
      output?: number;
    };
  };
  parts?: Array<OpencodeExportPart>;
}

interface OpencodeExportPart {
  state?: { input?: { file_path?: string; filePath?: string; path?: string } };
  tool?: string;
  type?: string;
}

interface OpencodeSessionListEntry {
  created?: number;
  directory?: string;
  id?: string;
  updated?: number;
}

const OPENCODE_FILE_MUTATION_TOOLS = new Set<string>([
  "apply_patch",
  "edit",
  "multi_edit",
  "multiedit",
  "write",
]);

function decodeOpencodeExport(payload: string): null | OpencodeExport {
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    return parsed as OpencodeExport;
  } catch {
    return null;
  }
}

function discoverRecentOpencodeSession(
  afterTimestamp: number,
  repoRoot: string,
): DiscoveredSession | null {
  const sessions = listOpencodeSessions();
  if (sessions.length === 0) {
    return null;
  }

  const threshold = afterTimestamp - OPENCODE_SUPERVISED_SESSION_LOOKBACK_MS;
  const targetDirectory = path.resolve(repoRoot);

  const normalizedSessions = sessions
    .map((session) => ({
      directory:
        typeof session.directory === "string"
          ? path.resolve(session.directory)
          : "",
      id: typeof session.id === "string" ? session.id : "",
      timestamp: getSessionTimestamp(session),
    }))
    .filter((session) => session.id !== "")
    .sort((a, b) => b.timestamp - a.timestamp);

  if (normalizedSessions.length === 0) {
    return null;
  }

  const recentDirectoryMatch = normalizedSessions.find(
    (session) =>
      session.directory === targetDirectory && session.timestamp >= threshold,
  );
  if (recentDirectoryMatch !== undefined) {
    return {
      path: recentDirectoryMatch.directory || targetDirectory,
      sessionId: recentDirectoryMatch.id,
    };
  }

  const recentSession = normalizedSessions.find(
    (session) => session.timestamp >= threshold,
  );
  if (recentSession !== undefined) {
    return {
      path: recentSession.directory || targetDirectory,
      sessionId: recentSession.id,
    };
  }

  const directoryFallback = normalizedSessions.find(
    (session) => session.directory === targetDirectory,
  );
  if (directoryFallback !== undefined) {
    return {
      path: directoryFallback.directory || targetDirectory,
      sessionId: directoryFallback.id,
    };
  }

  const latest = normalizedSessions[0];
  if (latest === undefined) {
    return null;
  }

  return { path: latest.directory || targetDirectory, sessionId: latest.id };
}

function extractOpencodeDurationMs(payload: string): number {
  const session = decodeOpencodeExport(payload);
  if (session === null) {
    return 0;
  }

  const created = session.info?.time?.created;
  const updated = session.info?.time?.updated;
  if (
    typeof created === "number" &&
    typeof updated === "number" &&
    updated >= created
  ) {
    return updated - created;
  }

  const messageTimes = (session.messages ?? [])
    .map((message) => ({
      completed: message.info?.time?.completed,
      created: message.info?.time?.created,
    }))
    .filter(
      (entry) =>
        typeof entry.created === "number" ||
        typeof entry.completed === "number",
    );

  const start = messageTimes.find(
    (entry) => typeof entry.created === "number",
  )?.created;
  const end =
    messageTimes.findLast((entry) => typeof entry.completed === "number")
      ?.completed ??
    messageTimes.findLast((entry) => typeof entry.created === "number")
      ?.created;

  if (typeof start !== "number" || typeof end !== "number") {
    return 0;
  }

  return end >= start ? end - start : 0;
}

function extractOpencodeFilesChanged(
  payload: string,
  repoRoot: string,
): Array<string> {
  const session = decodeOpencodeExport(payload);
  if (session === null) {
    return [];
  }

  const files = new Set<string>();

  for (const message of session.messages ?? []) {
    for (const part of message.parts ?? []) {
      if (part.type !== "tool") {
        // eslint-disable-next-line no-continue -- only tool parts contain input paths
        continue;
      }

      const toolName = part.tool?.toLowerCase().trim() ?? "";
      if (!OPENCODE_FILE_MUTATION_TOOLS.has(toolName)) {
        // eslint-disable-next-line no-continue -- only mutating tools imply changed files
        continue;
      }

      const candidate =
        part.state?.input?.filePath ??
        part.state?.input?.file_path ??
        part.state?.input?.path;

      const normalized = normalizePath(candidate, repoRoot);
      if (normalized !== null) {
        files.add(normalized);
      }
    }
  }

  return [...files].slice(0, 50);
}

function extractOpencodeTokenUsage(payload: string): TokenUsage {
  const session = decodeOpencodeExport(payload);
  if (session === null) {
    return { contextTokens: 0, outputTokens: 0 };
  }

  let contextTokens = 0;
  let outputTokens = 0;

  for (const message of session.messages ?? []) {
    if (message.info?.role === "user") {
      // eslint-disable-next-line no-continue -- usage is attached to assistant turns
      continue;
    }

    const tokens = message.info?.tokens;
    if (tokens === undefined) {
      // eslint-disable-next-line no-continue -- skip messages without token metadata
      continue;
    }

    contextTokens =
      (tokens.input ?? 0) +
      (tokens.cache?.read ?? 0) +
      (tokens.cache?.write ?? 0);
    outputTokens += tokens.output ?? 0;
  }

  return { contextTokens, outputTokens };
}

function extractOpencodeToolCalls(payload: string): number {
  const session = decodeOpencodeExport(payload);
  if (session === null) {
    return 0;
  }

  let count = 0;
  for (const message of session.messages ?? []) {
    for (const part of message.parts ?? []) {
      if (part.type === "tool") {
        count += 1;
      }
    }
  }

  return count;
}

function extractPayloadFromExport(rawOutput: string): null | string {
  const objectStart = rawOutput.indexOf("{");
  const arrayStart = rawOutput.indexOf("[");

  const candidates = [objectStart, arrayStart].filter((index) => index >= 0);
  if (candidates.length === 0) {
    return null;
  }

  const startIndex = Math.min(...candidates);
  const jsonText = rawOutput.slice(startIndex).trim();
  if (jsonText === "") {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    return JSON.stringify(parsed);
  } catch {
    return null;
  }
}

function getSessionTimestamp(session: OpencodeSessionListEntry): number {
  if (typeof session.updated === "number") {
    return session.updated;
  }
  if (typeof session.created === "number") {
    return session.created;
  }
  return 0;
}

function listOpencodeSessions(
  maxCount = OPENCODE_SESSION_SCAN_LIMIT,
): Array<OpencodeSessionListEntry> {
  try {
    const proc = Bun.spawnSync(
      [
        "opencode",
        "session",
        "list",
        "--format",
        "json",
        "-n",
        String(maxCount),
      ],
      { stderr: "pipe", stdin: "ignore", stdout: "pipe", timeout: 10_000 },
    );

    if (proc.exitCode !== 0) {
      return [];
    }

    const stdout = proc.stdout.toString("utf8").trim();
    if (stdout === "") {
      return [];
    }

    const parsed = JSON.parse(stdout) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is OpencodeSessionListEntry =>
        typeof entry === "object" && entry !== null,
    );
  } catch {
    return [];
  }
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

  const normalizedRoot = path.resolve(repoRoot);
  const normalizedPath = path.resolve(rawPath);

  if (normalizedPath.startsWith(`${normalizedRoot}${path.sep}`)) {
    return path.relative(normalizedRoot, normalizedPath);
  }

  return rawPath;
}

function resolveOpencodeSession(
  sessionId: string,
  repoRoot: string,
): null | ProviderSession {
  try {
    const proc = Bun.spawnSync(["opencode", "export", sessionId], {
      cwd: repoRoot,
      stderr: "pipe",
      stdin: "ignore",
      stdout: "pipe",
      timeout: 15_000,
    });

    if (proc.exitCode !== 0) {
      return null;
    }

    const payload = extractPayloadFromExport(proc.stdout.toString("utf8"));
    if (payload === null) {
      return null;
    }

    return { path: null, payload, sessionId };
  } catch {
    return null;
  }
}

const OPENCODE_SESSION_ADAPTER: ProviderSessionAdapter = {
  discoverRecentSession: (afterTimestamp: number, repoRoot: string) =>
    discoverRecentOpencodeSession(afterTimestamp, repoRoot),
  extractDurationMs: (session: ProviderSession) =>
    extractOpencodeDurationMs(session.payload),
  extractFilesChanged: (session: ProviderSession, repoRoot: string) =>
    extractOpencodeFilesChanged(session.payload, repoRoot),
  extractTokenUsage: (session: ProviderSession) =>
    extractOpencodeTokenUsage(session.payload),
  extractToolCalls: (session: ProviderSession) =>
    extractOpencodeToolCalls(session.payload),
  resolveSession: (sessionId: string, repoRoot: string) =>
    resolveOpencodeSession(sessionId, repoRoot),
};

export {
  discoverRecentOpencodeSession,
  extractOpencodeDurationMs,
  extractOpencodeFilesChanged,
  extractOpencodeTokenUsage,
  extractOpencodeToolCalls,
  listOpencodeSessions,
  OPENCODE_SESSION_ADAPTER,
  resolveOpencodeSession,
};

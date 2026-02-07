import { Buffer } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

import type { TokenUsage } from "../types";
import type {
  ProviderSession,
  ProviderSessionAdapter,
} from "./session-adapter";

interface DiscoveredSession {
  path: string;
  sessionId: string;
}

function discoverClaudeRecentSession(
  afterTimestamp: number,
): DiscoveredSession | null {
  const home = homedir();
  const claudeDirectory = process.env.CLAUDE_CONFIG_DIR ?? `${home}/.claude`;
  const projectsDirectory = `${claudeDirectory}/projects`;

  if (!existsSync(projectsDirectory)) {
    return null;
  }

  try {
    const afterDate = new Date(afterTimestamp).toISOString();
    const proc = Bun.spawnSync(
      [
        "bash",
        "-c",
        `find "${projectsDirectory}" -name "*.jsonl" -type f -newermt "${afterDate}" -exec ls -t {} + 2>/dev/null | head -1`,
      ],
      { timeout: 10_000 },
    );

    if (proc.exitCode !== 0) {
      return null;
    }

    const found = proc.stdout.toString("utf8").trim();
    if (found === "") {
      return null;
    }

    const sessionId = found.split("/").pop()?.replace(".jsonl", "") ?? "";
    if (sessionId === "") {
      return null;
    }

    return { path: found, sessionId };
  } catch {
    return null;
  }
}

function extractClaudeDurationMs(payload: string): number {
  const lines = getJsonlLines(payload);
  if (lines.length === 0) {
    return 0;
  }

  const firstLine = lines[0];
  const lastLine = lines.at(-1);
  if (
    firstLine === undefined ||
    firstLine === "" ||
    lastLine === undefined ||
    lastLine === ""
  ) {
    return 0;
  }

  const firstTimestamp = extractTimestamp(firstLine);
  const lastTimestamp = extractTimestamp(lastLine);

  if (
    firstTimestamp === null ||
    firstTimestamp === "" ||
    lastTimestamp === null ||
    lastTimestamp === ""
  ) {
    return 0;
  }

  const startMs = new Date(firstTimestamp).getTime();
  const endMs = new Date(lastTimestamp).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return 0;
  }

  const duration = endMs - startMs;
  return duration >= 0 ? duration : 0;
}

function extractClaudeFilesChanged(
  payload: string,
  repoRoot: string,
): Array<string> {
  const lines = getJsonlLines(payload);
  const files = new Set<string>();

  for (const line of lines) {
    if (!line.includes('"type":"tool_use"')) {
      // eslint-disable-next-line no-continue -- skip non-tool entries
      continue;
    }

    if (!line.includes('"name":"Write"') && !line.includes('"name":"Edit"')) {
      // eslint-disable-next-line no-continue -- only include mutating tool calls
      continue;
    }

    const filePathMatches = line.matchAll(
      /"file_path"\s*:\s*"(?<filePath>[^"]+)"/g,
    );
    for (const match of filePathMatches) {
      const filePath = normalizePath(match.groups?.filePath, repoRoot);
      if (filePath !== null) {
        files.add(filePath);
      }
    }

    const pathMatches = line.matchAll(/"path"\s*:\s*"(?<path>[^"]+)"/g);
    for (const match of pathMatches) {
      const candidatePath = normalizePath(match.groups?.path, repoRoot);
      if (candidatePath !== null) {
        files.add(candidatePath);
      }
    }
  }

  return [...files].slice(0, 50);
}

function extractClaudeTokenUsage(payload: string): TokenUsage {
  const lines = getJsonlLines(payload);

  let contextTokens = 0;
  let outputTokens = 0;

  for (const line of lines) {
    if (!line.includes('"usage"')) {
      // eslint-disable-next-line no-continue -- skip lines without token usage
      continue;
    }

    try {
      const parsed = JSON.parse(line) as {
        message?: {
          usage?: {
            cache_creation_input_tokens?: number;
            cache_read_input_tokens?: number;
            input_tokens?: number;
            output_tokens?: number;
          };
        };
      };

      const usage = parsed.message?.usage;
      if (usage === undefined) {
        // eslint-disable-next-line no-continue -- line includes usage text but no usage object
        continue;
      }

      contextTokens =
        (usage.cache_read_input_tokens ?? 0) +
        (usage.cache_creation_input_tokens ?? 0) +
        (usage.input_tokens ?? 0);
      outputTokens += usage.output_tokens ?? 0;
    } catch {
      // Skip malformed JSON lines.
    }
  }

  return { contextTokens, outputTokens };
}

function extractClaudeToolCalls(payload: string): number {
  const lines = getJsonlLines(payload);
  let count = 0;

  for (const line of lines) {
    if (line.includes('"type":"tool_use"')) {
      count += 1;
    }
  }

  return count;
}

function extractTimestamp(line: string): null | string {
  try {
    const parsed = JSON.parse(line) as { timestamp?: string };
    return parsed.timestamp ?? null;
  } catch {
    const match = /"timestamp"\s*:\s*"(?<timestamp>[^"]+)"/.exec(line);
    return match?.groups?.timestamp ?? null;
  }
}

function getJsonlLines(payload: string): Array<string> {
  return payload.split("\n").filter((line) => line.trim() !== "");
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

  if (rawPath.startsWith(`${repoRoot}/`)) {
    return rawPath.slice(repoRoot.length + 1);
  }

  return rawPath;
}

function resolveClaudeSessionPath(
  sessionId: string,
  repoRoot: string,
): null | string {
  const home = homedir();
  const claudeDirectory = process.env.CLAUDE_CONFIG_DIR ?? `${home}/.claude`;
  const isDebug = process.env.DEBUG === "true" || process.env.DEBUG === "1";
  const triedPaths: Array<string> = [];

  const dashPath = repoRoot.replaceAll("/", "-").replaceAll(".", "-");
  const base64 = Buffer.from(repoRoot).toString("base64");
  const base64Url = base64
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

  const candidates = [
    `${claudeDirectory}/projects/${base64}/${sessionId}.jsonl`,
    `${claudeDirectory}/projects/${base64Url}/${sessionId}.jsonl`,
    `${claudeDirectory}/projects/${dashPath}/${sessionId}.jsonl`,
    `${claudeDirectory}/projects/${sessionId}.jsonl`,
    `${claudeDirectory}/sessions/${sessionId}.jsonl`,
  ];

  for (const candidate of candidates) {
    triedPaths.push(candidate);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  const projectsDirectory = `${claudeDirectory}/projects`;
  if (existsSync(projectsDirectory)) {
    try {
      const proc = Bun.spawnSync(
        [
          "bash",
          "-c",
          `find "${projectsDirectory}" -maxdepth 3 -name "${sessionId}.jsonl" -type f 2>/dev/null | head -1`,
        ],
        { timeout: 5000 },
      );

      if (proc.exitCode === 0) {
        const found = proc.stdout.toString("utf8").trim();
        if (found !== "") {
          return found;
        }
      }
    } catch {
      // find failed or timed out, return not found below.
    }

    triedPaths.push(`${projectsDirectory}/**/${sessionId}.jsonl`);
  }

  if (isDebug) {
    console.log(`Session ${sessionId} not found. Tried paths:`);
    for (const p of triedPaths) {
      console.log(`  - ${p}`);
    }
  }

  return null;
}

const CLAUDE_SESSION_ADAPTER: ProviderSessionAdapter = {
  discoverRecentSession: (afterTimestamp: number) =>
    discoverClaudeRecentSession(afterTimestamp),
  extractDurationMs: (session: ProviderSession) =>
    extractClaudeDurationMs(session.payload),
  extractFilesChanged: (session: ProviderSession, repoRoot: string) =>
    extractClaudeFilesChanged(session.payload, repoRoot),
  extractTokenUsage: (session: ProviderSession) =>
    extractClaudeTokenUsage(session.payload),
  extractToolCalls: (session: ProviderSession) =>
    extractClaudeToolCalls(session.payload),
  resolveSession: (sessionId: string, repoRoot: string) => {
    const path = resolveClaudeSessionPath(sessionId, repoRoot);
    if (path === null) {
      return null;
    }

    try {
      const payload = readFileSync(path, "utf8");
      return { path, payload, sessionId };
    } catch {
      return null;
    }
  },
};

export {
  CLAUDE_SESSION_ADAPTER,
  discoverClaudeRecentSession,
  resolveClaudeSessionPath,
};
export type { DiscoveredSession };

/**
 * Session utilities for Ralph autonomous build system
 *
 * This module provides functions to find and analyze Claude session JSONL files:
 * - getSessionJsonlPath() - Find session file with multiple fallback locations
 * - countToolCalls() - Count tool_use entries in session
 * - calculateDurationMs() - Calculate duration from timestamps
 * - getFilesFromSession() - Extract Write/Edit file paths
 *
 * Session files are stored at ~/.claude/projects/<encoded-path>/<sessionId>.jsonl
 * where encoded-path can be base64-encoded or dash-separated.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

import type { TokenUsage } from "./types";

// =============================================================================
// Session Analysis
// =============================================================================

/**
 * Result from discovering a recent session
 */
interface DiscoveredSession {
  path: string;
  sessionId: string;
}

/**
 * Calculate iteration duration from session JSONL timestamps
 *
 * Extracts the first and last timestamps from the session log and
 * calculates the duration in milliseconds.
 *
 * @param sessionPath - Path to session JSONL file
 * @returns Duration in milliseconds, or 0 if unable to calculate
 */
function calculateDurationMs(sessionPath: string): number {
  if (!existsSync(sessionPath)) {
    return 0;
  }

  try {
    const content = readFileSync(sessionPath, "utf8");
    const lines = content.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      return 0;
    }

    // Get first timestamp
    const firstLine = lines[0];
    if (firstLine === undefined || firstLine === "") {
      return 0;
    }
    const firstTimestamp = extractTimestamp(firstLine);

    // Get last timestamp
    const lastLine = lines.at(-1);
    if (lastLine === undefined || lastLine === "") {
      return 0;
    }
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
  } catch {
    return 0;
  }
}

/**
 * Count tool_use entries in a session JSONL file
 *
 * Reads the session log and counts entries with "type":"tool_use".
 *
 * @param sessionPath - Path to session JSONL file
 * @returns Number of tool calls, or 0 if file not found/invalid
 */
function countToolCalls(sessionPath: string): number {
  if (!existsSync(sessionPath)) {
    return 0;
  }

  try {
    const content = readFileSync(sessionPath, "utf8");
    const lines = content.split("\n").filter((line) => line.trim());
    let count = 0;

    for (const line of lines) {
      if (line.includes('"type":"tool_use"')) {
        count += 1;
      }
    }

    return count;
  } catch {
    return 0;
  }
}

/**
 * Discover the most recent Claude session file created after a given timestamp
 *
 * This is useful for supervised mode where we need to find the session file
 * after the user completes their work in Claude chat mode.
 *
 * Uses `find` with `-newermt` to locate session files created after the timestamp.
 * Returns the most recent session file if multiple match.
 *
 * @param afterTimestamp - Unix timestamp in milliseconds (Date.now())
 * @returns Session info { sessionId, path } or null if not found
 */
function discoverRecentSession(
  afterTimestamp: number,
): DiscoveredSession | null {
  const home = homedir();
  const claudeDirectory = process.env.CLAUDE_CONFIG_DIR ?? `${home}/.claude`;
  const projectsDirectory = `${claudeDirectory}/projects`;

  if (!existsSync(projectsDirectory)) {
    return null;
  }

  try {
    // Convert timestamp to ISO date format for find -newermt
    const afterDate = new Date(afterTimestamp).toISOString();

    // Find session files newer than the given timestamp, sorted by modification time (most recent first)
    // Using ls -t to sort by modification time, then head -1 to get most recent
    const proc = Bun.spawnSync([
      "bash",
      "-c",
      `find "${projectsDirectory}" -name "*.jsonl" -type f -newermt "${afterDate}" -exec ls -t {} + 2>/dev/null | head -1`,
    ]);

    if (proc.exitCode !== 0) {
      return null;
    }

    const found = proc.stdout.toString("utf8").trim();

    if (found === "") {
      return null;
    }

    // Extract session ID from path (filename without .jsonl extension)
    const sessionId = found.split("/").pop()?.replace(".jsonl", "") ?? "";

    if (sessionId === "") {
      return null;
    }

    return { path: found, sessionId };
  } catch {
    return null;
  }
}

// =============================================================================
// Path Discovery
// =============================================================================

/**
 * Extract timestamp from a JSONL line
 *
 * Parses JSON and extracts the timestamp field.
 *
 * @param line - JSON line from session file
 * @returns Timestamp string, or null if not found
 */
function extractTimestamp(line: string): null | string {
  try {
    const parsed = JSON.parse(line) as { timestamp?: string };
    return parsed.timestamp ?? null;
  } catch {
    // Try regex fallback for malformed JSON
    const match = /"timestamp"\s*:\s*"(?<timestamp>[^"]+)"/.exec(line);
    return match?.groups?.timestamp ?? null;
  }
}

// =============================================================================
// Session Discovery
// =============================================================================

/**
 * Extract file paths from Write and Edit tool calls in a session
 *
 * Parses the session JSONL and extracts file_path values from
 * tool_use entries with names "Write" or "Edit".
 *
 * @param sessionPath - Path to session JSONL file
 * @returns Array of unique file paths (max 50)
 */
function getFilesFromSession(sessionPath: string): Array<string> {
  if (!existsSync(sessionPath)) {
    return [];
  }

  try {
    const content = readFileSync(sessionPath, "utf8");
    const lines = content.split("\n").filter((line) => line.trim());
    const files = new Set<string>();

    for (const line of lines) {
      // Skip non-tool_use entries
      if (!line.includes('"type":"tool_use"')) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // Only count Write and Edit operations (not Read, Glob, etc.)
      if (!line.includes('"name":"Write"') && !line.includes('"name":"Edit"')) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // Extract file paths using regex for efficiency
      // Matches "file_path":"..." pattern
      const filePathMatches = line.matchAll(
        /"file_path"\s*:\s*"(?<filePath>[^"]+)"/g,
      );
      for (const match of filePathMatches) {
        const filePath = match.groups?.filePath;
        if (filePath !== undefined && filePath !== "") {
          files.add(filePath);
        }
      }

      // Also check for "path" field (some tools use this)
      const pathMatches = line.matchAll(/"path"\s*:\s*"(?<path>[^"]+)"/g);
      for (const match of pathMatches) {
        // Filter out non-file paths (e.g., URLs, patterns)
        const pathValue = match.groups?.path;
        if (
          pathValue !== undefined &&
          pathValue !== "" &&
          !pathValue.startsWith("http") &&
          !pathValue.includes("*")
        ) {
          files.add(pathValue);
        }
      }
    }

    // Limit to 50 files
    return [...files].slice(0, 50);
  } catch {
    return [];
  }
}

/**
 * Find the session JSONL file path for a given session ID
 *
 * Tries multiple locations in order:
 * 1. Base64-encoded repo path: ~/.claude/projects/<base64(repoRoot)>/<sessionId>.jsonl
 * 2. Dash-encoded repo path: ~/.claude/projects/<dash-path>/<sessionId>.jsonl
 * 3. Direct project path: ~/.claude/projects/<sessionId>.jsonl
 * 4. Sessions directory: ~/.claude/sessions/<sessionId>.jsonl
 *
 * @param sessionId - The Claude session ID
 * @param repoRoot - The repository root path
 * @returns Path to session file, or null if not found
 */
function getSessionJsonlPath(
  sessionId: string,
  repoRoot: string,
): null | string {
  const home = homedir();
  // Use CLAUDE_CONFIG_DIR if set, otherwise default to ~/.claude
  const claudeDirectory = process.env.CLAUDE_CONFIG_DIR ?? `${home}/.claude`;
  const isDebug = process.env.DEBUG === "true" || process.env.DEBUG === "1";
  const triedPaths: Array<string> = [];

  // Search in CLAUDE_CONFIG_DIR/projects/ (sessions can be in any subdir)
  const projectsDirectory = `${claudeDirectory}/projects`;
  if (existsSync(projectsDirectory)) {
    try {
      const proc = Bun.spawnSync([
        "bash",
        "-c",
        `find "${projectsDirectory}" -name "${sessionId}.jsonl" -type f 2>/dev/null | head -1`,
      ]);
      if (proc.exitCode === 0) {
        const found = proc.stdout.toString("utf8").trim();
        if (found !== "") {
          return found;
        }
      }
    } catch {
      // find failed, continue to fallbacks
    }
    triedPaths.push(`${projectsDirectory}/**/${sessionId}.jsonl`);
  }

  // Fallback: Try dash-encoded path directly
  const dashPath = repoRoot.replaceAll("/", "-").replaceAll(".", "-");
  const path2 = `${claudeDirectory}/projects/${dashPath}/${sessionId}.jsonl`;
  triedPaths.push(path2);
  if (existsSync(path2)) {
    return path2;
  }

  // Fallback: Try sessions directory
  const path3 = `${claudeDirectory}/sessions/${sessionId}.jsonl`;
  triedPaths.push(path3);
  if (existsSync(path3)) {
    return path3;
  }

  // Log tried paths at debug level
  if (isDebug) {
    console.log(`Session ${sessionId} not found. Tried paths:`);
    for (const p of triedPaths) {
      console.log(`  - ${p}`);
    }
  }

  // Not found
  return null;
}

/**
 * Extract token usage from a session JSONL file
 *
 * Tracks the FINAL context window size (last API request's context) instead
 * of summing across all requests. This reflects what Claude "sees" at the end
 * of the iteration, similar to what Claude Code CLI shows.
 *
 * Output tokens are still summed for cost tracking.
 *
 * @param sessionPath - Path to session JSONL file
 * @returns Token usage with final context size, or zeros if file not found/invalid
 */
function getTokenUsageFromSession(sessionPath: string): TokenUsage {
  const emptyUsage: TokenUsage = { contextTokens: 0, outputTokens: 0 };

  if (!existsSync(sessionPath)) {
    return emptyUsage;
  }

  try {
    const content = readFileSync(sessionPath, "utf8");
    const lines = content.split("\n").filter((line) => line.trim());

    // Track final context window (what Claude sees at end of iteration)
    let contextTokens = 0;
    // Sum outputs for cost tracking
    let outputTokens = 0;

    for (const line of lines) {
      // Skip lines without usage data
      if (!line.includes('"usage"')) {
        // eslint-disable-next-line no-continue
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
        if (usage !== undefined) {
          // Context for THIS request = cached + non-cached input
          // Overwrite each time so we end up with the LAST request's context
          contextTokens =
            (usage.cache_read_input_tokens ?? 0) +
            (usage.cache_creation_input_tokens ?? 0) +
            (usage.input_tokens ?? 0);

          // Sum outputs for cost tracking
          outputTokens += usage.output_tokens ?? 0;
        }
      } catch {
        // Skip malformed lines
      }
    }

    return { contextTokens, outputTokens };
  } catch {
    return emptyUsage;
  }
}

// =============================================================================
// Exports
// =============================================================================

export {
  calculateDurationMs,
  countToolCalls,
  discoverRecentSession,
  getFilesFromSession,
  getSessionJsonlPath,
  getTokenUsageFromSession,
};
export type { DiscoveredSession };

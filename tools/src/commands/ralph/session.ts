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

// =============================================================================
// Session Analysis
// =============================================================================

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

// =============================================================================
// Path Discovery
// =============================================================================

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

  // Try base64-encoded path
  const base64Path = Buffer.from(repoRoot).toString("base64");
  const path1 = `${home}/.claude/projects/${base64Path}/${sessionId}.jsonl`;
  if (existsSync(path1)) {
    return path1;
  }

  // Try dash-encoded path (e.g., -home-user-dev-project)
  const dashPath = repoRoot.replaceAll("/", "-");
  const path2 = `${home}/.claude/projects/${dashPath}/${sessionId}.jsonl`;
  if (existsSync(path2)) {
    return path2;
  }

  // Try direct project path
  const path3 = `${home}/.claude/projects/${sessionId}.jsonl`;
  if (existsSync(path3)) {
    return path3;
  }

  // Try sessions directory
  const path4 = `${home}/.claude/sessions/${sessionId}.jsonl`;
  if (existsSync(path4)) {
    return path4;
  }

  // Not found
  return null;
}

// =============================================================================
// Exports
// =============================================================================

export {
  calculateDurationMs,
  countToolCalls,
  getFilesFromSession,
  getSessionJsonlPath,
};

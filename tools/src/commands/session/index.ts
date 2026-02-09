/**
 * Session command - Manage and retrieve Claude session files
 *
 * Commands:
 *   aaa session path <session-id>       Get session file path by ID
 *   aaa session path --id <session-id>  Get session file path by ID
 *   aaa session path --commit <hash>    Get session file path from commit's cc-session-id trailer
 *   aaa session current                 Get current session ID from .claude/current-session
 *   aaa session cat <session-id>        Output session JSONL content to stdout
 *   aaa session cat --id <session-id>   Output session content by ID flag
 *   aaa session cat --commit <hash>     Output session content from commit's cc-session-id trailer
 *   aaa session list                    List recent sessions for current project
 *   aaa session list --limit N          Limit output to N entries
 *   aaa session list --verbose          Human-readable table format
 *
 * Used for interrogation workflows to access conversation context from commits.
 */

import { Command } from "@commander-js/extra-typings";
import { getSessionJsonlPath } from "@tools/commands/ralph/session";
import { findProjectRoot } from "@tools/utils/paths";
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Information about a session file
 */
interface SessionInfo {
  modifiedAt: Date;
  path: string;
  sessionId: string;
  sizeBytes: number;
  title: string;
}

const SESSION_TITLE_FALLBACK = "(untitled)";
const SESSION_TITLE_MAX_LENGTH = 80;
const SESSION_TITLE_SCAN_BYTES = 64 * 1024;

/**
 * Best-effort extraction of a session title from the first real user message.
 */
function extractSessionTitle(filePath: string): string {
  const head = readSessionHead(filePath);
  if (head === "") {
    return SESSION_TITLE_FALLBACK;
  }

  const lines = head.split("\n");
  if (!head.endsWith("\n")) {
    lines.pop();
  }

  let slugCandidate: null | string = null;

  for (const line of lines) {
    if (line.trim() === "") {
      // eslint-disable-next-line no-continue
      continue;
    }

    try {
      const parsed = JSON.parse(line) as {
        isMeta?: unknown;
        message?: { content?: unknown; role?: unknown };
        slug?: unknown;
        type?: unknown;
      };

      if (slugCandidate === null && typeof parsed.slug === "string") {
        slugCandidate = parsed.slug;
      }

      if (
        parsed.type !== "user" ||
        parsed.isMeta === true ||
        parsed.message?.role !== "user"
      ) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const text = getMessageText(parsed.message.content);
      if (text === null) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const title = normalizeTitleCandidate(text);
      if (title !== null) {
        return title;
      }
    } catch {
      // ignore malformed/truncated lines
    }
  }

  if (slugCandidate !== null) {
    const slugTitle = normalizeTitleCandidate(
      slugCandidate.replaceAll("-", " "),
    );
    if (slugTitle !== null) {
      return slugTitle;
    }
  }

  return SESSION_TITLE_FALLBACK;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format date to human-readable string
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${Math.floor(diffHours)}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Truncate and normalize a candidate title.
 */
function formatSessionTitle(raw: string): string {
  const normalized = raw.replaceAll(/\s+/g, " ").trim();
  if (normalized.length <= SESSION_TITLE_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, SESSION_TITLE_MAX_LENGTH - 3)}...`;
}

/**
 * Get the path to .claude/current-session file
 */
function getCurrentSessionPath(): string {
  const projectRoot = findProjectRoot() ?? process.cwd();
  return join(projectRoot, ".claude", "current-session");
}

/**
 * Parse string or structured message content into a plain-text candidate.
 */
function getMessageText(content: unknown): null | string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return null;
  }

  for (const item of content) {
    if (typeof item !== "object" || item === null) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const messagePart = item as { text?: unknown; type?: unknown };
    if (messagePart.type === "text" && typeof messagePart.text === "string") {
      return messagePart.text;
    }
  }

  return null;
}

/**
 * Extract cc-session-id trailer from a git commit
 *
 * @param commitHash - Git commit hash (can be HEAD, short hash, or full hash)
 * @returns Session ID or null if trailer not found
 */
function getSessionIdFromCommit(commitHash: string): null | string {
  try {
    const proc = Bun.spawnSync([
      "git",
      "log",
      "-1",
      "--format=%(trailers:key=cc-session-id,valueonly)",
      commitHash,
    ]);

    if (proc.exitCode !== 0) {
      return null;
    }

    const sessionId = proc.stdout.toString("utf8").trim();
    return sessionId === "" ? null : sessionId;
  } catch {
    return null;
  }
}

/**
 * List recent sessions for the current project
 *
 * Searches in ~/.claude/projects/ for session JSONL files,
 * optionally filtering by the current project's encoded path.
 *
 * @param limit - Maximum number of sessions to return (default: 20)
 * @returns Array of session info, sorted by modification time (most recent first)
 */
function listRecentSessions(limit = 20): Array<SessionInfo> {
  const home = homedir();
  const claudeDirectory = process.env.CLAUDE_CONFIG_DIR ?? `${home}/.claude`;
  const projectsDirectory = `${claudeDirectory}/projects`;

  if (!existsSync(projectsDirectory)) {
    return [];
  }

  const sessions: Array<Omit<SessionInfo, "title">> = [];

  // Find all .jsonl files in the projects directory
  try {
    const proc = Bun.spawnSync([
      "bash",
      "-c",
      `find "${projectsDirectory}" -name "*.jsonl" -type f 2>/dev/null`,
    ]);

    if (proc.exitCode !== 0) {
      return [];
    }

    const files = proc.stdout
      .toString("utf8")
      .trim()
      .split("\n")
      .filter((f) => f !== "");

    for (const filePath of files) {
      try {
        const stats = statSync(filePath);
        const sessionId = basename(filePath, ".jsonl");

        sessions.push({
          modifiedAt: stats.mtime,
          path: filePath,
          sessionId,
          sizeBytes: stats.size,
        });
      } catch {
        // Skip files we can't stat
      }
    }
  } catch {
    return [];
  }

  // Sort by modification time, most recent first
  sessions.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

  // Apply limit and compute titles for returned sessions only
  return sessions
    .slice(0, limit)
    .map((session) => ({
      ...session,
      title: extractSessionTitle(session.path),
    }));
}

/**
 * Filter out local command wrappers and other non-title messages.
 */
function normalizeTitleCandidate(raw: string): null | string {
  const normalized = raw.replaceAll(/\s+/g, " ").trim();
  if (normalized === "") {
    return null;
  }

  if (
    normalized.startsWith("<command-") ||
    normalized.startsWith("<local-command") ||
    normalized === "[Request interrupted by user]"
  ) {
    return null;
  }

  return formatSessionTitle(normalized);
}

/**
 * Read current session ID from .claude/current-session
 *
 * @returns Session ID string or null if file doesn't exist
 */
function readCurrentSessionId(): null | string {
  const sessionPath = getCurrentSessionPath();

  if (!existsSync(sessionPath)) {
    return null;
  }

  try {
    const content = readFileSync(sessionPath, "utf8").trim();
    return content === "" ? null : content;
  } catch {
    return null;
  }
}

/**
 * Read the head of a session file for lightweight title extraction.
 */
function readSessionHead(filePath: string): string {
  let fileDescriptor: null | number = null;

  try {
    fileDescriptor = openSync(filePath, "r");
    const buffer = Buffer.alloc(SESSION_TITLE_SCAN_BYTES);
    const bytesRead = readSync(fileDescriptor, buffer, 0, buffer.length, 0);
    return buffer.toString("utf8", 0, bytesRead);
  } catch {
    return "";
  } finally {
    if (fileDescriptor !== null) {
      try {
        closeSync(fileDescriptor);
      } catch {
        // ignore close errors
      }
    }
  }
}

/**
 * Resolve session ID from positional argument, --id, or --commit.
 */
function resolveSessionIdOrExit(
  options: { commit?: string; id?: string },
  positionalSessionId: string | undefined,
): string {
  const commitValue = options.commit?.trim();
  const idValue = options.id?.trim();
  const positionalValue = positionalSessionId?.trim();

  const hasCommitFlag = commitValue !== undefined && commitValue !== "";
  const hasIdFlag = idValue !== undefined && idValue !== "";
  const hasPositional = positionalValue !== undefined && positionalValue !== "";

  if (hasCommitFlag && (hasPositional || hasIdFlag)) {
    console.error(
      "Error: --commit cannot be combined with session ID argument or --id",
    );
    process.exit(1);
    return "";
  }

  if (hasPositional && hasIdFlag) {
    console.error(
      "Error: provide session ID either as positional argument or --id, not both",
    );
    process.exit(1);
    return "";
  }

  if (hasCommitFlag) {
    const resolvedFromCommit = getSessionIdFromCommit(commitValue);
    if (resolvedFromCommit === null) {
      console.error(`No cc-session-id trailer in commit: ${commitValue}`);
      process.exit(1);
      return "";
    }
    return resolvedFromCommit;
  }

  if (hasIdFlag) {
    return idValue;
  }

  if (hasPositional) {
    return positionalValue;
  }

  console.error(
    "Error: Must provide session ID via argument/--id or --commit <hash>",
  );
  process.exit(1);
  return "";
}

// =============================================================================
// Main Command
// =============================================================================

const sessionCommand = new Command("session").description(
  "Manage and retrieve Claude session files",
);

// aaa session path <session-id> or aaa session path --commit <hash>
sessionCommand.addCommand(
  new Command("path")
    .description("Get session file path by ID or from commit")
    .argument("[session-id]", "Session ID to look up")
    .option(
      "--id <session-id>",
      "Session ID to look up (alternative to positional argument)",
    )
    .option(
      "--commit <hash>",
      "Extract session ID from commit's cc-session-id trailer",
    )
    .action((sessionId, options) => {
      const projectRoot = findProjectRoot() ?? process.cwd();
      const resolvedSessionId = resolveSessionIdOrExit(options, sessionId);

      // Look up session file path
      const sessionPath = getSessionJsonlPath(resolvedSessionId, projectRoot);

      if (sessionPath === null) {
        console.error(`Session not found: ${resolvedSessionId}`);
        process.exit(1);
      }

      // Output path to stdout
      console.log(sessionPath);
    }),
);

// aaa session cat <session-id> or aaa session cat --commit <hash>
sessionCommand.addCommand(
  new Command("cat")
    .description("Output session JSONL content to stdout")
    .argument("[session-id]", "Session ID to look up")
    .option(
      "--id <session-id>",
      "Session ID to look up (alternative to positional argument)",
    )
    .option(
      "--commit <hash>",
      "Extract session ID from commit's cc-session-id trailer",
    )
    .action((sessionId, options) => {
      const projectRoot = findProjectRoot() ?? process.cwd();
      const resolvedSessionId = resolveSessionIdOrExit(options, sessionId);

      // Look up session file path
      const sessionPath = getSessionJsonlPath(resolvedSessionId, projectRoot);

      if (sessionPath === null) {
        console.error(`Session not found: ${resolvedSessionId}`);
        process.exit(1);
      }

      // Read and output session content
      try {
        const content = readFileSync(sessionPath, "utf8");
        process.stdout.write(content);
      } catch {
        console.error(`Error reading session file: ${sessionPath}`);
        process.exit(1);
      }
    }),
);

// aaa session list - list recent sessions
sessionCommand.addCommand(
  new Command("list")
    .description("List recent sessions for current project")
    .option("--limit <n>", "Limit output to N entries", "20")
    .option("--verbose", "Human-readable table format")
    .action((options) => {
      const limit = Number.parseInt(options.limit, 10);

      if (Number.isNaN(limit) || limit < 1) {
        console.error("Error: --limit must be a positive integer");
        process.exit(1);
      }

      const sessions = listRecentSessions(limit);

      if (sessions.length === 0) {
        console.error("No sessions found");
        process.exit(1);
      }

      if (options.verbose) {
        // Human-readable table format
        console.log(
          "SESSION ID                              MODIFIED     SIZE      TITLE",
        );
        console.log("─".repeat(120));
        for (const session of sessions) {
          const idPadded = session.sessionId.padEnd(40);
          const datePadded = formatDate(session.modifiedAt).padEnd(12);
          const sizePadded = formatBytes(session.sizeBytes).padEnd(10);
          console.log(`${idPadded}${datePadded}${sizePadded}${session.title}`);
        }
      } else {
        // Machine-parseable TSV: session-id + title
        for (const session of sessions) {
          console.log(`${session.sessionId}\t${session.title}`);
        }
      }
    }),
);

// aaa session current - get current session ID
sessionCommand.addCommand(
  new Command("current")
    .description("Get current session ID from .claude/current-session")
    .action(() => {
      const sessionId = readCurrentSessionId();

      if (sessionId === null) {
        console.error(
          "No current session found (.claude/current-session does not exist or is empty)",
        );
        process.exit(1);
      }

      // Output session ID to stdout
      console.log(sessionId);
    }),
);

// =============================================================================
// Exports
// =============================================================================

export {
  extractSessionTitle,
  getSessionIdFromCommit,
  listRecentSessions,
  readCurrentSessionId,
};
export type { SessionInfo };
export default sessionCommand;

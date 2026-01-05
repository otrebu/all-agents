/**
 * Conversation file parser
 * Parses JSONL conversation files from Claude Code history
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type {
  ConversationExchange,
  ConversationMessage,
  ConversationSession,
  ExtractedConversation,
} from "./types";

/**
 * Extract meaningful conversation exchanges from a session
 * Filters out system messages, commands, and empty content
 */
function extractExchanges(session: ConversationSession): ExtractedConversation {
  const exchanges: Array<ConversationExchange> = [];
  let currentUser: { content: string; timestamp: string } | null = null;

  for (const message of session.messages) {
    const content = message.message?.content ?? "";

    if (isSystemMessage(content)) {
      // eslint-disable-next-line no-continue -- skip system messages early
      continue;
    }

    if (message.type === "user") {
      currentUser = {
        content: content.trim(),
        timestamp: message.timestamp ?? "",
      };
    } else if (message.type === "assistant" && currentUser !== null) {
      const assistantContent = extractTextContent(content);

      if (assistantContent !== "" && assistantContent.length > 10) {
        exchanges.push({
          assistant: assistantContent.trim(),
          timestamp: currentUser.timestamp,
          user: currentUser.content,
        });
      }
      currentUser = null;
    }
  }

  return {
    branch: session.branch,
    exchanges,
    sessionId: session.id,
    startTime: session.startTime,
    summary: session.summary[0] ?? "No summary",
  };
}

/**
 * Extract text content from potentially array-based message content
 */
function extractTextContent(content: string): string {
  if (typeof content === "string") {
    return content;
  }
  try {
    const parsed = Array.isArray(content) ? content : [content];
    return parsed
      .filter((c: { type?: string }) => c.type === "text")
      .map((c: { text?: string }) => c.text ?? "")
      .join("\n");
  } catch {
    return "[Tool calls]";
  }
}

/**
 * Format timestamp to readable date/time
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
    });
  } catch {
    return timestamp;
  }
}

/**
 * Get the Claude projects directory for the current or specified project
 */
function getProjectsDirectory(projectPath?: string): string {
  const home = homedir();
  const currentDirectory = projectPath ?? process.cwd();

  // Convert path to Claude's format: /Users/foo/dev/bar -> -Users-foo-dev-bar
  const encodedPath = currentDirectory.replaceAll("/", "-").replace(/^-/, "");

  return join(home, ".claude", "projects", encodedPath);
}

/**
 * Check if message is a system/meta message that should be skipped
 */
function isSystemMessage(content: string): boolean {
  return (
    content.includes("<command-name>") ||
    content.includes("<local-command-stdout>") ||
    content.includes("Caveat: The messages below") ||
    content.length < 10
  );
}

/**
 * List conversation files, sorted by modification time (newest first)
 */
function listConversationFiles(
  projectsDirectory: string,
  limit: number,
  skip = 0,
): Array<string> {
  try {
    const files = readdirSync(projectsDirectory)
      .filter((f) => f.endsWith(".jsonl") && !f.startsWith("agent-"))
      .map((f) => ({
        mtime: statSync(join(projectsDirectory, f)).mtime,
        name: f,
        path: join(projectsDirectory, f),
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .slice(skip, skip + limit)
      .map((f) => f.path);

    return files;
  } catch {
    return [];
  }
}

/**
 * Parse a single conversation file
 */
function parseConversationFile(filePath: string): ConversationSession {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter((l) => l.trim() !== "");

  const messages: Array<ConversationMessage> = [];
  const summaries: Array<string> = [];
  let startTime = "";
  let branch = "";
  let sessionId = "";

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as ConversationMessage;

      if (
        parsed.type === "summary" &&
        parsed.summary !== undefined &&
        parsed.summary !== ""
      ) {
        summaries.push(parsed.summary);
      } else if (parsed.type === "user" || parsed.type === "assistant") {
        messages.push(parsed);

        if (
          startTime === "" &&
          parsed.timestamp !== undefined &&
          parsed.timestamp !== ""
        ) {
          startTime = parsed.timestamp;
        }
        if (
          branch === "" &&
          parsed.gitBranch !== undefined &&
          parsed.gitBranch !== ""
        ) {
          branch = parsed.gitBranch;
        }
        if (
          sessionId === "" &&
          parsed.sessionId !== undefined &&
          parsed.sessionId !== ""
        ) {
          // eslint-disable-next-line prefer-destructuring -- conditional assignment
          sessionId = parsed.sessionId;
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  const [fileName] = filePath.split("/").slice(-1);
  const fallbackId =
    fileName === undefined ? "" : fileName.replace(".jsonl", "");

  return {
    branch,
    filePath,
    id: sessionId === "" ? fallbackId : sessionId,
    messages,
    startTime,
    summary: summaries,
  };
}

export {
  extractExchanges,
  formatTimestamp,
  getProjectsDirectory,
  listConversationFiles,
  parseConversationFile,
};

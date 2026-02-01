/**
 * Effect-based conversation file parser
 * Parses JSONL conversation files from Claude Code history
 */

/* eslint-disable import/exports-last */

import type { FileSystemService } from "@tools/lib/effect";

import {
  FileNotFoundError,
  FileReadError,
  FileSystem,
} from "@tools/lib/effect";
import { Effect } from "effect";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

import type {
  ConversationExchange,
  ConversationMessage,
  ConversationSession,
  ExtractedConversation,
} from "./types";

// =============================================================================
// Types
// =============================================================================

export interface ConversationFile {
  mtime: Date;
  path: string;
}

// =============================================================================
// Path Resolution
// =============================================================================

/**
 * Build project name in Claude's format
 */
export function buildProjectName(directory: string): string {
  return `-${directory.replaceAll(".", "-").replaceAll("/", "-").replace(/^-/, "")}`;
}

/**
 * Extract meaningful conversation exchanges from a session
 * Filters out system messages, commands, and empty content
 */
export function extractExchangesEffect(
  session: ConversationSession,
): Effect.Effect<ExtractedConversation> {
  return Effect.sync(() => {
    const exchanges: Array<ConversationExchange> = [];
    let currentUser: { content: string; timestamp: string } | null = null;

    for (const message of session.messages) {
      const content = message.message?.content ?? "";

      // eslint-disable-next-line no-continue -- skip system messages early
      if (isSystemMessage(content)) continue;

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
  });
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Get conversation files from both local and global directories
 */
export function getConversationFilesEffect(
  limit: number,
  skip = 0,
  projectPath?: string,
): Effect.Effect<Array<ConversationFile>, FileNotFoundError, FileSystem> {
  return Effect.gen(function* getConversationFilesGen() {
    const cwd = projectPath ?? process.cwd();
    const projectName = buildProjectName(cwd);

    const localDirectory = join(cwd, ".claude", "projects", projectName);
    const globalDirectory = join(homedir(), ".claude", "projects", projectName);

    // Fetch from both directories in parallel
    const [localFiles, globalFiles] = yield* Effect.all([
      listJsonlFilesEffect(localDirectory),
      listJsonlFilesEffect(globalDirectory),
    ]);

    const allFiles = [...localFiles, ...globalFiles];

    if (allFiles.length === 0) {
      return yield* Effect.fail(
        new FileNotFoundError({
          message: `No conversations found in:\n  ${localDirectory}\n  ${globalDirectory}`,
          path: globalDirectory,
        }),
      );
    }

    // Sort by modification time (newest first) and apply pagination
    allFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    return allFiles.slice(skip, skip + limit);
  });
}

/**
 * Get the Claude projects directory for the current or specified project
 */
export function getProjectsDirectory(projectPath?: string): string {
  const home = homedir();
  const currentDirectory = projectPath ?? process.cwd();

  // Convert path to Claude's format: /Users/foo/dev/bar -> -Users-foo-dev-bar
  const encodedPath = currentDirectory.replaceAll("/", "-").replace(/^-/, "");

  return join(home, ".claude", "projects", encodedPath);
}

/**
 * List JSONL files in a directory with their modification times
 * Returns Effect.Effect with file list or empty array on error
 */
export function listJsonlFilesEffect(
  directory: string,
): Effect.Effect<Array<ConversationFile>, never, FileSystem> {
  return Effect.gen(function* listJsonlFilesGen() {
    const fs: FileSystemService = yield* FileSystem;

    // Try to read directory, return empty array if not found
    const filesResult = yield* Effect.either(fs.readDirectory(directory));

    if (filesResult._tag === "Left") {
      // Directory doesn't exist or can't be read - return empty
      return [];
    }

    const files = filesResult.right;
    const jsonlFiles = files.filter(
      (f) => f.endsWith(".jsonl") && !f.startsWith("agent-"),
    );

    // Get stats for all files in parallel, filtering out any that fail
    const statsResults = yield* Effect.all(
      jsonlFiles.map((file) =>
        Effect.either(getFileStat(join(directory, file))),
      ),
      { concurrency: 10 },
    );

    // Filter to only successful stats
    const validFiles: Array<ConversationFile> = [];
    for (const result of statsResults) {
      if (result._tag === "Right") {
        validFiles.push(result.right);
      }
    }

    return validFiles;
  });
}

/**
 * Parse a conversation file into a ConversationSession
 * Effect-based with proper error handling
 */
export function parseConversationFileEffect(
  filePath: string,
): Effect.Effect<
  ConversationSession,
  FileNotFoundError | FileReadError,
  FileSystem
> {
  return Effect.gen(function* parseConversationFileGen() {
    const fs: FileSystemService = yield* FileSystem;

    const content = yield* fs.readFile(filePath);
    const lines = content.split("\n").filter((l) => l.trim() !== "");

    const state = {
      branch: "",
      messages: [] as Array<ConversationMessage>,
      sessionId: "",
      startTime: "",
      summaries: [] as Array<string>,
    };

    // Parse each line, collecting messages and metadata
    for (const line of lines) {
      yield* processLine(line, state);
    }

    const fileName = basename(filePath, ".jsonl");

    return {
      branch: state.branch,
      filePath,
      id: state.sessionId === "" ? fileName : state.sessionId,
      messages: state.messages,
      startTime: state.startTime,
      summary: state.summaries,
    };
  });
}

/**
 * Parse multiple conversation files with concurrency control
 * Skips files that fail to parse and returns only successful results
 */
export function parseConversationsEffect(
  files: Array<ConversationFile>,
): Effect.Effect<Array<ExtractedConversation>, never, FileSystem> {
  return Effect.gen(function* parseConversationsGen() {
    // Parse files with limited concurrency to avoid overwhelming the system
    const results = yield* Effect.all(
      files.map((file) => parseAndExtractConversation(file)),
      { concurrency: 5 },
    );

    // Filter out nulls
    return results.filter((r): r is ExtractedConversation => r !== null);
  });
}

// =============================================================================
// Effect-based File Listing
// =============================================================================

/**
 * Extract text content from potentially array-based message content
 */
function extractTextContent(content: unknown): string {
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
 * Get stat for a file with proper error handling
 * Uses Effect.tryPromise to wrap async stat call
 */
function getFileStat(
  filePath: string,
): Effect.Effect<{ mtime: Date; path: string }, FileReadError> {
  return Effect.tryPromise({
    catch: (error) =>
      new FileReadError({
        cause: error,
        message: `Failed to stat file: ${error instanceof Error ? error.message : String(error)}`,
        path: filePath,
      }),
    try: async () => {
      const stats = await stat(filePath);
      return { mtime: stats.mtime, path: filePath };
    },
  });
}

// =============================================================================
// Effect-based Parsing
// =============================================================================

/**
 * Check if message content is a system/meta message that should be skipped
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
 * Parse a single conversation file and extract exchanges
 */
function parseAndExtractConversation(
  file: ConversationFile,
): Effect.Effect<ExtractedConversation | null, never, FileSystem> {
  return Effect.gen(function* parseAndExtractGen() {
    const sessionResult = yield* Effect.either(
      parseConversationFileEffect(file.path),
    );

    if (sessionResult._tag === "Left") {
      // Log skipped file (could be enhanced with logger service)
      return null;
    }

    const extracted = yield* extractExchangesEffect(sessionResult.right);

    // Only include conversations with actual exchanges
    if (extracted.exchanges.length > 0) {
      return extracted;
    }
    return null;
  });
}

/**
 * Parse a single JSONL line into a conversation message
 * Returns null for lines that should be skipped
 */
function parseLine(
  line: string,
): Effect.Effect<{
  message: ConversationMessage | null;
  metadata?: { branch?: string; sessionId?: string; summary?: string };
}> {
  return Effect.try({
    catch: () => ({ message: null }),
    try: () => {
      const record = JSON.parse(line) as Record<string, unknown>;
      const metadata: {
        branch?: string;
        sessionId?: string;
        summary?: string;
      } = {};

      // Extract summary if present
      if (record.type === "summary" && typeof record.summary === "string") {
        metadata.summary = record.summary;
        return { message: null, metadata };
      }

      // Extract git branch
      if (typeof record.gitBranch === "string" && record.gitBranch !== "") {
        metadata.branch = record.gitBranch;
      }

      // Extract session ID
      if (typeof record.sessionId === "string" && record.sessionId !== "") {
        metadata.sessionId = record.sessionId;
      }

      // Skip meta messages
      if (record.isMeta === true) {
        return { message: null, metadata };
      }

      // Only process user and assistant messages
      if (record.type !== "user" && record.type !== "assistant") {
        return { message: null, metadata };
      }

      const message: ConversationMessage = {
        gitBranch:
          typeof record.gitBranch === "string" ? record.gitBranch : undefined,
        message: record.message as
          | { content: string; role: string }
          | undefined,
        sessionId:
          typeof record.sessionId === "string" ? record.sessionId : undefined,
        timestamp:
          typeof record.timestamp === "string" ? record.timestamp : undefined,
        type: record.type,
      };

      return { message, metadata };
    },
  }).pipe(Effect.catchAll(() => Effect.succeed({ message: null })));
}

/**
 * Process a single line and update session state
 */
function processLine(
  line: string,
  state: {
    branch: string;
    messages: Array<ConversationMessage>;
    sessionId: string;
    startTime: string;
    summaries: Array<string>;
  },
): Effect.Effect<void> {
  return Effect.gen(function* processLineGen() {
    const { message, metadata } = yield* parseLine(line);

    if (metadata?.summary !== undefined) {
      state.summaries.push(metadata.summary);
    }
    if (metadata?.branch !== undefined && state.branch === "") {
      state.branch = metadata.branch;
    }
    if (metadata?.sessionId !== undefined && state.sessionId === "") {
      state.sessionId = metadata.sessionId;
    }

    if (message !== null) {
      state.messages.push(message);

      if (
        state.startTime === "" &&
        message.timestamp !== undefined &&
        message.timestamp !== ""
      ) {
        state.startTime = message.timestamp;
      }
      if (
        state.branch === "" &&
        message.gitBranch !== undefined &&
        message.gitBranch !== ""
      ) {
        state.branch = message.gitBranch;
      }
      if (
        state.sessionId === "" &&
        message.sessionId !== undefined &&
        message.sessionId !== ""
      ) {
        state.sessionId = message.sessionId;
      }
    }
  });
}

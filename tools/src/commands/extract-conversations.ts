/**
 * extract-conversations command
 * Extracts conversation history from Claude Code for analysis
 *
 * Ported to Effect.ts for:
 * - Effect-based file operations via FileSystemService
 * - Proper error handling with tagged errors
 * - Parallel file processing with concurrency control
 */

import type { FileSystemService } from "@tools/lib/effect";

import log from "@lib/log";
import {
  FileNotFoundError,
  FileReadError,
  FileSystem,
  FileSystemLive,
} from "@tools/lib/effect";
import { Effect } from "effect";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

// =============================================================================
// Types
// =============================================================================

interface ContentBlock {
  content?: unknown;
  input?: Record<string, unknown>;
  name?: string;
  text?: string;
  thinking?: string;
  type: string;
}

interface Conversation {
  branch?: string;
  messages: Array<Message>;
  sessionId: string;
  summary?: string;
}

interface ConversationFile {
  mtime: Date;
  path: string;
}

interface Message {
  content: string;
  role: "assistant" | "user";
  timestamp?: string;
}

interface Options {
  limit: number;
  output?: string;
  skip: number;
}

// =============================================================================
// Path Helpers
// =============================================================================

/**
 * Build project name in Claude's format
 */
function buildProjectName(directory: string): string {
  return `-${directory.replaceAll(".", "-").replaceAll("/", "-").replace(/^-/, "")}`;
}

// =============================================================================
// Content Extraction
// =============================================================================

/**
 * Extract text from message content (string or array of blocks)
 */
function extractContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const parts: Array<string> = [];

  for (const block of content) {
    if (typeof block === "object" && block !== null) {
      const formatted = formatContentBlock(block as ContentBlock);
      if (formatted.length > 0) {
        parts.push(formatted);
      }
    }
  }

  return parts.join("\n\n");
}

/**
 * Extract conversations - main entry point using Effect
 */
async function extractConversations(options: Options): Promise<void> {
  const program = Effect.gen(function* extractConversationsGen() {
    // Get conversation files
    const files = yield* getConversationFilesEffect(
      options.limit,
      options.skip,
    );
    log.info(`Found ${files.length} conversations`);

    // Parse all conversations in parallel
    const conversations = yield* parseConversationsEffect(files);

    // Format the report
    const markdown = formatReport(conversations);

    // Write output
    yield* writeOutputEffect(markdown, options.output);
  }).pipe(
    // eslint-disable-next-line promise/prefer-await-to-callbacks -- Effect.catchTag is Effect's error handling pattern
    Effect.catchTag("FileNotFoundError", (error) => {
      log.error(error.message);
      return Effect.void;
    }),
    Effect.provide(FileSystemLive),
  );

  await Effect.runPromise(program);
}

/**
 * Extract message content from a record
 */
function extractMessageContent(
  record: Record<string, unknown>,
): Message | null {
  if (record.type !== "user" && record.type !== "assistant") {
    return null;
  }

  const messageData = record.message as Record<string, unknown> | undefined;
  if (messageData?.content === undefined) {
    return null;
  }

  const text = extractContent(messageData.content);
  if (text.length === 0) {
    return null;
  }

  // Skip system messages but allow tool_result
  if (
    record.type === "user" &&
    text.startsWith("<") &&
    !text.startsWith("<tool_result")
  ) {
    return null;
  }

  return {
    content: text,
    role: record.type,
    timestamp: record.timestamp as string | undefined,
  };
}

// =============================================================================
// File Listing (Effect-based)
// =============================================================================

/**
 * Format a single content block
 */
function formatContentBlock(block: ContentBlock): string {
  if (block.type === "text" && typeof block.text === "string") {
    return block.text;
  }

  if (block.type === "thinking" && typeof block.thinking === "string") {
    return `<thinking>\n${block.thinking}\n</thinking>`;
  }

  if (block.type === "tool_use" && typeof block.name === "string") {
    const inputString = block.input ? JSON.stringify(block.input, null, 2) : "";
    return `<tool_use name="${block.name}">\n${inputString}\n</tool_use>`;
  }

  if (block.type === "tool_result") {
    const resultContent =
      typeof block.content === "string"
        ? block.content
        : JSON.stringify(block.content);
    return `<tool_result>\n${resultContent}\n</tool_result>`;
  }

  return "";
}

/**
 * Format a single conversation
 */
function formatConversation(conv: Conversation): string {
  const lines: Array<string> = [];

  lines.push(`## Session: ${conv.sessionId.slice(0, 8)}`);

  const firstTimestamp = conv.messages[0]?.timestamp;
  if (typeof firstTimestamp === "string" && firstTimestamp.length > 0) {
    const formatted = new Date(firstTimestamp)
      .toISOString()
      .slice(0, 16)
      .replace("T", " ");
    lines.push(`**Started:** ${formatted}`);
  }

  if (typeof conv.branch === "string" && conv.branch.length > 0) {
    lines.push(`**Branch:** ${conv.branch}`);
  }
  if (typeof conv.summary === "string" && conv.summary.length > 0) {
    lines.push(`**Summary:** ${conv.summary}`);
  }
  lines.push("");

  for (const message of conv.messages) {
    const role = message.role === "user" ? "👤 User" : "🤖 Assistant";
    const time =
      typeof message.timestamp === "string" && message.timestamp.length > 0
        ? ` (${new Date(message.timestamp).toISOString().slice(11, 19)})`
        : "";
    lines.push(`### ${role}${time}`);
    lines.push(message.content);
    lines.push("");
  }

  lines.push("---\n");
  return lines.join("\n");
}

/**
 * Format the full report
 */
function formatReport(conversations: Array<Conversation>): string {
  const header = [
    "# Conversation Extracts\n",
    `Generated: ${new Date().toISOString()}`,
    `Conversations: ${conversations.length}\n`,
    "---\n",
  ];

  const sections = conversations.map((conv) => formatConversation(conv));
  return [...header, ...sections].join("\n");
}

// =============================================================================
// JSONL Parsing (Effect-based)
// =============================================================================

/**
 * Get conversation files from both local and global directories
 */
function getConversationFilesEffect(
  limit: number,
  skip = 0,
): Effect.Effect<Array<ConversationFile>, FileNotFoundError, FileSystem> {
  return Effect.gen(function* getConversationFilesGen() {
    const cwd = process.cwd();
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
 * Get stat for a file with proper error handling
 */
function getFileStat(
  filePath: string,
): Effect.Effect<ConversationFile, FileReadError> {
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

/**
 * List JSONL files in a directory with their modification times
 */
function listJsonlFilesEffect(
  directory: string,
): Effect.Effect<Array<ConversationFile>, never, FileSystem> {
  return Effect.gen(function* listJsonlFilesGen() {
    const fs: FileSystemService = yield* FileSystem;

    // Try to read directory, return empty array if not found
    const filesResult = yield* Effect.either(fs.readDirectory(directory));

    if (filesResult._tag === "Left") {
      return [];
    }

    const files = filesResult.right;
    const jsonlFiles = files.filter(
      (f) => f.endsWith(".jsonl") && !f.startsWith("agent-"),
    );

    // Get stats for all files in parallel
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

// =============================================================================
// Formatting
// =============================================================================

/**
 * Parse a JSONL file into a Conversation
 */
function parseConversationEffect(
  filepath: string,
): Effect.Effect<Conversation, FileNotFoundError | FileReadError, FileSystem> {
  return Effect.gen(function* parseConversationGen() {
    const fs: FileSystemService = yield* FileSystem;

    const content = yield* fs.readFile(filepath);
    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    const conversation: Conversation = {
      messages: [],
      sessionId: basename(filepath, ".jsonl"),
    };

    for (const line of lines) {
      processLine(line, conversation);
    }

    return conversation;
  });
}

/**
 * Parse multiple conversation files with concurrency control
 */
function parseConversationsEffect(
  files: Array<ConversationFile>,
): Effect.Effect<Array<Conversation>, never, FileSystem> {
  return Effect.gen(function* parseConversationsGen() {
    const results = yield* Effect.all(
      files.map((file) => Effect.either(parseConversationEffect(file.path))),
      { concurrency: 5 },
    );

    // Filter to successful parses with non-empty messages
    const conversations: Array<Conversation> = [];
    for (const result of results) {
      if (result._tag === "Right" && result.right.messages.length > 0) {
        conversations.push(result.right);
      }
    }

    return conversations;
  });
}

// =============================================================================
// Output Writing (Effect-based)
// =============================================================================

/**
 * Process a single JSONL line and update conversation state
 */
function processLine(line: string, conversation: Conversation): void {
  try {
    const record = JSON.parse(line) as Record<string, unknown>;

    if (record.type === "summary" && typeof record.summary === "string") {
      conversation.summary = record.summary;
      return;
    }

    if (
      record.type === "user" &&
      typeof record.gitBranch === "string" &&
      conversation.branch === undefined
    ) {
      conversation.branch = record.gitBranch;
    }

    if (record.isMeta === true) {
      return;
    }

    const messageContent = extractMessageContent(record);
    if (messageContent !== null) {
      conversation.messages.push(messageContent);
    }
  } catch {
    // Skip malformed lines
  }
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Write output to file or stdout
 */
function writeOutputEffect(
  content: string,
  outputPath: string | undefined,
): Effect.Effect<void, never, FileSystem> {
  return Effect.gen(function* writeOutputGen() {
    if (typeof outputPath === "string" && outputPath.length > 0) {
      const fs: FileSystemService = yield* FileSystem;
      const writeResult = yield* Effect.either(
        fs.writeFile(outputPath, content),
      );

      if (writeResult._tag === "Right") {
        log.success(`Saved to ${outputPath}`);
      } else {
        log.error(`Failed to save: ${writeResult.left.message}`);
      }
    } else {
      console.log(content);
    }
  });
}

export default extractConversations;

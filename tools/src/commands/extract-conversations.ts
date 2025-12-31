import log from "@lib/log";
import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

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
}

// Claude uses kebab-case with dots converted to dashes
function buildProjectName(directory: string): string {
  return `-${directory.replaceAll(".", "-").replaceAll("/", "-").replace(/^-/, "")}`;
}

// Extract text from message content (string or array of blocks)
function extractContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const parts: Array<string> = [];

  for (const block of content) {
    if (typeof block !== "object" || block === null) {
      // Skip non-object blocks
    } else {
      const formatted = formatContentBlock(block as ContentBlock);
      if (formatted.length > 0) {
        parts.push(formatted);
      }
    }
  }

  return parts.join("\n\n");
}

// Entry point - orchestrates the extraction flow
async function extractConversations(options: Options): Promise<void> {
  const files = await getConversationFiles(options.limit);
  log.info(`Found ${files.length} conversations`);

  const conversations = await Promise.all(
    files.map(async (file) => parseConversation(file.path)),
  );

  const nonEmpty = conversations.filter((c) => c.messages.length > 0);
  const markdown = formatReport(nonEmpty);

  await writeOutput(markdown, options.output);
}

// Extract message content from a record
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

// Format a single content block
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

// Format a single conversation
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

// Format the full report
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

// Get conversation files from both local and global directories
async function getConversationFiles(
  limit: number,
): Promise<Array<ConversationFile>> {
  const cwd = process.cwd();
  const projectName = buildProjectName(cwd);

  const localDirectory = join(cwd, ".claude", "projects", projectName);
  const globalDirectory = join(homedir(), ".claude", "projects", projectName);

  const [localFiles, globalFiles] = await Promise.all([
    listJsonlFiles(localDirectory),
    listJsonlFiles(globalDirectory),
  ]);

  const allFiles = [...localFiles, ...globalFiles];

  if (allFiles.length === 0) {
    log.error(
      `No conversations found in:\n  ${localDirectory}\n  ${globalDirectory}`,
    );
    process.exit(1);
  }

  allFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  return allFiles.slice(0, limit);
}

// List JSONL files in a directory with their modification times
async function listJsonlFiles(
  directory: string,
): Promise<Array<ConversationFile>> {
  try {
    const files = await readdir(directory);
    const jsonlFiles = files.filter(
      (f) => f.endsWith(".jsonl") && !f.startsWith("agent-"),
    );

    const statsPromises = jsonlFiles.map(async (file) => {
      const filepath = join(directory, file);
      const fileStats = await stat(filepath);
      return { mtime: fileStats.mtime, path: filepath };
    });

    return Promise.all(statsPromises);
  } catch {
    return [];
  }
}

// Parse a JSONL file into a Conversation
async function parseConversation(filepath: string): Promise<Conversation> {
  const content = await readFile(filepath, "utf8");
  const lines = content.split("\n").filter((line) => line.trim().length > 0);

  const conversation: Conversation = {
    messages: [],
    sessionId: basename(filepath, ".jsonl"),
  };

  for (const line of lines) {
    processLine(line, conversation);
  }

  return conversation;
}

// Process a single JSONL line
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

// Write output to file or stdout
async function writeOutput(
  content: string,
  outputPath: string | undefined,
): Promise<void> {
  if (typeof outputPath === "string" && outputPath.length > 0) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(outputPath, content);
    log.success(`Saved to ${outputPath}`);
  } else {
    console.log(content);
  }
}

export default extractConversations;

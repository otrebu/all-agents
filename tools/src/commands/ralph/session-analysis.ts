import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import readline from "node:readline";

import type { TokenUsage } from "./types";

import {
  calculateDurationMs,
  countToolCalls,
  getFilesFromSession,
  getTokenUsageFromSession,
} from "./session";

interface EditBacktrackingSignal {
  file: string;
  firstEditLine: number;
  reversalLine: number;
  type: "exact" | "partial";
}

interface FileNotFoundSignal {
  file: string;
  line: number;
  tool: string;
}

interface FilesTooBigSignal {
  file: string;
  line: number;
  tokens: number;
}

interface InputTuple {
  hash: string;
  toolName: string;
}

interface OffTrackReport {
  durationMs: number;
  filesRead: Array<string>;
  filesWritten: Array<string>;
  offTrackScore: number;
  sessionId: string;
  signals: {
    editBacktracking: Array<EditBacktrackingSignal>;
    filesNotFound: Array<FileNotFoundSignal>;
    filesTooBig: Array<FilesTooBigSignal>;
    stuckLoops: Array<StuckLoopSignal>;
  };
  tokenUsage: TokenUsage;
  toolUseCounts: Record<string, number>;
  totalMessages: number;
  totalToolCalls: number;
}

interface ProcessLineContext {
  line: number;
  raw: string;
  toolNameById: Map<string, string>;
}

interface SignalDetector {
  buildSignals: () => void;
  processToolResult: (
    event: ToolResultEvent,
    context: ProcessLineContext,
  ) => void;
  processToolUse: (event: ToolUseEvent, context: ProcessLineContext) => void;
}

interface StuckLoopSignal {
  endLine: number;
  pattern: string;
  repetitions: number;
  startLine: number;
}

interface ToolResultEvent {
  content: string;
  isError: boolean;
  line: number;
  raw: string;
  toolUseId?: string;
}

interface ToolUseEvent {
  id?: string;
  input: unknown;
  line: number;
  name: string;
}

class BacktrackDetector implements SignalDetector {
  readonly matches: Array<EditBacktrackingSignal> = [];

  private readonly editsByFile = new Map<
    string,
    Array<{ line: number; newString: string; oldString: string }>
  >();

  buildSignals(): void {}

  processToolResult(): void {}

  processToolUse(event: ToolUseEvent): void {
    if (event.name !== "Edit") {
      return;
    }

    const parsed = parseEditInput(event.input);
    if (parsed === null) {
      return;
    }

    const fileEdits = this.editsByFile.get(parsed.file) ?? [];
    const exactMatch = fileEdits.find((previousEdit) =>
      isExactReversal(previousEdit.oldString, previousEdit.newString, parsed),
    );
    if (exactMatch === undefined) {
      const partialMatch = fileEdits.find((previousEdit) =>
        isPartialReversal(
          previousEdit.oldString,
          previousEdit.newString,
          parsed,
        ),
      );
      if (partialMatch !== undefined) {
        this.matches.push({
          file: parsed.file,
          firstEditLine: partialMatch.line,
          reversalLine: event.line,
          type: "partial",
        });
      }
    } else {
      this.matches.push({
        file: parsed.file,
        firstEditLine: exactMatch.line,
        reversalLine: event.line,
        type: "exact",
      });
    }

    fileEdits.push({
      line: event.line,
      newString: parsed.newString,
      oldString: parsed.oldString,
    });
    if (fileEdits.length > 100) {
      fileEdits.shift();
    }
    this.editsByFile.set(parsed.file, fileEdits);
  }
}

class FileNotFoundDetector implements SignalDetector {
  readonly matches: Array<FileNotFoundSignal> = [];

  buildSignals(): void {}

  processToolResult(event: ToolResultEvent, context: ProcessLineContext): void {
    if (!event.isError) {
      return;
    }

    const searchable = `${event.content}\n${event.raw}`;
    if (!/file does not exist/i.test(searchable)) {
      return;
    }

    const toolName =
      event.toolUseId === undefined
        ? "unknown"
        : (context.toolNameById.get(event.toolUseId) ?? "unknown");

    this.matches.push({
      file: extractFilePath(searchable),
      line: event.line,
      tool: toolName,
    });
  }

  processToolUse(): void {}
}

class FilesTooBigDetector implements SignalDetector {
  readonly matches: Array<FilesTooBigSignal> = [];

  buildSignals(): void {}

  processToolResult(event: ToolResultEvent): void {
    const searchable = `${event.content}\n${event.raw}`;
    if (!/exceeds maximum allowed tokens/i.test(searchable)) {
      return;
    }

    const tokenMatch = /(?<tokens>\d[\d,]*)\s*tokens?/i.exec(searchable);
    if (tokenMatch?.groups?.tokens === undefined) {
      return;
    }
    const tokens = Number.parseInt(
      tokenMatch.groups.tokens.replaceAll(",", ""),
      10,
    );
    if (!Number.isFinite(tokens)) {
      return;
    }

    this.matches.push({
      file: extractFilePath(searchable),
      line: event.line,
      tokens,
    });
  }

  processToolUse(): void {}
}

class StuckLoopDetector implements SignalDetector {
  readonly matches: Array<StuckLoopSignal> = [];

  private activePattern: {
    endLine: number;
    key: string;
    repetitions: number;
    startLine: number;
  } | null = null;

  private readonly tuples: Array<{
    key: string;
    line: number;
    tuple: InputTuple;
  }> = [];

  buildSignals(): void {
    this.recordPatternState();
  }

  processToolResult(): void {}

  processToolUse(event: ToolUseEvent): void {
    const tuple: InputTuple = {
      hash: createInputHash(event.input),
      toolName: event.name,
    };
    this.tuples.push({ key: buildTupleKey(tuple), line: event.line, tuple });

    if (this.tuples.length < 3 || this.tuples.length % 3 !== 0) {
      return;
    }

    const currentBlock = this.tuples.slice(-3);
    const firstInBlock = currentBlock[0];
    const lastInBlock = currentBlock[2];
    if (firstInBlock === undefined || lastInBlock === undefined) {
      return;
    }

    const blockKey = currentBlock.map((entry) => entry.key).join(" -> ");
    if (this.activePattern?.key === blockKey) {
      this.activePattern.repetitions += 1;
      this.activePattern.endLine = lastInBlock.line;
      return;
    }

    this.recordPatternState();
    this.activePattern = {
      endLine: lastInBlock.line,
      key: blockKey,
      repetitions: 1,
      startLine: firstInBlock.line,
    };
  }

  private recordPatternState(): void {
    if (this.activePattern === null || this.activePattern.repetitions < 2) {
      return;
    }

    this.matches.push({
      endLine: this.activePattern.endLine,
      pattern: this.activePattern.key,
      repetitions: this.activePattern.repetitions,
      startLine: this.activePattern.startLine,
    });
    this.activePattern = null;
  }
}

function buildTupleKey(tuple: InputTuple): string {
  return `${tuple.toolName}:${tuple.hash}`;
}

function createInputHash(input: unknown): string {
  return createHash("sha1")
    .update(stringifyStable(input))
    .digest("hex")
    .slice(0, 12);
}

function extractFilePath(value: string): string {
  const messagePathPatterns = [
    /(?:file|path)\s*[:=]\s*["'](?<file>[^"']+)["']/i,
    /["'](?<file>(?:\.|\/)?[A-Za-z0-9_./-]+)["']\s+exceeds maximum allowed tokens/i,
    /file does not exist\s*:?\s*(?<file>(?:\.|\/)?[A-Za-z0-9_./-]+)/i,
  ];
  for (const pattern of messagePathPatterns) {
    const match = pattern.exec(value);
    if (match?.groups?.file !== undefined) {
      return match.groups.file;
    }
  }

  const jsonPathPatterns = [
    /"file_path"\s*:\s*"(?<file>[^"]+)"/,
    /"path"\s*:\s*"(?<file>[^"]+)"/,
  ];
  for (const pattern of jsonPathPatterns) {
    const match = pattern.exec(value);
    if (match?.groups?.file !== undefined) {
      return match.groups.file;
    }
  }

  return "unknown";
}

function extractInputPath(input: unknown): null | string {
  if (!isRecord(input)) {
    return null;
  }

  if (typeof input.file_path === "string" && input.file_path !== "") {
    return input.file_path;
  }
  if (typeof input.path === "string" && input.path !== "") {
    return input.path;
  }
  return null;
}

async function extractSignals(
  sessionPath: string,
  sessionId = "unknown",
): Promise<OffTrackReport> {
  const filesWritten = getFilesFromSession(sessionPath);
  const report: OffTrackReport = {
    durationMs: calculateDurationMs(sessionPath),
    filesRead: [],
    filesWritten,
    offTrackScore: 0,
    sessionId,
    signals: {
      editBacktracking: [],
      filesNotFound: [],
      filesTooBig: [],
      stuckLoops: [],
    },
    tokenUsage: getTokenUsageFromSession(sessionPath),
    toolUseCounts: {},
    totalMessages: 0,
    totalToolCalls: countToolCalls(sessionPath),
  };

  if (!existsSync(sessionPath)) {
    return report;
  }

  const toolNameById = new Map<string, string>();
  const fileReads = new Set<string>();
  const filesWrites = new Set(filesWritten);

  const filesTooBigDetector = new FilesTooBigDetector();
  const fileNotFoundDetector = new FileNotFoundDetector();
  const stuckLoopDetector = new StuckLoopDetector();
  const backtrackDetector = new BacktrackDetector();

  const detectors: Array<SignalDetector> = [
    filesTooBigDetector,
    fileNotFoundDetector,
    stuckLoopDetector,
    backtrackDetector,
  ];

  const stream = createReadStream(sessionPath, { encoding: "utf8" });
  const lineReader = readline.createInterface({
    crlfDelay: Infinity,
    input: stream,
  });

  let lineNumber = 0;
  for await (const line of lineReader) {
    lineNumber += 1;
    const trimmed = line.trim();
    if (trimmed !== "") {
      report.totalMessages += 1;

      const parsedLine = parseJsonSafely(trimmed);
      const context: ProcessLineContext = {
        line: lineNumber,
        raw: trimmed,
        toolNameById,
      };

      const toolUseEvents = extractToolUseEvents(parsedLine, lineNumber);
      for (const event of toolUseEvents) {
        if (event.id !== undefined && event.id !== "") {
          toolNameById.set(event.id, event.name);
        }

        report.toolUseCounts[event.name] =
          (report.toolUseCounts[event.name] ?? 0) + 1;
        updateFileSets(event, fileReads, filesWrites);

        for (const detector of detectors) {
          detector.processToolUse(event, context);
        }
      }

      const toolResultEvents = extractToolResultEvents(
        parsedLine,
        lineNumber,
        trimmed,
      );
      for (const event of toolResultEvents) {
        for (const detector of detectors) {
          detector.processToolResult(event, context);
        }
      }
    }
  }

  for (const detector of detectors) {
    detector.buildSignals();
  }

  report.filesRead = [...fileReads];
  report.filesWritten = [...filesWrites];
  report.signals.filesTooBig = filesTooBigDetector.matches;
  report.signals.filesNotFound = fileNotFoundDetector.matches;
  report.signals.stuckLoops = stuckLoopDetector.matches;
  report.signals.editBacktracking = backtrackDetector.matches;
  return report;
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }

  const parts: Array<string> = [];
  for (const entry of content) {
    if (isRecord(entry) && typeof entry.text === "string") {
      parts.push(entry.text);
    } else if (isRecord(entry) && typeof entry.content === "string") {
      parts.push(entry.content);
    }
  }

  return parts.join("\n");
}

function extractToolResultEvents(
  parsedLine: unknown,
  lineNumber: number,
  rawLine: string,
): Array<ToolResultEvent> {
  const events: Array<ToolResultEvent> = [];

  const rootEvent = parseToolResultEntry(parsedLine, lineNumber, rawLine);
  if (rootEvent !== null) {
    events.push(rootEvent);
  }

  const messageContent = getMessageContent(parsedLine);
  if (messageContent === null) {
    return events;
  }

  for (const entry of messageContent) {
    const childEvent = parseToolResultEntry(entry, lineNumber, rawLine);
    if (childEvent !== null) {
      events.push(childEvent);
    }
  }

  return events;
}

function extractToolUseEvents(
  parsedLine: unknown,
  lineNumber: number,
): Array<ToolUseEvent> {
  const events: Array<ToolUseEvent> = [];

  const rootEvent = parseToolUseEntry(parsedLine, lineNumber);
  if (rootEvent !== null) {
    events.push(rootEvent);
  }

  const messageContent = getMessageContent(parsedLine);
  if (messageContent === null) {
    return events;
  }

  for (const entry of messageContent) {
    const childEvent = parseToolUseEntry(entry, lineNumber);
    if (childEvent !== null) {
      events.push(childEvent);
    }
  }

  return events;
}

function getMessageContent(value: unknown): Array<unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  const { message } = value;
  if (!isRecord(message)) {
    return null;
  }
  const { content } = message;
  return Array.isArray(content) ? content : null;
}

function hasSubstringOverlap(left: string, right: string): boolean {
  const normalizedLeft = left.trim();
  const normalizedRight = right.trim();
  if (normalizedLeft.length < 4 || normalizedRight.length < 4) {
    return false;
  }
  const hasDirectSubstring =
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft);
  if (hasDirectSubstring) {
    return true;
  }

  const leftTokens = new Set(
    normalizedLeft
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((token) => token.length >= 2),
  );
  const rightTokens = normalizedRight
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((token) => token.length >= 2);

  let sharedCount = 0;
  for (const token of rightTokens) {
    if (leftTokens.has(token)) {
      sharedCount += 1;
    }
    if (sharedCount >= 2) {
      return true;
    }
  }

  return false;
}

function isExactReversal(
  previousOld: string,
  previousNew: string,
  current: { newString: string; oldString: string },
): boolean {
  return previousOld === current.newString && previousNew === current.oldString;
}

function isPartialReversal(
  previousOld: string,
  previousNew: string,
  current: { newString: string; oldString: string },
): boolean {
  if (isExactReversal(previousOld, previousNew, current)) {
    return false;
  }

  return (
    hasSubstringOverlap(previousOld, current.newString) &&
    hasSubstringOverlap(previousNew, current.oldString)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseEditInput(
  input: unknown,
): { file: string; newString: string; oldString: string } | null {
  if (!isRecord(input)) {
    return null;
  }
  const filePath = input.file_path;
  const fallbackPath = input.path;
  let file = "";
  if (typeof filePath === "string") {
    file = filePath;
  } else if (typeof fallbackPath === "string") {
    file = fallbackPath;
  }
  if (file === "") {
    return null;
  }
  if (
    typeof input.old_string !== "string" ||
    typeof input.new_string !== "string"
  ) {
    return null;
  }

  return { file, newString: input.new_string, oldString: input.old_string };
}

function parseJsonSafely(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function parseToolResultEntry(
  value: unknown,
  lineNumber: number,
  rawLine: string,
): null | ToolResultEvent {
  if (!isRecord(value) || value.type !== "tool_result") {
    return null;
  }

  const toolUseId = value.tool_use_id;
  return {
    content: extractTextFromContent(value.content),
    isError: value.is_error === true,
    line: lineNumber,
    raw: rawLine,
    toolUseId: typeof toolUseId === "string" ? toolUseId : undefined,
  };
}

function parseToolUseEntry(
  value: unknown,
  lineNumber: number,
): null | ToolUseEvent {
  if (
    !isRecord(value) ||
    value.type !== "tool_use" ||
    typeof value.name !== "string"
  ) {
    return null;
  }

  return {
    id: typeof value.id === "string" ? value.id : undefined,
    input: value.input,
    line: lineNumber,
    name: value.name,
  };
}

function stringifyStable(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "string") {
      return JSON.stringify(value);
    }
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stringifyStable(entry)).join(",")}]`;
  }

  const sorted = Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stringifyStable((value as Record<string, unknown>)[key])}`,
    )
    .join(",");
  return `{${sorted}}`;
}

function updateFileSets(
  event: ToolUseEvent,
  reads: Set<string>,
  writes: Set<string>,
): void {
  const filePath = extractInputPath(event.input);
  if (filePath === null) {
    return;
  }

  if (event.name === "Read" || event.name === "Glob" || event.name === "Grep") {
    reads.add(filePath);
  }

  if (event.name === "Write" || event.name === "Edit") {
    writes.add(filePath);
  }
}

export {
  BacktrackDetector,
  extractSignals,
  FileNotFoundDetector,
  FilesTooBigDetector,
  StuckLoopDetector,
};
export type {
  EditBacktrackingSignal,
  FileNotFoundSignal,
  FilesTooBigSignal,
  OffTrackReport,
  StuckLoopSignal,
};

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

interface BacktrackDetector extends SignalDetector {
  matches: Array<EditBacktrackingSignal>;
}

interface EditBacktrackingSignal {
  file: string;
  firstEditLine: number;
  reversalLine: number;
  type: "exact" | "partial";
}

interface ExplorationDetector extends SignalDetector {
  matches: Array<ExplorationSignal>;
}

interface ExplorationSignal {
  endLine: number;
  readCount: number;
  readFiles: Array<string>;
  startLine: number;
}

interface FileNotFoundDetector extends SignalDetector {
  matches: Array<FileNotFoundSignal>;
}

interface FileNotFoundSignal {
  file: string;
  line: number;
  tool: string;
}

interface FilesTooBigDetector extends SignalDetector {
  matches: Array<FilesTooBigSignal>;
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
    explorationWithoutProduction: Array<ExplorationSignal>;
    filesNotFound: Array<FileNotFoundSignal>;
    filesTooBig: Array<FilesTooBigSignal>;
    selfCorrections: Array<SelfCorrectionSignal>;
    stuckLoops: Array<StuckLoopSignal>;
    testFixLoops: Array<TestFixLoopSignal>;
    tokenAcceleration: null | TokenAccelerationSignal;
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

interface SelfCorrectionDetector extends SignalDetector {
  matches: Array<SelfCorrectionSignal>;
}

interface SelfCorrectionSignal {
  line: number;
  matchedPhrases: Array<string>;
  snippet: string;
}

interface SignalDetector {
  buildSignals: () => void;
  processLine: (parsedLine: unknown, context: ProcessLineContext) => void;
  processToolResult: (
    event: ToolResultEvent,
    context: ProcessLineContext,
  ) => void;
  processToolUse: (event: ToolUseEvent, context: ProcessLineContext) => void;
}

interface StuckLoopDetector extends SignalDetector {
  matches: Array<StuckLoopSignal>;
}

interface StuckLoopSignal {
  endLine: number;
  pattern: string;
  repetitions: number;
  startLine: number;
}

interface TestFixLoopDetector extends SignalDetector {
  matches: Array<TestFixLoopSignal>;
}

interface TestFixLoopSignal {
  cycles: number;
  endLine: number;
  errorSignature: string;
  startLine: number;
}

interface TokenAccelerationDetector extends SignalDetector {
  match: null | TokenAccelerationSignal;
}

interface TokenAccelerationSignal {
  endTokens: number;
  multiplier: number;
  startTokens: number;
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

function buildTupleKey(tuple: InputTuple): string {
  return `${tuple.toolName}:${tuple.hash}`;
}

function createBacktrackDetector(): BacktrackDetector {
  const matches: Array<EditBacktrackingSignal> = [];
  const editsByFile = new Map<
    string,
    Array<{ line: number; newString: string; oldString: string }>
  >();

  function buildSignals(): void {}

  function processLine(): void {}

  function processToolResult(): void {}

  function processToolUse(event: ToolUseEvent): void {
    if (event.name !== "Edit") {
      return;
    }

    const parsed = parseEditInput(event.input);
    if (parsed === null) {
      return;
    }

    const fileEdits = editsByFile.get(parsed.file) ?? [];
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
        matches.push({
          file: parsed.file,
          firstEditLine: partialMatch.line,
          reversalLine: event.line,
          type: "partial",
        });
      }
    } else {
      matches.push({
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
    editsByFile.set(parsed.file, fileEdits);
  }

  return {
    buildSignals,
    matches,
    processLine,
    processToolResult,
    processToolUse,
  };
}

function createExplorationDetector(): ExplorationDetector {
  const matches: Array<ExplorationSignal> = [];
  let currentWindow: {
    endLine: number;
    readCount: number;
    readFiles: Set<string>;
    startLine: number;
  } | null = null;

  function recordWindowSignal(): void {
    if (currentWindow === null || currentWindow.readCount < 10) {
      currentWindow = null;
      return;
    }

    matches.push({
      endLine: currentWindow.endLine,
      readCount: currentWindow.readCount,
      readFiles: [...currentWindow.readFiles],
      startLine: currentWindow.startLine,
    });
    currentWindow = null;
  }

  function buildSignals(): void {
    recordWindowSignal();
  }

  function processLine(): void {}

  function processToolResult(): void {}

  function processToolUse(event: ToolUseEvent): void {
    if (isReadOnlyTool(event.name)) {
      const path = extractInputPath(event.input);
      if (currentWindow === null) {
        currentWindow = {
          endLine: event.line,
          readCount: 1,
          readFiles: new Set(path === null ? [] : [path]),
          startLine: event.line,
        };
      } else {
        currentWindow.endLine = event.line;
        currentWindow.readCount += 1;
        if (path !== null) {
          currentWindow.readFiles.add(path);
        }
      }
      return;
    }

    recordWindowSignal();
  }

  return {
    buildSignals,
    matches,
    processLine,
    processToolResult,
    processToolUse,
  };
}

function createFileNotFoundDetector(): FileNotFoundDetector {
  const matches: Array<FileNotFoundSignal> = [];

  function buildSignals(): void {}

  function processLine(): void {}

  function processToolResult(
    event: ToolResultEvent,
    context: ProcessLineContext,
  ): void {
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

    matches.push({
      file: extractFilePath(searchable),
      line: event.line,
      tool: toolName,
    });
  }

  function processToolUse(): void {}

  return {
    buildSignals,
    matches,
    processLine,
    processToolResult,
    processToolUse,
  };
}

function createFilesTooBigDetector(): FilesTooBigDetector {
  const matches: Array<FilesTooBigSignal> = [];

  function buildSignals(): void {}

  function processLine(): void {}

  function processToolResult(event: ToolResultEvent): void {
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

    matches.push({
      file: extractFilePath(searchable),
      line: event.line,
      tokens,
    });
  }

  function processToolUse(): void {}

  return {
    buildSignals,
    matches,
    processLine,
    processToolResult,
    processToolUse,
  };
}

function createInputHash(input: unknown): string {
  return createHash("sha1")
    .update(stringifyStable(input))
    .digest("hex")
    .slice(0, 12);
}

function createSelfCorrectionDetector(): SelfCorrectionDetector {
  const matches: Array<SelfCorrectionSignal> = [];

  function buildSignals(): void {}

  function processLine(parsedLine: unknown, context: ProcessLineContext): void {
    const assistantText = extractAssistantText(parsedLine);
    if (assistantText === "") {
      return;
    }

    const matchedPhrases = matchSelfCorrectionPhrases(assistantText);
    if (matchedPhrases.length === 0) {
      return;
    }

    matches.push({
      line: context.line,
      matchedPhrases,
      snippet: buildSnippet(assistantText),
    });
  }

  function processToolResult(): void {}

  function processToolUse(): void {}

  return {
    buildSignals,
    matches,
    processLine,
    processToolResult,
    processToolUse,
  };
}

function createStuckLoopDetector(): StuckLoopDetector {
  const matches: Array<StuckLoopSignal> = [];
  let activePattern: {
    endLine: number;
    key: string;
    repetitions: number;
    startLine: number;
  } | null = null;
  const tuples: Array<{ key: string; line: number; tuple: InputTuple }> = [];

  function recordPatternState(): void {
    if (activePattern === null || activePattern.repetitions < 2) {
      return;
    }

    matches.push({
      endLine: activePattern.endLine,
      pattern: activePattern.key,
      repetitions: activePattern.repetitions,
      startLine: activePattern.startLine,
    });
    activePattern = null;
  }

  function buildSignals(): void {
    recordPatternState();
  }

  function processLine(): void {}

  function processToolResult(): void {}

  function processToolUse(event: ToolUseEvent): void {
    const tuple: InputTuple = {
      hash: createInputHash(event.input),
      toolName: event.name,
    };
    tuples.push({ key: buildTupleKey(tuple), line: event.line, tuple });

    if (tuples.length < 3 || tuples.length % 3 !== 0) {
      return;
    }

    const currentBlock = tuples.slice(-3);
    const firstInBlock = currentBlock[0];
    const lastInBlock = currentBlock[2];
    if (firstInBlock === undefined || lastInBlock === undefined) {
      return;
    }

    const blockKey = currentBlock.map((entry) => entry.key).join(" -> ");
    if (activePattern?.key === blockKey) {
      activePattern.repetitions += 1;
      activePattern.endLine = lastInBlock.line;
      return;
    }

    recordPatternState();
    activePattern = {
      endLine: lastInBlock.line,
      key: blockKey,
      repetitions: 1,
      startLine: firstInBlock.line,
    };
  }

  return {
    buildSignals,
    matches,
    processLine,
    processToolResult,
    processToolUse,
  };
}

function createTestFixLoopDetector(): TestFixLoopDetector {
  const matches: Array<TestFixLoopSignal> = [];
  let activeLoop: {
    cycles: number;
    endLine: number;
    errorSignature: string;
    startLine: number;
  } | null = null;
  let baseline: { line: number; signature: string } | null = null;
  let hasEditSinceBaseline = false;
  const testBashUseLines = new Map<string, number>();

  function recordActiveLoop(): void {
    if (activeLoop === null) {
      return;
    }
    matches.push(activeLoop);
    activeLoop = null;
  }

  function buildSignals(): void {
    if (activeLoop !== null) {
      matches.push(activeLoop);
      activeLoop = null;
    }
  }

  function processLine(): void {}

  function processToolResult(event: ToolResultEvent): void {
    if (event.toolUseId === undefined) {
      return;
    }
    const firstTestLine = testBashUseLines.get(event.toolUseId);
    if (firstTestLine === undefined) {
      return;
    }

    const signature = normalizeErrorSignature(event.content);
    if (signature === "") {
      baseline = { line: event.line, signature: "" };
      hasEditSinceBaseline = false;
      recordActiveLoop();
      return;
    }

    if (
      baseline !== null &&
      hasEditSinceBaseline &&
      baseline.signature !== "" &&
      baseline.signature === signature
    ) {
      if (activeLoop?.errorSignature === signature) {
        activeLoop.cycles += 1;
        activeLoop.endLine = event.line;
      } else {
        recordActiveLoop();
        activeLoop = {
          cycles: 1,
          endLine: event.line,
          errorSignature: signature,
          startLine: baseline.line,
        };
      }
    } else {
      recordActiveLoop();
    }

    baseline = { line: event.line, signature };
    hasEditSinceBaseline = false;
    testBashUseLines.delete(event.toolUseId);
    if (firstTestLine > event.line) {
      recordActiveLoop();
    }
  }

  function processToolUse(event: ToolUseEvent): void {
    if (event.name === "Edit") {
      if (baseline !== null) {
        hasEditSinceBaseline = true;
      }
      return;
    }

    if (event.name !== "Bash" || !isTestCommand(event.input)) {
      return;
    }

    if (event.id !== undefined && event.id !== "") {
      testBashUseLines.set(event.id, event.line);
    }
  }

  return {
    buildSignals,
    matches,
    processLine,
    processToolResult,
    processToolUse,
  };
}

function createTokenAccelerationDetector(): TokenAccelerationDetector {
  let endTokens = 0;
  let startTokens: null | number = null;

  const detector: TokenAccelerationDetector = {
    buildSignals,
    match: null,
    processLine,
    processToolResult,
    processToolUse,
  };

  function buildSignals(): void {
    if (startTokens === null || startTokens <= 0 || endTokens <= startTokens) {
      return;
    }

    const multiplier = endTokens / startTokens;
    if (multiplier <= 3) {
      return;
    }

    detector.match = { endTokens, multiplier, startTokens };
  }

  function processLine(parsedLine: unknown): void {
    const inputTokens = extractInputTokens(parsedLine);
    if (inputTokens === null) {
      return;
    }
    startTokens ??= inputTokens;
    endTokens = inputTokens;
  }

  function processToolResult(): void {}

  function processToolUse(): void {}

  return detector;
}

function extractAssistantText(parsedLine: unknown): string {
  if (!isRecord(parsedLine) || !isRecord(parsedLine.message)) {
    return "";
  }
  if (parsedLine.message.role !== "assistant") {
    return "";
  }

  return extractTextFromContent(parsedLine.message.content);
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

function extractInputTokens(parsedLine: unknown): null | number {
  if (!isRecord(parsedLine) || !isRecord(parsedLine.message)) {
    return null;
  }
  const { usage } = parsedLine.message;
  if (!isRecord(usage) || typeof usage.input_tokens !== "number") {
    return null;
  }
  if (!Number.isFinite(usage.input_tokens) || usage.input_tokens < 0) {
    return null;
  }

  return usage.input_tokens;
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
      explorationWithoutProduction: [],
      filesNotFound: [],
      filesTooBig: [],
      selfCorrections: [],
      stuckLoops: [],
      testFixLoops: [],
      tokenAcceleration: null,
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

  const filesTooBigDetector = createFilesTooBigDetector();
  const fileNotFoundDetector = createFileNotFoundDetector();
  const stuckLoopDetector = createStuckLoopDetector();
  const backtrackDetector = createBacktrackDetector();
  const explorationDetector = createExplorationDetector();
  const selfCorrectionDetector = createSelfCorrectionDetector();
  const tokenAccelerationDetector = createTokenAccelerationDetector();
  const testFixLoopDetector = createTestFixLoopDetector();

  const detectors: Array<SignalDetector> = [
    filesTooBigDetector,
    fileNotFoundDetector,
    stuckLoopDetector,
    backtrackDetector,
    explorationDetector,
    selfCorrectionDetector,
    tokenAccelerationDetector,
    testFixLoopDetector,
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

      for (const detector of detectors) {
        detector.processLine(parsedLine, context);
      }

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
  report.signals.explorationWithoutProduction = explorationDetector.matches;
  report.signals.selfCorrections = selfCorrectionDetector.matches;
  report.signals.tokenAcceleration = tokenAccelerationDetector.match;
  report.signals.testFixLoops = testFixLoopDetector.matches;
  report.offTrackScore = computeOffTrackScore(report);
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

function isReadOnlyTool(toolName: string): boolean {
  return toolName === "Read" || toolName === "Glob" || toolName === "Grep";
}

function isTestCommand(input: unknown): boolean {
  if (!isRecord(input) || typeof input.command !== "string") {
    return false;
  }

  return /(?:\b(?:bun|pnpm|npm|yarn|vitest|jest|pytest|phpunit|rspec|ctest|deno)\b.*\btest\b|\bgo\s+test\b|\bcargo\s+test\b|\bmvn\s+test\b|\bgradle\s+test\b|\bmix\s+test\b)/i.test(
    input.command,
  );
}

function normalizeErrorSignature(rawOutput: string): string {
  const trimmed = rawOutput.trim();
  if (trimmed === "") {
    return "";
  }

  const normalized = trimmed
    .toLowerCase()
    .replaceAll(/[0-9]{4}-[0-9]{2}-[0-9]{2}/g, "<date>")
    .replaceAll(/[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?/g, "<time>")
    .replaceAll(/\/home\/[\w-/.]+/g, "<path>")
    .replaceAll(/[A-Za-z]:\\[^\s]+/g, "<path>")
    .replaceAll(/\bline\s+\d+\b/g, "line <n>")
    .replaceAll(/\b\d+\b/g, "<n>")
    .replaceAll(/\s+/g, " ")
    .trim();

  return normalized.length > 240 ? normalized.slice(0, 240) : normalized;
}

const SELF_CORRECTION_PATTERNS: Array<[string, RegExp]> = [
  ["actually", /\bactually\b/i],
  ["let me reconsider", /\blet me reconsider\b/i],
  ["i was wrong", /\bi was wrong\b/i],
  ["wait", /\bwait\b/i],
  ["oops", /\boops\b/i],
  ["sorry", /\bsorry\b/i],
  ["correction", /\bcorrection\b/i],
  ["on second thought", /\bon second thought\b/i],
  ["i should correct", /\bi should correct\b/i],
  ["i need to correct", /\bi need to correct\b/i],
  ["hold on", /\bhold on\b/i],
  ["let me backtrack", /\blet me backtrack\b/i],
];

function buildSnippet(text: string): string {
  const compact = text.replaceAll(/\s+/g, " ").trim();
  if (compact.length <= 180) {
    return compact;
  }
  return `${compact.slice(0, 177)}...`;
}

function clampZeroToOne(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function computeOffTrackScore(report: OffTrackReport): number {
  const sessionNormalizer = Math.max(1, report.totalMessages / 50);
  const exactReversals = report.signals.editBacktracking.filter(
    (signal) => signal.type === "exact",
  ).length;
  const partialReversals = report.signals.editBacktracking.filter(
    (signal) => signal.type === "partial",
  ).length;
  const fileErrors =
    report.signals.filesNotFound.length + report.signals.filesTooBig.length;

  const weighted =
    0.25 *
      normalizeSignalCount(
        report.signals.stuckLoops.length,
        sessionNormalizer,
      ) +
    0.2 * normalizeSignalCount(partialReversals, sessionNormalizer) +
    0.15 *
      normalizeSignalCount(
        report.signals.selfCorrections.length,
        sessionNormalizer,
      ) +
    0.1 *
      normalizeSignalCount(
        report.signals.testFixLoops.length,
        sessionNormalizer,
      ) +
    0.1 *
      normalizeSignalCount(
        report.signals.explorationWithoutProduction.length,
        sessionNormalizer,
      ) +
    0.07 * normalizeTokenAcceleration(report.signals.tokenAcceleration) +
    0.08 * normalizeSignalCount(fileErrors, sessionNormalizer) +
    0.05 * normalizeSignalCount(exactReversals, sessionNormalizer);

  return clampZeroToOne(weighted);
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

function matchSelfCorrectionPhrases(text: string): Array<string> {
  const matches: Array<string> = [];
  for (const [label, pattern] of SELF_CORRECTION_PATTERNS) {
    if (pattern.test(text)) {
      matches.push(label);
    }
  }
  return matches;
}

function normalizeSignalCount(
  count: number,
  sessionNormalizer: number,
): number {
  if (count <= 0) {
    return 0;
  }
  return clampZeroToOne(count / sessionNormalizer);
}

function normalizeTokenAcceleration(
  acceleration: null | TokenAccelerationSignal,
): number {
  if (acceleration === null) {
    return 0;
  }
  return clampZeroToOne((acceleration.multiplier - 3) / 3);
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
  createBacktrackDetector,
  createExplorationDetector,
  createFileNotFoundDetector,
  createFilesTooBigDetector,
  createSelfCorrectionDetector,
  createStuckLoopDetector,
  createTestFixLoopDetector,
  createTokenAccelerationDetector,
  extractSignals,
};
export type {
  EditBacktrackingSignal,
  ExplorationSignal,
  FileNotFoundSignal,
  FilesTooBigSignal,
  OffTrackReport,
  SelfCorrectionSignal,
  StuckLoopSignal,
  TestFixLoopSignal,
  TokenAccelerationSignal,
};

/**
 * Calibration module for Ralph autonomous build system
 *
 * This module provides calibration checks to detect drift and improve performance:
 * - runIntentionCheck() - Detect when code diverges from planning docs
 * - runTechnicalCheck() - Detect code quality issues and technical debt
 * - runImproveCheck() - Analyze session logs for inefficiencies
 * - runCalibrate() - Dispatch to correct check based on subcommand
 *
 * @see context/workflows/ralph/calibration/intention-drift.md
 * @see context/workflows/ralph/calibration/technical-drift.md
 * @see context/workflows/ralph/calibration/self-improvement.md
 */

import { loadAaaConfig } from "@tools/lib/config";
import { findProjectRoot } from "@tools/utils/paths";
import chalk from "chalk";
import { execSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import type { ProviderType } from "./providers/types";
import type {
  CalibrationLogEntry,
  LoadedSubtasksFile,
  QueueApplyLogEntry,
  QueueOperation,
  QueueProposal,
  QueueProposalLogEntry,
  QueueSubtaskDraft,
  Subtask,
  SubtasksFile,
} from "./types";

import {
  type ApprovalAction,
  evaluateApproval,
  handleNotifyWait,
  promptApproval,
} from "./approvals";
import {
  getCompletedSubtasks,
  getMilestoneLogPath,
  loadRalphConfig,
  loadSubtasksFile,
  loadTimeoutConfig,
} from "./config";
import {
  renderEventLine,
  renderInvocationHeader,
  renderPhaseCard,
} from "./display";
import { invokeWithProvider, resolveProvider } from "./providers/registry";
import { applyAndSaveProposal } from "./queue-ops";
import { getSessionJsonlPath } from "./session";
import { validateDoneSubtaskCommitEvidence } from "./validation";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for calibration checks
 */
interface CalibrateOptions {
  /** Context root path (repo root) */
  contextRoot: string;
  /** Skip approval even if config says 'suggest' */
  force?: boolean;
  /** Model override for calibration invocation */
  model?: string;
  /** Provider override for calibration invocation */
  provider?: string;
  /** Require approval even if config says 'autofix' */
  review?: boolean;
  /** Path to subtasks.json file */
  subtasksPath: string;
}

/**
 * Valid calibrate subcommands
 */
type CalibrateSubcommand = "all" | "improve" | "intention" | "technical";

// =============================================================================
// Approval Mode Logic
// =============================================================================

interface CalibrationParseResult {
  correctiveSubtasks: Array<QueueSubtaskDraft>;
  insertionMode: "append" | "prepend";
  summary: string;
}

interface CalibrationProposalArtifactOptions {
  action: ApprovalAction;
  checkName: string;
  milestonePath: string;
  proposal: QueueProposal;
  summary: string;
}

interface CalibrationProposalContext {
  checkName: string;
  options: CalibrateOptions;
  resultText: string;
  selfImproveMode?: "autofix" | "suggest";
}

interface DiffSummary {
  commitHash: string;
  filesChanged: Array<string>;
  patch: string;
  statSummary: string;
  subtaskId: string;
}

interface PlanningChainContext {
  milestoneSection?: string;
  storyContent?: string;
  subtaskJson: string;
  taskContent?: string;
}

interface ResolvedFile {
  content: string;
  path: string;
  tokenEstimate: number;
}

interface SessionLogLocation {
  sessionId: string;
  sessionLogPath: string;
  subtaskId: string;
}

interface SessionLogMissing {
  attemptedRepoRoots: Array<string>;
  attempts: number;
  sessionId: string;
  sessionRepoRoot: string;
  subtaskId: string;
}

// eslint-disable-next-line perfectionist/sort-modules -- grouped with related batch prompt contract types
interface IntentionBatchEntry {
  diff: DiffSummary;
  planningChain: PlanningChainContext;
  subtask: Subtask;
}

interface SessionLogPreflight {
  available: Array<SessionLogLocation>;
  maxAttempts: number;
  missing: Array<SessionLogMissing>;
}

interface WriteCalibrationLogOptions {
  milestonePath: string;
  operationCount: number;
  source: string;
  summary: string;
}

interface WriteQueueApplyLogOptions {
  applied: boolean;
  milestonePath: string;
  operationCount: number;
  source: string;
  summary: string;
}

function appendMilestoneLogEntry(
  milestonePath: string,
  entry: CalibrationLogEntry | QueueApplyLogEntry | QueueProposalLogEntry,
): void {
  const logPath = getMilestoneLogPath(path.resolve(milestonePath));
  const logDirectory = path.dirname(logPath);
  mkdirSync(logDirectory, { recursive: true });
  appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
}

async function applyCalibrationProposal(
  context: CalibrationProposalContext,
): Promise<boolean> {
  const { checkName, options, resultText, selfImproveMode } = context;
  const subtasksFile = loadSubtasksFileOrNull(options.subtasksPath);
  if (subtasksFile === null) {
    return false;
  }

  const parsed = parseCalibrationResult(resultText);
  if (parsed.correctiveSubtasks.length === 0) {
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message: `${checkName}: no corrective subtasks proposed`,
        state: "INFO",
      }),
    );
    return true;
  }

  const operations = buildCalibrationCreateOperations(
    parsed.correctiveSubtasks,
    parsed.insertionMode,
    subtasksFile,
  );
  const proposal: QueueProposal = {
    fingerprint: subtasksFile.fingerprint,
    operations,
    source: `calibration:${checkName.toLowerCase().replaceAll(/\s+/g, "-")}`,
    timestamp: new Date().toISOString(),
  };
  const milestonePath = getMilestonePath(options.subtasksPath);
  const approvalConfig = loadAaaConfig().ralph?.approvals;

  const action = evaluateApproval("correctionTasks", approvalConfig, {
    forceFlag: options.force === true,
    isTTY: Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY),
    reviewFlag:
      options.review === true ||
      (selfImproveMode === "suggest" && options.force !== true),
  });
  const summary =
    parsed.summary === ""
      ? `Create ${parsed.correctiveSubtasks.length} corrective subtask(s) from ${checkName}.`
      : parsed.summary;
  const artifactPath = writeCalibrationProposalArtifact({
    action,
    checkName,
    milestonePath,
    proposal,
    summary,
  });
  writeCalibrationQueueProposalLogEntry(
    milestonePath,
    proposal,
    `${checkName}: ${summary}`,
  );

  const shouldStageOnly = options.review === true || action === "exit-unstaged";
  if (shouldStageOnly) {
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message: `${checkName}: proposal staged for review at ${artifactPath}`,
        state: "DONE",
      }),
    );
    return true;
  }

  try {
    if (action === "notify-wait") {
      await handleNotifyWait("correctionTasks", approvalConfig, summary);
    }

    if (action === "prompt") {
      const didApprove = await promptApproval("correctionTasks", summary);
      if (!didApprove) {
        console.log(
          renderEventLine({
            domain: "CALIBRATE",
            message: `${checkName}: corrective proposal declined`,
            state: "SKIP",
          }),
        );
        return true;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Calibration] Approval failed: ${message}`);
    return false;
  }

  const applySummary = applyAndSaveProposal(options.subtasksPath, proposal);
  const state = applySummary.applied ? "DONE" : "SKIP";
  const message = applySummary.applied
    ? `${checkName}: applied ${applySummary.operationsApplied} operation(s), queue ${applySummary.subtasksBefore} -> ${applySummary.subtasksAfter}`
    : `${checkName}: proposal stale, queue changed before apply (artifact: ${artifactPath})`;
  console.log(renderEventLine({ domain: "CALIBRATE", message, state }));
  writeCalibrationQueueApplyLogEntry({
    applied: applySummary.applied,
    milestonePath,
    operationCount: applySummary.operationsApplied,
    source: proposal.source,
    summary: message,
  });

  return true;
}

function areTitlesSimilar(leftTitle: string, rightTitle: string): boolean {
  const left = normalizeTitle(leftTitle);
  const right = normalizeTitle(rightTitle);
  if (left === "" || right === "") {
    return false;
  }
  if (left === right || left.includes(right) || right.includes(left)) {
    return true;
  }

  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  const intersection = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  );
  const unionSize = new Set([...leftTokens, ...rightTokens]).size;
  const similarity = unionSize === 0 ? 0 : intersection.length / unionSize;
  return similarity >= 0.8;
}

function buildCalibrationCreateOperations(
  drafts: Array<QueueSubtaskDraft>,
  insertionMode: "append" | "prepend",
  subtasksFile: SubtasksFile,
): Array<QueueOperation> {
  const baseIndex =
    insertionMode === "prepend" ? 0 : subtasksFile.subtasks.length;
  return drafts.map((draft, index) => ({
    atIndex: baseIndex + index,
    subtask: {
      acceptanceCriteria: [...draft.acceptanceCriteria],
      description: draft.description,
      filesToRead: [...draft.filesToRead],
      storyRef: draft.storyRef,
      taskRef: draft.taskRef,
      title: draft.title,
    },
    type: "create",
  }));
}

function buildSelfImproveFallbackResult(preflight: SessionLogPreflight): {
  correctiveSubtasks: Array<QueueSubtaskDraft>;
  insertionMode: "prepend";
  preflight: SessionLogPreflight;
  summary: string;
} {
  const diagnostics = preflight.missing
    .map((entry) => `${entry.subtaskId}:${entry.sessionId}`)
    .join(", ");
  return {
    correctiveSubtasks: [],
    insertionMode: "prepend",
    preflight,
    summary:
      diagnostics === ""
        ? "Skipped self-improvement analysis: no available session logs."
        : `Skipped self-improvement analysis: no available session logs (${diagnostics}).`,
  };
}

function buildSessionLogPreflight(
  completedSubtasks: Array<Subtask>,
  contextRoot: string,
  maxAttempts = 3,
): SessionLogPreflight {
  const available: Array<SessionLogLocation> = [];
  const missing: Array<SessionLogMissing> = [];

  for (const subtask of completedSubtasks) {
    const {
      id: subtaskId,
      sessionId,
      sessionLogPath,
      sessionRepoRoot,
    } = subtask;
    if (sessionId === undefined || sessionId === "") {
      // eslint-disable-next-line no-continue -- completedSubtasks may come from broader callers
      continue;
    }

    const metadataPath =
      typeof sessionLogPath === "string" ? sessionLogPath : "";
    if (metadataPath !== "" && existsSync(metadataPath)) {
      available.push({ sessionId, sessionLogPath: metadataPath, subtaskId });
      // eslint-disable-next-line no-continue -- canonical path already available
      continue;
    }

    const locatorRepoRoot =
      typeof sessionRepoRoot === "string" && sessionRepoRoot !== ""
        ? sessionRepoRoot
        : contextRoot;
    const candidateRepoRoots = getUniqueStrings([locatorRepoRoot, contextRoot]);
    const boundedRepoRoots = candidateRepoRoots.slice(0, maxAttempts);
    const attemptedRepoRoots: Array<string> = [];
    let resolvedPath: null | string = null;

    for (const repoRoot of boundedRepoRoots) {
      attemptedRepoRoots.push(repoRoot);
      const candidatePath = getSessionJsonlPath(sessionId, repoRoot);
      if (candidatePath !== null) {
        resolvedPath = candidatePath;
        break;
      }
    }

    if (resolvedPath !== null) {
      available.push({ sessionId, sessionLogPath: resolvedPath, subtaskId });
      // eslint-disable-next-line no-continue -- session resolved successfully
      continue;
    }

    missing.push({
      attemptedRepoRoots,
      attempts: attemptedRepoRoots.length,
      sessionId,
      sessionRepoRoot: locatorRepoRoot,
      subtaskId,
    });
  }

  return { available, maxAttempts, missing };
}

function calculateTokenEstimate(content: string): number {
  return Math.ceil(content.length / 4);
}

function extractDiffSummary(
  commitHash: string,
  subtaskId: string,
): DiffSummary {
  const safeHash = commitHash.trim();
  if (safeHash === "") {
    return {
      commitHash,
      filesChanged: [],
      patch: "",
      statSummary: "",
      subtaskId,
    };
  }

  const statSummary = execSync(`git show --stat --format=fuller ${safeHash}`, {
    encoding: "utf8",
  });
  const patch = execSync(`git show --format=fuller ${safeHash}`, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });

  const filesChanged = statSummary
    .split("\n")
    .map((line) => /^\s*(?<file>.+?)\s+\|\s+\d+/.exec(line)?.groups?.file)
    .filter((file): file is string => typeof file === "string" && file !== "");

  return { commitHash, filesChanged, patch, statSummary, subtaskId };
}

function extractStoryReference(taskContent: string): null | string {
  const markdownLinkMatch =
    /\*\*Story:\*\*\s*\[(?<storyReference>[^\]]+)\]\([^)]+\)/.exec(taskContent);
  if (markdownLinkMatch?.groups?.storyReference !== undefined) {
    return markdownLinkMatch.groups.storyReference;
  }

  const plainStoryMatch = /\b(?<storyReference>STORY-\d{3})\b/.exec(
    taskContent,
  );
  return plainStoryMatch?.groups?.storyReference ?? null;
}

function extractWorkstreamSection(
  milestoneContent: string,
  taskReference: string,
): null | string {
  const workstreamReferenceMatch = /(?<workstreamReference>WS-\d{2})/.exec(
    taskReference,
  );
  if (workstreamReferenceMatch === null) {
    return null;
  }
  const workstreamReference =
    workstreamReferenceMatch.groups?.workstreamReference;
  if (workstreamReference === undefined) {
    return null;
  }

  const sectionHeader = new RegExp(
    `^###\\s+${workstreamReference}\\b.*$`,
    "m",
  ).exec(milestoneContent);
  if (sectionHeader?.index === undefined) {
    return null;
  }

  const sectionStart = sectionHeader.index;
  const nextHeaderPattern = /^###\s+WS-\d{2}\b.*$/gm;
  nextHeaderPattern.lastIndex = sectionStart + sectionHeader[0].length;
  const nextHeaderMatch = nextHeaderPattern.exec(milestoneContent);
  const sectionEnd = nextHeaderMatch?.index ?? milestoneContent.length;
  return milestoneContent.slice(sectionStart, sectionEnd).trim();
}

/**
 * Get session IDs from completed subtasks
 *
 * @param subtasksFile - Loaded subtasks file
 * @returns Comma-separated list of session IDs
 */
function getCompletedSessionIds(subtasksFile: SubtasksFile): string {
  return getCompletedSubtasks(subtasksFile.subtasks)
    .filter((s) => s.sessionId !== undefined && s.sessionId !== "")
    .map((s) => s.sessionId)
    .join(",");
}

/**
 * Get completed subtasks with commitHash
 *
 * @param subtasksFile - Loaded subtasks file
 * @returns Array of completed subtasks that have commitHash
 */
function getCompletedWithCommitHash(
  subtasksFile: SubtasksFile,
): Array<Subtask> {
  return getCompletedSubtasks(subtasksFile.subtasks).filter(
    (s) => s.commitHash !== undefined && s.commitHash !== "",
  );
}

function getCompletedWithSessionId(subtasksFile: SubtasksFile): Array<Subtask> {
  return getCompletedSubtasks(subtasksFile.subtasks).filter(
    (subtask) =>
      typeof subtask.sessionId === "string" && subtask.sessionId !== "",
  );
}

function getMilestonePath(subtasksPath: string): string {
  return path.dirname(path.resolve(subtasksPath));
}

function getUniqueStrings(values: Array<string>): Array<string> {
  return [...new Set(values.filter((value) => value !== ""))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is Array<string> {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

/**
 * Load subtasks file, returning null on error (logs error message)
 *
 * @param subtasksPath - Path to subtasks file
 * @returns SubtasksFile or null on error
 */
function loadSubtasksFileOrNull(
  subtasksPath: string,
): LoadedSubtasksFile | null {
  try {
    return loadSubtasksFile(subtasksPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return null;
  }
}

function mergeCalibrationResults(
  findings: Array<CalibrationParseResult>,
): CalibrationParseResult {
  const mergedSummaryParts: Array<string> = [];
  const mergedSubtasks: Array<QueueSubtaskDraft> = [];

  for (const finding of findings) {
    if (finding.summary.trim() !== "") {
      mergedSummaryParts.push(finding.summary.trim());
    }
    mergedSubtasks.push(...finding.correctiveSubtasks);
  }

  const dedupedSubtasks: Array<QueueSubtaskDraft> = [];
  for (const candidate of mergedSubtasks) {
    const hasSimilarTitle = dedupedSubtasks.some((existing) =>
      areTitlesSimilar(existing.title, candidate.title),
    );
    if (!hasSimilarTitle) {
      dedupedSubtasks.push(candidate);
    }
  }

  const uniqueSummaries = [...new Set(mergedSummaryParts)];

  return {
    correctiveSubtasks: dedupedSubtasks,
    insertionMode: "prepend",
    summary: uniqueSummaries.join("\n"),
  };
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function parseCalibrationJson(resultText: string): unknown {
  const trimmed = resultText.trim();
  if (trimmed === "") {
    return {};
  }

  const fencedMatch = /```json\s*(?<json>[\s\S]*?)\s*```/i.exec(trimmed);
  const candidate = fencedMatch?.groups?.json ?? trimmed;
  return JSON.parse(candidate);
}

function parseCalibrationResult(resultText: string): CalibrationParseResult {
  let parsed: unknown = {};
  try {
    parsed = parseCalibrationJson(resultText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[Calibration] Failed to parse JSON response: ${message}`);
    return { correctiveSubtasks: [], insertionMode: "prepend", summary: "" };
  }

  if (!isRecord(parsed)) {
    return { correctiveSubtasks: [], insertionMode: "prepend", summary: "" };
  }

  const insertionMode =
    parsed.insertionMode === "append" ? "append" : "prepend";
  const summary = typeof parsed.summary === "string" ? parsed.summary : "";
  const draftsRaw = parsed.correctiveSubtasks;
  if (!Array.isArray(draftsRaw)) {
    return { correctiveSubtasks: [], insertionMode, summary };
  }

  const correctiveSubtasks = draftsRaw
    .map((entry) => parseQueueSubtaskDraft(entry))
    .filter((draft): draft is QueueSubtaskDraft => draft !== null);

  return { correctiveSubtasks, insertionMode, summary };
}

// eslint-disable-next-line perfectionist/sort-modules -- colocated near parse/format calibration prompt helpers
function buildIntentionBatchPrompt(
  batchEntries: Array<IntentionBatchEntry>,
  promptContent: string,
): string {
  const batchPayload = batchEntries.map((entry) => ({
    diff: entry.diff,
    planningChain: entry.planningChain,
    subtask: {
      acceptanceCriteria: entry.subtask.acceptanceCriteria,
      description: entry.subtask.description,
      done: entry.subtask.done,
      filesToRead: entry.subtask.filesToRead,
      id: entry.subtask.id,
      taskRef: entry.subtask.taskRef,
      title: entry.subtask.title,
    },
  }));

  return `Execute intention drift analysis for a single batch.

You are given ${batchEntries.length} completed subtasks with pre-gathered diffs and planning chain context.
DO NOT read additional files. All required context is provided below.

Output contract:
- Return JSON only (optionally in a \`\`\`json code fence)
- Provide corrective subtasks, not standalone task files
- Default insertion mode should be "prepend" so corrective work runs first

JSON schema:
\`\`\`json
{
  "summary": "short summary",
  "insertionMode": "prepend",
  "correctiveSubtasks": [
    {
      "title": "string",
      "description": "string",
      "taskRef": "string",
      "filesToRead": ["path"],
      "acceptanceCriteria": ["criterion"]
    }
  ]
}
\`\`\`

Batch data:
\`\`\`json
${JSON.stringify(batchPayload, null, 2)}
\`\`\`

${promptContent}`;
}

function parseQueueSubtaskDraft(value: unknown): null | QueueSubtaskDraft {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isStringArray(value.acceptanceCriteria) ||
    typeof value.description !== "string" ||
    !isStringArray(value.filesToRead) ||
    typeof value.taskRef !== "string" ||
    typeof value.title !== "string"
  ) {
    return null;
  }

  const draft: QueueSubtaskDraft = {
    acceptanceCriteria: value.acceptanceCriteria,
    description: value.description,
    filesToRead: value.filesToRead,
    taskRef: value.taskRef,
    title: value.title,
  };

  if (typeof value.storyRef === "string" && value.storyRef.trim() !== "") {
    draft.storyRef = value.storyRef;
  }
  if (value.storyRef === null) {
    draft.storyRef = null;
  }

  return draft;
}

function resolveFilesToRead(filesToRead: Array<string>): Array<ResolvedFile> {
  const projectRoot = findProjectRoot() ?? process.cwd();
  const resolvedFiles: Array<ResolvedFile> = [];

  for (const filePath of filesToRead) {
    const resolvedPath = resolveReadPath(filePath, projectRoot);
    if (existsSync(resolvedPath)) {
      const content = readFileSync(resolvedPath, "utf8");
      resolvedFiles.push({
        content,
        path: resolvedPath,
        tokenEstimate: calculateTokenEstimate(content),
      });
    } else {
      console.warn(
        `[Calibration] filesToRead missing, skipping: ${resolvedPath}`,
      );
    }
  }

  return resolvedFiles;
}

function resolvePlanningChain(
  subtask: Pick<Subtask, "id" | "taskRef">,
  milestonePath: string,
): null | PlanningChainContext {
  const taskReference = subtask.taskRef.trim();
  if (taskReference === "") {
    return null;
  }

  const subtaskJson = JSON.stringify(subtask, null, 2);
  const resolvedByTaskFile = resolvePlanningFromTaskFile(
    taskReference,
    milestonePath,
    subtaskJson,
  );
  if (resolvedByTaskFile !== null) {
    return resolvedByTaskFile;
  }

  const resolvedBySection = resolvePlanningFromMilestoneSection(
    taskReference,
    milestonePath,
    subtaskJson,
  );
  if (resolvedBySection !== null) {
    return resolvedBySection;
  }

  return null;
}

function resolvePlanningFromMilestoneSection(
  taskReference: string,
  milestonePath: string,
  subtaskJson: string,
): null | PlanningChainContext {
  const milestoneDocumentPath = path.join(milestonePath, "MILESTONE.md");
  if (!existsSync(milestoneDocumentPath)) {
    return null;
  }

  const milestoneContent = readFileSync(milestoneDocumentPath, "utf8");
  const milestoneSection = extractWorkstreamSection(
    milestoneContent,
    taskReference,
  );
  if (milestoneSection === null) {
    return null;
  }

  return { milestoneSection, subtaskJson };
}

function resolvePlanningFromTaskFile(
  taskReference: string,
  milestonePath: string,
  subtaskJson: string,
): null | PlanningChainContext {
  const tasksDirectory = path.join(milestonePath, "tasks");
  if (!existsSync(tasksDirectory)) {
    return null;
  }

  const taskFileName = readdirSync(tasksDirectory).find(
    (entry) =>
      entry.startsWith(taskReference) ||
      entry.includes(`-${taskReference}-`) ||
      entry.includes(`${taskReference}.`),
  );
  if (taskFileName === undefined) {
    return null;
  }

  const taskPath = path.join(tasksDirectory, taskFileName);
  const taskContent = readFileSync(taskPath, "utf8");
  const storyReference = extractStoryReference(taskContent);
  const storyContent =
    storyReference === null
      ? undefined
      : resolveStoryContent(storyReference, milestonePath);

  return { storyContent, subtaskJson, taskContent };
}

function resolveReadPath(filePath: string, projectRoot: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  if (filePath.startsWith("@context/")) {
    return path.resolve(projectRoot, filePath.slice(1));
  }
  if (filePath.startsWith("@")) {
    return path.resolve(projectRoot, filePath.slice(1));
  }
  return path.resolve(projectRoot, filePath);
}

// =============================================================================
// Subtask Helpers
// =============================================================================

function resolveStoryContent(
  storyReference: string,
  milestonePath: string,
): string | undefined {
  const storiesDirectory = path.join(milestonePath, "stories");
  if (!existsSync(storiesDirectory)) {
    return undefined;
  }

  const storyFileName = readdirSync(storiesDirectory).find(
    (entry) =>
      entry.startsWith(storyReference) ||
      entry.includes(`-${storyReference}-`) ||
      entry.includes(`${storyReference}.`),
  );
  if (storyFileName === undefined) {
    return undefined;
  }

  const storyPath = path.join(storiesDirectory, storyFileName);
  return readFileSync(storyPath, "utf8");
}

/**
 * Run calibration check(s) based on subcommand
 *
 * Dispatches to the correct check function based on the subcommand:
 * - intention: runIntentionCheck()
 * - technical: runTechnicalCheck()
 * - improve: runImproveCheck()
 * - all: runs all three sequentially
 *
 * @param subcommand - The calibration subcommand
 * @param options - Calibrate options
 * @returns true if all checks succeeded
 */
async function runCalibrate(
  subcommand: CalibrateSubcommand,
  options: CalibrateOptions,
): Promise<boolean> {
  // Select provider (CLI flag > env var > config > auto-detect)
  const provider = await resolveProvider({ cliFlag: options.provider });
  const { model, subtasksPath } = options;
  console.log(
    renderEventLine({
      domain: "CALIBRATE",
      message: `Using provider: ${provider}`,
      state: "INFO",
    }),
  );
  if (model !== undefined && model !== "") {
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message: `Using model: ${model}`,
        state: "INFO",
      }),
    );
  }

  let didSucceed = false;
  switch (subcommand) {
    case "all": {
      const isIntentionOk = await runIntentionCheck(options, provider, model);
      console.log();

      const isTechnicalOk = await runTechnicalCheck(options, provider, model);
      console.log();

      const isImproveOk = await runImproveCheck(options, provider, model);

      didSucceed = isIntentionOk && isTechnicalOk && isImproveOk;
      break;
    }
    case "improve": {
      didSucceed = await runImproveCheck(options, provider, model);
      break;
    }
    case "intention": {
      didSucceed = await runIntentionCheck(options, provider, model);
      break;
    }
    case "technical": {
      didSucceed = await runTechnicalCheck(options, provider, model);
      break;
    }
    default: {
      // This should not happen due to validation in index.ts
      // Cast to string to handle the never type in template literal
      console.error(`Error: Unknown subcommand: ${subcommand as string}`);
      didSucceed = false;
      break;
    }
  }

  writeCalibrationLogEntry({
    milestonePath: getMilestonePath(subtasksPath),
    operationCount: 0,
    source: "calibration",
    summary: didSucceed
      ? `Calibration ${subcommand} completed`
      : `Calibration ${subcommand} failed`,
  });

  return didSucceed;
}

function runCompletedCommitEvidenceValidation(
  completedSubtasks: Array<Subtask>,
  contextRoot: string,
): boolean {
  const evidence = validateDoneSubtaskCommitEvidence(completedSubtasks, {
    repoRoot: contextRoot,
  });
  if (evidence.issues.length === 0) {
    return true;
  }

  const warnings = evidence.issues.filter(
    (issue) => issue.severity === "warning",
  );
  const errors = evidence.issues.filter((issue) => issue.severity === "error");

  for (const issue of evidence.issues) {
    const commitLabel =
      issue.commitHash === undefined ? "" : ` commit=${issue.commitHash}`;
    const state = issue.severity === "error" ? "FAIL" : "INFO";
    const prefix = issue.severity === "warning" ? "LOW-CONFIDENCE" : "INVALID";
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message:
          `${prefix} traceability for ${issue.subtaskId}${commitLabel}: ` +
          `${issue.reason} Remediation: ${issue.remediation}`,
        state,
      }),
    );
  }

  if (warnings.length > 0) {
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message: `Proceeding with ${warnings.length} low-confidence traceability warning(s).`,
        state: "SKIP",
      }),
    );
  }

  if (errors.length > 0) {
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message: `Aborting drift analysis due to ${errors.length} commit evidence error(s).`,
        state: "FAIL",
      }),
    );
    return false;
  }

  return true;
}

// =============================================================================
// Intention Drift Check
// =============================================================================

/**
 * Run self-improvement analysis
 *
 * Analyzes session logs from completed subtasks for inefficiencies
 * and proposes improvements to prompts, skills, and documentation.
 *
 * Uses: context/workflows/ralph/calibration/self-improvement.md
 *
 * @param options - Calibrate options
 * @returns true if check ran successfully
 */
async function runImproveCheck(
  options: CalibrateOptions,
  provider: ProviderType,
  model?: string,
): Promise<boolean> {
  console.log();
  console.log(
    renderPhaseCard({
      domain: "CALIBRATE",
      lines: [chalk.dim("Analyze completed sessions for inefficiencies")],
      state: "START",
      title: "Self-Improvement Analysis",
    }),
  );

  const { contextRoot, subtasksPath } = options;

  // Verify prompt exists
  const promptPath = path.join(
    contextRoot,
    "context/workflows/ralph/calibration/self-improvement.md",
  );
  if (!existsSync(promptPath)) {
    console.error(`Error: Self-improvement prompt not found: ${promptPath}`);
    return false;
  }

  // Load subtasks
  const subtasksFile = loadSubtasksFileOrNull(subtasksPath);
  if (subtasksFile === null) {
    return false;
  }

  // Load config and check selfImprovement mode
  // Uses unified config loader (no explicit path needed)
  const config = loadRalphConfig();
  // Mode is "suggest", "autofix", or "off"
  const selfImproveMode = config.selfImprovement?.mode ?? "suggest";

  // Check for "off" mode - skip analysis entirely
  if (selfImproveMode === "off") {
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message: "Self-improvement analysis is disabled in aaa.config.json",
        state: "SKIP",
      }),
    );
    return true;
  }

  // Get session IDs from completed subtasks
  const sessionIds = getCompletedSessionIds(subtasksFile);
  if (sessionIds === "") {
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message:
          "No completed subtasks with sessionId found. Nothing to analyze.",
        state: "SKIP",
      }),
    );
    return true;
  }

  const completedWithSession = getCompletedWithSessionId(subtasksFile);
  const preflight = buildSessionLogPreflight(completedWithSession, contextRoot);
  const analyzableSessionIds = preflight.available
    .map((entry) => entry.sessionId)
    .join(",");

  console.log(
    renderEventLine({
      domain: "CALIBRATE",
      message: `Found sessionIds: ${sessionIds}`,
      state: "INFO",
    }),
  );
  console.log(
    renderEventLine({
      domain: "CALIBRATE",
      message: `Session log preflight: ${preflight.available.length} available, ${preflight.missing.length} missing`,
      state: "INFO",
    }),
  );
  if (preflight.missing.length > 0) {
    const conciseMissing = preflight.missing
      .slice(0, 5)
      .map((entry) => `${entry.subtaskId}:${entry.sessionId}`)
      .join(", ");
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message: `Missing session logs: ${conciseMissing}`,
        state: "INFO",
      }),
    );
  }

  if (analyzableSessionIds === "") {
    const fallbackResult = buildSelfImproveFallbackResult(preflight);
    const didApplyFallback = await applyCalibrationProposal({
      checkName: "Self-Improvement",
      options,
      resultText: JSON.stringify(fallbackResult),
      selfImproveMode,
    });
    if (!didApplyFallback) {
      return false;
    }
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message: fallbackResult.summary,
        state: "SKIP",
      }),
    );
    return true;
  }
  console.log(
    renderEventLine({
      domain: "CALIBRATE",
      message: `Self-improvement mode: ${selfImproveMode}`,
      state: "INFO",
    }),
  );

  // Read the prompt file
  const promptContent = readFileSync(promptPath, "utf8");

  // Build the prompt with context
  const unifiedConfigPath = path.join(contextRoot, "aaa.config.json");
  const prompt = `Execute self-improvement analysis.

Follow the instructions in @${promptPath}

Subtasks file: @${subtasksPath}

Config file: @${unifiedConfigPath}

Session IDs to analyze: ${analyzableSessionIds}

Session log preflight (available vs missing):
${JSON.stringify(preflight, null, 2)}

Self-improvement mode: ${selfImproveMode}
- If 'suggest': Stage proposal artifacts for review (no queue mutation)
- If 'autofix': Apply corrective queue insertions automatically

IMPORTANT: You MUST output a readable markdown summary to stdout following the format in the self-improvement.md prompt.
The summary should include:
- Session ID and subtask title
- Findings organized by inefficiency type (Tool Misuse, Wasted Reads, Backtracking, Excessive Iterations)
- Recommendations for improvements
- Reference to corrective subtasks proposed or applied

Queue proposal output contract (JSON only):
\`\`\`json
{
  "summary": "short summary",
  "insertionMode": "prepend",
  "correctiveSubtasks": [
    {
      "title": "string",
      "description": "string",
      "taskRef": "string",
      "filesToRead": ["path"],
      "acceptanceCriteria": ["criterion"]
    }
  ]
}
\`\`\`

Analyze session logs from completed subtasks for inefficiencies.
Handle improvements based on the mode above.

${promptContent}`;

  // Run provider for analysis with timeout protection
  console.log(renderInvocationHeader("headless", provider));
  console.log();
  console.log(
    renderEventLine({
      domain: "CALIBRATE",
      message: `Invoking ${provider} for self-improvement analysis...`,
      state: "START",
    }),
  );
  const timeoutConfig = loadTimeoutConfig();
  try {
    const result = await invokeWithProvider(provider, {
      gracePeriodMs: timeoutConfig.graceSeconds * 1000,
      mode: "headless",
      model,
      prompt,
      stallTimeoutMs: timeoutConfig.stallMinutes * 60 * 1000,
      timeout: timeoutConfig.hardMinutes * 60 * 1000,
    });

    if (result === null) {
      console.error(
        "Self-improvement analysis failed, was interrupted, or timed out",
      );
      return false;
    }

    const isApplied = await applyCalibrationProposal({
      checkName: "Self-Improvement",
      options,
      resultText: result.result,
      selfImproveMode,
    });
    if (!isApplied) {
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Self-improvement analysis error: ${message}`);
    return false;
  }

  console.log(
    renderEventLine({
      domain: "CALIBRATE",
      message: "Self-Improvement Analysis Complete",
      state: "DONE",
    }),
  );
  return true;
}

// =============================================================================
// Technical Drift Check
// =============================================================================

/**
 * Run intention drift check
 *
 * Analyzes completed subtasks with commitHash to detect when code
 * diverges from the intended behavior defined in planning docs.
 *
 * Uses: context/workflows/ralph/calibration/intention-drift.md
 *
 * @param options - Calibrate options
 * @returns true if check ran successfully
 */
async function runIntentionCheck(
  options: CalibrateOptions,
  provider: ProviderType,
  model?: string,
): Promise<boolean> {
  console.log();
  console.log(
    renderPhaseCard({
      domain: "CALIBRATE",
      lines: [chalk.dim("Check code changes against planning intent")],
      state: "START",
      title: "Intention Drift Check",
    }),
  );

  const { contextRoot, subtasksPath } = options;

  // Verify prompt exists
  const promptPath = path.join(
    contextRoot,
    "context/workflows/ralph/calibration/intention-drift.md",
  );
  if (!existsSync(promptPath)) {
    console.error(`Error: Intention drift prompt not found: ${promptPath}`);
    return false;
  }

  // Load subtasks
  const subtasksFile = loadSubtasksFileOrNull(subtasksPath);
  if (subtasksFile === null) {
    return false;
  }

  const completedSubtasks = getCompletedSubtasks(subtasksFile.subtasks);
  if (completedSubtasks.length === 0) {
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message: "No completed subtasks found. Nothing to analyze.",
        state: "SKIP",
      }),
    );
    return true;
  }

  if (!runCompletedCommitEvidenceValidation(completedSubtasks, contextRoot)) {
    return false;
  }

  const completed = getCompletedWithCommitHash(subtasksFile);
  if (completed.length === 0) {
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message:
          "No completed subtasks with commitHash found. Nothing to analyze.",
        state: "SKIP",
      }),
    );
    return true;
  }

  const promptContent = readFileSync(promptPath, "utf8");
  const milestonePath = getMilestonePath(subtasksPath);
  const BATCH_SIZE = 5;
  const allFindings: Array<CalibrationParseResult> = [];

  console.log(renderInvocationHeader("headless", provider));
  console.log();
  console.log(
    renderEventLine({
      domain: "CALIBRATE",
      message: `Invoking ${provider} for intention drift analysis in batches of ${BATCH_SIZE}...`,
      state: "START",
    }),
  );
  const timeoutConfig = loadTimeoutConfig();

  try {
    for (let index = 0; index < completed.length; index += BATCH_SIZE) {
      const batch = completed.slice(index, index + BATCH_SIZE);
      const batchEntries = batch
        .map((subtask) => {
          const planningChain = resolvePlanningChain(
            { id: subtask.id, taskRef: subtask.taskRef },
            milestonePath,
          );
          if (planningChain === null) {
            return null;
          }

          return {
            diff: extractDiffSummary(subtask.commitHash ?? "", subtask.id),
            planningChain,
            subtask,
          };
        })
        .filter((entry): entry is IntentionBatchEntry => entry !== null);

      if (batchEntries.length > 0) {
        const prompt = buildIntentionBatchPrompt(batchEntries, promptContent);
        // eslint-disable-next-line no-await-in-loop -- each batch must use a fresh provider context window
        const result = await invokeWithProvider(provider, {
          gracePeriodMs: timeoutConfig.graceSeconds * 1000,
          mode: "headless",
          model,
          prompt,
          stallTimeoutMs: timeoutConfig.stallMinutes * 60 * 1000,
          timeout: timeoutConfig.hardMinutes * 60 * 1000,
        });

        if (result === null) {
          console.error(
            "Intention drift analysis failed, was interrupted, or timed out",
          );
          return false;
        }

        allFindings.push(parseCalibrationResult(result.result));
      }
    }

    const mergedResult = mergeCalibrationResults(allFindings);
    const isApplied = await applyCalibrationProposal({
      checkName: "Intention Drift",
      options,
      resultText: JSON.stringify(mergedResult),
    });
    if (!isApplied) {
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Intention drift analysis error: ${message}`);
    return false;
  }

  console.log(
    renderEventLine({
      domain: "CALIBRATE",
      message: "Intention Drift Check Complete",
      state: "DONE",
    }),
  );
  return true;
}

// =============================================================================
// Self-Improvement Check
// =============================================================================

/**
 * Run technical drift check
 *
 * Analyzes completed subtasks with commitHash to detect code quality
 * issues and technical debt.
 *
 * Uses: context/workflows/ralph/calibration/technical-drift.md
 *
 * @param options - Calibrate options
 * @returns true if check ran successfully
 */
async function runTechnicalCheck(
  options: CalibrateOptions,
  provider: ProviderType,
  model?: string,
): Promise<boolean> {
  console.log();
  console.log(
    renderPhaseCard({
      domain: "CALIBRATE",
      lines: [chalk.dim("Check completed subtasks for technical drift")],
      state: "START",
      title: "Technical Drift Check",
    }),
  );

  const { contextRoot, subtasksPath } = options;

  // Verify prompt exists
  const promptPath = path.join(
    contextRoot,
    "context/workflows/ralph/calibration/technical-drift.md",
  );
  if (!existsSync(promptPath)) {
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message: `Technical drift prompt not found: ${promptPath}`,
        state: "SKIP",
      }),
    );
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message: "Technical drift checking is not yet implemented.",
        state: "SKIP",
      }),
    );
    return true;
  }

  // Load subtasks
  const subtasksFile = loadSubtasksFileOrNull(subtasksPath);
  if (subtasksFile === null) {
    return false;
  }

  const completedSubtasks = getCompletedSubtasks(subtasksFile.subtasks);
  if (completedSubtasks.length === 0) {
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message: "No completed subtasks found. Nothing to analyze.",
        state: "SKIP",
      }),
    );
    return true;
  }

  if (!runCompletedCommitEvidenceValidation(completedSubtasks, contextRoot)) {
    return false;
  }

  const completed = getCompletedWithCommitHash(subtasksFile);
  if (completed.length === 0) {
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message:
          "No completed subtasks with commitHash found. Nothing to analyze.",
        state: "SKIP",
      }),
    );
    return true;
  }

  // Read the prompt file
  const promptContent = readFileSync(promptPath, "utf8");

  // Build the prompt with context
  const prompt = `Execute technical drift analysis.

Follow the instructions in @${promptPath}

Subtasks file: @${subtasksPath}

Context files:
@${path.join(contextRoot, "CLAUDE.md")}

Output contract:
- Return JSON only (optionally in a \`\`\`json code fence)
- Provide corrective subtasks, not standalone task files
- Default insertion mode should be "prepend" so corrective work runs first

JSON schema:
\`\`\`json
{
  "summary": "short summary",
  "insertionMode": "prepend",
  "correctiveSubtasks": [
    {
      "title": "string",
      "description": "string",
      "taskRef": "string",
      "filesToRead": ["path"],
      "acceptanceCriteria": ["criterion"]
    }
  ]
}
\`\`\`

Analyze code quality issues in completed subtasks and output a summary to stdout.

${promptContent}`;

  // Run provider for analysis with timeout protection
  console.log(renderInvocationHeader("headless", provider));
  console.log();
  console.log(
    renderEventLine({
      domain: "CALIBRATE",
      message: `Invoking ${provider} for technical drift analysis...`,
      state: "START",
    }),
  );
  const timeoutConfig = loadTimeoutConfig();
  try {
    const result = await invokeWithProvider(provider, {
      gracePeriodMs: timeoutConfig.graceSeconds * 1000,
      mode: "headless",
      model,
      prompt,
      stallTimeoutMs: timeoutConfig.stallMinutes * 60 * 1000,
      timeout: timeoutConfig.hardMinutes * 60 * 1000,
    });

    if (result === null) {
      console.error(
        "Technical drift analysis failed, was interrupted, or timed out",
      );
      return false;
    }

    const isApplied = await applyCalibrationProposal({
      checkName: "Technical Drift",
      options,
      resultText: result.result,
    });
    if (!isApplied) {
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Technical drift analysis error: ${message}`);
    return false;
  }

  console.log(
    renderEventLine({
      domain: "CALIBRATE",
      message: "Technical Drift Check Complete",
      state: "DONE",
    }),
  );
  return true;
}

// =============================================================================
// Main Entry Point
// =============================================================================

function writeCalibrationLogEntry(options: WriteCalibrationLogOptions): void {
  appendMilestoneLogEntry(options.milestonePath, {
    milestone: path.basename(options.milestonePath),
    operationCount: options.operationCount,
    source: options.source,
    summary: options.summary,
    timestamp: new Date().toISOString(),
    type: "calibration",
  });
}

function writeCalibrationProposalArtifact(
  options: CalibrationProposalArtifactOptions,
): string {
  const { action, checkName, milestonePath, proposal, summary } = options;
  const feedbackDirectory = path.join(milestonePath, "feedback");
  mkdirSync(feedbackDirectory, { recursive: true });

  const timestamp = new Date().toISOString();
  const safeTimestamp = timestamp.replaceAll(":", "-").replaceAll(".", "-");
  const safeCheckName = checkName.toLowerCase().replaceAll(/\s+/g, "-");
  const filePath = path.join(
    feedbackDirectory,
    `${safeTimestamp}_calibration_${safeCheckName}_proposal.md`,
  );

  const content = [
    "# Calibration Proposal",
    "",
    `**Generated:** ${timestamp}`,
    `**Check:** ${checkName}`,
    `**Milestone:** ${path.basename(milestonePath)}`,
    `**Approval action:** ${action}`,
    `**Operations:** ${proposal.operations.length}`,
    "",
    "## Summary",
    "",
    summary === "" ? "(No summary provided)" : summary,
    "",
    "## Queue Proposal",
    "",
    "```json",
    JSON.stringify(proposal, null, 2),
    "```",
    "",
  ].join("\n");

  writeFileSync(filePath, content, "utf8");
  return filePath;
}

function writeCalibrationQueueApplyLogEntry(
  options: WriteQueueApplyLogOptions,
): void {
  appendMilestoneLogEntry(options.milestonePath, {
    applied: options.applied,
    operationCount: options.operationCount,
    source: options.source,
    summary: options.summary,
    timestamp: new Date().toISOString(),
    type: "queue-apply",
  });
}

function writeCalibrationQueueProposalLogEntry(
  milestonePath: string,
  proposal: QueueProposal,
  summary: string,
): void {
  appendMilestoneLogEntry(milestonePath, {
    operationCount: proposal.operations.length,
    proposal,
    source: proposal.source,
    summary,
    timestamp: new Date().toISOString(),
    type: "queue-proposal",
  });
}

// =============================================================================
// Exports
// =============================================================================

export {
  buildCalibrationCreateOperations,
  buildIntentionBatchPrompt,
  buildSelfImproveFallbackResult,
  buildSessionLogPreflight,
  type CalibrateOptions,
  type CalibrateSubcommand,
  type DiffSummary,
  extractDiffSummary,
  mergeCalibrationResults,
  parseCalibrationResult,
  type PlanningChainContext,
  type ResolvedFile,
  resolveFilesToRead,
  resolvePlanningChain,
  runCalibrate,
  runCompletedCommitEvidenceValidation,
  runImproveCheck,
  runIntentionCheck,
  runTechnicalCheck,
  writeCalibrationLogEntry,
  writeCalibrationQueueApplyLogEntry,
  writeCalibrationQueueProposalLogEntry,
};

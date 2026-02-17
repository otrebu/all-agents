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
/* eslint-disable perfectionist/sort-modules, no-continue, unicorn/consistent-destructuring, perfectionist/sort-objects, perfectionist/sort-object-types */

import { loadAaaConfig } from "@tools/lib/config";
import { findProjectRoot } from "@tools/utils/paths";
import chalk from "chalk";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import type { ProviderType } from "./providers/types";
import type {
  LoadedSubtasksFile,
  QueueOperation,
  QueueProposal,
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
  appendMilestoneLogEntry,
  getCompletedSubtasks,
  getPendingSubtasks,
  loadRalphConfig,
  loadSubtasksFile,
  loadTimeoutConfig,
} from "./config";
import {
  renderEventLine,
  renderInvocationHeader,
  renderPhaseCard,
} from "./display";
import {
  invokeWithProvider,
  REGISTRY,
  resolveProvider,
} from "./providers/registry";
import { resolveSessionForProvider } from "./providers/session-adapter";
import { applyAndSaveProposal } from "./queue-ops";
import { getSessionJsonlPath } from "./session";
import { extractSignals, type OffTrackReport } from "./session-analysis";
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

interface IntentionBatchEntry {
  diff: DiffSummary;
  planningChain: PlanningChainContext;
  subtask: Subtask;
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

interface SessionLogPreflight {
  available: Array<SessionLogLocation>;
  maxAttempts: number;
  missing: Array<SessionLogMissing>;
}

interface SessionSignalAnalysisTarget {
  sessionId: string;
  sessionLogPath: string;
  subtaskIds: Array<string>;
}

interface TechnicalBatchEntry {
  diff: DiffSummary;
  referencedFiles: Array<ResolvedFile>;
  subtask: Subtask;
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

const MAX_TECHNICAL_DIFF_CHARS = 30_000;
const MAX_TECHNICAL_FILE_CHARS = 12_000;

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

/**
 * Apply a previously staged proposal from feedback/ directory.
 *
 * Used when --force is combined with an existing staged proposal to skip
 * re-running LLM analysis and directly apply the reviewed proposal.
 *
 * @param options - Calibrate options
 * @param checkName - Check name for logging
 * @param staged - The staged proposal and artifact path from findStagedProposal()
 * @returns true if apply succeeded
 */
function applyStagedProposal(
  options: CalibrateOptions,
  checkName: string,
  staged: { artifactPath: string; proposal: QueueProposal },
): boolean {
  const { artifactPath, proposal } = staged;
  const milestonePath = getMilestonePath(options.subtasksPath);

  console.log(
    renderEventLine({
      domain: "CALIBRATE",
      message: `${checkName}: applying staged proposal from ${path.basename(artifactPath)}`,
      state: "INFO",
    }),
  );

  const applySummary = applyAndSaveProposal(options.subtasksPath, proposal);
  const state = applySummary.applied ? "DONE" : "SKIP";
  const message = applySummary.applied
    ? `${checkName}: applied ${applySummary.operationsApplied} staged operation(s), queue ${applySummary.subtasksBefore} -> ${applySummary.subtasksAfter}`
    : `${checkName}: staged proposal stale, queue changed since proposal was generated`;
  console.log(renderEventLine({ domain: "CALIBRATE", message, state }));

  writeCalibrationQueueApplyLogEntry({
    applied: applySummary.applied,
    milestonePath,
    operationCount: applySummary.operationsApplied,
    source: proposal.source,
    summary: message,
  });

  // Mark the artifact as applied by renaming it
  const appliedPath = artifactPath.replace(/\.md$/, ".applied.md");
  try {
    renameSync(artifactPath, appliedPath);
  } catch {
    // Best-effort cleanup; apply already succeeded
  }

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

function buildIntentionBatchPrompt(
  batchEntries: Array<IntentionBatchEntry>,
  promptContent: string,
  pendingSubtaskTitles: Array<{ id: string; title: string }> = [],
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

  const pendingQueueSection =
    pendingSubtaskTitles.length > 0
      ? `\nPending subtask queue (use this to verify deferred-work claims):
\`\`\`json
${JSON.stringify(pendingSubtaskTitles, null, 2)}
\`\`\`
`
      : "\nPending subtask queue: (empty — no pending subtasks in queue)\n";

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
${pendingQueueSection}
Batch data:
\`\`\`json
${JSON.stringify(batchPayload, null, 2)}
\`\`\`

${promptContent}`;
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

function buildSessionAnalysisPrompt(
  target: SessionSignalAnalysisTarget,
  signals: OffTrackReport,
  promptContent: string,
): string {
  return `Execute self-improvement analysis for a single session.

You are given pre-extracted session signals for one unique session.
DO NOT read the raw session log unless targeted verification is required by the workflow prompt.

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

Session context:
\`\`\`json
${JSON.stringify(
  {
    sessionId: target.sessionId,
    sessionLogPath: target.sessionLogPath,
    subtaskIds: target.subtaskIds,
  },
  null,
  2,
)}
\`\`\`

<session-signals>
\`\`\`json
${JSON.stringify(signals, null, 2)}
\`\`\`
</session-signals>

${promptContent}`;
}

interface BuildSessionLogPreflightInput {
  completedSubtasks: Array<Subtask>;
  contextRoot: string;
  maxAttempts?: number;
  preferredProvider?: ProviderType;
}

function buildSessionLogPreflight({
  completedSubtasks,
  contextRoot,
  maxAttempts = 3,
  preferredProvider,
}: BuildSessionLogPreflightInput): SessionLogPreflight {
  const providerPriority = getSessionProviderPriority(preferredProvider);
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
      continue;
    }

    const metadataPath =
      typeof sessionLogPath === "string" ? sessionLogPath : "";
    if (metadataPath !== "" && existsSync(metadataPath)) {
      available.push({ sessionId, sessionLogPath: metadataPath, subtaskId });
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
      const candidatePath = resolveSessionLogPath({
        providerPriority,
        repoRoot,
        sessionId,
        explicitProvider: subtask.provider,
      });
      if (candidatePath !== null) {
        resolvedPath = candidatePath;
        break;
      }
    }

    if (resolvedPath === null) {
      missing.push({
        attemptedRepoRoots,
        attempts: attemptedRepoRoots.length,
        sessionId,
        sessionRepoRoot: locatorRepoRoot,
        subtaskId,
      });
    } else {
      available.push({ sessionId, sessionLogPath: resolvedPath, subtaskId });
    }
  }

  return { available, maxAttempts, missing };
}

function buildTechnicalBatchPrompt(
  batchEntries: Array<TechnicalBatchEntry>,
  promptContent: string,
): string {
  const batchPayload = batchEntries.map((entry) => ({
    diff: entry.diff,
    referencedFiles: entry.referencedFiles,
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

  return `Execute technical drift analysis for a single batch.

You are given ${batchEntries.length} completed subtasks with pre-gathered commit diffs and all files referenced in each subtask's filesToRead list.
DO NOT read additional files beyond what is provided.

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

function calculateTokenEstimate(content: string): number {
  return Math.ceil(content.length / 4);
}

function clipDiffPatchForTechnicalPrompt(diff: DiffSummary): DiffSummary {
  if (diff.patch.length <= MAX_TECHNICAL_DIFF_CHARS) {
    return diff;
  }

  const omittedChars = diff.patch.length - MAX_TECHNICAL_DIFF_CHARS;
  return {
    ...diff,
    patch:
      `${diff.patch.slice(0, MAX_TECHNICAL_DIFF_CHARS)}\n\n` +
      `[TRUNCATED: omitted ${omittedChars} character(s) to keep technical batch prompts within provider limits]`,
  };
}

function createProviderSearchOrder(
  providerPriority: Array<ProviderType>,
  explicitProvider: ProviderType | undefined,
): Array<ProviderType> {
  if (explicitProvider === undefined) {
    return providerPriority;
  }

  const seen = new Set<ProviderType>([explicitProvider]);
  const ordered = [explicitProvider];
  for (const provider of providerPriority) {
    if (!seen.has(provider)) {
      seen.add(provider);
      ordered.push(provider);
    }
  }

  return ordered;
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
 * Find the most recent staged proposal in feedback/ for a given check type.
 *
 * Scans the feedback directory for files matching the pattern
 * `*_calibration_{checkName}_proposal.md` and parses the QueueProposal JSON
 * from the markdown code fence.
 *
 * @param milestonePath - Path to the milestone directory
 * @param checkName - Check name (e.g. "Intention Drift", "Technical Drift", "Self-Improvement")
 * @returns The parsed QueueProposal and artifact path, or null if none found
 */
function findStagedProposal(
  milestonePath: string,
  checkName: string,
): { artifactPath: string; proposal: QueueProposal } | null {
  const feedbackDirectory = path.join(milestonePath, "feedback");
  if (!existsSync(feedbackDirectory)) {
    return null;
  }

  const safeCheckName = checkName.toLowerCase().replaceAll(/\s+/g, "-");
  const suffix = `_calibration_${safeCheckName}_proposal.md`;

  const candidates = readdirSync(feedbackDirectory)
    .filter((entry) => entry.endsWith(suffix) && !entry.endsWith(".applied.md"))
    .sort();

  if (candidates.length === 0) {
    return null;
  }

  // Take the most recent (last when sorted lexicographically by timestamp prefix)
  const mostRecent = candidates.at(-1);
  if (mostRecent === undefined) {
    return null;
  }

  const artifactPath = path.join(feedbackDirectory, mostRecent);
  const content = readFileSync(artifactPath, "utf8");

  // Extract JSON from the ```json code fence in the "## Queue Proposal" section
  const fencedMatch = /```json\s*(?<json>\{[\s\S]*?\})\s*```/i.exec(content);
  if (fencedMatch?.groups?.json === undefined) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(fencedMatch.groups.json);
    if (!isRecord(parsed)) {
      return null;
    }

    // Validate it has the expected QueueProposal shape
    if (
      !isRecord(parsed.fingerprint) ||
      typeof parsed.fingerprint.hash !== "string" ||
      !Array.isArray(parsed.operations) ||
      typeof parsed.source !== "string" ||
      typeof parsed.timestamp !== "string"
    ) {
      return null;
    }

    return { artifactPath, proposal: parsed as unknown as QueueProposal };
  } catch {
    return null;
  }
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

function getSessionProviderPriority(
  preferredProvider: ProviderType | undefined,
): Array<ProviderType> {
  const providers: Array<ProviderType> = [];
  for (const [provider, capabilities] of Object.entries(REGISTRY)) {
    if (capabilities.supportsSessionExport) {
      providers.push(provider as ProviderType);
    }
  }

  if (preferredProvider === undefined) {
    return providers;
  }

  const next = providers.filter((provider) => provider !== preferredProvider);
  return [preferredProvider, ...next];
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

function mergeSessionAnalysisTargets(
  available: Array<SessionLogLocation>,
): Array<SessionSignalAnalysisTarget> {
  const bySession = new Map<string, SessionSignalAnalysisTarget>();

  for (const entry of available) {
    const existing = bySession.get(entry.sessionId);
    if (existing === undefined) {
      bySession.set(entry.sessionId, {
        sessionId: entry.sessionId,
        sessionLogPath: entry.sessionLogPath,
        subtaskIds: [entry.subtaskId],
      });
    } else {
      const isKnownSubtask = existing.subtaskIds.includes(entry.subtaskId);
      if (isKnownSubtask) {
        // already tracked for this unique session id
      } else {
        existing.subtaskIds.push(entry.subtaskId);
      }
    }
  }

  return [...bySession.values()];
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
      const contentForPrompt =
        content.length <= MAX_TECHNICAL_FILE_CHARS
          ? content
          : `${content.slice(0, MAX_TECHNICAL_FILE_CHARS)}\n\n[TRUNCATED: omitted ${content.length - MAX_TECHNICAL_FILE_CHARS} character(s) to keep technical batch prompts within provider limits]`;
      resolvedFiles.push({
        content: contentForPrompt,
        path: resolvedPath,
        tokenEstimate: calculateTokenEstimate(contentForPrompt),
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

function resolveSessionLogPath(input: {
  sessionId: string;
  repoRoot: string;
  providerPriority: Array<ProviderType>;
  explicitProvider?: ProviderType;
}): null | string {
  const { sessionId, explicitProvider, providerPriority, repoRoot } = input;
  const providersToTry = createProviderSearchOrder(
    providerPriority,
    explicitProvider,
  );
  for (const provider of providersToTry) {
    const resolved = resolveSessionForProvider(provider, sessionId, repoRoot);
    if (
      resolved !== null &&
      resolved.path !== null &&
      resolved.path !== "" &&
      existsSync(resolved.path)
    ) {
      return resolved.path;
    }
  }

  const fallbackPath = getSessionJsonlPath(sessionId, repoRoot);
  if (fallbackPath === null) {
    return null;
  }
  return existsSync(fallbackPath) ? fallbackPath : null;
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
    let prefix = "LOW-CONFIDENCE";
    if (issue.severity === "error") {
      prefix = "INVALID";
    } else if (issue.commitHash === undefined) {
      prefix = "MISSING-HASH";
    }
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
    const missingHash = warnings.filter(
      (w) => w.commitHash === undefined,
    ).length;
    const lowConfidence = warnings.length - missingHash;
    const parts: Array<string> = [];
    if (missingHash > 0)
      parts.push(`${missingHash} missing-hash (will be skipped)`);
    if (lowConfidence > 0) parts.push(`${lowConfidence} low-confidence`);
    console.log(
      renderEventLine({
        domain: "CALIBRATE",
        message: `Proceeding with ${warnings.length} traceability warning(s): ${parts.join(", ")}.`,
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

  // Short-circuit: if --force and a staged proposal exists, apply it directly
  if (options.force === true) {
    const milestonePath = getMilestonePath(options.subtasksPath);
    const staged = findStagedProposal(milestonePath, "Self-Improvement");
    if (staged !== null) {
      const didApply = applyStagedProposal(options, "Self-Improvement", staged);
      console.log(
        renderEventLine({
          domain: "CALIBRATE",
          message:
            "Self-Improvement Analysis Complete (staged proposal applied)",
          state: "DONE",
        }),
      );
      return didApply;
    }
  }

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
  const preflight = buildSessionLogPreflight({
    completedSubtasks: completedWithSession,
    contextRoot,
    maxAttempts: 3,
    preferredProvider: provider,
  });
  const uniqueSessions = mergeSessionAnalysisTargets(preflight.available);
  const analyzableSessionIds = uniqueSessions
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
      message: `Session log preflight: ${preflight.available.length} available entries, ${uniqueSessions.length} unique sessions, ${preflight.missing.length} missing`,
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

  // Run provider for analysis with timeout protection
  console.log(renderInvocationHeader("headless", provider));
  console.log();
  console.log(
    renderEventLine({
      domain: "CALIBRATE",
      message: `Invoking ${provider} for self-improvement analysis across ${uniqueSessions.length} unique session(s)...`,
      state: "START",
    }),
  );
  const timeoutConfig = loadTimeoutConfig();
  const allFindings: Array<CalibrationParseResult> = [];
  try {
    for (const session of uniqueSessions) {
      // eslint-disable-next-line no-await-in-loop -- each unique session must use a fresh provider context window
      const signals = await extractSignals(
        session.sessionLogPath,
        session.sessionId,
      );
      if (signals.offTrackScore < 0.1) {
        console.log(
          renderEventLine({
            domain: "CALIBRATE",
            message: `Skipping session ${session.sessionId}: offTrackScore=${signals.offTrackScore.toFixed(3)} < 0.1`,
            state: "SKIP",
          }),
        );
      } else {
        const prompt = buildSessionAnalysisPrompt(
          session,
          signals,
          promptContent,
        );
        // eslint-disable-next-line no-await-in-loop -- each unique session must use a fresh provider context window
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
            `Self-improvement analysis failed, was interrupted, or timed out for session ${session.sessionId}`,
          );
          return false;
        }

        allFindings.push(parseCalibrationResult(result.result));
      }
    }

    const mergedResult = mergeCalibrationResults(allFindings);
    const isApplied = await applyCalibrationProposal({
      checkName: "Self-Improvement",
      options,
      resultText: JSON.stringify(mergedResult),
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
      message: `Self-improvement analyzed ${allFindings.length} session(s) with actionable signals`,
      state: "INFO",
    }),
  );
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

  // Short-circuit: if --force and a staged proposal exists, apply it directly
  if (options.force === true) {
    const milestonePath = getMilestonePath(options.subtasksPath);
    const staged = findStagedProposal(milestonePath, "Intention Drift");
    if (staged !== null) {
      const didApply = applyStagedProposal(options, "Intention Drift", staged);
      console.log(
        renderEventLine({
          domain: "CALIBRATE",
          message: "Intention Drift Check Complete (staged proposal applied)",
          state: "DONE",
        }),
      );
      return didApply;
    }
  }

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

  // Build pending subtask titles for the "Do Not Jump Ahead Guard"
  const pendingSubtaskTitles = getPendingSubtasks(subtasksFile.subtasks).map(
    (subtask) => ({ id: subtask.id, title: subtask.title }),
  );

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
    const totalBatches = Math.ceil(completed.length / BATCH_SIZE);
    for (let index = 0; index < completed.length; index += BATCH_SIZE) {
      const batch = completed.slice(index, index + BATCH_SIZE);
      const batchNumber = Math.floor(index / BATCH_SIZE) + 1;
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
        console.log(
          renderEventLine({
            domain: "CALIBRATE",
            message: `Batch ${batchNumber}/${totalBatches}: analyzing ${batchEntries.length} subtask(s) for intention drift`,
            state: "INFO",
          }),
        );
        const prompt = buildIntentionBatchPrompt(
          batchEntries,
          promptContent,
          pendingSubtaskTitles,
        );
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
      } else {
        console.log(
          renderEventLine({
            domain: "CALIBRATE",
            message: `Batch ${batchNumber}/${totalBatches}: no resolvable planning context, skipped`,
            state: "SKIP",
          }),
        );
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

  // Short-circuit: if --force and a staged proposal exists, apply it directly
  if (options.force === true) {
    const milestonePath = getMilestonePath(options.subtasksPath);
    const staged = findStagedProposal(milestonePath, "Technical Drift");
    if (staged !== null) {
      const didApply = applyStagedProposal(options, "Technical Drift", staged);
      console.log(
        renderEventLine({
          domain: "CALIBRATE",
          message: "Technical Drift Check Complete (staged proposal applied)",
          state: "DONE",
        }),
      );
      return didApply;
    }
  }

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

  const promptContent = readFileSync(promptPath, "utf8");
  // Technical prompts inline both full diffs and resolved filesToRead content.
  // Keep batches smaller to avoid provider CLI argument-size limits (E2BIG).
  const BATCH_SIZE = 1;
  const allFindings: Array<CalibrationParseResult> = [];

  console.log(renderInvocationHeader("headless", provider));
  console.log();
  console.log(
    renderEventLine({
      domain: "CALIBRATE",
      message: `Invoking ${provider} for technical drift analysis in batches of ${BATCH_SIZE}...`,
      state: "START",
    }),
  );
  const timeoutConfig = loadTimeoutConfig();

  try {
    const totalBatches = Math.ceil(completed.length / BATCH_SIZE);
    for (let index = 0; index < completed.length; index += BATCH_SIZE) {
      const batch = completed.slice(index, index + BATCH_SIZE);
      const batchNumber = Math.floor(index / BATCH_SIZE) + 1;
      const batchEntries: Array<TechnicalBatchEntry> = batch.map((subtask) => ({
        diff: clipDiffPatchForTechnicalPrompt(
          extractDiffSummary(subtask.commitHash ?? "", subtask.id),
        ),
        referencedFiles: resolveFilesToRead(subtask.filesToRead),
        subtask,
      }));

      console.log(
        renderEventLine({
          domain: "CALIBRATE",
          message: `Batch ${batchNumber}/${totalBatches}: analyzing ${batchEntries.length} subtask(s) for technical drift`,
          state: "INFO",
        }),
      );

      const prompt = buildTechnicalBatchPrompt(batchEntries, promptContent);
      let result: Awaited<ReturnType<typeof invokeWithProvider>> = null;
      try {
        // eslint-disable-next-line no-await-in-loop -- each batch must use a fresh provider context window
        result = await invokeWithProvider(provider, {
          gracePeriodMs: timeoutConfig.graceSeconds * 1000,
          mode: "headless",
          model,
          prompt,
          stallTimeoutMs: timeoutConfig.stallMinutes * 60 * 1000,
          timeout: timeoutConfig.hardMinutes * 60 * 1000,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("E2BIG")) {
          console.log(
            renderEventLine({
              domain: "CALIBRATE",
              message: `Batch ${batchNumber}/${totalBatches}: skipped due to provider argument-size limit (E2BIG)`,
              state: "SKIP",
            }),
          );
          continue;
        }
        throw error;
      }

      if (result === null) {
        console.error(
          "Technical drift analysis failed, was interrupted, or timed out",
        );
        return false;
      }

      allFindings.push(parseCalibrationResult(result.result));
    }

    const mergedResult = mergeCalibrationResults(allFindings);
    const isApplied = await applyCalibrationProposal({
      checkName: "Technical Drift",
      options,
      resultText: JSON.stringify(mergedResult),
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
  applyStagedProposal,
  buildCalibrationCreateOperations,
  buildIntentionBatchPrompt,
  buildSelfImproveFallbackResult,
  buildSessionAnalysisPrompt,
  buildSessionLogPreflight,
  buildTechnicalBatchPrompt,
  type CalibrateOptions,
  type CalibrateSubcommand,
  type DiffSummary,
  extractDiffSummary,
  findStagedProposal,
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

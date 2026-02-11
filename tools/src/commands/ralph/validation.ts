import chalk from "chalk";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import * as readline from "node:readline";

import type { ProviderType } from "./providers/types";
import type {
  QueueApplyLogEntry,
  QueueOperation,
  QueueProposal,
  QueueProposalLogEntry,
  Subtask,
  ValidationLogEntry,
} from "./types";

import { getMilestoneLogPath } from "./config";
import { executeHook } from "./hooks";
import { invokeProviderSummary } from "./providers/summary";
import { parseQueueOperations } from "./queue-ops";

interface BatchValidationResult {
  aligned: number;
  operations?: Array<QueueOperation>;
  skippedSubtasks: Array<SkippedSubtask>;
  success: boolean;
  total: number;
}

interface CommitEvidenceIssue {
  commitHash?: string;
  reason: string;
  remediation: string;
  severity: CommitEvidenceSeverity;
  subtaskId: string;
}

type CommitEvidenceSeverity = "error" | "warning";

interface CommitEvidenceValidationResult {
  hasBlockingErrors: boolean;
  issues: Array<CommitEvidenceIssue>;
}

interface ParentTaskResolution {
  storyRef: null | string;
  taskContent: null | string;
}

interface SkippedSubtask {
  feedbackPath: string;
  issueType?: ValidationIssueType;
  reason: string;
  subtaskId: string;
}

type SupervisedValidationAction = "continue" | "skip";

interface ValidationContext {
  milestonePath: string;
  subtask: Subtask;
  subtasksPath: string;
}

type ValidationIssueType =
  | "scope_creep"
  | "too_broad"
  | "too_narrow"
  | "unfaithful";

interface ValidationProposalArtifactOptions {
  aligned: number;
  skipped: number;
  total: number;
}

interface ValidationResult {
  aligned: boolean;
  issueType?: ValidationIssueType;
  operations?: Array<QueueOperation>;
  reason?: string;
  suggestion?: string;
}

interface WriteValidationQueueApplyLogOptions {
  applied: boolean;
  fingerprints?: { after?: string; before?: string };
  operationCount: number;
  sessionId?: string;
  source: string;
  summary: string;
}

const VALID_ISSUE_TYPES = new Set<ValidationIssueType>([
  "scope_creep",
  "too_broad",
  "too_narrow",
  "unfaithful",
]);

const VALIDATION_PROMPT_PATH =
  "context/workflows/ralph/building/pre-build-validation.md";
const VALIDATION_TIMEOUT_MS = 60_000;
const TIMEOUT_WARNING_THRESHOLD_MS = 1000;
const STORY_REF_PATTERN =
  /\*\*Story:\*\*\s*\[(?<storyReference>[^\]]+)\]\([^)]+\)/;
const MISSING_PARENT_TASK_REASON_PATTERN =
  /(?:missing parent task|missing task file|unable to validate against parent task|parent task[^\n]*not found)/i;
const VALIDATION_BOX_WIDTH = 64;
const VALIDATION_BOX_INNER_WIDTH = VALIDATION_BOX_WIDTH - 2;
const VALIDATION_CONTENT_WIDTH = 56;
const VALIDATION_LINE_CONTENT_WIDTH = VALIDATION_BOX_WIDTH - 4;
const TRACKING_METADATA_PREFIXES = ["docs/planning/", ".claude/"];

function appendMilestoneLogEntry(
  milestonePath: string,
  entry: QueueApplyLogEntry | QueueProposalLogEntry | ValidationLogEntry,
): void {
  try {
    const logPath = getMilestoneLogPath(path.resolve(milestonePath));
    const logDirectory = path.dirname(logPath);
    mkdirSync(logDirectory, { recursive: true });
    appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[Validation] Failed to write milestone log: ${message}`);
  }
}

function appendOperations(
  destination: Array<QueueOperation>,
  source: Array<QueueOperation> | undefined,
): void {
  if (source !== undefined) {
    destination.push(...source);
  }
}

function buildValidationBoxLine(content: string): string {
  const normalized = content.slice(0, VALIDATION_LINE_CONTENT_WIDTH);
  return `${chalk.yellow("║")} ${normalized.padEnd(VALIDATION_LINE_CONTENT_WIDTH, " ")} ${chalk.yellow("║")}`;
}

function buildValidationDivider(): string {
  return `${chalk.yellow("╠")}${chalk.yellow("═".repeat(VALIDATION_BOX_INNER_WIDTH))}${chalk.yellow("╣")}`;
}

/**
 * Build a validation prompt for a subtask with parent context.
 *
 * @param subtask - Subtask to validate
 * @param milestonePath - Path to milestone containing parent task/story files
 * @param contextRoot - Root path for workflow file resolution
 * @returns Complete prompt string ready for provider invocation
 */
function buildValidationPrompt(
  subtask: Subtask,
  milestonePath: string,
  contextRoot: string,
): string {
  const parentTask = resolveParentTask(subtask.taskRef, milestonePath);
  return buildValidationPromptWithParentTask(subtask, {
    contextRoot,
    milestonePath,
    parentTask,
  });
}

function buildValidationPromptWithParentTask(
  subtask: Subtask,
  options: {
    contextRoot: string;
    milestonePath: string;
    parentTask: ParentTaskResolution;
  },
): string {
  const { contextRoot, milestonePath, parentTask } = options;
  const promptPath = path.join(contextRoot, VALIDATION_PROMPT_PATH);
  if (!existsSync(promptPath)) {
    throw new Error(`Validation prompt not found: ${promptPath}`);
  }

  const basePrompt = readFileSync(promptPath, "utf8");
  const taskReference = subtask.taskRef;
  const { storyRef, taskContent } = parentTask;

  const sections = [
    "## Subtask Definition",
    "",
    "```json",
    JSON.stringify(subtask, null, 2),
    "```",
    "",
    "## Parent Task",
    "",
    taskContent ?? `*Not found: ${taskReference}*`,
  ];

  if (storyRef !== null) {
    sections.push("", "## Parent Story", "");
    const storyContent = resolveParentStory(storyRef, milestonePath);
    sections.push(storyContent ?? `*Not found: ${storyRef}*`);
  }

  return `${basePrompt}\n\n---\n\n# Validation Input\n\n${sections.join("\n")}`;
}

function formatIssueType(issueType: string): string {
  switch (issueType) {
    case "scope_creep": {
      return "Scope Creep";
    }
    case "too_broad": {
      return "Too Broad";
    }
    case "too_narrow": {
      return "Too Narrow";
    }
    case "unfaithful": {
      return "Unfaithful to Parent";
    }
    default: {
      return issueType;
    }
  }
}

/**
 * Generate markdown feedback for a validation failure.
 *
 * @param subtask - The subtask that failed validation
 * @param result - Validation result with reason and suggestion
 * @returns Formatted markdown feedback document
 */
function generateValidationFeedback(
  subtask: Subtask,
  result: ValidationResult,
): string {
  const issueLabel =
    result.issueType === undefined
      ? "Unknown"
      : formatIssueType(result.issueType);
  const reason = result.reason ?? "No reason provided.";

  const sections: Array<string> = [];

  sections.push(`# Validation Feedback: ${subtask.id}`);
  sections.push("");
  sections.push(`**Generated:** ${new Date().toISOString()}`);
  sections.push(`**Subtask:** ${subtask.id} - ${subtask.title}`);
  sections.push(`**Issue Type:** ${issueLabel}`);
  sections.push(`**Task Reference:** ${subtask.taskRef}`);
  if (subtask.storyRef !== undefined && subtask.storyRef !== null) {
    sections.push(`**Story Reference:** ${subtask.storyRef}`);
  }
  sections.push("");

  sections.push("## Validation Failure");
  sections.push("");
  sections.push(reason);
  sections.push("");

  if (result.suggestion !== undefined) {
    sections.push("## Suggested Fix");
    sections.push("");
    sections.push(result.suggestion);
    sections.push("");
  }

  sections.push("## Subtask Definition");
  sections.push("");
  sections.push("```json");
  sections.push(JSON.stringify(subtask, null, 2));
  sections.push("```");
  sections.push("");

  sections.push("## How to Resolve");
  sections.push("");
  sections.push(
    "1. **Fix subtask:** update the subtask to align with its parent task/story intent.",
  );
  sections.push(
    "2. **Skip validation:** proceed without `--validate-first` when this misalignment is acceptable.",
  );
  sections.push(
    "3. **Remove subtask:** delete this subtask from the queue if it should not be implemented.",
  );
  sections.push("");

  return sections.join("\n");
}

function getMilestoneFromPath(milestonePath: string): string {
  return path.basename(milestonePath);
}

function getValidationFeedbackDirectory(milestonePath: string): string {
  const absoluteMilestonePath = path.resolve(milestonePath);
  const feedbackDirectory = path.join(absoluteMilestonePath, "feedback");
  mkdirSync(feedbackDirectory, { recursive: true });
  return feedbackDirectory;
}

/**
 * Handle validation failure in headless mode by writing feedback to disk.
 *
 * @param subtask - The subtask that failed validation
 * @param result - Validation result with reason and suggestion
 * @param milestonePath - Path to milestone for feedback directory
 * @returns Path to written feedback file
 */
function handleHeadlessValidationFailure(
  subtask: Subtask,
  result: ValidationResult,
  milestonePath: string,
): string {
  const feedbackDirectory = getValidationFeedbackDirectory(milestonePath);

  const date = new Date().toISOString().split("T")[0];
  const filePath = path.join(
    feedbackDirectory,
    `${date}_validation_${subtask.id}.md`,
  );
  const content = generateValidationFeedback(subtask, result);

  writeFileSync(filePath, content, "utf8");
  console.log(`[Validation:${subtask.id}] Wrote feedback: ${filePath}`);

  return filePath;
}

async function handleSupervisedValidationFailure(
  subtask: Subtask,
  result: ValidationResult,
): Promise<SupervisedValidationAction> {
  const lines: Array<string> = [
    `${chalk.yellow("╔")}${chalk.yellow("═".repeat(VALIDATION_BOX_INNER_WIDTH))}${chalk.yellow("╗")}`,
    buildValidationBoxLine(chalk.bold.red("VALIDATION FAILED")),
    buildValidationDivider(),
    buildValidationBoxLine(`Subtask: ${subtask.id}`),
  ];

  for (const line of wrapText(subtask.title, VALIDATION_CONTENT_WIDTH)) {
    lines.push(buildValidationBoxLine(`  ${line}`));
  }

  if (result.issueType !== undefined) {
    lines.push(buildValidationDivider());
    lines.push(
      buildValidationBoxLine(`Issue: ${formatIssueType(result.issueType)}`),
    );
  }

  if (result.reason !== undefined) {
    lines.push(buildValidationDivider());
    lines.push(buildValidationBoxLine(chalk.bold("Reason:")));
    for (const line of wrapText(result.reason, VALIDATION_CONTENT_WIDTH)) {
      lines.push(buildValidationBoxLine(`  ${line}`));
    }
  }

  if (result.suggestion !== undefined) {
    lines.push(buildValidationDivider());
    lines.push(buildValidationBoxLine(chalk.bold("Suggestion:")));
    for (const line of wrapText(result.suggestion, VALIDATION_CONTENT_WIDTH)) {
      lines.push(buildValidationBoxLine(`  ${line}`));
    }
  }

  lines.push(
    `${chalk.yellow("╚")}${chalk.yellow("═".repeat(VALIDATION_BOX_INNER_WIDTH))}${chalk.yellow("╝")}`,
  );

  console.log(lines.join("\n"));
  return promptSkipOrContinue(subtask.id);
}

function isReachableCommit(
  commitHash: string,
  repoRoot: string,
): { reachable: boolean; stderr: string } {
  const proc = Bun.spawnSync(
    ["git", "cat-file", "-e", `${commitHash}^{commit}`],
    { cwd: repoRoot, stderr: "pipe", stdout: "ignore" },
  );
  return {
    reachable: proc.exitCode === 0,
    stderr: Buffer.from(proc.stderr).toString("utf8").trim(),
  };
}

function isTrackingMetadataPath(filePath: string): boolean {
  const normalized = filePath.replaceAll("\\", "/").trim();
  return TRACKING_METADATA_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
}

function listCommitFiles(commitHash: string, repoRoot: string): Array<string> {
  const proc = Bun.spawnSync(
    ["git", "show", "--pretty=format:", "--name-only", commitHash],
    { cwd: repoRoot, stderr: "ignore", stdout: "pipe" },
  );
  if (proc.exitCode !== 0) {
    return [];
  }

  return Buffer.from(proc.stdout)
    .toString("utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function normalizeMissingParentTaskFailure(
  result: ValidationResult,
  options: { hasParentTask: boolean; subtaskId: string },
): ValidationResult {
  const { hasParentTask, subtaskId } = options;

  if (result.aligned || hasParentTask) {
    return result;
  }

  if (!MISSING_PARENT_TASK_REASON_PATTERN.test(result.reason ?? "")) {
    return result;
  }

  console.warn(
    `[Validation:${subtaskId}] Parent task missing; treating validation result as aligned`,
  );
  return { aligned: true };
}

function parseIssueType(value: unknown): undefined | ValidationIssueType {
  if (
    typeof value === "string" &&
    VALID_ISSUE_TYPES.has(value as ValidationIssueType)
  ) {
    return value as ValidationIssueType;
  }

  return undefined;
}

/**
 * Parse a validation response from provider invocation.
 *
 * @param rawResponse - Raw text response from the provider
 * @param subtaskId - Subtask ID for logging context
 * @returns Parsed validation result with aligned status and optional operations
 */
function parseValidationResponse(
  rawResponse: string,
  subtaskId: string,
): ValidationResult {
  try {
    const codeBlockMatch = /```(?:json)?\s*(?<content>[\s\S]*?)```/i.exec(
      rawResponse,
    );
    const candidate = codeBlockMatch?.groups?.content ?? rawResponse;
    const jsonMatch = /\{[\s\S]*\}/.exec(candidate);

    if (jsonMatch === null) {
      console.warn(
        `[Validation:${subtaskId}] No JSON found in response, treating as aligned`,
      );
      return { aligned: true };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      aligned?: unknown;
      issue_type?: unknown;
      operations?: unknown;
      reason?: unknown;
      suggestion?: unknown;
    };
    const parsedOperations = parseQueueOperations(parsed.operations, subtaskId);

    if (typeof parsed.aligned !== "boolean") {
      console.warn(
        `[Validation:${subtaskId}] Invalid response format (aligned must be boolean), treating as aligned`,
      );
      return { aligned: true };
    }

    if (parsed.aligned) {
      return parsedOperations === undefined
        ? { aligned: true }
        : { aligned: true, operations: parsedOperations };
    }

    return {
      aligned: false,
      issueType: parseIssueType(parsed.issue_type),
      operations: parsedOperations,
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim() !== ""
          ? parsed.reason
          : "Unknown alignment issue",
      suggestion:
        typeof parsed.suggestion === "string" && parsed.suggestion.trim() !== ""
          ? parsed.suggestion
          : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[Validation:${subtaskId}] Failed to parse validation response: ${message}`,
    );
    return { aligned: true };
  }
}

function printValidationSummary(
  total: number,
  aligned: number,
  skipped: Array<SkippedSubtask>,
): void {
  if (skipped.length === 0) {
    console.log(
      chalk.green(`Validated ${total}/${total} subtasks. All aligned.`),
    );
    return;
  }

  console.log(
    chalk.yellow(
      `Validated ${aligned}/${total} subtasks. ${skipped.length} skipped due to misalignment.`,
    ),
  );
  for (const skippedSubtask of skipped) {
    const issueTypeLabel =
      skippedSubtask.issueType === undefined
        ? "Unknown"
        : formatIssueType(skippedSubtask.issueType);
    const feedbackPathLabel =
      skippedSubtask.feedbackPath === ""
        ? "(not generated in supervised mode)"
        : skippedSubtask.feedbackPath;

    console.log(
      `  - ${skippedSubtask.subtaskId} (${issueTypeLabel}) -> ${feedbackPathLabel}`,
    );
  }
}

async function promptSkipOrContinue(
  subtaskId: string,
): Promise<SupervisedValidationAction> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return "skip";
  }

  // eslint-disable-next-line promise/avoid-new -- readline question API is callback-based
  return new Promise<SupervisedValidationAction>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on("SIGINT", () => {
      rl.close();
      process.emit("SIGINT");
      resolve("skip");
    });

    rl.question(`Skip ${subtaskId}? [Y/n] `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      if (normalized === "n" || normalized === "no") {
        resolve("continue");
        return;
      }

      resolve("skip");
    });
  });
}

function resolveParentStory(
  storyReference: string,
  milestonePath: string,
): null | string {
  if (storyReference.trim() === "") {
    return null;
  }

  const storiesDirectory = path.join(milestonePath, "stories");
  if (!existsSync(storiesDirectory)) {
    return null;
  }

  const storyFileName = readdirSync(storiesDirectory).find((entry) =>
    entry.startsWith(storyReference),
  );

  if (storyFileName === undefined) {
    return null;
  }

  try {
    const storyPath = path.join(storiesDirectory, storyFileName);
    return readFileSync(storyPath, "utf8");
  } catch {
    return null;
  }
}

function resolveParentTask(
  taskReference: string,
  milestonePath: string,
): ParentTaskResolution {
  if (taskReference.trim() === "") {
    return { storyRef: null, taskContent: null };
  }

  const tasksDirectory = path.join(milestonePath, "tasks");
  if (!existsSync(tasksDirectory)) {
    return { storyRef: null, taskContent: null };
  }

  const taskFileName = readdirSync(tasksDirectory).find((entry) =>
    entry.startsWith(taskReference),
  );

  if (taskFileName === undefined) {
    return { storyRef: null, taskContent: null };
  }

  try {
    const taskPath = path.join(tasksDirectory, taskFileName);
    const taskContent = readFileSync(taskPath, "utf8");
    const storyMatch = STORY_REF_PATTERN.exec(taskContent);

    return {
      storyRef: storyMatch?.groups?.storyReference ?? null,
      taskContent,
    };
  } catch {
    return { storyRef: null, taskContent: null };
  }
}

function resolveParentTaskWithCache(
  taskReference: string,
  milestonePath: string,
  parentTaskCache?: Map<string, ParentTaskResolution>,
): ParentTaskResolution {
  const cached = parentTaskCache?.get(taskReference);
  if (cached !== undefined) {
    return cached;
  }

  return resolveParentTask(taskReference, milestonePath);
}

// eslint-disable-next-line max-params -- Signature intentionally mirrors build-loop callsite and acceptance criteria
async function validateAllSubtasks(
  pendingSubtasks: Array<Subtask>,
  options: {
    mode: "headless" | "supervised";
    model?: string;
    provider: ProviderType;
    subtasksPath: string;
  },
  milestonePath: string,
  contextRoot: string,
): Promise<BatchValidationResult> {
  const skippedSubtasks: Array<SkippedSubtask> = [];
  const operations: Array<QueueOperation> = [];
  const parentTaskCache = new Map<string, ParentTaskResolution>();
  let alignedCount = 0;

  console.log("=== Pre-build Validation ===");

  const uniqueTaskReferences = [
    ...new Set(pendingSubtasks.map((subtask) => subtask.taskRef)),
  ];
  for (const taskReference of uniqueTaskReferences) {
    parentTaskCache.set(
      taskReference,
      resolveParentTask(taskReference, milestonePath),
    );
  }

  for (const subtask of pendingSubtasks) {
    // eslint-disable-next-line no-await-in-loop -- Validation runs sequentially for deterministic prompts and output
    const result = await validateSubtask(
      { milestonePath, subtask, subtasksPath: options.subtasksPath },
      contextRoot,
      { model: options.model, parentTaskCache, provider: options.provider },
    );

    appendOperations(operations, result.operations);

    if (result.aligned) {
      alignedCount += 1;
      console.log(`  ${subtask.id}: ${chalk.green("aligned")}`);
    } else {
      const reason = result.reason ?? "Unknown alignment issue";
      const feedbackPath = handleHeadlessValidationFailure(
        subtask,
        result,
        milestonePath,
      );
      console.log(`  ${subtask.id}: ${chalk.red("misaligned")} - ${reason}`);

      if (options.mode === "supervised") {
        // eslint-disable-next-line no-await-in-loop -- Prompt handling must stay in sequence
        const action = await handleSupervisedValidationFailure(subtask, result);
        if (action === "continue") {
          alignedCount += 1;
        } else {
          operations.push({ id: subtask.id, type: "remove" });
          skippedSubtasks.push({
            feedbackPath,
            issueType: result.issueType,
            reason,
            subtaskId: subtask.id,
          });
        }
      } else {
        operations.push({ id: subtask.id, type: "remove" });
        skippedSubtasks.push({
          feedbackPath,
          issueType: result.issueType,
          reason,
          subtaskId: subtask.id,
        });

        // eslint-disable-next-line no-await-in-loop -- Hook should run immediately for each failed subtask
        await executeHook("onValidationFail", {
          message: `Subtask ${subtask.id} failed validation: ${reason}`,
          milestone: getMilestoneFromPath(milestonePath),
          subtaskId: subtask.id,
        });
      }
    }
  }

  printValidationSummary(pendingSubtasks.length, alignedCount, skippedSubtasks);
  appendMilestoneLogEntry(milestonePath, {
    aligned: skippedSubtasks.length === 0,
    milestone: getMilestoneFromPath(milestonePath),
    operationCount: operations.length,
    source: "validation",
    summary:
      `Validated ${alignedCount}/${pendingSubtasks.length} subtasks; ` +
      `${skippedSubtasks.length} misaligned`,
    timestamp: new Date().toISOString(),
    type: "validation",
  });

  return {
    aligned: alignedCount,
    operations: operations.length === 0 ? undefined : operations,
    skippedSubtasks,
    success: skippedSubtasks.length === 0,
    total: pendingSubtasks.length,
  };
}

function validateDoneSubtaskCommitEvidence(
  doneSubtasks: Array<Subtask>,
  options?: { repoRoot?: string },
): CommitEvidenceValidationResult {
  const repoRoot =
    typeof options?.repoRoot === "string" && options.repoRoot.trim() !== ""
      ? options.repoRoot
      : process.cwd();
  const issues: Array<CommitEvidenceIssue> = [];

  for (const subtask of doneSubtasks) {
    if (!subtask.done) {
      // eslint-disable-next-line no-continue -- caller may pass broader subtask arrays
      continue;
    }

    const commitHash =
      typeof subtask.commitHash === "string" ? subtask.commitHash.trim() : "";
    if (commitHash === "") {
      issues.push({
        reason:
          "Completed subtask has no commitHash, so traceability evidence is missing.",
        remediation:
          "Relink commitHash to a reachable implementation commit for this subtask.",
        severity: "error",
        subtaskId: subtask.id,
      });
      // eslint-disable-next-line no-continue -- cannot inspect files without a hash
      continue;
    }

    const reachable = isReachableCommit(commitHash, repoRoot);
    if (!reachable.reachable) {
      const detail =
        reachable.stderr === ""
          ? "commit is missing or not reachable"
          : reachable.stderr;
      issues.push({
        commitHash,
        reason: `Commit evidence is invalid (${detail}).`,
        remediation:
          "Relink commitHash to a reachable implementation commit before running drift analysis.",
        severity: "error",
        subtaskId: subtask.id,
      });
      // eslint-disable-next-line no-continue -- only inspect changed files when hash resolves
      continue;
    }

    const changedFiles = listCommitFiles(commitHash, repoRoot);
    if (
      changedFiles.length > 0 &&
      changedFiles.every((entry) => isTrackingMetadataPath(entry))
    ) {
      issues.push({
        commitHash,
        reason:
          "Commit touches only planning/tracking metadata files; traceability confidence is low.",
        remediation:
          "Split metadata-only changes into a separate commit and relink this subtask to the implementation commit.",
        severity: "warning",
        subtaskId: subtask.id,
      });
    }
  }

  return {
    hasBlockingErrors: issues.some((issue) => issue.severity === "error"),
    issues,
  };
}

async function validateSubtask(
  context: ValidationContext,
  contextRoot: string,
  options: {
    model?: string;
    parentTaskCache?: Map<string, ParentTaskResolution>;
    provider: ProviderType;
  },
): Promise<ValidationResult> {
  const { milestonePath, subtask } = context;
  const { model, parentTaskCache, provider } = options;
  const parentTask = resolveParentTaskWithCache(
    subtask.taskRef,
    milestonePath,
    parentTaskCache,
  );
  const { taskContent } = parentTask;
  const hasParentTask = taskContent !== null;

  console.log(`[Validation] Validating ${subtask.id}: ${subtask.title}`);

  const prompt = buildValidationPromptWithParentTask(subtask, {
    contextRoot,
    milestonePath,
    parentTask,
  });
  const startedAt = Date.now();
  const response = await invokeProviderSummary({
    configuredModel: model,
    prompt,
    provider,
    timeoutMs: VALIDATION_TIMEOUT_MS,
  });
  const elapsedMs = Date.now() - startedAt;

  if (response === null) {
    if (elapsedMs >= VALIDATION_TIMEOUT_MS - TIMEOUT_WARNING_THRESHOLD_MS) {
      console.warn(
        `[Validation:${subtask.id}] Timed out after ${Math.round(elapsedMs / 1000)}s, proceeding as aligned`,
      );
      return { aligned: true };
    }

    console.warn(
      `[Validation:${subtask.id}] Invocation failed, proceeding as aligned`,
    );
    return { aligned: true };
  }

  const parsed = parseValidationResponse(response, subtask.id);
  return normalizeMissingParentTaskFailure(parsed, {
    hasParentTask,
    subtaskId: subtask.id,
  });
}

function wrapText(text: string, width: number): Array<string> {
  if (text.trim() === "") {
    return [""];
  }

  const words = text.trim().split(/\s+/);
  const lines: Array<string> = [];
  let currentLine = "";

  for (const word of words) {
    const normalizedWord = word.length > width ? word.slice(0, width) : word;

    if (currentLine === "") {
      currentLine = normalizedWord;
    } else if (currentLine.length + normalizedWord.length + 1 <= width) {
      currentLine = `${currentLine} ${normalizedWord}`;
    } else {
      lines.push(currentLine);
      currentLine = normalizedWord;
    }
  }

  if (currentLine !== "") {
    lines.push(currentLine);
  }

  return lines.length === 0 ? [""] : lines;
}

function writeValidationProposalArtifact(
  milestonePath: string,
  proposal: QueueProposal,
  options: ValidationProposalArtifactOptions,
): string {
  const feedbackDirectory = getValidationFeedbackDirectory(milestonePath);
  const timestamp = new Date().toISOString();
  const fileTimestamp = timestamp.replaceAll(":", "-").replaceAll(".", "-");
  const filePath = path.join(
    feedbackDirectory,
    `${fileTimestamp}_validation_proposal.md`,
  );
  const content = [
    "# Validation Proposal",
    "",
    `**Generated:** ${timestamp}`,
    `**Milestone:** ${getMilestoneFromPath(milestonePath)}`,
    `**Validation Summary:** ${options.aligned}/${options.total} aligned, ${options.skipped} skipped`,
    `**Operations:** ${proposal.operations.length}`,
    "",
    "## Queue Operations",
    "",
    "```json",
    JSON.stringify(proposal.operations, null, 2),
    "```",
    "",
  ].join("\n");

  writeFileSync(filePath, content, "utf8");
  appendMilestoneLogEntry(milestonePath, {
    operationCount: proposal.operations.length,
    proposal,
    source: proposal.source,
    summary:
      `Validation proposal generated (${options.aligned}/${options.total} aligned, ` +
      `${options.skipped} skipped)`,
    timestamp,
    type: "queue-proposal",
  });
  console.log(`[Validation] Wrote proposal artifact: ${filePath}`);
  return filePath;
}

function writeValidationQueueApplyLogEntry(
  milestonePath: string,
  options: WriteValidationQueueApplyLogOptions,
): void {
  appendMilestoneLogEntry(milestonePath, {
    afterFingerprint:
      options.fingerprints?.after === undefined
        ? undefined
        : { hash: options.fingerprints.after },
    applied: options.applied,
    beforeFingerprint:
      options.fingerprints?.before === undefined
        ? undefined
        : { hash: options.fingerprints.before },
    operationCount: options.operationCount,
    sessionId: options.sessionId,
    source: options.source,
    summary: options.summary,
    timestamp: new Date().toISOString(),
    type: "queue-apply",
  });
}

export {
  type BatchValidationResult,
  buildValidationPrompt,
  type CommitEvidenceIssue,
  type CommitEvidenceValidationResult,
  formatIssueType,
  generateValidationFeedback,
  getMilestoneFromPath,
  getValidationFeedbackDirectory,
  handleHeadlessValidationFailure,
  handleSupervisedValidationFailure,
  normalizeMissingParentTaskFailure,
  parseIssueType,
  parseValidationResponse,
  printValidationSummary,
  promptSkipOrContinue,
  resolveParentStory,
  resolveParentTask,
  type SkippedSubtask,
  type SupervisedValidationAction,
  validateAllSubtasks,
  validateDoneSubtaskCommitEvidence,
  validateSubtask,
  VALIDATION_TIMEOUT_MS,
  type ValidationContext,
  type ValidationIssueType,
  type ValidationProposalArtifactOptions,
  type ValidationResult,
  wrapText,
  writeValidationProposalArtifact,
  writeValidationQueueApplyLogEntry,
};

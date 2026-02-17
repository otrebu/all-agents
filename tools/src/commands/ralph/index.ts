import { Command } from "@commander-js/extra-typings";
import { discoverMilestones, getMilestonePaths } from "@lib/milestones";
import { loadAaaConfig } from "@tools/lib/config";
import { findProjectRoot, getContextRoot } from "@tools/utils/paths";
import chalk from "chalk";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import path from "node:path";

import type { ProviderType } from "./providers/types";
import type { PipelineFooterData, Subtask } from "./types";

import { runArchive } from "./archive";
import runBuild, { buildIterationPrompt } from "./build";
import { type CalibrateSubcommand, runCalibrate } from "./calibrate";
import {
  getLevelsInRange,
  runCascadeFrom,
  validateCascadeTarget,
} from "./cascade";
import {
  countSubtasksInFile,
  discoverTasksFromMilestone,
  getExistingTaskReferences,
  getPlanningLogPath as getMilestonePlanningLogPath,
  getNextSubtask,
  loadRalphConfig,
  loadSubtasksFile,
  loadTimeoutConfig,
  mergeSubtaskFragments,
  ORPHAN_MILESTONE_ROOT,
  saveSubtasksFile,
} from "./config";
import {
  formatDuration,
  type PlanSubtasksSummaryData,
  renderCascadeSummary,
  renderCommandBanner,
  renderEventLine,
  renderInvocationHeader,
  renderPhaseCard,
  renderPipelineFooter,
  renderPipelineHeader,
  renderPipelineTree,
  renderPlanSubtasksSummary,
} from "./display";
import { computeExecutionPlan, type ExecutionPlan } from "./plan-preview";
import {
  buildPrompt,
  invokeClaudeChat as invokeClaudeChatFromModule,
  invokeClaudeHeadlessAsync as invokeClaudeHeadlessAsyncFromModule,
} from "./providers/claude";
import {
  getAllModels,
  getModelsForProvider,
  type ModelInfo,
} from "./providers/models";
import {
  invokeWithProvider,
  resolveProvider,
  validateProvider,
} from "./providers/registry";
import { resolveSessionForProvider } from "./providers/session-adapter";
import applyQueueOperations, { applyAndSaveProposal } from "./queue-ops";
import { runRefreshModels } from "./refresh-models";
import { getSessionJsonlPath } from "./session";
import { runStatus } from "./status";
import {
  buildQueueDiffSummary,
  hasFingerprintMismatch,
  parseCliSubtaskDrafts,
  readQueueProposalFromFile,
} from "./subtask-helpers";

type PipelinePreviewNextStep = PipelineFooterData["nextStep"];

/**
 * Extract task reference from a task path
 *
 * The task reference is the filename without the .md extension.
 * For example: "TASK-008-approval-types.md" -> "TASK-008-approval-types"
 *
 * @param taskPath - Full path to the task file
 * @returns The task reference (filename without extension)
 */
function extractTaskReference(taskPath: string): string {
  return path.basename(taskPath, ".md");
}

function formatDryRunCommandLine(plan: ExecutionPlan): string {
  const commandByType: Record<ExecutionPlan["command"], string> = {
    build: "build",
    "calibrate-all": "calibrate all",
    "calibrate-intention": "calibrate intention",
    "calibrate-technical": "calibrate technical",
    "plan-roadmap": "plan roadmap",
    "plan-stories": "plan stories",
    "plan-subtasks": "plan subtasks",
    "plan-tasks": "plan tasks",
  };

  const parts = [commandByType[plan.command]];
  if (plan.runtime.milestonePath !== null) {
    parts.push(`--milestone ${path.basename(plan.runtime.milestonePath)}`);
  }
  if (plan.cascadeTarget !== null) {
    parts.push(`--cascade ${plan.cascadeTarget}`);
  }
  if (plan.fromLevel !== null) {
    parts.push(`--from ${plan.fromLevel}`);
  }
  if (plan.flags.force) {
    parts.push("--force");
  }
  if (plan.flags.review) {
    parts.push("--review");
  }
  if (plan.flags.validateFirst) {
    parts.push("--validate-first");
  }
  if (plan.flags.calibrateEvery > 0) {
    parts.push(`--calibrate-every ${plan.flags.calibrateEvery}`);
  }

  return parts.join(" ");
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getDryRunApprovalStatus(plan: ExecutionPlan): string {
  if (plan.summary.approvalGateCount === 0) {
    return "none";
  }
  if (plan.flags.force) {
    return "skipped (--force)";
  }
  if (plan.flags.review) {
    return "required (--review)";
  }
  return "default";
}

function getDryRunGateStatus(
  phase: ExecutionPlan["phases"][number],
  plan: ExecutionPlan,
): "APPROVAL" | "auto" | "SKIP" | undefined {
  if (phase.approvalGate === undefined) {
    return undefined;
  }
  if (phase.approvalGate.action === "prompt") {
    return "APPROVAL";
  }
  if (phase.approvalGate.action === "write") {
    return plan.flags.force ? "SKIP" : "auto";
  }
  return "APPROVAL";
}

function getDryRunOutputFormat(): "json" | "pretty" {
  try {
    const configuredFormat = loadAaaConfig().ralph?.dryRun?.format;
    return configuredFormat === "json" ? "json" : "pretty";
  } catch {
    return "pretty";
  }
}

function getDryRunPhaseDescription(command: ExecutionPlan["command"]): string {
  const descriptionByCommand: Record<ExecutionPlan["command"], string> = {
    build: "Run subtask implementation loop",
    "calibrate-all": "Run intention and technical drift analysis",
    "calibrate-intention": "Run intention drift analysis",
    "calibrate-technical": "Run technical drift analysis",
    "plan-roadmap": "Generate roadmap milestones",
    "plan-stories": "Generate story files",
    "plan-subtasks": "Generate executable subtask queue",
    "plan-tasks": "Generate task files",
  };

  return descriptionByCommand[command];
}

function getMilestoneRootFromPath(candidatePath: string): string {
  const normalizedPath = path.normalize(candidatePath);
  const segments = normalizedPath.split(/[\\/]+/);
  const milestonesIndex = segments.lastIndexOf("milestones");
  const slug = segments[milestonesIndex + 1];

  if (
    milestonesIndex >= 2 &&
    segments[milestonesIndex - 1] === "planning" &&
    segments[milestonesIndex - 2] === "docs" &&
    slug !== undefined &&
    slug !== ""
  ) {
    return segments.slice(0, milestonesIndex + 2).join(path.sep);
  }

  return candidatePath;
}

function printDryRunPlan(
  plan: ExecutionPlan,
  options?: { nextStep?: PipelinePreviewNextStep },
): void {
  const shouldRenderAsJson = getDryRunOutputFormat() === "json";

  if (shouldRenderAsJson) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const displayMode = plan.flags.headless ? "headless" : "supervised";

  const phaseNodes = plan.phases.map((phase) => ({
    expanded: true,
    expandedDetail: {
      gate:
        phase.approvalGate === undefined
          ? undefined
          : {
              configValue: "resolved",
              gateName: phase.approvalGate.gate,
              resolvedAction: phase.approvalGate.action,
            },
      reads: phase.reads,
      steps: phase.steps.map((step) => {
        const primaryFlagEffect = step.flagEffects[0];
        if (primaryFlagEffect === undefined) {
          return { text: step.text };
        }
        return {
          annotation: {
            effect: primaryFlagEffect.type,
            flag: primaryFlagEffect.flag.replace(/^--/, ""),
          },
          text: step.text,
        };
      }),
      writes: phase.writes,
    },
    name: phase.level,
    summary: {
      description: getDryRunPhaseDescription(phase.command),
      gateStatus: getDryRunGateStatus(phase, plan),
      timeEstimate: phase.estimatedTime,
    },
  }));

  const warningLines: Array<string> = [];
  if (plan.flags.force) {
    warningLines.push("--force skips approval prompts");
  }
  if (plan.flags.review) {
    warningLines.push("--review requires approval prompts");
  }
  if (plan.flags.validateFirst) {
    warningLines.push("--validate-first runs pre-build queue validation");
  }
  if (plan.flags.calibrateEvery > 0) {
    warningLines.push(
      `--calibrate-every inserts calibration every ${plan.flags.calibrateEvery} iteration(s)`,
    );
  }

  const estimatedMinutes = Number.parseInt(
    plan.summary.totalEstimatedTime.replaceAll(/[^0-9]/g, ""),
    10,
  );

  const outputLines = [
    renderPipelineHeader({
      approvalsStatus: getDryRunApprovalStatus(plan),
      commandLine: formatDryRunCommandLine(plan),
      milestone:
        plan.runtime.milestonePath === null
          ? undefined
          : path.basename(plan.runtime.milestonePath),
      mode: displayMode,
      model: plan.runtime.model ?? undefined,
      provider: plan.runtime.provider ?? "default",
    }),
    "",
    ...renderPipelineTree(phaseNodes, {
      force: plan.flags.force,
      review: plan.flags.review,
    }),
    "",
    ...renderPipelineFooter({
      estimatedCost: "n/a",
      estimatedMinutes: Number.isNaN(estimatedMinutes) ? 0 : estimatedMinutes,
      gatesStatus: getDryRunApprovalStatus(plan),
      nextStep: options?.nextStep ?? "dry-run",
      phaseCount: plan.summary.phaseCount,
      phaseGateCount: plan.summary.approvalGateCount,
      warnings: warningLines,
    }),
  ];

  console.log(outputLines.join("\n"));
}

/**
 * Resolve and validate milestone - exit with helpful error if not found
 */
function requireMilestone(input: string): string {
  const resolved = resolveMilestonePath(input);
  if (resolved === null) {
    const milestones = discoverMilestones();
    console.error(`Error: milestone not found: ${input}`);
    if (milestones.length > 0) {
      console.error(`Available: ${milestones.map((m) => m.slug).join(", ")}`);
    }
    process.exit(1);
  }
  return resolved;
}

/**
 * Resolve and validate story - exit with helpful error if not found
 */
function requireStory(input: string): string {
  const resolved = resolveStoryPath(input);
  if (resolved === null) {
    console.error(`Error: story not found: ${input}`);
    console.error("Try: full path or slug like 001-feature-name");
    process.exit(1);
  }
  return resolved;
}

/**
 * Resolve and validate task - exit with helpful error if not found
 */
function requireTask(input: string): string {
  const resolved = resolveTaskPath(input);
  if (resolved === null) {
    console.error(`Error: task not found: ${input}`);
    console.error("Try: full path or slug like 001-task-name");
    process.exit(1);
  }
  return resolved;
}

/**
 * Resolve milestone path from slug or full path.
 * - If path exists as-is, return it
 * - If path is relative to project root, resolve and return it
 * - If path points inside a milestone tree, return the milestone root
 * - Otherwise try to resolve as milestone slug
 * - Returns null if not found
 */
function resolveMilestonePath(input: string): null | string {
  if (existsSync(input)) {
    return getMilestoneRootFromPath(input);
  }

  const projectRoot = findProjectRoot();
  const projectRelativePath =
    projectRoot !== null && !path.isAbsolute(input)
      ? path.resolve(projectRoot, input)
      : null;

  if (projectRelativePath !== null && existsSync(projectRelativePath)) {
    return getMilestoneRootFromPath(projectRelativePath);
  }

  const paths = getMilestonePaths(input);
  if (paths?.root !== undefined) {
    return paths.root;
  }

  if (projectRoot === null) {
    return null;
  }

  const availableMilestones = new Set(discoverMilestones().map((m) => m.slug));
  if (availableMilestones.has(input)) {
    return path.join(projectRoot, "docs/planning/milestones", input);
  }

  const milestonePathPattern =
    /(?:^|[\\/])docs[\\/]planning[\\/]milestones[\\/](?<slug>[^\\/]+)/;

  const slugFromInputPath = milestonePathPattern.exec(path.normalize(input))
    ?.groups?.slug;
  if (
    slugFromInputPath !== undefined &&
    availableMilestones.has(slugFromInputPath)
  ) {
    if (path.isAbsolute(input)) {
      return getMilestoneRootFromPath(input);
    }
    return path.join(
      projectRoot,
      "docs/planning/milestones",
      slugFromInputPath,
    );
  }

  if (projectRelativePath !== null) {
    const slugFromRelativePath = milestonePathPattern.exec(
      path.normalize(projectRelativePath),
    )?.groups?.slug;
    if (
      slugFromRelativePath !== undefined &&
      availableMilestones.has(slugFromRelativePath)
    ) {
      return path.join(
        projectRoot,
        "docs/planning/milestones",
        slugFromRelativePath,
      );
    }
  }

  return null;
}

/**
 * Resolve output directory from --output-dir flag or milestone path.
 * Accepts either a path or a milestone name (auto-resolved).
 */
function resolveOutputDirectory(
  outputDirectory: string | undefined,
  milestonePath: null | string | undefined,
): string {
  // Priority 1: Explicit --output-dir
  if (outputDirectory !== undefined) {
    // Check if it's a milestone name (no slashes) - try to resolve it
    if (!outputDirectory.includes("/") && !outputDirectory.includes("\\")) {
      const resolved = resolveMilestonePath(outputDirectory);
      if (resolved !== null) return resolved;
    }
    // Otherwise treat as literal path
    return outputDirectory;
  }

  // Priority 2: Milestone source implies output location
  if (milestonePath !== undefined && milestonePath !== null) {
    return milestonePath;
  }

  // Priority 3: Default fallback
  const projectRoot = findProjectRoot() ?? process.cwd();
  return path.join(projectRoot, "docs/planning");
}

/**
 * Resolve story path from slug or full path.
 * Searches: docs/planning/stories/, docs/planning/milestones/{slug}/stories/
 */
function resolveStoryPath(input: string): null | string {
  if (existsSync(input)) return input;

  const projectRoot = findProjectRoot();
  if (projectRoot === null) return null;

  const slug = input.endsWith(".md") ? input.replace(/\.md$/, "") : input;

  // Try global stories
  const globalPath = path.join(
    projectRoot,
    "docs/planning/stories",
    `${slug}.md`,
  );
  if (existsSync(globalPath)) return globalPath;

  // Try milestone stories
  const milestonesDirectory = path.join(
    projectRoot,
    "docs/planning/milestones",
  );
  if (!existsSync(milestonesDirectory)) return null;

  try {
    const directories = readdirSync(milestonesDirectory, {
      withFileTypes: true,
    }).filter((d) => d.isDirectory());
    for (const m of directories) {
      const storyPath = path.join(
        milestonesDirectory,
        m.name,
        "stories",
        `${slug}.md`,
      );
      if (existsSync(storyPath)) return storyPath;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Resolve task path from slug or full path.
 * Searches: docs/planning/tasks/, docs/planning/milestones/{slug}/tasks/
 */
function resolveTaskPath(input: string): null | string {
  if (existsSync(input)) return input;

  const projectRoot = findProjectRoot();
  if (projectRoot === null) return null;

  const slug = input.endsWith(".md") ? input.replace(/\.md$/, "") : input;

  // Try global tasks
  const globalPath = path.join(
    projectRoot,
    "docs/planning/tasks",
    `${slug}.md`,
  );
  if (existsSync(globalPath)) return globalPath;

  // Try milestone tasks
  const milestonesDirectory = path.join(
    projectRoot,
    "docs/planning/milestones",
  );
  if (!existsSync(milestonesDirectory)) return null;

  try {
    const directories = readdirSync(milestonesDirectory, {
      withFileTypes: true,
    }).filter((d) => d.isDirectory());
    for (const m of directories) {
      const taskPath = path.join(
        milestonesDirectory,
        m.name,
        "tasks",
        `${slug}.md`,
      );
      if (existsSync(taskPath)) return taskPath;
    }
  } catch {
    /* ignore */
  }
  return null;
}

const DEFAULT_SUBTASKS_PATH = "subtasks.json";
const SUBTASK_FRAGMENT_FILENAME_PATTERN = /^\.subtasks-task-.*\.json$/;
const SUBTASK_FRAGMENT_POLL_INTERVAL_MS = 15_000;
const SUBTASK_FRAGMENT_STABLE_WINDOW_MS = 75_000;
const TASK_STORY_MARKDOWN_REF_PATTERN =
  /\*\*Story:\*\*\s*\[(?<storyReference>[^\]]+)\]\([^)]+\)/i;
const TASK_STORY_REF_FIELD_PATTERN =
  /^\s*storyRef\s*:\s*(?<storyReference>[^\n]+)\s*$/im;

// =============================================================================
// Three-Mode Execution System
// See: @context/blocks/construct/ralph-patterns.md
// See: @docs/planning/VISION.md Section 3.1
// =============================================================================

/**
 * Options for high-level invokeClaudeHeadlessWithLogging
 */
interface HeadlessWithLoggingOptions {
  extraContext?: string;
  logFile: string;
  model?: string;
  promptPath: string;
  provider?: string;
  sessionName: string;
  shouldAllowNullResult?: boolean;
  /** Size mode for styled pre-execution display (e.g., 'small', 'medium', 'large') */
  sizeMode?: string;
  stallTimeoutMinutes?: number;
  watchdogCheckIntervalMs?: number;
  watchdogReason?: string;
  watchdogShouldTerminate?: () => boolean;
}

/**
 * Result from headless Claude invocation with logging
 */
interface HeadlessWithLoggingResult {
  costUsd: number;
  durationMs: number;
  numTurns: number;
  provider: ProviderType;
  result: string;
  sessionId: string;
}

interface PlanningSupervisedOptions {
  extraContext?: string;
  model?: string;
  promptPath: string;
  provider?: string;
  sessionName: string;
}

interface RalphModelsOptions {
  isJson?: boolean;
  provider?: string;
}

function formatModelRow(model: ModelInfo): string {
  const aliasSuffix =
    model.description?.toLowerCase().includes("alias") === true
      ? " [alias]"
      : "";

  if (model.id === model.cliFormat) {
    return `${model.id} (${model.costHint})${aliasSuffix}`;
  }

  return `${model.id} (${model.costHint}) -> ${model.cliFormat}${aliasSuffix}`;
}

/**
 * Get planning log file path for a milestone
 *
 * When a milestone path is provided, logs are written to:
 *   {milestonePath}/logs/{YYYY-MM-DD}.jsonl
 *
 * When no milestone is specified, falls back to orphan location:
 *   docs/planning/milestones/_orphan/logs/{YYYY-MM-DD}.jsonl
 *
 * @param milestonePath - Optional path to the milestone root directory
 * @returns Full path to the daily planning JSONL log file
 */
function getPlanningLogPath(milestonePath?: string): string {
  if (milestonePath !== undefined && milestonePath !== "") {
    return getMilestonePlanningLogPath(milestonePath);
  }
  // Fall back to orphan location when no milestone is specified
  const projectRoot = findProjectRoot() ?? process.cwd();
  return getMilestonePlanningLogPath(
    path.join(projectRoot, ORPHAN_MILESTONE_ROOT),
  );
}

/**
 * Supervised mode wrapper: Spawn interactive chat session
 * Uses the claude.ts module function and exits process on failure.
 */
function invokeClaudeChat(
  promptPath: string,
  sessionName: string,
  options: { extraContext?: string; model?: string } = {},
): void {
  const { extraContext, model } = options;
  const result = invokeClaudeChatFromModule(promptPath, sessionName, {
    extraContext,
    model,
  });

  if (!result.success && !result.interrupted) {
    process.exit(result.exitCode ?? 1);
  }
}

/**
 * Headless mode wrapper: Run Claude with JSON output and file logging
 * Reads prompt from file, invokes Claude headless, and logs results.
 * By default exits process on failure; optionally returns null when shouldAllowNullResult=true.
 */
async function invokeClaudeHeadless(
  options: { shouldAllowNullResult: true } & HeadlessWithLoggingOptions,
): Promise<HeadlessWithLoggingResult | null>;
async function invokeClaudeHeadless(
  options: {
    shouldAllowNullResult?: false | undefined;
  } & HeadlessWithLoggingOptions,
): Promise<HeadlessWithLoggingResult>;
async function invokeClaudeHeadless(
  options: HeadlessWithLoggingOptions,
): Promise<HeadlessWithLoggingResult | null> {
  const {
    extraContext,
    logFile,
    model: modelOverride,
    promptPath,
    provider: providerOverride,
    sessionName,
    shouldAllowNullResult = false,
    sizeMode,
    stallTimeoutMinutes,
    watchdogCheckIntervalMs,
    watchdogReason,
    watchdogShouldTerminate,
  } = options;

  if (!existsSync(promptPath)) {
    console.error(`Prompt not found: ${promptPath}`);
    process.exit(1);
  }

  const promptContent = readFileSync(promptPath, "utf8");
  const fullPrompt = buildPrompt(promptContent, extraContext);
  const provider = await resolvePlanningProvider(providerOverride);
  const model = resolvePlanningModel(modelOverride);

  // Styled pre-execution header
  console.log(renderInvocationHeader("headless", provider));
  console.log();
  console.log(`${chalk.dim("Source:")}  ${chalk.cyan(promptPath)}`);
  if (sizeMode !== undefined) {
    console.log(`${chalk.dim("Size:")}    ${chalk.yellow(sizeMode)}`);
  }
  if (model !== undefined && model !== "") {
    console.log(`${chalk.dim("Model:")}   ${chalk.yellow(model)}`);
  }
  console.log(`${chalk.dim("Log:")}     ${logFile}`);
  console.log();

  const timeoutConfig = loadTimeoutConfig();
  const resolvedStallTimeoutMinutes =
    stallTimeoutMinutes ?? timeoutConfig.stallMinutes;
  const heartbeatStartedAt = Date.now();
  const HEARTBEAT_INTERVAL_MS = 30_000;
  const VERBOSE_INTERVAL_MS = 10 * 60 * 1000;
  let hasPendingDots = false;
  let nextVerboseAt = heartbeatStartedAt + VERBOSE_INTERVAL_MS;

  function writeHeartbeat(text: string): void {
    try {
      process.stdout.write(text);
    } catch {
      // Extremely rare, but avoid crashing planning runs.
      console.log(text);
    }
  }

  const heartbeatTimer = setInterval(() => {
    writeHeartbeat(".");
    hasPendingDots = true;

    const now = Date.now();
    if (now >= nextVerboseAt) {
      const elapsed = now - heartbeatStartedAt;
      writeHeartbeat("\n");
      hasPendingDots = false;
      console.log(
        chalk.dim(
          `[${provider} planning] still running (${formatDuration(elapsed)})...`,
        ),
      );
      nextVerboseAt = now + VERBOSE_INTERVAL_MS;
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Avoid keeping the process alive solely because of the heartbeat timer.
  const maybeTimer = heartbeatTimer as unknown as { unref?: () => void };
  if (typeof maybeTimer.unref === "function") {
    maybeTimer.unref();
  }

  function stopHeartbeat(): void {
    clearInterval(heartbeatTimer);
    if (hasPendingDots) {
      writeHeartbeat("\n");
      hasPendingDots = false;
    }
  }

  const result = await (async () => {
    try {
      return provider === "claude"
        ? await invokeClaudeHeadlessAsyncFromModule({
            gracePeriodMs: timeoutConfig.graceSeconds * 1000,
            model,
            prompt: fullPrompt,
            stallTimeoutMs: resolvedStallTimeoutMinutes * 60 * 1000,
            timeout: timeoutConfig.hardMinutes * 60 * 1000,
            watchdog:
              watchdogShouldTerminate === undefined
                ? undefined
                : {
                    checkIntervalMs: watchdogCheckIntervalMs,
                    reason: watchdogReason,
                    shouldTerminate: watchdogShouldTerminate,
                  },
          })
        : await invokeWithProvider(provider, {
            gracePeriodMs: timeoutConfig.graceSeconds * 1000,
            mode: "headless",
            model,
            prompt: fullPrompt,
            stallTimeoutMs: resolvedStallTimeoutMinutes * 60 * 1000,
            timeout: timeoutConfig.hardMinutes * 60 * 1000,
          });
    } finally {
      stopHeartbeat();
    }
  })();

  if (result === null) {
    if (shouldAllowNullResult) {
      return null;
    }
    console.error(
      `${provider} headless invocation failed, was interrupted, or timed out`,
    );
    process.exit(1);
  }

  // Log to file
  const logDirectory = path.dirname(logFile);
  if (!existsSync(logDirectory)) {
    mkdirSync(logDirectory, { recursive: true });
  }

  const logEntry = {
    costUsd: result.costUsd,
    durationMs: result.durationMs,
    extraContext: extraContext ?? "",
    model: model ?? "",
    provider,
    result: result.result,
    sessionId: result.sessionId,
    sessionName,
    timestamp: new Date().toISOString(),
    type: "planning" as const,
  };
  appendFileSync(logFile, `${JSON.stringify(logEntry)}\n`);

  // Session ID useful for debugging; duration/cost now shown in styled summary boxes
  console.log(`Session: ${result.sessionId || "unknown"}`);

  return {
    costUsd: result.costUsd,
    durationMs: result.durationMs,
    numTurns: 0,
    provider,
    result: result.result,
    sessionId: result.sessionId,
  };
}

/**
 * Supervised planning wrapper with optional provider/model override.
 * Defaults to Claude for backward compatibility.
 */
async function invokePlanningSupervised(
  options: PlanningSupervisedOptions,
): Promise<void> {
  const {
    extraContext,
    model: modelOverride,
    promptPath,
    provider: providerOverride,
    sessionName,
  } = options;

  const provider = await resolvePlanningProvider(providerOverride);
  const model = resolvePlanningModel(modelOverride);

  if (provider === "claude") {
    invokeClaudeChat(promptPath, sessionName, { extraContext, model });
    return;
  }

  const result = await invokeWithProvider(provider, {
    context: extraContext,
    mode: "supervised",
    model,
    promptPath,
    sessionName,
  });

  if (result === null) {
    console.error(`${provider} supervised invocation failed`);
    process.exit(1);
  }
}

/**
 * Resolve model selection for planning commands.
 * Priority: CLI flag > config file
 */
function resolvePlanningModel(modelOverride?: string): string | undefined {
  if (modelOverride !== undefined && modelOverride !== "") {
    return modelOverride;
  }

  try {
    const config = loadRalphConfig();
    return config.model;
  } catch {
    return undefined;
  }
}

/**
 * Resolve provider selection for planning commands.
 * Priority: CLI flag > env var > config file > auto-detect.
 */
async function resolvePlanningProvider(
  providerOverride?: string,
): Promise<ProviderType> {
  try {
    if (providerOverride !== undefined && providerOverride !== "") {
      return await resolveProvider({ cliFlag: providerOverride });
    }

    return await resolveProvider();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
    throw new Error("unreachable");
  }
}

function runModels(options: RalphModelsOptions): void {
  const { isJson = false, provider } = options;

  const providerFilter: ProviderType | undefined =
    provider === undefined || provider === ""
      ? undefined
      : validateProviderOrExit(provider);

  const models = providerFilter
    ? getModelsForProvider(providerFilter)
    : getAllModels();
  const sorted = [...models].sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    return a.id.localeCompare(b.id);
  });

  if (isJson) {
    console.log(JSON.stringify({ models: sorted }, null, 2));
    return;
  }

  const bannerLines =
    providerFilter === undefined
      ? [chalk.dim("Registry-backed model table for Ralph providers")]
      : [chalk.dim(`Provider filter: ${providerFilter}`)];
  console.log();
  console.log(
    renderCommandBanner({
      lines: bannerLines,
      title: "RALPH MODELS",
      tone: "info",
    }),
  );

  if (sorted.length === 0) {
    if (providerFilter === undefined) {
      console.log(
        renderEventLine({
          domain: "MODELS",
          message: "No models configured.",
          state: "SKIP",
        }),
      );
    } else {
      console.log(
        renderEventLine({
          domain: "MODELS",
          message: `No models configured for provider '${providerFilter}'.`,
          state: "SKIP",
        }),
      );
    }
    return;
  }

  if (providerFilter !== undefined) {
    console.log(
      renderEventLine({
        domain: "MODELS",
        message: `Loaded ${sorted.length} models for provider '${providerFilter}'`,
        state: "DONE",
      }),
    );
    console.log(`Available models for provider '${providerFilter}':`);
    for (const model of sorted) {
      console.log(`  - ${formatModelRow(model)}`);
    }
    return;
  }

  console.log(
    renderEventLine({
      domain: "MODELS",
      message: `Loaded ${sorted.length} models across providers`,
      state: "DONE",
    }),
  );
  console.log("Available models:");
  let currentProvider: null | string = null;
  for (const model of sorted) {
    if (currentProvider !== model.provider) {
      currentProvider = model.provider;
      console.log(`\n${currentProvider}:`);
    }
    console.log(`  - ${formatModelRow(model)}`);
  }
}

function validateProviderOrExit(provider: string): ProviderType {
  try {
    return validateProvider(provider);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
    throw new Error("unreachable");
  }
}

const ralphCommand = new Command("ralph").description(
  "Autonomous development framework (Vision → Roadmap → Story → Task → Subtask)",
);

// ralph build - execute subtask iteration loop
ralphCommand.addCommand(
  new Command("build")
    .description("Run autonomous subtask build loop")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option("-p, --print", "Print prompt without executing provider")
    .option(
      "-i, --interactive",
      "Pause between iterations (legacy, use --supervised)",
    )
    .option(
      "-s, --supervised",
      "Supervised mode: watch each iteration (default)",
    )
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option(
      "-S, --skip-summary",
      "Skip lightweight summary generation in headless mode",
    )
    .option("-q, --quiet", "Suppress terminal summary output")
    .option("--max-iterations <n>", "Max iterations (0 = unlimited)", "0")
    .option(
      "--calibrate-every <n>",
      "Run calibration every N iterations; may insert corrective subtasks into queue order (0 = disabled)",
      "0",
    )
    .option(
      "--validate-first",
      "Run pre-build validation; can create/update/remove/reorder/split pending subtasks before build",
    )
    .option("--provider <name>", "AI provider to use (default: claude)")
    .option("--model <name>", "Model to use (validated against model registry)")
    .option(
      "--force",
      "Approval mode: auto-apply validation/calibration queue proposals (skip prompts)",
    )
    .option(
      "--review",
      "Approval mode: stage validation/calibration queue proposals for explicit approval",
    )
    .option("--from <level>", "Resume cascade from this level")
    .option(
      "--cascade <target>",
      "Chain forward to target level after build (e.g. calibrate). Levels: build, calibrate",
    )
    .option(
      "--dry-run",
      "Preview execution plan without running (exits after showing pipeline diagram)",
    )
    .action(async (options) => {
      validateApprovalFlags(options.force, options.review);

      // Determine execution mode: headless or supervised (default)
      const mode = options.headless === true ? "headless" : "supervised";
      const subtasksPath = path.resolve(options.subtasks);
      const calibrateEvery = Number.parseInt(options.calibrateEvery, 10);

      // Validate cascade target early (before running build)
      if (options.cascade !== undefined) {
        const validationError = validateCascadeTarget("build", options.cascade);
        if (validationError !== null) {
          console.error(`Error: ${validationError}`);
          process.exit(1);
        }
      }

      if (options.dryRun === true) {
        const plan = computeExecutionPlan({
          cascadeTarget: toPlanCascadeTarget(options.cascade),
          command: "build",
          flags: {
            calibrateEvery,
            force: options.force === true,
            headless: options.headless === true,
            review: options.review === true,
            validateFirst: options.validateFirst === true,
          },
          fromLevel: toPlanFromLevel(options.from),
          includeEntryInCascade: true,
          model: options.model,
          provider: options.provider,
          subtasksPath,
        });
        printDryRunPlan(plan);
        process.exit(0);
      }

      const contextRoot = getContextRoot();

      // For --print mode, render the effective runtime prompt for next assignment.
      if (options.print) {
        if (!existsSync(subtasksPath)) {
          console.error(`Subtasks file not found: ${subtasksPath}`);
          process.exit(1);
        }

        const subtasksFile = loadSubtasksFile(subtasksPath);
        const currentSubtask = getNextSubtask(subtasksFile.subtasks);

        if (currentSubtask === null) {
          const pending = subtasksFile.subtasks.filter(
            (subtask) => !subtask.done,
          );
          console.log("=== Ralph Build Prompt (--print) ===\n");
          if (pending.length === 0) {
            console.log(
              "No runnable subtask: queue is empty (all subtasks are done).",
            );
          } else {
            console.log(
              "No runnable subtask found despite pending items in queue.",
            );
            console.log("Pending subtasks (queue order):");
            for (const subtask of pending) {
              console.log(`- ${subtask.id}: ${subtask.title}`);
            }
          }
          console.log("\n=== End of Prompt ===");
          return;
        }

        const effectivePrompt = buildIterationPrompt(
          contextRoot,
          currentSubtask,
          subtasksPath,
        );
        console.log("=== Ralph Build Prompt (--print) ===\n");
        console.log(`Subtasks file: ${subtasksPath}`);
        console.log(
          `Selected subtask: ${currentSubtask.id} (${currentSubtask.title})`,
        );
        console.log("\n--- Effective Iteration Prompt ---");
        console.log(effectivePrompt);
        console.log("\n=== End of Prompt ===");
        return;
      }

      // Map CLI options to BuildOptions and call runBuild()
      await runBuild(
        {
          calibrateEvery,
          force: options.force === true,
          interactive: options.interactive === true,
          maxIterations: Number.parseInt(options.maxIterations, 10),
          mode,
          model: options.model,
          provider: options.provider as ProviderType,
          quiet: options.quiet === true,
          review: options.review === true,
          skipSummary: options.skipSummary === true,
          subtasksPath,
          validateFirst: options.validateFirst === true,
        },
        contextRoot,
      );

      // Handle cascade if requested (after build completes successfully)
      if (options.cascade !== undefined) {
        console.log();
        console.log(
          renderPhaseCard({
            domain: "CASCADE",
            lines: [chalk.dim(`Subtasks queue: ${subtasksPath}`)],
            state: "START",
            title: `Handoff build -> ${options.cascade}`,
          }),
        );
        console.log();
        const result = await runCascadeFrom("build", options.cascade, {
          contextRoot,
          forceFlag: options.force === true,
          fromLevel: options.from,
          model: options.model,
          provider: options.provider as ProviderType,
          reviewFlag: options.review === true,
          subtasksPath,
        });

        console.log(renderCascadeSummary(result));

        if (!result.success) {
          console.error(
            renderEventLine({
              domain: "CASCADE",
              message: `Cascade failed: ${result.error ?? "unknown error"}`,
              state: "FAIL",
            }),
          );
          if (result.stoppedAt !== null) {
            console.error(
              renderEventLine({
                domain: "CASCADE",
                message: `Stopped at: ${result.stoppedAt}`,
                state: "FAIL",
              }),
            );
          }
          process.exit(1);
        }

        console.log(
          renderEventLine({
            domain: "CASCADE",
            message: `Reached ${options.cascade}`,
            state: "DONE",
          }),
        );
      }
    }),
);

// ralph plan - interactive planning commands
const planCommand = new Command("plan").description(
  "Planning tools for vision, roadmap, stories, tasks, and subtasks",
);

/** Options for cascade execution helper */
interface HandleCascadeOptions {
  /** Run calibration every N build iterations during cascade (0 = disabled) */
  calibrateEvery?: number;
  cascadeTarget: string;
  contextRoot: string;
  /** Skip approvals by forcing write actions at all gates (`--force`) */
  forceFlag?: boolean;
  /** Level to resume from; overrides the cascade start argument */
  fromLevel: string;
  /** Preserve headless mode for cascade execution */
  headless?: boolean;
  /** Run review + gap checks before build when cascading */
  isWithReviews?: boolean;
  /** Provider model identifier to propagate across cascaded levels */
  model?: string;
  /** Provider selection to propagate across cascaded levels */
  provider?: ProviderType;
  resolvedMilestonePath: null | string;
  /** Require approvals by forcing gate review behavior (`--review`) */
  reviewFlag?: boolean;
  /** Optional resolved story path for tasks-level review flow */
  reviewStoryPath?: string;
  /** Override subtasks path (used when different from milestone default) */
  subtasksPath?: string;
  /** Run pre-build validation before cascading into build level */
  validateFirst?: boolean;
}

interface RunReviewFlowForLevelOptions {
  contextRoot: string;
  isDryRun?: boolean;
  isHeadless?: boolean;
  level: "stories" | "subtasks" | "tasks";
  milestonePath: null | string;
  model?: string;
  provider?: string;
  reviewStoryPath?: string;
  subtasksPath: string;
}

interface RunReviewWorkflowOptions {
  contextRoot: string;
  extraContext: string;
  isDryRun?: boolean;
  isGapAnalysis: boolean;
  isHeadless?: boolean;
  logMilestonePath?: string;
  model?: string;
  provider?: string;
  reviewType: "roadmap" | "stories" | "subtasks" | "tasks";
  sessionName: string;
}

/** Options for running subtasks in headless mode */
interface RunSubtasksHeadlessOptions {
  beforeCount: number;
  expectedFragmentCount?: number;
  extraContext: string;
  milestone: string | undefined;
  model?: string;
  outputDirectory: string | undefined;
  promptPath: string;
  provider?: string;
  resolvedMilestonePath: null | string | undefined;
  sizeMode: "large" | "medium" | "small";
  skippedTasks: Array<string>;
  sourceInfo: PlanSubtasksSummaryData["source"];
  storyRef: string | undefined;
}

interface SubtaskFragmentMergeState {
  fragmentMergeError: null | string;
  fragmentMergeResult: {
    cleaned: number;
    fragments: number;
    merged: number;
  } | null;
  fragmentSignature: string;
  fragmentSignatureLastChangedAt: number;
  hasFragmentSignatureInitialized: boolean;
  shouldTerminateWatchdog: boolean;
}

interface SubtaskFragmentSnapshot {
  count: number;
  paths: Array<string>;
  signature: string;
}

/** Result of subtasks pre-check for --milestone and --story modes */
interface SubtasksPreCheckResult {
  /** Count of subtasks before Claude invocation */
  beforeCount: number;
  /** Whether to skip entirely (all tasks already have subtasks) */
  shouldSkip: boolean;
  /** Array of taskRefs that were skipped */
  skippedTasks: Array<string>;
  /** Total number of tasks discovered before story filtering */
  totalDiscoveredTasks: number;
  /** Total number of tasks discovered */
  totalTasks: number;
}

// Helper type for subtasks source context
interface SubtasksSourceContext {
  contextParts: Array<string>;
  sourceInfo: PlanSubtasksSummaryData["source"];
}

// Helper type for subtasks source flags
interface SubtasksSourceFlags {
  hasFile: boolean;
  hasMilestone: boolean;
  hasReview: boolean;
  hasStory: boolean;
  hasTask: boolean;
  hasText: boolean;
}

/** Options for tasks milestone mode execution */
interface TasksMilestoneOptions {
  contextRoot: string;
  isAutoMode: boolean;
  isHeadless: boolean;
  milestone: string;
  model?: string;
  provider?: string;
}

/** Options for tasks source mode execution */
interface TasksSourceOptions {
  contextRoot: string;
  file: string | undefined;
  hasFile: boolean;
  isHeadless: boolean;
  isSupervised: boolean;
  model?: string;
  provider?: string;
  text: string | undefined;
}

/** Options for tasks story mode execution */
interface TasksStoryOptions {
  contextRoot: string;
  isAutoMode: boolean;
  isHeadless: boolean;
  isSupervised: boolean;
  model?: string;
  provider?: string;
  story: string;
}

function buildSubtaskFragmentSnapshot(
  outputDirectory: string,
): SubtaskFragmentSnapshot {
  const paths = listSubtaskFragmentFiles(outputDirectory);
  const signatureParts: Array<string> = [];
  for (const fragmentPath of paths) {
    try {
      const stats = statSync(fragmentPath);
      signatureParts.push(
        `${path.basename(fragmentPath)}:${stats.size}:${stats.mtimeMs}`,
      );
    } catch {
      // Ignore transient races where a fragment is removed between list/stat.
    }
  }
  const signature = signatureParts.join("|");

  return { count: paths.length, paths, signature };
}

function buildSubtasksMergeMetadata(
  resolvedMilestonePath: null | string | undefined,
): { milestoneRef?: string; scope: "milestone" } | undefined {
  if (resolvedMilestonePath === undefined || resolvedMilestonePath === null) {
    return undefined;
  }

  return {
    milestoneRef: path.basename(resolvedMilestonePath),
    scope: "milestone",
  };
}

// Helper to build subtasks context and source info
function buildSubtasksSourceContext(
  flags: SubtasksSourceFlags,
  options: {
    file?: string;
    milestone?: string;
    resolvedMilestonePath?: null | string;
    story?: string;
    task?: string;
    text?: string;
  },
): SubtasksSourceContext {
  const contextParts: Array<string> = [];
  let sourceInfo: PlanSubtasksSummaryData["source"] = {
    text: "",
    type: "text",
  };

  if (flags.hasMilestone && options.milestone !== undefined) {
    contextParts.push(
      `Generating subtasks for all tasks in milestone: ${options.milestone}`,
    );
    contextParts.push(`Milestone path: ${options.resolvedMilestonePath}`);
    sourceInfo = { path: options.milestone, type: "file" };
  } else if (flags.hasStory && options.story !== undefined) {
    contextParts.push(
      `Generating subtasks for all tasks in story: ${options.story}`,
    );
    sourceInfo = { path: options.story, type: "file" };
  } else if (flags.hasTask && options.task !== undefined) {
    const taskPath = requireTask(options.task);
    contextParts.push(`Generating subtasks for task: ${taskPath}`);
    sourceInfo = { path: taskPath, type: "file" };
  } else if (flags.hasReview) {
    contextParts.push(
      "Generating subtasks from review diary: logs/reviews.jsonl",
    );
    sourceInfo = { path: "logs/reviews.jsonl", type: "review" };
  } else if (flags.hasFile && options.file !== undefined) {
    contextParts.push(`Generating subtasks from file: ${options.file}`);
    sourceInfo = { path: options.file, type: "file" };
  } else if (flags.hasText && options.text !== undefined) {
    contextParts.push(`Generating subtasks from description: ${options.text}`);
    sourceInfo = { text: options.text, type: "text" };
  }

  return { contextParts, sourceInfo };
}

/**
 * Perform pre-check for --milestone and --story modes
 *
 * Discovers tasks from the milestone, checks which ones already have subtasks,
 * and returns information needed for filtering and summary display.
 *
 * @param milestonePath - Resolved milestone path
 * @param outputDirectory - Directory where subtasks.json is/will be
 * @param storyPath - Optional story path; when provided, only linked tasks are considered
 * @returns Pre-check result with counts and skip info
 */
function checkSubtasksPreCheck(options: {
  milestonePath: string;
  outputDirectory: string;
  storyPath?: string;
}): SubtasksPreCheckResult {
  const { milestonePath, outputDirectory, storyPath } = options;
  const subtasksPath = path.join(outputDirectory, "subtasks.json");

  // Keep pre-check compatible with legacy array queues by normalizing once.
  normalizeLegacySubtasksQueueIfNeeded(subtasksPath);

  // Capture before count for later delta calculation
  const beforeCount = countSubtasksInFile(subtasksPath);

  // Get existing taskRefs from the subtasks file
  const existingTaskReferences = getExistingTaskReferences(subtasksPath);

  // Discover tasks from milestone, then optionally filter to a single story's linked tasks.
  const discoveredTasks = discoverTasksFromMilestone(milestonePath);
  const relevantTasks =
    storyPath === undefined
      ? discoveredTasks
      : discoverStoryLinkedTasks(discoveredTasks, storyPath);

  // Filter tasks and track skipped ones
  const skippedTasks: Array<string> = [];
  for (const taskPath of relevantTasks) {
    const taskReference = extractTaskReference(taskPath);
    if (existingTaskReferences.has(taskReference)) {
      skippedTasks.push(taskReference);
    }
  }

  // Determine if all tasks already have subtasks
  const shouldSkip =
    relevantTasks.length > 0 && skippedTasks.length === relevantTasks.length;

  return {
    beforeCount,
    shouldSkip,
    skippedTasks,
    totalDiscoveredTasks: discoveredTasks.length,
    totalTasks: relevantTasks.length,
  };
}

/**
 * Check if a task should be skipped because it already has subtasks
 * @param taskPath - Path to the task file
 * @param outputDirectory - Output directory option (may be undefined)
 * @returns true if the task should be skipped
 */
function checkTaskHasSubtasks(
  taskPath: string,
  outputDirectory: string | undefined,
): boolean {
  const taskReference = extractTaskReference(taskPath);

  // Infer milestone from task path if it's in a milestone folder
  const milestoneMatch = /milestones\/(?<slug>[^/]+)\//.exec(taskPath);
  const inferredMilestonePath =
    milestoneMatch?.groups?.slug === undefined
      ? null
      : resolveMilestonePath(milestoneMatch.groups.slug);

  // Determine output path for subtasks.json
  const preCheckOutputDirectory = resolveOutputDirectory(
    outputDirectory,
    inferredMilestonePath,
  );
  const preCheckSubtasksPath = path.join(
    preCheckOutputDirectory,
    "subtasks.json",
  );

  // Keep task pre-check compatible with legacy array queues by normalizing once.
  normalizeLegacySubtasksQueueIfNeeded(preCheckSubtasksPath);

  // Check if this task already has subtasks
  const existingTaskReferences =
    getExistingTaskReferences(preCheckSubtasksPath);
  return existingTaskReferences.has(taskReference);
}

function discoverStoriesForMilestone(milestonePath: string): Array<string> {
  const storiesDirectory = path.join(milestonePath, "stories");
  if (!existsSync(storiesDirectory)) {
    return [];
  }

  return readdirSync(storiesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(storiesDirectory, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

function discoverStoryLinkedTasks(
  allTasks: Array<string>,
  storyPath: string,
): Array<string> {
  const storyReference = normalizeStoryReference(
    path.basename(storyPath, ".md"),
  );
  if (storyReference === "") {
    return [];
  }

  return allTasks.filter((taskPath) => {
    try {
      const taskContent = readFileSync(taskPath, "utf8");
      return extractStoryReferencesFromTaskContent(taskContent).has(
        storyReference,
      );
    } catch {
      return false;
    }
  });
}

function exitWithSubtasksQueueOutcomeFailure(options: {
  fragmentMergeError: null | string;
  loadResult: {
    error?: string;
    subtasks: Array<{ id: string; title: string }>;
  };
  outputPath: string;
  providerResult: HeadlessWithLoggingResult | null;
}): never {
  const { fragmentMergeError, loadResult, outputPath, providerResult } =
    options;
  const message =
    providerResult === null
      ? "Headless subtasks generation failed: provider ended without result and no valid subtasks queue outcome was produced."
      : "Headless subtasks generation failed: provider returned successfully but no valid subtasks queue outcome was produced.";
  console.error(renderEventLine({ domain: "PLAN", message, state: "FAIL" }));
  console.error(
    renderEventLine({
      domain: "PLAN",
      message: `Expected updated queue at: ${outputPath}`,
      state: "FAIL",
    }),
  );

  if (loadResult.error === undefined) {
    console.error(
      renderEventLine({
        domain: "PLAN",
        message:
          "Queue file was unchanged after provider execution (no observable update).",
        state: "FAIL",
      }),
    );
  } else {
    console.error(
      renderEventLine({
        domain: "PLAN",
        message: `Queue load error: ${loadResult.error}`,
        state: "FAIL",
      }),
    );
  }

  const providerSnippet = formatProviderResultSnippet(providerResult);
  if (providerSnippet !== null) {
    console.error(
      renderEventLine({
        domain: "PLAN",
        message: `Provider output snippet: ${providerSnippet}`,
        state: "FAIL",
      }),
    );
  }

  if (fragmentMergeError !== null) {
    console.error(
      renderEventLine({
        domain: "PLAN",
        message: `Fragment merge error: ${fragmentMergeError}`,
        state: "FAIL",
      }),
    );
  }

  process.exit(1);
}

/**
 * Print error message for missing subtasks source and exit
 */
function exitWithSubtasksSourceError(): never {
  console.error("Error: Must provide a source");
  console.log("\nHierarchy sources (scope = source):");
  console.log(
    "  aaa ralph plan subtasks --milestone <name>  # All tasks in milestone → subtasks",
  );
  console.log(
    "  aaa ralph plan subtasks --story <path>      # All tasks for story → subtasks",
  );
  console.log(
    "  aaa ralph plan subtasks --task <path>       # Task → subtasks",
  );
  console.log("\nAlternative sources:");
  console.log(
    "  aaa ralph plan subtasks --file <path>       # File → subtasks",
  );
  console.log(
    '  aaa ralph plan subtasks --text "Fix bug"    # Text → subtasks',
  );
  console.log(
    "  aaa ralph plan subtasks --review-diary      # Review diary → subtasks",
  );
  process.exit(1);
}

/**
 * Print error message for missing tasks source and exit
 */
function exitWithTasksSourceError(): never {
  console.error("Error: Must provide a source");
  console.log("\nHierarchy sources (scope = source):");
  console.log("  aaa ralph plan tasks --story <path>       # Story → tasks");
  console.log(
    "  aaa ralph plan tasks --milestone <path>   # All stories in milestone → tasks",
  );
  console.log("\nAlternative sources:");
  console.log("  aaa ralph plan tasks --file <path>        # File → tasks");
  console.log('  aaa ralph plan tasks --text "Add auth"    # Text → tasks');
  process.exit(1);
}

function extractStoryReferencesFromTaskContent(
  taskContent: string,
): Set<string> {
  const storyReferences = new Set<string>();
  const markdownPattern = new RegExp(
    TASK_STORY_MARKDOWN_REF_PATTERN.source,
    "gi",
  );
  const storyFieldPattern = new RegExp(
    TASK_STORY_REF_FIELD_PATTERN.source,
    "gim",
  );

  for (const match of taskContent.matchAll(markdownPattern)) {
    const storyReference = match.groups?.storyReference;
    if (storyReference !== undefined) {
      const normalized = normalizeStoryReference(storyReference);
      if (normalized !== "") {
        storyReferences.add(normalized);
      }
    }
  }

  for (const match of taskContent.matchAll(storyFieldPattern)) {
    const storyReference = match.groups?.storyReference;
    if (storyReference !== undefined) {
      const normalized = normalizeStoryReference(storyReference);
      if (normalized !== "") {
        storyReferences.add(normalized);
      }
    }
  }

  return storyReferences;
}

function formatProviderResultSnippet(
  providerResult: HeadlessWithLoggingResult | null,
): null | string {
  if (providerResult === null) {
    return null;
  }
  const normalized = providerResult.result.replaceAll(/\s+/g, " ").trim();
  if (normalized === "") {
    return null;
  }

  const maxLength = 220;
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3)}...`;
}

// Helper to get prompt path based on session type and auto mode
function getPromptPath(
  contextRoot: string,
  sessionName: string,
  isAutoMode: boolean,
): string {
  const suffix = isAutoMode ? "auto" : "interactive";
  return path.join(
    contextRoot,
    `context/workflows/ralph/planning/${sessionName}-${suffix}.md`,
  );
}

function getSubtasksCascadeFromLevel(fromOption: string | undefined): string {
  return fromOption ?? "subtasks";
}

function getSubtasksLoadResult(outputPath: string): {
  error?: string;
  subtasks: Array<{ id: string; title: string }>;
} {
  try {
    const file = loadSubtasksFile(outputPath);
    return {
      subtasks: file.subtasks.map((subtask) => ({
        id: subtask.id,
        title: subtask.title,
      })),
    };
  } catch (error) {
    if (normalizeLegacySubtasksQueueIfNeeded(outputPath)) {
      try {
        const normalizedFile = loadSubtasksFile(outputPath);
        return {
          subtasks: normalizedFile.subtasks.map((subtask) => ({
            id: subtask.id,
            title: subtask.title,
          })),
        };
      } catch (normalizedError) {
        return { error: formatErrorMessage(normalizedError), subtasks: [] };
      }
    }

    return { error: formatErrorMessage(error), subtasks: [] };
  }
}

// Helper to determine subtasks prompt path based on source type
function getSubtasksPromptPath(
  contextRoot: string,
  flags: SubtasksSourceFlags,
): string {
  if (flags.hasMilestone || flags.hasStory) {
    return path.join(
      contextRoot,
      "context/workflows/ralph/planning/subtasks-from-hierarchy.md",
    );
  }
  if (flags.hasTask) {
    return getPromptPath(contextRoot, "subtasks", true);
  }
  return path.join(
    contextRoot,
    "context/workflows/ralph/planning/subtasks-from-source.md",
  );
}

function getSubtasksSizeGuidance(
  sizeMode: "large" | "medium" | "small",
): string {
  const sizeDescriptions: Record<typeof sizeMode, string> = {
    large:
      "Large slices: Only split at major functional boundaries. One subtask per logical feature. Prefer fewer, larger subtasks.",
    medium:
      "Medium slices (default): One PR per subtask. Each subtask is a coherent unit of work that ships independently.",
    small:
      "Small slices: Thinnest viable slices. Maximize granularity for fine-grained progress tracking. Split aggressively.",
  };

  return sizeDescriptions[sizeMode];
}

/**
 * Handle cascade execution after a planning level completes
 *
 * Validates cascade target, runs cascade, and exits on failure.
 */
async function handleCascadeExecution(
  options: HandleCascadeOptions,
): Promise<void> {
  const {
    calibrateEvery,
    cascadeTarget,
    contextRoot,
    forceFlag: isForceFlag,
    fromLevel,
    headless: isHeadless = false,
    isWithReviews = false,
    model,
    provider,
    resolvedMilestonePath,
    reviewFlag: isReviewFlag,
    reviewStoryPath,
    subtasksPath: explicitSubtasksPath,
    validateFirst: shouldValidateFirst,
  } = options;

  // Validate cascade target
  const validationError = validateCascadeTarget(fromLevel, cascadeTarget);
  if (validationError !== null) {
    console.error(`Error: ${validationError}`);
    process.exit(1);
  }

  // Determine subtasks path: use explicit path if provided, otherwise derive from milestone
  const subtasksPath =
    explicitSubtasksPath ??
    (resolvedMilestonePath === null
      ? path.join(contextRoot, "subtasks.json")
      : path.join(resolvedMilestonePath, "subtasks.json"));
  const cascadePath = [
    fromLevel,
    ...getLevelsInRange(fromLevel, cascadeTarget),
  ];
  console.log(
    renderEventLine({
      domain: "CASCADE",
      message: `Cascade path: ${cascadePath.join(" -> ")}`,
      state: "INFO",
    }),
  );

  const handoffLines = [chalk.dim(`Subtasks queue: ${subtasksPath}`)];
  const shouldRunReviewFlow =
    isWithReviews && hasBuildInCascadePath(fromLevel, cascadeTarget);
  if (shouldRunReviewFlow) {
    handoffLines.push(
      chalk.dim(
        "Review flow: stories/tasks/subtasks quality + gap checks run before build",
      ),
    );
  }
  if (shouldValidateFirst === true) {
    handoffLines.push(
      chalk.dim("Pre-build validation: runs before build iteration phase"),
    );
  }
  if ((calibrateEvery ?? 0) > 0) {
    handoffLines.push(
      chalk.dim(`Periodic calibration: every ${calibrateEvery} iterations`),
    );
  }

  console.log();
  console.log(
    renderPhaseCard({
      domain: "CASCADE",
      lines: handoffLines,
      state: "START",
      title: `Handoff ${fromLevel} -> ${cascadeTarget}`,
    }),
  );
  console.log();

  async function runPlanningLevelFromCascade(
    level: "subtasks" | "tasks",
    planningOptions: {
      contextRoot: string;
      milestonePath: string;
      model?: string;
      provider?: ProviderType;
    },
  ): Promise<null | string> {
    const {
      contextRoot: planningContextRoot,
      milestonePath,
      model: planningModel,
      provider: planningProvider,
    } = planningOptions;

    try {
      switch (level) {
        case "subtasks": {
          const outputDirectory = resolveOutputDirectory(
            undefined,
            milestonePath,
          );
          const preCheckResult = checkSubtasksPreCheck({
            milestonePath,
            outputDirectory,
          });
          const { beforeCount, shouldSkip, skippedTasks, totalTasks } =
            preCheckResult;
          const expectedFragmentCount = totalTasks - skippedTasks.length;

          if (shouldSkip) {
            console.log(
              `All ${totalTasks} tasks already have subtasks - nothing to generate`,
            );
            return null;
          }

          if (skippedTasks.length > 0) {
            const remainingCount = totalTasks - skippedTasks.length;
            console.log(
              `Pre-check: ${skippedTasks.length} tasks already have subtasks, ${remainingCount} to process`,
            );
          }

          const sourceFlags: SubtasksSourceFlags = {
            hasFile: false,
            hasMilestone: true,
            hasReview: false,
            hasStory: false,
            hasTask: false,
            hasText: false,
          };
          const { contextParts, sourceInfo } = buildSubtasksSourceContext(
            sourceFlags,
            { milestone: milestonePath, resolvedMilestonePath: milestonePath },
          );

          const sizeMode = "medium" as const;
          contextParts.push(`Sizing mode: ${sizeMode}`);
          contextParts.push(
            `Sizing guidance: ${getSubtasksSizeGuidance(sizeMode)}`,
          );

          const promptPath = getSubtasksPromptPath(
            planningContextRoot,
            sourceFlags,
          );
          const extraContext = contextParts.join("\n");

          await runSubtasksHeadless({
            beforeCount,
            expectedFragmentCount,
            extraContext,
            milestone: milestonePath,
            model: planningModel,
            outputDirectory: undefined,
            promptPath,
            provider: planningProvider,
            resolvedMilestonePath: milestonePath,
            sizeMode,
            skippedTasks,
            sourceInfo,
            storyRef: undefined,
          });

          if (shouldRunReviewFlow) {
            await runReviewFlowForLevel({
              contextRoot: planningContextRoot,
              isDryRun: false,
              isHeadless,
              level: "subtasks",
              milestonePath,
              model: planningModel,
              provider: planningProvider,
              subtasksPath: path.join(outputDirectory, "subtasks.json"),
            });
          }
          return null;
        }

        case "tasks": {
          await runTasksMilestoneMode({
            contextRoot: planningContextRoot,
            isAutoMode: true,
            isHeadless: true,
            milestone: milestonePath,
            model: planningModel,
            provider: planningProvider,
          });

          if (shouldRunReviewFlow) {
            await runReviewFlowForLevel({
              contextRoot: planningContextRoot,
              isDryRun: false,
              isHeadless,
              level: "tasks",
              milestonePath,
              model: planningModel,
              provider: planningProvider,
              subtasksPath,
            });
          }
          return null;
        }

        default: {
          return "Unsupported planning level for cascade execution";
        }
      }
    } catch (error) {
      return `Failed to execute planning level '${level}': ${formatErrorMessage(error)}`;
    }
  }

  const reviewEntryLevel =
    fromLevel === "stories" || fromLevel === "subtasks" || fromLevel === "tasks"
      ? fromLevel
      : null;
  if (shouldRunReviewFlow && reviewEntryLevel !== null) {
    await runReviewFlowForLevel({
      contextRoot,
      isDryRun: false,
      isHeadless,
      level: reviewEntryLevel,
      milestonePath: resolvedMilestonePath,
      model,
      provider,
      reviewStoryPath,
      subtasksPath,
    });
  }

  const result = await runCascadeFrom(fromLevel, cascadeTarget, {
    calibrateEvery,
    contextRoot,
    forceFlag: isForceFlag,
    fromLevel,
    headless: isHeadless,
    milestonePath: resolvedMilestonePath ?? undefined,
    model,
    planningLevelRunner: runPlanningLevelFromCascade,
    provider,
    reviewFlag: isReviewFlag,
    subtasksPath,
    validateFirst: shouldValidateFirst,
  });

  console.log(renderCascadeSummary(result));

  if (!result.success) {
    console.error(
      renderEventLine({
        domain: "CASCADE",
        message: `Cascade failed: ${result.error ?? "unknown error"}`,
        state: "FAIL",
      }),
    );
    if (result.stoppedAt !== null) {
      console.error(
        renderEventLine({
          domain: "CASCADE",
          message: `Stopped at: ${result.stoppedAt}`,
          state: "FAIL",
        }),
      );
    }
    process.exit(1);
  }

  console.log(
    renderEventLine({
      domain: "CASCADE",
      message: `Reached ${cascadeTarget}`,
      state: "DONE",
    }),
  );
}

function hasBuildInCascadePath(
  fromLevel: string,
  cascadeTarget: string,
): boolean {
  const cascadeLevels = [
    fromLevel,
    ...getLevelsInRange(fromLevel, cascadeTarget),
  ];
  return cascadeLevels.includes("build");
}

// Helper to invoke Claude with a prompt file for interactive session
function invokeClaude(
  promptPath: string,
  sessionName: string,
  options: { extraContext?: string; model?: string } = {},
): void {
  const { extraContext, model } = options;
  if (!existsSync(promptPath)) {
    console.error(`Prompt not found: ${promptPath}`);
    process.exit(1);
  }

  // Read the prompt content from the file
  const promptContent = readFileSync(promptPath, "utf8");

  console.log(`Starting ${sessionName} planning session...`);
  console.log(`Prompt: ${promptPath}`);
  if (extraContext !== undefined && extraContext !== "") {
    console.log(`Context: ${extraContext}`);
  }
  console.log();

  // Build full prompt with optional extra context
  let fullPrompt = promptContent;
  if (extraContext !== undefined && extraContext !== "") {
    fullPrompt = `${extraContext}\n\n${promptContent}`;
  }

  // Use Bun.spawnSync with argument array to avoid shell parsing entirely
  // This prevents issues with special characters like parentheses in the prompt
  // --permission-mode bypassPermissions prevents inheriting plan mode from user settings
  const args = [
    "claude",
    "--permission-mode",
    "bypassPermissions",
    "--append-system-prompt",
    fullPrompt,
  ];

  if (model !== undefined && model !== "") {
    args.push("--model", model);
  }

  args.push(
    `Please begin the ${sessionName} planning session following the instructions provided.`,
  );

  const proc = Bun.spawnSync(args, {
    stdio: ["inherit", "inherit", "inherit"],
  });

  // Exit with non-zero exit code when process fails
  // proc.exitCode: 0 = success, positive number = error
  const { exitCode } = proc;
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

function listSubtaskFragmentFiles(outputDirectory: string): Array<string> {
  if (!existsSync(outputDirectory)) {
    return [];
  }

  try {
    return readdirSync(outputDirectory, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() && SUBTASK_FRAGMENT_FILENAME_PATTERN.test(entry.name),
      )
      .map((entry) => path.join(outputDirectory, entry.name))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Normalize legacy queue files that use a top-level array into canonical schema shape.
 *
 * Returns true when a rewrite occurred.
 */
function normalizeLegacySubtasksQueueIfNeeded(subtasksPath: string): boolean {
  if (!existsSync(subtasksPath)) {
    return false;
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(readFileSync(subtasksPath, "utf8"));
  } catch {
    return false;
  }

  if (!Array.isArray(parsed)) {
    return false;
  }

  const inferredMilestoneRoot = getMilestoneRootFromPath(
    path.dirname(subtasksPath),
  );
  const inferredMilestonePath =
    inferredMilestoneRoot === path.dirname(subtasksPath)
      ? undefined
      : inferredMilestoneRoot;

  saveSubtasksFile(subtasksPath, {
    metadata:
      buildSubtasksMergeMetadata(inferredMilestonePath) ??
      ({ scope: "milestone" } as const),
    subtasks: parsed as Array<Subtask>,
  });

  return true;
}

function normalizeStoryReference(storyReference: string): string {
  const trimmed = storyReference.trim().replaceAll(/^['"]|['"]$/g, "");
  const withoutExtension = trimmed.endsWith(".md")
    ? trimmed.slice(0, -3)
    : trimmed;
  return path.basename(withoutExtension).toLowerCase();
}

function readQueueStateBeforeSubtasksRun(
  beforeCount: number,
  outputPath: string,
): { beforeQueueCount: number; beforeQueueRaw: null | string } {
  normalizeLegacySubtasksQueueIfNeeded(outputPath);

  const beforeQueueRaw = existsSync(outputPath)
    ? readFileSync(outputPath, "utf8")
    : null;
  if (beforeQueueRaw === null) {
    return { beforeQueueCount: beforeCount, beforeQueueRaw };
  }

  try {
    return {
      beforeQueueCount: loadSubtasksFile(outputPath).subtasks.length,
      beforeQueueRaw,
    };
  } catch (error) {
    console.error(formatErrorMessage(error));
    process.exit(1);
    throw new Error("unreachable");
  }
}

function renderSubtasksHeadlessStartBanner(options: {
  milestone: string | undefined;
  outputPath: string;
  provider: string | undefined;
  sizeMode: "large" | "medium" | "small";
}): void {
  const { milestone, outputPath, provider, sizeMode } = options;
  const bannerLines = [
    chalk.dim(`Queue: ${outputPath}`),
    chalk.dim(`Size: ${sizeMode}`),
    chalk.dim(`Provider: ${provider ?? "claude"}`),
  ];
  if (milestone !== undefined) {
    bannerLines.unshift(chalk.dim(`Milestone: ${milestone}`));
  }

  console.log();
  console.log(
    renderCommandBanner({
      lines: bannerLines,
      title: "RALPH PLAN SUBTASKS (HEADLESS)",
      tone: "info",
    }),
  );
  console.log();
  console.log(
    renderPhaseCard({
      domain: "PLAN",
      lines: [chalk.dim(`Queue path: ${outputPath}`)],
      state: "START",
      title: "Phase 1/4: starting generation",
    }),
  );
}

/**
 * Resolve milestone path from options or infer from story path
 *
 * @param milestoneOption - Explicit --milestone flag value
 * @param storyOption - Story path (to infer milestone from)
 * @param hasStory - Whether story flag is provided
 * @returns Resolved milestone path, or undefined if not determinable
 */
function resolveMilestoneFromOptions(
  milestoneOption: string | undefined,
  storyOption: string | undefined,
  outputDirectory?: string,
): null | string | undefined {
  if (milestoneOption !== undefined) {
    // Explicit milestone flag
    return resolveMilestonePath(milestoneOption);
  }
  if (storyOption !== undefined) {
    // Infer milestone from resolved story path
    const resolvedStory = resolveStoryPath(storyOption);
    if (resolvedStory !== null) {
      const match = /milestones\/(?<slug>[^/]+)\//.exec(resolvedStory);
      if (match?.groups?.slug !== undefined) {
        return resolveMilestonePath(match.groups.slug);
      }
    }
  }

  if (outputDirectory !== undefined) {
    const milestoneRoot = getMilestoneRootFromPath(outputDirectory);
    const slugFromOutputDirectory =
      /(?:^|[\\/])docs[\\/]planning[\\/]milestones[\\/](?<slug>[^\\/]+)/.exec(
        path.normalize(milestoneRoot),
      )?.groups?.slug;

    if (slugFromOutputDirectory !== undefined) {
      const resolvedFromOutputDirectory = resolveMilestonePath(
        slugFromOutputDirectory,
      );
      if (resolvedFromOutputDirectory !== null) {
        return resolvedFromOutputDirectory;
      }
    }
  }

  return undefined;
}

async function runReviewFlowForLevel(
  options: RunReviewFlowForLevelOptions,
): Promise<void> {
  const {
    contextRoot,
    isDryRun = false,
    isHeadless = false,
    level,
    milestonePath,
    model,
    provider,
    reviewStoryPath,
    subtasksPath,
  } = options;

  if (level === "stories") {
    if (milestonePath === null) {
      console.log(
        renderEventLine({
          domain: "CASCADE",
          message: "Skipping stories review flow (no milestone path available)",
          state: "SKIP",
        }),
      );
      return;
    }

    await runReviewWorkflow({
      contextRoot,
      extraContext: `Reviewing stories for milestone: ${milestonePath}`,
      isDryRun,
      isGapAnalysis: false,
      isHeadless,
      logMilestonePath: milestonePath,
      model,
      provider,
      reviewType: "stories",
      sessionName: "stories-review",
    });
    await runReviewWorkflow({
      contextRoot,
      extraContext: `Gap analysis of stories for milestone: ${milestonePath}`,
      isDryRun,
      isGapAnalysis: true,
      isHeadless,
      logMilestonePath: milestonePath,
      model,
      provider,
      reviewType: "stories",
      sessionName: "stories-gap",
    });
    return;
  }

  if (level === "tasks") {
    let storyPaths: Array<string> = [];
    if (reviewStoryPath !== undefined && reviewStoryPath !== "") {
      storyPaths = [reviewStoryPath];
    } else if (milestonePath !== null) {
      storyPaths = discoverStoriesForMilestone(milestonePath);
    }

    if (storyPaths.length === 0) {
      console.log(
        renderEventLine({
          domain: "CASCADE",
          message: "Skipping tasks review flow (no stories found)",
          state: "SKIP",
        }),
      );
      return;
    }

    await Promise.all(
      storyPaths.map(async (storyPath) => {
        const storyMilestoneRoot = getMilestoneRootFromPath(storyPath);
        await runReviewWorkflow({
          contextRoot,
          extraContext: `Reviewing tasks for story: ${storyPath}`,
          isDryRun,
          isGapAnalysis: false,
          isHeadless,
          logMilestonePath: storyMilestoneRoot,
          model,
          provider,
          reviewType: "tasks",
          sessionName: "tasks-review",
        });
        await runReviewWorkflow({
          contextRoot,
          extraContext: `Gap analysis of tasks for story: ${storyPath}`,
          isDryRun,
          isGapAnalysis: true,
          isHeadless,
          logMilestonePath: storyMilestoneRoot,
          model,
          provider,
          reviewType: "tasks",
          sessionName: "tasks-gap",
        });
      }),
    );
    return;
  }

  const resolvedSubtasksPath = path.resolve(subtasksPath);
  if (!existsSync(resolvedSubtasksPath)) {
    console.log(
      renderEventLine({
        domain: "CASCADE",
        message: `Skipping subtasks review flow (subtasks file not found: ${resolvedSubtasksPath})`,
        state: "SKIP",
      }),
    );
    return;
  }

  const subtasksMilestoneRoot = getMilestoneRootFromPath(
    path.dirname(resolvedSubtasksPath),
  );

  await runReviewWorkflow({
    contextRoot,
    extraContext: `Reviewing subtasks file: ${resolvedSubtasksPath}`,
    isDryRun,
    isGapAnalysis: false,
    isHeadless,
    logMilestonePath: subtasksMilestoneRoot,
    model,
    provider,
    reviewType: "subtasks",
    sessionName: "subtasks-review",
  });
  await runReviewWorkflow({
    contextRoot,
    extraContext: `Gap analysis of subtasks file: ${resolvedSubtasksPath}`,
    isDryRun,
    isGapAnalysis: true,
    isHeadless,
    logMilestonePath: subtasksMilestoneRoot,
    model,
    provider,
    reviewType: "subtasks",
    sessionName: "subtasks-gap",
  });
}

async function runReviewWorkflow(
  options: RunReviewWorkflowOptions,
): Promise<void> {
  const {
    contextRoot,
    extraContext,
    isDryRun = false,
    isGapAnalysis,
    isHeadless = false,
    logMilestonePath,
    model,
    provider,
    reviewType,
    sessionName,
  } = options;

  const promptPath = getReviewPromptPath(
    contextRoot,
    reviewType,
    isGapAnalysis,
  );
  const reviewLabel = isGapAnalysis
    ? `${reviewType} gap analysis`
    : `${reviewType} review`;
  const promptRelativePath = path.relative(contextRoot, promptPath);

  if (isDryRun) {
    console.log(
      renderEventLine({
        domain: "REVIEW",
        message: `[dry-run] Would run ${sessionName} (${promptRelativePath})`,
        state: "INFO",
      }),
    );
    return;
  }

  if (isHeadless) {
    const reviewModeLines = [
      chalk.dim(`Workflow: ${reviewLabel}`),
      chalk.dim(`Prompt: ${promptRelativePath}`),
      chalk.dim(`Provider: ${provider ?? "auto"}`),
      chalk.dim(`Model: ${model ?? "default"}`),
    ];
    console.log(
      renderPhaseCard({
        domain: "REVIEW",
        lines: reviewModeLines,
        state: "START",
        title: `Phase 1/2: starting ${sessionName}`,
      }),
    );

    const safeLogMilestonePath =
      logMilestonePath !== undefined &&
      existsSync(logMilestonePath) &&
      !statSync(logMilestonePath).isDirectory()
        ? undefined
        : logMilestonePath;
    const logFile = getPlanningLogPath(safeLogMilestonePath);
    await invokeClaudeHeadless({
      extraContext,
      logFile,
      model,
      promptPath,
      provider,
      sessionName,
    });
    console.log(
      renderEventLine({
        domain: "REVIEW",
        message: `Phase 2/2: completed ${sessionName}`,
        state: "DONE",
      }),
    );
    return;
  }

  console.log(
    renderEventLine({
      domain: "REVIEW",
      message: `Starting supervised ${sessionName} (${reviewLabel})`,
      state: "START",
    }),
  );
  await invokePlanningSupervised({
    extraContext,
    model,
    promptPath,
    provider,
    sessionName,
  });
  console.log(
    renderEventLine({
      domain: "REVIEW",
      message: `Completed supervised ${sessionName}`,
      state: "DONE",
    }),
  );
}

/**
 * Run subtasks generation in headless mode and render summary
 */
async function runSubtasksHeadless(
  options: RunSubtasksHeadlessOptions,
): Promise<void> {
  const {
    beforeCount,
    expectedFragmentCount,
    extraContext,
    milestone,
    model,
    outputDirectory: outputDirectoryOption,
    promptPath,
    provider,
    resolvedMilestonePath,
    sizeMode,
    skippedTasks,
    sourceInfo,
    storyRef,
  } = options;

  // Determine output path up front so we can verify deterministic queue outcomes.
  const resolvedOutputDirectory = resolveOutputDirectory(
    outputDirectoryOption,
    resolvedMilestonePath,
  );
  const outputPath = path.join(resolvedOutputDirectory, "subtasks.json");

  renderSubtasksHeadlessStartBanner({
    milestone,
    outputPath,
    provider,
    sizeMode,
  });

  const { beforeQueueCount, beforeQueueRaw } = readQueueStateBeforeSubtasksRun(
    beforeCount,
    outputPath,
  );

  const mergeMetadata = buildSubtasksMergeMetadata(resolvedMilestonePath);
  const fragmentMergeState: SubtaskFragmentMergeState = {
    fragmentMergeError: null,
    fragmentMergeResult: null,
    fragmentSignature: "",
    fragmentSignatureLastChangedAt: Date.now(),
    hasFragmentSignatureInitialized: false,
    shouldTerminateWatchdog: false,
  };

  console.log(
    renderEventLine({
      domain: "PLAN",
      message: "Phase 2/4: provider run in progress",
      state: "WAIT",
    }),
  );

  const result = await runSubtasksProviderPhase({
    beforeQueueRaw,
    expectedFragmentCount,
    extraContext,
    fragmentMergeState,
    mergeMetadata,
    model,
    outputPath,
    promptPath,
    provider,
    resolvedMilestonePath,
    resolvedOutputDirectory,
    sizeMode,
  });

  const loadResult = verifySubtasksQueueOutcome({
    beforeQueueRaw,
    fragmentMergeState,
    outputPath,
    providerResult: result,
  });

  console.log(
    renderEventLine({
      domain: "PLAN",
      message: `Phase 3/4: queue verified at ${outputPath}`,
      state: "DONE",
    }),
  );

  // Calculate counts for summary display (for --milestone and --story modes)
  const afterCount = loadResult.subtasks.length;
  const addedCount = afterCount - beforeQueueCount;
  const totalCount = afterCount;

  // Render summary
  console.log(
    renderPlanSubtasksSummary({
      addedCount,
      costUsd: result?.costUsd ?? 0,
      durationMs: result?.durationMs ?? 0,
      error: loadResult.error,
      milestone,
      outputPath,
      sessionId: result?.sessionId ?? "watchdog-fragment-merge",
      sizeMode,
      skippedTasks: skippedTasks.length > 0 ? skippedTasks : undefined,
      source: sourceInfo,
      storyRef,
      subtasks: loadResult.subtasks,
      totalCount,
    }),
  );
  console.log(
    renderEventLine({
      domain: "PLAN",
      message: "Phase 4/4: summary complete",
      state: "DONE",
    }),
  );
}

async function runSubtasksProviderPhase(options: {
  beforeQueueRaw: null | string;
  expectedFragmentCount?: number;
  extraContext: string;
  fragmentMergeState: SubtaskFragmentMergeState;
  mergeMetadata: { milestoneRef?: string; scope: "milestone" } | undefined;
  model?: string;
  outputPath: string;
  promptPath: string;
  provider?: string;
  resolvedMilestonePath: null | string | undefined;
  resolvedOutputDirectory: string;
  sizeMode: "large" | "medium" | "small";
}): Promise<HeadlessWithLoggingResult | null> {
  const {
    beforeQueueRaw,
    expectedFragmentCount,
    extraContext,
    fragmentMergeState,
    mergeMetadata,
    model,
    outputPath,
    promptPath,
    provider,
    resolvedMilestonePath,
    resolvedOutputDirectory,
    sizeMode,
  } = options;

  const fragmentWatchdogTimer = setInterval(() => {
    tryMergeSubtaskFragments({
      beforeQueueRaw,
      expectedFragmentCount,
      mergeMetadata,
      outputPath,
      resolvedOutputDirectory,
      shouldRequireStableWindow: true,
      state: fragmentMergeState,
      trigger: "watchdog",
    });
  }, SUBTASK_FRAGMENT_POLL_INTERVAL_MS);
  stopWatchdogTimerIfPossible(fragmentWatchdogTimer);

  const logFile = getPlanningLogPath(resolvedMilestonePath ?? undefined);
  const result = await (async () => {
    try {
      return await invokeClaudeHeadless({
        extraContext,
        logFile,
        model,
        promptPath,
        provider,
        sessionName: "subtasks",
        shouldAllowNullResult: true,
        sizeMode,
        stallTimeoutMinutes: 0,
        watchdogCheckIntervalMs: SUBTASK_FRAGMENT_POLL_INTERVAL_MS,
        watchdogReason:
          "Subtasks watchdog detected complete fragment output; stopping provider and continuing with merged queue.",
        watchdogShouldTerminate: () =>
          fragmentMergeState.shouldTerminateWatchdog,
      });
    } finally {
      clearInterval(fragmentWatchdogTimer);
    }
  })();

  // Backstop merge after provider completion (or null payload) before verification.
  tryMergeSubtaskFragments({
    beforeQueueRaw,
    expectedFragmentCount,
    mergeMetadata,
    outputPath,
    resolvedOutputDirectory,
    shouldRequireStableWindow: false,
    state: fragmentMergeState,
    trigger: "post-run-fallback",
  });

  console.log(
    renderEventLine({
      domain: "PLAN",
      message:
        result === null
          ? "Phase 2/4: provider run ended without payload, verifying merged queue"
          : "Phase 2/4: provider run complete, verifying queue",
      state: "DONE",
    }),
  );

  return result;
}

/**
 * Execute tasks planning in milestone mode
 *
 * @returns Resolved milestone path
 */
async function runTasksMilestoneMode(
  options: TasksMilestoneOptions,
): Promise<string> {
  const { contextRoot, isAutoMode, isHeadless, milestone, model, provider } =
    options;

  if (!isAutoMode) {
    console.error(
      "Error: --milestone requires --supervised or --headless mode",
    );
    console.log(
      "\nUsage: aaa ralph plan tasks --milestone <path> --supervised",
    );
    process.exit(1);
  }

  const milestonePath = requireMilestone(milestone);
  const promptPath = path.join(
    contextRoot,
    "context/workflows/ralph/planning/tasks-milestone.md",
  );
  const extraContext = `Generating tasks for all stories in milestone: ${milestonePath}`;

  if (isHeadless) {
    const logFile = getPlanningLogPath(milestonePath);
    await invokeClaudeHeadless({
      extraContext,
      logFile,
      model,
      promptPath,
      provider,
      sessionName: "tasks-milestone",
    });
  } else {
    await invokePlanningSupervised({
      extraContext,
      model,
      promptPath,
      provider,
      sessionName: "tasks-milestone",
    });
  }

  return milestonePath;
}

/**
 * Execute tasks planning from file or text source
 */
async function runTasksSourceMode(options: TasksSourceOptions): Promise<void> {
  const {
    contextRoot,
    file,
    hasFile,
    isHeadless,
    isSupervised,
    model,
    provider,
    text,
  } = options;

  const promptPath = path.join(
    contextRoot,
    "context/workflows/ralph/planning/tasks-from-source.md",
  );

  const extraContext =
    hasFile && file !== undefined
      ? `Generating tasks from file: ${file}`
      : `Generating tasks from description: ${text}`;

  if (isHeadless) {
    const logFile = getPlanningLogPath();
    await invokeClaudeHeadless({
      extraContext,
      logFile,
      model,
      promptPath,
      provider,
      sessionName: "tasks-source",
    });
  } else if (isSupervised) {
    await invokePlanningSupervised({
      extraContext,
      model,
      promptPath,
      provider,
      sessionName: "tasks-source",
    });
  } else {
    const resolvedProvider = await resolvePlanningProvider(provider);
    if (resolvedProvider === "claude") {
      invokeClaude(promptPath, "tasks-source", { extraContext, model });
    } else {
      await invokePlanningSupervised({
        extraContext,
        model,
        promptPath,
        provider,
        sessionName: "tasks-source",
      });
    }
  }
}

/**
 * Execute tasks planning in story mode
 *
 * @returns Resolved milestone path if story is in a milestone, null otherwise
 */
async function runTasksStoryMode(
  options: TasksStoryOptions,
): Promise<null | string> {
  const {
    contextRoot,
    isAutoMode,
    isHeadless,
    isSupervised,
    model,
    provider,
    story,
  } = options;

  const storyPath = requireStory(story);

  // Try to extract milestone from story path
  const milestoneMatch = /milestones\/(?<slug>[^/]+)\//.exec(storyPath);
  const resolvedMilestonePath =
    milestoneMatch?.groups?.slug === undefined
      ? null
      : resolveMilestonePath(milestoneMatch.groups.slug);

  const promptPath = getPromptPath(contextRoot, "tasks", isAutoMode);
  const extraContext = `Planning tasks for story: ${storyPath}`;

  if (isHeadless) {
    const logFile = getPlanningLogPath(resolvedMilestonePath ?? undefined);
    await invokeClaudeHeadless({
      extraContext,
      logFile,
      model,
      promptPath,
      provider,
      sessionName: "tasks",
    });
  } else if (isSupervised) {
    await invokePlanningSupervised({
      extraContext,
      model,
      promptPath,
      provider,
      sessionName: "tasks",
    });
  } else {
    invokeClaude(promptPath, "tasks", { extraContext, model });
  }

  return resolvedMilestonePath;
}

function stopWatchdogTimerIfPossible(
  timer: ReturnType<typeof setInterval>,
): void {
  const maybeWatchdogTimer = timer as unknown as { unref?: () => void };
  if (typeof maybeWatchdogTimer.unref === "function") {
    maybeWatchdogTimer.unref();
  }
}

function toPlanCascadeTarget(
  value: string | undefined,
): ReturnType<typeof toPlanFromLevel> {
  return toPlanFromLevel(value);
}

function toPlanFromLevel(
  value: string | undefined,
):
  | "build"
  | "calibrate"
  | "roadmap"
  | "stories"
  | "subtasks"
  | "tasks"
  | undefined {
  if (
    value === "roadmap" ||
    value === "stories" ||
    value === "tasks" ||
    value === "subtasks" ||
    value === "build" ||
    value === "calibrate"
  ) {
    return value;
  }
  return undefined;
}

function tryMergeSubtaskFragments(options: {
  beforeQueueRaw: null | string;
  expectedFragmentCount?: number;
  mergeMetadata: { milestoneRef?: string; scope: "milestone" } | undefined;
  outputPath: string;
  resolvedOutputDirectory: string;
  shouldRequireStableWindow: boolean;
  state: SubtaskFragmentMergeState;
  trigger: "post-run-fallback" | "watchdog";
}): void {
  const {
    beforeQueueRaw,
    expectedFragmentCount,
    mergeMetadata,
    outputPath,
    resolvedOutputDirectory,
    shouldRequireStableWindow,
    state,
    trigger,
  } = options;

  if (state.fragmentMergeResult !== null) {
    return;
  }

  const queueRawNow = existsSync(outputPath)
    ? readFileSync(outputPath, "utf8")
    : null;
  if (queueRawNow !== null && queueRawNow !== beforeQueueRaw) {
    try {
      loadSubtasksFile(outputPath);
      state.shouldTerminateWatchdog = true;
    } catch {
      // Ignore transient invalid states while writer is still flushing.
    }
    return;
  }

  const snapshot = buildSubtaskFragmentSnapshot(resolvedOutputDirectory);
  if (snapshot.count === 0) {
    return;
  }

  const now = Date.now();
  if (!state.hasFragmentSignatureInitialized) {
    state.fragmentSignature = snapshot.signature;
    state.hasFragmentSignatureInitialized = true;
    state.fragmentSignatureLastChangedAt = now;
  } else if (snapshot.signature !== state.fragmentSignature) {
    state.fragmentSignature = snapshot.signature;
    state.fragmentSignatureLastChangedAt = now;
  }

  const hasExpectedFragments =
    expectedFragmentCount === undefined ||
    expectedFragmentCount <= 0 ||
    snapshot.count >= expectedFragmentCount;

  const stableForMs = now - state.fragmentSignatureLastChangedAt;
  const isStable =
    !shouldRequireStableWindow ||
    stableForMs >= SUBTASK_FRAGMENT_STABLE_WINDOW_MS;

  if (!hasExpectedFragments || !isStable) {
    return;
  }

  try {
    state.fragmentMergeResult = mergeSubtaskFragments(
      resolvedOutputDirectory,
      outputPath,
      mergeMetadata,
    );
    if (state.fragmentMergeResult.fragments > 0) {
      state.shouldTerminateWatchdog = true;
      console.log(
        renderEventLine({
          domain: "PLAN",
          message:
            `Merged ${state.fragmentMergeResult.merged} subtasks from ` +
            `${state.fragmentMergeResult.fragments} fragment files into ${outputPath} (${trigger})`,
          state: "DONE",
        }),
      );
    }
  } catch (error) {
    state.fragmentMergeError = formatErrorMessage(error);
    console.error(
      renderEventLine({
        domain: "PLAN",
        message: `Fragment merge failed (${trigger}): ${state.fragmentMergeError}`,
        state: "FAIL",
      }),
    );
  }
}

function validateSubtasksCascadeOption(
  cascadeTarget: string | undefined,
  fromLevel: string | undefined,
): void {
  if (cascadeTarget === undefined) {
    return;
  }

  const cascadeStartLevel = getSubtasksCascadeFromLevel(fromLevel);
  const validationError = validateCascadeTarget(
    cascadeStartLevel,
    cascadeTarget,
  );
  if (validationError !== null) {
    console.error(`Error: ${validationError}`);
    process.exit(1);
  }
}

function validateSubtasksSourceSelection(options: {
  hasMilestone: boolean;
  hasOutputDirectory: boolean;
  sourceCount: number;
}): void {
  const { hasMilestone, hasOutputDirectory, sourceCount } = options;
  if (sourceCount === 0) {
    exitWithSubtasksSourceError();
  }
  if (sourceCount > 1) {
    console.error(
      "Error: Cannot combine multiple sources. Provide exactly one of: --milestone, --story, --task, --file, --text, --review-diary",
    );
    process.exit(1);
  }

  if (hasMilestone && hasOutputDirectory) {
    console.error(
      "Error: --milestone and --output-dir are mutually exclusive.",
    );
    console.error(
      "Use --milestone for both source and output, or use --file/--text with --output-dir",
    );
    process.exit(1);
  }
}

function validateTasksCascadeOptionsOrExit(options: {
  cascadeTarget?: string;
  fromLevel?: string;
  hasMilestone: boolean;
  hasStory: boolean;
}): void {
  const { cascadeTarget, fromLevel, hasMilestone, hasStory } = options;
  if (cascadeTarget === undefined) {
    return;
  }

  const cascadeStartLevel = fromLevel ?? "tasks";
  const validationError = validateCascadeTarget(
    cascadeStartLevel,
    cascadeTarget,
  );
  if (validationError !== null) {
    console.error(`Error: ${validationError}`);
    process.exit(1);
  }

  const cascadeLevels = getLevelsInRange(cascadeStartLevel, cascadeTarget);
  const planningLevelsInPath = cascadeLevels.filter(
    (level) => level === "subtasks" || level === "tasks",
  );

  if (planningLevelsInPath.length > 0 && !hasMilestone && !hasStory) {
    const planningList = planningLevelsInPath.join(", ");
    console.error(
      `Error: Cascading through planning levels (${planningList}) requires --milestone or --story source for 'ralph plan tasks'.`,
    );
    process.exit(1);
  }
}

function validateTasksSourceSelection(sourceCount: number): void {
  if (sourceCount === 0) {
    exitWithTasksSourceError();
  }
  if (sourceCount > 1) {
    console.error(
      "Error: Cannot combine multiple sources. Provide exactly one of: --story, --milestone, --file, --text",
    );
    process.exit(1);
  }
}

function validateWithReviewsOrExit(
  fromLevel: string,
  cascadeTarget: string | undefined,
  isWithReviews: boolean,
): void {
  if (!isWithReviews) {
    return;
  }

  if (cascadeTarget === undefined) {
    console.error("Error: --with-reviews requires --cascade.");
    process.exit(1);
  }

  if (!hasBuildInCascadePath(fromLevel, cascadeTarget)) {
    console.error(
      "Error: --with-reviews requires a cascade path that includes build (e.g. --cascade build or --cascade calibrate).",
    );
    process.exit(1);
  }
}

function verifySubtasksQueueOutcome(options: {
  beforeQueueRaw: null | string;
  fragmentMergeState: SubtaskFragmentMergeState;
  outputPath: string;
  providerResult: HeadlessWithLoggingResult | null;
}): { error?: string; subtasks: Array<{ id: string; title: string }> } {
  const { beforeQueueRaw, fragmentMergeState, outputPath, providerResult } =
    options;
  const loadResult = getSubtasksLoadResult(outputPath);

  const afterQueueRaw = existsSync(outputPath)
    ? readFileSync(outputPath, "utf8")
    : null;
  const didMergeFromFragments =
    (fragmentMergeState.fragmentMergeResult?.fragments ?? 0) > 0;
  const hasObservableQueueOutcome =
    loadResult.error === undefined &&
    afterQueueRaw !== null &&
    (afterQueueRaw !== beforeQueueRaw || didMergeFromFragments);

  if (!hasObservableQueueOutcome) {
    exitWithSubtasksQueueOutcomeFailure({
      fragmentMergeError: fragmentMergeState.fragmentMergeError,
      loadResult,
      outputPath,
      providerResult,
    });
  }

  return loadResult;
}

// ralph plan vision - interactive vision planning
planCommand.addCommand(
  new Command("vision")
    .description(
      "Start interactive vision planning session using Socratic method",
    )
    .option(
      "--provider <name>",
      "AI provider to use for planning (default: claude)",
    )
    .option("--model <name>", "Model to use for planning invocation")
    .action(async (options) => {
      const contextRoot = getContextRoot();
      const promptPath = path.join(
        contextRoot,
        "context/workflows/ralph/planning/vision-interactive.md",
      );

      await invokePlanningSupervised({
        model: options.model,
        promptPath,
        provider: options.provider,
        sessionName: "vision",
      });
    }),
);

// ralph plan roadmap - interactive roadmap planning
planCommand.addCommand(
  new Command("roadmap")
    .description("Start interactive roadmap planning session")
    .option("--force", "Skip all approval prompts")
    .option("--review", "Require all approval prompts")
    .option("--from <level>", "Resume cascade from this level")
    .option(
      "--provider <name>",
      "AI provider to use for planning (default: claude)",
    )
    .option("--model <name>", "Model to use for planning invocation")
    .option(
      "--dry-run",
      "Preview execution plan without running (exits after showing pipeline diagram)",
    )
    .option(
      "--cascade <target>",
      "Continue to target level after completion (validated against executable cascade levels)",
    )
    .action(async (options) => {
      validateApprovalFlags(options.force, options.review);

      if (options.cascade !== undefined) {
        const validationError = validateCascadeTarget(
          options.from ?? "roadmap",
          options.cascade,
        );
        if (validationError !== null) {
          console.error(`Error: ${validationError}`);
          process.exit(1);
        }
      }

      if (options.dryRun === true) {
        const plan = computeExecutionPlan({
          cascadeTarget: toPlanCascadeTarget(options.cascade),
          command: "plan-roadmap",
          flags: {
            force: options.force === true,
            review: options.review === true,
          },
          fromLevel: toPlanFromLevel(options.from),
          includeEntryInCascade: options.cascade !== undefined,
          model: options.model,
          provider: options.provider,
        });
        printDryRunPlan(plan);
        process.exit(0);
      }

      const contextRoot = getContextRoot();
      const promptPath = path.join(
        contextRoot,
        "context/workflows/ralph/planning/roadmap-interactive.md",
      );
      const planningModel = options.model;
      const planningProvider = options.provider;

      await invokePlanningSupervised({
        model: planningModel,
        promptPath,
        provider: planningProvider,
        sessionName: "roadmap",
      });

      // Handle cascade if requested
      if (options.cascade !== undefined) {
        await handleCascadeExecution({
          cascadeTarget: options.cascade,
          contextRoot,
          forceFlag: options.force === true,
          fromLevel: options.from ?? "roadmap",
          model: planningModel,
          provider: planningProvider as ProviderType,
          resolvedMilestonePath: null,
          reviewFlag: options.review === true,
          subtasksPath: path.join(contextRoot, "subtasks.json"),
        });
      }
    }),
);

// ralph plan stories - story planning (requires milestone)
planCommand.addCommand(
  new Command("stories")
    .description("Plan stories for a milestone")
    .requiredOption(
      "--milestone <path>",
      "Milestone file path to plan stories for",
    )
    .option("-s, --supervised", "Supervised mode: watch chat, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option("--force", "Skip all approval prompts")
    .option("--review", "Require all approval prompts")
    .option("--from <level>", "Resume cascade from this level")
    .option(
      "--provider <name>",
      "AI provider to use for planning (default: claude)",
    )
    .option("--model <name>", "Model to use for planning invocation")
    .option(
      "--with-reviews",
      "Run stories/tasks/subtasks review + gap checks before cascading into build",
    )
    .option(
      "--dry-run",
      "Preview execution plan without running (exits after showing pipeline diagram)",
    )
    .option(
      "--cascade <target>",
      "Continue to target level after completion (validated against executable cascade levels)",
    )
    .action(async (options) => {
      validateApprovalFlags(options.force, options.review);

      if (options.cascade !== undefined) {
        const validationError = validateCascadeTarget(
          options.from ?? "stories",
          options.cascade,
        );
        if (validationError !== null) {
          console.error(`Error: ${validationError}`);
          process.exit(1);
        }
      }
      validateWithReviewsOrExit(
        options.from ?? "stories",
        options.cascade,
        options.withReviews === true,
      );

      if (options.dryRun === true) {
        const plan = computeExecutionPlan({
          cascadeTarget: toPlanCascadeTarget(options.cascade),
          command: "plan-stories",
          flags: {
            force: options.force === true,
            headless: options.headless === true,
            review: options.review === true,
          },
          fromLevel: toPlanFromLevel(options.from),
          includeEntryInCascade: options.cascade !== undefined,
          milestonePath: options.milestone,
          model: options.model,
          provider: options.provider,
        });
        printDryRunPlan(plan);
        process.exit(0);
      }

      const contextRoot = getContextRoot();
      const milestonePath = requireMilestone(options.milestone);

      // Determine if using auto prompt (non-interactive generation)
      const isAutoMode =
        options.supervised === true || options.headless === true;
      const promptPath = getPromptPath(contextRoot, "stories", isAutoMode);
      const extraContext = `Planning stories for milestone: ${milestonePath}`;
      const planningModel = options.model;
      const planningProvider = options.provider;

      // Determine execution mode
      if (options.headless === true) {
        const logFile = getPlanningLogPath(milestonePath);
        await invokeClaudeHeadless({
          extraContext,
          logFile,
          model: planningModel,
          promptPath,
          provider: planningProvider,
          sessionName: "stories",
        });
      } else if (options.supervised === true) {
        // Supervised mode: user watches chat
        await invokePlanningSupervised({
          extraContext,
          model: planningModel,
          promptPath,
          provider: planningProvider,
          sessionName: "stories",
        });
      } else {
        // Interactive mode (default): full interactive session
        const resolvedProvider =
          await resolvePlanningProvider(planningProvider);
        if (resolvedProvider === "claude") {
          invokeClaude(promptPath, "stories", {
            extraContext,
            model: planningModel,
          });
        } else {
          await invokePlanningSupervised({
            extraContext,
            model: planningModel,
            promptPath,
            provider: planningProvider,
            sessionName: "stories",
          });
        }
      }

      // Handle cascade if requested
      if (options.cascade !== undefined) {
        await handleCascadeExecution({
          cascadeTarget: options.cascade,
          contextRoot,
          forceFlag: options.force === true,
          fromLevel: options.from ?? "stories",
          headless: options.headless === true,
          isWithReviews: options.withReviews === true,
          model: planningModel,
          provider: planningProvider as ProviderType,
          resolvedMilestonePath: milestonePath,
          reviewFlag: options.review === true,
        });
      }
    }),
);

// ralph plan tasks - task planning from hierarchy (--story, --milestone) or alternative sources (--file, --text)
planCommand.addCommand(
  new Command("tasks")
    .description(
      "Plan tasks from hierarchy (--story, --milestone) or alternative sources (--file, --text)",
    )
    .option("--story <path>", "Story file path to plan tasks for")
    .option(
      "--milestone <path>",
      "Milestone path to plan tasks for (all stories)",
    )
    .option("--file <path>", "File path as source for task generation")
    .option("--text <string>", "Text description as source for task generation")
    .option("-s, --supervised", "Supervised mode: watch chat, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option("--force", "Skip all approval prompts")
    .option("--review", "Require all approval prompts")
    .option("--from <level>", "Resume cascade from this level")
    .option(
      "--provider <name>",
      "AI provider to use for planning (default: claude)",
    )
    .option("--model <name>", "Model to use for planning invocation")
    .option(
      "--with-reviews",
      "Run stories/tasks/subtasks review + gap checks before cascading into build",
    )
    .option(
      "--cascade <target>",
      "Continue to target level after completion (validated against executable cascade levels)",
    )
    .option(
      "--dry-run",
      "Preview execution plan without running (exits after showing pipeline diagram)",
    )
    .action(async (options) => {
      validateApprovalFlags(options.force, options.review);

      const hasStory = options.story !== undefined;
      const hasMilestone = options.milestone !== undefined;
      const hasFile = options.file !== undefined;
      const hasText = options.text !== undefined;
      const resolvedStoryPath =
        hasStory && options.story !== undefined
          ? requireStory(options.story)
          : undefined;

      // Validate: require exactly one source
      const sourceCount = [hasStory, hasMilestone, hasFile, hasText].filter(
        Boolean,
      ).length;
      validateTasksSourceSelection(sourceCount);
      validateTasksCascadeOptionsOrExit({
        cascadeTarget: options.cascade,
        fromLevel: options.from,
        hasMilestone,
        hasStory,
      });
      validateWithReviewsOrExit(
        options.from ?? "tasks",
        options.cascade,
        options.withReviews === true,
      );

      if (options.dryRun === true) {
        const milestonePath = resolveMilestoneFromOptions(
          options.milestone,
          options.story,
        );
        const plan = computeExecutionPlan({
          cascadeTarget: toPlanCascadeTarget(options.cascade),
          command: "plan-tasks",
          flags: {
            force: options.force === true,
            headless: options.headless === true,
            review: options.review === true,
          },
          fromLevel: toPlanFromLevel(options.from),
          includeEntryInCascade: true,
          milestonePath: milestonePath ?? undefined,
          model: options.model,
          provider: options.provider,
        });
        printDryRunPlan(plan);
        process.exit(0);
      }

      if (options.cascade !== undefined) {
        const milestonePath = resolveMilestoneFromOptions(
          options.milestone,
          options.story,
        );
        const plan = computeExecutionPlan({
          cascadeTarget: toPlanCascadeTarget(options.cascade),
          command: "plan-tasks",
          flags: {
            force: options.force === true,
            headless: options.headless === true,
            review: options.review === true,
          },
          fromLevel: toPlanFromLevel(options.from),
          includeEntryInCascade: true,
          milestonePath: milestonePath ?? undefined,
          model: options.model,
          provider: options.provider,
        });
        console.log(
          renderEventLine({
            domain: "CASCADE",
            message: "Workflow preview",
            state: "INFO",
          }),
        );
        printDryRunPlan(plan, { nextStep: "continue" });
      }

      const contextRoot = getContextRoot();
      const isAutoMode =
        options.supervised === true || options.headless === true;

      // Track resolved milestone path for cascade
      let resolvedMilestonePath: null | string = null;

      // Execute based on source type
      if (hasMilestone && options.milestone !== undefined) {
        resolvedMilestonePath = await runTasksMilestoneMode({
          contextRoot,
          isAutoMode,
          isHeadless: options.headless === true,
          milestone: options.milestone,
          model: options.model,
          provider: options.provider,
        });
      } else if (hasStory && options.story !== undefined) {
        resolvedMilestonePath = await runTasksStoryMode({
          contextRoot,
          isAutoMode,
          isHeadless: options.headless === true,
          isSupervised: options.supervised === true,
          model: options.model,
          provider: options.provider,
          story: resolvedStoryPath ?? options.story,
        });
      } else {
        await runTasksSourceMode({
          contextRoot,
          file: options.file,
          hasFile,
          isHeadless: options.headless === true,
          isSupervised: options.supervised === true,
          model: options.model,
          provider: options.provider,
          text: options.text,
        });
      }

      // Handle cascade if requested
      if (options.cascade !== undefined) {
        await handleCascadeExecution({
          cascadeTarget: options.cascade,
          contextRoot,
          forceFlag: options.force === true,
          fromLevel: options.from ?? "tasks",
          headless: options.headless === true,
          isWithReviews: options.withReviews === true,
          model: options.model,
          provider: options.provider as ProviderType,
          resolvedMilestonePath,
          reviewFlag: options.review === true,
          reviewStoryPath: resolvedStoryPath,
        });
      }
    }),
);

// ralph plan subtasks - subtask generation from any source
// Accepts: hierarchy flags (--milestone, --story, --task) or alternative sources (--file, --text, --review-diary)
planCommand.addCommand(
  new Command("subtasks")
    .description(
      "Generate subtasks from hierarchy (--milestone, --story, --task) or alternative sources (--file, --text, --review-diary)",
    )
    .option("--file <path>", "File path as source")
    .option("--text <string>", "Text description as source")
    .option("--review-diary", "Parse logs/reviews.jsonl for findings")
    .option("--task <path>", "Task file path as source")
    .option(
      "--story <path>",
      "Story path - generate subtasks for all tasks in story",
    )
    .option(
      "--milestone <name>",
      "Milestone name - generate subtasks for all tasks in milestone",
    )
    .option(
      "--output-dir <path>",
      "Output directory (path or milestone name) - use with --file/--text",
    )
    .option(
      "--size <mode>",
      "Slice thickness: small (thinnest viable), medium (one PR per subtask, default), large (major boundaries only)",
      "medium",
    )
    .option(
      "-s, --supervised",
      "Supervised mode: watch chat, can intervene (default)",
    )
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option("--force", "Skip all approval prompts")
    .option("--review", "Require all approval prompts")
    .option("--from <level>", "Resume cascade from this level")
    .option(
      "--with-reviews",
      "Run stories/tasks/subtasks review + gap checks before cascading into build",
    )
    .option(
      "--cascade <target>",
      "Continue to target level after completion (build, calibrate)",
    )
    .option(
      "--calibrate-every <n>",
      "Run calibration every N build iterations during cascade (0 = disabled)",
      "0",
    )
    .option(
      "--validate-first",
      "Run pre-build validation when cascading to build/calibrate",
    )
    .option(
      "--provider <name>",
      "AI provider to use for planning (default: claude)",
    )
    .option("--model <name>", "Model to use for planning invocation")
    .option(
      "--dry-run",
      "Preview execution plan without running (exits after showing pipeline diagram)",
    )
    // eslint-disable-next-line complexity -- Supports multiple source selectors plus precheck/cascade branches.
    .action(async (options) => {
      validateApprovalFlags(options.force, options.review);

      const hasFile = options.file !== undefined;
      const hasText = options.text !== undefined;
      const hasReviewDiary = options.reviewDiary === true;
      const hasTask = options.task !== undefined;
      const hasStory = options.story !== undefined;
      const hasMilestone = options.milestone !== undefined;
      const hasOutputDirectory = options.outputDir !== undefined;

      // Validate: require exactly one source
      const sourceCount = [
        hasFile,
        hasText,
        hasReviewDiary,
        hasTask,
        hasStory,
        hasMilestone,
      ].filter(Boolean).length;

      validateSubtasksSourceSelection({
        hasMilestone,
        hasOutputDirectory,
        sourceCount,
      });
      validateSubtasksCascadeOption(options.cascade, options.from);
      validateWithReviewsOrExit(
        getSubtasksCascadeFromLevel(options.from),
        options.cascade,
        options.withReviews === true,
      );

      if (options.dryRun === true) {
        const resolvedMilestonePath = resolveMilestoneFromOptions(
          options.milestone,
          options.story,
          options.outputDir,
        );
        const resolvedOutputDirectory = resolveOutputDirectory(
          options.outputDir,
          resolvedMilestonePath,
        );
        const plan = computeExecutionPlan({
          cascadeTarget: toPlanCascadeTarget(options.cascade),
          command: "plan-subtasks",
          flags: {
            calibrateEvery: Number.parseInt(options.calibrateEvery, 10),
            force: options.force === true,
            headless: options.headless === true,
            review: options.review === true,
            validateFirst: options.validateFirst === true,
          },
          fromLevel: toPlanFromLevel(getSubtasksCascadeFromLevel(options.from)),
          includeEntryInCascade: options.cascade !== undefined,
          milestonePath: resolvedMilestonePath ?? undefined,
          model: options.model,
          provider: options.provider,
          subtasksPath: path.join(resolvedOutputDirectory, "subtasks.json"),
        });
        printDryRunPlan(plan);
        process.exit(0);
      }

      const contextRoot = getContextRoot();
      const resolvedStoryPath =
        hasStory && options.story !== undefined
          ? requireStory(options.story)
          : undefined;

      // Pre-check for --task mode: skip if task already has subtasks
      if (hasTask && options.task !== undefined) {
        const taskPath = requireTask(options.task);
        let hasExistingSubtasks = false;
        try {
          hasExistingSubtasks = checkTaskHasSubtasks(
            taskPath,
            options.outputDir,
          );
        } catch (error) {
          console.error(formatErrorMessage(error));
          process.exit(1);
        }

        if (hasExistingSubtasks) {
          const taskReference = extractTaskReference(taskPath);
          console.log(`Task ${taskReference} already has subtasks - skipping`);
          return;
        }
      }

      // Determine which prompt to use based on source type
      // - Hierarchy sources (--milestone, --story) use subtasks-from-hierarchy.md
      // - Task source uses subtasks-auto.md (legacy)
      // - Alternative sources (--file, --text, --review-diary) use subtasks-from-source.md
      // Create flags object for helper functions
      const sourceFlags: SubtasksSourceFlags = {
        hasFile,
        hasMilestone,
        hasReview: hasReviewDiary,
        hasStory,
        hasTask,
        hasText,
      };

      const promptPath = getSubtasksPromptPath(contextRoot, sourceFlags);

      // Resolve milestone path - from explicit --milestone flag or inferred from story path
      // This is used for log file location and to determine output directory for subtasks.json
      const resolvedMilestonePath = resolveMilestoneFromOptions(
        options.milestone,
        resolvedStoryPath ?? options.story,
        options.outputDir,
      );

      // Pre-check for --milestone and --story modes: filter tasks that already have subtasks
      // Track skipped tasks and counts for summary display
      let skippedTasks: Array<string> = [];
      let beforeCount = 0;
      let expectedFragmentCount: null | number = null;

      if (
        (hasMilestone || hasStory) &&
        resolvedMilestonePath !== undefined &&
        resolvedMilestonePath !== null
      ) {
        const outputDirectory = resolveOutputDirectory(
          options.outputDir,
          resolvedMilestonePath,
        );
        const preCheckResult = (() => {
          try {
            return checkSubtasksPreCheck({
              milestonePath: resolvedMilestonePath,
              outputDirectory,
              storyPath: hasStory ? resolvedStoryPath : undefined,
            });
          } catch (error) {
            console.error(formatErrorMessage(error));
            process.exit(1);
            throw new Error("unreachable");
          }
        })();

        if (
          hasStory &&
          resolvedStoryPath !== undefined &&
          preCheckResult.totalTasks === 0
        ) {
          const storyReference = path.basename(resolvedStoryPath, ".md");
          console.error(
            `Error: No tasks linked to story '${storyReference}' in milestone '${path.basename(resolvedMilestonePath)}'.`,
          );
          console.error(
            `Scanned ${preCheckResult.totalDiscoveredTasks} task file(s) in ${path.join(resolvedMilestonePath, "tasks")}.`,
          );
          console.error(
            "Link tasks with a matching story reference (`**Story:** [<story-ref>](...)` or `storyRef: <story-ref>`), then rerun.",
          );
          process.exit(1);
        }

        ({ beforeCount } = preCheckResult);
        ({ skippedTasks } = preCheckResult);
        expectedFragmentCount =
          preCheckResult.totalTasks - preCheckResult.skippedTasks.length;

        // If all tasks already have subtasks, exit cleanly
        if (preCheckResult.shouldSkip) {
          console.log(
            `All ${preCheckResult.totalTasks} tasks already have subtasks - nothing to generate`,
          );
          return;
        }

        // If some tasks have subtasks, log info about filtering
        if (skippedTasks.length > 0) {
          const remainingCount =
            preCheckResult.totalTasks - skippedTasks.length;
          console.log(
            `Pre-check: ${skippedTasks.length} tasks already have subtasks, ${remainingCount} to process`,
          );
        }
      }

      // Build source context and info using helper
      const { contextParts, sourceInfo } = buildSubtasksSourceContext(
        sourceFlags,
        {
          file: options.file,
          milestone: options.milestone,
          resolvedMilestonePath,
          story: resolvedStoryPath ?? options.story,
          task: options.task,
          text: options.text,
        },
      );

      // Add sizing mode context
      const sizeMode = options.size as "large" | "medium" | "small";
      contextParts.push(`Sizing mode: ${sizeMode}`);
      contextParts.push(
        `Sizing guidance: ${getSubtasksSizeGuidance(sizeMode)}`,
      );

      // Add output directory to context if specified
      if (hasOutputDirectory) {
        const resolvedOutput = resolveOutputDirectory(options.outputDir, null);
        contextParts.push(`Output directory: ${resolvedOutput}`);
      }

      const extraContext = contextParts.join("\n");

      await (options.headless === true
        ? runSubtasksHeadless({
            beforeCount,
            expectedFragmentCount: expectedFragmentCount ?? undefined,
            extraContext,
            milestone: options.milestone,
            model: options.model,
            outputDirectory: options.outputDir,
            promptPath,
            provider: options.provider,
            resolvedMilestonePath,
            sizeMode,
            skippedTasks,
            sourceInfo,
            storyRef: resolvedStoryPath ?? options.story,
          })
        : invokePlanningSupervised({
            extraContext,
            model: options.model,
            promptPath,
            provider: options.provider,
            sessionName: "subtasks",
          }));

      // Handle cascade if requested
      if (options.cascade !== undefined) {
        // Determine subtasks path for cascade
        const resolvedOutputDirectory = resolveOutputDirectory(
          options.outputDir,
          resolvedMilestonePath,
        );
        const subtasksPath = path.join(
          resolvedOutputDirectory,
          "subtasks.json",
        );

        await handleCascadeExecution({
          calibrateEvery: Number.parseInt(options.calibrateEvery, 10),
          cascadeTarget: options.cascade,
          contextRoot,
          forceFlag: options.force === true,
          fromLevel: getSubtasksCascadeFromLevel(options.from),
          headless: options.headless === true,
          isWithReviews: options.withReviews === true,
          model: options.model,
          provider: options.provider as ProviderType,
          resolvedMilestonePath: resolvedMilestonePath ?? null,
          reviewFlag: options.review === true,
          subtasksPath,
          validateFirst: options.validateFirst === true,
        });
      }
    }),
);

ralphCommand.addCommand(planCommand);

// =============================================================================
// ralph review - review planning artifacts
// =============================================================================

const reviewCommand = new Command("review").description(
  "Review planning artifacts for quality, gaps, and alignment",
);

// Helper to get review prompt path
function getReviewPromptPath(
  contextRoot: string,
  reviewType: string,
  isGapAnalysis: boolean,
): string {
  const suffix = isGapAnalysis ? "gap-auto" : "review-auto";
  return path.join(
    contextRoot,
    `context/workflows/ralph/review/${reviewType}-${suffix}.md`,
  );
}

function validateReviewCommandFlags(options: {
  dryRun?: boolean;
  headless?: boolean;
  supervised?: boolean;
}): void {
  if (options.supervised === true && options.headless === true) {
    console.error("Error: Cannot specify both --supervised and --headless");
    process.exit(1);
  }

  if (options.dryRun === true && options.headless !== true) {
    console.error("Error: --dry-run requires --headless mode");
    process.exit(1);
  }
}

// ralph review stories --milestone <path> - review stories for a milestone
reviewCommand.addCommand(
  new Command("stories")
    .description("Review stories for a milestone")
    .requiredOption(
      "--milestone <path>",
      "Milestone path to review stories for",
    )
    .option("-s, --supervised", "Supervised mode: watch review, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option("--provider <name>", "AI provider to use for review")
    .option("--model <name>", "Model to use for review invocation")
    .option(
      "--dry-run",
      "Preview review invocation without running provider (requires --headless)",
    )
    .action(async (options) => {
      validateReviewCommandFlags(options);
      const contextRoot = getContextRoot();
      const milestonePath = requireMilestone(options.milestone);
      const extraContext = `Reviewing stories for milestone: ${milestonePath}`;
      await runReviewWorkflow({
        contextRoot,
        extraContext,
        isDryRun: options.dryRun === true,
        isGapAnalysis: false,
        isHeadless: options.headless === true,
        logMilestonePath: milestonePath,
        model: options.model,
        provider: options.provider,
        reviewType: "stories",
        sessionName: "stories-review",
      });
    }),
);

// ralph review roadmap - review roadmap quality
reviewCommand.addCommand(
  new Command("roadmap")
    .description("Review roadmap milestones for quality and completeness")
    .option("-s, --supervised", "Supervised mode: watch review, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option("--provider <name>", "AI provider to use for review")
    .option("--model <name>", "Model to use for review invocation")
    .option(
      "--dry-run",
      "Preview review invocation without running provider (requires --headless)",
    )
    .action(async (options) => {
      validateReviewCommandFlags(options);
      const contextRoot = getContextRoot();
      const extraContext = "Reviewing roadmap for quality and completeness";
      await runReviewWorkflow({
        contextRoot,
        extraContext,
        isDryRun: options.dryRun === true,
        isGapAnalysis: false,
        isHeadless: options.headless === true,
        model: options.model,
        provider: options.provider,
        reviewType: "roadmap",
        sessionName: "roadmap-review",
      });
    }),
);

// ralph review gap - gap analysis subcommand group
const gapCommand = new Command("gap").description(
  "Cold analysis of planning artifacts for gaps and blind spots",
);

// ralph review gap roadmap - roadmap gap analysis
gapCommand.addCommand(
  new Command("roadmap")
    .description("Cold analysis of roadmap for gaps and risks")
    .option("-s, --supervised", "Supervised mode: watch review, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option("--provider <name>", "AI provider to use for review")
    .option("--model <name>", "Model to use for review invocation")
    .option(
      "--dry-run",
      "Preview review invocation without running provider (requires --headless)",
    )
    .action(async (options) => {
      validateReviewCommandFlags(options);
      const contextRoot = getContextRoot();
      const extraContext = "Gap analysis of roadmap for risks and blind spots";
      await runReviewWorkflow({
        contextRoot,
        extraContext,
        isDryRun: options.dryRun === true,
        isGapAnalysis: true,
        isHeadless: options.headless === true,
        model: options.model,
        provider: options.provider,
        reviewType: "roadmap",
        sessionName: "roadmap-gap",
      });
    }),
);

// ralph review gap stories --milestone <path> - stories gap analysis
gapCommand.addCommand(
  new Command("stories")
    .description("Cold analysis of stories for gaps and risks")
    .requiredOption(
      "--milestone <path>",
      "Milestone path to analyze stories for",
    )
    .option("-s, --supervised", "Supervised mode: watch review, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option("--provider <name>", "AI provider to use for review")
    .option("--model <name>", "Model to use for review invocation")
    .option(
      "--dry-run",
      "Preview review invocation without running provider (requires --headless)",
    )
    .action(async (options) => {
      validateReviewCommandFlags(options);
      const contextRoot = getContextRoot();
      const milestonePath = requireMilestone(options.milestone);
      const extraContext = `Gap analysis of stories for milestone: ${milestonePath}`;
      await runReviewWorkflow({
        contextRoot,
        extraContext,
        isDryRun: options.dryRun === true,
        isGapAnalysis: true,
        isHeadless: options.headless === true,
        logMilestonePath: milestonePath,
        model: options.model,
        provider: options.provider,
        reviewType: "stories",
        sessionName: "stories-gap",
      });
    }),
);

// ralph review gap tasks --story <path> - tasks gap analysis
gapCommand.addCommand(
  new Command("tasks")
    .description("Cold analysis of tasks for gaps and risks")
    .requiredOption("--story <path>", "Story path to analyze tasks for")
    .option("-s, --supervised", "Supervised mode: watch review, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option("--provider <name>", "AI provider to use for review")
    .option("--model <name>", "Model to use for review invocation")
    .option(
      "--dry-run",
      "Preview review invocation without running provider (requires --headless)",
    )
    .action(async (options) => {
      validateReviewCommandFlags(options);
      const contextRoot = getContextRoot();
      const storyPath = requireStory(options.story);
      const extraContext = `Gap analysis of tasks for story: ${storyPath}`;
      await runReviewWorkflow({
        contextRoot,
        extraContext,
        isDryRun: options.dryRun === true,
        isGapAnalysis: true,
        isHeadless: options.headless === true,
        logMilestonePath: getMilestoneRootFromPath(storyPath),
        model: options.model,
        provider: options.provider,
        reviewType: "tasks",
        sessionName: "tasks-gap",
      });
    }),
);

// ralph review gap subtasks --subtasks <path> - subtasks gap analysis
gapCommand.addCommand(
  new Command("subtasks")
    .description("Cold analysis of subtask queue for gaps and risks")
    .requiredOption("--subtasks <path>", "Subtasks file path to analyze")
    .option("-s, --supervised", "Supervised mode: watch review, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option("--provider <name>", "AI provider to use for review")
    .option("--model <name>", "Model to use for review invocation")
    .option(
      "--dry-run",
      "Preview review invocation without running provider (requires --headless)",
    )
    .action(async (options) => {
      validateReviewCommandFlags(options);
      const contextRoot = getContextRoot();
      const subtasksPath = path.resolve(options.subtasks);
      const extraContext = `Gap analysis of subtasks file: ${subtasksPath}`;
      await runReviewWorkflow({
        contextRoot,
        extraContext,
        isDryRun: options.dryRun === true,
        isGapAnalysis: true,
        isHeadless: options.headless === true,
        logMilestonePath: getMilestoneRootFromPath(path.dirname(subtasksPath)),
        model: options.model,
        provider: options.provider,
        reviewType: "subtasks",
        sessionName: "subtasks-gap",
      });
    }),
);

reviewCommand.addCommand(gapCommand);

// ralph review tasks --story <path> - review tasks for a story
reviewCommand.addCommand(
  new Command("tasks")
    .description("Review tasks for a story")
    .requiredOption("--story <path>", "Story path to review tasks for")
    .option("-s, --supervised", "Supervised mode: watch review, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option("--provider <name>", "AI provider to use for review")
    .option("--model <name>", "Model to use for review invocation")
    .option(
      "--dry-run",
      "Preview review invocation without running provider (requires --headless)",
    )
    .action(async (options) => {
      validateReviewCommandFlags(options);
      const contextRoot = getContextRoot();
      const storyPath = requireStory(options.story);
      const extraContext = `Reviewing tasks for story: ${storyPath}`;
      await runReviewWorkflow({
        contextRoot,
        extraContext,
        isDryRun: options.dryRun === true,
        isGapAnalysis: false,
        isHeadless: options.headless === true,
        logMilestonePath: getMilestoneRootFromPath(storyPath),
        model: options.model,
        provider: options.provider,
        reviewType: "tasks",
        sessionName: "tasks-review",
      });
    }),
);

// ralph review subtasks --subtasks <path> - review subtask queue
reviewCommand.addCommand(
  new Command("subtasks")
    .description("Review subtask queue before building")
    .requiredOption("--subtasks <path>", "Subtasks file path to review")
    .option("-s, --supervised", "Supervised mode: watch review, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option("--provider <name>", "AI provider to use for review")
    .option("--model <name>", "Model to use for review invocation")
    .option(
      "--dry-run",
      "Preview review invocation without running provider (requires --headless)",
    )
    .action(async (options) => {
      validateReviewCommandFlags(options);
      const contextRoot = getContextRoot();
      const subtasksPath = path.resolve(options.subtasks);
      const extraContext = `Reviewing subtasks file: ${subtasksPath}`;
      await runReviewWorkflow({
        contextRoot,
        extraContext,
        isDryRun: options.dryRun === true,
        isGapAnalysis: false,
        isHeadless: options.headless === true,
        logMilestonePath: getMilestoneRootFromPath(path.dirname(subtasksPath)),
        model: options.model,
        provider: options.provider,
        reviewType: "subtasks",
        sessionName: "subtasks-review",
      });
    }),
);

ralphCommand.addCommand(reviewCommand);

// ralph status - display build status
ralphCommand.addCommand(
  new Command("status")
    .description("Display current build status and progress")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .action((options) => {
      const subtasksPath = options.subtasks;
      const contextRoot = getContextRoot();

      // Resolve subtasks path: if relative and not found at cwd, try relative to context root
      let resolvedSubtasksPath = subtasksPath;
      if (!path.isAbsolute(subtasksPath) && !existsSync(subtasksPath)) {
        const rootRelativePath = path.join(contextRoot, subtasksPath);
        if (existsSync(rootRelativePath)) {
          resolvedSubtasksPath = rootRelativePath;
        }
      }

      runStatus(resolvedSubtasksPath, contextRoot);
    }),
);

// ralph milestones - list available milestones
ralphCommand.addCommand(
  new Command("milestones")
    .description("List available milestones from roadmap")
    .option("--json", "Output as JSON")
    .action((options) => {
      const milestones = discoverMilestones();

      if (options.json === true) {
        console.log(JSON.stringify({ milestones }, null, 2));
        return;
      }

      console.log();
      console.log(
        renderCommandBanner({
          lines: [chalk.dim("Discovered from docs/planning/roadmap.md")],
          title: "RALPH MILESTONES",
          tone: "info",
        }),
      );
      console.log(
        renderEventLine({
          domain: "MILESTONES",
          message: `Discovered ${milestones.length} milestone entries`,
          state: milestones.length === 0 ? "SKIP" : "DONE",
        }),
      );

      console.log("Available milestones:");
      for (const m of milestones) {
        console.log(`  ${m.slug} - ${m.name}`);
      }
      if (milestones.length === 0) {
        console.log("  (none found in docs/planning/roadmap.md)");
      }
    }),
);

// ralph models - list model table used for validation/completion
ralphCommand.addCommand(
  new Command("models")
    .description("List available model names from the registry table")
    .option("--provider <name>", "Filter models by provider")
    .option("--json", "Output as JSON")
    .action((options) => {
      runModels({ isJson: options.json === true, provider: options.provider });
    }),
);

// ralph calibrate - run calibration checks
// Uses real Commander subcommands for proper --help support

const calibrateCommand = new Command("calibrate").description(
  "Run calibration checks on completed subtasks",
);

function parseLimitOrExit(rawLimit: string): number {
  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error(
      renderEventLine({
        domain: "SUBTASKS",
        message: `Error: --limit must be a positive integer, got '${rawLimit}'`,
        state: "FAIL",
      }),
    );
    process.exit(1);
  }
  return parsed;
}

function readCliSubtaskInput(filePath: string | undefined): string {
  if (filePath !== undefined && filePath !== "") {
    return readFileSync(filePath, "utf8");
  }

  if (process.stdin.isTTY) {
    throw new Error("Provide subtask JSON via --file or stdin");
  }

  return readFileSync(0, "utf8");
}

function renderFingerprintMismatchError(details: {
  current: string;
  proposal: string;
  subtasksPath: string;
}): void {
  console.error(
    renderEventLine({
      domain: "SUBTASKS",
      message:
        "Fingerprint mismatch: proposal is stale for current queue state.",
      state: "FAIL",
    }),
  );
  console.error(`Queue:    ${details.subtasksPath}`);
  console.error(`Current:  ${details.current}`);
  console.error(`Proposal: ${details.proposal}`);
  console.error(
    "Action: regenerate the proposal from the latest queue, then retry diff/apply.",
  );
}

function requireMilestoneSubtasksPath(milestone: string): string {
  const milestonePath = requireMilestone(milestone);
  const subtasksPath = path.join(milestonePath, "subtasks.json");

  if (!existsSync(subtasksPath)) {
    console.error(
      renderEventLine({
        domain: "SUBTASKS",
        message: `Error: subtasks file not found: ${subtasksPath}`,
        state: "FAIL",
      }),
    );
    console.error(
      renderEventLine({
        domain: "SUBTASKS",
        message: `Create one with: aaa ralph plan subtasks --milestone ${milestone}`,
        state: "INFO",
      }),
    );
    process.exit(1);
  }

  return subtasksPath;
}

/**
 * Helper to resolve subtasks path relative to context root if not found at cwd
 */
function resolveCalibrateSubtasksPath(
  subtasksPath: string,
  contextRoot: string,
): string {
  if (!path.isAbsolute(subtasksPath) && !existsSync(subtasksPath)) {
    const rootRelativePath = path.join(contextRoot, subtasksPath);
    if (existsSync(rootRelativePath)) {
      return rootRelativePath;
    }
  }
  return subtasksPath;
}

/**
 * Helper to run calibrate subcommand and exit on failure
 */
async function runCalibrateSubcommand(
  subcommand: CalibrateSubcommand,
  options: {
    dryRun?: boolean;
    force?: boolean;
    model?: string;
    provider?: string;
    review?: boolean;
    subtasks: string;
  },
): Promise<void> {
  const contextRoot = getContextRoot();
  const resolvedSubtasksPath = resolveCalibrateSubtasksPath(
    options.subtasks,
    contextRoot,
  );

  validateApprovalFlags(options.force, options.review);

  if (options.dryRun === true) {
    let command:
      | "calibrate-all"
      | "calibrate-intention"
      | "calibrate-technical"
      | null = null;
    switch (subcommand) {
      case "all": {
        command = "calibrate-all";
        break;
      }
      case "intention": {
        command = "calibrate-intention";
        break;
      }
      case "technical": {
        command = "calibrate-technical";
        break;
      }
      default: {
        break;
      }
    }

    if (command !== null) {
      const plan = computeExecutionPlan({
        command,
        flags: {
          force: options.force === true,
          review: options.review === true,
        },
        milestonePath: path.dirname(path.resolve(resolvedSubtasksPath)),
        model: options.model,
        provider: options.provider,
        subtasksPath: resolvedSubtasksPath,
      });
      printDryRunPlan(plan);
      process.exit(0);
    }
  }

  const didSucceed = await runCalibrate(subcommand, {
    contextRoot,
    force: options.force,
    model: options.model,
    provider: options.provider,
    review: options.review,
    subtasksPath: resolvedSubtasksPath,
  });

  if (!didSucceed) {
    process.exit(1);
  }
}

const subtasksCommand = new Command("subtasks").description(
  "Subtask queue operations (next/list/complete/append/prepend/diff/apply)",
);

subtasksCommand.addCommand(
  new Command("next")
    .description("Get next runnable subtask from a milestone queue")
    .requiredOption(
      "--milestone <name|filepath>",
      "Milestone name or path containing subtasks.json",
    )
    .option("--json", "Output as JSON")
    .action((options) => {
      const subtasksPath = requireMilestoneSubtasksPath(options.milestone);
      const subtasksFile = loadSubtasksFile(subtasksPath);
      const subtask = getNextSubtask(subtasksFile.subtasks);

      if (options.json === true) {
        console.log(JSON.stringify({ subtask }, null, 2));
        return;
      }

      console.log();
      console.log(
        renderCommandBanner({
          lines: [
            chalk.dim(`Milestone: ${options.milestone}`),
            chalk.dim(`Queue: ${subtasksPath}`),
          ],
          title: "RALPH SUBTASKS NEXT",
          tone: "info",
        }),
      );

      if (subtask === null) {
        console.log(
          renderEventLine({
            domain: "SUBTASKS",
            message: `No pending subtasks in milestone '${options.milestone}'.`,
            state: "SKIP",
          }),
        );
        return;
      }

      console.log(
        renderEventLine({
          domain: "SUBTASKS",
          message: "Next runnable subtask resolved",
          state: "DONE",
        }),
      );

      console.log(`${subtask.id}: ${subtask.title}`);
      console.log(`taskRef: ${subtask.taskRef}`);
    }),
);

subtasksCommand.addCommand(
  new Command("list")
    .description("List subtasks for a milestone queue")
    .requiredOption(
      "--milestone <name|filepath>",
      "Milestone name or path containing subtasks.json",
    )
    .option("--pending", "Only show pending subtasks")
    .option("--limit <n>", "Maximum number of subtasks to show", "50")
    .option("--json", "Output as JSON")
    .action((options) => {
      const subtasksPath = requireMilestoneSubtasksPath(options.milestone);
      const limit = parseLimitOrExit(options.limit);
      const subtasksFile = loadSubtasksFile(subtasksPath);

      const filtered =
        options.pending === true
          ? subtasksFile.subtasks.filter((subtask) => !subtask.done)
          : subtasksFile.subtasks;
      const subtasks = filtered.slice(0, limit);

      if (options.json === true) {
        console.log(
          JSON.stringify(
            {
              limit,
              pendingOnly: options.pending === true,
              subtasks,
              total: filtered.length,
            },
            null,
            2,
          ),
        );
        return;
      }

      console.log();
      console.log(
        renderCommandBanner({
          lines: [
            chalk.dim(`Milestone: ${options.milestone}`),
            chalk.dim(`Queue: ${subtasksPath}`),
            chalk.dim(
              `Limit: ${limit}  Pending-only: ${options.pending === true ? "yes" : "no"}`,
            ),
          ],
          title: "RALPH SUBTASKS LIST",
          tone: "info",
        }),
      );

      if (subtasks.length === 0) {
        console.log(
          renderEventLine({
            domain: "SUBTASKS",
            message: "No subtasks found.",
            state: "SKIP",
          }),
        );
        return;
      }

      console.log(
        renderEventLine({
          domain: "SUBTASKS",
          message: `Showing ${subtasks.length} of ${filtered.length} subtasks`,
          state: "DONE",
        }),
      );

      for (const subtask of subtasks) {
        const status = subtask.done ? "done" : "pending";
        console.log(`${subtask.id} [${status}] ${subtask.title}`);
      }
    }),
);

subtasksCommand.addCommand(
  new Command("append")
    .description("Append new subtasks to the end of a queue")
    .requiredOption("--subtasks <path>", "Subtasks file path")
    .option("--file <path>", "Read subtask JSON from file instead of stdin")
    .option("--dry-run", "Show JSON preview without writing queue file")
    .action((options) => {
      const subtasksPath = path.resolve(options.subtasks);
      const input = readCliSubtaskInput(options.file);
      const drafts = parseCliSubtaskDrafts(input);
      const subtasksFile = loadSubtasksFile(subtasksPath);

      const proposal = {
        fingerprint: subtasksFile.fingerprint,
        operations: drafts.map((draft, index) => ({
          atIndex: subtasksFile.subtasks.length + index,
          subtask: {
            acceptanceCriteria: [...draft.acceptanceCriteria],
            description: draft.description,
            filesToRead: [...draft.filesToRead],
            storyRef: draft.storyRef,
            taskRef: draft.taskRef,
            title: draft.title,
          },
          type: "create" as const,
        })),
        source: "cli:subtasks:append",
        timestamp: new Date().toISOString(),
      };

      const appendedQueue = applyQueueOperations(subtasksFile, proposal);
      const createdSubtasks = appendedQueue.subtasks.slice(-drafts.length);

      if (options.dryRun === true) {
        console.log(
          JSON.stringify(
            {
              added: drafts.length,
              afterCount: appendedQueue.subtasks.length,
              allocatedIds: createdSubtasks.map((subtask) => subtask.id),
              beforeCount: subtasksFile.subtasks.length,
              command: "append",
              dryRun: true,
              subtasksPath,
            },
            null,
            2,
          ),
        );
        return;
      }

      saveSubtasksFile(subtasksPath, appendedQueue);
      console.log(`Appended ${drafts.length} subtask(s) to ${subtasksPath}`);
    }),
);

subtasksCommand.addCommand(
  new Command("prepend")
    .description("Prepend new subtasks to the beginning of a queue")
    .requiredOption("--subtasks <path>", "Subtasks file path")
    .option("--file <path>", "Read subtask JSON from file instead of stdin")
    .option("--dry-run", "Show JSON preview without writing queue file")
    .action((options) => {
      const subtasksPath = path.resolve(options.subtasks);
      const input = readCliSubtaskInput(options.file);
      const drafts = parseCliSubtaskDrafts(input);
      const subtasksFile = loadSubtasksFile(subtasksPath);

      const proposal = {
        fingerprint: subtasksFile.fingerprint,
        operations: drafts.map((draft, index) => ({
          atIndex: subtasksFile.subtasks.length + index,
          subtask: {
            acceptanceCriteria: [...draft.acceptanceCriteria],
            description: draft.description,
            filesToRead: [...draft.filesToRead],
            storyRef: draft.storyRef,
            taskRef: draft.taskRef,
            title: draft.title,
          },
          type: "create" as const,
        })),
        source: "cli:subtasks:prepend",
        timestamp: new Date().toISOString(),
      };

      const createdAtTail = applyQueueOperations(subtasksFile, proposal);
      const createdSubtasks = createdAtTail.subtasks.slice(-drafts.length);
      const prependedQueue = [
        ...createdSubtasks,
        ...createdAtTail.subtasks.slice(0, -drafts.length),
      ];

      if (options.dryRun === true) {
        console.log(
          JSON.stringify(
            {
              added: drafts.length,
              afterCount: prependedQueue.length,
              allocatedIds: createdSubtasks.map((subtask) => subtask.id),
              beforeCount: subtasksFile.subtasks.length,
              command: "prepend",
              dryRun: true,
              subtasksPath,
            },
            null,
            2,
          ),
        );
        return;
      }

      saveSubtasksFile(subtasksPath, {
        ...createdAtTail,
        subtasks: prependedQueue,
      });
      console.log(`Prepended ${drafts.length} subtask(s) to ${subtasksPath}`);
    }),
);

subtasksCommand.addCommand(
  new Command("diff")
    .description("Preview queue changes from a proposal without applying")
    .requiredOption("--proposal <path>", "Queue proposal JSON file")
    .requiredOption("--subtasks <path>", "Subtasks file path")
    .option("--json", "Output machine-readable JSON summary")
    .action((options) => {
      const subtasksPath = path.resolve(options.subtasks);
      const proposalPath = path.resolve(options.proposal);
      const proposal = readQueueProposalFromFile(proposalPath);
      const currentFile = loadSubtasksFile(subtasksPath);
      const fingerprintState = hasFingerprintMismatch(
        proposal,
        currentFile.subtasks,
      );

      if (fingerprintState.mismatched) {
        renderFingerprintMismatchError({
          current: fingerprintState.current,
          proposal: fingerprintState.proposal,
          subtasksPath,
        });
        process.exit(1);
      }

      const nextFile = applyQueueOperations(currentFile, proposal);
      const summary = buildQueueDiffSummary(
        currentFile.subtasks,
        nextFile.subtasks,
      );
      const totalChanges =
        summary.added.length +
        summary.removed.length +
        summary.updated.length +
        summary.reordered.length;

      if (options.json === true) {
        console.log(
          JSON.stringify(
            {
              added: summary.added.map((subtask) => ({
                id: subtask.id,
                taskRef: subtask.taskRef,
                title: subtask.title,
              })),
              changes: totalChanges,
              command: "diff",
              fingerprint: {
                current: fingerprintState.current,
                proposal: fingerprintState.proposal,
              },
              operations: proposal.operations.length,
              removed: summary.removed.map((subtask) => ({
                id: subtask.id,
                taskRef: subtask.taskRef,
                title: subtask.title,
              })),
              reordered: summary.reordered,
              subtasksAfter: nextFile.subtasks.length,
              subtasksBefore: currentFile.subtasks.length,
              updated: summary.updated.map((entry) => ({
                after: { id: entry.after.id, title: entry.after.title },
                before: { id: entry.before.id, title: entry.before.title },
              })),
            },
            null,
            2,
          ),
        );
        return;
      }

      console.log(`Queue diff for ${subtasksPath}`);
      console.log(`Operations: ${proposal.operations.length}`);
      console.log(
        `Subtasks: ${currentFile.subtasks.length} -> ${nextFile.subtasks.length}`,
      );

      if (totalChanges === 0) {
        console.log("No queue changes.");
        return;
      }

      if (summary.added.length > 0) {
        console.log(`\nAdded (${summary.added.length}):`);
        for (const subtask of summary.added) {
          console.log(`+ ${subtask.id} ${subtask.title}`);
        }
      }

      if (summary.removed.length > 0) {
        console.log(`\nRemoved (${summary.removed.length}):`);
        for (const subtask of summary.removed) {
          console.log(`- ${subtask.id} ${subtask.title}`);
        }
      }

      if (summary.updated.length > 0) {
        console.log(`\nUpdated (${summary.updated.length}):`);
        for (const entry of summary.updated) {
          const isTitleChanged = entry.before.title !== entry.after.title;
          if (isTitleChanged) {
            console.log(
              `~ ${entry.after.id} title: "${entry.before.title}" -> "${entry.after.title}"`,
            );
          } else {
            console.log(`~ ${entry.after.id} ${entry.after.title}`);
          }
        }
      }

      if (summary.reordered.length > 0) {
        console.log(`\nReordered (${summary.reordered.length}):`);
        for (const move of summary.reordered) {
          console.log(`> ${move.id} ${move.was} -> ${move.to}`);
        }
      }
    }),
);

subtasksCommand.addCommand(
  new Command("apply")
    .description("Apply queue proposal to subtasks file")
    .requiredOption("--proposal <path>", "Queue proposal JSON file")
    .requiredOption("--subtasks <path>", "Subtasks file path")
    .action((options) => {
      const subtasksPath = path.resolve(options.subtasks);
      const proposalPath = path.resolve(options.proposal);
      const proposal = readQueueProposalFromFile(proposalPath);
      const currentFile = loadSubtasksFile(subtasksPath);
      const fingerprintState = hasFingerprintMismatch(
        proposal,
        currentFile.subtasks,
      );

      if (fingerprintState.mismatched) {
        renderFingerprintMismatchError({
          current: fingerprintState.current,
          proposal: fingerprintState.proposal,
          subtasksPath,
        });
        process.exit(1);
      }

      const summary = applyAndSaveProposal(subtasksPath, proposal);
      console.log(
        `Applied ${summary.operationsApplied} operation(s): ${summary.subtasksBefore} -> ${summary.subtasksAfter} subtasks`,
      );
      console.log(
        `Fingerprint: ${summary.fingerprintBefore} -> ${summary.fingerprintAfter}`,
      );
    }),
);

subtasksCommand.addCommand(
  new Command("complete")
    .description("Mark a subtask complete in a milestone queue")
    .requiredOption(
      "--milestone <name|filepath>",
      "Milestone name or path containing subtasks.json",
    )
    .requiredOption("--id <subtaskId>", "Subtask ID (e.g. SUB-001)")
    .requiredOption("--commit <hash>", "Commit hash for this completion")
    .requiredOption("--session <id>", "Session ID for this completion")
    .option("--provider <name>", "Provider that owns the session")
    .option("--at <iso>", "Completion timestamp (ISO 8601)")
    .action((options) => {
      const subtasksPath = requireMilestoneSubtasksPath(options.milestone);
      const subtasksFile = loadSubtasksFile(subtasksPath);
      const completedAt =
        options.at === undefined || options.at === ""
          ? new Date().toISOString()
          : options.at;

      console.log();
      console.log(
        renderCommandBanner({
          lines: [
            chalk.dim(`Milestone: ${options.milestone}`),
            chalk.dim(`Queue: ${subtasksPath}`),
            chalk.dim(`Subtask: ${options.id}`),
          ],
          title: "RALPH SUBTASKS COMPLETE",
          tone: "info",
        }),
      );

      const subtask = subtasksFile.subtasks.find(
        (item) => item.id === options.id,
      );
      if (subtask === undefined) {
        console.error(
          renderEventLine({
            domain: "SUBTASKS",
            message: `Error: subtask not found: ${options.id}`,
            state: "FAIL",
          }),
        );
        process.exit(1);
      }

      if (subtask.done) {
        console.error(
          renderEventLine({
            domain: "SUBTASKS",
            message: `Error: subtask already completed: ${options.id}`,
            state: "FAIL",
          }),
        );
        process.exit(1);
      }

      subtask.done = true;
      subtask.commitHash = options.commit;
      subtask.completedAt = completedAt;
      subtask.sessionId = options.session;
      const completionProvider: ProviderType | undefined =
        options.provider === undefined || options.provider === ""
          ? undefined
          : validateProviderOrExit(options.provider);
      if (completionProvider !== undefined) {
        subtask.provider = completionProvider;
      }
      const sessionRepoRoot = findProjectRoot() ?? process.cwd();
      subtask.sessionRepoRoot = sessionRepoRoot;
      const sessionLogPath =
        completionProvider === undefined
          ? getSessionJsonlPath(options.session, sessionRepoRoot)
          : resolveSessionForProvider(
              completionProvider,
              options.session,
              sessionRepoRoot,
            )?.path;
      if (sessionLogPath === null) {
        delete subtask.sessionLogPath;
      } else {
        subtask.sessionLogPath = sessionLogPath;
      }

      saveSubtasksFile(subtasksPath, subtasksFile);
      console.log(
        renderEventLine({
          domain: "SUBTASKS",
          message: `Marked ${options.id} as done`,
          state: "DONE",
        }),
      );
      console.log(`Marked ${options.id} as done in ${subtasksPath}`);
    }),
);

ralphCommand.addCommand(subtasksCommand);

// ralph calibrate intention - check for intention drift
calibrateCommand.addCommand(
  new Command("intention")
    .description("Check for intention drift (code vs planning docs)")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option(
      "--dry-run",
      "Preview execution plan without running (exits after showing pipeline diagram)",
    )
    .option("--provider <name>", "AI provider to use for calibration")
    .option("--model <name>", "Model to use for calibration invocation")
    .option("--force", "Skip approval even if config says 'suggest'")
    .option("--review", "Require approval even if config says 'autofix'")
    .action(async (options) => {
      await runCalibrateSubcommand("intention", options);
    }),
);

// ralph calibrate technical - check for technical drift
calibrateCommand.addCommand(
  new Command("technical")
    .description("Check for technical drift (code quality issues)")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option(
      "--dry-run",
      "Preview execution plan without running (exits after showing pipeline diagram)",
    )
    .option("--provider <name>", "AI provider to use for calibration")
    .option("--model <name>", "Model to use for calibration invocation")
    .option("--force", "Skip approval even if config says 'suggest'")
    .option("--review", "Require approval even if config says 'autofix'")
    .action(async (options) => {
      await runCalibrateSubcommand("technical", options);
    }),
);

// ralph calibrate improve - run self-improvement analysis
calibrateCommand.addCommand(
  new Command("improve")
    .description("Run self-improvement analysis on session logs")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option("--provider <name>", "AI provider to use for calibration")
    .option("--model <name>", "Model to use for calibration invocation")
    .option("--force", "Skip approval even if config says 'suggest'")
    .option("--review", "Require approval even if config says 'autofix'")
    .action(async (options) => {
      await runCalibrateSubcommand("improve", options);
    }),
);

// ralph calibrate all - run all calibration checks
calibrateCommand.addCommand(
  new Command("all")
    .description("Run all calibration checks sequentially")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option(
      "--dry-run",
      "Preview execution plan without running (exits after showing pipeline diagram)",
    )
    .option("--provider <name>", "AI provider to use for calibration")
    .option("--model <name>", "Model to use for calibration invocation")
    .option("--force", "Skip approval even if config says 'suggest'")
    .option("--review", "Require approval even if config says 'autofix'")
    .action(async (options) => {
      await runCalibrateSubcommand("all", options);
    }),
);

ralphCommand.addCommand(calibrateCommand);

// =============================================================================
// ralph archive - archive completed subtasks and old progress sessions
// =============================================================================

const archiveCommand = new Command("archive").description(
  "Archive completed subtasks and old PROGRESS.md sessions to manage file sizes",
);

// ralph archive subtasks - archive completed subtasks
archiveCommand.addCommand(
  new Command("subtasks")
    .description("Archive completed subtasks to reduce subtasks.json size")
    .requiredOption("--subtasks <path>", "Subtasks file path")
    .option("--milestone <name>", "Milestone name for archive naming")
    .action((options) => {
      const contextRoot = getContextRoot();
      runArchive(
        {
          milestone: options.milestone,
          subtasks: true,
          subtasksPath: options.subtasks,
        },
        contextRoot,
      );
    }),
);

// ralph archive progress - archive old PROGRESS.md sessions
archiveCommand.addCommand(
  new Command("progress")
    .description("Archive old sessions from PROGRESS.md")
    .option("--progress <path>", "PROGRESS.md file path")
    .action((options) => {
      const contextRoot = getContextRoot();
      runArchive(
        { progress: true, progressPath: options.progress },
        contextRoot,
      );
    }),
);

ralphCommand.addCommand(archiveCommand);

// =============================================================================
// ralph refresh-models - discover models from CLI providers
// =============================================================================

ralphCommand.addCommand(
  new Command("refresh-models")
    .description(
      "Discover available models from CLI providers and update dynamic registry",
    )
    .option("--dry-run", "Show what would be discovered without writing")
    .option("--prune", "Remove models not found in the refreshed provider set")
    .option("--provider <name>", "Discover models from specific provider only")
    .action((options) => {
      runRefreshModels({
        isDryRun: options.dryRun === true,
        isPrune: options.prune === true,
        provider: options.provider,
      });
    }),
);

/**
 * Validate mutual exclusion for approval override flags.
 */
function validateApprovalFlags(
  isForce: boolean | undefined,
  isReview: boolean | undefined,
): void {
  if (isForce === true && isReview === true) {
    console.error("Cannot use --force and --review together");
    process.exit(1);
  }
}

export { resolveMilestoneFromOptions, validateApprovalFlags };
export {
  hasFingerprintMismatch,
  parseCliSubtaskDraft,
  parseCliSubtaskDrafts,
  readQueueProposalFromFile,
} from "./subtask-helpers";
export default ralphCommand;

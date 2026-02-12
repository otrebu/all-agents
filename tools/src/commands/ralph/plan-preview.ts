import { loadAaaConfig } from "@tools/lib/config";
import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

import {
  type ApprovalAction,
  type ApprovalContext,
  type ApprovalGate,
  evaluateApproval,
} from "./approvals";
import { getLevelsInRange, levelToGate } from "./cascade";
import { loadSubtasksFile } from "./config";

type CascadeLevel =
  | "build"
  | "calibrate"
  | "roadmap"
  | "stories"
  | "subtasks"
  | "tasks";

interface ComputeExecutionPlanOptions {
  cascadeTarget?: PlanCascadeTarget;
  command: ExecutionCommand;
  flags?: PlanFlags;
  fromLevel?: CascadeLevel;
  milestonePath?: string;
  model?: string;
  provider?: string;
  subtasksPath?: string;
}

type ExecutionCommand =
  | "build"
  | "calibrate-all"
  | "calibrate-intention"
  | "calibrate-technical"
  | "plan-roadmap"
  | "plan-stories"
  | "plan-subtasks"
  | "plan-tasks";

interface ExecutionPhase {
  approvalAction: ApprovalAction;
  approvalGate: ApprovalGate | null;
  command: ExecutionCommand;
  estimatedTime: string;
  level: CascadeLevel;
  reads: Array<string>;
  steps: Array<PhaseStep>;
  writes: Array<string>;
}

interface ExecutionPlan {
  cascadeTarget: null | PlanCascadeTarget;
  command: ExecutionCommand;
  flags: Required<
    Pick<
      PlanFlags,
      "calibrateEvery" | "force" | "headless" | "review" | "validateFirst"
    >
  >;
  fromLevel: CascadeLevel | null;
  generatedAt: string;
  phases: Array<ExecutionPhase>;
  runtime: RuntimeContext;
  summary: ExecutionPlanSummary;
}

interface ExecutionPlanSummary {
  approvalGateCount: number;
  levels: Array<CascadeLevel>;
  phaseCount: number;
  totalEstimatedTime: string;
}

interface FlagEffect {
  flag: string;
  type: FlagEffectType;
}

type FlagEffectType = "added" | "replaced" | "struck";

interface FlowModuleRule {
  effect: FlagEffectType;
  flag: string;
  flagKey: "calibrateEvery" | "force" | "headless" | "validateFirst";
  level?: CascadeLevel;
  requiresApprovalGate?: boolean;
  step: ((flags: PlanFlags) => string) | string;
  targetStepKey?: string;
}

interface LevelFlowTemplate {
  reads: Array<string>;
  steps: Array<string>;
  writes: Array<string>;
}

interface PhaseStep {
  flagEffects: Array<FlagEffect>;
  text: string;
}

type PlanCascadeTarget = "build" | "calibrate";

interface PlanFlags {
  calibrateEvery?: number;
  force?: boolean;
  headless?: boolean;
  isTTY?: boolean;
  review?: boolean;
  validateFirst?: boolean;
}

interface RuntimeContext {
  milestonePath: null | string;
  model: null | string;
  provider: null | string;
  queue: { completed: number; pending: number; total: number };
  storiesCount: number;
  tasksCount: number;
}

interface RuntimeContextOptions {
  milestonePath?: string;
  model?: string;
  provider?: string;
  subtasksPath?: string;
}

interface WorkingPhaseStep extends PhaseStep {
  key: string;
}

const COMMAND_TO_LEVEL: Readonly<Record<ExecutionCommand, CascadeLevel>> = {
  build: "build",
  "calibrate-all": "calibrate",
  "calibrate-intention": "calibrate",
  "calibrate-technical": "calibrate",
  "plan-roadmap": "roadmap",
  "plan-stories": "stories",
  "plan-subtasks": "subtasks",
  "plan-tasks": "tasks",
};

const LEVEL_FLOWS: Readonly<Record<ExecutionCommand, LevelFlowTemplate>> = {
  build: {
    reads: ["docs/planning/milestones/<milestone>/subtasks.json"],
    steps: ["Run assigned subtask implementation", "Validate targeted tests"],
    writes: ["code changes", "docs/planning/PROGRESS.md", "git commit"],
  },
  "calibrate-all": {
    reads: ["recent completed subtasks", "session logs"],
    steps: ["Run intention drift analysis", "Run technical drift analysis"],
    writes: ["feedback proposal", "optional corrective subtasks"],
  },
  "calibrate-intention": {
    reads: ["recent completed subtasks", "planning chain context"],
    steps: ["Run intention drift analysis"],
    writes: ["intention drift findings"],
  },
  "calibrate-technical": {
    reads: ["recent completed subtasks", "diffs and referenced files"],
    steps: ["Run technical quality analysis"],
    writes: ["technical drift findings"],
  },
  "plan-roadmap": {
    reads: ["project context", "planning inputs"],
    steps: ["Generate roadmap milestones"],
    writes: ["milestone roadmap artifacts"],
  },
  "plan-stories": {
    reads: ["milestone roadmap", "existing stories"],
    steps: ["Generate story files"],
    writes: ["docs/planning/milestones/<milestone>/stories/*.md"],
  },
  "plan-subtasks": {
    reads: ["task files", "existing subtasks queue"],
    steps: ["Generate executable subtasks queue"],
    writes: ["docs/planning/milestones/<milestone>/subtasks.json"],
  },
  "plan-tasks": {
    reads: ["story files", "existing tasks"],
    steps: ["Generate task files"],
    writes: ["docs/planning/milestones/<milestone>/tasks/*.md"],
  },
};

const APPROVAL_PROMPT_STEP_KEY = "prompt-for-approval-when-required";

const FLOW_MODS: ReadonlyArray<FlowModuleRule> = [
  {
    effect: "added",
    flag: "--validate-first",
    flagKey: "validateFirst",
    level: "build",
    step: "Run pre-build validation before execution",
    targetStepKey: "run-assigned-subtask-implementation",
  },
  {
    effect: "replaced",
    flag: "--headless",
    flagKey: "headless",
    requiresApprovalGate: true,
    step: "Auto-write artifacts without interactive approval prompt",
    targetStepKey: APPROVAL_PROMPT_STEP_KEY,
  },
  {
    effect: "struck",
    flag: "--force",
    flagKey: "force",
    requiresApprovalGate: true,
    step: "Prompt for approval when required",
    targetStepKey: APPROVAL_PROMPT_STEP_KEY,
  },
  {
    effect: "added",
    flag: "--calibrate-every",
    flagKey: "calibrateEvery",
    level: "build",
    step: (flags) =>
      `Run periodic calibration every ${Math.max(1, flags.calibrateEvery ?? 1)} iterations`,
  },
];

const LEVEL_TIME_MINUTES: Readonly<Record<CascadeLevel, number>> = {
  build: 8,
  calibrate: 5,
  roadmap: 10,
  stories: 8,
  subtasks: 6,
  tasks: 7,
};

function applyFlowMods(
  steps: Array<WorkingPhaseStep>,
  context: {
    approvalGate: ApprovalGate | null;
    flags: PlanFlags;
    level: CascadeLevel;
  },
): Array<PhaseStep> {
  const nextSteps = [...steps];

  for (const rule of FLOW_MODS) {
    applyFlowModuleRule(nextSteps, rule, context);
  }

  return nextSteps.map((step) => ({
    flagEffects: step.flagEffects,
    text: step.text,
  }));
}

function applyFlowModuleRule(
  steps: Array<WorkingPhaseStep>,
  rule: FlowModuleRule,
  context: {
    approvalGate: ApprovalGate | null;
    flags: PlanFlags;
    level: CascadeLevel;
  },
): void {
  const isApplicableToLevel =
    rule.level === undefined || rule.level === context.level;
  const isApplicableToGate =
    rule.requiresApprovalGate !== true || context.approvalGate !== null;

  if (!isFlowModuleEnabled(rule, context.flags)) {
    return;
  }
  if (!isApplicableToLevel || !isApplicableToGate) {
    return;
  }

  const resolvedStepText =
    typeof rule.step === "function" ? rule.step(context.flags) : rule.step;

  if (rule.effect === "added") {
    const insertionIndex =
      rule.targetStepKey === undefined
        ? -1
        : steps.findIndex((step) => step.key === rule.targetStepKey);

    const insertedStep: WorkingPhaseStep = {
      flagEffects: [{ flag: rule.flag, type: "added" }],
      key: toStepKey(resolvedStepText),
      text: resolvedStepText,
    };

    if (insertionIndex >= 0) {
      steps.splice(insertionIndex, 0, insertedStep);
    } else {
      steps.push(insertedStep);
    }

    return;
  }

  const targetIndex =
    rule.targetStepKey === undefined
      ? -1
      : steps.findIndex((step) => step.key === rule.targetStepKey);
  if (targetIndex < 0) {
    return;
  }

  const targetStep = steps[targetIndex];
  if (targetStep === undefined) {
    return;
  }

  targetStep.flagEffects.push({ flag: rule.flag, type: rule.effect });
  if (rule.effect === "replaced") {
    targetStep.text = resolvedStepText;
  }
}

function buildApprovalContext(flags: PlanFlags): ApprovalContext {
  const isInteractiveTTY =
    flags.isTTY ?? (Boolean(process.stdin.isTTY) && flags.headless !== true);

  return {
    forceFlag: flags.force === true,
    isTTY: isInteractiveTTY,
    reviewFlag: flags.review === true,
  };
}

function collectRuntimeContext(options: RuntimeContextOptions): RuntimeContext {
  const config = loadAaaConfig();
  const milestonePath = options.milestonePath ?? null;
  const storiesCount = countDirectoryFiles(milestonePath, "stories");
  const tasksCount = countDirectoryFiles(milestonePath, "tasks");

  const defaultQueueStats = { completed: 0, pending: 0, total: 0 };
  const queue =
    resolveSubtasksPath(milestonePath, options.subtasksPath) ?? undefined;

  let queueStats = defaultQueueStats;
  if (queue !== undefined && existsSync(queue)) {
    const loaded = loadSubtasksFile(queue);
    const total = loaded.subtasks.length;
    const completed = loaded.subtasks.filter((subtask) => subtask.done).length;
    queueStats = { completed, pending: total - completed, total };
  }

  return {
    milestonePath,
    model: options.model ?? config.ralph?.model ?? null,
    provider: options.provider ?? config.ralph?.provider ?? null,
    queue: queueStats,
    storiesCount,
    tasksCount,
  };
}

function computeExecutionPlan(
  options: ComputeExecutionPlanOptions,
): ExecutionPlan {
  const normalizedFlags: Required<
    Pick<
      PlanFlags,
      "calibrateEvery" | "force" | "headless" | "review" | "validateFirst"
    >
  > = {
    calibrateEvery: options.flags?.calibrateEvery ?? 0,
    force: options.flags?.force === true,
    headless: options.flags?.headless === true,
    review: options.flags?.review === true,
    validateFirst: options.flags?.validateFirst === true,
  };

  const levelsToExecute = resolveExecutionLevels(
    options.command,
    options.cascadeTarget,
    options.fromLevel,
  );
  const runtime = collectRuntimeContext({
    milestonePath: options.milestonePath,
    model: options.model,
    provider: options.provider,
    subtasksPath: options.subtasksPath,
  });
  const approvalConfig = loadAaaConfig().ralph?.approvals;
  const approvalContext = buildApprovalContext(options.flags ?? {});

  const phases: Array<ExecutionPhase> = levelsToExecute.map((level) => {
    const flowCommand = getFlowCommandForLevel(level, options.command);
    const flow = LEVEL_FLOWS[flowCommand];
    const gate = levelToGate(level);
    const approvalAction =
      gate === null
        ? "write"
        : evaluateApproval(gate, approvalConfig, approvalContext);

    const baseSteps: Array<WorkingPhaseStep> = flow.steps.map((step) => ({
      flagEffects: [],
      key: toStepKey(step),
      text: step,
    }));

    if (gate !== null) {
      baseSteps.push({
        flagEffects: [],
        key: APPROVAL_PROMPT_STEP_KEY,
        text: "Prompt for approval when required",
      });
    }

    const steps = applyFlowMods(baseSteps, {
      approvalGate: gate,
      flags: options.flags ?? {},
      level,
    });

    const estimatedTime = getPhaseTimeEstimate(level);
    const milestoneLabel =
      runtime.milestonePath === null
        ? "<milestone>"
        : basename(runtime.milestonePath);

    return {
      approvalAction,
      approvalGate: gate,
      command: flowCommand,
      estimatedTime,
      level,
      reads: getEnrichedFlowEntries(flow.reads, runtime, milestoneLabel),
      steps,
      writes: getEnrichedFlowEntries(flow.writes, runtime, milestoneLabel),
    };
  });

  const totalEstimatedMinutes = phases.reduce(
    (accumulator, phase) =>
      accumulator + parseEstimateMinutes(phase.estimatedTime),
    0,
  );

  return {
    cascadeTarget: options.cascadeTarget ?? null,
    command: options.command,
    flags: normalizedFlags,
    fromLevel: options.fromLevel ?? null,
    generatedAt: new Date().toISOString(),
    phases,
    runtime,
    summary: {
      approvalGateCount: phases.filter((phase) => phase.approvalGate !== null)
        .length,
      levels: phases.map((phase) => phase.level),
      phaseCount: phases.length,
      totalEstimatedTime: `~${totalEstimatedMinutes} min`,
    },
  };
}

function countDirectoryFiles(
  milestonePath: null | string,
  directoryName: "stories" | "tasks",
): number {
  if (milestonePath === null) {
    return 0;
  }

  const targetDirectory = join(milestonePath, directoryName);
  if (!existsSync(targetDirectory)) {
    return 0;
  }

  return readdirSync(targetDirectory, { withFileTypes: true }).filter(
    (entry) => entry.isFile() && entry.name.endsWith(".md"),
  ).length;
}

function getEnrichedFlowEntries(
  entries: Array<string>,
  runtime: RuntimeContext,
  milestoneLabel: string,
): Array<string> {
  return entries.map((entry) => {
    let enriched = entry.replaceAll("<milestone>", milestoneLabel);

    if (enriched.includes("stories")) {
      enriched = `${enriched} (${runtime.storiesCount} files)`;
    }
    if (enriched.includes("tasks")) {
      enriched = `${enriched} (${runtime.tasksCount} files)`;
    }
    if (enriched.includes("subtasks.json")) {
      enriched = `${enriched} (${runtime.queue.total} total / ${runtime.queue.pending} pending / ${runtime.queue.completed} completed)`;
    }

    return enriched;
  });
}

function getFlowCommandForLevel(
  level: CascadeLevel,
  requestedCommand: ExecutionCommand,
): ExecutionCommand {
  if (level === "calibrate") {
    if (requestedCommand.startsWith("calibrate-")) {
      return requestedCommand;
    }
    return "calibrate-all";
  }

  if (level === "roadmap") {
    return "plan-roadmap";
  }
  if (level === "stories") {
    return "plan-stories";
  }
  if (level === "tasks") {
    return "plan-tasks";
  }
  if (level === "subtasks") {
    return "plan-subtasks";
  }

  return "build";
}

function getPhaseTimeEstimate(level: CascadeLevel): string {
  const minutes = LEVEL_TIME_MINUTES[level];
  return `~${minutes} min`;
}

function isFlowModuleEnabled(rule: FlowModuleRule, flags: PlanFlags): boolean {
  if (rule.flagKey === "calibrateEvery") {
    return (flags.calibrateEvery ?? 0) > 0;
  }

  return flags[rule.flagKey] === true;
}

function parseEstimateMinutes(estimate: string): number {
  const match = /~(?<minutes>\d+)/.exec(estimate);
  if (match === null) {
    return 0;
  }

  return Number.parseInt(match.groups?.minutes ?? "0", 10);
}

function resolveExecutionLevels(
  command: ExecutionCommand,
  cascadeTarget: PlanCascadeTarget | undefined,
  fromLevel: CascadeLevel | undefined,
): Array<CascadeLevel> {
  if (cascadeTarget === undefined) {
    return [COMMAND_TO_LEVEL[command]];
  }

  const startLevel = fromLevel ?? COMMAND_TO_LEVEL[command];
  return getLevelsInRange(startLevel, cascadeTarget) as Array<CascadeLevel>;
}

function resolveSubtasksPath(
  milestonePath: null | string,
  subtasksPath?: string,
): null | string {
  if (subtasksPath !== undefined) {
    return subtasksPath;
  }
  if (milestonePath === null) {
    return null;
  }
  return join(milestonePath, "subtasks.json");
}

function toStepKey(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

export {
  collectRuntimeContext,
  computeExecutionPlan,
  type ComputeExecutionPlanOptions,
  type ExecutionCommand,
  type ExecutionPhase,
  type ExecutionPlan,
  type ExecutionPlanSummary,
  type FlagEffect,
  type FlagEffectType,
  FLOW_MODS,
  LEVEL_FLOWS,
  type PhaseStep,
  type PlanFlags,
  type RuntimeContext,
};

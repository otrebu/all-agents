import { loadAaaConfig } from "@tools/lib/config";

import {
  type ApprovalAction,
  type ApprovalContext,
  type ApprovalGate,
  evaluateApproval,
} from "./approvals";
import { getLevelsInRange, levelToGate } from "./cascade";

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
  summary: ExecutionPlanSummary;
}

interface ExecutionPlanSummary {
  approvalGateCount: number;
  levels: Array<CascadeLevel>;
  phaseCount: number;
}

interface FlagEffect {
  flag: string;
  type: FlagEffectType;
}

type FlagEffectType = "added" | "replaced" | "struck";

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

function buildApprovalContext(flags: PlanFlags): ApprovalContext {
  const isInteractiveTTY =
    flags.isTTY ?? (Boolean(process.stdin.isTTY) && flags.headless !== true);

  return {
    forceFlag: flags.force === true,
    isTTY: isInteractiveTTY,
    reviewFlag: flags.review === true,
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

    return {
      approvalAction,
      approvalGate: gate,
      command: flowCommand,
      level,
      reads: [...flow.reads],
      steps: flow.steps.map((step) => ({ flagEffects: [], text: step })),
      writes: [...flow.writes],
    };
  });

  return {
    cascadeTarget: options.cascadeTarget ?? null,
    command: options.command,
    flags: normalizedFlags,
    fromLevel: options.fromLevel ?? null,
    generatedAt: new Date().toISOString(),
    phases,
    summary: {
      approvalGateCount: phases.filter((phase) => phase.approvalGate !== null)
        .length,
      levels: phases.map((phase) => phase.level),
      phaseCount: phases.length,
    },
  };
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

export {
  computeExecutionPlan,
  type ComputeExecutionPlanOptions,
  type ExecutionCommand,
  type ExecutionPhase,
  type ExecutionPlan,
  type ExecutionPlanSummary,
  type FlagEffect,
  type FlagEffectType,
  LEVEL_FLOWS,
  type PhaseStep,
  type PlanFlags,
};

import chalk from "chalk";
import stringWidth from "string-width";

import type { PhaseMetrics, PhaseStatus, SubtaskProgress } from "./types";

import { BOX_WIDTH, formatDuration, truncate } from "./display";

interface PhaseRuntimeState {
  approvalGateName?: string;
  metrics?: PhaseMetrics;
  name: string;
  state: PhaseRuntimeStatus;
}

type PhaseRuntimeStatus =
  | "approval-wait"
  | "running"
  | "stopped"
  | "timed-wait"
  | PhaseStatus;

interface PipelineRenderer {
  completePhase: (metrics: PhaseMetrics) => void;
  resume: () => void;
  setApprovalWait: (gateName: string) => void;
  startPhase: (name: string) => void;
  stop: () => void;
  suspend: () => void;
  updateSubtask: (...args: [string, string, number, number]) => void;
}

interface PipelineRendererInternal extends PipelineRenderer {
  activePhaseIndex: null | number;
  headless: boolean;
  isTTY: boolean;
  lastNonTtyTransitionLine: string;
  phases: Array<PhaseRuntimeState>;
  previousRenderLineCount: number;
  render: () => string;
  renderSuspended: boolean;
  subtaskState: null | SubtaskRuntimeState;
  timers: Set<ReturnType<typeof setInterval>>;
}

interface SubtaskRuntimeState extends SubtaskProgress {
  knownSubtasks: Array<{ description: string; id: string; position: number }>;
}

/**
 * Stateful renderer for live pipeline phase progress.
 */
function createPipelineRenderer(
  phases: Array<string>,
  isHeadless: boolean,
  isTTY: boolean,
): PipelineRenderer {
  function clearTimers(): void {
    for (const timer of renderer.timers) {
      clearInterval(timer);
    }
    renderer.timers.clear();
  }

  function normalizeLineWidth(line: string): string {
    const visualWidth = stringWidth(line);
    if (visualWidth > BOX_WIDTH) {
      return truncate(line, BOX_WIDTH);
    }

    if (visualWidth === BOX_WIDTH) {
      return line;
    }

    return `${line}${" ".repeat(BOX_WIDTH - visualWidth)}`;
  }

  function renderCompletedPhaseLine(phase: PhaseRuntimeState): string {
    if (phase.metrics === undefined) {
      return `▸ ${phase.name}  ${chalk.green("✓")}`;
    }

    const files = `${phase.metrics.filesChanged} files`;
    const elapsed = formatDuration(phase.metrics.timeElapsedMs ?? 0);
    const cost = `$${(phase.metrics.costUsd ?? 0).toFixed(2)}`;
    return `▸ ${phase.name}  ${files}  ${elapsed}  ${cost}  ${chalk.green("✓")}`;
  }

  function renderExecutionTree(): Array<string> {
    const lines: Array<string> = [];

    for (const [index, phase] of renderer.phases.entries()) {
      let phaseRows: Array<string> = [];

      if (phase.state === "completed") {
        phaseRows = [renderCompletedPhaseLine(phase)];
      } else if (index === renderer.activePhaseIndex) {
        if (phase.state === "approval-wait") {
          const gateName = phase.approvalGateName ?? "approval";
          phaseRows = [
            `▾ ${phase.name}  Awaiting approval: ${gateName}  ${chalk.yellow("‖")}`,
          ];
        } else if (renderer.subtaskState === null) {
          phaseRows = [`▾ ${phase.name}  running  ${chalk.cyan("●")}`];
        } else {
          const subtaskRows = renderSubtaskRows();
          phaseRows = [
            `▾ ${phase.name}  Subtask ${renderer.subtaskState.current}/${renderer.subtaskState.total}  ${chalk.cyan("●")}`,
            ...subtaskRows,
          ];
        }
      } else {
        phaseRows = [`○ ${chalk.dim(phase.name)}`];
      }

      lines.push(...phaseRows.map((row) => normalizeLineWidth(row)));
    }

    return lines;
  }

  function renderNonTtyTransitionLine(): string {
    if (renderer.activePhaseIndex === null) {
      const completedCount = renderer.phases.filter(
        (phase) => phase.state === "completed",
      ).length;
      return `[PIPELINE] phase=idle completed=${completedCount}/${renderer.phases.length}`;
    }

    const activePhase = renderer.phases[renderer.activePhaseIndex];
    if (activePhase === undefined) {
      return "[PIPELINE] phase=unknown";
    }

    return `[PIPELINE] phase=${activePhase.name} state=${activePhase.state}`;
  }

  function renderPhaseBarLine(): string {
    const segments = renderer.phases.map((phase) => {
      switch (phase.state) {
        case "approval-wait": {
          return chalk.yellow(`[${phase.name}] ‖`);
        }
        case "completed": {
          return chalk.green(`[${phase.name}] ✓`);
        }
        case "failed":
        case "pending": {
          return chalk.dim(phase.name);
        }
        case "running": {
          return chalk.cyan(`[${phase.name}] ●`);
        }
        case "stopped": {
          return chalk.red(`[${phase.name}] ✗`);
        }
        case "timed-wait": {
          return chalk.yellow(`[${phase.name}] ~`);
        }
        default: {
          return phase.name;
        }
      }
    });

    const line = `── ${segments.join(chalk.dim(" → "))} ──`;
    return normalizeLineWidth(line);
  }

  function renderSubtaskProgressBar(current: number, total: number): string {
    const width = 16;
    if (total === 0) {
      return `[${".".repeat(width)}]`;
    }

    const filled = Math.floor((current / total) * width);
    const empty = width - filled;
    return `[${"#".repeat(filled)}${".".repeat(empty)}]`;
  }

  function renderSubtaskLine(): string {
    if (renderer.subtaskState === null) {
      return "";
    }

    const percentage =
      renderer.subtaskState.total === 0
        ? 0
        : Math.floor(
            (renderer.subtaskState.current / renderer.subtaskState.total) * 100,
          );
    const progressBar = renderSubtaskProgressBar(
      renderer.subtaskState.current,
      renderer.subtaskState.total,
    );
    const title = truncate(renderer.subtaskState.description, 24);
    const line = `   ${renderer.subtaskState.id}  ${title}  ${renderer.subtaskState.current}/${renderer.subtaskState.total}  ${progressBar} ${percentage}%`;

    return normalizeLineWidth(line);
  }

  function renderSubtaskRows(): Array<string> {
    const { subtaskState } = renderer;
    if (subtaskState === null) {
      return [];
    }

    const known = [...subtaskState.knownSubtasks].sort(
      (left, right) => left.position - right.position,
    );

    const doneRows = known
      .filter((item) => item.position < subtaskState.current)
      .map(
        (item) =>
          `  ${chalk.green("✓")} ${item.id}  ${truncate(item.description, 28)}`,
      );
    const currentRow = `  ${chalk.cyan("●")} ${subtaskState.id}  ${truncate(subtaskState.description, 28)}`;

    const pendingCount = Math.max(0, subtaskState.total - subtaskState.current);
    const pendingRow =
      pendingCount > 0 ? [`  ${chalk.dim("○")} ${pendingCount} pending`] : [];

    return [...doneRows, currentRow, ...pendingRow];
  }

  function render(): string {
    const phaseBarLine = renderPhaseBarLine();
    const subtaskLine = renderSubtaskLine();
    const treeLines = renderExecutionTree();
    const lines =
      subtaskLine === ""
        ? [phaseBarLine, "", ...treeLines]
        : [phaseBarLine, subtaskLine, "", ...treeLines];
    const output = lines.join("\n");

    if (!renderer.isTTY) {
      const transitionLine = renderNonTtyTransitionLine();
      if (transitionLine !== renderer.lastNonTtyTransitionLine) {
        process.stdout.write(`${transitionLine}\n`);
        renderer.lastNonTtyTransitionLine = transitionLine;
      }
      return output;
    }

    if (renderer.headless && renderer.renderSuspended) {
      return output;
    }

    if (renderer.headless) {
      const maxLineCount = Math.max(
        renderer.previousRenderLineCount,
        lines.length,
      );
      const moveToRenderStart =
        renderer.previousRenderLineCount > 0
          ? `\x1b[${renderer.previousRenderLineCount}F`
          : "\r";
      const paddedLines =
        maxLineCount === lines.length
          ? lines
          : [
              ...lines,
              ...Array.from({ length: maxLineCount - lines.length }, () => ""),
            ];
      const body = paddedLines.map((line) => `\x1b[2K${line}`).join("\n");

      process.stdout.write(`${moveToRenderStart}${body}\n`);
      renderer.previousRenderLineCount = lines.length;
      return output;
    }

    process.stdout.write(`${output}\n`);
    renderer.previousRenderLineCount = lines.length;
    return output;
  }

  function completePhase(metrics: PhaseMetrics): void {
    if (renderer.activePhaseIndex === null) {
      return;
    }

    const activePhase = renderer.phases[renderer.activePhaseIndex];
    if (activePhase !== undefined) {
      activePhase.metrics = metrics;
      activePhase.state = "completed";
      activePhase.approvalGateName = undefined;
    }

    renderer.activePhaseIndex = null;
    renderer.subtaskState = null;
    clearTimers();
    render();
  }

  function resume(): void {
    if (!renderer.headless || !renderer.isTTY || !renderer.renderSuspended) {
      return;
    }

    renderer.renderSuspended = false;
    renderer.previousRenderLineCount = 0;
  }

  function setApprovalWait(gateName: string): void {
    if (renderer.activePhaseIndex === null) {
      return;
    }

    const activePhase = renderer.phases[renderer.activePhaseIndex];
    if (activePhase === undefined) {
      return;
    }

    activePhase.approvalGateName = gateName;
    activePhase.state = "approval-wait";
    clearTimers();
    render();
  }

  function startPhase(name: string): void {
    const phaseIndex = renderer.phases.findIndex(
      (phase) => phase.name === name,
    );
    if (phaseIndex < 0) {
      return;
    }

    if (renderer.activePhaseIndex !== null) {
      const previousPhase = renderer.phases[renderer.activePhaseIndex];
      if (previousPhase?.state === "running") {
        previousPhase.state = "stopped";
      }
    }

    clearTimers();
    renderer.activePhaseIndex = phaseIndex;
    const activePhase = renderer.phases[phaseIndex];
    if (activePhase === undefined) {
      return;
    }
    activePhase.approvalGateName = undefined;
    activePhase.state = "running";
    renderer.subtaskState = null;

    const timer = setInterval(() => {
      render();
    }, 1000);
    renderer.timers.add(timer);

    render();
  }

  function stop(): void {
    if (renderer.activePhaseIndex !== null) {
      const activePhase = renderer.phases[renderer.activePhaseIndex];
      if (
        activePhase !== undefined &&
        (activePhase.state === "approval-wait" ||
          activePhase.state === "running" ||
          activePhase.state === "timed-wait")
      ) {
        activePhase.state = "stopped";
      }
      renderer.activePhaseIndex = null;
    }

    renderer.subtaskState = null;
    clearTimers();
    render();
  }

  function suspend(): void {
    if (!renderer.headless || !renderer.isTTY) {
      return;
    }

    renderer.renderSuspended = true;
  }

  // eslint-disable-next-line max-params -- public API shape is part of milestone contract
  function updateSubtask(
    id: string,
    description: string,
    current: number,
    total: number,
  ): void {
    const normalizedTotal = Math.max(0, total);
    const normalizedCurrent =
      normalizedTotal === 0
        ? 0
        : Math.min(Math.max(0, current), normalizedTotal);

    const previousSubtaskState = renderer.subtaskState;
    const canReuseKnownSubtasks =
      previousSubtaskState?.total === normalizedTotal;
    const nextKnownSubtasks = canReuseKnownSubtasks
      ? [...previousSubtaskState.knownSubtasks]
      : [];

    const existingIndex = nextKnownSubtasks.findIndex(
      (item) => item.id === id || item.position === normalizedCurrent,
    );
    const nextSubtaskEntry = { description, id, position: normalizedCurrent };
    if (existingIndex >= 0) {
      nextKnownSubtasks[existingIndex] = nextSubtaskEntry;
    } else {
      nextKnownSubtasks.push(nextSubtaskEntry);
      nextKnownSubtasks.sort((left, right) => left.position - right.position);
    }

    renderer.subtaskState = {
      current: normalizedCurrent,
      description,
      id,
      knownSubtasks: nextKnownSubtasks,
      total: normalizedTotal,
    };

    render();
  }

  const renderer: PipelineRendererInternal = {
    activePhaseIndex: null,
    completePhase,
    headless: isHeadless,
    isTTY,
    lastNonTtyTransitionLine: "",
    phases: phases.map((name) => ({ name, state: "pending" })),
    previousRenderLineCount: 0,
    render,
    renderSuspended: false,
    resume,
    setApprovalWait,
    startPhase,
    stop,
    subtaskState: null,
    suspend,
    timers: new Set<ReturnType<typeof setInterval>>(),
    updateSubtask,
  };

  return renderer;
}

export { createPipelineRenderer };
export type { PipelineRenderer };

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

interface SubtaskRuntimeState extends SubtaskProgress {
  knownSubtasks: Array<{ description: string; id: string; position: number }>;
}

/**
 * Stateful renderer for live pipeline phase progress.
 */
class PipelineRenderer {
  private activePhaseIndex: null | number = null;

  private readonly headless: boolean;

  private readonly isTTY: boolean;

  private lastNonTtyTransitionLine = "";

  private readonly phases: Array<PhaseRuntimeState>;

  private previousRenderLineCount = 0;

  private renderSuspended = false;

  private subtaskState: null | SubtaskRuntimeState = null;

  private readonly timers = new Set<ReturnType<typeof setInterval>>();

  constructor(phases: Array<string>, isHeadless: boolean, isTTY: boolean) {
    this.headless = isHeadless;
    this.isTTY = isTTY;
    this.phases = phases.map((name) => ({ name, state: "pending" }));
  }

  completePhase(metrics: PhaseMetrics): void {
    if (this.activePhaseIndex === null) {
      return;
    }

    const activePhase = this.phases[this.activePhaseIndex];
    if (activePhase !== undefined) {
      activePhase.metrics = metrics;
      activePhase.state = "completed";
      activePhase.approvalGateName = undefined;
    }

    this.activePhaseIndex = null;
    this.subtaskState = null;
    this.clearTimers();
    this.render();
  }

  resume(): void {
    if (!this.headless || !this.isTTY || !this.renderSuspended) {
      return;
    }

    this.renderSuspended = false;
    this.previousRenderLineCount = 0;
  }

  setApprovalWait(gateName: string): void {
    if (this.activePhaseIndex === null) {
      return;
    }

    const activePhase = this.phases[this.activePhaseIndex];
    if (activePhase === undefined) {
      return;
    }

    activePhase.approvalGateName = gateName;
    activePhase.state = "approval-wait";
    this.clearTimers();
    this.render();
  }

  startPhase(name: string): void {
    const phaseIndex = this.phases.findIndex((phase) => phase.name === name);
    if (phaseIndex < 0) {
      return;
    }

    if (this.activePhaseIndex !== null) {
      const previousPhase = this.phases[this.activePhaseIndex];
      if (previousPhase?.state === "running") {
        previousPhase.state = "stopped";
      }
    }

    this.clearTimers();
    this.activePhaseIndex = phaseIndex;
    const activePhase = this.phases[phaseIndex];
    if (activePhase === undefined) {
      return;
    }
    activePhase.approvalGateName = undefined;
    activePhase.state = "running";
    this.subtaskState = null;

    const timer = setInterval(() => {
      this.render();
    }, 1000);
    this.timers.add(timer);

    this.render();
  }

  stop(): void {
    if (this.activePhaseIndex !== null) {
      const activePhase = this.phases[this.activePhaseIndex];
      if (
        activePhase !== undefined &&
        (activePhase.state === "approval-wait" ||
          activePhase.state === "running" ||
          activePhase.state === "timed-wait")
      ) {
        activePhase.state = "stopped";
      }
      this.activePhaseIndex = null;
    }

    this.subtaskState = null;
    this.clearTimers();
    this.render();
  }

  suspend(): void {
    if (!this.headless || !this.isTTY) {
      return;
    }

    this.renderSuspended = true;
  }

  // eslint-disable-next-line max-params -- public API shape is part of milestone contract
  updateSubtask(
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

    const previousSubtaskState = this.subtaskState;
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

    this.subtaskState = {
      current: normalizedCurrent,
      description,
      id,
      knownSubtasks: nextKnownSubtasks,
      total: normalizedTotal,
    };

    this.render();
  }

  private clearTimers(): void {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
  }

  private render(): string {
    const phaseBarLine = this.renderPhaseBarLine();
    const subtaskLine = this.renderSubtaskLine();
    const treeLines = this.renderExecutionTree();
    const lines =
      subtaskLine === ""
        ? [phaseBarLine, "", ...treeLines]
        : [phaseBarLine, subtaskLine, "", ...treeLines];
    const output = lines.join("\n");

    if (!this.isTTY) {
      const transitionLine = this.renderNonTtyTransitionLine();
      if (transitionLine !== this.lastNonTtyTransitionLine) {
        process.stdout.write(`${transitionLine}\n`);
        this.lastNonTtyTransitionLine = transitionLine;
      }
      return output;
    }

    if (this.headless && this.renderSuspended) {
      return output;
    }

    if (this.headless) {
      const maxLineCount = Math.max(this.previousRenderLineCount, lines.length);
      const moveToRenderStart =
        this.previousRenderLineCount > 0
          ? `\x1b[${this.previousRenderLineCount}F`
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
      this.previousRenderLineCount = lines.length;
      return output;
    }

    process.stdout.write(`${output}\n`);
    this.previousRenderLineCount = lines.length;
    return output;
  }

  private renderCompletedPhaseLine(phase: PhaseRuntimeState): string {
    if (phase.metrics === undefined) {
      return `▸ ${phase.name}  ${chalk.green("✓")}`;
    }

    const files = `${phase.metrics.filesChanged} files`;
    const elapsed = formatDuration(phase.metrics.timeElapsedMs ?? 0);
    const cost = `$${(phase.metrics.costUsd ?? 0).toFixed(2)}`;
    return `▸ ${phase.name}  ${files}  ${elapsed}  ${cost}  ${chalk.green("✓")}`;
  }

  private renderExecutionTree(): Array<string> {
    return this.phases.map((phase, index) => {
      if (phase.state === "completed") {
        return this.renderCompletedPhaseLine(phase);
      }

      if (index !== this.activePhaseIndex) {
        return `○ ${chalk.dim(phase.name)}`;
      }

      if (phase.state === "approval-wait") {
        const gateName = phase.approvalGateName ?? "approval";
        return `▾ ${phase.name}  Awaiting approval: ${gateName}  ${chalk.yellow("‖")}`;
      }

      if (this.subtaskState !== null) {
        const subtaskRows = this.renderSubtaskRows();
        return [
          `▾ ${phase.name}  Subtask ${this.subtaskState.current}/${this.subtaskState.total}  ${chalk.cyan("●")}`,
          ...subtaskRows,
        ].join("\n");
      }

      return `▾ ${phase.name}  running  ${chalk.cyan("●")}`;
    });
  }

  private renderNonTtyTransitionLine(): string {
    if (this.activePhaseIndex === null) {
      const completedCount = this.phases.filter(
        (phase) => phase.state === "completed",
      ).length;
      return `[PIPELINE] phase=idle completed=${completedCount}/${this.phases.length}`;
    }

    const activePhase = this.phases[this.activePhaseIndex];
    if (activePhase === undefined) {
      return "[PIPELINE] phase=unknown";
    }

    return `[PIPELINE] phase=${activePhase.name} state=${activePhase.state}`;
  }

  private renderPhaseBarLine(): string {
    const segments = this.phases.map((phase) => {
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
    if (stringWidth(line) <= BOX_WIDTH) {
      return line;
    }

    return truncate(line, BOX_WIDTH);
  }

  private renderSubtaskLine(): string {
    if (this.subtaskState === null) {
      return "";
    }

    const percentage =
      this.subtaskState.total === 0
        ? 0
        : Math.floor(
            (this.subtaskState.current / this.subtaskState.total) * 100,
          );
    const progressBar = this.renderSubtaskProgressBar(
      this.subtaskState.current,
      this.subtaskState.total,
    );
    const title = truncate(this.subtaskState.description, 24);
    const line = `   ${this.subtaskState.id}  ${title}  ${this.subtaskState.current}/${this.subtaskState.total}  ${progressBar} ${percentage}%`;

    return stringWidth(line) > BOX_WIDTH ? truncate(line, BOX_WIDTH) : line;
  }

  private renderSubtaskProgressBar(current: number, total: number): string {
    const width = 16;
    if (total === 0) {
      return `[${".".repeat(width)}]`;
    }

    const filled = Math.floor((current / total) * width);
    const empty = width - filled;
    return `[${"#".repeat(filled)}${".".repeat(empty)}]`;
  }

  private renderSubtaskRows(): Array<string> {
    const { subtaskState } = this;
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
}

export default PipelineRenderer;

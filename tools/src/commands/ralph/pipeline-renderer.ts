import chalk from "chalk";
import stringWidth from "string-width";

import type { PhaseMetrics, PhaseState } from "./types";

import { BOX_WIDTH, truncate } from "./display";

interface PhaseRuntimeState {
  metrics?: PhaseMetrics;
  name: string;
  state: PhaseState;
}

/**
 * Stateful renderer for live pipeline phase progress.
 */
class PipelineRenderer {
  private activePhaseIndex: null | number = null;

  private readonly headless: boolean;

  private readonly isTTY: boolean;

  private readonly phases: Array<PhaseRuntimeState>;

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
    }

    this.activePhaseIndex = null;
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
    activePhase.state = "running";

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

    this.clearTimers();
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

    if (this.headless && this.isTTY) {
      process.stdout.write(`\x1b[H\x1b[2K${phaseBarLine}\n`);
      return phaseBarLine;
    }

    process.stdout.write(`${phaseBarLine}\n`);
    return phaseBarLine;
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
}

export default PipelineRenderer;

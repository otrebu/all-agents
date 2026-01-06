import { Command } from "@commander-js/extra-typings";

import type { RunMode } from "./types";

import executeRalphInit from "./init";
import { executeRalphRun } from "./runner";

const DEFAULT_PRD_PATH = "docs/planning/prd.json";
const DEFAULT_PROGRESS_PATH = "docs/planning/progress.md";
const DEFAULT_ITERATIONS = 5;

/**
 * Determine iteration count from CLI flags
 */
function resolveIterationCount(options: {
  iterations?: number;
  once?: boolean;
  unlimited?: boolean;
}): number {
  // Zero means no iteration limit
  if (options.unlimited === true) {
    return 0;
  }
  if (options.once === true) {
    return 1;
  }
  return options.iterations ?? DEFAULT_ITERATIONS;
}

/**
 * Determine run mode from CLI flags.
 * Mode selection follows: unlimited > interactive > fixed (default)
 */
function resolveRunMode(options: {
  interactive?: boolean;
  once?: boolean;
  unlimited?: boolean;
}): RunMode {
  if (options.unlimited === true) {
    return "unlimited";
  }
  if (options.interactive === true) {
    return "interactive";
  }
  return "fixed";
}

const ralphCommand = new Command("ralph").description(
  "PRD-driven iterative Claude harness",
);

// ralph init
ralphCommand.addCommand(
  new Command("init")
    .description("Create a new PRD interactively")
    .option("--prd <path>", "PRD file path", DEFAULT_PRD_PATH)
    .action(async (options) => {
      await executeRalphInit({ prdPath: options.prd });
    }),
);

// ralph run
ralphCommand.addCommand(
  new Command("run")
    .description("Run iterations to implement PRD features")
    .option("--prd <path>", "PRD file path", DEFAULT_PRD_PATH)
    .option("--progress <path>", "Progress file path", DEFAULT_PROGRESS_PATH)
    .option("-n, --iterations <count>", "Number of iterations", (v) =>
      Number.parseInt(v, 10),
    )
    .option("--once", "Run single iteration")
    .option("--unlimited", "Run until <complete/> signal")
    .option("-i, --interactive", "Prompt after each iteration")
    .option("--dangerous", "Skip all permission prompts (use with caution)")
    .action(async (options) => {
      const mode = resolveRunMode({
        interactive: options.interactive,
        once: options.once,
        unlimited: options.unlimited,
      });

      const iterationCount = resolveIterationCount({
        iterations: options.iterations,
        once: options.once,
        unlimited: options.unlimited,
      });

      await executeRalphRun({
        dangerousMode: options.dangerous === true,
        iterationCount,
        mode,
        prdPath: options.prd,
        progressPath: options.progress,
      });
    }),
);

export default ralphCommand;

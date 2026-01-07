import { Command } from "@commander-js/extra-typings";
import { getContextRoot } from "@tools/utils/paths";
import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_PRD_PATH = "prd.json";
const DEFAULT_PROGRESS_PATH = "progress.md";
const DEFAULT_ITERATIONS = 5;

// Scripts live in repo, resolved from root (works for both dev and compiled binary)
const SCRIPTS_DIR = path.join(
  getContextRoot(),
  "tools/src/commands/ralph/scripts",
);

const PRD_TEMPLATE = `[
  {
    "id": "001-example-feature",
    "category": "functional",
    "description": "First feature to implement - describe what it should do",
    "steps": [
      "Verify the feature works as expected",
      "Check edge case behavior"
    ],
    "passes": false
  }
]`;

const ralphCommand = new Command("ralph").description(
  "PRD-driven iterative Claude harness",
);

// ralph init - create template PRD
ralphCommand.addCommand(
  new Command("init")
    .description("Create a template PRD file")
    .option("-o, --output <path>", "Output path", DEFAULT_PRD_PATH)
    .action((options) => {
      if (existsSync(options.output)) {
        console.error(`PRD already exists: ${options.output}`);
        process.exit(1);
      }
      writeFileSync(options.output, PRD_TEMPLATE);
      console.log(`Created ${options.output}`);
    }),
);

// ralph run - execute iterations
ralphCommand.addCommand(
  new Command("run")
    .description("Run iterations to implement PRD features")
    .argument(
      "[iterations]",
      "Number of iterations",
      String(DEFAULT_ITERATIONS),
    )
    .option("--prd <path>", "PRD file path", DEFAULT_PRD_PATH)
    .option("--progress <path>", "Progress file path", DEFAULT_PROGRESS_PATH)
    .option("--unlimited", "Run until PRD complete")
    .option("-i, --interactive", "Prompt after each iteration")
    .option("--dangerous", "Skip all permission prompts")
    .action((iterations, options) => {
      // Validate PRD exists
      if (!existsSync(options.prd)) {
        console.error(`PRD not found: ${options.prd}`);
        process.exit(1);
      }

      // Select script based on mode
      let script = "ralph.sh";
      if (options.unlimited) script = "ralph-unlimited.sh";
      if (options.interactive) script = "ralph-interactive.sh";

      const scriptPath = path.join(SCRIPTS_DIR, script);
      const permFlag = options.dangerous
        ? "--dangerously-skip-permissions"
        : "--permission-mode acceptEdits";

      try {
        execSync(
          `bash "${scriptPath}" "${iterations}" "${options.prd}" "${options.progress}" "${permFlag}"`,
          { stdio: "inherit" },
        );
      } catch {
        process.exit(1);
      }
    }),
);

export default ralphCommand;

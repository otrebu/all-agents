import { Command } from "@commander-js/extra-typings";
import { getContextRoot } from "@tools/utils/paths";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_TASKS_DIR = "docs/planning/tasks";
const DEFAULT_OUTPUT = "prd.json";

// Scripts live in repo, resolved from root
const SCRIPTS_DIR = join(getContextRoot(), "tools/src/commands/prd/scripts");

const prdCommand = new Command("prd").description("PRD utilities");

prdCommand.addCommand(
  new Command("generate")
    .description("Generate PRD JSON from task markdown files (1:1 mapping)")
    .option(
      "-d, --dir <path>",
      "Tasks directory (default: docs/planning/tasks)",
    )
    .option("-o, --output <path>", "Output file (default: prd.json)")
    .action((options) => {
      const root = getContextRoot();
      let tasksDirectory = join(root, DEFAULT_TASKS_DIR);

      if (options.dir !== undefined && options.dir !== "") {
        tasksDirectory = options.dir.startsWith("/")
          ? options.dir
          : join(root, options.dir);
      }

      const output = options.output ?? DEFAULT_OUTPUT;

      if (!existsSync(tasksDirectory)) {
        console.error(`Tasks directory not found: ${tasksDirectory}`);
        process.exit(1);
      }

      const scriptPath = join(SCRIPTS_DIR, "prd-generate.sh");

      try {
        execSync(`bash "${scriptPath}" "${tasksDirectory}" "${output}"`, {
          stdio: "inherit",
        });
      } catch {
        process.exit(1);
      }
    }),
);

prdCommand.addCommand(
  new Command("explode")
    .description(
      "Explode tasks into granular PRD features (1 task → 10-30 features)",
    )
    .option(
      "-d, --dir <path>",
      "Tasks directory (default: docs/planning/tasks)",
    )
    .option("-o, --output <path>", "Output file (default: prd.json)")
    .action((options) => {
      const root = getContextRoot();
      let tasksDirectory = join(root, DEFAULT_TASKS_DIR);

      if (options.dir !== undefined && options.dir !== "") {
        tasksDirectory = options.dir.startsWith("/")
          ? options.dir
          : join(root, options.dir);
      }

      const output = options.output ?? DEFAULT_OUTPUT;

      if (!existsSync(tasksDirectory)) {
        console.error(`Tasks directory not found: ${tasksDirectory}`);
        process.exit(1);
      }

      const scriptPath = join(SCRIPTS_DIR, "prd-explode.sh");

      try {
        execSync(`bash "${scriptPath}" "${tasksDirectory}" "${output}"`, {
          stdio: "inherit",
        });
      } catch {
        process.exit(1);
      }
    }),
);

export default prdCommand;

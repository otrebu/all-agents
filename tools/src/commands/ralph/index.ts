import { Command } from "@commander-js/extra-typings";
import { getContextRoot } from "@tools/utils/paths";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_PRD_PATH = "prd.json";
const DEFAULT_PROGRESS_PATH = "progress.md";
const DEFAULT_SUBTASKS_PATH = "subtasks.json";
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

// ralph build - execute subtask iteration loop
ralphCommand.addCommand(
  new Command("build")
    .description("Run subtask iteration loop using ralph-iteration.md prompt")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option("-p, --print", "Print prompt without executing Claude")
    .option("-i, --interactive", "Pause between iterations")
    .option("--max-iterations <n>", "Max retry attempts per subtask", "3")
    .option("--validate-first", "Run pre-build validation before building")
    .action((options) => {
      const contextRoot = getContextRoot();
      const promptPath = path.join(
        contextRoot,
        "context/workflows/ralph/building/ralph-iteration.md",
      );

      // Read the prompt file
      if (!existsSync(promptPath)) {
        console.error(`Prompt not found: ${promptPath}`);
        process.exit(1);
      }
      const promptContent = readFileSync(promptPath, "utf8");

      // Read context files that would be included
      const claudeMdPath = path.join(contextRoot, "CLAUDE.md");
      const progressMdPath = path.join(
        contextRoot,
        "docs/planning/PROGRESS.md",
      );

      const claudeMdContent = existsSync(claudeMdPath)
        ? readFileSync(claudeMdPath, "utf8")
        : "# CLAUDE.md not found";
      const progressMdContent = existsSync(progressMdPath)
        ? readFileSync(progressMdPath, "utf8")
        : "# PROGRESS.md not found";

      // For --print mode, output the prompt with context
      if (options.print) {
        console.log("=== Ralph Build Prompt ===\n");
        console.log("--- Prompt (ralph-iteration.md) ---");
        console.log(promptContent);
        console.log("\n--- Context: CLAUDE.md ---");
        console.log(claudeMdContent);
        console.log("\n--- Context: PROGRESS.md ---");
        console.log(progressMdContent);
        console.log(`\n--- Subtasks file: ${options.subtasks} ---`);
        if (existsSync(options.subtasks)) {
          console.log(readFileSync(options.subtasks, "utf8"));
        } else {
          console.log(`(File not found: ${options.subtasks})`);
        }
        console.log("\n=== End of Prompt ===");
        return;
      }

      // Execution mode: run the build script
      const scriptPath = path.join(SCRIPTS_DIR, "build.sh");
      const subtasksPath = path.resolve(options.subtasks);
      const interactive = options.interactive ? "true" : "false";
      const validateFirst = options.validateFirst ? "true" : "false";
      const permFlag = "--dangerously-skip-permissions";

      // Validate subtasks file exists
      if (!existsSync(subtasksPath)) {
        console.error(`Subtasks file not found: ${subtasksPath}`);
        process.exit(1);
      }

      try {
        execSync(
          `bash "${scriptPath}" "${subtasksPath}" "${options.maxIterations}" "${interactive}" "${validateFirst}" "${permFlag}"`,
          { stdio: "inherit" },
        );
      } catch {
        process.exit(1);
      }
    }),
);

// ralph plan - interactive planning commands
const planCommand = new Command("plan")
  .description(
    "Interactive planning tools for vision, roadmap, stories, and tasks",
  )
  .argument("[subcommand]", "Planning type: vision, roadmap, stories, or tasks")
  .option("--milestone <name>", "Milestone name (required for stories)")
  .option("--story <id>", "Story ID (required for tasks)")
  .action((subcommand, options) => {
    const contextRoot = getContextRoot();

    if (subcommand === undefined || subcommand === "") {
      console.log("Usage: aaa ralph plan <subcommand> [options]\n");
      console.log("Subcommands:");
      console.log("  vision     Start interactive vision planning session");
      console.log("  roadmap    Start interactive roadmap planning session");
      console.log(
        "  stories    Start interactive story planning session (requires --milestone)",
      );
      console.log(
        "  tasks      Start interactive task planning session (requires --story)",
      );
      console.log("\nOptions:");
      console.log(
        "  --milestone <name>  Milestone name (required for stories)",
      );
      console.log("  --story <id>        Story ID (required for tasks)");
      console.log("\nThese commands invoke Claude with the appropriate prompt");
      console.log(
        "for interactive planning. Sessions are multi-turn conversations.",
      );
      process.exit(0);
    }

    // Map subcommand to prompt file
    const promptMap: Record<string, string> = {
      roadmap: "context/workflows/ralph/planning/roadmap-interactive.md",
      stories: "context/workflows/ralph/planning/stories-interactive.md",
      tasks: "context/workflows/ralph/planning/tasks-interactive.md",
      vision: "context/workflows/ralph/planning/vision-interactive.md",
    };

    const promptRelativePath = promptMap[subcommand];
    if (promptRelativePath === undefined) {
      console.error(`Error: Unknown subcommand: ${subcommand}`);
      console.log(`Valid subcommands: ${Object.keys(promptMap).join(", ")}`);
      process.exit(1);
    }

    // Validate milestone parameter for stories
    if (
      subcommand === "stories" &&
      (options.milestone === undefined || options.milestone === "")
    ) {
      console.error("Error: --milestone <name> is required for stories");
      console.log("\nUsage: aaa ralph plan stories --milestone <name>");
      process.exit(1);
    }

    // Validate story parameter for tasks
    if (
      subcommand === "tasks" &&
      (options.story === undefined || options.story === "")
    ) {
      console.error("Error: --story <id> is required for tasks");
      console.log("\nUsage: aaa ralph plan tasks --story <id>");
      process.exit(1);
    }

    const promptPath = path.join(contextRoot, promptRelativePath);
    if (!existsSync(promptPath)) {
      console.error(`Prompt not found: ${promptPath}`);
      process.exit(1);
    }

    console.log(`Starting ${subcommand} planning session...`);
    console.log(`Prompt: ${promptPath}`);
    if (options.milestone !== undefined && options.milestone !== "") {
      console.log(`Milestone: ${options.milestone}`);
    }
    if (options.story !== undefined && options.story !== "") {
      console.log(`Story: ${options.story}`);
    }
    console.log();

    // Build Claude command with context if provided
    let claudeCmd = `claude --print "${promptPath}"`;
    if (options.milestone !== undefined && options.milestone !== "") {
      // Pass milestone as an additional context to Claude
      claudeCmd = `claude --print "${promptPath}" -p "Planning stories for milestone: ${options.milestone}"`;
    } else if (options.story !== undefined && options.story !== "") {
      // Pass story ID as an additional context to Claude
      claudeCmd = `claude --print "${promptPath}" -p "Planning tasks for story: ${options.story}"`;
    }

    // Invoke Claude with the prompt file
    try {
      execSync(claudeCmd, { stdio: "inherit" });
    } catch {
      process.exit(1);
    }
  });

ralphCommand.addCommand(planCommand);

// ralph status - display build status
ralphCommand.addCommand(
  new Command("status")
    .description("Display current build status and progress")
    .argument("[subtasks-path]", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .action((subtasksPath) => {
      const scriptPath = path.join(SCRIPTS_DIR, "status.sh");

      try {
        execSync(`bash "${scriptPath}" "${subtasksPath}"`, {
          stdio: "inherit",
        });
      } catch {
        process.exit(1);
      }
    }),
);

// ralph calibrate - run calibration checks
ralphCommand.addCommand(
  new Command("calibrate")
    .description("Run calibration checks on completed subtasks")
    .argument(
      "[subcommand]",
      "Check type: intention, technical, improve, or all",
    )
    .option("--force", "Skip approval even if config says 'always'")
    .option("--review", "Require approval even if config says 'auto'")
    .action((subcommand, options) => {
      const scriptPath = path.join(SCRIPTS_DIR, "calibrate.sh");

      if (subcommand === undefined || subcommand === "") {
        console.error("Error: No subcommand specified");
        console.log("\nUsage: aaa ralph calibrate <subcommand> [options]");
        console.log("\nSubcommands:");
        console.log(
          "  intention    Check for intention drift (code vs planning docs)",
        );
        console.log(
          "  technical    Check for technical drift (code quality issues)",
        );
        console.log(
          "  improve      Run self-improvement analysis on session logs",
        );
        console.log("  all          Run all calibration checks sequentially");
        console.log("\nOptions:");
        console.log(
          "  --force      Skip approval even if config says 'always'",
        );
        console.log(
          "  --review     Require approval even if config says 'auto'",
        );
        process.exit(1);
      }

      const validSubcommands = ["intention", "technical", "improve", "all"];
      if (!validSubcommands.includes(subcommand)) {
        console.error(`Error: Unknown subcommand: ${subcommand}`);
        console.log(`Valid subcommands: ${validSubcommands.join(", ")}`);
        process.exit(1);
      }

      // Build CLI args
      const args = [subcommand];
      if (options.force) args.push("--force");
      if (options.review) args.push("--review");

      try {
        execSync(`bash "${scriptPath}" ${args.join(" ")}`, {
          stdio: "inherit",
        });
      } catch {
        process.exit(1);
      }
    }),
);

export default ralphCommand;

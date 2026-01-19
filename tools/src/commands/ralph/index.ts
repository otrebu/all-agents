import { Command } from "@commander-js/extra-typings";
import { getContextRoot } from "@tools/utils/paths";
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_SUBTASKS_PATH = "subtasks.json";

// Scripts live in repo, resolved from root (works for both dev and compiled binary)
const SCRIPTS_DIR = path.join(
  getContextRoot(),
  "tools/src/commands/ralph/scripts",
);

const ralphCommand = new Command("ralph").description(
  "Autonomous development framework (Vision → Roadmap → Story → Task → Subtask)",
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
const planCommand = new Command("plan").description(
  "Planning tools for vision, roadmap, stories, tasks, and subtasks",
);

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

// Helper to invoke Claude with a prompt file for interactive session
function invokeClaude(
  promptPath: string,
  sessionName: string,
  extraContext?: string,
): void {
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

  // Use spawnSync with argument array to avoid shell parsing entirely
  // This prevents issues with special characters like parentheses in the prompt
  const result = spawnSync(
    "claude",
    [
      "--append-system-prompt",
      fullPrompt,
      `Please begin the ${sessionName} planning session following the instructions provided.`,
    ],
    { stdio: "inherit" },
  );

  if (result.error) {
    console.error(`Failed to start Claude: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// ralph plan vision - interactive vision planning
planCommand.addCommand(
  new Command("vision")
    .description(
      "Start interactive vision planning session using Socratic method",
    )
    .action(() => {
      const contextRoot = getContextRoot();
      const promptPath = path.join(
        contextRoot,
        "context/workflows/ralph/planning/vision-interactive.md",
      );
      invokeClaude(promptPath, "vision");
    }),
);

// ralph plan roadmap - interactive roadmap planning
planCommand.addCommand(
  new Command("roadmap")
    .description("Start interactive roadmap planning session")
    .action(() => {
      const contextRoot = getContextRoot();
      const promptPath = path.join(
        contextRoot,
        "context/workflows/ralph/planning/roadmap-interactive.md",
      );
      invokeClaude(promptPath, "roadmap");
    }),
);

// ralph plan stories - interactive story planning (requires milestone)
planCommand.addCommand(
  new Command("stories")
    .description("Start interactive story planning session for a milestone")
    .requiredOption("--milestone <name>", "Milestone name to plan stories for")
    .option("-a, --auto", "Use auto mode (skip interactive dialogue)")
    .action((options) => {
      const contextRoot = getContextRoot();
      const promptPath = getPromptPath(
        contextRoot,
        "stories",
        Boolean(options.auto),
      );
      invokeClaude(
        promptPath,
        "stories",
        `Planning stories for milestone: ${options.milestone}`,
      );
    }),
);

// ralph plan tasks - task planning (requires --story OR --milestone)
planCommand.addCommand(
  new Command("tasks")
    .description(
      "Plan tasks for a story (--story) or all stories in a milestone (--milestone)",
    )
    .option("--story <id>", "Story ID to plan tasks for")
    .option("--milestone <name>", "Milestone to plan tasks for (all stories)")
    .option("-a, --auto", "Use auto mode (skip interactive dialogue)")
    .action((options) => {
      const hasStory = options.story !== undefined;
      const hasMilestone = options.milestone !== undefined;

      // Validate: require exactly one of --story or --milestone
      if (!hasStory && !hasMilestone) {
        console.error(
          "Error: Must specify either --story <id> or --milestone <name>",
        );
        console.log("\nUsage:");
        console.log(
          "  aaa ralph plan tasks --story <story-id>      # Single story",
        );
        console.log(
          "  aaa ralph plan tasks --milestone <name> --auto  # All stories in milestone",
        );
        process.exit(1);
      }
      if (hasStory && hasMilestone) {
        console.error("Error: Cannot specify both --story and --milestone");
        process.exit(1);
      }

      const contextRoot = getContextRoot();

      // Milestone mode
      if (hasMilestone) {
        if (!options.auto) {
          console.error(
            "Error: --milestone requires --auto mode (parallel generation)",
          );
          console.log(
            "\nUsage: aaa ralph plan tasks --milestone <name> --auto",
          );
          process.exit(1);
        }
        const promptPath = path.join(
          contextRoot,
          "context/workflows/ralph/planning/tasks-milestone.md",
        );
        invokeClaude(
          promptPath,
          "tasks-milestone",
          `Generating tasks for all stories in milestone: ${options.milestone}`,
        );
        return;
      }

      // Story mode (original behavior)
      const promptPath = getPromptPath(
        contextRoot,
        "tasks",
        Boolean(options.auto),
      );
      invokeClaude(
        promptPath,
        "tasks",
        `Planning tasks for story: ${options.story}`,
      );
    }),
);

// ralph plan subtasks - subtask generation (always auto mode)
planCommand.addCommand(
  new Command("subtasks")
    .description("Generate subtasks for a task (runs in auto mode)")
    .requiredOption("--task <id>", "Task ID to generate subtasks for")
    .action((options) => {
      const contextRoot = getContextRoot();
      // Subtasks always runs in auto mode per VISION.md
      const promptPath = getPromptPath(contextRoot, "subtasks", true);
      invokeClaude(
        promptPath,
        "subtasks",
        `Generating subtasks for task: ${options.task}`,
      );
    }),
);

ralphCommand.addCommand(planCommand);

// ralph status - display build status
ralphCommand.addCommand(
  new Command("status")
    .description("Display current build status and progress")
    .argument("[subtasks-path]", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .action((subtasksPath) => {
      const scriptPath = path.join(SCRIPTS_DIR, "status.sh");
      const contextRoot = getContextRoot();

      // Resolve subtasks path: if relative and not found at cwd, try relative to context root
      let resolvedSubtasksPath = subtasksPath;
      if (!path.isAbsolute(subtasksPath) && !existsSync(subtasksPath)) {
        const rootRelativePath = path.join(contextRoot, subtasksPath);
        if (existsSync(rootRelativePath)) {
          resolvedSubtasksPath = rootRelativePath;
        }
      }

      try {
        execSync(
          `bash "${scriptPath}" "${resolvedSubtasksPath}" "${contextRoot}"`,
          { stdio: "inherit" },
        );
      } catch (error) {
        const execError = error as { message?: string; status?: number };
        console.error("\nError: Failed to get Ralph build status");
        if (execError.status !== undefined && execError.status !== 0) {
          console.error(`  Exit code: ${execError.status}`);
        }
        console.error(
          "\nTroubleshooting:\n  - Ensure subtasks.json exists and is valid JSON\n  - Verify ralph.config.json is valid if present\n  - Check logs/iterations.jsonl format if present",
        );
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

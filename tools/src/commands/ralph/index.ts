import { Command } from "@commander-js/extra-typings";
import { getContextRoot } from "@tools/utils/paths";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
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
const planCommand = new Command("plan").description(
  "Interactive planning tools for vision, roadmap, stories, and tasks",
);

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

  // Write prompt to a temporary file to pass to Claude
  // This avoids shell escaping issues with long prompts containing quotes/special chars
  const temporaryPromptPath = path.join(
    os.tmpdir(),
    `ralph-${sessionName}-prompt.md`,
  );
  writeFileSync(temporaryPromptPath, fullPrompt);

  // Invoke Claude interactively with the prompt as an initial message
  // Use --append-system-prompt to inject the workflow instructions
  // and pass a brief user prompt to start the session
  try {
    execSync(
      `claude --append-system-prompt "$(cat '${temporaryPromptPath}')" "Please begin the ${sessionName} planning session following the instructions provided."`,
      { stdio: "inherit" },
    );
  } finally {
    // Clean up temp file
    try {
      unlinkSync(temporaryPromptPath);
    } catch {
      // Ignore cleanup errors
    }
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
    .action((options) => {
      const contextRoot = getContextRoot();
      const promptPath = path.join(
        contextRoot,
        "context/workflows/ralph/planning/stories-interactive.md",
      );
      invokeClaude(
        promptPath,
        "stories",
        `Planning stories for milestone: ${options.milestone}`,
      );
    }),
);

// ralph plan tasks - interactive task planning (requires story)
planCommand.addCommand(
  new Command("tasks")
    .description("Start interactive task planning session for a story")
    .requiredOption("--story <id>", "Story ID to plan tasks for")
    .action((options) => {
      const contextRoot = getContextRoot();
      const promptPath = path.join(
        contextRoot,
        "context/workflows/ralph/planning/tasks-interactive.md",
      );
      invokeClaude(
        promptPath,
        "tasks",
        `Planning tasks for story: ${options.story}`,
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

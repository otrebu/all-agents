import { Command } from "@commander-js/extra-typings";
import { getContextRoot } from "@tools/utils/paths";
import { execSync, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_SUBTASKS_PATH = "subtasks.json";

// =============================================================================
// Three-Mode Execution System
// See: @context/blocks/construct/ralph-patterns.md
// See: @docs/planning/VISION.md Section 3.1
// =============================================================================

/**
 * Claude JSON output structure
 */
interface ClaudeOutput {
  duration_ms?: number;
  num_turns?: number;
  result?: string;
  session_id?: string;
  total_cost_usd?: number;
}

/**
 * Options for invokeClaudeHeadless
 */
interface HeadlessOptions {
  extraContext?: string;
  logFile: string;
  promptPath: string;
  sessionName: string;
}

/**
 * Result from headless Claude invocation
 */
interface HeadlessResult {
  costUsd: number;
  durationMs: number;
  numTurns: number;
  result: string;
  sessionId: string;
}

/**
 * Options for logging headless results
 */
interface LogHeadlessOptions {
  extraContext?: string;
  logFile: string;
  output: ClaudeOutput;
  sessionName: string;
}

/**
 * Build prompt with optional context prefix
 */
function buildFullPrompt(content: string, extraContext?: string): string {
  if (extraContext !== undefined && extraContext !== "") {
    return `${extraContext}\n\n${content}`;
  }
  return content;
}

/**
 * Supervised mode: Spawn interactive chat session
 * Uses stdio: inherit so user can watch AND type if needed
 * When chat exits (user quits or Claude finishes), function returns
 */
function invokeClaudeChat(
  promptPath: string,
  sessionName: string,
  extraContext?: string,
): void {
  if (!existsSync(promptPath)) {
    console.error(`Prompt not found: ${promptPath}`);
    process.exit(1);
  }

  const promptContent = readFileSync(promptPath, "utf8");

  console.log(`Starting ${sessionName} session (supervised mode)...`);
  console.log(`Prompt: ${promptPath}`);
  if (extraContext !== undefined && extraContext !== "") {
    console.log(`Context: ${extraContext}`);
  }
  console.log();

  let fullPrompt = promptContent;
  if (extraContext !== undefined && extraContext !== "") {
    fullPrompt = `${extraContext}\n\n${promptContent}`;
  }

  // Chat mode (no -p), stdio: inherit so user can watch AND type
  const result = spawnSync(
    "claude",
    [
      "--append-system-prompt",
      fullPrompt,
      `Please begin the ${sessionName} session.`,
    ],
    { stdio: "inherit" },
  );

  if (result.error !== undefined) {
    console.error(`Failed to start Claude: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/**
 * Headless mode: Run Claude with -p and JSON output
 * Logs to file so user can see what happened
 * Returns parsed result for further processing
 */
function invokeClaudeHeadless(options: HeadlessOptions): HeadlessResult {
  const { extraContext, logFile, promptPath, sessionName } = options;

  if (!existsSync(promptPath)) {
    console.error(`Prompt not found: ${promptPath}`);
    process.exit(1);
  }

  const promptContent = readFileSync(promptPath, "utf8");
  const fullPrompt = buildFullPrompt(promptContent, extraContext);

  console.log(`Running ${sessionName} in headless mode...`);
  console.log(`Prompt: ${promptPath}`);
  console.log(`Log file: ${logFile}`);
  if (extraContext !== undefined && extraContext !== "") {
    console.log(`Context: ${extraContext}`);
  }
  console.log();

  // Headless mode: -p with JSON output (50MB buffer for large outputs)
  const result = spawnSync(
    "claude",
    [
      "-p",
      fullPrompt,
      "--dangerously-skip-permissions",
      "--output-format",
      "json",
    ],
    { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
  );

  if (result.error !== undefined) {
    console.error(`Failed to start Claude: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error("Claude headless invocation failed");
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }

  const output: ClaudeOutput = JSON.parse(result.stdout) as ClaudeOutput;
  logHeadlessResult({ extraContext, logFile, output, sessionName });

  console.log(`Session completed: ${output.session_id ?? "unknown"}`);
  console.log(
    `Duration: ${Math.round((output.duration_ms ?? 0) / 1000)}s | Turns: ${output.num_turns ?? 0} | Cost: $${output.total_cost_usd ?? 0}`,
  );
  console.log();

  return toHeadlessResult(output);
}

/**
 * Log headless session result to file
 */
function logHeadlessResult(options: LogHeadlessOptions): void {
  const { extraContext, logFile, output, sessionName } = options;
  const logDirectory = path.dirname(logFile);
  if (!existsSync(logDirectory)) {
    mkdirSync(logDirectory, { recursive: true });
  }

  const logEntry = {
    costUsd: output.total_cost_usd ?? 0,
    durationMs: output.duration_ms ?? 0,
    extraContext: extraContext ?? "",
    numTurns: output.num_turns ?? 0,
    result: output.result ?? "",
    sessionId: output.session_id ?? "",
    sessionName,
    timestamp: new Date().toISOString(),
  };
  appendFileSync(logFile, `${JSON.stringify(logEntry)}\n`);
}

/**
 * Transform Claude output to HeadlessResult
 */
function toHeadlessResult(output: ClaudeOutput): HeadlessResult {
  return {
    costUsd: output.total_cost_usd ?? 0,
    durationMs: output.duration_ms ?? 0,
    numTurns: output.num_turns ?? 0,
    result: output.result ?? "",
    sessionId: output.session_id ?? "",
  };
}

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
    .option(
      "-i, --interactive",
      "Pause between iterations (legacy, use --supervised)",
    )
    .option(
      "-s, --supervised",
      "Supervised mode: watch each iteration (default)",
    )
    .option("-H, --headless", "Headless mode: JSON output + file logging")
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
      // Legacy --interactive flag maps to supervised mode with pauses
      const interactive = options.interactive ? "true" : "false";
      const validateFirst = options.validateFirst ? "true" : "false";
      const permFlag = "--dangerously-skip-permissions";
      // Determine execution mode: headless, supervised, or supervised with pauses
      const mode = options.headless ? "headless" : "supervised";

      // Validate subtasks file exists
      if (!existsSync(subtasksPath)) {
        console.error(`Subtasks file not found: ${subtasksPath}`);
        process.exit(1);
      }

      try {
        execSync(
          `bash "${scriptPath}" "${subtasksPath}" "${options.maxIterations}" "${interactive}" "${validateFirst}" "${permFlag}" "${mode}"`,
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

// ralph plan stories - story planning (requires milestone)
planCommand.addCommand(
  new Command("stories")
    .description("Plan stories for a milestone")
    .requiredOption("--milestone <name>", "Milestone name to plan stories for")
    .option("-a, --auto", "Use auto mode (alias for --supervised)")
    .option("-s, --supervised", "Supervised mode: watch chat, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .action((options) => {
      const contextRoot = getContextRoot();

      // Determine if using auto prompt (non-interactive generation)
      const isAutoMode =
        options.auto === true ||
        options.supervised === true ||
        options.headless === true;
      const promptPath = getPromptPath(contextRoot, "stories", isAutoMode);
      const extraContext = `Planning stories for milestone: ${options.milestone}`;

      // Determine execution mode
      if (options.headless === true) {
        const logFile = path.join(contextRoot, "logs/ralph-plan-stories.jsonl");
        invokeClaudeHeadless({
          extraContext,
          logFile,
          promptPath,
          sessionName: "stories",
        });
      } else if (options.auto === true || options.supervised === true) {
        // Supervised mode (--auto or --supervised): user watches chat
        invokeClaudeChat(promptPath, "stories", extraContext);
      } else {
        // Interactive mode (default): full interactive session
        invokeClaude(promptPath, "stories", extraContext);
      }
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
    .option("-a, --auto", "Use auto mode (alias for --supervised)")
    .option("-s, --supervised", "Supervised mode: watch chat, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
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
          "  aaa ralph plan tasks --milestone <name> --supervised  # All stories in milestone",
        );
        process.exit(1);
      }
      if (hasStory && hasMilestone) {
        console.error("Error: Cannot specify both --story and --milestone");
        process.exit(1);
      }

      const contextRoot = getContextRoot();

      // Determine if using auto prompt
      const isAutoMode =
        options.auto === true ||
        options.supervised === true ||
        options.headless === true;

      // Milestone mode
      if (hasMilestone) {
        if (!isAutoMode) {
          console.error(
            "Error: --milestone requires --supervised or --headless mode",
          );
          console.log(
            "\nUsage: aaa ralph plan tasks --milestone <name> --supervised",
          );
          process.exit(1);
        }
        const promptPath = path.join(
          contextRoot,
          "context/workflows/ralph/planning/tasks-milestone.md",
        );
        const extraContext = `Generating tasks for all stories in milestone: ${options.milestone}`;

        if (options.headless === true) {
          const logFile = path.join(contextRoot, "logs/ralph-plan-tasks.jsonl");
          invokeClaudeHeadless({
            extraContext,
            logFile,
            promptPath,
            sessionName: "tasks-milestone",
          });
        } else {
          invokeClaudeChat(promptPath, "tasks-milestone", extraContext);
        }
        return;
      }

      // Story mode
      const promptPath = getPromptPath(contextRoot, "tasks", isAutoMode);
      const extraContext = `Planning tasks for story: ${options.story}`;

      if (options.headless === true) {
        const logFile = path.join(contextRoot, "logs/ralph-plan-tasks.jsonl");
        invokeClaudeHeadless({
          extraContext,
          logFile,
          promptPath,
          sessionName: "tasks",
        });
      } else if (options.auto === true || options.supervised === true) {
        invokeClaudeChat(promptPath, "tasks", extraContext);
      } else {
        invokeClaude(promptPath, "tasks", extraContext);
      }
    }),
);

// ralph plan subtasks - subtask generation (default: supervised)
planCommand.addCommand(
  new Command("subtasks")
    .description("Generate subtasks for a task")
    .requiredOption("--task <id>", "Task ID to generate subtasks for")
    .option(
      "-s, --supervised",
      "Supervised mode: watch chat, can intervene (default)",
    )
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .action((options) => {
      const contextRoot = getContextRoot();
      // Subtasks always uses auto prompt (never interactive per VISION.md)
      const promptPath = getPromptPath(contextRoot, "subtasks", true);
      const extraContext = `Generating subtasks for task: ${options.task}`;

      // Determine execution mode (default to supervised for subtasks)
      if (options.headless === true) {
        const logFile = path.join(
          contextRoot,
          "logs/ralph-plan-subtasks.jsonl",
        );
        invokeClaudeHeadless({
          extraContext,
          logFile,
          promptPath,
          sessionName: "subtasks",
        });
      } else {
        // Default: supervised mode (user watches)
        invokeClaudeChat(promptPath, "subtasks", extraContext);
      }
    }),
);

ralphCommand.addCommand(planCommand);

// =============================================================================
// ralph review - review planning artifacts
// =============================================================================

const reviewCommand = new Command("review").description(
  "Review planning artifacts for quality, gaps, and alignment",
);

// Helper to get review prompt path
function getReviewPromptPath(
  contextRoot: string,
  reviewType: string,
  isGapAnalysis: boolean,
): string {
  const suffix = isGapAnalysis ? "gap-auto" : "review-auto";
  return path.join(
    contextRoot,
    `context/workflows/ralph/review/${reviewType}-${suffix}.md`,
  );
}

// ralph review stories <milestone> - review stories for a milestone
// Note: All review commands are supervised-only (no --headless) because
// review is inherently about dialogue and feedback. See VISION.md Section 3.1.
reviewCommand.addCommand(
  new Command("stories")
    .description("Review stories for a milestone (supervised only)")
    .argument("<milestone>", "Milestone name to review stories for")
    .action((milestone) => {
      const contextRoot = getContextRoot();
      const promptPath = getReviewPromptPath(contextRoot, "stories", false);
      const extraContext = `Reviewing stories for milestone: ${milestone}`;
      invokeClaudeChat(promptPath, "stories-review", extraContext);
    }),
);

// ralph review roadmap - review roadmap quality
// Note: All review commands are supervised-only (no --headless).
reviewCommand.addCommand(
  new Command("roadmap")
    .description(
      "Review roadmap milestones for quality and completeness (supervised only)",
    )
    .action(() => {
      const contextRoot = getContextRoot();
      const promptPath = getReviewPromptPath(contextRoot, "roadmap", false);
      const extraContext = "Reviewing roadmap for quality and completeness";
      invokeClaudeChat(promptPath, "roadmap-review", extraContext);
    }),
);

// ralph review gap - gap analysis subcommand group
const gapCommand = new Command("gap").description(
  "Cold analysis of planning artifacts for gaps and blind spots",
);

// ralph review gap roadmap - roadmap gap analysis
// Note: Gap analysis is supervised-only (no --headless) because it produces
// questions requiring human judgment. See VISION.md Section 3.1.
gapCommand.addCommand(
  new Command("roadmap")
    .description(
      "Cold analysis of roadmap for gaps and risks (supervised only)",
    )
    .action(() => {
      const contextRoot = getContextRoot();
      const promptPath = getReviewPromptPath(contextRoot, "roadmap", true);
      const extraContext = "Gap analysis of roadmap for risks and blind spots";
      invokeClaudeChat(promptPath, "roadmap-gap", extraContext);
    }),
);

// ralph review gap stories <milestone> - stories gap analysis
// Note: Gap analysis is supervised-only (no --headless) because it produces
// questions requiring human judgment. See VISION.md Section 3.1.
gapCommand.addCommand(
  new Command("stories")
    .description(
      "Cold analysis of stories for gaps and risks (supervised only)",
    )
    .argument("<milestone>", "Milestone name to analyze stories for")
    .action((milestone) => {
      const contextRoot = getContextRoot();
      const promptPath = getReviewPromptPath(contextRoot, "stories", true);
      const extraContext = `Gap analysis of stories for milestone: ${milestone}`;
      invokeClaudeChat(promptPath, "stories-gap", extraContext);
    }),
);

reviewCommand.addCommand(gapCommand);

// ralph review tasks <story-id> - coming soon
reviewCommand.addCommand(
  new Command("tasks")
    .description("Review tasks for a story (coming soon)")
    .argument("<story-id>", "Story ID to review tasks for")
    .action((storyId) => {
      console.log(`Task review for story ${storyId} coming soon.`);
      console.log("\nAvailable review commands:");
      console.log("  aaa ralph review stories <milestone>      Review stories");
      console.log("  aaa ralph review roadmap                  Review roadmap");
      console.log(
        "  aaa ralph review gap roadmap              Gap analysis of roadmap",
      );
      console.log(
        "  aaa ralph review gap stories <milestone>  Gap analysis of stories",
      );
    }),
);

ralphCommand.addCommand(reviewCommand);

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

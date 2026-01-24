import { Command } from "@commander-js/extra-typings";
import { discoverMilestones, getMilestonePaths } from "@lib/milestones";
import { findProjectRoot, getContextRoot } from "@tools/utils/paths";
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import path from "node:path";

import runBuild from "./build";
import { type CalibrateSubcommand, runCalibrate } from "./calibrate";
import {
  buildPrompt,
  invokeClaudeChat as invokeClaudeChatFromModule,
  invokeClaudeHeadless as invokeClaudeHeadlessFromModule,
} from "./claude";
import { runStatus } from "./status";

/**
 * Resolve and validate milestone - exit with helpful error if not found
 */
function requireMilestone(input: string): string {
  const resolved = resolveMilestonePath(input);
  if (resolved === null) {
    const milestones = discoverMilestones();
    console.error(`Error: milestone not found: ${input}`);
    if (milestones.length > 0) {
      console.error(`Available: ${milestones.map((m) => m.slug).join(", ")}`);
    }
    process.exit(1);
  }
  return resolved;
}

/**
 * Resolve and validate story - exit with helpful error if not found
 */
function requireStory(input: string): string {
  const resolved = resolveStoryPath(input);
  if (resolved === null) {
    console.error(`Error: story not found: ${input}`);
    console.error("Try: full path or slug like 001-feature-name");
    process.exit(1);
  }
  return resolved;
}

/**
 * Resolve and validate task - exit with helpful error if not found
 */
function requireTask(input: string): string {
  const resolved = resolveTaskPath(input);
  if (resolved === null) {
    console.error(`Error: task not found: ${input}`);
    console.error("Try: full path or slug like 001-task-name");
    process.exit(1);
  }
  return resolved;
}

/**
 * Resolve milestone path from slug or full path.
 * - If path exists as-is, return it
 * - Otherwise try to resolve as milestone slug
 * - Returns null if not found
 */
function resolveMilestonePath(input: string): null | string {
  if (existsSync(input)) return input;

  const paths = getMilestonePaths(input);
  return paths?.root ?? null;
}

/**
 * Resolve story path from slug or full path.
 * Searches: docs/planning/stories/, docs/planning/milestones/{slug}/stories/
 */
function resolveStoryPath(input: string): null | string {
  if (existsSync(input)) return input;

  const projectRoot = findProjectRoot();
  if (projectRoot === null) return null;

  const slug = input.endsWith(".md") ? input.replace(/\.md$/, "") : input;

  // Try global stories
  const globalPath = path.join(
    projectRoot,
    "docs/planning/stories",
    `${slug}.md`,
  );
  if (existsSync(globalPath)) return globalPath;

  // Try milestone stories
  const milestonesDirectory = path.join(
    projectRoot,
    "docs/planning/milestones",
  );
  if (!existsSync(milestonesDirectory)) return null;

  try {
    const directories = readdirSync(milestonesDirectory, {
      withFileTypes: true,
    }).filter((d) => d.isDirectory());
    for (const m of directories) {
      const storyPath = path.join(
        milestonesDirectory,
        m.name,
        "stories",
        `${slug}.md`,
      );
      if (existsSync(storyPath)) return storyPath;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Resolve task path from slug or full path.
 * Searches: docs/planning/tasks/, docs/planning/milestones/{slug}/tasks/
 */
function resolveTaskPath(input: string): null | string {
  if (existsSync(input)) return input;

  const projectRoot = findProjectRoot();
  if (projectRoot === null) return null;

  const slug = input.endsWith(".md") ? input.replace(/\.md$/, "") : input;

  // Try global tasks
  const globalPath = path.join(
    projectRoot,
    "docs/planning/tasks",
    `${slug}.md`,
  );
  if (existsSync(globalPath)) return globalPath;

  // Try milestone tasks
  const milestonesDirectory = path.join(
    projectRoot,
    "docs/planning/milestones",
  );
  if (!existsSync(milestonesDirectory)) return null;

  try {
    const directories = readdirSync(milestonesDirectory, {
      withFileTypes: true,
    }).filter((d) => d.isDirectory());
    for (const m of directories) {
      const taskPath = path.join(
        milestonesDirectory,
        m.name,
        "tasks",
        `${slug}.md`,
      );
      if (existsSync(taskPath)) return taskPath;
    }
  } catch {
    /* ignore */
  }
  return null;
}

const DEFAULT_SUBTASKS_PATH = "subtasks.json";

// =============================================================================
// Three-Mode Execution System
// See: @context/blocks/construct/ralph-patterns.md
// See: @docs/planning/VISION.md Section 3.1
// =============================================================================

/**
 * Options for high-level invokeClaudeHeadlessWithLogging
 */
interface HeadlessWithLoggingOptions {
  extraContext?: string;
  logFile: string;
  promptPath: string;
  sessionName: string;
}

/**
 * Result from headless Claude invocation with logging
 */
interface HeadlessWithLoggingResult {
  costUsd: number;
  durationMs: number;
  numTurns: number;
  result: string;
  sessionId: string;
}

/**
 * Get planning log file path in target project (not all-agents)
 * Falls back to contextRoot if not in a git repo
 */
function getPlanningLogPath(contextRoot: string): string {
  const projectRoot = findProjectRoot() ?? contextRoot;
  return path.join(projectRoot, "logs/planning.jsonl");
}

/**
 * Supervised mode wrapper: Spawn interactive chat session
 * Uses the claude.ts module function and exits process on failure.
 */
function invokeClaudeChat(
  promptPath: string,
  sessionName: string,
  extraContext?: string,
): void {
  const result = invokeClaudeChatFromModule(
    promptPath,
    sessionName,
    extraContext,
  );

  if (!result.success && !result.interrupted) {
    process.exit(result.exitCode ?? 1);
  }
}

/**
 * Headless mode wrapper: Run Claude with JSON output and file logging
 * Reads prompt from file, invokes Claude headless, and logs results.
 * Exits process on failure.
 */
function invokeClaudeHeadless(
  options: HeadlessWithLoggingOptions,
): HeadlessWithLoggingResult {
  const { extraContext, logFile, promptPath, sessionName } = options;

  if (!existsSync(promptPath)) {
    console.error(`Prompt not found: ${promptPath}`);
    process.exit(1);
  }

  const promptContent = readFileSync(promptPath, "utf8");
  const fullPrompt = buildPrompt(promptContent, extraContext);

  console.log(`Running ${sessionName} in headless mode...`);
  console.log(`Prompt: ${promptPath}`);
  console.log(`Log file: ${logFile}`);
  if (extraContext !== undefined && extraContext !== "") {
    console.log(`Context: ${extraContext}`);
  }
  console.log();

  const result = invokeClaudeHeadlessFromModule({ prompt: fullPrompt });

  if (result === null) {
    console.error("Claude headless invocation failed or was interrupted");
    process.exit(1);
  }

  // Log to file
  const logDirectory = path.dirname(logFile);
  if (!existsSync(logDirectory)) {
    mkdirSync(logDirectory, { recursive: true });
  }

  const logEntry = {
    costUsd: result.cost,
    durationMs: result.duration,
    extraContext: extraContext ?? "",
    result: result.result,
    sessionId: result.sessionId,
    sessionName,
    timestamp: new Date().toISOString(),
  };
  appendFileSync(logFile, `${JSON.stringify(logEntry)}\n`);

  console.log(`Session completed: ${result.sessionId || "unknown"}`);
  console.log(
    `Duration: ${Math.round(result.duration / 1000)}s | Cost: $${result.cost}`,
  );
  console.log();

  return {
    costUsd: result.cost,
    durationMs: result.duration,
    // numTurns not available from the module's HeadlessResult
    numTurns: 0,
    result: result.result,
    sessionId: result.sessionId,
  };
}

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
    .option("--max-iterations <n>", "Max iterations (0 = unlimited)", "0")
    .option(
      "--calibrate-every <n>",
      "Run calibration every N iterations (0 = disabled)",
      "0",
    )
    .option("--validate-first", "Run pre-build validation before building")
    .action(async (options) => {
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

      // Resolve subtasks path
      const subtasksPath = path.resolve(options.subtasks);

      // Determine execution mode: headless or supervised (default)
      const mode = options.headless === true ? "headless" : "supervised";

      // Map CLI options to BuildOptions and call runBuild()
      await runBuild(
        {
          calibrateEvery: Number.parseInt(options.calibrateEvery, 10),
          interactive: options.interactive === true,
          maxIterations: Number.parseInt(options.maxIterations, 10),
          mode,
          subtasksPath,
          validateFirst: options.validateFirst === true,
        },
        contextRoot,
      );
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
  // --permission-mode bypassPermissions prevents inheriting plan mode from user settings
  const result = spawnSync(
    "claude",
    [
      "--permission-mode",
      "bypassPermissions",
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
    .requiredOption(
      "--milestone <path>",
      "Milestone file path to plan stories for",
    )
    .option("-s, --supervised", "Supervised mode: watch chat, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .action((options) => {
      const contextRoot = getContextRoot();
      const milestonePath = requireMilestone(options.milestone);

      // Determine if using auto prompt (non-interactive generation)
      const isAutoMode =
        options.supervised === true || options.headless === true;
      const promptPath = getPromptPath(contextRoot, "stories", isAutoMode);
      const extraContext = `Planning stories for milestone: ${milestonePath}`;

      // Determine execution mode
      if (options.headless === true) {
        const logFile = getPlanningLogPath(contextRoot);
        invokeClaudeHeadless({
          extraContext,
          logFile,
          promptPath,
          sessionName: "stories",
        });
      } else if (options.supervised === true) {
        // Supervised mode: user watches chat
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
    .option("--story <path>", "Story file path to plan tasks for")
    .option(
      "--milestone <path>",
      "Milestone file path to plan tasks for (all stories)",
    )
    .option("-s, --supervised", "Supervised mode: watch chat, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .action((options) => {
      const hasStory = options.story !== undefined;
      const hasMilestone = options.milestone !== undefined;

      // Validate: require exactly one of --story or --milestone
      if (!hasStory && !hasMilestone) {
        console.error(
          "Error: Must specify either --story <path> or --milestone <path>",
        );
        console.log("\nUsage:");
        console.log(
          "  aaa ralph plan tasks --story <path>      # Single story",
        );
        console.log(
          "  aaa ralph plan tasks --milestone <path> --supervised  # All stories in milestone",
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
        options.supervised === true || options.headless === true;

      // Milestone mode
      if (hasMilestone && options.milestone !== undefined) {
        if (!isAutoMode) {
          console.error(
            "Error: --milestone requires --supervised or --headless mode",
          );
          console.log(
            "\nUsage: aaa ralph plan tasks --milestone <path> --supervised",
          );
          process.exit(1);
        }

        const milestonePath = requireMilestone(options.milestone);

        const promptPath = path.join(
          contextRoot,
          "context/workflows/ralph/planning/tasks-milestone.md",
        );
        const extraContext = `Generating tasks for all stories in milestone: ${milestonePath}`;

        if (options.headless === true) {
          const logFile = getPlanningLogPath(contextRoot);
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
      // At this point we know hasStory is true (not hasMilestone), so options.story is defined
      if (options.story === undefined) {
        // This should never happen due to earlier validation, but satisfies TypeScript
        process.exit(1);
      }
      const storyPath = requireStory(options.story);

      const promptPath = getPromptPath(contextRoot, "tasks", isAutoMode);
      const extraContext = `Planning tasks for story: ${storyPath}`;

      if (options.headless === true) {
        const logFile = getPlanningLogPath(contextRoot);
        invokeClaudeHeadless({
          extraContext,
          logFile,
          promptPath,
          sessionName: "tasks",
        });
      } else if (options.supervised === true) {
        invokeClaudeChat(promptPath, "tasks", extraContext);
      } else {
        invokeClaude(promptPath, "tasks", extraContext);
      }
    }),
);

// ralph plan subtasks - subtask generation (default: supervised)
// Requires exactly one of: --task, --story, or --milestone to specify scope
planCommand.addCommand(
  new Command("subtasks")
    .description(
      "Generate subtasks for a task, story, or milestone (requires one scope flag)",
    )
    .option("--task <path>", "Task file path to generate subtasks for")
    .option("--story <path>", "Story path to generate subtasks for")
    .option("--milestone <path>", "Milestone path to generate subtasks for")
    .option(
      "-s, --supervised",
      "Supervised mode: watch chat, can intervene (default)",
    )
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .action((options) => {
      const hasTask = options.task !== undefined;
      const hasStory = options.story !== undefined;
      const hasMilestone = options.milestone !== undefined;
      const scopeCount = [hasTask, hasStory, hasMilestone].filter(
        Boolean,
      ).length;

      // Validate: require exactly one scope flag
      if (scopeCount === 0) {
        console.error(
          "Error: Must specify exactly one of --task, --story, or --milestone",
        );
        console.log("\nUsage:");
        console.log(
          "  aaa ralph plan subtasks --task <path>       # Single task",
        );
        console.log(
          "  aaa ralph plan subtasks --story <path>      # All tasks in story",
        );
        console.log(
          "  aaa ralph plan subtasks --milestone <path>  # All tasks in milestone",
        );
        process.exit(1);
      }
      if (scopeCount > 1) {
        console.error(
          "Error: Cannot specify multiple scope flags (--task, --story, --milestone)",
        );
        process.exit(1);
      }

      const contextRoot = getContextRoot();
      // Subtasks always uses auto prompt (never interactive per VISION.md)
      const promptPath = getPromptPath(contextRoot, "subtasks", true);

      // Resolve and validate paths (fail fast with helpful errors)
      const taskPath =
        hasTask && options.task !== undefined
          ? requireTask(options.task)
          : null;
      const storyPath =
        hasStory && options.story !== undefined
          ? requireStory(options.story)
          : null;
      const milestonePath =
        hasMilestone && options.milestone !== undefined
          ? requireMilestone(options.milestone)
          : null;

      // Helper to invoke Claude based on mode
      function invoke(extraContext: string): void {
        if (options.headless === true) {
          const logFile = getPlanningLogPath(contextRoot);
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
      }

      // Handle each scope type (exactly one is true after validation)
      if (taskPath !== null) {
        invoke(`Generating subtasks for task: ${taskPath}`);
        return;
      }
      if (storyPath !== null) {
        invoke(`Generating subtasks for story: ${storyPath}`);
        return;
      }
      // hasMilestone must be true at this point
      if (milestonePath !== null) {
        invoke(`Generating subtasks for milestone: ${milestonePath}`);
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

// ralph review stories --milestone <path> - review stories for a milestone
// Note: All review commands are supervised-only (no --headless) because
// review is inherently about dialogue and feedback. See VISION.md Section 3.1.
reviewCommand.addCommand(
  new Command("stories")
    .description("Review stories for a milestone (supervised only)")
    .requiredOption(
      "--milestone <path>",
      "Milestone path to review stories for",
    )
    .action((options) => {
      const contextRoot = getContextRoot();
      const promptPath = getReviewPromptPath(contextRoot, "stories", false);
      const extraContext = `Reviewing stories for milestone: ${options.milestone}`;
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

// ralph review gap stories --milestone <path> - stories gap analysis
// Note: Gap analysis is supervised-only (no --headless) because it produces
// questions requiring human judgment. See VISION.md Section 3.1.
gapCommand.addCommand(
  new Command("stories")
    .description(
      "Cold analysis of stories for gaps and risks (supervised only)",
    )
    .requiredOption(
      "--milestone <path>",
      "Milestone path to analyze stories for",
    )
    .action((options) => {
      const contextRoot = getContextRoot();
      const promptPath = getReviewPromptPath(contextRoot, "stories", true);
      const extraContext = `Gap analysis of stories for milestone: ${options.milestone}`;
      invokeClaudeChat(promptPath, "stories-gap", extraContext);
    }),
);

reviewCommand.addCommand(gapCommand);

// ralph review subtasks --subtasks <path> - review subtask queue
// Note: All review commands are supervised-only (no --headless) because
// review is inherently about dialogue and feedback. See VISION.md Section 3.1.
reviewCommand.addCommand(
  new Command("subtasks")
    .description("Review subtask queue before building (supervised only)")
    .requiredOption("--subtasks <path>", "Subtasks file path to review")
    .action((options) => {
      const contextRoot = getContextRoot();
      const promptPath = path.join(
        contextRoot,
        "context/workflows/ralph/review/subtasks-review-auto.md",
      );
      const extraContext = `Reviewing subtasks file: ${options.subtasks}`;
      invokeClaudeChat(promptPath, "subtasks-review", extraContext);
    }),
);

ralphCommand.addCommand(reviewCommand);

// ralph status - display build status
ralphCommand.addCommand(
  new Command("status")
    .description("Display current build status and progress")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .action((options) => {
      const subtasksPath = options.subtasks;
      const contextRoot = getContextRoot();

      // Resolve subtasks path: if relative and not found at cwd, try relative to context root
      let resolvedSubtasksPath = subtasksPath;
      if (!path.isAbsolute(subtasksPath) && !existsSync(subtasksPath)) {
        const rootRelativePath = path.join(contextRoot, subtasksPath);
        if (existsSync(rootRelativePath)) {
          resolvedSubtasksPath = rootRelativePath;
        }
      }

      runStatus(resolvedSubtasksPath, contextRoot);
    }),
);

// ralph milestones - list available milestones
ralphCommand.addCommand(
  new Command("milestones")
    .description("List available milestones from roadmap")
    .option("--json", "Output as JSON")
    .action((options) => {
      const milestones = discoverMilestones();

      if (options.json === true) {
        console.log(JSON.stringify({ milestones }, null, 2));
        return;
      }

      console.log("Available milestones:");
      for (const m of milestones) {
        console.log(`  ${m.slug} - ${m.name}`);
      }
      if (milestones.length === 0) {
        console.log("  (none found in docs/planning/roadmap.md)");
      }
    }),
);

// ralph calibrate - run calibration checks
// Uses real Commander subcommands for proper --help support

const calibrateCommand = new Command("calibrate").description(
  "Run calibration checks on completed subtasks",
);

/**
 * Helper to resolve subtasks path relative to context root if not found at cwd
 */
function resolveCalibrateSubtasksPath(
  subtasksPath: string,
  contextRoot: string,
): string {
  if (!path.isAbsolute(subtasksPath) && !existsSync(subtasksPath)) {
    const rootRelativePath = path.join(contextRoot, subtasksPath);
    if (existsSync(rootRelativePath)) {
      return rootRelativePath;
    }
  }
  return subtasksPath;
}

/**
 * Helper to run calibrate subcommand and exit on failure
 */
function runCalibrateSubcommand(
  subcommand: CalibrateSubcommand,
  options: { force?: boolean; review?: boolean; subtasks: string },
): void {
  const contextRoot = getContextRoot();
  const resolvedSubtasksPath = resolveCalibrateSubtasksPath(
    options.subtasks,
    contextRoot,
  );

  const didSucceed = runCalibrate(subcommand, {
    contextRoot,
    force: options.force,
    review: options.review,
    subtasksPath: resolvedSubtasksPath,
  });

  if (!didSucceed) {
    process.exit(1);
  }
}

// ralph calibrate intention - check for intention drift
calibrateCommand.addCommand(
  new Command("intention")
    .description("Check for intention drift (code vs planning docs)")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option("--force", "Skip approval even if config says 'suggest'")
    .option("--review", "Require approval even if config says 'autofix'")
    .action((options) => {
      runCalibrateSubcommand("intention", options);
    }),
);

// ralph calibrate technical - check for technical drift
calibrateCommand.addCommand(
  new Command("technical")
    .description("Check for technical drift (code quality issues)")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option("--force", "Skip approval even if config says 'suggest'")
    .option("--review", "Require approval even if config says 'autofix'")
    .action((options) => {
      runCalibrateSubcommand("technical", options);
    }),
);

// ralph calibrate improve - run self-improvement analysis
calibrateCommand.addCommand(
  new Command("improve")
    .description("Run self-improvement analysis on session logs")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option("--force", "Skip approval even if config says 'suggest'")
    .option("--review", "Require approval even if config says 'autofix'")
    .action((options) => {
      runCalibrateSubcommand("improve", options);
    }),
);

// ralph calibrate all - run all calibration checks
calibrateCommand.addCommand(
  new Command("all")
    .description("Run all calibration checks sequentially")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option("--force", "Skip approval even if config says 'suggest'")
    .option("--review", "Require approval even if config says 'autofix'")
    .action((options) => {
      runCalibrateSubcommand("all", options);
    }),
);

ralphCommand.addCommand(calibrateCommand);

export default ralphCommand;

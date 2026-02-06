import { Command } from "@commander-js/extra-typings";
import { discoverMilestones, getMilestonePaths } from "@lib/milestones";
import { findProjectRoot, getContextRoot } from "@tools/utils/paths";
import chalk from "chalk";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import path from "node:path";

import type { ProviderType } from "./providers/types";

import { runArchive } from "./archive";
import runBuild from "./build";
import { type CalibrateSubcommand, runCalibrate } from "./calibrate";
import { runCascadeFrom, validateCascadeTarget } from "./cascade";
import {
  countSubtasksInFile,
  discoverTasksFromMilestone,
  getExistingTaskReferences,
  getPlanningLogPath as getMilestonePlanningLogPath,
  loadSubtasksFile,
  loadTimeoutConfig,
  ORPHAN_MILESTONE_ROOT,
} from "./config";
import {
  type PlanSubtasksSummaryData,
  renderInvocationHeader,
  renderPlanSubtasksSummary,
} from "./display";
import {
  buildPrompt,
  invokeClaudeChat as invokeClaudeChatFromModule,
  invokeClaudeHeadlessAsync as invokeClaudeHeadlessAsyncFromModule,
} from "./providers/claude";
import { runStatus } from "./status";

/**
 * Extract task reference from a task path
 *
 * The task reference is the filename without the .md extension.
 * For example: "TASK-008-approval-types.md" -> "TASK-008-approval-types"
 *
 * @param taskPath - Full path to the task file
 * @returns The task reference (filename without extension)
 */
function extractTaskReference(taskPath: string): string {
  return path.basename(taskPath, ".md");
}

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
 * Resolve output directory from --output-dir flag or milestone path.
 * Accepts either a path or a milestone name (auto-resolved).
 */
function resolveOutputDirectory(
  outputDirectory: string | undefined,
  milestonePath: null | string | undefined,
): string {
  // Priority 1: Explicit --output-dir
  if (outputDirectory !== undefined) {
    // Check if it's a milestone name (no slashes) - try to resolve it
    if (!outputDirectory.includes("/") && !outputDirectory.includes("\\")) {
      const resolved = resolveMilestonePath(outputDirectory);
      if (resolved !== null) return resolved;
    }
    // Otherwise treat as literal path
    return outputDirectory;
  }

  // Priority 2: Milestone source implies output location
  if (milestonePath !== undefined && milestonePath !== null) {
    return milestonePath;
  }

  // Priority 3: Default fallback
  const projectRoot = findProjectRoot() ?? process.cwd();
  return path.join(projectRoot, "docs/planning");
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
  /** Size mode for styled pre-execution display (e.g., 'small', 'medium', 'large') */
  sizeMode?: string;
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
 * Get planning log file path for a milestone
 *
 * When a milestone path is provided, logs are written to:
 *   {milestonePath}/logs/{YYYY-MM-DD}.jsonl
 *
 * When no milestone is specified, falls back to orphan location:
 *   docs/planning/milestones/_orphan/logs/{YYYY-MM-DD}.jsonl
 *
 * @param milestonePath - Optional path to the milestone root directory
 * @returns Full path to the daily planning JSONL log file
 */
function getPlanningLogPath(milestonePath?: string): string {
  if (milestonePath !== undefined && milestonePath !== "") {
    return getMilestonePlanningLogPath(milestonePath);
  }
  // Fall back to orphan location when no milestone is specified
  const projectRoot = findProjectRoot() ?? process.cwd();
  return getMilestonePlanningLogPath(
    path.join(projectRoot, ORPHAN_MILESTONE_ROOT),
  );
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
async function invokeClaudeHeadless(
  options: HeadlessWithLoggingOptions,
): Promise<HeadlessWithLoggingResult> {
  const { extraContext, logFile, promptPath, sessionName, sizeMode } = options;

  if (!existsSync(promptPath)) {
    console.error(`Prompt not found: ${promptPath}`);
    process.exit(1);
  }

  const promptContent = readFileSync(promptPath, "utf8");
  const fullPrompt = buildPrompt(promptContent, extraContext);

  // Styled pre-execution header
  console.log(renderInvocationHeader("headless"));
  console.log();
  console.log(`${chalk.dim("Source:")}  ${chalk.cyan(promptPath)}`);
  if (sizeMode !== undefined) {
    console.log(`${chalk.dim("Size:")}    ${chalk.yellow(sizeMode)}`);
  }
  console.log(`${chalk.dim("Log:")}     ${logFile}`);
  console.log();

  const timeoutConfig = loadTimeoutConfig();
  const result = await invokeClaudeHeadlessAsyncFromModule({
    gracePeriodMs: timeoutConfig.graceSeconds * 1000,
    prompt: fullPrompt,
    stallTimeoutMs: timeoutConfig.stallMinutes * 60 * 1000,
    timeout: timeoutConfig.hardMinutes * 60 * 1000,
  });

  if (result === null) {
    console.error(
      "Claude headless invocation failed, was interrupted, or timed out",
    );
    process.exit(1);
  }

  // Log to file
  const logDirectory = path.dirname(logFile);
  if (!existsSync(logDirectory)) {
    mkdirSync(logDirectory, { recursive: true });
  }

  const logEntry = {
    costUsd: result.costUsd,
    durationMs: result.durationMs,
    extraContext: extraContext ?? "",
    result: result.result,
    sessionId: result.sessionId,
    sessionName,
    timestamp: new Date().toISOString(),
    type: "planning" as const,
  };
  appendFileSync(logFile, `${JSON.stringify(logEntry)}\n`);

  // Session ID useful for debugging; duration/cost now shown in styled summary boxes
  console.log(`Session: ${result.sessionId || "unknown"}`);

  return {
    costUsd: result.costUsd,
    durationMs: result.durationMs,
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
    .option(
      "-S, --skip-summary",
      "Skip Haiku summary generation in headless mode",
    )
    .option("-q, --quiet", "Suppress terminal summary output")
    .option("--max-iterations <n>", "Max iterations (0 = unlimited)", "0")
    .option(
      "--calibrate-every <n>",
      "Run calibration every N iterations (0 = disabled)",
      "0",
    )
    .option("--validate-first", "Run pre-build validation before building")
    .option("--provider <name>", "AI provider to use (default: claude)")
    .option("--model <name>", "Model to use (validated against model registry)")
    .option(
      "--cascade <target>",
      "Continue to target level after build completes (calibrate)",
    )
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

      // Validate cascade target early (before running build)
      if (options.cascade !== undefined) {
        const validationError = validateCascadeTarget("build", options.cascade);
        if (validationError !== null) {
          console.error(`Error: ${validationError}`);
          process.exit(1);
        }
      }

      // Map CLI options to BuildOptions and call runBuild()
      await runBuild(
        {
          calibrateEvery: Number.parseInt(options.calibrateEvery, 10),
          interactive: options.interactive === true,
          maxIterations: Number.parseInt(options.maxIterations, 10),
          mode,
          model: options.model,
          provider: options.provider as ProviderType,
          quiet: options.quiet === true,
          skipSummary: options.skipSummary === true,
          subtasksPath,
          validateFirst: options.validateFirst === true,
        },
        contextRoot,
      );

      // Handle cascade if requested (after build completes successfully)
      if (options.cascade !== undefined) {
        console.log(`\nCascading from build to ${options.cascade}...\n`);
        const result = await runCascadeFrom("build", options.cascade, {
          contextRoot,
          subtasksPath,
        });

        if (!result.success) {
          console.error(`Cascade failed: ${result.error}`);
          if (result.stoppedAt !== null) {
            console.error(`Stopped at: ${result.stoppedAt}`);
          }
          process.exit(1);
        }
      }
    }),
);

// ralph plan - interactive planning commands
const planCommand = new Command("plan").description(
  "Planning tools for vision, roadmap, stories, tasks, and subtasks",
);

/** Options for cascade execution helper */
interface HandleCascadeOptions {
  /** Run calibration every N build iterations during cascade (0 = disabled) */
  calibrateEvery?: number;
  cascadeTarget: string;
  contextRoot: string;
  fromLevel: string;
  resolvedMilestonePath: null | string;
  /** Override subtasks path (used when different from milestone default) */
  subtasksPath?: string;
}

/** Options for running subtasks in headless mode */
interface RunSubtasksHeadlessOptions {
  beforeCount: number;
  extraContext: string;
  hasMilestone: boolean;
  hasStory: boolean;
  milestone: string | undefined;
  outputDirectory: string | undefined;
  promptPath: string;
  resolvedMilestonePath: null | string | undefined;
  sizeMode: "large" | "medium" | "small";
  skippedTasks: Array<string>;
  sourceInfo: PlanSubtasksSummaryData["source"];
  storyRef: string | undefined;
}

/** Result of subtasks pre-check for --milestone and --story modes */
interface SubtasksPreCheckResult {
  /** Count of subtasks before Claude invocation */
  beforeCount: number;
  /** Whether to skip entirely (all tasks already have subtasks) */
  shouldSkip: boolean;
  /** Array of taskRefs that were skipped */
  skippedTasks: Array<string>;
  /** Total number of tasks discovered */
  totalTasks: number;
}

// Helper type for subtasks source context
interface SubtasksSourceContext {
  contextParts: Array<string>;
  sourceInfo: PlanSubtasksSummaryData["source"];
}

// Helper type for subtasks source flags
interface SubtasksSourceFlags {
  hasFile: boolean;
  hasMilestone: boolean;
  hasReview: boolean;
  hasStory: boolean;
  hasTask: boolean;
  hasText: boolean;
}

/** Options for tasks milestone mode execution */
interface TasksMilestoneOptions {
  contextRoot: string;
  isAutoMode: boolean;
  isHeadless: boolean;
  milestone: string;
}

/** Options for tasks source mode execution */
interface TasksSourceOptions {
  contextRoot: string;
  file: string | undefined;
  hasFile: boolean;
  isHeadless: boolean;
  isSupervised: boolean;
  text: string | undefined;
}

/** Options for tasks story mode execution */
interface TasksStoryOptions {
  contextRoot: string;
  isAutoMode: boolean;
  isHeadless: boolean;
  isSupervised: boolean;
  story: string;
}

// Helper to build subtasks context and source info
function buildSubtasksSourceContext(
  flags: SubtasksSourceFlags,
  options: {
    file?: string;
    milestone?: string;
    resolvedMilestonePath?: null | string;
    story?: string;
    task?: string;
    text?: string;
  },
): SubtasksSourceContext {
  const contextParts: Array<string> = [];
  let sourceInfo: PlanSubtasksSummaryData["source"] = {
    text: "",
    type: "text",
  };

  if (flags.hasMilestone && options.milestone !== undefined) {
    contextParts.push(
      `Generating subtasks for all tasks in milestone: ${options.milestone}`,
    );
    contextParts.push(`Milestone path: ${options.resolvedMilestonePath}`);
    sourceInfo = { path: options.milestone, type: "file" };
  } else if (flags.hasStory && options.story !== undefined) {
    contextParts.push(
      `Generating subtasks for all tasks in story: ${options.story}`,
    );
    sourceInfo = { path: options.story, type: "file" };
  } else if (flags.hasTask && options.task !== undefined) {
    const taskPath = requireTask(options.task);
    contextParts.push(`Generating subtasks for task: ${taskPath}`);
    sourceInfo = { path: taskPath, type: "file" };
  } else if (flags.hasReview) {
    contextParts.push(
      "Generating subtasks from review diary: logs/reviews.jsonl",
    );
    sourceInfo = { path: "logs/reviews.jsonl", type: "review" };
  } else if (flags.hasFile && options.file !== undefined) {
    contextParts.push(`Generating subtasks from file: ${options.file}`);
    sourceInfo = { path: options.file, type: "file" };
  } else if (flags.hasText && options.text !== undefined) {
    contextParts.push(`Generating subtasks from description: ${options.text}`);
    sourceInfo = { text: options.text, type: "text" };
  }

  return { contextParts, sourceInfo };
}

/**
 * Perform pre-check for --milestone and --story modes
 *
 * Discovers tasks from the milestone, checks which ones already have subtasks,
 * and returns information needed for filtering and summary display.
 *
 * @param milestonePath - Resolved milestone path
 * @param outputDirectory - Directory where subtasks.json is/will be
 * @returns Pre-check result with counts and skip info
 */
function checkSubtasksPreCheck(
  milestonePath: string,
  outputDirectory: string,
): SubtasksPreCheckResult {
  const subtasksPath = path.join(outputDirectory, "subtasks.json");

  // Capture before count for later delta calculation
  const beforeCount = countSubtasksInFile(subtasksPath);

  // Get existing taskRefs from the subtasks file
  const existingTaskReferences = getExistingTaskReferences(subtasksPath);

  // Discover tasks from milestone
  const allTasks = discoverTasksFromMilestone(milestonePath);

  // Filter tasks and track skipped ones
  const skippedTasks: Array<string> = [];
  for (const taskPath of allTasks) {
    const taskReference = extractTaskReference(taskPath);
    if (existingTaskReferences.has(taskReference)) {
      skippedTasks.push(taskReference);
    }
  }

  // Determine if all tasks already have subtasks
  const shouldSkip =
    allTasks.length > 0 && skippedTasks.length === allTasks.length;

  return { beforeCount, shouldSkip, skippedTasks, totalTasks: allTasks.length };
}

/**
 * Check if a task should be skipped because it already has subtasks
 * @param taskPath - Path to the task file
 * @param outputDirectory - Output directory option (may be undefined)
 * @returns true if the task should be skipped
 */
function checkTaskHasSubtasks(
  taskPath: string,
  outputDirectory: string | undefined,
): boolean {
  const taskReference = extractTaskReference(taskPath);

  // Infer milestone from task path if it's in a milestone folder
  const milestoneMatch = /milestones\/(?<slug>[^/]+)\//.exec(taskPath);
  const inferredMilestonePath =
    milestoneMatch?.groups?.slug === undefined
      ? null
      : resolveMilestonePath(milestoneMatch.groups.slug);

  // Determine output path for subtasks.json
  const preCheckOutputDirectory = resolveOutputDirectory(
    outputDirectory,
    inferredMilestonePath,
  );
  const preCheckSubtasksPath = path.join(
    preCheckOutputDirectory,
    "subtasks.json",
  );

  // Check if this task already has subtasks
  const existingTaskReferences =
    getExistingTaskReferences(preCheckSubtasksPath);
  return existingTaskReferences.has(taskReference);
}

/**
 * Print error message for missing subtasks source and exit
 */
function exitWithSubtasksSourceError(): never {
  console.error("Error: Must provide a source");
  console.log("\nHierarchy sources (scope = source):");
  console.log(
    "  aaa ralph plan subtasks --milestone <name>  # All tasks in milestone → subtasks",
  );
  console.log(
    "  aaa ralph plan subtasks --story <path>      # All tasks for story → subtasks",
  );
  console.log(
    "  aaa ralph plan subtasks --task <path>       # Task → subtasks",
  );
  console.log("\nAlternative sources:");
  console.log(
    "  aaa ralph plan subtasks --file <path>       # File → subtasks",
  );
  console.log(
    '  aaa ralph plan subtasks --text "Fix bug"    # Text → subtasks',
  );
  console.log(
    "  aaa ralph plan subtasks --review            # Review diary → subtasks",
  );
  process.exit(1);
}

/**
 * Print error message for missing tasks source and exit
 */
function exitWithTasksSourceError(): never {
  console.error("Error: Must provide a source");
  console.log("\nHierarchy sources (scope = source):");
  console.log("  aaa ralph plan tasks --story <path>       # Story → tasks");
  console.log(
    "  aaa ralph plan tasks --milestone <path>   # All stories in milestone → tasks",
  );
  console.log("\nAlternative sources:");
  console.log("  aaa ralph plan tasks --file <path>        # File → tasks");
  console.log('  aaa ralph plan tasks --text "Add auth"    # Text → tasks');
  process.exit(1);
}

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

// Helper to determine subtasks prompt path based on source type
function getSubtasksPromptPath(
  contextRoot: string,
  flags: SubtasksSourceFlags,
): string {
  if (flags.hasMilestone || flags.hasStory) {
    return path.join(
      contextRoot,
      "context/workflows/ralph/planning/subtasks-from-hierarchy.md",
    );
  }
  if (flags.hasTask) {
    return getPromptPath(contextRoot, "subtasks", true);
  }
  return path.join(
    contextRoot,
    "context/workflows/ralph/planning/subtasks-from-source.md",
  );
}

/**
 * Handle cascade execution after a planning level completes
 *
 * Validates cascade target, runs cascade, and exits on failure.
 */
async function handleCascadeExecution(
  options: HandleCascadeOptions,
): Promise<void> {
  const {
    calibrateEvery,
    cascadeTarget,
    contextRoot,
    fromLevel,
    resolvedMilestonePath,
    subtasksPath: explicitSubtasksPath,
  } = options;

  // Validate cascade target
  const validationError = validateCascadeTarget(fromLevel, cascadeTarget);
  if (validationError !== null) {
    console.error(`Error: ${validationError}`);
    process.exit(1);
  }

  // Determine subtasks path: use explicit path if provided, otherwise derive from milestone
  console.log(`\nCascading from ${fromLevel} to ${cascadeTarget}...\n`);
  const subtasksPath =
    explicitSubtasksPath ??
    (resolvedMilestonePath === null
      ? path.join(contextRoot, "subtasks.json")
      : path.join(resolvedMilestonePath, "subtasks.json"));

  const result = await runCascadeFrom(fromLevel, cascadeTarget, {
    calibrateEvery,
    contextRoot,
    subtasksPath,
  });

  if (!result.success) {
    console.error(`Cascade failed: ${result.error}`);
    if (result.stoppedAt !== null) {
      console.error(`Stopped at: ${result.stoppedAt}`);
    }
    process.exit(1);
  }
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

  // Use Bun.spawnSync with argument array to avoid shell parsing entirely
  // This prevents issues with special characters like parentheses in the prompt
  // --permission-mode bypassPermissions prevents inheriting plan mode from user settings
  const proc = Bun.spawnSync(
    [
      "claude",
      "--permission-mode",
      "bypassPermissions",
      "--append-system-prompt",
      fullPrompt,
      `Please begin the ${sessionName} planning session following the instructions provided.`,
    ],
    { stdio: ["inherit", "inherit", "inherit"] },
  );

  // Exit with non-zero exit code when process fails
  // proc.exitCode: 0 = success, positive number = error, null = killed by signal
  const { exitCode } = proc;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- exitCode can be 0, positive, or null
  if (exitCode !== null && exitCode !== 0) {
    process.exit(exitCode);
  }
}

/**
 * Resolve milestone path from options or infer from story path
 *
 * @param milestoneOption - Explicit --milestone flag value
 * @param storyOption - Story path (to infer milestone from)
 * @param hasStory - Whether story flag is provided
 * @returns Resolved milestone path, or undefined if not determinable
 */
function resolveMilestoneFromOptions(
  milestoneOption: string | undefined,
  storyOption: string | undefined,
  hasStory: boolean,
): null | string | undefined {
  if (milestoneOption !== undefined) {
    // Explicit milestone flag
    return resolveMilestonePath(milestoneOption);
  }
  if (hasStory && storyOption !== undefined) {
    // Infer milestone from resolved story path
    const resolvedStory = resolveStoryPath(storyOption);
    if (resolvedStory !== null) {
      const match = /milestones\/(?<slug>[^/]+)\//.exec(resolvedStory);
      if (match?.groups?.slug !== undefined) {
        return resolveMilestonePath(match.groups.slug);
      }
    }
  }
  return undefined;
}

/**
 * Run subtasks generation in headless mode and render summary
 */
async function runSubtasksHeadless(
  options: RunSubtasksHeadlessOptions,
): Promise<void> {
  const {
    beforeCount,
    extraContext,
    hasMilestone,
    hasStory,
    milestone,
    outputDirectory: outputDirectoryOption,
    promptPath,
    resolvedMilestonePath,
    sizeMode,
    skippedTasks,
    sourceInfo,
    storyRef,
  } = options;

  const logFile = getPlanningLogPath(resolvedMilestonePath ?? undefined);
  const result = await invokeClaudeHeadless({
    extraContext,
    logFile,
    promptPath,
    sessionName: "subtasks",
    sizeMode,
  });

  // Determine output path using resolveOutputDirectory
  const resolvedOutputDirectory = resolveOutputDirectory(
    outputDirectoryOption,
    resolvedMilestonePath,
  );
  const outputPath = path.join(resolvedOutputDirectory, "subtasks.json");

  // Try to load generated subtasks
  const loadResult = ((): {
    error?: string;
    subtasks: Array<{ id: string; title: string }>;
  } => {
    try {
      const file = loadSubtasksFile(outputPath);
      return {
        subtasks: file.subtasks.map((s) => ({ id: s.id, title: s.title })),
      };
    } catch {
      return { error: "No subtasks file found", subtasks: [] };
    }
  })();

  // Calculate counts for summary display (for --milestone and --story modes)
  const afterCount = loadResult.subtasks.length;
  const addedCount =
    hasMilestone || hasStory ? afterCount - beforeCount : undefined;
  const totalCount = hasMilestone || hasStory ? afterCount : undefined;

  // Render summary
  console.log(
    renderPlanSubtasksSummary({
      addedCount,
      costUsd: result.costUsd,
      durationMs: result.durationMs,
      error: loadResult.error,
      milestone,
      outputPath,
      sessionId: result.sessionId,
      sizeMode,
      skippedTasks: skippedTasks.length > 0 ? skippedTasks : undefined,
      source: sourceInfo,
      storyRef,
      subtasks: loadResult.subtasks,
      totalCount,
    }),
  );
}

/**
 * Execute tasks planning in milestone mode
 *
 * @returns Resolved milestone path
 */
async function runTasksMilestoneMode(
  options: TasksMilestoneOptions,
): Promise<string> {
  const { contextRoot, isAutoMode, isHeadless, milestone } = options;

  if (!isAutoMode) {
    console.error(
      "Error: --milestone requires --supervised or --headless mode",
    );
    console.log(
      "\nUsage: aaa ralph plan tasks --milestone <path> --supervised",
    );
    process.exit(1);
  }

  const milestonePath = requireMilestone(milestone);
  const promptPath = path.join(
    contextRoot,
    "context/workflows/ralph/planning/tasks-milestone.md",
  );
  const extraContext = `Generating tasks for all stories in milestone: ${milestonePath}`;

  if (isHeadless) {
    const logFile = getPlanningLogPath(milestonePath);
    await invokeClaudeHeadless({
      extraContext,
      logFile,
      promptPath,
      sessionName: "tasks-milestone",
    });
  } else {
    invokeClaudeChat(promptPath, "tasks-milestone", extraContext);
  }

  return milestonePath;
}

/**
 * Execute tasks planning from file or text source
 */
async function runTasksSourceMode(options: TasksSourceOptions): Promise<void> {
  const { contextRoot, file, hasFile, isHeadless, isSupervised, text } =
    options;

  const promptPath = path.join(
    contextRoot,
    "context/workflows/ralph/planning/tasks-from-source.md",
  );

  const extraContext =
    hasFile && file !== undefined
      ? `Generating tasks from file: ${file}`
      : `Generating tasks from description: ${text}`;

  if (isHeadless) {
    const logFile = getPlanningLogPath();
    await invokeClaudeHeadless({
      extraContext,
      logFile,
      promptPath,
      sessionName: "tasks-source",
    });
  } else if (isSupervised) {
    invokeClaudeChat(promptPath, "tasks-source", extraContext);
  } else {
    invokeClaude(promptPath, "tasks-source", extraContext);
  }
}

/**
 * Execute tasks planning in story mode
 *
 * @returns Resolved milestone path if story is in a milestone, null otherwise
 */
async function runTasksStoryMode(
  options: TasksStoryOptions,
): Promise<null | string> {
  const { contextRoot, isAutoMode, isHeadless, isSupervised, story } = options;

  const storyPath = requireStory(story);

  // Try to extract milestone from story path
  const milestoneMatch = /milestones\/(?<slug>[^/]+)\//.exec(storyPath);
  const resolvedMilestonePath =
    milestoneMatch?.groups?.slug === undefined
      ? null
      : resolveMilestonePath(milestoneMatch.groups.slug);

  const promptPath = getPromptPath(contextRoot, "tasks", isAutoMode);
  const extraContext = `Planning tasks for story: ${storyPath}`;

  if (isHeadless) {
    const logFile = getPlanningLogPath();
    await invokeClaudeHeadless({
      extraContext,
      logFile,
      promptPath,
      sessionName: "tasks",
    });
  } else if (isSupervised) {
    invokeClaudeChat(promptPath, "tasks", extraContext);
  } else {
    invokeClaude(promptPath, "tasks", extraContext);
  }

  return resolvedMilestonePath;
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
    .option(
      "--cascade <target>",
      "Continue to target level after completion (stories, tasks, subtasks, build, calibrate)",
    )
    .action(async (options) => {
      const contextRoot = getContextRoot();
      const promptPath = path.join(
        contextRoot,
        "context/workflows/ralph/planning/roadmap-interactive.md",
      );
      invokeClaude(promptPath, "roadmap");

      // Handle cascade if requested
      if (options.cascade !== undefined) {
        const cascadeTarget = options.cascade;

        // Validate cascade target
        const validationError = validateCascadeTarget("roadmap", cascadeTarget);
        if (validationError !== null) {
          console.error(`Error: ${validationError}`);
          process.exit(1);
        }

        // Run cascade from roadmap to target
        console.log(`\nCascading from roadmap to ${cascadeTarget}...\n`);
        const result = await runCascadeFrom("roadmap", cascadeTarget, {
          contextRoot,
          subtasksPath: path.join(contextRoot, "subtasks.json"),
        });

        if (!result.success) {
          console.error(`Cascade failed: ${result.error}`);
          if (result.stoppedAt !== null) {
            console.error(`Stopped at: ${result.stoppedAt}`);
          }
          process.exit(1);
        }
      }
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
    .option(
      "--cascade <target>",
      "Continue to target level after completion (tasks, subtasks, build, calibrate)",
    )
    .action(async (options) => {
      const contextRoot = getContextRoot();
      const milestonePath = requireMilestone(options.milestone);

      // Determine if using auto prompt (non-interactive generation)
      const isAutoMode =
        options.supervised === true || options.headless === true;
      const promptPath = getPromptPath(contextRoot, "stories", isAutoMode);
      const extraContext = `Planning stories for milestone: ${milestonePath}`;

      // Determine execution mode
      if (options.headless === true) {
        const logFile = getPlanningLogPath(milestonePath);
        await invokeClaudeHeadless({
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

      // Handle cascade if requested
      if (options.cascade !== undefined) {
        const cascadeTarget = options.cascade;

        // Validate cascade target
        const validationError = validateCascadeTarget("stories", cascadeTarget);
        if (validationError !== null) {
          console.error(`Error: ${validationError}`);
          process.exit(1);
        }

        // Run cascade from stories to target
        console.log(`\nCascading from stories to ${cascadeTarget}...\n`);
        const result = await runCascadeFrom("stories", cascadeTarget, {
          contextRoot,
          subtasksPath: path.join(milestonePath, "subtasks.json"),
        });

        if (!result.success) {
          console.error(`Cascade failed: ${result.error}`);
          if (result.stoppedAt !== null) {
            console.error(`Stopped at: ${result.stoppedAt}`);
          }
          process.exit(1);
        }
      }
    }),
);

// ralph plan tasks - task planning from hierarchy (--story, --milestone) or alternative sources (--file, --text)
planCommand.addCommand(
  new Command("tasks")
    .description(
      "Plan tasks from hierarchy (--story, --milestone) or alternative sources (--file, --text)",
    )
    .option("--story <path>", "Story file path to plan tasks for")
    .option(
      "--milestone <path>",
      "Milestone path to plan tasks for (all stories)",
    )
    .option("--file <path>", "File path as source for task generation")
    .option("--text <string>", "Text description as source for task generation")
    .option("-s, --supervised", "Supervised mode: watch chat, can intervene")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option(
      "--cascade <target>",
      "Continue to target level after completion (subtasks, build, calibrate)",
    )
    .action(async (options) => {
      const hasStory = options.story !== undefined;
      const hasMilestone = options.milestone !== undefined;
      const hasFile = options.file !== undefined;
      const hasText = options.text !== undefined;

      // Validate: require exactly one source
      const sourceCount = [hasStory, hasMilestone, hasFile, hasText].filter(
        Boolean,
      ).length;
      if (sourceCount === 0) {
        exitWithTasksSourceError();
      }
      if (sourceCount > 1) {
        console.error(
          "Error: Cannot combine multiple sources. Provide exactly one of: --story, --milestone, --file, --text",
        );
        process.exit(1);
      }

      const contextRoot = getContextRoot();
      const isAutoMode =
        options.supervised === true || options.headless === true;

      // Track resolved milestone path for cascade
      let resolvedMilestonePath: null | string = null;

      // Execute based on source type
      if (hasMilestone && options.milestone !== undefined) {
        resolvedMilestonePath = await runTasksMilestoneMode({
          contextRoot,
          isAutoMode,
          isHeadless: options.headless === true,
          milestone: options.milestone,
        });
      } else if (hasStory && options.story !== undefined) {
        resolvedMilestonePath = await runTasksStoryMode({
          contextRoot,
          isAutoMode,
          isHeadless: options.headless === true,
          isSupervised: options.supervised === true,
          story: options.story,
        });
      } else {
        await runTasksSourceMode({
          contextRoot,
          file: options.file,
          hasFile,
          isHeadless: options.headless === true,
          isSupervised: options.supervised === true,
          text: options.text,
        });
      }

      // Handle cascade if requested
      if (options.cascade !== undefined) {
        await handleCascadeExecution({
          cascadeTarget: options.cascade,
          contextRoot,
          fromLevel: "tasks",
          resolvedMilestonePath,
        });
      }
    }),
);

// ralph plan subtasks - subtask generation from any source
// Accepts: hierarchy flags (--milestone, --story, --task) or alternative sources (--file, --text, --review)
planCommand.addCommand(
  new Command("subtasks")
    .description(
      "Generate subtasks from hierarchy (--milestone, --story, --task) or alternative sources (--file, --text, --review)",
    )
    .option("--file <path>", "File path as source")
    .option("--text <string>", "Text description as source")
    .option("--review", "Parse logs/reviews.jsonl for findings")
    .option("--task <path>", "Task file path as source")
    .option(
      "--story <path>",
      "Story path - generate subtasks for all tasks in story",
    )
    .option(
      "--milestone <name>",
      "Milestone name - generate subtasks for all tasks in milestone",
    )
    .option(
      "--output-dir <path>",
      "Output directory (path or milestone name) - use with --file/--text",
    )
    .option(
      "--size <mode>",
      "Slice thickness: small (thinnest viable), medium (one PR per subtask, default), large (major boundaries only)",
      "medium",
    )
    .option(
      "-s, --supervised",
      "Supervised mode: watch chat, can intervene (default)",
    )
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .option(
      "--cascade <target>",
      "Continue to target level after completion (build, calibrate)",
    )
    .option(
      "--calibrate-every <n>",
      "Run calibration every N build iterations during cascade (0 = disabled)",
      "0",
    )
    .action(async (options) => {
      const hasFile = options.file !== undefined;
      const hasText = options.text !== undefined;
      const hasReview = options.review === true;
      const hasTask = options.task !== undefined;
      const hasStory = options.story !== undefined;
      const hasMilestone = options.milestone !== undefined;
      const hasOutputDirectory = options.outputDir !== undefined;

      // Validate: require exactly one source
      const sourceCount = [
        hasFile,
        hasText,
        hasReview,
        hasTask,
        hasStory,
        hasMilestone,
      ].filter(Boolean).length;
      if (sourceCount === 0) {
        exitWithSubtasksSourceError();
      }
      if (sourceCount > 1) {
        console.error(
          "Error: Cannot combine multiple sources. Provide exactly one of: --milestone, --story, --task, --file, --text, --review",
        );
        process.exit(1);
      }

      // Validate: --milestone and --output-dir are mutually exclusive
      if (hasMilestone && hasOutputDirectory) {
        console.error(
          "Error: --milestone and --output-dir are mutually exclusive.",
        );
        console.error(
          "Use --milestone for both source and output, or use --file/--text with --output-dir",
        );
        process.exit(1);
      }

      // Validate cascade target early (before running Claude session)
      if (options.cascade !== undefined) {
        const validationError = validateCascadeTarget(
          "subtasks",
          options.cascade,
        );
        if (validationError !== null) {
          console.error(`Error: ${validationError}`);
          process.exit(1);
        }
      }

      const contextRoot = getContextRoot();

      // Pre-check for --task mode: skip if task already has subtasks
      if (hasTask && options.task !== undefined) {
        const taskPath = requireTask(options.task);
        if (checkTaskHasSubtasks(taskPath, options.outputDir)) {
          const taskReference = extractTaskReference(taskPath);
          console.log(`Task ${taskReference} already has subtasks - skipping`);
          return;
        }
      }

      // Determine which prompt to use based on source type
      // - Hierarchy sources (--milestone, --story) use subtasks-from-hierarchy.md
      // - Task source uses subtasks-auto.md (legacy)
      // - Alternative sources (--file, --text, --review) use subtasks-from-source.md
      // Create flags object for helper functions
      const sourceFlags: SubtasksSourceFlags = {
        hasFile,
        hasMilestone,
        hasReview,
        hasStory,
        hasTask,
        hasText,
      };

      const promptPath = getSubtasksPromptPath(contextRoot, sourceFlags);

      // Resolve milestone path - from explicit --milestone flag or inferred from story path
      // This is used for log file location and to determine output directory for subtasks.json
      const resolvedMilestonePath = resolveMilestoneFromOptions(
        options.milestone,
        options.story,
        hasStory,
      );

      // Pre-check for --milestone and --story modes: filter tasks that already have subtasks
      // Track skipped tasks and counts for summary display
      let skippedTasks: Array<string> = [];
      let beforeCount = 0;

      if (
        (hasMilestone || hasStory) &&
        resolvedMilestonePath !== undefined &&
        resolvedMilestonePath !== null
      ) {
        const outputDirectory = resolveOutputDirectory(
          options.outputDir,
          resolvedMilestonePath,
        );
        const preCheckResult = checkSubtasksPreCheck(
          resolvedMilestonePath,
          outputDirectory,
        );

        ({ beforeCount } = preCheckResult);
        ({ skippedTasks } = preCheckResult);

        // If all tasks already have subtasks, exit cleanly
        if (preCheckResult.shouldSkip) {
          console.log(
            `All ${preCheckResult.totalTasks} tasks already have subtasks - nothing to generate`,
          );
          return;
        }

        // If some tasks have subtasks, log info about filtering
        if (skippedTasks.length > 0) {
          const remainingCount =
            preCheckResult.totalTasks - skippedTasks.length;
          console.log(
            `Pre-check: ${skippedTasks.length} tasks already have subtasks, ${remainingCount} to process`,
          );
        }
      }

      // Build source context and info using helper
      const { contextParts, sourceInfo } = buildSubtasksSourceContext(
        sourceFlags,
        {
          file: options.file,
          milestone: options.milestone,
          resolvedMilestonePath,
          story: options.story,
          task: options.task,
          text: options.text,
        },
      );

      // Add sizing mode context
      const sizeMode = options.size as "large" | "medium" | "small";
      const sizeDescriptions: Record<typeof sizeMode, string> = {
        large:
          "Large slices: Only split at major functional boundaries. One subtask per logical feature. Prefer fewer, larger subtasks.",
        medium:
          "Medium slices (default): One PR per subtask. Each subtask is a coherent unit of work that ships independently.",
        small:
          "Small slices: Thinnest viable slices. Maximize granularity for fine-grained progress tracking. Split aggressively.",
      };
      contextParts.push(`Sizing mode: ${sizeMode}`);
      contextParts.push(`Sizing guidance: ${sizeDescriptions[sizeMode]}`);

      // Add output directory to context if specified
      if (hasOutputDirectory) {
        const resolvedOutput = resolveOutputDirectory(options.outputDir, null);
        contextParts.push(`Output directory: ${resolvedOutput}`);
      }

      const extraContext = contextParts.join("\n");

      if (options.headless === true) {
        // Headless mode with summary - use extracted helper
        await runSubtasksHeadless({
          beforeCount,
          extraContext,
          hasMilestone,
          hasStory,
          milestone: options.milestone,
          outputDirectory: options.outputDir,
          promptPath,
          resolvedMilestonePath,
          sizeMode,
          skippedTasks,
          sourceInfo,
          storyRef: options.story,
        });
      } else {
        // Default: supervised mode (user watches)
        invokeClaudeChat(promptPath, "subtasks", extraContext);
      }

      // Handle cascade if requested
      if (options.cascade !== undefined) {
        // Determine subtasks path for cascade
        const resolvedOutputDirectory = resolveOutputDirectory(
          options.outputDir,
          resolvedMilestonePath,
        );
        const subtasksPath = path.join(
          resolvedOutputDirectory,
          "subtasks.json",
        );

        await handleCascadeExecution({
          calibrateEvery: Number.parseInt(options.calibrateEvery, 10),
          cascadeTarget: options.cascade,
          contextRoot,
          fromLevel: "subtasks",
          resolvedMilestonePath: resolvedMilestonePath ?? null,
          subtasksPath,
        });
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
reviewCommand.addCommand(
  new Command("stories")
    .description("Review stories for a milestone")
    .requiredOption(
      "--milestone <path>",
      "Milestone path to review stories for",
    )
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .action(async (options) => {
      const contextRoot = getContextRoot();
      const milestonePath = requireMilestone(options.milestone);
      const promptPath = getReviewPromptPath(contextRoot, "stories", false);
      const extraContext = `Reviewing stories for milestone: ${milestonePath}`;

      if (options.headless === true) {
        const logFile = getPlanningLogPath(milestonePath);
        await invokeClaudeHeadless({
          extraContext,
          logFile,
          promptPath,
          sessionName: "stories-review",
        });
      } else {
        invokeClaudeChat(promptPath, "stories-review", extraContext);
      }
    }),
);

// ralph review roadmap - review roadmap quality
reviewCommand.addCommand(
  new Command("roadmap")
    .description("Review roadmap milestones for quality and completeness")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .action(async (options) => {
      const contextRoot = getContextRoot();
      const promptPath = getReviewPromptPath(contextRoot, "roadmap", false);
      const extraContext = "Reviewing roadmap for quality and completeness";

      if (options.headless === true) {
        const logFile = getPlanningLogPath();
        await invokeClaudeHeadless({
          extraContext,
          logFile,
          promptPath,
          sessionName: "roadmap-review",
        });
      } else {
        invokeClaudeChat(promptPath, "roadmap-review", extraContext);
      }
    }),
);

// ralph review gap - gap analysis subcommand group
const gapCommand = new Command("gap").description(
  "Cold analysis of planning artifacts for gaps and blind spots",
);

// ralph review gap roadmap - roadmap gap analysis
gapCommand.addCommand(
  new Command("roadmap")
    .description("Cold analysis of roadmap for gaps and risks")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .action(async (options) => {
      const contextRoot = getContextRoot();
      const promptPath = getReviewPromptPath(contextRoot, "roadmap", true);
      const extraContext = "Gap analysis of roadmap for risks and blind spots";

      if (options.headless === true) {
        const logFile = getPlanningLogPath();
        await invokeClaudeHeadless({
          extraContext,
          logFile,
          promptPath,
          sessionName: "roadmap-gap",
        });
      } else {
        invokeClaudeChat(promptPath, "roadmap-gap", extraContext);
      }
    }),
);

// ralph review gap stories --milestone <path> - stories gap analysis
gapCommand.addCommand(
  new Command("stories")
    .description("Cold analysis of stories for gaps and risks")
    .requiredOption(
      "--milestone <path>",
      "Milestone path to analyze stories for",
    )
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .action(async (options) => {
      const contextRoot = getContextRoot();
      const milestonePath = requireMilestone(options.milestone);
      const promptPath = getReviewPromptPath(contextRoot, "stories", true);
      const extraContext = `Gap analysis of stories for milestone: ${milestonePath}`;

      if (options.headless === true) {
        const logFile = getPlanningLogPath(milestonePath);
        await invokeClaudeHeadless({
          extraContext,
          logFile,
          promptPath,
          sessionName: "stories-gap",
        });
      } else {
        invokeClaudeChat(promptPath, "stories-gap", extraContext);
      }
    }),
);

// ralph review gap tasks --story <path> - tasks gap analysis
gapCommand.addCommand(
  new Command("tasks")
    .description("Cold analysis of tasks for gaps and risks")
    .requiredOption("--story <path>", "Story path to analyze tasks for")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .action(async (options) => {
      const contextRoot = getContextRoot();
      const storyPath = requireStory(options.story);
      const promptPath = getReviewPromptPath(contextRoot, "tasks", true);
      const extraContext = `Gap analysis of tasks for story: ${storyPath}`;

      if (options.headless === true) {
        // Story mode doesn't have direct milestone, use orphan fallback
        const logFile = getPlanningLogPath();
        await invokeClaudeHeadless({
          extraContext,
          logFile,
          promptPath,
          sessionName: "tasks-gap",
        });
      } else {
        invokeClaudeChat(promptPath, "tasks-gap", extraContext);
      }
    }),
);

// ralph review gap subtasks --subtasks <path> - subtasks gap analysis
gapCommand.addCommand(
  new Command("subtasks")
    .description("Cold analysis of subtask queue for gaps and risks")
    .requiredOption("--subtasks <path>", "Subtasks file path to analyze")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .action(async (options) => {
      const contextRoot = getContextRoot();
      const promptPath = getReviewPromptPath(contextRoot, "subtasks", true);
      const extraContext = `Gap analysis of subtasks file: ${options.subtasks}`;

      if (options.headless === true) {
        // Subtasks mode doesn't have direct milestone, use orphan fallback
        const logFile = getPlanningLogPath();
        await invokeClaudeHeadless({
          extraContext,
          logFile,
          promptPath,
          sessionName: "subtasks-gap",
        });
      } else {
        invokeClaudeChat(promptPath, "subtasks-gap", extraContext);
      }
    }),
);

reviewCommand.addCommand(gapCommand);

// ralph review tasks --story <path> - review tasks for a story
reviewCommand.addCommand(
  new Command("tasks")
    .description("Review tasks for a story")
    .requiredOption("--story <path>", "Story path to review tasks for")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .action(async (options) => {
      const contextRoot = getContextRoot();
      const storyPath = requireStory(options.story);
      const promptPath = getReviewPromptPath(contextRoot, "tasks", false);
      const extraContext = `Reviewing tasks for story: ${storyPath}`;

      if (options.headless === true) {
        // Story mode doesn't have direct milestone, use orphan fallback
        const logFile = getPlanningLogPath();
        await invokeClaudeHeadless({
          extraContext,
          logFile,
          promptPath,
          sessionName: "tasks-review",
        });
      } else {
        invokeClaudeChat(promptPath, "tasks-review", extraContext);
      }
    }),
);

// ralph review subtasks --subtasks <path> - review subtask queue
reviewCommand.addCommand(
  new Command("subtasks")
    .description("Review subtask queue before building")
    .requiredOption("--subtasks <path>", "Subtasks file path to review")
    .option("-H, --headless", "Headless mode: JSON output + file logging")
    .action(async (options) => {
      const contextRoot = getContextRoot();
      const promptPath = path.join(
        contextRoot,
        "context/workflows/ralph/review/subtasks-review-auto.md",
      );
      const extraContext = `Reviewing subtasks file: ${options.subtasks}`;

      if (options.headless === true) {
        // Subtasks review doesn't have direct milestone, use orphan fallback
        const logFile = getPlanningLogPath();
        await invokeClaudeHeadless({
          extraContext,
          logFile,
          promptPath,
          sessionName: "subtasks-review",
        });
      } else {
        invokeClaudeChat(promptPath, "subtasks-review", extraContext);
      }
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
async function runCalibrateSubcommand(
  subcommand: CalibrateSubcommand,
  options: { force?: boolean; review?: boolean; subtasks: string },
): Promise<void> {
  const contextRoot = getContextRoot();
  const resolvedSubtasksPath = resolveCalibrateSubtasksPath(
    options.subtasks,
    contextRoot,
  );

  const didSucceed = await runCalibrate(subcommand, {
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
    .action(async (options) => {
      await runCalibrateSubcommand("intention", options);
    }),
);

// ralph calibrate technical - check for technical drift
calibrateCommand.addCommand(
  new Command("technical")
    .description("Check for technical drift (code quality issues)")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option("--force", "Skip approval even if config says 'suggest'")
    .option("--review", "Require approval even if config says 'autofix'")
    .action(async (options) => {
      await runCalibrateSubcommand("technical", options);
    }),
);

// ralph calibrate improve - run self-improvement analysis
calibrateCommand.addCommand(
  new Command("improve")
    .description("Run self-improvement analysis on session logs")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option("--force", "Skip approval even if config says 'suggest'")
    .option("--review", "Require approval even if config says 'autofix'")
    .action(async (options) => {
      await runCalibrateSubcommand("improve", options);
    }),
);

// ralph calibrate all - run all calibration checks
calibrateCommand.addCommand(
  new Command("all")
    .description("Run all calibration checks sequentially")
    .option("--subtasks <path>", "Subtasks file path", DEFAULT_SUBTASKS_PATH)
    .option("--force", "Skip approval even if config says 'suggest'")
    .option("--review", "Require approval even if config says 'autofix'")
    .action(async (options) => {
      await runCalibrateSubcommand("all", options);
    }),
);

ralphCommand.addCommand(calibrateCommand);

// =============================================================================
// ralph archive - archive completed subtasks and old progress sessions
// =============================================================================

const archiveCommand = new Command("archive").description(
  "Archive completed subtasks and old PROGRESS.md sessions to manage file sizes",
);

// ralph archive subtasks - archive completed subtasks
archiveCommand.addCommand(
  new Command("subtasks")
    .description("Archive completed subtasks to reduce subtasks.json size")
    .requiredOption("--subtasks <path>", "Subtasks file path")
    .option("--milestone <name>", "Milestone name for archive naming")
    .action((options) => {
      const contextRoot = getContextRoot();
      runArchive(
        {
          milestone: options.milestone,
          subtasks: true,
          subtasksPath: options.subtasks,
        },
        contextRoot,
      );
    }),
);

// ralph archive progress - archive old PROGRESS.md sessions
archiveCommand.addCommand(
  new Command("progress")
    .description("Archive old sessions from PROGRESS.md")
    .option("--progress <path>", "PROGRESS.md file path")
    .action((options) => {
      const contextRoot = getContextRoot();
      runArchive(
        { progress: true, progressPath: options.progress },
        contextRoot,
      );
    }),
);

ralphCommand.addCommand(archiveCommand);

export default ralphCommand;

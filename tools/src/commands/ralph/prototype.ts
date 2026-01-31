/**
 * Ralph prototype command
 *
 * Starts a rapid prototyping session from a goal description.
 * Supports three input modes:
 * - Inline text: aaa ralph prototype "Build X"
 * - File path: aaa ralph prototype --file goal.md
 * - Interactive wizard (default when no args)
 *
 * The interactive wizard prompts for:
 * - Goal description
 * - Context/constraints
 * - Success criteria
 *
 * Use --no-interactive to skip the wizard when using inline text.
 *
 * @see docs/planning/VISION.md
 */

import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";
import { existsSync, readFileSync } from "node:fs";
import * as readline from "node:readline";

import { DEFAULT_MAX_ITERATIONS, runExecutionLoop } from "./execution";
import { type GeneratedTasksFile, planAndWriteTasks } from "./planning";
import {
  appendProgressLog,
  cleanOldSessions,
  createSessionDirectory,
  findLatestSession,
  getSessionPaths,
  listAllSessions,
  readSessionState,
  removeSessionDirectory,
  updateSessionState,
} from "./temporary-session";

// =============================================================================
// Types
// =============================================================================

/**
 * Input mode for the prototype command
 */
type InputMode = "file" | "inline" | "wizard";

/**
 * Resolved input from any of the three modes
 */
interface PrototypeInput {
  /** The assembled goal text (may include context and success criteria) */
  goal: string;
  /** How the input was provided */
  mode: InputMode;
  /** Source file path (if mode is 'file') */
  source?: string;
  /** Raw wizard responses (if mode is 'wizard') */
  wizardResponses?: WizardResponses;
}

/**
 * Wizard responses collected from user
 */
interface WizardResponses {
  /** Context and constraints for the goal */
  context: string;
  /** What the user wants to build */
  goal: string;
  /** How success will be measured */
  successCriteria: string;
}

// =============================================================================
// Input Resolution
// =============================================================================

/**
 * Assemble a complete goal text from wizard responses
 *
 * @param responses - The wizard responses
 * @returns Formatted goal text
 */
function assembleGoalFromWizard(responses: WizardResponses): string {
  const parts: Array<string> = [];

  // Goal is always required
  parts.push(`## Goal\n\n${responses.goal}`);

  // Context/constraints are optional
  if (responses.context.trim() !== "") {
    parts.push(`## Context & Constraints\n\n${responses.context}`);
  }

  // Success criteria are optional
  if (responses.successCriteria.trim() !== "") {
    parts.push(`## Success Criteria\n\n${responses.successCriteria}`);
  }

  return parts.join("\n\n");
}

/**
 * Prompt for a single field with multi-line input
 *
 * @param rl - readline interface
 * @param prompt - The prompt to display
 * @param hint - Optional hint text
 * @returns Promise resolving to the user's input
 */
async function promptField(
  rl: readline.Interface,
  prompt: string,
  hint?: string,
): Promise<string> {
  console.log(chalk.bold(prompt));
  if (hint !== undefined) {
    console.log(chalk.dim(hint));
  }
  console.log(chalk.dim("(Press Enter twice when done)\n"));

  // eslint-disable-next-line promise/avoid-new -- readline requires manual Promise wrapping
  return new Promise<string>((resolve) => {
    const lines: Array<string> = [];
    let emptyLineCount = 0;

    function handleLine(line: string): void {
      if (line.trim() === "") {
        emptyLineCount += 1;
        if (emptyLineCount >= 2) {
          rl.removeListener("line", handleLine);
          resolve(lines.join("\n").trim());
          return;
        }
      } else {
        emptyLineCount = 0;
      }
      lines.push(line);
    }

    rl.on("line", handleLine);
  });
}

/**
 * Resolve input from the three possible modes
 *
 * Priority:
 * 1. --file option (read from file)
 * 2. Inline argument with --no-interactive (use directly without wizard)
 * 3. Inline argument (run wizard with goal pre-filled)
 * 4. Interactive wizard (prompt user for all fields)
 *
 * @param inlineGoal - Goal provided as command argument
 * @param filePath - Path to file containing goal (--file option)
 * @param isNonInteractive - Skip wizard even with inline goal
 * @returns Promise resolving to the resolved input
 */
async function resolveInput(
  inlineGoal: string | undefined,
  filePath: string | undefined,
  isNonInteractive: boolean,
): Promise<PrototypeInput> {
  // Mode 1: File input (--file option takes precedence)
  if (filePath !== undefined) {
    if (!existsSync(filePath)) {
      console.error(chalk.red(`Error: File not found: ${filePath}`));
      process.exit(1);
    }

    const content = readFileSync(filePath, "utf8").trim();
    if (content === "") {
      console.error(chalk.red(`Error: File is empty: ${filePath}`));
      process.exit(1);
    }

    return { goal: content, mode: "file", source: filePath };
  }

  // Mode 2: Inline text with --no-interactive flag (skip wizard)
  if (
    isNonInteractive &&
    inlineGoal !== undefined &&
    inlineGoal.trim() !== ""
  ) {
    return { goal: inlineGoal.trim(), mode: "inline" };
  }

  // Mode 3 & 4: Interactive wizard (with optional pre-filled goal)
  const wizardResponses = await runInteractiveWizard(inlineGoal);
  if (wizardResponses.goal === "") {
    console.error(chalk.red("\nError: No goal provided"));
    process.exit(1);
  }

  // Assemble goal text from wizard responses
  const assembledGoal = assembleGoalFromWizard(wizardResponses);

  return { goal: assembledGoal, mode: "wizard", wizardResponses };
}

/**
 * Run the interactive wizard to collect goal, context, and success criteria
 *
 * @param prefilledGoal - Optional pre-filled goal from inline argument
 * @returns Promise resolving to the wizard responses
 */
async function runInteractiveWizard(
  prefilledGoal?: string,
): Promise<WizardResponses> {
  // Check if running in TTY mode
  if (!process.stdin.isTTY) {
    console.error(
      chalk.red("Error: Interactive wizard requires a TTY terminal"),
    );
    console.error("Use inline text with --no-interactive or --file option:");
    console.error('  aaa ralph prototype "Build X" --no-interactive');
    console.error("  aaa ralph prototype --file goal.md");
    process.exit(1);
  }

  console.log(chalk.bold("\n🚀 Ralph Prototype Wizard\n"));
  console.log(
    chalk.dim("Answer the following prompts to define your prototype goal.\n"),
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // If goal is pre-filled, show it and skip the prompt
  let goal = "";
  if (prefilledGoal !== undefined && prefilledGoal.trim() !== "") {
    console.log(chalk.bold("1. What do you want to build?"));
    console.log(chalk.green(`   Using provided goal: "${prefilledGoal}"\n`));
    goal = prefilledGoal.trim();
  } else {
    goal = await promptField(
      rl,
      "1. What do you want to build?",
      "Describe your goal clearly and concisely.",
    );
  }

  const context = await promptField(
    rl,
    "\n2. What context or constraints should I know about?",
    "Technologies, limitations, existing code, etc. (optional)",
  );

  const successCriteria = await promptField(
    rl,
    "\n3. How will we know it's successful?",
    "Define measurable success criteria. (optional)",
  );

  rl.close();

  return { context, goal, successCriteria };
}

// =============================================================================
// Command Action
// =============================================================================

/**
 * Execute the prototype command
 *
 * @param goal - Optional inline goal text
 * @param options - Command options including --file, --no-interactive, and --resume
 */
async function runPrototype(
  goal: string | undefined,
  options: {
    file?: string;
    maxIterations?: number;
    noInteractive?: boolean;
    resume?: boolean;
  },
): Promise<void> {
  let sessionPath = "";
  let isResume = false;

  // Handle --resume flag
  if (options.resume === true) {
    const latestSession = findLatestSession({ resumableOnly: true });
    if (latestSession === null) {
      console.error(chalk.red("Error: No resumable session found"));
      console.error(chalk.dim("Start a new session with: aaa ralph prototype"));
      process.exit(1);
    }

    sessionPath = latestSession;
    isResume = true;

    const state = readSessionState(sessionPath);
    console.log(chalk.bold("\n🔄 Resuming Prototype Session"));
    console.log("─".repeat(40));
    console.log(chalk.dim(`Session: ${sessionPath}`));
    console.log(chalk.dim(`Status: ${state?.status ?? "unknown"}`));
    console.log(chalk.dim(`Last iteration: ${state?.currentIteration ?? 0}`));

    // Read existing tasks
    const paths = getSessionPaths(sessionPath);
    const tasksContent = readFileSync(paths.tasksJson, "utf8");
    const tasksFile = JSON.parse(tasksContent) as GeneratedTasksFile;

    // Display task list with status
    console.log(chalk.bold("\n📋 Tasks:"));
    for (const task of tasksFile.tasks) {
      let statusIcon = chalk.dim("○");
      if (task.status === "complete") {
        statusIcon = chalk.green("✓");
      } else if (task.status === "in_progress") {
        statusIcon = chalk.yellow("▶");
      }
      console.log(`  ${statusIcon} ${task.id}. ${task.title}`);
    }

    appendProgressLog(sessionPath, "Session resumed via --resume flag");
  } else {
    const input = await resolveInput(
      goal,
      options.file,
      options.noInteractive ?? false,
    );

    // Display resolved input
    console.log(chalk.bold("\n📋 Prototype Goal"));
    console.log("─".repeat(40));

    if (input.mode === "file") {
      console.log(chalk.dim(`Source: ${input.source}`));
    } else if (input.mode === "wizard") {
      console.log(chalk.dim("Source: interactive wizard"));
    } else {
      console.log(chalk.dim("Source: inline argument"));
    }

    console.log();
    console.log(input.goal);
    console.log();

    // Create session directory
    const session = createSessionDirectory();
    sessionPath = session.path;
    console.log(chalk.dim(`Session: ${session.path}`));

    // Plan tasks from goal
    console.log(chalk.bold("\n📝 Planning tasks..."));
    const planResult = planAndWriteTasks(input.goal, session.path);

    if (!planResult.success || planResult.tasksFile === undefined) {
      console.error(chalk.red(`\n✗ Planning failed: ${planResult.error}`));
      process.exit(1);
    }

    console.log(
      chalk.green(`✓ Generated ${planResult.tasksFile.tasks.length} tasks`),
    );

    // Display task list
    console.log(chalk.bold("\n📋 Tasks:"));
    for (const task of planResult.tasksFile.tasks) {
      console.log(chalk.dim(`  ${task.id}. ${task.title}`));
    }

    appendProgressLog(
      sessionPath,
      `New session started with goal: ${input.goal.slice(0, 100)}...`,
    );
  }

  // Run execution loop
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const result = runExecutionLoop({
    maxIterations,
    resume: isResume,
    sessionDirectory: sessionPath,
  });

  // Display summary
  console.log(chalk.bold("\n📊 Summary"));
  console.log("─".repeat(40));
  console.log(`Completed: ${result.completedCount}`);
  console.log(`Blocked: ${result.blockedCount}`);
  console.log(`Iterations: ${result.iterationsUsed}`);

  if (result.success) {
    console.log(chalk.green("\n✓ Prototype session completed successfully!"));
  } else {
    console.log(
      chalk.yellow(
        `\n⚠ Session ended: ${result.error ?? "max iterations reached"}`,
      ),
    );
    console.log(chalk.dim(`Resume with: aaa ralph prototype --resume`));
  }
}

// =============================================================================
// Session Management Subcommands
// =============================================================================

/**
 * Cancel running session
 */
function runPrototypeCancel(): void {
  const latestSession = findLatestSession({ resumableOnly: true });

  if (latestSession === null) {
    console.log(chalk.dim("No running session to cancel."));
    return;
  }

  const state = readSessionState(latestSession);
  if (state === null) {
    console.error(chalk.red("Error: Could not read session state"));
    return;
  }

  // Mark as interrupted
  updateSessionState(latestSession, { status: "interrupted" });
  appendProgressLog(latestSession, "Session cancelled by user");

  console.log(chalk.yellow("⚠ Session cancelled"));
  console.log(`Session: ${latestSession}`);
  console.log(`Previous status: ${state.status}`);
  console.log(chalk.dim("Resume with: aaa ralph prototype --resume"));
}

/**
 * Clean old sessions
 */
function runPrototypeClean(options: { all?: boolean; days?: number }): void {
  if (options.all === true) {
    const sessions = listAllSessions();
    for (const session of sessions) {
      removeSessionDirectory(session.path);
    }
    console.log(chalk.green(`✓ Removed all ${sessions.length} session(s)`));
    return;
  }

  const days = options.days ?? 7;
  const removed = cleanOldSessions({ olderThanDays: days });
  console.log(
    chalk.green(`✓ Removed ${removed} session(s) older than ${days} days`),
  );
}

/**
 * List all sessions in /tmp
 */
function runPrototypeList(): void {
  const sessions = listAllSessions();

  if (sessions.length === 0) {
    console.log(chalk.dim("No prototype sessions found."));
    return;
  }

  console.log(chalk.bold("📂 Prototype Sessions"));
  console.log("─".repeat(60));

  for (const session of sessions) {
    const status = session.state?.status ?? "unknown";
    let statusIcon = chalk.dim("?");
    switch (status) {
      case "completed": {
        statusIcon = chalk.green("✓");

        break;
      }
      case "failed": {
        statusIcon = chalk.red("✗");

        break;
      }
      case "initialized": {
        statusIcon = chalk.blue("○");

        break;
      }
      case "interrupted":
      case "running": {
        statusIcon = chalk.yellow("▶");

        break;
      }
      // No default
    }

    const createdAt = session.state?.createdAt;
    const dateString =
      createdAt !== undefined && createdAt !== ""
        ? new Date(createdAt).toLocaleString()
        : "unknown";
    console.log(
      `${statusIcon} ${session.sessionId}  ${chalk.dim(status.padEnd(12))}  ${chalk.dim(dateString)}`,
    );
  }

  console.log();
  console.log(chalk.dim(`Total: ${sessions.length} session(s)`));
}

/**
 * Show status of current/recent session
 */
function runPrototypeStatus(): void {
  const latestSession = findLatestSession();

  if (latestSession === null) {
    console.log(chalk.dim("No prototype sessions found."));
    console.log(chalk.dim("Start one with: aaa ralph prototype"));
    return;
  }

  const state = readSessionState(latestSession);
  const paths = getSessionPaths(latestSession);

  console.log(chalk.bold("📊 Current Prototype Session"));
  console.log("─".repeat(40));
  console.log(`Session: ${latestSession}`);
  console.log(`Status: ${state?.status ?? "unknown"}`);
  console.log(`Iteration: ${state?.currentIteration ?? 0}`);
  console.log(`Created: ${state?.createdAt ?? "unknown"}`);
  console.log(`Updated: ${state?.lastUpdatedAt ?? "unknown"}`);

  // Show tasks if available
  if (existsSync(paths.tasksJson)) {
    try {
      const tasksContent = readFileSync(paths.tasksJson, "utf8");
      const tasksFile = JSON.parse(tasksContent) as GeneratedTasksFile;
      const completed = tasksFile.tasks.filter(
        (t) => t.status === "complete",
      ).length;
      const inProgress = tasksFile.tasks.filter(
        (t) => t.status === "in_progress",
      ).length;
      const pending = tasksFile.tasks.filter(
        (t) => t.status === "pending",
      ).length;
      console.log(
        `Tasks: ${completed}/${tasksFile.tasks.length} complete, ${inProgress} in progress, ${pending} pending`,
      );
    } catch {
      // Ignore parse errors
    }
  }
}

// =============================================================================
// Command Definition
// =============================================================================

const prototypeCommand = new Command("prototype").description(
  "Rapid prototyping from a goal description",
);

// Default action: start/resume prototype session
prototypeCommand
  .argument("[goal]", "Goal description (inline text)")
  .option("-f, --file <path>", "Read goal from a file")
  .option(
    "-n, --no-interactive",
    "Skip interactive wizard (use with inline goal)",
  )
  .option(
    "-m, --max-iterations <number>",
    "Maximum iterations (default: 10)",
    (value) => Number.parseInt(value, 10),
  )
  .option("-r, --resume", "Resume the most recent interrupted session")
  .action(async (goal, options) => {
    await runPrototype(goal, options);
  });

// Subcommand: status
prototypeCommand.addCommand(
  new Command("status")
    .description("Show current/recent session status")
    .action(() => {
      runPrototypeStatus();
    }),
);

// Subcommand: list
prototypeCommand.addCommand(
  new Command("list").description("List all sessions in /tmp").action(() => {
    runPrototypeList();
  }),
);

// Subcommand: cancel
prototypeCommand.addCommand(
  new Command("cancel").description("Cancel running session").action(() => {
    runPrototypeCancel();
  }),
);

// Subcommand: clean
prototypeCommand.addCommand(
  new Command("clean")
    .description("Remove old sessions")
    .option("-d, --days <number>", "Remove sessions older than N days", (v) =>
      Number.parseInt(v, 10),
    )
    .option("-a, --all", "Remove all sessions")
    .action((options) => {
      runPrototypeClean(options);
    }),
);

export default prototypeCommand;

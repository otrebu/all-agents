/**
 * Ralph prototype command
 *
 * Starts a rapid prototyping session from a goal description.
 * Supports three input modes:
 * - Inline text: aaa ralph prototype "Build X"
 * - File path: aaa ralph prototype --file goal.md
 * - Interactive wizard (default when no args)
 *
 * @see docs/planning/VISION.md
 */

import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";
import { existsSync, readFileSync } from "node:fs";
import * as readline from "node:readline";

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
  /** The goal description text */
  goal: string;
  /** How the input was provided */
  mode: InputMode;
  /** Source file path (if mode is 'file') */
  source?: string;
}

// =============================================================================
// Input Resolution
// =============================================================================

/**
 * Resolve input from the three possible modes
 *
 * Priority:
 * 1. --file option (read from file)
 * 2. Inline argument (use directly)
 * 3. Interactive wizard (prompt user)
 *
 * @param inlineGoal - Goal provided as command argument
 * @param filePath - Path to file containing goal (--file option)
 * @returns Promise resolving to the resolved input
 */
async function resolveInput(
  inlineGoal: string | undefined,
  filePath: string | undefined,
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

  // Mode 2: Inline text argument
  if (inlineGoal !== undefined && inlineGoal.trim() !== "") {
    return { goal: inlineGoal.trim(), mode: "inline" };
  }

  // Mode 3: Interactive wizard (default)
  const wizardGoal = await runInteractiveWizard();
  if (wizardGoal === "") {
    console.error(chalk.red("\nError: No goal provided"));
    process.exit(1);
  }

  return { goal: wizardGoal, mode: "wizard" };
}

/**
 * Prompt user for goal input via interactive wizard
 *
 * @returns Promise resolving to the user's goal input
 */
async function runInteractiveWizard(): Promise<string> {
  // Check if running in TTY mode
  if (!process.stdin.isTTY) {
    console.error(
      chalk.red("Error: Interactive wizard requires a TTY terminal"),
    );
    console.error("Use inline text or --file option instead:");
    console.error('  aaa ralph prototype "Build X"');
    console.error("  aaa ralph prototype --file goal.md");
    process.exit(1);
  }

  console.log(chalk.bold("\n🚀 Ralph Prototype Wizard\n"));
  console.log(chalk.dim("Describe what you want to build."));
  console.log(chalk.dim("Press Enter twice when done.\n"));

  // eslint-disable-next-line promise/avoid-new -- readline requires manual Promise wrapping
  return new Promise<string>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const lines: Array<string> = [];
    let emptyLineCount = 0;

    rl.on("line", (line) => {
      if (line.trim() === "") {
        emptyLineCount += 1;
        if (emptyLineCount >= 2) {
          rl.close();
          resolve(lines.join("\n").trim());
          return;
        }
      } else {
        emptyLineCount = 0;
      }
      lines.push(line);
    });

    rl.on("close", () => {
      resolve(lines.join("\n").trim());
    });

    rl.prompt();
  });
}

// =============================================================================
// Command Action
// =============================================================================

/**
 * Execute the prototype command
 *
 * @param goal - Optional inline goal text
 * @param options - Command options including --file
 */
async function runPrototype(
  goal: string | undefined,
  options: { file?: string },
): Promise<void> {
  const input = await resolveInput(goal, options.file);

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

  // TODO: Implement prototyping session
  // This skeleton validates input modes work correctly
  console.log(chalk.yellow("⚠ Prototype execution not yet implemented"));
  console.log(chalk.dim("Input validation successful."));
}

// =============================================================================
// Command Definition
// =============================================================================

const prototypeCommand = new Command("prototype")
  .description("Start a rapid prototyping session from a goal description")
  .argument("[goal]", "Goal description (inline text)")
  .option("-f, --file <path>", "Read goal from a file")
  .action(async (goal, options) => {
    await runPrototype(goal, options);
  });

export default prototypeCommand;

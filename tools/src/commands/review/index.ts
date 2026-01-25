import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";

/**
 * Review command - orchestrate parallel code review using specialized agents
 *
 * Modes:
 * - interactive: Prompt user to choose mode (default when no flags)
 * - supervised: User watches execution, can intervene
 * - headless: Fully autonomous with auto-triage
 *
 * @see .claude/skills/parallel-code-review/SKILL.md
 * @see docs/planning/milestones/002-ralph-💪/stories/STORY-001-parallel-code-review.md
 */

const reviewCommand = new Command("review")
  .description("Run parallel multi-agent code review")
  .option("-s, --supervised", "Supervised mode: watch execution, can intervene")
  .option("-H, --headless", "Headless mode: fully autonomous with auto-triage")
  .option(
    "--dry-run",
    "Preview what would be fixed without making changes (requires --headless)",
  )
  .action((options) => {
    // Validate: --dry-run requires --headless
    if (options.dryRun === true && options.headless !== true) {
      console.error(chalk.red("Error: --dry-run requires --headless mode"));
      console.log("\nUsage: aaa review --headless --dry-run");
      process.exit(1);
    }

    // Validate: cannot specify both --supervised and --headless
    if (options.supervised === true && options.headless === true) {
      console.error(
        chalk.red("Error: Cannot specify both --supervised and --headless"),
      );
      process.exit(1);
    }

    // Determine mode and execute
    if (options.headless === true) {
      runHeadlessReview(options.dryRun === true);
    } else if (options.supervised === true) {
      runSupervisedReview();
    } else {
      // No mode specified - prompt user to choose
      promptForMode();
    }
  });

/**
 * Prompt user to choose between supervised and headless modes
 */
function promptForMode(): void {
  console.log(chalk.bold("Code Review Mode Selection\n"));
  console.log("Choose how to run the parallel code review:\n");
  console.log(
    `${chalk.cyan("  --supervised")}  Watch execution, can intervene if needed`,
  );
  console.log(
    `${chalk.cyan("  --headless")}     Fully autonomous with auto-triage and logging`,
  );
  console.log(
    `${chalk.dim("  --headless --dry-run")}  Preview findings without applying fixes\n`,
  );

  console.log("Run with a mode flag:");
  console.log(chalk.yellow("  aaa review --supervised"));
  console.log(chalk.yellow("  aaa review --headless"));
  console.log(chalk.yellow("  aaa review --headless --dry-run"));
}

/**
 * Run review in headless mode
 *
 * Invokes Claude headless with the parallel-code-review skill.
 * Parses JSON findings, auto-triages by severity/confidence,
 * applies fixes (unless dry-run), and logs all decisions.
 *
 * @param isDryRun - If true, preview fixes without applying
 *
 * Implementation in SUB-028
 */
function runHeadlessReview(isDryRun: boolean): void {
  if (isDryRun) {
    console.log(chalk.bold("Starting headless code review (dry-run)...\n"));
    console.log(chalk.dim("Findings will be displayed but not auto-fixed.\n"));
  } else {
    console.log(chalk.bold("Starting headless code review...\n"));
  }
  console.log(
    chalk.yellow("Note: Headless mode implementation pending (SUB-028)"),
  );
  // TODO: Implement in SUB-028
  // - Reuse invokeClaudeHeadless() from ralph/claude.ts
  // - Parse JSON findings from output
  // - Auto-triage by severity × confidence
  // - Apply fixes (unless isDryRun)
  // - Log all decisions to diary
}

/**
 * Run review in supervised mode
 *
 * Spawns a Claude chat session with the parallel-code-review skill.
 * User watches execution and can intervene.
 *
 * Implementation in SUB-027
 */
function runSupervisedReview(): void {
  console.log(chalk.bold("Starting supervised code review...\n"));
  console.log(
    chalk.yellow("Note: Supervised mode implementation pending (SUB-027)"),
  );
  // TODO: Implement in SUB-027
  // - Reuse invokeClaudeChat() from ralph/claude.ts
  // - Load parallel-code-review skill prompt
  // - User watches and can type during session
}

// =============================================================================
// Subcommands
// =============================================================================

/**
 * Review status subcommand
 *
 * Displays review diary entries and summary statistics.
 * Reads from logs/reviews.jsonl
 *
 * Implementation in SUB-029
 */
reviewCommand.addCommand(
  new Command("status")
    .description("Display review history and statistics")
    .action(() => {
      console.log(chalk.bold("Review Status\n"));
      console.log(
        chalk.yellow("Note: Status implementation pending (SUB-029)"),
      );
      // TODO: Implement in SUB-029
      // - Read logs/reviews.jsonl
      // - Display summary: total reviews, findings, fixed/skipped/falsePositives
      // - Show recent review entries
    }),
);

export default reviewCommand;

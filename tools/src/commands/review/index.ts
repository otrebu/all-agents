import * as p from "@clack/prompts";
import { Command } from "@commander-js/extra-typings";
import {
  ClaudeService,
  ClaudeServiceLive,
  FileSystemLive,
  Logger,
  LoggerLive,
} from "@tools/lib/effect";
import chalk from "chalk";
import { Effect, Layer } from "effect";
import { join } from "node:path";

import type {
  Finding,
  ReviewDiaryEntry,
  Severity,
  TriageDecision,
} from "./types";

import { formatDuration, renderMarkdown } from "../ralph/display";
import {
  aggregateDecisionsByActionEffect,
  autoTriageFindingsEffect,
  buildHeadlessReviewPromptEffect,
  type DiffTarget,
  executeCriticalFindingHooksEffect,
  executeHooksEffect,
  findProjectRootSync,
  getDiaryStatsEffect,
  parseReviewFindingsEffect,
  readDiaryEntriesEffect,
  runSupervisedReviewEffect,
  validateDiffTargetEffect,
  writeDiaryEntryEffect,
} from "./effect-review";

// Re-export for compatibility

/**
 * Review command - orchestrate parallel code review using specialized agents
 *
 * Modes:
 * - interactive: Prompt user to choose mode (default when no flags)
 * - supervised: User watches execution, can intervene
 * - headless: Fully autonomous with auto-triage
 *
 * @see .claude/skills/code-review/SKILL.md
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
  .option(
    "--require-approval",
    "Pause after triage to show fix summary and require confirmation (requires --headless)",
  )
  .option("--base <branch>", "Compare HEAD against specified branch")
  .option("--range <range>", "Compare specific commits (format: from..to)")
  .option("--staged-only", "Review only staged changes")
  .option("--unstaged-only", "Review only unstaged changes")
  .action(async (options) => {
    // Validate: --dry-run requires --headless
    if (options.dryRun === true && options.headless !== true) {
      console.error(chalk.red("Error: --dry-run requires --headless mode"));
      console.log("\nUsage: aaa review --headless --dry-run");
      process.exit(1);
    }

    // Validate: --require-approval requires --headless
    if (options.requireApproval === true && options.headless !== true) {
      console.error(
        chalk.red("Error: --require-approval requires --headless mode"),
      );
      console.log("\nUsage: aaa review --headless --require-approval");
      process.exit(1);
    }

    // Validate: cannot specify both --supervised and --headless
    if (options.supervised === true && options.headless === true) {
      console.error(
        chalk.red("Error: Cannot specify both --supervised and --headless"),
      );
      process.exit(1);
    }

    // Validate: diff target flags are mutually exclusive using Effect
    const diffTargetOptions = {
      base: options.base,
      range: options.range,
      stagedOnly: options.stagedOnly,
      unstagedOnly: options.unstagedOnly,
    };

    const diffTargetResult = await Effect.runPromiseExit(
      validateDiffTargetEffect(diffTargetOptions),
    );

    if (diffTargetResult._tag === "Failure") {
      const error = diffTargetResult.cause;
      if (error._tag === "Fail") {
        console.error(chalk.red(`Error: ${error.error.message}`));
      }
      console.log(
        "\nDiff target flags are mutually exclusive. Use only one of:",
      );
      console.log("  --base <branch>      Compare HEAD against branch");
      console.log("  --range <from>..<to> Compare specific commits");
      console.log("  --staged-only        Review only staged changes");
      console.log("  --unstaged-only      Review only unstaged changes");
      process.exit(1);
    }

    const diffTarget = diffTargetResult.value;

    if (options.headless === true) {
      await runHeadlessReview(
        options.dryRun === true,
        options.requireApproval === true,
        diffTarget,
      );
    } else if (options.supervised === true) {
      await runSupervisedReview(diffTarget);
    } else {
      // No mode specified - prompt user to choose
      promptForMode();
    }
  });

// =============================================================================
// Constants
// =============================================================================

/** Default path for review diary file */
const DIARY_PATH = "logs/reviews.jsonl";

/**
 * Format a timestamp for display
 *
 * @param timestamp - ISO 8601 timestamp
 * @returns Formatted string (e.g., "2 hours ago", "yesterday")
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  // Format as date for older entries
  return date.toLocaleDateString();
}

/**
 * Display fix summary and prompt user for approval
 *
 * Shows the number of findings to fix and affected files.
 * Returns true if user approves, false if user aborts.
 *
 * @param findings - Array of findings to fix
 * @param decisions - Triage decisions for each finding
 * @returns Promise that resolves to true if approved, false if aborted
 */
async function promptForApproval(
  findings: Array<Finding>,
  decisions: Array<TriageDecision>,
): Promise<boolean> {
  const toFix = decisions.filter((d) => d.action === "fix");
  const toSkip = decisions.filter((d) => d.action === "skip");

  // Collect unique files affected by findings to fix
  const affectedFiles = new Set<string>();
  for (const decision of toFix) {
    const finding = findings.find((f) => f.id === decision.id);
    if (finding !== undefined) {
      affectedFiles.add(finding.file);
    }
  }

  // Display summary
  console.log(
    chalk.bold(
      "\n═══════════════════════════════════════════════════════════════════",
    ),
  );
  console.log(chalk.bold("                      Approval Required"));
  console.log(
    chalk.bold(
      "═══════════════════════════════════════════════════════════════════\n",
    ),
  );

  console.log(chalk.bold("Fix Summary:"));
  console.log(
    `  ${chalk.green("●")} Findings to fix: ${chalk.green.bold(String(toFix.length))}`,
  );
  console.log(
    `  ${chalk.yellow("●")} Findings to skip: ${chalk.yellow.bold(String(toSkip.length))}`,
  );
  console.log(
    `  ${chalk.cyan("●")} Files affected: ${chalk.cyan.bold(String(affectedFiles.size))}`,
  );

  if (affectedFiles.size > 0) {
    console.log(chalk.bold("\nFiles to be modified:"));
    for (const file of affectedFiles) {
      console.log(`  ${chalk.dim("•")} ${chalk.cyan(file)}`);
    }
  }

  console.log();

  // Prompt for confirmation
  const confirmed = await p.confirm({
    initialValue: true,
    message: "Proceed with applying fixes?",
  });

  if (p.isCancel(confirmed)) {
    return false;
  }

  return confirmed;
}

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
 * Render findings summary to console
 *
 * @param findings - Array of findings to display
 * @param decisions - Triage decisions for each finding
 */
function renderFindingsSummary(
  findings: Array<Finding>,
  decisions: Array<TriageDecision>,
): void {
  if (findings.length === 0) {
    console.log(chalk.green("\n✓ No issues found by any reviewer"));
    return;
  }

  // Count by severity
  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    low: 0,
    medium: 0,
  };

  for (const finding of findings) {
    bySeverity[finding.severity] += 1;
  }

  // Count by action
  const fixed = decisions.filter((d) => d.action === "fix").length;
  const skipped = decisions.filter((d) => d.action === "skip").length;
  const falsePositives = decisions.filter(
    (d) => d.action === "false_positive",
  ).length;

  console.log(
    chalk.bold(
      "\n═══════════════════════════════════════════════════════════════════",
    ),
  );
  console.log(chalk.bold("                        Code Review Complete"));
  console.log(
    chalk.bold(
      "═══════════════════════════════════════════════════════════════════\n",
    ),
  );

  // Severity breakdown
  console.log(chalk.bold("Findings by Severity:"));
  if (bySeverity.critical > 0) {
    console.log(
      `  ${chalk.red("●")} Critical: ${chalk.red.bold(String(bySeverity.critical))}`,
    );
  }
  if (bySeverity.high > 0) {
    console.log(
      `  ${chalk.yellow("●")} High: ${chalk.yellow.bold(String(bySeverity.high))}`,
    );
  }
  if (bySeverity.medium > 0) {
    console.log(
      `  ${chalk.blue("●")} Medium: ${chalk.blue.bold(String(bySeverity.medium))}`,
    );
  }
  if (bySeverity.low > 0) {
    console.log(
      `  ${chalk.dim("●")} Low: ${chalk.dim(String(bySeverity.low))}`,
    );
  }
  console.log();

  // Triage summary
  console.log(chalk.bold("Triage Summary:"));
  console.log(
    `  ${chalk.green("✓")} Fixed: ${chalk.green.bold(String(fixed))}`,
  );
  console.log(
    `  ${chalk.yellow("→")} Skipped: ${chalk.yellow.bold(String(skipped))}`,
  );
  console.log(
    `  ${chalk.dim("○")} False Positives: ${chalk.dim(String(falsePositives))}`,
  );
  console.log();

  // Show individual findings grouped by file
  const byFile = new Map<
    string,
    Array<{ decision: TriageDecision; finding: Finding }>
  >();
  for (const [index, finding] of findings.entries()) {
    const decision = decisions[index];
    if (decision !== undefined) {
      const existing = byFile.get(finding.file) ?? [];
      existing.push({ decision, finding });
      byFile.set(finding.file, existing);
    }
  }

  console.log(chalk.bold("Findings by File:"));
  for (const [file, items] of byFile) {
    console.log(`\n  ${chalk.cyan(file)}`);
    for (const { decision, finding } of items) {
      const severityColor = {
        critical: chalk.red,
        high: chalk.yellow,
        low: chalk.dim,
        medium: chalk.blue,
      }[finding.severity];

      const actionIcon = {
        false_positive: chalk.dim("○"),
        fix: chalk.green("✓"),
        skip: chalk.yellow("→"),
      }[decision.action];

      const lineInfo = finding.line === undefined ? "" : `:${finding.line}`;
      console.log(
        `    ${actionIcon} ${severityColor(`[${finding.severity}]`)} ${finding.description.slice(0, 60)}${finding.description.length > 60 ? "..." : ""}${chalk.dim(lineInfo)}`,
      );
    }
  }
  console.log();
}

/**
 * Run review in headless mode using Effect
 *
 * Invokes Claude headless with the code-review skill.
 * Parses JSON findings using Effect.reduce for aggregation,
 * auto-triages by severity/confidence using Effect pipeline,
 * applies fixes (unless dry-run), and logs all decisions.
 *
 * @param isDryRun - If true, preview fixes without applying
 * @param requireApproval - If true, pause after triage for user confirmation
 * @param diffTarget - The diff target configuration
 */
async function runHeadlessReview(
  isDryRun: boolean,
  isRequireApproval: boolean,
  diffTarget: DiffTarget,
): Promise<void> {
  const projectRoot = findProjectRootSync();
  const skillPath = join(projectRoot, ".claude/skills/code-review/SKILL.md");

  // Create the Effect program for headless review
  const program = Effect.gen(function* runHeadlessReviewProgram() {
    const claude = yield* ClaudeService;
    const logger = yield* Logger;

    // Log start
    if (isDryRun) {
      yield* logger.info("Starting headless code review (dry-run)...");
      yield* logger.log(
        chalk.dim("Findings will be displayed but not auto-fixed."),
      );
    } else if (isRequireApproval) {
      yield* logger.info(
        "Starting headless code review (approval required)...",
      );
      yield* logger.log(
        chalk.dim("Findings will be collected. Fixes require approval."),
      );
    } else {
      yield* logger.info("Starting headless code review...");
    }

    // Build prompt using Effect
    const prompt = yield* buildHeadlessReviewPromptEffect({
      diffTarget,
      isDryRun,
      isRequireApproval,
      projectRoot,
      skillPath,
    });

    yield* logger.log(chalk.dim("\nInvoking Claude in headless mode...\n"));

    // Invoke Claude headless
    const response = yield* claude.headless({ prompt });

    // Display Claude's response (excluding the JSON block for cleaner output)
    const displayOutput = response.result
      .replace(/<review-findings>[\s\S]*<\/review-findings>/i, "")
      .trim();
    if (displayOutput) {
      yield* logger.log(renderMarkdown(displayOutput));
    }

    // Parse findings using Effect
    const parseResult = yield* Effect.either(
      parseReviewFindingsEffect(response.result),
    );

    if (parseResult._tag === "Left") {
      yield* logger.warn("\nCould not parse structured findings from output.");
      yield* logger.log(
        chalk.dim("Review completed but findings summary unavailable."),
      );
      yield* logger.log(
        `\n${chalk.dim("Duration:")} ${formatDuration(response.duration)}`,
      );
      yield* logger.log(`${chalk.dim("Cost:")} $${response.cost.toFixed(4)}`);
      return {
        decisions: [] as Array<TriageDecision>,
        findings: [],
        sessionId: response.sessionId,
      };
    }

    const reviewData = parseResult.right;

    // Auto-triage findings using Effect.reduce
    const decisions = yield* autoTriageFindingsEffect(
      reviewData.findings,
      reviewData.fixed,
    );

    return {
      cost: response.cost,
      decisions,
      duration: response.duration,
      errors: reviewData.errors,
      findings: reviewData.findings,
      sessionId: response.sessionId,
    };
  });

  // Run the Effect program with layers
  const ReviewServicesLive = Layer.mergeAll(
    ClaudeServiceLive,
    FileSystemLive,
    LoggerLive,
  );

  try {
    const result = await Effect.runPromise(
      program.pipe(Effect.provide(ReviewServicesLive)),
    );

    const { cost, decisions, duration, errors, findings, sessionId } = result;

    // Display summary
    renderFindingsSummary(findings, decisions);

    // Show any errors from reviewers
    if (errors !== undefined && errors.length > 0) {
      console.log(chalk.yellow("Reviewer Errors:"));
      for (const error of errors) {
        console.log(`  ${chalk.red("!")} ${error}`);
      }
      console.log();
    }

    // Session stats
    console.log(chalk.dim("─".repeat(68)));
    if (duration !== undefined) {
      console.log(`${chalk.dim("Duration:")} ${formatDuration(duration)}`);
    }
    if (cost !== undefined) {
      console.log(`${chalk.dim("Cost:")} $${cost.toFixed(4)}`);
    }
    console.log(`${chalk.dim("Session:")} ${sessionId}`);

    // If approval required, prompt user before proceeding
    if (isRequireApproval && findings.length > 0) {
      const isApproved = await promptForApproval(findings, decisions);

      if (!isApproved) {
        console.log(
          chalk.yellow("\nReview aborted by user. No fixes applied."),
        );
        console.log(chalk.dim("Diary entry not logged."));
        return;
      }

      console.log(
        chalk.green(
          "\nApproved! In approval mode, fixes must be applied manually.",
        ),
      );
      console.log(
        chalk.dim(
          "Run `aaa review --headless` (without --require-approval) to auto-fix findings.",
        ),
      );
    }

    // Aggregate decisions using Effect.reduce
    const actionCounts = await Effect.runPromise(
      aggregateDecisionsByActionEffect(decisions),
    );

    // Build diary entry
    const diaryEntry: ReviewDiaryEntry = {
      decisions,
      falsePositives: actionCounts.falsePositives,
      findings: findings.length,
      fixed: actionCounts.fixed,
      mode: "headless",
      sessionId,
      skipped: actionCounts.skipped,
      timestamp: new Date().toISOString(),
    };

    // Write diary entry using FileSystem service
    await Effect.runPromise(
      writeDiaryEntryEffect(diaryEntry, projectRoot).pipe(
        Effect.provide(FileSystemLive),
      ),
    );
    console.log(
      chalk.dim(
        `\nDiary entry logged to logs/reviews.jsonl (${diaryEntry.findings} findings, ${diaryEntry.fixed} fixed)`,
      ),
    );

    // Execute review complete hook
    const criticalCount = findings.filter(
      (f) => f.severity === "critical",
    ).length;

    await Effect.runPromise(
      executeHooksEffect("onReviewComplete", {
        criticalCount,
        findingCount: findings.length,
        message: `Code review complete: ${findings.length} findings, ${criticalCount} critical`,
        sessionId,
      }),
    );

    // Execute critical finding hooks in parallel using Effect.all
    await Effect.runPromise(
      executeCriticalFindingHooksEffect(findings, sessionId),
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("interrupted")) {
      console.error(chalk.red("\nHeadless review was interrupted"));
    } else {
      console.error(chalk.red("\nHeadless review failed:"), error);
    }
    process.exit(1);
  }
}

/**
 * Display review status from diary using Effect
 *
 * Shows summary statistics and recent review entries.
 */
async function runReviewStatusEffect(): Promise<void> {
  const projectRoot = findProjectRootSync();

  // Read diary entries using Effect
  const entries = await Effect.runPromise(
    readDiaryEntriesEffect(projectRoot).pipe(Effect.provide(FileSystemLive)),
  );

  console.log(
    chalk.bold(
      "╔════════════════════════════════════════════════════════════════╗",
    ),
  );
  console.log(
    chalk.bold(
      "║                        Review Status                           ║",
    ),
  );
  console.log(
    chalk.bold(
      "╚════════════════════════════════════════════════════════════════╝\n",
    ),
  );

  if (entries.length === 0) {
    console.log(chalk.dim("No review history found at logs/reviews.jsonl"));
    console.log(chalk.dim("\nRun a review to start building history:"));
    console.log(chalk.yellow("  aaa review --supervised"));
    console.log(chalk.yellow("  aaa review --headless"));
    return;
  }

  // Calculate statistics using Effect.reduce
  const stats = await Effect.runPromise(getDiaryStatsEffect(entries));

  console.log(chalk.bold("Summary Statistics"));
  console.log("──────────────────");
  console.log(`  Total reviews:     ${chalk.blue.bold(String(stats.total))}`);
  console.log(
    `  Total findings:    ${chalk.blue.bold(String(stats.totalFindings))}`,
  );
  console.log(
    `  Avg per review:    ${chalk.blue(stats.avgFindingsPerReview.toFixed(1))}`,
  );
  console.log();

  // Triage outcomes
  console.log(chalk.bold("Triage Outcomes (all reviews)"));
  console.log("─────────────────────────────");
  console.log(
    `  ${chalk.green("✓")} Fixed:           ${chalk.green.bold(String(stats.fixed))}`,
  );
  console.log(
    `  ${chalk.yellow("→")} Skipped:         ${chalk.yellow.bold(String(stats.skipped))}`,
  );
  console.log(
    `  ${chalk.dim("○")} False Positives: ${chalk.dim(String(stats.falsePositives))}`,
  );
  console.log();

  // Show recent entries (last 5)
  const recentEntries = entries.slice(-5).reverse();
  console.log(chalk.bold("Recent Reviews"));
  console.log("──────────────");

  for (const entry of recentEntries) {
    const timeAgo = formatTimestamp(entry.timestamp);
    const modeColor = entry.mode === "headless" ? chalk.cyan : chalk.magenta;

    console.log(`\n  ${modeColor(`[${entry.mode}]`)} ${chalk.dim(timeAgo)}`);
    console.log(
      `    Findings: ${entry.findings}  Fixed: ${chalk.green(String(entry.fixed))}  Skipped: ${chalk.yellow(String(entry.skipped))}  FP: ${chalk.dim(String(entry.falsePositives))}`,
    );

    // Show severity breakdown if there were findings
    if (entry.decisions.length > 0) {
      let criticalCount = 0;
      let highCount = 0;
      let mediumCount = 0;
      let lowCount = 0;

      for (const decision of entry.decisions) {
        switch (decision.severity) {
          case "critical": {
            criticalCount += 1;
            break;
          }
          case "high": {
            highCount += 1;
            break;
          }
          case "low": {
            lowCount += 1;
            break;
          }
          case "medium": {
            mediumCount += 1;
            break;
          }
          default: {
            // Unknown severity - ignore
            break;
          }
        }
      }

      const severityParts: Array<string> = [];
      if (criticalCount > 0)
        severityParts.push(chalk.red(`${criticalCount} critical`));
      if (highCount > 0) severityParts.push(chalk.yellow(`${highCount} high`));
      if (mediumCount > 0)
        severityParts.push(chalk.blue(`${mediumCount} medium`));
      if (lowCount > 0) severityParts.push(chalk.dim(`${lowCount} low`));

      if (severityParts.length > 0) {
        console.log(`    Severity: ${severityParts.join(", ")}`);
      }
    }
  }

  console.log();
  console.log(chalk.dim(`Log file: ${join(projectRoot, DIARY_PATH)}`));
}

/**
 * Run review in supervised mode using Effect
 *
 * Spawns a Claude chat session with the code-review skill.
 * User watches execution and can intervene.
 *
 * @param diffTarget - The diff target configuration
 */
async function runSupervisedReview(diffTarget: DiffTarget): Promise<void> {
  const projectRoot = findProjectRootSync();

  const ReviewServicesLive = Layer.mergeAll(ClaudeServiceLive, LoggerLive);

  try {
    const result = await Effect.runPromise(
      runSupervisedReviewEffect(diffTarget, projectRoot).pipe(
        Effect.provide(ReviewServicesLive),
      ),
    );

    if (result.interrupted) {
      console.log(chalk.yellow("\nCode review session interrupted by user."));
      process.exit(0);
    }

    if (!result.success) {
      console.error(chalk.red("\nCode review session failed"));
      process.exit(1);
    }

    console.log(chalk.green("\nCode review session completed."));
  } catch (error) {
    // Handle skill not found error
    if (
      error instanceof Error &&
      error.message.includes("ReviewSkillNotFoundError")
    ) {
      const skillPath = join(
        projectRoot,
        ".claude/skills/code-review/SKILL.md",
      );
      console.error(chalk.red(`Error: Skill not found at ${skillPath}`));
      console.log(
        chalk.dim(
          "\nEnsure the code-review skill is installed in .claude/skills/",
        ),
      );
      process.exit(1);
    }
    throw error;
  }
}

// =============================================================================
// Subcommands
// =============================================================================

/**
 * Review status subcommand
 *
 * Displays review diary entries and summary statistics.
 * Reads from logs/reviews.jsonl
 */
reviewCommand.addCommand(
  new Command("status")
    .description("Display review history and statistics")
    .action(async () => {
      await runReviewStatusEffect();
    }),
);

export default reviewCommand;

export {
  buildDiffCommand,
  type DiffTarget,
  validateDiffTargetOptions,
} from "./effect-review";

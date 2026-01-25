import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  Finding,
  ReviewDiaryEntry,
  Severity,
  TriageAction,
  TriageDecision,
} from "./types";

import {
  invokeClaudeChat,
  invokeClaudeHeadless,
} from "../ralph/claude";
import { formatDuration, renderMarkdown } from "../ralph/display";
import { calculatePriority } from "./types";

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
 * Find the project root by looking for CLAUDE.md
 *
 * Walks up from current working directory until CLAUDE.md is found.
 * This is the standard project root marker.
 *
 * @returns Project root path, or current working directory if not found
 */
function findProjectRoot(): string {
  let current = process.cwd();
  const root = "/";

  while (current !== root) {
    if (existsSync(join(current, "CLAUDE.md"))) {
      return current;
    }
    const parent = join(current, "..");
    if (parent === current) break;
    current = parent;
  }

  return process.cwd();
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
 * Auto-triage threshold for automatic fixing
 *
 * Findings with priority (severity weight × confidence) >= this threshold
 * are automatically fixed. Lower priority findings are skipped.
 *
 * With SEVERITY_WEIGHTS: critical=4, high=3, medium=2, low=1
 * and confidence 0-1, this threshold means:
 * - critical with confidence >= 0.75 (3.0)
 * - high with confidence >= 1.0 (3.0)
 *
 * This is conservative - only clear, high-confidence issues are auto-fixed.
 */
const AUTO_FIX_THRESHOLD = 3;

/**
 * Auto-triage findings by severity × confidence
 *
 * Categorizes findings into:
 * - fix: High priority findings (priority >= threshold)
 * - skip: Lower priority findings
 *
 * @param findings - Array of findings to triage
 * @param alreadyFixed - IDs already fixed by Claude during execution
 * @returns Triage decisions for each finding
 */
function autoTriageFindings(
  findings: Array<Finding>,
  alreadyFixed: Array<string>,
): Array<TriageDecision> {
  const alreadyFixedSet = new Set(alreadyFixed);

  return findings.map((finding) => {
    // If Claude already fixed this finding
    if (alreadyFixedSet.has(finding.id)) {
      return {
        action: "fix" as TriageAction,
        confidence: finding.confidence,
        id: finding.id,
        severity: finding.severity,
      };
    }

    // Calculate priority
    const priority = calculatePriority(finding);

    // Auto-fix high priority findings, skip others
    const action: TriageAction = priority >= AUTO_FIX_THRESHOLD ? "fix" : "skip";

    return {
      action,
      confidence: finding.confidence,
      id: finding.id,
      severity: finding.severity,
    };
  });
}

/**
 * Build the headless review prompt
 *
 * Creates a prompt that instructs Claude to run the parallel code review
 * and output findings in a parseable JSON format.
 *
 * @param skillPath - Path to the parallel-code-review skill
 * @param isDryRun - Whether this is a dry-run (affects instructions)
 * @returns Formatted prompt for headless Claude invocation
 */
function buildHeadlessReviewPrompt(skillPath: string, isDryRun: boolean): string {
  const skillContent = readFileSync(skillPath, "utf8");

  const dryRunInstructions = isDryRun
    ? `\n\nIMPORTANT: This is a DRY-RUN. Do NOT apply any fixes. Only report findings.`
    : `\n\nAuto-fix high-confidence findings (priority >= ${AUTO_FIX_THRESHOLD}). Skip lower priority findings.`;

  return `Execute the parallel code review workflow defined below.

CRITICAL: After completing the review, output findings in this exact JSON format at the END of your response:

<review-findings>
{
  "findings": [
    {
      "id": "<unique hash>",
      "reviewer": "<agent name>",
      "severity": "critical|high|medium|low",
      "file": "<relative path>",
      "line": <number or null>,
      "description": "<issue description>",
      "suggestedFix": "<code snippet or null>",
      "confidence": <0-1>
    }
  ],
  "fixed": ["<finding id 1>", "<finding id 2>"],
  "skipped": ["<finding id 3>"],
  "errors": []
}
</review-findings>

${dryRunInstructions}

---
${skillContent}
---

Start by gathering the diff and invoking reviewers.`;
}

/**
 * Parse findings JSON from Claude's headless output
 *
 * Looks for <review-findings>...</review-findings> block and parses the JSON.
 *
 * @param output - Raw output from Claude headless invocation
 * @returns Parsed findings data or null if parsing fails
 */
function parseReviewFindings(output: string): {
  errors: Array<string>;
  findings: Array<Finding>;
  fixed: Array<string>;
  skipped: Array<string>;
} | null {
  // Look for <review-findings>...</review-findings> block
  // Using named capture group for linting compliance
  const findingsMatch = /<review-findings>\s*(?<content>[\s\S]*?)\s*<\/review-findings>/i.exec(output);

  if (findingsMatch?.groups?.content === undefined || findingsMatch.groups.content === "") {
    console.error(chalk.yellow("Warning: Could not find <review-findings> block in output"));
    return null;
  }

  try {
    const parsed = JSON.parse(findingsMatch.groups.content) as {
      errors?: Array<string>;
      findings?: Array<Finding>;
      fixed?: Array<string>;
      skipped?: Array<string>;
    };

    return {
      errors: parsed.errors ?? [],
      findings: parsed.findings ?? [],
      fixed: parsed.fixed ?? [],
      skipped: parsed.skipped ?? [],
    };
  } catch (error) {
    console.error(chalk.red("Error parsing findings JSON:"), error);
    return null;
  }
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
  const falsePositives = decisions.filter((d) => d.action === "false_positive").length;

  console.log(chalk.bold("\n═══════════════════════════════════════════════════════════════════"));
  console.log(chalk.bold("                        Code Review Complete"));
  console.log(chalk.bold("═══════════════════════════════════════════════════════════════════\n"));

  // Severity breakdown
  console.log(chalk.bold("Findings by Severity:"));
  if (bySeverity.critical > 0) {
    console.log(`  ${chalk.red("●")} Critical: ${chalk.red.bold(String(bySeverity.critical))}`);
  }
  if (bySeverity.high > 0) {
    console.log(`  ${chalk.yellow("●")} High: ${chalk.yellow.bold(String(bySeverity.high))}`);
  }
  if (bySeverity.medium > 0) {
    console.log(`  ${chalk.blue("●")} Medium: ${chalk.blue.bold(String(bySeverity.medium))}`);
  }
  if (bySeverity.low > 0) {
    console.log(`  ${chalk.dim("●")} Low: ${chalk.dim(String(bySeverity.low))}`);
  }
  console.log();

  // Triage summary
  console.log(chalk.bold("Triage Summary:"));
  console.log(`  ${chalk.green("✓")} Fixed: ${chalk.green.bold(String(fixed))}`);
  console.log(`  ${chalk.yellow("→")} Skipped: ${chalk.yellow.bold(String(skipped))}`);
  console.log(`  ${chalk.dim("○")} False Positives: ${chalk.dim(String(falsePositives))}`);
  console.log();

  // Show individual findings grouped by file
  const byFile = new Map<string, Array<{ decision: TriageDecision; finding: Finding }>>();
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
 * Run review in headless mode
 *
 * Invokes Claude headless with the parallel-code-review skill.
 * Parses JSON findings, auto-triages by severity/confidence,
 * applies fixes (unless dry-run), and logs all decisions.
 *
 * @param isDryRun - If true, preview fixes without applying
 */
function runHeadlessReview(isDryRun: boolean): void {
  if (isDryRun) {
    console.log(chalk.bold("Starting headless code review (dry-run)...\n"));
    console.log(chalk.dim("Findings will be displayed but not auto-fixed.\n"));
  } else {
    console.log(chalk.bold("Starting headless code review...\n"));
  }

  // Find project root and skill prompt
  const projectRoot = findProjectRoot();
  const skillPath = join(
    projectRoot,
    ".claude/skills/parallel-code-review/SKILL.md",
  );

  // Check if skill file exists
  if (!existsSync(skillPath)) {
    console.error(chalk.red(`Error: Skill not found at ${skillPath}`));
    console.log(
      chalk.dim(
        "\nEnsure the parallel-code-review skill is installed in .claude/skills/",
      ),
    );
    process.exit(1);
  }

  // Build the prompt
  const prompt = buildHeadlessReviewPrompt(skillPath, isDryRun);

  console.log(chalk.dim("Invoking Claude in headless mode...\n"));

  // Invoke Claude headless
  const result = invokeClaudeHeadless({ prompt });

  if (result === null) {
    console.error(chalk.red("\nHeadless review failed or was interrupted"));
    process.exit(1);
  }

  // Display Claude's response (excluding the JSON block for cleaner output)
  const displayOutput = result.result.replace(/<review-findings>[\s\S]*<\/review-findings>/i, "").trim();
  if (displayOutput) {
    console.log(renderMarkdown(displayOutput));
  }

  // Parse findings from output
  const reviewData = parseReviewFindings(result.result);

  if (reviewData === null) {
    console.log(chalk.yellow("\nCould not parse structured findings from output."));
    console.log(chalk.dim("Review completed but findings summary unavailable."));
    console.log(`\n${chalk.dim("Duration:")} ${formatDuration(result.duration)}`);
    console.log(`${chalk.dim("Cost:")} $${result.cost.toFixed(4)}`);
    return;
  }

  const { errors, findings, fixed: alreadyFixed } = reviewData;

  // Auto-triage findings
  const decisions = autoTriageFindings(findings, alreadyFixed);

  // Display summary
  renderFindingsSummary(findings, decisions);

  // Show any errors from reviewers
  if (errors.length > 0) {
    console.log(chalk.yellow("Reviewer Errors:"));
    for (const error of errors) {
      console.log(`  ${chalk.red("!")} ${error}`);
    }
    console.log();
  }

  // Session stats
  console.log(chalk.dim("─".repeat(68)));
  console.log(`${chalk.dim("Duration:")} ${formatDuration(result.duration)}`);
  console.log(`${chalk.dim("Cost:")} $${result.cost.toFixed(4)}`);
  console.log(`${chalk.dim("Session:")} ${result.sessionId}`);

  // Build diary entry (for SUB-029 to read)
  const diaryEntry: ReviewDiaryEntry = {
    decisions,
    falsePositives: decisions.filter((d) => d.action === "false_positive").length,
    findings: findings.length,
    fixed: decisions.filter((d) => d.action === "fix").length,
    mode: "headless",
    sessionId: result.sessionId,
    skipped: decisions.filter((d) => d.action === "skip").length,
    timestamp: new Date().toISOString(),
  };

  // Log to console for now (SUB-029 will implement file logging)
  console.log(
    chalk.dim(`\nDiary entry prepared (${diaryEntry.findings} findings, ${diaryEntry.fixed} fixed)`),
  );
}

/**
 * Run review in supervised mode
 *
 * Spawns a Claude chat session with the parallel-code-review skill.
 * User watches execution and can intervene.
 */
function runSupervisedReview(): void {
  console.log(chalk.bold("Starting supervised code review...\n"));

  // Find project root and skill prompt
  const projectRoot = findProjectRoot();
  const skillPath = join(
    projectRoot,
    ".claude/skills/parallel-code-review/SKILL.md",
  );

  // Check if skill file exists
  if (!existsSync(skillPath)) {
    console.error(chalk.red(`Error: Skill not found at ${skillPath}`));
    console.log(
      chalk.dim(
        "\nEnsure the parallel-code-review skill is installed in .claude/skills/",
      ),
    );
    process.exit(1);
  }

  // Use the skill file as the prompt path
  const promptPath = skillPath;

  // Invoke Claude in chat/supervised mode
  // User can watch and type during the session
  const result = invokeClaudeChat(
    promptPath,
    "code review",
    `Execute the parallel code review workflow as defined in this skill document.

Run all phases:
1. Gather the diff of current changes
2. Invoke all reviewer agents in parallel
3. Synthesize the findings
4. Present findings for triage

Start by gathering the diff.`,
  );

  // Handle result
  if (result.interrupted) {
    console.log(chalk.yellow("\nCode review session interrupted by user."));
    process.exit(0);
  }

  if (!result.success) {
    console.error(
      chalk.red(
        `\nCode review session failed with exit code ${result.exitCode}`,
      ),
    );
    process.exit(result.exitCode ?? 1);
  }

  console.log(chalk.green("\nCode review session completed."));
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

import * as p from "@clack/prompts";
import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { ProviderType } from "../ralph/providers/types";
import type {
  Finding,
  ReviewDiaryEntry,
  Severity,
  TriageAction,
  TriageDecision,
} from "./types";

import { loadRalphConfig, loadTimeoutConfig } from "../ralph/config";
import { formatDuration, renderMarkdown } from "../ralph/display";
import { executeHook, type HookContext } from "../ralph/hooks";
import {
  getModelsForProvider,
  validateModelSelection,
} from "../ralph/providers/models";
import {
  formatProviderFailureOutcome,
  invokeWithProviderOutcome,
  resolveProvider,
  validateProviderInvocationPreflight,
} from "../ralph/providers/registry";
import { calculatePriority, FindingsArraySchema } from "./types";

/**
 * Diff target configuration for code review
 *
 * Specifies which code changes to review. Only one option can be active.
 *
 * Variants:
 * - base: git diff <branch>...HEAD
 * - range: git diff <from>..<to>
 * - default: git diff HEAD, fallback to origin/main...HEAD
 * - staged: git diff --cached
 * - unstaged: git diff (working tree only)
 */
type DiffTarget =
  | { branch: string; type: "base" }
  | { from: string; to: string; type: "range" }
  | { type: "default" }
  | { type: "staged" }
  | { type: "unstaged" };

/**
 * Options for diff target validation
 */
interface DiffTargetValidationOptions {
  base: string | undefined;
  range: string | undefined;
  stagedOnly: boolean | undefined;
  unstagedOnly: boolean | undefined;
}

/**
 * Build the git diff command based on diff target configuration
 *
 * @param diffTarget - The diff target configuration
 * @returns Git diff command string
 */
function buildDiffCommand(diffTarget: DiffTarget): string {
  switch (diffTarget.type) {
    case "base": {
      return `git diff ${diffTarget.branch}...HEAD`;
    }
    case "range": {
      return `git diff ${diffTarget.from}..${diffTarget.to}`;
    }
    case "staged": {
      return "git diff --cached";
    }
    case "unstaged": {
      return "git diff";
    }
    default: {
      return "git diff HEAD";
    }
  }
}

/**
 * Validate diff target options are mutually exclusive and parse into DiffTarget
 *
 * @param options - The diff target options from CLI
 * @returns Validation result with DiffTarget if valid, or error message if invalid
 */
function validateDiffTargetOptions(
  options: DiffTargetValidationOptions,
): { diffTarget: DiffTarget; valid: true } | { error: string; valid: false } {
  const flagCount = [
    options.base !== undefined,
    options.range !== undefined,
    options.stagedOnly === true,
    options.unstagedOnly === true,
  ].filter(Boolean).length;

  if (flagCount > 1) {
    return {
      error:
        "Cannot specify multiple diff target flags (--base, --range, --staged-only, --unstaged-only)",
      valid: false,
    };
  }

  if (options.base !== undefined) {
    return { diffTarget: { branch: options.base, type: "base" }, valid: true };
  }

  if (options.range !== undefined) {
    // Parse range format: from..to
    const rangeMatch = /^(?<from>[^.]+)\.\.(?<to>[^.]+)$/.exec(options.range);
    const fromReference = rangeMatch?.groups?.from;
    const toReference = rangeMatch?.groups?.to;
    if (fromReference === undefined || toReference === undefined) {
      return {
        error:
          "Invalid --range format. Expected: <from>..<to> (e.g., main..feature)",
        valid: false,
      };
    }
    return {
      diffTarget: { from: fromReference, to: toReference, type: "range" },
      valid: true,
    };
  }

  if (options.stagedOnly === true) {
    return { diffTarget: { type: "staged" }, valid: true };
  }

  if (options.unstagedOnly === true) {
    return { diffTarget: { type: "unstaged" }, valid: true };
  }

  return { diffTarget: { type: "default" }, valid: true };
}

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
  .option("--provider <name>", "AI provider to use (default: claude)")
  .option("--model <name>", "Model to use (validated against model registry)")
  .action((options) => {
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

    // Validate: diff target flags are mutually exclusive
    const diffTargetOptions = {
      base: options.base,
      range: options.range,
      stagedOnly: options.stagedOnly,
      unstagedOnly: options.unstagedOnly,
    };
    const diffTargetResult = validateDiffTargetOptions(diffTargetOptions);
    if (!diffTargetResult.valid) {
      console.error(chalk.red(`Error: ${diffTargetResult.error}`));
      console.log(
        "\nDiff target flags are mutually exclusive. Use only one of:",
      );
      console.log("  --base <branch>      Compare HEAD against branch");
      console.log("  --range <from>..<to> Compare specific commits");
      console.log("  --staged-only        Review only staged changes");
      console.log("  --unstaged-only      Review only unstaged changes");
      process.exit(1);
    }

    // Determine mode and execute
    const { diffTarget } = diffTargetResult as { diffTarget: DiffTarget };

    if (options.headless === true) {
      void runHeadlessReview({
        diffTarget,
        isDryRun: options.dryRun === true,
        isRequireApproval: options.requireApproval === true,
        modelOverride: options.model,
        providerOverride: options.provider,
      });
    } else if (options.supervised === true) {
      void runSupervisedReview(diffTarget, options.provider, options.model);
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

// =============================================================================
// Diary Functions
// =============================================================================

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
 * Calculate diary statistics
 *
 * @param entries - Array of diary entries to analyze
 * @returns Statistics object
 */
function getDiaryStats(entries: Array<ReviewDiaryEntry>): {
  avgFindingsPerReview: number;
  falsePositives: number;
  fixed: number;
  skipped: number;
  total: number;
  totalFindings: number;
} {
  if (entries.length === 0) {
    return {
      avgFindingsPerReview: 0,
      falsePositives: 0,
      fixed: 0,
      skipped: 0,
      total: 0,
      totalFindings: 0,
    };
  }

  let totalFindings = 0;
  let fixed = 0;
  let skipped = 0;
  let falsePositives = 0;

  for (const entry of entries) {
    totalFindings += entry.findings;
    fixed += entry.fixed;
    skipped += entry.skipped;
    falsePositives += entry.falsePositives;
  }

  return {
    avgFindingsPerReview: totalFindings / entries.length,
    falsePositives,
    fixed,
    skipped,
    total: entries.length,
    totalFindings,
  };
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

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Read and parse review diary JSONL file
 *
 * @param projectRoot - Project root path for resolving log path
 * @returns Array of diary entries (empty if file doesn't exist or is invalid)
 */
function readDiaryEntries(projectRoot: string): Array<ReviewDiaryEntry> {
  const diaryPath = join(projectRoot, DIARY_PATH);

  if (!existsSync(diaryPath)) {
    return [];
  }

  try {
    const content = readFileSync(diaryPath, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);

    return lines
      .map((line) => {
        try {
          return JSON.parse(line) as ReviewDiaryEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is ReviewDiaryEntry => entry !== null);
  } catch (error) {
    // Log but don't crash - matches writeDiaryEntry error handling pattern
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      chalk.yellow(
        `Warning: Failed to read diary entries from ${diaryPath}: ${message}`,
      ),
    );
    return [];
  }
}

/**
 * Write a review diary entry to logs/reviews.jsonl
 *
 * Creates the logs directory if it doesn't exist.
 * Appends a single JSON line to the JSONL file.
 *
 * @param entry - The diary entry to write
 * @param projectRoot - Project root path for resolving log path
 */
function writeDiaryEntry(entry: ReviewDiaryEntry, projectRoot: string): void {
  const diaryPath = join(projectRoot, DIARY_PATH);

  try {
    // Ensure logs directory exists
    const directory = dirname(diaryPath);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    // Append JSON line to diary file
    const jsonLine = JSON.stringify(entry);
    appendFileSync(diaryPath, `${jsonLine}\n`, "utf8");
  } catch (error) {
    // Log but don't crash review process
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      chalk.yellow(`Warning: Failed to write diary entry: ${message}`),
    );
  }
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
 * Options for building a headless review prompt
 */
interface HeadlessPromptOptions {
  diffTarget: DiffTarget;
  isDryRun: boolean;
  isRequireApproval: boolean;
  skillPath: string;
}

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
    const action: TriageAction =
      priority >= AUTO_FIX_THRESHOLD ? "fix" : "skip";

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
 * @param options - Configuration options for the prompt
 * @returns Formatted prompt for headless Claude invocation
 */
function buildHeadlessReviewPrompt(options: HeadlessPromptOptions): string {
  const { diffTarget, isDryRun, isRequireApproval, skillPath } = options;
  const skillContent = readFileSync(skillPath, "utf8");

  const fixInstructions = getFixInstructions(isDryRun, isRequireApproval);
  const diffCommand = buildDiffCommand(diffTarget);
  const diffInstructions =
    diffTarget.type === "default"
      ? ""
      : `\n\nIMPORTANT: Use this specific git diff command to gather changes: \`${diffCommand}\``;

  return `Execute the parallel code review workflow defined below.${diffInstructions}

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

${fixInstructions}

---
${skillContent}
---

Start by gathering the diff and invoking reviewers.`;
}

/**
 * Get fix instructions based on mode flags
 *
 * @param isDryRun - Whether this is a dry-run
 * @param isRequireApproval - Whether approval is required before fixes
 * @returns Instructions string for the prompt
 */
function getFixInstructions(
  isDryRun: boolean,
  isRequireApproval: boolean,
): string {
  if (isDryRun) {
    return `\n\nIMPORTANT: This is a DRY-RUN. Do NOT apply any fixes. Only report findings.`;
  }
  if (isRequireApproval) {
    return `\n\nIMPORTANT: APPROVAL REQUIRED mode. Do NOT apply any fixes yet. Only report findings. User will review and approve before fixes are applied.`;
  }
  return `\n\nAuto-fix high-confidence findings (priority >= ${AUTO_FIX_THRESHOLD}). Skip lower priority findings.`;
}

/**
 * Parse findings JSON from Claude's headless output
 *
 * Looks for <review-findings>...</review-findings> block and parses the JSON.
 *
 * @param output - Raw output from Claude headless invocation
 * @returns Parsed findings data or null if parsing fails
 */
function parseReviewFindings(
  output: string,
): {
  errors: Array<string>;
  findings: Array<Finding>;
  fixed: Array<string>;
  skipped: Array<string>;
} | null {
  // Look for <review-findings>...</review-findings> block
  // Using named capture group for linting compliance
  const findingsMatch =
    /<review-findings>\s*(?<content>[\s\S]*?)\s*<\/review-findings>/i.exec(
      output,
    );

  if (
    findingsMatch?.groups?.content === undefined ||
    findingsMatch.groups.content === ""
  ) {
    console.error(
      chalk.yellow("Warning: Could not find <review-findings> block in output"),
    );
    return null;
  }

  try {
    const rawParsed = JSON.parse(findingsMatch.groups.content) as {
      errors?: Array<string>;
      findings?: unknown;
      fixed?: Array<string>;
      skipped?: Array<string>;
    };

    // Validate findings array with Zod schema
    const findingsResult = FindingsArraySchema.safeParse(
      rawParsed.findings ?? [],
    );

    if (!findingsResult.success) {
      // Log Zod validation errors for debugging
      console.warn(
        chalk.yellow("Warning: Invalid findings structure in review output:"),
      );
      for (const error of findingsResult.error.errors) {
        console.warn(
          chalk.yellow(`  - ${error.path.join(".")}: ${error.message}`),
        );
      }
      // Return with empty findings but preserve other fields
      return {
        errors: rawParsed.errors ?? [],
        findings: [],
        fixed: rawParsed.fixed ?? [],
        skipped: rawParsed.skipped ?? [],
      };
    }

    return {
      errors: rawParsed.errors ?? [],
      findings: findingsResult.data,
      fixed: rawParsed.fixed ?? [],
      skipped: rawParsed.skipped ?? [],
    };
  } catch (error) {
    console.error(chalk.red("Error parsing findings JSON:"), error);
    return null;
  }
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
 * Resolve model selection with priority:
 * CLI flag > config file
 */
function resolveModel(modelOverride?: string): string | undefined {
  if (modelOverride !== undefined && modelOverride !== "") {
    return modelOverride;
  }

  try {
    const config = loadRalphConfig();
    return config.model;
  } catch {
    return undefined;
  }
}

/**
 * Run review in headless mode
 *
 * Invokes Claude headless with the code-review skill.
 * Parses JSON findings, auto-triages by severity/confidence,
 * applies fixes (unless dry-run), and logs all decisions.
 *
 * @param isDryRun - If true, preview fixes without applying
 * @param requireApproval - If true, pause after triage for user confirmation
 * @param diffTarget - The diff target configuration
 */
async function runHeadlessReview(options: {
  diffTarget: DiffTarget;
  isDryRun: boolean;
  isRequireApproval: boolean;
  modelOverride?: string;
  providerOverride?: string;
}): Promise<void> {
  const {
    diffTarget,
    isDryRun,
    isRequireApproval,
    modelOverride,
    providerOverride,
  } = options;
  if (isDryRun) {
    console.log(chalk.bold("Starting headless code review (dry-run)...\n"));
    console.log(chalk.dim("Findings will be displayed but not auto-fixed.\n"));
  } else if (isRequireApproval) {
    console.log(
      chalk.bold("Starting headless code review (approval required)...\n"),
    );
    console.log(
      chalk.dim("Findings will be collected. Fixes require approval.\n"),
    );
  } else {
    console.log(chalk.bold("Starting headless code review...\n"));
  }

  // Find project root and skill prompt
  const projectRoot = findProjectRoot();
  const skillPath = join(projectRoot, ".claude/skills/code-review/SKILL.md");

  // Check if skill file exists
  if (!existsSync(skillPath)) {
    console.error(chalk.red(`Error: Skill not found at ${skillPath}`));
    console.log(
      chalk.dim(
        "\nEnsure the code-review skill is installed in .claude/skills/",
      ),
    );
    process.exit(1);
  }

  // Build the prompt
  const prompt = buildHeadlessReviewPrompt({
    diffTarget,
    isDryRun,
    isRequireApproval,
    skillPath,
  });

  // Select provider (CLI > env > config > auto) and preflight mode support.
  let provider: ProviderType = "claude";
  try {
    provider = await resolveProvider({ cliFlag: providerOverride });
    await validateProviderInvocationPreflight(provider, "headless");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }
  console.log(chalk.dim(`Using provider: ${provider}`));

  // Select model (CLI flag > config)
  const model = resolveModel(modelOverride);

  // Validate model selection if specified
  validateModelSelectionOrExit(model, provider);

  console.log(chalk.dim("Invoking in headless mode...\n"));

  // Invoke provider headless with timeout protection
  const timeoutConfig = loadTimeoutConfig();
  const invocationOutcome = await invokeWithProviderOutcome(provider, {
    gracePeriodMs: timeoutConfig.graceSeconds * 1000,
    mode: "headless",
    model,
    prompt,
    stallTimeoutMs: timeoutConfig.stallMinutes * 60 * 1000,
    timeout: timeoutConfig.hardMinutes * 60 * 1000,
    workingDirectory: projectRoot,
  });

  if (invocationOutcome.status !== "success") {
    const formatted = formatProviderFailureOutcome(invocationOutcome);
    const color =
      invocationOutcome.status === "fatal" ? chalk.red : chalk.yellow;
    console.error(color(`\n${formatted}`));
    process.exit(1);
  }

  const { result } = invocationOutcome;

  // Display Claude's response (excluding the JSON block for cleaner output)
  const displayOutput = result.result
    .replace(/<review-findings>[\s\S]*<\/review-findings>/i, "")
    .trim();
  if (displayOutput) {
    console.log(renderMarkdown(displayOutput));
  }

  // Parse findings from output
  const reviewData = parseReviewFindings(result.result);

  if (reviewData === null) {
    console.log(
      chalk.yellow("\nCould not parse structured findings from output."),
    );
    console.log(
      chalk.dim("Review completed but findings summary unavailable."),
    );
    console.log(
      `\n${chalk.dim("Duration:")} ${formatDuration(result.durationMs)}`,
    );
    console.log(`${chalk.dim("Cost:")} $${result.costUsd.toFixed(4)}`);
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
  console.log(`${chalk.dim("Duration:")} ${formatDuration(result.durationMs)}`);
  console.log(`${chalk.dim("Cost:")} $${result.costUsd.toFixed(4)}`);
  console.log(`${chalk.dim("Session:")} ${result.sessionId}`);

  // If approval required, prompt user before proceeding
  if (isRequireApproval) {
    const isApproved = await promptForApproval(findings, decisions);

    if (!isApproved) {
      console.log(chalk.yellow("\nReview aborted by user. No fixes applied."));
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

  // Build diary entry
  const diaryEntry: ReviewDiaryEntry = {
    decisions,
    falsePositives: decisions.filter((d) => d.action === "false_positive")
      .length,
    findings: findings.length,
    fixed: decisions.filter((d) => d.action === "fix").length,
    mode: "headless",
    sessionId: result.sessionId,
    skipped: decisions.filter((d) => d.action === "skip").length,
    timestamp: new Date().toISOString(),
  };

  // Write diary entry to logs/reviews.jsonl
  writeDiaryEntry(diaryEntry, projectRoot);
  console.log(
    chalk.dim(
      `\nDiary entry logged to logs/reviews.jsonl (${diaryEntry.findings} findings, ${diaryEntry.fixed} fixed)`,
    ),
  );

  // Execute onReviewComplete hook after triage
  const criticalCount = findings.filter(
    (f) => f.severity === "critical",
  ).length;
  const reviewCompleteContext: HookContext = {
    criticalCount,
    findingCount: findings.length,
    message: `Code review complete: ${findings.length} findings, ${criticalCount} critical`,
    sessionId: result.sessionId,
  };
  await executeHook("onReviewComplete", reviewCompleteContext);

  // Execute onCriticalFinding hook for critical findings with high confidence
  const criticalFindings = findings.filter(
    (f) => f.severity === "critical" && f.confidence >= 0.9,
  );
  for (const finding of criticalFindings) {
    const criticalContext: HookContext = {
      criticalCount,
      file: finding.file,
      findingCount: findings.length,
      message: `Critical finding: ${finding.description.slice(0, 100)} in ${finding.file}`,
      sessionId: result.sessionId,
    };
    // eslint-disable-next-line no-await-in-loop -- Critical findings processed sequentially
    await executeHook("onCriticalFinding", criticalContext);
  }
}

/**
 * Display review status from diary
 *
 * Shows summary statistics and recent review entries.
 */
function runReviewStatus(): void {
  const projectRoot = findProjectRoot();
  const entries = readDiaryEntries(projectRoot);

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

  // Calculate and display statistics
  const stats = getDiaryStats(entries);

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

// =============================================================================
// Subcommands
// =============================================================================

/**
 * Run review in supervised mode
 *
 * Spawns a Claude chat session with the code-review skill.
 * User watches execution and can intervene.
 *
 * @param diffTarget - The diff target configuration
 */
async function runSupervisedReview(
  diffTarget: DiffTarget,
  providerOverride?: string,
  modelOverride?: string,
): Promise<void> {
  console.log(chalk.bold("Starting supervised code review...\n"));

  // Find project root and skill prompt
  const projectRoot = findProjectRoot();
  const skillPath = join(projectRoot, ".claude/skills/code-review/SKILL.md");

  // Check if skill file exists
  if (!existsSync(skillPath)) {
    console.error(chalk.red(`Error: Skill not found at ${skillPath}`));
    console.log(
      chalk.dim(
        "\nEnsure the code-review skill is installed in .claude/skills/",
      ),
    );
    process.exit(1);
  }

  // Use the skill file as the prompt path
  const promptPath = skillPath;

  // Build diff command instruction
  const diffCommand = buildDiffCommand(diffTarget);
  const diffInstruction =
    diffTarget.type === "default"
      ? "1. Gather the diff of current changes"
      : `1. Gather changes using: \`${diffCommand}\``;

  // Select provider (CLI > env > config > auto) and preflight mode support.
  let provider: ProviderType = "claude";
  try {
    provider = await resolveProvider({ cliFlag: providerOverride });
    await validateProviderInvocationPreflight(provider, "supervised");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }
  console.log(chalk.dim(`Using provider: ${provider}`));

  // Select model (CLI flag > config)
  const model = resolveModel(modelOverride);

  // Validate model selection if specified
  validateModelSelectionOrExit(model, provider);

  // Invoke in chat/supervised mode
  // User can watch and type during the session
  const invocationOutcome = await invokeWithProviderOutcome(provider, {
    context: `Execute the parallel code review workflow as defined in this skill document.

Run all phases:
${diffInstruction}
2. Invoke all reviewer agents in parallel
3. Synthesize the findings
4. Present findings for triage

Start by gathering the diff.`,
    mode: "supervised",
    model,
    promptPath,
    sessionName: "code review",
    workingDirectory: projectRoot,
  });

  if (invocationOutcome.status !== "success") {
    const formatted = formatProviderFailureOutcome(invocationOutcome);
    const color =
      invocationOutcome.status === "fatal" ? chalk.red : chalk.yellow;
    console.error(color(`\n${formatted}`));
    process.exit(1);
  }

  console.log(chalk.green("\nCode review session completed."));
}

function validateModelSelectionOrExit(
  model: string | undefined,
  provider: ProviderType,
): void {
  if (model === undefined) {
    return;
  }

  if (provider === "cursor") {
    const hasDiscoveredCursorModels = getModelsForProvider("cursor").length > 0;
    if (!hasDiscoveredCursorModels) {
      console.log(
        chalk.yellow(
          `Cursor model '${model}' is passed through without validation because no Cursor models are registered.\n` +
            "Run 'aaa ralph refresh-models --provider cursor' to enable strict validation.",
        ),
      );
      return;
    }

    const cursorModelResult = validateModelSelection(model, provider);
    if (!cursorModelResult.valid) {
      console.error(chalk.red(`\nError: ${cursorModelResult.error}`));
      if (cursorModelResult.suggestions.length > 0) {
        console.error(chalk.yellow("\nDid you mean:"));
        for (const suggestion of cursorModelResult.suggestions) {
          console.error(chalk.yellow(`  - ${suggestion}`));
        }
      }
      process.exit(1);
    }

    console.log(
      chalk.dim(`Using model: ${model} (${cursorModelResult.cliFormat})`),
    );
    return;
  }

  const modelResult = validateModelSelection(model, provider);
  if (!modelResult.valid) {
    console.error(chalk.red(`\nError: ${modelResult.error}`));
    if (modelResult.suggestions.length > 0) {
      console.error(chalk.yellow("\nDid you mean:"));
      for (const suggestion of modelResult.suggestions) {
        console.error(chalk.yellow(`  - ${suggestion}`));
      }
    }
    process.exit(1);
  }

  console.log(chalk.dim(`Using model: ${model} (${modelResult.cliFormat})`));
}

/**
 * Review status subcommand
 *
 * Displays review diary entries and summary statistics.
 * Reads from logs/reviews.jsonl
 */
reviewCommand.addCommand(
  new Command("status")
    .description("Display review history and statistics")
    .action(() => {
      runReviewStatus();
    }),
);

export default reviewCommand;

// Export types and utilities for testing
export { buildDiffCommand, type DiffTarget, validateDiffTargetOptions };

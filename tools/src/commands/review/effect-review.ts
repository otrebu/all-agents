/**
 * Effect-based review command implementation
 *
 * This module provides Effect-wrapped functions for:
 * - Parallel reviewer spawning with Effect.all
 * - Finding aggregation with Effect.reduce
 * - Triage logic as Effect pipelines
 * - Diary reading/writing with FileSystem service
 *
 * @module
 */

/* eslint-disable import/exports-last */

import type { ClaudeError } from "@tools/lib/effect";

import {
  ClaudeService,
  ClaudeServiceLive,
  FileSystem,
  FileSystemLive,
  Logger,
  LoggerLive,
  ReviewFindingsParseError,
  ReviewSkillNotFoundError,
  ReviewValidationError,
} from "@tools/lib/effect";
import chalk from "chalk";
import { Effect, Layer, pipe } from "effect";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import type {
  Finding,
  ReviewDiaryEntry,
  Severity,
  TriageAction,
  TriageDecision,
} from "./types";

import { executeHook, type HookContext } from "../ralph/hooks";
import { calculatePriority, FindingsArraySchema } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Diff target configuration for code review
 */
export type DiffTarget =
  | { branch: string; type: "base" }
  | { from: string; to: string; type: "range" }
  | { type: "default" }
  | { type: "staged" }
  | { type: "unstaged" };

/**
 * Options for headless review
 */
interface HeadlessReviewOptions {
  readonly diffTarget: DiffTarget;
  readonly isDryRun: boolean;
  readonly isRequireApproval: boolean;
  readonly projectRoot: string;
  readonly skillPath: string;
}

/**
 * Result from headless review
 */
interface HeadlessReviewResult {
  readonly decisions: Array<TriageDecision>;
  readonly diaryEntry: ReviewDiaryEntry;
  readonly findings: Array<Finding>;
  readonly success: boolean;
}

/**
 * Parsed review data from Claude output
 */
interface ParsedReviewData {
  readonly errors: Array<string>;
  readonly findings: Array<Finding>;
  readonly fixed: Array<string>;
  readonly skipped: Array<string>;
}

// =============================================================================
// Constants
// =============================================================================

const DIARY_PATH = "logs/reviews.jsonl";
const AUTO_FIX_THRESHOLD = 3;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Aggregate decisions by action using Effect.reduce
 */
export function aggregateDecisionsByActionEffect(
  decisions: Array<TriageDecision>,
): Effect.Effect<{ falsePositives: number; fixed: number; skipped: number }> {
  return Effect.reduce(
    decisions,
    { falsePositives: 0, fixed: 0, skipped: 0 },
    (accumulator, decision) =>
      Effect.succeed({
        falsePositives:
          accumulator.falsePositives +
          (decision.action === "false_positive" ? 1 : 0),
        fixed: accumulator.fixed + (decision.action === "fix" ? 1 : 0),
        skipped: accumulator.skipped + (decision.action === "skip" ? 1 : 0),
      }),
  );
}

/**
 * Aggregate findings by severity using Effect.reduce
 */
export function aggregateFindingsBySeverityEffect(
  findings: Array<Finding>,
): Effect.Effect<Record<Severity, number>> {
  const initial: Record<Severity, number> = {
    critical: 0,
    high: 0,
    low: 0,
    medium: 0,
  };

  return Effect.reduce(findings, initial, (accumulator, finding) =>
    Effect.succeed({
      ...accumulator,
      [finding.severity]: accumulator[finding.severity] + 1,
    }),
  );
}

// =============================================================================
// Effect-based Validation
// =============================================================================

/**
 * Auto-triage findings using Effect.reduce
 * Creates a pipeline that processes each finding and determines action
 */
export function autoTriageFindingsEffect(
  findings: Array<Finding>,
  alreadyFixed: Array<string>,
): Effect.Effect<Array<TriageDecision>> {
  return pipe(
    Effect.succeed(findings),
    Effect.flatMap((fs) =>
      Effect.reduce(fs, [] as Array<TriageDecision>, (accumulator, finding) =>
        Effect.gen(function* processTriageFinding() {
          const alreadyFixedSet = new Set(alreadyFixed);

          // If Claude already fixed this finding
          if (alreadyFixedSet.has(finding.id)) {
            return [
              ...accumulator,
              {
                action: "fix" as TriageAction,
                confidence: finding.confidence,
                id: finding.id,
                severity: finding.severity,
              },
            ];
          }

          // Calculate priority
          const priority = calculatePriority(finding);

          // Auto-fix high priority findings, skip others
          const action: TriageAction =
            priority >= AUTO_FIX_THRESHOLD ? "fix" : "skip";

          return [
            ...accumulator,
            {
              action,
              confidence: finding.confidence,
              id: finding.id,
              severity: finding.severity,
            },
          ];
        }),
      ),
    ),
  );
}

/**
 * Build the git diff command based on diff target configuration
 */
export function buildDiffCommand(diffTarget: DiffTarget): string {
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
 * Build headless review prompt using FileSystem service
 */
export function buildHeadlessReviewPromptEffect(
  options: HeadlessReviewOptions,
): Effect.Effect<string, never, FileSystem> {
  return Effect.gen(function* buildPrompt() {
    const fs = yield* FileSystem;
    const { diffTarget, isDryRun, isRequireApproval, skillPath } = options;

    const skillContent = yield* fs
      .readFile(skillPath)
      .pipe(Effect.catchAll(() => Effect.succeed("")));

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
  });
}

// =============================================================================
// Findings Parsing (Effect-based)
// =============================================================================

/**
 * Check that skill file exists
 */
export function checkSkillExistsEffect(
  skillPath: string,
): Effect.Effect<void, ReviewSkillNotFoundError> {
  if (!existsSync(skillPath)) {
    return Effect.fail(
      new ReviewSkillNotFoundError({
        message: `Skill not found at ${skillPath}`,
        path: skillPath,
      }),
    );
  }
  return Effect.void;
}

// =============================================================================
// Triage Logic (Effect Pipeline)
// =============================================================================

/**
 * Execute critical finding hooks in parallel
 */
export function executeCriticalFindingHooksEffect(
  findings: Array<Finding>,
  sessionId: string,
): Effect.Effect<void> {
  const criticalFindings = findings.filter(
    (f) => f.severity === "critical" && f.confidence >= 0.9,
  );

  if (criticalFindings.length === 0) {
    return Effect.void;
  }

  const criticalCount = criticalFindings.length;

  // Execute hooks in parallel using Effect.all
  return pipe(
    Effect.all(
      criticalFindings.map((finding) =>
        executeHooksEffect("onCriticalFinding", {
          criticalCount,
          file: finding.file,
          findingCount: findings.length,
          message: `Critical finding: ${finding.description.slice(0, 100)} in ${finding.file}`,
          sessionId,
        }),
      ),
      { concurrency: 5 },
    ),
    Effect.asVoid,
  );
}

/**
 * Execute hook actions in parallel using Effect.all
 */
export function executeHooksEffect(
  hookName: string,
  context: HookContext,
): Effect.Effect<void> {
  return Effect.tryPromise({
    catch: (error) =>
      new Error(
        `Hook execution failed: ${error instanceof Error ? error.message : String(error)}`,
      ),
    try: async () => executeHook(hookName, context),
  }).pipe(Effect.catchAll(() => Effect.void));
}

/**
 * Find the project root by looking for CLAUDE.md
 */
export function findProjectRootSync(): string {
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

// =============================================================================
// Diary Operations (Effect-based with FileSystem)
// =============================================================================

/**
 * Calculate diary statistics using Effect.reduce
 */
export function getDiaryStatsEffect(
  entries: Array<ReviewDiaryEntry>,
): Effect.Effect<{
  avgFindingsPerReview: number;
  falsePositives: number;
  fixed: number;
  skipped: number;
  total: number;
  totalFindings: number;
}> {
  if (entries.length === 0) {
    return Effect.succeed({
      avgFindingsPerReview: 0,
      falsePositives: 0,
      fixed: 0,
      skipped: 0,
      total: 0,
      totalFindings: 0,
    });
  }

  return pipe(
    Effect.reduce(
      entries,
      { falsePositives: 0, fixed: 0, skipped: 0, totalFindings: 0 },
      (accumulator, entry) =>
        Effect.succeed({
          falsePositives: accumulator.falsePositives + entry.falsePositives,
          fixed: accumulator.fixed + entry.fixed,
          skipped: accumulator.skipped + entry.skipped,
          totalFindings: accumulator.totalFindings + entry.findings,
        }),
    ),
    Effect.map((accumulator) => ({
      ...accumulator,
      avgFindingsPerReview: accumulator.totalFindings / entries.length,
      total: entries.length,
    })),
  );
}

/**
 * Parse findings JSON from Claude's headless output
 * Uses Effect for type-safe error handling
 */
export function parseReviewFindingsEffect(
  output: string,
): Effect.Effect<ParsedReviewData, ReviewFindingsParseError> {
  return Effect.gen(function* parseReviewFindings() {
    const findingsMatch =
      /<review-findings>\s*(?<content>[\s\S]*?)\s*<\/review-findings>/i.exec(
        output,
      );

    if (
      findingsMatch?.groups?.content === undefined ||
      findingsMatch.groups.content === ""
    ) {
      return yield* Effect.fail(
        new ReviewFindingsParseError({
          message: "Could not find <review-findings> block in output",
          rawOutput: output.slice(0, 500),
        }),
      );
    }

    const contentToParseRaw = findingsMatch.groups.content;
    const parseResult = yield* Effect.try({
      catch: (error) =>
        new ReviewFindingsParseError({
          cause: error,
          message: `Error parsing findings JSON: ${error instanceof Error ? error.message : String(error)}`,
          rawOutput: contentToParseRaw.slice(0, 500),
        }),
      try: () => {
        const rawParsed = JSON.parse(contentToParseRaw) as {
          errors?: Array<string>;
          findings?: unknown;
          fixed?: Array<string>;
          skipped?: Array<string>;
        };

        const findingsResult = FindingsArraySchema.safeParse(
          rawParsed.findings ?? [],
        );

        if (!findingsResult.success) {
          console.warn(
            chalk.yellow(
              "Warning: Invalid findings structure in review output:",
            ),
          );
          for (const error of findingsResult.error.errors) {
            console.warn(
              chalk.yellow(`  - ${error.path.join(".")}: ${error.message}`),
            );
          }
          return {
            errors: rawParsed.errors ?? [],
            findings: [] as Array<Finding>,
            fixed: rawParsed.fixed ?? [],
            skipped: rawParsed.skipped ?? [],
          };
        }

        return {
          errors: rawParsed.errors ?? [],
          findings: findingsResult.data as Array<Finding>,
          fixed: rawParsed.fixed ?? [],
          skipped: rawParsed.skipped ?? [],
        };
      },
    });

    return parseResult;
  });
}

// =============================================================================
// Hook Execution (Effect-based)
// =============================================================================

/**
 * Read diary entries using FileSystem service
 */
export function readDiaryEntriesEffect(
  projectRoot: string,
): Effect.Effect<Array<ReviewDiaryEntry>, never, FileSystem> {
  return Effect.gen(function* readDiaryEntries() {
    const fs = yield* FileSystem;
    const diaryPath = join(projectRoot, DIARY_PATH);

    const hasFile = yield* fs.exists(diaryPath);
    if (!hasFile) {
      return [];
    }

    const contentResult = yield* Effect.either(fs.readFile(diaryPath));
    if (contentResult._tag === "Left") {
      console.warn(
        chalk.yellow(
          `Warning: Failed to read diary entries from ${diaryPath}: ${contentResult.left.message}`,
        ),
      );
      return [];
    }

    const content = contentResult.right;
    const lines = content.trim().split("\n").filter(Boolean);

    const entries: Array<ReviewDiaryEntry> = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line) as ReviewDiaryEntry);
      } catch {
        // Skip invalid lines
      }
    }

    return entries;
  });
}

/**
 * Run headless review using Effect services
 *
 * Uses:
 * - ClaudeService for headless invocation
 * - FileSystem for diary operations
 * - Logger for output
 * - Effect.all for parallel hook execution
 * - Effect.reduce for finding aggregation
 */
export function runHeadlessReviewEffect(
  options: HeadlessReviewOptions,
): Effect.Effect<
  HeadlessReviewResult,
  ClaudeError | ReviewFindingsParseError | ReviewSkillNotFoundError,
  ClaudeService | FileSystem | Logger
> {
  return Effect.gen(function* runHeadlessReview() {
    const claude = yield* ClaudeService;
    const logger = yield* Logger;
    const { isDryRun, isRequireApproval, projectRoot, skillPath } = options;

    // Check skill exists
    yield* checkSkillExistsEffect(skillPath);

    // Build prompt
    const prompt = yield* buildHeadlessReviewPromptEffect(options);

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

    yield* logger.log(chalk.dim("\nInvoking Claude in headless mode...\n"));

    // Invoke Claude headless
    const response = yield* claude.headless({ prompt });

    // Parse findings
    const reviewData = yield* parseReviewFindingsEffect(response.result);

    // Auto-triage findings using Effect.reduce
    const decisions = yield* autoTriageFindingsEffect(
      reviewData.findings,
      reviewData.fixed,
    );

    // Aggregate decisions
    const actionCounts = yield* aggregateDecisionsByActionEffect(decisions);

    // Build diary entry
    const diaryEntry: ReviewDiaryEntry = {
      decisions,
      falsePositives: actionCounts.falsePositives,
      findings: reviewData.findings.length,
      fixed: actionCounts.fixed,
      mode: "headless",
      sessionId: response.sessionId,
      skipped: actionCounts.skipped,
      timestamp: new Date().toISOString(),
    };

    // Write diary entry
    yield* writeDiaryEntryEffect(diaryEntry, projectRoot);

    // Execute review complete hook
    const criticalCount = reviewData.findings.filter(
      (f) => f.severity === "critical",
    ).length;

    yield* executeHooksEffect("onReviewComplete", {
      criticalCount,
      findingCount: reviewData.findings.length,
      message: `Code review complete: ${reviewData.findings.length} findings, ${criticalCount} critical`,
      sessionId: response.sessionId,
    });

    // Execute critical finding hooks in parallel
    yield* executeCriticalFindingHooksEffect(
      reviewData.findings,
      response.sessionId,
    );

    return {
      decisions,
      diaryEntry,
      findings: reviewData.findings,
      success: true,
    };
  });
}

// =============================================================================
// Prompt Building (Effect-based)
// =============================================================================

/**
 * Run supervised review using ClaudeService
 */
export function runSupervisedReviewEffect(
  diffTarget: DiffTarget,
  projectRoot: string,
): Effect.Effect<
  { interrupted: boolean; success: boolean },
  ClaudeError | ReviewSkillNotFoundError,
  ClaudeService | Logger
> {
  return Effect.gen(function* runSupervisedReview() {
    const claude = yield* ClaudeService;
    const logger = yield* Logger;

    const skillPath = join(projectRoot, ".claude/skills/code-review/SKILL.md");

    yield* checkSkillExistsEffect(skillPath);

    yield* logger.info("Starting supervised code review...\n");

    // Build diff command instruction
    const diffCommand = buildDiffCommand(diffTarget);
    const diffInstruction =
      diffTarget.type === "default"
        ? "1. Gather the diff of current changes"
        : `1. Gather changes using: \`${diffCommand}\``;

    const extraContext = `Execute the parallel code review workflow as defined in this skill document.

Run all phases:
${diffInstruction}
2. Invoke all reviewer agents in parallel
3. Synthesize the findings
4. Present findings for triage

Start by gathering the diff.`;

    // Invoke Claude in chat mode
    const result = yield* claude.chat({
      extraContext,
      promptPath: skillPath,
      sessionName: "code review",
    });

    return { interrupted: result.interrupted, success: result.success };
  });
}

/**
 * Validate diff target options
 * Returns Effect.Effect<DiffTarget, ReviewValidationError>
 */
export function validateDiffTargetEffect(options: {
  base: string | undefined;
  range: string | undefined;
  stagedOnly: boolean | undefined;
  unstagedOnly: boolean | undefined;
}): Effect.Effect<DiffTarget, ReviewValidationError> {
  return Effect.gen(function* validateDiffTarget() {
    const flagCount = [
      options.base !== undefined,
      options.range !== undefined,
      options.stagedOnly === true,
      options.unstagedOnly === true,
    ].filter(Boolean).length;

    if (flagCount > 1) {
      return yield* Effect.fail(
        new ReviewValidationError({
          message:
            "Cannot specify multiple diff target flags (--base, --range, --staged-only, --unstaged-only)",
        }),
      );
    }

    if (options.base !== undefined) {
      return { branch: options.base, type: "base" as const };
    }

    if (options.range !== undefined) {
      const rangeMatch = /^(?<from>[^.]+)\.\.(?<to>[^.]+)$/.exec(options.range);
      const fromReference = rangeMatch?.groups?.from;
      const toReference = rangeMatch?.groups?.to;
      if (fromReference === undefined || toReference === undefined) {
        return yield* Effect.fail(
          new ReviewValidationError({
            field: "range",
            message:
              "Invalid --range format. Expected: <from>..<to> (e.g., main..feature)",
          }),
        );
      }
      return { from: fromReference, to: toReference, type: "range" as const };
    }

    if (options.stagedOnly === true) {
      return { type: "staged" as const };
    }

    if (options.unstagedOnly === true) {
      return { type: "unstaged" as const };
    }

    return { type: "default" as const };
  });
}

// =============================================================================
// Headless Review (Effect-based)
// =============================================================================

/**
 * Sync version of validateDiffTargetEffect for backward compatibility with tests
 * Returns the same result format as the original validateDiffTargetOptions
 */
export function validateDiffTargetOptions(options: {
  base: string | undefined;
  range: string | undefined;
  stagedOnly: boolean | undefined;
  unstagedOnly: boolean | undefined;
}): { diffTarget: DiffTarget; valid: true } | { error: string; valid: false } {
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

// =============================================================================
// Supervised Review (Effect-based)
// =============================================================================

/**
 * Write diary entry using FileSystem service
 */
export function writeDiaryEntryEffect(
  entry: ReviewDiaryEntry,
  projectRoot: string,
): Effect.Effect<void, never, FileSystem> {
  return Effect.gen(function* writeDiaryEntry() {
    const fs = yield* FileSystem;
    const diaryPath = join(projectRoot, DIARY_PATH);

    // Ensure logs directory exists
    const directory = dirname(diaryPath);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    // Read existing content or start fresh
    const hasFile = yield* fs.exists(diaryPath);
    let existingContent = "";
    if (hasFile) {
      const result = yield* Effect.either(fs.readFile(diaryPath));
      if (result._tag === "Right") {
        existingContent = result.right;
      }
    }

    // Append JSON line
    const jsonLine = JSON.stringify(entry);
    const newContent =
      existingContent === ""
        ? `${jsonLine}\n`
        : `${existingContent}${jsonLine}\n`;

    const writeResult = yield* Effect.either(
      fs.writeFile(diaryPath, newContent),
    );
    if (writeResult._tag === "Left") {
      console.error(
        chalk.yellow(
          `Warning: Failed to write diary entry: ${writeResult.left.message}`,
        ),
      );
    }
  });
}

// =============================================================================
// Review Status (Effect-based)
// =============================================================================

/**
 * Get fix instructions based on mode flags
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

// =============================================================================
// Layers
// =============================================================================

/**
 * Combined layer for review operations
 */
export const ReviewLive = Layer.mergeAll(
  ClaudeServiceLive,
  FileSystemLive,
  LoggerLive,
);

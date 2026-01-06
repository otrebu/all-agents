import type { PRD } from "./types";

/**
 * Build the Claude prompt for a single iteration.
 * The prompt instructs Claude to implement one feature from the PRD.
 */
export function buildPrompt(
  prdPath: string,
  progressPath: string,
  prd: PRD,
): string {
  const { testCommand } = prd;
  const typecheckCommand = prd.typecheckCommand ?? testCommand;
  const smokeTestCommand = prd.smokeTestCommand ?? testCommand;

  return `You are implementing features from a PRD.

PRD: @${prdPath}
Progress: @${progressPath}

BEFORE STARTING:
1. Run: ${smokeTestCommand} to verify current state
2. If tests fail, FIX EXISTING BUGS first (do not start new features)
3. Check for any "in_progress" features - complete them first

IMPLEMENTATION:
1. Find highest-priority "pending" feature (high > medium > low, then array order)
2. Set status to "in_progress"
3. Implement ONLY that single feature
4. Run: ${typecheckCommand} and ${testCommand}
5. Verify ALL testSteps pass
6. Update PRD - set status to "done" ONLY if all testSteps verified
7. Append to progress.md with date, changes, verification status
8. Commit: git commit -m "feat(#{id}): {description}"

CONSTRAINTS:
- Work on ONLY ONE feature per iteration
- NEVER remove, modify, or skip any feature from the PRD
- NEVER mark "done" until ALL testSteps verified
- If blocked, set status to "blocked" with blockedReason

CRITICAL: After completing ONE feature, STOP IMMEDIATELY.
Do NOT proceed to the next feature. Do NOT continue working.
The harness will call you again for the next feature with fresh context.

If all features are "done", output: <complete/>`;
}

/**
 * Check if Claude's output indicates the PRD is complete
 */
export function isCompleteSignal(output: string): boolean {
  return output.includes("<complete/>");
}

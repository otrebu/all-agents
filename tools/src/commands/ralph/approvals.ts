import {
  type ApprovalMode,
  type ApprovalsConfig,
  loadAaaConfig,
} from "@tools/lib/config";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as readline from "node:readline";

import { sendNotification } from "../notify/client";
import { type ApprovalGateCardData, renderApprovalGateCard } from "./display";

/**
 * Approval evaluation logic for Ralph artifact creation.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Actions that can result from approval evaluation.
 */
type ApprovalAction = "exit-unstaged" | "notify-wait" | "prompt" | "write";

/**
 * Runtime context for approval evaluation.
 */
interface ApprovalContext {
  /** --force flag: skip all approval prompts and proceed immediately. */
  forceFlag: boolean;
  /** Whether running in TTY (interactive) mode with stdin attached. */
  isTTY: boolean;
  /** --review flag: require explicit approval at all gates. */
  reviewFlag: boolean;
}

/**
 * Artifact-centric approval gates used by Ralph planning/build checkpoints.
 */
type ApprovalGate =
  | "correctionTasks"
  | "createRoadmap"
  | "createStories"
  | "createSubtasks"
  | "createTasks"
  | "onDriftDetected";

/**
 * Context required to run the exit-unstaged flow.
 */
interface ExitUnstagedContext {
  /** Target level for cascading continuation. */
  cascadeTarget: string;
  /** Gate that required manual approval. */
  gate: ApprovalGate;
  /** Current cascade level that generated artifacts. */
  level: string;
  /** Absolute or workspace path to the milestone directory. */
  milestonePath: string;
}

/**
 * Context for writing an exit-unstaged feedback file.
 */
interface FeedbackContext {
  /** Target level for cascading continuation. */
  cascadeTarget: string;
  /** Gate that required manual approval. */
  gate: ApprovalGate;
  /** Current cascade level that generated artifacts. */
  level: string;
  /** Absolute or workspace path to the milestone directory. */
  milestonePath: string;
  /** Human-readable summary of generated artifacts. */
  summary: string;
}

const DEFAULT_SUGGEST_WAIT_SECONDS = 180;

// =============================================================================
// Functions
// =============================================================================

function evaluateApproval(
  gate: ApprovalGate,
  config: ApprovalsConfig | undefined,
  context: ApprovalContext,
): ApprovalAction {
  if (context.forceFlag) {
    return "write";
  }

  let mode: ApprovalMode = config?.[gate] ?? "suggest";

  if (context.reviewFlag) {
    mode = "always";
  }

  if (mode === "auto") {
    return "write";
  }

  if (mode === "always") {
    return context.isTTY ? "prompt" : "exit-unstaged";
  }

  return context.isTTY ? "write" : "notify-wait";
}

/**
 * Phase 2 for exit-unstaged flow: write review file and print instructions.
 */
// eslint-disable-next-line function-name/starts-with-verb -- name required by workflow/task contract
function finalizeExitUnstaged(
  context: ExitUnstagedContext,
  summary: string,
): void {
  const feedbackPath = writeFeedbackFile({ ...context, summary });
  const nextLevel = getNextLevel(context.level);
  const milestoneName = path.basename(context.milestonePath);
  const resumeCommand =
    nextLevel === null
      ? "# Cascade complete"
      : `aaa ralph plan --milestone ${milestoneName} --cascade ${context.cascadeTarget} --from ${nextLevel}`;

  printExitInstructions(feedbackPath, resumeCommand);
}

function formatGateName(gate: ApprovalGate): string {
  const gateBody = gate.replace(/^create/, "").replace(/^on/, "");
  const spaced = gateBody
    .replaceAll(/(?<capital>[A-Z])/g, " $<capital>")
    .trim();

  if (gate.startsWith("create")) {
    return `Create ${spaced}`;
  }

  return `${spaced[0]?.toUpperCase() ?? ""}${spaced.slice(1)}`;
}

/**
 * Get the next cascade level after the current one.
 */
function getNextLevel(level: string): null | string {
  const levels = [
    "roadmap",
    "stories",
    "tasks",
    "subtasks",
    "build",
    "calibrate",
  ];
  const index = levels.indexOf(level);
  if (index < 0 || index === levels.length - 1) {
    return null;
  }
  return levels[index + 1] ?? null;
}

/**
 * Create a checkpoint commit before exit-unstaged artifact generation.
 */
// eslint-disable-next-line function-name/starts-with-verb -- name required by workflow/task contract
function gitCheckpoint(gate: ApprovalGate): boolean {
  try {
    execSync("git add -A", { stdio: "pipe" });

    const status = execSync("git status --porcelain", {
      encoding: "utf8",
      stdio: "pipe",
    });
    if (status.trim() === "") {
      return false;
    }

    const message = `chore(ralph): checkpoint before ${gate}`;
    execSync(`git commit -m "${message}"`, { stdio: "pipe" });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[Approval] Failed to create checkpoint: ${message}`);
    return false;
  }
}

// eslint-disable-next-line max-params -- optional card data is threaded for live gate visibility
async function handleNotifyWait(
  gate: ApprovalGate,
  config: ApprovalsConfig | undefined,
  summary: string,
  cardData?: ApprovalGateCardData,
): Promise<void> {
  const waitSeconds =
    config?.suggestWaitSeconds ?? DEFAULT_SUGGEST_WAIT_SECONDS;
  const gateDisplay = formatGateName(gate);
  const { notify } = loadAaaConfig();

  if (cardData !== undefined) {
    console.log(renderApprovalGateCard(cardData));
  }

  if (
    notify !== undefined &&
    notify.enabled !== false &&
    notify.server !== undefined &&
    notify.defaultTopic !== undefined
  ) {
    try {
      await sendNotification({
        message: `${summary}\n\nProceeding in ${waitSeconds} seconds...`,
        priority: "default",
        server: notify.server,
        title: `Ralph: ${gateDisplay}`,
        topic: notify.defaultTopic,
        username: notify.username,
      });
      console.log(`[Approval] Notification sent for ${gateDisplay}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Approval] Failed to send notification: ${message}`);
    }
  } else {
    console.log("[Approval] Notification skipped (disabled or missing config)");
  }

  console.log(
    `[Approval] Waiting ${waitSeconds}s before proceeding with ${gateDisplay}...`,
  );
  await sleep(waitSeconds * 1000);
  console.log("[Approval] Wait complete, proceeding");
}

/**
 * Phase 1 for exit-unstaged flow: checkpoint current repo state.
 */
function prepareExitUnstaged(context: ExitUnstagedContext): void {
  gitCheckpoint(context.gate);
}

/**
 * Print console instructions for exit-unstaged approval workflow.
 */
function printExitInstructions(
  feedbackPath: string,
  resumeCommand: string,
): void {
  const separator = "=".repeat(60);

  console.log();
  console.log(separator);
  console.log("  APPROVAL REQUIRED");
  console.log(separator);
  console.log();
  console.log("  Generated artifacts are unstaged. Review and choose:");
  console.log();
  console.log('    Approve:  git add . && git commit -m "feat: ..."');
  console.log("    Reject:   git checkout .");
  console.log("    Modify:   edit files, then approve");
  console.log();
  console.log(`  Resume:     ${resumeCommand}`);
  console.log();
  console.log(`  Details:    ${feedbackPath}`);
  console.log();
  console.log(separator);
  console.log();
}

async function promptApproval(
  gate: ApprovalGate,
  summary: string,
  cardData?: ApprovalGateCardData,
): Promise<boolean> {
  if (cardData !== undefined) {
    console.log(renderApprovalGateCard(cardData));
  }

  const gateDisplay = formatGateName(gate);

  console.log();
  console.log(`${gateDisplay}:`);
  console.log(summary);
  console.log();

  // eslint-disable-next-line promise/avoid-new -- readline requires manual Promise wrapping
  return new Promise<boolean>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on("error", () => {
      rl.close();
      resolve(false);
    });

    rl.question("Approve? [Y/n]: ", (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized !== "n" && normalized !== "no");
    });
  });
}

/**
 * Sleep for a given number of milliseconds.
 */
async function sleep(ms: number): Promise<void> {
  // eslint-disable-next-line promise/avoid-new -- setTimeout requires manual Promise wrapping
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Write a feedback markdown file for exit-unstaged review.
 */
function writeFeedbackFile(context: FeedbackContext): string {
  const { cascadeTarget, gate, level, milestonePath, summary } = context;
  const feedbackDirectory = path.join(milestonePath, "feedback");
  try {
    mkdirSync(feedbackDirectory, { recursive: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create feedback directory: ${message}`);
  }

  const date = new Date().toISOString().split("T")[0] ?? "feedback";
  const filePath = path.join(feedbackDirectory, `${date}_${gate}.md`);
  const timestamp = new Date().toISOString();
  const milestoneName = path.basename(milestonePath);
  const nextLevel = getNextLevel(level);
  const resumeCommand =
    nextLevel === null
      ? "# Cascade complete - no resume needed"
      : `aaa ralph plan --milestone ${milestoneName} --cascade ${cascadeTarget} --from ${nextLevel}`;

  const content = `# Approval Required: ${formatGateName(gate)}

Generated: ${timestamp}
Level: ${level}
Milestone: ${milestoneName}

## Summary

${summary}

## Generated Files

Review the unstaged changes:

\`\`\`bash
git status
git diff
\`\`\`

## Instructions

### Approve

Accept the generated artifacts as-is:

\`\`\`bash
git add . && git commit -m "feat(ralph): generated ${level} artifacts"
${resumeCommand}
\`\`\`

### Reject

Discard all generated artifacts:

\`\`\`bash
git checkout .
\`\`\`

### Modify

Edit the generated files, then approve:

1. Review and edit the generated files as needed
2. Stage and commit:

\`\`\`bash
git add . && git commit -m "feat(ralph): generated ${level} artifacts (edited)"
${resumeCommand}
\`\`\`

---
*Generated by Ralph approval system*
`;

  try {
    writeFileSync(filePath, content, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to write feedback file ${filePath}: ${message}`);
  }
  return filePath;
}

// =============================================================================
// Exports
// =============================================================================

export {
  type ApprovalAction,
  type ApprovalContext,
  type ApprovalGate,
  DEFAULT_SUGGEST_WAIT_SECONDS,
  evaluateApproval,
  type ExitUnstagedContext,
  type FeedbackContext,
  finalizeExitUnstaged,
  formatGateName,
  getNextLevel,
  gitCheckpoint,
  handleNotifyWait,
  prepareExitUnstaged,
  printExitInstructions,
  promptApproval,
  sleep,
  writeFeedbackFile,
};

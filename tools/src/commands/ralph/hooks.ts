/**
 * Hook execution system for Ralph autonomous build
 *
 * This module provides hook execution for:
 * - Log action: Output messages to console
 * - Notify action: Send push notifications via ntfy
 * - Pause action: Interactive pause with TTY check
 *
 * Hooks are configured in aaa.config.json and triggered at specific points
 * in the build lifecycle (onIterationComplete, onMaxIterationsExceeded, etc.)
 *
 * @see docs/planning/schemas/ralph-config.schema.json
 */

import { loadAaaConfig } from "@tools/lib/config";
import * as readline from "node:readline";

import type { HookAction } from "./types";

import { loadRalphConfig } from "./config";
import raiseSigint from "./signal";

// =============================================================================
// Types
// =============================================================================

/**
 * Context passed to hook execution
 */
interface HookContext {
  /** Total cost in USD for the iteration (from Claude API response) */
  costUsd?: number;
  /** Number of critical severity findings (for review hooks) */
  criticalCount?: number;
  /** Human-readable duration string (e.g., "2m 30s") */
  duration?: string;
  /** File path (for onCriticalFinding hook) */
  file?: string;
  /** Number of files changed in the iteration */
  filesChanged?: number;
  /** Total number of findings (for review hooks) */
  findingCount?: number;
  /** Current iteration number within the subtask (1-based) */
  iterationNumber?: number;
  /** Lines of code added in the iteration */
  linesAdded?: number;
  /** Lines of code removed in the iteration */
  linesRemoved?: number;
  /** Maximum number of iterations allowed per subtask */
  maxIterations?: number;
  /** Human-readable message describing what triggered the hook */
  message: string;
  /** Milestone name (e.g., "003-ralph-workflow") */
  milestone?: string;
  /** Claude Code session ID (for traceability) */
  sessionId?: string;
  /** Optional subtask ID for context */
  subtaskId?: string;
}

/**
 * Result of executing a hook
 */
interface HookResult {
  /** Actions that were executed */
  actionsExecuted: Array<HookAction>;
  /** Any errors encountered during execution */
  errors: Array<string>;
  /** Whether all actions completed successfully */
  success: boolean;
}

// =============================================================================
// Hook Dispatcher
// =============================================================================

/**
 * Execute a hook by name, running all configured actions
 *
 * Reads hook configuration from ralph.config.json and dispatches
 * to the appropriate action handlers.
 *
 * @param hookName - Name of the hook to execute (e.g., "onMaxIterationsExceeded")
 * @param context - Context information for the hook
 * @param configPath - Optional path to ralph.config.json
 * @returns Promise with execution result
 *
 * @example
 * await executeHook("onMaxIterationsExceeded", {
 *   message: "Subtask SUB-019 failed after 3 attempts",
 *   subtaskId: "SUB-019"
 * });
 */
async function executeHook(
  hookName: string,
  context: HookContext,
  configPath?: string,
): Promise<HookResult> {
  console.log(`=== Triggering hook: ${hookName} ===`);

  const config = loadRalphConfig(configPath);
  const actionsExecuted: Array<HookAction> = [];
  const errors: Array<string> = [];

  // Get actions for this hook from config
  const { hooks } = config;
  const configuredActions =
    hooks === undefined ? undefined : hooks[hookName as keyof typeof hooks];

  // Default to log action if no actions configured
  const actions =
    configuredActions === undefined || configuredActions.length === 0
      ? ["log"]
      : configuredActions;

  // Execute each action sequentially
  // Note: Actions are executed in order, and pause/notify may require await
  for (const action of actions) {
    try {
      switch (action) {
        case "log": {
          executeLogAction(hookName, context);
          actionsExecuted.push("log");
          break;
        }
        case "notify": {
          // eslint-disable-next-line no-await-in-loop -- Actions must execute in order
          await executeNotifyAction(hookName, context);
          actionsExecuted.push("notify");
          break;
        }
        case "pause": {
          // eslint-disable-next-line no-await-in-loop -- Actions must execute in order
          await executePauseAction(hookName);
          actionsExecuted.push("pause");
          break;
        }
        default: {
          console.log(`[Hook:${hookName}] Unknown action: ${action}`);
          errors.push(`Unknown action: ${action}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Action ${action} failed: ${message}`);
    }
  }

  return { actionsExecuted, errors, success: errors.length === 0 };
}

// =============================================================================
// Action Implementations
// =============================================================================

/**
 * Execute log action - output message to console
 *
 * @param hookName - Name of the hook being executed
 * @param context - Hook context with message
 */
function executeLogAction(hookName: string, context: HookContext): void {
  console.log(`[Hook:${hookName}] ${context.message}`);
}

/**
 * Execute notify action via aaa notify CLI
 *
 * Uses Bun.spawn to call the aaa notify CLI with --event flag for event-based
 * routing. Falls back to inline fetch if CLI is not available (ENOENT).
 *
 * @param hookName - Name of the hook being executed
 * @param context - Hook context with message
 * @returns true if notification was sent successfully, false otherwise
 */
async function executeNotifyAction(
  hookName: string,
  context: HookContext,
): Promise<boolean> {
  const eventName = hookNameToEventName(hookName);

  // Format message with metrics
  const formattedMessage = formatNotificationMessage(hookName, context);

  console.log(
    `[Hook:${hookName}] Sending notification via CLI --event ${eventName}`,
  );

  try {
    // Fire-and-forget by default to avoid blocking long-running builds.
    const proc = Bun.spawn(
      ["aaa", "notify", "--event", eventName, "--quiet", formattedMessage],
      { stderr: "ignore", stdin: "ignore", stdout: "ignore" },
    );

    void (async () => {
      try {
        await proc.exited;
        if (proc.exitCode !== 0) {
          console.log(
            `[Hook:${hookName}] CLI notification failed (exit ${proc.exitCode})`,
          );
        }
      } catch {
        // Ignore: we intentionally don't want notification errors to block builds.
      }
    })();

    // If the process already failed synchronously, surface that as a failure.
    if (typeof proc.exitCode === "number" && proc.exitCode !== 0) {
      return false;
    }
    return true;
  } catch (error) {
    // Check if CLI not found (ENOENT)
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.log(
        `[Hook:${hookName}] CLI not found, falling back to inline fetch`,
      );
      return executeNotifyFallback(hookName, context);
    }

    const message = error instanceof Error ? error.message : String(error);
    console.log(`[Hook:${hookName}] Notification failed: ${message}`);
    return false;
  }
}

/**
 * Fallback notification via inline fetch (when CLI not available)
 *
 * Uses native fetch() to POST to the ntfy server directly.
 * Gets notification config from unified aaa.config.json (notify section).
 *
 * @param hookName - Name of the hook being executed
 * @param context - Hook context with message
 * @returns true if notification was sent successfully, false otherwise
 */
async function executeNotifyFallback(
  hookName: string,
  context: HookContext,
): Promise<boolean> {
  // Get notify config from unified config instead of legacy ntfy section
  const { notify } = loadAaaConfig();

  // Check if notify is configured with a topic
  if (
    notify?.defaultTopic === undefined ||
    notify.defaultTopic === "" ||
    notify.defaultTopic === "your-ntfy-topic"
  ) {
    console.log(
      `[Hook:${hookName}] notify action: notify.defaultTopic not configured in aaa.config.json`,
    );
    return false;
  }

  const server =
    notify.server === undefined || notify.server === ""
      ? "https://ntfy.sh"
      : notify.server;
  const url = `${server}/${notify.defaultTopic}`;

  // Format message with metrics
  const formattedMessage = formatNotificationMessage(hookName, context);

  console.log(`[Hook:${hookName}] Sending notification via fallback to ${url}`);

  const NOTIFY_TIMEOUT_MS = 5000;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, NOTIFY_TIMEOUT_MS);
  const maybeTimer = timer as unknown as { unref?: () => void };
  if (typeof maybeTimer.unref === "function") {
    maybeTimer.unref();
  }

  try {
    const response = await fetch(url, {
      body: formattedMessage,
      headers: { Title: `Ralph Build: ${hookName}` },
      method: "POST",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.log(
        `[Hook:${hookName}] Notification failed: ${response.status} ${response.statusText}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    clearTimeout(timer);
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[Hook:${hookName}] Notification failed: ${message}`);
    return false;
  }
}

/**
 * Execute pause action - pause for user intervention
 *
 * Checks process.stdin.isTTY before prompting:
 * - TTY mode: Shows prompt and waits for Enter
 * - Non-TTY mode: Logs message and continues without blocking
 *
 * Uses readline for interactive pause prompt.
 *
 * @param hookName - Name of the hook being executed
 */
async function executePauseAction(hookName: string): Promise<void> {
  console.log(`[Hook:${hookName}] Pausing for user intervention...`);

  // Check if running in TTY mode
  if (!process.stdin.isTTY) {
    console.log(
      `[Hook:${hookName}] Non-interactive mode detected, skipping pause`,
    );
    return;
  }

  // Interactive pause using readline with 5-minute timeout
  const PAUSE_TIMEOUT_MS = 5 * 60 * 1000;
  // eslint-disable-next-line promise/avoid-new -- readline requires manual Promise wrapping
  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const timeout = setTimeout(() => {
      console.log(`\n[Hook:${hookName}] Pause timed out after 5 minutes`);
      rl.close();
      resolve();
    }, PAUSE_TIMEOUT_MS);

    // Handle Ctrl+C explicitly - propagate to process-level handler
    rl.on("SIGINT", () => {
      clearTimeout(timeout);
      rl.close();
      raiseSigint();
    });

    rl.question("Press Enter to continue or Ctrl+C to abort: ", () => {
      clearTimeout(timeout);
      rl.close();
      resolve();
    });
  });
}

/**
 * Format a notification message with optional metrics
 *
 * Builds a rich notification message from HookContext, appending a metrics line
 * if any metrics (files changed, lines added/removed, cost, session) are available.
 *
 * @param hookName - Name of the hook being executed (for context in message)
 * @param context - Hook context with message and optional metrics
 * @returns Formatted message with metrics appended when available
 *
 * @example
 * // Full metrics
 * formatNotificationMessage("onSubtaskComplete", {
 *   message: "Completed SUB-019",
 *   filesChanged: 3,
 *   linesAdded: 45,
 *   linesRemoved: 12,
 *   costUsd: 0.23,
 *   sessionId: "abc12345-defg-6789-hijk"
 * });
 * // Returns: "Completed SUB-019\nFiles: 3 | Lines: +45/-12 | Cost: $0.23 | Session: abc12345"
 *
 * @example
 * // No metrics
 * formatNotificationMessage("onMaxIterationsExceeded", {
 *   message: "Failed after 3 attempts"
 * });
 * // Returns: "Failed after 3 attempts"
 */
function formatNotificationMessage(
  _hookName: string,
  context: HookContext,
): string {
  const parts: Array<string> = [];

  // Files changed
  if (context.filesChanged !== undefined) {
    parts.push(`Files: ${context.filesChanged}`);
  }

  // Lines added/removed
  if (context.linesAdded !== undefined || context.linesRemoved !== undefined) {
    const added = context.linesAdded ?? 0;
    const removed = context.linesRemoved ?? 0;
    parts.push(`Lines: +${added}/-${removed}`);
  }

  // Cost
  if (context.costUsd !== undefined) {
    parts.push(`Cost: $${context.costUsd.toFixed(2)}`);
  }

  // Session ID (abbreviated to first 8 chars)
  if (context.sessionId !== undefined && context.sessionId !== "") {
    const abbreviated = context.sessionId.slice(0, 8);
    parts.push(`Session: ${abbreviated}`);
  }

  // If no metrics, return base message only
  if (parts.length === 0) {
    return context.message;
  }

  // Append metrics line to message
  return `${context.message}\n${parts.join(" | ")}`;
}

/**
 * Convert hook name to event name for aaa notify --event flag
 *
 * Maps camelCase hook names like "onMaxIterationsExceeded" to
 * kebab-case event names like "ralph:maxIterationsExceeded"
 *
 * @param hookName - Name of the hook (e.g., "onMaxIterationsExceeded")
 * @returns Event name for --event flag (e.g., "ralph:maxIterationsExceeded")
 */
function hookNameToEventName(hookName: string): string {
  // Remove "on" prefix if present and lowercase first character
  const withoutOn = hookName.startsWith("on")
    ? hookName.slice(2).charAt(0).toLowerCase() + hookName.slice(3)
    : hookName;

  return `ralph:${withoutOn}`;
}

// =============================================================================
// Exports
// =============================================================================

export {
  executeHook,
  executeLogAction,
  executeNotifyAction,
  executeNotifyFallback,
  executePauseAction,
  formatNotificationMessage,
  type HookContext,
  hookNameToEventName,
  type HookResult,
};

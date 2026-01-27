/**
 * Hook execution system for Ralph autonomous build
 *
 * This module provides hook execution for:
 * - Log action: Output messages to console
 * - Notify action: Send push notifications via ntfy
 * - Pause action: Interactive pause with TTY check
 *
 * Hooks are configured in ralph.config.json and triggered at specific points
 * in the build lifecycle (onIterationComplete, onMaxIterationsExceeded, etc.)
 *
 * @see docs/planning/schemas/ralph-config.schema.json
 */

import * as readline from "node:readline";

import type { HookAction, RalphConfig } from "./types";

import { loadRalphConfig } from "./config";

// =============================================================================
// Types
// =============================================================================

/**
 * Context passed to hook execution
 */
interface HookContext {
  /** Human-readable message describing what triggered the hook */
  message: string;
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
          await executeNotifyAction(hookName, context, config);
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
 * @param config - Ralph configuration containing ntfy settings (used for fallback)
 * @returns true if notification was sent successfully, false otherwise
 */
async function executeNotifyAction(
  hookName: string,
  context: HookContext,
  config: RalphConfig,
): Promise<boolean> {
  const eventName = hookNameToEventName(hookName);

  console.log(
    `[Hook:${hookName}] Sending notification via CLI --event ${eventName}`,
  );

  try {
    // Use Bun.spawn to call aaa notify CLI
    const proc = Bun.spawn(
      ["aaa", "notify", "--event", eventName, "--quiet", context.message],
      { stderr: "pipe", stdout: "pipe" },
    );

    await proc.exited;

    if (proc.exitCode === 0) {
      return true;
    }

    // Non-zero exit - log error
    const stderr = await new Response(proc.stderr).text();
    console.log(
      `[Hook:${hookName}] CLI notification failed (exit ${proc.exitCode}): ${stderr.trim()}`,
    );
    return false;
  } catch (error) {
    // Check if CLI not found (ENOENT)
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.log(
        `[Hook:${hookName}] CLI not found, falling back to inline fetch`,
      );
      return executeNotifyFallback(hookName, context, config);
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
 * This is the legacy implementation kept as fallback.
 *
 * @param hookName - Name of the hook being executed
 * @param context - Hook context with message
 * @param config - Ralph configuration containing ntfy settings
 * @returns true if notification was sent successfully, false otherwise
 */
async function executeNotifyFallback(
  hookName: string,
  context: HookContext,
  config: RalphConfig,
): Promise<boolean> {
  const { ntfy } = config;

  // Check if ntfy is configured
  if (
    ntfy?.topic === undefined ||
    ntfy.topic === "" ||
    ntfy.topic === "your-ntfy-topic"
  ) {
    console.log(`[Hook:${hookName}] notify action: ntfy topic not configured`);
    return false;
  }

  const server = ntfy.server === "" ? "https://ntfy.sh" : ntfy.server;
  const url = `${server}/${ntfy.topic}`;

  console.log(`[Hook:${hookName}] Sending notification via fallback to ${url}`);

  try {
    const response = await fetch(url, {
      body: context.message,
      headers: { Title: `Ralph Build: ${hookName}` },
      method: "POST",
    });

    if (!response.ok) {
      console.log(
        `[Hook:${hookName}] Notification failed: ${response.status} ${response.statusText}`,
      );
      return false;
    }
    return true;
  } catch (error) {
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

    rl.question("Press Enter to continue or Ctrl+C to abort: ", () => {
      clearTimeout(timeout);
      rl.close();
      resolve();
    });
  });
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
  type HookContext,
  hookNameToEventName,
  type HookResult,
};

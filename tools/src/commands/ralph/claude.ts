/**
 * Claude invocation helpers for Ralph
 *
 * This module provides functions for spawning Claude sessions in different modes.
 * Extracted from index.ts to avoid circular dependencies with other ralph modules.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/**
 * Result from invoking Claude in chat/supervised mode
 */
export interface ClaudeResult {
  /** The process exit code (null if interrupted by signal) */
  exitCode: null | number;
  /** Whether the session was interrupted by SIGINT/SIGTERM (Ctrl+C) */
  interrupted: boolean;
  /** Whether the session completed successfully (exit code 0) */
  success: boolean;
}

/**
 * Build prompt with optional context prefix
 */
export function buildPrompt(content: string, extraContext?: string): string {
  if (extraContext !== undefined && extraContext !== "") {
    return `${extraContext}\n\n${content}`;
  }
  return content;
}

/**
 * Supervised mode: Spawn interactive chat session
 * Uses stdio: inherit so user can watch AND type if needed
 * When chat exits (user quits or Claude finishes), function returns
 *
 * @param promptPath - Path to the prompt file
 * @param sessionName - Name for the session (used in console output)
 * @param extraContext - Optional context to prepend to the prompt
 * @returns ClaudeResult with success, interrupted, and exitCode fields
 */
export function invokeClaudeChat(
  promptPath: string,
  sessionName: string,
  extraContext?: string,
): ClaudeResult {
  if (!existsSync(promptPath)) {
    console.error(`Prompt not found: ${promptPath}`);
    return { exitCode: 1, interrupted: false, success: false };
  }

  const promptContent = readFileSync(promptPath, "utf8");

  console.log(`Starting ${sessionName} session (supervised mode)...`);
  console.log(`Prompt: ${promptPath}`);
  if (extraContext !== undefined && extraContext !== "") {
    console.log(`Context: ${extraContext}`);
  }
  console.log();

  const fullPrompt = buildPrompt(promptContent, extraContext);

  // Chat mode (no -p), stdio: inherit so user can watch AND type
  // --permission-mode bypassPermissions prevents inheriting plan mode from user settings
  const result = spawnSync(
    "claude",
    [
      "--permission-mode",
      "bypassPermissions",
      "--append-system-prompt",
      fullPrompt,
      `Please begin the ${sessionName} session.`,
    ],
    { stdio: "inherit" },
  );

  // Handle signal interruption (Ctrl+C) gracefully
  if (result.signal === "SIGINT" || result.signal === "SIGTERM") {
    console.log("\nSession interrupted by user");
    return { exitCode: null, interrupted: true, success: true };
  }

  if (result.error !== undefined) {
    console.error(`Failed to start Claude: ${result.error.message}`);
    return { exitCode: 1, interrupted: false, success: false };
  }

  return {
    exitCode: result.status,
    interrupted: false,
    success: result.status === 0,
  };
}

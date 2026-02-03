/**
 * Approval evaluation logic for Ralph artifact creation
 *
 * This module provides the core "brain" that evaluates what action to take
 * at each approval gate. It is a pure function with no side effects - it just
 * answers "what should I do?" based on gate, config, and runtime context.
 *
 * The caller is responsible for executing the action (prompting, notifying,
 * writing files, etc.).
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Actions that can result from approval evaluation
 *
 * - "write": Proceed immediately, write artifact
 * - "prompt": Show Y/n prompt in TTY, wait for explicit user response
 * - "notify-wait": Send notification, wait suggestWaitSeconds, then continue
 * - "exit-unstaged": Write artifacts as unstaged git changes, exit cascade
 */
type ApprovalAction = "exit-unstaged" | "notify-wait" | "prompt" | "write";

/**
 * Runtime context for approval evaluation
 *
 * Captures CLI flags and environment state that affect approval decisions.
 * All fields are required - callers must explicitly provide the context.
 */
interface ApprovalContext {
  /** --force flag: skip all approval prompts and proceed immediately */
  forceFlag: boolean;
  /** Whether running in TTY (interactive) mode with stdin attached */
  isTTY: boolean;
  /** --review flag: require explicit approval at all gates */
  reviewFlag: boolean;
}

// =============================================================================
// Exports
// =============================================================================

export { type ApprovalAction, type ApprovalContext };

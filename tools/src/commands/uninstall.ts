/* eslint-disable consistent-return */

import * as p from "@clack/prompts";
import { Effect } from "effect";
import { existsSync, lstatSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

import {
  AAA_SYMLINK,
  getAllAgentsRoot,
  getClaudeConfigStatus,
  getShellConfigPath,
  getSymlinkTarget,
  isCliInstalled,
} from "./setup";

// =============================================================================
// Types
// =============================================================================

interface UninstallOptions {
  project?: boolean;
  user?: boolean;
}

// =============================================================================
// Effect-based Uninstall Errors
// =============================================================================

class UninstallError extends Error {
  override name = "UninstallError";

  constructor(
    message: string,
    public override cause?: Error,
  ) {
    super(message);
  }
}

// =============================================================================
// CLI Command Handler
// =============================================================================

/**
 * Commander.js action handler for uninstall command
 * Runs the Effect program and handles output/errors
 */
async function executeUninstallCommand(
  options: UninstallOptions,
): Promise<void> {
  try {
    await Effect.runPromise(executeUninstallEffect(options));
  } catch (error: unknown) {
    // Errors are already logged via clack/prompts
    if (!(error instanceof UninstallError) && error instanceof Error) {
      p.log.error(`Uninstall failed: ${error.message}`);
    }
    process.exit(1);
  }
}

// =============================================================================
// Effect-based implementation
// =============================================================================

/**
 * Execute uninstall based on options
 */
function executeUninstallEffect(
  options: UninstallOptions,
): Effect.Effect<void, UninstallError> {
  return Effect.gen(function* executeUninstall() {
    if (options.user !== true && options.project !== true) {
      p.log.error("Specify --user or --project");
      return yield* Effect.fail(
        new UninstallError("Specify --user or --project"),
      );
    }

    if (options.user === true) {
      yield* removeUserInstallationEffect();
    }

    if (options.project === true) {
      yield* removeProjectInstallationEffect();
    }
  });
}

/**
 * Remove the context/ symlink from the current project
 */
function removeProjectInstallationEffect(): Effect.Effect<
  void,
  UninstallError
> {
  return Effect.gen(function* removeProjectInstallation() {
    p.intro("aaa uninstall --project");

    const cwd = process.cwd();
    const contextLink = resolve(cwd, "context");

    // Get all-agents root (may fail if not installed)
    let expectedTarget = "";
    try {
      const root = getAllAgentsRoot();
      expectedTarget = resolve(root, "context");
    } catch {
      p.log.error("Cannot find all-agents installation");
      p.outro("Uninstall failed");
      return yield* Effect.fail(
        new UninstallError("Cannot find all-agents installation"),
      );
    }

    const actualTarget = getSymlinkTarget(contextLink);

    if (actualTarget === null) {
      p.log.warn("context/ symlink not found");
      p.outro("Nothing to uninstall");
      return;
    }

    // Resolve the actual target to handle relative symlinks
    const resolvedActualTarget =
      existsSync(contextLink) && lstatSync(contextLink).isSymbolicLink()
        ? resolve(cwd, actualTarget)
        : actualTarget;

    if (resolvedActualTarget !== expectedTarget) {
      p.log.error("context/ is not a symlink to all-agents");
      p.outro("Skipped");
      return;
    }

    yield* Effect.try({
      catch: (error) =>
        new UninstallError(
          `Failed to remove context symlink: ${error instanceof Error ? error.message : String(error)}`,
        ),
      try: () => {
        unlinkSync(contextLink);
      },
    });

    p.log.success("Removed context/ symlink");
    p.outro("Project uninstall complete");
  });
}

/**
 * Remove the CLI symlink from ~/.local/bin/aaa
 */
function removeUserInstallationEffect(): Effect.Effect<void, UninstallError> {
  return Effect.gen(function* removeUserInstallation() {
    p.intro("aaa uninstall --user");

    if (!isCliInstalled()) {
      p.log.warn("aaa symlink not found");
      p.outro("Nothing to uninstall");
      return;
    }

    yield* Effect.try({
      catch: (error) =>
        new UninstallError(
          `Failed to remove symlink: ${error instanceof Error ? error.message : String(error)}`,
        ),
      try: () => {
        unlinkSync(AAA_SYMLINK);
      },
    });

    p.log.success(`Removed ${AAA_SYMLINK}`);

    // Warn about CLAUDE_CONFIG_DIR if set
    const { current, status } = getClaudeConfigStatus();
    if (status !== "unset") {
      const shellConfig = getShellConfigPath();
      p.note(
        `Remove from ${shellConfig}:\n\n  export CLAUDE_CONFIG_DIR="${current}"`,
        "CLAUDE_CONFIG_DIR",
      );
    }

    p.outro("User uninstall complete");
  });
}

export default executeUninstallCommand;

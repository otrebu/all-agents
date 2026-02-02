/**
 * Session command - Manage and retrieve Claude session files
 *
 * Commands:
 *   aaa session path <session-id>       Get session file path by ID
 *   aaa session path --commit <hash>    Get session file path from commit's cc-session-id trailer
 *   aaa session current                 Get current session ID from .claude/current-session
 *
 * Used for interrogation workflows to access conversation context from commits.
 */

import { Command } from "@commander-js/extra-typings";
import { getSessionJsonlPath } from "@tools/commands/ralph/session";
import { findProjectRoot } from "@tools/utils/paths";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the path to .claude/current-session file
 */
function getCurrentSessionPath(): string {
  const projectRoot = findProjectRoot() ?? process.cwd();
  return join(projectRoot, ".claude", "current-session");
}

/**
 * Extract cc-session-id trailer from a git commit
 *
 * @param commitHash - Git commit hash (can be HEAD, short hash, or full hash)
 * @returns Session ID or null if trailer not found
 */
function getSessionIdFromCommit(commitHash: string): null | string {
  try {
    const proc = Bun.spawnSync([
      "git",
      "log",
      "-1",
      "--format=%(trailers:key=cc-session-id,valueonly)",
      commitHash,
    ]);

    if (proc.exitCode !== 0) {
      return null;
    }

    const sessionId = proc.stdout.toString("utf8").trim();
    return sessionId === "" ? null : sessionId;
  } catch {
    return null;
  }
}

/**
 * Read current session ID from .claude/current-session
 *
 * @returns Session ID string or null if file doesn't exist
 */
function readCurrentSessionId(): null | string {
  const sessionPath = getCurrentSessionPath();

  if (!existsSync(sessionPath)) {
    return null;
  }

  try {
    const content = readFileSync(sessionPath, "utf8").trim();
    return content === "" ? null : content;
  } catch {
    return null;
  }
}

// =============================================================================
// Main Command
// =============================================================================

const sessionCommand = new Command("session").description(
  "Manage and retrieve Claude session files",
);

// aaa session path <session-id> or aaa session path --commit <hash>
sessionCommand.addCommand(
  new Command("path")
    .description("Get session file path by ID or from commit")
    .argument("[session-id]", "Session ID to look up")
    .option(
      "--commit <hash>",
      "Extract session ID from commit's cc-session-id trailer",
    )
    .action((sessionId, options) => {
      const projectRoot = findProjectRoot() ?? process.cwd();

      // Determine session ID from argument or --commit flag
      let resolvedSessionId: null | string = null;

      if (options.commit === undefined) {
        if (sessionId === undefined) {
          console.error("Error: Must provide session ID or --commit <hash>");
          process.exit(1);
        }
        resolvedSessionId = sessionId;
      } else {
        // Get session ID from commit trailer
        resolvedSessionId = getSessionIdFromCommit(options.commit);

        if (resolvedSessionId === null) {
          console.error(
            `No cc-session-id trailer in commit: ${options.commit}`,
          );
          process.exit(1);
        }
      }

      // Look up session file path
      const sessionPath = getSessionJsonlPath(resolvedSessionId, projectRoot);

      if (sessionPath === null) {
        console.error(`Session not found: ${resolvedSessionId}`);
        process.exit(1);
      }

      // Output path to stdout
      console.log(sessionPath);
    }),
);

// aaa session current - get current session ID
sessionCommand.addCommand(
  new Command("current")
    .description("Get current session ID from .claude/current-session")
    .action(() => {
      const sessionId = readCurrentSessionId();

      if (sessionId === null) {
        console.error(
          "No current session found (.claude/current-session does not exist or is empty)",
        );
        process.exit(1);
      }

      // Output session ID to stdout
      console.log(sessionId);
    }),
);

// =============================================================================
// Exports
// =============================================================================

export { getSessionIdFromCommit, readCurrentSessionId };
export default sessionCommand;

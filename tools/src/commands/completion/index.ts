import { Command } from "@commander-js/extra-typings";
import { FileSystemLive } from "@tools/lib/effect";
import { Effect } from "effect";

import generateBashCompletion from "./bash";
import {
  handleCompletionEffect,
  isValidShell,
  type Shell,
} from "./effect-completion";
import generateFishCompletion from "./fish";
import generateZshCompletion from "./zsh";

const VALID_SHELLS = ["bash", "zsh", "fish"] as const;

/**
 * Generate completion script for the specified shell
 * Uses Effect internally for consistent error handling
 */
function generateCompletion(shell: Shell): string {
  switch (shell) {
    case "bash": {
      return generateBashCompletion();
    }
    case "fish": {
      return generateFishCompletion();
    }
    case "zsh": {
      return generateZshCompletion();
    }
    default: {
      // Type exhaustiveness check
      const _exhaustive: never = shell;
      return _exhaustive;
    }
  }
}

/**
 * Generate completion script using Effect
 */
function generateCompletionEffect(shell: Shell): Effect.Effect<string> {
  return Effect.sync(() => generateCompletion(shell));
}

/**
 * Main completion command
 */
const completionCommand = new Command("completion")
  .description("Generate shell completion scripts")
  .argument("<shell>", "Shell type: bash, zsh, or fish")
  .action(async (shell) => {
    if (!isValidShell(shell)) {
      console.error(`Unknown shell: ${shell}`);
      console.error(`Valid shells: ${VALID_SHELLS.join(", ")}`);
      process.exit(1);
    }

    // Use Effect to generate completion
    const output = await Effect.runPromise(generateCompletionEffect(shell));
    console.log(output);
  });

/**
 * Hidden __complete command for dynamic completions
 * Used internally by shell completion scripts
 */
const completeCommand = new Command("__complete")
  .description("(internal) Generate dynamic completions")
  .argument("<type>", "Completion type: milestone, story, task, command")
  .action(async (type) => {
    // Use Effect for dynamic completions
    const output = await Effect.runPromise(
      handleCompletionEffect(type).pipe(Effect.provide(FileSystemLive)),
    );
    if (output) {
      console.log(output);
    }
  });

export { completeCommand, completionCommand };

export {
  findStories,
  findTasks,
  handleCompletion,
  isCompletionMode,
} from "./effect-completion";

import { Command } from "@commander-js/extra-typings";
import { discoverMilestones, findProjectRoot } from "@lib/milestones";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import generateBashCompletion from "./bash";
import generateFishCompletion from "./fish";
import generateZshCompletion from "./zsh";

const VALID_SHELLS = ["bash", "zsh", "fish"] as const;
type Shell = (typeof VALID_SHELLS)[number];

/**
 * Collect task files from a directory matching the task pattern
 */
function collectTasksFromDirectory(directory: string): Array<string> {
  const taskPattern = /^(?:TASK-)?\d{3}-.*\.md$/;
  if (!existsSync(directory)) return [];

  try {
    return readdirSync(directory)
      .filter((f) => taskPattern.test(f))
      .map((f) => f.replace(/\.md$/, ""));
  } catch {
    return [];
  }
}

/**
 * Find story files in docs/planning/stories/
 */
function findStories(): Array<string> {
  const projectRoot = findProjectRoot();
  if (projectRoot === null) return [];

  const storiesDirectory = path.join(projectRoot, "docs/planning/stories");
  if (!existsSync(storiesDirectory)) return [];

  try {
    const files = readdirSync(storiesDirectory);
    return files
      .filter((f) => /^\d{3}-.*\.md$/.test(f))
      .map((f) => f.replace(/\.md$/, ""));
  } catch {
    return [];
  }
}

/**
 * Find task files in docs/planning/tasks/ AND docs/planning/milestones/<slug>/tasks/
 */
function findTasks(): Array<string> {
  const projectRoot = findProjectRoot();
  if (projectRoot === null) return [];

  const tasks: Array<string> = [];

  // Search global tasks directory
  const globalTasksDirectory = path.join(projectRoot, "docs/planning/tasks");
  tasks.push(...collectTasksFromDirectory(globalTasksDirectory));

  // Search milestone task directories
  const milestonesDirectory = path.join(
    projectRoot,
    "docs/planning/milestones",
  );
  if (existsSync(milestonesDirectory)) {
    try {
      const milestones = readdirSync(milestonesDirectory, {
        withFileTypes: true,
      });
      for (const milestone of milestones) {
        if (milestone.isDirectory()) {
          const milestoneTasksDirectory = path.join(
            milestonesDirectory,
            milestone.name,
            "tasks",
          );
          tasks.push(...collectTasksFromDirectory(milestoneTasksDirectory));
        }
      }
    } catch {
      // Ignore errors - completion should fail silently
    }
  }

  return tasks;
}

/**
 * Generate completion script for the specified shell
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
 * Handle __complete command for dynamic completions
 * Called by shell completion scripts to get dynamic values
 */
function handleCompletion(): void {
  const type = process.argv[3];

  try {
    switch (type) {
      case "command": {
        // List all top-level commands
        console.log(
          [
            "download",
            "extract-conversations",
            "gh-search",
            "gemini-research",
            "parallel-search",
            "setup",
            "uninstall",
            "sync-context",
            "task",
            "story",
            "ralph",
            "completion",
          ].join("\n"),
        );
        break;
      }
      case "milestone": {
        const milestones = discoverMilestones();
        console.log(milestones.map((m) => m.slug).join("\n"));
        break;
      }
      case "story": {
        const stories = findStories();
        console.log(stories.join("\n"));
        break;
      }
      case "task": {
        const tasks = findTasks();
        console.log(tasks.join("\n"));
        break;
      }
      default: {
        // Silent failure - unknown type
        break;
      }
    }
  } catch {
    // Silent failure - completion errors go to stderr
  }
}

/**
 * Check if we're in completion mode (called by shell scripts or __complete command)
 */
function isCompletionMode(): boolean {
  return (
    process.env.COMP_LINE !== undefined || process.argv[2] === "__complete"
  );
}

/**
 * Main completion command
 */
const completionCommand = new Command("completion")
  .description("Generate shell completion scripts")
  .argument("<shell>", "Shell type: bash, zsh, or fish")
  .action((shell) => {
    if (!VALID_SHELLS.includes(shell as Shell)) {
      console.error(`Unknown shell: ${shell}`);
      console.error(`Valid shells: ${VALID_SHELLS.join(", ")}`);
      process.exit(1);
    }
    console.log(generateCompletion(shell as Shell));
  });

/**
 * Hidden __complete command for dynamic completions
 * Used internally by shell completion scripts
 * Note: Must be added to program with { hidden: true } option
 */
const completeCommand = new Command("__complete")
  .description("(internal) Generate dynamic completions")
  .argument("<type>", "Completion type: milestone, story, task, command")
  .action(() => {
    handleCompletion();
  });

export {
  completeCommand,
  completionCommand,
  handleCompletion,
  isCompletionMode,
};

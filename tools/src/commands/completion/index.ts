import type { ProviderType } from "@tools/commands/ralph/providers/types";

import { Command, type CommandUnknownOpts } from "@commander-js/extra-typings";
import { discoverMilestones } from "@lib/milestones";
import {
  getModelById,
  getModelCompletions,
  getModelCompletionsForProvider,
} from "@tools/commands/ralph/providers/models";
import { REGISTRY } from "@tools/commands/ralph/providers/registry";
import { listRecentSessions } from "@tools/commands/session";
import { findProjectRoot } from "@tools/utils/paths";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import generateBashCompletion from "./bash";
import generateFishCompletion from "./fish";
import {
  collectCommandOptionMatrix,
  type CommandTableFormat,
  renderCommandOptionMatrix,
} from "./table";
import generateZshCompletion from "./zsh";

const VALID_SHELLS = ["bash", "zsh", "fish"] as const;
type Shell = (typeof VALID_SHELLS)[number];
const VALID_TABLE_FORMATS = ["markdown", "json"] as const;

function isCommandTableFormat(value: string): value is CommandTableFormat {
  return VALID_TABLE_FORMATS.includes(value as CommandTableFormat);
}

/** Task filename pattern */
const TASK_PATTERN = /^(?:TASK-)?\d{3}-.*\.md$/;

/** Collect task files from directory, returns paths relative to project root */
function collectTasksFromDirectory(
  baseDirectory: string,
  dirPath: string,
): Array<string> {
  const tasks: Array<string> = [];
  if (!existsSync(dirPath)) return tasks;

  try {
    for (const f of readdirSync(dirPath)) {
      if (TASK_PATTERN.test(f)) {
        const relativePath = path.relative(
          baseDirectory,
          path.join(dirPath, f),
        );
        tasks.push(relativePath);
      }
    }
  } catch {
    /* ignore */
  }
  return tasks;
}

/**
 * Find story files in docs/planning/stories/ and milestones/slug/stories/
 * Returns relative paths from project root
 */
function findStories(): Array<string> {
  const projectRoot = findProjectRoot();
  if (projectRoot === null) return [];

  const stories: Array<string> = [];
  const pattern = /^\d{3}-.*\.md$/;

  // Global stories
  const globalDirectory = path.join(projectRoot, "docs/planning/stories");
  if (existsSync(globalDirectory)) {
    try {
      for (const f of readdirSync(globalDirectory)) {
        if (pattern.test(f)) {
          const relativePath = path.relative(
            projectRoot,
            path.join(globalDirectory, f),
          );
          stories.push(relativePath);
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Milestone stories
  const milestonesDirectory = path.join(
    projectRoot,
    "docs/planning/milestones",
  );
  if (!existsSync(milestonesDirectory)) return stories;

  try {
    const directories = readdirSync(milestonesDirectory, {
      withFileTypes: true,
    }).filter((d) => d.isDirectory());
    for (const m of directories) {
      const storyDirectory = path.join(milestonesDirectory, m.name, "stories");
      if (!existsSync(storyDirectory)) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const files = readdirSync(storyDirectory);
      for (const f of files) {
        if (pattern.test(f)) {
          const relativePath = path.relative(
            projectRoot,
            path.join(storyDirectory, f),
          );
          stories.push(relativePath);
        }
      }
    }
  } catch {
    /* ignore */
  }

  return stories;
}

/**
 * Find task files in docs/planning/tasks/ AND docs/planning/milestones/<slug>/tasks/
 * Returns relative paths from project root
 */
function findTasks(): Array<string> {
  const projectRoot = findProjectRoot();
  if (projectRoot === null) return [];

  const tasks: Array<string> = [];

  // Global tasks
  const globalDirectory = path.join(projectRoot, "docs/planning/tasks");
  tasks.push(...collectTasksFromDirectory(projectRoot, globalDirectory));

  // Milestone tasks
  const milestonesDirectory = path.join(
    projectRoot,
    "docs/planning/milestones",
  );
  if (existsSync(milestonesDirectory)) {
    try {
      const directories = readdirSync(milestonesDirectory, {
        withFileTypes: true,
      }).filter((d) => d.isDirectory());
      for (const m of directories) {
        const taskDirectory = path.join(milestonesDirectory, m.name, "tasks");
        tasks.push(...collectTasksFromDirectory(projectRoot, taskDirectory));
      }
    } catch {
      /* ignore */
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

/** Get model completions, optionally filtered by provider */
function getFilteredModelCompletions(
  providerArgument: string | undefined,
): Array<string> {
  if (providerArgument === undefined) {
    return getModelCompletions();
  }
  if (providerArgument in REGISTRY) {
    return getModelCompletionsForProvider(providerArgument as ProviderType);
  }
  return [];
}

/** Get root command for full command tree introspection */
function getRootCommand(command: CommandUnknownOpts): CommandUnknownOpts {
  let current: CommandUnknownOpts = command;

  while (current.parent !== null) {
    current = current.parent;
  }

  return current;
}

/** Get recent session IDs for dynamic completion */
function getSessionIdCompletions(limit = 200): Array<string> {
  return listRecentSessions(limit).map((session) => session.sessionId);
}

/**
 * Handle __complete command for dynamic completions
 * Called by shell completion scripts to get dynamic values
 */
function handleCompletion(): void {
  const type = process.argv[3];

  try {
    switch (type) {
      case "cascade": {
        // Valid cascade targets (forward-only from any starting level)
        console.log(
          ["stories", "tasks", "subtasks", "build", "calibrate"].join("\n"),
        );
        break;
      }
      case "command": {
        // List all top-level commands
        console.log(
          [
            "completion",
            "extract-conversations",
            "gemini-research",
            "gh-search",
            "notify",
            "parallel-search",
            "ralph",
            "review",
            "session",
            "setup",
            "story",
            "sync-context",
            "task",
            "uninstall",
          ].join("\n"),
        );
        break;
      }
      case "milestone": {
        const milestones = discoverMilestones();
        console.log(
          milestones
            .map((m) => `docs/planning/milestones/${m.slug}`)
            .join("\n"),
        );
        break;
      }
      case "model": {
        // Read --provider from argv to filter models
        const providerIndex = process.argv.indexOf("--provider");
        const providerArgument =
          providerIndex === -1 ? undefined : process.argv[providerIndex + 1];

        const modelIds = getFilteredModelCompletions(providerArgument);

        // Output model IDs with cost hints (tab-separated for shells that support descriptions)
        const lines = modelIds.map((id) => {
          const model = getModelById(id);
          return model === undefined ? id : `${id}\t${model.costHint}`;
        });
        console.log(lines.join("\n"));
        break;
      }
      case "provider": {
        // Return all valid provider names from the registry
        const providers = Object.keys(REGISTRY);
        console.log(providers.join("\n"));
        break;
      }
      case "session-id": {
        const sessionIds = getSessionIdCompletions();
        console.log(sessionIds.join("\n"));
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

completionCommand.addCommand(
  new Command("table")
    .description("Print command and option matrix from Commander metadata")
    .option("--format <type>", "Output format: markdown or json", "markdown")
    .action((options, command) => {
      const { format } = options;
      if (!isCommandTableFormat(format)) {
        console.error(`Unknown table format: ${format}`);
        console.error(`Valid formats: ${VALID_TABLE_FORMATS.join(", ")}`);
        process.exit(1);
      }

      const rootCommand = getRootCommand(command);
      const rows = collectCommandOptionMatrix(rootCommand);
      console.log(renderCommandOptionMatrix(rows, format));
    }),
);

/**
 * Hidden __complete command for dynamic completions
 * Used internally by shell completion scripts
 * Note: Must be added to program with { hidden: true } option
 */
const completeCommand = new Command("__complete")
  .description("(internal) Generate dynamic completions")
  .argument(
    "<type>",
    "Completion type: milestone, story, task, command, session-id",
  )
  .action(() => {
    handleCompletion();
  });

export {
  completeCommand,
  completionCommand,
  handleCompletion,
  isCompletionMode,
};

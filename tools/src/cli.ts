#!/usr/bin/env bun
import { Command, Option } from "@commander-js/extra-typings";

import type { GeminiMode } from "./commands/gemini/index";

// eslint-disable-next-line import/extensions
import packageJson from "../package.json" with { type: "json" };
import {
  completeCommand,
  completionCommand,
  handleCompletion,
  isCompletionMode,
} from "./commands/completion/index";
import extractConversationsCommand from "./commands/extract-conversations";
import geminiResearchCommand from "./commands/gemini/index";
import ghSearchCommand from "./commands/github/index";
import notifyCommand from "./commands/notify/index";
import parallelSearchCommand from "./commands/parallel-search/index";
import ralphCommand from "./commands/ralph/index";
import reviewCommand from "./commands/review/index";
import sessionCommand from "./commands/session/index";
import setupCommand from "./commands/setup/index";
import createStoryCommand from "./commands/story";
import runSyncContextCli from "./commands/sync-context";
import createTaskCommand from "./commands/task";
import uninstallCommand from "./commands/uninstall";

// Early detection for __complete command - bypass Commander.js parsing
if (isCompletionMode() && process.argv[2] === "__complete") {
  handleCompletion();
  process.exit(0);
}

const program = new Command()
  .name("aaa")
  .description("All-Agents CLI Toolkit")
  .version(packageJson.version);

program.addCommand(
  new Command("extract-conversations")
    .description("Extract Claude Code conversation history as markdown")
    .option(
      "-l, --limit <number>",
      "Number of recent conversations",
      (v) => Number.parseInt(v, 10),
      20,
    )
    .option("-o, --output <file>", "Output file (default: stdout)")
    .option(
      "-s, --skip <number>",
      "Skip N most recent conversations",
      (v) => Number.parseInt(v, 10),
      0,
    )
    .action(async (options) =>
      extractConversationsCommand({
        limit: options.limit,
        output: options.output,
        skip: options.skip,
      }),
    ),
);

program.addCommand(
  new Command("gh-search")
    .description("Search GitHub for real-world code examples")
    .argument("<query>", "Search query")
    .action(ghSearchCommand),
);

program.addCommand(
  new Command("gemini-research")
    .description("Google Search research via Gemini CLI")
    .argument("<query>", "Search query")
    .option("--mode <string>", "Research mode: quick|deep|code", "quick")
    .action(async (query, options) =>
      geminiResearchCommand(query, options.mode as GeminiMode),
    ),
);

program.addCommand(
  new Command("parallel-search")
    .description("Multi-angle web research via Parallel Search API")
    .requiredOption("--objective <string>", "Main search objective")
    .option("--queries <string...>", "Additional search queries")
    .addOption(
      new Option("--processor <level>", "Processing level")
        .choices(["base", "pro"] as const)
        .default("pro" as const),
    )
    .option(
      "--max-results <number>",
      "Maximum results",
      (v) => Number.parseInt(v, 10),
      15,
    )
    .option(
      "--max-chars <number>",
      "Max chars per excerpt",
      (v) => Number.parseInt(v, 10),
      5000,
    )
    .option("-v, --verbose", "Show full report content instead of summary")
    .argument("[extraQueries...]", "Additional queries (positional)")
    .action(async (extraQueries, options) =>
      parallelSearchCommand({
        maxChars: options.maxChars,
        maxResults: options.maxResults,
        objective: options.objective,
        processor: options.processor,
        queries: [...(options.queries ?? []), ...extraQueries],
        verbose: options.verbose,
      }),
    ),
);

program.addCommand(
  new Command("setup")
    .description("Setup all-agents for user or project")
    .option("--user", "Setup CLI globally (build, symlink, env vars)")
    .option(
      "--project",
      "Setup current project (symlink context/, create docs/)",
    )
    .action(setupCommand),
);

program.addCommand(
  new Command("uninstall")
    .description("Uninstall all-agents for user or project")
    .option("--user", "Remove aaa symlink from ~/.local/bin")
    .option("--project", "Remove context/ symlink from current project")
    .action(uninstallCommand),
);

program.addCommand(
  new Command("sync-context")
    .description("Sync context folder to target project")
    .option("-t, --target <dir>", "Target directory (default: cwd)")
    .option("-w, --watch", "Watch for changes and auto-sync")
    .action(runSyncContextCli),
);

// Task management
const taskCommand = new Command("task").description(
  "Task management utilities",
);

taskCommand.addCommand(
  new Command("create")
    .description("Create empty task file with auto-numbered name")
    .argument("<name>", "Task name in kebab-case")
    .option(
      "-d, --dir <path>",
      "Custom tasks directory (default: docs/planning/tasks)",
    )
    .option(
      "-s, --story <number>",
      "Link task to story by number (e.g., 001 or 1)",
    )
    .option(
      "--stories-directory <path>",
      "Custom stories directory for story lookup (testing only)",
    )
    .action(createTaskCommand),
);

program.addCommand(taskCommand);

// Story management
const storyCommand = new Command("story").description(
  "Story management utilities",
);

storyCommand.addCommand(
  new Command("create")
    .description("Create empty story file with auto-numbered name")
    .argument("<name>", "Story name in kebab-case")
    .option(
      "-d, --dir <path>",
      "Custom stories directory (default: docs/planning/stories)",
    )
    .action(createStoryCommand),
);

program.addCommand(storyCommand);

// Ralph - autonomous development framework
program.addCommand(ralphCommand);

// Review - parallel multi-agent code review
program.addCommand(reviewCommand);

// Session - Claude session file management
program.addCommand(sessionCommand);

// Notify - push notifications via ntfy.sh
program.addCommand(notifyCommand);

// Shell completion
program.addCommand(completionCommand);
program.addCommand(completeCommand, { hidden: true });

program.parse();

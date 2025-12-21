#!/usr/bin/env bun
import { Command, Option } from "@commander-js/extra-typings";

import type { GeminiMode } from "./commands/gemini/index";

// eslint-disable-next-line import/extensions
import packageJson from "../package.json" with { type: "json" };
import downloadCommand from "./commands/download";
import geminiResearchCommand from "./commands/gemini/index";
import ghSearchCommand from "./commands/github/index";
import parallelSearchCommand from "./commands/parallel-search/index";
import setupCommand from "./commands/setup/index";
import createStoryCommand from "./commands/story";
import runSyncContextCli from "./commands/sync-context";
import createTaskCommand from "./commands/task";
import uninstallCommand from "./commands/uninstall";

const program = new Command()
  .name("aaa")
  .description("All-Agents CLI Toolkit")
  .version(packageJson.version);

program.addCommand(
  new Command("download")
    .description("Download URLs, extract text, save as markdown")
    .argument("<urls...>", "URLs to download")
    .option(
      "-o, --output <name>",
      "Output filename (auto-generated if omitted)",
    )
    .option(
      "-d, --dir <path>",
      "Output directory (default: docs/research/downloads)",
    )
    .action(downloadCommand),
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
    .argument("[extraQueries...]", "Additional queries (positional)")
    .action(async (extraQueries, options) =>
      parallelSearchCommand({
        maxChars: options.maxChars,
        maxResults: options.maxResults,
        objective: options.objective,
        processor: options.processor,
        queries: [...(options.queries ?? []), ...extraQueries],
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

program.parse();

#!/usr/bin/env bun
import { Command, Option } from "@commander-js/extra-typings";

import type { GeminiMode } from "./commands/gemini/search.js";

import { runGeminiResearchCli } from "./commands/gemini/search.js";
import { runGitHubSearchCli } from "./commands/github/main.js";
import { runParallelSearchCli } from "./commands/parallel-search/search.js";
import runSetup from "./commands/setup/index.js";
import runUninstall from "./commands/uninstall/index.js";

const program = new Command()
  .name("aaa")
  .description("All-Agents CLI Toolkit")
  .version("1.0.0");

program.addCommand(
  new Command("gh-search")
    .description("Search GitHub for real-world code examples")
    .argument("<query>", "Search query")
    .action(runGitHubSearchCli),
);

program.addCommand(
  new Command("gemini-research")
    .description("Google Search research via Gemini CLI")
    .argument("<query>", "Search query")
    .option("--mode <string>", "Research mode: quick|deep|code", "quick")
    .action(async (query, options) =>
      runGeminiResearchCli(query, options.mode as GeminiMode),
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
      runParallelSearchCli({
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
    .action(runSetup),
);

program.addCommand(
  new Command("uninstall")
    .description("Uninstall all-agents for user or project")
    .option("--user", "Remove aaa symlink from ~/.local/bin")
    .option("--project", "Remove context/ symlink from current project")
    .action(runUninstall),
);

program.parse();

import { Command } from 'commander';
import { CommandModule } from '@tools/types';
import { runParallelSearch } from '@context/knowledge/parallel-search/scripts/search.js';

export const parallelSearchCommand: CommandModule = {
  register(program: Command) {
    program.command('parallel-search')
      .description('Comprehensive web research via Parallel Search API')
      .requiredOption(
        "--objective <string>",
        "Main search objective (natural language)"
      )
      .option("--queries <string...>", "Additional search queries")
      .option(
        "--processor <string>",
        "Processing level: lite, base, pro, ultra",
        "pro"
      )
      .option(
        "--max-results <number>",
        "Maximum results to return",
        (value) => Number.parseInt(value, 10),
        15
      )
      .option(
        "--max-chars <number>",
        "Max characters per excerpt",
        (value) => Number.parseInt(value, 10),
        5000
      )
      .argument("[extraQueries...]", "Additional search queries (positional)")
      .action(async (extraQueries, options) => {
         await runParallelSearch(extraQueries, options);
      });
  }
};

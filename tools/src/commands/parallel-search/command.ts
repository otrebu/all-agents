import { Command } from '@commander-js/extra-typings'
import { runParallelSearchCli } from './search.js'

export function makeParallelSearchCommand() {
  return new Command('parallel-search')
    .description('Multi-angle web research via Parallel Search API')
    .requiredOption('--objective <string>', 'Main search objective')
    .option('--queries <string...>', 'Additional search queries')
    .option('--processor <string>', 'Processing level: lite|base|pro|ultra', 'pro')
    .option('--max-results <number>', 'Maximum results', (v) => Number.parseInt(v, 10), 15)
    .option('--max-chars <number>', 'Max chars per excerpt', (v) => Number.parseInt(v, 10), 5000)
    .argument('[extraQueries...]', 'Additional queries (positional)')
    .action(async (extraQueries, options) => {
      await runParallelSearchCli({
        objective: options.objective,
        queries: [...(options.queries ?? []), ...extraQueries],
        processor: options.processor as 'lite' | 'base' | 'pro' | 'ultra',
        maxResults: options.maxResults,
        maxChars: options.maxChars,
      })
    })
}

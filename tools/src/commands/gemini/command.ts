import { Command } from '@commander-js/extra-typings'
import { runGeminiResearchCli } from './search.js'
import type { GeminiMode } from './search.js'

export function makeGeminiResearchCommand() {
  return new Command('gemini-research')
    .description('Google Search research via Gemini CLI')
    .argument('<query>', 'Search query')
    .option('--mode <string>', 'Research mode: quick|deep|code', 'quick')
    .action(async (query, options) => {
      await runGeminiResearchCli(query, options.mode as GeminiMode)
    })
}

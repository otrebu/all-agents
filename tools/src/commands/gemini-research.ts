import { Command } from 'commander';
import { CommandModule } from '@tools/types';
import { runGeminiResearch, ProgramOptions } from '@context/knowledge/gemini-cli/scripts/search.js';

export const geminiResearchCommand: CommandModule = {
  register(program: Command) {
    program.command('gemini-research')
      .description('Gemini Research CLI')
      .argument('<query>', 'Search query')
      .option("--mode <string>", "Research mode: quick, deep, code", "quick")
      .action(async (query, options) => {
         await runGeminiResearch(query, options as ProgramOptions);
      });
  }
};

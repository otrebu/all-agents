import { Command } from 'commander';
import { CommandModule } from '@tools/types';
import { runGitHubSearch } from '@context/knowledge/github/scripts/main.js';

export const ghSearchCommand: CommandModule = {
  register(program: Command) {
    program.command('gh-search')
      .description('Search GitHub for code examples')
      .argument('<query>', 'Search query')
      .action(async (query) => {
         await runGitHubSearch(query);
      });
  }
};

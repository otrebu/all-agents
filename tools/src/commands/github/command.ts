import { Command } from '@commander-js/extra-typings'
import { runGitHubSearchCli } from './main.js'

export function makeGhSearchCommand() {
  return new Command('gh-search')
    .description('Search GitHub for real-world code examples')
    .argument('<query>', 'Search query')
    .action(async (query) => {
      await runGitHubSearchCli(query)
    })
}

#!/usr/bin/env node

import { Command } from 'commander'
import ora from 'ora'
import { log } from '@lib/log.js'
import { getGitHubToken } from './github.js'
import { searchGitHubCode, fetchCodeFiles } from './github.js'
import { buildQueryIntent } from './query.js'
import { rankResults } from './ranker.js'
import type { CodeFile } from './types.js'
import {
  AuthError,
  SearchError,
  RateLimitError
} from './types.js'

const program = new Command()

program
  .name('gh-search')
  .description('Search GitHub for real-world code examples and implementation patterns')
  .argument('<query>', 'Search query')
  .action(async (userQuery) => {
    const startTime = Date.now()

    log.header('\n🔍 GitHub Code Search\n')

    try {
      if (!userQuery || userQuery.trim().length === 0) {
        log.error('No query provided')
        process.exit(1)
      }

      // Auth
      const authSpinner = ora('Authenticating with GitHub...').start()
      const token = await getGitHubToken()
      authSpinner.succeed('Authenticated')

      // Build query
      const { query, options } = buildQueryIntent(userQuery)
      log.dim('\nSearch Parameters:')
      log.dim(`  Query: "${query}"`)
      log.dim(`  Filters: ${JSON.stringify(options)}\n`)

      // Search
      const searchSpinner = ora('Searching GitHub...').start()
      const results = await searchGitHubCode(token, query, options)
      searchSpinner.succeed(`Found ${results.length} results`)

      if (results.length === 0) {
        log.warn('No results found')
        log.dim('Try a different query or remove filters.')
        return
      }

      // Rank
      const rankSpinner = ora('Ranking by quality...').start()
      const ranked = rankResults(results, 10)
      rankSpinner.succeed(`Top ${ranked.length} selected`)

      // Fetch
      const fetchSpinner = ora(`Fetching code from ${ranked.length} files...`).start()
      const files = await fetchCodeFiles({
        token,
        rankedResults: ranked,
        maxFiles: 10,
        contextLinesCount: 20
      })
      fetchSpinner.succeed(`Fetched ${files.length} files`)

      // Output clean markdown for Claude
      const report = formatMarkdownReport(files, {
        query: userQuery,
        totalResults: results.length,
        executionTimeMs: Date.now() - startTime
      })

      log.success('\nSearch complete!')
      log.plain('\n' + report)

    } catch (error: any) {
      if (error instanceof AuthError) {
        log.error('\nAuthentication failed')
        log.dim(error.message)
        log.dim('\nInstall gh CLI: https://cli.github.com/')
        log.dim('Then run: gh auth login --web\n')
      } else if (error instanceof RateLimitError) {
        log.error('\nRate limit exceeded')
        log.dim(error.message)
        log.dim(`\nResets at: ${error.resetAt.toLocaleString()}`)
        log.dim(`Remaining requests: ${error.remaining}\n`)
      } else if (error instanceof SearchError) {
        log.error('\nSearch failed')
        log.dim(error.message + '\n')
      } else {
        log.error('\nUnexpected error')
        log.dim(error.message || String(error))
        if (error.stack) {
          log.dim('\n' + error.stack)
        }
      }
      process.exit(1)
    }
  })

program.parse()

function formatMarkdownReport(
  files: CodeFile[],
  stats: { query: string; totalResults: number; executionTimeMs: number }
): string {
  const sections: string[] = []

  // Header
  sections.push(`# GitHub Code Search Results\n`)
  sections.push(`**Query:** \`${stats.query}\``)
  sections.push(`**Found:** ${stats.totalResults} results, showing top ${files.length}`)
  sections.push(`**Execution:** ${(stats.executionTimeMs / 1000).toFixed(1)}s\n`)
  sections.push('---\n')

  // Code files with lightweight structured format
  for (const file of files) {
    const repoUrl = file.url.split('/blob/')[0] || file.url

    sections.push(`### ${file.rank}. [${file.repository}](${repoUrl}) ⭐ ${formatStars(file.stars)}\n`)
    sections.push(`**Path:** \`${file.path}\``)
    sections.push(`**Language:** ${file.language} | **Lines:** ${file.lines}`)
    sections.push(`**Link:** ${file.url}\n`)

    // Show code snippet (first 40 lines)
    const snippet = file.content.split('\n').slice(0, 40).join('\n')
    sections.push('```' + file.language)
    sections.push(snippet)
    if (file.lines > 40) sections.push('// ... truncated ...')
    sections.push('```\n')
    sections.push('---\n')
  }

  return sections.join('\n')
}

function formatStars(stars: number | undefined): string {
  if (!stars && stars !== 0) return '0'
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`
  }
  return stars.toString()
}

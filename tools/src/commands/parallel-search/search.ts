#!/usr/bin/env node

import log from "@lib/log.js"
import { saveResearchOutput } from "@lib/research.js"
import { debug, env } from "@tools/env.js"
import { getOutputDir } from "@tools/utils/paths.js"
import ora from "ora"

import { formatResults } from "./formatter.js"
import executeSearch from "./parallel-client.js"
import {
  AuthError,
  NetworkError,
  RateLimitError,
  ValidationError,
} from "./types.js"

export interface ParallelSearchOptions {
  objective: string
  queries?: string[]
  processor?: 'lite' | 'base' | 'pro' | 'ultra'
  maxResults?: number
  maxChars?: number
}

export interface ParallelSearchResult {
  results: unknown[]
  jsonPath: string
  mdPath: string
}

export async function runParallelSearch(options: ParallelSearchOptions): Promise<ParallelSearchResult> {
  const RESEARCH_DIR = getOutputDir('research/parallel')
  debug('Parallel search config:', options)

  const startTime = Date.now()
  const queries = options.queries ?? []
  const processor = options.processor ?? 'pro'
  const maxResults = options.maxResults ?? 15
  const maxChars = options.maxChars ?? 5000

  log.header("\n🔍 Parallel Search\n")

  log.dim("Search Configuration:")
  log.dim(`  Objective: "${options.objective}"`)
  if (queries.length > 0) {
    log.dim(`  Queries: ${queries.length}`)
    queries.forEach((query: string, index: number) => {
      log.dim(`    ${index + 1}. "${query}"`)
    })
  }
  log.dim(`  Processor: ${processor}`)
  log.dim(`  Max Results: ${maxResults}`)
  log.dim(`  Max Chars: ${maxChars}\n`)

  const spinner = ora("Searching...").start()

  const results = await executeSearch({
    maxCharsPerResult: maxChars,
    maxResults,
    objective: options.objective,
    processor,
    searchQueries: queries,
  })

  const executionTimeMs = Date.now() - startTime

  if (results.length === 0) {
    spinner.warn("No results found")
    log.dim("\nTry a different query or adjust your search parameters.\n")
    return { results: [], jsonPath: '', mdPath: '' }
  }

  spinner.succeed(`Found ${results.length} results`)

  // Format and output results
  const report = formatResults(results, {
    executionTimeMs,
    objective: options.objective,
    resultCount: results.length,
  })

  // Save research output
  const { jsonPath, mdPath } = await saveResearchOutput({
    markdownContent: report,
    outputDir: RESEARCH_DIR,
    rawData: results,
    topic: options.objective,
  })

  log.plain(`\n${report}`)

  log.success(
    `\nSearch completed in ${(executionTimeMs / 1000).toFixed(1)}s`
  )
  log.plain("")
  log.info(`📄 Raw Data: ${jsonPath}`)
  log.info(`📝 Report: ${mdPath}`)

  return { results, jsonPath, mdPath }
}

export async function runParallelSearchCli(options: ParallelSearchOptions): Promise<void> {
  try {
    await runParallelSearch(options)
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      log.error("\nAuthentication failed")
      log.dim(error.message)
      log.dim("\nGet your API key at: https://platform.parallel.ai/")
      log.dim('Then run: export AAA_PARALLEL_API_KEY="your-key-here"\n')
    } else if (error instanceof RateLimitError) {
      log.error("\nRate limit exceeded")
      log.dim(error.message)
      if (error.resetAt !== undefined) {
        log.dim(`\nResets at: ${error.resetAt.toLocaleString()}`)
      }
      if (error.remaining !== undefined) {
        log.dim(`Remaining requests: ${error.remaining}`)
      }
      log.dim("")
    } else if (error instanceof NetworkError) {
      log.error("\nNetwork error")
      log.dim(error.message)
      log.dim("\nPlease check your internet connection and try again.\n")
    } else if (error instanceof ValidationError) {
      log.error("\nValidation error")
      log.dim(error.message)
      log.dim("\nRun with --help to see valid options.\n")
    } else {
      const errorObject = error as Error
      log.error("\nUnexpected error")
      log.dim(errorObject.message)
      if (errorObject.stack !== undefined) {
        log.dim(`\n${errorObject.stack}`)
      }
      log.dim("")
    }

    process.exit(1)
  }
}

// Standalone execution
if (import.meta.main) {
  const { Command } = await import('@commander-js/extra-typings')
  const { makeParallelSearchCommand } = await import('./command.js')

  const program = new Command()
  program.addCommand(makeParallelSearchCommand())
  program.parse()
}

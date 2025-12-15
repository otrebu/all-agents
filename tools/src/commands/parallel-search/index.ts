#!/usr/bin/env node

import log from "@lib/log";
import { saveResearchOutput } from "@lib/research";
import { debug } from "@tools/env";
import { getOutputDir } from "@tools/utils/paths";
import ora from "ora";

import { formatResults } from "./formatter";
import executeSearch from "./parallel-client";
import {
  AuthError,
  NetworkError,
  RateLimitError,
  ValidationError,
} from "./types";

interface ParallelSearchOptions {
  maxChars?: number;
  maxResults?: number;
  objective: string;
  processor?: "base" | "pro";
  queries?: Array<string>;
}

interface ParallelSearchResult {
  jsonPath: string;
  mdPath: string;
  results: Array<unknown>;
}

async function executeParallelSearch(
  options: ParallelSearchOptions,
): Promise<void> {
  try {
    await performParallelSearch(options);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      log.error("\nAuthentication failed");
      log.dim(error.message);
      log.dim("\nGet your API key at: https://platform.parallel.ai/");
      log.dim('Then run: export AAA_PARALLEL_API_KEY="your-key-here"\n');
    } else if (error instanceof RateLimitError) {
      log.error("\nRate limit exceeded");
      log.dim(error.message);
      if (error.resetAt !== undefined) {
        log.dim(`\nResets at: ${error.resetAt.toLocaleString()}`);
      }
      if (error.remaining !== undefined) {
        log.dim(`Remaining requests: ${error.remaining}`);
      }
      log.dim("");
    } else if (error instanceof NetworkError) {
      log.error("\nNetwork error");
      log.dim(error.message);
      log.dim("\nPlease check your internet connection and try again.\n");
    } else if (error instanceof ValidationError) {
      log.error("\nValidation error");
      log.dim(error.message);
      log.dim("\nRun with --help to see valid options.\n");
    } else {
      const errorObject = error as Error;
      log.error("\nUnexpected error");
      log.dim(errorObject.message);
      if (errorObject.stack !== undefined) {
        log.dim(`\n${errorObject.stack}`);
      }
      log.dim("");
    }

    process.exit(1);
  }
}

async function performParallelSearch(
  options: ParallelSearchOptions,
): Promise<ParallelSearchResult> {
  const RESEARCH_DIR = getOutputDir("research/parallel");
  debug("Parallel search config:", options);

  const startTime = Date.now();
  const queries = options.queries ?? [];
  const processor = options.processor ?? "pro";
  const maxResults = options.maxResults ?? 15;
  const maxChars = options.maxChars ?? 5000;

  log.header("\n🔍 Parallel Search\n");

  log.dim("Search Configuration:");
  log.dim(`  Objective: "${options.objective}"`);
  if (queries.length > 0) {
    log.dim(`  Queries: ${queries.length}`);
    queries.forEach((query: string, index: number) => {
      log.dim(`    ${index + 1}. "${query}"`);
    });
  }
  log.dim(`  Processor: ${processor}`);
  log.dim(`  Max Results: ${maxResults}`);
  log.dim(`  Max Chars: ${maxChars}\n`);

  const spinner = ora("Searching...").start();

  const results = await executeSearch({
    maxCharsPerResult: maxChars,
    maxResults,
    objective: options.objective,
    processor,
    searchQueries: queries,
  });

  const executionTimeMs = Date.now() - startTime;

  if (results.length === 0) {
    spinner.warn("No results found");
    log.dim("\nTry a different query or adjust your search parameters.\n");
    return { jsonPath: "", mdPath: "", results: [] };
  }

  spinner.succeed(`Found ${results.length} results`);

  // Format and output results
  const report = formatResults(results, {
    executionTimeMs,
    objective: options.objective,
    resultCount: results.length,
  });

  // Save research output
  const { jsonPath, mdPath } = await saveResearchOutput({
    markdownContent: report,
    outputDir: RESEARCH_DIR,
    rawData: results,
    topic: options.objective,
  });

  log.plain(`\n${report}`);

  log.success(`\nSearch completed in ${(executionTimeMs / 1000).toFixed(1)}s`);
  log.plain("");
  log.info(`📄 Raw Data: ${jsonPath}`);
  log.info(`📝 Report: ${mdPath}`);

  return { jsonPath, mdPath, results };
}

export type { ParallelSearchOptions, ParallelSearchResult };
export { performParallelSearch };
export default executeParallelSearch;

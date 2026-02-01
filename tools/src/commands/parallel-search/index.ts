#!/usr/bin/env node

/**
 * Parallel Search command using Effect.ts
 *
 * Uses Effect.gen for all async operations with proper error handling.
 * Commander.js action calls Effect.runPromise.
 *
 * @module
 */

import type {
  AuthError,
  FileSystem,
  FileWriteError,
  NetworkError,
  ParallelSearchError,
  PathResolutionError,
  RateLimitError,
  ValidationError,
} from "@tools/lib/effect";

import { debug } from "@tools/env";
import {
  FileSystemLive,
  Logger,
  LoggerLive,
  saveResearchOutput,
} from "@tools/lib/effect";
import { getOutputDir } from "@tools/utils/paths";
import { Effect, Layer } from "effect";
import ora from "ora";

import type { SearchResult } from "./types";

import { executeSearchEffect } from "./effect-parallel-client";
import { formatResults, formatSummary } from "./formatter";

// =============================================================================
// Types
// =============================================================================

interface ParallelSearchOptions {
  maxChars?: number;
  maxResults?: number;
  objective: string;
  processor?: "base" | "pro";
  queries?: Array<string>;
  verbose?: boolean;
}

interface ParallelSearchResult {
  jsonPath: string;
  mdPath: string;
  results: Array<SearchResult>;
}

// =============================================================================
// Effect-based Search Implementation
// =============================================================================

/**
 * Execute parallel search command
 * Commander.js action handler - calls Effect.runPromise
 */
async function executeParallelSearch(
  options: ParallelSearchOptions,
): Promise<void> {
  const program = performParallelSearchEffect(options).pipe(
    Effect.provide(Layer.merge(FileSystemLive, LoggerLive)),
    Effect.catchTags({
      AuthError: (error) =>
        Effect.sync(() => {
          console.error("\nAuthentication failed");
          console.error(error.message);
          console.error("\nGet your API key at: https://platform.parallel.ai/");
          console.error(
            'Then run: export AAA_PARALLEL_API_KEY="your-key-here"\n',
          );
          process.exit(1);
        }),
      FileWriteError: (error) =>
        Effect.sync(() => {
          console.error("\nFailed to save research output");
          console.error(error.message);
          console.error(`Path: ${error.path}`);
          process.exit(1);
        }),
      NetworkError: (error) =>
        Effect.sync(() => {
          console.error("\nNetwork error");
          console.error(error.message);
          console.error(
            "\nPlease check your internet connection and try again.\n",
          );
          process.exit(1);
        }),
      ParallelSearchError: (error) =>
        Effect.sync(() => {
          console.error("\nSearch failed");
          console.error(error.message);
          process.exit(1);
        }),
      PathResolutionError: (error) =>
        Effect.sync(() => {
          console.error("\nFailed to resolve output path");
          console.error(error.message);
          process.exit(1);
        }),
      RateLimitError: (error) =>
        Effect.sync(() => {
          console.error("\nRate limit exceeded");
          console.error(error.message);
          if (error.retryAfterMs !== undefined && error.retryAfterMs > 0) {
            const resetDate = new Date(Date.now() + error.retryAfterMs);
            console.error(`\nResets at: ${resetDate.toLocaleString()}`);
          }
          process.exit(1);
        }),
      ValidationError: (error) =>
        Effect.sync(() => {
          console.error("\nValidation error");
          console.error(error.message);
          console.error("\nRun with --help to see valid options.\n");
          process.exit(1);
        }),
    }),
  );

  try {
    await Effect.runPromise(program);
  } catch (error) {
    // Handle any unexpected errors
    console.error("\nUnexpected error");
    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack !== undefined && error.stack !== "") {
        console.error(`\n${error.stack}`);
      }
    }
    process.exit(1);
  }
}

// =============================================================================
// Command Handler
// =============================================================================

/**
 * Perform parallel search using Effect
 * All operations use Effect.Effect with proper error types
 */
function performParallelSearchEffect(
  options: ParallelSearchOptions,
): Effect.Effect<
  ParallelSearchResult,
  | AuthError
  | FileWriteError
  | NetworkError
  | ParallelSearchError
  | PathResolutionError
  | RateLimitError
  | ValidationError,
  FileSystem | Logger
> {
  return Effect.gen(function* performParallelSearchGenerator() {
    const logger = yield* Logger;
    const RESEARCH_DIR = getOutputDir("research/parallel");
    debug("Parallel search config:", options);

    const startTime = Date.now();
    const queries = options.queries ?? [];
    const processor = options.processor ?? "pro";
    const maxResults = options.maxResults ?? 15;
    const maxChars = options.maxChars ?? 5000;
    const isVerbose = options.verbose ?? false;

    yield* Effect.sync(() => {
      logger.info("\n🔍 Parallel Search\n");

      logger.log("Search Configuration:");
      logger.log(`  Objective: "${options.objective}"`);
      if (queries.length > 0) {
        logger.log(`  Queries: ${queries.length}`);
        queries.forEach((query: string, index: number) => {
          logger.log(`    ${index + 1}. "${query}"`);
        });
      }
      logger.log(`  Processor: ${processor}`);
      logger.log(`  Max Results: ${maxResults}`);
      logger.log(`  Max Chars: ${maxChars}\n`);
    });

    const spinner = ora("Searching...").start();

    const results = yield* executeSearchEffect({
      maxCharsPerResult: maxChars,
      maxResults,
      objective: options.objective,
      processor,
      searchQueries: queries,
    }).pipe(
      Effect.tapError(() => Effect.sync(() => spinner.fail("Search failed"))),
    );

    const executionTimeMs = Date.now() - startTime;

    if (results.length === 0) {
      spinner.warn("No results found");
      yield* Effect.sync(() => {
        logger.log(
          "\nTry a different query or adjust your search parameters.\n",
        );
      });
      return { jsonPath: "", mdPath: "", results: [] };
    }

    spinner.succeed(`Found ${results.length} results`);

    // Format results
    const metadata = {
      executionTimeMs,
      objective: options.objective,
      resultCount: results.length,
    };
    const report = formatResults(results, metadata);

    // Save research output using Effect-based function
    const { jsonPath, mdPath } = yield* saveResearchOutput({
      markdownContent: report,
      outputDir: RESEARCH_DIR,
      rawData: results,
      topic: options.objective,
    });

    // Output: full report with --verbose, summary by default
    yield* Effect.sync(() => {
      if (isVerbose) {
        logger.log(`\n${report}`);
      } else {
        const summary = formatSummary(results, metadata);
        logger.log(`\n${summary}`);
      }

      logger.success(
        `\nSearch completed in ${(executionTimeMs / 1000).toFixed(1)}s`,
      );
      logger.log("");
      logger.info(`📄 Raw Data: ${jsonPath}`);
      logger.info(`📝 Report: ${mdPath}`);
    });

    return { jsonPath, mdPath, results };
  });
}

// =============================================================================
// Exports
// =============================================================================

// Export Effect-based functions for reuse
export {
  executeSearchEffect,
  getApiKeyEffect,
  validateSearchOptionsEffect,
} from "./effect-parallel-client";

export type { ParallelSearchOptions, ParallelSearchResult };
export { performParallelSearchEffect };
export default executeParallelSearch;

#!/usr/bin/env node

import { log } from "@lib/log.js";
import { Command } from "commander";
import ora from "ora";

import { formatResults } from "./formatter.js";
import { executeSearch } from "./parallel-client.js";
import {
  AuthError,
  NetworkError,
  RateLimitError,
  ValidationError,
} from "./types.js";

const program = new Command();

program
  .name("parallel-search")
  .description("Comprehensive web research via Parallel Search API")
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
    const startTime = Date.now();

    log.header("\n🔍 Parallel Search\n");

    try {
      const queries = [...(options.queries || []), ...(extraQueries || [])];

      log.dim("Search Configuration:");
      log.dim(`  Objective: "${options.objective}"`);
      if (queries.length > 0) {
        log.dim(`  Queries: ${queries.length}`);
        queries.forEach((query: string, index: number) =>
          { log.dim(`    ${index + 1}. "${query}"`); }
        );
      }
      log.dim(`  Processor: ${options.processor}`);
      log.dim(`  Max Results: ${options.maxResults}`);
      log.dim(`  Max Chars: ${options.maxChars}\n`);

      const spinner = ora("Searching...").start();

      const results = await executeSearch({
        maxCharsPerResult: options.maxChars,
        maxResults: options.maxResults,
        objective: options.objective,
        processor: options.processor as
          | "base"
          | "lite"
          | "pro"
          | "ultra"
          | undefined,
        searchQueries: queries,
      });

      const executionTimeMs = Date.now() - startTime;

      if (results.length === 0) {
        spinner.warn("No results found");
        log.dim("\nTry a different query or adjust your search parameters.\n");
        return;
      }

      spinner.succeed(`Found ${results.length} results`);

      // Format and output results
      const report = formatResults(results, {
        executionTimeMs,
        objective: options.objective,
        resultCount: results.length,
      });

      log.plain(`\n${  report}`);

      log.success(
        `\nSearch completed in ${(executionTimeMs / 1000).toFixed(1)}s`
      );
    } catch (error: any) {
      // Handle specific error types with helpful messages
      if (error instanceof AuthError) {
        log.error("\nAuthentication failed");
        log.dim(error.message);
        log.dim("\nGet your API key at: https://platform.parallel.ai/");
        log.dim('Then run: export PARALLEL_API_KEY="your-key-here"\n');
      } else if (error instanceof RateLimitError) {
        log.error("\nRate limit exceeded");
        log.dim(error.message);
        if (error.resetAt) {
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
        log.error("\nUnexpected error");
        log.dim(error.message || String(error));
        if (error.stack) {
          log.dim(`\n${  error.stack}`);
        }
        log.dim("");
      }

      process.exit(1);
    }
  });

program.parse();

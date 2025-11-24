#!/usr/bin/env node

import log from "../../../../tools/lib/log.js";
import { saveResearchOutput } from "../../../../tools/lib/research.js";
import { Command } from "commander";
import ora from "ora";

import { formatResults } from "./formatter.js";
import executeSearch from "./parallel-client.js";
import {
  AuthError,
  NetworkError,
  RateLimitError,
  ValidationError,
} from "./types.js";

import { getContextRoot } from '../../../../tools/src/utils/path-resolver.js';
import path from 'path';

const RESEARCH_DIR = path.join(getContextRoot(), 'research/parallel');

const program = new Command();

export async function runParallelSearch(extraQueries: Array<string>, options: {
    maxChars: number
    maxResults: number
    objective: string
    processor: string
    queries?: Array<string>
  }) {
    const startTime = Date.now();

    log.header("\n🔍 Parallel Search\n");

    try {
      const queries = [...(options.queries ?? []), ...extraQueries];

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

      // Save research output
      const { jsonPath, mdPath } = await saveResearchOutput({
        markdownContent: report,
        outputDir: RESEARCH_DIR,
        rawData: results,
        topic: options.objective,
      });

      log.plain(`\n${  report}`);

      log.success(
        `\nSearch completed in ${(executionTimeMs / 1000).toFixed(1)}s`
      );
      log.plain("");
      log.info(`📄 Raw Data: ${jsonPath}`);
      log.info(`📝 Report: ${mdPath}`);
    } catch (error: unknown) {
      // Handle specific error types with helpful messages
      if (error instanceof AuthError) {
        log.error("\nAuthentication failed");
        log.dim(error.message);
        log.dim("\nGet your API key at: https://platform.parallel.ai/");
        log.dim('Then run: export PARALLEL_API_KEY="your-key-here"\n');
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
        const errorObject = error as Error
        log.error("\nUnexpected error");
        log.dim(errorObject.message);
        if (errorObject.stack !== undefined) {
          log.dim(`\n${  errorObject.stack}`);
        }
        log.dim("");
      }

      process.exit(1);
    }
  }

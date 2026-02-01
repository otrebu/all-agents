#!/usr/bin/env node

/**
 * GitHub search command using Effect.ts
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
  PathResolutionError,
  RateLimitError,
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

import type { CodeFile } from "./types";

import {
  fetchCodeFilesEffect,
  getGitHubTokenEffect,
  GitHubSearchError,
  searchGitHubCodeEffect,
} from "./effect-github";
import buildQueryIntent from "./query";
import getRankedResults from "./ranker";

// =============================================================================
// Types
// =============================================================================

interface GitHubSearchResult {
  files: Array<CodeFile>;
  jsonPath: string;
  mdPath: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Execute GitHub search command
 * Commander.js action handler - calls Effect.runPromise
 */
async function executeGithubSearch(userQuery: string): Promise<void> {
  const program = performGithubSearch(userQuery).pipe(
    Effect.provide(Layer.merge(FileSystemLive, LoggerLive)),
    Effect.catchTags({
      AuthError: (error) =>
        Effect.sync(() => {
          console.error("\nAuthentication failed");
          console.error(error.message);
          console.error("\nInstall gh CLI: https://cli.github.com/");
          console.error("Then run: gh auth login --web\n");
          process.exit(1);
        }),
      FileWriteError: (error) =>
        Effect.sync(() => {
          console.error("\nFailed to save research output");
          console.error(error.message);
          console.error(`Path: ${error.path}`);
          process.exit(1);
        }),
      GitHubSearchError: (error) =>
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

function formatMarkdownReport(
  files: Array<CodeFile>,
  stats: { executionTimeMs: number; query: string; totalResults: number },
): string {
  const sections: Array<string> = [];

  // Header
  sections.push(`# GitHub Code Search Results\n`);
  sections.push(`**Query:** \`${stats.query}\``);
  sections.push(
    `**Found:** ${stats.totalResults} results, showing top ${files.length}`,
  );
  sections.push(
    `**Execution:** ${(stats.executionTimeMs / 1000).toFixed(1)}s\n`,
  );
  sections.push("---\n");

  // Code files with lightweight structured format
  for (const file of files) {
    const repoUrl = file.url.split("/blob/")[0] ?? file.url;

    sections.push(
      `### ${file.rank}. [${file.repository}](${repoUrl}) ⭐ ${formatStars(file.stars)}\n`,
    );
    sections.push(`**Path:** \`${file.path}\``);
    sections.push(`**Language:** ${file.language} | **Lines:** ${file.lines}`);
    sections.push(`**Link:** ${file.url}\n`);

    // Show code snippet (first 40 lines)
    const snippet = file.content.split("\n").slice(0, 40).join("\n");
    sections.push(`\`\`\`${file.language}`);
    sections.push(snippet);
    if (file.lines > 40) sections.push("// ... truncated ...");
    sections.push("```\n");
    sections.push("---\n");
  }

  return sections.join("\n");
}

// =============================================================================
// Effect-based Search Implementation
// =============================================================================

function formatStars(stars: number | undefined): string {
  if (stars === undefined || stars === 0) return "0";
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return stars.toString();
}

// =============================================================================
// Command Handler
// =============================================================================

/**
 * Perform GitHub search using Effect
 * All operations use Effect.Effect with proper error types
 */
function performGithubSearch(
  userQuery: string,
): Effect.Effect<
  GitHubSearchResult,
  | AuthError
  | FileWriteError
  | GitHubSearchError
  | PathResolutionError
  | RateLimitError,
  FileSystem | Logger
> {
  return Effect.gen(function* performGithubSearchGenerator() {
    const logger = yield* Logger;
    const RESEARCH_DIR = getOutputDir("research/github");
    debug("Research dir:", RESEARCH_DIR);

    const startTime = Date.now();

    yield* Effect.sync(() => logger.info("\n🔍 GitHub Code Search\n"));

    const trimmedQuery = String(userQuery).trim();
    if (trimmedQuery.length === 0) {
      return yield* Effect.fail(
        new GitHubSearchError({ message: "No query provided", query: "" }),
      );
    }

    // Auth - use ora spinner outside Effect
    const authSpinner = ora("Authenticating with GitHub...").start();
    const token = yield* getGitHubTokenEffect().pipe(
      Effect.tapError(() =>
        Effect.sync(() => authSpinner.fail("Authentication failed")),
      ),
      Effect.tap(() => Effect.sync(() => authSpinner.succeed("Authenticated"))),
    );

    // Build query
    const { options, query } = buildQueryIntent(trimmedQuery);
    yield* Effect.sync(() => {
      logger.log(`\nSearch Parameters:`);
      logger.log(`  Query: "${query}"`);
      logger.log(`  Filters: ${JSON.stringify(options)}\n`);
    });

    // Search with retry for rate limits
    const searchSpinner = ora("Searching GitHub...").start();
    const searchResults = yield* searchGitHubCodeEffect(
      token,
      query,
      options,
    ).pipe(
      Effect.tapError(() =>
        Effect.sync(() => searchSpinner.fail("Search failed")),
      ),
      Effect.tap((results) =>
        Effect.sync(() =>
          searchSpinner.succeed(`Found ${results.length} results`),
        ),
      ),
    );

    if (searchResults.length === 0) {
      yield* Effect.sync(() => {
        logger.warn("No results found");
        logger.log("Try a different query or remove filters.");
      });
      return { files: [], jsonPath: "", mdPath: "" };
    }

    // Rank
    const rankSpinner = ora("Ranking by quality...").start();
    const ranked = getRankedResults(searchResults, 10);
    rankSpinner.succeed(`Top ${ranked.length} selected`);

    // Fetch files in parallel using Effect.all
    const fetchSpinner = ora(
      `Fetching code from ${ranked.length} files...`,
    ).start();

    const { failures, files } = yield* fetchCodeFilesEffect({
      contextLinesCount: 20,
      maxFiles: 10,
      rankedResults: ranked,
      token,
    });

    fetchSpinner.succeed(`Fetched ${files.length} files`);

    // Log failures if any
    if (failures.length > 0) {
      yield* Effect.sync(() => {
        logger.warn(
          `Failed to fetch ${failures.length}/${ranked.length} files`,
        );
        failures.slice(0, 3).forEach((error) => {
          logger.log(
            `   - ${error.repository}/${error.path}: ${error.message}`,
          );
        });
      });
    }

    // Output clean markdown for Claude
    const report = formatMarkdownReport(files, {
      executionTimeMs: Date.now() - startTime,
      query: trimmedQuery,
      totalResults: searchResults.length,
    });

    // Save research output using Effect-based function
    const { jsonPath, mdPath } = yield* saveResearchOutput({
      markdownContent: report,
      outputDir: RESEARCH_DIR,
      rawData: { files, ranked, results: searchResults },
      topic: trimmedQuery,
    });

    yield* Effect.sync(() => {
      logger.info("\nSearch complete!");
      logger.log(`\n${report}`);
      logger.log("");
      logger.info(`📄 Raw Data: ${jsonPath}`);
      logger.info(`📝 Report: ${mdPath}`);
    });

    return { files, jsonPath, mdPath };
  });
}

// =============================================================================
// Exports
// =============================================================================

// Export Effect-based functions for reuse
export {
  fetchCodeFilesEffect,
  getGitHubTokenEffect,
  GitHubFetchError,
  GitHubSearchError,
  searchGitHubCodeEffect,
} from "./effect-github";

export type { GitHubSearchResult };
export { performGithubSearch };
export default executeGithubSearch;

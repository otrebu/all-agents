#!/usr/bin/env node

import log from "@lib/log.js";
import { saveResearchOutput } from "@lib/research.js";
import { debug } from "@tools/env.js";
import { getOutputDir } from "@tools/utils/paths.js";
import ora from "ora";

import type { CodeFile } from "./types.js";

import { fetchCodeFiles, getGitHubToken, searchGitHubCode } from "./github.js";
import buildQueryIntent from "./query.js";
import getRankedResults from "./ranker.js";
import { AuthError, RateLimitError, SearchError } from "./types.js";

interface GitHubSearchResult {
  files: Array<CodeFile>;
  jsonPath: string;
  mdPath: string;
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

function formatStars(stars: number | undefined): string {
  if (stars === undefined || stars === 0) return "0";
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return stars.toString();
}

async function runGitHubSearch(userQuery: string): Promise<GitHubSearchResult> {
  const RESEARCH_DIR = getOutputDir("research/github");
  debug("Research dir:", RESEARCH_DIR);

  const startTime = Date.now();

  log.header("\n🔍 GitHub Code Search\n");

  const trimmedQuery = String(userQuery).trim();
  if (trimmedQuery.length === 0) {
    throw new Error("No query provided");
  }

  // Auth
  const authSpinner = ora("Authenticating with GitHub...").start();
  const token = getGitHubToken();
  authSpinner.succeed("Authenticated");

  // Build query
  const { options, query } = buildQueryIntent(trimmedQuery);
  log.dim("\nSearch Parameters:");
  log.dim(`  Query: "${query}"`);
  log.dim(`  Filters: ${JSON.stringify(options)}\n`);

  // Search
  const searchSpinner = ora("Searching GitHub...").start();
  const searchResults = await searchGitHubCode(token, query, options);
  searchSpinner.succeed(`Found ${searchResults.length} results`);
  const results = searchResults;

  if (results.length === 0) {
    log.warn("No results found");
    log.dim("Try a different query or remove filters.");
    return { files: [], jsonPath: "", mdPath: "" };
  }

  // Rank
  const rankSpinner = ora("Ranking by quality...").start();
  const ranked = getRankedResults(results, 10);
  rankSpinner.succeed(`Top ${ranked.length} selected`);

  // Fetch
  const fetchSpinner = ora(
    `Fetching code from ${ranked.length} files...`,
  ).start();
  const files = await fetchCodeFiles({
    contextLinesCount: 20,
    maxFiles: 10,
    rankedResults: ranked,
    token,
  });
  fetchSpinner.succeed(`Fetched ${files.length} files`);

  // Output clean markdown for Claude
  const report = formatMarkdownReport(files, {
    executionTimeMs: Date.now() - startTime,
    query: trimmedQuery,
    totalResults: results.length,
  });

  // Save research output
  const { jsonPath, mdPath } = await saveResearchOutput({
    markdownContent: report,
    outputDir: RESEARCH_DIR,
    rawData: { files, ranked, results },
    topic: trimmedQuery,
  });

  log.success("\nSearch complete!");
  log.plain(`\n${report}`);
  log.plain("");
  log.info(`📄 Raw Data: ${jsonPath}`);
  log.info(`📝 Report: ${mdPath}`);

  return { files, jsonPath, mdPath };
}

async function runGitHubSearchCli(userQuery: string): Promise<void> {
  try {
    await runGitHubSearch(userQuery);
  } catch (error) {
    const unknownError = error as Error;
    if (error instanceof AuthError) {
      log.error("\nAuthentication failed");
      log.dim(error.message);
      log.dim("\nInstall gh CLI: https://cli.github.com/");
      log.dim("Then run: gh auth login --web\n");
    } else if (error instanceof RateLimitError) {
      log.error("\nRate limit exceeded");
      log.dim(error.message);
      log.dim(`\nResets at: ${error.resetAt.toLocaleString()}`);
      log.dim(`Remaining requests: ${error.remaining}\n`);
    } else if (error instanceof SearchError) {
      log.error("\nSearch failed");
      log.dim(`${error.message}\n`);
    } else {
      log.error("\nUnexpected error");
      const errorMessage = unknownError.message;
      log.dim(errorMessage);
      const errorStack = unknownError.stack;
      if (errorStack !== undefined && errorStack.length > 0) {
        log.dim(`\n${errorStack}`);
      }
    }
    process.exit(1);
  }
}

export type { GitHubSearchResult };
export { runGitHubSearch, runGitHubSearchCli };

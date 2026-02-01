/**
 * Effect-based GitHub search operations
 *
 * Wraps Octokit calls in Effect with proper error types:
 * - GitHubAuthError: Authentication/token issues
 * - GitHubSearchError: Search API failures
 * - GitHubFetchError: File content fetch failures
 * - RateLimitError: GitHub API rate limiting
 *
 * Uses Effect.retry with jitter for rate limit handling.
 *
 * @module
 */

/* eslint-disable import/exports-last, unicorn/throw-new-error, promise/prefer-await-to-callbacks */

import type { AuthError, RateLimitError } from "@tools/lib/effect";

import { Octokit } from "@octokit/rest";
// Import the error types to use them
import {
  AuthError as AuthErrorClass,
  RateLimitError as RateLimitErrorClass,
} from "@tools/lib/effect";
import { Data, Duration, Effect, Schedule } from "effect";
import { execSync } from "node:child_process";

import type {
  CodeFile,
  RankedResult,
  RawSearchResult,
  SearchOptions,
  SearchResult,
  TextMatch,
} from "./types";

// =============================================================================
// Types
// =============================================================================

interface ExtractMatchesWithContextOptions {
  content: string;
  contextLinesCount: number;
  textMatches: Array<TextMatch>;
}

interface FetchCodeFilesOptions {
  contextLinesCount?: number;
  maxFiles?: number;
  rankedResults: Array<RankedResult>;
  token: string;
}

interface FetchSingleFileOptions {
  contextLinesCount: number;
  octokit: Octokit;
  result: RankedResult;
}

interface OctokitError extends Error {
  response?: { headers?: Record<string, string> };
  status?: number;
}

// =============================================================================
// Effect Error Types
// =============================================================================

/**
 * Error fetching a specific file's content
 */
export class GitHubFetchError extends Data.TaggedError("GitHubFetchError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly path: string;
  readonly repository: string;
}> {}

/**
 * Error during GitHub code search
 */
export class GitHubSearchError extends Data.TaggedError("GitHubSearchError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly query: string;
}> {}

// =============================================================================
// Helper Functions (pure, no Effect)
// =============================================================================

/**
 * Fetch code files in parallel using Effect.all with concurrency
 * Returns successful fetches, logs failures
 */
export function fetchCodeFilesEffect(
  options: FetchCodeFilesOptions,
): Effect.Effect<{
  failures: Array<GitHubFetchError>;
  files: Array<CodeFile>;
}> {
  const {
    contextLinesCount = 20,
    maxFiles = 10,
    rankedResults,
    token,
  } = options;
  const octokit = new Octokit({ auth: token });

  // Create effects for each file fetch
  const fetchEffects = rankedResults.slice(0, maxFiles).map((result) =>
    fetchSingleFileEffect({ contextLinesCount, octokit, result }).pipe(
      // Convert to Either-like result for collecting both successes and failures
      Effect.map((file) => ({ error: null as GitHubFetchError | null, file })),
      Effect.catchAll((error: GitHubFetchError) =>
        Effect.succeed({ error, file: null as CodeFile | null }),
      ),
    ),
  );

  return Effect.all(fetchEffects, { concurrency: 5 }).pipe(
    Effect.map((results) => {
      const files: Array<CodeFile> = [];
      const failures: Array<GitHubFetchError> = [];

      for (const result of results) {
        if (result.file !== null) {
          files.push(result.file);
        }
        if (result.error !== null) {
          failures.push(result.error);
        }
      }

      return { failures, files };
    }),
  );
}

/**
 * Get GitHub token from gh CLI
 * Returns Effect.Effect<string, AuthError>
 */
export function getGitHubTokenEffect(): Effect.Effect<string, AuthError> {
  return Effect.try({
    catch: (error) =>
      new AuthErrorClass({
        cause: error,
        message:
          "GitHub CLI not found or authentication failed. Install: https://cli.github.com/",
        service: "github",
      }),
    try: () => {
      const token = execSync("gh auth token", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();

      if (token.length === 0) {
        throw new Error("GitHub CLI not authenticated");
      }

      return token;
    },
  });
}

/**
 * Check if GitHub CLI is authenticated
 */
export function isAuthenticatedEffect(): Effect.Effect<boolean> {
  return Effect.try({
    catch: () => false,
    try: () => {
      const token = execSync("gh auth token", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      return token.length > 0;
    },
  }).pipe(Effect.catchAll(() => Effect.succeed(false)));
}

/**
 * Search GitHub code using Effect
 * Uses Effect.retry with exponential backoff for rate limits
 */
export function searchGitHubCodeEffect(
  token: string,
  query: string,
  options: SearchOptions = {},
): Effect.Effect<Array<SearchResult>, GitHubSearchError | RateLimitError> {
  const octokit = new Octokit({ auth: token });
  const searchQuery = buildSearchQuery(query, options);
  const limit = options.limit ?? 100;

  // Retry schedule with exponential backoff and jitter for rate limits
  const retrySchedule = Schedule.exponential(Duration.seconds(2), 2).pipe(
    Schedule.jittered,
    Schedule.compose(Schedule.recurs(3)),
  );

  function fetchPageEffect(
    pageNumber: number,
    itemsPerPage: number,
  ): Effect.Effect<
    { items: Array<RawSearchResult>; rateLimitRemaining: number },
    GitHubSearchError | RateLimitError
  > {
    return Effect.tryPromise({
      catch: (error) => {
        const octokitError = error as OctokitError;
        if (octokitError.status === 403) {
          const resetTime =
            octokitError.response?.headers?.["x-ratelimit-reset"];
          const resetMs =
            resetTime !== undefined && resetTime !== ""
              ? Number.parseInt(resetTime, 10) * 1000 - Date.now()
              : 60_000;

          return new RateLimitErrorClass({
            message: "GitHub API rate limit exceeded",
            retryAfterMs: resetMs,
          });
        }
        return new GitHubSearchError({
          cause: error,
          message: `Search failed: ${octokitError.message}`,
          query: searchQuery,
        });
      },
      try: async () => {
        const response = await octokit.rest.search.code({
          headers: { Accept: "application/vnd.github.v3.text-match+json" },
          page: pageNumber,
          per_page: itemsPerPage,
          q: searchQuery,
        });

        const rateLimitRemainingHeader =
          response.headers["x-ratelimit-remaining"];
        const rateLimitRemaining = Number.parseInt(
          rateLimitRemainingHeader ?? "0",
          10,
        );

        return {
          items: response.data.items as unknown as Array<RawSearchResult>,
          rateLimitRemaining,
        };
      },
    });
  }

  function fetchAllPagesEffect(
    remaining: number,
    page: number,
    accumulated: Array<RawSearchResult>,
  ): Effect.Effect<Array<RawSearchResult>, GitHubSearchError | RateLimitError> {
    if (remaining <= 0) {
      return Effect.succeed(accumulated);
    }

    const perPage = Math.min(remaining, 100);

    return fetchPageEffect(page, perPage).pipe(
      // Retry on rate limit errors
      Effect.retry({
        schedule: retrySchedule,
        while: (error) => error._tag === "RateLimitError",
      }),
      Effect.flatMap(({ items, rateLimitRemaining }) => {
        const updatedResults = [...accumulated, ...items];

        // Warn if rate limit is low
        if (rateLimitRemaining < 10) {
          return Effect.logWarning(
            `Rate limit low: ${rateLimitRemaining} requests remaining`,
          ).pipe(
            Effect.flatMap(() => {
              if (items.length < perPage) {
                return Effect.succeed(updatedResults);
              }
              return fetchAllPagesEffect(
                remaining - items.length,
                page + 1,
                updatedResults,
              );
            }),
          );
        }

        if (items.length < perPage) {
          return Effect.succeed(updatedResults);
        }

        return fetchAllPagesEffect(
          remaining - items.length,
          page + 1,
          updatedResults,
        );
      }),
    );
  }

  return fetchAllPagesEffect(limit, 1, []).pipe(
    Effect.flatMap((allResults) =>
      // Fetch repo stars in parallel
      fetchRepoStarsEffect(octokit, allResults).pipe(
        Effect.map((repoStars) =>
          allResults.map((item) => ({
            lastPushed: item.repository.pushed_at,
            path: item.path,
            repository: item.repository.full_name,
            score: item.score,
            stars: repoStars.get(item.repository.full_name) ?? 0,
            textMatches: item.text_matches ?? [],
            url: item.html_url,
          })),
        ),
      ),
    ),
  );
}

function buildSearchQuery(query: string, options: SearchOptions): string {
  let q = query;

  if (options.language !== undefined && options.language.length > 0)
    q += ` language:${options.language}`;
  if (options.extension !== undefined && options.extension.length > 0)
    q += ` extension:${options.extension}`;
  if (options.filename !== undefined && options.filename.length > 0)
    q += ` filename:${options.filename}`;
  if (options.repo !== undefined && options.repo.length > 0)
    q += ` repo:${options.repo}`;
  if (options.owner !== undefined && options.owner.length > 0)
    q += ` user:${options.owner}`;
  if (options.path !== undefined && options.path.length > 0)
    q += ` path:${options.path}`;

  return q.trim();
}

// =============================================================================
// Effect-based Functions
// =============================================================================

function detectLanguage(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";

  const langMap: Record<string, string> = {
    go: "go",
    java: "java",
    js: "javascript",
    json: "json",
    jsx: "javascript",
    md: "markdown",
    php: "php",
    py: "python",
    rb: "ruby",
    rs: "rust",
    sh: "bash",
    ts: "typescript",
    tsx: "typescript",
    yaml: "yaml",
    yml: "yaml",
  };

  return langMap[extension] ?? extension;
}

function expandContextBackward(
  content: string,
  startPos: number,
  lineCount: number,
): number {
  let contextStart = startPos;
  let currentLineCount = 0;

  while (currentLineCount < lineCount && contextStart > 0) {
    const newContextStart = content.lastIndexOf("\n", contextStart - 1);
    if (newContextStart === -1) return 0;
    contextStart = newContextStart;
    currentLineCount += 1;
  }

  return contextStart;
}

function expandContextForward(
  content: string,
  endPos: number,
  lineCount: number,
): number {
  let contextEnd = endPos;
  let currentLineCount = 0;

  while (currentLineCount < lineCount && contextEnd < content.length) {
    const nextNewline = content.indexOf("\n", contextEnd + 1);
    if (nextNewline === -1) return content.length;
    contextEnd = nextNewline;
    currentLineCount += 1;
  }

  return contextEnd;
}

function extractMatchesWithContext(
  options: ExtractMatchesWithContextOptions,
): string {
  const { content, contextLinesCount, textMatches } = options;
  const fragments: Array<string> = [];

  for (const match of textMatches) {
    if (match.property === "content") {
      const { fragment } = match;
      const fragmentIndex = content.indexOf(fragment);

      if (fragmentIndex === -1) {
        fragments.push(fragment);
      } else {
        // Find line boundaries
        let startPos = content.lastIndexOf("\n", fragmentIndex);
        if (startPos === -1) startPos = 0;
        let endPos = content.indexOf("\n", fragmentIndex + fragment.length);
        if (endPos === -1) endPos = content.length;

        // Expand context
        let contextStart = expandContextBackward(
          content,
          startPos,
          contextLinesCount,
        );
        const contextEnd = expandContextForward(
          content,
          endPos,
          contextLinesCount,
        );

        // Adjust to line boundaries
        contextStart = content.lastIndexOf("\n", contextStart) + 1;
        if (contextStart < 0) contextStart = 0;

        const extractedFragment = content.slice(contextStart, contextEnd);
        fragments.push(extractedFragment.trim());
      }
    }
  }

  return fragments.length > 0 ? fragments.join("\n\n---\n\n") : content;
}

/**
 * Fetch repo stars in batches
 */
function fetchRepoStarsEffect(
  octokit: Octokit,
  results: Array<RawSearchResult>,
): Effect.Effect<Map<string, number>> {
  const uniqueRepos = [...new Set(results.map((r) => r.repository.full_name))];
  const batchSize = 10;

  // Create effects for each batch
  const batchEffects: Array<Effect.Effect<Array<[string, number]>>> = [];

  for (let index = 0; index < uniqueRepos.length; index += batchSize) {
    const batch = uniqueRepos.slice(index, index + batchSize);

    const batchEffect = Effect.all(
      batch.map((fullName) => {
        const [owner, repo] = fullName.split("/");
        if (owner === undefined || repo === undefined) {
          return Effect.succeed([fullName, 0] as [string, number]);
        }

        return Effect.tryPromise({
          catch: () => [fullName, 0] as [string, number],
          try: async () => {
            const response = await octokit.rest.repos.get({ owner, repo });
            return [fullName, response.data.stargazers_count] as [
              string,
              number,
            ];
          },
        }).pipe(
          Effect.catchAll(() =>
            Effect.succeed([fullName, 0] as [string, number]),
          ),
        );
      }),
      { concurrency: batchSize },
    );

    batchEffects.push(batchEffect);
  }

  return Effect.all(batchEffects, { concurrency: 3 }).pipe(
    Effect.map((batchResults) => {
      const starsMap = new Map<string, number>();
      for (const batch of batchResults) {
        for (const [fullName, stars] of batch) {
          starsMap.set(fullName, stars);
        }
      }
      return starsMap;
    }),
  );
}

/**
 * Fetch a single file's content from GitHub
 */
function fetchSingleFileEffect(
  options: FetchSingleFileOptions,
): Effect.Effect<CodeFile, GitHubFetchError> {
  const { contextLinesCount, octokit, result } = options;

  return Effect.tryPromise({
    catch: (error) =>
      new GitHubFetchError({
        cause: error,
        message:
          error instanceof Error ? error.message : "Failed to fetch file",
        path: result.path,
        repository: result.repository,
      }),
    try: async () => {
      const [owner, repo] = result.repository.split("/");
      if (owner === undefined || repo === undefined) {
        throw new Error(`Invalid repository format: ${result.repository}`);
      }

      const response = await octokit.rest.repos.getContent({
        mediaType: { format: "raw" },
        owner,
        path: result.path,
        repo,
      });

      const content = response.data as unknown as string;

      // Extract context around matches (ghx pattern)
      const processedContent =
        result.textMatches.length > 0
          ? extractMatchesWithContext({
              content,
              contextLinesCount,
              textMatches: result.textMatches,
            })
          : content;

      const language = detectLanguage(result.path);

      // Skip files that are too large (>100KB)
      const maxFileSizeBytes = 100_000;
      if (content.length > maxFileSizeBytes) {
        throw new Error(`File too large (>${maxFileSizeBytes / 1000}KB)`);
      }

      return {
        content: processedContent,
        language,
        lines: processedContent.split("\n").length,
        path: result.path,
        rank: result.rank,
        repository: result.repository,
        stars: result.stars,
        url: result.url,
      };
    },
  });
}

// =============================================================================
// Exports
// =============================================================================

export type { FetchCodeFilesOptions };

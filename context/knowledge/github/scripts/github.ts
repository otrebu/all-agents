import log from "../../../../tools/lib/log.js";
import { Octokit } from "@octokit/rest";
import { execSync } from "node:child_process";

import type {
  CodeFile,
  RankedResult,
  RawSearchResult,
  SearchOptions,
  SearchResult,
  TextMatch,
} from "./types.js";

import { AuthError, FetchError, RateLimitError, SearchError } from "./types.js";

// ===== AUTHENTICATION =====

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

// ===== SEARCH =====

interface FetchSingleFileOptions {
  contextLinesCount: number;
  octokit: Octokit;
  result: RankedResult;
}

interface OctokitError extends Error {
  response?: {
    headers?: Record<string, string>;
  };
  status?: number;
}

function buildSearchQuery(query: string, options: SearchOptions): string {
  let q = query;

  if (options.language !== undefined && options.language.length > 0) q += ` language:${options.language}`;
  if (options.extension !== undefined && options.extension.length > 0) q += ` extension:${options.extension}`;
  if (options.filename !== undefined && options.filename.length > 0) q += ` filename:${options.filename}`;
  if (options.repo !== undefined && options.repo.length > 0) q += ` repo:${options.repo}`;
  if (options.owner !== undefined && options.owner.length > 0) q += ` user:${options.owner}`;
  if (options.path !== undefined && options.path.length > 0) q += ` path:${options.path}`;

  return q.trim();
}

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

// ===== PARALLEL FETCHING =====

function expandContextBackward(content: string, startPos: number, lineCount: number): number {
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

function expandContextForward(content: string, endPos: number, lineCount: number): number {
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
  options: ExtractMatchesWithContextOptions
): string {
  const { content, contextLinesCount, textMatches } = options;
  const fragments: Array<string> = [];

  for (const match of textMatches) {
    if (match.property === "content") {
      const {fragment} = match;
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
        let contextStart = expandContextBackward(content, startPos, contextLinesCount);
        const contextEnd = expandContextForward(content, endPos, contextLinesCount);

        // Adjust to line boundaries
        contextStart = content.lastIndexOf("\n", contextStart) + 1;
        if (contextStart < 0) contextStart = 0;

        const extractedFragment = content.slice(contextStart, contextEnd);
        fragments.push(extractedFragment.trim());
      }
    } else {
      // Skip non-content matches
    }
  }

  return fragments.length > 0 ? fragments.join("\n\n---\n\n") : content;
}

async function fetchCodeFiles(
  options: FetchCodeFilesOptions
): Promise<Array<CodeFile>> {
  const {
    contextLinesCount = 20,
    maxFiles = 10,
    rankedResults,
    token,
  } = options;
  const octokit = new Octokit({ auth: token });

  const fetchPromises = rankedResults
    .slice(0, maxFiles)
    .map(async (result) => fetchSingleFile({ contextLinesCount, octokit, result }));

  const settled = await Promise.allSettled(fetchPromises);

  const successfulFetches = settled
    .filter(
      (r): r is PromiseFulfilledResult<CodeFile> => r.status === "fulfilled"
    )
    .map((r) => r.value);

  const failures = settled
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => r.reason as FetchError);

  if (failures.length > 0) {
    log.warn(
      `Failed to fetch ${failures.length}/${rankedResults.length} files`
    );
    failures.slice(0, 3).forEach((error) => {
      log.dim(`   - ${error.repository}/${error.path}: ${error.message}`);
    });
  }

  return successfulFetches;
}

// ===== CONTEXT EXTRACTION (ghx pattern) =====
// WHY: GitHub text-match fragments need surrounding lines for proper context

// WHY: Code Search API doesn't return star counts, so we batch fetch repo details
async function fetchRepoStars(
  octokit: Octokit,
  results: Array<RawSearchResult>
): Promise<Map<string, number>> {
  // Extract unique repo names
  const uniqueRepos = [...new Set(results.map((r) => r.repository.full_name))];
  const starsMap = new Map<string, number>();

  // Batch fetch repo details (10 at a time to avoid rate limits)
  const batchSize = 10;
  const batches: Array<Promise<void>> = [];

  for (let index = 0; index < uniqueRepos.length; index += batchSize) {
    const batch = uniqueRepos.slice(index, index + batchSize);

    const batchPromise = (async (): Promise<void> => {
      const batchResults = await Promise.all(
        batch.map(async (fullName) => {
          const [owner, repo] = fullName.split("/");
          try {
            const response = await octokit.rest.repos.get({ owner, repo });
            return { fullName, stars: response.data.stargazers_count };
          } catch {
            // If repo fetch fails (deleted, private, etc), default to 0 stars
            return { fullName, stars: 0 };
          }
        })
      );

      for (const { fullName, stars } of batchResults) {
        starsMap.set(fullName, stars);
      }
    })();

    batches.push(batchPromise);
  }

  await Promise.all(batches);
  return starsMap;
}

async function fetchSingleFile(
  options: FetchSingleFileOptions
): Promise<CodeFile> {
  const { contextLinesCount, octokit, result } = options;
  try {
    const [owner, repo] = result.repository.split("/");

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
  } catch (error) {
    const caughtError = error as Error;
    throw new FetchError(caughtError.message, {
      cause: caughtError,
      path: result.path,
      repository: result.repository,
    });
  }
}

function getGitHubToken(): string {
  try {
    const token = execSync("gh auth token", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (token.length > 0) {
      return token;
    }

    log.error("GitHub CLI not authenticated");
    log.dim("\nRun: gh auth login --web\n");
    return process.exit(1);
  } catch (error) {
    throw new AuthError(
      "GitHub CLI not found or authentication failed. Install: https://cli.github.com/",
      error as Error
    );
  }
}

function isAuthenticated(): boolean {
  try {
    const token = execSync("gh auth token", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return token.length > 0;
  } catch {
    return false;
  }
}

async function searchGitHubCode(
  token: string,
  query: string,
  options: SearchOptions = {}
): Promise<Array<SearchResult>> {
  const octokit = new Octokit({ auth: token });
  const searchQuery = buildSearchQuery(query, options);

  const limit = options.limit ?? 100;
  let allResults: Array<RawSearchResult> = [];
  let page = 1;
  let remaining = limit;

  async function fetchPage(pageNumber: number, itemsPerPage: number): Promise<Array<RawSearchResult>> {
    const response = await octokit.rest.search.code({
      headers: {
        Accept: "application/vnd.github.v3.text-match+json",
      },
      page: pageNumber,
      per_page: itemsPerPage,
      q: searchQuery,
    });

    // Check rate limits
    const rateLimitRemainingHeader = response.headers["x-ratelimit-remaining"];
    const rateLimitRemaining = Number.parseInt(
      rateLimitRemainingHeader ?? "0",
      10
    );
    const rateLimitResetHeader = response.headers["x-ratelimit-reset"];
    const rateLimitReset = Number.parseInt(
      rateLimitResetHeader ?? "0",
      10
    );

    if (rateLimitRemaining < 10) {
      const resetDate = new Date(rateLimitReset * 1000);
      log.warn(
        `Rate limit low: ${rateLimitRemaining} requests remaining (resets at ${resetDate.toLocaleTimeString()})`
      );
    }

    return response.data.items as unknown as Array<RawSearchResult>;
  }

  while (remaining > 0) {
    const perPage = Math.min(remaining, 100);

    try {
      // eslint-disable-next-line no-await-in-loop -- Sequential pagination required
      const results = await fetchPage(page, perPage);
      allResults = [...allResults, ...results];

      if (results.length < perPage) break;

      remaining -= results.length;
      page += 1;
    } catch (error) {
      const octokitError = error as OctokitError;
      if (octokitError.status === 403) {
        const resetTime = octokitError.response?.headers?.["x-ratelimit-reset"];
        const resetDate = (resetTime !== undefined && resetTime.length > 0)
          ? new Date(Number.parseInt(resetTime, 10) * 1000)
          : new Date();
        throw new RateLimitError(
          "GitHub API rate limit exceeded",
          resetDate,
          0
        );
      }
      throw new SearchError(`Search failed: ${octokitError.message}`, octokitError);
    }
  }

  // Batch fetch repo details to get star counts (Code Search API doesn't include stars)
  const repoStars = await fetchRepoStars(octokit, allResults);

  return allResults.map((item) => ({
    lastPushed: item.repository.pushed_at,
    path: item.path,
    repository: item.repository.full_name,
    score: item.score,
    stars: repoStars.get(item.repository.full_name) ?? 0,
    textMatches: item.text_matches ?? [],
    url: item.html_url,
  }));
}

export { fetchCodeFiles, getGitHubToken, isAuthenticated, searchGitHubCode };
export type { FetchCodeFilesOptions };

import { execSync } from "child_process";
import { Octokit } from "@octokit/rest";
import { log } from "@lib/log.js";
import type {
  SearchOptions,
  RawSearchResult,
  SearchResult,
  RankedResult,
  CodeFile,
  TextMatch,
} from "./types.js";
import { AuthError, SearchError, FetchError, RateLimitError } from "./types.js";

// ===== AUTHENTICATION =====

export async function getGitHubToken(): Promise<string> {
  try {
    const token = execSync("gh auth token", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (token && token.length > 0) {
      return token;
    }

    log.error("GitHub CLI not authenticated");
    log.dim("\nRun: gh auth login --web\n");
    process.exit(1);
  } catch (error) {
    throw new AuthError(
      "GitHub CLI not found or authentication failed. Install: https://cli.github.com/",
      error as Error
    );
  }
}

export function isAuthenticated(): boolean {
  try {
    const token = execSync("gh auth token", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return token.length > 0;
  } catch {
    return false;
  }
}

// ===== SEARCH =====

// WHY: Code Search API doesn't return star counts, so we batch fetch repo details
async function fetchRepoStars(
  octokit: Octokit,
  results: RawSearchResult[]
): Promise<Map<string, number>> {
  // Extract unique repo names
  const uniqueRepos = [...new Set(results.map((r) => r.repository.full_name))];
  const starsMap = new Map<string, number>();

  // Batch fetch repo details (10 at a time to avoid rate limits)
  const batchSize = 10;
  for (let i = 0; i < uniqueRepos.length; i += batchSize) {
    const batch = uniqueRepos.slice(i, i + batchSize);

    const promises = batch.map(async (fullName) => {
      const [owner, repo] = fullName.split("/");
      try {
        const response = await octokit.rest.repos.get({ owner, repo });
        return { fullName, stars: response.data.stargazers_count };
      } catch (error) {
        // If repo fetch fails (deleted, private, etc), default to 0 stars
        return { fullName, stars: 0 };
      }
    });

    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ fullName, stars }) => {
      starsMap.set(fullName, stars);
    });
  }

  return starsMap;
}

export async function searchGitHubCode(
  token: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const octokit = new Octokit({ auth: token });
  const searchQuery = buildSearchQuery(query, options);

  const limit = options.limit ?? 100;
  let allResults: RawSearchResult[] = [];
  let page = 1;
  let remaining = limit;

  while (remaining > 0) {
    const perPage = Math.min(remaining, 100);

    try {
      const response = await octokit.rest.search.code({
        q: searchQuery,
        per_page: perPage,
        page,
        headers: {
          Accept: "application/vnd.github.v3.text-match+json",
        },
      });

      // Check rate limits
      const rateLimitRemaining = parseInt(
        response.headers["x-ratelimit-remaining"] || "0"
      );
      const rateLimitReset = parseInt(
        response.headers["x-ratelimit-reset"] || "0"
      );

      if (rateLimitRemaining < 10) {
        const resetDate = new Date(rateLimitReset * 1000);
        log.warn(
          `Rate limit low: ${rateLimitRemaining} requests remaining (resets at ${resetDate.toLocaleTimeString()})`
        );
      }

      const results = response.data.items as unknown as RawSearchResult[];
      allResults = allResults.concat(results);

      if (results.length < perPage) break;

      remaining -= results.length;
      page++;
    } catch (error: any) {
      if (error.status === 403) {
        const resetTime = error.response?.headers?.["x-ratelimit-reset"];
        const resetDate = resetTime
          ? new Date(parseInt(resetTime) * 1000)
          : new Date();
        throw new RateLimitError(
          "GitHub API rate limit exceeded",
          resetDate,
          0
        );
      }
      throw new SearchError(`Search failed: ${error.message}`, error);
    }
  }

  // Batch fetch repo details to get star counts (Code Search API doesn't include stars)
  const repoStars = await fetchRepoStars(octokit, allResults);

  return allResults.map((item) => ({
    repository: item.repository.full_name,
    path: item.path,
    url: item.html_url,
    score: item.score,
    stars: repoStars.get(item.repository.full_name) || 0,
    lastPushed: item.repository.pushed_at,
    textMatches: item.text_matches || [],
  }));
}

function buildSearchQuery(query: string, options: SearchOptions): string {
  let q = query;

  if (options.language) q += ` language:${options.language}`;
  if (options.extension) q += ` extension:${options.extension}`;
  if (options.filename) q += ` filename:${options.filename}`;
  if (options.repo) q += ` repo:${options.repo}`;
  if (options.owner) q += ` user:${options.owner}`;
  if (options.path) q += ` path:${options.path}`;

  return q.trim();
}

// ===== PARALLEL FETCHING =====

export interface FetchCodeFilesOptions {
  token: string;
  rankedResults: RankedResult[];
  maxFiles?: number;
  contextLinesCount?: number;
}

export async function fetchCodeFiles(
  options: FetchCodeFilesOptions
): Promise<CodeFile[]> {
  const {
    token,
    rankedResults,
    maxFiles = 10,
    contextLinesCount = 20,
  } = options;
  const octokit = new Octokit({ auth: token });

  const fetchPromises = rankedResults
    .slice(0, maxFiles)
    .map((result) => fetchSingleFile({ octokit, result, contextLinesCount }));

  const settled = await Promise.allSettled(fetchPromises);

  const successfulFetches = settled
    .filter(
      (r): r is PromiseFulfilledResult<CodeFile> => r.status === "fulfilled"
    )
    .map((r) => r.value);

  const failures = settled
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => r.reason);

  if (failures.length > 0) {
    log.warn(
      `Failed to fetch ${failures.length}/${rankedResults.length} files`
    );
    failures.slice(0, 3).forEach((err: FetchError) => {
      log.dim(`   - ${err.repository}/${err.path}: ${err.message}`);
    });
  }

  return successfulFetches;
}

interface FetchSingleFileOptions {
  octokit: Octokit;
  result: RankedResult;
  contextLinesCount: number;
}

async function fetchSingleFile(
  options: FetchSingleFileOptions
): Promise<CodeFile> {
  const { octokit, result, contextLinesCount } = options;
  try {
    const [owner, repo] = result.repository.split("/");

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: result.path,
      mediaType: { format: "raw" },
    });

    const content = response.data as unknown as string;

    // Extract context around matches (ghx pattern)
    const processedContent =
      result.textMatches.length > 0
        ? extractMatchesWithContext({
            content,
            textMatches: result.textMatches,
            contextLinesCount,
          })
        : content;

    const language = detectLanguage(result.path);

    // Skip files that are too large (>100KB)
    const maxFileSizeBytes = 100_000;
    if (content.length > maxFileSizeBytes) {
      throw new Error(`File too large (>${maxFileSizeBytes / 1000}KB)`);
    }

    return {
      repository: result.repository,
      path: result.path,
      url: result.url,
      content: processedContent,
      lines: processedContent.split("\n").length,
      language,
      stars: result.stars,
      rank: result.rank,
    };
  } catch (error: any) {
    throw new FetchError(error.message, result.repository, result.path, error);
  }
}

// ===== CONTEXT EXTRACTION (ghx pattern) =====
// WHY: GitHub text-match fragments need surrounding lines for proper context

interface ExtractMatchesWithContextOptions {
  content: string;
  textMatches: TextMatch[];
  contextLinesCount: number;
}

function extractMatchesWithContext(
  options: ExtractMatchesWithContextOptions
): string {
  const { content, textMatches, contextLinesCount } = options;
  const fragments: string[] = [];

  for (const match of textMatches) {
    if (match.property !== "content") continue;

    const fragment = match.fragment;
    const fragmentIndex = content.indexOf(fragment);

    if (fragmentIndex === -1) {
      fragments.push(fragment);
      continue;
    }

    // Find line boundaries
    let startPos = content.lastIndexOf("\n", fragmentIndex);
    if (startPos === -1) startPos = 0;
    let endPos = content.indexOf("\n", fragmentIndex + fragment.length);
    if (endPos === -1) endPos = content.length;

    // Expand context
    let contextStart = startPos;
    let lineCount = 0;
    while (lineCount < contextLinesCount && contextStart > 0) {
      const newContextStart = content.lastIndexOf("\n", contextStart - 1);
      if (newContextStart === -1) {
        contextStart = 0;
        break;
      }
      contextStart = newContextStart;
      lineCount++;
    }

    let contextEnd = endPos;
    lineCount = 0;
    while (lineCount < contextLinesCount && contextEnd < content.length) {
      const nextNewline = content.indexOf("\n", contextEnd + 1);
      if (nextNewline === -1) {
        contextEnd = content.length;
        break;
      }
      contextEnd = nextNewline;
      lineCount++;
    }

    // Adjust to line boundaries
    contextStart = content.lastIndexOf("\n", contextStart) + 1;
    if (contextStart < 0) contextStart = 0;

    const extractedFragment = content.slice(contextStart, contextEnd);
    fragments.push(extractedFragment.trim());
  }

  return fragments.length > 0 ? fragments.join("\n\n---\n\n") : content;
}

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";

  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    rb: "ruby",
    php: "php",
    yml: "yaml",
    yaml: "yaml",
    json: "json",
    md: "markdown",
    sh: "bash",
  };

  return langMap[ext] || ext;
}

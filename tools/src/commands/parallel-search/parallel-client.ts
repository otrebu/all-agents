import Parallel from "parallel-web";

import type { SearchOptions, SearchResult } from "./types";

import {
  AuthError,
  NetworkError,
  ParallelSearchError,
  RateLimitError,
  ValidationError,
} from "./types";

/**
 * Error with status and headers from Parallel API
 */
interface ParallelAPIError extends Error {
  code?: string;
  headers?: Record<string, string>;
  status?: number;
}

/**
 * Response from Parallel API
 */
interface ParallelAPIResponse {
  results?: Array<RawParallelResult>;
}

/**
 * Raw result from Parallel API
 */
interface RawParallelResult {
  excerpts?: Array<string>;
  title?: string;
  url?: string;
}

/**
 * Execute a search using the Parallel Search API
 * @param options Search configuration
 * @returns Array of search results with metadata
 */
async function executeSearch(
  options: SearchOptions,
): Promise<Array<SearchResult>> {
  validateSearchOptions(options);

  const apiKey = process.env.PARALLEL_API_KEY;
  if (apiKey === undefined || apiKey.length === 0) {
    throw new AuthError(
      "PARALLEL_API_KEY environment variable not set. Get your API key at https://platform.parallel.ai/",
    );
  }

  const client = new Parallel({ apiKey });

  try {
    const response = await client.beta.search({
      max_chars_per_result: options.maxCharsPerResult ?? 5000,
      max_results: options.maxResults ?? 15,
      objective: options.objective,
      processor: options.processor ?? "pro",
      search_queries: options.searchQueries,
    });

    return transformResults(response as ParallelAPIResponse);
  } catch (error: unknown) {
    const apiError = error as ParallelAPIError;

    if (apiError.status === 401 || apiError.status === 403) {
      throw new AuthError(
        "Invalid API key or unauthorized access. Check your PARALLEL_API_KEY.",
      );
    }

    if (apiError.status === 429) {
      const resetAt =
        apiError.headers?.["x-ratelimit-reset"] === undefined
          ? undefined
          : new Date(Number(apiError.headers["x-ratelimit-reset"]) * 1000);
      const remaining =
        apiError.headers?.["x-ratelimit-remaining"] === undefined
          ? undefined
          : Number.parseInt(apiError.headers["x-ratelimit-remaining"], 10);

      throw new RateLimitError(
        "Rate limit exceeded. Please wait before making more requests.",
        resetAt,
        remaining,
      );
    }

    if (apiError.code === "ENOTFOUND" || apiError.code === "ECONNREFUSED") {
      throw new NetworkError(
        "Network connection failed. Please check your internet connection.",
        apiError,
      );
    }

    throw new ParallelSearchError(
      `Search failed: ${apiError.message}`,
      apiError,
    );
  }
}

/**
 * Extract domain from URL
 * @param url Full URL
 * @returns Domain name or 'unknown' if invalid
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

/**
 * Transform Parallel API response to our SearchResult format
 * @param response Raw API response
 * @returns Array of formatted search results
 */
function transformResults(response: ParallelAPIResponse): Array<SearchResult> {
  if (response.results === undefined || !Array.isArray(response.results)) {
    return [];
  }

  return response.results.map(
    (rawResult: RawParallelResult, index: number) => ({
      domain: extractDomain(rawResult.url ?? ""),
      excerpts: rawResult.excerpts ?? [],
      rank: index + 1,
      title: rawResult.title ?? "Untitled",
      url: rawResult.url ?? "",
    }),
  );
}

/**
 * Validate search options
 * @param options Search options to validate
 * @throws ValidationError if options are invalid
 */
function validateSearchOptions(options: SearchOptions): void {
  const hasObjective =
    options.objective !== undefined && options.objective.length > 0;
  const hasQueries =
    options.searchQueries !== undefined && options.searchQueries.length > 0;

  if (!hasObjective && !hasQueries) {
    throw new ValidationError(
      "Either objective or searchQueries (or both) must be provided",
    );
  }

  if (options.searchQueries !== undefined) {
    if (options.searchQueries.length > 5) {
      throw new ValidationError("Maximum 5 search queries allowed per request");
    }

    for (const query of options.searchQueries) {
      if (query.length > 200) {
        throw new ValidationError(
          `Search query too long (${query.length} chars). Maximum 200 characters per query.`,
        );
      }
    }
  }

  if (
    options.maxCharsPerResult !== undefined &&
    options.maxCharsPerResult < 100
  ) {
    throw new ValidationError(
      "max_chars_per_result must be at least 100 characters",
    );
  }

  if (options.processor !== undefined) {
    const validProcessors = ["base", "pro"] as const;
    if (!validProcessors.includes(options.processor)) {
      throw new ValidationError(
        `Invalid processor: ${options.processor}. Must be one of: ${validProcessors.join(", ")}`,
      );
    }
  }
}

export default executeSearch;

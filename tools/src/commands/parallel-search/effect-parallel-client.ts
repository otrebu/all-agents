/**
 * Effect-based Parallel Search API client
 *
 * Wraps the Parallel Search API calls in Effect with proper error types.
 * Uses Effect.tryPromise for async operations with type-safe error handling.
 *
 * @module
 */

import { env } from "@tools/env";
import {
  AuthError,
  NetworkError,
  ParallelSearchError,
  RateLimitError,
  ValidationError,
} from "@tools/lib/effect";
import { Effect } from "effect";
import Parallel from "parallel-web";

import type { SearchOptions, SearchResult } from "./types";

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Execute a search using the Parallel Search API
 * Returns Effect with search results or appropriate error type
 */
function executeSearchEffect(
  options: SearchOptions,
): Effect.Effect<
  Array<SearchResult>,
  | AuthError
  | NetworkError
  | ParallelSearchError
  | RateLimitError
  | ValidationError
> {
  return Effect.gen(function* executeSearchGenerator() {
    // Validate options first
    yield* validateSearchOptionsEffect(options);

    // Get API key
    const apiKey = yield* getApiKeyEffect();

    // Create client and execute search
    const client = new Parallel({ apiKey });

    const results = yield* Effect.tryPromise({
      catch: (error: unknown) => {
        const apiError = error as ParallelAPIError;

        // Handle authentication errors
        if (apiError.status === 401 || apiError.status === 403) {
          return new AuthError({
            cause: error,
            message:
              "Invalid API key or unauthorized access. Check your PARALLEL_API_KEY.",
            service: "parallel",
          });
        }

        // Handle rate limiting
        if (apiError.status === 429) {
          const retryAfterMs =
            apiError.headers?.["x-ratelimit-reset"] === undefined
              ? undefined
              : Number(apiError.headers["x-ratelimit-reset"]) * 1000 -
                Date.now();

          return new RateLimitError({
            message:
              "Rate limit exceeded. Please wait before making more requests.",
            retryAfterMs:
              retryAfterMs !== undefined && retryAfterMs > 0
                ? retryAfterMs
                : undefined,
            url: "https://api.parallel.ai",
          });
        }

        // Handle network errors
        if (apiError.code === "ENOTFOUND" || apiError.code === "ECONNREFUSED") {
          return new NetworkError({
            cause: error,
            message:
              "Network connection failed. Please check your internet connection.",
            url: "https://api.parallel.ai",
          });
        }

        // Generic search error
        return new ParallelSearchError({
          cause: error,
          message: `Search failed: ${apiError.message}`,
          objective: options.objective,
        });
      },
      try: async () => {
        const response = await client.beta.search({
          max_chars_per_result: options.maxCharsPerResult ?? 5000,
          max_results: options.maxResults ?? 15,
          objective: options.objective,
          processor: options.processor ?? "pro",
          search_queries: options.searchQueries,
        });

        return transformResults(response as ParallelAPIResponse);
      },
    });

    return results;
  });
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

// =============================================================================
// Effect-based Functions
// =============================================================================

/**
 * Get the Parallel API key from environment
 * Returns Effect.succeed(apiKey) or Effect.fail(AuthError)
 */
function getApiKeyEffect(): Effect.Effect<string, AuthError> {
  return Effect.gen(function* getApiKeyGenerator() {
    const apiKey = env.PARALLEL_API_KEY;
    if (apiKey === undefined || apiKey.length === 0) {
      return yield* Effect.fail(
        new AuthError({
          message:
            "PARALLEL_API_KEY environment variable not set. Get your API key at https://platform.parallel.ai/",
          service: "parallel",
        }),
      );
    }
    return apiKey;
  });
}

/**
 * Transform Parallel API response to our SearchResult format
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
 * Validate search options as an Effect
 * Returns Effect.void on success, or Effect.fail(ValidationError) on failure
 */
function validateSearchOptionsEffect(
  options: SearchOptions,
): Effect.Effect<void, ValidationError> {
  return Effect.gen(function* validateOptionsGenerator() {
    const hasObjective =
      options.objective !== undefined && options.objective.length > 0;
    const hasQueries =
      options.searchQueries !== undefined && options.searchQueries.length > 0;

    if (!hasObjective && !hasQueries) {
      yield* Effect.fail(
        new ValidationError({
          field: "objective/searchQueries",
          message:
            "Either objective or searchQueries (or both) must be provided",
        }),
      );
      return;
    }

    if (options.searchQueries !== undefined) {
      if (options.searchQueries.length > 5) {
        yield* Effect.fail(
          new ValidationError({
            field: "searchQueries",
            message: "Maximum 5 search queries allowed per request",
          }),
        );
        return;
      }

      for (const query of options.searchQueries) {
        if (query.length > 200) {
          yield* Effect.fail(
            new ValidationError({
              field: "searchQueries",
              message: `Search query too long (${query.length} chars). Maximum 200 characters per query.`,
            }),
          );
          return;
        }
      }
    }

    if (
      options.maxCharsPerResult !== undefined &&
      options.maxCharsPerResult < 100
    ) {
      yield* Effect.fail(
        new ValidationError({
          field: "maxCharsPerResult",
          message: "max_chars_per_result must be at least 100 characters",
        }),
      );
      return;
    }

    if (options.processor !== undefined) {
      const validProcessors = ["base", "pro"] as const;
      if (!validProcessors.includes(options.processor)) {
        yield* Effect.fail(
          new ValidationError({
            field: "processor",
            message: `Invalid processor: ${options.processor}. Must be one of: ${validProcessors.join(", ")}`,
          }),
        );
      }
    }
  });
}

// =============================================================================
// Exports
// =============================================================================

export { executeSearchEffect, getApiKeyEffect, validateSearchOptionsEffect };

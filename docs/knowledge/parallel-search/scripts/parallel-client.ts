import Parallel from 'parallel-web'

import type { SearchOptions, SearchResult } from './types.js'

import {
  AuthError,
  NetworkError,
  ParallelSearchError,
  RateLimitError,
  ValidationError,
} from './types.js'

/**
 * Execute a search using the Parallel Search API
 * @param options Search configuration
 * @returns Array of search results with metadata
 */
async function executeSearch(
  options: SearchOptions
): Promise<Array<SearchResult>> {
  validateSearchOptions(options)

  const apiKey = process.env.PARALLEL_API_KEY
  if (apiKey === undefined || apiKey === "") {
    throw new AuthError(
      'PARALLEL_API_KEY environment variable not set. Get your API key at https://platform.parallel.ai/'
    )
  }

  const client = new Parallel({ apiKey })

  try {
    const response = await client.beta.search({
      max_chars_per_result: options.maxCharsPerResult || 5000,
      max_results: options.maxResults || 15,
      objective: options.objective,
      processor: (options.processor ?? 'pro'),
      search_queries: options.searchQueries,
    })

    return transformResults(response)
  } catch (error: unknown) {
    const errorObject = error as {
      code?: string;
      headers?: Record<string, number | string>;
      message?: string;
      status?: number;
    };
    if (errorObject.status === 401 || errorObject.status === 403) {
      throw new AuthError(
        'Invalid API key or unauthorized access. Check your PARALLEL_API_KEY.'
      )
    }

    if (errorObject.status === 429) {
      const resetHeader = errorObject.headers?.['x-ratelimit-reset'];
      const resetAt = resetHeader !== undefined && typeof resetHeader === "number"
        ? new Date(resetHeader * 1000)
        : undefined
      const remainingHeader = errorObject.headers?.['x-ratelimit-remaining'];
      const remaining = remainingHeader !== undefined && typeof remainingHeader === "string"
        ? Number.parseInt(remainingHeader, 10)
        : undefined

      throw new RateLimitError(
        'Rate limit exceeded. Please wait before making more requests.',
        resetAt,
        remaining
      )
    }

    if (errorObject.code === 'ENOTFOUND' || errorObject.code === 'ECONNREFUSED') {
      throw new NetworkError(
        'Network connection failed. Please check your internet connection.',
        error as Error
      )
    }

    const message = typeof errorObject.message === "string" ? errorObject.message : 'Unknown error';
    throw new ParallelSearchError(
      `Search failed: ${message}`,
      error as Error
    )
  }
}

/**
 * Extract domain from URL
 * @param url Full URL
 * @returns Domain name or 'unknown' if invalid
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return 'unknown'
  }
}

/**
 * Transform Parallel API response to our SearchResult format
 * @param response Raw API response
 * @returns Array of formatted search results
 */
function transformResults(response: {
  results?: Array<{
    excerpts?: Array<string>;
    title?: string;
    url?: string;
  }>;
}): Array<SearchResult> {
  if (!response?.results || !Array.isArray(response.results)) {
    return []
  }

  return response.results.map((rawResult, index) => ({
    domain: extractDomain(rawResult.url || ''),
    excerpts: rawResult.excerpts || [],
    rank: index + 1,
    title: rawResult.title || 'Untitled',
    url: rawResult.url || '',
  }))
}

/**
 * Validate search options
 * @param options Search options to validate
 * @throws ValidationError if options are invalid
 */
function validateSearchOptions(options: SearchOptions): void {
  if (!options.objective && (!options.searchQueries || options.searchQueries.length === 0)) {
    throw new ValidationError(
      'Either objective or searchQueries (or both) must be provided'
    )
  }

  if (options.searchQueries) {
    if (options.searchQueries.length > 5) {
      throw new ValidationError(
        'Maximum 5 search queries allowed per request'
      )
    }

    for (const query of options.searchQueries) {
      if (query.length > 200) {
        throw new ValidationError(
          `Search query too long (${query.length} chars). Maximum 200 characters per query.`
        )
      }
    }
  }

  if (
    options.maxCharsPerResult !== undefined &&
    options.maxCharsPerResult < 100
  ) {
    throw new ValidationError(
      'max_chars_per_result must be at least 100 characters'
    )
  }

  if (options.processor) {
    const validProcessors = ['lite', 'base', 'pro', 'ultra']
    if (!validProcessors.includes(options.processor)) {
      throw new ValidationError(
        `Invalid processor: ${options.processor}. Must be one of: ${validProcessors.join(', ')}`
      )
    }
  }
}

export { executeSearch };

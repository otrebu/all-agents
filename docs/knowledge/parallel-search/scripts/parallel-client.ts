import Parallel from 'parallel-web'
import {
  AuthError,
  RateLimitError,
  NetworkError,
  ParallelSearchError,
  ValidationError,
} from './types.js'
import type { SearchOptions, SearchResult } from './types.js'

/**
 * Execute a search using the Parallel Search API
 * @param options Search configuration
 * @returns Array of search results with metadata
 */
export async function executeSearch(
  options: SearchOptions
): Promise<SearchResult[]> {
  validateSearchOptions(options)

  const apiKey = process.env.PARALLEL_API_KEY
  if (!apiKey) {
    throw new AuthError(
      'PARALLEL_API_KEY environment variable not set. Get your API key at https://platform.parallel.ai/'
    )
  }

  const client = new Parallel({ apiKey })

  try {
    const response = await client.beta.search({
      objective: options.objective,
      search_queries: options.searchQueries,
      processor: (options.processor || 'pro') as any,
      max_results: options.maxResults || 15,
      max_chars_per_result: options.maxCharsPerResult || 5000,
    })

    return transformResults(response)
  } catch (error: any) {
    if (error.status === 401 || error.status === 403) {
      throw new AuthError(
        'Invalid API key or unauthorized access. Check your PARALLEL_API_KEY.'
      )
    }

    if (error.status === 429) {
      const resetAt = error.headers?.['x-ratelimit-reset']
        ? new Date(error.headers['x-ratelimit-reset'] * 1000)
        : undefined
      const remaining = error.headers?.['x-ratelimit-remaining']
        ? parseInt(error.headers['x-ratelimit-remaining'])
        : undefined

      throw new RateLimitError(
        'Rate limit exceeded. Please wait before making more requests.',
        resetAt,
        remaining
      )
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new NetworkError(
        'Network connection failed. Please check your internet connection.',
        error
      )
    }

    throw new ParallelSearchError(
      `Search failed: ${error.message || 'Unknown error'}`,
      error
    )
  }
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

/**
 * Transform Parallel API response to our SearchResult format
 * @param response Raw API response
 * @returns Array of formatted search results
 */
function transformResults(response: any): SearchResult[] {
  if (!response || !response.results || !Array.isArray(response.results)) {
    return []
  }

  return response.results.map((rawResult: any, index: number) => ({
    url: rawResult.url || '',
    title: rawResult.title || 'Untitled',
    excerpts: rawResult.excerpts || [],
    domain: extractDomain(rawResult.url || ''),
    rank: index + 1,
  }))
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

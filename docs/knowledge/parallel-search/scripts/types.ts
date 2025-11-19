/**
 * Metadata about the search execution
 */
export interface SearchMetadata {
  executionTimeMs: number
  objective: string
  resultCount: number
}

/**
 * Search configuration options
 */
export interface SearchOptions {
  maxCharsPerResult?: number
  maxResults?: number
  objective?: string
  processor?: 'base' | 'lite' | 'pro' | 'ultra'
  searchQueries?: Array<string>
}

/**
 * Individual search result from Parallel API
 */
export interface SearchResult {
  domain: string
  excerpts: Array<string>
  rank: number
  title: string
  url: string
}

/**
 * Base error class for Parallel Search errors
 */
export class ParallelSearchError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'ParallelSearchError'
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParallelSearchError)
    }
  }
}

/**
 * Authentication error - invalid or missing API key
 */
export class AuthError extends ParallelSearchError {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Network error - connection issues
 */
export class NetworkError extends ParallelSearchError {
  constructor(message: string, cause?: Error) {
    super(message, cause)
    this.name = 'NetworkError'
  }
}

/**
 * Rate limit error - too many requests
 */
export class RateLimitError extends ParallelSearchError {
  constructor(
    message: string,
    public resetAt?: Date,
    public remaining?: number
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

/**
 * Validation error - invalid input parameters
 */
export class ValidationError extends ParallelSearchError {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Search configuration options
 */
export interface SearchOptions {
  objective?: string
  searchQueries?: string[]
  processor?: 'lite' | 'base' | 'pro' | 'ultra'
  maxResults?: number
  maxCharsPerResult?: number
}

/**
 * Individual search result from Parallel API
 */
export interface SearchResult {
  url: string
  title: string
  excerpts: string[]
  domain: string
  rank: number
}

/**
 * Metadata about the search execution
 */
export interface SearchMetadata {
  objective: string
  executionTimeMs: number
  resultCount: number
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
 * Network error - connection issues
 */
export class NetworkError extends ParallelSearchError {
  constructor(message: string, cause?: Error) {
    super(message, cause)
    this.name = 'NetworkError'
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

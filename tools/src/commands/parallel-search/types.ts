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
  processor?: 'base' | 'pro'
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
 * Authentication error - invalid or missing API key
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
    Error.captureStackTrace(this, AuthError)
  }
}

/**
 * Network error - connection issues
 */
export class NetworkError extends Error {
  constructor(message: string, public override cause?: Error) {
    super(message)
    this.name = 'NetworkError'
    Error.captureStackTrace(this, NetworkError)
  }
}

/**
 * Base error class for Parallel Search errors
 */
export class ParallelSearchError extends Error {
  constructor(message: string, public override cause?: Error) {
    super(message)
    this.name = 'ParallelSearchError'
    Error.captureStackTrace(this, ParallelSearchError)
  }
}

/**
 * Rate limit error - too many requests
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public resetAt?: Date,
    public remaining?: number
  ) {
    super(message)
    this.name = 'RateLimitError'
    Error.captureStackTrace(this, RateLimitError)
  }
}

/**
 * Validation error - invalid input parameters
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
    Error.captureStackTrace(this, ValidationError)
  }
}

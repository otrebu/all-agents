/**
 * Effect error types using TaggedError pattern
 *
 * These error types provide:
 * - Type-safe error handling with automatic union tracking
 * - Proper cause chaining for debugging
 * - Consistent error structure across the application
 *
 * @module
 */

/* eslint-disable unicorn/throw-new-error */

import { Data } from "effect";

// =============================================================================
// Config Errors
// =============================================================================

/**
 * Union of all config-related errors
 */
export type ConfigError =
  | ConfigLoadError
  | ConfigParseError
  | ConfigValidationError;

/**
 * Union of all filesystem-related errors
 */
export type FileSystemError =
  | FileNotFoundError
  | FileReadError
  | FileWriteError
  | PathResolutionError;

/**
 * Union of all network-related errors
 */
export type HttpError = NetworkError | RateLimitError | TimeoutError;

/**
 * Union of all search-related errors
 */
export type SearchError =
  | ExternalProcessError
  | ParallelSearchError
  | ValidationError;

// =============================================================================
// FileSystem Errors
// =============================================================================

/**
 * Authentication failed or credentials missing
 */
export class AuthError extends Data.TaggedError("AuthError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly service?: string;
}> {}

/**
 * Error loading configuration file
 * Includes the path that was attempted and the underlying cause
 */
export class ConfigLoadError extends Data.TaggedError("ConfigLoadError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly path: string;
}> {}

/**
 * Error when config file contains invalid JSON
 */
export class ConfigParseError extends Data.TaggedError("ConfigParseError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly path: string;
}> {}

/**
 * Error when config fails Zod schema validation
 */
export class ConfigValidationError extends Data.TaggedError(
  "ConfigValidationError",
)<{
  readonly fieldErrors: Record<string, Array<string>>;
  readonly message: string;
  readonly path: string;
}> {}

/**
 * Error from external process execution (e.g., gemini CLI, gh CLI)
 */
export class ExternalProcessError extends Data.TaggedError(
  "ExternalProcessError",
)<{
  readonly cause?: unknown;
  readonly command: string;
  readonly exitCode?: number;
  readonly message: string;
  readonly stderr?: string;
}> {}

// =============================================================================
// Network/HTTP Errors (for future use)
// =============================================================================

/**
 * Error when a file is not found
 */
export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
  readonly message: string;
  readonly path: string;
}> {}

/**
 * Error reading a file (permissions, I/O, etc.)
 */
export class FileReadError extends Data.TaggedError("FileReadError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly path: string;
}> {}

/**
 * Error writing a file (permissions, disk full, etc.)
 */
export class FileWriteError extends Data.TaggedError("FileWriteError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly path: string;
}> {}

/**
 * Generic network error for HTTP operations
 */
export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly url?: string;
}> {}

// =============================================================================
// Auth Errors (for future use)
// =============================================================================

/**
 * Error from Parallel Search API
 */
export class ParallelSearchError extends Data.TaggedError(
  "ParallelSearchError",
)<{
  readonly cause?: unknown;
  readonly message: string;
  readonly objective?: string;
}> {}

// =============================================================================
// External API/Process Errors
// =============================================================================

/**
 * Error resolving or validating a path
 */
export class PathResolutionError extends Data.TaggedError(
  "PathResolutionError",
)<{
  readonly cause?: unknown;
  readonly message: string;
  readonly path: string;
}> {}

/**
 * Rate limit exceeded (HTTP 429)
 */
export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly message: string;
  readonly retryAfterMs?: number;
  readonly url?: string;
}> {}

/**
 * HTTP request timeout
 */
export class TimeoutError extends Data.TaggedError("TimeoutError")<{
  readonly message: string;
  readonly timeoutMs: number;
  readonly url?: string;
}> {}

/**
 * Input validation error
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field?: string;
  readonly message: string;
}> {}

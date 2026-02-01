/**
 * Effect services for the aaa CLI
 *
 * This module exports:
 * - Error types for type-safe error handling
 * - Service interfaces and tags for dependency injection
 * - Live layers for production use
 * - Test helpers for mocking services
 * - Composed layers for common service combinations
 *
 * @example Basic usage with individual services
 * ```typescript
 * import { Config, ConfigLive, FileSystem, FileSystemLive } from "@tools/lib/effect";
 * import { Effect, Layer } from "effect";
 *
 * const program = Effect.gen(function* () {
 *   const config = yield* Config;
 *   const fs = yield* FileSystem;
 *
 *   const cfg = yield* config.loadWithDefaults();
 *   const content = yield* fs.readFile("./data.txt");
 *
 *   return { config: cfg, content };
 * });
 *
 * // Provide services
 * const runnable = program.pipe(
 *   Effect.provide(Layer.merge(ConfigLive, FileSystemLive))
 * );
 *
 * await Effect.runPromise(runnable);
 * ```
 *
 * @example Using composed layers
 * ```typescript
 * import { CoreServicesLive } from "@tools/lib/effect";
 *
 * const program = Effect.gen(function* () {
 *   // Use all core services...
 * });
 *
 * await Effect.runPromise(program.pipe(Effect.provide(CoreServicesLive)));
 * ```
 *
 * @module
 */

import { Layer } from "effect";

// =============================================================================
// Composed Layers
// =============================================================================
import type { Config } from "./config";
import type { FileSystem } from "./filesystem";
import type { Logger } from "./logger";

import { ConfigLive } from "./config";
import { FileSystemLive } from "./filesystem";
import { LoggerLive, LoggerSilent } from "./logger";

// =============================================================================
// Error Types
// =============================================================================

// Config service
export { Config, ConfigLive, makeConfigLayer } from "./config";

export type { ConfigService } from "./config";

// =============================================================================
// Services
// =============================================================================

export {
  // Auth errors
  AuthError,
  // Config errors
  ConfigLoadError,
  ConfigParseError,
  ConfigValidationError,
  // FileSystem errors
  FileNotFoundError,
  FileReadError,
  FileWriteError,
  // HTTP errors
  NetworkError,
  PathResolutionError,
  RateLimitError,
  TimeoutError,
} from "./errors";
// Export type aliases separately
export type { ConfigError, FileSystemError, HttpError } from "./errors";

// FileSystem service
export { FileSystem, FileSystemLive, makeTestFileSystem } from "./filesystem";
export type { FileSystemService } from "./filesystem";

// HttpClient service
export { HttpClient, HttpClientLive, makeTestHttpClient } from "./http-client";
export type {
  HttpClientService,
  HttpRequestOptions,
  HttpResponse,
  RetryOptions,
} from "./http-client";

// Logger service
export {
  Logger,
  LoggerDebug,
  LoggerLive,
  LoggerSilent,
  makeLoggerLayer,
} from "./logger";
export type { LoggerService } from "./logger";

/**
 * Core services layer combining Config, FileSystem, and Logger
 * Use this for programs that need standard file/config access with logging
 */
export const CoreServicesLive = Layer.mergeAll(
  ConfigLive,
  FileSystemLive,
  LoggerLive,
);

/**
 * Core services layer for testing (silent logger)
 * Suppresses console output during tests
 */
export const CoreServicesTest = Layer.mergeAll(
  ConfigLive,
  FileSystemLive,
  LoggerSilent,
);

/**
 * Type representing all core service requirements
 * Use this for typing Effect programs that need core services
 */
export type CoreServices = Config | FileSystem | Logger;

// =============================================================================
// Utility Functions (Effect-based)
// =============================================================================

// Numbered file utilities
export { createNumberedFile, getNextNumber } from "./numbered-files";
export type { CreateResult, NumberedFileOptions } from "./numbered-files";

// Path utilities
export {
  clearRootCache,
  findProjectRoot,
  getContextRoot,
  getContextRootPath,
  getOutputDirectory,
} from "./paths";

// Research utilities
export { saveResearchOutput } from "./research";
export type { ResearchPaths, SaveResearchOptions } from "./research";

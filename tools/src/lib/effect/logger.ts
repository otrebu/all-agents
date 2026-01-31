/**
 * LoggerService - Effect Layer wrapping chalk-based logging patterns
 *
 * Provides a consistent logging interface that can be:
 * - Mocked in tests via Layer.succeed
 * - Composed with other services via Layer.merge
 * - Extended with additional log levels as needed
 *
 * @module
 */

/* eslint-disable import/exports-last */

import chalk from "chalk";
import { Context, Effect, Layer } from "effect";

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Logger service interface
 * Wraps chalk-based console output for consistent logging across the CLI
 */
export interface LoggerService {
  /**
   * Log a debug message (gray, only shown when debug mode is enabled)
   */
  readonly debug: (message: string) => Effect.Effect<void>;

  /**
   * Log an error message (red)
   */
  readonly error: (message: string) => Effect.Effect<void>;

  /**
   * Log an info message (cyan)
   */
  readonly info: (message: string) => Effect.Effect<void>;

  /**
   * Log a plain message (no color)
   */
  readonly log: (message: string) => Effect.Effect<void>;

  /**
   * Log a success message (green)
   */
  readonly success: (message: string) => Effect.Effect<void>;

  /**
   * Log a warning message (yellow)
   */
  readonly warn: (message: string) => Effect.Effect<void>;
}

// =============================================================================
// Service Tag
// =============================================================================

/**
 * Effect Context tag for LoggerService
 * Use this to access the logger in Effect programs:
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const logger = yield* Logger;
 *   yield* logger.info("Starting process...");
 * });
 * ```
 */
export class Logger extends Context.Tag("Logger")<Logger, LoggerService>() {}

// =============================================================================
// Live Implementation
// =============================================================================

/**
 * Create logger implementation with optional debug mode
 */
function makeLogger(isDebugMode: boolean): LoggerService {
  return {
    debug: (message: string) =>
      Effect.sync(() => {
        if (isDebugMode) {
          console.log(chalk.gray(`[debug] ${message}`));
        }
      }),

    error: (message: string) =>
      Effect.sync(() => {
        console.error(chalk.red(message));
      }),

    info: (message: string) =>
      Effect.sync(() => {
        console.log(chalk.cyan(message));
      }),

    log: (message: string) =>
      Effect.sync(() => {
        console.log(message);
      }),

    success: (message: string) =>
      Effect.sync(() => {
        console.log(chalk.green(message));
      }),

    warn: (message: string) =>
      Effect.sync(() => {
        console.warn(chalk.yellow(message));
      }),
  };
}

/**
 * Live LoggerService Layer (debug mode disabled)
 * For production use where debug messages should be suppressed
 */
export const LoggerLive = Layer.succeed(Logger, makeLogger(false));

/**
 * Debug LoggerService Layer (debug mode enabled)
 * Shows all debug messages for troubleshooting
 */
export const LoggerDebug = Layer.succeed(Logger, makeLogger(true));

/**
 * Create a LoggerService Layer with configurable debug mode
 * Useful when debug mode is determined at runtime (e.g., from config)
 */
export function makeLoggerLayer(isDebugMode: boolean): Layer.Layer<Logger> {
  return Layer.succeed(Logger, makeLogger(isDebugMode));
}

// =============================================================================
// Silent Logger (for testing)
// =============================================================================

/**
 * Silent LoggerService that does nothing
 * Useful for tests where console output should be suppressed
 */
export const LoggerSilent = Layer.succeed(Logger, {
  debug: () => Effect.void,
  error: () => Effect.void,
  info: () => Effect.void,
  log: () => Effect.void,
  success: () => Effect.void,
  warn: () => Effect.void,
});

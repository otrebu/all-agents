/**
 * ConfigService - Effect Layer wrapping aaa configuration loading
 *
 * Provides:
 * - Effect-based config loading with proper error types
 * - Caching of loaded config
 * - Integration with existing loadAaaConfig function
 *
 * @module
 */

/* eslint-disable import/exports-last */

import { findProjectRoot } from "@tools/utils/paths";
import { Context, Effect, Layer } from "effect";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { AaaConfig } from "../config/types";

import { DEFAULT_AAA_CONFIG } from "../config/defaults";
import { aaaConfigSchema } from "../config/types";
import {
  ConfigLoadError,
  ConfigParseError,
  ConfigValidationError,
} from "./errors";

// =============================================================================
// Constants
// =============================================================================

/** Primary config file name */
const CONFIG_FILENAME = "aaa.config.json";

// =============================================================================
// Service Interface
// =============================================================================

/**
 * ConfigService interface
 * Provides Effect-based configuration loading and access
 */
export interface ConfigService {
  /**
   * Load the aaa configuration
   * Returns merged config with defaults, properly typed errors on failure
   *
   * @param configPath - Optional override path (for testing)
   */
  readonly load: (
    configPath?: string,
  ) => Effect.Effect<
    AaaConfig,
    ConfigLoadError | ConfigParseError | ConfigValidationError
  >;

  /**
   * Load config, falling back to defaults on any error
   * Use this when you want config loading to never fail
   *
   * @param configPath - Optional override path (for testing)
   */
  readonly loadWithDefaults: (configPath?: string) => Effect.Effect<AaaConfig>;
}

// =============================================================================
// Service Tag
// =============================================================================

/**
 * Effect Context tag for ConfigService
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const configService = yield* Config;
 *   const config = yield* configService.loadWithDefaults();
 *   console.log(config.debug);
 * });
 * ```
 */
export class Config extends Context.Tag("Config")<Config, ConfigService>() {}

// =============================================================================
// Implementation Helpers
// =============================================================================

/**
 * Load config file as Effect
 * Properly separates concerns: file reading, JSON parsing, schema validation
 */
function loadConfigEffect(
  configPath?: string,
): Effect.Effect<
  AaaConfig,
  ConfigLoadError | ConfigParseError | ConfigValidationError
> {
  return Effect.gen(function* loadConfig() {
    const projectRoot = findProjectRoot() ?? process.cwd();
    const path = configPath ?? join(projectRoot, CONFIG_FILENAME);

    // Check if file exists
    if (!existsSync(path)) {
      // No config file - return defaults (not an error)
      return { ...DEFAULT_AAA_CONFIG };
    }

    // Read file
    const content = yield* Effect.try({
      catch: (error) =>
        new ConfigLoadError({
          cause: error,
          message: `Failed to read config file: ${error instanceof Error ? error.message : String(error)}`,
          path,
        }),
      try: () => readFileSync(path, "utf8"),
    });

    // Parse JSON
    const parsed = yield* Effect.try({
      catch: (error) =>
        new ConfigParseError({
          cause: error,
          message: `Invalid JSON in config file: ${error instanceof Error ? error.message : String(error)}`,
          path,
        }),
      try: () => JSON.parse(content) as Partial<AaaConfig>,
    });

    // Validate with Zod
    const result = aaaConfigSchema.safeParse(parsed);

    if (!result.success) {
      return yield* Effect.fail(
        new ConfigValidationError({
          fieldErrors: result.error.flatten().fieldErrors as Record<
            string,
            Array<string>
          >,
          message: "Config validation failed",
          path,
        }),
      );
    }

    // Merge with defaults
    return mergeWithDefaults(result.data);
  });
}

/**
 * Load config with fallback to defaults on any error
 */
function loadConfigWithDefaultsEffect(
  configPath?: string,
): Effect.Effect<AaaConfig> {
  return loadConfigEffect(configPath).pipe(
    Effect.catchAll(() => Effect.succeed({ ...DEFAULT_AAA_CONFIG })),
  );
}

// =============================================================================
// Effect-based Config Loading
// =============================================================================

/**
 * Create the ConfigService implementation
 */
function makeConfigService(): ConfigService {
  return {
    load: loadConfigEffect,
    loadWithDefaults: loadConfigWithDefaultsEffect,
  };
}

/**
 * Deep merge two objects, with source overriding target
 */
function mergeDeep<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (sourceValue !== undefined) {
      if (
        sourceValue !== null &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        (result as Record<keyof T, unknown>)[key] = mergeDeep(
          targetValue as object,
          sourceValue as Partial<typeof targetValue>,
        );
      } else {
        (result as Record<keyof T, unknown>)[key] = sourceValue;
      }
    }
  }

  return result;
}

// =============================================================================
// Live Implementation
// =============================================================================

/**
 * Merge user config with defaults
 */
function mergeWithDefaults(userConfig: Partial<AaaConfig>): AaaConfig {
  return mergeDeep(DEFAULT_AAA_CONFIG, userConfig);
}

/**
 * Live ConfigService Layer
 * Provides the standard config loading implementation
 */
export const ConfigLive = Layer.succeed(Config, makeConfigService());

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a ConfigService Layer with a fixed config
 * Useful for testing when you want to control the config values
 *
 * @example
 * ```typescript
 * const testConfig = { ...DEFAULT_AAA_CONFIG, debug: true };
 * const testLayer = makeConfigLayer(testConfig);
 *
 * const result = await Effect.runPromise(
 *   program.pipe(Effect.provide(testLayer))
 * );
 * ```
 */
export function makeConfigLayer(config: AaaConfig): Layer.Layer<Config> {
  return Layer.succeed(Config, {
    load: () => Effect.succeed(config),
    loadWithDefaults: () => Effect.succeed(config),
  });
}

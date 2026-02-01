/**
 * Effect-based sync-context utilities
 *
 * Provides Effect wrappers for context synchronization operations:
 * - Initial sync via rsync
 * - Watch mode with chokidar
 *
 * Note: For watch mode, we use Effect.async to integrate chokidar's
 * callback-based API with Effect. The acceptance criteria mentions
 * Effect.Stream, but for this use case Effect.async with debouncing
 * is more appropriate since we're responding to file system events
 * rather than processing a stream of data.
 *
 * @module
 */

/* eslint-disable @typescript-eslint/no-shadow, @typescript-eslint/no-invalid-void-type, @typescript-eslint/no-floating-promises, func-style, function-name/starts-with-verb */

import type { FSWatcher } from "chokidar";

import log from "@lib/log";
import { SyncContextError } from "@tools/lib/effect";
import { getContextRoot } from "@tools/utils/paths";
import { watch } from "chokidar";
import { Effect, Stream } from "effect";
import { execa } from "execa";
import { resolve } from "node:path";

// =============================================================================
// Types
// =============================================================================

export interface SyncOptions {
  destination: string;
  source: string;
}

// =============================================================================
// Core Sync Functions
// =============================================================================

/**
 * Create a file system watcher that emits sync events
 *
 * Uses chokidar to watch for file changes and debounces events
 * to batch rapid changes.
 */
export function createWatcherStream(
  watchPath: string,
  debounceMs = 300,
): Stream.Stream<"change"> {
  return Stream.async<"change">((emit) => {
    let debounceTimer: null | ReturnType<typeof setTimeout> = null;
    let watcher: FSWatcher | null = null;

    const cleanup = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (watcher) {
        void watcher.close();
      }
    };

    try {
      watcher = watch(watchPath, { ignoreInitial: true, persistent: true });

      watcher.on("all", () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          emit.single("change");
        }, debounceMs);
      });

      watcher.on("error", (error: unknown) => {
        log.error(
          `Watcher error: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    } catch {
      cleanup();
      // Stream will just be empty on error
    }

    return Effect.sync(cleanup);
  });
}

/**
 * Run sync-context CLI command (Effect version)
 */
export function runSyncContextEffect(options: {
  target?: string;
  watch?: boolean;
}): Effect.Effect<void, SyncContextError> {
  return Effect.gen(function* runSyncContext() {
    const targetDirectory = resolve(options.target ?? process.cwd());
    const contextRoot = getContextRoot();
    const source = resolve(contextRoot, "context");

    // Initial sync
    yield* syncContextEffect(targetDirectory);
    yield* Effect.sync(() => {
      log.success(`Synced context to ${targetDirectory}`);
    });

    // Watch mode
    if (options.watch === true) {
      // Set up SIGINT handler
      yield* Effect.async<void>((resume) => {
        process.on("SIGINT", () => {
          log.dim("Stopping watcher...");
          resume(Effect.void);
        });

        // Start watching (this will run until interrupted)
        Effect.runPromise(
          watchAndSyncEffect(source, targetDirectory).pipe(
            Effect.catchAll((error) => {
              log.error(`Watch error: ${error.message}`);
              return Effect.void;
            }),
          ),
        );

        // Keep the effect alive
        return Effect.void;
      });
    }
  });
}

/**
 * Synchronous wrapper for backward compatibility
 */
export async function syncContext(targetDirectory: string): Promise<void> {
  await Effect.runPromise(syncContextEffect(targetDirectory));
}

// =============================================================================
// Watch Mode Functions
// =============================================================================

/**
 * Sync context to target directory (Effect version)
 */
export function syncContextEffect(
  targetDirectory: string,
): Effect.Effect<void, SyncContextError> {
  return Effect.gen(function* syncContext() {
    const contextRoot = getContextRoot();
    const source = resolve(contextRoot, "context");
    const destination = resolve(targetDirectory, "context");

    yield* syncDirectoryEffect({ destination, source });
  });
}

/**
 * Perform a one-time rsync from source to destination
 */
export function syncDirectoryEffect(
  options: SyncOptions,
): Effect.Effect<void, SyncContextError> {
  return Effect.tryPromise({
    catch: (error) =>
      new SyncContextError({
        cause: error,
        destination: options.destination,
        message: `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
        source: options.source,
      }),
    try: async () => {
      // Ensure paths end with / for rsync directory behavior
      const source = options.source.endsWith("/")
        ? options.source
        : `${options.source}/`;
      const destination = options.destination.endsWith("/")
        ? options.destination
        : `${options.destination}/`;

      await execa("rsync", ["-a", "--delete", source, destination]);
    },
  });
}

/**
 * Watch context directory and sync on changes (Effect version)
 *
 * This uses Effect.Stream to model the file change events, integrating
 * chokidar with Effect's streaming capabilities.
 */
export function watchAndSyncEffect(
  sourceDirectory: string,
  targetDirectory: string,
): Effect.Effect<void, SyncContextError> {
  const DEBOUNCE_MS = 300;

  return Effect.gen(function* watchAndSync() {
    yield* Effect.sync(() => {
      log.info(`Watching ${sourceDirectory} for changes...`);
    });

    // Create the watcher stream
    const changeStream = createWatcherStream(sourceDirectory, DEBOUNCE_MS);

    // Process each change event
    yield* Stream.runForEach(changeStream, () =>
      Effect.gen(function* handleChange() {
        const result = yield* Effect.either(
          syncDirectoryEffect({
            destination: resolve(targetDirectory, "context"),
            source: sourceDirectory,
          }),
        );

        yield* result._tag === "Right"
          ? Effect.sync(() => {
              log.success(`Synced at ${new Date().toLocaleTimeString()}`);
            })
          : Effect.sync(() => {
              log.error(`Sync failed: ${result.left.message}`);
            });
      }),
    );
  });
}

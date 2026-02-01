import log from "@lib/log";
import { SyncContextError } from "@tools/lib/effect";
import { getContextRoot } from "@tools/utils/paths";
import { watch } from "chokidar";
import { Effect } from "effect";
import { resolve } from "node:path";

import { syncContextEffect } from "./effect-sync";

interface SyncContextOptions {
  target?: string;
  watch?: boolean;
}

/**
 * Run sync-context CLI command
 * Uses Effect internally for file operations
 */
async function runSyncContextCli(options: SyncContextOptions): Promise<void> {
  const targetDirectory = resolve(options.target ?? process.cwd());

  try {
    // Initial sync using Effect
    await Effect.runPromise(syncContextEffect(targetDirectory));
    log.success(`Synced context to ${targetDirectory}`);

    // Watch mode
    if (options.watch === true) {
      const contextRoot = getContextRoot();
      const source = resolve(contextRoot, "context");

      log.info(`Watching ${source} for changes...`);

      // Debounce to batch rapid changes
      let debounceTimer: null | ReturnType<typeof setTimeout> = null;
      const DEBOUNCE_MS = 300;

      const watcher = watch(source, { ignoreInitial: true, persistent: true });

      watcher.on("all", () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          void (async () => {
            try {
              await Effect.runPromise(syncContextEffect(targetDirectory));
              log.success(`Synced at ${new Date().toLocaleTimeString()}`);
            } catch (error) {
              if (error instanceof SyncContextError) {
                log.error(`Sync failed: ${error.message}`);
              } else {
                log.error(
                  `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                );
              }
            }
          })();
        }, DEBOUNCE_MS);
      });

      // Keep process alive
      void process.on("SIGINT", () => {
        log.dim("Stopping watcher...");
        void watcher.close();
        process.exit(0);
      });
    }
  } catch (error) {
    if (error instanceof SyncContextError) {
      log.error(error.message);
    } else if (error instanceof Error) {
      log.error(`Sync failed: ${error.message}`);
    }
    process.exit(1);
  }
}

export default runSyncContextCli;

export { syncContext, syncContextEffect } from "./effect-sync";

import log from "@lib/log";
import { getContextRoot } from "@tools/utils/paths";
import { watch } from "chokidar";
import { execa } from "execa";
import { resolve } from "node:path";

import SyncContextError from "./types";

interface SyncContextOptions {
  target?: string;
  watch?: boolean;
}

async function runSyncContextCli(options: SyncContextOptions): Promise<void> {
  const targetDirectory = resolve(options.target ?? process.cwd());

  try {
    // Initial sync
    await syncContext(targetDirectory);
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
              await syncContext(targetDirectory);
              log.success(`Synced at ${new Date().toLocaleTimeString()}`);
            } catch (error) {
              log.error(
                `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              );
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

async function syncContext(targetDirectory: string): Promise<void> {
  const contextRoot = getContextRoot();
  const source = `${resolve(contextRoot, "context")}/`;
  const destination = `${resolve(targetDirectory, "context")}/`;

  await execa("rsync", ["-a", "--delete", source, destination]);
}

export default runSyncContextCli;

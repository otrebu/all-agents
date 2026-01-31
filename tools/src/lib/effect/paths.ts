/**
 * Effect-based path utilities
 *
 * Effect versions of the path resolution functions from @tools/utils/paths.
 * These wrap filesystem checks in Effect for proper error handling.
 *
 * @module
 */

/* eslint-disable import/exports-last */

import { Effect } from "effect";
import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

import { PathResolutionError } from "./errors";

// =============================================================================
// Types
// =============================================================================

type RootResolutionStrategy =
  | "binary-path"
  | "cwd-walk-up"
  | "exec-path"
  | "symlink";

interface StrategyResult {
  path: string;
  strategy: RootResolutionStrategy;
}

// =============================================================================
// Constants
// =============================================================================

/** Installed symlink location */
const AAA_SYMLINK = resolve(homedir(), ".local/bin/aaa");

// =============================================================================
// Module-level cache
// =============================================================================

/**
 * Module-level cache for root directory resolution.
 * Eliminates repeated filesystem checks after first successful lookup.
 */
let cachedRoot: null | string = null;

// =============================================================================
// Resolution Strategies (private functions)
// =============================================================================

/**
 * Clear the cached root (useful for testing)
 */
export function clearRootCache(): Effect.Effect<void> {
  return Effect.sync(() => {
    cachedRoot = null;
  });
}

/**
 * Find git repository root by walking up from current working directory
 *
 * Effect version of findProjectRoot that returns Effect.Effect<string | null>
 * This is a safe operation that never fails.
 */
export function findProjectRoot(): Effect.Effect<null | string> {
  return Effect.sync(() => {
    let directory = process.cwd();
    for (let index = 0; index < 10; index += 1) {
      if (existsSync(resolve(directory, ".git"))) {
        return directory;
      }
      const parent = dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
    return null;
  });
}

/**
 * Resolves the all-agents repository root directory
 *
 * Effect version that returns the strategy used along with the path.
 * Tries four strategies in order until one succeeds.
 *
 * @returns Effect with path and strategy used, or PathResolutionError
 */
export function getContextRoot(): Effect.Effect<
  StrategyResult,
  PathResolutionError
> {
  return Effect.gen(function* getContextRootGenerator() {
    // Return cached result if available
    if (cachedRoot !== null) {
      return {
        path: cachedRoot,
        strategy: "symlink" as RootResolutionStrategy,
      };
    }

    const strategies: Array<{
      name: RootResolutionStrategy;
      resolve: () => null | string;
    }> = [
      { name: "symlink", resolve: tryResolveFromSymlink },
      { name: "binary-path", resolve: tryResolveFromBinary },
      { name: "cwd-walk-up", resolve: tryResolveFromCwd },
      { name: "exec-path", resolve: tryResolveFromExec },
    ];

    for (const strategy of strategies) {
      const result = strategy.resolve();
      if (result !== null) {
        cachedRoot = result;
        return { path: result, strategy: strategy.name };
      }
    }

    return yield* Effect.fail(
      new PathResolutionError({
        message:
          "Cannot find context root. Run from project directory with context/ folder.",
        path: process.cwd(),
      }),
    );
  });
}

/**
 * Resolves the all-agents repository root directory (path only)
 *
 * Convenience wrapper that returns just the path string.
 */
export function getContextRootPath(): Effect.Effect<
  string,
  PathResolutionError
> {
  return Effect.map(getContextRoot(), (result) => result.path);
}

// =============================================================================
// Effect-based functions (exports)
// =============================================================================

/**
 * Builds output directory paths under docs/
 *
 * All outputs go to {contextRoot}/docs/{subpath}
 *
 * @param subpath - Path relative to docs/ directory
 * @returns Effect with resolved absolute path
 */
export function getOutputDirectory(
  subpath: string,
): Effect.Effect<string, PathResolutionError> {
  return Effect.map(getContextRootPath(), (root) =>
    resolve(root, "docs", subpath),
  );
}

/**
 * Resolves root from binary path (process.argv[1])
 *
 * NOTE: This strategy fails for compiled Bun binaries due to hardcoded
 * argv[1] values (Bun issue #18337). Kept for dev mode compatibility.
 */
function tryResolveFromBinary(): null | string {
  const binaryPath = process.argv[1];
  if (
    binaryPath === undefined ||
    binaryPath === "" ||
    binaryPath.startsWith("/$bunfs")
  ) {
    return null;
  }

  const realPath = existsSync(binaryPath)
    ? realpathSync(binaryPath)
    : binaryPath;
  const binaryDirectory = dirname(realPath);
  const candidate = resolve(binaryDirectory, "..");

  if (existsSync(resolve(candidate, "context"))) {
    return candidate;
  }
  return null;
}

/**
 * Walks up directory tree from current working directory
 *
 * Requires BOTH context/ and tools/ directories to distinguish the actual
 * all-agents repo from projects with synced context/ folders.
 */
function tryResolveFromCwd(): null | string {
  let searchDirectory = process.cwd();
  for (let index = 0; index < 10; index += 1) {
    const hasContext = existsSync(resolve(searchDirectory, "context"));
    const hasTools = existsSync(resolve(searchDirectory, "tools"));

    if (hasContext && hasTools) {
      return searchDirectory;
    }

    const parent = dirname(searchDirectory);
    if (parent === searchDirectory) break;
    searchDirectory = parent;
  }
  return null;
}

/**
 * Resolves from runtime executable path (last resort)
 */
function tryResolveFromExec(): null | string {
  const { execPath } = process;
  if (execPath.length === 0 || execPath.startsWith("/$bunfs")) {
    return null;
  }

  const execDirectory = dirname(execPath);
  const candidate = resolve(execDirectory, "..");

  if (existsSync(resolve(candidate, "context"))) {
    return candidate;
  }
  return null;
}

/**
 * Resolves root from installed symlink (~/.local/bin/aaa)
 *
 * This is the most reliable strategy for installed binaries because Bun's
 * compiled binaries have hardcoded argv[1] values (GitHub issue #18337).
 */
function tryResolveFromSymlink(): null | string {
  if (!existsSync(AAA_SYMLINK)) return null;

  try {
    const realBinary = realpathSync(AAA_SYMLINK);
    const binaryDirectory = dirname(realBinary);
    const candidate = resolve(binaryDirectory, "..");

    // Validate it's the actual all-agents repo (not a synced copy)
    if (
      existsSync(resolve(candidate, "context")) &&
      existsSync(resolve(candidate, "tools"))
    ) {
      return candidate;
    }
  } catch {
    // Symlink exists but can't be resolved
  }
  return null;
}

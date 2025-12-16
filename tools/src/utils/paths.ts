import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

type RootResolutionStrategy =
  | "binary-path"
  | "cwd-walk-up"
  | "exec-path"
  | "symlink";

// Module-level cache for root directory resolution
// Eliminates repeated filesystem checks after first successful lookup
let cachedRoot: null | string = null;

// Installed symlink location
const AAA_SYMLINK = resolve(homedir(), ".local/bin/aaa");

/**
 * Resolves the all-agents repository root directory
 *
 * Tries four strategies in order until one succeeds:
 * 1. symlink: Resolves from ~/.local/bin/aaa symlink (most reliable for production)
 * 2. binary-path: Resolves from process.argv[1] (dev mode, but broken in compiled binaries due to Bun bug #18337)
 * 3. cwd-walk-up: Walks up from current working directory
 * 4. exec-path: Resolves from process.execPath (last resort)
 *
 * Result is cached per-process for performance
 *
 * @throws {Error} If no strategy can locate context/ directory
 */
function getContextRoot(): string {
  if (cachedRoot !== null) return cachedRoot;

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
      return cachedRoot;
    }
  }

  throw new Error(
    "Cannot find context root. Run from project directory with context/ folder.",
  );
}

/**
 * Builds output directory paths under docs/
 *
 * All outputs go to {contextRoot}/docs/{subpath}
 * Example: getOutputDirectory("research/github") → /path/to/all-agents/docs/research/github
 */
function getOutputDirectory(subpath: string): string {
  return resolve(getContextRoot(), "docs", subpath);
}

/**
 * Resolves root from binary path (process.argv[1])
 *
 * Follows symlinks to find the real binary location, then checks if
 * parent directory contains context/
 *
 * Skips Bun virtual filesystem paths (/$bunfs) which aren't resolvable
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

  // Resolve symlinks to find actual binary location
  // This handles cases where binary is symlinked to ~/.local/bin/aaa
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
 * Searches up to 10 levels for all-agents repository root.
 * Requires BOTH context/ and tools/ directories to distinguish the actual
 * all-agents repo from projects with synced context/ folders.
 *
 * Stops at filesystem root to prevent infinite loops.
 */
function tryResolveFromCwd(): null | string {
  let searchDirectory = process.cwd();
  for (let index = 0; index < 10; index += 1) {
    const hasContext = existsSync(resolve(searchDirectory, "context"));
    const hasTools = existsSync(resolve(searchDirectory, "tools"));

    // Only return if BOTH exist (real repo, not synced copy)
    if (hasContext && hasTools) {
      return searchDirectory;
    }

    const parent = dirname(searchDirectory);
    // Reached filesystem root
    if (parent === searchDirectory) break;
    searchDirectory = parent;
  }
  return null;
}

/**
 * Resolves from runtime executable path
 *
 * Last resort fallback using process.execPath (Node/Bun executable)
 * Useful for compiled binaries in unusual execution contexts
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
 * Resolves root from installed symlink
 *
 * Checks if ~/.local/bin/aaa symlink exists and follows it to find repo.
 * This is the most reliable strategy for installed binaries because Bun's
 * compiled binaries have hardcoded argv[1] values (GitHub issue #18337).
 *
 * Validates both context/ and tools/ directories to ensure we found the
 * actual all-agents repo, not a synced copy.
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

export { getContextRoot, getOutputDirectory as getOutputDir };

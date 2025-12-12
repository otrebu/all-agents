import { existsSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Context Root Resolution Strategy
 *
 * The CLI uses different strategies to find the root directory containing the `context/` folder.
 * This is necessary because the CLI can be invoked from:
 * - Any subdirectory within the project (dev mode from tools/src/)
 * - The project root (compiled binary: ./bin/aaa)
 * - Outside the project entirely (symlinked binary: ~/.local/bin/aaa)
 * - Other projects after `aaa setup --project` (context/ is symlinked)
 *
 * All strategies look for the `context/` directory as the marker for the root.
 * Even when run from other projects, this resolves to all-agents root (where outputs are saved).
 */
type RootResolutionStrategy = "binary-path" | "cwd-walk-up" | "exec-path";

let cachedRoot: null | string = null;

/**
 * Finds the root directory containing the `context/` folder
 *
 * This is the all-agents repository root, even when invoked from other projects.
 * After `aaa setup --project`, other projects have a symlinked context/ pointing
 * back to all-agents, so this always resolves to all-agents root.
 *
 * Why this exists:
 * - CLI can be invoked from anywhere (subdirs, outside project, compiled binary)
 * - Outputs (tasks, stories, research) must go to consistent locations
 * - All outputs saved to all-agents/docs/, making it the centralized doc repo
 *
 * Relationship to getAllAgentsRoot():
 * - getAllAgentsRoot() (setup/utils.ts): Used during installation, validates context/ + tools/
 * - getContextRoot() (this): Used at runtime, only checks for context/
 *
 * Caching:
 * - Result cached after first lookup (per-process)
 * - Subsequent calls return instantly without filesystem checks
 *
 * Strategies (tried in order):
 * 1. cwd-walk-up: Walk up from CWD (most common - works from subdirs)
 * 2. binary-path: Resolve from argv[1] binary path (compiled binary via symlink)
 * 3. exec-path: Resolve from execPath (last resort fallback)
 *
 * Examples:
 * - Dev mode from tools/src/: Strategy 1 walks up to find context/
 * - Compiled from /tmp: Strategy 2 follows symlink to bin/aaa
 * - After setup in other-project/: Strategy 2 resolves to all-agents root
 *
 * @throws {Error} If context/ directory cannot be found by any strategy
 */
function getContextRoot(): string {
  if (cachedRoot !== null) return cachedRoot;

  const strategies: Array<{
    name: RootResolutionStrategy;
    resolve: () => null | string;
  }> = [
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
 * Strategy 2: Resolve relative to binary path
 *
 * Uses process.argv[1] (the script/binary being executed) and resolves symlinks.
 * Assumes binary lives in bin/ subdirectory, so parent directory is the root.
 *
 * Use cases:
 * - Compiled binary run from elsewhere: `cd /tmp && ~/all-agents/bin/aaa`
 * - Symlinked binary in PATH: `aaa task create` (after setup --user)
 * - Binary path: ~/.local/bin/aaa → resolves symlink → /path/to/all-agents/bin/aaa
 *
 * Skips Bun virtual filesystem paths (/$bunfs) which aren't real file paths.
 *
 * Example:
 * - argv[1]: ~/.local/bin/aaa (symlink)
 * - Resolves to: /Users/you/all-agents/bin/aaa
 * - Parent: /Users/you/all-agents/bin → ../ → /Users/you/all-agents/
 * - Checks: context/ ✓
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
 * Strategy 1: Walk up from current working directory
 *
 * Searches up the directory tree (max 10 levels) looking for `context/` folder.
 *
 * Use cases:
 * - Dev mode: `bun run dev task create` from tools/src/
 * - Running from any project subdirectory
 * - Tests run from project root or tools/
 *
 * Example:
 * - CWD: /Users/you/all-agents/tools/src/
 * - Walks up to: /Users/you/all-agents/
 * - Finds: context/ ✓
 */
function tryResolveFromCwd(): null | string {
  let searchDirectory = process.cwd();
  for (let index = 0; index < 10; index += 1) {
    if (existsSync(resolve(searchDirectory, "context"))) {
      return searchDirectory;
    }
    const parent = dirname(searchDirectory);
    if (parent === searchDirectory) break;
    searchDirectory = parent;
  }
  return null;
}

/**
 * Strategy 3: Resolve relative to executable path
 *
 * Uses process.execPath (the Node/Bun runtime executable itself).
 * Last resort fallback for compiled binaries run in unusual contexts.
 *
 * Use cases:
 * - Edge cases where argv[1] doesn't point to the binary
 * - Compiled binary with non-standard execution setup
 *
 * Skips Bun virtual filesystem paths (/$bunfs).
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
 * Builds output paths under {contextRoot}/docs/{subpath}
 *
 * Always resolves to all-agents/docs/, even when CLI is run from other projects.
 * This makes all-agents the centralized document repository.
 *
 * Examples:
 * - getOutputDir("research/google") → /path/to/all-agents/docs/research/google
 * - getOutputDir("planning/tasks") → /path/to/all-agents/docs/planning/tasks
 */
function getOutputDirectory(subpath: string): string {
  return resolve(getContextRoot(), "docs", subpath);
}

export { getContextRoot, getOutputDirectory as getOutputDir };

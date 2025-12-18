import { env } from "@tools/env";
import { existsSync, lstatSync, readlinkSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

const LOCAL_BIN = resolve(homedir(), ".local/bin");
const AAA_SYMLINK = resolve(LOCAL_BIN, "aaa");

/**
 * All-Agents Root Resolution Strategy
 *
 * Used during setup/uninstall to locate the all-agents repository.
 * Unlike getContextRoot() (runtime), this validates the complete repo structure.
 */
type AllAgentsRootStrategy = "binary-path" | "symlink-resolution";

let cachedAllAgentsRoot: null | string = null;

/**
 * Finds the all-agents repository root directory
 *
 * This function is used exclusively during setup/uninstall operations to locate
 * the all-agents repository itself (not the project where CLI is being used).
 *
 * Why this exists:
 * - Setup needs to find all-agents repo to build binary and create symlinks
 * - Must work before installation completes (no symlink exists yet)
 * - Validates complete repo structure (both context/ and tools/ must exist)
 *
 * Relationship to getContextRoot():
 * - getAllAgentsRoot() (this): Setup-time, validates context/ + tools/, finds all-agents repo
 * - getContextRoot() (utils/paths.ts): Runtime, validates context/ only, finds output location
 *
 * Markers validated:
 * - context/ directory must exist (shared project knowledge)
 * - tools/ directory must exist (CLI source code)
 *
 * Caching:
 * - Result cached after first lookup (per-process)
 * - Subsequent calls return instantly
 *
 * Strategies (tried in order):
 * 1. symlink-resolution: Follow ~/.local/bin/aaa symlink (post-installation)
 * 2. binary-path: Resolve from argv[1] (dev mode, pre-installation)
 *
 * Examples:
 * - Dev mode first setup: `bun run dev setup --user` → Strategy 2 finds all-agents via argv[1]
 * - After installation: `aaa setup --project` → Strategy 1 follows symlink
 * - Uninstall: `aaa uninstall --user` → Strategy 1 finds installation source
 *
 * @throws {Error} If all-agents root cannot be found by any strategy
 */
function getAllAgentsRoot(): string {
  if (cachedAllAgentsRoot !== null) return cachedAllAgentsRoot;

  const strategies: Array<{
    name: AllAgentsRootStrategy;
    resolve: () => null | string;
  }> = [
    { name: "symlink-resolution", resolve: tryResolveFromSymlink },
    { name: "binary-path", resolve: tryResolveFromBinaryPath },
  ];

  for (const strategy of strategies) {
    const result = strategy.resolve();
    if (result !== null) {
      cachedAllAgentsRoot = result;
      return cachedAllAgentsRoot;
    }
  }

  throw new Error(
    "Cannot find all-agents root. Run from all-agents directory or ensure aaa is properly installed.",
  );
}

/**
 * Checks CLAUDE_CONFIG_DIR environment variable status
 *
 * Compares current value against expected value (all-agents/.claude).
 * Used by setup to guide user in configuring their shell.
 */
function getClaudeConfigStatus(): {
  current?: string;
  expected: string;
  status: "correct" | "different" | "unset";
} {
  const root = getAllAgentsRoot();
  const expected = resolve(root, ".claude");
  const current = env.CLAUDE_CONFIG_DIR;

  if (current === undefined || current === "")
    return { expected, status: "unset" };
  if (resolve(current) === expected)
    return { current, expected, status: "correct" };
  return { current, expected, status: "different" };
}

/**
 * Formats environment variable export line for shell config
 */
function getExportLine(variableName: string, value: string): string {
  return `export ${variableName}="${value}"`;
}

/**
 * Determines shell config file path based on SHELL environment variable
 */
function getShellConfigPath(): string {
  const shell = env.SHELL;
  if (shell.includes("zsh")) return "~/.zshrc";
  if (shell.includes("bash")) return "~/.bashrc";
  return "~/.profile";
}

/**
 * Reads symlink target without following the link
 *
 * Uses lstatSync (not stat) to check if path is a symlink.
 * Returns the raw symlink target, not the resolved path.
 *
 * @returns Symlink target path, or null if not a symlink or doesn't exist
 */
function getSymlinkTarget(path: string): null | string {
  try {
    if (!existsSync(path)) return null;
    const stat = lstatSync(path);
    if (!stat.isSymbolicLink()) return null;
    return readlinkSync(path);
  } catch {
    return null;
  }
}

/**
 * Checks if CLI is installed (symlink exists at ~/.local/bin/aaa)
 */
function isCliInstalled(): boolean {
  if (!existsSync(AAA_SYMLINK)) return false;
  try {
    const stat = lstatSync(AAA_SYMLINK);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Checks if a directory is in the PATH environment variable
 */
function isInPath(directory: string): boolean {
  const pathDirectories = env.PATH.split(":");
  return pathDirectories.some(
    (p) => p === directory || p === directory.replace(homedir(), "~"),
  );
}

/**
 * Strategy 2: Binary path resolution
 *
 * Uses process.argv[1] to find the script being executed.
 * Works in dev mode when running `bun run dev setup --user`.
 *
 * Use cases:
 * - Dev mode: `bun run dev setup --user` from tools/
 * - First-time setup before symlink exists
 *
 * Skips Bun virtual filesystem paths (/$bunfs).
 *
 * Example:
 * - argv[1]: /Users/you/all-agents/tools/src/cli.ts
 * - dirname: /Users/you/all-agents/tools/src
 * - Parent: /Users/you/all-agents/tools → ../.. wait, this won't work!
 *
 * Actually it resolves to tools/ then goes up one level to get all-agents/
 */
function tryResolveFromBinaryPath(): null | string {
  const binaryPath = process.argv[1];
  if (
    binaryPath === undefined ||
    binaryPath === "" ||
    binaryPath.startsWith("/$bunfs")
  ) {
    return null;
  }

  try {
    const realPath = existsSync(binaryPath)
      ? realpathSync(binaryPath)
      : binaryPath;

    // Walk up directory tree to find all-agents root
    let candidate = dirname(realPath);
    const maxDepth = 5;
    for (let depth = 0; depth < maxDepth; depth += 1) {
      if (
        existsSync(resolve(candidate, "context")) &&
        existsSync(resolve(candidate, "tools"))
      ) {
        return candidate;
      }
      const parent = resolve(candidate, "..");
      // Reached filesystem root
      if (parent === candidate) break;
      candidate = parent;
    }
  } catch {
    // Path exists but can't be resolved
  }

  return null;
}

/**
 * Strategy 1: Symlink resolution
 *
 * Follows the ~/.local/bin/aaa symlink to find the real binary location.
 * Assumes binary is in bin/ subdirectory of all-agents repo.
 *
 * Use cases:
 * - After `aaa setup --user` completes
 * - Running setup from installed CLI
 *
 * Example:
 * - Symlink: ~/.local/bin/aaa → /Users/you/all-agents/bin/aaa
 * - dirname: /Users/you/all-agents/bin
 * - Parent: /Users/you/all-agents
 * - Validates: context/ + tools/ both exist ✓
 */
function tryResolveFromSymlink(): null | string {
  if (!existsSync(AAA_SYMLINK)) {
    return null;
  }

  try {
    const realBinary = realpathSync(AAA_SYMLINK);
    const candidate = resolve(dirname(realBinary), "..");

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

export {
  AAA_SYMLINK,
  getAllAgentsRoot,
  getClaudeConfigStatus,
  getExportLine,
  getShellConfigPath,
  getSymlinkTarget,
  isCliInstalled,
  isInPath,
  LOCAL_BIN,
};

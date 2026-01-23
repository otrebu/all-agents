import { env } from "@tools/env";
import {
  appendFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
} from "node:fs";
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

type ShellType = "bash" | "fish" | "zsh";

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
 * Returns the completion line for a given shell type
 */
function getCompletionLine(shell: ShellType): string {
  switch (shell) {
    case "bash": {
      return "source <(aaa completion bash)";
    }
    case "fish": {
      return "aaa completion fish | source";
    }
    case "zsh": {
      return "source <(aaa completion zsh)";
    }
    default: {
      // Type exhaustiveness check
      const _exhaustive: never = shell;
      return _exhaustive;
    }
  }
}

/**
 * Formats environment variable export line for shell config
 */
function getExportLine(variableName: string, value: string): string {
  return `export ${variableName}="${value}"`;
}

/**
 * Returns the actual file path for the shell config (expanded from ~)
 */
function getShellConfigFilePath(): string {
  const shell = getShellType();
  switch (shell) {
    case "bash": {
      return resolve(homedir(), ".bashrc");
    }
    case "fish": {
      return resolve(homedir(), ".config/fish/config.fish");
    }
    case "zsh": {
      return resolve(homedir(), ".zshrc");
    }
    default: {
      // Type exhaustiveness check
      const _exhaustive: never = shell;
      return _exhaustive;
    }
  }
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
 * Detects shell type from SHELL environment variable
 */
function getShellType(): ShellType {
  const shell = env.SHELL;
  if (shell.includes("zsh")) return "zsh";
  if (shell.includes("fish")) return "fish";
  return "bash";
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
 * Appends shell completion line to shell config
 */
function installCompletion(): void {
  const shell = getShellType();
  const configPath = getShellConfigFilePath();
  const completionLine = getCompletionLine(shell);

  // Ensure parent directory exists (for fish: ~/.config/fish/)
  // recursive: true is idempotent - no-op if directory exists
  mkdirSync(dirname(configPath), { recursive: true });

  const content = `\n# aaa CLI completion\n${completionLine}\n`;
  appendFileSync(configPath, content);
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
 * Checks if shell completion is already installed and active in shell config
 *
 * Detects these patterns:
 * - Direct sourcing: `source <(aaa completion zsh)`
 * - Eval approach: `eval "$(aaa completion zsh)"`
 * - Fish piped: `aaa completion fish | source`
 * - Cached file that exists and is sourced
 *
 * Does NOT match:
 * - Commands inside function definitions (not executed on shell startup)
 * - Comments mentioning completion
 */
function isCompletionInstalled(): boolean {
  const configPath = getShellConfigFilePath();
  if (!existsSync(configPath)) return false;

  try {
    const content = readFileSync(configPath, "utf8");

    // Pattern 1: Direct sourcing - source <(aaa completion zsh)
    if (/source\s+<\(aaa completion (?:bash|zsh|fish)\)/.test(content)) {
      return true;
    }

    // Pattern 2: Eval approach - eval "$(aaa completion zsh)"
    if (/eval\s+"\$\(aaa completion (?:bash|zsh|fish)\)"/.test(content)) {
      return true;
    }

    // Pattern 3: Fish piped - aaa completion fish | source
    if (/aaa completion fish\s*\|\s*source/.test(content)) {
      return true;
    }

    // Pattern 4: Cached file sourcing - check if cache file exists
    const cachePattern = /source\s+(?<path>[^\s]+aaa[_-]?completion[^\s]*)/;
    const cacheMatch = cachePattern.exec(content);
    if (cacheMatch?.groups?.path !== undefined) {
      const cachePath = cacheMatch.groups.path
        .replace(/^~/, homedir())
        .replace(/^\$HOME/, homedir());
      if (existsSync(cachePath)) {
        return true;
      }
    }

    return false;
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
  getCompletionLine,
  getExportLine,
  getShellConfigFilePath,
  getShellConfigPath,
  getShellType,
  getSymlinkTarget,
  installCompletion,
  isCliInstalled,
  isCompletionInstalled,
  isInPath,
  LOCAL_BIN,
};
export type { ShellType };

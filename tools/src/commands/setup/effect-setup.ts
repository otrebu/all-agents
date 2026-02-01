/**
 * Effect-based setup utilities
 *
 * Provides Effect wrappers for setup operations like:
 * - Reading/creating symlinks
 * - Building CLI
 * - Managing shell configuration
 *
 * @module
 */

/* eslint-disable import/exports-last, @typescript-eslint/no-shadow, @typescript-eslint/naming-convention, perfectionist/sort-modules */

import { env } from "@tools/env";
import {
  BuildError,
  FileSystem,
  SetupConfigError,
  SymlinkError,
} from "@tools/lib/effect";
import { Effect } from "effect";
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

// =============================================================================
// Constants
// =============================================================================

export const LOCAL_BIN = resolve(homedir(), ".local/bin");
export const AAA_SYMLINK = resolve(LOCAL_BIN, "aaa");

// =============================================================================
// Shell Types
// =============================================================================

export type ShellType = "bash" | "fish" | "zsh";

// =============================================================================
// All-Agents Root Resolution
// =============================================================================

let cachedAllAgentsRoot: null | string = null;

interface ClaudeConfigStatus {
  current?: string;
  expected: string;
  status: "correct" | "different" | "unset";
}

/**
 * Build CLI with Effect error handling
 */
export function buildCliEffect(cwd: string): Effect.Effect<void, BuildError> {
  return Effect.try({
    catch: (error) =>
      new BuildError({
        cause: error,
        cwd,
        message: `Build failed: ${error instanceof Error ? error.message : String(error)}`,
      }),
    try: () => {
      execSync("bun run build", { cwd, stdio: "pipe" });
    },
  });
}

/**
 * Clear the cached all-agents root (for testing)
 */
export function clearAllAgentsRootCache(): void {
  cachedAllAgentsRoot = null;
}

/**
 * Copy directory recursively with Effect
 */
export function copyDirectoryEffect(
  source: string,
  destination: string,
): Effect.Effect<void, never, FileSystem> {
  return Effect.gen(function* copyDirectory() {
    const fs = yield* FileSystem;
    yield* Effect.catchAll(fs.mkdirp(destination), () => Effect.void);
    yield* Effect.sync(() => {
      cpSync(source, destination, { recursive: true });
    });
  });
}

/**
 * Copy file with Effect error handling
 */
export function copyFileEffect(
  source: string,
  destination: string,
): Effect.Effect<void, never, FileSystem> {
  return Effect.gen(function* copyFile() {
    const fs = yield* FileSystem;

    // Ensure parent directory exists (catch errors silently)
    yield* Effect.catchAll(fs.mkdirp(dirname(destination)), () => Effect.void);

    // Use cpSync for copying
    yield* Effect.sync(() => {
      cpSync(source, destination, { recursive: true });
    });
  });
}

// =============================================================================
// Shell Utilities
// =============================================================================

/**
 * Create symlink with Effect error handling
 */
export function createSymlinkEffect(
  target: string,
  source: string,
): Effect.Effect<void, SymlinkError> {
  return Effect.try({
    catch: (error) =>
      new SymlinkError({
        cause: error,
        message: `Failed to create symlink: ${error instanceof Error ? error.message : String(error)}`,
        source,
        target,
      }),
    try: () => {
      symlinkSync(target, source);
    },
  });
}

/**
 * Synchronous version for backward compatibility
 */
export function getAllAgentsRoot(): string {
  if (cachedAllAgentsRoot !== null) return cachedAllAgentsRoot;

  const strategies = [tryResolveFromSymlink, tryResolveFromBinaryPath];

  for (const strategy of strategies) {
    const result = strategy();
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
 * Find the all-agents repository root as Effect
 */
export function getAllAgentsRootEffect(): Effect.Effect<
  string,
  SetupConfigError
> {
  return Effect.gen(function* getAllAgentsRoot() {
    if (cachedAllAgentsRoot !== null) {
      return cachedAllAgentsRoot;
    }

    const strategies = [tryResolveFromSymlink, tryResolveFromBinaryPath];

    for (const strategy of strategies) {
      const result = strategy();
      if (result !== null) {
        cachedAllAgentsRoot = result;
        return cachedAllAgentsRoot;
      }
    }

    return yield* Effect.fail(
      new SetupConfigError({
        message:
          "Cannot find all-agents root. Run from all-agents directory or ensure aaa is properly installed.",
      }),
    );
  });
}

/**
 * Synchronous version
 */
export function getClaudeConfigStatus(): ClaudeConfigStatus {
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
 * Check CLAUDE_CONFIG_DIR status (Effect version)
 */
export function getClaudeConfigStatusEffect(): Effect.Effect<
  ClaudeConfigStatus,
  SetupConfigError
> {
  return Effect.gen(function* getClaudeConfigStatus() {
    const root = yield* getAllAgentsRootEffect();
    const expected = resolve(root, ".claude");
    const current = env.CLAUDE_CONFIG_DIR;

    if (current === undefined || current === "") {
      return { expected, status: "unset" as const };
    }
    if (resolve(current) === expected) {
      return { current, expected, status: "correct" as const };
    }
    return { current, expected, status: "different" as const };
  });
}

// =============================================================================
// Symlink Utilities (Effect-based)
// =============================================================================

/**
 * Get completion line for shell type
 */
export function getCompletionLine(shell: ShellType): string {
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
      const _exhaustive: never = shell;
      return _exhaustive;
    }
  }
}

/**
 * Format export line for shell config
 */
export function getExportLine(variableName: string, value: string): string {
  return `export ${variableName}="${value}"`;
}

/**
 * Get shell config file path (absolute)
 */
export function getShellConfigFilePath(): string {
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
      const _exhaustive: never = shell;
      return _exhaustive;
    }
  }
}

/**
 * Get shell config file path (for display)
 */
export function getShellConfigPath(): string {
  const shell = env.SHELL;
  if (shell.includes("zsh")) return "~/.zshrc";
  if (shell.includes("bash")) return "~/.bashrc";
  return "~/.profile";
}

// =============================================================================
// Build Utilities (Effect-based)
// =============================================================================

/**
 * Detect shell type from SHELL environment variable
 */
export function getShellType(): ShellType {
  const shell = env.SHELL;
  if (shell.includes("zsh")) return "zsh";
  if (shell.includes("fish")) return "fish";
  return "bash";
}

// =============================================================================
// CLI Installation Checks
// =============================================================================

/**
 * Synchronous version for backward compatibility
 */
export function getSymlinkTarget(path: string): null | string {
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
 * Read symlink target without following (Effect version)
 */
export function getSymlinkTargetEffect(
  path: string,
): Effect.Effect<null | string> {
  return Effect.sync(() => {
    try {
      if (!existsSync(path)) return null;
      const stat = lstatSync(path);
      if (!stat.isSymbolicLink()) return null;
      return readlinkSync(path);
    } catch {
      return null;
    }
  });
}

/**
 * Synchronous version
 */
export function installCompletion(): void {
  const shell = getShellType();
  const configPath = getShellConfigFilePath();
  const completionLine = getCompletionLine(shell);

  mkdirSync(dirname(configPath), { recursive: true });

  const existing = existsSync(configPath)
    ? readFileSync(configPath, "utf8")
    : "";
  const content = `${existing}\n# aaa CLI completion\n${completionLine}\n`;

  writeFileSync(configPath, content, "utf8");
}

// =============================================================================
// Completion Installation
// =============================================================================

/**
 * Install shell completion (Effect version)
 */
export function installCompletionEffect(): Effect.Effect<
  void,
  never,
  FileSystem
> {
  return Effect.gen(function* installCompletion() {
    const fs = yield* FileSystem;
    const shell = getShellType();
    const configPath = getShellConfigFilePath();
    const completionLine = getCompletionLine(shell);

    // Ensure parent directory exists (catch errors silently)
    yield* Effect.catchAll(fs.mkdirp(dirname(configPath)), () => Effect.void);

    // Read existing content or start empty
    const existingResult = yield* Effect.either(fs.readFile(configPath));
    const existing =
      existingResult._tag === "Right" ? existingResult.right : "";

    const content = `${existing}\n# aaa CLI completion\n${completionLine}\n`;
    yield* Effect.catchAll(
      fs.writeFile(configPath, content),
      () => Effect.void,
    );
  });
}

/**
 * Synchronous version
 */
export function isCliInstalled(): boolean {
  if (!existsSync(AAA_SYMLINK)) return false;
  try {
    const stat = lstatSync(AAA_SYMLINK);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Check if CLI is installed (symlink exists)
 */
export function isCliInstalledEffect(): Effect.Effect<boolean> {
  return Effect.sync(() => {
    if (!existsSync(AAA_SYMLINK)) return false;
    try {
      const stat = lstatSync(AAA_SYMLINK);
      return stat.isSymbolicLink();
    } catch {
      return false;
    }
  });
}

/**
 * Synchronous version
 */
export function isCompletionInstalled(): boolean {
  const configPath = getShellConfigFilePath();
  if (!existsSync(configPath)) return false;

  try {
    const content = readFileSync(configPath, "utf8");

    if (/source\s+<\(aaa completion (?:bash|zsh|fish)\)/.test(content)) {
      return true;
    }

    if (/eval\s+"\$\(aaa completion (?:bash|zsh|fish)\)"/.test(content)) {
      return true;
    }

    if (/aaa completion fish\s*\|\s*source/.test(content)) {
      return true;
    }

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

// =============================================================================
// CLAUDE_CONFIG_DIR Utilities
// =============================================================================

/**
 * Check if shell completion is installed (Effect version)
 */
export function isCompletionInstalledEffect(): Effect.Effect<
  boolean,
  never,
  FileSystem
> {
  return Effect.gen(function* isCompletionInstalled() {
    const fs = yield* FileSystem;
    const configPath = getShellConfigFilePath();

    const exists = yield* fs.exists(configPath);
    if (!exists) return false;

    const contentResult = yield* Effect.either(fs.readFile(configPath));
    if (contentResult._tag === "Left") return false;

    const content = contentResult.right;

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

    // Pattern 4: Cached file sourcing
    const cachePattern = /source\s+(?<path>[^\s]+aaa[_-]?completion[^\s]*)/;
    const cacheMatch = cachePattern.exec(content);
    if (cacheMatch?.groups?.path !== undefined) {
      const cachePath = cacheMatch.groups.path
        .replace(/^~/, homedir())
        .replace(/^\$HOME/, homedir());
      const cacheExists = yield* fs.exists(cachePath);
      if (cacheExists) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Check if directory is in PATH
 */
export function isInPath(directory: string): boolean {
  const pathDirectories = env.PATH.split(":");
  return pathDirectories.some(
    (p) => p === directory || p === directory.replace(homedir(), "~"),
  );
}

/**
 * Remove symlink with Effect error handling
 */
export function removeSymlinkEffect(
  path: string,
): Effect.Effect<void, SymlinkError> {
  return Effect.try({
    catch: (error) =>
      new SymlinkError({
        cause: error,
        message: `Failed to remove symlink: ${error instanceof Error ? error.message : String(error)}`,
        target: path,
      }),
    try: () => {
      unlinkSync(path);
    },
  });
}

// =============================================================================
// File Copy Utilities
// =============================================================================

/**
 * Resolve from binary path (dev mode)
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
      if (parent === candidate) break;
      candidate = parent;
    }
  } catch {
    // Path exists but can't be resolved
  }

  return null;
}

/**
 * Resolve from symlink at ~/.local/bin/aaa
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

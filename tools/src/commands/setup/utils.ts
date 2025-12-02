import { existsSync, lstatSync, readlinkSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

let cachedAllAgentsRoot: null | string = null;

function getAllAgentsRoot(): string {
  if (cachedAllAgentsRoot !== null) return cachedAllAgentsRoot;

  // 1. Follow ~/.local/bin/aaa symlink (works for compiled binary)
  if (existsSync(AAA_SYMLINK)) {
    try {
      const realBinary = realpathSync(AAA_SYMLINK);
      const root = resolve(dirname(realBinary), "..");
      if (
        existsSync(resolve(root, "context")) &&
        existsSync(resolve(root, "tools"))
      ) {
        cachedAllAgentsRoot = root;
        return root;
      }
    } catch {
      // Fall through
    }
  }

  // 2. Follow process.argv[1] (works in dev mode: bun run dev)
  const binaryPath = process.argv[1];
  if (
    binaryPath !== undefined &&
    binaryPath !== "" &&
    !binaryPath.startsWith("/$bunfs")
  ) {
    try {
      const realPath = existsSync(binaryPath)
        ? realpathSync(binaryPath)
        : binaryPath;
      const root = resolve(dirname(realPath), "..");
      if (
        existsSync(resolve(root, "context")) &&
        existsSync(resolve(root, "tools"))
      ) {
        cachedAllAgentsRoot = root;
        return root;
      }
    } catch {
      // Fall through
    }
  }

  throw new Error(
    "Cannot find all-agents root. Run from all-agents directory or ensure aaa is properly installed.",
  );
}

function getClaudeConfigStatus(): {
  current?: string;
  expected: string;
  status: "correct" | "different" | "unset";
} {
  const root = getAllAgentsRoot();
  const expected = resolve(root, ".claude");
  const current = process.env.CLAUDE_CONFIG_DIR;

  if (current === undefined || current === "")
    return { expected, status: "unset" };
  if (resolve(current) === expected)
    return { current, expected, status: "correct" };
  return { current, expected, status: "different" };
}

function getExportLine(variableName: string, value: string): string {
  return `export ${variableName}="${value}"`;
}

function getShellConfigPath(): string {
  const shell = process.env.SHELL ?? "";
  if (shell.includes("zsh")) return "~/.zshrc";
  if (shell.includes("bash")) return "~/.bashrc";
  return "~/.profile";
}

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

function isCliInstalled(): boolean {
  if (!existsSync(AAA_SYMLINK)) return false;
  try {
    const stat = lstatSync(AAA_SYMLINK);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function isInPath(directory: string): boolean {
  const pathDirectories = (process.env.PATH ?? "").split(":");
  return pathDirectories.some(
    (p) => p === directory || p === directory.replace(homedir(), "~"),
  );
}

export const LOCAL_BIN = resolve(homedir(), ".local/bin");
export const AAA_SYMLINK = resolve(LOCAL_BIN, "aaa");
export {
  getAllAgentsRoot,
  getClaudeConfigStatus,
  getExportLine,
  getShellConfigPath,
  getSymlinkTarget,
  isCliInstalled,
  isInPath,
};

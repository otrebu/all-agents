import {
  findGitRoot,
  isAllAgentsRoot,
  isSymlinkTargetingPath,
  resolveWorktreeRoot,
} from "@tools/commands/setup/utils";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporaryDirectories: Array<string> = [];

function createTemporaryDirectory(prefix: string): string {
  const directory = join(
    tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  mkdirSync(directory, { recursive: true });
  temporaryDirectories.push(directory);
  return directory;
}

function makeAllAgentsRoot(root: string): void {
  mkdirSync(join(root, "context"), { recursive: true });
  mkdirSync(join(root, "tools"), { recursive: true });
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory !== undefined) {
      rmSync(directory, { force: true, recursive: true });
    }
  }
});

describe("setup worktree utils", () => {
  test("isAllAgentsRoot validates context/ and tools/ markers", () => {
    const root = createTemporaryDirectory("setup-utils-markers");
    expect(isAllAgentsRoot(root)).toBe(false);

    makeAllAgentsRoot(root);
    expect(isAllAgentsRoot(root)).toBe(true);
  });

  test("findGitRoot resolves nearest parent with .git file", () => {
    const root = createTemporaryDirectory("setup-utils-git-file");
    writeFileSync(join(root, ".git"), "gitdir: /tmp/mock-git-dir\n");

    const nested = join(root, "tools", "src", "commands");
    mkdirSync(nested, { recursive: true });

    expect(findGitRoot(nested)).toBe(root);
  });

  test("findGitRoot resolves nearest parent with .git directory", () => {
    const root = createTemporaryDirectory("setup-utils-git-dir");
    mkdirSync(join(root, ".git"), { recursive: true });

    const nested = join(root, "tools", "src");
    mkdirSync(nested, { recursive: true });

    expect(findGitRoot(nested)).toBe(root);
  });

  test("resolveWorktreeRoot uses current git worktree when flag has no value", () => {
    const root = createTemporaryDirectory("setup-utils-current-worktree");
    writeFileSync(join(root, ".git"), "gitdir: /tmp/mock-git-dir\n");
    makeAllAgentsRoot(root);

    const nested = join(root, "tools", "src");
    mkdirSync(nested, { recursive: true });

    expect(resolveWorktreeRoot(true, nested)).toBe(root);
  });

  test("resolveWorktreeRoot accepts explicit path values", () => {
    const root = createTemporaryDirectory("setup-utils-explicit-worktree");
    writeFileSync(join(root, ".git"), "gitdir: /tmp/mock-git-dir\n");
    makeAllAgentsRoot(root);

    expect(resolveWorktreeRoot(root, "/tmp")).toBe(root);
  });

  test("resolveWorktreeRoot errors when not in git worktree", () => {
    const directory = createTemporaryDirectory("setup-utils-not-git");

    expect(() => resolveWorktreeRoot(true, directory)).toThrow(
      "Cannot resolve current git worktree",
    );
  });

  test("resolveWorktreeRoot errors when resolved root is not all-agents", () => {
    const root = createTemporaryDirectory("setup-utils-invalid-worktree");
    writeFileSync(join(root, ".git"), "gitdir: /tmp/mock-git-dir\n");
    mkdirSync(join(root, "context"), { recursive: true });

    expect(() => resolveWorktreeRoot(true, root)).toThrow(
      "Invalid all-agents worktree",
    );
  });

  test("isSymlinkTargetingPath matches absolute symlink target", () => {
    const root = createTemporaryDirectory("setup-utils-absolute-symlink");
    const source = join(root, "source");
    const target = join(root, "target");
    mkdirSync(source, { recursive: true });
    mkdirSync(target, { recursive: true });
    const linkPath = join(root, "context");

    symlinkSync(source, linkPath);

    expect(isSymlinkTargetingPath(linkPath, source)).toBe(true);
    expect(isSymlinkTargetingPath(linkPath, target)).toBe(false);
  });

  test("isSymlinkTargetingPath matches relative symlink target", () => {
    const root = createTemporaryDirectory("setup-utils-relative-symlink");
    const source = join(root, "all-agents", "context");
    mkdirSync(source, { recursive: true });
    const projectDirectory = join(root, "project");
    mkdirSync(projectDirectory, { recursive: true });
    const linkPath = join(projectDirectory, "context");
    const relativeTarget = "../all-agents/context";

    symlinkSync(relativeTarget, linkPath);

    expect(isSymlinkTargetingPath(linkPath, source)).toBe(true);
  });
});

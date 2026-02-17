import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.join(import.meta.dir, "../../src/commands/ralph/index.ts"),
  "utf8",
);

describe("index calibrate root resolution", () => {
  test("declares helper to resolve git repo root from subtasks location", () => {
    expect(source).toContain(
      "function resolveGitRepoRoot(startDirectory: string)",
    );
    expect(source).toContain(
      '["git", "-C", startDirectory, "rev-parse", "--show-toplevel"]',
    );
  });

  test("computes repo root from resolved subtasks path before runCalibrate", () => {
    expect(source).toContain(
      "const milestoneDirectory = path.dirname(path.resolve(resolvedSubtasksPath));",
    );
    expect(source).toContain(
      "const repoRoot = resolveGitRepoRoot(milestoneDirectory);",
    );
  });

  test("passes both toolRoot and repoRoot to runCalibrate", () => {
    expect(source).toContain(
      "const didSucceed = await runCalibrate(subcommand, {",
    );
    expect(source).toContain("repoRoot,");
    expect(source).toContain("subtasksPath: resolvedSubtasksPath,");
    expect(source).toContain("toolRoot,");
  });
});

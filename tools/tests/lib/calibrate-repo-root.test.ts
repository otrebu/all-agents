import {
  extractDiffSummary,
  resolveFilesToRead,
} from "@tools/commands/ralph/calibrate";
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

function runGit(cwd: string, args: Array<string>): string {
  const proc = Bun.spawnSync(["git", ...args], {
    cwd,
    stderr: "pipe",
    stdout: "pipe",
  });
  if (proc.exitCode !== 0) {
    throw new Error(Buffer.from(proc.stderr).toString("utf8"));
  }
  return Buffer.from(proc.stdout).toString("utf8").trim();
}

describe("calibrate repo root resolution", () => {
  test("extractDiffSummary reads commit evidence from explicit repoRoot", () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), "calibrate-repo-"));
    const wrongRoot = mkdtempSync(path.join(tmpdir(), "calibrate-wrong-"));

    try {
      runGit(repoRoot, ["init"]);
      runGit(repoRoot, ["config", "user.name", "Ralph Tester"]);
      runGit(repoRoot, ["config", "user.email", "ralph@example.com"]);

      mkdirSync(path.join(repoRoot, "src"), { recursive: true });
      writeFileSync(path.join(repoRoot, "src", "feature.ts"), "export {};\n");
      runGit(repoRoot, ["add", "."]);
      runGit(repoRoot, ["commit", "-m", "feat: add feature file"]);
      const commitHash = runGit(repoRoot, ["rev-parse", "HEAD"]);

      const summary = extractDiffSummary(commitHash, "SUB-001", repoRoot);
      expect(summary.commitHash).toBe(commitHash);
      expect(summary.subtaskId).toBe("SUB-001");
      expect(summary.patch).toContain(`commit ${commitHash}`);
      expect(summary.filesChanged).toContain("src/feature.ts");

      expect(() =>
        extractDiffSummary(commitHash, "SUB-001", wrongRoot),
      ).toThrow();
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
      rmSync(wrongRoot, { force: true, recursive: true });
    }
  });

  test("resolveFilesToRead uses repoRoot for project files and toolRoot for @context", () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), "calibrate-project-"));
    const toolRoot = mkdtempSync(path.join(tmpdir(), "calibrate-tool-"));

    try {
      mkdirSync(path.join(repoRoot, "src"), { recursive: true });
      mkdirSync(path.join(toolRoot, "context/workflows/ralph/calibration"), {
        recursive: true,
      });

      writeFileSync(
        path.join(repoRoot, "src", "module.ts"),
        "export const x = 1;\n",
      );
      writeFileSync(
        path.join(
          toolRoot,
          "context/workflows/ralph/calibration/intention-drift.md",
        ),
        "# Intention Drift\n",
      );

      const files = resolveFilesToRead(
        [
          "src/module.ts",
          "@context/workflows/ralph/calibration/intention-drift.md",
        ],
        repoRoot,
        toolRoot,
      );

      expect(files).toHaveLength(2);
      expect(files[0]?.path).toBe(path.join(repoRoot, "src", "module.ts"));
      expect(files[1]?.path).toBe(
        path.join(
          toolRoot,
          "context/workflows/ralph/calibration/intention-drift.md",
        ),
      );
      expect(files[0]?.content).toContain("export const x = 1");
      expect(files[1]?.content).toContain("Intention Drift");
    } finally {
      rmSync(repoRoot, { force: true, recursive: true });
      rmSync(toolRoot, { force: true, recursive: true });
    }
  });
});

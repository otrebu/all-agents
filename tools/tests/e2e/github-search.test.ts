import { runCommand } from "@lib/spawn";
import { getOutputDir } from "@tools/utils/paths";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";
import { glob } from "glob";
import { rmSync, statSync } from "node:fs";
import { access, readFile } from "node:fs/promises";

const RESEARCH_DIR = getOutputDir("research/github");
const TIMEOUT_MS = 120_000;

async function checkGitHubAuth(): Promise<boolean> {
  const hasEnvToken =
    (process.env.GITHUB_TOKEN !== undefined &&
      process.env.GITHUB_TOKEN !== "") ||
    (process.env.GH_TOKEN !== undefined && process.env.GH_TOKEN !== "");

  if (hasEnvToken) return true;

  try {
    const { exitCode } = await runCommand(["gh", "auth", "status"]);
    return exitCode === 0;
  } catch {
    return false;
  }
}

describe("gh-search E2E", () => {
  const createdFiles: Array<string> = [];
  const testStartTime = Date.now();

  beforeAll(async () => {
    const hasAuth = await checkGitHubAuth();
    if (!hasAuth) {
      throw new Error(
        "GitHub authentication required.\n\n" +
          "Run one of:\n" +
          "  gh auth login\n" +
          "  export GITHUB_TOKEN=your-token\n",
      );
    }
  });

  // SYNC REQUIRED: Bun bug #19660 - async hooks may not complete
  afterEach(() => {
    const filesToRemove = [...createdFiles];
    createdFiles.length = 0;
    for (const file of filesToRemove) {
      try {
        rmSync(file, { force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // SYNC REQUIRED: Bun bug #19660 - async hooks may not complete
  afterAll(() => {
    const allFiles = [
      ...glob.sync(`${RESEARCH_DIR}/raw/*.json`),
      ...glob.sync(`${RESEARCH_DIR}/*.md`),
    ];

    for (const file of allFiles) {
      try {
        const fileStat = statSync(file);
        if (fileStat.mtimeMs >= testStartTime) {
          rmSync(file, { force: true });
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test(
    "completes search and creates valid files",
    async () => {
      const query = "useState hook example";
      const { exitCode, stdout } = await runCommand([
        "bun",
        "run",
        "dev",
        "gh-search",
        query,
      ]);

      expect(exitCode).toBe(0);

      const hasResults = stdout.includes("Search complete!");
      const hasNoResults = stdout.includes("No results found");
      expect(hasResults || hasNoResults).toBe(true);

      if (hasNoResults) {
        console.log("No results returned, skipping file checks");
        return;
      }

      const jsonFiles = (await glob(`${RESEARCH_DIR}/raw/*.json`))
        .sort()
        .reverse();
      const mdFiles = (await glob(`${RESEARCH_DIR}/*.md`)).sort().reverse();

      expect(jsonFiles.length).toBeGreaterThan(0);
      expect(mdFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles.at(0);
      const mdFile = mdFiles.at(0);

      if (jsonFile === undefined || mdFile === undefined) {
        throw new Error("Expected files to exist");
      }

      createdFiles.push(jsonFile, mdFile);

      await access(jsonFile);
      await access(mdFile);

      const jsonContent = await readFile(jsonFile, "utf8");
      const jsonData = JSON.parse(jsonContent) as { files?: Array<unknown> };
      expect(jsonData).toHaveProperty("files");
      expect(Array.isArray(jsonData.files)).toBe(true);

      if (jsonData.files && jsonData.files.length > 0) {
        const firstFile = jsonData.files[0] as Record<string, unknown>;
        expect(firstFile).toHaveProperty("url");
        expect(firstFile).toHaveProperty("path");
        expect(firstFile).toHaveProperty("repository");
        expect(firstFile).toHaveProperty("content");
      }

      const mdContent = await readFile(mdFile, "utf8");
      expect(mdContent).toContain("# GitHub Code Search Results");
      expect(mdContent).toContain("**Query:**");
      expect(mdContent).toContain("**Found:**");
      expect(mdContent).toMatch(/```\w+/);
      expect(mdContent).toMatch(/\u2b50/);
    },
    TIMEOUT_MS,
  );

  test(
    "handles no results gracefully",
    async () => {
      const query = "a1b2c3d4e5f6789012345678901234567890abcdef";
      const { exitCode, stdout } = await runCommand([
        "bun",
        "run",
        "dev",
        "gh-search",
        query,
      ]);

      expect(exitCode).toBe(0);
      const hasNoResults =
        stdout.includes("No results found") || stdout.includes("0 results");
      expect(hasNoResults).toBe(true);
    },
    TIMEOUT_MS,
  );
});

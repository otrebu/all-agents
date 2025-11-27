import { execa } from "execa";
import { glob } from "glob";
import { access, readFile, rm } from "node:fs/promises";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const RESEARCH_DIR = "../docs/research/github";
// 2 minutes for network calls
const TIMEOUT_MS = 120_000;

async function checkGitHubAuth(): Promise<boolean> {
  const hasEnvToken =
    (process.env.GITHUB_TOKEN !== undefined && process.env.GITHUB_TOKEN !== "") ||
    (process.env.GH_TOKEN !== undefined && process.env.GH_TOKEN !== "");

  if (hasEnvToken) return true;

  try {
    await execa`gh auth status`;
    return true;
  } catch {
    return false;
  }
}

describe("gh-search E2E", () => {
  const createdFiles: Array<string> = [];

  beforeAll(async () => {
    const hasAuth = await checkGitHubAuth();
    if (!hasAuth) {
      throw new Error(
        "GitHub authentication required.\n\n" +
        "Run one of:\n" +
        "  gh auth login\n" +
        "  export GITHUB_TOKEN=your-token\n"
      );
    }
  });

  afterEach(async () => {
    // Cleanup created files
    await Promise.all(
      createdFiles.map(async (file) => {
        try {
          await rm(file, { force: true });
        } catch {
          // Ignore cleanup errors
        }
      })
    );
    // Clear array safely to avoid race condition warning
    createdFiles.splice(0);
  });

  it(
    "should complete search and create files",
    { timeout: TIMEOUT_MS },
    async () => {

      // Execute search command (use a common pattern more likely to return results)
      const query = "useState hook";
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "gh-search", query]
      );

      // Assert: Exit code 0
      expect(exitCode).toBe(0);

      // Assert: Either success or no results (both are valid outcomes)
      const hasResults = stdout.includes("Search complete!");
      const hasNoResults = stdout.includes("No results found");
      expect(hasResults || hasNoResults).toBe(true);

      // Skip file checks if no results
      if (hasNoResults) {
        console.log("⏭️  No results returned, skipping file checks");
        return;
      }

      // Find created files (most recent - sort by filename which includes timestamp)
      const jsonFiles = (await glob(`${RESEARCH_DIR}/raw/*.json`)).sort().reverse();
      const mdFiles = (await glob(`${RESEARCH_DIR}/*.md`)).sort().reverse();

      expect(jsonFiles.length).toBeGreaterThan(0);
      expect(mdFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles[0];
      const mdFile = mdFiles[0];

      if (jsonFile === undefined || mdFile === undefined) {
        throw new Error("Expected files to exist after length check");
      }

      createdFiles.push(jsonFile, mdFile);

      // Assert: Files exist
      await expect(access(jsonFile)).resolves.not.toThrow();
      await expect(access(mdFile)).resolves.not.toThrow();

      // Assert: JSON is valid and contains expected structure
      const jsonContent = await readFile(jsonFile, "utf8");
      const jsonData: unknown = JSON.parse(jsonContent);
      expect(jsonData).toHaveProperty("files");
      if (
        jsonData !== null &&
        typeof jsonData === "object" &&
        "files" in jsonData
      ) {
        expect(Array.isArray(jsonData.files)).toBe(true);
      }

      // Assert: Markdown contains expected content
      const mdContent = await readFile(mdFile, "utf8");
      expect(mdContent).toContain("# GitHub Code Search Results");
      expect(mdContent).toContain(`**Query:**`);
      expect(mdContent).toContain("**Found:**");
    }
  );
});

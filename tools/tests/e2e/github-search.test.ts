import { execa } from "execa";
import { glob } from "glob";
import { access, readFile, rm } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

const RESEARCH_DIR = "docs/research/github";
// 2 minutes for network calls
const TIMEOUT_MS = 120_000;

describe("gh-search E2E", () => {
  const createdFiles: Array<string> = [];

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
      // Skip if GITHUB_TOKEN not available
      const hasGithubToken =
        (process.env.GITHUB_TOKEN !== undefined &&
          process.env.GITHUB_TOKEN !== "") ||
        (process.env.GH_TOKEN !== undefined && process.env.GH_TOKEN !== "");

      if (!hasGithubToken) {
        try {
          // Check if gh CLI is authenticated
          await execa`gh auth status`;
        } catch {
          console.log("⏭️  Skipping: No GitHub authentication available");
          return;
        }
      }

      // Execute search command (use a common pattern more likely to return results)
      const query = "useState hook";
      const { exitCode, stdout } = await execa(
        "pnpm",
        ["gh-search", query],
        { preferLocal: true }
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

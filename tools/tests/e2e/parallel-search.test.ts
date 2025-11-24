import { execa } from "execa";
import { glob } from "glob";
import { access, readFile, rm } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

const RESEARCH_DIR = "docs/research/parallel";
const TEST_OBJECTIVE = "TypeScript testing frameworks comparison";
// 2 minutes for network calls
const TIMEOUT_MS = 120_000;

describe("parallel-search E2E", () => {
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
      // Skip if PARALLEL_API_KEY not available
      if (
        process.env.PARALLEL_API_KEY === undefined ||
        process.env.PARALLEL_API_KEY === ""
      ) {
        console.log("⏭️  Skipping: PARALLEL_API_KEY not set");
        return;
      }

      // Execute search command with minimal results
      const { exitCode, stdout } = await execa({
        preferLocal: true,
      })`pnpm parallel-search --objective "${TEST_OBJECTIVE}" --max-results 1`;

      // Assert: Exit code 0
      expect(exitCode).toBe(0);

      // Assert: Stdout contains success message
      expect(stdout).toContain("Search completed in");

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

      // Assert: JSON is valid and contains results array
      const jsonContent = await readFile(jsonFile, "utf8");
      const jsonData: unknown = JSON.parse(jsonContent);
      expect(Array.isArray(jsonData)).toBe(true);
      if (Array.isArray(jsonData)) {
        expect(jsonData.length).toBeGreaterThan(0);
        if (jsonData.length > 0) {
          const firstItem: unknown = jsonData[0];
          expect(firstItem).toHaveProperty("url");
          expect(firstItem).toHaveProperty("domain");
          expect(firstItem).toHaveProperty("excerpts");
          if (
            firstItem !== null &&
            typeof firstItem === "object" &&
            "excerpts" in firstItem
          ) {
            expect(Array.isArray(firstItem.excerpts)).toBe(true);
          }
        }
      }

      // Assert: Markdown contains expected content (flexible to allow for updated formats)
      const mdContent = await readFile(mdFile, "utf8");
      // Check for markdown heading (either the formatted one or any heading)
      expect(mdContent).toMatch(/^# /m);
      // The file should have some content beyond just a title
      expect(mdContent.length).toBeGreaterThan(100);
    }
  );
});

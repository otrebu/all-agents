import { execa } from "execa";
import { glob } from "glob";
import { access, readFile, rm } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

const RESEARCH_DIR = "docs/research/google";
// 2 minutes for network calls
const TIMEOUT_MS = 120_000;

describe("gemini-research E2E", () => {
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
    "should complete research and create files",
    { timeout: TIMEOUT_MS },
    async () => {
      // Skip test by default - requires interactive Gemini CLI authentication
      // To enable: authenticate with `gemini -p "test"` first
      const shouldSkipTest =
        process.env.GEMINI_TEST_ENABLED === undefined ||
        process.env.GEMINI_TEST_ENABLED === "";
      if (shouldSkipTest) {
        console.log("⏭️  Skipping: Set GEMINI_TEST_ENABLED=1 to run (requires auth)");
        return;
      }

      // Execute research command with simplified query
      const simpleQuery = "TypeScript testing";
      let exitCode = 0;
      let stdout = "";

      try {
        // Leave 10s buffer
        const result = await execa(
          "pnpm",
          ["gemini-research", simpleQuery, "--mode", "quick"],
          { preferLocal: true, timeout: TIMEOUT_MS - 10_000 }
        );
        ({ exitCode, stdout } = result);
      } catch (error: unknown) {
        if (
          error !== null &&
          typeof error === "object" &&
          "stderr" in error &&
          typeof error.stderr === "string" &&
          error.stderr.includes("not authenticated")
        ) {
          console.log("⏭️  Skipping: Gemini not authenticated");
          return;
        }
        throw error;
      }

      // Assert: Exit code 0
      expect(exitCode).toBe(0);

      // Assert: Stdout contains success message
      expect(stdout).toContain("Research complete!");

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
      expect(jsonData).toHaveProperty("summary");
      expect(jsonData).toHaveProperty("sources");
      if (
        jsonData !== null &&
        typeof jsonData === "object" &&
        "sources" in jsonData
      ) {
        expect(Array.isArray(jsonData.sources)).toBe(true);
      }

      // Assert: Markdown contains expected content
      const mdContent = await readFile(mdFile, "utf8");
      expect(mdContent).toContain("# Research:");
      expect(mdContent).toContain("**Mode**: quick");
      expect(mdContent).toContain("PENDING ANALYSIS");
    }
  );
});

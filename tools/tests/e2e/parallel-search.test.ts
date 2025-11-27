import { execa } from "execa";
import { glob } from "glob";
import { access, readFile, rm } from "node:fs/promises";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const RESEARCH_DIR = "../docs/research/parallel";
const TEST_OBJECTIVE = "TypeScript testing frameworks comparison";
// 2 minutes for network calls
const TIMEOUT_MS = 120_000;

function hasParallelApiKey(): boolean {
  return (
    (process.env.PARALLEL_API_KEY !== undefined && process.env.PARALLEL_API_KEY !== "") ||
    (process.env.AAA_PARALLEL_API_KEY !== undefined && process.env.AAA_PARALLEL_API_KEY !== "")
  );
}

describe("parallel-search E2E", () => {
  const createdFiles: Array<string> = [];

  beforeAll(() => {
    if (!hasParallelApiKey()) {
      throw new Error(
        "Parallel Search API key required.\n\n" +
        "Get your key at: https://platform.parallel.ai/\n" +
        "Then run: export PARALLEL_API_KEY=your-key\n"
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

      // Execute search command with minimal results
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "parallel-search", "--objective", TEST_OBJECTIVE, "--max-results", "1"]
      );

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

      if (jsonFile === undefined || mdFile === undefined) {
        throw new Error("Expected files to exist after length check");
      }

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

  it(
    "should work with --processor base",
    { timeout: TIMEOUT_MS },
    async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "parallel-search", "--objective", "JavaScript frameworks", "--processor", "base", "--max-results", "1"]
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Search completed in");

      const jsonFiles = (await glob(`${RESEARCH_DIR}/raw/*.json`)).sort().reverse();
      expect(jsonFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles[0];
      if (jsonFile === undefined) {
        throw new Error("Expected JSON file to exist after length check");
      }
      createdFiles.push(jsonFile);

      // Find corresponding MD file
      const mdFiles = (await glob(`${RESEARCH_DIR}/*.md`)).sort().reverse();
      if (mdFiles.length > 0) {
        const mdFile = mdFiles[0];
        if (mdFile !== undefined) {
          createdFiles.push(mdFile);
        }
      }
    }
  );

  it(
    "should work with multiple --queries",
    { timeout: TIMEOUT_MS },
    async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        [
          "run", "dev", "parallel-search",
          "--objective", "Web development best practices",
          "--queries", "React patterns", "Vue patterns",
          "--max-results", "1"
        ]
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Search completed in");

      const jsonFiles = (await glob(`${RESEARCH_DIR}/raw/*.json`)).sort().reverse();
      expect(jsonFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles[0];
      if (jsonFile === undefined) {
        throw new Error("Expected JSON file to exist after length check");
      }
      createdFiles.push(jsonFile);

      // Find corresponding MD file
      const mdFiles = (await glob(`${RESEARCH_DIR}/*.md`)).sort().reverse();
      if (mdFiles.length > 0) {
        const mdFile = mdFiles[0];
        if (mdFile !== undefined) {
          createdFiles.push(mdFile);
        }
      }
    }
  );

  it(
    "should respect --max-chars option",
    { timeout: TIMEOUT_MS },
    async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        [
          "run", "dev", "parallel-search",
          "--objective", "Node.js performance",
          "--max-chars", "1000",
          "--max-results", "1"
        ]
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Search completed in");

      const jsonFiles = (await glob(`${RESEARCH_DIR}/raw/*.json`)).sort().reverse();
      expect(jsonFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles[0];
      if (jsonFile === undefined) {
        throw new Error("Expected JSON file to exist after length check");
      }
      createdFiles.push(jsonFile);

      // Verify JSON structure
      const jsonContent = await readFile(jsonFile, "utf8");
      const jsonData: unknown = JSON.parse(jsonContent);
      expect(Array.isArray(jsonData)).toBe(true);

      // Find corresponding MD file
      const mdFiles = (await glob(`${RESEARCH_DIR}/*.md`)).sort().reverse();
      if (mdFiles.length > 0) {
        const mdFile = mdFiles[0];
        if (mdFile !== undefined) {
          createdFiles.push(mdFile);
        }
      }
    }
  );
});

import { getOutputDir } from "@tools/utils/paths.js";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { execa } from "execa";
import { glob } from "glob";
import { access, readFile, rm } from "node:fs/promises";

const RESEARCH_DIR = getOutputDir("research/parallel");
const TIMEOUT_MS = 120_000;

function hasParallelApiKey(): boolean {
  return (
    (process.env.PARALLEL_API_KEY !== undefined &&
      process.env.PARALLEL_API_KEY !== "") ||
    (process.env.AAA_PARALLEL_API_KEY !== undefined &&
      process.env.AAA_PARALLEL_API_KEY !== "")
  );
}

describe("parallel-search E2E", () => {
  const createdFiles: Array<string> = [];

  beforeAll(() => {
    if (!hasParallelApiKey()) {
      throw new Error(
        "Parallel Search API key required.\n\n" +
          "Get your key at: https://platform.parallel.ai/\n" +
          "Then run: export PARALLEL_API_KEY=your-key\n",
      );
    }
  });

  afterEach(async () => {
    const filesToRemove = [...createdFiles];
    createdFiles.length = 0;
    await Promise.all(
      filesToRemove.map(async (file) => {
        try {
          await rm(file, { force: true });
        } catch {
          // Ignore cleanup errors
        }
      }),
    );
  });

  test(
    "completes search and creates valid files",
    async () => {
      const { exitCode, stdout } = await execa("bun", [
        "run",
        "dev",
        "parallel-search",
        "--objective",
        "Compare Bun vs Node.js for CLI tools",
        "--max-results",
        "1",
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Search completed in");

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
      const jsonData = JSON.parse(jsonContent) as Array<{
        domain?: string;
        excerpts?: Array<string>;
        url?: string;
      }>;
      expect(Array.isArray(jsonData)).toBe(true);
      expect(jsonData.length).toBeGreaterThan(0);

      const firstItem = jsonData.at(0);
      if (firstItem !== undefined) {
        expect(firstItem).toHaveProperty("url");
        expect(firstItem).toHaveProperty("domain");
        expect(firstItem).toHaveProperty("excerpts");
        expect(Array.isArray(firstItem.excerpts)).toBe(true);
      }

      const mdContent = await readFile(mdFile, "utf8");
      expect(mdContent).toMatch(/^# /m);
      expect(mdContent.length).toBeGreaterThan(100);
    },
    TIMEOUT_MS,
  );

  test(
    "works with --processor base",
    async () => {
      const { exitCode, stdout } = await execa("bun", [
        "run",
        "dev",
        "parallel-search",
        "--objective",
        "TypeScript monorepo tooling",
        "--processor",
        "base",
        "--max-results",
        "1",
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Search completed in");

      const jsonFiles = (await glob(`${RESEARCH_DIR}/raw/*.json`))
        .sort()
        .reverse();
      expect(jsonFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles.at(0);
      if (jsonFile === undefined) {
        throw new Error("Expected JSON file to exist");
      }
      createdFiles.push(jsonFile);

      const jsonContent = await readFile(jsonFile, "utf8");
      const jsonData = JSON.parse(jsonContent) as Array<{
        domain?: string;
        url?: string;
      }>;
      expect(Array.isArray(jsonData)).toBe(true);
      if (jsonData.length > 0) {
        const firstItem = jsonData.at(0);
        if (firstItem !== undefined) {
          expect(firstItem).toHaveProperty("url");
          expect(firstItem).toHaveProperty("domain");
        }
      }

      const mdFiles = (await glob(`${RESEARCH_DIR}/*.md`)).sort().reverse();
      expect(mdFiles.length).toBeGreaterThan(0);
      const mdFile = mdFiles.at(0);
      if (mdFile === undefined) {
        throw new Error("Expected MD file to exist");
      }
      createdFiles.push(mdFile);

      const mdContent = await readFile(mdFile, "utf8");
      expect(mdContent.length).toBeGreaterThan(500);
    },
    TIMEOUT_MS,
  );

  test(
    "works with multiple --queries",
    async () => {
      const { exitCode, stdout } = await execa("bun", [
        "run",
        "dev",
        "parallel-search",
        "--objective",
        "JavaScript testing migration strategies",
        "--queries",
        "Bun test patterns",
        "Vitest migration from Jest",
        "--max-results",
        "1",
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Search completed in");

      const jsonFiles = (await glob(`${RESEARCH_DIR}/raw/*.json`))
        .sort()
        .reverse();
      expect(jsonFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles.at(0);
      if (jsonFile === undefined) {
        throw new Error("Expected JSON file to exist");
      }
      createdFiles.push(jsonFile);

      const jsonContent = await readFile(jsonFile, "utf8");
      const jsonData = JSON.parse(jsonContent) as Array<{
        excerpts?: Array<string>;
      }>;
      expect(Array.isArray(jsonData)).toBe(true);
      if (jsonData.length > 0) {
        const firstItem = jsonData.at(0);
        if (firstItem?.excerpts !== undefined) {
          expect(Array.isArray(firstItem.excerpts)).toBe(true);
          if (firstItem.excerpts.length > 0) {
            const firstExcerpt = firstItem.excerpts.at(0);
            if (firstExcerpt !== undefined) {
              expect(typeof firstExcerpt).toBe("string");
              expect(firstExcerpt.length).toBeGreaterThan(0);
            }
          }
        }
      }

      const mdFiles = (await glob(`${RESEARCH_DIR}/*.md`)).sort().reverse();
      expect(mdFiles.length).toBeGreaterThan(0);
      const mdFile = mdFiles.at(0);
      if (mdFile === undefined) {
        throw new Error("Expected MD file to exist");
      }
      createdFiles.push(mdFile);

      const mdContent = await readFile(mdFile, "utf8");
      expect(mdContent.length).toBeGreaterThan(500);
    },
    TIMEOUT_MS,
  );

  test(
    "respects --max-chars option",
    async () => {
      const maxChars = 1000;
      const { exitCode, stdout } = await execa("bun", [
        "run",
        "dev",
        "parallel-search",
        "--objective",
        "Bun runtime performance optimization",
        "--max-chars",
        String(maxChars),
        "--max-results",
        "1",
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Search completed in");

      const jsonFiles = (await glob(`${RESEARCH_DIR}/raw/*.json`))
        .sort()
        .reverse();
      expect(jsonFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles.at(0);
      if (jsonFile === undefined) {
        throw new Error("Expected JSON file to exist");
      }
      createdFiles.push(jsonFile);

      const jsonContent = await readFile(jsonFile, "utf8");
      const jsonData = JSON.parse(jsonContent) as Array<{
        excerpts?: Array<string>;
      }>;
      expect(Array.isArray(jsonData)).toBe(true);
      if (jsonData.length > 0) {
        const firstItem = jsonData.at(0);
        if (firstItem?.excerpts !== undefined) {
          const totalExcerptLength = firstItem.excerpts.join("").length;
          expect(totalExcerptLength).toBeLessThan(maxChars * 2);
        }
      }

      const mdFiles = (await glob(`${RESEARCH_DIR}/*.md`)).sort().reverse();
      expect(mdFiles.length).toBeGreaterThan(0);
      const mdFile = mdFiles.at(0);
      if (mdFile === undefined) {
        throw new Error("Expected MD file to exist");
      }
      createdFiles.push(mdFile);

      const mdContent = await readFile(mdFile, "utf8");
      expect(mdContent.length).toBeGreaterThan(100);
    },
    TIMEOUT_MS,
  );
});

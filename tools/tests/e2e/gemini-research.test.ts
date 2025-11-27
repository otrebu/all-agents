import { execa } from "execa";
import { glob } from "glob";
import { access, readFile, rm } from "node:fs/promises";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const RESEARCH_DIR = "../context/research/google";
// 2 minutes for network calls
const TIMEOUT_MS = 120_000;

// Gemini CLI web search is currently broken/unreliable
// Set GEMINI_TEST_ENABLED=1 to run these tests anyway
const SKIP_MESSAGE =
  "Gemini CLI web search is currently broken. " +
  "See tools/README.md for details. " +
  "Set GEMINI_TEST_ENABLED=1 to run anyway.";

function shouldSkip(): boolean {
  return (
    process.env.GEMINI_TEST_ENABLED === undefined ||
    process.env.GEMINI_TEST_ENABLED === ""
  );
}

describe("gemini-research E2E", () => {
  const createdFiles: Array<string> = [];

  beforeAll(() => {
    if (shouldSkip()) {
      console.log(`\n⏭️  ${SKIP_MESSAGE}\n`);
    }
  });

  afterEach(async () => {
    await Promise.all(
      createdFiles.map(async (file) => {
        try {
          await rm(file, { force: true });
        } catch {
          // Ignore cleanup errors
        }
      })
    );
    createdFiles.splice(0);
  });

  it.skipIf(shouldSkip())(
    "should complete research and create files",
    { timeout: TIMEOUT_MS },
    async () => {
      const simpleQuery = "TypeScript testing";
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "gemini-research", simpleQuery, "--mode", "quick"],
        { timeout: TIMEOUT_MS - 10_000 }
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Research complete!");

      const jsonFiles = (await glob(`${RESEARCH_DIR}/raw/*.json`)).sort().reverse();
      const mdFiles = (await glob(`${RESEARCH_DIR}/*.md`)).sort().reverse();

      expect(jsonFiles.length).toBeGreaterThan(0);
      expect(mdFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles[0];
      const mdFile = mdFiles[0];

      if (jsonFile === undefined || mdFile === undefined) {
        throw new Error('Expected files to exist');
      }

      createdFiles.push(jsonFile, mdFile);

      await expect(access(jsonFile)).resolves.not.toThrow();
      await expect(access(mdFile)).resolves.not.toThrow();

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

      const mdContent = await readFile(mdFile, "utf8");
      expect(mdContent).toContain("# Research:");
      expect(mdContent).toContain("**Mode**: quick");
      expect(mdContent).toContain("PENDING ANALYSIS");
    }
  );

  it.skipIf(shouldSkip())(
    "should complete research with --mode deep",
    { timeout: TIMEOUT_MS },
    async () => {
      const simpleQuery = "JavaScript async await";
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "gemini-research", simpleQuery, "--mode", "deep"],
        { timeout: TIMEOUT_MS - 10_000 }
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Research complete!");

      const jsonFiles = (await glob(`${RESEARCH_DIR}/raw/*.json`)).sort().reverse();
      const mdFiles = (await glob(`${RESEARCH_DIR}/*.md`)).sort().reverse();

      expect(jsonFiles.length).toBeGreaterThan(0);
      expect(mdFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles[0];
      const mdFile = mdFiles[0];

      if (jsonFile === undefined || mdFile === undefined) {
        throw new Error('Expected files to exist');
      }

      createdFiles.push(jsonFile, mdFile);

      const mdContent = await readFile(mdFile, "utf8");
      expect(mdContent).toContain("**Mode**: deep");
    }
  );

  it.skipIf(shouldSkip())(
    "should complete research with --mode code",
    { timeout: TIMEOUT_MS },
    async () => {
      const simpleQuery = "React hooks examples";
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "gemini-research", simpleQuery, "--mode", "code"],
        { timeout: TIMEOUT_MS - 10_000 }
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Research complete!");

      const jsonFiles = (await glob(`${RESEARCH_DIR}/raw/*.json`)).sort().reverse();
      const mdFiles = (await glob(`${RESEARCH_DIR}/*.md`)).sort().reverse();

      expect(jsonFiles.length).toBeGreaterThan(0);
      expect(mdFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles[0];
      const mdFile = mdFiles[0];

      if (jsonFile === undefined || mdFile === undefined) {
        throw new Error('Expected files to exist');
      }

      createdFiles.push(jsonFile, mdFile);

      const mdContent = await readFile(mdFile, "utf8");
      expect(mdContent).toContain("**Mode**: code");
    }
  );
});

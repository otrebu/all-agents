import { getOutputDir } from "@tools/utils/paths";
import { afterEach, describe, expect, test } from "bun:test";
import { execa } from "execa";
import { glob } from "glob";
import { access, readFile, rm } from "node:fs/promises";

const RESEARCH_DIR = getOutputDir("research/google");
const TIMEOUT_MS = 120_000;

describe("gemini-research E2E", () => {
  const createdFiles: Array<string> = [];

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
    "completes research with --mode quick",
    async () => {
      const query = "Bun SQLite performance benchmarks 2024";
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "gemini-research", query, "--mode", "quick"],
        { reject: false, timeout: TIMEOUT_MS - 10_000 },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Research complete!");

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

      // Validate JSON structure
      const jsonContent = await readFile(jsonFile, "utf8");
      const jsonData = JSON.parse(jsonContent) as {
        sources?: Array<unknown>;
        summary?: string;
      };
      expect(jsonData).toHaveProperty("summary");
      expect(jsonData).toHaveProperty("sources");

      if (
        jsonData.sources &&
        Array.isArray(jsonData.sources) &&
        jsonData.sources.length > 0
      ) {
        const firstSource = jsonData.sources[0] as {
          title?: string;
          url?: string;
        };
        expect(firstSource).toHaveProperty("url");
        expect(firstSource).toHaveProperty("title");
        if (firstSource.url !== undefined && firstSource.url !== "") {
          expect(firstSource.url).toMatch(/^https?:\/\//);
        }
      }

      // Validate markdown content
      const mdContent = await readFile(mdFile, "utf8");
      expect(mdContent).toContain("# Research:");
      expect(mdContent).toContain("**Mode**: quick");
    },
    TIMEOUT_MS,
  );

  test(
    "completes research with --mode deep",
    async () => {
      const query = "TypeScript 5.x decorator metadata";
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "gemini-research", query, "--mode", "deep"],
        { reject: false, timeout: TIMEOUT_MS - 10_000 },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Research complete!");

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

      // Validate JSON structure
      const jsonContent = await readFile(jsonFile, "utf8");
      const jsonData = JSON.parse(jsonContent) as {
        sources?: Array<unknown>;
        summary?: string;
      };
      expect(jsonData).toHaveProperty("summary");
      expect(jsonData).toHaveProperty("sources");

      // Validate markdown content
      const mdContent = await readFile(mdFile, "utf8");
      expect(mdContent).toContain("# Research:");
      expect(mdContent).toContain("**Mode**: deep");
    },
    TIMEOUT_MS,
  );

  test(
    "completes research with --mode code",
    async () => {
      const query = "Zod schema inference patterns";
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "gemini-research", query, "--mode", "code"],
        { reject: false, timeout: TIMEOUT_MS - 10_000 },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Research complete!");

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

      // Validate JSON structure
      const jsonContent = await readFile(jsonFile, "utf8");
      const jsonData = JSON.parse(jsonContent) as {
        sources?: Array<unknown>;
        summary?: string;
      };
      expect(jsonData).toHaveProperty("summary");
      expect(jsonData).toHaveProperty("sources");

      // Validate markdown content
      const mdContent = await readFile(mdFile, "utf8");
      expect(mdContent).toContain("# Research:");
      expect(mdContent).toContain("**Mode**: code");
    },
    TIMEOUT_MS,
  );
});

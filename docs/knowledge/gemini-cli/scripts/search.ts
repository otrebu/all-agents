#!/usr/bin/env node

import { sanitizeForFilename } from "@lib/format.js";
import { log } from "@lib/log.js";
import { Command } from "commander";
import { execa } from "execa";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ora from "ora";

import type { GeminiResponse } from "./types.js";

const RESEARCH_DIR = "docs/research/google";
const RAW_DIR = join(RESEARCH_DIR, "raw");

// Prompt templates (as strings to avoid external file dependencies)
const TEMPLATES: Record<string, string> = {
  code: `Use GoogleSearch to find practical code examples for: %QUERY%

Execute 3-4 code-focused queries (GitHub, Stack Overflow, official docs). Fetch 6-10 sources with working examples. Extract actual code snippets. Identify patterns, anti-patterns, libraries, and gotchas. Include URLs for all sources.

Return JSON:
{
  "queries_used": ["query1", "query2"],
  "sources": [
    {"title": "Source Title", "url": "https://..."}
  ],
  "code_snippets": [
    {
      "language": "typescript",
      "code": "actual code here",
      "source_url": "https://...",
      "description": "What this code does"
    }
  ],
  "patterns": [
    "Common pattern 1",
    "Common pattern 2"
  ],
  "libraries": [
    "library-name (purpose)"
  ],
  "gotchas": [
    {
      "issue": "Known problem",
      "solution": "How to fix it"
    }
  ],
  "summary": "3-5 sentence overview of implementation approach"
}`,

  deep: `Use GoogleSearch to deeply research: %QUERY%

Execute 4-6 diverse queries (broad + specific). Fetch 10-15 sources. Extract detailed quotes. Identify contradictions, consensus, and gaps. Include URLs for all sources and quotes.

Return JSON:
{
  "queries_used": ["query1", "query2", "query3"],
  "sources": [
    {"title": "Source Title", "url": "https://..."}
  ],
  "key_points": [
    "Detailed fact 1",
    "Detailed fact 2"
  ],
  "quotes": [
    {"text": "Direct quote with context", "source_url": "https://..."}
  ],
  "contradictions": [
    "Source A says X, but Source B says Y (cite both URLs)"
  ],
  "consensus": [
    "Widely agreed point across multiple sources"
  ],
  "gaps": [
    "Area needing more research or missing data"
  ],
  "summary": "5-7 sentence comprehensive overview synthesizing all findings"
}`,

  quick: `Use GoogleSearch to research: %QUERY%

Execute 2-3 diverse queries. Fetch 5-8 high-quality sources with direct quotes. Include URLs for every source and quote.

Return JSON:
{
  "queries_used": ["query1", "query2"],
  "sources": [
    {"title": "Source Title", "url": "https://..."}
  ],
  "key_points": [
    "Fact 1 with context",
    "Fact 2 with context"
  ],
  "quotes": [
    {"text": "Direct quote", "source_url": "https://..."}
  ],
  "summary": "3-5 sentence overview synthesizing findings"
}`,
};

const program = new Command();

program
  .name("gemini-research")
  .description("Gemini Research CLI")
  .argument("<query>", "Search query")
  .option("--mode <string>", "Research mode: quick, deep, code", "quick")
  .action(async (query, options) => {
    log.header("\n🔍 Gemini Research CLI\n");

    try {
      const mode = (options.mode as string | undefined) ?? "quick";
      if (
        mode !== "code" &&
        mode !== "deep" &&
        mode !== "quick" &&
        TEMPLATES[mode] === undefined
      ) {
        log.error(`Invalid mode: ${mode}`);
        log.dim("Valid modes: quick, deep, code\n");
        process.exit(1);
      }

      // Prepare directories
      await mkdir(RAW_DIR, { recursive: true });

      // YYYYMMDDHHMMSS
      const timestamp = new Date()
        .toISOString()
        .replaceAll(/[:.]/g, "")
        .slice(0, 14);
      const sanitizedTopic = sanitizeForFilename(query);
      const rawFile = join(RAW_DIR, `${timestamp}-${sanitizedTopic}.json`);
      const finalFile = join(RESEARCH_DIR, `${timestamp}-${sanitizedTopic}.md`);

      // Construct prompt
      const prompt = TEMPLATES[mode].replace("%QUERY%", query);

      const spinner = ora(`Searching (${mode} mode): ${query}`).start();

      try {
        // Execute Gemini CLI
        const { stdout } = await execa({
          env: {
            // Ensure PATH includes npm bin
            PATH: process.env.PATH,
          },
          preferLocal: true,
        })`gemini -p "${prompt}" --output-format json`;

        // Parse response to validate JSON and extract content
        let responseData: GeminiResponse;
        try {
          const parsed = JSON.parse(stdout) as
            | { response?: GeminiResponse | string }
            | GeminiResponse;
          // Gemini CLI returns { response: "...", ... }
          const content =
            "response" in parsed && parsed.response
              ? parsed.response
              : parsed;

          // Clean potential markdown blocks if Gemini wrapped it
          const cleanContent =
            typeof content === "string"
              ? content.replaceAll(/```json\n?|\n?```/g, "")
              : JSON.stringify(content);

          responseData = JSON.parse(cleanContent) as GeminiResponse;
        } catch {
          spinner.fail("Failed to parse Gemini response");
          log.error("Raw output was not valid JSON");
          // Save raw output anyway for debugging
          await writeFile(rawFile, stdout);
          log.dim(`Raw output saved to: ${rawFile}`);
          process.exit(1);
        }

        // Save formatted raw JSON
        await writeFile(rawFile, JSON.stringify(responseData, null, 2));
        spinner.succeed("Research complete!");

        // Create Placeholder Markdown
        const placeholderContent = `# Research: ${query}

**Date**: ${new Date().toLocaleString()}
**Mode**: ${mode}
**Raw Data**: [${timestamp}-${sanitizedTopic}.json](./raw/${timestamp}-${sanitizedTopic}.json)

---

## ⚠️ PENDING ANALYSIS

**ACTION REQUIRED**: 
1. Read the raw JSON data linked above.
2. Apply the "Research Analysis Template" from \`docs/knowledge/gemini-cli/GEMINI_CLI.md\`.
3. Replace this entire section with your analysis.

---
`;
        await writeFile(finalFile, placeholderContent);

        log.plain("");
        log.info(`📄 Raw Data: ${rawFile}`);
        log.info(`📝 Report Placeholder: ${finalFile}`);
        log.plain("");
        log.warn(
          "👉 NEXT STEP: Open the Markdown file and let Claude generate the full report using the GEMINI_CLI template."
        );
        log.plain("");
      } catch (error: unknown) {
        spinner.fail("Research failed");

        const errorObject = error as { message?: string; stderr?: string; };
        if (
          typeof errorObject.stderr === "string" &&
          errorObject.stderr.includes("not authenticated")
        ) {
          log.error("Authentication required");
          log.dim('Run: gemini -p "test" to authenticate with Google');
        } else {
          const message =
            typeof errorObject.message === "string"
              ? errorObject.message
              : String(error);
          log.error(message);
        }
        process.exit(1);
      }
    } catch (error: unknown) {
      log.error("Unexpected error");
      console.error(error);
      process.exit(1);
    }
  });

program.parse();

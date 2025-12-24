#!/usr/bin/env node

import log from "@lib/log";
import { saveResearchOutput } from "@lib/research";
import { debug, env } from "@tools/env";
import { getOutputDir } from "@tools/utils/paths";
import { execa } from "execa";
import { readFile, writeFile } from "node:fs/promises";
import ora from "ora";

import type { GeminiResponse } from "./types";

type GeminiMode = "code" | "deep" | "quick";

interface GeminiResearchResult {
  data: GeminiResponse | null;
  jsonPath: string;
  mdPath: string;
}

/**
 * Parse the Gemini CLI response and extract the JSON content
 */
function parseGeminiResponse(stdout: string): GeminiResponse {
  const parsed: unknown = JSON.parse(stdout);

  // Gemini CLI returns { response: "...", ... }
  const content: unknown =
    parsed !== null &&
    typeof parsed === "object" &&
    "response" in parsed &&
    parsed.response !== null &&
    parsed.response !== undefined
      ? parsed.response
      : parsed;

  // Clean potential markdown blocks if Gemini wrapped it
  const cleanContent =
    typeof content === "string"
      ? content.replaceAll(/```json\n?|\n?```/g, "")
      : JSON.stringify(content);

  return JSON.parse(cleanContent) as GeminiResponse;
}

// Prompt templates (as strings to avoid external file dependencies)
const TEMPLATES: Record<GeminiMode, string> = {
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

async function executeGeminiSearch(
  query: string,
  mode: GeminiMode = "quick",
): Promise<void> {
  try {
    await performGeminiSearch(query, mode);
  } catch (error: unknown) {
    if (
      error !== null &&
      typeof error === "object" &&
      "stderr" in error &&
      typeof error.stderr === "string" &&
      error.stderr.includes("not authenticated")
    ) {
      log.error("Authentication required");
      log.dim('Run: gemini -p "test" to authenticate with Google');
    } else {
      const errorMessage = await extractErrorMessage(error);
      log.error(errorMessage);
    }
    process.exit(1);
  }
}

async function extractErrorMessage(error: unknown): Promise<string> {
  if (error === null || typeof error !== "object") {
    return "Unknown error";
  }

  const errorObject = error as Record<string, unknown>;
  const stderr =
    typeof errorObject.stderr === "string" ? errorObject.stderr : "";

  // Try to extract error log file path
  const logPathMatch = /Full report available at: (?<path>[^\n]+\.json)/.exec(
    stderr,
  );
  const logPath = logPathMatch?.groups?.path ?? null;
  if (logPath !== null && logPath.length > 0) {
    try {
      const logContent = await readFile(logPath, "utf8");
      const logData = JSON.parse(logContent) as {
        error?: { message?: string };
      };
      const message = logData.error?.message ?? null;
      if (message !== null && message.length > 0) {
        return message;
      }
    } catch {
      // Continue to fallback options
    }
  }

  // Fallback to other error sources
  if (stderr.includes("[object Object]")) {
    return "Gemini API error (check quota or authentication)";
  }

  const trimmedStderr = stderr.trim();
  if (trimmedStderr) {
    return trimmedStderr.split("\n").pop() ?? trimmedStderr;
  }

  if (typeof errorObject.shortMessage === "string") {
    return errorObject.shortMessage;
  }

  if (typeof errorObject.message === "string") {
    return errorObject.message;
  }

  return "Unknown error";
}

async function performGeminiSearch(
  query: string,
  mode: GeminiMode = "quick",
): Promise<GeminiResearchResult> {
  const RESEARCH_DIR = getOutputDir("research/google");
  debug("Gemini research:", { mode, query });

  log.header("\n🔍 Gemini Research CLI\n");

  if (!(mode in TEMPLATES)) {
    throw new Error(`Invalid mode: ${mode}. Valid modes: quick, deep, code`);
  }

  // Construct prompt
  const prompt = TEMPLATES[mode].replace("%QUERY%", query);

  const spinner = ora(`Searching (${mode} mode): ${query}`).start();

  // Execute Gemini CLI
  let stdout = "";
  try {
    const result = await execa({
      env: { PATH: env.PATH },
      preferLocal: true,
    })`gemini -p "${prompt}" --output-format json`;
    ({ stdout } = result);
  } catch (execError: unknown) {
    spinner.fail("Gemini API call failed");
    const errorMessage = await extractErrorMessage(execError);
    throw new Error(errorMessage);
  }

  // Parse response to validate JSON and extract content
  let responseData: GeminiResponse | null = null;
  try {
    responseData = parseGeminiResponse(stdout);
  } catch {
    spinner.fail("Failed to parse Gemini response");
    log.error("Raw output was not valid JSON");

    // Save raw output anyway for debugging using the utility
    const { jsonPath } = await saveResearchOutput({
      markdownContent: `# Research: ${query}\n\n**Error**: Failed to parse Gemini response\n\nSee raw output in the JSON file.`,
      outputDir: RESEARCH_DIR,
      rawData: stdout,
      topic: query,
    });
    log.dim(`Raw output saved to: ${jsonPath}`);
    return { data: null, jsonPath, mdPath: "" };
  }

  spinner.succeed("Research complete!");

  // Save research output using shared utility
  const { jsonPath, mdPath } = await saveResearchOutput({
    markdownContent: "",
    outputDir: RESEARCH_DIR,
    rawData: responseData,
    topic: query,
  });

  // Update markdown with proper link to raw data
  const sanitizedTopic =
    jsonPath.split("/").pop()?.replace(".json", "") ?? "research";
  const markdownContent = `# Research: ${query}

**Date**: ${new Date().toLocaleString()}
**Mode**: ${mode}
**Raw Data**: [${sanitizedTopic}.json](./raw/${sanitizedTopic}.json)

---

## PENDING ANALYSIS

**ACTION REQUIRED**:
1. Read the raw JSON data linked above.
2. Apply the "Research Analysis Template" from \`context/knowledge/gemini-cli/GEMINI_CLI.md\`.
3. Replace this entire section with your analysis.

---
`;

  // Update the markdown file with correct content
  await writeFile(mdPath, markdownContent);

  log.plain("");
  log.info(`📄 Raw Data: ${jsonPath}`);
  log.info(`📝 Report Placeholder: ${mdPath}`);
  log.plain("");
  log.warn(
    "👉 NEXT STEP: Open the Markdown file and let Claude generate the full report using the GEMINI_CLI template.",
  );
  log.plain("");

  return { data: responseData, jsonPath, mdPath };
}

export type { GeminiMode, GeminiResearchResult };
export { performGeminiSearch };
export default executeGeminiSearch;

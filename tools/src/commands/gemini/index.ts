#!/usr/bin/env node

/**
 * Gemini Research CLI using Effect.ts
 *
 * Uses Effect.gen for all async operations with proper error handling.
 * Wraps execa calls in Effect.tryPromise for type-safe error handling.
 *
 * @module
 */

import type {
  AuthError,
  ExternalProcessError,
  FileWriteError,
  PathResolutionError,
  ValidationError,
} from "@tools/lib/effect";

import { debug, env } from "@tools/env";
import {
  AuthError as AuthErrorClass,
  ExternalProcessError as ExternalProcessErrorClass,
  FileSystem,
  FileSystemLive,
  Logger,
  LoggerLive,
  saveResearchOutput,
  ValidationError as ValidationErrorClass,
} from "@tools/lib/effect";
import { getOutputDir } from "@tools/utils/paths";
import { Effect, Layer } from "effect";
import { execa } from "execa";
import ora from "ora";

import type { GeminiResponse } from "./types";

// =============================================================================
// Types
// =============================================================================

type GeminiMode = "code" | "deep" | "quick";

interface GeminiResearchResult {
  data: GeminiResponse | null;
  jsonPath: string;
  mdPath: string;
}

// =============================================================================
// Constants
// =============================================================================

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

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Execute Gemini CLI command as an Effect
 */
function executeGeminiCliEffect(
  prompt: string,
): Effect.Effect<string, AuthError | ExternalProcessError> {
  return Effect.tryPromise({
    catch: (error: unknown) => {
      // Check for authentication error
      if (isAuthenticationError(error)) {
        return new AuthErrorClass({
          cause: error,
          message:
            'Not authenticated. Run: gemini -p "test" to authenticate with Google',
          service: "gemini",
        });
      }

      const errorObject = error as Record<string, unknown>;
      const exitCode =
        typeof errorObject.exitCode === "number"
          ? errorObject.exitCode
          : undefined;
      const stderr =
        typeof errorObject.stderr === "string" ? errorObject.stderr : undefined;

      return new ExternalProcessErrorClass({
        cause: error,
        command: "gemini",
        exitCode,
        message: extractErrorMessageFromExecaError(error),
        stderr,
      });
    },
    try: async () => {
      const result = await execa({
        env: { PATH: env.PATH },
        preferLocal: true,
      })`gemini -p "${prompt}" --output-format json`;
      return result.stdout;
    },
  });
}

/**
 * Execute Gemini search command
 * Commander.js action handler - calls Effect.runPromise
 */
async function executeGeminiSearch(
  query: string,
  mode: GeminiMode = "quick",
): Promise<void> {
  const program = performGeminiSearchEffect(query, mode).pipe(
    Effect.provide(Layer.merge(FileSystemLive, LoggerLive)),
    Effect.catchTags({
      AuthError: (error) =>
        Effect.sync(() => {
          console.error("\nAuthentication required");
          console.error(error.message);
          console.error('Run: gemini -p "test" to authenticate with Google');
          process.exit(1);
        }),
      ExternalProcessError: (error) =>
        Effect.sync(() => {
          console.error("\nGemini CLI error");
          console.error(error.message);
          if (error.exitCode !== undefined) {
            console.error(`Exit code: ${error.exitCode}`);
          }
          process.exit(1);
        }),
      FileWriteError: (error) =>
        Effect.sync(() => {
          console.error("\nFailed to save research output");
          console.error(error.message);
          console.error(`Path: ${error.path}`);
          process.exit(1);
        }),
      PathResolutionError: (error) =>
        Effect.sync(() => {
          console.error("\nFailed to resolve output path");
          console.error(error.message);
          process.exit(1);
        }),
      ValidationError: (error) =>
        Effect.sync(() => {
          console.error("\nValidation error");
          console.error(error.message);
          process.exit(1);
        }),
    }),
  );

  try {
    await Effect.runPromise(program);
  } catch (error) {
    // Handle any unexpected errors
    console.error("\nUnexpected error");
    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack !== undefined && error.stack !== "") {
        console.error(`\n${error.stack}`);
      }
    }
    process.exit(1);
  }
}

/**
 * Extract a readable error message from execa error
 */
function extractErrorMessageFromExecaError(error: unknown): string {
  if (error === null || typeof error !== "object") {
    return "Unknown error";
  }

  const errorObject = error as Record<string, unknown>;
  const stderr =
    typeof errorObject.stderr === "string" ? errorObject.stderr : "";

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

// =============================================================================
// Effect-based Functions
// =============================================================================

/**
 * Check if the error is an authentication error
 */
function isAuthenticationError(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  const errorObject = error as Record<string, unknown>;
  return (
    typeof errorObject.stderr === "string" &&
    errorObject.stderr.includes("not authenticated")
  );
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

/**
 * Perform Gemini search using Effect
 * All operations use Effect.Effect with proper error types
 */
function performGeminiSearchEffect(
  query: string,
  mode: GeminiMode = "quick",
): Effect.Effect<
  GeminiResearchResult,
  | AuthError
  | ExternalProcessError
  | FileWriteError
  | PathResolutionError
  | ValidationError,
  FileSystem | Logger
> {
  return Effect.gen(function* performGeminiSearchGenerator() {
    const logger = yield* Logger;
    const fs = yield* FileSystem;
    const RESEARCH_DIR = getOutputDir("research/google");
    debug("Gemini research:", { mode, query });

    yield* Effect.sync(() => logger.info("\n🔍 Gemini Research CLI\n"));

    // Validate mode
    yield* validateModeEffect(mode);

    // Construct prompt
    const prompt = TEMPLATES[mode].replace("%QUERY%", query);

    const spinner = ora(`Searching (${mode} mode): ${query}`).start();

    // Execute Gemini CLI
    const stdout = yield* executeGeminiCliEffect(prompt).pipe(
      Effect.tapError(() =>
        Effect.sync(() => spinner.fail("Gemini API call failed")),
      ),
    );

    // Parse response to validate JSON and extract content
    let responseData: GeminiResponse | null = null;
    try {
      responseData = parseGeminiResponse(stdout);
    } catch {
      spinner.fail("Failed to parse Gemini response");
      yield* Effect.sync(() => logger.error("Raw output was not valid JSON"));

      // Save raw output anyway for debugging using the utility
      const { jsonPath } = yield* saveResearchOutput({
        markdownContent: `# Research: ${query}\n\n**Error**: Failed to parse Gemini response\n\nSee raw output in the JSON file.`,
        outputDir: RESEARCH_DIR,
        rawData: stdout,
        topic: query,
      });

      yield* Effect.sync(() => logger.log(`Raw output saved to: ${jsonPath}`));
      return { data: null, jsonPath, mdPath: "" };
    }

    spinner.succeed("Research complete!");

    // Save research output using shared utility
    const { jsonPath, mdPath } = yield* saveResearchOutput({
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
    yield* fs.writeFile(mdPath, markdownContent);

    yield* Effect.sync(() => {
      logger.log("");
      logger.info(`📄 Raw Data: ${jsonPath}`);
      logger.info(`📝 Report Placeholder: ${mdPath}`);
      logger.log("");
      logger.warn(
        "👉 NEXT STEP: Open the Markdown file and let Claude generate the full report using the GEMINI_CLI template.",
      );
      logger.log("");
    });

    return { data: responseData, jsonPath, mdPath };
  });
}

// =============================================================================
// Command Handler
// =============================================================================

/**
 * Validate the Gemini mode
 */
function validateModeEffect(
  mode: GeminiMode,
): Effect.Effect<void, ValidationError> {
  if (!(mode in TEMPLATES)) {
    return Effect.fail(
      new ValidationErrorClass({
        field: "mode",
        message: `Invalid mode: ${mode}. Valid modes: quick, deep, code`,
      }),
    );
  }
  return Effect.void;
}

// =============================================================================
// Exports
// =============================================================================

export type { GeminiMode, GeminiResearchResult };
export { executeGeminiCliEffect, performGeminiSearchEffect };
export default executeGeminiSearch;

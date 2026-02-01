/**
 * extract-conversations command
 * Extracts conversation history from Claude Code for analysis
 *
 * Ported to Effect.ts for:
 * - Effect-based file operations via FileSystemService
 * - Proper error handling with tagged errors
 * - Parallel file processing with concurrency control
 */

import type { FileNotFoundError, FileSystem } from "@tools/lib/effect";
import type { Command } from "commander";

import { FileSystemLive } from "@tools/lib/effect";
import chalk from "chalk";
import { Effect } from "effect";
import ora from "ora";

import type { ExtractedConversation, ExtractionOptions } from "./types";

import {
  getConversationFilesEffect,
  getProjectsDirectory,
  parseConversationsEffect,
} from "./effect-parser";
import { formatOutput } from "./formatter";

// =============================================================================
// Effect-based Implementation
// =============================================================================

/**
 * Main extraction function - wraps Effect execution
 */
async function extractConversations(options: ExtractionOptions): Promise<void> {
  const spinner = ora("Finding conversation files...").start();

  const program = extractConversationsEffect(options).pipe(
    Effect.tap(({ projectsDirectory }) =>
      Effect.sync(() => {
        spinner.text = `Scanning ${projectsDirectory}...`;
      }),
    ),
    // eslint-disable-next-line promise/prefer-await-to-callbacks -- Effect.catchTag is Effect's error handling pattern
    Effect.catchTag("FileNotFoundError", (error) => {
      spinner.fail("No conversation files found");
      console.log(chalk.yellow(`\n${error.message}`));
      return Effect.succeed({ conversations: [], projectsDirectory: "" });
    }),
    Effect.provide(FileSystemLive),
  );

  try {
    const { conversations, projectsDirectory } =
      await Effect.runPromise(program);

    if (conversations.length === 0 && projectsDirectory !== "") {
      spinner.fail("No conversation files found");
      console.log(
        chalk.yellow(
          `\nLooked in: ${projectsDirectory}\nMake sure you have previous conversations in this project.`,
        ),
      );
      return;
    }

    if (conversations.length === 0) {
      // Already handled by FileNotFoundError
      return;
    }

    const totalExchanges = conversations.reduce(
      (sum, c) => sum + c.exchanges.length,
      0,
    );

    spinner.succeed(
      `Extracted ${conversations.length} conversations with ${totalExchanges} exchanges`,
    );

    // Format and output
    const output = formatOutput(conversations, options.format);
    console.log(output);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.fail(`Extraction failed: ${message}`);
    process.exit(1);
  }
}

function extractConversationsCommand(program: Command): void {
  program
    .command("extract-conversations")
    .alias("ec")
    .description("Extract conversation history from Claude Code for analysis")
    .option(
      "-l, --limit <n>",
      "Number of conversations to extract",
      (v) => Number.parseInt(v, 10),
      20,
    )
    .option(
      "-s, --skip <n>",
      "Number of conversations to skip (for pagination)",
      (v) => Number.parseInt(v, 10),
      0,
    )
    .option(
      "-f, --format <format>",
      "Output format: markdown, json",
      "markdown",
    )
    .option("-p, --project <path>", "Project path (defaults to current dir)")
    .action(
      async (options: {
        format: string;
        limit: number;
        project?: string;
        skip: number;
      }) => {
        const extractionOptions: ExtractionOptions = {
          format: options.format as "json" | "markdown",
          limit: options.limit,
          projectPath: options.project,
          skip: options.skip,
        };

        await extractConversations(extractionOptions);
      },
    );
}

// =============================================================================
// Command Registration
// =============================================================================

/**
 * Extract conversations using Effect
 * Returns Effect.Effect<ExtractedConversation[], ConversationError, FileSystem>
 */
function extractConversationsEffect(
  options: ExtractionOptions,
): Effect.Effect<
  { conversations: Array<ExtractedConversation>; projectsDirectory: string },
  FileNotFoundError,
  FileSystem
> {
  return Effect.gen(function* extractConversationsGen() {
    const projectsDirectory = getProjectsDirectory(options.projectPath);

    // Get conversation files with pagination
    const files = yield* getConversationFilesEffect(
      options.limit,
      options.skip ?? 0,
      options.projectPath,
    );

    // Parse all conversations (handles errors internally, skipping bad files)
    const conversations = yield* parseConversationsEffect(files);

    return { conversations, projectsDirectory };
  });
}

export default extractConversationsCommand;

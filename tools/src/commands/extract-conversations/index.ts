/**
 * extract-conversations command
 * Extracts conversation history from Claude Code for analysis
 */

import type { Command } from "commander";

import chalk from "chalk";
import ora from "ora";

import type { ExtractedConversation, ExtractionOptions } from "./types";

import { formatOutput } from "./formatter";
import {
  extractExchanges,
  getProjectsDirectory,
  listConversationFiles,
  parseConversationFile,
} from "./parser";

function extractConversations(options: ExtractionOptions): void {
  const spinner = ora("Finding conversation files...").start();

  try {
    // Get project directory
    const projectsDirectory = getProjectsDirectory(options.projectPath);
    spinner.text = `Scanning ${projectsDirectory}...`;

    // List conversation files
    const files = listConversationFiles(
      projectsDirectory,
      options.limit,
      options.skip,
    );

    if (files.length === 0) {
      spinner.fail("No conversation files found");
      console.log(
        chalk.yellow(
          `\nLooked in: ${projectsDirectory}\nMake sure you have previous conversations in this project.`,
        ),
      );
      return;
    }

    spinner.text = `Found ${files.length} conversations. Extracting...`;

    // Parse and extract conversations
    const conversations: Array<ExtractedConversation> = [];

    for (const file of files) {
      try {
        const session = parseConversationFile(file);
        const extracted = extractExchanges(session);

        // Only include conversations with actual exchanges
        if (extracted.exchanges.length > 0) {
          conversations.push(extracted);
        }
      } catch (error: unknown) {
        // Skip files that fail to parse
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.dim(`Skipped ${file}: ${message}`));
      }
    }

    spinner.succeed(
      `Extracted ${conversations.length} conversations with ${conversations.reduce((sum, c) => sum + c.exchanges.length, 0)} exchanges`,
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
      (options: {
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

        extractConversations(extractionOptions);
      },
    );
}

export default extractConversationsCommand;

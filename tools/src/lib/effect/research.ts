/**
 * Effect-based research output utilities
 *
 * Effect version of research output saving from tools/lib/research.ts.
 * Uses FileSystemService for all file operations.
 *
 * @module
 */

import sanitizeForFilename from "@lib/format";
import { Effect } from "effect";
import { join } from "node:path";

import type { FileWriteError, PathResolutionError } from "./errors";

import { FileSystem } from "./filesystem";

// =============================================================================
// Types
// =============================================================================

export interface ResearchPaths {
  jsonPath: string;
  mdPath: string;
  timestamp: string;
}

export interface SaveResearchOptions {
  markdownContent: string;
  outputDir: string;
  rawData: unknown;
  topic: string;
}

// =============================================================================
// Effect-based functions
// =============================================================================

/**
 * Save research output consistently across all research tools.
 *
 * Creates both raw JSON and markdown report files with timestamp prefix.
 * Uses FileSystemService for all file operations with proper error handling.
 *
 * @param options - Configuration for saving research files
 * @returns Effect with paths to the created files and the timestamp used
 */
export function saveResearchOutput(
  options: SaveResearchOptions,
): Effect.Effect<
  ResearchPaths,
  FileWriteError | PathResolutionError,
  FileSystem
> {
  return Effect.gen(function* saveResearchOutputGenerator() {
    const fs = yield* FileSystem;
    const { markdownContent, outputDir, rawData, topic } = options;

    // Prepare directories
    const rawDirectory = join(outputDir, "raw");
    yield* fs.mkdirp(rawDirectory);

    // Generate timestamp: YYYYMMDD-HHMMSS format
    const isoTimestamp = new Date()
      .toISOString()
      .replaceAll(/[-:T.]/g, "")
      .slice(0, 14);
    const timestamp = `${isoTimestamp.slice(0, 8)}-${isoTimestamp.slice(8)}`;

    // Sanitize topic for filename
    const sanitizedTopic = sanitizeForFilename(topic);

    // Build file paths
    const jsonPath = join(rawDirectory, `${timestamp}-${sanitizedTopic}.json`);
    const mdPath = join(outputDir, `${timestamp}-${sanitizedTopic}.md`);

    // Save raw JSON
    yield* fs.writeJson(jsonPath, rawData);

    // Save markdown report
    yield* fs.writeFile(mdPath, markdownContent);

    return { jsonPath, mdPath, timestamp };
  });
}

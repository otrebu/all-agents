/**
 * Effect-based numbered file utilities
 *
 * Effect versions of numbered file creation functions from tools/lib/numbered-files.ts.
 * Uses FileSystemService for all file operations.
 *
 * @module
 */

/* eslint-disable import/exports-last */

import { Effect } from "effect";
import { isAbsolute, resolve } from "node:path";

import type {
  FileNotFoundError,
  FileWriteError,
  PathResolutionError,
} from "./errors";

import { FileSystem } from "./filesystem";
import { getContextRootPath } from "./paths";

// =============================================================================
// Types
// =============================================================================

const DEFAULT_PATTERN = /^(?<num>\d+)-.*\.md$/;

export interface CreateResult {
  filepath: string;
  number: string;
}

export interface NumberedFileOptions {
  customDirectory?: string;
  defaultDir: string;
  pattern?: RegExp;
  template?: string;
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Create a numbered file with the next available number
 *
 * Automatically creates the target directory if it doesn't exist,
 * finds the next available number, and creates the file with
 * optional template content.
 *
 * @param name - Base name for the file (without number or extension)
 * @param options - Configuration for file creation
 * @returns Effect with created file path and assigned number
 */
export function createNumberedFile(
  name: string,
  options: NumberedFileOptions,
): Effect.Effect<
  CreateResult,
  FileNotFoundError | FileWriteError | PathResolutionError,
  FileSystem
> {
  return Effect.gen(function* createNumberedFileGenerator() {
    const fs = yield* FileSystem;
    const pattern = options.pattern ?? DEFAULT_PATTERN;

    // Get context root for resolving relative paths
    const root = yield* getContextRootPath();
    const directory = resolveDirectory(
      root,
      options.customDirectory,
      options.defaultDir,
    );

    // Ensure directory exists
    yield* fs.mkdirp(directory);

    // Get next number
    const number = yield* getNextNumber(directory, pattern);

    // Build file path
    const filename = `${number}-${name}.md`;
    const filepath = resolve(directory, filename);

    // Write file with template
    yield* fs.writeFile(filepath, options.template ?? "");

    return { filepath, number };
  });
}

// =============================================================================
// Effect-based functions
// =============================================================================

/**
 * Get the next available number for a numbered file in a directory
 *
 * Reads the directory contents and finds the highest existing number,
 * then returns the next number padded to 3 digits.
 *
 * @param directory - Directory to scan for existing numbered files
 * @param pattern - Regex pattern with named group 'num' to extract numbers
 * @returns Effect with next number as 3-digit padded string
 */
export function getNextNumber(
  directory: string,
  pattern: RegExp = DEFAULT_PATTERN,
): Effect.Effect<string, FileNotFoundError, FileSystem> {
  return Effect.gen(function* getNextNumberGenerator() {
    const fs = yield* FileSystem;

    const hasDirectory = yield* fs.exists(directory);
    if (!hasDirectory) {
      return "001";
    }

    const files = yield* Effect.catchTag(
      fs.readDirectory(directory),
      "FileReadError",
      // If we can't read it, treat as empty
      () => Effect.succeed([] as Array<string>),
    );

    const numbers = files
      .map((file) => {
        const match = pattern.exec(file);
        const numberString = match?.groups?.num;
        return numberString !== undefined && numberString !== ""
          ? Number.parseInt(numberString, 10)
          : 0;
      })
      .filter((n) => n > 0);

    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return String(max + 1).padStart(3, "0");
  });
}

/**
 * Resolve the target directory for numbered files
 */
function resolveDirectory(
  root: string,
  customDirectory: string | undefined,
  defaultDir: string,
): string {
  if (customDirectory === undefined || customDirectory === "") {
    return resolve(root, defaultDir);
  }
  if (isAbsolute(customDirectory)) {
    return customDirectory;
  }
  return resolve(root, customDirectory);
}

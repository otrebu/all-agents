/**
 * FileSystemService - Effect Layer wrapping fs operations
 *
 * Provides:
 * - Effect-based file operations with proper error types
 * - Consistent error handling across the application
 * - Easy mocking for tests
 *
 * Note: For more advanced use cases, consider using @effect/platform FileSystem
 * directly. This service provides a simpler interface for common operations.
 *
 * @module
 */

/* eslint-disable import/exports-last */

import { Context, Effect, Layer } from "effect";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

import {
  FileNotFoundError,
  FileReadError,
  FileWriteError,
  PathResolutionError,
} from "./errors";

// =============================================================================
// Service Interface
// =============================================================================

/**
 * FileSystemService interface
 * Provides Effect-based file system operations
 */
export interface FileSystemService {
  /**
   * Check if a path exists
   */
  readonly exists: (path: string) => Effect.Effect<boolean>;

  /**
   * Ensure a directory exists, creating it if necessary
   */
  readonly mkdirp: (
    path: string,
  ) => Effect.Effect<void, FileWriteError | PathResolutionError>;

  /**
   * Read a directory's contents
   */
  readonly readDirectory: (
    path: string,
  ) => Effect.Effect<Array<string>, FileNotFoundError | FileReadError>;

  /**
   * Read a file as UTF-8 text
   */
  readonly readFile: (
    path: string,
  ) => Effect.Effect<string, FileNotFoundError | FileReadError>;

  /**
   * Read a file and parse as JSON
   */
  readonly readJson: <T>(
    path: string,
  ) => Effect.Effect<T, FileNotFoundError | FileReadError>;

  /**
   * Write content to a file (creates directories if needed)
   */
  readonly writeFile: (
    path: string,
    content: string,
  ) => Effect.Effect<void, FileWriteError | PathResolutionError>;

  /**
   * Write JSON to a file with pretty printing
   */
  readonly writeJson: <T>(
    path: string,
    data: T,
  ) => Effect.Effect<void, FileWriteError | PathResolutionError>;
}

// =============================================================================
// Service Tag
// =============================================================================

/**
 * Effect Context tag for FileSystemService
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const fs = yield* FileSystem;
 *   const content = yield* fs.readFile("/path/to/file.txt");
 *   yield* fs.writeFile("/path/to/output.txt", content.toUpperCase());
 * });
 * ```
 */
export class FileSystem extends Context.Tag("FileSystem")<
  FileSystem,
  FileSystemService
>() {}

// =============================================================================
// Live Implementation
// =============================================================================

/**
 * Create the FileSystemService implementation
 */
function makeFileSystemService(): FileSystemService {
  return {
    exists: (path: string) => Effect.sync(() => existsSync(path)),

    mkdirp: (path: string) =>
      Effect.try({
        catch: (error) =>
          new FileWriteError({
            cause: error,
            message: `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
            path,
          }),
        try: () => {
          mkdirSync(path, { recursive: true });
        },
      }),

    readDirectory: (path: string) =>
      Effect.gen(function* readDirectory() {
        if (!existsSync(path)) {
          return yield* Effect.fail(
            new FileNotFoundError({
              message: `Directory not found: ${path}`,
              path,
            }),
          );
        }

        return yield* Effect.try({
          catch: (error) =>
            new FileReadError({
              cause: error,
              message: `Failed to read directory: ${error instanceof Error ? error.message : String(error)}`,
              path,
            }),
          try: () => readdirSync(path),
        });
      }),

    readFile: (path: string) =>
      Effect.gen(function* readFile() {
        if (!existsSync(path)) {
          return yield* Effect.fail(
            new FileNotFoundError({ message: `File not found: ${path}`, path }),
          );
        }

        return yield* Effect.try({
          catch: (error) =>
            new FileReadError({
              cause: error,
              message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
              path,
            }),
          try: () => readFileSync(path, "utf8"),
        });
      }),

    readJson: <T>(path: string) =>
      Effect.gen(function* readJson() {
        if (!existsSync(path)) {
          return yield* Effect.fail(
            new FileNotFoundError({ message: `File not found: ${path}`, path }),
          );
        }

        const content = yield* Effect.try({
          catch: (error) =>
            new FileReadError({
              cause: error,
              message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
              path,
            }),
          try: () => readFileSync(path, "utf8"),
        });

        return yield* Effect.try({
          catch: (error) =>
            new FileReadError({
              cause: error,
              message: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
              path,
            }),
          try: () => JSON.parse(content) as T,
        });
      }),

    writeFile: (path: string, content: string) =>
      Effect.gen(function* writeFile() {
        // Ensure parent directory exists
        const dir = dirname(path);
        yield* Effect.try({
          catch: (error) =>
            new PathResolutionError({
              cause: error,
              message: `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
              path: dir,
            }),
          try: () => {
            mkdirSync(dir, { recursive: true });
          },
        });

        // Write file
        yield* Effect.try({
          catch: (error) =>
            new FileWriteError({
              cause: error,
              message: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
              path,
            }),
          try: () => {
            writeFileSync(path, content, "utf8");
          },
        });
      }),

    writeJson: <T>(path: string, data: T) =>
      Effect.gen(function* writeJson() {
        const content = JSON.stringify(data, null, 2);

        // Ensure parent directory exists
        const dir = dirname(path);
        yield* Effect.try({
          catch: (error) =>
            new PathResolutionError({
              cause: error,
              message: `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
              path: dir,
            }),
          try: () => {
            mkdirSync(dir, { recursive: true });
          },
        });

        // Write file
        yield* Effect.try({
          catch: (error) =>
            new FileWriteError({
              cause: error,
              message: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
              path,
            }),
          try: () => {
            writeFileSync(path, content, "utf8");
          },
        });
      }),
  };
}

/**
 * Live FileSystemService Layer
 * Provides the standard filesystem implementation using Node.js fs
 */
export const FileSystemLive = Layer.succeed(
  FileSystem,
  makeFileSystemService(),
);

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock FileSystemService for testing
 * All operations return empty/default values unless overridden
 *
 * @example
 * ```typescript
 * const mockFs = makeTestFileSystem({
 *   readFile: (path) =>
 *     path === "/test.txt"
 *       ? Effect.succeed("test content")
 *       : Effect.fail(new FileNotFoundError({ path, message: "Not found" })),
 * });
 *
 * const result = await Effect.runPromise(
 *   program.pipe(Effect.provide(mockFs))
 * );
 * ```
 */
export function makeTestFileSystem(
  overrides: Partial<FileSystemService> = {},
): Layer.Layer<FileSystem> {
  const defaults: FileSystemService = {
    exists: () => Effect.succeed(false),
    mkdirp: () => Effect.void,
    readDirectory: () => Effect.succeed([]),
    readFile: (path) =>
      Effect.fail(
        new FileNotFoundError({ message: `File not found: ${path}`, path }),
      ),
    readJson: (path) =>
      Effect.fail(
        new FileNotFoundError({ message: `File not found: ${path}`, path }),
      ),
    writeFile: () => Effect.void,
    writeJson: () => Effect.void,
  };

  return Layer.succeed(FileSystem, { ...defaults, ...overrides });
}

/* eslint-disable perfectionist/sort-modules, import/exports-last */

import log from "@lib/log";
import {
  createNumberedFile,
  type CreateResult,
  type FileSystem,
  FileSystemLive,
  getContextRootPath,
} from "@tools/lib/effect";
import { FileSystem as FileSystemService } from "@tools/lib/effect";
import { Effect } from "effect";
import { join } from "node:path";

// =============================================================================
// Types
// =============================================================================

const TASKS_DIR = "docs/planning/tasks";
const STORIES_DIR = "docs/planning/stories";

interface StoryInfo {
  filename: string;
  name: string;
  number: string;
}

interface TaskCreateOptions {
  dir?: string;
  // For testing: override stories directory lookup
  storiesDirectory?: string;
  story?: string;
}

// =============================================================================
// Effect-based Task Errors
// =============================================================================

class TaskError extends Error {
  override name = "TaskError";

  constructor(
    message: string,
    public override cause?: Error,
  ) {
    super(message);
  }
}

// =============================================================================
// Effect-based implementation
// =============================================================================

/**
 * Find a story file by its number
 */
function findStoryFile(
  storyNumber: string,
  customStoriesDirectory?: string,
): Effect.Effect<StoryInfo, TaskError, FileSystem> {
  return Effect.gen(function* findStoryFileGen() {
    const fs = yield* FileSystemService;

    // Get stories directory
    const rootPath = yield* Effect.catchTag(
      getContextRootPath(),
      "PathResolutionError",
      (error) =>
        Effect.fail(
          new TaskError(`Cannot resolve context root: ${error.message}`),
        ),
    );

    const storiesDirectory =
      customStoriesDirectory ?? join(rootPath, STORIES_DIR);

    // Normalize story number to 3-digit format
    const normalizedNumber = storyNumber.replace(/^0+/, "").padStart(3, "0");

    // Read directory contents
    const files = yield* Effect.catchTags(fs.readDirectory(storiesDirectory), {
      FileNotFoundError: () =>
        Effect.fail(
          new TaskError(
            `Stories directory not found: ${storiesDirectory}. Create a story first with 'aaa story create'.`,
          ),
        ),
      FileReadError: (error) =>
        Effect.fail(
          new TaskError(`Failed to read stories directory: ${error.message}`),
        ),
    });

    // Find files matching the pattern NNN-*.md
    const pattern = new RegExp(`^${normalizedNumber}-(.+)\\.md$`);
    const matches = files.filter((file) => pattern.test(file));

    if (matches.length === 0) {
      const availableStories =
        files.filter((f) => /^\d{3}-.+\.md$/.test(f)).join(", ") || "none";
      return yield* Effect.fail(
        new TaskError(
          `Story ${normalizedNumber} not found in ${storiesDirectory}. Available stories: ${availableStories}`,
        ),
      );
    }

    if (matches.length > 1) {
      return yield* Effect.fail(
        new TaskError(
          `Multiple stories found for ${normalizedNumber}: ${matches.join(", ")}. This should not happen.`,
        ),
      );
    }

    // We've verified matches.length === 1 above, so this is safe
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const filename = matches[0]!;
    const nameMatch = pattern.exec(filename);
    const storyName = nameMatch?.[1] ?? "";

    return { filename, name: storyName, number: normalizedNumber };
  });
}

/**
 * Generate a task file using Effect
 */
function generateTaskFileEffect(
  name: string,
  options: TaskCreateOptions = {},
): Effect.Effect<CreateResult, Error, FileSystem> {
  return Effect.gen(function* generateTaskFileGen() {
    // Optionally find story info
    const storyInfo: StoryInfo | undefined =
      options.story === undefined
        ? undefined
        : yield* findStoryFile(options.story, options.storiesDirectory);

    // Create the numbered file
    const result = yield* Effect.catchAll(
      createNumberedFile(name, {
        customDirectory: options.dir,
        defaultDir: TASKS_DIR,
        template: renderTaskTemplate(name, storyInfo),
      }),
      (error) =>
        Effect.fail(
          new TaskError(`Failed to create task file: ${error.message}`),
        ),
    );

    return result;
  });
}

/**
 * Generate task file content template
 */
function renderTaskTemplate(name: string, storyInfo?: StoryInfo): string {
  const storyLink =
    storyInfo === undefined
      ? ""
      : `**Story:** [${storyInfo.name}](../stories/${storyInfo.filename})\n\n`;

  return `## Task: ${name}

${storyLink}### Goal
[One sentence: what should be true when this is done?]

### Context
[Why this matters. Current state, what triggered this, constraints]

### Plan
1. [First concrete action]
2. [Continue as needed]

### Acceptance Criteria
- [ ] [Specific, testable outcome]

### Test Plan
- [ ] [What tests to add/run]

### Scope
- **In:** [What this includes]
- **Out:** [What this explicitly excludes]

### Notes
[Optional: risks, edge cases, investigation findings]
`;
}

// =============================================================================
// Exports
// =============================================================================

/**
 * Generate a task file (for programmatic use)
 * Returns an Effect that can be composed with other effects
 */
export function createTask(
  name: string,
  options: TaskCreateOptions = {},
): Effect.Effect<CreateResult, Error, FileSystem> {
  return generateTaskFileEffect(name, options);
}

/**
 * Commander.js action handler for task create command
 * Runs the Effect program and handles output/errors
 */
async function createTaskCommand(
  name: string,
  options: TaskCreateOptions,
): Promise<void> {
  const program = generateTaskFileEffect(name, options).pipe(
    Effect.provide(FileSystemLive),
  );

  try {
    const result = await Effect.runPromise(program);
    // Output just the filepath for CLI consumption
    log.plain(result.filepath);
  } catch (error: unknown) {
    if (error instanceof TaskError) {
      log.error(error.message);
    } else if (error instanceof Error) {
      log.error(`Failed to create task: ${error.message}`);
    }
    process.exit(1);
  }
}

export type { TaskCreateOptions };
export default createTaskCommand;

/* eslint-disable perfectionist/sort-modules, import/exports-last */

import log from "@lib/log";
import {
  createNumberedFile,
  type CreateResult,
  type FileSystem,
  FileSystemLive,
} from "@tools/lib/effect";
import { Effect } from "effect";

// =============================================================================
// Types
// =============================================================================

const STORIES_DIR = "docs/planning/stories";

interface StoryCreateOptions {
  dir?: string;
}

// =============================================================================
// Effect-based Story Errors
// =============================================================================

class StoryError extends Error {
  override name = "StoryError";

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
 * Generate story file content template
 */
function renderStoryTemplate(name: string): string {
  return `## Story: ${name}

### Narrative
As a [persona], I want [capability] so that [benefit].

### Persona
[Who is this user? What do they care about?]

### Context
[Why now? Business driver, user feedback]

### Acceptance Criteria
- [ ] [User-visible outcome]

### Tasks
- [ ] [Link to tasks when created]

### Notes
[Optional: mockups, user research, risks]
`;
}

/**
 * Generate a story file using Effect
 */
function generateStoryFileEffect(
  name: string,
  options: StoryCreateOptions = {},
): Effect.Effect<CreateResult, Error, FileSystem> {
  return Effect.gen(function* generateStoryFile() {
    // Create the numbered file
    const result = yield* Effect.catchAll(
      createNumberedFile(name, {
        customDirectory: options.dir,
        defaultDir: STORIES_DIR,
        template: renderStoryTemplate(name),
      }),
      (error) =>
        Effect.fail(
          new StoryError(`Failed to create story file: ${error.message}`),
        ),
    );

    return result;
  });
}

// =============================================================================
// Exports
// =============================================================================

/**
 * Generate a story file (for programmatic use)
 * Returns an Effect that can be composed with other effects
 */
export function createStory(
  name: string,
  options: StoryCreateOptions = {},
): Effect.Effect<CreateResult, Error, FileSystem> {
  return generateStoryFileEffect(name, options);
}

/**
 * Commander.js action handler for story create command
 * Runs the Effect program and handles output/errors
 */
async function createStoryCommand(
  name: string,
  options: StoryCreateOptions,
): Promise<void> {
  const program = generateStoryFileEffect(name, options).pipe(
    Effect.provide(FileSystemLive),
  );

  try {
    const result = await Effect.runPromise(program);
    // Output just the filepath for CLI consumption
    log.plain(result.filepath);
  } catch (error: unknown) {
    if (error instanceof StoryError) {
      log.error(error.message);
    } else if (error instanceof Error) {
      log.error(`Failed to create story: ${error.message}`);
    }
    process.exit(1);
  }
}

export type { StoryCreateOptions };
export default createStoryCommand;

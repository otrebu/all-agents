import log from "@lib/log";
import { createNumberedFile, type CreateResult } from "@lib/numbered-files";

// Custom Error
class StoryError extends Error {
  override name = "StoryError";

  constructor(
    message: string,
    public override cause?: Error,
  ) {
    super(message);
  }
}

const STORIES_DIR = "docs/planning/stories";

interface StoryCreateOptions {
  dir?: string;
}

function createStory(
  name: string,
  options: StoryCreateOptions = {},
): CreateResult {
  return createNumberedFile(name, {
    customDirectory: options.dir,
    defaultDir: STORIES_DIR,
  });
}

function createStoryCommand(name: string, options: StoryCreateOptions): void {
  try {
    const result = createStory(name, options);
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

export { createStory };
export type { StoryCreateOptions };
export default createStoryCommand;

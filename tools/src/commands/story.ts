import log from "@lib/log";
import { createNumberedFile, type CreateResult } from "@lib/numbered-files";
import { resolveMilestonePath } from "@tools/commands/ralph/config";
import {
  formatStoryFilename,
  nextArtifactNumber,
} from "@tools/commands/ralph/naming";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

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

interface StoryConcatOptions {
  milestone: string;
  output?: string;
}

interface StoryCreateOptions {
  dir?: string;
  milestone?: string;
}

function concatenateMilestoneStories(milestoneNameOrPath: string): string {
  const milestonePath = resolveMilestonePath(milestoneNameOrPath);
  const storiesDirectory = join(milestonePath, "stories");

  const entries = readStoriesDirectoryEntries(storiesDirectory);

  const storyFiles = entries
    .filter((entry) => entry.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));

  if (storyFiles.length === 0) {
    throw new StoryError(`No story files found in ${storiesDirectory}`);
  }

  const blocks = storyFiles.map((filename) => {
    const filepath = join(storiesDirectory, filename);
    const storyId = basename(filename, ".md");
    const content = readFileSync(filepath, "utf8").trimEnd();
    return `---STORY: ${storyId}---\n${content}\n`;
  });

  return blocks.join("\n");
}

function concatStoriesCommand(options: StoryConcatOptions): void {
  try {
    const concatenated = concatenateMilestoneStories(options.milestone);

    if (options.output !== undefined && options.output !== "") {
      const outputPath = resolve(options.output);
      writeFileSync(outputPath, concatenated);
      log.plain(outputPath);
      return;
    }

    process.stdout.write(concatenated);
  } catch (error: unknown) {
    if (error instanceof StoryError) {
      log.error(error.message);
    } else if (error instanceof Error) {
      log.error(`Failed to concatenate stories: ${error.message}`);
    }
    process.exit(1);
  }
}

function createStoryCommand(name: string, options: StoryCreateOptions): void {
  try {
    if (options.milestone === undefined && options.dir === undefined) {
      log.warn(
        "Creating stories in docs/planning/stories is deprecated; use --milestone <name|path> for milestone-scoped placement.",
      );
    }

    const result = generateStoryFile(name, options);
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

function generateStoryFile(
  name: string,
  options: StoryCreateOptions = {},
): CreateResult {
  if (options.milestone !== undefined && options.milestone !== "") {
    const milestonePath = resolveMilestonePath(options.milestone);
    const storiesDirectory = join(milestonePath, "stories");

    mkdirSync(storiesDirectory, { recursive: true });
    const number = nextArtifactNumber(storiesDirectory);
    const filename = formatStoryFilename(name, number);
    const filepath = resolve(storiesDirectory, filename);
    writeFileSync(filepath, renderStoryTemplate(name));

    return { filepath, number };
  }

  return createNumberedFile(name, {
    customDirectory: options.dir,
    defaultDir: STORIES_DIR,
    template: renderStoryTemplate(name),
  });
}

function readStoriesDirectoryEntries(storiesDirectory: string): Array<string> {
  try {
    return readdirSync(storiesDirectory);
  } catch (error: unknown) {
    throw new StoryError(
      `No stories directory found at ${storiesDirectory}`,
      error instanceof Error ? error : undefined,
    );
  }
}

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

export {
  concatenateMilestoneStories,
  concatStoriesCommand,
  generateStoryFile as createStory,
};
export type { StoryConcatOptions, StoryCreateOptions };
export default createStoryCommand;

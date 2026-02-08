import log from "@lib/log";
import { createNumberedFile, type CreateResult } from "@lib/numbered-files";
import { resolveMilestonePath } from "@tools/commands/ralph/config";
import {
  formatTaskFilename,
  nextArtifactNumber,
} from "@tools/commands/ralph/naming";
import { getContextRoot } from "@tools/utils/paths";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Custom Error
class TaskError extends Error {
  override name = "TaskError";

  constructor(
    message: string,
    public override cause?: Error,
  ) {
    super(message);
  }
}

const TASKS_DIR = "docs/planning/tasks";
const STORIES_DIR = "docs/planning/stories";

interface StoryInfo {
  filename: string;
  name: string;
  number: string;
}

interface TaskCreateOptions {
  dir?: string;
  milestone?: string;
  // For testing: override stories directory lookup
  storiesDirectory?: string;
  story?: string;
}

function createTaskCommand(name: string, options: TaskCreateOptions): void {
  try {
    if (options.milestone === undefined && options.dir === undefined) {
      log.warn(
        "Creating tasks in docs/planning/tasks is deprecated; use --milestone <name|path> for milestone-scoped placement.",
      );
    }

    const result = generateTaskFile(name, options);
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

function findStoryFile(
  storyNumber: string,
  customStoriesDirectory?: string,
): StoryInfo {
  const storiesDirectory =
    customStoriesDirectory ?? join(getContextRoot(), STORIES_DIR);

  // Normalize story number to 3-digit format
  const normalizedNumber = storyNumber.replace(/^0+/, "").padStart(3, "0");

  let files: Array<string> = [];
  try {
    files = readdirSync(storiesDirectory);
  } catch {
    throw new TaskError(
      `Stories directory not found: ${storiesDirectory}. Create a story first with 'aaa story create'.`,
    );
  }

  // Find files matching the pattern NNN-*.md
  const pattern = new RegExp(`^${normalizedNumber}-(.+)\\.md$`);
  const matches = files.filter((file) => pattern.test(file));

  if (matches.length === 0) {
    throw new TaskError(
      `Story ${normalizedNumber} not found in ${storiesDirectory}. Available stories: ${files.filter((f) => /^\d{3}-.+\.md$/.test(f)).join(", ") || "none"}`,
    );
  }

  if (matches.length > 1) {
    throw new TaskError(
      `Multiple stories found for ${normalizedNumber}: ${matches.join(", ")}. This should not happen.`,
    );
  }

  // We've verified matches.length === 1 above, so this is safe
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const filename = matches[0]!;
  const nameMatch = pattern.exec(filename);
  const storyName = nameMatch?.[1] ?? "";

  return { filename, name: storyName, number: normalizedNumber };
}

function generateTaskFile(
  name: string,
  options: TaskCreateOptions = {},
): CreateResult {
  if (options.milestone !== undefined && options.milestone !== "") {
    const milestonePath = resolveMilestonePath(options.milestone);
    const tasksDirectory = join(milestonePath, "tasks");
    const storyLookupDirectory =
      options.storiesDirectory ?? join(milestonePath, "stories");

    const storyInfo =
      options.story === undefined
        ? undefined
        : findStoryFile(options.story, storyLookupDirectory);

    mkdirSync(tasksDirectory, { recursive: true });
    const number = nextArtifactNumber(tasksDirectory);
    const filename = formatTaskFilename(name, number);
    const filepath = resolve(tasksDirectory, filename);
    writeFileSync(filepath, renderTaskTemplate(name, storyInfo));

    return { filepath, number };
  }

  const storyInfo =
    options.story === undefined
      ? undefined
      : findStoryFile(options.story, options.storiesDirectory);

  return createNumberedFile(name, {
    customDirectory: options.dir,
    defaultDir: TASKS_DIR,
    template: renderTaskTemplate(name, storyInfo),
  });
}

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

export { generateTaskFile as createTask };
export type { TaskCreateOptions };
export default createTaskCommand;

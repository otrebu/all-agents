import log from "@lib/log";
import { createNumberedFile, type CreateResult } from "@lib/numbered-files";

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

interface TaskCreateOptions {
  dir?: string;
}

function createTaskCommand(name: string, options: TaskCreateOptions): void {
  try {
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

function generateTaskFile(
  name: string,
  options: TaskCreateOptions = {},
): CreateResult {
  return createNumberedFile(name, {
    customDirectory: options.dir,
    defaultDir: TASKS_DIR,
    template: renderTaskTemplate(name),
  });
}

function renderTaskTemplate(name: string): string {
  return `## Task: ${name}

### Goal
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

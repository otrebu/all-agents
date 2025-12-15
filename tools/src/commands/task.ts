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

function createTask(
  name: string,
  options: TaskCreateOptions = {},
): CreateResult {
  return createNumberedFile(name, {
    customDirectory: options.dir,
    defaultDir: TASKS_DIR,
  });
}

function createTaskCommand(name: string, options: TaskCreateOptions): void {
  try {
    const result = createTask(name, options);
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

export { createTask };
export type { TaskCreateOptions };
export default createTaskCommand;

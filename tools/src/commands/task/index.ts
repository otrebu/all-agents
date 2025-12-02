import log from "@lib/log";
import { createNumberedFile, type CreateResult } from "@lib/numbered-files";

import TaskError from "./types";

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

function runTaskCreateCli(name: string, options: TaskCreateOptions): void {
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

export { createTask, runTaskCreateCli };
export type { TaskCreateOptions };

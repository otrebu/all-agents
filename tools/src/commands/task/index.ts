import log from "@lib/log.js";
import { getProjectRoot } from "@tools/utils/paths.js";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import TaskError from "./types.js";

const TASKS_DIR = "docs/planning/tasks";
const TASK_PATTERN = /^(?<num>\d+)-.*\.md$/;

interface CreateTaskResult {
  filepath: string;
  number: string;
}

interface TaskCreateOptions {
  dir?: string;
}

function createTask(
  name: string,
  options: TaskCreateOptions = {},
): CreateTaskResult {
  const root = getProjectRoot();

  // Resolve directory: absolute paths used as-is, relative resolved from project root
  const tasksDirectory = resolveTasksDirectory(root, options.dir);

  // Ensure tasks directory exists
  if (!existsSync(tasksDirectory)) {
    mkdirSync(tasksDirectory, { recursive: true });
  }

  const number = getNextTaskNumber(tasksDirectory);
  const filename = `${number}-${name}.md`;
  const filepath = resolve(tasksDirectory, filename);

  // Create empty file
  writeFileSync(filepath, "");

  return { filepath, number };
}

function getNextTaskNumber(tasksDirectory: string): string {
  if (!existsSync(tasksDirectory)) {
    return "001";
  }

  const files = readdirSync(tasksDirectory);
  const numbers = files
    .map((file) => {
      const match = TASK_PATTERN.exec(file);
      const numberString = match?.groups?.num;
      return numberString !== undefined && numberString !== ""
        ? Number.parseInt(numberString, 10)
        : 0;
    })
    .filter((n) => n > 0);

  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  return String(max + 1).padStart(3, "0");
}

function resolveTasksDirectory(
  root: string,
  customDirectory: string | undefined,
): string {
  if (customDirectory === undefined || customDirectory === "") {
    return resolve(root, TASKS_DIR);
  }
  if (isAbsolute(customDirectory)) {
    return customDirectory;
  }
  return resolve(root, customDirectory);
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

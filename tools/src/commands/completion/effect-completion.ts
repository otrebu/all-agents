/**
 * Effect-based completion utilities
 *
 * Provides Effect wrappers for shell completion generation:
 * - Dynamic completions for milestones, stories, tasks
 * - Shell completion script generation
 *
 * @module
 */

/* eslint-disable import/exports-last, @typescript-eslint/no-shadow, @typescript-eslint/naming-convention, unicorn/prevent-abbreviations, no-continue */

import { discoverMilestones } from "@lib/milestones";
import { FileSystem } from "@tools/lib/effect";
import { findProjectRoot } from "@tools/utils/paths";
import { Effect } from "effect";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

// =============================================================================
// Types
// =============================================================================

export type CompletionType = "command" | "milestone" | "story" | "task";
export type Shell = "bash" | "fish" | "zsh";

const VALID_SHELLS = ["bash", "zsh", "fish"] as const;
const TASK_PATTERN = /^(?:TASK-)?\d{3}-.*\.md$/;

// =============================================================================
// Discovery Functions (Effect-based)
// =============================================================================

/**
 * Collect task files from a directory (Effect version)
 */
export function collectTasksFromDirectoryEffect(
  baseDirectory: string,
  dirPath: string,
): Effect.Effect<Array<string>, never, FileSystem> {
  return Effect.gen(function* collectTasks() {
    const fs = yield* FileSystem;

    const exists = yield* fs.exists(dirPath);
    if (!exists) return [];

    const result = yield* Effect.either(fs.readDirectory(dirPath));
    if (result._tag === "Left") return [];

    const files = result.right;
    const tasks: Array<string> = [];

    for (const f of files) {
      if (TASK_PATTERN.test(f)) {
        const relativePath = path.relative(
          baseDirectory,
          path.join(dirPath, f),
        );
        tasks.push(relativePath);
      }
    }

    return tasks;
  });
}

/**
 * Find milestones (Effect version)
 */
export function findMilestonesEffect(): Effect.Effect<Array<string>> {
  return Effect.sync(() => {
    try {
      const milestones = discoverMilestones();
      return milestones.map((m) => `docs/planning/milestones/${m.slug}`);
    } catch {
      return [];
    }
  });
}

/**
 * Find story files (sync)
 */
export function findStories(): Array<string> {
  const projectRoot = findProjectRoot();
  if (projectRoot === null) return [];

  const stories: Array<string> = [];
  const pattern = /^\d{3}-.*\.md$/;

  // Global stories
  const globalDirectory = path.join(projectRoot, "docs/planning/stories");
  if (existsSync(globalDirectory)) {
    try {
      for (const f of readdirSync(globalDirectory)) {
        if (pattern.test(f)) {
          const relativePath = path.relative(
            projectRoot,
            path.join(globalDirectory, f),
          );
          stories.push(relativePath);
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Milestone stories
  const milestonesDirectory = path.join(
    projectRoot,
    "docs/planning/milestones",
  );
  if (!existsSync(milestonesDirectory)) return stories;

  try {
    const directories = readdirSync(milestonesDirectory, {
      withFileTypes: true,
    }).filter((d) => d.isDirectory());
    for (const m of directories) {
      const storyDirectory = path.join(milestonesDirectory, m.name, "stories");
      if (!existsSync(storyDirectory)) {
        continue;
      }

      const files = readdirSync(storyDirectory);
      for (const f of files) {
        if (pattern.test(f)) {
          const relativePath = path.relative(
            projectRoot,
            path.join(storyDirectory, f),
          );
          stories.push(relativePath);
        }
      }
    }
  } catch {
    /* ignore */
  }

  return stories;
}

/**
 * Find story files (Effect version)
 */
export function findStoriesEffect(): Effect.Effect<
  Array<string>,
  never,
  FileSystem
> {
  return Effect.gen(function* findStories() {
    const fs = yield* FileSystem;
    const projectRoot = findProjectRoot();
    if (projectRoot === null) return [];

    const stories: Array<string> = [];
    const pattern = /^\d{3}-.*\.md$/;

    // Global stories
    const globalDirectory = path.join(projectRoot, "docs/planning/stories");
    const globalExists = yield* fs.exists(globalDirectory);

    if (globalExists) {
      const result = yield* Effect.either(fs.readDirectory(globalDirectory));
      if (result._tag === "Right") {
        for (const f of result.right) {
          if (pattern.test(f)) {
            const relativePath = path.relative(
              projectRoot,
              path.join(globalDirectory, f),
            );
            stories.push(relativePath);
          }
        }
      }
    }

    // Milestone stories
    const milestonesDirectory = path.join(
      projectRoot,
      "docs/planning/milestones",
    );
    const milestonesExists = yield* fs.exists(milestonesDirectory);
    if (!milestonesExists) return stories;

    const directoriesResult = yield* Effect.either(
      fs.readDirectory(milestonesDirectory),
    );
    if (directoriesResult._tag === "Left") return stories;

    for (const m of directoriesResult.right) {
      const milestoneDir = path.join(milestonesDirectory, m);
      const storyDirectory = path.join(milestoneDir, "stories");

      const storyDirExists = yield* fs.exists(storyDirectory);
      if (!storyDirExists) continue;

      const filesResult = yield* Effect.either(
        fs.readDirectory(storyDirectory),
      );
      if (filesResult._tag === "Left") continue;

      for (const f of filesResult.right) {
        if (pattern.test(f)) {
          const relativePath = path.relative(
            projectRoot,
            path.join(storyDirectory, f),
          );
          stories.push(relativePath);
        }
      }
    }

    return stories;
  });
}

// =============================================================================
// Synchronous versions for backward compatibility
// =============================================================================

/**
 * Find task files (sync)
 */
export function findTasks(): Array<string> {
  const projectRoot = findProjectRoot();
  if (projectRoot === null) return [];

  const tasks: Array<string> = [];

  // Global tasks
  const globalDirectory = path.join(projectRoot, "docs/planning/tasks");
  tasks.push(...collectTasksFromDirectory(projectRoot, globalDirectory));

  // Milestone tasks
  const milestonesDirectory = path.join(
    projectRoot,
    "docs/planning/milestones",
  );
  if (existsSync(milestonesDirectory)) {
    try {
      const directories = readdirSync(milestonesDirectory, {
        withFileTypes: true,
      }).filter((d) => d.isDirectory());
      for (const m of directories) {
        const taskDirectory = path.join(milestonesDirectory, m.name, "tasks");
        tasks.push(...collectTasksFromDirectory(projectRoot, taskDirectory));
      }
    } catch {
      /* ignore */
    }
  }

  return tasks;
}

/**
 * Find task files (Effect version)
 */
export function findTasksEffect(): Effect.Effect<
  Array<string>,
  never,
  FileSystem
> {
  return Effect.gen(function* findTasks() {
    const fs = yield* FileSystem;
    const projectRoot = findProjectRoot();
    if (projectRoot === null) return [];

    const tasks: Array<string> = [];

    // Global tasks
    const globalDirectory = path.join(projectRoot, "docs/planning/tasks");
    const globalTasks = yield* collectTasksFromDirectoryEffect(
      projectRoot,
      globalDirectory,
    );
    tasks.push(...globalTasks);

    // Milestone tasks
    const milestonesDirectory = path.join(
      projectRoot,
      "docs/planning/milestones",
    );
    const milestonesExists = yield* fs.exists(milestonesDirectory);
    if (!milestonesExists) return tasks;

    const directoriesResult = yield* Effect.either(
      fs.readDirectory(milestonesDirectory),
    );
    if (directoriesResult._tag === "Left") return tasks;

    for (const m of directoriesResult.right) {
      const taskDirectory = path.join(milestonesDirectory, m, "tasks");
      const milestoneTasks = yield* collectTasksFromDirectoryEffect(
        projectRoot,
        taskDirectory,
      );
      tasks.push(...milestoneTasks);
    }

    return tasks;
  });
}

/**
 * Handle __complete command (sync version)
 */
export function handleCompletion(): void {
  const type = process.argv[3];

  try {
    switch (type) {
      case "command": {
        console.log(
          [
            "download",
            "extract-conversations",
            "gh-search",
            "gemini-research",
            "notify",
            "parallel-search",
            "setup",
            "uninstall",
            "sync-context",
            "task",
            "story",
            "ralph",
            "review",
            "completion",
          ].join("\n"),
        );
        break;
      }
      case "milestone": {
        const milestones = discoverMilestones();
        console.log(
          milestones
            .map((m) => `docs/planning/milestones/${m.slug}`)
            .join("\n"),
        );
        break;
      }
      case "story": {
        const stories = findStories();
        console.log(stories.join("\n"));
        break;
      }
      case "task": {
        const tasks = findTasks();
        console.log(tasks.join("\n"));
        break;
      }
      default: {
        // Silent failure - unknown type
        break;
      }
    }
  } catch {
    // Silent failure - completion errors go to stderr
  }
}

// =============================================================================
// Completion Handling
// =============================================================================

/**
 * Handle __complete command for dynamic completions (Effect version)
 */
export function handleCompletionEffect(
  type: string,
): Effect.Effect<string, never, FileSystem> {
  return Effect.gen(function* handleCompletion() {
    switch (type) {
      case "command": {
        return [
          "download",
          "extract-conversations",
          "gh-search",
          "gemini-research",
          "notify",
          "parallel-search",
          "setup",
          "uninstall",
          "sync-context",
          "task",
          "story",
          "ralph",
          "review",
          "completion",
        ].join("\n");
      }
      case "milestone": {
        const milestones = yield* findMilestonesEffect();
        return milestones.join("\n");
      }
      case "story": {
        const stories = yield* findStoriesEffect();
        return stories.join("\n");
      }
      case "task": {
        const tasks = yield* findTasksEffect();
        return tasks.join("\n");
      }
      default: {
        return "";
      }
    }
  });
}

/**
 * Check if we're in completion mode
 */
export function isCompletionMode(): boolean {
  return (
    process.env.COMP_LINE !== undefined || process.argv[2] === "__complete"
  );
}

/**
 * Validate shell type
 */
export function isValidShell(shell: string): shell is Shell {
  return VALID_SHELLS.includes(shell as Shell);
}

/**
 * Collect task files from directory (sync)
 */
function collectTasksFromDirectory(
  baseDirectory: string,
  dirPath: string,
): Array<string> {
  const tasks: Array<string> = [];
  if (!existsSync(dirPath)) return tasks;

  try {
    for (const f of readdirSync(dirPath)) {
      if (TASK_PATTERN.test(f)) {
        const relativePath = path.relative(
          baseDirectory,
          path.join(dirPath, f),
        );
        tasks.push(relativePath);
      }
    }
  } catch {
    /* ignore */
  }
  return tasks;
}

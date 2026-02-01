/**
 * Effect-based build loop for Ralph autonomous development framework
 *
 * This module provides Effect wrappers for the Ralph build loop:
 * - Subtask loading/saving via FileSystemService
 * - Hook execution via Effect.all for parallel hooks
 * - Build state management via Effect.Ref
 *
 * @see docs/planning/ralph-migration-implementation-plan.md
 */

/* eslint-disable unicorn/throw-new-error */

import {
  type ClaudeError,
  type ClaudeResponse,
  ClaudeService,
  type FileNotFoundError,
  type FileReadError,
  FileSystem,
  type FileWriteError,
  Logger,
  type PathResolutionError,
} from "@tools/lib/effect";
import { Context, Data, Effect, Layer, Ref } from "effect";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type {
  BuildOptions,
  HookAction,
  IterationStatus,
  Subtask,
  SubtasksFile,
} from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Build state managed via Effect.Ref
 */
interface BuildState {
  /** Map of subtask ID to attempt count */
  attempts: Map<string, number>;
  /** Subtasks completed during this build run */
  completedThisRun: Array<{ attempts: number; id: string }>;
  /** Current iteration number */
  iteration: number;
}

/**
 * Context passed to hook execution
 */
interface HookContext {
  /** Human-readable message describing what triggered the hook */
  message: string;
  /** Optional subtask ID for context */
  subtaskId?: string;
}

/**
 * HookService interface for executing build hooks
 */
interface HookServiceImpl {
  /**
   * Execute a hook action
   */
  readonly execute: (
    action: HookAction,
    hookName: string,
    context: HookContext,
  ) => Effect.Effect<void, never, Logger>;

  /**
   * Execute all actions for a hook in parallel
   */
  readonly executeAll: (
    actions: Array<HookAction>,
    hookName: string,
    context: HookContext,
  ) => Effect.Effect<void, never, Logger>;
}

/**
 * Context for iteration processing
 */
interface IterationContext {
  contextRoot: string;
  currentAttempts: number;
  currentSubtask: Subtask;
  iteration: number;
  maxIterations: number;
  prompt: string;
  remaining: number;
  subtasksPath: string;
}

/**
 * Result from iteration processing
 */
interface IterationResult {
  costUsd: number;
  didComplete: boolean;
  durationMs: number;
  response: ClaudeResponse | null;
}

/**
 * Union of all Ralph build errors
 */
type RalphBuildError =
  | ClaudeError
  | FileNotFoundError
  | FileReadError
  | FileWriteError
  | MaxIterationsExceededError
  | NoSubtasksError
  | PathResolutionError
  | PromptNotFoundError
  | SubtasksNotFoundError
  | SubtasksParseError;

/**
 * SubtasksService interface for loading/saving subtasks files
 */
interface SubtasksServiceImpl {
  /**
   * Count remaining (pending) subtasks
   */
  readonly countRemaining: (subtasks: Array<Subtask>) => Effect.Effect<number>;

  /**
   * Get the next pending subtask
   */
  readonly getNextSubtask: (
    subtasks: Array<Subtask>,
  ) => Effect.Effect<Subtask, NoSubtasksError>;

  /**
   * Load subtasks file from disk
   */
  readonly load: (
    subtasksPath: string,
  ) => Effect.Effect<SubtasksFile, SubtasksNotFoundError | SubtasksParseError>;

  /**
   * Save subtasks file to disk
   */
  readonly save: (
    subtasksPath: string,
    data: SubtasksFile,
  ) => Effect.Effect<void, FileWriteError | PathResolutionError, FileSystem>;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * HookService tag for Effect dependency injection
 */
class HookService extends Context.Tag("HookService")<
  HookService,
  HookServiceImpl
>() {}

/**
 * Error when max iterations exceeded for a subtask
 */
class MaxIterationsExceededError extends Data.TaggedError(
  "MaxIterationsExceededError",
)<{
  readonly attempts: number;
  readonly maxIterations: number;
  readonly message: string;
  readonly subtaskId: string;
}> {}

/**
 * Error when no subtasks are pending
 */
class NoSubtasksError extends Data.TaggedError("NoSubtasksError")<{
  readonly message: string;
}> {}

/**
 * Error when prompt file is not found
 */
class PromptNotFoundError extends Data.TaggedError("PromptNotFoundError")<{
  readonly message: string;
  readonly path: string;
}> {}

/**
 * Error when subtasks file is not found
 */
class SubtasksNotFoundError extends Data.TaggedError("SubtasksNotFoundError")<{
  readonly message: string;
  readonly path: string;
}> {}

// =============================================================================
// Service Tags
// =============================================================================

/**
 * Error when subtasks file cannot be parsed
 */
class SubtasksParseError extends Data.TaggedError("SubtasksParseError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly path: string;
}> {}

/**
 * SubtasksService tag for Effect dependency injection
 */
class SubtasksService extends Context.Tag("SubtasksService")<
  SubtasksService,
  SubtasksServiceImpl
>() {}

// =============================================================================
// Constants
// =============================================================================

/** Default prompt path relative to context root */
const ITERATION_PROMPT_PATH =
  "context/workflows/ralph/building/ralph-iteration.md";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build the iteration prompt with subtask context
 */
function buildIterationPromptEffect(
  contextRoot: string,
  subtasksPath: string,
): Effect.Effect<string, PromptNotFoundError> {
  return Effect.gen(function* buildPromptGen() {
    const promptPath = path.join(contextRoot, ITERATION_PROMPT_PATH);

    if (!existsSync(promptPath)) {
      return yield* Effect.fail(
        new PromptNotFoundError({
          message: `Iteration prompt not found: ${promptPath}`,
          path: promptPath,
        }),
      );
    }

    const promptContent = readFileSync(promptPath, "utf8");

    const subtasksDirectory = path.dirname(subtasksPath);
    const progressPath = path.join(subtasksDirectory, "PROGRESS.md");

    const extraContext = `Execute one iteration of the Ralph build loop.

Follow the instructions in @${promptPath}

Subtasks file: @${subtasksPath}

Context files:
@${path.join(contextRoot, "CLAUDE.md")}
@${progressPath}

After completing ONE subtask:
1. Update subtasks.json with done: true, completedAt, commitHash, sessionId
2. Append to PROGRESS.md
3. Create the commit
4. STOP - do not continue to the next subtask`;

    return `${extraContext}\n\n${promptContent}`;
  });
}

/**
 * Create initial build state
 */
function createInitialBuildState(): BuildState {
  return { attempts: new Map(), completedThisRun: [], iteration: 1 };
}

// =============================================================================
// Build Helpers
// =============================================================================

/**
 * Execute a single hook action
 */
function executeHookActionEffect(
  action: HookAction,
  hookName: string,
  context: HookContext,
): Effect.Effect<void, never, Logger> {
  return Effect.gen(function* executeHookGen() {
    const logger = yield* Logger;

    switch (action) {
      case "log": {
        yield* logger.info(`[Hook:${hookName}] ${context.message}`);
        break;
      }
      case "notify": {
        yield* Effect.sync(() => {
          const eventName = hookName.startsWith("on")
            ? `ralph:${hookName.slice(2).charAt(0).toLowerCase()}${hookName.slice(3)}`
            : `ralph:${hookName}`;

          Bun.spawn(
            ["aaa", "notify", "--event", eventName, "--quiet", context.message],
            { stderr: "pipe", stdout: "pipe" },
          );
        });
        break;
      }
      case "pause": {
        if (!process.stdin.isTTY) {
          yield* logger.info(
            `[Hook:${hookName}] Non-interactive mode detected, skipping pause`,
          );
          break;
        }

        yield* logger.info(
          `[Hook:${hookName}] Pausing for user intervention...`,
        );
        break;
      }
      default: {
        const unknownAction: never = action;
        yield* logger.warn(
          `[Hook:${hookName}] Unknown action: ${String(unknownAction)}`,
        );
      }
    }
  });
}

/**
 * Get the latest commit hash from the repository
 */
function getLatestCommitHashEffect(
  projectRoot: string,
): Effect.Effect<null | string> {
  return Effect.sync(() => {
    const proc = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
      cwd: projectRoot,
    });
    if (proc.exitCode !== 0) return null;
    return proc.stdout.toString("utf8").trim();
  });
}

// =============================================================================
// Iteration Processing
// =============================================================================

/**
 * Process a single headless iteration using Effect
 */
function processHeadlessIterationEffect(
  context: IterationContext,
): Effect.Effect<IterationResult, ClaudeError, ClaudeService | Logger> {
  return Effect.gen(function* processIterationGen() {
    const claude = yield* ClaudeService;
    const logger = yield* Logger;

    yield* logger.info("Invoking Claude (headless mode)...");

    const response = yield* claude.headless({ prompt: context.prompt });

    yield* logger.info(`Claude response received (${response.duration}ms)`);

    return {
      costUsd: response.cost,
      didComplete: false,
      durationMs: response.duration,
      response,
    };
  });
}

/**
 * Process a single supervised iteration using Effect
 */
function processSupervisedIterationEffect(
  context: IterationContext,
  promptPath: string,
  extraContext: string,
): Effect.Effect<IterationResult, ClaudeError, ClaudeService | Logger> {
  return Effect.gen(function* processSupIterationGen() {
    const claude = yield* ClaudeService;
    const logger = yield* Logger;

    yield* logger.info("Invoking Claude (supervised mode)...");

    const startTime = Date.now();
    const chatResult = yield* claude.chat({
      extraContext,
      promptPath,
      sessionName: "build iteration",
    });

    const durationMs = Date.now() - startTime;

    if (!chatResult.success && !chatResult.interrupted) {
      yield* logger.error("Supervised session failed");
    }

    yield* logger.info("Supervised session completed");

    return { costUsd: 0, didComplete: false, durationMs, response: null };
  });
}

// =============================================================================
// Build Loop
// =============================================================================

/**
 * Run the build loop using Effect.iterate
 *
 * This is the main entry point for the Effect-based build loop.
 * It iterates until all subtasks are complete or an error occurs.
 */
function runBuildEffect(
  options: BuildOptions,
  contextRoot: string,
): Effect.Effect<
  void,
  RalphBuildError,
  ClaudeService | FileSystem | HookService | Logger | SubtasksService
> {
  return Effect.gen(function* runBuildGen() {
    const logger = yield* Logger;
    const { subtasksPath } = options;

    if (!existsSync(subtasksPath)) {
      yield* Effect.fail(
        new SubtasksNotFoundError({
          message: `Subtasks file not found: ${subtasksPath}\nCreate one with: aaa ralph plan subtasks --task <task-id>`,
          path: subtasksPath,
        }),
      );
      return;
    }

    yield* logger.info("Starting Ralph build loop...");

    const stateReference = yield* Ref.make(createInitialBuildState());

    yield* Effect.iterate(false, {
      body: () => runIterationEffect(options, contextRoot, stateReference),
      while: (isComplete) => !isComplete,
    });

    yield* logger.info("Build loop completed successfully");
  });
}

/**
 * Run a single iteration of the build loop
 */
function runIterationEffect(
  options: BuildOptions,
  contextRoot: string,
  stateReference: Ref.Ref<BuildState>,
): Effect.Effect<
  boolean,
  RalphBuildError,
  ClaudeService | FileSystem | HookService | Logger | SubtasksService
> {
  return Effect.gen(function* runIterationGen() {
    const subtasksService = yield* SubtasksService;
    const hookService = yield* HookService;
    const logger = yield* Logger;

    const { maxIterations, mode, subtasksPath } = options;

    const state = yield* Ref.get(stateReference);

    const subtasksFile = yield* subtasksService.load(subtasksPath);
    const remaining = yield* subtasksService.countRemaining(
      subtasksFile.subtasks,
    );

    if (remaining === 0) {
      yield* logger.info("\nAll subtasks complete!");

      const milestone = subtasksFile.metadata?.milestoneRef ?? "unknown";
      yield* hookService.executeAll(["log", "notify"], "onMilestoneComplete", {
        message: `Milestone ${milestone} completed! All ${state.completedThisRun.length} subtasks done.`,
      });

      return true;
    }

    const currentSubtask = yield* subtasksService.getNextSubtask(
      subtasksFile.subtasks,
    );

    const currentAttempts = (state.attempts.get(currentSubtask.id) ?? 0) + 1;

    yield* Ref.update(stateReference, (s) => {
      s.attempts.set(currentSubtask.id, currentAttempts);
      return s;
    });

    if (maxIterations > 0 && currentAttempts > maxIterations) {
      yield* hookService.executeAll(
        ["log", "notify", "pause"],
        "onMaxIterationsExceeded",
        {
          message: `Subtask ${currentSubtask.id} failed after ${maxIterations} attempts`,
          subtaskId: currentSubtask.id,
        },
      );

      return yield* Effect.fail(
        new MaxIterationsExceededError({
          attempts: currentAttempts,
          maxIterations,
          message: `Max iterations (${maxIterations}) exceeded for subtask: ${currentSubtask.id}`,
          subtaskId: currentSubtask.id,
        }),
      );
    }

    yield* logger.info(
      `\n=== Iteration ${state.iteration} | Subtask ${currentSubtask.id} (attempt ${currentAttempts}/${maxIterations || "∞"}) ===`,
    );
    yield* logger.info(`Title: ${currentSubtask.title}`);
    yield* logger.info(`Remaining: ${remaining} subtasks`);

    const prompt = yield* buildIterationPromptEffect(contextRoot, subtasksPath);

    const iterationContext: IterationContext = {
      contextRoot,
      currentAttempts,
      currentSubtask,
      iteration: state.iteration,
      maxIterations,
      prompt,
      remaining,
      subtasksPath,
    };

    const iterationResult: IterationResult =
      mode === "headless"
        ? yield* processHeadlessIterationEffect(iterationContext)
        : yield* processSupervisedIterationEffect(
            iterationContext,
            path.join(contextRoot, ITERATION_PROMPT_PATH),
            `Subtasks file: @${subtasksPath}\n\nContext files:\n@${path.join(contextRoot, "CLAUDE.md")}\n@${path.join(path.dirname(subtasksPath), "PROGRESS.md")}`,
          );

    const postIterationSubtasks = yield* subtasksService.load(subtasksPath);
    const postRemaining = yield* subtasksService.countRemaining(
      postIterationSubtasks.subtasks,
    );
    const didComplete = postRemaining < remaining;

    const iterationStatus: IterationStatus = didComplete
      ? "completed"
      : "retrying";

    if (didComplete) {
      yield* Ref.update(stateReference, (s) => {
        s.attempts.delete(currentSubtask.id);
        s.completedThisRun.push({
          attempts: currentAttempts,
          id: currentSubtask.id,
        });
        return s;
      });

      yield* hookService.executeAll(["log"], "onSubtaskComplete", {
        message: `Subtask ${currentSubtask.id} completed: ${currentSubtask.title}`,
        subtaskId: currentSubtask.id,
      });
    }

    yield* logger.info(
      `\n=== Iteration ${state.iteration} ${iterationStatus} | Cost: $${iterationResult.costUsd.toFixed(4)} | Duration: ${iterationResult.durationMs}ms ===`,
    );

    yield* Ref.update(stateReference, (s) => {
      s.iteration += 1;
      return s;
    });

    return false;
  });
}

// =============================================================================
// Service Implementations
// =============================================================================

/**
 * Live implementation of HookService
 */
const makeHookService: HookServiceImpl = {
  execute: (action: HookAction, hookName: string, context: HookContext) =>
    executeHookActionEffect(action, hookName, context),

  executeAll: (
    actions: Array<HookAction>,
    hookName: string,
    context: HookContext,
  ) =>
    Effect.gen(function* executeAllHooksGen() {
      const logger = yield* Logger;

      yield* logger.info(`=== Triggering hook: ${hookName} ===`);

      yield* Effect.all(
        actions.map((action) =>
          executeHookActionEffect(action, hookName, context),
        ),
        { concurrency: "unbounded" },
      );
    }),
};

/**
 * Live implementation of SubtasksService
 */
const makeSubtasksService: SubtasksServiceImpl = {
  countRemaining: (subtasks: Array<Subtask>) =>
    Effect.succeed(subtasks.filter((s) => !s.done).length),

  getNextSubtask: (subtasks: Array<Subtask>) => {
    const pending = subtasks.find((s) => !s.done);
    if (pending === undefined) {
      return Effect.fail(
        new NoSubtasksError({ message: "All subtasks are complete" }),
      );
    }
    return Effect.succeed(pending);
  },

  load: (subtasksPath: string) =>
    Effect.gen(function* loadSubtasksGen() {
      if (!existsSync(subtasksPath)) {
        return yield* Effect.fail(
          new SubtasksNotFoundError({
            message: `Subtasks file not found: ${subtasksPath}\nCreate one with: aaa ralph plan subtasks --task <task-id>`,
            path: subtasksPath,
          }),
        );
      }

      return yield* Effect.try({
        catch: (error) =>
          new SubtasksParseError({
            cause: error,
            message: `Failed to parse subtasks file ${subtasksPath}: ${error instanceof Error ? error.message : String(error)}`,
            path: subtasksPath,
          }),
        try: () => {
          const content = readFileSync(subtasksPath, "utf8");
          return JSON.parse(content) as SubtasksFile;
        },
      });
    }),

  save: (subtasksPath: string, data: SubtasksFile) =>
    Effect.gen(function* saveSubtasksGen() {
      const fs = yield* FileSystem;
      const content = JSON.stringify(data, null, 2);
      yield* fs.writeFile(subtasksPath, `${content}\n`);
    }),
};

// =============================================================================
// Layers
// =============================================================================

/**
 * Live layer for HookService
 */
const HookServiceLive = Layer.succeed(HookService, makeHookService);

/**
 * Live layer for SubtasksService
 */
const SubtasksServiceLive = Layer.succeed(SubtasksService, makeSubtasksService);

/**
 * Combined layer for Ralph build services
 */
const RalphBuildServicesLive = Layer.mergeAll(
  SubtasksServiceLive,
  HookServiceLive,
);

// =============================================================================
// Exports
// =============================================================================

export {
  buildIterationPromptEffect,
  createInitialBuildState,
  getLatestCommitHashEffect,
  HookService,
  HookServiceLive,
  makeHookService,
  makeSubtasksService,
  MaxIterationsExceededError,
  NoSubtasksError,
  processHeadlessIterationEffect,
  processSupervisedIterationEffect,
  PromptNotFoundError,
  RalphBuildServicesLive,
  runBuildEffect,
  runIterationEffect,
  SubtasksNotFoundError,
  SubtasksParseError,
  SubtasksService,
  SubtasksServiceLive,
};

export type {
  BuildState,
  HookContext,
  HookServiceImpl,
  IterationContext,
  IterationResult,
  RalphBuildError,
  SubtasksServiceImpl,
};

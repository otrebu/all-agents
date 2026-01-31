/**
 * Task execution loop for Ralph prototype
 *
 * This module handles iterating through tasks and invoking Claude:
 * - Claude selects the next task from tasks.json (agent-driven selection)
 * - Uses 7-phase prompt: Orient, Select, Investigate, Implement, Validate, Commit, Update
 * - Agent updates tasks.json and progress.md directly
 * - Detects TASK_DONE signal to continue to next iteration
 * - Detects TASK_BLOCKED signal to handle failures
 * - Respects --max-iterations limit
 *
 * @see tasks.json structure from planning.ts
 */

import chalk from "chalk";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { type HeadlessResult, invokeClaudeHeadless } from "./claude";
import {
  type ExecutionPhase,
  type GeneratedTask,
  type GeneratedTasksFile,
} from "./planning";
import {
  appendProgressLog,
  getSessionPaths,
  readSessionState,
  updateSessionState,
} from "./temporary-session";

// =============================================================================
// Types
// =============================================================================

/**
 * Result from the full execution loop
 */
interface ExecutionLoopResult {
  /** Number of tasks that were blocked */
  blockedCount: number;
  /** Number of tasks completed */
  completedCount: number;
  /** Error message if loop failed */
  error?: string;
  /** Number of iterations executed */
  iterationsUsed: number;
  /** Whether the loop completed successfully (all tasks done or max iterations) */
  success: boolean;
}

/**
 * Options for the execution loop
 */
interface ExecutionOptions {
  /** Maximum number of iterations (default 10) */
  maxIterations?: number;
  /** Whether this is a resumed session */
  resume?: boolean;
  /** Session directory path */
  sessionDirectory: string;
}

/**
 * Structure of spike output file (spike-{id}-output.json)
 * Spikes write their findings and spawned tasks to this file
 */
interface SpikeOutput {
  /** Summary of what was learned during the spike */
  findings: string;
  /** New tasks discovered during the spike (must be implement type) */
  newTasks: Array<{
    /** Acceptance criteria for the new task */
    acceptanceCriteria: Array<string>;
    /** Short descriptive title */
    title: string;
  }>;
}

/**
 * Track whether a shutdown has been requested
 */
let isShutdownPending = false;

/**
 * Current session directory for signal handler
 */
let currentSessionDirectory: null | string = null;

/**
 * Check if shutdown was requested
 */
function isShutdownRequested(): boolean {
  return isShutdownPending;
}

/**
 * Setup SIGINT handler for graceful shutdown
 *
 * @param sessionDirectory - Path to session directory
 */
function setupSignalHandler(sessionDirectory: string): void {
  currentSessionDirectory = sessionDirectory;

  process.on("SIGINT", () => {
    if (isShutdownPending) {
      // Second SIGINT, force exit
      process.exit(1);
    }

    isShutdownPending = true;
    console.log(chalk.yellow("\n\nInterrupted! Saving state..."));

    if (currentSessionDirectory !== null) {
      updateSessionState(currentSessionDirectory, { status: "interrupted" });
      appendProgressLog(currentSessionDirectory, "Session interrupted by user");
    }

    console.log(
      chalk.dim("State saved. Resume with: aaa ralph prototype --resume"),
    );
    process.exit(0);
  });
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default maximum iterations (0 = unlimited)
 */
const DEFAULT_MAX_ITERATIONS = 0;

/**
 * Signal that indicates task is complete
 */
const TASK_DONE_SIGNAL = "TASK_DONE";

/**
 * Signal that indicates task is blocked
 */
const TASK_BLOCKED_SIGNAL = "TASK_BLOCKED";

/**
 * Base prompt template for task execution (7-phase approach with agent-driven task selection)
 */
const EXECUTION_PROMPT_BASE = `# Ralph Prototype Iteration

You are executing one iteration of the prototype build loop.

## Current Phase: {PHASE}

## Phase 1: Orient
Read these to understand context:
1. Run \`git status\` to see current branch and changes
2. Read the tasks.json file at: {TASKS_JSON_PATH}
3. Read progress.md at: {PROGRESS_MD_PATH}

## Phase 2: Select
Choose the next task to work on:
- Find tasks where \`status: "pending"\` or \`status: "in_progress"\`
- **IMPORTANT**: Only select tasks with \`type: "{PHASE}"\`
- Prefer in_progress tasks (resume interrupted work)
- Otherwise pick first pending task by ID order
- State which task you selected and why

`;

/**
 * Spike phase specific instructions
 */
const SPIKE_PHASE_INSTRUCTIONS = `## Spike Phase Instructions

You are in SPIKE PHASE. Focus on RESEARCH and DISCOVERY, not implementation.

Your goal is to LEARN, not to build final code. Spikes explore unknowns.

### What to do:
- Research options, patterns, or approaches
- Read existing code to understand patterns
- Explore APIs, libraries, or external constraints
- Document your findings

### Spike Output
When you complete a spike, write findings to: {SESSION_DIR}/spike-{TASK_ID}-output.json

The file must have this structure:
\`\`\`json
{
  "findings": "Summary of what you learned",
  "newTasks": [
    {
      "title": "New implementation task discovered",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"]
    }
  ]
}
\`\`\`

Rules for newTasks:
- Only include tasks that were DISCOVERED during this spike
- All spawned tasks will have type "implement" (not spike)
- Keep tasks focused and actionable
- It's OK to have an empty newTasks array if no new work was discovered

### Coherence Rules
Before proposing new tasks, verify alignment with:
1. CLAUDE.md - project conventions, stack, workflow
2. Existing docs in /context and /docs - established patterns
3. The original goal - don't expand scope beyond initial intent

Spikes DISCOVER how to achieve the goal within existing constraints.
Spikes DO NOT invent new architectures that contradict established patterns.

If spike findings conflict with existing guidance:
- Note the conflict explicitly in findings
- Propose tasks that FOLLOW existing guidance (default)
- Flag the conflict for human review if critical

`;

/**
 * Implement phase specific instructions
 */
const IMPLEMENT_PHASE_INSTRUCTIONS = `## Implementation Phase Instructions

You are in IMPLEMENT PHASE. Build the actual feature.

All spikes have completed - their findings are available in spike-*-output.json files.
Focus on clean, tested implementation.

### Phase 3: Investigate
Gather context for implementation:
- Read spike output files if relevant to your task
- Read files relevant to the task
- Understand what needs to change
- Review acceptance criteria

### Phase 4: Implement
Execute the implementation:
- Follow project conventions
- Write clean, minimal code
- Add tests if behavioral changes

### Phase 5: Validate
Run quality checks:
- \`bun run build\` or equivalent
- \`bun run lint\` (if available)
- \`bun run typecheck\` (if available)
- Fix any failures before proceeding

### Phase 5b: Verify Acceptance Criteria
For each criterion, verify with a command:

| # | Criterion | Command | Result |
|---|-----------|---------|--------|
| 1 | ... | \`test -f path\` | PASS/FAIL |

If ANY criterion fails: fix and re-verify.

### Phase 5c: Documentation Sync
If you created new features/commands:
- Update README.md if new CLI commands
- Update relevant docs

### Phase 6: Commit
Create a commit:
\`\`\`
git add <files>
git commit -m "feat: <task title>"
\`\`\`

`;

/**
 * Common ending for both phases
 */
const EXECUTION_PROMPT_ENDING = `## Phase 7: Update Tracking
1. Update tasks.json - set the completed task's status to "complete"
2. Append to progress.md with what was done

## Completion Signal
After Phase 7, output one of:
- TASK_DONE - if task completed successfully
- TASK_BLOCKED: <reason> - if blocked

STOP after outputting the signal. Do not continue to other tasks.
`;

/**
 * Legacy prompt template for backward compatibility (no phase awareness)
 * @deprecated Use phase-aware prompts instead
 */
const EXECUTION_PROMPT_TEMPLATE = `# Ralph Prototype Iteration

You are executing one iteration of the prototype build loop.

## Phase 1: Orient
Read these to understand context:
1. Run \`git status\` to see current branch and changes
2. Read the tasks.json file at: {TASKS_JSON_PATH}
3. Read progress.md at: {PROGRESS_MD_PATH}

## Phase 2: Select
Choose the next task to work on:
- Find tasks where \`status: "pending"\` or \`status: "in_progress"\`
- Prefer in_progress tasks (resume interrupted work)
- Otherwise pick first pending task by ID order
- State which task you selected and why

## Phase 3: Investigate
Gather context for implementation:
- Read files relevant to the task
- Understand what needs to change
- Review acceptance criteria

## Phase 4: Implement
Execute the implementation:
- Follow project conventions
- Write clean, minimal code
- Add tests if behavioral changes

## Phase 5: Validate
Run quality checks:
- \`bun run build\` or equivalent
- \`bun run lint\` (if available)
- \`bun run typecheck\` (if available)
- Fix any failures before proceeding

## Phase 5b: Verify Acceptance Criteria
For each criterion, verify with a command:

| # | Criterion | Command | Result |
|---|-----------|---------|--------|
| 1 | ... | \`test -f path\` | PASS/FAIL |

If ANY criterion fails: fix and re-verify.

## Phase 5c: Documentation Sync
If you created new features/commands:
- Update README.md if new CLI commands
- Update relevant docs

## Phase 6: Commit
Create a commit:
\`\`\`
git add <files>
git commit -m "feat: <task title>"
\`\`\`

## Phase 7: Update Tracking
1. Update tasks.json - set the completed task's status to "complete"
2. Append to progress.md with what was done

## Completion Signal
After Phase 7, output one of:
- TASK_DONE - if task completed successfully
- TASK_BLOCKED: <reason> - if blocked

STOP after outputting the signal. Do not continue to other tasks.
`;

// =============================================================================
// Task File Operations
// =============================================================================

/**
 * Result from a single iteration execution
 */
interface IterationResult {
  /** Reason for blocking (if status is 'blocked') */
  blockedReason?: string;
  /** Error message if execution failed */
  error?: string;
  /** Whether the iteration completed successfully */
  status: "blocked" | "complete" | "error" | "in_progress";
}

/**
 * Options for executing a single phase
 */
interface PhaseExecutionOptions {
  /** Maximum iterations (0 = unlimited) */
  maxIterations: number;
  /** Current phase (spike or implement) */
  phase: ExecutionPhase;
  /** Execution options including session directory */
  sessionOptions: ExecutionOptions;
  /** Starting iteration number */
  startIteration: number;
}

/**
 * Check if all tasks are complete
 *
 * @param tasksFile - Tasks file to check
 * @returns True if all tasks have status "complete"
 */
function areAllTasksComplete(tasksFile: GeneratedTasksFile): boolean {
  return tasksFile.tasks.every((t) => t.status === "complete");
}

/**
 * Check if all tasks of a given type are complete
 *
 * @param tasksFile - Tasks file to check
 * @param taskType - Type of tasks to check
 * @returns True if all tasks of the given type have status "complete"
 */
function areTasksOfTypeComplete(
  tasksFile: GeneratedTasksFile,
  taskType: "implement" | "spike",
): boolean {
  const tasksOfType = tasksFile.tasks.filter((t) => t.type === taskType);
  return tasksOfType.every((t) => t.status === "complete");
}

/**
 * Build the execution prompt with session paths injected
 *
 * @param sessionDirectory - Path to session directory containing tasks.json and progress.md
 * @param phase - Current execution phase (spike or implement)
 * @returns Formatted prompt string with paths substituted
 */
function buildExecutionPrompt(
  sessionDirectory: string,
  phase?: ExecutionPhase,
): string {
  const paths = getSessionPaths(sessionDirectory);

  // Use phase-aware prompt if phase is specified
  if (phase !== undefined) {
    const basePrompt = EXECUTION_PROMPT_BASE.replace("{PHASE}", phase)
      .replace("{TASKS_JSON_PATH}", paths.tasksJson)
      .replace("{PROGRESS_MD_PATH}", paths.progressLog)
      .replaceAll("{PHASE}", phase);

    const phaseInstructions =
      phase === "spike"
        ? SPIKE_PHASE_INSTRUCTIONS.replace("{SESSION_DIR}", sessionDirectory)
        : IMPLEMENT_PHASE_INSTRUCTIONS;

    return basePrompt + phaseInstructions + EXECUTION_PROMPT_ENDING;
  }

  // Legacy path for backward compatibility
  return EXECUTION_PROMPT_TEMPLATE.replace(
    "{TASKS_JSON_PATH}",
    paths.tasksJson,
  ).replace("{PROGRESS_MD_PATH}", paths.progressLog);
}

// =============================================================================
// Signal Detection and Task File Operations
// =============================================================================

/**
 * Check if Claude's response contains the TASK_BLOCKED signal
 *
 * @param response - Claude's response text
 * @returns Blocked reason or null if not blocked
 */
function detectTaskBlocked(response: string): null | string {
  const match = new RegExp(`${TASK_BLOCKED_SIGNAL}:\\s*(.+?)(?:\\n|$)`).exec(
    response,
  );
  if (match?.[1] !== undefined) {
    return match[1].trim();
  }

  // Also check for just TASK_BLOCKED without reason
  if (response.includes(TASK_BLOCKED_SIGNAL)) {
    return "No reason provided";
  }

  return null;
}

/**
 * Check if Claude's response contains the TASK_DONE signal
 *
 * @param response - Claude's response text
 * @returns True if task is done
 */
function detectTaskDone(response: string): boolean {
  return response.includes(TASK_DONE_SIGNAL);
}

/**
 * Execute a single iteration (agent selects and works on task)
 *
 * The agent will:
 * 1. Read tasks.json to find the next task
 * 2. Execute the task following the 7-phase approach
 * 3. Update tasks.json and progress.md directly
 * 4. Output TASK_DONE or TASK_BLOCKED signal
 *
 * @param sessionDirectory - Path to session directory
 * @param phase - Current execution phase (spike or implement)
 * @returns Iteration result
 */
function executeIteration(
  sessionDirectory: string,
  phase?: ExecutionPhase,
): IterationResult {
  const phaseLabel = phase === undefined ? "" : ` [${phase}]`;
  console.log(chalk.blue(`\n▶ Starting iteration${phaseLabel}`));
  console.log(chalk.dim("─".repeat(60)));

  const prompt = buildExecutionPrompt(sessionDirectory, phase);
  const result: HeadlessResult | null = invokeClaudeHeadless({ prompt });

  if (result === null) {
    return { error: "Claude invocation failed", status: "error" };
  }

  // Check for TASK_DONE signal
  if (detectTaskDone(result.result)) {
    console.log(chalk.green(`✓ Task completed`));
    return { status: "complete" };
  }

  // Check for TASK_BLOCKED signal
  const blockedReason = detectTaskBlocked(result.result);
  if (blockedReason !== null) {
    console.log(chalk.yellow(`⚠ Blocked: ${blockedReason}`));
    return { blockedReason, status: "blocked" };
  }

  // No signal detected - task still in progress
  console.log(chalk.dim(`Iteration complete, no completion signal`));
  return { status: "in_progress" };
}

/**
 * Execute a single phase of the execution loop
 *
 * @param phaseOptions - Phase execution options
 * @returns Phase execution result
 */
function executePhase(phaseOptions: PhaseExecutionOptions): {
  blockedCount: number;
  completedCount: number;
  error?: string;
  iterationsUsed: number;
  phaseComplete: boolean;
} {
  const { maxIterations, phase, sessionOptions, startIteration } = phaseOptions;
  let completedCount = 0;
  let blockedCount = 0;
  let iterationsUsed = startIteration - 1;

  for (let iteration = startIteration; ; iteration += 1) {
    // Check iteration limit (0 means unlimited)
    if (maxIterations > 0 && iteration > maxIterations) {
      return {
        blockedCount,
        completedCount,
        iterationsUsed,
        phaseComplete: false,
      };
    }

    // Check for shutdown request
    if (isShutdownRequested()) {
      return {
        blockedCount,
        completedCount,
        error: "Shutdown requested",
        iterationsUsed,
        phaseComplete: false,
      };
    }

    iterationsUsed = iteration;

    // Update state with current iteration
    updateSessionState(sessionOptions.sessionDirectory, {
      currentIteration: iteration,
    });

    // Read current tasks state
    const tasksFile = readTasksFile(sessionOptions.sessionDirectory);
    if (tasksFile === null) {
      return {
        blockedCount,
        completedCount,
        error: "Failed to read tasks.json",
        iterationsUsed,
        phaseComplete: false,
      };
    }

    // Check if all tasks of this phase are complete
    if (areTasksOfTypeComplete(tasksFile, phase)) {
      return {
        blockedCount,
        completedCount,
        iterationsUsed,
        phaseComplete: true,
      };
    }

    console.log(
      chalk.dim(
        `\n[Iteration ${iteration}${maxIterations === 0 ? "" : `/${maxIterations}`}] [${phase}]`,
      ),
    );
    appendProgressLog(
      sessionOptions.sessionDirectory,
      `Iteration ${iteration} [${phase}]: Starting`,
    );

    // Execute iteration with phase awareness
    const result = executeIteration(sessionOptions.sessionDirectory, phase);

    switch (result.status) {
      case "blocked": {
        blockedCount += 1;
        appendProgressLog(
          sessionOptions.sessionDirectory,
          `BLOCKED: ${result.blockedReason}`,
        );
        return {
          blockedCount,
          completedCount,
          error: `Blocked: ${result.blockedReason}`,
          iterationsUsed,
          phaseComplete: false,
        };
      }
      case "complete": {
        completedCount += 1;
        appendProgressLog(sessionOptions.sessionDirectory, `Task COMPLETED`);
        break;
      }
      case "error": {
        appendProgressLog(
          sessionOptions.sessionDirectory,
          `ERROR: ${result.error}`,
        );
        return {
          blockedCount,
          completedCount,
          error: result.error,
          iterationsUsed,
          phaseComplete: false,
        };
      }
      // No default
    }

    if (result.status === "in_progress") {
      appendProgressLog(
        sessionOptions.sessionDirectory,
        `Task still in progress`,
      );
    }
  }
}

// =============================================================================
// Spike Processing
// =============================================================================

/**
 * Get the path to a spike output file
 *
 * @param sessionDirectory - Path to session directory
 * @param taskId - ID of the spike task
 * @returns Path to spike-{id}-output.json
 */
function getSpikeOutputPath(sessionDirectory: string, taskId: number): string {
  return `${sessionDirectory}/spike-${taskId}-output.json`;
}

/**
 * Check if there are pending tasks of a given type
 *
 * @param tasksFile - Tasks file to check
 * @param taskType - Type of tasks to check for
 * @returns True if there are pending or in_progress tasks of the given type
 */
function hasPendingTasksOfType(
  tasksFile: GeneratedTasksFile,
  taskType: "implement" | "spike",
): boolean {
  return tasksFile.tasks.some(
    (t) => t.type === taskType && t.status !== "complete",
  );
}

/**
 * Process completed spike tasks and add spawned tasks to the task list
 *
 * Reads spike-{id}-output.json files for completed spike tasks,
 * extracts newTasks, and adds them to tasks.json with spawnedBy set.
 *
 * @param sessionDirectory - Path to session directory
 * @returns Number of new tasks added
 */
function processSpikeTasks(sessionDirectory: string): number {
  const tasksFile = readTasksFile(sessionDirectory);
  if (tasksFile === null) {
    return 0;
  }

  // Find completed spike tasks
  const completedSpikes = tasksFile.tasks.filter(
    (t) => t.type === "spike" && t.status === "complete",
  );

  if (completedSpikes.length === 0) {
    return 0;
  }

  // Find the highest current task ID
  let maxId = Math.max(...tasksFile.tasks.map((t) => t.id));

  let newTasksAdded = 0;

  for (const spike of completedSpikes) {
    const outputPath = getSpikeOutputPath(sessionDirectory, spike.id);
    const output = readSpikeOutput(outputPath);

    if (output !== null && output.newTasks.length > 0) {
      // Add spawned tasks
      for (const newTask of output.newTasks) {
        maxId += 1;
        const spawnedTask: GeneratedTask = {
          acceptanceCriteria: newTask.acceptanceCriteria,
          id: maxId,
          spawnedBy: spike.id,
          status: "pending",
          title: newTask.title,
          // Spikes can only spawn implement tasks
          type: "implement",
        };
        tasksFile.tasks.push(spawnedTask);
        newTasksAdded += 1;
      }

      // Log the spawning
      appendProgressLog(
        sessionDirectory,
        `Spike ${spike.id} spawned ${output.newTasks.length} new task(s)`,
      );
    }
  }

  if (newTasksAdded > 0) {
    writeTasksFile(sessionDirectory, tasksFile);
    console.log(
      chalk.cyan(
        `📝 Processed spike outputs: ${newTasksAdded} new task(s) added`,
      ),
    );
  }

  return newTasksAdded;
}

/**
 * Read and validate a spike output file
 *
 * @param filePath - Path to spike output file
 * @returns Parsed spike output or null if invalid
 */
function readSpikeOutput(filePath: string): null | SpikeOutput {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content) as unknown;

    // Validate structure
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const object = parsed as Record<string, unknown>;

    if (typeof object.findings !== "string") {
      return null;
    }

    if (!Array.isArray(object.newTasks)) {
      return null;
    }

    // Validate each new task
    const newTasks: Array<{
      acceptanceCriteria: Array<string>;
      title: string;
    }> = [];
    for (const task of object.newTasks) {
      if (typeof task !== "object" || task === null) {
        return null;
      }

      const taskObject = task as Record<string, unknown>;

      if (
        typeof taskObject.title !== "string" ||
        taskObject.title.trim() === ""
      ) {
        return null;
      }

      if (
        !Array.isArray(taskObject.acceptanceCriteria) ||
        taskObject.acceptanceCriteria.length === 0
      ) {
        return null;
      }

      const criteria = taskObject.acceptanceCriteria as Array<unknown>;
      if (criteria.some((c) => typeof c !== "string" || c.trim() === "")) {
        return null;
      }

      newTasks.push({
        acceptanceCriteria: criteria as Array<string>,
        title: taskObject.title,
      });
    }

    return { findings: object.findings, newTasks };
  } catch {
    return null;
  }
}

/**
 * Read tasks from session directory
 *
 * @param sessionDirectory - Path to session directory
 * @returns Parsed tasks file or null if read failed
 */
function readTasksFile(sessionDirectory: string): GeneratedTasksFile | null {
  const paths = getSessionPaths(sessionDirectory);

  try {
    const content = readFileSync(paths.tasksJson, "utf8");
    return JSON.parse(content) as GeneratedTasksFile;
  } catch {
    return null;
  }
}

// =============================================================================
// Execution Loop
// =============================================================================

/**
 * Run the execution loop with two-phase strategy
 *
 * Phase 1 (Spike): Execute spike tasks for research/discovery
 * - After spikes complete, process spike outputs to spawn new tasks
 *
 * Phase 2 (Implement): Execute implementation tasks
 * - Includes both original implement tasks and spike-spawned tasks
 *
 * @param options - Execution options
 * @returns Execution loop result
 */
// eslint-disable-next-line complexity -- Two-phase execution requires handling multiple state transitions
function runExecutionLoop(options: ExecutionOptions): ExecutionLoopResult {
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  let totalCompletedCount = 0;
  let totalBlockedCount = 0;
  let totalIterationsUsed = 0;

  // Setup signal handler for graceful shutdown
  setupSignalHandler(options.sessionDirectory);

  // Read current state to determine starting point
  const currentState = readSessionState(options.sessionDirectory);
  let startIteration = 1;

  // Read tasks file to determine current phase
  let tasksFile = readTasksFile(options.sessionDirectory);
  if (tasksFile === null) {
    return {
      blockedCount: 0,
      completedCount: 0,
      error: "Failed to read tasks.json",
      iterationsUsed: 0,
      success: false,
    };
  }

  // Determine current phase from tasks.json or default to spike if there are spike tasks
  let currentPhase: ExecutionPhase = tasksFile.phase ?? "spike";

  // If no spike tasks exist, skip directly to implement phase
  const hasSpikeTasks = tasksFile.tasks.some((t) => t.type === "spike");
  if (!hasSpikeTasks) {
    currentPhase = "implement";
  }

  if (options.resume === true && currentState !== null) {
    startIteration = currentState.currentIteration + 1;
    console.log(chalk.bold("\n🔄 Resuming execution loop"));
    console.log(
      chalk.dim(
        `Resuming from iteration ${startIteration}, phase: ${currentPhase}`,
      ),
    );
    appendProgressLog(
      options.sessionDirectory,
      `Resuming session from iteration ${startIteration}, phase: ${currentPhase}`,
    );
  } else {
    console.log(chalk.bold("\n🚀 Starting execution loop"));
    if (hasSpikeTasks) {
      console.log(chalk.cyan("📊 Two-phase execution: spike → implement"));
    }
    appendProgressLog(options.sessionDirectory, "Starting execution loop");
  }

  console.log(
    chalk.dim(
      `Max iterations: ${maxIterations === 0 ? "unlimited" : maxIterations}`,
    ),
  );

  // Update state to running
  updateSessionState(options.sessionDirectory, { status: "running" });

  // ==========================================================================
  // Phase 1: Spike (if needed)
  // ==========================================================================
  if (currentPhase === "spike" && hasPendingTasksOfType(tasksFile, "spike")) {
    console.log(chalk.bold.cyan("\n🔍 Phase 1: Spike (research/discovery)"));
    appendProgressLog(options.sessionDirectory, "Starting spike phase");

    // Update phase in tasks.json
    tasksFile.phase = "spike";
    writeTasksFile(options.sessionDirectory, tasksFile);

    const spikeResult = executePhase({
      maxIterations,
      phase: "spike",
      sessionOptions: options,
      startIteration,
    });

    totalCompletedCount += spikeResult.completedCount;
    totalBlockedCount += spikeResult.blockedCount;
    totalIterationsUsed = spikeResult.iterationsUsed;

    if (spikeResult.error !== undefined) {
      console.log(chalk.red(`\n✗ Spike phase failed: ${spikeResult.error}`));
      updateSessionState(options.sessionDirectory, { status: "failed" });
      return {
        blockedCount: totalBlockedCount,
        completedCount: totalCompletedCount,
        error: spikeResult.error,
        iterationsUsed: totalIterationsUsed,
        success: false,
      };
    }

    if (!spikeResult.phaseComplete) {
      // Max iterations reached during spike phase
      console.log(
        chalk.yellow(
          `\n⚠ Max iterations (${maxIterations}) reached during spike phase`,
        ),
      );
      updateSessionState(options.sessionDirectory, { status: "interrupted" });
      appendProgressLog(
        options.sessionDirectory,
        `Max iterations reached during spike phase`,
      );
      return {
        blockedCount: totalBlockedCount,
        completedCount: totalCompletedCount,
        iterationsUsed: totalIterationsUsed,
        success: false,
      };
    }

    // Process spike outputs to spawn new tasks
    console.log(chalk.bold.cyan("\n📝 Processing spike outputs..."));
    appendProgressLog(options.sessionDirectory, "Processing spike outputs");
    const newTasksCount = processSpikeTasks(options.sessionDirectory);
    if (newTasksCount > 0) {
      console.log(
        chalk.green(`✓ Added ${newTasksCount} new task(s) from spikes`),
      );
    } else {
      console.log(chalk.dim("No new tasks spawned from spikes"));
    }

    // Update phase for implementation
    tasksFile = readTasksFile(options.sessionDirectory);
    if (tasksFile !== null) {
      tasksFile.phase = "implement";
      writeTasksFile(options.sessionDirectory, tasksFile);
    }

    // Update starting iteration for implement phase
    startIteration = totalIterationsUsed + 1;
  }

  // ==========================================================================
  // Phase 2: Implement
  // ==========================================================================
  tasksFile = readTasksFile(options.sessionDirectory);
  if (tasksFile === null) {
    return {
      blockedCount: totalBlockedCount,
      completedCount: totalCompletedCount,
      error: "Failed to read tasks.json after spike phase",
      iterationsUsed: totalIterationsUsed,
      success: false,
    };
  }

  // Check if all tasks are already complete (might happen if no implement tasks)
  if (areAllTasksComplete(tasksFile)) {
    console.log(chalk.green("\n✓ All tasks completed!"));
    updateSessionState(options.sessionDirectory, { status: "completed" });
    appendProgressLog(options.sessionDirectory, "All tasks completed");
    return {
      blockedCount: totalBlockedCount,
      completedCount: totalCompletedCount,
      iterationsUsed: totalIterationsUsed,
      success: true,
    };
  }

  if (hasPendingTasksOfType(tasksFile, "implement")) {
    console.log(chalk.bold.green("\n🔨 Phase 2: Implementation"));
    appendProgressLog(options.sessionDirectory, "Starting implement phase");

    // Calculate remaining iterations
    const remainingIterations =
      maxIterations === 0
        ? 0
        : Math.max(0, maxIterations - totalIterationsUsed);

    const implResult = executePhase({
      maxIterations:
        maxIterations === 0 ? 0 : startIteration + remainingIterations - 1,
      phase: "implement",
      sessionOptions: options,
      startIteration,
    });

    totalCompletedCount += implResult.completedCount;
    totalBlockedCount += implResult.blockedCount;
    totalIterationsUsed = implResult.iterationsUsed;

    if (implResult.error !== undefined) {
      console.log(chalk.red(`\n✗ Implement phase failed: ${implResult.error}`));
      updateSessionState(options.sessionDirectory, { status: "failed" });
      return {
        blockedCount: totalBlockedCount,
        completedCount: totalCompletedCount,
        error: implResult.error,
        iterationsUsed: totalIterationsUsed,
        success: false,
      };
    }

    if (implResult.phaseComplete) {
      console.log(chalk.green("\n✓ All tasks completed!"));
      updateSessionState(options.sessionDirectory, { status: "completed" });
      appendProgressLog(options.sessionDirectory, "All tasks completed");
      return {
        blockedCount: totalBlockedCount,
        completedCount: totalCompletedCount,
        iterationsUsed: totalIterationsUsed,
        success: true,
      };
    }
  }

  console.log(chalk.yellow(`\n⚠ Max iterations (${maxIterations}) reached`));
  updateSessionState(options.sessionDirectory, { status: "interrupted" });
  appendProgressLog(
    options.sessionDirectory,
    `Max iterations (${maxIterations}) reached`,
  );
  return {
    blockedCount: totalBlockedCount,
    completedCount: totalCompletedCount,
    iterationsUsed: totalIterationsUsed,
    success: false,
  };
}

/**
 * Write tasks file to session directory
 *
 * @param sessionDirectory - Path to session directory
 * @param tasksFile - Tasks file to write
 */
function writeTasksFile(
  sessionDirectory: string,
  tasksFile: GeneratedTasksFile,
): void {
  const paths = getSessionPaths(sessionDirectory);
  writeFileSync(paths.tasksJson, JSON.stringify(tasksFile, null, 2));
}

// =============================================================================
// Exports
// =============================================================================

export {
  areAllTasksComplete,
  areTasksOfTypeComplete,
  buildExecutionPrompt,
  DEFAULT_MAX_ITERATIONS,
  detectTaskBlocked,
  detectTaskDone,
  executeIteration,
  executePhase,
  type ExecutionLoopResult,
  type ExecutionOptions,
  getSpikeOutputPath,
  hasPendingTasksOfType,
  isShutdownRequested,
  type IterationResult,
  processSpikeTasks,
  readSpikeOutput,
  readTasksFile,
  runExecutionLoop,
  setupSignalHandler,
  type SpikeOutput,
  TASK_BLOCKED_SIGNAL,
  TASK_DONE_SIGNAL,
  writeTasksFile,
};

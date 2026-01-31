/**
 * Task planning via Claude for Ralph prototype
 *
 * This module handles task generation from a goal description:
 * - Calls Claude with a planning prompt to generate structured tasks
 * - Parses JSON response with retry logic (up to 3 attempts)
 * - Handles JSON extraction from code blocks and raw output
 * - Writes tasks.json to the session directory
 *
 * @see .ralph-lite/plan.md
 */

import { writeFileSync } from "node:fs";

import { type HeadlessResult, invokeClaudeHeadless } from "./claude";
import { getSessionPaths, type SessionPaths } from "./temporary-session";

// =============================================================================
// Types
// =============================================================================

/**
 * A single task in the generated task list
 */
interface GeneratedTask {
  /** Plain English descriptions of how to verify the task is complete */
  acceptanceCriteria: Array<string>;
  /** Unique task identifier (1-based) */
  id: number;
  /** Current status (always 'pending' for generated tasks) */
  status: "complete" | "in_progress" | "pending";
  /** Short descriptive title */
  title: string;
}

/**
 * Root structure of the generated tasks.json
 */
interface GeneratedTasksFile {
  /** The goal description that generated these tasks */
  goal: string;
  /** The list of tasks to complete */
  tasks: Array<GeneratedTask>;
}

/**
 * Result from the planning operation
 */
interface PlanningResult {
  /** Error message if planning failed */
  error?: string;
  /** Number of retry attempts made */
  retryCount: number;
  /** Whether planning was successful */
  success: boolean;
  /** Generated tasks file (if successful) */
  tasksFile?: GeneratedTasksFile;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum number of retry attempts for Claude invocation
 */
const MAX_RETRIES = 3;

/**
 * Valid status values for tasks
 */
const VALID_STATUSES = new Set(["complete", "in_progress", "pending"]);

/**
 * Planning prompt template for Claude
 * Instructs Claude to generate structured tasks from a goal description
 */
const PLANNING_PROMPT_TEMPLATE = `You are a task planner. Given a goal description, break it down into concrete, actionable tasks.

IMPORTANT: Respond with ONLY a valid JSON object. No explanation, no markdown, just the JSON.

The JSON must have this exact structure:
{
  "goal": "<the original goal>",
  "tasks": [
    {
      "id": 1,
      "title": "<short task title>",
      "status": "pending",
      "acceptanceCriteria": [
        "<specific criterion 1>",
        "<specific criterion 2>"
      ]
    }
  ]
}

Rules for task breakdown:
1. Each task should be completable in a single focused session
2. Tasks should be ordered by dependency (do prerequisites first)
3. Each task needs 2-5 specific, verifiable acceptance criteria
4. Keep task titles concise (under 80 characters)
5. Generate 3-10 tasks depending on goal complexity
6. All tasks start with status "pending"

GOAL:
`;

// =============================================================================
// JSON Extraction Helpers
// =============================================================================

/**
 * Attempt a single Claude invocation and task generation
 *
 * @param prompt - The prompt to send to Claude
 * @param attempt - Current attempt number (for error messages)
 * @returns Object with success, tasksFile, and error fields
 */
function attemptTaskGeneration(
  prompt: string,
  attempt: number,
):
  | { error: string; success: false }
  | { success: true; tasksFile: GeneratedTasksFile } {
  const result: HeadlessResult | null = invokeClaudeHeadless({ prompt });

  if (result === null) {
    return {
      error: `Claude invocation failed (attempt ${attempt}/${MAX_RETRIES})`,
      success: false,
    };
  }

  if (result.result === "") {
    return {
      error: `Claude returned empty response (attempt ${attempt}/${MAX_RETRIES})`,
      success: false,
    };
  }

  const jsonString = extractJsonFromResponse(result.result);
  if (jsonString === null) {
    return {
      error: `Failed to extract JSON from response (attempt ${attempt}/${MAX_RETRIES})`,
      success: false,
    };
  }

  const tasksFile = parseAndValidateTasksJson(jsonString);
  if (tasksFile === null) {
    return {
      error: `Invalid tasks JSON structure (attempt ${attempt}/${MAX_RETRIES})`,
      success: false,
    };
  }

  return { success: true, tasksFile };
}

/**
 * Extract JSON from Claude's response
 *
 * Handles multiple response formats:
 * 1. Raw JSON object (preferred)
 * 2. JSON wrapped in markdown code blocks (\`\`\`json ... \`\`\`)
 * 3. JSON wrapped in generic code blocks (\`\`\` ... \`\`\`)
 *
 * @param text - Raw text response from Claude
 * @returns Extracted JSON string, or null if no valid JSON found
 */
function extractJsonFromResponse(text: string): null | string {
  const trimmed = text.trim();

  // Try extraction methods in order of preference
  return (
    tryExtractRawJson(trimmed) ??
    tryExtractFromJsonBlock(trimmed) ??
    tryExtractFromGenericBlock(trimmed) ??
    tryExtractJsonAnywhere(trimmed)
  );
}

/**
 * Find the index of the matching closing brace in a string
 *
 * @param text - The string to search
 * @param startIndex - Index to start from (should be at an opening brace)
 * @returns Index of matching closing brace, or -1 if not found
 */
function findMatchingBrace(text: string, startIndex: number): number {
  let depth = 0;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

/**
 * Generate tasks from a goal description using Claude
 *
 * Calls Claude with the planning prompt and parses the JSON response.
 * Implements retry logic with up to MAX_RETRIES attempts.
 *
 * @param goal - The goal description to break down into tasks
 * @returns Planning result with success status and tasks/error
 */
function generateTasksFromGoal(goal: string): PlanningResult {
  const prompt = `${PLANNING_PROMPT_TEMPLATE}${goal}`;

  let lastError = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const result = attemptTaskGeneration(prompt, attempt);

    if (result.success) {
      return {
        retryCount: attempt,
        success: true,
        tasksFile: result.tasksFile,
      };
    }

    lastError = result.error;
  }

  return { error: lastError, retryCount: MAX_RETRIES, success: false };
}

/**
 * Parse and validate the tasks JSON structure
 *
 * @param jsonString - JSON string to parse
 * @returns Parsed and validated tasks file, or null if invalid
 */
function parseAndValidateTasksJson(
  jsonString: string,
): GeneratedTasksFile | null {
  try {
    const parsed = JSON.parse(jsonString) as unknown;

    const root = validateRootStructure(parsed);
    if (root === null) {
      return null;
    }

    // Validate each task
    const tasks: Array<GeneratedTask> = [];
    for (const taskData of root.tasks) {
      const task = validateTask(taskData);
      if (task === null) {
        return null;
      }
      tasks.push(task);
    }

    return { goal: root.goal, tasks };
  } catch {
    return null;
  }
}

// =============================================================================
// JSON Extraction
// =============================================================================

/**
 * Plan tasks and write to session directory
 *
 * Main entry point for task planning. Generates tasks from the goal
 * and writes the result to the session's tasks.json file.
 *
 * @param goal - The goal description
 * @param sessionDirectory - Path to the session directory
 * @returns Planning result
 */
function planAndWriteTasks(
  goal: string,
  sessionDirectory: string,
): PlanningResult {
  const result = generateTasksFromGoal(goal);

  if (!result.success || result.tasksFile === undefined) {
    return result;
  }

  const paths: SessionPaths = getSessionPaths(sessionDirectory);
  writeFileSync(paths.tasksJson, JSON.stringify(result.tasksFile, null, 2));

  return result;
}

// =============================================================================
// Task Validation Helpers
// =============================================================================

/**
 * Try to extract JSON from a generic code block
 */
function tryExtractFromGenericBlock(trimmed: string): null | string {
  const genericBlockMatch = /```\s*\n(?<content>[\s\S]*?)\n```/.exec(trimmed);
  if (genericBlockMatch?.groups?.content !== undefined) {
    const content = genericBlockMatch.groups.content.trim();
    if (content.startsWith("{")) {
      return content;
    }
  }
  return null;
}

/**
 * Try to extract JSON from a markdown code block with language hint
 */
function tryExtractFromJsonBlock(trimmed: string): null | string {
  const jsonBlockMatch = /```json\s*\n(?<content>[\s\S]*?)\n```/i.exec(trimmed);
  if (jsonBlockMatch?.groups?.content !== undefined) {
    return jsonBlockMatch.groups.content.trim();
  }
  return null;
}

// =============================================================================
// Planning Functions
// =============================================================================

/**
 * Try to find JSON with goal and tasks anywhere in the response
 */
function tryExtractJsonAnywhere(trimmed: string): null | string {
  const jsonMatch = /\{[\s\S]*"goal"[\s\S]*"tasks"[\s\S]*\}/.exec(trimmed);
  if (jsonMatch === null) {
    return null;
  }

  const startIndex = jsonMatch.index;
  const endIndex = findMatchingBrace(trimmed, startIndex);

  if (endIndex > startIndex) {
    return trimmed.slice(startIndex, endIndex + 1);
  }

  return null;
}

/**
 * Try to extract JSON that starts with an opening brace
 */
function tryExtractRawJson(trimmed: string): null | string {
  if (!trimmed.startsWith("{")) {
    return null;
  }

  const endIndex = findMatchingBrace(trimmed, 0);
  if (endIndex > 0) {
    return trimmed.slice(0, endIndex + 1);
  }

  return null;
}

/**
 * Validate the root structure of a parsed JSON object
 *
 * @param parsed - The parsed JSON value
 * @returns Object with goal and tasks array, or null if invalid
 */
function validateRootStructure(
  parsed: unknown,
): { goal: string; tasks: Array<unknown> } | null {
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const object = parsed as Record<string, unknown>;

  if (typeof object.goal !== "string" || object.goal.trim() === "") {
    return null;
  }

  if (!Array.isArray(object.tasks) || object.tasks.length === 0) {
    return null;
  }

  return { goal: object.goal, tasks: object.tasks };
}

/**
 * Validate a single task object
 *
 * @param task - The task object to validate
 * @returns Validated GeneratedTask or null if invalid
 */
function validateTask(task: unknown): GeneratedTask | null {
  if (typeof task !== "object" || task === null) {
    return null;
  }

  const taskObject = task as Record<string, unknown>;

  // Validate id
  if (typeof taskObject.id !== "number") {
    return null;
  }

  // Validate title
  if (typeof taskObject.title !== "string" || taskObject.title.trim() === "") {
    return null;
  }

  // Validate status
  if (
    typeof taskObject.status !== "string" ||
    !VALID_STATUSES.has(taskObject.status)
  ) {
    return null;
  }

  // Validate acceptanceCriteria
  if (
    !Array.isArray(taskObject.acceptanceCriteria) ||
    taskObject.acceptanceCriteria.length === 0
  ) {
    return null;
  }

  // Validate each criterion is a non-empty string
  const criteria = taskObject.acceptanceCriteria as Array<unknown>;
  const hasInvalidCriterion = criteria.some(
    (criterion: unknown) =>
      typeof criterion !== "string" || criterion.trim() === "",
  );
  if (hasInvalidCriterion) {
    return null;
  }

  return {
    acceptanceCriteria: taskObject.acceptanceCriteria as Array<string>,
    id: taskObject.id,
    status: taskObject.status as "complete" | "in_progress" | "pending",
    title: taskObject.title,
  };
}

// =============================================================================
// Exports
// =============================================================================

export {
  extractJsonFromResponse,
  type GeneratedTask,
  type GeneratedTasksFile,
  generateTasksFromGoal,
  MAX_RETRIES,
  parseAndValidateTasksJson,
  planAndWriteTasks,
  type PlanningResult,
};

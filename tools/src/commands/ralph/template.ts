/**
 * Supported template variables for Ralph hook prompt substitution.
 *
 * Values are provided at runtime by Ralph iteration context.
 */
interface TemplateVariables {
  /** Purpose: current iteration number in prompts; source: build loop iteration counter; format: base-10 numeric string (for example "1"). */
  ITERATION_NUM: string;
  /** Purpose: identify the active milestone in prompts; source: milestone metadata from subtask queue path; format: milestone identifier string (for example "003-ralph-workflow"). */
  MILESTONE: string;
  /** Purpose: backward-compatible alias for session log content; source: trimmed session JSONL text loaded from session file; format: plain text block string. */
  SESSION_CONTENT: string;
  /** Purpose: provide session log content to templates; source: trimmed session JSONL text loaded from session file; format: plain text block string. */
  SESSION_JSONL_CONTENT: string;
  /** Purpose: point templates to the session log file location; source: resolved provider session path; format: absolute filesystem path string to a .jsonl file. */
  SESSION_JSONL_PATH: string;
  /** Purpose: reflect iteration outcome in prompts; source: iteration status from build/post-iteration flow; format: status token string such as "completed", "failed", or "retrying". */
  STATUS: string;
  /** Purpose: describe the current subtask body; source: subtask.description from subtasks queue; format: free-form description text string. */
  SUBTASK_DESCRIPTION: string;
  /** Purpose: identify the current subtask; source: subtask.id from subtasks queue; format: subtask identifier string (for example "SUB-383"). */
  SUBTASK_ID: string;
  /** Purpose: label the current subtask in prompts; source: subtask.title from subtasks queue; format: short title text string. */
  SUBTASK_TITLE: string;
  /** Purpose: link prompt context to the parent task; source: subtask.taskRef in iteration context; format: task reference string (for example "TASK-032"). */
  TASK_REF: string;
}

function applyTemplateSubstitution(
  template: string,
  variables: Partial<TemplateVariables>,
): string {
  if (template === "") {
    return "";
  }

  return template.replaceAll(
    /\{\{(?<variableName>[A-Z0-9_]+)\}\}/g,
    (match, variableName) => {
      const value = variables[variableName as keyof TemplateVariables];
      if (value === undefined) {
        console.warn(`Template variable {{${variableName}}} not provided`);
        return match;
      }

      return value;
    },
  );
}

const substituteTemplate: (
  template: string,
  variables: Partial<TemplateVariables>,
) => string = applyTemplateSubstitution;

export { substituteTemplate, type TemplateVariables };

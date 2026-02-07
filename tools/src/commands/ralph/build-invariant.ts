import type { Subtask } from "./types";

interface CompletionInvariantCheckOptions {
  assignedSubtaskId: string;
  postSubtasks: Array<Pick<Subtask, "done" | "id">>;
  preSubtasks: Array<Pick<Subtask, "done" | "id">>;
}

interface CompletionInvariantCheckResult {
  assignedSubtaskId: string;
  completedIds: Array<string>;
  isViolation: boolean;
  unexpectedCompletionIds: Array<string>;
}

function checkAssignedCompletionInvariant(
  options: CompletionInvariantCheckOptions,
): CompletionInvariantCheckResult {
  const { assignedSubtaskId, postSubtasks, preSubtasks } = options;
  const completedIds = detectDoneTransitions(preSubtasks, postSubtasks);
  const unexpectedCompletionIds = completedIds.filter(
    (id) => id !== assignedSubtaskId,
  );

  return {
    assignedSubtaskId,
    completedIds,
    isViolation: unexpectedCompletionIds.length > 0,
    unexpectedCompletionIds,
  };
}

function detectDoneTransitions(
  preSubtasks: Array<Pick<Subtask, "done" | "id">>,
  postSubtasks: Array<Pick<Subtask, "done" | "id">>,
): Array<string> {
  const postById = new Map<string, boolean>(
    postSubtasks.map((subtask) => [subtask.id, subtask.done]),
  );

  return preSubtasks
    .filter((subtask) => {
      const isDoneAfter = postById.get(subtask.id);
      return !subtask.done && isDoneAfter === true;
    })
    .map((subtask) => subtask.id);
}

function formatCompletionInvariantViolation(
  result: CompletionInvariantCheckResult,
): string {
  const { assignedSubtaskId, completedIds, unexpectedCompletionIds } = result;
  const completedList =
    completedIds.length > 0 ? completedIds.join(", ") : "(none)";
  const unexpectedList = unexpectedCompletionIds.join(", ");

  return [
    "Invariant violation: unexpected subtask completion detected.",
    `Assigned subtask: ${assignedSubtaskId}`,
    `Completed this iteration (done false->true): ${completedList}`,
    `Unexpected completions: ${unexpectedList}`,
    "Stopping build loop to avoid cross-subtask progress.",
  ].join("\n");
}

export {
  checkAssignedCompletionInvariant,
  type CompletionInvariantCheckOptions,
  type CompletionInvariantCheckResult,
  detectDoneTransitions,
  formatCompletionInvariantViolation,
};

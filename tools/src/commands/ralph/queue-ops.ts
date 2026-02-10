import { loadSubtasksFile, saveSubtasksFile } from "./config";
import {
  computeFingerprint,
  type QueueOperation,
  type QueueProposal,
  type QueueSubtaskDraft,
  type Subtask,
  type SubtasksFile,
} from "./types";

const SUBTASK_ID_PATTERN = /^SUB-(?<num>\d+)$/;

interface ApplyAndSaveProposalSummary {
  applied: boolean;
  fingerprintAfter: string;
  fingerprintBefore: string;
  operationsApplied: number;
  subtasksAfter: number;
  subtasksBefore: number;
}

type QueueUpdateChanges = Extract<
  QueueOperation,
  { type: "update" }
>["changes"];

/**
 * Apply a queue proposal to a subtasks file and persist changes.
 *
 * @param subtasksPath - Path to subtasks.json file
 * @param proposal - Queue proposal containing operations to apply
 * @returns Summary of changes applied (counts, fingerprints, operation status)
 */
function applyAndSaveProposal(
  subtasksPath: string,
  proposal: QueueProposal,
): ApplyAndSaveProposalSummary {
  const currentFile = loadSubtasksFile(subtasksPath);
  const nextFile = applyQueueOperations(currentFile, proposal);
  const isApplied = nextFile !== currentFile;
  const fingerprintAfter = computeFingerprint(nextFile.subtasks).hash;

  saveSubtasksFile(subtasksPath, nextFile);

  return {
    applied: isApplied,
    fingerprintAfter,
    fingerprintBefore: currentFile.fingerprint.hash,
    operationsApplied: isApplied ? proposal.operations.length : 0,
    subtasksAfter: nextFile.subtasks.length,
    subtasksBefore: currentFile.subtasks.length,
  };
}

function applyQueueOperations(
  subtasksFile: SubtasksFile,
  proposal: QueueProposal,
): SubtasksFile {
  const currentFingerprint = computeFingerprint(subtasksFile.subtasks);
  if (currentFingerprint.hash !== proposal.fingerprint.hash) {
    return subtasksFile;
  }

  const nextFile: SubtasksFile = structuredClone(subtasksFile);
  let nextIdNumber = getMaxSubtaskNumber(nextFile.subtasks) + 1;

  for (const operation of proposal.operations) {
    switch (operation.type) {
      case "create": {
        if (
          operation.atIndex < 0 ||
          operation.atIndex > nextFile.subtasks.length ||
          !Number.isInteger(operation.atIndex)
        ) {
          throw new Error(
            `Cannot create subtask: atIndex ${operation.atIndex} is out of range`,
          );
        }
        const createdSubtask = buildSubtaskFromDraft(
          operation.subtask,
          nextIdNumber,
        );
        nextIdNumber += 1;
        nextFile.subtasks.splice(operation.atIndex, 0, createdSubtask);
        break;
      }
      case "remove": {
        const target = requirePendingSubtask(
          nextFile.subtasks,
          operation.id,
          "remove",
        );
        nextFile.subtasks.splice(target.index, 1);
        break;
      }
      case "reorder": {
        const target = requirePendingSubtask(
          nextFile.subtasks,
          operation.id,
          "reorder",
        );
        if (
          operation.toIndex < 0 ||
          operation.toIndex >= nextFile.subtasks.length ||
          !Number.isInteger(operation.toIndex)
        ) {
          throw new Error(
            `Cannot reorder ${operation.id}: toIndex ${operation.toIndex} is out of range`,
          );
        }

        const removed = nextFile.subtasks.splice(target.index, 1);
        const moved = removed[0];
        if (moved === undefined) {
          throw new Error(`Cannot reorder ${operation.id}: target disappeared`);
        }

        nextFile.subtasks.splice(operation.toIndex, 0, moved);
        break;
      }
      case "split": {
        const target = requirePendingSubtask(
          nextFile.subtasks,
          operation.id,
          "split",
        );
        if (operation.subtasks.length === 0) {
          throw new Error(
            `Cannot split ${operation.id}: subtasks must not be empty`,
          );
        }

        const replacements = operation.subtasks.map((draft) => {
          const subtask = buildSubtaskFromDraft(draft, nextIdNumber);
          nextIdNumber += 1;
          return subtask;
        });

        nextFile.subtasks.splice(target.index, 1, ...replacements);
        break;
      }
      case "update": {
        const target = requirePendingSubtask(
          nextFile.subtasks,
          operation.id,
          "update",
        );
        Object.assign(target.subtask, operation.changes);
        break;
      }
      default: {
        assertNever(operation);
      }
    }
  }

  return nextFile;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported queue operation: ${JSON.stringify(value)}`);
}

function buildSubtaskFromDraft(
  draft: QueueSubtaskDraft,
  idNumber: number,
): Subtask {
  const id = `SUB-${String(idNumber).padStart(3, "0")}`;
  return {
    acceptanceCriteria: [...draft.acceptanceCriteria],
    description: draft.description,
    done: false,
    filesToRead: [...draft.filesToRead],
    id,
    storyRef: draft.storyRef,
    taskRef: draft.taskRef,
    title: draft.title,
  };
}

/**
 * Format a numeric ID into the SUB-NNN pattern.
 *
 * @param idNumber - Numeric portion of the subtask ID
 * @returns Formatted subtask ID string (e.g. "SUB-001")
 */
function formatSubtaskId(idNumber: number): string {
  return `SUB-${String(idNumber).padStart(3, "0")}`;
}

function getMaxSubtaskNumber(subtasks: Array<Subtask>): number {
  let max = 0;
  for (const subtask of subtasks) {
    const match = SUBTASK_ID_PATTERN.exec(subtask.id);
    const numberString = match?.groups?.num;
    if (numberString !== undefined) {
      const parsed = Number.parseInt(numberString, 10);
      if (!Number.isNaN(parsed) && parsed > max) {
        max = parsed;
      }
    }
  }

  return max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is Array<string> {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function parseCreateOperation(
  value: Record<string, unknown>,
): Extract<QueueOperation, { type: "create" }> | null {
  const { atIndex, subtask } = value;
  if (typeof atIndex !== "number" || !Number.isInteger(atIndex)) {
    return null;
  }
  const draft = parseQueueSubtaskDraft(subtask);
  if (draft === null) {
    return null;
  }
  return { atIndex, subtask: draft, type: "create" };
}

function parseQueueOperation(value: unknown): null | QueueOperation {
  if (!isRecord(value) || typeof value.type !== "string") {
    return null;
  }

  switch (value.type) {
    case "create": {
      return parseCreateOperation(value);
    }
    case "remove": {
      return parseRemoveOperation(value);
    }
    case "reorder": {
      return parseReorderOperation(value);
    }
    case "split": {
      return parseSplitOperation(value);
    }
    case "update": {
      return parseUpdateOperation(value);
    }
    default: {
      throw new Error(`Unsupported queue operation type: ${value.type}`);
    }
  }
}

/**
 * Parse and validate queue operations from a provider response.
 *
 * @param value - Unknown value to parse (should be array of operations)
 * @param sourceId - Source ID for logging context (for example subtask ID)
 * @returns Array of validated operations, or undefined if empty/invalid
 */
function parseQueueOperations(
  value: unknown,
  sourceId: string,
): Array<QueueOperation> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    console.warn(
      `[Validation:${sourceId}] Ignoring invalid operations payload (must be an array)`,
    );
    return undefined;
  }

  const operations: Array<QueueOperation> = [];
  for (const [index, operation] of value.entries()) {
    try {
      const parsed = parseQueueOperation(operation);
      if (parsed === null) {
        console.warn(
          `[Validation:${sourceId}] Ignoring invalid queue operation at index ${index}`,
        );
      } else {
        operations.push(parsed);
      }
    } catch {
      console.warn(
        `[Validation:${sourceId}] Ignoring invalid queue operation at index ${index}`,
      );
    }
  }

  return operations.length === 0 ? undefined : operations;
}

function parseQueueSubtaskDraft(value: unknown): null | QueueSubtaskDraft {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isStringArray(value.acceptanceCriteria) ||
    typeof value.description !== "string" ||
    !isStringArray(value.filesToRead) ||
    typeof value.taskRef !== "string" ||
    typeof value.title !== "string"
  ) {
    return null;
  }

  const draft: QueueSubtaskDraft = {
    acceptanceCriteria: value.acceptanceCriteria,
    description: value.description,
    filesToRead: value.filesToRead,
    taskRef: value.taskRef,
    title: value.title,
  };

  if (typeof value.id === "string" && value.id.trim() !== "") {
    draft.id = value.id;
  }
  if (
    value.storyRef === null ||
    (typeof value.storyRef === "string" && value.storyRef.trim() !== "")
  ) {
    draft.storyRef = value.storyRef;
  }

  return draft;
}

function parseQueueUpdateChanges(value: unknown): null | QueueUpdateChanges {
  if (!isRecord(value)) {
    return null;
  }

  const changes: QueueUpdateChanges = {};
  if (typeof value.title === "string") {
    changes.title = value.title;
  }
  if (typeof value.description === "string") {
    changes.description = value.description;
  }
  if (isStringArray(value.acceptanceCriteria)) {
    changes.acceptanceCriteria = value.acceptanceCriteria;
  }
  if (isStringArray(value.filesToRead)) {
    changes.filesToRead = value.filesToRead;
  }
  if (
    value.storyRef === null ||
    (typeof value.storyRef === "string" && value.storyRef.trim() !== "")
  ) {
    changes.storyRef = value.storyRef;
  }

  return changes;
}

function parseRemoveOperation(
  value: Record<string, unknown>,
): Extract<QueueOperation, { type: "remove" }> | null {
  if (typeof value.id !== "string" || value.id.trim() === "") {
    return null;
  }
  return { id: value.id, type: "remove" };
}

function parseReorderOperation(
  value: Record<string, unknown>,
): Extract<QueueOperation, { type: "reorder" }> | null {
  const { id, toIndex } = value;
  if (
    typeof id !== "string" ||
    id.trim() === "" ||
    typeof toIndex !== "number" ||
    !Number.isInteger(toIndex)
  ) {
    return null;
  }
  return { id, toIndex, type: "reorder" };
}

function parseSplitOperation(
  value: Record<string, unknown>,
): Extract<QueueOperation, { type: "split" }> | null {
  if (typeof value.id !== "string" || value.id.trim() === "") {
    return null;
  }
  if (!Array.isArray(value.subtasks)) {
    return null;
  }
  const drafts = value.subtasks
    .map((draft) => parseQueueSubtaskDraft(draft))
    .filter((draft): draft is QueueSubtaskDraft => draft !== null);
  if (drafts.length !== value.subtasks.length || drafts.length === 0) {
    return null;
  }
  return { id: value.id, subtasks: drafts, type: "split" };
}

function parseUpdateOperation(
  value: Record<string, unknown>,
): Extract<QueueOperation, { type: "update" }> | null {
  if (typeof value.id !== "string" || value.id.trim() === "") {
    return null;
  }
  const changes = parseQueueUpdateChanges(value.changes);
  if (changes === null) {
    return null;
  }
  return { changes, id: value.id, type: "update" };
}
function requirePendingSubtask(
  subtasks: Array<Subtask>,
  id: string,
  operation: QueueOperation["type"],
): { index: number; subtask: Subtask } {
  const index = subtasks.findIndex((subtask) => subtask.id === id);
  if (index < 0) {
    throw new Error(`Cannot ${operation} ${id}: subtask not found`);
  }

  const subtask = subtasks[index];
  if (subtask === undefined) {
    throw new Error(`Cannot ${operation} ${id}: subtask not found`);
  }

  if (subtask.done) {
    throw new Error(
      `Cannot ${operation} ${id}: completed subtasks are immutable`,
    );
  }

  return { index, subtask };
}

export {
  applyAndSaveProposal,
  type ApplyAndSaveProposalSummary,
  formatSubtaskId,
  getMaxSubtaskNumber,
  parseQueueOperation,
  parseQueueOperations,
  SUBTASK_ID_PATTERN,
};

export default applyQueueOperations;

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

        const [moved] = nextFile.subtasks.splice(target.index, 1);
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

export { applyAndSaveProposal, type ApplyAndSaveProposalSummary };

export default applyQueueOperations;

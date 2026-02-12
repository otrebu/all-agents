import { readFileSync } from "node:fs";

import { computeFingerprint, type QueueProposal, type Subtask } from "./types";

interface CliSubtaskDraft {
  acceptanceCriteria: Array<string>;
  description: string;
  filesToRead: Array<string>;
  storyRef?: null | string;
  taskRef: string;
  title: string;
}

interface QueueDiffSummary {
  added: Array<Subtask>;
  removed: Array<Subtask>;
  reordered: Array<{ id: string; to: number; was: number }>;
  updated: Array<{ after: Subtask; before: Subtask }>;
}

function areStringArraysEqual(
  left: Array<string>,
  right: Array<string>,
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (const [index, item] of left.entries()) {
    if (item !== right[index]) {
      return false;
    }
  }
  return true;
}

function areSubtasksEqual(left: Subtask, right: Subtask): boolean {
  return (
    left.title === right.title &&
    left.description === right.description &&
    left.taskRef === right.taskRef &&
    left.storyRef === right.storyRef &&
    left.done === right.done &&
    areStringArraysEqual(left.acceptanceCriteria, right.acceptanceCriteria) &&
    areStringArraysEqual(left.filesToRead, right.filesToRead)
  );
}

function buildQueueDiffSummary(
  before: Array<Subtask>,
  after: Array<Subtask>,
): QueueDiffSummary {
  const beforeById = new Map(before.map((subtask) => [subtask.id, subtask]));
  const afterById = new Map(after.map((subtask) => [subtask.id, subtask]));
  const beforeIndexById = new Map(
    before.map((subtask, index) => [subtask.id, index]),
  );
  const afterIndexById = new Map(
    after.map((subtask, index) => [subtask.id, index]),
  );

  const added = after.filter((subtask) => !beforeById.has(subtask.id));
  const removed = before.filter((subtask) => !afterById.has(subtask.id));

  const updated: Array<{ after: Subtask; before: Subtask }> = [];
  for (const subtask of after) {
    const beforeSubtask = beforeById.get(subtask.id);
    if (
      beforeSubtask !== undefined &&
      !areSubtasksEqual(beforeSubtask, subtask)
    ) {
      updated.push({ after: subtask, before: beforeSubtask });
    }
  }

  const reordered: Array<{ id: string; to: number; was: number }> = [];
  for (const [id, beforeIndex] of beforeIndexById) {
    const afterIndex = afterIndexById.get(id);
    if (afterIndex !== undefined && afterIndex !== beforeIndex) {
      reordered.push({ id, to: afterIndex, was: beforeIndex });
    }
  }

  return { added, removed, reordered, updated };
}

function hasFingerprintMismatch(
  proposal: QueueProposal,
  currentSubtasks: Array<Subtask>,
): { current: string; mismatched: boolean; proposal: string } {
  const current = computeFingerprint(currentSubtasks).hash;
  return {
    current,
    mismatched: current !== proposal.fingerprint.hash,
    proposal: proposal.fingerprint.hash,
  };
}

function parseCliSubtaskDraft(candidate: unknown): CliSubtaskDraft {
  if (candidate === null || typeof candidate !== "object") {
    throw new Error("Subtask payload entries must be JSON objects");
  }

  const {
    acceptanceCriteria,
    description,
    filesToRead,
    storyRef,
    taskRef,
    title,
  } = candidate as Record<string, unknown>;

  if (typeof title !== "string" || title.trim() === "") {
    throw new Error("Subtask payload requires non-empty string field: title");
  }

  if (typeof description !== "string" || description.trim() === "") {
    throw new Error(
      "Subtask payload requires non-empty string field: description",
    );
  }

  const parsedAcceptanceCriteria = parseStringArrayField(
    "acceptanceCriteria",
    acceptanceCriteria,
  );
  const parsedFilesToRead = parseStringArrayField("filesToRead", filesToRead);

  if (typeof taskRef !== "string" || taskRef.trim() === "") {
    throw new Error("Subtask payload requires non-empty string field: taskRef");
  }

  const taskReference = taskRef;

  if (
    storyRef !== undefined &&
    storyRef !== null &&
    typeof storyRef !== "string"
  ) {
    throw new Error("Subtask payload field storyRef must be string or null");
  }

  const storyReference = storyRef;

  return {
    acceptanceCriteria: parsedAcceptanceCriteria,
    description,
    filesToRead: parsedFilesToRead,
    storyRef: storyReference,
    taskRef: taskReference,
    title,
  };
}

function parseCliSubtaskDrafts(input: string): Array<CliSubtaskDraft> {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse subtask JSON: ${message}`);
  }

  const payload =
    parsed !== null &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    Array.isArray((parsed as Record<string, unknown>).subtasks)
      ? (parsed as { subtasks: unknown }).subtasks
      : parsed;

  const drafts = Array.isArray(payload) ? payload : [payload];
  if (drafts.length === 0) {
    throw new Error("Subtask payload must include at least one subtask entry");
  }

  return drafts.map((entry) => parseCliSubtaskDraft(entry));
}

function parseStringArrayField(
  fieldName: string,
  value: unknown,
): Array<string> {
  if (!Array.isArray(value)) {
    throw new TypeError(
      `Subtask payload requires ${fieldName} as array of strings`,
    );
  }

  const strings: Array<string> = [];
  for (const item of value) {
    if (typeof item !== "string") {
      throw new TypeError(
        `Subtask payload requires ${fieldName} as array of strings`,
      );
    }
    strings.push(item);
  }

  return strings;
}

function readQueueProposalFromFile(proposalPath: string): QueueProposal {
  const raw = readFileSync(proposalPath, "utf8");

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse proposal JSON: ${message}`);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("Proposal must be a JSON object");
  }

  const candidate = parsed as Partial<QueueProposal>;
  if (
    candidate.fingerprint === undefined ||
    typeof candidate.fingerprint !== "object" ||
    typeof candidate.fingerprint.hash !== "string" ||
    candidate.fingerprint.hash.trim() === ""
  ) {
    throw new TypeError("Proposal requires fingerprint.hash");
  }
  if (!Array.isArray(candidate.operations)) {
    throw new TypeError("Proposal requires operations array");
  }
  if (typeof candidate.source !== "string" || candidate.source.trim() === "") {
    throw new TypeError("Proposal requires source string");
  }
  if (
    typeof candidate.timestamp !== "string" ||
    candidate.timestamp.trim() === ""
  ) {
    throw new TypeError("Proposal requires timestamp string");
  }

  return {
    fingerprint: { hash: candidate.fingerprint.hash },
    operations: candidate.operations,
    source: candidate.source,
    timestamp: candidate.timestamp,
  };
}

export {
  areStringArraysEqual,
  areSubtasksEqual,
  buildQueueDiffSummary,
  type CliSubtaskDraft,
  hasFingerprintMismatch,
  parseCliSubtaskDraft,
  parseCliSubtaskDrafts,
  parseStringArrayField,
  type QueueDiffSummary,
  readQueueProposalFromFile,
};

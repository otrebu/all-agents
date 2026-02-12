import type * as BuildModule from "@tools/commands/ralph/build";

import * as realValidation from "@tools/commands/ralph/validation";
import { beforeAll, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const validateAllSubtasksMock = mock(async () => {
  await Promise.resolve();
  return {
    aligned: 1,
    skippedSubtasks: [
      {
        feedbackPath: "/tmp/validation-feedback.md",
        reason: "No longer needed",
        subtaskId: "SUB-002",
      },
    ],
    success: true,
    total: 2,
  };
});

void mock.module("@tools/commands/ralph/validation", () => ({
  ...realValidation,
  validateAllSubtasks: validateAllSubtasksMock,
  writeValidationQueueApplyLogEntry: mock(() => {}),
}));

type ResolveSkippedSubtaskIdsFunction =
  typeof BuildModule.resolveSkippedSubtaskIds;

async function resolveSkippedSubtaskIdsPlaceholder(
  _options: Parameters<ResolveSkippedSubtaskIdsFunction>[0],
): ReturnType<ResolveSkippedSubtaskIdsFunction> {
  void _options;
  await Promise.resolve();
  return null;
}

let resolveSkippedSubtaskIds: ResolveSkippedSubtaskIdsFunction =
  resolveSkippedSubtaskIdsPlaceholder;

describe("resolveSkippedSubtaskIds", () => {
  beforeAll(async () => {
    ({ resolveSkippedSubtaskIds } =
      await import("@tools/commands/ralph/build"));
  });

  test("applies remove operations derived from validation skipped IDs", async () => {
    validateAllSubtasksMock.mockClear();

    const sandboxRoot = mkdtempSync(path.join(tmpdir(), "ralph-build-skip-"));
    try {
      const subtasksPath = path.join(sandboxRoot, "subtasks.json");
      writeFileSync(
        subtasksPath,
        JSON.stringify(
          {
            subtasks: [
              {
                acceptanceCriteria: ["Keep this subtask"],
                description: "Still valid",
                done: false,
                filesToRead: ["tools/src/commands/ralph/build.ts"],
                id: "SUB-001",
                taskRef: "TASK-001",
                title: "Keep subtask",
              },
              {
                acceptanceCriteria: ["Should be removed"],
                description: "Invalid after validation",
                done: false,
                filesToRead: ["tools/src/commands/ralph/validation.ts"],
                id: "SUB-002",
                taskRef: "TASK-001",
                title: "Remove subtask",
              },
            ],
          },
          null,
          2,
        ),
      );

      const skippedIds = await resolveSkippedSubtaskIds({
        contextRoot: sandboxRoot,
        mode: "headless",
        provider: "claude",
        shouldForceProposalApply: false,
        shouldRequireProposalReview: false,
        shouldValidateFirst: true,
        subtasksPath,
      });

      expect(skippedIds).toEqual(new Set(["SUB-002"]));

      const updatedQueue = JSON.parse(readFileSync(subtasksPath, "utf8")) as {
        subtasks: Array<{ id: string }>;
      };
      expect(updatedQueue.subtasks.map((subtask) => subtask.id)).toEqual([
        "SUB-001",
      ]);
      expect(validateAllSubtasksMock).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(sandboxRoot, { force: true, recursive: true });
    }
  });
});

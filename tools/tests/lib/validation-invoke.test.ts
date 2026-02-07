import type { ValidationContext } from "@tools/commands/ralph/validation";

import * as summaryProvider from "@tools/commands/ralph/providers/summary";
import {
  validateSubtask,
  VALIDATION_TIMEOUT_MS,
} from "@tools/commands/ralph/validation";
import { describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function createValidationContextFixture(): {
  cleanup: () => void;
  context: ValidationContext;
  contextRoot: string;
} {
  const rootDirectory = mkdtempSync(join(tmpdir(), "validation-invoke-"));
  const contextRoot = join(rootDirectory, "repo");
  const milestonePath = join(rootDirectory, "milestone");

  const promptDirectory = join(contextRoot, "context/workflows/ralph/building");
  mkdirSync(promptDirectory, { recursive: true });
  writeFileSync(
    join(promptDirectory, "pre-build-validation.md"),
    "Base validation prompt",
  );

  const context: ValidationContext = {
    milestonePath,
    subtask: {
      acceptanceCriteria: ["AC-1"],
      description: "Validation invocation",
      done: false,
      filesToRead: [],
      id: "SUB-403",
      taskRef: "TASK-017-validation-invoke",
      title: "Implement validateSubtask",
    },
    subtasksPath: join(milestonePath, "subtasks.json"),
  };

  return {
    cleanup: () => {
      rmSync(rootDirectory, { force: true, recursive: true });
    },
    context,
    contextRoot,
  };
}

describe("validateSubtask", () => {
  test("returns aligned with timed out warning near timeout threshold", async () => {
    const fixture = createValidationContextFixture();
    const invokeSpy = spyOn(
      summaryProvider,
      "invokeProviderSummary",
    ).mockResolvedValue(null);
    const logSpy = spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    const nowSpy = spyOn(Date, "now")
      .mockImplementationOnce(() => 10_000)
      .mockImplementationOnce(() => 69_500);

    try {
      const result = await validateSubtask(
        fixture.context,
        fixture.contextRoot,
      );

      expect(result).toEqual({ aligned: true });
      expect(invokeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ timeoutMs: VALIDATION_TIMEOUT_MS }),
      );
      expect(logSpy).toHaveBeenCalledWith(
        "[Validation] Validating SUB-403: Implement validateSubtask",
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Timed out"),
      );
    } finally {
      nowSpy.mockRestore();
      warnSpy.mockRestore();
      logSpy.mockRestore();
      invokeSpy.mockRestore();
      fixture.cleanup();
    }
  });

  test("returns aligned with invocation failed warning before timeout threshold", async () => {
    const fixture = createValidationContextFixture();
    const invokeSpy = spyOn(
      summaryProvider,
      "invokeProviderSummary",
    ).mockResolvedValue(null);
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    const nowSpy = spyOn(Date, "now")
      .mockImplementationOnce(() => 1000)
      .mockImplementationOnce(() => 1500);

    try {
      const result = await validateSubtask(
        fixture.context,
        fixture.contextRoot,
      );

      expect(result).toEqual({ aligned: true });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invocation failed"),
      );
    } finally {
      nowSpy.mockRestore();
      warnSpy.mockRestore();
      invokeSpy.mockRestore();
      fixture.cleanup();
    }
  });

  test("returns parsed aligned response from provider", async () => {
    const fixture = createValidationContextFixture();
    const invokeSpy = spyOn(
      summaryProvider,
      "invokeProviderSummary",
    ).mockResolvedValue('{"aligned": true}');

    try {
      const result = await validateSubtask(
        fixture.context,
        fixture.contextRoot,
      );

      expect(result).toEqual({ aligned: true });
    } finally {
      invokeSpy.mockRestore();
      fixture.cleanup();
    }
  });

  test("returns parsed misaligned response from provider", async () => {
    const fixture = createValidationContextFixture();
    const invokeSpy = spyOn(
      summaryProvider,
      "invokeProviderSummary",
    ).mockResolvedValue(
      JSON.stringify({
        aligned: false,
        issue_type: "too_broad",
        reason: "Too much scope",
        suggestion: "Split the work",
      }),
    );

    try {
      const result = await validateSubtask(
        fixture.context,
        fixture.contextRoot,
      );

      expect(result).toEqual({
        aligned: false,
        issueType: "too_broad",
        reason: "Too much scope",
        suggestion: "Split the work",
      });
    } finally {
      invokeSpy.mockRestore();
      fixture.cleanup();
    }
  });
});

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const BUILD_TS_PATH = join(testDirectory, "../../src/commands/ralph/build.ts");
const buildContent = readFileSync(BUILD_TS_PATH, "utf8");

describe("build validation integration", () => {
  test("imports validateAllSubtasks", () => {
    expect(buildContent).toContain(
      'import { validateAllSubtasks } from "./validation"',
    );
  });

  test("declares skippedSubtaskIds before validate-first block", () => {
    const declarationPattern =
      /let skippedSubtaskIds: Set<string> \| null = null;[\s\S]*resolveSkippedSubtaskIds\(/;
    expect(declarationPattern.test(buildContent)).toBe(true);
  });

  test("calls validateAllSubtasks with pending subtasks and context", () => {
    expect(buildContent).toContain(
      "const pendingSubtasks = getPendingSubtasks(initialSubtasksFile.subtasks);",
    );
    expect(buildContent).toContain("await validateAllSubtasks(");
    expect(buildContent).toContain("{ mode, subtasksPath }");
    expect(buildContent).toContain("milestonePath");
    expect(buildContent).toContain("contextRoot");
  });

  test("tracks skipped IDs from validation result", () => {
    expect(buildContent).toContain("validationResult.skippedSubtasks.map(");
    expect(buildContent).toContain("(s) => s.subtaskId");
  });

  test("skips validated-failed subtask IDs in iteration loop", () => {
    expect(buildContent).toContain(
      "if (!isValidatedSubtaskSkipped(currentSubtask, skippedSubtaskIds))",
    );
    expect(buildContent).toContain("Skipping ");
    expect(buildContent).toContain("(failed validation)");
  });
});

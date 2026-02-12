import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const BUILD_TS_PATH = join(testDirectory, "../../src/commands/ralph/build.ts");
const buildContent = readFileSync(BUILD_TS_PATH, "utf8");

describe("build validation integration", () => {
  test("imports validateAllSubtasks", () => {
    expect(buildContent).toContain('from "./validation"');
    expect(buildContent).toContain("validateAllSubtasks");
    expect(buildContent).toContain("writeValidationProposalArtifact");
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
    expect(buildContent).toContain("{ mode, model, provider, subtasksPath }");
    expect(buildContent).toContain("milestonePath");
    expect(buildContent).toContain("contextRoot");
  });

  test("tracks skipped IDs from validation result", () => {
    expect(buildContent).toContain("validationResult.skippedSubtasks.map(");
    expect(buildContent).toContain("(s) => s.subtaskId");
  });

  test("runs validation gate before build start messaging", () => {
    const validationCallIndex = buildContent.indexOf(
      "skippedSubtaskIds = await resolveSkippedSubtaskIds(",
    );
    const buildStartMessageIndex = buildContent.indexOf(
      'title: "Starting build loop"',
    );

    expect(validationCallIndex).toBeGreaterThan(-1);
    expect(buildStartMessageIndex).toBeGreaterThan(-1);
    expect(validationCallIndex).toBeLessThan(buildStartMessageIndex);
  });

  test("forwards provider and model into pre-build validation resolver", () => {
    expect(buildContent).toContain("model,");
    expect(buildContent).toContain("provider,");
    expect(buildContent).toContain("shouldForceProposalApply,");
    expect(buildContent).toContain("shouldRequireProposalReview,");
    expect(buildContent).toContain("model?: string;");
    expect(buildContent).toContain("provider: ProviderType;");
  });

  test("forwards provider/model/force/review into periodic calibration", () => {
    expect(buildContent).toContain("interface PeriodicCalibrationOptions {");
    expect(buildContent).toContain("force: boolean;");
    expect(buildContent).toContain("model?: string;");
    expect(buildContent).toContain("provider: ProviderType;");
    expect(buildContent).toContain("review: boolean;");
    expect(buildContent).toContain("force: shouldForceProposalApply,");
    expect(buildContent).toContain("model,");
    expect(buildContent).toContain("provider,");
    expect(buildContent).toContain("review: shouldRequireProposalReview,");
    expect(buildContent).toContain('await runCalibrate("all", {');
    expect(buildContent).toContain("force: shouldForceProposalApply,");
    expect(buildContent).toContain("model,");
    expect(buildContent).toContain("provider,");
    expect(buildContent).toContain("review: shouldRequireProposalReview,");
  });

  test("stages validation proposals before optional apply", () => {
    expect(buildContent).toContain("writeValidationProposalArtifact(");
    expect(buildContent).toContain("resolveApprovalForValidationProposal({");
    expect(buildContent).toContain("resolveValidationProposalMode({");
  });

  test("uses validation start messaging that clarifies ordering", () => {
    expect(buildContent).toContain(
      "Pre-build validation starting before iteration phase",
    );
  });

  test("handles no-runnable queue with validation skip context", () => {
    expect(buildContent).toContain("handleNoRunnableSubtasks({");
    expect(buildContent).toContain("Pre-build validation skipped");
    expect(buildContent).toContain(
      "Pending subtasks remain but none are runnable",
    );
  });

  test("selects next subtask from validation-filtered queue", () => {
    expect(buildContent).toContain("getNextRunnableSubtask(");
    expect(buildContent).toContain(
      "(subtask) => !subtask.done && !skippedSubtaskIds.has(subtask.id)",
    );
  });
});

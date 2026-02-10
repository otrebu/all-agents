import * as ralphConfig from "@tools/commands/ralph/config";
import {
  resolveMilestoneFromOptions,
  validateApprovalFlags,
} from "@tools/commands/ralph/index";
import { describe, expect, spyOn, test } from "bun:test";
import path from "node:path";

describe("validateApprovalFlags", () => {
  test("returns void when neither flag is set", () => {
    expect(() => {
      validateApprovalFlags(false, false);
    }).not.toThrow();
  });

  test("returns void when only one flag is set", () => {
    expect(() => {
      validateApprovalFlags(true, false);
    }).not.toThrow();
    expect(() => {
      validateApprovalFlags(false, true);
    }).not.toThrow();
  });

  test("prints error and exits when both flags are true", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit:${code}`);
    });

    try {
      expect(() => {
        validateApprovalFlags(true, true);
      }).toThrow("process.exit:1");
      expect(errorSpy).toHaveBeenCalledWith(
        "Cannot use --force and --review together",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      errorSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });
});

describe("resolveMilestoneFromOptions", () => {
  test("--milestone takes priority over --output-dir", () => {
    const resolvedMilestonePath = resolveMilestoneFromOptions(
      "005-consolidate-simplify",
      undefined,
      "docs/planning/milestones/006-cascade-mode-for-good",
    );

    expect(resolvedMilestonePath).toBeDefined();
    expect(resolvedMilestonePath).toContain(
      path.join("docs", "planning", "milestones", "005-consolidate-simplify"),
    );
  });

  test("--story takes priority over --output-dir", () => {
    const resolvedMilestonePath = resolveMilestoneFromOptions(
      undefined,
      "001-provider-foundation",
      "docs/planning/milestones/006-cascade-mode-for-good",
    );

    expect(resolvedMilestonePath).toBeDefined();
    expect(resolvedMilestonePath).toContain(
      path.join("docs", "planning", "milestones", "004-MULTI-CLI"),
    );
  });

  test("extracts milestone root from --output-dir milestone path", () => {
    const resolvedMilestonePath = resolveMilestoneFromOptions(
      undefined,
      undefined,
      path.join(
        "docs",
        "planning",
        "milestones",
        "006-cascade-mode-for-good",
        "feedback",
      ),
    );

    expect(resolvedMilestonePath).toBeDefined();
    expect(resolvedMilestonePath).toContain(
      path.join("docs", "planning", "milestones", "006-cascade-mode-for-good"),
    );
  });

  test("returns undefined when --output-dir is not a milestone path", () => {
    const resolvedMilestonePath = resolveMilestoneFromOptions(
      undefined,
      undefined,
      "docs/planning/feedback",
    );

    expect(resolvedMilestonePath).toBeUndefined();
  });

  test("returns undefined when --milestone, --story, and --output-dir are all undefined", () => {
    const resolvedMilestonePath = resolveMilestoneFromOptions(
      undefined,
      undefined,
      void 0,
    );

    expect(resolvedMilestonePath).toBeUndefined();
  });

  test("resolves planning log path from output-dir milestone instead of _orphan", () => {
    const getPlanningLogPathSpy = spyOn(ralphConfig, "getPlanningLogPath");
    const resolvedMilestonePath = resolveMilestoneFromOptions(
      undefined,
      undefined,
      path.join(
        "docs",
        "planning",
        "milestones",
        "006-cascade-mode-for-good",
        "feedback",
      ),
    );

    expect(resolvedMilestonePath).toBeDefined();
    expect(resolvedMilestonePath).toContain(
      path.join("docs", "planning", "milestones", "006-cascade-mode-for-good"),
    );

    if (resolvedMilestonePath === undefined || resolvedMilestonePath === null) {
      throw new Error("Expected milestone path to resolve");
    }

    const planningLogPath = ralphConfig.getPlanningLogPath(
      resolvedMilestonePath,
    );
    expect(getPlanningLogPathSpy).toHaveBeenCalledWith(resolvedMilestonePath);
    expect(getPlanningLogPathSpy).not.toHaveBeenCalledWith(undefined);
    const utcDate = new Date().toISOString().split("T")[0];
    expect(planningLogPath).toBe(
      path.join(resolvedMilestonePath, "logs", `${utcDate}.jsonl`),
    );
    expect(planningLogPath).not.toContain("_orphan");
  });
});

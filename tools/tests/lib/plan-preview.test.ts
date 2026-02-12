import {
  computeExecutionPlan,
  LEVEL_FLOWS,
} from "@tools/commands/ralph/plan-preview";
import { describe, expect, test } from "bun:test";

describe("computeExecutionPlan", () => {
  test("single-level build returns one phase using LEVEL_FLOWS arrays", () => {
    const plan = computeExecutionPlan({ command: "build" });

    expect(plan.phases).toHaveLength(1);
    expect(plan.summary.phaseCount).toBe(1);
    expect(plan.phases[0]?.level).toBe("build");
    expect(plan.phases[0]?.reads).toEqual(LEVEL_FLOWS.build.reads);
    expect(plan.phases[0]?.steps.map((step) => step.text)).toEqual(
      LEVEL_FLOWS.build.steps,
    );
    expect(plan.phases[0]?.writes).toEqual(LEVEL_FLOWS.build.writes);
  });

  test("cascade target build from subtasks resolves to [build]", () => {
    const plan = computeExecutionPlan({
      cascadeTarget: "build",
      command: "plan-subtasks",
    });

    expect(plan.phases.map((phase) => phase.level)).toEqual(["build"]);
  });

  test("cascade target calibrate from subtasks resolves to [build, calibrate]", () => {
    const plan = computeExecutionPlan({
      cascadeTarget: "calibrate",
      command: "plan-subtasks",
    });

    expect(plan.phases.map((phase) => phase.level)).toEqual([
      "build",
      "calibrate",
    ]);
  });

  test("from-level override adjusts cascade start point", () => {
    const plan = computeExecutionPlan({
      cascadeTarget: "calibrate",
      command: "plan-subtasks",
      fromLevel: "build",
    });

    expect(plan.phases.map((phase) => phase.level)).toEqual(["calibrate"]);
  });

  test("approval gate resolves to write with --force", () => {
    const plan = computeExecutionPlan({
      command: "plan-tasks",
      flags: { force: true },
    });

    expect(plan.phases[0]?.approvalAction).toBe("write");
    expect(plan.phases[0]?.approvalGate).toBe("createTasks");
  });

  test("approval gate resolves to prompt with --review in TTY context", () => {
    const plan = computeExecutionPlan({
      command: "plan-stories",
      flags: { isTTY: true, review: true },
    });

    expect(plan.phases[0]?.approvalAction).toBe("prompt");
    expect(plan.phases[0]?.approvalGate).toBe("createStories");
  });

  test("LEVEL_FLOWS includes all 8 pipeline command entries", () => {
    expect(Object.keys(LEVEL_FLOWS).sort()).toEqual([
      "build",
      "calibrate-all",
      "calibrate-intention",
      "calibrate-technical",
      "plan-roadmap",
      "plan-stories",
      "plan-subtasks",
      "plan-tasks",
    ]);
  });

  test("execution plan is JSON-serializable for headless dry-run output", () => {
    const plan = computeExecutionPlan({
      command: "build",
      flags: { headless: true },
    });

    const serialized = JSON.stringify(plan);
    const parsed: unknown = JSON.parse(serialized);

    expect(parsed).toEqual(plan);
  });
});

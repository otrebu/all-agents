import {
  collectRuntimeContext,
  computeExecutionPlan,
  LEVEL_FLOWS,
} from "@tools/commands/ralph/plan-preview";
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function createMilestoneFixture(): {
  cleanup: () => void;
  milestonePath: string;
  subtasksPath: string;
} {
  const root = mkdtempSync(join(tmpdir(), "plan-preview-"));
  const milestonePath = join(root, "007-pipeline-preview");
  const storiesPath = join(milestonePath, "stories");
  const tasksPath = join(milestonePath, "tasks");
  const subtasksPath = join(milestonePath, "subtasks.json");

  mkdirSync(storiesPath, { recursive: true });
  mkdirSync(tasksPath, { recursive: true });

  writeFileSync(join(storiesPath, "001-STORY-alpha.md"), "# story\n", "utf8");
  writeFileSync(join(storiesPath, "002-STORY-beta.md"), "# story\n", "utf8");
  writeFileSync(join(tasksPath, "001-TASK-one.md"), "# task\n", "utf8");
  writeFileSync(join(tasksPath, "002-TASK-two.md"), "# task\n", "utf8");
  writeFileSync(join(tasksPath, "003-TASK-three.md"), "# task\n", "utf8");

  writeFileSync(
    subtasksPath,
    JSON.stringify(
      {
        $schema: "../../schemas/subtasks.schema.json",
        metadata: { milestoneRef: "007-pipeline-preview", scope: "milestone" },
        subtasks: [
          { description: "a", done: true, id: "SUB-001", title: "one" },
          { description: "b", done: false, id: "SUB-002", title: "two" },
          { description: "c", done: false, id: "SUB-003", title: "three" },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  return {
    cleanup: () => {
      rmSync(root, { force: true, recursive: true });
    },
    milestonePath,
    subtasksPath,
  };
}

describe("computeExecutionPlan", () => {
  test("single-level build returns one phase using LEVEL_FLOWS arrays", () => {
    const plan = computeExecutionPlan({ command: "build" });
    const phase = plan.phases[0];

    expect(plan.phases).toHaveLength(1);
    expect(plan.summary.phaseCount).toBe(1);
    expect(phase?.level).toBe("build");
    for (const expectedRead of LEVEL_FLOWS.build.reads) {
      expect(
        phase?.reads.some((actualRead) => actualRead.includes(expectedRead)),
      ).toBe(true);
    }
    expect(phase?.steps.map((step) => step.text)).toEqual(
      LEVEL_FLOWS.build.steps,
    );
    for (const expectedWrite of LEVEL_FLOWS.build.writes) {
      expect(
        phase?.writes.some((actualWrite) =>
          actualWrite.includes(expectedWrite),
        ),
      ).toBe(true);
    }
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

  test("--validate-first adds a step annotation before build execution", () => {
    const plan = computeExecutionPlan({
      command: "build",
      flags: { validateFirst: true },
    });

    const validateStep = plan.phases[0]?.steps.find((step) =>
      step.flagEffects.some(
        (effect) =>
          effect.flag === "--validate-first" && effect.type === "added",
      ),
    );

    expect(validateStep?.text).toContain("pre-build validation");
  });

  test("--headless replaces interactive approval step with auto-write", () => {
    const plan = computeExecutionPlan({
      command: "plan-stories",
      flags: { headless: true },
    });

    const replacedStep = plan.phases[0]?.steps.find((step) =>
      step.flagEffects.some(
        (effect) => effect.flag === "--headless" && effect.type === "replaced",
      ),
    );

    expect(replacedStep?.text).toContain("Auto-write");
  });

  test("--force strikes approval prompt steps", () => {
    const plan = computeExecutionPlan({
      command: "plan-tasks",
      flags: { force: true },
    });

    const struckStep = plan.phases[0]?.steps.find((step) =>
      step.flagEffects.some(
        (effect) => effect.flag === "--force" && effect.type === "struck",
      ),
    );

    expect(struckStep?.text).toContain("Prompt for approval");
  });

  test("multiple flags compose without conflict", () => {
    const plan = computeExecutionPlan({
      cascadeTarget: "build",
      command: "plan-stories",
      flags: { force: true, headless: true, validateFirst: true },
    });

    const allEffects = plan.phases.flatMap((phase) =>
      phase.steps.flatMap((step) => step.flagEffects),
    );

    expect(allEffects.some((effect) => effect.type === "added")).toBe(true);
    expect(allEffects.some((effect) => effect.type === "replaced")).toBe(true);
    expect(allEffects.some((effect) => effect.type === "struck")).toBe(true);
  });

  test("collectRuntimeContext reads story/task counts from milestone directories", () => {
    const fixture = createMilestoneFixture();

    try {
      const runtime = collectRuntimeContext({
        milestonePath: fixture.milestonePath,
        subtasksPath: fixture.subtasksPath,
      });

      expect(runtime.storiesCount).toBe(2);
      expect(runtime.tasksCount).toBe(3);
    } finally {
      fixture.cleanup();
    }
  });

  test("collectRuntimeContext reads queue stats from subtasks.json", () => {
    const fixture = createMilestoneFixture();

    try {
      const runtime = collectRuntimeContext({
        milestonePath: fixture.milestonePath,
        subtasksPath: fixture.subtasksPath,
      });

      expect(runtime.queue).toEqual({ completed: 1, pending: 2, total: 3 });
    } finally {
      fixture.cleanup();
    }
  });

  test("phase time estimates use '~' prefix", () => {
    const plan = computeExecutionPlan({
      command: "plan-subtasks",
      flags: { calibrateEvery: 2 },
    });

    expect(
      plan.phases.every((phase) => phase.estimatedTime.startsWith("~")),
    ).toBe(true);
    expect(plan.summary.totalEstimatedTime.startsWith("~")).toBe(true);
  });
});

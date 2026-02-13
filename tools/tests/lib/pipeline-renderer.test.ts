import type { PhaseMetrics } from "@tools/commands/ralph/types";

import PipelineRenderer from "@tools/commands/ralph/pipeline-renderer";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

describe("PipelineRenderer", () => {
  const mockPhases = ["stories", "tasks", "subtasks", "build"];

  function requireSpy<T>(spy: null | T): T {
    if (spy === null) {
      throw new Error("Expected spy to be initialized");
    }
    return spy;
  }

  let clearIntervalSpy: null | ReturnType<
    typeof spyOn<typeof globalThis, "clearInterval">
  > = null;
  let setIntervalSpy: null | ReturnType<
    typeof spyOn<typeof globalThis, "setInterval">
  > = null;
  let stdoutWriteSpy: null | ReturnType<
    typeof spyOn<typeof process.stdout, "write">
  > = null;

  beforeEach(() => {
    stdoutWriteSpy = spyOn(process.stdout, "write").mockImplementation(
      () => true,
    );
    setIntervalSpy = spyOn(globalThis, "setInterval").mockImplementation(((
      callback: (...args: Array<unknown>) => void,
      delay?: number,
    ): ReturnType<typeof setInterval> => {
      void callback;
      void delay;
      return 101 as unknown as ReturnType<typeof setInterval>;
    }) as unknown as typeof setInterval);
    clearIntervalSpy = spyOn(globalThis, "clearInterval").mockImplementation(
      mock(() => {}),
    );
  });

  afterEach(() => {
    stdoutWriteSpy?.mockRestore();
    setIntervalSpy?.mockRestore();
    clearIntervalSpy?.mockRestore();
    stdoutWriteSpy = null;
    setIntervalSpy = null;
    clearIntervalSpy = null;
  });

  test("instantiates with mock phases and pending initial state", () => {
    const renderer = new PipelineRenderer(mockPhases, true, true);
    const internal = renderer as unknown as {
      activePhaseIndex: null | number;
      phases: Array<{ name: string; state: string }>;
    };

    expect(internal.activePhaseIndex).toBeNull();
    expect(internal.phases).toHaveLength(4);
    expect(internal.phases.map((phase) => phase.name)).toEqual(mockPhases);
    expect(internal.phases.every((phase) => phase.state === "pending")).toBe(
      true,
    );
  });

  test("startPhase marks phase active and starts timer", () => {
    const renderer = new PipelineRenderer(mockPhases, true, true);
    const internal = renderer as unknown as {
      activePhaseIndex: null | number;
      phases: Array<{ name: string; state: string }>;
      timers: Set<ReturnType<typeof setInterval>>;
    };

    renderer.startPhase("build");

    expect(internal.activePhaseIndex).toBe(3);
    expect(internal.phases[3]?.state).toBe("running");
    expect(requireSpy(setIntervalSpy)).toHaveBeenCalledWith(
      expect.any(Function),
      1000,
    );
    expect(internal.timers.size).toBe(1);
  });

  test("completePhase stores metrics and stops timer", () => {
    const renderer = new PipelineRenderer(mockPhases, true, true);
    const internal = renderer as unknown as {
      activePhaseIndex: null | number;
      phases: Array<{ metrics?: PhaseMetrics; state: string }>;
      timers: Set<ReturnType<typeof setInterval>>;
    };
    const metrics: PhaseMetrics = {
      costUsd: 0.24,
      elapsedMs: 12_000,
      filesChanged: 5,
    };

    renderer.startPhase("tasks");
    renderer.completePhase(metrics);

    expect(internal.activePhaseIndex).toBeNull();
    expect(internal.phases[1]?.state).toBe("completed");
    expect(internal.phases[1]?.metrics).toEqual(metrics);
    expect(requireSpy(clearIntervalSpy)).toHaveBeenCalledWith(101);
    expect(internal.timers.size).toBe(0);
  });

  test("stop cleans up all timers", () => {
    const renderer = new PipelineRenderer(mockPhases, true, true);

    renderer.startPhase("stories");
    renderer.stop();

    expect(requireSpy(clearIntervalSpy)).toHaveBeenCalledWith(101);
    expect(requireSpy(clearIntervalSpy)).toHaveBeenCalledTimes(1);
  });

  test("updateSubtask tracks progress and triggers progress line render", () => {
    const renderer = new PipelineRenderer(mockPhases, true, true);
    const internal = renderer as unknown as {
      render: () => string;
      subtaskState: {
        current: number;
        description: string;
        id: string;
        knownSubtasks: Array<{
          description: string;
          id: string;
          position: number;
        }>;
        total: number;
      } | null;
    };

    renderer.startPhase("build");
    renderer.updateSubtask("SUB-015", "Add login endpoint", 3, 12);

    const rendered = internal.render();

    expect(internal.subtaskState).not.toBeNull();
    expect(internal.subtaskState?.id).toBe("SUB-015");
    expect(internal.subtaskState?.current).toBe(3);
    expect(internal.subtaskState?.total).toBe(12);
    expect(rendered).toContain("SUB-015");
    expect(rendered).toContain("Add login endpoint");
    expect(rendered).toContain("3/12");
    expect(rendered).toContain("25%");
    expect(rendered).toContain("[");
    expect(rendered).toContain("]");
  });

  test("setApprovalWait applies double-bar symbol to active phase", () => {
    const renderer = new PipelineRenderer(mockPhases, true, true);
    const internal = renderer as unknown as {
      phases: Array<{ approvalGateName?: string; state: string }>;
      render: () => string;
    };

    renderer.startPhase("tasks");
    renderer.setApprovalWait("createTasks");

    const rendered = internal.render();

    expect(internal.phases[1]?.state).toBe("approval-wait");
    expect(internal.phases[1]?.approvalGateName).toBe("createTasks");
    expect(rendered).toContain("[tasks] ‖");
    expect(rendered).toContain("Awaiting approval: createTasks");
  });

  test("collapsible tree shows completed phases one-line and active phase expanded", () => {
    const renderer = new PipelineRenderer(mockPhases, true, true);
    const completedStories: PhaseMetrics = {
      costUsd: 0.15,
      elapsedMs: 192_000,
      filesChanged: 5,
    };
    const completedTasks: PhaseMetrics = {
      costUsd: 0.22,
      elapsedMs: 344_000,
      filesChanged: 12,
    };

    renderer.startPhase("stories");
    renderer.completePhase(completedStories);
    renderer.startPhase("tasks");
    renderer.completePhase(completedTasks);
    renderer.startPhase("build");
    renderer.updateSubtask("SUB-013", "Add auth middleware", 1, 3);
    renderer.updateSubtask("SUB-014", "Create JWT token service", 2, 3);

    const rendered = (renderer as unknown as { render: () => string }).render();

    expect(rendered).toContain("▸ stories");
    expect(rendered).toContain("5 files");
    expect(rendered).toContain("$0.15");
    expect(rendered).toContain("▸ tasks");
    expect(rendered).toContain("12 files");
    expect(rendered).toContain("$0.22");
    expect(rendered).toContain("▾ build");
    expect(rendered).toContain("✓ SUB-013");
    expect(rendered).toContain("● SUB-014");
    expect(rendered).toContain("○ 1 pending");
  });

  test("phase bar renders expected symbols for states", () => {
    const renderer = new PipelineRenderer(mockPhases, true, true);
    const internal = renderer as unknown as {
      phases: Array<{ state: string }>;
      render: () => string;
    };

    const [phaseOne, phaseTwo, phaseThree, phaseFour] = internal.phases;
    if (
      phaseOne === undefined ||
      phaseTwo === undefined ||
      phaseThree === undefined ||
      phaseFour === undefined
    ) {
      throw new Error("Expected four phases in renderer test state");
    }
    phaseOne.state = "completed";
    phaseTwo.state = "running";
    phaseThree.state = "pending";
    phaseFour.state = "stopped";

    const line = internal.render();

    expect(line).toContain("[stories] ✓");
    expect(line).toContain("[tasks] ●");
    expect(line).toContain("subtasks");
    expect(line).toContain("[build] ✗");
  });
});

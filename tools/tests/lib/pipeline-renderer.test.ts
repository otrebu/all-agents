import type { PhaseMetrics } from "@tools/commands/ralph/types";

import { BOX_WIDTH } from "@tools/commands/ralph/display";
import { createPipelineRenderer } from "@tools/commands/ralph/pipeline-renderer";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import stringWidth from "string-width";

describe("PipelineRenderer", () => {
  const mockPhases = ["stories", "tasks", "subtasks", "build"];

  function expectFixedWidthLines(output: string): void {
    const nonEmptyLines = output.split("\n").filter((line) => line !== "");
    for (const line of nonEmptyLines) {
      expect(stringWidth(line)).toBe(BOX_WIDTH);
    }
  }

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
    const renderer = createPipelineRenderer(mockPhases, true, true);
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
    const renderer = createPipelineRenderer(mockPhases, true, true);
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
    const renderer = createPipelineRenderer(mockPhases, true, true);
    const internal = renderer as unknown as {
      activePhaseIndex: null | number;
      phases: Array<{ metrics?: PhaseMetrics; state: string }>;
      timers: Set<ReturnType<typeof setInterval>>;
    };
    const metrics: PhaseMetrics = {
      costUsd: 0.24,
      filesChanged: 5,
      timeElapsedMs: 12_000,
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
    const renderer = createPipelineRenderer(mockPhases, true, true);

    renderer.startPhase("stories");
    renderer.stop();

    expect(requireSpy(clearIntervalSpy)).toHaveBeenCalledWith(101);
    expect(requireSpy(clearIntervalSpy)).toHaveBeenCalledTimes(1);
  });

  test("updateSubtask tracks progress and triggers progress line render", () => {
    const renderer = createPipelineRenderer(mockPhases, true, true);
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
    expectFixedWidthLines(rendered);
  });

  test("setApprovalWait applies double-bar symbol to active phase", () => {
    const renderer = createPipelineRenderer(mockPhases, true, true);
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
    expectFixedWidthLines(rendered);
  });

  test("collapsible tree shows completed phases one-line and active phase expanded", () => {
    const renderer = createPipelineRenderer(mockPhases, true, true);
    const completedStories: PhaseMetrics = {
      costUsd: 0.15,
      filesChanged: 5,
      timeElapsedMs: 192_000,
    };
    const completedTasks: PhaseMetrics = {
      costUsd: 0.22,
      filesChanged: 12,
      timeElapsedMs: 344_000,
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
    expectFixedWidthLines(rendered);
  });

  test("phase bar renders expected symbols for states", () => {
    const renderer = createPipelineRenderer(mockPhases, true, true);
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

  test("headless + TTY renders in-place with ANSI cursor controls", () => {
    const renderer = createPipelineRenderer(mockPhases, true, true);

    renderer.startPhase("stories");
    renderer.setApprovalWait("createStories");

    const output = requireSpy(stdoutWriteSpy)
      .mock.calls.map(([chunk]) => String(chunk))
      .join("");

    expect(output).toContain("\r");
    expect(output).toContain("\x1b[6F");
    expect(output).toContain("\x1b[2K");
    expect(output).not.toContain("\x1b[H");
  });

  test("headless + non-TTY does not emit cursor controls", () => {
    const renderer = createPipelineRenderer(mockPhases, true, false);

    renderer.startPhase("stories");

    const output = requireSpy(stdoutWriteSpy)
      .mock.calls.map(([chunk]) => String(chunk))
      .join("");

    expect(output).toContain("[PIPELINE]");
    expect(output).not.toContain("\x1b[H");
    expect(output).not.toContain("\x1b[2K");
  });

  test("headless + TTY suspend stops in-place rewrites until resumed", () => {
    const renderer = createPipelineRenderer(mockPhases, true, true);

    renderer.startPhase("stories");
    const writeCallsBeforeSuspend =
      requireSpy(stdoutWriteSpy).mock.calls.length;

    renderer.suspend();
    renderer.setApprovalWait("createStories");

    expect(requireSpy(stdoutWriteSpy).mock.calls.length).toBe(
      writeCallsBeforeSuspend,
    );
  });

  test("headless + TTY resume resets rewind offset before next render", () => {
    const renderer = createPipelineRenderer(mockPhases, true, true);

    renderer.startPhase("stories");
    renderer.suspend();
    renderer.setApprovalWait("createStories");
    requireSpy(stdoutWriteSpy).mock.calls.length = 0;

    renderer.resume();
    renderer.updateSubtask("SUB-301", "resume rendering", 1, 2);

    const output = requireSpy(stdoutWriteSpy)
      .mock.calls.map(([chunk]) => String(chunk))
      .join("");

    expect(output).toContain("\r");
    expect(output).not.toContain("\x1b[6F");
  });

  test("supervised mode reprints full header on each render", () => {
    const renderer = createPipelineRenderer(mockPhases, false, true);

    renderer.startPhase("build");
    renderer.updateSubtask("SUB-021", "TTY rendering modes", 1, 3);

    const output = requireSpy(stdoutWriteSpy)
      .mock.calls.map(([chunk]) => String(chunk))
      .join("");

    expect(output.match(/\[build\] ●/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(output).toContain("SUB-021");
    expect(output).not.toContain("\x1b[H");
    expect(output).not.toContain("\x1b[2K");
  });

  test("non-TTY mode logs phase transition markers", () => {
    const renderer = createPipelineRenderer(mockPhases, false, false);
    const metrics: PhaseMetrics = {
      costUsd: 0.1,
      filesChanged: 2,
      timeElapsedMs: 10_000,
    };

    renderer.startPhase("tasks");
    renderer.updateSubtask("SUB-001", "No-op for transition log", 1, 3);
    renderer.setApprovalWait("createTasks");
    renderer.completePhase(metrics);

    const calls = requireSpy(stdoutWriteSpy).mock.calls.map(([chunk]) =>
      String(chunk),
    );
    const output = calls.join("");

    expect(calls).toHaveLength(3);
    expect(output).toContain("[PIPELINE] phase=tasks state=running");
    expect(output).toContain("[PIPELINE] phase=tasks state=approval-wait");
    expect(output).toContain("[PIPELINE] phase=idle completed=1/4");
  });
});

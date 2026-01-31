import {
  areTasksOfTypeComplete,
  getSpikeOutputPath,
  hasPendingTasksOfType,
  processSpikeTasks,
  readSpikeOutput,
  readTasksFile,
  type SpikeOutput,
  writeTasksFile,
} from "@tools/commands/ralph/execution";
import { type GeneratedTasksFile } from "@tools/commands/ralph/planning";
import {
  createSessionDirectory,
  removeSessionDirectory,
} from "@tools/commands/ralph/temporary-session";
import { afterEach, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";

describe("spike execution", () => {
  let testSessionPath: null | string = null;

  // Clean up any test session after each test
  afterEach(() => {
    if (testSessionPath !== null) {
      removeSessionDirectory(testSessionPath);
      testSessionPath = null;
    }
  });

  describe("getSpikeOutputPath", () => {
    test("generates correct path for spike output", () => {
      const path = getSpikeOutputPath("/tmp/session", 1);
      expect(path).toBe("/tmp/session/spike-1-output.json");
    });

    test("handles different task IDs", () => {
      expect(getSpikeOutputPath("/tmp/session", 5)).toBe(
        "/tmp/session/spike-5-output.json",
      );
      expect(getSpikeOutputPath("/tmp/session", 100)).toBe(
        "/tmp/session/spike-100-output.json",
      );
    });
  });

  describe("readSpikeOutput", () => {
    test("returns null for non-existent file", () => {
      expect(readSpikeOutput("/nonexistent/path.json")).toBeNull();
    });

    test("parses valid spike output", () => {
      const session = createSessionDirectory("Test Spike Output");
      testSessionPath = session.path;

      const outputPath = getSpikeOutputPath(session.path, 1);
      const spikeOutput: SpikeOutput = {
        findings: "Discovered that JWT is the best option",
        newTasks: [
          {
            acceptanceCriteria: ["API validates tokens", "Tests pass"],
            title: "Implement JWT middleware",
          },
        ],
      };
      writeFileSync(outputPath, JSON.stringify(spikeOutput));

      const result = readSpikeOutput(outputPath);
      expect(result).not.toBeNull();
      expect(result?.findings).toBe("Discovered that JWT is the best option");
      expect(result?.newTasks).toHaveLength(1);
      expect(result?.newTasks[0]?.title).toBe("Implement JWT middleware");
    });

    test("returns null for invalid JSON", () => {
      const session = createSessionDirectory("Test Invalid JSON");
      testSessionPath = session.path;

      const outputPath = getSpikeOutputPath(session.path, 1);
      writeFileSync(outputPath, "not valid json");

      expect(readSpikeOutput(outputPath)).toBeNull();
    });

    test("returns null for missing findings", () => {
      const session = createSessionDirectory("Test Missing Findings");
      testSessionPath = session.path;

      const outputPath = getSpikeOutputPath(session.path, 1);
      writeFileSync(outputPath, JSON.stringify({ newTasks: [] }));

      expect(readSpikeOutput(outputPath)).toBeNull();
    });

    test("returns null for missing newTasks array", () => {
      const session = createSessionDirectory("Test Missing Tasks");
      testSessionPath = session.path;

      const outputPath = getSpikeOutputPath(session.path, 1);
      writeFileSync(outputPath, JSON.stringify({ findings: "Found stuff" }));

      expect(readSpikeOutput(outputPath)).toBeNull();
    });

    test("validates newTasks structure", () => {
      const session = createSessionDirectory("Test Invalid Tasks");
      testSessionPath = session.path;

      const outputPath = getSpikeOutputPath(session.path, 1);

      // Missing title
      writeFileSync(
        outputPath,
        JSON.stringify({
          findings: "Found stuff",
          newTasks: [{ acceptanceCriteria: ["Done"] }],
        }),
      );
      expect(readSpikeOutput(outputPath)).toBeNull();

      // Empty title
      writeFileSync(
        outputPath,
        JSON.stringify({
          findings: "Found stuff",
          newTasks: [{ acceptanceCriteria: ["Done"], title: "" }],
        }),
      );
      expect(readSpikeOutput(outputPath)).toBeNull();

      // Missing acceptanceCriteria
      writeFileSync(
        outputPath,
        JSON.stringify({
          findings: "Found stuff",
          newTasks: [{ title: "Task" }],
        }),
      );
      expect(readSpikeOutput(outputPath)).toBeNull();

      // Empty acceptanceCriteria
      writeFileSync(
        outputPath,
        JSON.stringify({
          findings: "Found stuff",
          newTasks: [{ acceptanceCriteria: [], title: "Task" }],
        }),
      );
      expect(readSpikeOutput(outputPath)).toBeNull();
    });

    test("allows empty newTasks array", () => {
      const session = createSessionDirectory("Test Empty Tasks");
      testSessionPath = session.path;

      const outputPath = getSpikeOutputPath(session.path, 1);
      writeFileSync(
        outputPath,
        JSON.stringify({ findings: "Nothing to implement", newTasks: [] }),
      );

      const result = readSpikeOutput(outputPath);
      expect(result).not.toBeNull();
      expect(result?.newTasks).toHaveLength(0);
    });
  });

  describe("hasPendingTasksOfType", () => {
    test("returns true for pending spike tasks", () => {
      const tasksFile: GeneratedTasksFile = {
        goal: "Test",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "pending",
            title: "Spike",
            type: "spike",
          },
        ],
      };
      expect(hasPendingTasksOfType(tasksFile, "spike")).toBe(true);
      expect(hasPendingTasksOfType(tasksFile, "implement")).toBe(false);
    });

    test("returns true for in_progress tasks", () => {
      const tasksFile: GeneratedTasksFile = {
        goal: "Test",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "in_progress",
            title: "Impl",
            type: "implement",
          },
        ],
      };
      expect(hasPendingTasksOfType(tasksFile, "implement")).toBe(true);
    });

    test("returns false for complete tasks", () => {
      const tasksFile: GeneratedTasksFile = {
        goal: "Test",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "complete",
            title: "Spike",
            type: "spike",
          },
        ],
      };
      expect(hasPendingTasksOfType(tasksFile, "spike")).toBe(false);
    });
  });

  describe("areTasksOfTypeComplete", () => {
    test("returns true when all tasks of type are complete", () => {
      const tasksFile: GeneratedTasksFile = {
        goal: "Test",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "complete",
            title: "Spike 1",
            type: "spike",
          },
          {
            acceptanceCriteria: ["Done"],
            id: 2,
            status: "pending",
            title: "Impl 1",
            type: "implement",
          },
        ],
      };
      expect(areTasksOfTypeComplete(tasksFile, "spike")).toBe(true);
      expect(areTasksOfTypeComplete(tasksFile, "implement")).toBe(false);
    });

    test("returns true when no tasks of type exist", () => {
      const tasksFile: GeneratedTasksFile = {
        goal: "Test",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "pending",
            title: "Impl",
            type: "implement",
          },
        ],
      };
      expect(areTasksOfTypeComplete(tasksFile, "spike")).toBe(true);
    });
  });

  describe("processSpikeTasks", () => {
    test("adds spawned tasks from spike outputs", () => {
      const session = createSessionDirectory("Test Process Spikes");
      testSessionPath = session.path;

      // Create tasks with a completed spike
      const tasksFile: GeneratedTasksFile = {
        goal: "Build auth",
        tasks: [
          {
            acceptanceCriteria: ["Document options"],
            id: 1,
            status: "complete",
            title: "Research auth options",
            type: "spike",
          },
          {
            acceptanceCriteria: ["Basic setup works"],
            id: 2,
            status: "pending",
            title: "Basic setup",
            type: "implement",
          },
        ],
      };
      writeTasksFile(session.path, tasksFile);

      // Create spike output
      const spikeOutput: SpikeOutput = {
        findings: "JWT is best",
        newTasks: [
          {
            acceptanceCriteria: ["Middleware validates tokens"],
            title: "Add JWT middleware",
          },
          { acceptanceCriteria: ["Refresh works"], title: "Add token refresh" },
        ],
      };
      writeFileSync(
        getSpikeOutputPath(session.path, 1),
        JSON.stringify(spikeOutput),
      );

      // Process spikes
      const newTasksCount = processSpikeTasks(session.path);
      expect(newTasksCount).toBe(2);

      // Verify tasks were added
      const updatedTasks = readTasksFile(session.path);
      expect(updatedTasks?.tasks).toHaveLength(4);

      // Check spawned tasks
      const spawnedTasks = updatedTasks?.tasks.filter((t) => t.spawnedBy === 1);
      expect(spawnedTasks).toHaveLength(2);
      expect(spawnedTasks?.[0]?.type).toBe("implement");
      expect(spawnedTasks?.[0]?.status).toBe("pending");
      expect(spawnedTasks?.[0]?.id).toBe(3);
      expect(spawnedTasks?.[1]?.id).toBe(4);
    });

    test("returns 0 when no completed spikes", () => {
      const session = createSessionDirectory("Test No Spikes");
      testSessionPath = session.path;

      const tasksFile: GeneratedTasksFile = {
        goal: "Build",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "pending",
            title: "Spike",
            type: "spike",
          },
        ],
      };
      writeTasksFile(session.path, tasksFile);

      expect(processSpikeTasks(session.path)).toBe(0);
    });

    test("returns 0 when spike has no output file", () => {
      const session = createSessionDirectory("Test No Output");
      testSessionPath = session.path;

      const tasksFile: GeneratedTasksFile = {
        goal: "Build",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "complete",
            title: "Spike",
            type: "spike",
          },
        ],
      };
      writeTasksFile(session.path, tasksFile);

      expect(processSpikeTasks(session.path)).toBe(0);
    });

    test("returns 0 when spike output has empty newTasks", () => {
      const session = createSessionDirectory("Test Empty Output");
      testSessionPath = session.path;

      const tasksFile: GeneratedTasksFile = {
        goal: "Build",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "complete",
            title: "Spike",
            type: "spike",
          },
        ],
      };
      writeTasksFile(session.path, tasksFile);

      writeFileSync(
        getSpikeOutputPath(session.path, 1),
        JSON.stringify({ findings: "Nothing needed", newTasks: [] }),
      );

      expect(processSpikeTasks(session.path)).toBe(0);
    });
  });

  describe("phase field in tasks file", () => {
    test("phase field is preserved in tasks file", () => {
      const session = createSessionDirectory("Test Phase Field");
      testSessionPath = session.path;

      const tasksFile: GeneratedTasksFile = {
        goal: "Test",
        phase: "spike",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "pending",
            title: "Task",
            type: "spike",
          },
        ],
      };
      writeTasksFile(session.path, tasksFile);

      const readBack = readTasksFile(session.path);
      expect(readBack?.phase).toBe("spike");
    });
  });
});

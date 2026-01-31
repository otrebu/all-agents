import {
  extractJsonFromResponse,
  type GeneratedTasksFile,
  MAX_RETRIES,
  parseAndValidateTasksJson,
  type TaskType,
} from "@tools/commands/ralph/planning";
import {
  createSessionDirectory,
  getSessionPaths,
  removeSessionDirectory,
} from "@tools/commands/ralph/temporary-session";
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

describe("planning", () => {
  let testSessionPath: null | string = null;

  // Clean up any test session after each test
  afterEach(() => {
    if (testSessionPath !== null) {
      removeSessionDirectory(testSessionPath);
      testSessionPath = null;
    }
  });

  describe("MAX_RETRIES", () => {
    test("is set to 3", () => {
      expect(MAX_RETRIES).toBe(3);
    });
  });

  describe("extractJsonFromResponse", () => {
    test("extracts raw JSON starting with brace", () => {
      const input = `{"goal": "test", "tasks": []}`;
      const result = extractJsonFromResponse(input);
      expect(result).toBe(`{"goal": "test", "tasks": []}`);
    });

    test("extracts JSON from markdown code block with json hint", () => {
      const input = `Here is the result:
\`\`\`json
{"goal": "test", "tasks": [{"id": 1, "title": "Task 1", "status": "pending", "acceptanceCriteria": ["Done"]}]}
\`\`\`
That's the plan!`;
      const result = extractJsonFromResponse(input);
      expect(result).toBe(
        `{"goal": "test", "tasks": [{"id": 1, "title": "Task 1", "status": "pending", "acceptanceCriteria": ["Done"]}]}`,
      );
    });

    test("extracts JSON from generic code block", () => {
      const input = `\`\`\`
{"goal": "build API", "tasks": []}
\`\`\``;
      const result = extractJsonFromResponse(input);
      expect(result).toBe(`{"goal": "build API", "tasks": []}`);
    });

    test("finds JSON with goal and tasks anywhere in response", () => {
      const input = `I will create the following plan:

The JSON structure is: {"goal": "my goal", "tasks": [{"id": 1, "title": "First", "status": "pending", "acceptanceCriteria": ["works"]}]}

Hope this helps!`;
      const result = extractJsonFromResponse(input);
      expect(result).not.toBeNull();
      expect(result).toContain('"goal"');
      expect(result).toContain('"tasks"');
    });

    test("handles nested braces correctly", () => {
      const input = `{"goal": "test", "tasks": [{"id": 1, "title": "Task with {braces}", "status": "pending", "acceptanceCriteria": ["criterion"]}]}`;
      const result = extractJsonFromResponse(input);
      expect(result).toBe(input);
    });

    test("returns null for no JSON", () => {
      const input = "This is just plain text with no JSON.";
      const result = extractJsonFromResponse(input);
      expect(result).toBeNull();
    });

    test("returns null for incomplete JSON", () => {
      const input = `{"goal": "test", "tasks": [`;
      const result = extractJsonFromResponse(input);
      expect(result).toBeNull();
    });

    test("handles whitespace around JSON", () => {
      const input = `
   {"goal": "test", "tasks": []}
   `;
      const result = extractJsonFromResponse(input);
      expect(result).toBe(`{"goal": "test", "tasks": []}`);
    });
  });

  describe("parseAndValidateTasksJson", () => {
    test("parses valid tasks JSON", () => {
      const json = JSON.stringify({
        goal: "Build an API",
        tasks: [
          {
            acceptanceCriteria: ["API responds with 200", "Tests pass"],
            id: 1,
            status: "pending",
            title: "Create API endpoint",
          },
        ],
      });

      const result = parseAndValidateTasksJson(json);
      expect(result).not.toBeNull();
      expect(result?.goal).toBe("Build an API");
      expect(result?.tasks).toHaveLength(1);
      expect(result?.tasks[0]?.title).toBe("Create API endpoint");
    });

    test("validates multiple tasks", () => {
      const json = JSON.stringify({
        goal: "Complex project",
        tasks: [
          {
            acceptanceCriteria: ["Criterion 1"],
            id: 1,
            status: "pending",
            title: "Task 1",
          },
          {
            acceptanceCriteria: ["Criterion 2", "Criterion 3"],
            id: 2,
            status: "pending",
            title: "Task 2",
          },
          {
            acceptanceCriteria: ["Criterion 4"],
            id: 3,
            status: "in_progress",
            title: "Task 3",
          },
        ],
      });

      const result = parseAndValidateTasksJson(json);
      expect(result).not.toBeNull();
      expect(result?.tasks).toHaveLength(3);
    });

    test("accepts all valid status values", () => {
      const statuses: Array<"complete" | "in_progress" | "pending"> = [
        "pending",
        "in_progress",
        "complete",
      ];
      for (const status of statuses) {
        const json = JSON.stringify({
          goal: "Test",
          tasks: [
            { acceptanceCriteria: ["Done"], id: 1, status, title: "Task" },
          ],
        });
        const result = parseAndValidateTasksJson(json);
        expect(result).not.toBeNull();
        expect(result?.tasks[0]?.status).toBe(status);
      }
    });

    test("returns null for missing goal", () => {
      const json = JSON.stringify({
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "pending",
            title: "Task",
          },
        ],
      });
      expect(parseAndValidateTasksJson(json)).toBeNull();
    });

    test("returns null for empty goal", () => {
      const json = JSON.stringify({
        goal: "",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "pending",
            title: "Task",
          },
        ],
      });
      expect(parseAndValidateTasksJson(json)).toBeNull();
    });

    test("returns null for missing tasks array", () => {
      const json = JSON.stringify({ goal: "Test" });
      expect(parseAndValidateTasksJson(json)).toBeNull();
    });

    test("returns null for empty tasks array", () => {
      const json = JSON.stringify({ goal: "Test", tasks: [] });
      expect(parseAndValidateTasksJson(json)).toBeNull();
    });

    test("returns null for task with missing id", () => {
      const json = JSON.stringify({
        goal: "Test",
        tasks: [
          { acceptanceCriteria: ["Done"], status: "pending", title: "Task" },
        ],
      });
      expect(parseAndValidateTasksJson(json)).toBeNull();
    });

    test("returns null for task with missing title", () => {
      const json = JSON.stringify({
        goal: "Test",
        tasks: [{ acceptanceCriteria: ["Done"], id: 1, status: "pending" }],
      });
      expect(parseAndValidateTasksJson(json)).toBeNull();
    });

    test("returns null for task with empty title", () => {
      const json = JSON.stringify({
        goal: "Test",
        tasks: [
          { acceptanceCriteria: ["Done"], id: 1, status: "pending", title: "" },
        ],
      });
      expect(parseAndValidateTasksJson(json)).toBeNull();
    });

    test("returns null for task with invalid status", () => {
      const json = JSON.stringify({
        goal: "Test",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "invalid_status",
            title: "Task",
          },
        ],
      });
      expect(parseAndValidateTasksJson(json)).toBeNull();
    });

    test("returns null for task with missing acceptanceCriteria", () => {
      const json = JSON.stringify({
        goal: "Test",
        tasks: [{ id: 1, status: "pending", title: "Task" }],
      });
      expect(parseAndValidateTasksJson(json)).toBeNull();
    });

    test("returns null for task with empty acceptanceCriteria", () => {
      const json = JSON.stringify({
        goal: "Test",
        tasks: [
          { acceptanceCriteria: [], id: 1, status: "pending", title: "Task" },
        ],
      });
      expect(parseAndValidateTasksJson(json)).toBeNull();
    });

    test("returns null for task with empty criterion string", () => {
      const json = JSON.stringify({
        goal: "Test",
        tasks: [
          {
            acceptanceCriteria: ["Valid", ""],
            id: 1,
            status: "pending",
            title: "Task",
          },
        ],
      });
      expect(parseAndValidateTasksJson(json)).toBeNull();
    });

    test("returns null for invalid JSON", () => {
      expect(parseAndValidateTasksJson("not json")).toBeNull();
      expect(parseAndValidateTasksJson("{invalid}")).toBeNull();
    });

    test("returns null for non-object JSON", () => {
      expect(parseAndValidateTasksJson("123")).toBeNull();
      expect(parseAndValidateTasksJson('"string"')).toBeNull();
      expect(parseAndValidateTasksJson("null")).toBeNull();
      expect(parseAndValidateTasksJson("[]")).toBeNull();
    });

    test("accepts spike and implement task types", () => {
      const types: Array<TaskType> = ["spike", "implement"];
      for (const type of types) {
        const json = JSON.stringify({
          goal: "Test",
          tasks: [
            {
              acceptanceCriteria: ["Done"],
              id: 1,
              status: "pending",
              title: "Task",
              type,
            },
          ],
        });
        const result = parseAndValidateTasksJson(json);
        expect(result).not.toBeNull();
        expect(result?.tasks[0]?.type).toBe(type);
      }
    });

    test("defaults to implement type when type is missing", () => {
      const json = JSON.stringify({
        goal: "Test",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "pending",
            title: "Task",
          },
        ],
      });
      const result = parseAndValidateTasksJson(json);
      expect(result).not.toBeNull();
      expect(result?.tasks[0]?.type).toBe("implement");
    });

    test("returns null for invalid task type", () => {
      const json = JSON.stringify({
        goal: "Test",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 1,
            status: "pending",
            title: "Task",
            type: "invalid_type",
          },
        ],
      });
      expect(parseAndValidateTasksJson(json)).toBeNull();
    });

    test("accepts spawnedBy field", () => {
      const json = JSON.stringify({
        goal: "Test",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 2,
            spawnedBy: 1,
            status: "pending",
            title: "Spawned task",
            type: "implement",
          },
        ],
      });
      const result = parseAndValidateTasksJson(json);
      expect(result).not.toBeNull();
      expect(result?.tasks[0]?.spawnedBy).toBe(1);
    });

    test("returns null for invalid spawnedBy type", () => {
      const json = JSON.stringify({
        goal: "Test",
        tasks: [
          {
            acceptanceCriteria: ["Done"],
            id: 2,
            spawnedBy: "not-a-number",
            status: "pending",
            title: "Task",
            type: "implement",
          },
        ],
      });
      expect(parseAndValidateTasksJson(json)).toBeNull();
    });
  });

  describe("session integration", () => {
    test("session paths include tasks.json", () => {
      const session = createSessionDirectory("Test Session Paths");
      testSessionPath = session.path;

      const paths = getSessionPaths(session.path);
      expect(paths.tasksJson).toBe(`${session.path}/tasks.json`);
      expect(existsSync(paths.tasksJson)).toBe(true);
    });

    test("initial tasks.json has empty subtasks array", () => {
      const session = createSessionDirectory("Test Initial Tasks");
      testSessionPath = session.path;

      const paths = getSessionPaths(session.path);
      const content = JSON.parse(readFileSync(paths.tasksJson, "utf8")) as {
        subtasks: Array<unknown>;
      };
      expect(content).toEqual({ subtasks: [] });
    });

    test("tasks.json can be overwritten with generated tasks", () => {
      const session = createSessionDirectory("Test Overwrite Tasks");
      testSessionPath = session.path;

      const paths = getSessionPaths(session.path);

      // Write a generated tasks file
      const tasksFile: GeneratedTasksFile = {
        goal: "Test goal",
        tasks: [
          {
            acceptanceCriteria: ["Works correctly"],
            id: 1,
            status: "pending",
            title: "Test task",
            type: "implement",
          },
        ],
      };

      writeFileSync(paths.tasksJson, JSON.stringify(tasksFile, null, 2));

      // Read it back
      const content = JSON.parse(
        readFileSync(paths.tasksJson, "utf8"),
      ) as GeneratedTasksFile;
      expect(content.goal).toBe("Test goal");
      expect(content.tasks).toHaveLength(1);
      expect(content.tasks[0]?.title).toBe("Test task");
    });
  });
});

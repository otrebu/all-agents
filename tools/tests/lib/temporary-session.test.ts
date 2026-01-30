import {
  checkSessionExists,
  createSessionDirectory,
  extractSessionIdFromPath,
  formatTimestamp,
  getSessionDirectoryFromId,
  getSessionPaths,
  removeSessionDirectory,
  SESSION_PREFIX,
  TMP_BASE,
} from "@tools/commands/ralph/temporary-session";
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

describe("temporary-session", () => {
  let testSessionPath: null | string = null;

  // Clean up any test session after each test
  afterEach(() => {
    if (testSessionPath !== null) {
      removeSessionDirectory(testSessionPath);
      testSessionPath = null;
    }
  });

  describe("formatTimestamp", () => {
    test("formats date as YYYYMMDD-HHMMSS", () => {
      // March = 2 (0-indexed)
      const localDate = new Date(2024, 2, 15, 14, 30, 45);
      const result = formatTimestamp(localDate);
      expect(result).toBe("20240315-143045");
    });

    test("pads single digit months and days", () => {
      // Jan 5, 09:05:03
      const localDate = new Date(2024, 0, 5, 9, 5, 3);
      const result = formatTimestamp(localDate);
      expect(result).toBe("20240105-090503");
    });
  });

  describe("createSessionDirectory", () => {
    test("creates session directory with correct naming", () => {
      const timestamp = new Date(2024, 2, 15, 14, 30, 45);
      const session = createSessionDirectory(timestamp);
      testSessionPath = session.path;

      expect(session.sessionId).toBe("20240315-143045");
      expect(session.path).toBe(`${TMP_BASE}/${SESSION_PREFIX}20240315-143045`);
      expect(existsSync(session.path)).toBe(true);
    });

    test("creates tasks.json with valid structure", () => {
      const session = createSessionDirectory();
      testSessionPath = session.path;

      const tasksPath = `${session.path}/tasks.json`;
      expect(existsSync(tasksPath)).toBe(true);

      const content = JSON.parse(readFileSync(tasksPath, "utf8")) as {
        subtasks: Array<unknown>;
      };
      expect(content).toEqual({ subtasks: [] });
    });

    test("creates state.json with initial state", () => {
      const timestamp = new Date();
      const session = createSessionDirectory(timestamp);
      testSessionPath = session.path;

      const statePath = `${session.path}/state.json`;
      expect(existsSync(statePath)).toBe(true);

      const content = JSON.parse(readFileSync(statePath, "utf8")) as {
        createdAt: string;
        currentSubtaskIndex: number;
        status: string;
      };
      expect(content.status).toBe("initialized");
      expect(content.currentSubtaskIndex).toBe(0);
      expect(content.createdAt).toBe(timestamp.toISOString());
    });

    test("creates progress.log with header", () => {
      const session = createSessionDirectory();
      testSessionPath = session.path;

      const logPath = `${session.path}/progress.log`;
      expect(existsSync(logPath)).toBe(true);

      const content = readFileSync(logPath, "utf8");
      expect(content).toContain("# Ralph Prototype Session:");
      expect(content).toContain("# Started:");
    });

    test("returns correct createdAt timestamp", () => {
      const timestamp = new Date();
      const session = createSessionDirectory(timestamp);
      testSessionPath = session.path;

      expect(session.createdAt).toBe(timestamp.toISOString());
    });
  });

  describe("getSessionPaths", () => {
    test("returns correct paths for all session files", () => {
      const sessionDirectory = "/tmp/ralph-prototype-20240315-143045";
      const paths = getSessionPaths(sessionDirectory);

      expect(paths.root).toBe(sessionDirectory);
      expect(paths.tasksJson).toBe(`${sessionDirectory}/tasks.json`);
      expect(paths.stateJson).toBe(`${sessionDirectory}/state.json`);
      expect(paths.progressLog).toBe(`${sessionDirectory}/progress.log`);
    });
  });

  describe("checkSessionExists", () => {
    test("returns true for existing session", () => {
      const session = createSessionDirectory();
      testSessionPath = session.path;

      expect(checkSessionExists(session.path)).toBe(true);
    });

    test("returns false for non-existent session", () => {
      expect(checkSessionExists("/tmp/ralph-prototype-nonexistent")).toBe(
        false,
      );
    });
  });

  describe("removeSessionDirectory", () => {
    test("removes existing session directory", () => {
      const session = createSessionDirectory();
      const { path } = session;

      expect(existsSync(path)).toBe(true);
      removeSessionDirectory(path);
      expect(existsSync(path)).toBe(false);

      // Reset testSessionPath since we already cleaned up
      testSessionPath = null;
    });

    test("handles non-existent directory gracefully", () => {
      // Should not throw
      expect(() => {
        removeSessionDirectory("/tmp/ralph-prototype-nonexistent-test");
      }).not.toThrow();
    });
  });

  describe("getSessionDirectoryFromId", () => {
    test("constructs correct path from session ID", () => {
      const sessionId = "20240315-143045";
      const path = getSessionDirectoryFromId(sessionId);
      expect(path).toBe(`${TMP_BASE}/${SESSION_PREFIX}${sessionId}`);
    });
  });

  describe("extractSessionIdFromPath", () => {
    test("extracts session ID from valid path", () => {
      const path = `${TMP_BASE}/${SESSION_PREFIX}20240315-143045`;
      const id = extractSessionIdFromPath(path);
      expect(id).toBe("20240315-143045");
    });

    test("returns null for invalid path", () => {
      expect(extractSessionIdFromPath("/tmp/other-dir")).toBeNull();
      expect(
        extractSessionIdFromPath("/var/tmp/ralph-prototype-123"),
      ).toBeNull();
    });
  });
});

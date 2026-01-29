import {
  type DiscoveredSession,
  discoverRecentSession,
} from "@tools/commands/ralph/session";
import { describe, expect, test } from "bun:test";

describe("discoverRecentSession", () => {
  test("function is exported", () => {
    expect(typeof discoverRecentSession).toBe("function");
  });

  test("returns null when no sessions found after timestamp", () => {
    // Use a future timestamp that no session could have been created after
    const oneYearMs = 1000 * 60 * 60 * 24 * 365;
    const futureTimestamp = Date.now() + oneYearMs;
    const result = discoverRecentSession(futureTimestamp);
    expect(result).toBeNull();
  });

  test("returns correct structure when session is found", () => {
    // Use a very old timestamp to potentially find existing sessions (Unix epoch)
    const oldTimestamp = 0;
    const result = discoverRecentSession(oldTimestamp);

    // Result should be null OR a valid DiscoveredSession
    if (result !== null) {
      // If a session is found, verify the structure
      expect(result).toHaveProperty("sessionId");
      expect(result).toHaveProperty("path");
      expect(typeof result.sessionId).toBe("string");
      expect(typeof result.path).toBe("string");
      expect(result.sessionId.length).toBeGreaterThan(0);
      expect(result.path).toContain(".jsonl");
    }
    // Null is also valid if no sessions exist
    expect(result === null || isValidDiscoveredSession(result)).toBe(true);
  });

  test("returns null when CLAUDE_CONFIG_DIR points to nonexistent directory", () => {
    // Save original env
    const originalEnv = process.env.CLAUDE_CONFIG_DIR;

    // Set to nonexistent directory
    process.env.CLAUDE_CONFIG_DIR = "/nonexistent/path/to/claude";
    const result = discoverRecentSession(0);
    expect(result).toBeNull();

    // Restore original env
    if (originalEnv === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR;
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalEnv;
    }
  });
});

// Type guard to verify DiscoveredSession structure
function isValidDiscoveredSession(value: unknown): value is DiscoveredSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const object = value as Record<string, unknown>;
  return (
    typeof object.sessionId === "string" && typeof object.path === "string"
  );
}

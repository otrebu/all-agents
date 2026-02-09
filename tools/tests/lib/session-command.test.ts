import { extractSessionTitle } from "@tools/commands/session";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

describe("session title extraction", () => {
  const temporaryDirectory = join(
    import.meta.dirname,
    "../../tmp/session-command-tests",
  );

  beforeEach(() => {
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true });
    }
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true });
    }
  });

  test("extracts title from first meaningful user message", () => {
    const filePath = join(temporaryDirectory, "session-1.jsonl");
    writeFileSync(
      filePath,
      `${[
        JSON.stringify({
          message: {
            content: "<local-command-caveat>...</local-command-caveat>",
            role: "user",
          },
          type: "user",
        }),
        JSON.stringify({
          message: {
            content:
              "Fix tab completion for ralph models and subtasks commands",
            role: "user",
          },
          type: "user",
        }),
      ].join("\n")}\n`,
    );

    expect(extractSessionTitle(filePath)).toBe(
      "Fix tab completion for ralph models and subtasks commands",
    );
  });

  test("extracts title from structured text content", () => {
    const filePath = join(temporaryDirectory, "session-2.jsonl");
    writeFileSync(
      filePath,
      `${JSON.stringify({
        message: {
          content: [
            { content: "Tool output", type: "tool_result" },
            { text: "Add session title column to session list", type: "text" },
          ],
          role: "user",
        },
        type: "user",
      })}\n`,
    );

    expect(extractSessionTitle(filePath)).toBe(
      "Add session title column to session list",
    );
  });

  test("falls back to slug when no valid user message is present", () => {
    const filePath = join(temporaryDirectory, "session-3.jsonl");
    writeFileSync(
      filePath,
      `${JSON.stringify({
        message: {
          content: [{ text: "No-op", type: "text" }],
          role: "assistant",
        },
        slug: "quiet-snowy-lobster",
        type: "assistant",
      })}\n`,
    );

    expect(extractSessionTitle(filePath)).toBe("quiet snowy lobster");
  });

  test("returns fallback when title cannot be determined", () => {
    const filePath = join(temporaryDirectory, "session-4.jsonl");
    writeFileSync(filePath, "not-json\n");

    expect(extractSessionTitle(filePath)).toBe("(untitled)");
  });
});

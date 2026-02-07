import type { Subtask } from "@tools/commands/ralph/types";
import type {
  ValidationContext,
  ValidationIssueType,
  ValidationResult,
} from "@tools/commands/ralph/validation";
import type { Mock } from "bun:test";

import {
  formatIssueType,
  handleSupervisedValidationFailure,
  parseIssueType,
  parseValidationResponse,
  promptSkipOrContinue,
  wrapText,
} from "@tools/commands/ralph/validation";
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as readline from "node:readline";

describe("parseIssueType", () => {
  test("returns value for valid issue types", () => {
    const values: Array<ValidationIssueType> = [
      "scope_creep",
      "too_broad",
      "too_narrow",
      "unfaithful",
    ];

    for (const value of values) {
      expect(parseIssueType(value)).toBe(value);
    }
  });

  test("returns undefined for invalid issue_type value", () => {
    expect(parseIssueType("invalid_value")).toBeUndefined();
    expect(parseIssueType(42)).toBeUndefined();
    expect(parseIssueType(null)).toBeUndefined();
  });

  test("returns scope_creep for valid issue_type value", () => {
    expect(parseIssueType("scope_creep")).toBe("scope_creep");
  });
});

describe("parseValidationResponse", () => {
  let warnSpy: Mock<typeof console.warn> | null = null;

  afterEach(() => {
    warnSpy?.mockRestore();
    warnSpy = null;
  });

  test("parses aligned response", () => {
    expect(parseValidationResponse('{"aligned": true}', "SUB-001")).toEqual({
      aligned: true,
    });
  });

  test("parses full misaligned response with all fields", () => {
    const response = JSON.stringify({
      aligned: false,
      issue_type: "too_broad",
      reason: "Subtask has too many acceptance criteria",
      suggestion: "Split into two subtasks",
    });

    expect(parseValidationResponse(response, "SUB-001")).toEqual({
      aligned: false,
      issueType: "too_broad",
      reason: "Subtask has too many acceptance criteria",
      suggestion: "Split into two subtasks",
    });
  });

  test("extracts JSON from markdown code block", () => {
    const response = [
      "```json",
      '{"aligned": false, "issue_type": "scope_creep", "reason": "Adds extra scope", "suggestion": "Trim scope"}',
      "```",
    ].join("\n");

    expect(parseValidationResponse(response, "SUB-001")).toEqual({
      aligned: false,
      issueType: "scope_creep",
      reason: "Adds extra scope",
      suggestion: "Trim scope",
    });
  });

  test("returns aligned and warns for empty string input", () => {
    warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    expect(parseValidationResponse("", "SUB-001")).toEqual({ aligned: true });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("No JSON found in response"),
    );
  });

  test("returns aligned and warns for invalid JSON string", () => {
    warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    expect(parseValidationResponse("not json", "SUB-001")).toEqual({
      aligned: true,
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("No JSON found in response"),
    );
  });

  test("returns aligned and warns when aligned field is missing", () => {
    warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    expect(parseValidationResponse('{"foo": "bar"}', "SUB-001")).toEqual({
      aligned: true,
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("aligned must be boolean"),
    );
  });

  test("fills defaults for partial misaligned response with missing optional fields", () => {
    expect(
      parseValidationResponse(
        '{"aligned": false, "issue_type": "scope_creep"}',
        "SUB-001",
      ),
    ).toEqual({
      aligned: false,
      issueType: "scope_creep",
      reason: "Unknown alignment issue",
      suggestion: undefined,
    });
  });
});

describe("formatIssueType", () => {
  test("formats all supported issue types", () => {
    expect(formatIssueType("scope_creep")).toBe("Scope Creep");
    expect(formatIssueType("too_broad")).toBe("Too Broad");
    expect(formatIssueType("too_narrow")).toBe("Too Narrow");
    expect(formatIssueType("unfaithful")).toBe("Unfaithful to Parent");
  });

  test("returns raw value for unknown issue type", () => {
    expect(formatIssueType("unexpected_issue")).toBe("unexpected_issue");
  });
});

describe("wrapText", () => {
  test("wraps text without exceeding width", () => {
    const lines = wrapText("long text here", 10);
    expect(lines).toEqual(["long text", "here"]);
    expect(lines.every((line) => line.length <= 10)).toBe(true);
  });

  test("truncates single words longer than width", () => {
    expect(wrapText("supercalifragilistic", 10)).toEqual(["supercalif"]);
  });

  test("returns a single empty line for empty text", () => {
    expect(wrapText("", 56)).toEqual([""]);
  });
});

describe("validation module exports", () => {
  test("exports parser functions", () => {
    expect(typeof parseIssueType).toBe("function");
    expect(typeof parseValidationResponse).toBe("function");
    expect(typeof formatIssueType).toBe("function");
    expect(typeof wrapText).toBe("function");
    expect(typeof handleSupervisedValidationFailure).toBe("function");
    expect(typeof promptSkipOrContinue).toBe("function");
  });

  test("supports validation types", () => {
    const subtask: Subtask = {
      acceptanceCriteria: ["AC"],
      description: "Description",
      done: false,
      filesToRead: [],
      id: "SUB-399",
      taskRef: "TASK-016-validation-types",
      title: "Validation parser",
    };

    const context: ValidationContext = {
      milestonePath: "docs/planning/milestones/003-ralph-workflow",
      subtask,
      subtasksPath: "docs/planning/milestones/003-ralph-workflow/subtasks.json",
    };

    const result: ValidationResult = {
      aligned: false,
      issueType: "unfaithful",
      reason: "Mismatched scope",
      suggestion: "Align with task requirements",
    };

    expect(context.subtask.id).toBe("SUB-399");
    expect(result.issueType).toBe("unfaithful");
  });
});

describe("promptSkipOrContinue", () => {
  const stdinTtyDescriptor = Object.getOwnPropertyDescriptor(
    process.stdin,
    "isTTY",
  );
  const stdoutTtyDescriptor = Object.getOwnPropertyDescriptor(
    process.stdout,
    "isTTY",
  );

  let createInterfaceSpy: Mock<typeof readline.createInterface> | null = null;

  function setTtyState(isInputTty: boolean, isOutputTty: boolean): void {
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: isInputTty,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      configurable: true,
      value: isOutputTty,
    });
  }

  function restoreTtyState(): void {
    if (stdinTtyDescriptor !== undefined) {
      Object.defineProperty(process.stdin, "isTTY", stdinTtyDescriptor);
    }
    if (stdoutTtyDescriptor !== undefined) {
      Object.defineProperty(process.stdout, "isTTY", stdoutTtyDescriptor);
    }
  }

  afterEach(() => {
    createInterfaceSpy?.mockRestore();
    createInterfaceSpy = null;
    restoreTtyState();
  });

  test("returns skip in non-TTY mode without prompting", async () => {
    setTtyState(false, false);
    createInterfaceSpy = spyOn(readline, "createInterface");

    const action = await promptSkipOrContinue("SUB-406");

    expect(action).toBe("skip");
    expect(createInterfaceSpy).not.toHaveBeenCalled();
  });

  async function callPrompt(answer: string): Promise<"continue" | "skip"> {
    setTtyState(true, true);
    /* eslint-disable promise/prefer-await-to-callbacks -- readline mock intentionally uses callbacks */
    createInterfaceSpy = spyOn(readline, "createInterface").mockReturnValue({
      close: mock(() => {}),
      on: mock(() => undefined as unknown as readline.Interface),
      question: (
        _prompt: string,
        callback: (value: string) => void,
      ): readline.Interface => {
        callback(answer);
        return undefined as unknown as readline.Interface;
      },
    } as unknown as readline.Interface);
    /* eslint-enable promise/prefer-await-to-callbacks */

    return promptSkipOrContinue("SUB-406");
  }

  test("returns skip on enter, y, and yes", async () => {
    const results = await Promise.all(
      ["", "y", "yes"].map(async (answer) => callPrompt(answer)),
    );
    expect(results).toEqual(["skip", "skip", "skip"]);
  });

  test("returns continue on n and no", async () => {
    const results = await Promise.all(
      ["n", "no"].map(async (answer) => callPrompt(answer)),
    );
    expect(results).toEqual(["continue", "continue"]);
  });

  test("propagates SIGINT to process", async () => {
    setTtyState(true, true);
    const emitSpy = spyOn(process, "emit").mockImplementation(((
      eventName: string | symbol,
    ): boolean => {
      void eventName;
      return true;
    }) as typeof process.emit);

    /* eslint-disable promise/prefer-await-to-callbacks -- readline mock intentionally uses callbacks */
    createInterfaceSpy = spyOn(readline, "createInterface").mockReturnValue({
      close: mock(() => {}),
      on: (eventName: string, listener: () => void): readline.Interface => {
        if (eventName === "SIGINT") {
          listener();
        }
        return undefined as unknown as readline.Interface;
      },
      question: (
        prompt: string,
        callback: (value: string) => void,
      ): readline.Interface => {
        void prompt;
        void callback;
        return undefined as unknown as readline.Interface;
      },
    } as unknown as readline.Interface);
    /* eslint-enable promise/prefer-await-to-callbacks */

    const action = await promptSkipOrContinue("SUB-406");

    expect(action).toBe("skip");
    expect(emitSpy).toHaveBeenCalledWith("SIGINT");
    emitSpy.mockRestore();
  });
});

describe("handleSupervisedValidationFailure", () => {
  const stdinTtyDescriptor = Object.getOwnPropertyDescriptor(
    process.stdin,
    "isTTY",
  );
  const stdoutTtyDescriptor = Object.getOwnPropertyDescriptor(
    process.stdout,
    "isTTY",
  );

  afterEach(() => {
    if (stdinTtyDescriptor !== undefined) {
      Object.defineProperty(process.stdin, "isTTY", stdinTtyDescriptor);
    }
    if (stdoutTtyDescriptor !== undefined) {
      Object.defineProperty(process.stdout, "isTTY", stdoutTtyDescriptor);
    }
  });

  test("logs a validation box with subtask details and issue context", async () => {
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: false,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      configurable: true,
      value: false,
    });

    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    const action = await handleSupervisedValidationFailure(
      {
        acceptanceCriteria: ["AC"],
        description: "Description",
        done: false,
        filesToRead: [],
        id: "SUB-406",
        taskRef: "TASK-018-validation-supervised",
        title: "Add supervised validation failure display and prompt",
      },
      {
        aligned: false,
        issueType: "scope_creep",
        reason:
          "The subtask introduces additional implementation steps beyond what is required by the parent task.",
        suggestion:
          "Narrow the scope to only include the supervised prompt and box rendering behavior.",
      },
    );

    expect(action).toBe("skip");
    expect(logSpy).toHaveBeenCalledTimes(1);

    const output = String(logSpy.mock.calls[0]?.[0] ?? "");
    expect(output).toContain("╔");
    expect(output).toContain("SUB-406");
    expect(output).toContain("Scope Creep");
    expect(output).toContain("Reason:");
    expect(output).toContain("Suggestion:");
    expect(output).toContain("Narrow the scope");

    logSpy.mockRestore();
  });
});

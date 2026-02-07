import type { Mock } from "bun:test";

import {
  substituteTemplate,
  type TemplateVariables,
} from "@tools/commands/ralph/template";
import { afterEach, describe, expect, spyOn, test } from "bun:test";

describe("substituteTemplate", () => {
  let warnSpy: Mock<typeof console.warn> | null = null;

  afterEach(() => {
    warnSpy?.mockRestore();
    warnSpy = null;
  });

  test("replaces a basic placeholder", () => {
    const result = substituteTemplate("Hello {{SUBTASK_ID}}", {
      SUBTASK_ID: "SUB-378",
    });

    expect(result).toBe("Hello SUB-378");
  });

  test("replaces multiple placeholders", () => {
    const result = substituteTemplate(
      "{{SUBTASK_TITLE}} in {{MILESTONE}} (#{{ITERATION_NUM}})",
      {
        ITERATION_NUM: "3",
        MILESTONE: "003-ralph-workflow",
        SUBTASK_TITLE: "Template utility",
      },
    );

    expect(result).toBe("Template utility in 003-ralph-workflow (#3)");
  });

  test("warns and preserves literal when variable is missing", () => {
    warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    const result = substituteTemplate("Task {{SUBTASK_ID}} {{STATUS}}", {
      SUBTASK_ID: "SUB-378",
    });

    expect(result).toBe("Task SUB-378 {{STATUS}}");
    expect(warnSpy).toHaveBeenCalledWith(
      "Template variable {{STATUS}} not provided",
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test("treats undefined values as missing", () => {
    warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    const result = substituteTemplate("Title: {{SUBTASK_TITLE}}", {
      SUBTASK_TITLE: undefined,
    });

    expect(result).toBe("Title: {{SUBTASK_TITLE}}");
    expect(warnSpy).toHaveBeenCalledWith(
      "Template variable {{SUBTASK_TITLE}} not provided",
    );
  });

  test("returns empty string for empty template", () => {
    expect(substituteTemplate("", { SUBTASK_ID: "SUB-378" })).toBe("");
  });

  test("returns unchanged string when no placeholders are present", () => {
    const result = substituteTemplate("No placeholders here", {
      SUBTASK_ID: "SUB-378",
    });

    expect(result).toBe("No placeholders here");
  });

  test("accepts Partial<TemplateVariables> and includes all supported keys", () => {
    const partialVariables: Partial<TemplateVariables> = {
      STATUS: "completed",
      SUBTASK_ID: "SUB-383",
    };

    expect(
      substituteTemplate("{{SUBTASK_ID}} {{STATUS}}", partialVariables),
    ).toBe("SUB-383 completed");

    const allVariables: TemplateVariables = {
      ITERATION_NUM: "1",
      MILESTONE: "003-ralph-workflow",
      SESSION_CONTENT: "session content",
      SESSION_JSONL_CONTENT: "session jsonl content",
      SESSION_JSONL_PATH: "/tmp/session.jsonl",
      STATUS: "completed",
      SUBTASK_DESCRIPTION: "Add template variables interface",
      SUBTASK_ID: "SUB-383",
      SUBTASK_TITLE: "Add TemplateVariables interface",
      TASK_REF: "TASK-032",
    };

    expect(Object.keys(allVariables).sort()).toEqual([
      "ITERATION_NUM",
      "MILESTONE",
      "SESSION_CONTENT",
      "SESSION_JSONL_CONTENT",
      "SESSION_JSONL_PATH",
      "STATUS",
      "SUBTASK_DESCRIPTION",
      "SUBTASK_ID",
      "SUBTASK_TITLE",
      "TASK_REF",
    ]);
  });
});

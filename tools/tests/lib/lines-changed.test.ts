import {
  getLinesChanged,
  type LinesChangedResult,
  parseNumstat,
} from "@tools/commands/ralph/post-iteration";
import { describe, expect, test } from "bun:test";

describe("parseNumstat", () => {
  test("function is exported", () => {
    expect(typeof parseNumstat).toBe("function");
  });

  test("returns zeros for empty string", () => {
    const result = parseNumstat("");
    expect(result).toEqual({
      linesAdded: 0,
      linesRemoved: 0,
    } satisfies LinesChangedResult);
  });

  test("parses single file numstat", () => {
    const result = parseNumstat("42\t3\tfile.ts");
    expect(result).toEqual({
      linesAdded: 42,
      linesRemoved: 3,
    } satisfies LinesChangedResult);
  });

  test("parses multiple file numstat", () => {
    const output = [
      "10\t5\tsrc/foo.ts",
      "20\t0\tsrc/bar.ts",
      "5\t15\tsrc/baz.ts",
    ].join("\n");

    const result = parseNumstat(output);
    expect(result).toEqual({
      linesAdded: 35,
      linesRemoved: 20,
    } satisfies LinesChangedResult);
  });

  test("handles trailing newline", () => {
    const output = "10\t5\tfile.ts\n";
    const result = parseNumstat(output);
    expect(result).toEqual({
      linesAdded: 10,
      linesRemoved: 5,
    } satisfies LinesChangedResult);
  });

  test("handles multiple blank lines", () => {
    const output = "\n10\t5\tfile.ts\n\n";
    const result = parseNumstat(output);
    expect(result).toEqual({
      linesAdded: 10,
      linesRemoved: 5,
    } satisfies LinesChangedResult);
  });

  test("excludes binary files (shown as -)", () => {
    const output = [
      "10\t5\tsrc/code.ts",
      "-\t-\tassets/image.png",
      "3\t2\tsrc/other.ts",
    ].join("\n");

    const result = parseNumstat(output);
    expect(result).toEqual({
      linesAdded: 13,
      linesRemoved: 7,
    } satisfies LinesChangedResult);
  });

  test("handles files with spaces in name", () => {
    const output = "10\t5\tpath with spaces/file name.ts";
    const result = parseNumstat(output);
    expect(result).toEqual({
      linesAdded: 10,
      linesRemoved: 5,
    } satisfies LinesChangedResult);
  });

  test("handles zero additions or deletions", () => {
    const output = ["0\t10\tdeleted-only.ts", "15\t0\tadded-only.ts"].join(
      "\n",
    );

    const result = parseNumstat(output);
    expect(result).toEqual({
      linesAdded: 15,
      linesRemoved: 10,
    } satisfies LinesChangedResult);
  });

  test("handles large numbers", () => {
    const output = "1500\t2500\tlarge-file.ts";
    const result = parseNumstat(output);
    expect(result).toEqual({
      linesAdded: 1500,
      linesRemoved: 2500,
    } satisfies LinesChangedResult);
  });

  test("handles malformed lines gracefully", () => {
    const output = [
      "10\t5\tvalid.ts",
      "not-a-numstat-line",
      "3\t2\tother.ts",
    ].join("\n");

    const result = parseNumstat(output);
    expect(result).toEqual({
      linesAdded: 13,
      linesRemoved: 7,
    } satisfies LinesChangedResult);
  });
});

describe("getLinesChanged", () => {
  test("function is exported", () => {
    expect(typeof getLinesChanged).toBe("function");
  });

  test("returns zeros for non-git directory", () => {
    const result = getLinesChanged("/tmp/not-a-git-repo");
    expect(result).toEqual({
      linesAdded: 0,
      linesRemoved: 0,
    } satisfies LinesChangedResult);
  });
});

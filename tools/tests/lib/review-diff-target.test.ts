/**
 * Unit tests for review diff target utilities
 *
 * Tests validateDiffTargetOptions and buildDiffCommand functions.
 */

import {
  buildDiffCommand,
  type DiffTarget,
  validateDiffTargetOptions,
} from "@tools/commands/review/index";
import { describe, expect, test } from "bun:test";

describe("validateDiffTargetOptions", () => {
  test("returns default when no options specified", () => {
    const result = validateDiffTargetOptions({
      base: undefined,
      range: undefined,
      stagedOnly: undefined,
      unstagedOnly: undefined,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.diffTarget).toEqual({ type: "default" });
    }
  });

  test("returns base target when --base is specified", () => {
    const result = validateDiffTargetOptions({
      base: "main",
      range: undefined,
      stagedOnly: undefined,
      unstagedOnly: undefined,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.diffTarget).toEqual({ branch: "main", type: "base" });
    }
  });

  test("returns range target when --range is specified", () => {
    const result = validateDiffTargetOptions({
      base: undefined,
      range: "main..feature",
      stagedOnly: undefined,
      unstagedOnly: undefined,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.diffTarget).toEqual({
        from: "main",
        to: "feature",
        type: "range",
      });
    }
  });

  test("returns staged target when --staged-only is true", () => {
    const result = validateDiffTargetOptions({
      base: undefined,
      range: undefined,
      stagedOnly: true,
      unstagedOnly: undefined,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.diffTarget).toEqual({ type: "staged" });
    }
  });

  test("returns unstaged target when --unstaged-only is true", () => {
    const result = validateDiffTargetOptions({
      base: undefined,
      range: undefined,
      stagedOnly: undefined,
      unstagedOnly: true,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.diffTarget).toEqual({ type: "unstaged" });
    }
  });

  test("returns error when multiple options specified", () => {
    const result = validateDiffTargetOptions({
      base: "main",
      range: undefined,
      stagedOnly: true,
      unstagedOnly: undefined,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain(
        "Cannot specify multiple diff target flags",
      );
    }
  });

  test("returns error when three options specified", () => {
    const result = validateDiffTargetOptions({
      base: "main",
      range: "a..b",
      stagedOnly: true,
      unstagedOnly: undefined,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain(
        "Cannot specify multiple diff target flags",
      );
    }
  });

  test("returns error for invalid range format (no ..)", () => {
    const result = validateDiffTargetOptions({
      base: undefined,
      range: "invalid",
      stagedOnly: undefined,
      unstagedOnly: undefined,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Invalid --range format");
    }
  });

  test("returns error for invalid range format (triple dots)", () => {
    const result = validateDiffTargetOptions({
      base: undefined,
      range: "main...feature",
      stagedOnly: undefined,
      unstagedOnly: undefined,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Invalid --range format");
    }
  });

  test("parses range with commit hashes", () => {
    const result = validateDiffTargetOptions({
      base: undefined,
      range: "abc123..def456",
      stagedOnly: undefined,
      unstagedOnly: undefined,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.diffTarget).toEqual({
        from: "abc123",
        to: "def456",
        type: "range",
      });
    }
  });
});

describe("buildDiffCommand", () => {
  test("builds default diff command", () => {
    const target: DiffTarget = { type: "default" };
    expect(buildDiffCommand(target)).toBe("git diff HEAD");
  });

  test("builds base branch diff command", () => {
    const target: DiffTarget = { branch: "main", type: "base" };
    expect(buildDiffCommand(target)).toBe("git diff main...HEAD");
  });

  test("builds range diff command", () => {
    const target: DiffTarget = { from: "abc123", to: "def456", type: "range" };
    expect(buildDiffCommand(target)).toBe("git diff abc123..def456");
  });

  test("builds staged diff command", () => {
    const target: DiffTarget = { type: "staged" };
    expect(buildDiffCommand(target)).toBe("git diff --cached");
  });

  test("builds unstaged diff command", () => {
    const target: DiffTarget = { type: "unstaged" };
    expect(buildDiffCommand(target)).toBe("git diff");
  });
});

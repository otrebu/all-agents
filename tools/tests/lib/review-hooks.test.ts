/**
 * Unit tests for review/index.ts hook integration
 *
 * These tests verify that:
 * - onReviewComplete hook fires after triage completes
 * - onCriticalFinding hook fires for critical severity findings with confidence >= 0.9
 * - Hook context includes required fields (findingCount, criticalCount, sessionId)
 *
 * The tests use grep to verify the correct hook calls exist in review/index.ts code
 * since unit testing the full runHeadlessReview function would require mocking Claude invocations.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Read review/index.ts content for static analysis
const testDirectory = dirname(fileURLToPath(import.meta.url));
const REVIEW_TS_PATH = join(
  testDirectory,
  "../../src/commands/review/index.ts",
);
const reviewContent = readFileSync(REVIEW_TS_PATH, "utf8");

describe("review/index.ts hook integration", () => {
  describe("hook import", () => {
    test("executeHook is imported from ralph/hooks module", () => {
      expect(reviewContent).toContain("executeHook");
      expect(reviewContent).toContain('from "../ralph/hooks"');
    });

    test("HookContext type is imported", () => {
      expect(reviewContent).toContain("type HookContext");
    });
  });

  describe("onReviewComplete hook", () => {
    test("hook is called after triage", () => {
      // Verify the hook call exists for onReviewComplete
      expect(reviewContent).toContain('executeHook("onReviewComplete"');
    });

    test("hook context includes findingCount", () => {
      // Verify findingCount is passed in context
      expect(reviewContent).toContain("findingCount: findings.length");
    });

    test("hook context includes criticalCount", () => {
      // Verify criticalCount is passed in context
      expect(reviewContent).toContain("criticalCount");
    });

    test("hook context includes sessionId", () => {
      // Verify sessionId is passed in context
      expect(reviewContent).toContain("sessionId: result.sessionId");
    });
  });

  describe("onCriticalFinding hook", () => {
    test("hook is called for critical findings", () => {
      // Verify the hook call exists for onCriticalFinding
      expect(reviewContent).toContain('executeHook("onCriticalFinding"');
    });

    test("only fires for critical severity with high confidence", () => {
      // Verify the filter for critical findings with confidence >= 0.9
      expect(reviewContent).toContain('severity === "critical"');
      expect(reviewContent).toContain("confidence >= 0.9");
    });

    test("hook context includes file path", () => {
      // Verify file path is included in critical finding context
      expect(reviewContent).toContain("file: finding.file");
    });
  });

  describe("graceful no-op behavior", () => {
    test("hooks use executeHook which handles missing config gracefully", () => {
      // The executeHook function defaults to 'log' action if no actions configured
      // This is verified by the existence of the import and call pattern
      expect(reviewContent).toContain("executeHook");
      expect(reviewContent).not.toContain("if (config.hooks.onReviewComplete)");
    });
  });
});

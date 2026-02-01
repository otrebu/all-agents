/**
 * Unit tests for review hook integration
 *
 * These tests verify that:
 * - onReviewComplete hook fires after triage completes
 * - onCriticalFinding hook fires for critical severity findings with confidence >= 0.9
 * - Hook context includes required fields (findingCount, criticalCount, sessionId)
 *
 * After Effect port, hook logic moved to effect-review.ts with Effect-wrapped versions.
 * The tests use grep to verify the correct hook calls exist since unit testing the full
 * runHeadlessReview function would require mocking Claude invocations.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Read review files for static analysis
const testDirectory = dirname(fileURLToPath(import.meta.url));

// index.ts imports Effect-based hooks from effect-review.ts
const REVIEW_INDEX_PATH = join(
  testDirectory,
  "../../src/commands/review/index.ts",
);
const indexContent = readFileSync(REVIEW_INDEX_PATH, "utf8");

// effect-review.ts contains the actual hook implementations
const EFFECT_REVIEW_PATH = join(
  testDirectory,
  "../../src/commands/review/effect-review.ts",
);
const effectReviewContent = readFileSync(EFFECT_REVIEW_PATH, "utf8");

describe("review hook integration", () => {
  describe("hook import structure", () => {
    test("effect-review.ts imports executeHook from ralph/hooks module", () => {
      expect(effectReviewContent).toContain("executeHook");
      expect(effectReviewContent).toContain('from "../ralph/hooks"');
    });

    test("effect-review.ts imports HookContext type", () => {
      expect(effectReviewContent).toContain("type HookContext");
    });

    test("index.ts imports executeHooksEffect from effect-review", () => {
      expect(indexContent).toContain("executeHooksEffect");
      expect(indexContent).toContain('from "./effect-review"');
    });
  });

  describe("onReviewComplete hook", () => {
    test("hook is called after triage", () => {
      // Verify the Effect hook call exists for onReviewComplete
      expect(effectReviewContent).toContain(
        'executeHooksEffect("onReviewComplete"',
      );
    });

    test("hook context includes findingCount", () => {
      // Verify findingCount is passed in context
      expect(effectReviewContent).toContain("findingCount:");
    });

    test("hook context includes criticalCount", () => {
      // Verify criticalCount is passed in context
      expect(effectReviewContent).toContain("criticalCount");
    });

    test("hook context includes sessionId", () => {
      // Verify sessionId is passed in context
      expect(effectReviewContent).toContain("sessionId:");
    });
  });

  describe("onCriticalFinding hook", () => {
    test("hook is called for critical findings", () => {
      // Verify the Effect hook call exists for onCriticalFinding
      expect(effectReviewContent).toContain(
        'executeHooksEffect("onCriticalFinding"',
      );
    });

    test("only fires for critical severity with high confidence", () => {
      // Verify the filter for critical findings with confidence >= 0.9
      expect(effectReviewContent).toContain('severity === "critical"');
      expect(effectReviewContent).toContain("confidence >= 0.9");
    });

    test("hook context includes file path", () => {
      // Verify file path is included in critical finding context
      expect(effectReviewContent).toContain("file: finding.file");
    });
  });

  describe("graceful no-op behavior", () => {
    test("hooks use executeHook which handles missing config gracefully", () => {
      // The executeHook function defaults to 'log' action if no actions configured
      // This is verified by the existence of the import and call pattern
      expect(effectReviewContent).toContain("executeHook");
      expect(effectReviewContent).not.toContain(
        "if (config.hooks.onReviewComplete)",
      );
    });

    test("executeHooksEffect catches errors gracefully", () => {
      // Effect-wrapped version catches all errors and returns void
      expect(effectReviewContent).toContain("Effect.catchAll");
    });
  });
});

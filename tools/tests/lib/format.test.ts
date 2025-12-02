import sanitizeForFilename from "@lib/format.js";
import { describe, expect, test } from "bun:test";

describe("sanitizeForFilename", () => {
  describe("URL extraction", () => {
    test("extracts domain + path from TanStack URL", () => {
      expect(sanitizeForFilename("https://tanstack.com/start/latest")).toBe(
        "tanstack-start",
      );
    });

    test("extracts domain + path from docs subdomain", () => {
      expect(
        sanitizeForFilename("https://docs.tanstack.com/query/latest"),
      ).toBe("docs-tanstack-query");
    });

    test("handles GitHub repo URLs", () => {
      expect(sanitizeForFilename("https://github.com/user/repo-name")).toBe(
        "github-user-repo-name",
      );
    });

    test("handles www subdomain", () => {
      expect(sanitizeForFilename("https://www.example.com/api/docs")).toBe(
        "example-api-docs",
      );
    });

    test("excludes version numbers from path", () => {
      expect(sanitizeForFilename("https://example.com/api/v2/docs")).toBe(
        "example-api-docs",
      );
    });

    test('excludes "latest" from path', () => {
      expect(sanitizeForFilename("https://example.com/docs/latest/guide")).toBe(
        "example-docs-guide",
      );
    });

    test("limits path segments to 3", () => {
      expect(sanitizeForFilename("https://example.com/a/b/c/d/e/f")).toBe(
        "example-a-b-c",
      );
    });

    test("handles URLs with query params (ignores them)", () => {
      expect(sanitizeForFilename("https://example.com/docs?version=2.0")).toBe(
        "example-docs",
      );
    });

    test("handles URLs with hash fragments (ignores them)", () => {
      expect(sanitizeForFilename("https://example.com/docs#section")).toBe(
        "example-docs",
      );
    });

    test("handles http:// URLs", () => {
      expect(sanitizeForFilename("http://example.com/api/docs")).toBe(
        "example-api-docs",
      );
    });

    test("handles URLs with only domain", () => {
      expect(sanitizeForFilename("https://example.com")).toBe("example");
    });

    test("handles URLs with trailing slash", () => {
      expect(sanitizeForFilename("https://example.com/docs/")).toBe(
        "example-docs",
      );
    });
  });

  describe("natural language queries", () => {
    test("converts spaces to hyphens", () => {
      expect(sanitizeForFilename("React hooks best practices")).toBe(
        "react-hooks-best-practices",
      );
    });

    test("removes special characters", () => {
      expect(sanitizeForFilename("TypeScript: Error Handling!")).toBe(
        "typescript-error-handling",
      );
    });

    test("converts to lowercase", () => {
      expect(sanitizeForFilename("TypeScript Testing")).toBe(
        "typescript-testing",
      );
    });

    test("collapses multiple spaces", () => {
      expect(sanitizeForFilename("React    Router    Guide")).toBe(
        "react-router-guide",
      );
    });

    test("collapses multiple hyphens", () => {
      expect(sanitizeForFilename("React---Router")).toBe("react-router");
    });

    test("trims whitespace", () => {
      expect(sanitizeForFilename("  React hooks  ")).toBe("react-hooks");
    });
  });

  describe("length limits", () => {
    test("respects 50-char limit for URLs", () => {
      const result = sanitizeForFilename(
        "https://example.com/very/long/path/with/many/segments",
      );
      expect(result.length).toBeLessThanOrEqual(50);
    });

    test("respects 50-char limit for natural language", () => {
      const result = sanitizeForFilename("a".repeat(60));
      expect(result).toHaveLength(50);
    });

    test("respects 50-char limit for long query", () => {
      const longQuery =
        "This is a very long query with many words that exceeds fifty characters";
      const result = sanitizeForFilename(longQuery);
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  describe("edge cases", () => {
    test("handles empty string", () => {
      expect(sanitizeForFilename("")).toBe("");
    });

    test("handles only whitespace", () => {
      expect(sanitizeForFilename("   ")).toBe("");
    });

    test("handles only special characters", () => {
      expect(sanitizeForFilename("!@#$%^&*()")).toBe("");
    });

    test("handles malformed URLs (falls back to natural language)", () => {
      expect(sanitizeForFilename("https://malformed url")).toBe(
        "httpsmalformed-url",
      );
    });

    test("preserves hyphens in natural language", () => {
      expect(sanitizeForFilename("React-Router-DOM")).toBe("react-router-dom");
    });
  });
});

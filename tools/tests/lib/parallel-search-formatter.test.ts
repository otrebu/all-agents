import type { SearchResult } from "@tools/commands/parallel-search/types";

import {
  formatResults,
  formatSummary,
} from "@tools/commands/parallel-search/formatter";
import { describe, expect, test } from "bun:test";

describe("parallel-search formatter", () => {
  const mockResults: Array<SearchResult> = [
    {
      domain: "docs.example.com",
      excerpts: ["Excerpt 1 content here", "More excerpt content"],
      rank: 1,
      title: "Example Documentation",
      url: "https://docs.example.com/guide",
    },
    {
      domain: "blog.test.org",
      excerpts: ["Blog post excerpt"],
      rank: 2,
      title: "Test Blog Post",
      url: "https://blog.test.org/post",
    },
    {
      domain: "docs.example.com",
      excerpts: ["API reference excerpt"],
      rank: 3,
      title: "API Reference",
      url: "https://docs.example.com/api",
    },
  ];

  const mockMetadata = {
    executionTimeMs: 1500,
    objective: "Test search objective",
    resultCount: 3,
  };

  describe("formatSummary", () => {
    test("outputs query, result count, and execution time", () => {
      const summary = formatSummary(mockResults, mockMetadata);

      expect(summary).toContain("**Query:** Test search objective");
      expect(summary).toContain("**Results:** 3");
      expect(summary).toContain("**Execution:** 1.5s");
    });

    test("includes top domains section", () => {
      const summary = formatSummary(mockResults, mockMetadata);

      expect(summary).toContain("**Top Domains:**");
      expect(summary).toContain("docs.example.com");
    });

    test("includes key findings with links", () => {
      const summary = formatSummary(mockResults, mockMetadata);

      expect(summary).toContain("**Key Findings:**");
      expect(summary).toContain(
        "[Example Documentation](https://docs.example.com/guide)",
      );
      expect(summary).toContain("[Test Blog Post](https://blog.test.org/post)");
    });

    test("limits key findings to 5 items", () => {
      const manyResults: Array<SearchResult> = Array.from(
        { length: 10 },
        (_, index) => ({
          domain: `domain${index}.com`,
          excerpts: [`Excerpt ${index}`],
          rank: index + 1,
          title: `Result ${index + 1}`,
          url: `https://domain${index}.com/page`,
        }),
      );

      const summary = formatSummary(manyResults, {
        ...mockMetadata,
        resultCount: 10,
      });

      // Count markdown links (- [text](url))
      const keyFindingsCount = (summary.match(/^- \[/gm) ?? []).length;
      expect(keyFindingsCount).toBe(5);
    });

    test("handles empty results", () => {
      const summary = formatSummary([], { ...mockMetadata, resultCount: 0 });

      expect(summary).toContain("**Results:** 0");
      expect(summary).not.toContain("**Key Findings:**");
      expect(summary).not.toContain("**Top Domains:**");
    });
  });

  describe("formatResults (full report)", () => {
    test("includes full excerpts", () => {
      const report = formatResults(mockResults, mockMetadata);

      expect(report).toContain("Excerpt 1 content here");
      expect(report).toContain("More excerpt content");
      expect(report).toContain("Blog post excerpt");
    });

    test("includes section headers for each result", () => {
      const report = formatResults(mockResults, mockMetadata);

      expect(report).toContain("## 1. [Example Documentation]");
      expect(report).toContain("## 2. [Test Blog Post]");
      expect(report).toContain("## 3. [API Reference]");
    });

    test("includes domain per result", () => {
      const report = formatResults(mockResults, mockMetadata);

      expect(report).toContain("**Domain:** docs.example.com");
      expect(report).toContain("**Domain:** blog.test.org");
    });
  });

  describe("output differences", () => {
    test("summary is shorter than full report", () => {
      const summary = formatSummary(mockResults, mockMetadata);
      const fullReport = formatResults(mockResults, mockMetadata);

      expect(summary.length).toBeLessThan(fullReport.length);
    });

    test("summary does not contain excerpts", () => {
      const summary = formatSummary(mockResults, mockMetadata);

      expect(summary).not.toContain("**Excerpt:**");
      expect(summary).not.toContain("Excerpt 1 content here");
    });

    test("full report contains excerpts", () => {
      const fullReport = formatResults(mockResults, mockMetadata);

      expect(fullReport).toContain("**Excerpt:**");
      expect(fullReport).toContain("Excerpt 1 content here");
    });
  });
});

import type { SearchResult, SearchMetadata } from "./types.js";

/**
 * Format search results as clean markdown for Claude to read
 * @param results Array of search results
 * @param metadata Search execution metadata
 * @returns Formatted markdown string
 */
export function formatResults(
  results: SearchResult[],
  metadata: SearchMetadata
): string {
  const header = [
    "# Parallel Search Results\n",
    `**Query:** ${metadata.objective}`,
    `**Results:** ${metadata.resultCount}`,
    `**Execution:** ${(metadata.executionTimeMs / 1000).toFixed(1)}s\n`,
  ];

  const domainSummary = results.length > 0 ? formatDomainSummary(results) : [];

  const resultSections = results.flatMap((result) => [
    `## ${result.rank}. [${result.title}](${result.url})\n`,
    `**URL:** ${result.url}`,
    `**Domain:** ${result.domain}\n`,
    `**Excerpt:**\n`,
    result.excerpts.join("\n\n"),
    "\n---\n",
  ]);

  return [...header, ...domainSummary, "---\n", ...resultSections].join("\n");
}

/**
 * Format domain distribution summary
 * @param results Array of search results
 * @returns Array of formatted domain summary lines
 */
function formatDomainSummary(results: SearchResult[]): string[] {
  const domainCounts = getDomainCounts(results);
  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const domainLines = topDomains.map(([domain, count]) => {
    const percentage = ((count / results.length) * 100).toFixed(0);
    return `- ${domain}: ${count} results (${percentage}%)`;
  });

  return ["**Top Domains:**", ...domainLines, ""];
}

/**
 * Count results per domain
 * @param results Array of search results
 * @returns Map of domain to count
 */
function getDomainCounts(results: SearchResult[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const result of results) {
    const count = counts.get(result.domain) || 0;
    counts.set(result.domain, count + 1);
  }

  return counts;
}

export { sanitizeForFilename } from "@lib/format.js";

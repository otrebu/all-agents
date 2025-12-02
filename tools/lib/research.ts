import sanitizeForFilename from "@lib/format.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface ResearchPaths {
  jsonPath: string;
  mdPath: string;
  timestamp: string;
}

export interface SaveResearchOptions {
  markdownContent: string;
  outputDir: string;
  rawData: unknown;
  topic: string;
}

/**
 * Save research output consistently across all research tools.
 * Creates both raw JSON and markdown report files with timestamp prefix.
 *
 * @param options Configuration for saving research files
 * @returns Paths to the created files and the timestamp used
 */
export async function saveResearchOutput(
  options: SaveResearchOptions,
): Promise<ResearchPaths> {
  const { markdownContent, outputDir, rawData, topic } = options;

  // Prepare directories
  const rawDirectory = join(outputDir, "raw");
  await mkdir(rawDirectory, { recursive: true });

  // Generate timestamp: YYYYMMDD-HHMMSS format
  const isoTimestamp = new Date()
    .toISOString()
    .replaceAll(/[-:T.]/g, "")
    .slice(0, 14);
  const timestamp = `${isoTimestamp.slice(0, 8)}-${isoTimestamp.slice(8)}`;

  const sanitizedTopic = sanitizeForFilename(topic);
  const jsonPath = join(rawDirectory, `${timestamp}-${sanitizedTopic}.json`);
  const mdPath = join(outputDir, `${timestamp}-${sanitizedTopic}.md`);

  // Save raw JSON
  await writeFile(jsonPath, JSON.stringify(rawData, null, 2));

  // Save markdown report
  await writeFile(mdPath, markdownContent);

  return { jsonPath, mdPath, timestamp };
}

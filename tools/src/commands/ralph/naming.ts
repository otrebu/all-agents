import type { SubtasksFile } from "@tools/commands/ralph/types";

import { existsSync, readdirSync, readFileSync } from "node:fs";

const LEADING_NUMBER_PATTERN = /^(?<num>\d{3})-/;
const SUBTASK_ID_PATTERN = /^SUB-(?<num>\d{3,})$/;

function formatMilestoneDirectoryName(
  slug: string,
  milestoneNumber: string,
): string {
  return `${milestoneNumber}-${sanitizeSlug(slug)}`;
}

function formatStoryFilename(slug: string, artifactNumber = "001"): string {
  return `${artifactNumber}-STORY-${sanitizeSlug(slug)}.md`;
}

function formatTaskFilename(slug: string, artifactNumber = "001"): string {
  return `${artifactNumber}-TASK-${sanitizeSlug(slug)}.md`;
}

function maxNumberFromNames(names: Array<string>, pattern: RegExp): number {
  let max = 0;

  for (const name of names) {
    const match = pattern.exec(name);
    const numberString = match?.groups?.num;
    if (numberString !== undefined) {
      const parsed = Number.parseInt(numberString, 10);
      if (!Number.isNaN(parsed) && parsed > max) {
        max = parsed;
      }
    }
  }

  return max;
}

function nextArtifactNumber(directoryPath: string): string {
  if (!existsSync(directoryPath)) {
    return "001";
  }

  const entries = readdirSync(directoryPath, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  const max = maxNumberFromNames(names, LEADING_NUMBER_PATTERN);
  return padNumber(max + 1);
}

function nextMilestoneNumber(milestonesDirectory: string): string {
  if (!existsSync(milestonesDirectory)) {
    return "001";
  }

  const entries = readdirSync(milestonesDirectory, { withFileTypes: true });
  const milestoneNames = entries
    .filter((entry) => entry.isDirectory() && /^\d{3}-/.test(entry.name))
    .map((entry) => entry.name);

  const max = maxNumberFromNames(milestoneNames, LEADING_NUMBER_PATTERN);
  return padNumber(max + 1);
}

function nextSubtaskId(subtasksPath: string): string {
  if (!existsSync(subtasksPath)) {
    return "SUB-001";
  }

  const content = readFileSync(subtasksPath, "utf8");
  const parsed = JSON.parse(content) as SubtasksFile;
  const subtasks = Array.isArray(parsed.subtasks) ? parsed.subtasks : [];
  const ids = subtasks.map((subtask) => subtask.id);
  const max = maxNumberFromNames(ids, SUBTASK_ID_PATTERN);

  return `SUB-${padNumber(max + 1)}`;
}

function padNumber(value: number): string {
  return String(value).padStart(3, "0");
}

function sanitizeSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9-]/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

export {
  formatMilestoneDirectoryName,
  formatStoryFilename,
  formatTaskFilename,
  nextArtifactNumber,
  nextMilestoneNumber,
  nextSubtaskId,
};

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface Milestone {
  name: string;
  slug: string;
}

/**
 * Discover available milestones from docs/planning/roadmap.md
 * Parses milestone headers: ### N. Name
 */
export function discoverMilestones(): Array<Milestone> {
  const projectRoot = findProjectRoot();
  if (projectRoot === null) {
    return [];
  }

  const roadmapPath = path.join(projectRoot, "docs/planning/roadmap.md");
  if (!existsSync(roadmapPath)) {
    return [];
  }

  const content = readFileSync(roadmapPath, "utf8");
  const milestones: Array<Milestone> = [];

  const milestonePattern = /^### (?<num>\d+)\. (?<title>.+)$/gm;
  for (const match of content.matchAll(milestonePattern)) {
    const title = match.groups?.title?.trim();
    if (title !== undefined) {
      milestones.push(parseMilestoneTitle(title));
    }
  }

  return milestones;
}

/**
 * Find project root by walking up from cwd looking for .git directory
 */
export function findProjectRoot(): null | string {
  let directory = process.cwd();
  for (let index = 0; index < 10; index += 1) {
    if (existsSync(path.join(directory, ".git"))) {
      return directory;
    }
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return null;
}

/**
 * Parse milestone title which may contain markdown link
 * Format 1: "Simple Name" → { slug: "simple-name", name: "Simple Name" }
 * Format 2: "[slug](url): Display Name" → { slug: "slug", name: "Display Name" }
 */
export function parseMilestoneTitle(title: string): Milestone {
  const linkPattern =
    /^\[(?<linkText>[^\]]+)\]\([^)]+\):\s*(?<description>.+)$/;
  const linkMatch = linkPattern.exec(title);

  const linkText = linkMatch?.groups?.linkText;
  const description = linkMatch?.groups?.description;

  if (linkText !== undefined && description !== undefined) {
    return { name: description.trim(), slug: toMilestoneSlug(linkText) };
  }

  return { name: title, slug: toMilestoneSlug(title) };
}

/**
 * Convert milestone name to kebab-case slug
 * Example: "Company + Import + Dashboard" -> "company-import-dashboard"
 */
export function toMilestoneSlug(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

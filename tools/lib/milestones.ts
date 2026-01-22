import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

interface Milestone {
  name: string;
  slug: string;
}

interface MilestonePaths {
  root: string;
  stories: string;
  tasks: string;
}

/**
 * Discover available milestones from roadmap.md AND filesystem
 * Merges both sources, deduplicating by slug
 */
function discoverMilestones(): Array<Milestone> {
  const projectRoot = findProjectRoot();
  if (projectRoot === null) {
    return [];
  }

  const roadmapMilestones = discoverMilestonesFromRoadmap(projectRoot);
  const fsMilestones = discoverMilestonesFromFilesystem(projectRoot);

  // Merge: roadmap wins for name if slug matches
  const bySlug = new Map<string, Milestone>();
  for (const m of fsMilestones) {
    bySlug.set(m.slug, m);
  }
  for (const m of roadmapMilestones) {
    // Roadmap overwrites filesystem (better names)
    bySlug.set(m.slug, m);
  }

  return [...bySlug.values()];
}

/**
 * Discover milestones from filesystem: docs/planning/milestones/<slug>/
 * Directory names are used as slugs
 */
function discoverMilestonesFromFilesystem(
  projectRoot: string,
): Array<Milestone> {
  const milestonesDirectory = path.join(
    projectRoot,
    "docs/planning/milestones",
  );
  if (!existsSync(milestonesDirectory)) {
    return [];
  }

  try {
    const entries = readdirSync(milestonesDirectory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name
          .replaceAll("-", " ")
          .replaceAll(/\b\w/g, (c) => c.toUpperCase()),
        slug: entry.name,
      }));
  } catch {
    return [];
  }
}

/**
 * Discover milestones from docs/planning/roadmap.md
 * Parses milestone headers: ### N. Name
 */
function discoverMilestonesFromRoadmap(projectRoot: string): Array<Milestone> {
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
function findProjectRoot(): null | string {
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
 * Get paths for a milestone's directories
 */
function getMilestonePaths(slug: string): MilestonePaths | null {
  const projectRoot = findProjectRoot();
  if (projectRoot === null) {
    return null;
  }

  const root = path.join(projectRoot, "docs/planning/milestones", slug);
  if (!existsSync(root)) {
    return null;
  }

  return {
    root,
    stories: path.join(root, "stories"),
    tasks: path.join(root, "tasks"),
  };
}

/**
 * Parse milestone title which may contain markdown link
 * Format 1: "Simple Name" → { slug: "simple-name", name: "Simple Name" }
 * Format 2: "[slug](url): Display Name" → { slug: "slug", name: "Display Name" }
 */
function parseMilestoneTitle(title: string): Milestone {
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
function toMilestoneSlug(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

export {
  discoverMilestones,
  findProjectRoot,
  getMilestonePaths,
  parseMilestoneTitle,
  toMilestoneSlug,
};
export type { Milestone, MilestonePaths };

---
depends: []
---

# semantic-release

Automated versioning and publishing based on conventional commits.

**IMPORTANT:** CHANGELOG.md is created/updated ONLY by semantic-release. NEVER manually edit CHANGELOG files.

**Install:**

Install as dev dependencies: semantic-release, @semantic-release/commit-analyzer, @semantic-release/release-notes-generator, @semantic-release/npm, @semantic-release/changelog, @semantic-release/git, @semantic-release/github

**release.config.js:**

```typescript
export default {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "angular",
        releaseRules: [
          { breaking: true, release: "major" },
          { type: "feat", release: "minor" },
          { type: "fix", release: "patch" },
          { type: "docs", scope: "README", release: "patch" },
          { type: "chore", release: "patch" },
        ],
        parserOpts: {
          noteKeywords: ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"],
        },
      },
    ],
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    ["@semantic-release/changelog", { changelogFile: "CHANGELOG.md" }],
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json"],
        message:
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    "@semantic-release/github",
  ],
};
```

**Run in CI:**

Run semantic-release in CI:

```bash
pnpm exec semantic-release
```

Example when using bun:

```bash
bun run semantic-release
```

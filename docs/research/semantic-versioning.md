# Semantic Versioning: Complete Reference Guide

> Comprehensive documentation on SemVer, version bumping, changelogs, and release automation.

## Table of Contents

1. [SemVer 2.0.0 Specification](#semver-200-specification)
2. [Version Bumping Rules](#version-bumping-rules)
3. [Pre-release Versions](#pre-release-versions)
4. [Build Metadata](#build-metadata)
5. [Breaking Changes](#breaking-changes)
6. [Conventional Commits](#conventional-commits)
7. [Changelog Generation](#changelog-generation)
8. [Release Automation Tools](#release-automation-tools)
9. [Monorepo Versioning](#monorepo-versioning)
10. [API Deprecation Patterns](#api-deprecation-patterns)
11. [Practical Workflows](#practical-workflows)

---

## SemVer 2.0.0 Specification

Semantic Versioning (SemVer) is a versioning specification authored by Tom Preston-Werner (co-founder of GitHub). The official specification is available at [semver.org](https://semver.org/).

### Version Format

```
MAJOR.MINOR.PATCH
```

A normal version number MUST take the form `X.Y.Z` where:

- **X** = Major version
- **Y** = Minor version
- **Z** = Patch version

Each element MUST be a non-negative integer and MUST NOT contain leading zeroes.

### Full Version Format with Extensions

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
```

Examples:
- `1.0.0`
- `2.3.4-alpha.1`
- `1.0.0-beta+exp.sha.5114f85`
- `3.0.0-rc.1+20250624`

### Core Specification Rules

| Rule | Description |
|------|-------------|
| 1 | Software using SemVer MUST declare a public API |
| 2 | Version MUST take form X.Y.Z with non-negative integers, no leading zeros |
| 3 | Once released, version contents MUST NOT be modified |
| 4 | Major version zero (0.y.z) is for initial development - anything may change |
| 5 | Version 1.0.0 defines the public API |
| 6 | PATCH increments for backward-compatible bug fixes |
| 7 | MINOR increments for backward-compatible new functionality |
| 8 | MAJOR increments for backward-incompatible changes |
| 9 | Pre-release version MAY be denoted by hyphen + identifiers |
| 10 | Build metadata MAY be denoted by plus sign + identifiers |
| 11 | Precedence is determined by comparing versions left to right |

### Version Immutability

> Once a versioned package has been released, the contents of that version MUST NOT be modified. Any modifications MUST be released as a new version.

This is critical for reproducible builds and dependency management.

---

## Version Bumping Rules

### When to Bump Each Version

| Version | When to Bump | Resets |
|---------|--------------|--------|
| **MAJOR** | Backward-incompatible API changes | MINOR and PATCH to 0 |
| **MINOR** | New backward-compatible functionality | PATCH to 0 |
| **PATCH** | Backward-compatible bug fixes | Nothing |

### Quick Reference

> **"Patch fixes, minor adds, major breaks"** covers 80% of cases.

### MAJOR Version (Breaking Changes)

Increment MAJOR when you make incompatible API changes:

```
1.5.3 → 2.0.0  (breaking change)
```

Examples of breaking changes:
- Removing a public API endpoint or function
- Changing method signatures (parameters, return types)
- Renaming public classes, methods, or properties
- Changing default behavior in incompatible ways
- Removing configuration options
- Changing data formats in incompatible ways

### MINOR Version (New Features)

Increment MINOR when you add functionality in a backward-compatible manner:

```
1.5.3 → 1.6.0  (new feature)
```

Examples:
- Adding new API endpoints
- Adding new optional parameters
- Adding new methods to classes
- Deprecating features (announcing future removal)
- Substantial new internal implementation (if public API compatible)

### PATCH Version (Bug Fixes)

Increment PATCH when you make backward-compatible bug fixes:

```
1.5.3 → 1.5.4  (bug fix)
```

Examples:
- Fixing bugs that don't change the API
- Performance improvements (if no API changes)
- Documentation fixes in code
- Internal refactoring with no API impact

### Version Zero (0.y.z)

```
Major version zero (0.y.z) is for initial development.
Anything MAY change at any time.
The public API SHOULD NOT be considered stable.
```

During `0.y.z` development:
- Breaking changes may increment MINOR instead of MAJOR
- The project is not production-ready
- Frequent changes are expected

**Typical progression:**
```
0.1.0 → 0.2.0 → 0.3.0 → 1.0.0 (production ready)
```

---

## Pre-release Versions

Pre-release versions indicate unstable versions that may not satisfy compatibility requirements.

### Format

```
MAJOR.MINOR.PATCH-PRERELEASE
```

Identifiers MUST:
- Comprise only ASCII alphanumerics and hyphens `[0-9A-Za-z-]`
- NOT be empty
- NOT include leading zeroes (for numeric identifiers)

### Common Pre-release Tags

| Tag | Purpose | Example |
|-----|---------|---------|
| `alpha` | Work-in-progress, experimental | `1.0.0-alpha` |
| `beta` | Feature complete, may have bugs | `1.0.0-beta.2` |
| `rc` | Release candidate, potentially final | `1.0.0-rc.1` |

### Pre-release Precedence

Pre-release versions have **lower precedence** than the associated normal version:

```
1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0
```

**Precedence rules:**
1. Identifiers consisting only of digits are compared numerically
2. Identifiers with letters or hyphens are compared lexically (ASCII order)
3. Numeric identifiers always have **lower** precedence than non-numeric identifiers
4. A larger set of pre-release fields has higher precedence than a smaller set

### Pre-release Examples

```
1.0.0-alpha
1.0.0-alpha.1
1.0.0-0.3.7
1.0.0-x.7.z.92
1.0.0-x-y-z.--
2.0.0-beta.1
3.0.0-rc.1
```

### Typical Pre-release Workflow

```
1.0.0-alpha.1 → 1.0.0-alpha.2 → 1.0.0-beta.1 → 1.0.0-beta.2 → 1.0.0-rc.1 → 1.0.0
```

---

## Build Metadata

Build metadata provides additional build information but is **ignored** when determining version precedence.

### Format

```
MAJOR.MINOR.PATCH+BUILD
MAJOR.MINOR.PATCH-PRERELEASE+BUILD
```

### Rules

- Appended with a plus sign `+`
- Uses dot-separated identifiers
- Identifiers MUST comprise only ASCII alphanumerics and hyphens
- MUST be ignored when determining version precedence

### Common Build Metadata Uses

| Use Case | Example |
|----------|---------|
| Git commit hash | `1.0.0+git.9c2af5b` |
| Build date | `1.0.0+20250624` |
| Build number | `1.0.0+build.1234` |
| Platform info | `1.0.0+linux.amd64` |
| Combined | `1.0.0-beta+exp.sha.5114f85` |

### Examples

```
1.0.0-alpha+001
1.0.0+20130313144700
1.0.0-beta+exp.sha.5114f85
1.0.0+21AF26D3----117B344092BD
```

### Precedence Note

These versions have **identical** precedence:
```
1.0.0+build.100
1.0.0+build.200
```

Build metadata is informational only.

---

## Breaking Changes

### What Constitutes a Breaking Change?

A breaking change is any change that can break a client's application. Usually, breaking changes involve modifying or deleting existing parts of an API.

### Types of Breaking Changes

| Category | Examples |
|----------|----------|
| **Removal** | Deleting endpoints, methods, properties, or configuration options |
| **Modification** | Changing parameter types, return types, method signatures |
| **Behavior** | Changing default values, error handling, or expected behavior |
| **Structure** | Renaming fields, changing JSON schemas, modifying data formats |
| **Requirements** | Making optional parameters required, adding required dependencies |

### Breaking Change Detection Tools

#### For TypeScript/JavaScript

- **ts-semver-detector**: Analyzes TypeScript type definitions to detect breaking changes
- **japicmp**: Detects API changes in Java libraries
- **Oasdiff**: Identifies changes in OpenAPI specifications

#### Usage Example (ts-semver-detector)

```bash
# Compare type definitions between versions
ts-semver-detector compare v1.0.0 v2.0.0
```

Output flags changes like:
- `BREAKING: Property 'foo' changed from optional to required`
- `BREAKING: Return type changed from string to number`

### SemVer for TypeScript Types

The "no new red squiggles" rule: You should not normally get new TypeScript type errors when upgrading a library to a new minor version.

See: [semver-ts.org](https://www.semver-ts.org/)

---

## Conventional Commits

Conventional Commits is a specification for adding human and machine-readable meaning to commit messages.

**Official specification**: [conventionalcommits.org](https://www.conventionalcommits.org/en/v1.0.0/)

### Commit Message Structure

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description | SemVer Impact |
|------|-------------|---------------|
| `feat` | New feature | MINOR |
| `fix` | Bug fix | PATCH |
| `docs` | Documentation only | - |
| `style` | Code style (formatting, semicolons) | - |
| `refactor` | Code refactoring | - |
| `perf` | Performance improvement | PATCH |
| `test` | Adding/updating tests | - |
| `build` | Build system/dependencies | - |
| `ci` | CI configuration | - |
| `chore` | Other changes | - |
| `revert` | Revert a commit | Depends |

### Breaking Changes in Commits

Two ways to indicate breaking changes:

**1. Using `!` before the colon:**
```
feat!: drop support for Node 14
refactor!: rename exported functions
```

**2. Using `BREAKING CHANGE:` footer:**
```
feat: add new authentication flow

BREAKING CHANGE: The login() function now returns a Promise instead of a callback.
```

### Scope

Optional context in parentheses:

```
feat(auth): add OAuth2 support
fix(parser): handle edge case for empty arrays
docs(readme): update installation instructions
```

### Full Examples

**Simple feature:**
```
feat: add user profile page
```

**Feature with scope:**
```
feat(api): add endpoint for user preferences
```

**Bug fix with body:**
```
fix(database): resolve connection timeout issue

Increased the default connection timeout from 5s to 30s
to handle slow network conditions.

Fixes #1234
```

**Breaking change:**
```
feat(api)!: change authentication to JWT

BREAKING CHANGE: The session-based authentication has been replaced
with JWT tokens. Clients must now include the Authorization header
with a Bearer token.

Migration guide: docs/migration/v2.md
```

### Footer Format

Footers use tokens followed by `: ` or ` #`:

```
Reviewed-by: John Doe
Refs: #123
Closes: #456
BREAKING CHANGE: description
```

---

## Changelog Generation

### Keep a Changelog Format

The most widely adopted format. See: [keepachangelog.com](https://keepachangelog.com/en/1.1.0/)

### Guiding Principles

1. Changelogs are for **humans**, not machines
2. Every version should have an entry
3. Group similar change types together
4. Versions and sections should be linkable
5. Latest version comes first
6. Include release dates
7. Follow Semantic Versioning

### Standard Categories

| Category | Description |
|----------|-------------|
| **Added** | New features |
| **Changed** | Changes to existing functionality |
| **Deprecated** | Features to be removed in future |
| **Removed** | Features that were removed |
| **Fixed** | Bug fixes |
| **Security** | Vulnerability fixes |

### Changelog Template

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New experimental feature X

## [1.2.0] - 2025-06-24

### Added
- Support for dark mode
- New API endpoint for user preferences

### Changed
- Improved performance of data loading

### Deprecated
- The `oldMethod()` function will be removed in v2.0.0

### Fixed
- Connection timeout issues on slow networks

## [1.1.0] - 2025-05-15

### Added
- Initial release

[Unreleased]: https://github.com/user/repo/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/user/repo/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/user/repo/releases/tag/v1.1.0
```

### Anti-Patterns to Avoid

| Anti-Pattern | Problem |
|--------------|---------|
| **Commit log dumps** | Too noisy, includes irrelevant changes |
| **Ignoring deprecations** | Users need warning before breaking changes |
| **Inconsistent dates** | Use ISO 8601 format (YYYY-MM-DD) |
| **Missing important changes** | Undermines changelog credibility |
| **Machine-only format** | Changelogs are for humans |

---

## Release Automation Tools

### Tool Comparison

| Tool | Best For | Approach |
|------|----------|----------|
| **semantic-release** | Full automation | Fully automated, CI-driven |
| **release-please** | GitHub users | PR-based releases |
| **changesets** | Monorepos | Manual changeset files |
| **commit-and-tag-version** | Local control | Local-first, review before push |
| **release-it** | Flexible release | Interactive or CI |

---

### semantic-release

Fully automated version management and package publishing.

**GitHub**: [github.com/semantic-release/semantic-release](https://github.com/semantic-release/semantic-release)

#### How It Works

1. Analyzes commits since last release
2. Determines next version based on commit types
3. Generates release notes
4. Creates git tag
5. Publishes to npm/GitHub
6. Notifies (Slack, etc.)

#### Installation

```bash
npm install --save-dev semantic-release @semantic-release/changelog @semantic-release/git
```

#### Configuration (`.releaserc.json`)

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/github",
    ["@semantic-release/git", {
      "assets": ["package.json", "CHANGELOG.md"],
      "message": "chore(release): ${nextRelease.version} [skip ci]"
    }]
  ]
}
```

#### GitHub Actions Workflow

```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'

      - run: npm ci

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

---

### release-please (Google)

Automates releases through pull requests.

**GitHub**: [github.com/googleapis/release-please](https://github.com/googleapis/release-please)

#### How It Works

1. Analyzes conventional commits on main
2. Opens/updates a "Release PR" with version bump and changelog
3. On merge, creates GitHub release and tag
4. Optionally triggers publish workflows

#### GitHub Actions Workflow

```yaml
on:
  push:
    branches: [main]

name: release-please

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          release-type: node
```

#### Configuration (`release-please-config.json`)

```json
{
  "release-type": "node",
  "packages": {
    ".": {}
  },
  "changelog-sections": [
    { "type": "feat", "section": "Features" },
    { "type": "fix", "section": "Bug Fixes" },
    { "type": "perf", "section": "Performance" },
    { "type": "docs", "section": "Documentation" }
  ]
}
```

#### Release Type Options

- `node` - Node.js/npm
- `python` - Python/PyPI
- `go` - Go modules
- `rust` - Cargo
- `helm` - Helm charts
- `simple` - Generic

---

### Changesets

Designed for monorepos with a focus on explicit change documentation.

**GitHub**: [github.com/changesets/changesets](https://github.com/changesets/changesets)

#### Key Concepts

- **Changeset**: A file describing intended changes (version bump type + summary)
- **Decoupled**: Separates intent to change from the act of publishing
- **PR-based**: Contributors add changeset files in their PRs

#### Installation

```bash
npm install @changesets/cli
npx changeset init
```

#### Workflow

**1. Add a changeset:**
```bash
npx changeset
```

Creates a file in `.changeset/`:
```markdown
---
"@myorg/package-a": minor
"@myorg/package-b": patch
---

Added new feature to package-a with bug fix in package-b.
```

**2. Version packages:**
```bash
npx changeset version
```

Updates `package.json` versions and generates `CHANGELOG.md`.

**3. Publish:**
```bash
npx changeset publish
```

#### GitHub Action

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: changesets/action@v1
        with:
          publish: pnpm publish -r
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### Notable Users

Changesets is used by: pnpm, Atlaskit, Chakra UI, XState, Astro, SvelteKit, Remix, Apollo Client, and many more.

---

### commit-and-tag-version

Fork of deprecated `standard-version`. Local-first approach.

**GitHub**: [github.com/absolute-version/commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version)

#### Installation

```bash
npm install --save-dev commit-and-tag-version
```

#### Usage

```bash
# Auto-determine version bump
npx commit-and-tag-version

# Specific version bump
npx commit-and-tag-version --release-as minor
npx commit-and-tag-version --release-as 2.0.0

# Pre-release
npx commit-and-tag-version --prerelease alpha

# First release
npx commit-and-tag-version --first-release
```

#### Configuration (`.versionrc.json`)

```json
{
  "types": [
    { "type": "feat", "section": "Features" },
    { "type": "fix", "section": "Bug Fixes" },
    { "type": "perf", "section": "Performance" },
    { "type": "docs", "section": "Documentation", "hidden": true }
  ],
  "commitUrlFormat": "https://github.com/user/repo/commit/{{hash}}",
  "compareUrlFormat": "https://github.com/user/repo/compare/{{previousTag}}...{{currentTag}}"
}
```

#### Package.json Scripts

```json
{
  "scripts": {
    "release": "commit-and-tag-version",
    "release:minor": "commit-and-tag-version --release-as minor",
    "release:major": "commit-and-tag-version --release-as major",
    "release:alpha": "commit-and-tag-version --prerelease alpha"
  }
}
```

---

### npm version (Built-in)

npm's built-in versioning command.

#### Basic Usage

```bash
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
npm version 2.0.0   # 1.0.0 → 2.0.0
npm version prepatch --preid=alpha  # 1.0.0 → 1.0.1-alpha.0
```

#### Lifecycle Scripts

```json
{
  "scripts": {
    "preversion": "npm test",
    "version": "npm run build && git add -A dist",
    "postversion": "git push && git push --tags"
  }
}
```

**Execution order:**
1. Check git working directory is clean
2. Run `preversion` script
3. Bump version in package.json
4. Run `version` script
5. Commit and tag
6. Run `postversion` script

#### Complete Release Script

```json
{
  "scripts": {
    "preversion": "npm test && npm run lint",
    "version": "npm run build && npm run changelog && git add -A",
    "postversion": "git push && git push --tags && npm publish",
    "pub": "npm version patch && npm publish"
  }
}
```

---

## Monorepo Versioning

### Versioning Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| **Fixed/Lockstep** | All packages share same version | Tightly coupled packages |
| **Independent** | Each package has own version | Loosely coupled packages |

### Fixed (Lockstep) Versioning

All packages increment together:

```
@myorg/core: 2.0.0
@myorg/utils: 2.0.0
@myorg/cli: 2.0.0
```

**Pros:**
- Simple to understand
- Easy dependency management
- Clear release correlation

**Cons:**
- Version churn for unchanged packages
- Noisier diffs

### Independent Versioning

Each package versions independently:

```
@myorg/core: 3.1.0
@myorg/utils: 1.5.2
@myorg/cli: 2.0.0
```

**Pros:**
- Versions reflect actual changes
- Less noise in unchanged packages

**Cons:**
- More complex dependency management
- Harder to track compatibility

### Tool Support

| Tool | Fixed | Independent | Publishing |
|------|-------|-------------|------------|
| **Lerna** | Yes | Yes | Yes |
| **Changesets** | Yes | Yes | Yes |
| **Nx** | No* | No* | No (use Lerna) |
| **Turborepo** | No | No | No (use Lerna) |

*Nx focuses on build optimization, pairs with Lerna for versioning.

### Lerna Configuration

**Fixed mode (default):**
```json
{
  "version": "2.0.0",
  "packages": ["packages/*"]
}
```

**Independent mode:**
```json
{
  "version": "independent",
  "packages": ["packages/*"]
}
```

### Recommended Combinations

| Use Case | Recommendation |
|----------|----------------|
| Enterprise monorepo | Nx + Lerna + Changesets |
| OSS library | Changesets |
| Single team, fast iteration | Turborepo + Lerna |
| Simple automation | semantic-release (single package) |

---

## API Deprecation Patterns

### Deprecation Lifecycle

```
Active → Deprecated → Removed
```

**Recommended timeline:** 6 months to 1 year notice before removal.

### The Deprecation Process

1. **Mark as deprecated** (MINOR version bump)
2. **Communicate clearly** (docs, changelog, warnings)
3. **Provide alternatives**
4. **Set removal timeline**
5. **Remove** (MAJOR version bump)

### Code Deprecation Examples

**JavaScript/TypeScript:**
```typescript
/**
 * @deprecated Use `newMethod()` instead. Will be removed in v3.0.0.
 */
function oldMethod() {
  console.warn('Deprecation: oldMethod() is deprecated. Use newMethod() instead.');
  // ...
}
```

**With runtime warning:**
```typescript
function deprecate(fn: Function, message: string) {
  let warned = false;
  return function(...args: any[]) {
    if (!warned) {
      console.warn(`DEPRECATED: ${message}`);
      warned = true;
    }
    return fn.apply(this, args);
  };
}

export const oldMethod = deprecate(
  function() { /* implementation */ },
  'oldMethod() is deprecated. Use newMethod() instead.'
);
```

### HTTP API Deprecation

**Using headers:**
```http
Deprecation: true
Sunset: Sat, 1 Jan 2026 00:00:00 GMT
Link: <https://api.example.com/v2/resource>; rel="successor-version"
```

**OpenAPI/Swagger:**
```yaml
paths:
  /old-endpoint:
    get:
      deprecated: true
      summary: "[DEPRECATED] Use /new-endpoint instead"
      description: |
        This endpoint is deprecated and will be removed in v3.0.0.
        Please migrate to /new-endpoint.
```

### Changelog Documentation

```markdown
## [2.5.0] - 2025-06-24

### Deprecated
- `oldMethod()` is deprecated and will be removed in v3.0.0. Use `newMethod()` instead.
- The `/api/v1/users` endpoint is deprecated. Migrate to `/api/v2/users`.

## [3.0.0] - 2026-01-01

### Removed
- `oldMethod()` has been removed. Use `newMethod()`.
- The `/api/v1/users` endpoint has been removed.

### Changed
- BREAKING: The default timeout is now 30s instead of 10s.
```

### Best Practices

1. **Always deprecate before removing** (except security fixes)
2. **Provide migration guides**
3. **Use runtime warnings** to alert developers
4. **Monitor deprecation usage** with logs/metrics
5. **Set clear timelines** with specific dates
6. **Support deprecated features** until removal date

---

## Practical Workflows

### Single Package Release Workflow

```bash
# 1. Ensure clean working directory
git status

# 2. Run tests
npm test

# 3. Bump version (auto-determines from commits)
npx commit-and-tag-version
# or: npm version minor

# 4. Review changes
git log --oneline -5
cat CHANGELOG.md | head -50

# 5. Push with tags
git push && git push --tags

# 6. Publish
npm publish
```

### GitHub Actions Full Pipeline

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run build

  release:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'

      - run: npm ci

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

### Manual Release Checklist

```markdown
## Pre-release Checklist

- [ ] All tests passing
- [ ] CHANGELOG.md updated
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Deprecation notices added
- [ ] Version number correct
- [ ] Git working directory clean

## Release Steps

- [ ] Create release branch (optional)
- [ ] Bump version: `npm version <type>`
- [ ] Push with tags: `git push && git push --tags`
- [ ] Create GitHub release
- [ ] Publish to npm: `npm publish`
- [ ] Announce release

## Post-release

- [ ] Verify package on npm
- [ ] Update project boards/issues
- [ ] Notify stakeholders
```

### Version Decision Tree

```
Is this a bug fix with no API changes?
├── Yes → PATCH
└── No
    ↓
    Does it add new features (backward compatible)?
    ├── Yes → MINOR
    └── No
        ↓
        Does it break existing API/behavior?
        ├── Yes → MAJOR
        └── No → Probably PATCH or no version bump needed
```

---

## Resources

### Official Specifications

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)
- [SemVer for TypeScript Types](https://www.semver-ts.org/)

### Tools

- [semantic-release](https://github.com/semantic-release/semantic-release)
- [release-please](https://github.com/googleapis/release-please)
- [changesets](https://github.com/changesets/changesets)
- [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version)
- [Lerna](https://lerna.js.org/)

### npm Packages

- [semver](https://www.npmjs.com/package/semver) - SemVer parser for npm
- [@semantic-release/changelog](https://www.npmjs.com/package/@semantic-release/changelog)
- [@changesets/cli](https://www.npmjs.com/package/@changesets/cli)

---

*Last updated: December 2025*

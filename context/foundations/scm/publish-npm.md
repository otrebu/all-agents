---
depends:
  - "@context/blocks/scm/npm-publish.md"
  - "@context/blocks/scm/semantic-release.md"
---

# Publishing to npm

Complete workflow for versioning, building, and publishing packages.

## Prerequisites

- npm CLI v11.5.1+ (for Trusted Publishing / OIDC)
- npm CLI v9.5.0+ (for provenance attestation)

## Reference

npm CLI commands, package.json exports, .npmrc config, version management, tags:

@context/blocks/scm/npm-publish.md

---

## Provenance (Supply-Chain Security)

Provenance creates a verifiable link between published package and source repo using Sigstore/SLSA attestation.

---

## Manual Publish Workflow

### 1. Pre-publish Checklist

```bash
git status  # should be clean

run lint
run typecheck
run test
run build

npm pack --dry-run
```

### 2. Version Bump

Bump with `npm version patch|minor|major` based on change type.

### 3. Publish

```bash
npm publish --provenance
git push && git push --tags
```

---

## Automated Publishing (Recommended)

Use semantic-release for fully automated versioning based on commits.

@context/blocks/scm/semantic-release.md

### GitHub Actions with Trusted Publishing

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write # required for OIDC + provenance
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          registry-url: https://registry.npmjs.org

      - run: npm ci
      - run: npm run build
      - run: npm run test

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # NPM_TOKEN not needed with Trusted Publishing
        run: npx semantic-release
```

### Setup Trusted Publishing

1. Go to npmjs.com → Package Settings → Trusted Publishers
2. Add GitHub Actions as trusted publisher
3. No `NPM_TOKEN` secret needed!

### Fallback: Token-based (Legacy)

If Trusted Publishing unavailable, use `NPM_TOKEN`:

| Secret         | Source                    | Purpose         |
| -------------- | ------------------------- | --------------- |
| `GITHUB_TOKEN` | Auto-provided             | GitHub releases |
| `NPM_TOKEN`    | npm.js → Automation token | npm publish     |

---

## Library package.json Additions

Add these fields for publishable libraries:

```json
{
  "version": "0.0.0-development",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  }
}
```

- `0.0.0-development` — semantic-release manages version
- `sideEffects: false` — enables tree-shaking
- Nested `types` in exports — TypeScript 5+ resolution

---

## Pre-release Workflow

### Beta Releases

```yaml
# release.config.js
export default {
  branches: [
    "main",
    { name: "beta", prerelease: true },
    { name: "next", prerelease: true },
  ],
};
```

Push to `beta` branch → publishes `1.0.0-beta.1` with `beta` tag.

### Install Pre-release

```bash
npm install my-package@beta
npm install my-package@next
```

---

## Validating Package

```bash
# what will be published
npm pack --dry-run

# validate exports
npx publint

# check bundle size
npx pkg-size my-package

# verify provenance
npm audit signatures
```

---

## When to Use

| Scenario          | Manual     | Automated                 |
| ----------------- | ---------- | ------------------------- |
| First release     | Yes        | Setup after               |
| Regular releases  | No         | Yes                       |
| Security-critical | No         | Yes (with provenance)     |
| Monorepo          | Changesets | semantic-release-monorepo |

## When NOT to Use

- **Private packages** → GitHub Packages or Verdaccio
- **Internal tools** → Direct git dependency
- **Applications** → Deploy, don't publish

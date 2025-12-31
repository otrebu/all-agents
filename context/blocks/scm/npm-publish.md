---
depends: []
tags: [core]
---

# npm Publish

Publish packages to npm registry.

## Quick Start

```bash
npm login
npm publish --provenance  # recommended
```

## .npmrc Configuration

```ini
# .npmrc (project root)
registry=https://registry.npmjs.org/
access=public
```

## package.json Setup

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "publishConfig": {
    "access": "public",
    "provenance": true
  }
}
```

## Commands

```bash
# preview what would be published
npm publish --dry-run

# publish with provenance (supply-chain security)
npm publish --provenance

# publish with tag (for prereleases)
npm publish --tag beta

# verify package signatures
npm audit signatures

# deprecate version
npm deprecate my-package@1.0.0 "Use 2.0.0 instead"
```

## Version Management

```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0

# prereleases
npm version prerelease --preid=beta  # 1.0.0 → 1.0.1-beta.0
```

> **Important:** Without `--tag`, prereleases get `latest` tag. Always use `npm publish --tag beta`.

## Tags (dist-tags)

| Tag | Purpose |
|-----|---------|
| `latest` | Default, stable releases |
| `next` | Pre-release, upcoming |
| `beta` | Beta testing |

```bash
npm dist-tag ls my-package
npm dist-tag add my-package@2.0.0-beta.1 beta
```

## CI Publishing

### Trusted Publishing (OIDC) - Recommended

No tokens needed. Configure on npmjs.com → Package Settings → Trusted Publishers.

```yaml
permissions:
  id-token: write  # required for OIDC
```

### Token-based (Legacy)

```ini
# .npmrc
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

Use "Automation" token type (bypasses 2FA/OTP).

## Pre-publish Checks

```json
{
  "scripts": {
    "prepublishOnly": "run build && run test"
  }
}
```

npm publish = public npm registry distribution with provenance.

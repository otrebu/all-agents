# npm Publishing: Complete Reference Guide

> Comprehensive guide to npm package publishing, covering package.json configuration, versioning, authentication, monorepo workflows, and best practices.

---

## Table of Contents

1. [Package.json Essential Fields](#packagejson-essential-fields)
2. [Entry Points: main, module, types, exports](#entry-points-main-module-types-exports)
3. [Conditional Exports](#conditional-exports)
4. [Dual ESM/CJS Publishing](#dual-esmcjs-publishing)
5. [Dependencies Configuration](#dependencies-configuration)
6. [Files and Distribution](#files-and-distribution)
7. [Pre-publish Scripts and Lifecycle](#pre-publish-scripts-and-lifecycle)
8. [Versioning Strategies](#versioning-strategies)
9. [npm publish Workflow](#npm-publish-workflow)
10. [Scoped Packages](#scoped-packages)
11. [Private Packages and Registries](#private-packages-and-registries)
12. [Authentication and Tokens](#authentication-and-tokens)
13. [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
14. [Monorepo Publishing](#monorepo-publishing)
15. [Changesets Integration](#changesets-integration)
16. [Provenance and Supply Chain Security](#provenance-and-supply-chain-security)
17. [Complete Package.json Examples](#complete-packagejson-examples)
18. [Publishing Checklist](#publishing-checklist)

---

## Package.json Essential Fields

### Required Fields

Every publishable package must have these fields:

```json
{
  "name": "my-package",
  "version": "1.0.0"
}
```

#### Name Field Rules

- Must be lowercase
- Maximum 214 characters (including scope)
- URL-safe characters only
- May contain hyphens, dots, and underscores
- No spaces allowed
- Cannot start with a dot or underscore

```json
{
  "name": "@myorg/package-name"
}
```

#### Version Field

Must follow [semantic versioning](https://semver.org/) format: `MAJOR.MINOR.PATCH`

```json
{
  "version": "2.1.3"
}
```

### Recommended Fields for Publishing

```json
{
  "name": "@myorg/my-library",
  "version": "1.0.0",
  "description": "A short description for npm search",
  "keywords": ["utility", "typescript", "library"],
  "license": "MIT",
  "author": {
    "name": "Your Name",
    "email": "you@example.com",
    "url": "https://yourwebsite.com"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/myorg/my-library.git"
  },
  "homepage": "https://github.com/myorg/my-library#readme",
  "bugs": {
    "url": "https://github.com/myorg/my-library/issues"
  }
}
```

### Runtime Requirements

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "os": ["darwin", "linux", "win32"],
  "cpu": ["x64", "arm64"]
}
```

### Private Field

Prevent accidental publication:

```json
{
  "private": true
}
```

---

## Entry Points: main, module, types, exports

### main

The primary entry point for CommonJS (CJS) modules:

```json
{
  "main": "./dist/index.cjs"
}
```

- Supported in all Node.js versions
- Only defines a single entry point
- Used when `exports` is not specified

### module

Entry point for ES modules (consumed by bundlers):

```json
{
  "module": "./dist/index.js"
}
```

- Not officially part of Node.js spec
- Recognized by bundlers (webpack, Rollup, esbuild)
- Indicates ESM version for tree-shaking

### types (or typings)

TypeScript type definitions:

```json
{
  "types": "./dist/index.d.ts"
}
```

### type Field

Determines how `.js` files are interpreted:

```json
{
  "type": "module"
}
```

| `type` value | `.js` files | `.cjs` files | `.mjs` files |
|--------------|-------------|--------------|--------------|
| `"module"`   | ESM         | CJS          | ESM          |
| `"commonjs"` (default) | CJS | CJS        | ESM          |

**Best Practice:** Always include the `type` field explicitly.

---

## Conditional Exports

The `exports` field (introduced in Node.js 12.7.0) provides:

- **Subpath exports**: Define multiple entry points
- **Conditional exports**: Different files for different environments
- **Encapsulation**: Block access to internal files

### Basic exports

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./utils": "./dist/utils.js"
  }
}
```

### Conditional Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "default": "./dist/index.js"
    }
  }
}
```

### Supported Conditions

| Condition | Description |
|-----------|-------------|
| `import` | ESM `import` statements |
| `require` | CJS `require()` calls |
| `node` | Node.js environment |
| `default` | Fallback (always matches) |
| `types` | TypeScript types (must come first) |
| `browser` | Browser bundlers |
| `development` | Development mode |
| `production` | Production mode |

### Key Rules

1. **Order matters**: Conditions are evaluated top to bottom
2. **`default` must be last**: It's the fallback
3. **`types` must be first**: For TypeScript to detect it
4. **`exports` takes precedence**: Over `main` when present

### Encapsulation Warning

When using `exports`, accessing undefined paths throws an error:

```javascript
// package.json has exports: { ".": "./index.js" }

import pkg from "my-package";           // Works
import internal from "my-package/lib";  // Error: Package subpath not defined
```

---

## Dual ESM/CJS Publishing

Publishing packages that work with both CommonJS and ES modules.

### Recommended Configuration

```json
{
  "name": "my-dual-package",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  }
}
```

### Build with tsup

tsup simplifies dual-format builds:

```json
{
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --clean"
  }
}
```

### File Extensions

| Extension | Module Type |
|-----------|-------------|
| `.js` | Depends on `type` field |
| `.mjs` | Always ESM |
| `.cjs` | Always CJS |
| `.d.ts` | TypeScript declarations |
| `.d.cts` | CJS TypeScript declarations |
| `.d.mts` | ESM TypeScript declarations |

### Potential Issues

1. **Dual package hazard**: ESM and CJS versions are separate modules, potentially causing issues if both are loaded
2. **No `__dirname` in ESM**: Use `import.meta.url` instead
3. **Separate type definitions**: May need `.d.cts` for CJS types

### Validation Tools

- [publint](https://publint.dev/) - Validate package.json
- [Are the Types Wrong?](https://arethetypeswrong.github.io/) - Verify TypeScript resolution

---

## Dependencies Configuration

### dependencies

Production packages required to run:

```json
{
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

### devDependencies

Development-only tools (not installed by consumers):

```json
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### peerDependencies

Expected to be provided by the consuming project:

```json
{
  "peerDependencies": {
    "react": "^17.0.0 || ^18.0.0"
  }
}
```

#### When to Use peerDependencies

| Use Case | Use `dependencies` | Use `peerDependencies` |
|----------|-------------------|------------------------|
| Internal utility | Yes | No |
| React component library | No | Yes (for React) |
| Framework plugin | No | Yes (for framework) |
| Shared singleton needed | No | Yes |

#### peerDependenciesMeta

Mark peer dependencies as optional:

```json
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-native": ">=0.70.0"
  },
  "peerDependenciesMeta": {
    "react-native": {
      "optional": true
    }
  }
}
```

#### Best Practices

1. Use **lenient version ranges** (not exact versions)
2. Include peer deps as devDependencies for local testing
3. Document compatibility in README

### bundleDependencies

Include packages in the published tarball:

```json
{
  "bundleDependencies": ["internal-package"]
}
```

### optionalDependencies

Dependencies that don't fail installation if unavailable:

```json
{
  "optionalDependencies": {
    "fsevents": "^2.3.0"
  }
}
```

---

## Files and Distribution

### files Field

Whitelist files included in the published package:

```json
{
  "files": [
    "dist",
    "src",
    "!**/*.test.js"
  ]
}
```

**Always included (cannot be excluded):**
- `package.json`
- `README` (any extension)
- `LICENSE` / `LICENCE`
- Main file referenced in `main`

**Always excluded:**
- `node_modules`
- `.git`
- `.npmrc`
- `package-lock.json`

### .npmignore

Alternative to `files` - blacklist unwanted files:

```
# .npmignore
src/
tests/
*.test.js
.env
.eslintrc
tsconfig.json
```

### Interaction Rules

| Condition | Behavior |
|-----------|----------|
| Only `files` | Whitelist approach |
| Only `.npmignore` | Blacklist approach |
| Both exist | `files` wins at root, `.npmignore` works in subdirs |
| Neither exists | Uses `.gitignore` as `.npmignore` |

### Verify Before Publishing

```bash
# Preview included files
npm pack --dry-run

# Create local tarball to inspect
npm pack

# List files that would be included
npx npm-packlist
```

---

## Pre-publish Scripts and Lifecycle

### Lifecycle Scripts Order

When running `npm publish`:

1. `prepublishOnly` - Only before `npm publish`
2. `prepack` - Before tarball is created
3. `prepare` - After pack, before publish
4. `postpack` - After tarball is created
5. `publish` - After package is published
6. `postpublish` - After publish completes

### Script Definitions

| Script | Runs on `npm publish` | Runs on `npm install` |
|--------|----------------------|----------------------|
| `prepare` | Yes | Yes |
| `prepublishOnly` | Yes | No |
| `prepack` | Yes | No |

### Recommended Configuration

```json
{
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "test": "vitest run",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run lint && npm run test && npm run build",
    "prepack": "npm run build"
  }
}
```

### Version Lifecycle Scripts

When running `npm version`:

```json
{
  "scripts": {
    "preversion": "npm test",
    "version": "npm run build && git add -A dist",
    "postversion": "git push && git push --tags"
  }
}
```

---

## Versioning Strategies

### Semantic Versioning (SemVer)

Format: `MAJOR.MINOR.PATCH`

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Breaking changes | MAJOR | 1.0.0 -> 2.0.0 |
| New features (backwards-compatible) | MINOR | 1.0.0 -> 1.1.0 |
| Bug fixes | PATCH | 1.0.0 -> 1.0.1 |

### npm version Command

```bash
# Bump patch version (1.0.0 -> 1.0.1)
npm version patch

# Bump minor version (1.0.0 -> 1.1.0)
npm version minor

# Bump major version (1.0.0 -> 2.0.0)
npm version major

# Set specific version
npm version 2.0.0

# Prerelease versions
npm version prerelease --preid=alpha  # 1.0.0 -> 1.0.1-alpha.0
npm version preminor --preid=beta     # 1.0.0 -> 1.1.0-beta.0
npm version premajor --preid=rc       # 1.0.0 -> 2.0.0-rc.0
```

### Git Integration

`npm version` automatically:
1. Updates `package.json` and `package-lock.json`
2. Creates a git commit
3. Creates a git tag

```bash
# Disable git tagging
npm version patch --no-git-tag-version

# Custom commit message
npm version patch -m "Release v%s"

# Sign tag with GPG
npm version patch --sign-git-tag
```

### Pre-release Versions

```
1.0.0-alpha.0    # Alpha release
1.0.0-beta.0     # Beta release
1.0.0-rc.0       # Release candidate
1.0.0            # Stable release
```

### Version Range Specifiers

| Specifier | Meaning | Example |
|-----------|---------|---------|
| `^1.2.3` | Compatible with 1.x.x | 1.2.3 - 1.9.9 |
| `~1.2.3` | Patch updates only | 1.2.3 - 1.2.9 |
| `1.2.3` | Exact version | Only 1.2.3 |
| `>=1.2.3` | Greater or equal | 1.2.3+ |
| `*` | Any version | All versions |

---

## npm publish Workflow

### Basic Publishing

```bash
# First-time publish
npm publish

# Publish with specific tag
npm publish --tag beta

# Dry run (preview)
npm publish --dry-run

# Publish scoped package as public
npm publish --access public
```

### publishConfig

Override registry and access settings:

```json
{
  "publishConfig": {
    "registry": "https://registry.npmjs.org/",
    "access": "public",
    "tag": "latest"
  }
}
```

### Distribution Tags

```bash
# Publish with tag
npm publish --tag beta

# Add tag to existing version
npm dist-tag add my-package@1.0.0 stable

# Remove tag
npm dist-tag rm my-package beta

# List tags
npm dist-tag ls my-package
```

| Tag | Purpose |
|-----|---------|
| `latest` | Default stable version |
| `next` | Upcoming release |
| `beta` | Beta testing |
| `alpha` | Alpha testing |
| `canary` | Bleeding edge |

### Complete Publish Workflow

```bash
# 1. Verify clean git state
git status

# 2. Run tests
npm test

# 3. Bump version
npm version patch

# 4. Preview what will be published
npm pack --dry-run

# 5. Publish
npm publish

# 6. Push git tags
git push && git push --tags
```

---

## Scoped Packages

### Creating Scoped Packages

```bash
# Initialize with user scope
npm init --scope=@username

# Initialize with org scope
npm init --scope=@myorg
```

### Package.json

```json
{
  "name": "@myorg/my-package",
  "version": "1.0.0"
}
```

### Publishing Scoped Packages

```bash
# Scoped packages are private by default
npm publish

# Publish as public
npm publish --access public
```

### Configure in package.json

```json
{
  "name": "@myorg/my-package",
  "publishConfig": {
    "access": "public"
  }
}
```

### Using Different Registries

```bash
# Associate scope with registry
npm login --registry=https://npm.mycompany.com --scope=@myorg

# Configure in .npmrc
@myorg:registry=https://npm.mycompany.com/
```

---

## Private Packages and Registries

### npm Private Packages

Requires npm paid plan:

```json
{
  "name": "@myorg/private-pkg",
  "private": false,
  "publishConfig": {
    "access": "restricted"
  }
}
```

### Private Registries

**.npmrc configuration:**

```ini
# Global registry
registry=https://registry.npmjs.org/

# Scoped registry
@myorg:registry=https://npm.mycompany.com/

# Authentication
//npm.mycompany.com/:_authToken=${NPM_TOKEN}
```

### GitHub Packages

```ini
# .npmrc
@myorg:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### GitLab Registry

```ini
# .npmrc
@myorg:registry=https://gitlab.com/api/v4/projects/PROJECT_ID/packages/npm/
//gitlab.com/api/v4/projects/PROJECT_ID/packages/npm/:_authToken=${GITLAB_TOKEN}
```

---

## Authentication and Tokens

### Token Types

| Token Type | Use Case | Security Level |
|------------|----------|----------------|
| **Granular Access Token** | CI/CD, specific permissions | Highest |
| **Automation Token** | CI/CD publishing with 2FA | High |
| **Classic Token** | Legacy (deprecated 2025) | Low |

### Creating Tokens

```bash
# Via CLI
npm token create

# List tokens
npm token list

# Revoke token
npm token revoke <token-id>
```

### CI/CD Configuration

**.npmrc for CI:**

```ini
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

**Never commit tokens!** Use environment variables.

### Trusted Publishing (OIDC)

Available since July 2025 - eliminates long-lived tokens:

```yaml
# GitHub Actions
- uses: actions/setup-node@v4
  with:
    registry-url: 'https://registry.npmjs.org'
- run: npm publish
  env:
    NODE_AUTH_TOKEN: # Not needed with OIDC!
```

Benefits:
- No token management
- Short-lived credentials
- Automatic provenance attestation

---

## Two-Factor Authentication (2FA)

### Package-Level 2FA Settings

| Setting | Description |
|---------|-------------|
| **Require 2FA or automation tokens** | Default for new packages |
| **Require 2FA, disallow tokens** | Maximum security |

### Automation Tokens

For CI/CD when 2FA is enabled:

1. Enable 2FA on your npm account
2. Create an **Automation Token** in npm settings
3. Configure package: "Require two-factor authentication or automation tokens"
4. Use token in CI/CD

```bash
# Set package to allow automation tokens
npm access 2fa-not-required my-package
```

### Recommended 2025 Setup

1. Enable 2FA on account
2. Use **Trusted Publishing** (OIDC) for GitHub/GitLab CI
3. Use **Granular Access Tokens** for other automation
4. Avoid classic tokens (deprecated)

---

## Monorepo Publishing

### npm Workspaces

**Root package.json:**

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ]
}
```

**Publishing:**

```bash
# Publish all workspaces
npm publish --workspaces

# Publish specific workspace
npm publish --workspace=packages/core

# Publish with access
npm publish --workspaces --access public
```

### Lerna

**lerna.json:**

```json
{
  "version": "independent",
  "npmClient": "npm",
  "packages": ["packages/*"],
  "command": {
    "publish": {
      "conventionalCommits": true,
      "message": "chore(release): publish"
    }
  }
}
```

**Commands:**

```bash
# Version and publish
lerna publish

# Version only
lerna version

# Publish from git tags
lerna publish from-git
```

### pnpm Workspaces

**pnpm-workspace.yaml:**

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**Publishing:**

```bash
# Use workspace protocol during development
pnpm add @myorg/shared --workspace

# Publish (converts workspace: to actual versions)
pnpm publish --access public
```

### Turbo + pnpm

**turbo.json:**

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "publish": {
      "dependsOn": ["build"]
    }
  }
}
```

---

## Changesets Integration

### Setup

```bash
# Install
npm install @changesets/cli -D

# Initialize
npx changeset init
```

### Configuration

**.changeset/config.json:**

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### Workflow

```bash
# 1. Create changeset (during PR)
npx changeset

# 2. Version packages (before release)
npx changeset version

# 3. Publish (after version)
npx changeset publish
```

### GitHub Actions Integration

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
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci

      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: npx changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Provenance and Supply Chain Security

### What is Provenance?

Provenance creates a cryptographic link between:
- Published package
- Source code repository
- Build environment

### Publishing with Provenance

```bash
npm publish --provenance
```

**Requirements:**
- npm CLI v9.5.0+ (v11.5.1+ for trusted publishing)
- Cloud-hosted CI runner (GitHub Actions, GitLab CI)
- Repository connected to npm

### GitHub Actions Example

```yaml
name: Publish

on:
  release:
    types: [published]

permissions:
  contents: read
  id-token: write  # Required for provenance

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm publish --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Trusted Publishing (OIDC)

Available July 2025 - token-free publishing:

1. Link npm package to GitHub/GitLab repository
2. Configure trusted publisher in npm settings
3. Publish without tokens

```yaml
# No NPM_TOKEN needed!
- run: npm publish --provenance
```

### Security Best Practices (2025)

1. **Enable provenance** on all packages
2. **Use trusted publishing** instead of long-lived tokens
3. **Verify provenance** before installing critical dependencies
4. **Monitor for downgrades** - packages losing provenance may be compromised
5. **Review CI/CD access** - limit who can trigger publish workflows

---

## Complete Package.json Examples

### Library (TypeScript, Dual ESM/CJS)

```json
{
  "name": "@myorg/my-library",
  "version": "1.0.0",
  "description": "A comprehensive TypeScript library",
  "keywords": ["typescript", "utility", "library"],
  "license": "MIT",
  "author": {
    "name": "Your Name",
    "email": "you@example.com",
    "url": "https://github.com/yourusername"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/myorg/my-library.git"
  },
  "homepage": "https://github.com/myorg/my-library#readme",
  "bugs": {
    "url": "https://github.com/myorg/my-library/issues"
  },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./utils": {
      "import": {
        "types": "./dist/utils.d.ts",
        "default": "./dist/utils.js"
      },
      "require": {
        "types": "./dist/utils.d.cts",
        "default": "./dist/utils.cjs"
      }
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "sideEffects": false,
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "tsup src/index.ts src/utils.ts --format cjs,esm --dts --clean",
    "test": "vitest run",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run lint && npm run test && npm run build"
  },
  "dependencies": {},
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "eslint": "^8.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### React Component Library

```json
{
  "name": "@myorg/react-components",
  "version": "1.0.0",
  "description": "React component library",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": ["dist"],
  "sideEffects": ["*.css"],
  "peerDependencies": {
    "react": "^17.0.0 || ^18.0.0",
    "react-dom": "^17.0.0 || ^18.0.0"
  },
  "peerDependenciesMeta": {
    "react-dom": {
      "optional": true
    }
  },
  "devDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### CLI Tool

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "description": "A CLI tool",
  "license": "MIT",
  "type": "module",
  "bin": {
    "mycli": "./dist/cli.js"
  },
  "files": ["dist"],
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "tsup src/cli.ts --format esm",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^5.0.0"
  }
}
```

---

## Publishing Checklist

### Before Publishing

- [ ] Version follows semantic versioning
- [ ] All tests passing
- [ ] Linting passes
- [ ] TypeScript compiles without errors
- [ ] README.md is up to date
- [ ] CHANGELOG.md updated
- [ ] `files` field includes only necessary files
- [ ] `npm pack --dry-run` shows expected contents
- [ ] `exports` field configured correctly
- [ ] `peerDependencies` have appropriate version ranges
- [ ] No secrets in published files
- [ ] License file included

### Publishing

```bash
# 1. Clean build
npm run clean && npm run build

# 2. Run tests
npm test

# 3. Preview package contents
npm pack --dry-run

# 4. Bump version (creates git tag)
npm version patch|minor|major

# 5. Publish with provenance
npm publish --provenance

# 6. Push tags
git push && git push --tags
```

### After Publishing

- [ ] Verify package on npmjs.com
- [ ] Test installation: `npm install your-package@latest`
- [ ] Check provenance badge appears
- [ ] Create GitHub release with changelog
- [ ] Announce release (if applicable)

---

## Additional Resources

- [npm Documentation](https://docs.npmjs.com/)
- [Node.js Packages Documentation](https://nodejs.org/api/packages.html)
- [Semantic Versioning](https://semver.org/)
- [TypeScript Publishing Guide](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [publint Validator](https://publint.dev/)
- [Are the Types Wrong?](https://arethetypeswrong.github.io/)

---

*Last updated: December 2024*

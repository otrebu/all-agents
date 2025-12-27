# pnpm Workspaces

> Comprehensive reference for monorepo management with pnpm workspaces.

## Overview

pnpm workspaces provide a built-in monorepo solution that allows you to manage multiple packages within a single repository while sharing dependencies efficiently. Unlike npm or Yarn, pnpm uses a unique content-addressable store that creates hard links to shared dependencies, dramatically reducing disk usage and installation time.

### Key Benefits

- **Disk Space Efficiency**: Content-addressable storage with symlinks achieves 60-80% reduction in disk usage
- **Performance**: 2-3x faster installation times through intelligent caching and linking
- **Strict Dependency Model**: Prevents phantom dependencies and version conflicts
- **Built-in Workspaces**: No extra tools needed for monorepo management
- **Parallel Operations**: Advanced task scheduling with dependency-aware execution

---

## Configuration

### pnpm-workspace.yaml

The `pnpm-workspace.yaml` file defines the root of the workspace and specifies which directories contain workspace packages.

#### Basic Configuration

```yaml
packages:
  # All packages in direct subdirs of packages/
  - 'packages/*'
  # Executable/launchable applications
  - 'apps/*'
```

#### Advanced Patterns

```yaml
packages:
  # Direct subdir package
  - 'my-app'
  # All packages in direct subdirs
  - 'packages/*'
  # Nested packages (any depth)
  - 'components/**'
  # Exclude test directories
  - '!**/test/**'
  # Include the root package
  - '.'
```

#### Domain-Based Organization

For larger monorepos, organize by type or domain:

```yaml
packages:
  # Frontend packages
  - 'packages/web/*'
  # Backend services
  - 'packages/api/*'
  # Shared libraries (any depth)
  - 'packages/shared/**/*'
  # Exclude private packages
  - '!**/private/**'
```

### Typical Monorepo Structure

```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
├── apps/
│   ├── web-app/
│   │   └── package.json
│   ├── api-server/
│   │   └── package.json
│   └── mobile-app/
│       └── package.json
├── packages/
│   ├── ui-components/
│   │   └── package.json
│   ├── utils/
│   │   └── package.json
│   └── api-client/
│       └── package.json
└── tools/
    └── eslint-config/
        └── package.json
```

---

## Workspace Protocol

The `workspace:` protocol is pnpm's mechanism for referencing local workspace packages.

### Basic Usage

```json
{
  "dependencies": {
    "@myorg/utils": "workspace:*"
  }
}
```

### Protocol Variants

| Syntax | Description | Published As |
|--------|-------------|--------------|
| `workspace:*` | Any version from workspace | Exact version (e.g., `1.5.0`) |
| `workspace:^` | Caret range from workspace | `^1.5.0` |
| `workspace:~` | Tilde range from workspace | `~1.5.0` |
| `workspace:^1.0.0` | Specific range | `^1.0.0` |

### Aliased Dependencies

```json
{
  "dependencies": {
    "ui": "workspace:@myorg/ui-components@*"
  }
}
```

This becomes `"ui": "npm:@myorg/ui-components@1.0.0"` when published.

### Relative Path References

```json
{
  "dependencies": {
    "shared-utils": "workspace:../shared/utils"
  }
}
```

### Publishing Behavior

When packages are published (via `pnpm publish` or `pnpm pack`), `workspace:` dependencies are automatically converted to standard version ranges. This allows packages to work independently outside the workspace.

### Configuration: linkWorkspacePackages

```yaml
# pnpm-workspace.yaml or .npmrc
link-workspace-packages: true  # Default
```

- `true`: Links packages matching declared ranges automatically
- `false`: Only links when `workspace:` protocol is explicitly used (most predictable)
- `deep`: Also links for subdependencies

### Configuration: saveWorkspaceProtocol

```yaml
save-workspace-protocol: rolling  # Options: true, false, rolling
```

- `true`: Saves as `workspace:1.0.0`
- `rolling`: Saves as `workspace:*` (smoothest dev experience)
- `false`: Saves as regular version

---

## Catalogs

Catalogs allow defining centralized dependency versions that can be referenced across all workspace packages.

### Defining Catalogs

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'

# Default catalog
catalog:
  react: ^18.3.1
  react-dom: ^18.3.1
  typescript: ^5.4.0
  vitest: ^1.6.0

# Named catalogs for migrations
catalogs:
  react17:
    react: ^17.0.2
    react-dom: ^17.0.2
  react18:
    react: ^18.3.1
    react-dom: ^18.3.1
```

### Using Catalogs in package.json

```json
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:",
    "lodash": "catalog:react18"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

### Benefits

- **Single Source of Truth**: Version defined once, used everywhere
- **Easier Upgrades**: Update one entry instead of multiple package.json files
- **Fewer Merge Conflicts**: package.json files don't change during upgrades
- **Atomic Updates**: Group related dependencies for coordinated upgrades

### Catalog Settings

```yaml
# pnpm-workspace.yaml
catalogMode: strict  # Options: manual, prefer, strict
cleanupUnusedCatalogs: true  # Remove unused catalog entries
```

---

## Shared Dependencies Management

### Hoisting Common devDependencies

Place shared development dependencies in the root `package.json`:

```json
{
  "name": "my-monorepo",
  "private": true,
  "devDependencies": {
    "typescript": "^5.4.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "vitest": "^1.6.0"
  }
}
```

### Peer Dependencies from Workspace Root

Enable resolution of peer dependencies from root:

```yaml
# .npmrc or pnpm-workspace.yaml
resolve-peers-from-workspace-root: true  # Default: true
```

This allows installing peer dependencies only in the root, ensuring all packages use the same versions.

### Overrides

Force specific versions across the entire dependency graph:

```json
{
  "pnpm": {
    "overrides": {
      "lodash": "^4.17.21",
      "minimist@<1.2.6": ">=1.2.6",
      "bar@^2.1.0>qar": "1.2.0",
      "unused-dep": "-"
    }
  }
}
```

Override patterns:

- `"pkg": "version"` - Override all instances
- `"pkg@range": "version"` - Override specific versions
- `"parent>child": "version"` - Override only as dependency of parent
- `"pkg": "-"` - Remove dependency entirely

### Using Overrides with Catalogs

```yaml
# pnpm-workspace.yaml
overrides:
  react: catalog:
  react-dom: catalog:
```

---

## Node Modules Structure

### Symlinked Structure (Default)

pnpm creates a unique `node_modules` structure using symlinks:

```
node_modules/
├── .pnpm/                          # Virtual store
│   ├── foo@1.0.0/
│   │   └── node_modules/
│   │       ├── foo/                # Hard links to store
│   │       └── bar -> ../../bar@1.0.0/node_modules/bar
│   └── bar@1.0.0/
│       └── node_modules/
│           └── bar/                # Hard links to store
├── foo -> .pnpm/foo@1.0.0/node_modules/foo
└── bar -> .pnpm/bar@1.0.0/node_modules/bar
```

### Benefits

- **Shallow Directory Depth**: No deep nesting regardless of dependency graph depth
- **Strict Access Control**: Only declared dependencies are accessible
- **Self-Reference**: Packages can import themselves
- **Disk Efficiency**: Hard links to central store, no duplication

### Hoisting Options

#### hoist (Default: true)

```yaml
# .npmrc
hoist: true
hoist-pattern: ['*']  # What to hoist to .pnpm/node_modules
```

#### publicHoistPattern

Hoist to root `node_modules` for tool compatibility:

```yaml
public-hoist-pattern:
  - '*eslint*'
  - '*prettier*'
```

#### shamefullyHoist

Full compatibility mode (equivalent to npm/Yarn flat structure):

```yaml
shamefully-hoist: true  # Same as public-hoist-pattern: ['*']
```

Use when:

- Tools don't work with symlinks (e.g., React Native)
- Some frameworks require flat structure (e.g., older Astro versions)

#### nodeLinker Options

```yaml
node-linker: isolated  # Default: symlinks from virtual store
node-linker: hoisted   # Flat structure like npm/Yarn
node-linker: pnp       # Plug'n'Play (no node_modules)
```

---

## Filter Commands

The `--filter` (or `-F`) flag restricts commands to specific packages.

### Basic Syntax

```bash
pnpm --filter <selector> <command>
pnpm -F <selector> <command>
```

### Package Name Selection

```bash
# Exact package
pnpm --filter @myorg/web-app build

# Glob pattern
pnpm --filter "@myorg/*" build
pnpm --filter "*-utils" test

# Without scope (if unambiguous)
pnpm --filter web-app build
```

### Dependency Selection

```bash
# Package and all its dependencies
pnpm --filter web-app... build

# Only dependencies (exclude the package itself)
pnpm --filter web-app^... build

# Package and all dependents (packages that depend on it)
pnpm --filter ...shared-utils build

# Only dependents (exclude the package itself)
pnpm --filter ...^shared-utils build
```

### Directory-Based Selection

```bash
# Match directory pattern
pnpm --filter "./apps/*" build
pnpm --filter "{packages/shared/**}" test

# Combine with dependency operators
pnpm --filter "...{apps/web}" build
```

### Changed Packages

```bash
# All packages changed since main
pnpm --filter "...[origin/main]" test

# Changed packages and their dependents
pnpm --filter "...[origin/main]..." test

# With test pattern
pnpm --filter "...[origin/main]" --test-pattern "tests/**" test
```

### Exclusion

```bash
# Exclude packages
pnpm --filter "!@myorg/legacy-*" build

# In zsh, escape the !
pnpm --filter '\!@myorg/legacy-*' build
```

### Multiple Filters

```bash
# Combine filters (union)
pnpm --filter @myorg/web --filter @myorg/api build
```

### Filter Options

```bash
# Production dependencies only
pnpm --filter-prod web-app... build

# Fail if no packages match
pnpm --filter nonexistent --fail-if-no-match build

# Ignore files in change detection
pnpm --filter "...[main]" --changed-files-ignore-pattern "**/*.md" test
```

---

## Workspace Scripts and Task Running

### Recursive Execution

```bash
# Run in all packages (topological order)
pnpm -r build
pnpm --recursive build

# Include root package
pnpm -r --include-workspace-root build
```

### Parallel Execution

```bash
# Run in parallel (ignores topological order)
pnpm -r --parallel dev

# With concurrency limit
pnpm -r --workspace-concurrency 4 build
```

### Output Control

```bash
# Stream output with package prefix
pnpm -r --stream build

# Aggregate output (show after completion)
pnpm -r --reporter-hide-prefix build
```

### Combining with Filters

```bash
# Parallel dev for apps only
pnpm --filter "./apps/*" --parallel dev

# Build specific package and deps
pnpm --filter web-app... build

# Test changed packages
pnpm --filter "...[main]" test
```

### Root Package Scripts

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm --filter './apps/*' --parallel dev",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "clean": "pnpm -r exec rm -rf dist node_modules"
  }
}
```

### Supported Recursive Commands

`add`, `exec`, `install`, `list`, `outdated`, `publish`, `rebuild`, `remove`, `run`, `test`, `unlink`, `update`, `why`

---

## Lockfile Management

### pnpm-lock.yaml

pnpm uses a single lockfile at the workspace root (by default):

```yaml
# pnpm-workspace.yaml
shared-workspace-lockfile: true  # Default
```

### Handling Merge Conflicts

**Automatic Resolution:**

```bash
# Simply reinstall after merge conflict
pnpm install
git add pnpm-lock.yaml
git commit -m "Resolve lockfile conflict"
```

**Git Configuration:**

```gitattributes
# .gitattributes
pnpm-lock.yaml merge=ours
```

This takes "ours" version only when conflicted.

### Branch-Specific Lockfiles

For teams with frequent conflicts:

```yaml
# pnpm-workspace.yaml
git-branch-lockfile: true
merge-git-branch-lockfiles-branch-pattern:
  - main
  - release/*
```

Creates `pnpm-lock.feature-foo.yaml` for branches, merged on install to main branches.

### Lockfile Settings

```yaml
# pnpm-workspace.yaml
prefer-frozen-lockfile: true      # Skip resolution if lockfile satisfies
lockfile-include-tarball-url: true # Include full URLs
```

---

## pnpm vs npm/Yarn Workspaces

### Feature Comparison

| Feature | pnpm | npm (v7+) | Yarn (v1/v2+) |
|---------|------|-----------|---------------|
| **Install Speed** | Fastest | Slowest | Fast |
| **Disk Usage** | Lowest (hard links) | Highest | Medium |
| **Phantom Deps** | Prevented | Possible | PnP prevents |
| **Workspace Protocol** | Full support | Limited | Full support |
| **Catalogs** | Yes | No | No |
| **Plug'n'Play** | Supported | No | Native (Berry) |
| **Lockfile** | YAML | JSON | YAML |

### Key Differences

**pnpm:**

- Content-addressable store with hard links
- Strict, non-flat `node_modules` by default
- Native workspace protocol and catalogs
- Best for large monorepos and CI/CD

**npm:**

- Flat `node_modules` with hoisting
- Ships with Node.js
- Most compatible with legacy tools
- Basic workspace support

**Yarn:**

- Plug'n'Play mode eliminates `node_modules`
- Zero-installs (commit dependencies)
- Mature plugin ecosystem
- Strong workspace support

### Performance Benchmarks

Typical improvements with pnpm:

- **Fresh install**: 2-3x faster than npm
- **Cached install**: 5-10x faster than npm
- **Disk usage**: 60-80% reduction
- **CI builds**: Significant time savings with proper caching

---

## Turborepo Integration

### Basic Setup

```bash
pnpm dlx create-turbo@latest
```

Or add to existing workspace:

```bash
pnpm add -Dw turbo
```

### Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    }
  }
}
```

### Running Tasks

```bash
# Build all packages with caching
turbo build

# Run specific packages
turbo build --filter=web-app

# Dev mode
turbo dev

# Parallel execution with dependency awareness
turbo build test lint
```

### Why Turborepo + pnpm?

- **Intelligent Caching**: Content-based, not timestamp-based
- **Dependency-Aware**: Runs tasks in correct order
- **Remote Caching**: Share cache across CI/developers
- **Incremental Builds**: Only rebuild changed packages

### Production Deployment

```bash
# Generate pruned monorepo
turbo prune --scope=web-app --docker

# Output structure
out/
├── json/           # package.json files only
├── full/           # Full source
└── pnpm-lock.yaml  # Pruned lockfile
```

---

## Deployment

### pnpm deploy Command

Deploy a package with all dependencies:

```bash
pnpm --filter web-app deploy ./deploy

# Production only
pnpm --filter web-app --prod deploy ./deploy
```

### Configuration

```yaml
# pnpm-workspace.yaml
inject-workspace-packages: true  # Required for deploy
```

### Docker Multi-Stage Build

```dockerfile
# Build stage
FROM node:20 AS builder
WORKDIR /app
RUN corepack enable pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

RUN pnpm fetch

COPY . .
RUN pnpm install --offline
RUN pnpm --filter web build

# Deploy stage
FROM node:20 AS deployer
WORKDIR /app
RUN corepack enable pnpm

COPY --from=builder /app .
RUN pnpm --filter web --prod deploy /prod

# Production stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deployer /prod .
CMD ["node", "dist/index.js"]
```

### Serverless Considerations

pnpm's symlinks don't work with serverless platforms. Solutions:

1. Use `pnpm deploy` to create flat structure
2. Use Turborepo's `prune` command
3. Bundle with tools like esbuild/webpack

---

## Best Practices

### Project Structure

1. **Package-Centric** (Open Source):
   - Focus on publishable packages
   - `packages/` folder structure
   - Versioned and published to npm

2. **App-Centric** (Enterprise):
   - Focus on deployable applications
   - `apps/` + `packages/` structure
   - Apps consume internal packages

### Dependency Management

```yaml
# Recommended .npmrc settings
link-workspace-packages: false     # Explicit workspace: protocol
save-workspace-protocol: rolling   # Use workspace:*
auto-install-peers: true           # Auto-install peer deps
resolve-peers-from-workspace-root: true
```

### Version Strategy

- Use `workspace:*` for internal dependencies
- Pin critical external versions
- Use catalogs for shared dependencies
- Keep peer dependencies in root

### Script Patterns

```json
{
  "scripts": {
    "build": "pnpm -r --stream build",
    "dev": "pnpm --filter './apps/*' --parallel dev",
    "test": "pnpm -r test",
    "test:changed": "pnpm --filter '...[origin/main]' test",
    "clean": "pnpm -r exec rm -rf dist .turbo node_modules",
    "format": "prettier --write .",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  }
}
```

### CI/CD Optimization

```yaml
# GitHub Actions example
- uses: pnpm/action-setup@v3
  with:
    version: 9

- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'pnpm'

- run: pnpm install --frozen-lockfile
- run: pnpm build
- run: pnpm test
```

### Common Patterns

1. **Shared Configuration**: Create `tools/` packages for shared configs
2. **Type Exports**: Use TypeScript project references
3. **Testing**: Run tests with filter for affected packages
4. **Changelogs**: Use Changesets for versioning

---

## Troubleshooting

### Common Issues

**Phantom Dependencies:**

- Enable strict mode: `hoist: false`
- Or use specific `public-hoist-pattern`

**Symlink Issues:**

- Use `shamefully-hoist: true` if tools require flat structure
- Or configure `node-linker: hoisted`

**Peer Dependency Warnings:**

```yaml
auto-install-peers: true
strict-peer-dependencies: false  # Disable strict checking
```

**Slow Install:**

- Use `pnpm fetch` for lockfile-only fetch
- Enable store compression in CI
- Use remote caching with Turborepo

### Debugging

```bash
# View dependency tree
pnpm why <package>

# List all workspace packages
pnpm ls -r --depth 0

# Check for outdated
pnpm -r outdated

# Verify lockfile integrity
pnpm install --frozen-lockfile
```

---

## References

- [pnpm Workspaces Documentation](https://pnpm.io/workspaces)
- [pnpm Settings Reference](https://pnpm.io/settings)
- [pnpm Filtering](https://pnpm.io/filtering)
- [pnpm Catalogs](https://pnpm.io/catalogs)
- [Symlinked node_modules Structure](https://pnpm.io/symlinked-node-modules-structure)
- [Working with Git](https://pnpm.io/git)
- [Turborepo with pnpm](https://turbo.build/repo/docs)
- [Complete Monorepo Guide 2025](https://jsdev.space/complete-monorepo-guide/)
- [Mastering pnpm Workspaces](https://blog.glen-thomas.com/software%20engineering/2025/10/02/mastering-pnpm-workspaces-complete-guide-to-monorepo-management.html)

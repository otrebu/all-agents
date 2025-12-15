---
depends: []
---

# pnpm

Fast, disk space efficient package manager.

## Package Management

```bash
# Install and manage dependencies
pnpm install                         # Install all dependencies
pnpm add <package>                   # Add package to dependencies
pnpm add -D <package>                # Add to devDependencies
pnpm add -g <package>                # Install globally
pnpm remove <package>                # Remove a package
pnpm update                          # Update all dependencies
pnpm update <package>                # Update specific package

# Running scripts
pnpm <script-name>                   # Run package.json script
pnpm run <script-name>               # Same as above (explicit)
pnpm start                           # Run start script
pnpm test                            # Run test script
pnpm exec <command>                  # Execute shell command

# Run commands across workspaces
pnpm -r <command>                    # Run in all workspace packages (recursive)
pnpm -r --filter <pattern> <command> # Run in filtered packages

# Filtering examples
pnpm --filter "./packages/**" build  # Build all packages
pnpm --filter @myorg/api dev         # Run dev in specific package
pnpm --filter "!@myorg/docs" test    # Exclude specific package

# Add dependencies to workspace packages
pnpm add <package> --filter <workspace>  # Add to specific workspace
pnpm add <package> -w                    # Add to workspace root

# Other useful commands
pnpm list                             # List installed packages
pnpm outdated                         # Check for outdated packages
pnpm why <package>                    # Show why package is installed
pnpm store prune                      # Clean up unused packages
pnpm install --frozen-lockfile        # Install without updating lockfile (CI)
```

### Pnpm Workspaces

Monorepo management tool for pnpm.
Use pnpm workspaces to manage dependencies between packages in the monorepo.
Preferred over lerna/yarn/npm workspaces for speed and developer ergonomics.

TypeScript monorepo with pnpm workspaces

Structure:

```text
├── pnpm-workspace.yaml        # Define workspace packages
├── tsconfig.json              # Root - project references only
├── tsconfig.base.json         # Shared compiler options
├── packages/
│   ├── package-a/
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
```

Key files:

- pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"
```

- tsconfig.base.json (strict mode enabled)

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true
  }
}
```

- tsconfig.json (root)

```json
{
  "files": [],
  "references": [
    { "path": "./packages/package-a" },
    { "path": "./packages/package-b" }
  ]
}
```

- packages/\*/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "references": [{ "path": "../dependency-package" }]
}
```

- packages/\*/package.json

```json
{
  "name": "@monorepo/package-name",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "dependencies": {
    "@monorepo/other-package": "workspace:*"
  }
}
```

Commands:

```bash
# Install dependencies
pnpm add <package> --filter @monorepo/target-package
pnpm add -Dw <package>  # Install to workspace root

# Build (uses project references)
tsc --build
pnpm -r build  # All packages

# Type-check
tsc --build --force

# Development
pnpm --filter @monorepo/package-name dev
```

#### Package.json monorepo scripts

package.json for a monorepo using pnpm:

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "// === DEVELOPMENT ===": "",
    "dev": "pnpm --filter @scope/web dev",
    "dev:api": "pnpm --filter @scope/api dev",
    "dev:admin": "pnpm --filter @scope/admin dev",
    "dev:all": "pnpm -r --parallel dev",

    "// === PRODUCTION ===": "",
    "build": "pnpm -r build",
    "build:web": "pnpm --filter @scope/web build",
    "build:api": "pnpm --filter @scope/api build",
    "build:packages": "pnpm --filter './packages/*' build",
    "start": "pnpm --filter @scope/web start",
    "start:api": "pnpm --filter @scope/api start",

    "// === TESTING ===": "",
    "test": "pnpm -r test",
    "test:unit": "pnpm -r test:unit",
    "test:integration": "pnpm -r test:integration",
    "test:e2e": "pnpm --filter @scope/e2e test",
    "test:watch": "pnpm -r --parallel test:watch",
    "test:coverage": "pnpm -r test:coverage",

    "// === CODE QUALITY ===": "",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "check": "pnpm lint && pnpm typecheck && pnpm test",
    "check:ci": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:coverage",

    "// === DATABASE ===": "",
    "db:generate": "pnpm --filter @scope/db generate",
    "db:migrate": "pnpm --filter @scope/db migrate",
    "db:push": "pnpm --filter @scope/db push",
    "db:seed": "pnpm --filter @scope/db seed",
    "db:studio": "pnpm --filter @scope/db studio",

    "// === UTILITIES ===": "",
    "clean": "pnpm -r clean && rm -rf node_modules",
    "prepare": "husky",

    "// === RELEASE ===": "",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "pnpm build && changeset publish"
  }
}
```

Key points:

- workspace:\* protocol for internal dependencies (auto-converts on publish)
- Project references enforce boundaries and enable incremental builds
- Each package extends tsconfig.base.json for consistent strict mode
- Use tsc --build to respect project references
- Individual packages can override specific strict flags in their local tsconfig if needed

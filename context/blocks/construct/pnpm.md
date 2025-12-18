# pnpm

Fast, disk space efficient package manager.

## Package Management

```bash
# Install dependencies
pnpm install                         # Install all dependencies
pnpm install --frozen-lockfile       # Install without updating lockfile (CI)
pnpm install --prefer-offline        # Use cache when possible
pnpm install --ignore-scripts        # Skip postinstall scripts

# Add packages
pnpm add <package>                   # Add to dependencies
pnpm add -D <package>                # Add to devDependencies
pnpm add -g <package>                # Install globally
pnpm add <package>@<version>         # Install specific version

# Remove packages
pnpm remove <package>                # Remove a package

# Update packages
pnpm update                          # Update all dependencies
pnpm update <package>                # Update specific package
```

## Running Scripts

```bash
pnpm <script-name>                   # Run package.json script
pnpm run <script-name>               # Same as above (explicit)
pnpm start                           # Run start script
pnpm test                            # Run test script
# exec vs dlx
pnpm exec <command>                  # Run a command using locally installed packages
                                     # e.g., pnpm exec jest --watch (uses project's jest)
pnpm dlx <package>                   # Download, run, and discard - never installs
                                     # e.g., pnpm dlx create-react-app my-app
                                     # Use for: one-off tools, generators, version testing

pnpm create <template>               # Shorthand for pnpm dlx create-<template>
                                     # e.g., pnpm create vite → pnpm dlx create-vite
```

## Inspection

```bash
pnpm list                            # List installed packages
pnpm list --depth=0                  # List only top-level packages
pnpm outdated                        # Check for outdated packages
pnpm why <package>                   # Show why package is installed
pnpm why <package> --json            # Machine-readable output
```

## Troubleshooting

```bash
pnpm install --force                 # Force reinstall (corrupted node_modules)
pnpm store path                      # Show store location
pnpm store status                    # Check store integrity
pnpm store prune                     # Clean up unused packages from store
rm -rf node_modules && pnpm install  # Nuclear option for broken state
```

## Common .npmrc Settings

> **Note:** These settings work around pnpm's stricter dependency model. They are not encouraged as they defeat pnpm's benefits. If you need to use them, notify the user and explain why.

```ini
# Bypass strict peer dependency errors (hides real dependency issues)
strict-peer-dependencies=false

# Hoist packages like npm/yarn (breaks pnpm's isolation guarantees)
# Only use if a package genuinely doesn't work otherwise
shamefully-hoist=true

# Use lockfile version
use-lockfile-v6=true
```

## Key Differences from npm/yarn

- Uses a content-addressable store with symlinks (saves disk space)
- Stricter `node_modules` structure - packages can only access declared dependencies
- If a package has mysterious "module not found" errors after migrating from npm/yarn, investigate the root cause first; `shamefully-hoist=true` is a last resort workaround
- Lock file is `pnpm-lock.yaml` (not `package-lock.json` or `yarn.lock`)

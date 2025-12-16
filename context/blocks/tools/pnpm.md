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

# Other useful commands
pnpm list                             # List installed packages
pnpm outdated                         # Check for outdated packages
pnpm why <package>                    # Show why package is installed
pnpm store prune                      # Clean up unused packages
pnpm install --frozen-lockfile        # Install without updating lockfile (CI)
```

## Workspaces

For monorepo management with pnpm workspaces, see pnpm-workspaces.md.

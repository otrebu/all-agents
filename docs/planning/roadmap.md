# Roadmap

## DX Improvements

- [ ] Add `eslint-import-resolver-typescript-bun` to uba-eslint-config
  - https://github.com/opsbr/eslint-import-resolver-typescript-bun
  - Properly resolves `bun:*` imports (bun:test, bun:sqlite, etc.)
  - Currently using `import/core-modules` workaround in tools/eslint.config.js

- [ ] Colocate CLI commands with their docs
  - Use `program.addCommand()` in commander to register subcommands
  - Move command definitions next to related documentation
  - Each command module exports its own Command instance

## Setup Enhancements

- [ ] Add Cursor rules to setup command
  - Copy `.cursor/rules/*.mdc` files to project
  - Include coding style, stack-specific rules

## Release & CI/CD

- [ ] Add semantic-release
  - Automated versioning based on conventional commits
  - Auto-generate changelog/release notes
  - Publish to npm (if applicable)

- [ ] Set up CI/CD pipeline
  - Run tests, lint, typecheck on PRs
  - Automated releases on main branch merges

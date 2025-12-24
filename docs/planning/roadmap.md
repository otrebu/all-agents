# Roadmap

## Documentation & Context

- [ ] Complete full stack documentation
  - [ ] testing e2e
  - [ ] frontend ( vite, react, storybook, tailwind, tanstack )
- [ ] CLI: Add log to file documentation (when to use, when not to use, how to do it)
- [ ] Add unit testing patterns documentation (mocking, when and how)

## Monorepo & Tooling

- [ ] Add `eslint-import-resolver-typescript-bun` to uba-eslint-config
  - https://github.com/opsbr/eslint-import-resolver-typescript-bun
  - Properly resolves `bun:*` imports (bun:test, bun:sqlite, etc.)
  - Currently using `import/core-modules` workaround in tools/eslint.config.js
- [ ] Colocate CLI commands with their docs
  - Use `program.addCommand()` in commander to register subcommands
  - Move command definitions next to related documentation
  - Each command module exports its own Command instance
- [ ] Document turborepo setup for monorepos

## Workflow & Git

- [ ] Add Cursor rules to setup command
  - Copy `.cursor/rules/*.mdc` files to project
  - Include coding style, stack-specific rules

## Release & CI/CD

- Deciced not to add tests and linting to CI/CD pipeline yet.

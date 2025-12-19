# Roadmap

## Documentation & Context

- [ ] Complete full stack documentation
  - [ ] testing
  - [ ] frontend ( vite, react, storybook, tailwind, tanstack )
- [ ] Create command to generate atomic docs from prompts
- [ ] Add log to file documentation (when to use, when not to use, how to do it)
- [ ] Add unit testing patterns documentation (mocking, when and how)
- [ ] Add env variables/config documentation (12-factor app, tools to use)
  - Decide: should `@context/foundations/env-variables.md` be foundation or pattern?

## Monorepo & Tooling

- [ ] Research turborepo setup and update package-json.md doc
- [ ] Add `eslint-import-resolver-typescript-bun` to uba-eslint-config
  - https://github.com/opsbr/eslint-import-resolver-typescript-bun
  - Properly resolves `bun:*` imports (bun:test, bun:sqlite, etc.)
  - Currently using `import/core-modules` workaround in tools/eslint.config.js
- [ ] Colocate CLI commands with their docs
  - Use `program.addCommand()` in commander to register subcommands
  - Move command definitions next to related documentation
  - Each command module exports its own Command instance

## Workflow & Git

- [ ] Update `/dev:complete-feature` to force fast-forward and squash commits
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

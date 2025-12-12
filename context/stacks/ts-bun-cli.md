---
tags: [cli]
depends: // TODO UPDATE the depends list
---

# TypeScript + Bun CLI Stack

CLI tools with Bun runtime: fast startup, native TS, single-file executables.

# Runtime, Package Manager, Bundler, Test Runner

@context/blocks/tools/bun.md

# CLI Tools

@context/blocks/tools/commander.md
@context/blocks/tools/chalk.md
@context/blocks/tools/ora.md
@context/blocks/tools/boxen.md

# CLI Patterns

@context/blocks/patterns/logging-cli.md

# Testing

@context/blocks/patterns/unit-testing.md
@context/blocks/patterns/cli-e2e-test-with-bun.md

Tests go in `tools/tests/e2e/<command>.test.ts`

Run: `bun test tools/tests/e2e/`

# Code Standards

@context/foundations/code-standards.md

## Husky is configured in tools/ folder.

@context/blocks/patterns/husky-from-subdir.md

@context/foundations/env-variables.md

## Typescript CLI structure

@context/blocks/patterns/ts-cli-structure.md

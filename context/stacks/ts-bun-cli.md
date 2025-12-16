---
tags: [cli]
---

# TypeScript + Bun CLI Stack

CLI tools with Bun runtime: fast startup, native TS, single-file executables.

# TypeScript Execution

@context/foundations/ts-bun.md

# Runtime, Package Manager, Bundler, Test Runner

@context/blocks/tools/bun.md
@context/blocks/tools/package-json.md

# Environment Variables

@context/foundations/env-variables-typed-native.md

# CLI Tools

@context/blocks/tools/commander.md
@context/blocks/tools/chalk.md
@context/blocks/tools/ora.md
@context/blocks/tools/boxen.md

# CLI Patterns

@context/foundations/logging-cli.md

# Testing

@context/blocks/principles/unit-testing.md
@context/foundations/testing-cli-e2e-bun.md

Tests go in `tools/tests/e2e/<command>.test.ts`

Run: `bun test tools/tests/e2e/`

# Code Standards

@context/foundations/code-standards.md

## Husky is configured in tools/ folder.

@context/foundations/husky-from-subdir.md

## Typescript CLI structure

@context/foundations/structure-cli-ts.md

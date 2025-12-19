---
tags: [cli]
---

# TypeScript + Bun CLI Stack

CLI tools with Bun runtime: fast startup, native TS, single-file executables.

# TypeScript Execution

@context/foundations/construct/exec-bun.md

# Runtime, Package Manager, Bundler, Test Runner

@context/blocks/construct/bun.md
@context/blocks/construct/package-json-base.md

# Environment Variables

@context/foundations/security/secrets-env-typed.md

# CLI Tools

@context/blocks/construct/commander.md
@context/blocks/construct/chalk.md
@context/blocks/construct/ora.md
@context/blocks/construct/boxen.md

# CLI Patterns

@context/foundations/observe/log-structured-cli.md

# Testing

@context/blocks/test/unit-testing.md
@context/foundations/test/test-e2e-cli-bun.md

Tests go in `tools/tests/e2e/<command>.test.ts`

Run: `bun test tools/tests/e2e/`

# Code Standards

@context/foundations/quality/gate-standards.md

## Husky is configured in tools/ folder.

@context/foundations/scm/commit-monorepo-subdir.md

## Typescript CLI structure

@context/foundations/construct/tree-cli.md

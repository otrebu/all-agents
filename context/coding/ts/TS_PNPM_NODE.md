# TypeScript Coding

You must always read: @/context/coding/ts/ESOTERIC.md

## Overview

Expert TS/JS development guidance across:

- Stack decisions (preferred libs)
- Tooling setup (pnpm, Vite, TS configs)
- Testing patterns (Vitest)
- Logging strategies (CLI vs services)

## Quick Reference

### Stack → @context/coding/ts/STACK.md

Preferred libraries by category:

- Package mgmt: pnpm, Vite, TypeScript
- State/testing: Xstate, Vitest
- Quality: ESLint, Prettier
- UI: React, Tailwind, shadcn/ui
- Forms/data: react-hook-form, zod, tanstack query/router
- CLI: boxen, chalk, commander, ora
- Utils: date-fns, dotenv
- Release: semantic-release, husky

### Tooling → @context/coding/ts/TOOLING.md

Setup patterns:

- FP patterns (avoid `this`, `new`, classes)
- Import aliases config
- pnpm commands & workspaces
- tsconfig.json templates
- Vite setup
- ESLint/Prettier config
- Monorepo structure

### Testing → @context/coding/ts/TESTING.md

Vitest patterns:

- Parameterized (`test.each`) vs individual tests
- Decision framework

### Logging → @context/coding/ts/LOGGING.md

App-specific patterns:

- **CLI tools** → console + chalk/ora (human-readable)
- **Services/APIs** → pino (structured JSON)

## Common Tasks

**New React app:**

```bash
pnpm create vite . --template react-ts
```

**Install deps:**

```bash
pnpm add <package>           # regular
pnpm add -D <package>        # dev
pnpm add <pkg> --filter @org/target  # workspace
```

**ESLint setup:**
See @context/coding/ts/TOOLING.md#eslint - Never disable rules except `no-console` for CLI

**Tailwind setup:**
See @context/coding/ts/TOOLING.md#tailwind

**Monorepo:**
See @context/coding/ts/TOOLING.md#pnpm-workspaces for complete structure

**Testing decision:**

- Pure fn w/ similar cases → `test.each()`
- Different setup/mocks → individual tests
- See @context/coding/ts/TESTING.md for decision tree

**Logging:**

- CLI → console + chalk (see @context/coding/ts/LOGGING.md#cli-logging)
- Service → pino (see @context/coding/ts/LOGGING.md#pino)

## FP Patterns

- Avoid `this`, `new`, prototypes
- Plain objects `{}`, not classes
- Exception: custom `Error` classes
- Small, focused functions

See @context/CODING_STYLE.md for universal FP guidelines

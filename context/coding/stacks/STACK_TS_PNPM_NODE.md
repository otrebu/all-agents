# TypeScript + pnpm + Node Stack

Traditional stack: pnpm for packages, Node runtime, tsc for building, Vitest for testing.

## Required Reading

- @context/coding/runtime/PNPM.md - Package manager, workspaces
- @context/coding/runtime/NODE.md - Runtime, nvm, LTS
- @context/coding/runtime/TYPESCRIPT.md - tsconfig, path aliases
- @context/coding/dx/LINT_FORMATTING.md - ESLint + Prettier
- @context/coding/cli/LOGGING_CLI.md - CLI logging (or backend/LOGGING_OBSERVABILITY.md for services)
- @context/coding/CODING_STYLE.md - FP patterns, naming

## Quick Start

```bash
# New project
mkdir myproject && cd myproject
pnpm init

# Install deps
pnpm add <package>
pnpm add -D <dev-package>

# Run (via package.json script)
pnpm dev

# Build
pnpm build  # runs tsc

# Test
pnpm test   # runs vitest
```

## When to Use

- Enterprise projects requiring full compatibility
- Large existing Node codebases
- Maximum npm ecosystem support
- Monorepos with complex dependencies

## Typical package.json

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

## Monorepo

See @context/coding/runtime/PNPM.md for workspace setup.

## Composable Add-ons

- **Frontend?** → @context/coding/stacks/STACK_TS_REACT.md
- **CLI tool?** → @context/coding/stacks/STACK_TS_CLI.md
- **Release automation?** → @context/coding/devops/SEMANTIC_RELEASE.md

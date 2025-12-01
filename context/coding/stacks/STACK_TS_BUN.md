# TypeScript + Bun Stack

Bun all-in-one: runtime + package manager + bundler + test runner.

## Required Reading

- @context/coding/runtime/BUN.md - Runtime, pkg mgr, bundler, test runner
- @context/coding/dx/LINT_FORMATTING.md - ESLint + Prettier
- @context/coding/cli/LOGGING_CLI.md - CLI logging (or backend/LOGGING_OBSERVABILITY.md for services)
- @context/coding/CODING_STYLE.md - FP patterns, naming

## Quick Start

```bash
# New project
mkdir myproject && cd myproject
bun init

# Install deps
bun add <package>
bun add -d <dev-package>

# Run
bun run index.ts

# Test
bun test

# Build
bun build ./src/index.ts --outdir ./dist
```

## When to Use

- Greenfield TypeScript projects
- CLI tools
- Serverless (fast cold starts)
- Maximum development speed

## When NOT to Use

- Complex frontend needing HMR → add @context/coding/frontend/VITE.md
- Enterprise requiring full Node compatibility → use STACK_TS_PNPM_NODE.md
- Large existing Node codebase → stay with Node

## Type-Checking

Bun runs TS but doesn't type-check. Add:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

## Composable Add-ons

- **Frontend?** → @context/coding/stacks/STACK_TS_REACT.md
- **CLI tool?** → @context/coding/stacks/STACK_TS_CLI.md
- **Release automation?** → @context/coding/devops/SEMANTIC_RELEASE.md

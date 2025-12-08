---
depends: []
---

# TypeScript + pnpm + Node CLI Stack

CLI tools with traditional Node.js stack: pnpm packages, tsc build, maximum compatibility.

## Layers

| Layer | Reference |
|-------|-----------|
| Runtime | @primitives/tools/PNPM.md, @primitives/tools/NODE.md, @primitives/tools/TYPESCRIPT.md |
| CLI | @primitives/patterns/CLI_LIBS.md, @primitives/patterns/LOGGING_CLI.md |
| Testing | @primitives/principles/testing.md |
| DX | @foundations/code-standards.md, @primitives/tools/husky.md |
| DevOps | @primitives/tools/semantic-release.md |
| Libs | @primitives/tools/DOTENV.md |
| Workflow | @workflows/COMMIT.md, @workflows/DEV_LIFECYCLE.md |

## Quick Start

```bash
mkdir mycli && cd mycli
pnpm init

# CLI deps
pnpm add commander chalk ora boxen
pnpm add -D @commander-js/extra-typings typescript tsx @types/node

# DX
pnpm add -D eslint prettier uba-eslint-config vitest husky
```

## When to Use

- Enterprise CLIs needing Node LTS
- Complex native addon dependencies
- Monorepos with shared packages
- Existing Node.js infrastructure

## When NOT to Use

- Fast prototyping (use Bun)
- Single-file executables (use Bun)
- Serverless needing fast cold starts

## Project Structure

```
mycli/
├── src/
│   ├── cli.ts           # Entry point
│   ├── commands/        # Command handlers
│   └── lib/             # Shared utilities
├── dist/                # Compiled JS
├── package.json
├── tsconfig.json
├── eslint.config.js
└── vitest.config.ts
```

## Commands

```bash
pnpm dev                    # tsx watch src/cli.ts
pnpm build                  # tsc --build
pnpm test                   # vitest run
pnpm typecheck              # tsc --noEmit
pnpm lint                   # eslint .
```

## Minimal CLI

```typescript
import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";
import ora from "ora";

const program = new Command();

program.name("mycli").description("My CLI tool").version("1.0.0");

program
  .command("run")
  .description("Run something")
  .option("-v, --verbose", "Verbose output")
  .action(async (options) => {
    const spinner = ora("Working...").start();
    try {
      // ... do work
      spinner.succeed(chalk.green("Done!"));
    } catch {
      spinner.fail(chalk.red("Failed"));
      process.exit(1);
    }
  });

program.parse();
```

## ESLint: Disable no-console

```typescript
// eslint.config.js
import { ubaEslintConfig } from "uba-eslint-config";

export default [...ubaEslintConfig, { rules: { "no-console": "off" } }];
```

## package.json

```json
{
  "name": "mycli",
  "type": "module",
  "bin": { "mycli": "./dist/cli.js" },
  "scripts": {
    "dev": "tsx watch src/cli.ts",
    "build": "tsc --build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "prepare": "husky"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

## Shebang for bin

Add shebang to entry file or build output:

```typescript
#!/usr/bin/env node
// src/cli.ts or dist/cli.js
```

Or use tsx in bin field: `"bin": { "mycli": "npx tsx src/cli.ts" }`

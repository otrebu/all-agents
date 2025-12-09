---
tags: [cli]
depends:
  - @context/foundations/bun-runtime.md
  - @context/primitives/tools/commander.md
  - @context/primitives/tools/chalk.md
  - @context/primitives/tools/ora.md
  - @context/primitives/tools/boxen.md
  - @context/primitives/patterns/logging-cli.md
  - @context/primitives/patterns/cli-e2e-testing.md
  - @context/primitives/principles/testing.md
  - @context/foundations/code-standards.md
  - @context/primitives/tools/dotenv.md
  - @context/workflows/commit.md
  - @context/workflows/dev-lifecycle.md
---

# TypeScript + Bun CLI Stack

CLI tools with Bun runtime: fast startup, native TS, single-file executables.

## Layers

| Layer          | Reference                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Foundation     | @context/foundations/bun-runtime.md                                                                                                              |
| CLI Tools      | @context/primitives/tools/commander.md, @context/primitives/tools/chalk.md, @context/primitives/tools/ora.md, @context/primitives/tools/boxen.md |
| CLI Patterns   | @context/primitives/patterns/logging-cli.md                                                                                                      |
| Testing        | @context/primitives/principles/testing.md, @context/primitives/patterns/cli-e2e-testing.md                                                       |
| Code Standards | @context/foundations/code-standards.md                                                                                                           |
| Libs           | @context/primitives/tools/dotenv.md                                                                                                              |
| Workflows      | @context/workflows/commit.md, @context/workflows/dev-lifecycle.md                                                                                                |

## Quick Start

```bash
mkdir mycli && cd mycli
bun init

# CLI deps
bun add commander chalk ora boxen
bun add -d @commander-js/extra-typings bun-types

# DX
bun add -d eslint prettier uba-eslint-config
```

## When to Use

- Fast CLI tools, scripts
- Serverless CLIs (fast cold starts)
- Single-file executables
- Maximum dev speed

## When NOT to Use

- Needs full Node.js ecosystem compatibility
- Complex native addon dependencies
- Enterprise requiring Node LTS support

## Project Structure

```
mycli/
├── src/
│   ├── cli.ts           # Entry point
│   ├── commands/        # Command handlers
│   └── lib/             # Shared utilities
├── bin/                 # Compiled binary
├── package.json
├── tsconfig.json
├── eslint.config.js
└── bunfig.toml
```

## Commands

```bash
bun run src/cli.ts          # Dev run
bun test                    # Run tests
bun test tools/tests/e2e/   # Run E2E tests only
bun run typecheck           # tsc --noEmit
bun run lint                # ESLint
bun build ./src/cli.ts --compile --outfile ./bin/mycli  # Build exe
```

**New CLI commands must have E2E tests.** See @context/primitives/patterns/cli-e2e-testing.md.

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
  "bin": { "mycli": "./bin/mycli" },
  "scripts": {
    "dev": "bun run src/cli.ts",
    "build": "bun build ./src/cli.ts --compile --outfile ./bin/mycli",
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

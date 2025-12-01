# TypeScript CLI Stack

Add-on for building command-line tools.

## Required Reading

- @context/coding/cli/CLI_LIBS.md - commander, chalk, ora, boxen
- @context/coding/cli/LOGGING_CLI.md - CLI logging patterns

## Base Stack

Choose one:
- @context/coding/stacks/STACK_TS_BUN.md (recommended for CLI)
- @context/coding/stacks/STACK_TS_PNPM_NODE.md

## Quick Start

```bash
# Install CLI libs
bun add commander chalk ora boxen
bun add -d @commander-js/extra-typings
```

## Minimal CLI

```typescript
import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";
import ora from "ora";

const program = new Command();

program
  .name("mycli")
  .description("My CLI tool")
  .version("1.0.0");

program
  .command("run")
  .description("Run something")
  .option("-v, --verbose", "Verbose output")
  .action(async (options) => {
    const spinner = ora("Working...").start();

    try {
      // ... do work
      spinner.succeed(chalk.green("Done!"));
    } catch (error) {
      spinner.fail(chalk.red("Failed"));
      process.exit(1);
    }
  });

program.parse();
```

## ESLint: Disable no-console

For CLI projects only:

```typescript
// eslint.config.js
import { ubaEslintConfig } from "uba-eslint-config";

export default [
  ...ubaEslintConfig,
  { rules: { "no-console": "off" } },
];
```

## Build Executable

**With Bun:**

```bash
bun build ./src/cli.ts --compile --outfile ./bin/mycli
```

**With tsc:**

```bash
tsc --build
# Add shebang to dist/cli.js: #!/usr/bin/env node
chmod +x dist/cli.js
```

## package.json bin

```json
{
  "bin": {
    "mycli": "./dist/cli.js"
  }
}
```

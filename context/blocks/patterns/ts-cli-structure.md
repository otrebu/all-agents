## Typescript CLI structure

```
mycli/
├── src/
│   ├── cli.ts           # Entry point
│   ├── commands/        # Command handlers
│   └── lib/             # Shared utilities
├── bin/                 # Compiled binary ( when using bun )
├── package.json
├── tsconfig.json
└── eslint.config.js
```

### Commands

Specific to bun, to compile to binary:

```bash
bun build ./src/cli.ts --compile --outfile ./bin/mycli  # Build exe
```

### Minimal CLI example

```typescript
import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";
import ora from "ora";

const program = new Command();

program.name("mycli").description("My CLI tool").version("0.0.1");

program
  .command("run")
  .description("Run something")
  .option("-p, --print <message>", "Print message")
  .action(async (options) => {});

program.parse();
```

## ESLint: Disable no-console acceptable in CLI application

```typescript
// eslint.config.js
import { ubaEslintConfig } from "uba-eslint-config";

export default [...ubaEslintConfig, { rules: { "no-console": "off" } }];
```

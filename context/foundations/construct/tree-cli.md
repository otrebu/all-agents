## Typescript CLI structure

```
mycli/
├── src/
│   ├── cli.ts           # Entry point
│   ├── commands/        # Command handlers (impl + types)
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

**Naming:** `[commandName]Command` for handlers (e.g., `downloadCommand`, `setupCommand`)
**Exports:** Default exports only (consistent across all commands)
**Separation:** CLI handler wraps core logic, handles errors & exit codes

Command Files (impl + types in one file):

```typescript
// src/commands/download.ts
interface DownloadOptions {
  dir?: string;
  output?: string;
}

// Core logic - pure business logic
async function download(
  urls: Array<string>,
  options: DownloadOptions,
): Promise<string> {
  // Business logic here
  return outputPath;
}

// CLI handler - error handling + exit
async function downloadCommand(
  urls: Array<string>,
  options: DownloadOptions,
): Promise<void> {
  try {
    await download(urls, options);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export default downloadCommand;
```

```typescript
// src/commands/task.ts
interface TaskOptions {
  dir?: string;
}

// Core logic
function createTask(name: string, options: TaskOptions): string {
  // Business logic
  return filepath;
}

// CLI handler
async function createTaskCommand(
  name: string,
  options: TaskOptions,
): Promise<void> {
  try {
    const path = createTask(name, options);
    console.log(`Created: ${path}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export default createTaskCommand;
```

Central CLI (just wiring - all default imports):

```typescript
// src/cli.ts
import { Command } from "commander";
import downloadCommand from "./commands/download.js";
import createTaskCommand from "./commands/task.js";

const program = new Command()
  .name("mycli")
  .description("My CLI tool")
  .version("1.0.0");

program.addCommand(
  new Command("download")
    .description("Download URLs")
    .argument("<urls...>", "URLs to download")
    .option("-o, --output <name>", "Output filename")
    .option("-d, --dir <path>", "Output directory")
    .action(downloadCommand),
);

const task = new Command("task").description("Task management");

task.addCommand(
  new Command("create")
    .description("Create task file")
    .argument("<name>", "Task name in kebab-case")
    .option("-d, --dir <path>", "Tasks directory")
    .action(createTaskCommand),
);

program.addCommand(task);

program.parse();
```

## ESLint: Disable no-console acceptable in CLI application

```typescript
// eslint.config.js
import { ubaEslintConfig } from "uba-eslint-config";

export default [...ubaEslintConfig, { rules: { "no-console": "off" } }];
```

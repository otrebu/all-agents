# CLI Libraries

Tools for building command-line interfaces.

## commander

CLI framework for building command-line commands with options and parameters with parsing and validation.
Use with `@commander-js/extra-typings` for type safety.

```typescript
import { Command } from "@commander-js/extra-typings";
import log from "@lib/log";

const program = new Command();

program.name("mycli").description("My CLI tool").version("1.0.0");

program
  .command("greet")
  .description("Greet someone")
  .argument("<name>", "Name to greet")
  .option("-l, --loud", "Shout the greeting")
  .action((name, options) => {
    const greeting = `Hello, ${name}!`;
    log.info(options.loud ? greeting.toUpperCase() : greeting);
  });

program.parse();
```

## chalk

Terminal string styling.

```typescript
import chalk from "chalk";

console.log(chalk.blue("Info"));
console.log(chalk.green.bold("Success!"));
console.log(chalk.red("Error"));
console.log(chalk.yellow("Warning"));
console.log(chalk.gray("Debug info"));
```

## ora

Elegant terminal spinners.

```typescript
import ora from "ora";

const spinner = ora("Loading...").start();

// ... async work

spinner.succeed("Done!");
// or
spinner.fail("Failed!");
```

**With async:**

```typescript
const spinner = ora("Fetching data...").start();
try {
  const data = await fetchData();
  spinner.succeed("Data fetched");
} catch (error) {
  spinner.fail("Fetch failed");
}
```

## boxen

Create boxes in terminal output.

```typescript
import boxen from "boxen";

console.log(
  boxen("Hello World", {
    padding: 1,
    borderStyle: "round",
    borderColor: "green",
  })
);
```

**Result:**

```
╭─────────────────╮
│                 │
│   Hello World   │
│                 │
╰─────────────────╯
```

## Logging

See @context/coding/cli/LOGGING_CLI.md for CLI logging patterns.

**Key point:** CLI tools use `console.log`/`console.error` + chalk for human-readable output. Services use structured logging (pino).

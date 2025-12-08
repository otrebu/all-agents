---
depends: []
---

# commander

CLI framework for building command-line commands with options and parameters with parsing and validation.
Use with `@commander-js/extra-typings` for type safety.

## Usage

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

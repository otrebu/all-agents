---
depends:
  - "@context/blocks/principles/logging.md"
  - "@context/blocks/tools/chalk.md"
  - "@context/blocks/tools/ora.md"
---

# Logging principles

@context/blocks/principles/logging.md

## When to use

**✅ Use for:** CLI tools, terminal apps, interactive commands
**❌ Don't use for:** Services, APIs, web server

**DO NOT use pino, winston, or JSON loggers.** CLIs output text for humans, not log aggregators.

## CLI Logging Implementation details

### Setup

Install chalk and ora.

@context/blocks/tools/chalk.md
@context/blocks/tools/ora.md

### Conditional Verbosity

You must be able to control the verbosity of the CLI output.

```typescript
import log from "@lib/log";
const verbose = options.verbose;

// Always show
log.success("Done!");
log.error("Failed");

// Verbose only
if (verbose) {
  log.dim("Debug: processing file.ts");
}
```

## Best Practices

**DO:**

- ✅ `console.log()` for stdout (normal output)
- ✅ `console.error()` for stderr (errors, warnings)
- ✅ Create a logger wrapper to hide the console.log/error calls
- ✅ Use chalk for colors
- ✅ Use ora for spinners/progress
- ✅ Respect `--quiet` and `--verbose` flags

**DON'T:**

- ❌ Output JSON (unless explicit `--json` flag)
- ❌ Use pino/winston
- ❌ Log to files (use stdout/stderr)

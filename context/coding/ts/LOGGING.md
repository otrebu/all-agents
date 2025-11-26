# Logging

> **Principles:** See @context/CODING_STYLE.md#logging for universal guidelines

## Application Type Determines Logging Strategy

**Services/APIs/Web Servers:**
- Use structured logging with data as fields
- Output machine-parseable format (JSON)
- Use pino (see below)

**CLI Tools:**
- Use human-readable terminal output
- Direct output to stdout/stderr
- Use console + chalk/ora (see below)

## CLI Logging (For CLI Tools Only)

For CLI applications, use native console methods with terminal styling.

**✅ Use for:** CLI tools, terminal applications, interactive commands
**❌ Don't use for:** Services, APIs, web servers, background workers

**DO NOT use pino, winston, or JSON loggers for CLI tools.** Those are for services that ship logs to aggregators. CLIs output text for humans reading terminals.

### Installation

```bash
pnpm add chalk
pnpm add ora  # Optional: for spinners
```

### Basic Usage

```typescript
import chalk from "chalk";

// Standard output
console.log(chalk.blue("ℹ"), "Starting process...");
console.log(chalk.green("✔"), "Build successful!");

// Error output
console.error(chalk.red("✖"), "Build failed:", error.message);
console.error(chalk.dim(error.stack));
```

### With Ora Spinners

```typescript
import ora from "ora";
import chalk from "chalk";

const spinner = ora("Building project...").start();

try {
  await build();
  spinner.succeed(chalk.green("Build complete!"));
} catch (error) {
  spinner.fail(chalk.red("Build failed"));
  console.error(chalk.dim(error.stack));
}
```

### Conditional Verbosity

```typescript
const verbose = options.verbose;

// Always show to user
console.log(chalk.green("✔"), "Done!");
console.error(chalk.red("✖"), "Failed");

// Show only in verbose mode
if (verbose) {
  console.log(chalk.dim("Debug: processing file.ts"));
}
```

### Best Practices

**DO:**

- ✅ Use `console.log()` for stdout (normal output)
- ✅ Use `console.error()` for stderr (errors, warnings)
- ✅ Use chalk or picocolors for colors
- ✅ Use ora for spinners and progress indicators
- ✅ Keep messages concise and human-readable
- ✅ Respect `--quiet` and `--verbose` flags

**DON'T:**

- ❌ Output JSON (unless explicit `--json` flag)
- ❌ Use structured logging libraries (pino/winston)
- ❌ Log to files directly (use stdout/stderr)

### Real-World Examples

Major TypeScript CLIs all use console + styling libraries:

- **npm, pnpm, yarn** → Custom console wrappers
- **Firebase CLI, Vercel CLI** → chalk + console
- **TypeScript (tsc)** → Custom ts.sys.write wrapper
- **ESLint, Prettier** → Formatters with chalk
- **Vite** → picocolors + custom console wrapper

None use pino/winston. CLIs output for humans, not log aggregators.

## pino (For Services/APIs Only)

Super fast, all-natural JSON logger for Node.js.

**✅ Use pino for:** Services, APIs, web servers, background workers, daemons
**❌ Don't use for:** CLI tools, terminal applications, interactive commands

Pino is a low-overhead structured logging library that outputs JSON by default, making it ideal for production systems with log aggregators.

```bash
# Install pino
pnpm add pino

# Optional: pretty printing for development
pnpm add -D pino-pretty
```

### Basic Usage

```typescript
import pino from "pino";

// Production: fast JSON output
const logger = pino();

// Development: pretty printing
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

logger.info("Application started");
logger.error({ err: new Error("Failed") }, "Operation failed");
```

### Structured Logging

```typescript
// Log with structured data
logger.info(
  {
    userId: "123",
    requestId: "abc-def",
    duration: 150,
  },
  "Request completed"
);

// Output: {"level":30,"time":1234567890,"userId":"123","requestId":"abc-def","duration":150,"msg":"Request completed"}
```

### Child Loggers (Contextual Logging)

```typescript
// Create child logger with bound context
const requestLogger = logger.child({ requestId: "abc-def" });

requestLogger.info("Processing request"); // requestId automatically included
requestLogger.error("Request failed"); // requestId automatically included
```

### Functional Wrapper Pattern

Following FP style, avoid using the logger instance directly everywhere. Create a functional wrapper:

```typescript
import pino from "pino";

// Create logger instance once
const pinoInstance = pino();

// Export functional logging interface
export const log = {
  debug: (obj: object, msg?: string) => pinoInstance.debug(obj, msg),
  info: (obj: object, msg?: string) => pinoInstance.info(obj, msg),
  warn: (obj: object, msg?: string) => pinoInstance.warn(obj, msg),
  error: (obj: object, msg?: string) => pinoInstance.error(obj, msg),
  fatal: (obj: object, msg?: string) => pinoInstance.fatal(obj, msg),
  child: (bindings: object) => pinoInstance.child(bindings),
};

// Usage
log.info({ userId: "123" }, "User logged in");
const requestLog = log.child({ requestId: "abc-123" });
```

### Environment-Based Configuration

```typescript
import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";

const logger = pino(
  isDevelopment
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }
    : {
        level: process.env.LOG_LEVEL || "info",
      }
);
```

### Redacting Sensitive Data

```typescript
const logger = pino({
  redact: {
    paths: ["password", "token", "apiKey", "*.password", "*.token"],
    remove: true,
  },
});

// "password" field will be removed from output
logger.info({ username: "john", password: "secret123" }, "User data");
```

### Best Practices

**DO:**

- ✅ Use structured logging: `log.info({ userId, orderId }, "Order created")`
- ✅ Include context: requestId, userId, timestamps
- ✅ Use child loggers for scoped context
- ✅ Log errors with `err` key: `log.error({ err, userId }, "Failed")`
- ✅ Configure redaction for sensitive data
- ✅ Use environment variables for log level control

**DON'T:**

- ❌ Log passwords, tokens, API keys, or PII without redaction
- ❌ Log large objects/arrays (log counts instead)
- ❌ Log inside tight loops (sample or aggregate instead)
- ❌ Use string interpolation: `log.info(`User ${id} did ${action}`)` ← loses structure

**Common Anti-Patterns:**

```typescript
// ❌ DON'T use error level for validation failures
log.error({ email: "invalid" }, "Invalid email"); // User error, not system error

// ✅ DO use debug/info for expected validation
log.debug({ email: "invalid" }, "Validation failed");

// ❌ DON'T use info for errors
log.info({ err }, "Payment failed"); // This is an error!

// ✅ DO use error level for system failures
log.error({ err, userId }, "Payment failed");

// ❌ DON'T log business events at debug level
log.debug({ orderId }, "Order created"); // Lost in production!

// ✅ DO use info for business events
log.info({ orderId }, "Order created");
```

**Key principle**: Log level reflects **system severity**, not business outcomes. Failed login = `info`/`debug`, not `error`.

### Production Integration

For production, ship JSON logs to aggregators (Elasticsearch, Grafana Loki, Datadog, CloudWatch):

```typescript
// Pino outputs JSON to stdout by default - perfect for containers
// Use Docker logging drivers or log shippers (Filebeat, Promtail, etc.)

// Example: conditional pretty-printing in dev only
const logger = pino(
  process.env.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty" } }
    : {} // JSON to stdout in production
);
```

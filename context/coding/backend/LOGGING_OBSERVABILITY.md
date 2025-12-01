# Service Logging

Structured JSON logging for services, APIs, and background workers.

> **Principles:** See @context/CODING_STYLE.md#logging

**✅ Use for:** Services, APIs, web servers, background workers, daemons
**❌ Don't use for:** CLI tools → see @context/coding/cli/LOGGING_CLI.md

## Setup (pino)

Install pino pino-pretty

## Basic Usage

```typescript
import pino from "pino";

// Production: JSON output
const logger = pino();

// Development: pretty printing
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});

logger.info("Application started");
logger.error({ err: new Error("Failed") }, "Operation failed");
```

## Structured Logging

```typescript
logger.info(
  {
    userId: "123",
    requestId: "abc-def",
    duration: 150,
  },
  "Request completed"
);
// Output: {"level":30,"time":...,"userId":"123","requestId":"abc-def","duration":150,"msg":"Request completed"}
```

## Child Loggers (Contextual)

```typescript
const requestLogger = logger.child({ requestId: "abc-def" });

requestLogger.info("Processing request"); // requestId auto-included
requestLogger.error("Request failed"); // requestId auto-included
```

## Environment Config

```typescript
const isDev = process.env.NODE_ENV === "development";

const logger = pino(
  isDev
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : { level: process.env.LOG_LEVEL || "info" }
);
```

## Redacting Sensitive Data

```typescript
const logger = pino({
  redact: {
    paths: ["password", "token", "apiKey", "*.password", "*.token"],
    remove: true,
  },
});
```

## Best Practices

**DO:**

- ✅ Structured logging: `log.info({ userId, orderId }, "Order created")`
- ✅ Include context: requestId, userId, timestamps
- ✅ Use child loggers for scoped context
- ✅ Log errors with `err` key: `log.error({ err, userId }, "Failed")`
- ✅ Configure redaction for sensitive data

**DON'T:**

- ❌ Log passwords, tokens, API keys, PII without redaction
- ❌ Log large objects/arrays (log counts instead)
- ❌ Log inside tight loops (sample/aggregate)
- ❌ String interpolation: `` `User ${id}` `` ← loses structure

## Log Level = System Severity

```typescript
// ❌ DON'T use error for validation failures
log.error({ email: "invalid" }, "Invalid email"); // User error, not system

// ✅ DO use debug/info for expected validation
log.debug({ email: "invalid" }, "Validation failed");

// ❌ DON'T use info for errors
log.info({ err }, "Payment failed"); // This is an error!

// ✅ DO use error for system failures
log.error({ err, userId }, "Payment failed");
```

**Key:** Failed login = `info`/`debug`, not `error`.

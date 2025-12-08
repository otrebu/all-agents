---
depends: []
---

# Logging

## Application Type Determines Logging Strategy

**Services/APIs/Web Servers:**

- Use structured logging with data as fields, not string interpolation
- Output machine-parseable format (e.g., JSON) for log aggregation
- Never use basic print/console statements

**CLI Tools:**

- Use human-readable terminal output
- Direct output to stdout (normal) and stderr (errors)
- Use colored/formatted text for better UX

## Universal Logging Principles

- Never log sensitive data (passwords, tokens, PII) - configure redaction
- Use appropriate log levels to reflect system severity:
  - **debug**: Detailed diagnostic info (usually disabled in production)
  - **info**: Normal operations and significant business events
  - **warn**: Unexpected situations that don't prevent operation
  - **error**: Errors affecting functionality but not crashing the app
  - **fatal**: Critical errors requiring immediate shutdown
- Include contextual data (requestId, userId, etc.) for traceability
- Log level reflects **system severity**, not business outcomes (failed login = info/debug, not error)
- Log at key decision points, state transitions, and external calls for traceability

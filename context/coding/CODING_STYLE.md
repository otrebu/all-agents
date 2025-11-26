# Coding Style

## Functional Programming Patterns

- FP-first, minimal OOP. Avoid classes (exception: custom error types)
- Prefer small, focused functions. If >3 params, use single options object
- Favor immutable returns and pure functions; isolate side effects at edges
- Use plain data structures over class instances
- Prefer data-first utilities (inputs first, options last)
- Use composition over inheritance

## Explicit, descriptive verbose naming

- Names must be self-documenting
- Include domain terms and units where relevant (e.g., `timeoutMs`, `priceGBP`)
- Booleans start with is/has/should; functions are verbs; data are nouns
- Avoid abbreviations unless industry-standard (id, URL, HTML)

## Comments explain WHY, not HOW

- Write comments only for rationale, constraints, trade-offs, invariants, and gotchas
- Do not narrate implementation steps or restate code

## Error handling

- Prefer explicit error handling with typed errors

## Logging

### Application Type Determines Logging Strategy

**Services/APIs/Web Servers:**

- Use structured logging with data as fields, not string interpolation
- Output machine-parseable format (e.g., JSON) for log aggregation
- Never use basic print/console statements

**CLI Tools:**

- Use human-readable terminal output
- Direct output to stdout (normal) and stderr (errors)
- Use colored/formatted text for better UX

### Universal Logging Principles

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

## Testing

### Universal Testing Principles

- Update tests when behavior changes, don't force green
- Test names should tell a story
- Tests serve as documentation

For language-specific testing patterns, see @context/typescript/TESTING.md

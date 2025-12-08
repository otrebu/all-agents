---
depends: []
---

# Coding Style

## Functional Programming Patterns

- FP-first, minimal OOP. Avoid classes (exception: custom error types)
- Never use this keyword in JavaScript/TypeScript code
- Prefer small, focused functions. If >3 params, use single options object
- Favor immutable returns and pure functions; isolate side effects at edges
- Use plain data structures over class instances
- Prefer data-first utilities (inputs first, options last)
- Use composition over inheritance
- Use function keyword for all functions, never use arrow functions

**TypeScript specifics:**

- Avoid `this`, `new`, `prototypes` - use functions, modules, closures
- Use plain objects `{}`, not class instances
- Only exception: custom errors extending `Error` class

## Explicit, descriptive verbose naming

- Names must be self-documenting
- Include domain terms and units where relevant (e.g., `timeoutMs`, `priceGBP`)
- Booleans start with is/has/should; functions are verbs; data are nouns
- Avoid abbreviations unless industry-standard (id, URL, HTML)

## Comments explain WHY, not HOW

- Write comments only for rationale, constraints, trade-offs, invariants, and gotchas
- Do not narrate implementation steps or restate code

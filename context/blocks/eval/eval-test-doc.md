---
depends: []
---

# Eval Test Documentation

Testing patterns for AI agent evaluation.

## Purpose

Evaluate AI agent behavior through structured test scenarios that verify:

- Correct tool usage
- Appropriate response patterns
- Task completion accuracy

## Test Structure

```typescript
// Define expected behavior
const scenario = {
  input: "user prompt",
  expectedTools: ["Read", "Write"],
  expectedOutcome: "file created",
};
```

## When to Use

- Validating agent skills and commands
- Regression testing agent behavior
- Benchmarking response quality

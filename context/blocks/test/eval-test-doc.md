---
depends: []
---

# Eval Testing

Evaluation testing for AI agent outputs and behaviors.

## Purpose

Eval tests verify that AI agents produce correct, consistent outputs. Unlike traditional unit tests that check code behavior, eval tests check AI response quality.

## Key Concepts

- **Determinism**: AI outputs vary; evals measure acceptable ranges
- **Grading**: Automated or human review of output quality
- **Datasets**: Curated input/expected-output pairs
- **Metrics**: Pass rate, accuracy, latency, cost

## When to Use

- Validating prompt changes
- Comparing model versions
- Regression testing AI features
- Benchmarking agent performance

## Basic Pattern

```typescript
interface EvalCase {
  input: string;
  expectedOutput?: string;
  validator: (output: string) => boolean;
}

async function runEval(cases: EvalCase[]): Promise<EvalResult> {
  const results = await Promise.all(
    cases.map(async (c) => {
      const output = await agent.run(c.input);
      return c.validator(output);
    })
  );
  return { passRate: results.filter(Boolean).length / results.length };
}
```

## See Also

- @context/blocks/test/testing.md - General testing philosophy
- @context/blocks/test/unit-testing.md - Unit testing patterns

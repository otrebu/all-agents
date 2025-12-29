---
depends: []
---

# Vitest

Fast, Vite-native test runner with Jest-compatible API and native TypeScript/ESM support.

## Quick Start

```bash
# install (dev)
vitest
```

## Configuration

**vitest.config.ts** (or add `test` to vite.config.ts):

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // describe/it/expect without imports
    environment: "node", // or 'jsdom', 'happy-dom'
    include: ["**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

For `globals: true`, add to tsconfig.json:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

## Core API

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Calculator", () => {
  beforeEach(() => {
    /* setup */
  });
  afterEach(() => {
    /* cleanup */
  });

  it("adds numbers", () => {
    expect(1 + 2).toBe(3);
  });

  it.skip("skipped test", () => {});
  it.todo("implement later");
  it.only("runs only this", () => {}); // debug only
});
```

## Mocking

```typescript
// Mock function
const mockFn = vi.fn();
const mockImpl = vi.fn((x) => x * 2);
const mockAsync = vi.fn().mockResolvedValue({ data: "test" });

// Spy on existing
vi.spyOn(obj, "method").mockReturnValue(42);

// Mock module (hoisted)
vi.mock("./api", () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: 1 }),
}));

// Assertions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith("arg");
expect(mockFn).toHaveBeenCalledTimes(2);
```

## Async & Timers

```typescript
// Async
await expect(fetchData()).resolves.toBe(value);
await expect(fetchData()).rejects.toThrow("error");

// Fake timers
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.useRealTimers(); // restore
```

## Coverage

```bash
# install (dev)
@vitest/coverage-v8

# run
vitest run --coverage
```

```typescript
// vitest.config.ts
test: {
  coverage: {
    provider: "v8",
    reporter: ["text", "html"],
    thresholds: { lines: 80 },
  },
}
```

## Commands

```bash
vitest          # watch mode (default)
vitest run      # single run
vitest --ui     # visual UI (needs @vitest/ui)
vitest -t "pattern"  # filter by test name
```

## When to Use

| Scenario            | Vitest | Alternative        |
| ------------------- | ------ | ------------------ |
| Vite project        | Yes    | -                  |
| React/Vue component | Yes    | -                  |
| Node.js lib         | Yes    | bun:test           |
| Bun-only project    | Maybe  | bun:test (simpler) |
| Legacy Jest project | Maybe  | Stay on Jest       |

Vitest = Vite projects, ESM-first, fast HMR in watch mode.

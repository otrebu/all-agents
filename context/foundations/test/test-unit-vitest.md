---
depends:
  - "@context/blocks/test/vitest.md"
  - "@context/blocks/test/unit-testing.md"
---

# Unit Testing with Vitest

Test isolated functions, utilities, and hooks with fast feedback.

## References

@context/blocks/test/vitest.md
@context/blocks/test/unit-testing.md

---

## Setup

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["**/*.d.ts", "**/types/**"],
    },
  },
});
```

---

## Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
test("formats currency correctly", () => {
  // Arrange
  const amount = 1234.56;

  // Act
  const result = formatCurrency(amount, "USD");

  // Assert
  expect(result).toBe("$1,234.56");
});
```

### Testing Errors

```typescript
test("throws on invalid input", () => {
  expect(() => divide(1, 0)).toThrow("Cannot divide by zero");
  expect(() => divide(1, 0)).toThrow(Error);
});
```

### Mocking Dependencies

```typescript
import { vi } from "vitest";
import * as api from "./api";

vi.mock("./api");

test("fetches user data", async () => {
  vi.mocked(api.fetchUser).mockResolvedValue({ id: 1, name: "John" });

  const user = await getUser(1);

  expect(api.fetchUser).toHaveBeenCalledWith(1);
  expect(user.name).toBe("John");
});
```

### Testing Async Functions

```typescript
test("fetches data successfully", async () => {
  const data = await fetchData();
  expect(data).toEqual({ items: [] });
});

test("handles rejection", async () => {
  await expect(fetchBadData()).rejects.toThrow("Not found");
});
```

### Fake Timers

```typescript
import { vi, beforeEach, afterEach } from "vitest";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("debounces calls", () => {
  const callback = vi.fn();
  const debounced = debounce(callback, 100);

  debounced();
  debounced();
  expect(callback).not.toHaveBeenCalled();

  vi.advanceTimersByTime(100);
  expect(callback).toHaveBeenCalledTimes(1);
});
```

---

## Testing Hooks

```typescript
import { renderHook, act } from "@testing-library/react";

test("useCounter increments", () => {
  const { result } = renderHook(() => useCounter(0));

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

With providers:

```typescript
const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const { result } = renderHook(() => useUser(1), { wrapper });
```

---

## Coverage Strategy

| Code Type            | Target | Rationale                    |
| -------------------- | ------ | ---------------------------- |
| Business logic       | 90%+   | Critical, easy to test       |
| Utilities            | 90%+   | Pure functions, many callers |
| UI components        | 70%    | Behavior > implementation    |
| Generated/trivial    | Skip   | No value                     |

Focus on **branch coverage** over line coverage - ensures all paths tested.

---

## Anti-Patterns

1. **Testing implementation** - Don't check internal state, test outputs
2. **Over-mocking** - Mock boundaries (network, time), not internal modules
3. **Shared mutable state** - Reset in `beforeEach`
4. **Sleeping** - Use `vi.advanceTimersByTime` or `waitFor`
5. **Too many assertions** - One behavior per test

---

## When to Use

| Scenario            | Unit Test | Integration Test |
| ------------------- | --------- | ---------------- |
| Utility function    | Yes       | No               |
| Custom hook         | Yes       | Maybe            |
| Component behavior  | No        | Yes              |
| API + component     | No        | Yes              |

Unit tests = fast feedback, isolated logic. Integration tests = confidence in composition.

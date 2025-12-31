---
depends:
  - "@context/blocks/test/vitest.md"
  - "@context/blocks/test/react-testing-library.md"
---

# Component Testing with Vitest + RTL

Test React components by simulating user interactions and asserting on rendered output.

## References

@context/blocks/test/vitest.md
@context/blocks/test/react-testing-library.md

---

## Setup

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom", // or 'happy-dom' (faster)
    setupFiles: ["./vitest.setup.ts"],
    css: true,
  },
});
```

### vitest.setup.ts

```typescript
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

---

## Patterns

### Basic Component Test

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

test("button calls onClick", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();

  render(<Button onClick={onClick}>Click me</Button>);

  await user.click(screen.getByRole("button", { name: /click me/i }));

  expect(onClick).toHaveBeenCalledTimes(1);
});
```

### Custom Render with Providers

```typescript
// test-utils.tsx
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Usage
const { user } = renderWithProviders(<MyComponent />);
await user.click(screen.getByRole("button"));
```

### Testing Forms

```typescript
test("submits form with valid data", async () => {
  const onSubmit = vi.fn();
  const { user } = renderWithProviders(<LoginForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/email/i), "test@example.com");
  await user.type(screen.getByLabelText(/password/i), "secret123");
  await user.click(screen.getByRole("button", { name: /sign in/i }));

  expect(onSubmit).toHaveBeenCalledWith({
    email: "test@example.com",
    password: "secret123",
  });
});
```

### Testing Async (loading → data)

```typescript
test("displays data after loading", async () => {
  render(<UserProfile userId="1" />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  expect(await screen.findByText("John Doe")).toBeInTheDocument();
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
```

### Testing Modals

```typescript
import { within } from "@testing-library/react";

test("opens and closes modal", async () => {
  const { user } = renderWithProviders(<App />);

  await user.click(screen.getByRole("button", { name: /open/i }));

  const modal = screen.getByRole("dialog");
  expect(modal).toBeInTheDocument();
  expect(within(modal).getByText("Modal Title")).toBeInTheDocument();

  await user.click(within(modal).getByRole("button", { name: /close/i }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
```

### Testing Error States

```typescript
test("shows error message on API failure", async () => {
  server.use(
    http.get("/api/users", () => {
      return HttpResponse.json({ error: "Failed" }, { status: 500 });
    })
  );

  render(<UserList />);

  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

---

## jsdom vs happy-dom

| Aspect      | jsdom       | happy-dom   |
| ----------- | ----------- | ----------- |
| Speed       | Slower      | ~2-3x faster |
| Completeness | More APIs  | Common APIs |
| Compatibility | Better    | Usually fine |

Start with `happy-dom`, switch to `jsdom` if you hit edge cases.

---

## Anti-Patterns

1. **Testing implementation** - Don't check component state, test rendered output
2. **Using fireEvent** - Prefer `userEvent` for realistic interactions
3. **waitFor with getBy** - Use `findBy` instead (simpler)
4. **Snapshot overuse** - Use targeted assertions
5. **Testing library internals** - Trust React Query/Redux, test your behavior

---

## What to Test

| Test                  | Yes | No  |
| --------------------- | --- | --- |
| User interactions     | Yes |     |
| Conditional rendering | Yes |     |
| Form validation       | Yes |     |
| Error/loading states  | Yes |     |
| Internal state        |     | No  |
| Third-party libs      |     | No  |
| CSS values            |     | No  |

---

## When to Use

| Scenario           | Component Test | E2E Test |
| ------------------ | -------------- | -------- |
| Button click       | Yes            | No       |
| Form validation    | Yes            | No       |
| Multi-page flow    | No             | Yes      |
| Auth + protected   | Maybe          | Yes      |

Component tests = fast, isolated, behavior-focused. E2E = full user journeys.

---
depends: []
---

# React Testing Library

Test React components by querying the DOM like users do. Encourages accessible, behavior-focused tests.

## Quick Start

```bash
# install (dev)
@testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
# or happy-dom instead of jsdom (faster, less complete)
```

## Query Priority

Use in this order (accessibility-first):

```typescript
// 1. Accessible (best)
screen.getByRole("button", { name: /submit/i });
screen.getByLabelText(/email/i);
screen.getByText(/welcome/i);

// 2. Semantic
screen.getByAltText("Logo");
screen.getByTitle("Close");

// 3. Test ID (last resort)
screen.getByTestId("custom-chart");
```

## Query Types

| Query      | No Match | Match  | Use Case                |
| ---------- | -------- | ------ | ----------------------- |
| `getBy*`   | Throws   | Element | Element exists          |
| `queryBy*` | null     | Element | Assert NOT exists       |
| `findBy*`  | Rejects  | Element | Async (waits up to 1s)  |

Each has `*All` variant for multiple elements.

## User Events (v14+)

```typescript
import userEvent from "@testing-library/user-event";

// Setup once per test
const user = userEvent.setup();

// All interactions are async
await user.click(screen.getByRole("button"));
await user.type(screen.getByLabelText(/email/i), "test@example.com");
await user.selectOptions(screen.getByRole("combobox"), "option1");
await user.keyboard("{Enter}");
await user.tab();
```

Prefer `userEvent` over `fireEvent` - simulates real browser behavior.

## Async Utilities

```typescript
// Wait for element to appear
const button = await screen.findByRole("button");

// Wait for assertion
await waitFor(() => {
  expect(mockFn).toHaveBeenCalled();
});

// Wait for element removal
await waitForElementToBeRemoved(() => screen.queryByText("Loading"));
```

## Common Matchers (jest-dom)

```typescript
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toHaveTextContent("Hello");
expect(input).toHaveValue("test");
expect(checkbox).toBeChecked();
expect(button).toBeDisabled();
```

## Common Roles

| Element             | Role        |
| ------------------- | ----------- |
| `<button>`          | button      |
| `<a href>`          | link        |
| `<input type=text>` | textbox     |
| `<input type=checkbox>` | checkbox |
| `<select>`          | combobox    |
| `<h1>`-`<h6>`       | heading     |
| `<dialog>`          | dialog      |
| `<nav>`             | navigation  |

## Debugging

```typescript
screen.debug(); // Print DOM
screen.debug(element); // Print specific element
screen.logTestingPlaygroundURL(); // Generate Testing Playground URL
```

## When to Use

| Scenario              | RTL  | Alternative                |
| --------------------- | ---- | -------------------------- |
| React component tests | Yes  | -                          |
| Hook testing          | Yes  | renderHook from RTL        |
| E2E tests             | No   | Playwright                 |
| Non-React DOM         | Yes  | testing-library/dom        |

RTL = behavior-focused, accessibility-first, refactor-resilient.

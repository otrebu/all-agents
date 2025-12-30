---
depends: []
---

# Playwright

E2E browser automation with auto-waiting, cross-browser support, and powerful debugging.

## Quick Start

```bash
# install (dev)
@playwright/test

# install browsers
npx playwright install
```

## Configuration

**playwright.config.ts:**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

## Locators (Priority Order)

```typescript
// 1. Role (best) - mirrors user/a11y perception
page.getByRole("button", { name: "Submit" });
page.getByRole("heading", { level: 1 });

// 2. Label/placeholder
page.getByLabel("Email");
page.getByPlaceholder("Enter email");

// 3. Text content
page.getByText("Welcome");
page.getByText(/welcome/i); // regex

// 4. Test ID (stable contract)
page.getByTestId("submit-btn");

// 5. CSS (last resort)
page.locator(".card").locator("button");
```

## Assertions (Web-First)

```typescript
// Auto-wait + retry (preferred)
await expect(page.getByRole("alert")).toBeVisible();
await expect(page.getByText("Success")).toHaveText("Success!");
await expect(page.locator("input")).toHaveValue("test@example.com");
await expect(page.locator("img")).toHaveAttribute("src", /logo/);

// Soft assertions (continue on fail)
await expect.soft(page.getByText("Warning")).toBeVisible();

// Polling (custom conditions)
await expect.poll(() => getData()).toBe(expected);
```

## Actions

```typescript
await page.goto("/login");
await page.getByLabel("Email").fill("user@example.com");
await page.getByLabel("Password").fill("password");
await page.getByRole("button", { name: "Sign in" }).click();

// Wait for navigation
await page.waitForURL("/dashboard");
```

## Fixtures

```typescript
import { test as base } from "@playwright/test";

type Fixtures = { loggedInPage: Page };

export const test = base.extend<Fixtures>({
  loggedInPage: async ({ page }, use) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByRole("button", { name: "Login" }).click();
    await use(page);
  },
});
```

## Commands

```bash
npx playwright test              # run all
npx playwright test --ui         # interactive UI
npx playwright test --debug      # step-through debugger
npx playwright test --project=chromium  # single browser
npx playwright show-report       # view HTML report
npx playwright codegen           # record actions
```

## When to Use

| Scenario           | Playwright | Alternative      |
| ------------------ | ---------- | ---------------- |
| Web E2E tests      | Yes        | -                |
| Cross-browser      | Yes        | -                |
| Visual regression  | Yes        | Chromatic        |
| API-only tests     | Maybe      | Vitest/supertest |
| Component tests    | Maybe      | Vitest + RTL     |

Playwright = E2E web apps, cross-browser, auth flows, visual testing.

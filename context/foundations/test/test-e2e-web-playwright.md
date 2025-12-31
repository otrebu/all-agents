---
depends:
  - "@context/blocks/test/playwright.md"
---

# E2E Testing for Web Apps with Playwright

Test user flows, auth, navigation in real browsers.

## References

@context/blocks/test/playwright.md

---

## Setup

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Page Object Pattern

```typescript
// tests/e2e/pages/login.page.ts
import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
    this.errorMessage = page.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login.page";

test.describe("Authentication", () => {
  test("successful login redirects to dashboard", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("user@example.com", "password123");

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading")).toHaveText("Welcome");
  });

  test("invalid credentials shows error", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("wrong@example.com", "wrong");

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toHaveText(/invalid/i);
  });
});
```

---

## Auth State Reuse

```typescript
// tests/e2e/auth.setup.ts
import { test as setup, expect } from "@playwright/test";

const authFile = "tests/e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/dashboard");
  await page.context().storageState({ path: authFile });
});
```

```typescript
// playwright.config.ts
projects: [
  { name: "setup", testMatch: /.*\.setup\.ts/ },
  {
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
      storageState: "tests/e2e/.auth/user.json",
    },
    dependencies: ["setup"],
  },
],
```

Add to `.gitignore`: `tests/e2e/.auth/`

---

## Folder Structure

```
tests/
└── e2e/
    ├── .auth/              # auth state (gitignored)
    ├── pages/              # page objects
    │   ├── login.page.ts
    │   └── dashboard.page.ts
    ├── fixtures/           # custom fixtures
    │   └── test.ts
    ├── auth.setup.ts       # auth setup
    ├── auth.spec.ts
    └── dashboard.spec.ts
```

---

## Custom Fixtures

```typescript
// tests/e2e/fixtures/test.ts
import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

type Pages = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect } from "@playwright/test";
```

```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from "./fixtures/test";

test("dashboard shows user data", async ({ dashboardPage }) => {
  await dashboardPage.goto();
  await expect(dashboardPage.welcomeMessage).toBeVisible();
});
```

---

## API Mocking in E2E

```typescript
test("handles API error gracefully", async ({ page }) => {
  await page.route("**/api/users", (route) =>
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: "Server error" }),
    })
  );

  await page.goto("/users");
  await expect(page.getByText("Something went wrong")).toBeVisible();
});
```

---

## Visual Testing

```typescript
test("homepage looks correct", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("homepage.png");
});

test("button states", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "Submit" });

  await expect(button).toHaveScreenshot("button-default.png");

  await button.hover();
  await expect(button).toHaveScreenshot("button-hover.png");
});
```

Update snapshots: `npx playwright test --update-snapshots`

For visual regression at scale: @context/foundations/test/test-visual-chromatic.md

---

## CI Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### CI with Sharding (Parallel Runs)

```yaml
# .github/workflows/e2e.yml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

---

## When to Use

| Scenario            | E2E Test | Integration Test |
| ------------------- | -------- | ---------------- |
| User auth flow      | Yes      | Maybe            |
| Form submission     | Yes      | Maybe            |
| Component behavior  | No       | Yes              |
| API response format | No       | Yes              |

E2E = critical user paths, auth flows, cross-page navigation.

## When NOT to Use

- **Fast feedback** → @context/foundations/test/test-unit-vitest.md
- **Component logic** → @context/foundations/test/test-component-vitest-rtl.md
- **API contracts** → @context/foundations/test/test-integration-api.md

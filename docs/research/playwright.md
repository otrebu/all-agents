# Playwright Testing Framework

Comprehensive research documentation for Playwright, Microsoft's end-to-end testing framework.

**Last Updated:** December 2024
**Framework Version:** 1.55.0 (Latest as of August 2025)

---

## Table of Contents

1. [Setup & Installation](#1-setup--installation)
2. [Test API](#2-test-api)
3. [Selectors & Locators](#3-selectors--locators)
4. [Actions](#4-actions)
5. [Assertions](#5-assertions)
6. [Page Object Model](#6-page-object-model)
7. [Fixtures](#7-fixtures)
8. [Parallel Execution](#8-parallel-execution)
9. [Debugging](#9-debugging)
10. [CI/CD Integration](#10-cicd-integration)
11. [API Testing](#11-api-testing)

---

## 1. Setup & Installation

### Quick Installation

The fastest way to set up Playwright:

```bash
# Initialize new Playwright project
npm init playwright@latest

# Or install manually
npm install -D @playwright/test

# Install browser binaries
npx playwright install
```

### VS Code Extension Setup

1. Open VS Code Extensions
2. Search for "Playwright" by Microsoft
3. Command Palette → "Install Playwright"
4. Select required browsers

### Project Structure

After initialization, Playwright creates:

```
project/
├── playwright.config.ts    # Test configuration
├── package.json
├── tests/
│   └── example.spec.ts     # Example test
├── tests-examples/         # Additional examples
└── .github/
    └── workflows/
        └── playwright.yml  # CI workflow (optional)
```

### Configuration File (playwright.config.ts)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on test.only in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI
  retries: process.env.CI ? 2 : 0,

  // Number of parallel workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:3000',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Run local dev server before tests
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Key Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `testDir` | Directory containing test files | `./tests` |
| `timeout` | Test timeout in milliseconds | `30000` |
| `workers` | Number of parallel workers | CPU cores / 2 |
| `retries` | Number of test retries | `0` |
| `outputDir` | Artifacts output directory | `test-results` |
| `globalSetup` | Path to global setup file | - |
| `globalTeardown` | Path to global teardown file | - |

### Running Tests

```bash
# Run all tests
npx playwright test

# Run in headed mode
npx playwright test --headed

# Run specific test file
npx playwright test tests/login.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Run with UI mode
npx playwright test --ui

# Show HTML report
npx playwright show-report
```

---

## 2. Test API

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev');
  await expect(page).toHaveTitle(/Playwright/);
});
```

### test.describe - Grouping Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login with valid credentials', async ({ page }) => {
    // test implementation
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // test implementation
  });
});
```

### Nested Describes

```typescript
test.describe('User Management', () => {
  test.describe('Registration', () => {
    test('should register new user', async ({ page }) => {
      // test
    });
  });

  test.describe('Profile', () => {
    test('should update profile', async ({ page }) => {
      // test
    });
  });
});
```

### Hooks

```typescript
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  // Runs before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('https://example.com');
  });

  // Runs after each test
  test.afterEach(async ({ page }) => {
    // cleanup
  });

  // Runs once before all tests in this describe block
  test.beforeAll(async () => {
    // setup
  });

  // Runs once after all tests in this describe block
  test.afterAll(async () => {
    // teardown
  });

  test('main navigation', async ({ page }) => {
    await expect(page).toHaveURL('https://example.com');
  });
});
```

### Test Annotations

```typescript
// Skip a test
test.skip('feature not ready', async ({ page }) => {
  // skipped
});

// Mark test as expected to fail
test.fail('known bug', async ({ page }) => {
  // expected to fail
});

// Run only this test
test.only('focus on this test', async ({ page }) => {
  // only this runs
});

// Slow test - triple the timeout
test.slow('heavy computation', async ({ page }) => {
  // gets more time
});

// Conditional skip
test('conditional', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox not supported');
  // test code
});

// Add custom tag
test('tagged test', { tag: '@smoke' }, async ({ page }) => {
  // test code
});
```

---

## 3. Selectors & Locators

### Recommended Locator Priority

1. **`getByRole`** - Most recommended, mirrors accessibility
2. **`getByText`** - For text content
3. **`getByLabel`** - For form controls
4. **`getByPlaceholder`** - For inputs
5. **`getByAltText`** - For images
6. **`getByTitle`** - For title attribute
7. **`getByTestId`** - Fallback with data-testid

### getByRole (Recommended)

```typescript
// Button
await page.getByRole('button', { name: 'Submit' }).click();

// Link
await page.getByRole('link', { name: 'Learn more' }).click();

// Heading
await page.getByRole('heading', { name: 'Welcome' });

// Checkbox
await page.getByRole('checkbox', { name: 'Accept terms' }).check();

// With exact match
await page.getByRole('button', { name: 'Submit', exact: true });

// Navigation
await page.getByRole('navigation').getByRole('link', { name: 'About' });
```

### getByText

```typescript
// Exact match
await page.getByText('Hello World', { exact: true });

// Partial match (default)
await page.getByText('Hello');

// Case insensitive with regex
await page.getByText(/hello world/i);
```

### getByLabel

```typescript
// For form inputs with associated labels
await page.getByLabel('Username').fill('john');
await page.getByLabel('Password').fill('secret');
await page.getByLabel('Remember me').check();
```

### getByPlaceholder

```typescript
await page.getByPlaceholder('Search...').fill('playwright');
await page.getByPlaceholder('Enter email').fill('user@example.com');
```

### getByAltText

```typescript
// For images with alt text
await page.getByAltText('Company Logo').click();
```

### getByTestId

```typescript
// Using data-testid attribute (fallback option)
await page.getByTestId('submit-button').click();
await page.getByTestId('user-profile').isVisible();

// Configure custom test ID attribute in config:
// use: { testIdAttribute: 'data-pw' }
```

### Locator Chaining

```typescript
// Chain locators to narrow down
const productCard = page.locator('.product-card');
await productCard.getByRole('button', { name: 'Add to cart' }).click();

// Multiple chaining
await page
  .getByRole('listitem')
  .filter({ hasText: 'Product 2' })
  .getByRole('button', { name: 'Add to cart' })
  .click();
```

### Filtering Locators

```typescript
// Filter by text
await page.getByRole('listitem').filter({ hasText: 'apple' });

// Filter by not having text
await page.getByRole('listitem').filter({ hasNotText: 'orange' });

// Filter by child locator
await page.getByRole('listitem').filter({
  has: page.getByRole('heading', { name: 'Product Name' })
});
```

### Working with Multiple Elements

```typescript
// Get count
const count = await page.getByRole('listitem').count();

// Get first, last, or nth
await page.getByRole('listitem').first().click();
await page.getByRole('listitem').last().click();
await page.getByRole('listitem').nth(2).click();  // zero-indexed

// Iterate all
const items = page.getByRole('listitem');
for (const item of await items.all()) {
  console.log(await item.textContent());
}
```

### CSS and XPath (Use Sparingly)

```typescript
// CSS selector
await page.locator('css=button.primary').click();
await page.locator('.product-card >> text=Buy Now').click();

// XPath (not recommended - use only when necessary)
await page.locator('xpath=//button[@type="submit"]').click();
```

---

## 4. Actions

### Click Actions

```typescript
// Simple click
await page.getByRole('button', { name: 'Submit' }).click();

// Double click
await page.getByText('Edit').dblclick();

// Right click
await page.getByText('Item').click({ button: 'right' });

// Shift+click
await page.getByText('Item').click({ modifiers: ['Shift'] });

// Ctrl+click (Cmd on Mac)
await page.getByText('Item').click({ modifiers: ['Control'] });

// Click at position
await page.getByRole('canvas').click({ position: { x: 100, y: 200 } });

// Force click (bypass actionability checks)
await page.getByRole('button').click({ force: true });
```

### Text Input

```typescript
// Fill (clears existing content)
await page.getByLabel('Email').fill('user@example.com');

// Clear input
await page.getByLabel('Email').clear();

// Type character by character
await page.getByLabel('Search').pressSequentially('hello', { delay: 100 });

// Press specific key
await page.getByLabel('Search').press('Enter');
```

### Checkbox & Radio

```typescript
// Check
await page.getByLabel('Accept terms').check();

// Uncheck
await page.getByLabel('Subscribe').uncheck();

// Set checked state
await page.getByLabel('Option').setChecked(true);
await page.getByLabel('Option').setChecked(false);
```

### Select / Dropdown

```typescript
// Select by value
await page.getByLabel('Country').selectOption('usa');

// Select by label
await page.getByLabel('Country').selectOption({ label: 'United States' });

// Select multiple
await page.getByLabel('Colors').selectOption(['red', 'green', 'blue']);
```

### File Upload

```typescript
// Single file
await page.getByLabel('Upload').setInputFiles('file.pdf');

// Multiple files
await page.getByLabel('Upload').setInputFiles(['file1.pdf', 'file2.pdf']);

// Remove all files
await page.getByLabel('Upload').setInputFiles([]);
```

### Keyboard Actions

```typescript
// Press single key
await page.keyboard.press('Escape');
await page.keyboard.press('Enter');
await page.keyboard.press('Tab');

// Key combinations
await page.keyboard.press('Control+A');  // Select all
await page.keyboard.press('Control+C');  // Copy
await page.keyboard.press('Control+V');  // Paste

// Hold key
await page.keyboard.down('Shift');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
await page.keyboard.up('Shift');

// Type text
await page.keyboard.type('Hello World');
```

### Mouse Actions

```typescript
// Hover
await page.getByRole('menuitem').hover();

// Move
await page.mouse.move(100, 200);

// Click
await page.mouse.click(100, 200);

// Drag and drop
await page.getByText('Drag me').dragTo(page.getByText('Drop here'));

// Manual drag
await page.locator('#source').hover();
await page.mouse.down();
await page.locator('#target').hover();
await page.mouse.up();

// Scroll with mouse wheel
await page.mouse.wheel(0, 500);
```

### Focus

```typescript
// Focus element
await page.getByLabel('Email').focus();

// Blur (unfocus)
await page.getByLabel('Email').blur();
```

---

## 5. Assertions

### Page Assertions

```typescript
// URL assertions
await expect(page).toHaveURL('https://example.com');
await expect(page).toHaveURL(/dashboard/);

// Title assertions
await expect(page).toHaveTitle('My App');
await expect(page).toHaveTitle(/App/);
```

### Locator Assertions

```typescript
// Visibility
await expect(page.getByRole('alert')).toBeVisible();
await expect(page.getByRole('dialog')).toBeHidden();
await expect(page.getByTestId('loading')).not.toBeVisible();

// Text content
await expect(page.getByRole('heading')).toHaveText('Welcome');
await expect(page.getByRole('heading')).toHaveText(/Welcome/);
await expect(page.locator('.message')).toContainText('Success');

// Attribute
await expect(page.getByRole('button')).toHaveAttribute('disabled', '');
await expect(page.locator('input')).toHaveAttribute('type', 'email');

// CSS
await expect(page.locator('.btn')).toHaveClass(/active/);
await expect(page.locator('.box')).toHaveCSS('display', 'flex');

// Count
await expect(page.getByRole('listitem')).toHaveCount(3);

// Value
await expect(page.getByLabel('Email')).toHaveValue('user@example.com');
await expect(page.getByLabel('Email')).toHaveValue(/example/);

// Enabled/Disabled
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByRole('button')).toBeDisabled();

// Checked
await expect(page.getByRole('checkbox')).toBeChecked();
await expect(page.getByRole('checkbox')).not.toBeChecked();

// Focused
await expect(page.getByLabel('Email')).toBeFocused();

// Editable
await expect(page.getByLabel('Name')).toBeEditable();

// Empty
await expect(page.getByLabel('Notes')).toBeEmpty();

// Attached to DOM
await expect(page.locator('#modal')).toBeAttached();
```

### Soft Assertions

Soft assertions continue test execution even if they fail:

```typescript
// Soft assertions don't stop test execution
await expect.soft(page.getByTestId('status')).toHaveText('Success');
await expect.soft(page.getByTestId('count')).toHaveText('10');

// Continue with more checks
await page.getByRole('button', { name: 'Next' }).click();

// Check if there were any soft assertion failures
expect(test.info().errors).toHaveLength(0);
```

### Custom Timeout

```typescript
// Custom timeout for single assertion
await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });

// Configure slow expect for all assertions
const slowExpect = expect.configure({ timeout: 10000 });
await slowExpect(page.getByRole('heading')).toHaveText('Welcome');
```

### Negating Assertions

```typescript
await expect(page.getByRole('alert')).not.toBeVisible();
await expect(page.getByRole('button')).not.toBeDisabled();
await expect(page.locator('.error')).not.toContainText('failed');
```

### Generic Value Assertions

```typescript
// Equality
expect(value).toBe(5);
expect(value).toEqual({ name: 'John' });
expect(value).toStrictEqual({ name: 'John' });

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(3.14, 2);

// Strings
expect(string).toContain('hello');
expect(string).toMatch(/hello/);

// Arrays
expect(array).toContain('item');
expect(array).toHaveLength(3);
```

---

## 6. Page Object Model

### Basic POM Structure

```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage() {
    return this.errorMessage.textContent();
  }
}
```

### Using Page Objects in Tests

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login', () => {
  test('should login successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@example.com', 'password123');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@example.com', 'wrongpassword');
    await expect(loginPage.errorMessage).toBeVisible();
  });
});
```

### Page Object with Components

```typescript
// pages/components/Header.ts
import { Page, Locator } from '@playwright/test';

export class Header {
  readonly page: Page;
  readonly logo: Locator;
  readonly searchInput: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logo = page.getByRole('link', { name: 'Logo' });
    this.searchInput = page.getByRole('searchbox');
    this.userMenu = page.getByRole('button', { name: 'User menu' });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async openUserMenu() {
    await this.userMenu.click();
  }
}

// pages/DashboardPage.ts
import { Page } from '@playwright/test';
import { Header } from './components/Header';

export class DashboardPage {
  readonly page: Page;
  readonly header: Header;

  constructor(page: Page) {
    this.page = page;
    this.header = new Header(page);
  }

  async goto() {
    await this.page.goto('/dashboard');
  }
}
```

### POM with Fixtures (Advanced)

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

type MyFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },
});

export { expect } from '@playwright/test';

// tests/login.spec.ts
import { test, expect } from '../fixtures';

test('should login successfully', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  // No need to create page objects manually!
});
```

---

## 7. Fixtures

### Built-in Fixtures

| Fixture | Description |
|---------|-------------|
| `page` | Isolated Page instance for the test |
| `context` | Isolated BrowserContext for the test |
| `browser` | Shared browser instance |
| `browserName` | Name of the browser (chromium/firefox/webkit) |
| `request` | APIRequestContext for API testing |

### Custom Test Fixtures

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';

// Define fixture types
type MyFixtures = {
  todoPage: TodoPage;
  loggedInPage: Page;
};

export const test = base.extend<MyFixtures>({
  // Simple fixture
  todoPage: async ({ page }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await use(todoPage);
  },

  // Fixture with setup and teardown
  loggedInPage: async ({ page }, use) => {
    // Setup: Login
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('/dashboard');

    // Provide the logged-in page to test
    await use(page);

    // Teardown: Logout
    await page.getByRole('button', { name: 'Logout' }).click();
  },
});
```

### Worker-Scoped Fixtures

```typescript
import { test as base } from '@playwright/test';

type WorkerFixtures = {
  dbConnection: DatabaseConnection;
};

export const test = base.extend<{}, WorkerFixtures>({
  // Worker-scoped fixtures are shared across tests in the same worker
  dbConnection: [async ({}, use) => {
    // Setup once per worker
    const db = await createDatabaseConnection();
    await use(db);
    // Teardown once per worker
    await db.close();
  }, { scope: 'worker' }],
});
```

### Fixture Dependencies

```typescript
export const test = base.extend<MyFixtures>({
  // Base fixture
  storageState: async ({}, use) => {
    const storage = await authenticate();
    await use(storage);
  },

  // Fixture that depends on storageState
  authenticatedPage: async ({ page, storageState }, use) => {
    await page.context().addCookies(storageState.cookies);
    await use(page);
  },
});
```

### Auto Fixtures

```typescript
export const test = base.extend<MyFixtures>({
  // Auto fixture runs for every test automatically
  autoLoginUser: [async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('#email', 'user@example.com');
    await page.click('#login');
    await use();
  }, { auto: true }],
});
```

### Fixture Timeout

```typescript
export const test = base.extend({
  slowFixture: [async ({}, use) => {
    // This fixture gets extra time
    const data = await slowOperation();
    await use(data);
  }, { timeout: 60000 }],  // 60 second timeout
});
```

### Merging Fixtures from Multiple Files

```typescript
import { mergeTests } from '@playwright/test';
import { test as authTest } from './auth-fixtures';
import { test as dataTest } from './data-fixtures';

export const test = mergeTests(authTest, dataTest);
```

---

## 8. Parallel Execution

### Default Parallelization

Playwright runs tests in parallel by default:

- Tests in different files run in parallel
- Tests in the same file run sequentially (in same worker)

### Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  // Fully parallel - all tests run in parallel
  fullyParallel: true,

  // Number of parallel workers
  workers: 4,
  // Or percentage of CPU cores
  workers: '50%',

  // Disable parallelism
  workers: 1,
});
```

### Parallel within Test File

```typescript
test.describe.configure({ mode: 'parallel' });

test.describe('My Suite', () => {
  test('test 1', async ({ page }) => {
    // Runs in parallel with test 2
  });

  test('test 2', async ({ page }) => {
    // Runs in parallel with test 1
  });
});
```

### Serial Execution

```typescript
test.describe.configure({ mode: 'serial' });

test.describe('My Suite', () => {
  test('step 1', async ({ page }) => {
    // Runs first
  });

  test('step 2', async ({ page }) => {
    // Runs after step 1
  });
});
```

### Sharding

Split tests across multiple machines:

```bash
# Run shard 1 of 4
npx playwright test --shard=1/4

# Run shard 2 of 4
npx playwright test --shard=2/4
```

### GitHub Actions Sharding Example

```yaml
# .github/workflows/playwright.yml
jobs:
  playwright-tests:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run tests
        run: npx playwright test --shard=${{ matrix.shard }}/4
```

### Test Isolation

Each test gets:
- Fresh browser context
- Clean cookies, localStorage, sessionStorage
- Independent state

```typescript
// Use worker index for database isolation
test.beforeEach(async ({ page }, testInfo) => {
  const userId = `user_${testInfo.workerIndex}`;
  await setupTestUser(userId);
});
```

---

## 9. Debugging

### UI Mode

The most powerful debugging tool:

```bash
npx playwright test --ui
```

Features:
- Visual trace viewer
- Time-travel debugging
- DOM snapshots
- Network logs
- Console output
- Watch mode

### Headed Mode

```bash
# Run tests with visible browser
npx playwright test --headed

# With slow motion
npx playwright test --headed --slowmo=500
```

### Debug Mode

```bash
# Debug all tests
PWDEBUG=1 npx playwright test

# Debug specific test
PWDEBUG=1 npx playwright test tests/login.spec.ts
```

### page.pause()

```typescript
test('debug this test', async ({ page }) => {
  await page.goto('https://example.com');

  // Pause here - opens inspector
  await page.pause();

  await page.click('#button');
});
```

### Trace Viewer

Configure in `playwright.config.ts`:

```typescript
export default defineConfig({
  use: {
    // Options: 'off' | 'on' | 'on-first-retry' | 'retain-on-failure'
    trace: 'on-first-retry',
  },
});
```

View traces:

```bash
npx playwright show-trace trace.zip
```

### Console Logging

```typescript
test('with logging', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => console.log(msg.text()));

  // Listen to page errors
  page.on('pageerror', error => console.error(error));

  await page.goto('https://example.com');
});
```

### Screenshots

```typescript
// Take screenshot
await page.screenshot({ path: 'screenshot.png' });

// Full page screenshot
await page.screenshot({ path: 'full.png', fullPage: true });

// Element screenshot
await page.locator('.card').screenshot({ path: 'card.png' });
```

### Video Recording

```typescript
// In config
use: {
  video: 'on',  // or 'on-first-retry', 'retain-on-failure'
}

// Access video in test
test.afterEach(async ({}, testInfo) => {
  const video = testInfo.attachments.find(a => a.name === 'video');
  console.log(video?.path);
});
```

---

## 10. CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: lts/*

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### GitHub Actions with Sharding

```yaml
name: Playwright Sharded Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: lts/*

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}

      - name: Upload blob report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: blob-report
          retention-days: 1

  merge-reports:
    if: ${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: lts/*

      - name: Install dependencies
        run: npm ci

      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        with:
          name: html-report
          path: playwright-report
          retention-days: 14
```

### Docker

```dockerfile
# Dockerfile
FROM mcr.microsoft.com/playwright:v1.50.1-noble

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["npx", "playwright", "test"]
```

```bash
# Build and run
docker build -t playwright-tests .
docker run -it playwright-tests
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test

playwright:
  stage: test
  image: mcr.microsoft.com/playwright:v1.50.1-noble
  script:
    - npm ci
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 1 week
```

### Best Practices for CI

1. **Use official Docker image** for consistency
2. **Run headless** (default) for speed
3. **Enable retries** to handle flakiness: `retries: 2`
4. **Cache dependencies** to speed up builds
5. **Upload artifacts** (reports, traces) for debugging
6. **Use sharding** for large test suites
7. **Store secrets** in CI secrets, never in code

---

## 11. API Testing

### Using the request Fixture

```typescript
import { test, expect } from '@playwright/test';

test('GET request', async ({ request }) => {
  const response = await request.get('https://api.example.com/users');

  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);

  const data = await response.json();
  expect(data.users).toHaveLength(10);
});

test('POST request', async ({ request }) => {
  const response = await request.post('https://api.example.com/users', {
    data: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  });

  expect(response.status()).toBe(201);

  const user = await response.json();
  expect(user.name).toBe('John Doe');
});
```

### HTTP Methods

```typescript
// GET
const response = await request.get('/api/users');

// POST with JSON
const response = await request.post('/api/users', {
  data: { name: 'John', email: 'john@example.com' }
});

// POST with form data
const response = await request.post('/api/login', {
  form: { username: 'user', password: 'pass' }
});

// PUT
const response = await request.put('/api/users/1', {
  data: { name: 'Jane' }
});

// PATCH
const response = await request.patch('/api/users/1', {
  data: { email: 'jane@example.com' }
});

// DELETE
const response = await request.delete('/api/users/1');

// HEAD
const response = await request.head('/api/users');
```

### Request Options

```typescript
const response = await request.post('/api/data', {
  // JSON data (auto-sets Content-Type: application/json)
  data: { key: 'value' },

  // Form data (auto-sets Content-Type: application/x-www-form-urlencoded)
  form: { field: 'value' },

  // Multipart form data
  multipart: {
    file: {
      name: 'file.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('content')
    }
  },

  // Custom headers
  headers: {
    'Authorization': 'Bearer token123',
    'Custom-Header': 'value'
  },

  // Query parameters
  params: {
    page: '1',
    limit: '10'
  },

  // Timeout
  timeout: 30000,

  // Ignore HTTPS errors
  ignoreHTTPSErrors: true,
});
```

### Response Handling

```typescript
const response = await request.get('/api/users');

// Status
response.status();        // 200
response.statusText();    // 'OK'
response.ok();           // true if 2xx

// Headers
response.headers();       // all headers
response.headersArray();  // headers as array

// Body
await response.text();    // as string
await response.json();    // as JSON
await response.body();    // as Buffer
```

### API Context with Base URL

```typescript
import { test, expect } from '@playwright/test';

test.describe('API Tests', () => {
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: 'https://api.example.com',
      extraHTTPHeaders: {
        'Authorization': 'Bearer token123',
        'Accept': 'application/json',
      },
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('list users', async () => {
    const response = await apiContext.get('/users');
    expect(response.ok()).toBeTruthy();
  });
});
```

### Combined UI and API Testing

```typescript
test('create via API, verify in UI', async ({ page, request }) => {
  // Create user via API
  const response = await request.post('/api/users', {
    data: { name: 'John Doe', email: 'john@example.com' }
  });
  const user = await response.json();

  // Verify in UI
  await page.goto('/users');
  await expect(page.getByText('John Doe')).toBeVisible();
});

test('login via API, use authenticated browser', async ({ page, request }) => {
  // Login via API
  const response = await request.post('/api/login', {
    data: { email: 'user@example.com', password: 'password' }
  });

  // Cookies are shared with browser context
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

---

## Quick Reference

### Common Commands

```bash
# Run all tests
npx playwright test

# Run specific file
npx playwright test tests/login.spec.ts

# Run specific test by name
npx playwright test -g "should login"

# Run with specific browser
npx playwright test --project=chromium

# Run in headed mode
npx playwright test --headed

# Run in UI mode
npx playwright test --ui

# Run in debug mode
npx playwright test --debug

# Update snapshots
npx playwright test --update-snapshots

# Show report
npx playwright show-report

# Generate code
npx playwright codegen https://example.com
```

### Best Practices Summary

1. **Use `getByRole`** as primary locator strategy
2. **Avoid CSS/XPath** when possible
3. **Use web-first assertions** that auto-wait
4. **Implement Page Object Model** for large test suites
5. **Use fixtures** for setup/teardown logic
6. **Keep tests isolated** - no shared state
7. **Configure retries** for flaky test handling
8. **Use sharding** in CI for faster execution
9. **Upload artifacts** for debugging failed tests
10. **Run tests in parallel** for speed

---

## Resources

- [Playwright Official Documentation](https://playwright.dev/)
- [Playwright GitHub Repository](https://github.com/microsoft/playwright)
- [Playwright Discord Community](https://discord.gg/playwright)
- [BrowserStack Playwright Guides](https://www.browserstack.com/guide/playwright-tutorial)
- [LambdaTest Playwright Resources](https://www.lambdatest.com/learning-hub/playwright)

---

*This documentation reflects Playwright capabilities as of late 2024/early 2025. Always refer to the official documentation for the latest updates.*

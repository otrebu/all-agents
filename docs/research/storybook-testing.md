# Storybook Testing Research

> Comprehensive documentation for Storybook 8.x/9.x testing features, covering play functions, interactions, test runner, portable stories, CI integration, and best practices.

## Table of Contents

1. [Overview](#1-overview)
2. [Play Functions](#2-play-functions)
3. [@storybook/test Utilities](#3-storybooktest-utilities)
4. [Interactions Addon](#4-interactions-addon)
5. [Testing User Events](#5-testing-user-events)
6. [Assertions in Play Functions](#6-assertions-in-play-functions)
7. [Test Runner](#7-test-runner)
8. [Vitest Addon (Storybook 9+)](#8-vitest-addon-storybook-9)
9. [Portable Stories](#9-portable-stories)
10. [CI Integration](#10-ci-integration)
11. [Coverage Integration](#11-coverage-integration)
12. [Accessibility Testing](#12-accessibility-testing)
13. [Best Practices](#13-best-practices)
14. [Migration Guide](#14-migration-guide)

---

## 1. Overview

### What is Storybook Testing?

Storybook provides a comprehensive testing solution that allows you to write interaction tests directly within your stories. This approach combines the benefits of component isolation with real browser testing, making it easier to test complex UI interactions.

### Key Concepts

- **Play Functions**: Async functions that run after a story renders, simulating user interactions
- **Interactions Addon**: Visualizes and debugs play function steps in the browser
- **@storybook/test**: Instrumented testing utilities (Testing Library + Vitest)
- **Test Runner**: CLI tool to execute all story tests (Jest + Playwright based)
- **Vitest Addon**: Modern alternative using Vitest's browser mode (Storybook 9+)
- **Portable Stories**: Reuse stories in external test frameworks (Jest, Vitest, Playwright)

### Testing Pyramid in Storybook

```
                    ┌─────────────────┐
                    │   Visual Tests  │  <- Chromatic/Percy snapshots
                    │   (Snapshot)    │
                    ├─────────────────┤
                    │  Interaction    │  <- Play functions with assertions
                    │     Tests       │
                    ├─────────────────┤
                    │  Accessibility  │  <- a11y addon with axe-core
                    │     Tests       │
                    ├─────────────────┤
                    │  Story Smoke   │  <- Every story = render test
                    │     Tests      │
                    └─────────────────┘
```

---

## 2. Play Functions

### Basic Structure

Play functions are async functions attached to stories that simulate user interactions after the component renders.

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { LoginForm } from './LoginForm';

const meta = {
  component: LoginForm,
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FilledForm: Story = {
  play: async ({ canvasElement }) => {
    // Get the canvas (story root element)
    const canvas = within(canvasElement);

    // Simulate user typing
    await userEvent.type(
      canvas.getByLabelText('Email'),
      'user@example.com'
    );

    await userEvent.type(
      canvas.getByLabelText('Password'),
      'secretpassword'
    );

    // Simulate button click
    await userEvent.click(canvas.getByRole('button', { name: 'Log in' }));
  },
};
```

### Play Function Context

The play function receives a context object with useful properties:

```typescript
export const WithContext: Story = {
  play: async ({
    canvasElement,  // The story's root DOM element
    canvas,         // Pre-wrapped within(canvasElement) - Storybook 8.3+
    userEvent,      // Pre-configured userEvent instance - Storybook 8.3+
    args,           // Story args (props)
    step,           // Function to organize steps
    parameters,     // Story parameters
    globals,        // Global values
  }) => {
    // Use canvas directly (Storybook 8.3+)
    await userEvent.click(canvas.getByRole('button'));

    // Or wrap canvasElement manually (older versions)
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
  },
};
```

### Organizing with Steps

Use the `step` function to group related interactions:

```typescript
export const MultiStepForm: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Fill personal information', async () => {
      await userEvent.type(canvas.getByLabelText('Name'), 'John Doe');
      await userEvent.type(canvas.getByLabelText('Email'), 'john@example.com');
    });

    await step('Fill address', async () => {
      await userEvent.type(canvas.getByLabelText('Street'), '123 Main St');
      await userEvent.type(canvas.getByLabelText('City'), 'New York');
    });

    await step('Submit form', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
    });

    await step('Verify success', async () => {
      await expect(canvas.getByText('Thank you!')).toBeInTheDocument();
    });
  },
};
```

### Composing Play Functions

Reuse play functions from other stories:

```typescript
export const BasicFilled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(canvas.getByLabelText('Password'), 'password123');
  },
};

export const SubmittedForm: Story = {
  play: async (context) => {
    // First run the BasicFilled play function
    await BasicFilled.play?.(context);

    // Then continue with additional interactions
    const canvas = within(context.canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
    await expect(canvas.getByText('Welcome!')).toBeInTheDocument();
  },
};
```

---

## 3. @storybook/test Utilities

### Import Statement

```typescript
// Storybook 8.x
import {
  fn,           // Create mock/spy functions
  expect,       // Vitest + jest-dom assertions
  userEvent,    // User event simulation
  within,       // Scope queries to element
  waitFor,      // Wait for conditions
  screen,       // Query entire document
  fireEvent,    // Low-level event firing
} from '@storybook/test';

// Storybook 9.x (alternative import path)
import { fn, expect } from 'storybook/test';
```

### The `fn()` Mock Function

Create spy functions to track calls and make assertions:

```typescript
import { fn, expect } from '@storybook/test';

const meta = {
  component: Button,
  args: {
    // Create spy functions for callbacks
    onClick: fn(),
    onHover: fn(),
    onFocus: fn(),
  },
} satisfies Meta<typeof Button>;

export const ClickTracking: Story = {
  args: {
    onClick: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button'));

    // Assert the function was called
    await expect(args.onClick).toHaveBeenCalled();
    await expect(args.onClick).toHaveBeenCalledTimes(1);

    // Assert with specific arguments
    await expect(args.onClick).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'click' })
    );
  },
};
```

### Mock Function Matchers

```typescript
// Basic call assertions
await expect(mockFn).toHaveBeenCalled();
await expect(mockFn).toHaveBeenCalledTimes(3);
await expect(mockFn).not.toHaveBeenCalled();

// Argument assertions
await expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
await expect(mockFn).toHaveBeenLastCalledWith('lastArg');
await expect(mockFn).toHaveBeenNthCalledWith(2, 'secondCallArg');

// With matchers
await expect(mockFn).toHaveBeenCalledWith(
  expect.any(String),
  expect.objectContaining({ id: 1 }),
  expect.arrayContaining(['item1'])
);
```

### The `within()` Function

Scopes queries to a specific element:

```typescript
export const ScopedQueries: Story = {
  play: async ({ canvasElement }) => {
    // Scope all queries to the story canvas
    const canvas = within(canvasElement);

    // These queries only search within canvasElement
    const button = canvas.getByRole('button');
    const input = canvas.getByLabelText('Email');

    // For nested elements
    const form = canvas.getByRole('form');
    const formScope = within(form);
    const submitBtn = formScope.getByRole('button', { name: 'Submit' });
  },
};
```

### The `screen` Object

Query outside the canvas (for portals, modals, dialogs):

```typescript
import { screen } from '@storybook/test';

export const ModalDialog: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open the modal (renders outside canvas)
    await userEvent.click(canvas.getByRole('button', { name: 'Open' }));

    // Query the entire document for the modal
    const dialog = screen.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Interact with modal content
    const modalScope = within(dialog);
    await userEvent.click(modalScope.getByRole('button', { name: 'Confirm' }));
  },
};
```

### The `waitFor()` Function

Wait for async conditions:

```typescript
import { waitFor } from '@storybook/test';

export const AsyncContent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Load Data' }));

    // Wait for async content to appear
    await waitFor(() => {
      expect(canvas.getByText('Data loaded!')).toBeInTheDocument();
    });

    // With timeout options
    await waitFor(
      () => expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument(),
      { timeout: 5000 }
    );
  },
};
```

---

## 4. Interactions Addon

### Installation

```bash
npm install @storybook/addon-interactions --save-dev
```

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions', // Add after essentials
  ],
};
```

### Features

The Interactions addon provides:

1. **Interactions Panel**: View step-by-step execution of play functions
2. **Playback Controls**: Pause, resume, rewind, and step through interactions
3. **Step Visualization**: See each `userEvent`, `expect`, and `step` call
4. **Debugging**: Inspect the UI state at any step
5. **Error Highlighting**: Clear indication of failed assertions

### Debugging with Step-Through

The addon enables step-by-step debugging:

```typescript
export const DebuggableInteraction: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Each await creates a debuggable step
    await step('Open dropdown', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Options' }));
    });

    await step('Select option', async () => {
      await userEvent.click(canvas.getByText('Option 1'));
    });

    await step('Verify selection', async () => {
      await expect(canvas.getByRole('button')).toHaveTextContent('Option 1');
    });
  },
};
```

### Requirements for Step-Through Debugging

To enable step-through debugging:

1. Always `await` userEvent methods
2. Always `await` expect assertions
3. Always `await` findBy and waitFor calls

```typescript
// CORRECT - All awaited
play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByLabelText('Email'), 'test@test.com');
  await expect(canvas.getByLabelText('Email')).toHaveValue('test@test.com');
};

// INCORRECT - Missing awaits (won't debug properly)
play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  userEvent.type(canvas.getByLabelText('Email'), 'test@test.com'); // Missing await
  expect(canvas.getByLabelText('Email')).toHaveValue('test@test.com'); // Missing await
};
```

---

## 5. Testing User Events

### userEvent Methods

```typescript
import { userEvent } from '@storybook/test';

export const AllUserEvents: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click events
    await userEvent.click(canvas.getByRole('button'));
    await userEvent.dblClick(canvas.getByRole('button'));
    await userEvent.tripleClick(canvas.getByText('Select all'));

    // Typing
    await userEvent.type(canvas.getByRole('textbox'), 'Hello World');
    await userEvent.clear(canvas.getByRole('textbox'));

    // Keyboard
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Shift>}A{/Shift}'); // Shift+A
    await userEvent.keyboard('[ControlLeft>][KeyA][/ControlLeft]'); // Ctrl+A

    // Tab navigation
    await userEvent.tab();
    await userEvent.tab({ shift: true }); // Shift+Tab

    // Hover
    await userEvent.hover(canvas.getByRole('button'));
    await userEvent.unhover(canvas.getByRole('button'));

    // Select
    await userEvent.selectOptions(
      canvas.getByRole('combobox'),
      ['option1', 'option2']
    );
    await userEvent.deselectOptions(
      canvas.getByRole('listbox'),
      'option1'
    );

    // File upload
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    await userEvent.upload(canvas.getByLabelText('Upload'), file);

    // Clipboard
    await userEvent.copy();
    await userEvent.cut();
    await userEvent.paste('pasted text');

    // Pointer events
    await userEvent.pointer([
      { keys: '[MouseLeft>]', target: element },
      { coords: { x: 100, y: 100 } },
      { keys: '[/MouseLeft]' },
    ]);
  },
};
```

### Keyboard Modifiers

```typescript
export const KeyboardShortcuts: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');

    await userEvent.click(input);

    // Type with modifiers
    await userEvent.keyboard('{Control>}a{/Control}'); // Select all
    await userEvent.keyboard('{Control>}c{/Control}'); // Copy
    await userEvent.keyboard('{Control>}v{/Control}'); // Paste

    // Arrow keys
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowUp}');

    // Special keys
    await userEvent.keyboard('{Escape}');
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Backspace}');
    await userEvent.keyboard('{Delete}');
  },
};
```

### Handling Focus

```typescript
export const FocusManagement: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Tab through elements
    await userEvent.tab();
    await expect(canvas.getByLabelText('Email')).toHaveFocus();

    await userEvent.tab();
    await expect(canvas.getByLabelText('Password')).toHaveFocus();

    // Shift+Tab to go backwards
    await userEvent.tab({ shift: true });
    await expect(canvas.getByLabelText('Email')).toHaveFocus();
  },
};
```

---

## 6. Assertions in Play Functions

### DOM Assertions (jest-dom)

```typescript
export const DOMAssertions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Visibility
    await expect(canvas.getByRole('button')).toBeVisible();
    await expect(canvas.getByRole('button')).toBeInTheDocument();
    await expect(canvas.queryByText('Hidden')).not.toBeVisible();

    // Content
    await expect(canvas.getByRole('heading')).toHaveTextContent('Welcome');
    await expect(canvas.getByRole('textbox')).toHaveValue('default');
    await expect(canvas.getByRole('textbox')).toBeEmpty();

    // Attributes
    await expect(canvas.getByRole('button')).toBeEnabled();
    await expect(canvas.getByRole('button')).toBeDisabled();
    await expect(canvas.getByRole('button')).toHaveAttribute('type', 'submit');
    await expect(canvas.getByRole('link')).toHaveAttribute('href', '/home');

    // Classes and styles
    await expect(canvas.getByRole('button')).toHaveClass('primary');
    await expect(canvas.getByRole('button')).toHaveStyle({ color: 'red' });

    // Form state
    await expect(canvas.getByRole('checkbox')).toBeChecked();
    await expect(canvas.getByRole('textbox')).toBeRequired();
    await expect(canvas.getByRole('textbox')).toBeInvalid();
    await expect(canvas.getByRole('textbox')).toHaveFocus();

    // Accessibility
    await expect(canvas.getByRole('button')).toHaveAccessibleName('Submit form');
    await expect(canvas.getByRole('button')).toHaveAccessibleDescription('Click to submit');
  },
};
```

### Using findBy for Async Elements

```typescript
export const AsyncAssertions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click to trigger async action
    await userEvent.click(canvas.getByRole('button', { name: 'Load' }));

    // findBy waits for element to appear (default 1s timeout)
    const result = await canvas.findByText('Data loaded!');
    await expect(result).toBeInTheDocument();

    // With custom timeout
    const slowElement = await canvas.findByText('Slow content', {}, { timeout: 5000 });
    await expect(slowElement).toBeVisible();

    // findAllBy for multiple elements
    const items = await canvas.findAllByRole('listitem');
    await expect(items).toHaveLength(5);
  },
};
```

### Negative Assertions with waitFor

```typescript
export const WaitForDisappear: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Trigger action that removes element
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));

    // Wait for element to disappear
    await waitFor(() => {
      expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Alternative: waitForElementToBeRemoved
    await waitFor(() => {
      expect(canvas.queryByText('Loading...')).toBeNull();
    });
  },
};
```

---

## 7. Test Runner

### Installation

```bash
npm install @storybook/test-runner --save-dev
```

### Configuration

```json
// package.json
{
  "scripts": {
    "test-storybook": "test-storybook"
  }
}
```

### CLI Options

```bash
# Basic usage
npx test-storybook

# Against running Storybook
npx test-storybook --url http://localhost:6006

# With coverage
npx test-storybook --coverage

# Watch mode
npx test-storybook --watch

# Run specific stories
npx test-storybook --stories="**/Button.stories.tsx"

# Parallel execution with sharding
npx test-storybook --shard=1/4

# Max workers
npx test-storybook --maxWorkers=4

# Fail fast
npx test-storybook --bail

# Verbose output
npx test-storybook --verbose

# JSON output
npx test-storybook --json --outputFile=results.json
```

### Test Runner Configuration

```javascript
// test-runner-jest.config.js
module.exports = {
  // Extend Jest configuration
  testTimeout: 15000,

  // Setup before tests
  async setup() {
    // Global setup
  },

  // Before each story
  async preVisit(page, context) {
    // Run before visiting the story
    await page.setViewportSize({ width: 1280, height: 720 });
  },

  // After each story
  async postVisit(page, context) {
    // Run after story renders and play function completes
    // Useful for additional assertions or screenshots
    const elementHandler = await page.$('#storybook-root');
    const innerHTML = await elementHandler.innerHTML();
    expect(innerHTML).not.toBe('');
  },

  // Transform story tags/parameters
  tags: {
    include: ['test'],
    exclude: ['no-tests', 'docs-only'],
    skip: ['skip-test'],
  },

  // Browser configuration
  launchOptions: {
    headless: true,
  },
};
```

### Hooks for Custom Testing

```javascript
// test-runner-jest.config.js
const { getStoryContext } = require('@storybook/test-runner');

module.exports = {
  async postVisit(page, context) {
    // Get story context for conditional testing
    const storyContext = await getStoryContext(page, context);

    // Skip certain stories
    if (storyContext.parameters?.testRunner?.disable) {
      return;
    }

    // Custom viewport testing
    if (storyContext.parameters?.viewport?.defaultViewport === 'mobile1') {
      await page.setViewportSize({ width: 375, height: 667 });
    }

    // Screenshot testing
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot({
      customSnapshotIdentifier: context.id,
    });
  },
};
```

---

## 8. Vitest Addon (Storybook 9+)

### Overview

Storybook 9 introduces the Vitest addon as the recommended testing solution. It offers:

- Faster execution than test-runner
- Real browser testing with Playwright
- Native Vitest integration
- Built-in coverage support
- Better developer experience

### Installation

```bash
# Storybook 9+
npx storybook add @storybook/addon-vitest

# Or manually
npm install @storybook/addon-vitest --save-dev
```

### Configuration

```typescript
// .storybook/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import viteConfig from '../vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    plugins: [
      storybookTest({
        renderer: 'react', // or 'vue', 'svelte'
        storybookScript: 'npm run storybook -- --ci', // For watch mode linking
      }),
    ],
    test: {
      name: 'storybook',
      include: ['../src/**/*.stories.?(c|m)[jt]s?(x)'],
      browser: {
        enabled: true,
        name: 'chromium',
        provider: 'playwright',
        headless: true,
      },
      setupFiles: ['./vitest.setup.ts'],
    },
  })
);
```

### Setup File

```typescript
// .storybook/vitest.setup.ts
import { beforeAll, afterAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/react';
import * as previewAnnotations from './preview';

const annotations = setProjectAnnotations([previewAnnotations]);

// Run Storybook's beforeAll hook
beforeAll(annotations.beforeAll);
```

### Running Tests

```bash
# Run all story tests
npx vitest --project=storybook

# Watch mode
npx vitest --project=storybook --watch

# With coverage
npx vitest --project=storybook --coverage

# Run alongside other Vitest tests
npx vitest
```

### Vitest Workspace Setup

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Regular unit tests
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['src/**/*.test.ts'],
    },
  },
  // Storybook component tests
  {
    extends: './.storybook/vitest.config.ts',
  },
]);
```

---

## 9. Portable Stories

### Overview

Portable stories allow you to reuse your stories in external test frameworks like Jest, Vitest, or Playwright CT, ensuring your tests stay in sync with your stories.

### composeStories API

```typescript
// Button.test.tsx
import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import * as stories from './Button.stories';

// Compose all stories into renderable components
const { Primary, Secondary, Disabled } = composeStories(stories);

describe('Button', () => {
  it('renders primary button', async () => {
    await Primary.run();
    expect(screen.getByRole('button')).toHaveClass('primary');
  });

  it('renders secondary button', async () => {
    await Secondary.run();
    expect(screen.getByRole('button')).toHaveClass('secondary');
  });

  it('respects disabled state', async () => {
    await Disabled.run();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### composeStory for Single Stories

```typescript
import { composeStory } from '@storybook/react';
import Meta, { Primary as PrimaryStory } from './Button.stories';

const Primary = composeStory(PrimaryStory, Meta);

test('Primary button', async () => {
  await Primary.run();
  // Assertions...
});
```

### Running Play Functions

```typescript
import { composeStories } from '@storybook/react';
import * as stories from './LoginForm.stories';

const { FilledForm } = composeStories(stories);

describe('LoginForm', () => {
  it('fills and submits form', async () => {
    // render() is called internally and play function executes
    await FilledForm.run();

    // After play function completes, make assertions
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
  });

  it('can override args', async () => {
    await FilledForm.run({
      args: {
        onSubmit: vi.fn(),
      },
    });
  });
});
```

### Setup with setProjectAnnotations

```typescript
// setupTests.ts
import { beforeAll } from 'vitest'; // or jest
import { setProjectAnnotations } from '@storybook/react';
import * as previewAnnotations from './.storybook/preview';
import * as addonAnnotations from '@storybook/addon-interactions/preview';

const annotations = setProjectAnnotations([
  previewAnnotations,
  addonAnnotations,
]);

// Run beforeAll hook
beforeAll(annotations.beforeAll);
```

### Portable Stories in Jest

```typescript
// Button.test.tsx (Jest)
import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import * as stories from './Button.stories';

const { Primary } = composeStories(stories);

describe('Button', () => {
  it('renders correctly', async () => {
    const { container } = render(<Primary />);
    await Primary.play?.({ canvasElement: container });
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

### Portable Stories in Playwright CT

```typescript
// Button.spec.tsx (Playwright Component Testing)
import { test, expect } from '@playwright/experimental-ct-react';
import { createTest } from '@storybook/react/experimental-playwright';
import * as stories from './Button.stories';

const test = createTest(stories);

test('Primary button', async ({ mount, page }) => {
  await mount(<stories.Primary />);
  await expect(page.getByRole('button')).toBeVisible();
});
```

---

## 10. CI Integration

### GitHub Actions with Test Runner

```yaml
# .github/workflows/storybook-tests.yml
name: Storybook Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Build Storybook
        run: npm run build-storybook

      - name: Run Storybook tests
        run: |
          npx concurrently -k -s first -n "SB,TEST" -c "magenta,blue" \
            "npx http-server ./storybook-static --port 6006 --silent" \
            "npx wait-on tcp:127.0.0.1:6006 && npm run test-storybook"
```

### GitHub Actions with Vitest Addon

```yaml
# .github/workflows/storybook-vitest.yml
name: Storybook Vitest Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.52.0-noble

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Run Storybook tests
        run: npx vitest --project=storybook --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Parallel Testing with Sharding

```yaml
# .github/workflows/storybook-sharded.yml
name: Storybook Tests (Sharded)

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build Storybook
        run: npm run build-storybook

      - name: Run tests (shard ${{ matrix.shard }}/4)
        run: |
          npx concurrently -k -s first \
            "npx http-server ./storybook-static --port 6006 --silent" \
            "npx wait-on tcp:127.0.0.1:6006 && npx test-storybook --shard=${{ matrix.shard }}/4"
```

### Testing Against Deployed Storybook

```yaml
# .github/workflows/test-deployed.yml
name: Test Deployed Storybook

on:
  deployment_status:

jobs:
  test:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run Storybook tests
        run: npx test-storybook
        env:
          TARGET_URL: ${{ github.event.deployment_status.target_url }}
```

### NPM Scripts for CI

```json
{
  "scripts": {
    "build-storybook": "storybook build",
    "test-storybook": "test-storybook",
    "test-storybook:ci": "concurrently -k -s first -n \"SB,TEST\" \"http-server storybook-static --port 6006 --silent\" \"wait-on tcp:6006 && test-storybook\"",
    "test-storybook:coverage": "test-storybook --coverage",
    "test:vitest-storybook": "vitest --project=storybook"
  }
}
```

---

## 11. Coverage Integration

### Test Runner Coverage

```bash
# Install coverage addon
npm install @storybook/addon-coverage --save-dev
```

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-coverage',
  ],
};
```

```bash
# Run with coverage
npx test-storybook --coverage
```

### Coverage Configuration

```javascript
// .nycrc.json
{
  "all": true,
  "include": ["src/**/*.{ts,tsx}"],
  "exclude": [
    "**/*.stories.{ts,tsx}",
    "**/*.test.{ts,tsx}",
    "**/test/**"
  ],
  "extension": [".ts", ".tsx"],
  "reporter": ["text", "lcov", "html"]
}
```

### Merging Coverage Reports

```json
{
  "scripts": {
    "test:unit": "vitest run --coverage",
    "test:storybook": "test-storybook --coverage",
    "coverage:merge": "cp coverage/storybook/coverage-storybook.json coverage/ && nyc report --reporter=html -t coverage",
    "coverage:report": "npm run test:unit && npm run test:storybook && npm run coverage:merge"
  }
}
```

### Vitest Coverage

```typescript
// .storybook/vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.stories.{ts,tsx}',
        '**/*.test.{ts,tsx}',
      ],
    },
  },
});
```

---

## 12. Accessibility Testing

### a11y Addon Setup

```bash
npm install @storybook/addon-a11y --save-dev
```

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
  ],
};
```

### Story-Level a11y Configuration

```typescript
const meta = {
  component: Button,
  parameters: {
    a11y: {
      // axe-core configuration
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'label', enabled: true },
        ],
      },
      // Disable specific rules
      options: {
        rules: {
          'color-contrast': { enabled: false },
        },
      },
    },
  },
} satisfies Meta<typeof Button>;

// Disable a11y for specific story
export const SkipA11y: Story = {
  parameters: {
    a11y: { disable: true },
  },
};
```

### a11y in Test Runner

```javascript
// test-runner-jest.config.js
const { getStoryContext } = require('@storybook/test-runner');
const { injectAxe, checkA11y, configureAxe } = require('axe-playwright');

module.exports = {
  async preVisit(page) {
    await injectAxe(page);
  },

  async postVisit(page, context) {
    const storyContext = await getStoryContext(page, context);

    // Skip if a11y is disabled for this story
    if (storyContext.parameters?.a11y?.disable) {
      return;
    }

    // Configure axe with story-specific rules
    await configureAxe(page, {
      rules: storyContext.parameters?.a11y?.config?.rules,
    });

    // Run a11y checks
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  },
};
```

### a11y in Play Functions

```typescript
import { expect } from '@storybook/test';

export const AccessibleForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify accessible names
    await expect(canvas.getByRole('button')).toHaveAccessibleName('Submit form');
    await expect(canvas.getByRole('textbox')).toHaveAccessibleName('Email address');

    // Verify focus management
    await userEvent.tab();
    await expect(canvas.getByRole('textbox')).toHaveFocus();
  },
};
```

---

## 13. Best Practices

### Story Organization for Testing

```typescript
// Group related test scenarios
const meta = {
  component: Form,
  title: 'Forms/LoginForm',
  // Default args for all stories
  args: {
    onSubmit: fn(),
  },
} satisfies Meta<typeof Form>;

// Base story - no interactions
export const Default: Story = {};

// Filled state
export const Filled: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(canvas.getByLabelText('Password'), 'password123');
  },
};

// Validation error state
export const WithValidationErrors: Story = {
  play: async (context) => {
    const { canvas, userEvent } = context;
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
    await expect(canvas.getByText('Email is required')).toBeInTheDocument();
  },
};

// Success state (builds on Filled)
export const Submitted: Story = {
  play: async (context) => {
    await Filled.play?.(context);
    const { canvas, userEvent, args } = context;
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
    await expect(args.onSubmit).toHaveBeenCalled();
  },
};
```

### Resetting State Between Stories

```typescript
// .storybook/preview.ts
import { fn, clearAllMocks } from '@storybook/test';

const preview: Preview = {
  beforeEach: () => {
    // Reset all mocks before each story
    clearAllMocks();

    // Reset any global state
    localStorage.clear();
    sessionStorage.clear();
  },
};
```

### Handling Async Operations

```typescript
export const AsyncDataLoading: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for loading to complete
    await waitFor(() => {
      expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Now interact with loaded content
    const items = await canvas.findAllByRole('listitem');
    await expect(items).toHaveLength(5);

    await userEvent.click(items[0]);
  },
};
```

### Mocking Context and Providers

```typescript
// .storybook/preview.tsx
import { ThemeProvider } from './theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

const preview: Preview = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Story />
        </ThemeProvider>
      </QueryClientProvider>
    ),
  ],
};
```

### Using Loaders for Data

```typescript
export const WithUserData: Story = {
  loaders: [
    async () => ({
      user: await fetch('/api/user').then(r => r.json()),
    }),
  ],
  render: (args, { loaded: { user } }) => (
    <UserProfile user={user} {...args} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/John Doe/)).toBeInTheDocument();
  },
};
```

### Testing Edge Cases

```typescript
// Empty states
export const EmptyList: Story = {
  args: {
    items: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No items found')).toBeInTheDocument();
  },
};

// Error states
export const WithError: Story = {
  args: {
    error: new Error('Failed to load'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('Failed to load');
  },
};

// Loading states
export const Loading: Story = {
  args: {
    isLoading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('progressbar')).toBeInTheDocument();
  },
};
```

### Using beforeEach for Cleanup

```typescript
const meta = {
  component: Form,
  beforeEach: async () => {
    // Reset mocks before each story
    mockApi.resetHandlers();

    // Return cleanup function
    return () => {
      mockApi.close();
    };
  },
} satisfies Meta<typeof Form>;
```

---

## 14. Migration Guide

### From Storybook 8 to 9

```bash
# Upgrade command
npx storybook@9 upgrade
```

Key changes:

1. **Test Addon Rename**: `@storybook/experimental-addon-test` -> `@storybook/addon-vitest`
2. **Package Consolidation**: Many packages moved into `storybook` core
3. **Import Paths**: Some imports changed (e.g., `storybook/test` instead of `@storybook/test`)

### From Test Runner to Vitest Addon

```typescript
// Before (test-runner-jest.config.js)
module.exports = {
  async postVisit(page, context) {
    // Custom assertions
  },
};

// After (.storybook/vitest.config.ts)
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

export default defineConfig({
  plugins: [storybookTest()],
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
    },
  },
});
```

### Import Changes

```typescript
// Storybook 8.x
import { fn, expect, userEvent } from '@storybook/test';

// Storybook 9.x (both work)
import { fn, expect } from 'storybook/test';
import { userEvent, within } from '@storybook/test';
```

---

## Quick Reference

### Package Dependencies

```json
{
  "devDependencies": {
    "storybook": "^9.0.0",
    "@storybook/react": "^9.0.0",
    "@storybook/react-vite": "^9.0.0",
    "@storybook/addon-essentials": "^9.0.0",
    "@storybook/addon-interactions": "^9.0.0",
    "@storybook/addon-vitest": "^9.0.0",
    "@storybook/addon-a11y": "^9.0.0",
    "@storybook/addon-coverage": "^9.0.0",
    "@storybook/test": "^9.0.0"
  }
}
```

### CLI Commands

```bash
# Start Storybook
npm run storybook

# Build static Storybook
npm run build-storybook

# Run tests (test-runner)
npx test-storybook

# Run tests (Vitest addon)
npx vitest --project=storybook

# Run with coverage
npx test-storybook --coverage
npx vitest --project=storybook --coverage
```

---

## Sources

- [Interaction Testing Documentation](https://storybook.js.org/docs/writing-tests/interaction-testing)
- [Play Function Documentation](https://storybook.js.org/docs/writing-stories/play-function)
- [Test Runner Documentation](https://storybook.js.org/docs/writing-tests/integrations/test-runner)
- [Vitest Addon Documentation](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon)
- [Stories in Unit Tests](https://storybook.js.org/docs/writing-tests/integrations/stories-in-unit-tests)
- [Portable Stories in Vitest](https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest)
- [Portable Stories in Jest](https://storybook.js.org/docs/api/portable-stories/portable-stories-jest)
- [Testing in CI](https://storybook.js.org/docs/writing-tests/in-ci)
- [Test Coverage](https://storybook.js.org/docs/writing-tests/test-coverage)
- [Accessibility Testing](https://storybook.js.org/docs/writing-tests/accessibility-testing)
- [Component Testing Blog Post](https://storybook.js.org/blog/component-testing/)
- [Component Test with Storybook and Vitest](https://storybook.js.org/blog/component-test-with-storybook-and-vitest/)
- [Storybook 9 Announcement](https://storybook.js.org/blog/storybook-9/)
- [Migration Guide from 8.x to 9.1](https://storybook.js.org/docs/releases/migration-guide-from-older-version)
- [Decorators Documentation](https://storybook.js.org/docs/writing-stories/decorators)
- [Mocking Providers](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-providers)
- [Loaders Documentation](https://storybook.js.org/docs/writing-stories/loaders)
- [Storybook Test Runner GitHub](https://github.com/storybookjs/test-runner)
- [UI Testing Handbook](https://storybook.js.org/tutorials/ui-testing-handbook/react/en/interaction-testing/)

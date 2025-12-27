# axe-core: Automated Accessibility Testing

Comprehensive reference for axe-core, the leading open-source accessibility testing engine by Deque Systems.

## Overview

axe-core is an accessibility engine for automated Web UI testing. It is designed to integrate seamlessly with existing test environments, enabling accessibility testing as part of unit, integration, and end-to-end testing workflows.

### Key Features

- **Zero False Positives**: Reports only definite violations (bugs notwithstanding)
- **WCAG Coverage**: Detects approximately 57% of WCAG issues automatically
- **Standards Support**: WCAG 2.0, 2.1, and 2.2 at levels A, AA, and AAA
- **Browser Support**: Chrome 42+, Firefox 38+, Safari 7+, Edge 40+
- **Shadow DOM**: Full support for web components
- **Localization**: 15+ language locales supported
- **License**: Mozilla Public License 2.0 (open source)

### Package Ecosystem

| Package | Purpose |
|---------|---------|
| `axe-core` | Core accessibility engine |
| `@axe-core/react` | React development-time integration |
| `@axe-core/playwright` | Playwright test integration |
| `@axe-core/puppeteer` | Puppeteer test integration |
| `@axe-core/webdriverjs` | WebDriverJS integration |
| `@axe-core/webdriverio` | WebDriverIO integration |
| `@axe-core/cli` | Command-line interface |
| `jest-axe` | Jest matcher for accessibility |
| `vitest-axe` | Vitest matcher for accessibility |

---

## Installation and Basic Setup

### Installing axe-core

```bash
npm install axe-core --save-dev
```

### Browser Usage

Include the script in HTML:

```html
<script src="node_modules/axe-core/axe.min.js"></script>
```

### Basic API Usage

```javascript
// Basic scan of entire page
axe.run()
  .then(results => {
    if (results.violations.length) {
      console.error('Accessibility violations:', results.violations);
      throw new Error('Accessibility issues found');
    }
  })
  .catch(err => {
    console.error('Error running accessibility scan:', err.message);
  });

// Async/await pattern
async function checkAccessibility() {
  const results = await axe.run();
  return results.violations;
}
```

---

## Core API Reference

### axe.run(context, options, callback)

The primary analysis function that examines rendered page content for accessibility issues.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `context` | Element/String/Object | Optional. DOM scope for analysis |
| `options` | Object | Optional. Configuration for rule execution |
| `callback` | Function | Optional. Receives (error, results) |

Returns a Promise if no callback is provided.

#### Context Parameter

```javascript
// Analyze entire document (default)
await axe.run();

// Analyze specific element by selector
await axe.run('#main-content');

// Analyze element reference
await axe.run(document.getElementById('main-content'));

// Include/exclude specific areas
await axe.run({
  include: [['#main-content'], ['.sidebar']],
  exclude: [['.third-party-widget'], ['#advertisement']]
});

// Target iframes
await axe.run({
  include: [{
    fromFrames: ['#my-iframe', '#content']
  }]
});

// Target Shadow DOM
await axe.run({
  include: [{
    fromShadowDom: ['my-custom-element', 'button']
  }]
});
```

#### Options Parameter

```javascript
await axe.run(document, {
  // Run only specific rules by tag
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa']
  },

  // Or shorthand array syntax
  runOnly: ['wcag2a', 'wcag2aa'],

  // Run specific rules by ID
  runOnly: {
    type: 'rule',
    values: ['color-contrast', 'image-alt']
  },

  // Enable/disable specific rules
  rules: {
    'color-contrast': { enabled: false },
    'valid-lang': { enabled: true }
  },

  // Filter result types for performance
  resultTypes: ['violations', 'incomplete'],

  // Reporter format: 'v1' | 'v2' | 'raw' | 'no-passes'
  reporter: 'v2',

  // Include CSS selectors (default: true)
  selectors: true,

  // Test within iframes (default: true)
  iframes: true
});
```

### axe.configure(options)

Permanently customize rule behavior and metadata.

```javascript
axe.configure({
  // Branding for reports
  branding: {
    brand: 'MyCompany',
    application: 'MyApp'
  },

  // Custom rule configuration
  rules: [
    {
      id: 'skip-link',
      enabled: true
    },
    {
      id: 'region',
      enabled: false
    }
  ],

  // Change impact/severity of existing rules
  checks: [
    {
      id: 'valid-lang',
      options: ['en', 'es', 'fr', 'de']
    }
  ],

  // Custom locale
  locale: {
    lang: 'de',
    rules: { /* ... */ },
    checks: { /* ... */ }
  },

  // Disable result deduplication
  disableDeduplicate: true
});
```

### axe.reset()

Restore default configuration:

```javascript
axe.reset();
```

### axe.getRules(tags)

Retrieve rule metadata:

```javascript
// Get all rules
const allRules = axe.getRules();

// Get rules by tags
const wcag2aRules = axe.getRules(['wcag2a']);
```

---

## Results Object Structure

```javascript
const results = await axe.run();

// Results structure
{
  // Definite accessibility failures
  violations: [
    {
      id: 'image-alt',
      impact: 'critical',
      tags: ['cat.text-alternatives', 'wcag2a', 'wcag111'],
      description: 'Ensures <img> elements have alternate text',
      help: 'Images must have alternate text',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.x/image-alt',
      nodes: [
        {
          target: ['img.hero-image'],
          html: '<img src="hero.jpg" class="hero-image">',
          impact: 'critical',
          any: [],
          all: [],
          none: [],
          failureSummary: 'Fix any of the following: ...'
        }
      ]
    }
  ],

  // Tests that passed
  passes: [ /* same structure */ ],

  // Inconclusive results requiring manual review
  incomplete: [ /* same structure */ ],

  // Rules that found no matching elements
  inapplicable: [ /* same structure */ ],

  // Metadata
  testEngine: { name: 'axe-core', version: '4.11.0' },
  testRunner: { name: 'axe' },
  testEnvironment: { /* browser info */ },
  timestamp: '2025-01-15T10:30:00.000Z',
  url: 'https://example.com'
}
```

---

## Impact/Severity Levels

axe-core uses four impact levels to indicate violation severity:

| Impact | Description | Examples |
|--------|-------------|----------|
| **critical** | Blocks content for users with disabilities | Missing image alt, no button name |
| **serious** | Creates significant barriers | Insufficient color contrast |
| **moderate** | Causes notable difficulties | Improper heading order |
| **minor** | Minor accessibility issues | Skip link not first focusable |

### Configuring Impact

```javascript
// Change impact of a rule via configure
axe.configure({
  rules: [
    {
      id: 'valid-lang',
      impact: 'minor'  // Changed from 'serious'
    }
  ]
});

// Filter by impact in jest-axe
const axe = configureAxe({
  impactLevels: ['critical', 'serious']
});
```

---

## Rule Categories and Tags

### WCAG Tags

| Tag | Description |
|-----|-------------|
| `wcag2a` | WCAG 2.0 Level A |
| `wcag2aa` | WCAG 2.0 Level AA |
| `wcag2aaa` | WCAG 2.0 Level AAA |
| `wcag21a` | WCAG 2.1 Level A |
| `wcag21aa` | WCAG 2.1 Level AA |
| `wcag22aa` | WCAG 2.2 Level AA |
| `best-practice` | Industry best practices |
| `experimental` | In-development rules |

### Common Rule Examples

| Rule ID | Impact | Description |
|---------|--------|-------------|
| `image-alt` | Critical | Images must have alternate text |
| `button-name` | Critical | Buttons must have discernible text |
| `link-name` | Serious | Links must have discernible text |
| `color-contrast` | Serious | Text must meet contrast ratio |
| `label` | Critical | Form elements must have labels |
| `heading-order` | Moderate | Headings must be in logical order |
| `bypass` | Serious | Page must have skip navigation |
| `landmark-one-main` | Moderate | Page must have one main landmark |
| `region` | Moderate | Content must be in landmark regions |
| `valid-lang` | Serious | lang attribute must be valid |
| `aria-*` | Various | ARIA attribute validation rules |

---

## Jest Integration (jest-axe)

### Installation

```bash
npm install --save-dev jest jest-axe jest-environment-jsdom
# TypeScript types
npm install --save-dev @types/jest-axe
```

### Setup

```javascript
// jest.setup.js
const { toHaveNoViolations } = require('jest-axe');
expect.extend(toHaveNoViolations);

// Or in each test file
/**
 * @jest-environment jsdom
 */
const { axe, toHaveNoViolations } = require('jest-axe');
expect.extend(toHaveNoViolations);
```

Alternatively, extend automatically:

```javascript
// jest.setup.js
require('jest-axe/extend-expect');
```

### Basic Usage

```javascript
const { axe, toHaveNoViolations } = require('jest-axe');
expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('should have no accessibility violations', async () => {
    document.body.innerHTML = `
      <button>Click me</button>
      <img src="photo.jpg" alt="A scenic mountain view">
    `;

    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });
});
```

### React Testing Library Integration

```javascript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Button component', () => {
  it('should be accessible', async () => {
    const { container } = render(<Button>Submit</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Vue Test Utils Integration

```javascript
import { mount } from '@vue/test-utils';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Button component', () => {
  it('should be accessible', async () => {
    const wrapper = mount(Button);
    const results = await axe(wrapper.element);
    expect(results).toHaveNoViolations();
  });
});
```

### Configuration with configureAxe

```javascript
import { configureAxe } from 'jest-axe';

// Create configured axe instance
const axe = configureAxe({
  // Only check critical/serious issues
  impactLevels: ['critical', 'serious'],

  // axe-core rules configuration
  rules: {
    'region': { enabled: false },  // Disable for isolated components
    'bypass': { enabled: false }   // Disable skip-link check
  },

  // Global axe configuration
  globalOptions: {
    checks: [/* custom checks */]
  }
});

describe('Component', () => {
  it('passes accessibility checks', async () => {
    const results = await axe(element);
    expect(results).toHaveNoViolations();
  });
});
```

### Known Limitations

- **Color contrast**: Does not work in JSDOM
- **Fake timers**: axe-core times out when using `jest.useFakeTimers()`

```javascript
// Workaround for fake timers
it('works with fake timers', async () => {
  jest.useFakeTimers();

  // Use real timers for axe
  jest.useRealTimers();
  const results = await axe(container);
  expect(results).toHaveNoViolations();

  // Restore fake timers
  jest.useFakeTimers();
});
```

---

## Vitest Integration (vitest-axe)

### Installation

```bash
npm install --save-dev vitest-axe
```

### Setup

```typescript
// vitest-setup.ts
import * as matchers from 'vitest-axe/matchers';
import { expect } from 'vitest';

expect.extend(matchers);
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest-setup.ts'],
    environment: 'jsdom',  // Required - NOT happy-dom
  },
});
```

### TypeScript Configuration

```typescript
// vitest-setup.ts or global.d.ts
import 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';

declare module 'vitest' {
  export interface Assertion extends AxeMatchers {}
  export interface AsymmetricMatchersContaining extends AxeMatchers {}
}
```

### Usage

```typescript
import { describe, it, expect } from 'vitest';
import { axe } from 'vitest-axe';
import { render } from '@testing-library/react';

describe('Component accessibility', () => {
  it('should have no violations', async () => {
    const { container } = render(<MyComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Important Limitation

vitest-axe does **not** work with Happy DOM due to a bug in `Node.prototype.isConnected`. Use JSDOM instead:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',  // NOT 'happy-dom'
  },
});
```

---

## Playwright Integration

### Installation

```bash
npm install --save-dev @axe-core/playwright
```

### Basic Usage

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage has no accessibility violations', async ({ page }) => {
    await page.goto('https://example.com');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

### Configuration Methods

```typescript
import AxeBuilder from '@axe-core/playwright';

// Filter by WCAG tags
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze();

// Include specific elements only
const results = await new AxeBuilder({ page })
  .include('#main-content')
  .include('.sidebar')
  .analyze();

// Exclude elements
const results = await new AxeBuilder({ page })
  .exclude('.third-party-widget')
  .exclude('#advertisement')
  .analyze();

// Disable specific rules
const results = await new AxeBuilder({ page })
  .disableRules(['color-contrast', 'duplicate-id'])
  .analyze();

// Custom axe options
const results = await new AxeBuilder({ page })
  .options({
    rules: {
      'region': { enabled: false }
    }
  })
  .analyze();
```

### Creating Test Fixtures

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type AxeFixture = {
  makeAxeBuilder: () => AxeBuilder;
};

export const test = base.extend<AxeFixture>({
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () => new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('#known-issue-element');

    await use(makeAxeBuilder);
  },
});

export { expect } from '@playwright/test';
```

```typescript
// tests/accessibility.spec.ts
import { test, expect } from './fixtures';

test('page is accessible', async ({ page, makeAxeBuilder }) => {
  await page.goto('/');

  const accessibilityResults = await makeAxeBuilder().analyze();

  expect(accessibilityResults.violations).toEqual([]);
});
```

### Attaching Results for Debugging

```typescript
test('accessible with detailed report', async ({ page }, testInfo) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page }).analyze();

  // Attach full results to test report
  await testInfo.attach('accessibility-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json'
  });

  expect(results.violations).toEqual([]);
});
```

### Testing After Interactions

```typescript
test('dialog is accessible when open', async ({ page }) => {
  await page.goto('/');

  // Trigger dialog
  await page.getByRole('button', { name: 'Open dialog' }).click();
  await page.getByRole('dialog').waitFor();

  // Scan only the dialog
  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();

  expect(results.violations).toEqual([]);
});
```

---

## Storybook Integration

### Installation

```bash
npm install --save-dev @storybook/addon-a11y
```

### Configuration

```javascript
// .storybook/main.js
module.exports = {
  addons: ['@storybook/addon-a11y'],
};
```

### Global Configuration

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    a11y: {
      // Element to inspect
      element: '#storybook-root',

      // axe-core configuration
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'region', enabled: false },
        ],
      },

      // axe-core options
      options: {
        runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },

      // Manual mode (disable automatic checking)
      manual: false,
    },
  },
};

export default preview;
```

### Per-Story Configuration

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: false },
        ],
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Click me',
  },
};

// Override for specific story
export const IconOnly: Story = {
  args: {
    children: <Icon />,
    'aria-label': 'Settings',
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'button-name', enabled: true },
        ],
      },
    },
  },
};
```

### Test Runner Integration

For automated CI testing with Storybook:

```bash
npm install --save-dev @storybook/test-runner axe-playwright
```

```javascript
// .storybook/test-runner.js
const { injectAxe, checkA11y } = require('axe-playwright');

module.exports = {
  async preVisit(page) {
    await injectAxe(page);
  },
  async postVisit(page) {
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  },
};
```

Run tests:

```bash
npx test-storybook
```

---

## Custom Rules

### Creating Custom Rules

```javascript
axe.configure({
  rules: [
    {
      id: 'custom-heading-check',
      selector: 'h1',
      enabled: true,
      any: ['custom-heading-check'],
      tags: ['custom', 'best-practice'],
      metadata: {
        description: 'Ensures h1 contains company branding',
        help: 'H1 should include company name',
        helpUrl: 'https://company.com/accessibility/h1-rule'
      }
    }
  ],
  checks: [
    {
      id: 'custom-heading-check',
      evaluate: function(node, options) {
        const text = node.textContent.toLowerCase();
        return text.includes('mycompany');
      },
      metadata: {
        impact: 'moderate',
        messages: {
          pass: 'H1 contains company branding',
          fail: 'H1 does not contain company branding'
        }
      }
    }
  ]
});
```

### Rule Configuration via JSON

```json
{
  "rules": [
    {
      "id": "valid-lang",
      "impact": "minor"
    },
    {
      "id": "color-contrast",
      "enabled": false
    }
  ]
}
```

Load configuration:

```javascript
const customConfig = require('./axe-config.json');
axe.configure(customConfig);
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Start server
        run: npm run preview &

      - name: Wait for server
        run: npx wait-on http://localhost:4173

      - name: Run accessibility tests
        run: npm run test:a11y

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: accessibility-results
          path: test-results/
```

### Playwright Configuration for CI

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/accessibility',
  reporter: [
    ['html', { outputFolder: 'test-results/accessibility' }],
    ['json', { outputFile: 'test-results/accessibility.json' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4173',
  },
});
```

### Example A11y Test Suite

```typescript
// tests/accessibility/pages.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
];

for (const { name, path } of pages) {
  test(`${name} page should be accessible`, async ({ page }) => {
    await page.goto(path);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
```

### axe-core CLI

```bash
# Install CLI
npm install -g @axe-core/cli

# Basic usage
axe https://example.com

# Exit with error code on violations (for CI)
axe https://example.com --exit

# Save results
axe https://example.com --save results.json

# Multiple pages
axe https://example.com https://example.com/about --exit
```

---

## Common Violations and Fixes

### Image Missing Alt Text

**Violation:** `image-alt`

```html
<!-- Bad -->
<img src="photo.jpg">

<!-- Good: Informative image -->
<img src="photo.jpg" alt="Team members at annual conference">

<!-- Good: Decorative image -->
<img src="decorative-line.png" alt="" role="presentation">
```

### Button Without Accessible Name

**Violation:** `button-name`

```html
<!-- Bad -->
<button><svg>...</svg></button>

<!-- Good: Text content -->
<button><svg>...</svg> Submit</button>

<!-- Good: aria-label -->
<button aria-label="Submit form"><svg>...</svg></button>

<!-- Good: aria-labelledby -->
<span id="btn-label" class="sr-only">Submit form</span>
<button aria-labelledby="btn-label"><svg>...</svg></button>
```

### Link Without Accessible Name

**Violation:** `link-name`

```html
<!-- Bad -->
<a href="/page"><img src="icon.png"></a>

<!-- Good -->
<a href="/page">
  <img src="icon.png" alt="">
  Read more about accessibility
</a>

<!-- Good: aria-label -->
<a href="/page" aria-label="Read more about accessibility">
  <img src="icon.png" alt="">
</a>
```

### Insufficient Color Contrast

**Violation:** `color-contrast`

```css
/* Bad: 2.5:1 ratio */
.text {
  color: #888;
  background: #fff;
}

/* Good: 4.5:1 ratio (AA) */
.text {
  color: #595959;
  background: #fff;
}

/* Good: 7:1 ratio (AAA) */
.text {
  color: #333;
  background: #fff;
}
```

### Form Input Missing Label

**Violation:** `label`

```html
<!-- Bad -->
<input type="email" placeholder="Email">

<!-- Good: Visible label -->
<label for="email">Email address</label>
<input type="email" id="email">

<!-- Good: Wrapped label -->
<label>
  Email address
  <input type="email">
</label>

<!-- Good: aria-label (when visual label not possible) -->
<input type="email" aria-label="Email address">
```

### Skip Link Missing

**Violation:** `bypass`

```html
<!-- Add skip link as first focusable element -->
<body>
  <a href="#main-content" class="skip-link">
    Skip to main content
  </a>
  <nav>...</nav>
  <main id="main-content">
    ...
  </main>
</body>

<style>
.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  position: static;
  left: auto;
}
</style>
```

### Heading Order Issues

**Violation:** `heading-order`

```html
<!-- Bad: Skips h2 -->
<h1>Page Title</h1>
<h3>Section Title</h3>

<!-- Good: Sequential order -->
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
```

---

## Limitations and Manual Testing

### What axe-core Cannot Detect

axe-core and similar automated tools can detect approximately **30-57% of accessibility issues**. The following require manual testing:

| Category | Manual Testing Required |
|----------|------------------------|
| **Keyboard navigation** | Tab order logic, focus management |
| **Screen reader** | Announcement quality, reading order |
| **Cognitive** | Content clarity, consistent navigation |
| **Motion** | Animation safety, pause controls |
| **Content** | Link text quality, error message helpfulness |
| **Context** | Appropriate alt text content |

### Results Categories

```javascript
const results = await axe.run();

// VIOLATIONS: Definite failures - must fix
results.violations;

// PASSES: Successfully validated
results.passes;

// INCOMPLETE: Cannot determine - requires manual review
results.incomplete;

// INAPPLICABLE: Rules that found no matching elements
results.inapplicable;
```

### Recommended Manual Testing

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Verify logical focus order
   - Check focus visibility
   - Test keyboard shortcuts

2. **Screen Reader Testing**
   - VoiceOver (macOS/iOS)
   - NVDA (Windows)
   - JAWS (Windows)
   - TalkBack (Android)

3. **Zoom and Magnification**
   - 200% zoom functionality
   - Text-only zoom
   - Screen magnifier usage

4. **Cognitive Review**
   - Clear error messages
   - Consistent navigation
   - Understandable content
   - Sufficient time for tasks

### Supplementary Tools

| Tool | Purpose |
|------|---------|
| [Accessibility Insights](https://accessibilityinsights.io/) | Manual WCAG 2.1 assessment |
| [WAVE](https://wave.webaim.org/) | Visual accessibility evaluation |
| [Lighthouse](https://developers.google.com/web/tools/lighthouse) | Performance and accessibility audits |
| [pa11y](https://pa11y.org/) | CLI accessibility testing |

---

## Best Practices

### Testing Strategy

1. **Unit Tests**: Test components in isolation with jest-axe/vitest-axe
2. **Integration Tests**: Test page sections with Playwright/axe-core
3. **E2E Tests**: Test complete user flows with accessibility assertions
4. **Visual Review**: Use Storybook addon-a11y during development
5. **Manual Testing**: Regular screen reader and keyboard testing

### Component Testing Pattern

```typescript
// Component test template
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Component accessibility', () => {
  it('renders without accessibility violations', async () => {
    const { container } = render(
      <Component
        prop="value"
        aria-label="Accessible name"
      />
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('is accessible in all states', async () => {
    const { container, rerender } = render(<Component />);

    // Default state
    expect(await axe(container)).toHaveNoViolations();

    // Loading state
    rerender(<Component loading />);
    expect(await axe(container)).toHaveNoViolations();

    // Error state
    rerender(<Component error="Error message" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

### Configuration Recommendations

```javascript
// Recommended base configuration
const baseConfig = {
  rules: {
    // Disable for isolated component testing
    'region': { enabled: false },
    'bypass': { enabled: false },
    'page-has-heading-one': { enabled: false },

    // Keep enabled for comprehensive testing
    'color-contrast': { enabled: true },
    'image-alt': { enabled: true },
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    'label': { enabled: true },
  }
};

// Full page testing configuration
const pageConfig = {
  runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']
};
```

---

## Resources

### Official Documentation

- [axe-core GitHub Repository](https://github.com/dequelabs/axe-core)
- [axe-core API Documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)
- [Rule Descriptions](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [Deque University Rules Reference](https://dequeuniversity.com/rules/axe/)

### Integration Documentation

- [jest-axe GitHub](https://github.com/NickColley/jest-axe)
- [vitest-axe GitHub](https://github.com/chaance/vitest-axe)
- [@axe-core/playwright npm](https://www.npmjs.com/package/@axe-core/playwright)
- [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
- [Storybook Accessibility Testing](https://storybook.js.org/docs/writing-tests/accessibility-testing)

### WCAG Guidelines

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
- [WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)

### Manual Testing Resources

- [Accessibility Insights for Web](https://accessibilityinsights.io/docs/web/overview/)
- [WebAIM WAVE Tool](https://wave.webaim.org/)
- [Deque axe DevTools](https://www.deque.com/axe/devtools/)

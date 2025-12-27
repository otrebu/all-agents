# Storybook 8.x Research

> Comprehensive documentation for Storybook 7.x/8.x, covering setup, stories, testing, and best practices.

## Table of Contents

1. [Setup & Installation](#1-setup--installation)
2. [Stories (CSF3 Format)](#2-stories-csf3-format)
3. [Controls Addon](#3-controls-addon)
4. [Actions Addon](#4-actions-addon)
5. [Decorators](#5-decorators)
6. [Play Functions](#6-play-functions)
7. [Testing](#7-testing)
8. [Documentation (MDX & Autodocs)](#8-documentation-mdx--autodocs)
9. [Essential & Community Addons](#9-essential--community-addons)
10. [Monorepo & Composition](#10-monorepo--composition)
11. [Vite Integration](#11-vite-integration)

---

## 1. Setup & Installation

### Quick Installation

```bash
# Initialize Storybook in existing project (auto-detects framework)
npx storybook@latest init

# Specify version
npx storybook@8 init

# With Vite builder explicitly
npx storybook@latest init --builder=vite
```

### Minimal Manual Setup (React + Vite)

```bash
bun add @storybook/react @storybook/react-vite @storybook/addon-essentials storybook
```

### Directory Structure

```
.storybook/
  main.ts          # Main configuration
  preview.ts       # Story rendering configuration
  manager.ts       # UI customization (optional)
src/
  components/
    Button/
      Button.tsx
      Button.stories.tsx
```

### main.ts Configuration

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // Story file patterns
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],

  // Addons
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],

  // Framework configuration
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  // Autodocs configuration
  docs: {
    autodocs: 'tag', // Enable for stories tagged with 'autodocs'
  },

  // Static files
  staticDirs: ['../public'],

  // TypeScript docgen
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
};

export default config;
```

### preview.ts Configuration

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  // Global decorators
  decorators: [],
  // Global tags
  tags: ['autodocs'],
};

export default preview;
```

### Upgrading to Storybook 8

```bash
# Upgrade to latest 8.x
npx storybook@8 upgrade

# Migration from older versions (run sequentially)
npx storybook@7 upgrade  # First to 7
npx storybook@8 upgrade  # Then to 8
```

---

## 2. Stories (CSF3 Format)

### CSF3 Overview

Component Story Format 3 (CSF3) is the recommended format for Storybook 7+. It's fully backwards compatible with CSF2.

### Basic Story Structure

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

// Meta (default export) - component-level configuration
const meta = {
  title: 'Components/Button',
  component: Button,
  // Default args for all stories
  args: {
    children: 'Click me',
  },
  // ArgTypes for controls customization
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
    },
    onClick: { action: 'clicked' },
  },
  // Component-level parameters
  parameters: {
    layout: 'centered',
  },
  // Tags for autodocs, etc.
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Stories - named exports
export const Primary: Story = {
  args: {
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
};

export const WithCustomRender: Story = {
  args: {
    variant: 'primary',
  },
  render: (args) => (
    <div style={{ padding: '20px' }}>
      <Button {...args} />
    </div>
  ),
};
```

### Args Inheritance

```typescript
// Args cascade: Global -> Component -> Story
const meta = {
  component: Button,
  args: {
    // Component-level defaults
    size: 'medium',
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export const Disabled: Story = {
  args: {
    // Story-specific, overrides component defaults
    disabled: true,
  },
};
```

### ArgTypes Configuration

```typescript
const meta = {
  component: Button,
  argTypes: {
    // Control type customization
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
      description: 'Button style variant',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'primary' },
        category: 'Appearance',
      },
    },
    // Disable control
    className: {
      control: false,
    },
    // Mapping complex values
    icon: {
      control: 'select',
      options: ['none', 'arrow', 'check'],
      mapping: {
        none: null,
        arrow: <ArrowIcon />,
        check: <CheckIcon />,
      },
    },
  },
} satisfies Meta<typeof Button>;
```

### Parameters

```typescript
const meta = {
  component: Button,
  parameters: {
    // Layout options: 'centered' | 'fullscreen' | 'padded'
    layout: 'centered',
    // Background options
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
    // Viewport
    viewport: {
      defaultViewport: 'mobile1',
    },
    // Docs customization
    docs: {
      description: {
        component: 'A versatile button component.',
      },
    },
  },
} satisfies Meta<typeof Button>;
```

### Migration from CSF2

```bash
# Automatic migration
npx storybook@next migrate csf-2-to-3 --glob="**/*.stories.js"
```

---

## 3. Controls Addon

Controls provides a graphical UI to interact with component args dynamically.

### Control Types

```typescript
argTypes: {
  // Automatic inference works for most cases, but you can customize:

  // Boolean
  disabled: { control: 'boolean' },

  // Text input
  label: { control: 'text' },

  // Number
  count: {
    control: { type: 'number', min: 0, max: 100, step: 1 }
  },

  // Range slider
  opacity: {
    control: { type: 'range', min: 0, max: 1, step: 0.1 }
  },

  // Select dropdown
  size: {
    control: 'select',
    options: ['small', 'medium', 'large']
  },

  // Radio buttons
  variant: {
    control: 'radio',
    options: ['primary', 'secondary']
  },

  // Inline radio
  theme: {
    control: 'inline-radio',
    options: ['light', 'dark']
  },

  // Check boxes (multi-select)
  features: {
    control: 'check',
    options: ['feature1', 'feature2', 'feature3'],
  },

  // Color picker
  backgroundColor: { control: 'color' },

  // Date picker
  startDate: { control: 'date' },

  // Object/JSON editor
  config: { control: 'object' },

  // File input
  image: { control: 'file', accept: '.png,.jpg' },
}
```

### Disabling Controls

```typescript
// Disable specific control
argTypes: {
  className: { control: false },
}

// Disable all controls for a story
export const NoControls: Story = {
  parameters: {
    controls: { disable: true },
  },
};

// Hide specific controls
export const Limited: Story = {
  parameters: {
    controls: { exclude: ['className', 'style'] },
  },
};

// Show only specific controls
export const Minimal: Story = {
  parameters: {
    controls: { include: ['variant', 'size'] },
  },
};
```

### Control Matchers (Global)

```typescript
// preview.ts
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};
```

---

## 4. Actions Addon

Actions log interactions in the Storybook UI.

### Using fn() from @storybook/test (Recommended)

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Button } from './Button';

const meta = {
  component: Button,
  args: {
    // Mock function that logs to Actions panel
    onClick: fn(),
    onHover: fn(),
  },
} satisfies Meta<typeof Button>;
```

### Using argTypes Action Annotation

```typescript
const meta = {
  component: Button,
  argTypes: {
    onClick: { action: 'clicked' },
    onMouseEnter: { action: 'mouse entered' },
  },
} satisfies Meta<typeof Button>;
```

### Global Action Matching

```typescript
// preview.ts - auto-detect action handlers
const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
  },
};
```

### withActions Decorator

```typescript
import { withActions } from '@storybook/addon-actions/decorator';

export const WithHTMLEvents: Story = {
  decorators: [withActions],
  parameters: {
    actions: {
      handles: ['click', 'mouseover .btn'],
    },
  },
};
```

---

## 5. Decorators

Decorators wrap stories with extra rendering logic, context providers, or styling.

### Story-Level Decorator

```typescript
export const Themed: Story = {
  decorators: [
    (Story) => (
      <div style={{ padding: '3rem' }}>
        <Story />
      </div>
    ),
  ],
};
```

### Component-Level Decorator

```typescript
const meta = {
  component: Card,
  decorators: [
    (Story) => (
      <div className="card-container">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;
```

### Global Decorators (preview.ts)

```typescript
// .storybook/preview.ts
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../src/themes';

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={lightTheme}>
        <Story />
      </ThemeProvider>
    ),
  ],
};
```

### Context-Aware Decorators

```typescript
const preview: Preview = {
  decorators: [
    (Story, context) => {
      // Access story metadata
      const { args, parameters, globals } = context;
      const theme = globals.theme || 'light';

      return (
        <ThemeProvider theme={themes[theme]}>
          <Story />
        </ThemeProvider>
      );
    },
  ],
};
```

### Using @storybook/addon-themes

```typescript
// .storybook/preview.ts
import { withThemeFromJSXProvider } from '@storybook/addon-themes';
import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme, GlobalStyles } from '../src/themes';

const preview: Preview = {
  decorators: [
    withThemeFromJSXProvider({
      themes: {
        light: lightTheme,
        dark: darkTheme,
      },
      defaultTheme: 'light',
      Provider: ThemeProvider,
      GlobalStyles,
    }),
  ],
};
```

### Common Provider Patterns

```typescript
// Multiple providers composition
const preview: Preview = {
  decorators: [
    // Router provider
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
    // Redux provider
    (Story) => (
      <Provider store={mockStore}>
        <Story />
      </Provider>
    ),
    // Query client
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};
```

---

## 6. Play Functions

Play functions enable interaction testing within stories.

### Basic Play Function

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
    const canvas = within(canvasElement);

    // Type in the email field
    await userEvent.type(
      canvas.getByLabelText('Email'),
      'user@example.com'
    );

    // Type in the password field
    await userEvent.type(
      canvas.getByLabelText('Password'),
      'secretpassword'
    );

    // Click the submit button
    await userEvent.click(canvas.getByRole('button', { name: 'Log in' }));
  },
};
```

### Assertions in Play Functions

```typescript
export const ValidatedForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click submit without filling form
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));

    // Assert error message appears
    await expect(canvas.getByText('Email is required')).toBeInTheDocument();
  },
};
```

### Using Args in Play Functions

```typescript
export const WithMockedCallback: Story = {
  args: {
    onSubmit: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Name'), 'John');
    await userEvent.click(canvas.getByRole('button'));

    // Assert the callback was called
    await expect(args.onSubmit).toHaveBeenCalledWith({ name: 'John' });
  },
};
```

### Step Function for Organization

```typescript
export const MultiStep: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Enter credentials', async () => {
      await userEvent.type(canvas.getByLabelText('Email'), 'test@test.com');
      await userEvent.type(canvas.getByLabelText('Password'), 'password');
    });

    await step('Submit form', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Login' }));
    });

    await step('Verify success', async () => {
      await expect(canvas.getByText('Welcome!')).toBeInTheDocument();
    });
  },
};
```

### Composing Play Functions

```typescript
// Reuse play functions from other stories
export const LoggedIn: Story = {
  play: async (context) => {
    // Run the play function from FilledForm first
    await FilledForm.play?.(context);

    // Then continue with additional interactions
    const canvas = within(context.canvasElement);
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
  },
};
```

---

## 7. Testing

### Storybook Test Addon (Recommended for Storybook 8.5+)

The new Test addon uses Vitest and browser mode for faster, more reliable testing.

```bash
# Install
bun add -D @storybook/experimental-addon-test
```

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  addons: [
    '@storybook/addon-essentials',
    '@storybook/experimental-addon-test',
  ],
};
```

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config';
import { storybookTest } from '@storybook/experimental-addon-test/vitest-plugin';

export default defineWorkspace([
  'vitest.config.ts',
  {
    extends: 'vite.config.ts',
    plugins: [storybookTest()],
    test: {
      name: 'storybook',
      browser: {
        enabled: true,
        name: 'chromium',
        provider: 'playwright',
      },
      setupFiles: ['.storybook/vitest.setup.ts'],
    },
  },
]);
```

### Test Runner (Legacy Approach)

```bash
# Install
bun add -D @storybook/test-runner

# Run tests
npx test-storybook

# Run with coverage
npx test-storybook --coverage
```

```typescript
// test-runner-jest.config.js
module.exports = {
  async postVisit(page, context) {
    // Custom assertions after each story renders
    const elementHandler = await page.$('#root');
    const innerHTML = await elementHandler.innerHTML();
    expect(innerHTML).not.toBe('');
  },
};
```

### Accessibility Testing

```bash
bun add -D @storybook/addon-a11y
```

```typescript
// .storybook/main.ts
addons: ['@storybook/addon-a11y'],

// In stories
export const Accessible: Story = {
  parameters: {
    a11y: {
      // axe-core configuration
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
        ],
      },
    },
  },
};

// Disable a11y for specific story
export const SkipA11y: Story = {
  parameters: {
    a11y: { disable: true },
  },
};
```

### Visual Testing with Chromatic

```bash
# Install Chromatic
bun add -D chromatic

# Run visual tests
npx chromatic --project-token=<your-token>
```

```typescript
// .storybook/main.ts
addons: ['@chromatic-com/storybook'],

// Ignore specific stories
export const NoVisualTest: Story = {
  parameters: {
    chromatic: { disableSnapshot: true },
  },
};

// Test specific viewports
export const Responsive: Story = {
  parameters: {
    chromatic: { viewports: [320, 768, 1200] },
  },
};
```

### Snapshot Testing

```typescript
// test-runner-jest.config.js
const { toMatchImageSnapshot } = require('jest-image-snapshot');

module.exports = {
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },
  async postVisit(page, context) {
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot({
      customSnapshotIdentifier: context.id,
    });
  },
};
```

---

## 8. Documentation (MDX & Autodocs)

### Enabling Autodocs

```typescript
// .storybook/main.ts
docs: {
  autodocs: true, // Enable for all stories
  // OR
  autodocs: 'tag', // Enable only for stories with 'autodocs' tag
}

// In stories
const meta = {
  component: Button,
  tags: ['autodocs'], // Enable autodocs for this component
} satisfies Meta<typeof Button>;
```

### Customizing Autodocs

```typescript
const meta = {
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A customizable button component for user interactions.',
      },
    },
  },
  argTypes: {
    variant: {
      description: 'The visual style of the button',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'primary' },
      },
    },
  },
} satisfies Meta<typeof Button>;
```

### Writing MDX Documentation

```mdx
{/* Button.mdx */}
import { Meta, Story, Canvas, Controls, ArgTypes } from '@storybook/blocks';
import * as ButtonStories from './Button.stories';

<Meta of={ButtonStories} />

# Button Component

The Button component is used for user interactions.

## Usage

```tsx
import { Button } from './Button';

<Button variant="primary">Click me</Button>
```

## Examples

### Primary Button

<Canvas of={ButtonStories.Primary} />

### All Variants

<Canvas>
  <Story of={ButtonStories.Primary} />
  <Story of={ButtonStories.Secondary} />
</Canvas>

## Props

<ArgTypes of={ButtonStories} />

## Controls

<Controls of={ButtonStories.Primary} />
```

### Doc Blocks

```mdx
import {
  Meta,
  Title,
  Subtitle,
  Description,
  Primary,
  PrimaryVariants,
  Controls,
  Stories,
  ArgTypes,
  Canvas,
  Story,
  Source,
  Markdown,
} from '@storybook/blocks';
```

### Custom Autodocs Template

```mdx
{/* .storybook/templates/component-docs.mdx */}
import { Meta, Title, Description, Primary, Controls, Stories } from '@storybook/blocks';

<Meta isTemplate />

<Title />
<Description />

## Usage

<Primary />

## Props

<Controls />

## All Stories

<Stories />
```

```typescript
// .storybook/preview.ts
import ComponentDocs from './templates/component-docs.mdx';

const preview: Preview = {
  parameters: {
    docs: {
      page: ComponentDocs,
    },
  },
};
```

### Subcomponents Documentation

```typescript
const meta = {
  title: 'Components/List',
  component: List,
  subcomponents: { ListItem, ListHeader },
  tags: ['autodocs'],
} satisfies Meta<typeof List>;
```

---

## 9. Essential & Community Addons

### Essential Addons (Included by Default)

```typescript
// Installed with @storybook/addon-essentials
addons: ['@storybook/addon-essentials'],

// Includes:
// - Actions: Log event handler calls
// - Backgrounds: Switch background colors
// - Controls: Dynamic args UI
// - Docs: Documentation generation
// - Viewport: Test responsive layouts
// - Toolbars: Custom toolbar menus
// - Measure: Inspect spacing/dimensions
// - Outline: Visualize element boundaries
```

### Disable Specific Essentials

```typescript
addons: [
  {
    name: '@storybook/addon-essentials',
    options: {
      backgrounds: false,
      outline: false,
    },
  },
],
```

### Popular Community Addons

```bash
# Accessibility testing
bun add -D @storybook/addon-a11y

# Interaction testing
bun add -D @storybook/addon-interactions

# Theme switching
bun add -D @storybook/addon-themes

# Mock Service Worker
bun add -D msw-storybook-addon

# Dark mode
bun add -D storybook-dark-mode

# Design system links (Figma)
bun add -D @storybook/addon-designs

# Storysource (view story code)
bun add -D @storybook/addon-storysource

# React Router
bun add -D storybook-addon-remix-react-router

# i18n
bun add -D storybook-react-i18next
```

### MSW Addon Example

```typescript
// .storybook/preview.ts
import { initialize, mswLoader } from 'msw-storybook-addon';

initialize();

const preview: Preview = {
  loaders: [mswLoader],
};

// In stories
import { http, HttpResponse } from 'msw';

export const WithMockedAPI: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () => {
          return HttpResponse.json([
            { id: 1, name: 'John' },
            { id: 2, name: 'Jane' },
          ]);
        }),
      ],
    },
  },
};
```

### Storybook Dark Mode

```typescript
// .storybook/preview.ts
import { themes } from '@storybook/theming';

const preview: Preview = {
  parameters: {
    darkMode: {
      dark: themes.dark,
      light: themes.normal,
      current: 'light',
    },
  },
};
```

---

## 10. Monorepo & Composition

### Storybook Composition

Composition allows combining multiple Storybooks into one interface.

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  refs: {
    'design-system': {
      title: 'Design System',
      url: 'https://design-system.example.com/storybook',
    },
    'shared-components': {
      title: 'Shared Components',
      url: 'http://localhost:6007',
    },
  },
};
```

### Dynamic Refs (Environment-Based)

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  refs: (config, { configType }) => {
    if (configType === 'DEVELOPMENT') {
      return {
        'design-system': {
          title: 'Design System (Dev)',
          url: 'http://localhost:6007',
        },
      };
    }
    return {
      'design-system': {
        title: 'Design System',
        url: 'https://design-system.example.com/storybook',
      },
    };
  },
};
```

### Monorepo Story Patterns

```typescript
// Single Storybook for all packages
const config: StorybookConfig = {
  stories: [
    '../packages/*/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../apps/*/src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],
};
```

### Monorepo with Multiple Storybooks

```
monorepo/
  packages/
    design-system/
      .storybook/
        main.ts
      src/
    app-a/
      .storybook/
        main.ts    # Composes design-system
      src/
    app-b/
      .storybook/
        main.ts    # Composes design-system
      src/
```

### CORS Considerations

When composing locally running Storybooks, ensure they're fully loaded before the parent. Start child Storybooks first, then the parent.

```bash
# Using concurrently
npx concurrently \
  "cd packages/design-system && npm run storybook -- -p 6007" \
  "sleep 5 && npm run storybook"
```

### Root Storybook Requirements

Storybook requires at least one local story. For composition-only setups, create a placeholder:

```mdx
{/* .storybook/Introduction.mdx */}
import { Meta } from '@storybook/blocks';

<Meta title="Introduction" />

# Welcome

This Storybook composes multiple component libraries.
```

---

## 11. Vite Integration

### @storybook/builder-vite

Storybook automatically detects Vite projects and uses the Vite builder.

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  // OR explicitly set builder
  core: {
    builder: '@storybook/builder-vite',
  },
};
```

### Vite Configuration Reuse

Storybook automatically merges your `vite.config.ts`:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

### Custom Vite Config for Storybook

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: {
        viteConfigPath: '.storybook/customViteConfig.ts',
      },
    },
  },
  viteFinal: async (config) => {
    // Modify the Vite config
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@components': '/src/components',
    };
    return config;
  },
};
```

### Environment-Specific Vite Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  // mode will be 'development' for Storybook
  define: {
    __STORYBOOK__: mode === 'development',
  },
}));
```

### Framework-Specific Packages

```bash
# React + Vite
bun add -D @storybook/react-vite

# Vue 3 + Vite
bun add -D @storybook/vue3-vite

# Svelte + Vite
bun add -D @storybook/svelte-vite

# SvelteKit
bun add -D @storybook/sveltekit

# Solid + Vite
bun add -D storybook-solidjs-vite
```

### Performance Optimizations

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  core: {
    disableTelemetry: true,
  },
  // Speed up docgen
  typescript: {
    reactDocgen: 'react-docgen', // Faster than react-docgen-typescript
  },
};
```

---

## Quick Reference

### Package Versions (Storybook 8.x)

```json
{
  "devDependencies": {
    "storybook": "^8.4.0",
    "@storybook/react": "^8.4.0",
    "@storybook/react-vite": "^8.4.0",
    "@storybook/addon-essentials": "^8.4.0",
    "@storybook/addon-interactions": "^8.4.0",
    "@storybook/addon-a11y": "^8.4.0",
    "@storybook/test": "^8.4.0"
  }
}
```

### CLI Commands

```bash
# Start development server
npm run storybook
# OR
npx storybook dev -p 6006

# Build static Storybook
npx storybook build

# Run tests
npx test-storybook

# Upgrade Storybook
npx storybook@latest upgrade

# Add addon
npx storybook add @storybook/addon-a11y
```

### Useful Links

- [Official Documentation](https://storybook.js.org/docs)
- [Storybook 8 Release Notes](https://storybook.js.org/releases/8.0)
- [CSF3 Format](https://storybook.js.org/blog/storybook-csf3-is-here/)
- [Addon Gallery](https://storybook.js.org/addons)
- [Visual Tests with Chromatic](https://www.chromatic.com/storybook)

---

## Sources

- [Install Storybook](https://storybook.js.org/docs/get-started/install)
- [Storybook 8 Release](https://storybook.js.org/blog/storybook-8/)
- [CSF3 Announcement](https://storybook.js.org/blog/storybook-csf3-is-here/)
- [Args Documentation](https://storybook.js.org/docs/writing-stories/args)
- [ArgTypes Documentation](https://storybook.js.org/docs/api/arg-types)
- [Controls Addon](https://storybook.js.org/docs/essentials/controls)
- [Actions Addon](https://storybook.js.org/docs/8/essentials/actions)
- [Decorators](https://storybook.js.org/docs/writing-stories/decorators)
- [Play Functions](https://storybook.js.org/docs/writing-stories/play-function)
- [Interaction Testing](https://storybook.js.org/docs/writing-tests/interaction-testing)
- [Test Runner](https://storybook.js.org/docs/writing-tests/integrations/test-runner)
- [Test Addon](https://storybook.js.org/docs/8/writing-tests/test-addon)
- [Accessibility Testing](https://storybook.js.org/docs/writing-tests/accessibility-testing)
- [Visual Testing](https://storybook.js.org/docs/writing-tests/visual-testing)
- [Autodocs](https://storybook.js.org/docs/writing-docs/autodocs)
- [MDX Documentation](https://storybook.js.org/docs/writing-docs/mdx)
- [Essential Addons](https://storybook.js.org/docs/8/essentials/index)
- [Storybook Composition](https://storybook.js.org/docs/sharing/storybook-composition)
- [Vite Builder](https://storybook.js.org/docs/builders/vite)
- [React + Vite Framework](https://storybook.js.org/docs/get-started/frameworks/react-vite)
- [Themes Addon](https://storybook.js.org/docs/essentials/themes)
- [Mocking Providers](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-providers)
- [Parameters](https://storybook.js.org/docs/writing-stories/parameters)
- [Toolbars & Globals](https://storybook.js.org/docs/essentials/toolbars-and-globals)

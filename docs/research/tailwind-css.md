# Tailwind CSS - Configuration and Advanced Patterns

Comprehensive reference for Tailwind CSS v3.x and v4.x including configuration, advanced patterns, and React integration.

## Table of Contents

- [Version Overview](#version-overview)
- [Configuration](#configuration)
  - [Tailwind v3.x Configuration](#tailwind-v3x-configuration)
  - [Tailwind v4.x Configuration](#tailwind-v4x-configuration)
- [JIT (Just-in-Time) Mode](#jit-just-in-time-mode)
- [Content Detection](#content-detection)
- [Theme Configuration](#theme-configuration)
- [Design Tokens Integration](#design-tokens-integration)
- [Dark Mode Implementation](#dark-mode-implementation)
- [Plugin Creation](#plugin-creation)
- [Custom Utilities and Components](#custom-utilities-and-components)
- [Tailwind with React Best Practices](#tailwind-with-react-best-practices)
- [Tailwind Merge](#tailwind-merge)
- [Class Variance Authority (CVA)](#class-variance-authority-cva)
- [Performance Optimization](#performance-optimization)
- [Migration Guide: v3 to v4](#migration-guide-v3-to-v4)
- [Sources](#sources)

---

## Version Overview

### Tailwind CSS v4.0 (Released January 22, 2025)

A ground-up rewrite optimized for performance and flexibility:

- **Performance**: Full builds 5x faster, incremental builds 100x+ faster (microseconds)
- **New Engine**: Oxide engine powered by Rust
- **CSS-First Configuration**: No more JavaScript config files by default
- **Modern CSS Features**: Native cascade layers, @property, color-mix()
- **Automatic Content Detection**: No configuration required for template scanning
- **Built-in Toolchain**: Lightning CSS integrated (handles @import, vendor prefixes, nesting)
- **Browser Support**: Safari 16.4+, Chrome 111+, Firefox 128+

### Tailwind CSS v3.4.x

- Stable, mature version with JavaScript-based configuration
- JIT mode enabled by default since v3.0
- Broad browser support including older browsers
- Recommended if you need legacy browser support

---

## Configuration

### Tailwind v3.x Configuration

Create config file:

```bash
npm install -D tailwindcss@3
npx tailwindcss init
```

#### Basic `tailwind.config.js` Structure

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{html,js}',
    './components/**/*.{html,js,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

#### Full Configuration Options

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Content paths for class scanning
  content: [
    './src/**/*.{html,js,jsx,ts,tsx}',
    './public/index.html',
  ],

  // Dark mode strategy: 'media' | 'class' | 'selector'
  darkMode: 'selector',

  // Theme customization
  theme: {
    // Override defaults completely
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      // Custom colors
      brand: {
        50: '#f0f9ff',
        500: '#0ea5e9',
        900: '#0c4a6e',
      },
    },
    // Extend defaults (recommended)
    extend: {
      spacing: {
        '8xl': '96rem',
        '9xl': '128rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      fontFamily: {
        display: ['Oswald', 'ui-serif'],
      },
    },
  },

  // Plugins
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],

  // Add prefix to all utilities
  prefix: 'tw-',

  // Mark all utilities as !important
  important: true,
  // Or use selector strategy
  // important: '#app',

  // Custom separator (default: ':')
  separator: '_',

  // Use custom base configuration
  presets: [
    require('@acmecorp/base-tailwind-config'),
  ],

  // Disable specific core plugins
  corePlugins: {
    float: false,
    objectFit: false,
  },
}
```

#### File Format Options

```bash
# Standard CommonJS
npx tailwindcss init

# ESM
npx tailwindcss init --esm

# TypeScript
npx tailwindcss init --ts

# With PostCSS config
npx tailwindcss init -p
```

#### Multiple Configuration Files

```css
/* site.css */
@config "./tailwind.site.config.js";
@tailwind base;
@tailwind components;
@tailwind utilities;

/* admin.css */
@config "./tailwind.admin.config.js";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Tailwind v4.x Configuration

#### Simplified Installation

```bash
# Install Tailwind and PostCSS plugin
npm i tailwindcss @tailwindcss/postcss
```

```javascript
// postcss.config.mjs
export default {
  plugins: ["@tailwindcss/postcss"],
};
```

```css
/* app.css - Single import, no @tailwind directives */
@import "tailwindcss";
```

#### Vite Plugin (Recommended for Vite Projects)

```bash
npm i tailwindcss @tailwindcss/vite
```

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
});
```

#### CSS-First Theme Configuration with @theme

```css
@import "tailwindcss";

@theme {
  /* Fonts */
  --font-display: "Satoshi", "sans-serif";
  --font-body: "Inter", sans-serif;

  /* Breakpoints */
  --breakpoint-3xl: 1920px;

  /* Colors using oklch */
  --color-brand-50: oklch(0.99 0 0);
  --color-brand-100: oklch(0.98 0.04 113.22);
  --color-brand-500: oklch(0.65 0.15 145);
  --color-brand-900: oklch(0.25 0.08 145);

  /* Spacing */
  --spacing-128: 32rem;
  --spacing-144: 36rem;

  /* Easing curves */
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);

  /* Animations */
  --animate-fade-in: fade-in 0.5s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

These theme variables are automatically exposed as CSS custom properties:

```css
/* Generated automatically */
:root {
  --font-display: "Satoshi", "sans-serif";
  --breakpoint-3xl: 1920px;
  --color-brand-500: oklch(0.65 0.15 145);
  /* ... */
}
```

#### Using JavaScript Config in v4

JavaScript configs are still supported but not auto-detected:

```css
@import "tailwindcss";
@config "../../tailwind.config.js";
```

---

## JIT (Just-in-Time) Mode

### How It Works

The JIT compiler generates styles on-demand as you author templates, rather than pre-generating everything at build time:

1. Scans your template files for utility class usage
2. Generates CSS only for classes actually used
3. Provides extremely fast incremental rebuilds (as fast as 3ms)

### Key Benefits

| Feature | Description |
|---------|-------------|
| **Lightning Fast Builds** | ~800ms for even the largest projects |
| **All Variants Enabled** | Use any variant (focus-visible, disabled, etc.) without configuration |
| **Identical Dev/Prod CSS** | No purging differences between environments |
| **Better Dev Tools** | Small CSS files make browser dev tools responsive |
| **Arbitrary Values** | Use any value with bracket notation |

### Arbitrary Values

```html
<!-- Custom values without configuration -->
<div class="top-[117px]">Fixed position</div>
<div class="w-[calc(100%-4rem)]">Dynamic width</div>
<div class="bg-[#bada55]">Custom color</div>
<div class="text-[22px]">Custom font size</div>
<div class="grid-cols-[1fr_500px_2fr]">Custom grid</div>

<!-- With variants -->
<div class="md:top-[344px] lg:top-[500px]">Responsive arbitrary</div>
<div class="hover:bg-[#FF6B6B]">Hover state</div>

<!-- CSS variables -->
<div class="fill-(--brand-color)">CSS variable</div>
```

### Stacking Variants

```html
<!-- Stack any variants -->
<button class="sm:hover:active:disabled:opacity-75">
  Complex state
</button>
```

---

## Content Detection

### Tailwind v3.x Content Configuration

```javascript
module.exports = {
  content: {
    // File paths to scan
    files: [
      './src/**/*.{html,js,jsx,ts,tsx}',
      './public/index.html',
    ],

    // Compile content before scanning (e.g., Markdown)
    transform: {
      md: (content) => remark().process(content),
    },

    // Custom extraction logic
    extract: {
      md: (content) => content.match(/[^<>"'`\s]*/) || [],
    },

    // Resolve paths relative to config file
    relative: true,
  },

  // Force generation of specific classes
  safelist: [
    'bg-red-500',
    'text-3xl',
    // Regex patterns
    {
      pattern: /bg-(red|green|blue)-(100|200|300)/,
      variants: ['lg', 'hover', 'focus'],
    },
  ],

  // Block specific classes from being generated
  blocklist: ['container', 'collapse'],
}
```

### Tailwind v4.x @source Directive

```css
@import "tailwindcss";

/* Include additional source paths */
@source "../node_modules/@acmecorp/ui-lib";

/* Set base path for monorepos */
@import "tailwindcss" source("../src");

/* Exclude specific paths */
@source not "../src/components/legacy";

/* Disable automatic detection entirely */
@import "tailwindcss" source(none);
@source "../admin";
@source "../shared";
```

#### Safelisting in v4

```css
@import "tailwindcss";

/* Force generation of specific classes */
@source inline("underline");

/* With variants */
@source inline("{hover:,focus:,}underline");

/* Range/brace expansion */
@source inline("{hover:,}bg-red-{50,{100..900..100},950}");

/* Exclude specific classes */
@source not inline("{hover:,focus:,}bg-red-{50,{100..900..100},950}");
```

### Critical Rule: Never Construct Classes Dynamically

```html
<!-- BAD: Dynamic construction (won't be detected) -->
<div class="text-{{ error ? 'red' : 'green' }}-600"></div>

<!-- GOOD: Complete class names -->
<div class="{{ error ? 'text-red-600' : 'text-green-600' }}"></div>
```

```jsx
// BAD: Dynamic class construction
function Button({ color }) {
  return <button className={`bg-${color}-600`}>Click</button>;
}

// GOOD: Map props to static class names
const colorVariants = {
  blue: "bg-blue-600 hover:bg-blue-500 text-white",
  red: "bg-red-600 hover:bg-red-500 text-white",
  yellow: "bg-yellow-300 hover:bg-yellow-400 text-black",
};

function Button({ color }) {
  return <button className={colorVariants[color]}>Click</button>;
}
```

---

## Theme Configuration

### Extending vs Overriding

```javascript
module.exports = {
  theme: {
    // OVERRIDE: Completely replaces default colors
    colors: {
      primary: '#3490dc',
      secondary: '#ffed4a',
    },

    // EXTEND: Adds to defaults
    extend: {
      colors: {
        brand: '#3490dc', // Adds brand while keeping all defaults
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
    },
  },
}
```

### Accessing Theme Values in JS

```javascript
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from './tailwind.config.js'

const fullConfig = resolveConfig(tailwindConfig)

// Access resolved values
fullConfig.theme.width[4]      // '1rem'
fullConfig.theme.screens.md    // '768px'
fullConfig.theme.colors.blue[500] // '#3b82f6'
```

### Referencing Other Theme Values

```javascript
module.exports = {
  theme: {
    spacing: {
      // ... spacing scale
    },
    // Reference spacing in other properties
    height: (theme) => ({
      auto: 'auto',
      ...theme('spacing'),
      screen: '100vh',
    }),
  },
}
```

---

## Design Tokens Integration

### v4: CSS-First Design Tokens with @theme

```css
@import "tailwindcss";

@theme {
  /* Typography tokens */
  --font-heading: "Satoshi", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;

  /* Color tokens */
  --color-primary: hsl(220, 90%, 50%);
  --color-secondary: hsl(280, 80%, 55%);
  --color-surface: hsl(220, 10%, 98%);
  --color-text: hsl(220, 15%, 15%);

  /* Spacing tokens */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Border tokens */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-full: 9999px;

  /* Shadow tokens */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

Generates utility classes automatically: `bg-primary`, `text-secondary`, `p-lg`, `rounded-lg`, etc.

### v3: Design Tokens in tailwind.config.js

```javascript
// tokens.js - Centralized token definitions
module.exports = {
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      900: '#1e3a8a'
    },
    // ...
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
};

// tailwind.config.js
const tokens = require('./tokens');

module.exports = {
  theme: {
    colors: tokens.colors,
    extend: {
      spacing: tokens.spacing,
    },
  },
};
```

### Integration with Style Dictionary

For enterprise design systems, use tools like Style Dictionary to transform tokens:

```json
// tokens.json (Design Token Format)
{
  "color": {
    "primary": {
      "value": "#3b82f6",
      "type": "color"
    }
  }
}
```

Transform to Tailwind config or CSS variables programmatically.

---

## Dark Mode Implementation

### Strategy 1: Media Query (Default)

Respects operating system preference automatically:

```javascript
// tailwind.config.js (v3)
module.exports = {
  darkMode: 'media', // Default, can be omitted
}
```

```html
<div class="bg-white dark:bg-gray-800">
  <h1 class="text-gray-900 dark:text-white">Heading</h1>
  <p class="text-gray-600 dark:text-gray-300">Body text</p>
</div>
```

### Strategy 2: Selector Strategy (Manual Toggle)

#### Tailwind v4

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

#### Tailwind v3

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'selector', // or 'class' in older versions
}
```

```html
<html class="dark">
  <body>
    <div class="bg-white dark:bg-black">
      <!-- Dark mode active -->
    </div>
  </body>
</html>
```

### Strategy 3: Data Attribute

```css
/* v4 */
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

```javascript
// v3
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
}
```

```html
<html data-theme="dark">
  <!-- Dark mode active -->
</html>
```

### Three-Way Toggle Implementation (Light/Dark/System)

```javascript
// Add to <head> to prevent FOUC
const theme = localStorage.theme;
const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

document.documentElement.classList.toggle(
  "dark",
  theme === "dark" || (!theme && systemDark)
);

// Toggle functions
function setLightMode() {
  localStorage.theme = "light";
  document.documentElement.classList.remove("dark");
}

function setDarkMode() {
  localStorage.theme = "dark";
  document.documentElement.classList.add("dark");
}

function setSystemMode() {
  localStorage.removeItem("theme");
  document.documentElement.classList.toggle(
    "dark",
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}
```

### React Dark Mode Hook

```typescript
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme() {
      if (theme === 'dark' || (theme === 'system' && systemDark.matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    applyTheme();
    if (theme === 'system') {
      systemDark.addEventListener('change', applyTheme);
      return () => systemDark.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    if (newTheme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', newTheme);
    }
  };

  return { theme, setTheme: updateTheme };
}
```

---

## Plugin Creation

### Basic Plugin Structure (v3)

```javascript
const plugin = require('tailwindcss/plugin')

module.exports = {
  plugins: [
    plugin(function({ addUtilities, addComponents, addBase, addVariant,
                      matchUtilities, theme, config, e }) {
      // Plugin logic here
    })
  ]
}
```

### Adding Static Utilities

```javascript
plugin(function({ addUtilities }) {
  addUtilities({
    '.content-auto': {
      'content-visibility': 'auto',
    },
    '.content-hidden': {
      'content-visibility': 'hidden',
    },
    '.scrollbar-hidden': {
      '&::-webkit-scrollbar': {
        display: 'none',
      },
      '-ms-overflow-style': 'none',
      'scrollbar-width': 'none',
    },
  })
})
```

### Adding Dynamic Utilities with Theme Values

```javascript
plugin(function({ matchUtilities, theme }) {
  matchUtilities(
    {
      tab: (value) => ({
        tabSize: value,
      }),
    },
    { values: theme('tabSize') }
  )
})

// Usage: tab-2, tab-4, tab-[13]
```

### Adding Component Classes

```javascript
plugin(function({ addComponents }) {
  addComponents({
    '.btn': {
      padding: '.5rem 1rem',
      borderRadius: '.25rem',
      fontWeight: '600',
    },
    '.btn-primary': {
      backgroundColor: '#3490dc',
      color: '#fff',
      '&:hover': {
        backgroundColor: '#2779bd',
      },
    },
    '.card': {
      backgroundColor: '#fff',
      borderRadius: '.25rem',
      boxShadow: '0 2px 4px rgba(0,0,0,.1)',
      '&:hover': {
        boxShadow: '0 10px 15px rgba(0,0,0,.2)',
      },
      '@media (min-width: 500px)': {
        borderRadius: '.5rem',
      },
    },
  })
})
```

### Adding Base Styles

```javascript
plugin(function({ addBase, theme }) {
  addBase({
    'h1': { fontSize: theme('fontSize.2xl') },
    'h2': { fontSize: theme('fontSize.xl') },
    'h3': { fontSize: theme('fontSize.lg') },
  })
})
```

### Adding Custom Variants

```javascript
plugin(function({ addVariant }) {
  // Simple variant
  addVariant('optional', '&:optional')

  // Multiple selectors
  addVariant('hocus', ['&:hover', '&:focus'])

  // Media query
  addVariant('inverted-colors', '@media (inverted-colors: inverted)')

  // Parent/sibling state
  addVariant('group-optional', ':merge(.group):optional &')
  addVariant('peer-optional', ':merge(.peer):optional ~ &')
})

// Usage: optional:border-gray-300, hocus:bg-blue-600
```

### Dynamic Variants

```javascript
plugin(function({ matchVariant }) {
  matchVariant(
    'nth',
    (value) => `&:nth-child(${value})`,
    {
      values: {
        1: '1',
        2: '2',
        3: '3',
      },
    }
  )
})

// Usage: nth-1:bg-red-500, nth-2:bg-blue-500, nth-[3n+1]:bg-green-500
```

### Plugin with Configuration

```javascript
const plugin = require('tailwindcss/plugin')

module.exports = plugin(
  function({ matchUtilities, theme }) {
    matchUtilities(
      {
        tab: (value) => ({
          tabSize: value,
        }),
      },
      { values: theme('tabSize') }
    )
  },
  {
    // Default theme values
    theme: {
      tabSize: {
        1: '1',
        2: '2',
        4: '4',
        8: '8',
      },
    },
  }
)
```

### Configurable Plugin with Options

```javascript
const plugin = require('tailwindcss/plugin')

module.exports = plugin.withOptions(
  function(options = {}) {
    return function({ addComponents }) {
      const className = options.className ?? 'markdown'
      addComponents({
        [`.${className}`]: {
          // styles
        },
      })
    }
  },
  function(options) {
    return {
      theme: {
        // default theme values
      },
    }
  }
)

// Usage in config:
plugins: [
  require('./plugins/markdown.js')({
    className: 'wysiwyg'
  })
]
```

### v4: Custom Utilities with @utility

```css
@import "tailwindcss";

/* Simple utility */
@utility content-auto {
  content-visibility: auto;
}

/* Complex utility with nested selectors */
@utility scrollbar-hidden {
  &::-webkit-scrollbar {
    display: none;
  }
}

/* Functional utility with theme values */
@theme {
  --tab-size-2: 2;
  --tab-size-4: 4;
  --tab-size-8: 8;
}

@utility tab-* {
  tab-size: --value(--tab-size-*);
}

/* Arbitrary values */
@utility tab-* {
  tab-size: --value([integer]);
}
```

---

## Custom Utilities and Components

### Using @layer in v3

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-semibold;
  }
  .btn-primary {
    @apply bg-blue-600 text-white hover:bg-blue-700;
  }
  .card {
    @apply bg-white rounded-lg shadow-md p-6;
  }
}

@layer utilities {
  .text-glow {
    text-shadow: 0 0 8px rgba(59, 130, 246, 0.75);
  }
}
```

### Using @layer in v4

```css
@import "tailwindcss";

@layer base {
  h1 {
    font-size: var(--text-2xl);
  }
}

@layer components {
  .card {
    background-color: var(--color-white);
    border-radius: var(--radius-lg);
    padding: --spacing(6);
    box-shadow: var(--shadow-xl);
  }
}
```

### Custom Variants in CSS (v4)

```css
@import "tailwindcss";

/* Custom data attribute variant */
@custom-variant theme-midnight (&:where([data-theme="midnight"] *));

/* Usage: theme-midnight:bg-black */
```

### Using @apply Wisely

```css
/* Component classes - good use of @apply */
.btn {
  @apply px-4 py-2 font-semibold rounded-lg;
  @apply transition-colors duration-200;
}

.btn-primary {
  @apply bg-blue-600 text-white;
  @apply hover:bg-blue-700;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
}
```

**Note**: Use @apply sparingly. Component abstraction in your framework (React, Vue) is preferred over @apply for reusability.

---

## Tailwind with React Best Practices

### 1. Component Abstraction First

```tsx
// BAD: Repeating classes everywhere
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  Save
</button>
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  Submit
</button>

// GOOD: Create reusable components
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  const baseClasses = 'font-semibold rounded-lg transition-colors';

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className || ''}`}
      {...props}
    />
  );
}
```

### 2. Never Construct Classes Dynamically

```tsx
// BAD: Dynamic class construction
function Alert({ type }) {
  return <div className={`bg-${type}-100 text-${type}-800`}>Alert</div>;
}

// GOOD: Map to complete class names
const alertStyles = {
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
};

function Alert({ type, children }) {
  return (
    <div className={`p-4 rounded-lg border ${alertStyles[type]}`}>
      {children}
    </div>
  );
}
```

### 3. Use the cn() Utility Pattern

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// Usage in components
import { cn } from '@/lib/utils';

function Button({ className, variant, ...props }) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-lg font-medium',
        variant === 'primary' && 'bg-blue-600 text-white',
        variant === 'secondary' && 'bg-gray-200 text-gray-900',
        className // Allow consumers to override
      )}
      {...props}
    />
  );
}

// Consumer can override
<Button variant="primary" className="px-8">Wide Button</Button>
```

### 4. Props Over className Prop

```tsx
// GOOD: Defined prop interface
interface CardProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

function Card({ variant = 'elevated', padding = 'md', children }: CardProps) {
  const variants = {
    elevated: 'bg-white shadow-lg',
    outlined: 'bg-white border border-gray-200',
    filled: 'bg-gray-100',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={cn('rounded-lg', variants[variant], paddings[padding])}>
      {children}
    </div>
  );
}
```

### 5. Prettier Plugin for Class Ordering

```bash
npm install -D prettier prettier-plugin-tailwindcss
```

```json
// .prettierrc
{
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindFunctions": ["cva", "cn", "clsx"]
}
```

---

## Tailwind Merge

### Installation

```bash
npm install tailwind-merge
```

### Basic Usage

```typescript
import { twMerge } from 'tailwind-merge';

// Conflicting classes resolved - last value wins
twMerge('px-2 py-1 bg-red hover:bg-dark-red', 'p-3 bg-[#B91C1C]')
// Returns: 'hover:bg-dark-red p-3 bg-[#B91C1C]'

// Padding conflict resolved
twMerge('px-4 py-2', 'p-6')
// Returns: 'p-6'

// Color conflict resolved
twMerge('bg-blue-500', 'bg-red-500')
// Returns: 'bg-red-500'
```

### The cn() Utility (Recommended Pattern)

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// Combines conditional classes (clsx) with merge conflict resolution (twMerge)
cn(
  'px-4 py-2 rounded',           // Base classes
  isActive && 'bg-blue-500',      // Conditional
  isDisabled && 'opacity-50',     // Another conditional
  className                        // Override from props
)
```

### Component Example

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-lg font-medium transition-colors',
        {
          'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
        },
        className
      )}
      {...props}
    />
  );
}

// Consumer can override any class
<Button className="px-8 bg-purple-600 hover:bg-purple-700">
  Custom Button
</Button>
```

### Performance Considerations

- tailwind-merge caches results for performance
- Safe for use in render functions
- Consider memoization only for extremely dynamic interfaces
- Bundle size impact is minimal for most applications

---

## Class Variance Authority (CVA)

### Installation

```bash
npm install class-variance-authority
```

### Basic Usage

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const button = cva(
  // Base classes (always applied)
  ['font-semibold', 'border', 'rounded', 'transition-colors'],
  {
    // Variant definitions
    variants: {
      intent: {
        primary: [
          'bg-blue-600',
          'text-white',
          'border-transparent',
          'hover:bg-blue-700',
        ],
        secondary: [
          'bg-white',
          'text-gray-800',
          'border-gray-400',
          'hover:bg-gray-100',
        ],
        danger: [
          'bg-red-600',
          'text-white',
          'border-transparent',
          'hover:bg-red-700',
        ],
      },
      size: {
        sm: ['text-sm', 'py-1', 'px-3'],
        md: ['text-base', 'py-2', 'px-4'],
        lg: ['text-lg', 'py-3', 'px-6'],
      },
      disabled: {
        true: ['opacity-50', 'cursor-not-allowed'],
        false: [],
      },
    },
    // Compound variants (when multiple conditions match)
    compoundVariants: [
      {
        intent: 'primary',
        size: 'lg',
        class: 'uppercase tracking-wide',
      },
      {
        intent: ['primary', 'danger'],
        disabled: true,
        class: 'pointer-events-none',
      },
    ],
    // Default values
    defaultVariants: {
      intent: 'primary',
      size: 'md',
      disabled: false,
    },
  }
);

// TypeScript type extraction
type ButtonVariants = VariantProps<typeof button>;
```

### React Component with CVA

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
```

### CVA with Tailwind Merge

```typescript
import { cva } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const button = cva(/* ... */);

// Wrap with twMerge for conflict resolution
function getButtonClasses(props) {
  return twMerge(button(props));
}
```

### Type-Safe Props

```typescript
import { type VariantProps } from 'class-variance-authority';

const card = cva('rounded-lg', {
  variants: {
    shadow: {
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
    },
  },
  defaultVariants: {
    shadow: 'md',
  },
});

// Extract types for props
type CardProps = VariantProps<typeof card>;
// { shadow?: 'sm' | 'md' | 'lg' | null | undefined }
```

---

## Performance Optimization

### Content Configuration Best Practices

```javascript
// tailwind.config.js
module.exports = {
  content: [
    // Be specific with paths
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',

    // Include component libraries if using Tailwind classes
    './node_modules/@acme/ui/**/*.{js,jsx}',
  ],

  // Don't include these
  // './node_modules/**/*' - Too broad, slows builds
  // './**/*' - Too broad
}
```

### JIT Mode (Default in v3+)

JIT generates only used classes, eliminating the need for purging:

- Development CSS matches production
- All variants available without configuration
- Arbitrary values supported
- Fast incremental rebuilds (~3ms)

### Avoid Dynamic Class Construction

```tsx
// BAD: Can't be detected
<div className={`text-${color}-500`} />

// GOOD: Complete class names
const colors = {
  red: 'text-red-500',
  blue: 'text-blue-500',
};
<div className={colors[color]} />
```

### Production Build Optimization

```bash
# Tailwind v3 with PostCSS
NODE_ENV=production npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify

# Tailwind v4 with CLI
npx @tailwindcss/cli -i input.css -o output.css --minify
```

### Bundle Size Tips

1. **Use component abstraction** instead of @apply when possible
2. **Avoid safelist unless necessary** - it bypasses tree-shaking
3. **Exclude unused files** from content paths
4. **Use the Vite plugin** in v4 for best performance
5. **Don't import entire Tailwind** if only using subset

### Lighthouse/Performance Checklist

- [ ] Minify CSS in production
- [ ] Enable gzip/brotli compression
- [ ] Use CSS-in-JS caching if applicable
- [ ] Lazy load above-the-fold critical CSS
- [ ] Audit for unused utilities with browser dev tools

---

## Migration Guide: v3 to v4

### Key Breaking Changes

| v3 | v4 |
|---|---|
| `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| `tailwind.config.js` | CSS-based config with `@theme` |
| `shadow-sm` | `shadow-xs` |
| `shadow` | `shadow-sm` |
| `rounded-sm` | `rounded-xs` |
| `ring` | `ring-3` |
| `outline-none` | `outline-hidden` |
| `!flex` (important) | `flex!` |
| Ring color: `blue-500` | `currentColor` |
| Border color: `gray-200` | `currentColor` |

### Automated Migration

```bash
npx @tailwindcss/upgrade
```

The upgrade tool handles:
- Updating dependencies
- Migrating config to CSS
- Renaming utilities
- Updating template files

### Manual Migration Steps

1. **Update imports**
   ```css
   /* Before */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   /* After */
   @import "tailwindcss";
   ```

2. **Migrate theme to CSS**
   ```css
   @import "tailwindcss";

   @theme {
     --color-brand: #3b82f6;
     --font-display: "Inter", sans-serif;
   }
   ```

3. **Update build tools**
   ```javascript
   // PostCSS
   export default {
     plugins: { "@tailwindcss/postcss": {} }
   };

   // Vite
   import tailwindcss from "@tailwindcss/vite";
   export default defineConfig({
     plugins: [tailwindcss()]
   });
   ```

4. **Update utility names** (see table above)

5. **Update important modifier**
   ```html
   <!-- Before -->
   <div class="!flex"></div>

   <!-- After -->
   <div class="flex!"></div>
   ```

6. **Check browser support**
   - v4 requires Safari 16.4+, Chrome 111+, Firefox 128+
   - Stick with v3.4 if you need older browser support

---

## Sources

### Official Documentation
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS v3 Configuration](https://v3.tailwindcss.com/docs/configuration)
- [Tailwind CSS Theme Configuration](https://v3.tailwindcss.com/docs/theme)
- [Tailwind CSS Plugins](https://v3.tailwindcss.com/docs/plugins)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Tailwind CSS Adding Custom Styles](https://tailwindcss.com/docs/adding-custom-styles)
- [Tailwind CSS Content Detection](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [Tailwind CSS Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [Tailwind CSS v3 Content Configuration](https://v3.tailwindcss.com/docs/content-configuration)

### JIT Mode
- [Tailwind CSS JIT Mode](https://v2.tailwindcss.com/docs/just-in-time-mode)
- [Just-In-Time: The Next Generation of Tailwind CSS](https://tailwindcss.com/blog/just-in-time-the-next-generation-of-tailwind-css)
- [Understanding JIT Mode for Tailwind CSS](https://patrickkarsh.medium.com/understanding-just-in-time-jit-mode-for-tailwind-css-c4aee27c5ab8)

### Design Tokens
- [Tailwind CSS 4 @theme: The Future of Design Tokens](https://medium.com/@sureshdotariya/tailwind-css-4-theme-the-future-of-design-tokens-at-2025-guide-48305a26af06)
- [Design Tokens with Tailwind CSS Guide](https://nicolalazzari.ai/articles/integrating-design-tokens-with-tailwind-css)
- [Tailwind CSS Theme Variables](https://tailwindcss.com/docs/theme)

### React Best Practices
- [Frontend Handbook - Tailwind Best Practices](https://infinum.com/handbook/frontend/react/tailwind/best-practices)
- [TailwindCSS + React Best Practices](https://dev.to/gabrielmlinassi/tailwindcss-react-best-practices-the-clean-way-3dka)
- [5 Best Practices for Preventing Chaos in Tailwind CSS](https://evilmartians.com/chronicles/5-best-practices-for-preventing-chaos-in-tailwind-css)
- [Best Use of Tailwind CSS with React in 2025](https://reactmasters.in/best-use-of-tailwind-css-with-react/)

### Tailwind Merge
- [tailwind-merge GitHub](https://github.com/dcastil/tailwind-merge)
- [Tailwind Merge NPM](https://www.npmjs.com/package/tailwind-merge)
- [Mastering Tailwind CSS with Tailwind Merge and clsx](https://dev.to/sheraz4194/mastering-tailwind-css-overcome-styling-conflicts-with-tailwind-merge-and-clsx-1dol)

### Class Variance Authority (CVA)
- [CVA Documentation](https://cva.style/docs)
- [CVA Variants](https://cva.style/docs/getting-started/variants)
- [Simplifying Component Variants with CVA](https://fveracoechea.com/blog/cva-and-tailwind/)
- [CVA React with Tailwind CSS](https://cva.style/docs/examples/react/tailwind-css)

### Performance
- [Tailwind CSS Performance Optimization](https://tailgrids.com/blog/tailwind-css-best-practices-and-performance-optimization)
- [Tailwind CSS 4 Performance Checklist](https://medium.com/@sureshdotariya/tailwind-css-4-performance-checklist-for-2025-apps-build-fast-tiny-and-scalable-7fc14ea58c89)
- [Tailwind CSS v3 Optimizing for Production](https://v3.tailwindcss.com/docs/optimizing-for-production)

### Migration
- [Moving from Tailwind 3 to Tailwind 4](https://www.9thco.com/labs/moving-from-tailwind-3-to-tailwind-4)
- [Tailwind v4 shadcn/ui Guide](https://ui.shadcn.com/docs/tailwind-v4)
- [Setting Up Tailwind CSS v4.0](https://bryananthonio.com/blog/configuring-tailwind-css-v4/)

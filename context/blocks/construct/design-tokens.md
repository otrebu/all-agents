---
depends: []
tags: [core]
---

# Design Tokens

Platform-agnostic variables for colors, spacing, typography, and theming. Single source of truth for design decisions.

## Token Hierarchy

```
Primitive → Semantic → Component
```

Also known as: Global/Alias/Component (IBM Carbon, DTCG).

| Layer | Purpose | Example |
|-------|---------|---------|
| **Primitive** | Raw values, no context | `--color-blue-500: #3b82f6` |
| **Semantic** | Purpose/role | `--color-primary: var(--color-blue-500)` |
| **Component** | Specific usage | `--button-bg: var(--color-primary)` |

## Naming Convention

```
--{category}-{property}-{element}-{variant}-{state}
```

Examples:
- `--color-background-surface` (semantic)
- `--color-text-primary` (semantic)
- `--spacing-md` (primitive)
- `--button-background-primary-hover` (component)

## CSS Custom Properties

```css
:root {
  color-scheme: light dark;

  /* Primitives */
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --color-gray-50: #f9fafb;
  --color-gray-900: #111827;

  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;
  --spacing-8: 2rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;

  /* Semantic */
  --color-primary: var(--color-blue-500);
  --color-primary-hover: var(--color-blue-600);
  --color-background: var(--color-gray-50);
  --color-text: var(--color-gray-900);
}
```

## Dark Mode

```css
:root {
  color-scheme: light dark;
  --color-background: var(--color-gray-50);
  --color-text: var(--color-gray-900);
}

:root.dark {
  --color-background: var(--color-gray-900);
  --color-text: var(--color-gray-50);
}
```

Or with `prefers-color-scheme`:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: var(--color-gray-900);
    --color-text: var(--color-gray-50);
  }
}
```

## Token Categories

| Category | Tokens |
|----------|--------|
| **Color** | background, text, border, primary, secondary, error, success |
| **Spacing** | xs, sm, md, lg, xl (T-shirt) or 1-12 (granular scale) |
| **Typography** | font-family, font-size, font-weight, line-height |
| **Border** | radius, width |
| **Shadow** | sm, md, lg |
| **Motion** | duration, easing (respect `prefers-reduced-motion`) |

## Standard Format (DTCG)

W3C Design Tokens Community Group defines `.tokens.json` interchange format:

```json
{
  "color": {
    "primary": {
      "$value": "#3b82f6",
      "$type": "color"
    }
  }
}
```

## Multi-Platform (Style Dictionary)

Transform tokens to CSS, iOS, Android from single source:

```bash
# install
install -D style-dictionary
```

```javascript
// config.js
export default {
  source: ["tokens/**/*.json"],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: "dist/",
      files: [{ destination: "tokens.css", format: "css/variables" }],
    },
  },
};
```

## TypeScript Access

```typescript
export const tokens = {
  color: {
    primary: "var(--color-primary)",
    background: "var(--color-background)",
  },
  spacing: {
    sm: "var(--spacing-2)",
    md: "var(--spacing-4)",
  },
} as const;
```

Design tokens = consistency, theming, multi-platform, design-dev handoff.

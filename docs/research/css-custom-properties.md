# CSS Custom Properties (CSS Variables)

**Last Updated**: 2025-12-25
**Sources**: MDN, Tailwind CSS v4 Docs, web.dev, Modern CSS Solutions

---

## Overview

CSS Custom Properties enable runtime-dynamic styling without JavaScript overhead. With Tailwind CSS v4's `@theme` directive and the new `@property` rule for typed variables, they're now the foundation of modern design systems.

---

## 1. Core Syntax

### Definition & Usage

```css
:root {
  --color-primary: #3b82f6;
  --spacing-unit: 0.25rem;
}

.button {
  background: var(--color-primary);
  padding: calc(var(--spacing-unit) * 4);  /* 1rem */
}
```

### Fallback Values

```css
.card {
  /* Fallback if --card-bg undefined */
  background: var(--card-bg, #ffffff);

  /* Chained fallbacks */
  color: var(--card-text, var(--text-primary, #000));
}
```

### Scope & Inheritance

```css
/* Global scope */
:root { --color-primary: blue; }

/* Component scope - only within .card */
.card { --card-padding: 1.5rem; }

/* Theme section override */
.dark-section { --color-primary: #60a5fa; }
```

---

## 2. The @property Rule (2024 Baseline)

The `@property` at-rule (CSS Houdini) enables **typed CSS variables** with type checking, inheritance control, and default values. Cross-browser since Firefox 128 (July 2024).

### Syntax

```css
@property --my-color {
  syntax: "<color>";
  inherits: true;
  initial-value: lightgray;
}
```

### Key Benefits

| Feature | Regular CSS Vars | @property |
|---------|-----------------|-----------|
| Type checking | No | Yes |
| Default value | Manual fallback | Built-in |
| Inheritance control | Always inherits | Configurable |
| Animate gradients | No | Yes |

### Valid Syntax Types

- `<color>` - Color values
- `<length>` - px, rem, em, etc.
- `<number>` - Unitless numbers
- `<percentage>` - Percentage values
- `<length-percentage>` - Either
- `<integer>` - Whole numbers
- `<angle>` - deg, rad, turn
- `<time>` - s, ms
- `<url>` - URL values
- `*` - Any value

### Animating Gradients (Previously Impossible)

```css
@property --gradient-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

.animated-gradient {
  background: linear-gradient(var(--gradient-angle), #ff6b6b, #4ecdc4);
  transition: --gradient-angle 0.5s;
}

.animated-gradient:hover {
  --gradient-angle: 180deg;
}
```

---

## 3. Design Token Architecture

### Three-Tier Token System

```
┌─────────────────────────────────────┐
│         COMPONENT TOKENS            │
│  --button-bg, --card-shadow         │
├─────────────────────────────────────┤
│         SEMANTIC TOKENS             │
│  --color-primary, --spacing-md      │
├─────────────────────────────────────┤
│         PRIMITIVE TOKENS            │
│  --blue-500, --space-4, --font-sans │
└─────────────────────────────────────┘
```

### Example Token Files

```css
/* tokens/primitives.css */
:root {
  --blue-500: #3b82f6;
  --blue-600: #2563eb;
  --gray-50: #f9fafb;
  --gray-900: #111827;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --radius-md: 0.375rem;
}

/* tokens/semantic.css */
:root {
  --color-primary: var(--blue-500);
  --color-background: var(--gray-50);
  --color-text: var(--gray-900);
  --spacing-md: var(--space-4);
}

/* tokens/components.css */
:root {
  --button-bg: var(--color-primary);
  --button-radius: var(--radius-md);
  --card-padding: var(--spacing-md);
}
```

---

## 4. Tailwind CSS v4 Integration

Tailwind v4 (released 2024) introduces **CSS-first configuration** with the `@theme` directive. All design tokens become CSS variables by default.

### @theme Directive

```css
@import "tailwindcss";

@theme {
  --color-primary: hsl(220, 90%, 56%);
  --color-secondary: hsl(210, 40%, 50%);
  --font-sans: system-ui, sans-serif;
  --radius-lg: 0.5rem;
}
```

Tailwind auto-generates utilities: `bg-primary`, `text-secondary`, `font-sans`, `rounded-lg`.

### @theme vs :root

| Use Case | Directive |
|----------|-----------|
| Want utility class generated | `@theme` |
| Regular CSS variable only | `:root` |

```css
@theme {
  --color-brand: #1a73e8;  /* Creates bg-brand, text-brand */
}

:root {
  --animation-duration: 200ms;  /* No utility, just a variable */
}
```

### Multi-Theme Support

```css
@import "tailwindcss";

@theme inline {
  --color-primary: var(--primary);
  --color-background: var(--bg);
}

@layer base {
  :root {
    --primary: #3b82f6;
    --bg: #ffffff;
  }
  .dark {
    --primary: #60a5fa;
    --bg: #0f172a;
  }
}
```

### shadcn/ui Pattern (HSL Values)

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
  }
}
```

```js
// tailwind.config.js (v3) or @theme (v4)
colors: {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
  },
}
```

---

## 5. React Integration

### Setting Variables in Components

```tsx
function DynamicCard({ accentColor }: { accentColor: string }) {
  return (
    <div
      style={{ '--card-accent': accentColor } as React.CSSProperties}
      className="border-l-4 border-[var(--card-accent)] p-4"
    >
      Content with dynamic accent
    </div>
  );
}
```

### Reading Variables in JS

```tsx
function useComputedVar(varName: string) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const computed = getComputedStyle(document.documentElement)
      .getPropertyValue(varName).trim();
    setValue(computed);
  }, [varName]);

  return value;
}

// For canvas, SVG, or non-CSS usage
const primaryColor = useComputedVar('--color-primary');
```

### Theme Toggle

```tsx
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### CSS Vars vs React Context

| Aspect | CSS Variables | React Context |
|--------|--------------|---------------|
| Re-renders | None | All consumers |
| RSC support | Full | Client-only |
| Animation | CSS transitions | JS required |
| Use for | Colors, spacing, typography | Complex state, logic |

**Best practice**: Use CSS vars for theming, Context only for non-CSS data.

---

## 6. Best Practices

### Naming Conventions

```css
/* Kebab-case, semantic naming */
--color-primary
--color-text-muted
--spacing-section-lg
--font-weight-bold

/* Prefix for scoping */
--acme-widget-bg    /* Third-party */
--button-padding    /* Component-specific */
```

### File Organization

```
styles/
├── tokens/
│   ├── primitives.css
│   ├── semantic.css
│   └── components.css
├── themes/
│   ├── light.css
│   └── dark.css
└── globals.css
```

### Performance Tips

1. **Define at :root** for global vars (computed once)
2. **Avoid deep nesting** for var definitions
3. **Batch theme changes** with class toggle, not individual `setProperty`
4. **Use @property** for values that need animation

---

## 7. Browser Support

| Feature | Support |
|---------|---------|
| CSS Custom Properties | Baseline 2016 (all browsers) |
| @property | Baseline 2024 (Chrome 85+, Firefox 128+, Safari 15.4+) |

---

## Sources

- [MDN: CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties)
- [MDN: @property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@property)
- [Tailwind CSS v4.0 Blog](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS Theme Variables](https://tailwindcss.com/docs/theme)
- [Modern CSS: @property Type Definitions](https://moderncss.dev/providing-type-definitions-for-css-with-at-property/)
- [web.dev: Custom Properties](https://web.dev/learn/css/custom-properties)
- [Design Tokens with Tailwind CSS Guide](https://www.design-tokens.dev/guides/tailwind-css)

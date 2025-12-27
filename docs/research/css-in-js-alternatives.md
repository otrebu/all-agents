# CSS-in-JS Alternatives

**Last Updated**: 2025-12-25
**Sources**: Josh W. Comeau, LogRocket, DEV Community, Meerako, npm-compare

---

## Overview

Runtime CSS-in-JS (styled-components, Emotion) faces critical problems in 2025: React Server Components incompatibility, SSR hydration issues, and performance overhead. The industry is shifting to zero-runtime alternatives: **Tailwind CSS**, **CSS Modules**, and modern vanilla CSS.

---

## 1. Why CSS-in-JS is Problematic (2024-2025)

### Runtime Performance Cost

> "CSS-in-JS increases run-time overhead: when components are rendered, the CSS-in-JS libraries have to convert their styles into plain CSS... this is bad for performance on a fundamental level."

| Library | Bundle Size (min+gzip) | Runtime Parsing |
|---------|------------------------|-----------------|
| styled-components | 12.7 KB | Yes |
| Emotion | 7.9 KB | Yes |
| Tailwind CSS | 0 KB JS | No |
| CSS Modules | 0 KB JS | No |

### React Server Components Incompatibility

CSS-in-JS libraries are **"notoriously problematic with React Server Components"**:

- RSC executes on server with no client JS
- styled-components/Emotion require `'use client'` directive
- Defeats the purpose of RSC (zero JS)
- No clear migration path for existing codebases

```tsx
// BROKEN: Can't use in Server Component
import styled from 'styled-components';

// REQUIRED: Must mark as client component
'use client';
import styled from 'styled-components';
```

### SSR Hydration Problems

> "Traditional runtime CSS-in-JS libraries crash during SSR or cause hydration mismatches, slowing page loads and breaking layouts."

Common issues:
- **Flash of Unstyled Content (FOUC)**
- **Hydration mismatch** between server/client
- **Multiple Emotion instances** causing style conflicts
- **Style insertion order** problems with component libraries

### Bundle Size Reality

Real-world comparison:
> "Projects using CSS Modules had smaller JavaScript and CSS bundle sizes compared to those using Styled Components."

---

## 2. Industry Shift (2024-2025)

Major libraries abandoning runtime CSS-in-JS:

| Library | Status |
|---------|--------|
| **Material UI v6** | Moving to zero-runtime (Pigment CSS) |
| **Chakra UI** | Created Panda CSS (build-time) |
| **Mantine v7** | Dropped Emotion, using CSS Modules |
| **Pigment CSS** | Stalled (no updates in 7 months as of late 2024) |

> "Many frontend teams now default to Tailwind CSS for all new Next.js projects in 2025."

---

## 3. Tailwind CSS as Primary Alternative

### Why Tailwind Wins

| Aspect | CSS-in-JS | Tailwind |
|--------|-----------|----------|
| Runtime JS | 8-13 KB | 0 KB |
| RSC Compatible | No | Yes |
| SSR Complexity | High | None |
| Design System | Manual discipline | Config-enforced |
| "Rogue values" | Easy to break | Impossible |

> "With CSS-in-JS, there's 'Design Drift'—it's too easy to write `color: #123456;` breaking the Design System. With Tailwind, you're forced to use pre-defined values."

### Zero Runtime = Performance

- No style parsing at runtime
- No hydration of styles
- Static CSS file, fully cacheable
- Works perfectly with streaming SSR

### JIT Compilation

```bash
# Only generates CSS for classes you use
npx tailwindcss -o output.css --minify
# Result: 10-30 KB for typical app
```

### When Tailwind is Best

- Next.js App Router / RSC projects
- Performance-critical applications
- Design system enforcement needed
- Team scaling (standardized vocabulary)
- Rapid prototyping

---

## 4. CSS Modules as Secondary Alternative

### Zero Runtime, Familiar Syntax

```css
/* Button.module.css */
.button {
  padding: 0.5rem 1rem;
  background: blue;
}
```

```tsx
import styles from './Button.module.css';

export function Button({ children }) {
  return <button className={styles.button}>{children}</button>;
}
```

### When to Use CSS Modules

| Scenario | Why CSS Modules |
|----------|-----------------|
| Complex pseudo-elements | Full CSS power |
| Existing CSS expertise | Familiar syntax |
| Component libraries | Maximum compatibility |
| Third-party style customization | Direct CSS access |
| Migration from CSS-in-JS | Similar mental model |

### Tailwind + CSS Modules Combo

```tsx
// Complex animation in CSS Module
import styles from './AnimatedCard.module.css';
import { cn } from '@/lib/utils';

export function AnimatedCard({ className, children }) {
  return (
    <div className={cn(styles.card, 'p-4 rounded-lg', className)}>
      {children}
    </div>
  );
}
```

---

## 5. Zero-Runtime CSS-in-JS Options

If you need CSS-in-JS syntax without runtime:

| Library | Status | Notes |
|---------|--------|-------|
| **Vanilla Extract** | Active | TypeScript-first, great DX |
| **Panda CSS** | Active | From Chakra team, RSC-ready |
| **StyleX** | Active | Meta's solution, used at scale |
| **Linaria** | Maintained | Babel-based extraction |

```tsx
// Vanilla Extract example
import { style } from '@vanilla-extract/css';

export const button = style({
  padding: '0.5rem 1rem',
  background: 'blue',
});
```

Compiled to static CSS at build time.

---

## 6. Decision Framework

### Quick Decision Tree

```
Need RSC support?
├─ Yes → Tailwind or CSS Modules
└─ No (client-only SPA) → CSS-in-JS acceptable

Building component library?
├─ Yes → CSS Modules (max compatibility)
└─ No → Tailwind (faster development)

Complex dynamic styling at runtime?
├─ Minimal → Tailwind + CSS variables
└─ Heavy → Consider Vanilla Extract or CSS-in-JS with 'use client'
```

### By Project Type

| Project | Recommended | Alternative |
|---------|-------------|-------------|
| Next.js App Router | Tailwind + shadcn/ui | CSS Modules |
| Vite SPA | Tailwind | Panda CSS |
| Component Library | CSS Modules | Vanilla Extract |
| Marketing Site | Tailwind or Vanilla CSS | - |

---

## 7. Migration Guide

### styled-components → Tailwind

```tsx
// Before
const Button = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.primary ? 'blue' : 'gray'};
  color: white;
  border-radius: 0.25rem;
  &:hover { opacity: 0.9; }
`;

// After (with cva)
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'px-4 py-2 text-white rounded hover:opacity-90',
  {
    variants: {
      variant: {
        primary: 'bg-blue-500',
        secondary: 'bg-gray-500',
      },
    },
    defaultVariants: { variant: 'secondary' },
  }
);

function Button({ variant, children }) {
  return <button className={buttonVariants({ variant })}>{children}</button>;
}
```

### Emotion → CSS Modules

```tsx
// Before
const cardStyle = css`
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

// After
// Card.module.css
.card {
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

// Card.tsx
import styles from './Card.module.css';
```

### Incremental Migration Strategy

1. **Containment**: Add `'use client'` to all CSS-in-JS components
2. **Shared tokens**: Create CSS variables both systems can use
3. **New = Tailwind**: All new components use Tailwind
4. **Leaf-first migration**: Start with simple components
5. **Track progress**: ESLint rule to flag CSS-in-JS imports

---

## 8. Stack Recommendation (2025)

### Primary Stack

```
Tailwind CSS v4
├── @theme directive for design tokens
├── CSS custom properties for dynamic values
├── class-variance-authority (cva) for variants
├── tailwind-merge for class deduplication
└── shadcn/ui for accessible primitives
```

### Add CSS Modules When

- Complex `::before`/`::after` styling
- Keyframe animations
- Third-party CSS overrides
- Legacy CSS integration

### Avoid Runtime CSS-in-JS

Unless:
- Client-only SPA where bundle size doesn't matter
- Heavy dynamic styling that can't use CSS variables
- Existing codebase with no migration budget

---

## Comparison Summary

| Feature | CSS-in-JS | Tailwind | CSS Modules |
|---------|-----------|----------|-------------|
| Runtime JS | 8-13 KB | 0 | 0 |
| RSC Compatible | No | Yes | Yes |
| SSR Complexity | High | None | None |
| Dynamic Styles | Excellent | CSS vars | CSS vars |
| Design System | Manual | Config-enforced | Manual |
| Learning Curve | Medium | Medium | Low |
| **2025 Status** | Migrate away | Primary choice | Secondary |

---

## Sources

- [Josh W. Comeau: CSS in React Server Components](https://www.joshwcomeau.com/react/css-in-rsc/)
- [Why We're Breaking Up with CSS-in-JS](https://dev.to/srmagura/why-were-breaking-up-wiht-css-in-js-4g9b)
- [Meerako: Tailwind CSS vs CSS-in-JS 2025](https://www.meerako.com/blogs/tailwind-css-vs-css-in-js-modern-css-styling-guide-2025)
- [CSS-in-JS Challenges with Server Components](https://medium.com/@kamil.kusy111/css-in-js-challenges-adapting-to-server-components-server-side-rendering-with-zero-runtime-9b8d22cac62a)
- [The 2025 CSS-in-JS Crisis](https://markaicode.com/css-in-js-crisis-server-rendering-solutions-react-22/)
- [Styled Components vs CSS Modules](https://caisy.io/blog/styled-components-vs-css-modules)
- [npm-compare: CSS styling libraries](https://npm-compare.com/@stylexjs/stylex,emotion,jss,styled-components,styled-system,tailwindcss)
- [LogRocket: styled-components vs Emotion](https://blog.logrocket.com/styled-components-vs-emotion-for-handling-css/)

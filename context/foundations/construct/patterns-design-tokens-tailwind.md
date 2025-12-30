---
depends:
  - "@context/blocks/construct/design-tokens.md"
  - "@context/blocks/construct/tailwind.md"
---

# Design Token System with Tailwind v4

Implement tokens via CSS custom properties + Tailwind v4 `@theme` for utility-class access.

## References

@context/blocks/construct/design-tokens.md
@context/blocks/construct/tailwind.md

---

## Token File Structure

```
src/
└── styles/
    ├── tokens.css        # all tokens + themes
    └── app.css           # imports tailwind + tokens
```

---

## Color Tokens

```css
/* src/styles/tokens.css */

@theme {
  /* Primitives */
  --color-blue-50: #eff6ff;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --color-blue-700: #1d4ed8;

  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;

  --color-red-500: #ef4444;
  --color-green-500: #22c55e;

  /* Semantic */
  --color-primary: var(--color-blue-500);
  --color-primary-hover: var(--color-blue-600);
  --color-primary-active: var(--color-blue-700);

  --color-background: var(--color-gray-50);
  --color-surface: white;
  --color-foreground: var(--color-gray-900);
  --color-muted: var(--color-gray-700);

  --color-border: var(--color-gray-200);
  --color-error: var(--color-red-500);
  --color-success: var(--color-green-500);
}
```

Tailwind v4 auto-generates utilities: `bg-primary`, `text-foreground`, `border-border`.

---

## Dark Theme

```css
/* src/styles/tokens.css (continued) */

.dark {
  --color-background: var(--color-gray-900);
  --color-surface: var(--color-gray-800);
  --color-foreground: var(--color-gray-50);
  --color-muted: var(--color-gray-200);
  --color-border: var(--color-gray-700);
}
```

---

## App CSS

```css
/* src/styles/app.css */
@import "tailwindcss";
@import "./tokens.css";
```

Usage:

```tsx
<div className="bg-background text-foreground border-border">
  <button className="bg-primary hover:bg-primary-hover">Click me</button>
</div>
```

---

## Theme Switching

```tsx
// hooks/useTheme.ts
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

    function apply() {
      const isDark =
        theme === "dark" || (theme === "system" && systemDark.matches);
      root.classList.toggle("dark", isDark);
    }

    apply();
    localStorage.setItem("theme", theme);

    if (theme === "system") {
      systemDark.addEventListener("change", apply);
      return () => systemDark.removeEventListener("change", apply);
    }
  }, [theme]);

  return { theme, setTheme };
}
```

```tsx
// components/ThemeToggle.tsx
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

---

## Prevent Flash (SSR/SSG)

Add to `<head>` before body renders:

```html
<script>
  (function () {
    const theme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    if (theme === "dark" || (theme !== "light" && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  })();
</script>
```

---

## When to Use

| Scenario          | Token System | Alternative       |
| ----------------- | ------------ | ----------------- |
| Multi-theme app   | Yes          | -                 |
| Design system     | Yes          | -                 |
| shadcn/ui project | Partial      | shadcn's CSS vars |
| Single-theme app  | Maybe        | Tailwind defaults |

## When NOT to Use

- **Prototyping** → Use Tailwind defaults directly
- **Simple static site** → Overkill, use CSS directly
- **shadcn/ui** → Already has token system, extend it instead

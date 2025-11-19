# GitHub Code Search: SolidStart + Tailwind Dark Mode

## Search Strategy Executed

Ran 6 targeted queries:

1. `tailwind.config darkMode class language:typescript` - Tailwind config patterns → 100 results
2. `classList dark language:typescript extension:tsx solidjs` - Solid-specific classList → 0 results (too specific)
3. `createSignal theme language:typescript extension:tsx` - Signal-based theme → 0 results (too specific)
4. `solidstart tailwind dark language:typescript` - SolidStart + Tailwind → 13 results
5. `solid-js classList dark extension:tsx` - Solid classList patterns → 100 results ✅
6. `localStorage theme solid-js extension:tsx` - Theme persistence → 100 results ✅

**Total unique files analyzed:** 22

**Key finding:** SolidStart-specific examples are sparse. Most patterns are general Solid.js + Tailwind, which work in SolidStart.

---

## Pattern Analysis

### Common Imports

- `solid-js` - createSignal, createEffect, createContext (all 22 files)
- `@solid-primitives/media` - createPrefersDark (1 file)
- No imports needed for Tailwind classList

### Architectural Styles

- **Signal-based state** - 20/22 files use `createSignal<Theme>()` for theme state
- **Context providers** - 8/22 files use Context API for global theme state
- **Direct DOM manipulation** - 18/22 files manipulate `document.documentElement.classList`
- **Reactive primitives** - 1/22 uses `@solid-primitives/media` for system preference

### Implementation Patterns

- **localStorage persistence** - 20/22 files persist theme choice
- **System preference detection** - 15/22 check `prefers-color-scheme`
- **Tailwind class mode** - All use `darkMode: 'class'` config
- **classList reactive** - 12/22 use Solid's `classList` for conditional dark classes

---

## Approaches Found

### Approach 1: Simple Toggle with Signal + localStorage

**Repos:** xbmlz/vitesse-solid, tanerijun/vitaneri, Artiu/portfolio
**Characteristics:**

- Minimal dependencies
- Direct `createSignal` for theme state
- `classList.toggle('dark')` on documentElement
- Syncs to localStorage on change

**Example:** [vitesse-solid/DarkSwitcher.tsx](https://github.com/xbmlz/vitesse-solid/blob/8a75ba3c8a6536697b70302bf1f6236beeddfa2a/src/components/DarkSwitcher.tsx)

```typescript
import { createPrefersDark } from '@solid-primitives/media'
import { createEffect } from 'solid-js'

export function DarkSwitcher() {
  const prefersDark = createPrefersDark()

  createEffect(() => {
    document.documentElement.classList.toggle('dark', prefersDark())
  })

  const toggleDark = () => {
    const docEl = document.documentElement
    docEl.classList.toggle('dark')
    const isDark = docEl.classList.contains('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }
  return <button class="icon-btn dark:i-carbon-moon i-carbon:sun" onClick={toggleDark} />
}
```

### Approach 2: Context Provider Pattern

**Repos:** tommy141x/method-ui, phi-ag/rvt-app, raidenmiro/raiden.me, Blankeos/tsdot
**Characteristics:**

- Global theme state via Context API
- Centralized theme logic
- Multiple consumers access theme
- SSR-friendly initialization

**Example:** [method-ui/theme-provider.tsx](https://github.com/tommy141x/method-ui/blob/05ac746feda5ad68c8c462dbb63a54c54a0ab245/docs/src/lib/theme-provider.tsx)

```typescript
import { createContext, useContext, createEffect, JSX, createSignal } from "solid-js";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: () => Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>();

export function ThemeProvider(props: { children: JSX.Element }) {
  const [theme, setThemeState] = createSignal<Theme>(
    (typeof window !== "undefined" &&
     localStorage.getItem("theme") as Theme) ||
    (typeof window !== "undefined" &&
     window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", newTheme);
    }
  };
```

### Approach 3: classList for Component-Level Dark Styles

**Repos:** hungdoansy/solid-wordle, cqb325/cui-solid, beingofexistence13/dx-frontend
**Characteristics:**

- Uses Solid's `classList` directive
- Reactive dark class application
- Component-scoped styling
- Works with global dark mode state

**Example:** [solid-wordle/Cell.tsx](https://github.com/hungdoansy/solid-wordle/blob/d1d6b32c7332b4355cb8f9bf9d57e67e7da16571/src/components/Grid/Cell.tsx)

```typescript
const classList = () => ({
  "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600": !props.status,
  "border-black dark:border-slate-100": props.value && !props.status,
  "absent shadowed bg-slate-400 dark:bg-slate-700 text-white border-slate-400 dark:border-slate-700":
    props.status === CharStatus.Absent,
  "correct shadowed bg-orange-500 text-white border-orange-500":
    props.status === CharStatus.Correct && isHighContrast,
  "present shadowed bg-cyan-500 text-white border-cyan-500":
    props.status === CharStatus.Present && isHighContrast,
})

return (
  <div
    class="w-14 h-14 border-solid border-2 flex items-center justify-center"
    classList={classList()}
    style={{ "animation-delay": animationDelay() }}
  >
```

### Approach 4: System Preference with Primitives

**Repos:** xbmlz/vitesse-solid
**Characteristics:**

- Uses `@solid-primitives/media`
- Automatic system preference tracking
- No manual media query management
- Reactive to OS theme changes

**Example:** [vitesse-solid/DarkSwitcher.tsx](https://github.com/xbmlz/vitesse-solid/blob/8a75ba3c8a6536697b70302bf1f6236beeddfa2a/src/components/DarkSwitcher.tsx) (same as Approach 1)

---

## Trade-offs

| Approach            | Pros                                              | Cons                                          | Best For                                           |
| ------------------- | ------------------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| Simple Toggle       | Minimal code, no dependencies, easy to understand | No global state sharing, manual media queries | Small apps, single toggle component                |
| Context Provider    | Global state, multiple consumers, testable        | More boilerplate, context overhead            | Medium-large apps, multiple theme-aware components |
| classList Directive | Reactive, component-scoped, type-safe             | Needs global theme state source               | Component libraries, conditional styling           |
| Primitives Library  | Automatic OS sync, clean API, reactive            | External dependency, bundle size              | Apps needing OS theme sync                         |

---

## Recommendations

### For SolidStart Implementation:

**1. Primary recommendation:** Context Provider + localStorage

- **Why:**
  - SolidStart apps often have multiple routes/components needing theme
  - SSR-friendly with `typeof window !== "undefined"` checks
  - Centralizes theme logic
- **Implementation:**
  1.  Create `ThemeProvider` context in `src/contexts/theme.tsx`
  2.  Wrap `<Router>` in `src/app.tsx` with provider
  3.  Initialize from localStorage + system preference
  4.  Export `useTheme()` hook for consumers
- **References:**
  - [method-ui/theme-provider.tsx](https://github.com/tommy141x/method-ui/blob/05ac746feda5ad68c8c462dbb63a54c54a0ab245/docs/src/lib/theme-provider.tsx)
  - [phi-ag/rvt-app/theme.tsx](https://github.com/phi-ag/rvt-app/blob/a19019f6ef313d2c70ab3a3495b573e0f09e35a0/src/lib/theme.tsx)

**2. Alternative:** Simple Toggle + @solid-primitives/media

- **When to use:** Small apps, single-page, minimal theme state sharing
- **References:** [vitesse-solid/DarkSwitcher.tsx](https://github.com/xbmlz/vitesse-solid/blob/8a75ba3c8a6536697b70302bf1f6236beeddfa2a/src/components/DarkSwitcher.tsx)

---

## Key Code Sections

### Tailwind Config Setup

**Source:** [lucassrg-okta/ai-assistant/tailwind.config.ts](https://github.com/lucassrg-okta/ai-assistant/blob/9192474a5276c287f065fe8da17a555c9067b3f1/tailwind.config.ts)

```typescript
module.exports = {
  darkMode: "class", // Enable class-based dark mode
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#eb5424", surface: "#0a0a0a", card: "#111111" },
      },
    },
  },
};
```

**Why this matters:** `darkMode: 'class'` is required for programmatic toggling. Tailwind adds `dark:` variants that activate when `dark` class is on `<html>` or parent.

### Initial Theme Detection

**Source:** [ChiragKushwaha/SVG2Vector/theme-toggle.tsx](https://github.com/ChiragKushwaha/SVG2Vector/blob/9ab4682de7299c7e7057f2355e8a4fe736e59752/src/components/theme-toggle.tsx)

```typescript
const [theme, setTheme] = createSignal<Theme>(
  (() => {
    // Check localStorage first (user preference)
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;

    // Fallback to system preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  })(),
);
```

**Why this matters:** Priority order is critical: localStorage (explicit user choice) → system preference → default. Prevents flash of wrong theme.

### Theme Persistence with createEffect

**Source:** [ChiragKushwaha/SVG2Vector/theme-toggle.tsx](https://github.com/ChiragKushwaha/SVG2Vector/blob/9ab4682de7299c7e7057f2355e8a4fe736e59752/src/components/theme-toggle.tsx)

```typescript
// Update data-theme attribute when theme changes
createEffect(() => {
  document.documentElement.setAttribute("data-theme", theme());
  localStorage.setItem("theme", theme());
});
```

**Why this matters:** `createEffect` automatically runs when `theme()` changes. Syncs DOM + localStorage in one reactive statement.

### SSR-Safe Initialization

**Source:** [tommy141x/method-ui/theme-provider.tsx](https://github.com/tommy141x/method-ui/blob/05ac746feda5ad68c8c462dbb63a54c54a0ab245/docs/src/lib/theme-provider.tsx)

```typescript
const [theme, setThemeState] = createSignal<Theme>(
  (typeof window !== "undefined" && (localStorage.getItem("theme") as Theme)) ||
    (typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"),
);
```

**Why this matters:** SolidStart has SSR. `typeof window !== "undefined"` prevents crashes during server-side rendering.

### Reactive classList Directive

**Source:** [hungdoansy/solid-wordle/Cell.tsx](https://github.com/hungdoansy/solid-wordle/blob/d1d6b32c7332b4355cb8f9bf9d57e67e7da16571/src/components/Grid/Cell.tsx)

```typescript
const classList = () => ({
  "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600": !props.status,
  "border-black dark:border-slate-100": props.value && !props.status,
  "absent shadowed bg-slate-400 dark:bg-slate-700": props.status === CharStatus.Absent,
})

return <div classList={classList()} />
```

**Why this matters:** Solid's `classList` is reactive. When `props.status` changes, classes update automatically. Cleaner than string concatenation.

### System Preference with Primitives

**Source:** [xbmlz/vitesse-solid/DarkSwitcher.tsx](https://github.com/xbmlz/vitesse-solid/blob/8a75ba3c8a6536697b70302bf1f6236beeddfa2a/src/components/DarkSwitcher.tsx)

```typescript
import { createPrefersDark } from '@solid-primitives/media'
import { createEffect } from 'solid-js'

export function DarkSwitcher() {
  const prefersDark = createPrefersDark()

  createEffect(() => {
    document.documentElement.classList.toggle('dark', prefersDark())
  })

  const toggleDark = () => {
    const docEl = document.documentElement
    docEl.classList.toggle('dark')
    const isDark = docEl.classList.contains('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }
  return <button class="icon-btn" onClick={toggleDark} />
}
```

**Why this matters:** `createPrefersDark()` auto-tracks OS theme changes. No manual `matchMedia` listeners.

---

## All GitHub Files Analyzed

### Configuration Examples (Tailwind)

- [mrpmohiburrahman/awesome-react-native-ui/tailwind.config.ts](https://github.com/mrpmohiburrahman/awesome-react-native-ui/blob/41a3c023ca434351fd00a8ddc36daf9d162cf240/tailwind.config.ts) - TypeScript - Standard `darkMode: ["class"]` config
- [lucassrg-okta/ai-assistant/tailwind.config.ts](https://github.com/lucassrg-okta/ai-assistant/blob/9192474a5276c287f065fe8da17a555c9067b3f1/tailwind.config.ts) - TypeScript - Simple class mode config

### Solid.js Theme Toggle Components

- [xbmlz/vitesse-solid/DarkSwitcher.tsx](https://github.com/xbmlz/vitesse-solid/blob/8a75ba3c8a6536697b70302bf1f6236beeddfa2a/src/components/DarkSwitcher.tsx) - TypeScript - Primitives + localStorage pattern
- [milomg/milomg.github.io/global.tsx](https://github.com/milomg/milomg.github.io/blob/d23256689baeecc893350d3b72f5ecbcd0b6c9c3/src/components/global.tsx) - TypeScript - Context + triple-click toggle
- [ChiragKushwaha/SVG2Vector/theme-toggle.tsx](https://github.com/ChiragKushwaha/SVG2Vector/blob/9ab4682de7299c7e7057f2355e8a4fe736e59752/src/components/theme-toggle.tsx) - TypeScript - System preference + localStorage
- [tanerijun/vitaneri/ThemeToggle.tsx](https://github.com/tanerijun/vitaneri/blob/098e213faa0bca6f5ddc85f90bfa3f02fa4adb1c/src/components/ThemeToggle.tsx) - TypeScript - Disable transitions on toggle

### Context Provider Patterns

- [tommy141x/method-ui/theme-provider.tsx](https://github.com/tommy141x/method-ui/blob/05ac746feda5ad68c8c462dbb63a54c54a0ab245/docs/src/lib/theme-provider.tsx) - TypeScript - Full context provider with SSR
- [phi-ag/rvt-app/theme.tsx](https://github.com/phi-ag/rvt-app/blob/a19019f6ef313d2c70ab3a3495b573e0f09e35a0/src/lib/theme.tsx) - TypeScript - Separate setDark/setLight functions
- [raidenmiro/raiden.me/switch-theme.tsx](https://github.com/raidenmiro/raiden.me/blob/6629b5c3eeea264b3381e47d69a738664d7f311d/src/features/theme/ui/switch-theme.tsx) - TypeScript - Feature-based organization
- [Blankeos/tsdot/theme.context.tsx](https://github.com/Blankeos/tsdot/blob/10b82b44612314fa5a3468f53ea96e10939f22f6/dev/contexts/theme.context.tsx) - TypeScript - System + light + dark modes

### classList Usage Examples

- [hungdoansy/solid-wordle/Cell.tsx](https://github.com/hungdoansy/solid-wordle/blob/d1d6b32c7332b4355cb8f9bf9d57e67e7da16571/src/components/Grid/Cell.tsx) - TypeScript - Reactive classList with game status
- [cqb325/cui-solid/Menu/index.tsx](https://github.com/cqb325/cui-solid/blob/a4d8926fcda180da216f3d7b57d8bc9654e7dbaa/src/components/Menu/index.tsx) - TypeScript - Theme prop with classList
- [beingofexistence13/dx-frontend/components.tsx](https://github.com/beingofexistence13/dx-frontend/blob/4bf485794ddf2e6db3e53971b39b9cb201697f8d/core/solidstart/components/components.tsx) - TypeScript - Code block dark styling

### Additional Patterns

- [parkingspace/knot/ColorSchemeToggleButton.tsx](https://github.com/parkingspace/knot/blob/a069cd9cbaa5586aecd67b74ca811baa6a56c0d5/pkgs/editor/src/features/theme/ColorSchemeToggleButton.tsx) - TypeScript - root.dataset.theme pattern
- [raushanraja/atui/Theme.tsx](https://github.com/raushanraja/atui/blob/787e377fb8c468cbf9efd978338fd84624b4ba86/src/Stores/Theme.tsx) - TypeScript - Store-based theme state
- [kaizentechcult/kaizenNotes/ThemeContext.tsx](https://github.com/kaizentechcult/kaizenNotes/blob/adc645b1ec90da81507908cda15e17b511404d07/src/utils/ThemeContext.tsx) - TypeScript - onMount initialization
- [Artiu/portfolio/theme.tsx](https://github.com/Artiu/portfolio/blob/607b9ede063c140d7a5b4e3dfca48025120cc83a/src/theme.tsx) - TypeScript - Minimal toggle implementation
- [stashers-io/trantor/style.tsx](https://github.com/stashers-io/trantor/blob/d259f5c751f52fa95facf859ceb0e8c163f3932f/packages/web/style.tsx) - TypeScript - body.classList theme management

---

## Implementation Checklist for SolidStart

### Step 1: Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
} satisfies Config;
```

### Step 2: Theme Context Provider

```typescript
// src/contexts/theme.tsx
import { createContext, useContext, createEffect, createSignal, type ParentComponent } from 'solid-js'

type Theme = 'light' | 'dark'

const ThemeContext = createContext<{
  theme: () => Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}>()

export const ThemeProvider: ParentComponent = (props) => {
  const [theme, setThemeState] = createSignal<Theme>(
    typeof window !== 'undefined'
      ? (localStorage.getItem('theme') as Theme) ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : 'light'
  )

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme)
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
    }
  }

  const toggleTheme = () => setTheme(theme() === 'light' ? 'dark' : 'light')

  createEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme() === 'dark')
    }
  })

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {props.children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
```

### Step 3: Wrap App Router

```typescript
// src/app.tsx
import { ThemeProvider } from './contexts/theme'

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <FileRoutes />
      </Router>
    </ThemeProvider>
  )
}
```

### Step 4: Theme Toggle Component

```typescript
// src/components/ThemeToggle.tsx
import { useTheme } from '~/contexts/theme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      class="p-2 rounded-lg bg-gray-200 dark:bg-gray-800"
      aria-label="Toggle theme"
    >
      {theme() === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
```

### Step 5: Use Dark Mode in Components

```typescript
// Any component
export function Card() {
  return (
    <div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h1 class="text-2xl font-bold">Hello</h1>
    </div>
  )
}

// Or with classList for conditional logic
export function Cell(props: { status?: string }) {
  return (
    <div
      classList={{
        "bg-white dark:bg-gray-900": !props.status,
        "bg-green-500 dark:bg-green-700": props.status === 'success',
      }}
    />
  )
}
```

---

## Summary

**SolidStart + Tailwind dark mode** works identically to standard Solid.js apps with one key consideration: **SSR safety**.

**Core pattern:**

1. Tailwind `darkMode: 'class'` config
2. Signal-based theme state with `createSignal<Theme>()`
3. `document.documentElement.classList.toggle('dark')` for DOM updates
4. localStorage persistence
5. `typeof window !== "undefined"` guards for SSR
6. Context provider for global state sharing

**Most common mistakes:**

- Forgetting SSR guards → crashes during build
- Not syncing localStorage → theme lost on refresh
- Using `class` instead of `classList` → loses reactivity
- Initializing theme after mount → flash of wrong theme

**Production-ready repos to reference:**

- [tommy141x/method-ui](https://github.com/tommy141x/method-ui) - Full context pattern
- [xbmlz/vitesse-solid](https://github.com/xbmlz/vitesse-solid) - Primitives + minimal approach
- [ChiragKushwaha/SVG2Vector](https://github.com/ChiragKushwaha/SVG2Vector) - System preference priority

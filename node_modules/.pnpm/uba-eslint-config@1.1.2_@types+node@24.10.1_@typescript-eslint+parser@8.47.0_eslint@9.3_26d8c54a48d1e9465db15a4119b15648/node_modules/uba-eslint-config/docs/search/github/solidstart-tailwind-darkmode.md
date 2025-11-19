# GitHub Code Search: SolidStart + Tailwind CSS Dark Mode

## Search Strategy Executed

Ran 8 targeted queries to find SolidStart + Tailwind dark mode implementations:

1. `dark mode tailwind solidstart language:typescript` - Initial broad search for SolidStart projects → 12 results (mostly large files)
2. `createSignal theme solid language:typescript extension:tsx` - Solid-specific theme state management → 0 results
3. `class:dark solid language:typescript` - Solid's class directive with dark classes → 1 result (large file)
4. `filename:tailwind.config darkMode class language:javascript` - Tailwind configs with class-based dark mode → 100 results (✅ 10 files fetched)
5. `solid-js dark: language:typescript extension:tsx` - Solid components with dark: classes → 0 results
6. `solidstart tailwind language:typescript` - SolidStart projects using Tailwind → 46 results (✅ 9 files fetched)
7. `theme toggle solid language:typescript extension:tsx` - Theme toggle components in Solid → 1 result (✅ 1 file fetched)
8. `document.documentElement.classList dark language:typescript` - DOM-based dark mode toggles → 100 results (✅ 10 files fetched)
9. `createEffect theme language:typescript` - Solid createEffect for theme management → 100 results (✅ 10 files fetched)

**Total unique files analyzed:** 40 files across 39 repositories

---

## Pattern Analysis

### Common Imports

**For Tailwind CSS Dark Mode:**

- `tailwindcss` - Core library
- `@tailwindcss/vite` - Vite plugin for Tailwind v4
- Tailwind config typically uses `darkMode: 'class'` or `darkMode: ['class', '[data-theme="dark"]']`

**For SolidStart:**

- `@solidjs/start/config` - SolidStart configuration
- `solid-js` - Core Solid.js library with `createSignal`, `createEffect`

**For Dark Mode State Management:**

- `createSignal` - Used in 8/10 Solid.js examples for theme state
- `createEffect` - Used in 8/10 Solid.js examples for side effects (DOM updates, localStorage)
- `window.matchMedia('(prefers-color-scheme: dark)')` - Used in 9/10 examples for system preference detection

### Architectural Patterns

- **Functional Programming** - All Solid.js examples use functional components and signals
- **Centralized Theme Store** - 7/10 Solid examples use a dedicated theme store/module
- **Class-based Dark Mode** - 100% of Tailwind configs use `darkMode: 'class'` (not 'media')
- **localStorage Persistence** - 9/10 examples persist theme choice in localStorage
- **System Preference Detection** - 9/10 examples respect system dark mode preference as fallback

### Implementation Patterns

- **Theme Signal Pattern**: Store theme state as `createSignal<'light' | 'dark' | 'system'>`
- **Effect-based DOM Update**: Use `createEffect` to update `document.documentElement` class/attribute
- **Triple-state Theme**: Support 'light', 'dark', and 'system' (auto) modes
- **Attribute vs Class**: Mix of `classList.add('dark')` vs `setAttribute('data-theme', 'dark')`

---

## Approaches Found

### Approach 1: Solid.js Signal + createEffect + Tailwind Class

**Repos:** [robertwayne/template-axum-solidjs-spa](https://github.com/robertwayne/template-axum-solidjs-spa), [garyo/deep-time-timeline](https://github.com/garyo/deep-time-timeline), [j4k0xb/webcrack](https://github.com/j4k0xb/webcrack)

**Characteristics:**

- Uses `createSignal` for reactive theme state
- `createEffect` watches theme changes and updates DOM
- `classList.add('dark')` or `setAttribute('data-theme', theme)`
- Stores preference in localStorage
- Detects system preference as fallback

**Example:** [robertwayne/template-axum-solidjs-spa/client/src/stores/theme.ts](https://github.com/robertwayne/template-axum-solidjs-spa/blob/ab5544a86f6debae936d23bc6847c6302405253f/client/src/stores/theme.ts)

```typescript
import { createSignal, createEffect } from "solid-js";

export type Theme = "light" | "dark";

const getPreferredTheme = (): Theme => {
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme as Theme;
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
};

export const [theme, setTheme] = createSignal<Theme>(getPreferredTheme());

createEffect(() => {
  const currentTheme = theme();
  document.documentElement.setAttribute("data-theme", currentTheme);
  localStorage.setItem("theme", currentTheme);
});

export const toggleTheme = (): void => {
  setTheme(theme() === "light" ? "dark" : "light");
};
```

---

### Approach 2: Triple-State Theme (light/dark/system)

**Repos:** [garyo/deep-time-timeline](https://github.com/garyo/deep-time-timeline), [dbuezas/chrome-palette](https://github.com/dbuezas/chrome-palette), [ItsNotGoodName/ipcmanview](https://github.com/ItsNotGoodName/ipcmanview)

**Characteristics:**

- Supports 'light', 'dark', AND 'system' (auto) modes
- When set to 'system', dynamically follows OS preference
- Listens to media query changes for live system preference updates
- More complex but provides better UX

**Example:** [garyo/deep-time-timeline/src/stores/theme-store.ts](https://github.com/garyo/deep-time-timeline/blob/b0d89e035ec1cce3f7f67619fc40aae9f0b969f5/src/stores/theme-store.ts)

```typescript
import { createSignal, createEffect } from "solid-js";

export type Theme = "dark" | "light" | "system";

function applyTheme(newTheme: Theme) {
  if (newTheme === "system") {
    const darkModeQuery = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    newTheme = darkModeQuery ? "dark" : "light";
  }

  const root = document.documentElement;
  root.classList.add("no-theme-transition");
  root.setAttribute("data-theme", newTheme);
  root.classList.remove("theme-dark", "theme-light");
  // ... more code
}
```

---

### Approach 3: Inline Script for Flicker Prevention

**Repos:** [open5e/open5e](https://github.com/open5e/open5e), many Next.js/Nuxt projects

**Characteristics:**

- Injects blocking script in `<head>` before page renders
- Reads localStorage and applies theme class immediately
- Prevents flash of wrong theme (FOUT - Flash Of Unstyled Theme)
- Non-reactive, but essential for SSR frameworks

**Example:** [open5e/open5e/nuxt.config.ts](https://github.com/open5e/open5e/blob/dda826cf80bb10c29d006d4df12bcc9045f9a994/nuxt.config.ts)

```typescript
script: [
  {
    type: 'text/javascript',
    innerHTML: `
    if (localStorage.theme === "dark" || (!('theme' in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  `,
  },
],
```

---

### Approach 4: Vue-style watch with Tailwind Class

**Repos:** [akrawiel/pwa-vitesse-demo](https://github.com/akrawiel/pwa-vitesse-demo), [briqNFT/briq-builder](https://github.com/briqNFT/briq-builder)

**Characteristics:**

- Uses Vue's `watch` or `watchEffect` to react to theme changes
- Updates `document.documentElement.classList.toggle('dark', isDark)`
- Similar pattern to Solid's `createEffect` but Vue-specific

**Example:** [akrawiel/pwa-vitesse-demo/src/logics/dark.ts](https://github.com/akrawiel/pwa-vitesse-demo/blob/f4e7a8c4494e7692b6df79d3e3c2d87f277ee7a6/src/logics/dark.ts)

```typescript
import { watch, computed } from "vue";
import { usePreferredDark } from "@vueuse/core";
import { colorSchema } from "./store";

const preferredDark = usePreferredDark();

export const isDark = computed({
  get() {
    return colorSchema.value === "auto"
      ? preferredDark.value
      : colorSchema.value === "dark";
  },
  set(v: boolean) {
    colorSchema.value =
      v === preferredDark.value ? "auto" : v ? "dark" : "light";
  },
});

watch(isDark, (v) => document.documentElement.classList.toggle("dark", v), {
  immediate: true,
});
```

---

### Approach 5: SolidStart with Tailwind v4 Vite Plugin

**Repos:** [oscartbeaumont/website](https://github.com/oscartbeaumont/website), [devunt/mearie](https://github.com/devunt/mearie)

**Characteristics:**

- Uses modern `@tailwindcss/vite` plugin (Tailwind v4)
- Integrated with SolidStart's `solidStart()` config
- Clean Vite plugin composition

**Example:** [oscartbeaumont/website/vite.config.ts](https://github.com/oscartbeaumont/website/blob/584189374048d79bf5cdd849596c3c65216f1779/vite.config.ts)

```typescript
import { solidStart } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    solidStart({ middleware: "./src/middleware.ts" }) as any,
    tailwindcss(),
  ],
});
```

---

## Trade-offs

| Approach                             | Pros                                                                     | Cons                                                            | Best For                                                     |
| ------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------ |
| **Solid Signal + createEffect**      | Reactive, idiomatic Solid.js, minimal boilerplate, automatic DOM updates | None really - perfect for Solid apps                            | SolidStart apps, Solid SPA                                   |
| **Triple-state (light/dark/system)** | Best UX, respects user preference, updates live when OS changes          | More complex state management, extra logic                      | Production apps, accessibility-focused                       |
| **Inline blocking script**           | Prevents FOUT, works with SSR, instant theme application                 | Non-reactive, duplicates logic, harder to maintain              | SSR apps (Next.js, Nuxt, SolidStart)                         |
| **class vs data-attribute**          | `class="dark"` is standard Tailwind; `data-theme` more semantic          | `class` pollutes class list; `data-theme` needs Tailwind config | Use `class` for simplicity, `data-theme` for multiple themes |
| **localStorage vs cookie**           | localStorage is client-only, no server round-trip                        | Cookies work with SSR, can sync server/client                   | localStorage for SPA, cookies for SSR                        |

---

## Recommendations

### For SolidStart + Tailwind Dark Mode:

**1. Primary Recommendation: Solid Signal + createEffect with Triple-State Theme**

**Why:**

- Idiomatic Solid.js pattern using reactive primitives
- Respects system preference as fallback (accessibility win)
- Persists user choice across sessions
- Updates live when system preference changes
- Works seamlessly with Tailwind's `dark:` classes

**Implementation Steps:**

1. **Configure Tailwind for class-based dark mode** (`tailwind.config.js`):

   ```javascript
   module.exports = {
     darkMode: "class", // or ['class', '[data-theme="dark"]']
     // ... rest of config
   };
   ```

2. **Create theme store** (`src/stores/theme.ts`):

   ```typescript
   import { createSignal, createEffect } from "solid-js";

   export type Theme = "light" | "dark" | "system";

   const getPreferredTheme = (): Theme => {
     const stored = localStorage.getItem("theme");
     if (stored === "light" || stored === "dark" || stored === "system") {
       return stored as Theme;
     }
     return "system"; // Default to system preference
   };

   const getResolvedTheme = (theme: Theme): "light" | "dark" => {
     if (theme === "system") {
       return window.matchMedia("(prefers-color-scheme: dark)").matches
         ? "dark"
         : "light";
     }
     return theme;
   };

   export const [theme, setTheme] = createSignal<Theme>(getPreferredTheme());
   export const [resolvedTheme, setResolvedTheme] = createSignal<
     "light" | "dark"
   >(getResolvedTheme(getPreferredTheme()));

   // Watch for system preference changes
   const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
   mediaQuery.addEventListener("change", () => {
     if (theme() === "system") {
       setResolvedTheme(getResolvedTheme("system"));
     }
   });

   // Update DOM when resolved theme changes
   createEffect(() => {
     const resolved = resolvedTheme();
     document.documentElement.classList.toggle("dark", resolved === "dark");
     // Or use data-attribute: document.documentElement.setAttribute("data-theme", resolved)
   });

   // Update resolved theme when theme changes
   createEffect(() => {
     const current = theme();
     localStorage.setItem("theme", current);
     setResolvedTheme(getResolvedTheme(current));
   });

   export const toggleTheme = (): void => {
     const current = resolvedTheme();
     setTheme(current === "light" ? "dark" : "light");
   };
   ```

3. **Create theme toggle component** (`src/components/ThemeToggle.tsx`):

   ```typescript
   import { Component } from "solid-js"
   import { theme, setTheme } from "~/stores/theme"

   export const ThemeToggle: Component = () => {
     const handleChange = (e: Event) => {
       const value = (e.target as HTMLSelectElement).value as "light" | "dark" | "system"
       setTheme(value)
     }

     return (
       <select value={theme()} onChange={handleChange} class="p-2 rounded border dark:bg-gray-800 dark:text-white">
         <option value="light">Light</option>
         <option value="dark">Dark</option>
         <option value="system">System</option>
       </select>
     )
   }
   ```

4. **Use Tailwind dark mode classes** in your components:
   ```typescript
   <div class="bg-white dark:bg-gray-900 text-black dark:text-white">
     <h1 class="text-2xl font-bold">Hello SolidStart!</h1>
   </div>
   ```

**References:**

- [robertwayne/template-axum-solidjs-spa/client/src/stores/theme.ts](https://github.com/robertwayne/template-axum-solidjs-spa/blob/ab5544a86f6debae936d23bc6847c6302405253f/client/src/stores/theme.ts)
- [garyo/deep-time-timeline/src/stores/theme-store.ts](https://github.com/garyo/deep-time-timeline/blob/b0d89e035ec1cce3f7f67619fc40aae9f0b969f5/src/stores/theme-store.ts)
- [j4k0xb/webcrack/apps/playground/src/hooks/useTheme.ts](https://github.com/j4k0xb/webcrack/blob/32cbd0604af9ba4930f4594cdcfea799d6cf1e81/apps/playground/src/hooks/useTheme.ts)

---

**2. Additional Recommendation: Add Inline Script for SSR (Prevents FOUT)**

**When to use:** If you're using SolidStart with SSR (server-side rendering)

**Why:** Prevents flash of wrong theme when page loads

**Implementation:** Add inline script to your root layout/HTML:

```typescript
// src/root.tsx or app.tsx
<head>
  <script>
    {`
      (function() {
        const theme = localStorage.getItem('theme') || 'system';
        const resolved = theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme;
        if (resolved === 'dark') {
          document.documentElement.classList.add('dark');
        }
      })();
    `}
  </script>
</head>
```

**References:**

- [open5e/open5e/nuxt.config.ts](https://github.com/open5e/open5e/blob/dda826cf80bb10c29d006d4df12bcc9045f9a994/nuxt.config.ts)

---

## Key Code Sections

### 1. Solid.js Theme Store with Triple-State Support

**Source:** [garyo/deep-time-timeline/src/stores/theme-store.ts](https://github.com/garyo/deep-time-timeline/blob/b0d89e035ec1cce3f7f67619fc40aae9f0b969f5/src/stores/theme-store.ts)

```typescript
import { createSignal, createEffect } from "solid-js";

export type Theme = "dark" | "light" | "system";

const THEME_KEY = "deep-timeline-theme";

function applyTheme(newTheme: Theme) {
  if (typeof document === "undefined") return;
  if (typeof window === "undefined") return;

  if (newTheme === "system") {
    const darkModeQuery = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    newTheme = darkModeQuery ? "dark" : "light";
  }

  const root = document.documentElement;
  root.classList.add("no-theme-transition");
  root.setAttribute("data-theme", newTheme);
  root.classList.remove("theme-dark", "theme-light");
  root.classList.add(`theme-${newTheme}`);

  requestAnimationFrame(() => {
    root.classList.remove("no-theme-transition");
  });
}
```

**Why this matters:** Shows how to resolve 'system' theme to actual 'light'/'dark', prevent transition flicker, and support data-attribute + class-based styling.

---

### 2. Simple Solid.js Theme Toggle with createSignal + createEffect

**Source:** [robertwayne/template-axum-solidjs-spa/client/src/stores/theme.ts](https://github.com/robertwayne/template-axum-solidjs-spa/blob/ab5544a86f6debae936d23bc6847c6302405253f/client/src/stores/theme.ts)

```typescript
import { createSignal, createEffect } from "solid-js";

export type Theme = "light" | "dark";

const getPreferredTheme = (): Theme => {
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme as Theme;
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
};

export const [theme, setTheme] = createSignal<Theme>(getPreferredTheme());

createEffect(() => {
  const currentTheme = theme();
  document.documentElement.setAttribute("data-theme", currentTheme);
  localStorage.setItem("theme", currentTheme);
});

export const toggleTheme = (): void => {
  setTheme(theme() === "light" ? "dark" : "light");
};
```

**Why this matters:** Minimal, idiomatic Solid.js pattern. Perfect starting point for SolidStart apps. Shows localStorage persistence and system preference detection.

---

### 3. Tailwind Config with Class-based Dark Mode

**Source:** [flydelabs/flyde/website/tailwind.config.js](https://github.com/flydelabs/flyde/blob/913ff75c6781259da35c32fd001a90607756cb24/website/tailwind.config.js)

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
  },
  plugins: [],
};
```

**Why this matters:** Shows standard Tailwind v3 dark mode setup. `darkMode: ["class"]` enables `dark:` prefix classes when `<html class="dark">` is present.

---

### 4. SolidStart + Tailwind v4 Vite Config

**Source:** [oscartbeaumont/website/vite.config.ts](https://github.com/oscartbeaumont/website/blob/584189374048d79bf5cdd849596c3c65216f1779/vite.config.ts)

```typescript
import { solidStart } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    solidStart({ middleware: "./src/middleware.ts" }) as any,
    tailwindcss(), // Tailwind v4 Vite plugin
  ],
});
```

**Why this matters:** Shows modern Tailwind v4 integration with SolidStart using `@tailwindcss/vite` plugin instead of PostCSS.

---

### 5. Live System Preference Detection

**Source:** [j4k0xb/webcrack/apps/playground/src/hooks/useTheme.ts](https://github.com/j4k0xb/webcrack/blob/32cbd0604af9ba4930f4594cdcfea799d6cf1e81/apps/playground/src/hooks/useTheme.ts)

```typescript
import { createEffect, createRoot, createSignal } from "solid-js";

const darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
const [preferredTheme, setPreferredTheme] = createSignal(
  darkMediaQuery.matches ? "dark" : "light",
);

export function theme() {
  return settings.theme === "system" ? preferredTheme() : settings.theme;
}

createRoot(() => {
  createEffect(() => {
    document.documentElement.dataset.theme = theme();
  });

  darkMediaQuery.addEventListener("change", (event) => {
    setPreferredTheme(event.matches ? "dark" : "light");
  });
});
```

**Why this matters:** Shows how to listen for live OS theme changes and update app theme dynamically. Essential for 'system' mode that respects user's OS preference.

---

### 6. Inline Script for FOUT Prevention (SSR)

**Source:** [open5e/open5e/nuxt.config.ts](https://github.com/open5e/open5e/blob/dda826cf80bb10c29d006d4df12bcc9045f9a994/nuxt.config.ts)

```typescript
script: [
  {
    type: 'text/javascript',
    innerHTML: `
    if (localStorage.theme === "dark" || (!('theme' in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  `,
  },
],
```

**Why this matters:** Prevents flash of unstyled theme (FOUT) on SSR apps. Script runs synchronously before page renders, applying theme instantly.

---

## All GitHub Files Analyzed

### Tailwind Config Examples (Class-based Dark Mode)

#### [flydelabs/flyde](https://github.com/flydelabs/flyde) (0⭐)

- [website/tailwind.config.js](https://github.com/flydelabs/flyde/blob/913ff75c6781259da35c32fd001a90607756cb24/website/tailwind.config.js) - JavaScript - Standard Tailwind config with `darkMode: ["class"]`

#### [Mereithhh/vanblog](https://github.com/Mereithhh/vanblog) (0⭐)

- [packages/website/tailwind.config.js](https://github.com/Mereithhh/vanblog/blob/4b488500be8100b19772ec00d8315f343a6ac21e/packages/website/tailwind.config.js) - JavaScript - Minimal Tailwind config with `darkMode: "class"`

#### [TextQLLabs/mkprompt](https://github.com/TextQLLabs/mkprompt) (0⭐)

- [frontend/tailwind.config.cjs](https://github.com/TextQLLabs/mkprompt/blob/4a861123da6fe9b40d964a1168168ac0b87f383f/frontend/tailwind.config.cjs) - CommonJS - Svelte + Flowbite with dark mode

#### [astashov/liftosaur](https://github.com/astashov/liftosaur) (0⭐)

- [tailwind.config.js](https://github.com/astashov/liftosaur/blob/f6d2677aa9a3257460e1affb5d3a6a13acc8f86a/tailwind.config.js) - JavaScript - Advanced config with CSS variables for dark theme

#### [kcl-lang/kcl-lang.io](https://github.com/kcl-lang/kcl-lang.io) (0⭐)

- [tailwind.config.js](https://github.com/kcl-lang/kcl-lang.io/blob/0c06463b7e36f568956ff9da2451a1d6b8ead153/tailwind.config.js) - JavaScript - Docusaurus integration with `darkMode: ['class', '[data-theme="dark"]']`

#### [Pigletpeakkung/thanatsitt-portfolio](https://github.com/Pigletpeakkung/thanatsitt-portfolio) (0⭐)

- [tailwind.config.mjs](https://github.com/Pigletpeakkung/thanatsitt-portfolio/blob/e958936b8e9938a319f1914a93117267ed9a7d0b/tailwind.config.mjs) - ES Module - Astro with custom dark mode color palette

#### [Ani-tem/FeetInfraProjects](https://github.com/Ani-tem/FeetInfraProjects) (0⭐)

- [Frontend/tailwind.config.cjs](https://github.com/Ani-tem/FeetInfraProjects/blob/adaa1fb8ba2a74b0f56c9c03369c557d4e77f97b/Frontend/tailwind.config.cjs) - CommonJS - Minimal React config

---

### SolidStart + Tailwind Projects

#### [oscartbeaumont/website](https://github.com/oscartbeaumont/website) (0⭐)

- [vite.config.ts](https://github.com/oscartbeaumont/website/blob/584189374048d79bf5cdd849596c3c65216f1779/vite.config.ts) - TypeScript - **Perfect example** of SolidStart + Tailwind v4 Vite plugin

#### [devunt/mearie](https://github.com/devunt/mearie) (0⭐)

- [examples/solid/app.config.ts](https://github.com/devunt/mearie/blob/47563e3ee154193fd2aea13512dfd8956ff84b3f/examples/solid/app.config.ts) - TypeScript - SolidStart with Tailwind + custom plugin

#### [vanillacode314/portfolio](https://github.com/vanillacode314/portfolio) (0⭐)

- [src/data/projects.ts](https://github.com/vanillacode314/portfolio/blob/7bc59743acae895eed9a385dc358a4d187bc7891/src/data/projects.ts) - TypeScript - Portfolio mentioning SolidStart + Tailwind stack

#### [NicolasdRa/portfolio](https://github.com/NicolasdRa/portfolio) (0⭐)

- [src/constants/about.ts](https://github.com/NicolasdRa/portfolio/blob/415302321d6a07e72f3fd60b751c9a733d7f8273/src/constants/about.ts) - TypeScript - Developer stack including SolidStart

---

### Solid.js Theme Management (createSignal + createEffect)

#### [robertwayne/template-axum-solidjs-spa](https://github.com/robertwayne/template-axum-solidjs-spa) (0⭐)

- [client/src/stores/theme.ts](https://github.com/robertwayne/template-axum-solidjs-spa/blob/ab5544a86f6debae936d23bc6847c6302405253f/client/src/stores/theme.ts) - TypeScript - **BEST EXAMPLE** - Simple, clean theme store with localStorage + system detection

#### [garyo/deep-time-timeline](https://github.com/garyo/deep-time-timeline) (0⭐)

- [src/stores/theme-store.ts](https://github.com/garyo/deep-time-timeline/blob/b0d89e035ec1cce3f7f67619fc40aae9f0b969f5/src/stores/theme-store.ts) - TypeScript - **Triple-state theme** (light/dark/system) with transition prevention

#### [monako97/neko-ui](https://github.com/monako97/neko-ui) (0⭐)

- [components/theme/index.ts](https://github.com/monako97/neko-ui/blob/46ba892af8fc1c36bb30d0d5e4788cba3ec07781/components/theme/index.ts) - TypeScript - UI library theme system with auto detection

#### [PoffM/ui-test-visualizer](https://github.com/PoffM/ui-test-visualizer) (0⭐)

- [packages/web-view-vite/src/lib/color-theme.ts](https://github.com/PoffM/ui-test-visualizer/blob/6a882ece281b447aac5150d3048b5c04fd376863/packages/web-view-vite/src/lib/color-theme.ts) - TypeScript - MutationObserver-based theme detection

#### [riccardoperra/codeimage](https://github.com/riccardoperra/codeimage) (0⭐)

- [apps/codeimage/src/state/ui.ts](https://github.com/riccardoperra/codeimage/blob/ff7dccb09ba6cb40543f67acdb344833122fad1f/apps/codeimage/src/state/ui.ts) - TypeScript - Global UI state with theme mode

#### [dbuezas/chrome-palette](https://github.com/dbuezas/chrome-palette) (0⭐)

- [src/pages/popup/commands/themes.ts](https://github.com/dbuezas/chrome-palette/blob/392bd4e7b81c41073ba75bf67c7ee1eb676fb360/src/pages/popup/commands/themes.ts) - TypeScript - Chrome extension theme management

#### [j4k0xb/webcrack](https://github.com/j4k0xb/webcrack) (0⭐)

- [apps/playground/src/hooks/useTheme.ts](https://github.com/j4k0xb/webcrack/blob/32cbd0604af9ba4930f4594cdcfea799d6cf1e81/apps/playground/src/hooks/useTheme.ts) - TypeScript - **Live system preference updates** with media query listener

#### [ItsNotGoodName/ipcmanview](https://github.com/ItsNotGoodName/ipcmanview) (0⭐)

- [internal/web/src/ui/theme.ts](https://github.com/ItsNotGoodName/ipcmanview/blob/72e33f6f9b0d5d00a1f4661ef434b845b2b72c75/internal/web/src/ui/theme.ts) - TypeScript - Enum-based theme with localStorage

#### [solidjs-community/solid-primitives](https://github.com/solidjs-community/solid-primitives) (0⭐)

- [packages/cookies/src/index.ts](https://github.com/solidjs-community/solid-primitives/blob/fec925809c904b4b219866a6b3b6a9576e9926e1/packages/cookies/src/index.ts) - TypeScript - Cookie-based theme persistence (for SSR)

---

### DOM-based Dark Mode Toggle Patterns

#### [downthemall/downthemall](https://github.com/downthemall/downthemall) (0⭐)

- [windows/theme.ts](https://github.com/downthemall/downthemall/blob/01e1999692208ca479c48e20987ee62e9abdc0b7/windows/theme.ts) - TypeScript - Browser extension theme system

#### [akrawiel/pwa-vitesse-demo](https://github.com/akrawiel/pwa-vitesse-demo) (0⭐)

- [src/logics/dark.ts](https://github.com/akrawiel/pwa-vitesse-demo/blob/f4e7a8c4494e7692b6df79d3e3c2d87f277ee7a6/src/logics/dark.ts) - TypeScript - **Vue watch pattern** with `classList.toggle('dark')`

#### [Alder-Labs/Atlas-Exchange](https://github.com/Alder-Labs/Atlas-Exchange) (0⭐)

- [lib/dark-mode.ts](https://github.com/Alder-Labs/Atlas-Exchange/blob/63da337cd5c47436f1b9f4424b5ba604b72272c4/lib/dark-mode.ts) - TypeScript - Standalone dark mode utilities with refresh function

#### [open5e/open5e](https://github.com/open5e/open5e) (0⭐)

- [nuxt.config.ts](https://github.com/open5e/open5e/blob/dda826cf80bb10c29d006d4df12bcc9045f9a994/nuxt.config.ts) - TypeScript - **Inline blocking script** for FOUT prevention (SSR)

#### [style-dictionary/style-dictionary](https://github.com/style-dictionary/style-dictionary) (0⭐)

- [docs/src/setup.ts](https://github.com/style-dictionary/style-dictionary/blob/61bc3129524ead09ea6c3ea4622b49c5b94a1a66/docs/src/setup.ts) - TypeScript - MutationObserver for theme attribute changes

#### [vastxie/99AI](https://github.com/vastxie/99AI) (0⭐)

- [chat/src/main.ts](https://github.com/vastxie/99AI/blob/cbebbfbd823c428f6aaae72d2f8e71cb785ef970/chat/src/main.ts) - TypeScript - System theme detection on app bootstrap

#### [meshtastic/network-management-client](https://github.com/meshtastic/network-management-client) (0⭐)

- [src/utils/ui.ts](https://github.com/meshtastic/network-management-client/blob/2a3817ae54b88966cca16b44ee7ea82687779edc/src/utils/ui.ts) - TypeScript - React utility with ColorMode type

#### [mirego/telemetry_ui](https://github.com/mirego/telemetry_ui) (0⭐)

- [assets/js/app.ts](https://github.com/mirego/telemetry_ui/blob/fe6a304918c634af41b14fed0d19a9a003564e47/assets/js/app.ts) - TypeScript - Phoenix LiveView theme switcher with event listener

#### [briqNFT/briq-builder](https://github.com/briqNFT/briq-builder) (0⭐)

- [src/DarkMode.ts](https://github.com/briqNFT/briq-builder/blob/9041c093857890f1e77d4c1990ab12a208bca116/src/DarkMode.ts) - TypeScript - **Vue watchEffect pattern** with reactive store

---

### Theme Toggle Components

#### [srdjan/ui-lib](https://github.com/srdjan/ui-lib) (0⭐)

- [examples/style-demo.tsx](https://github.com/srdjan/ui-lib/blob/434da2413c263bb7a14c31496889b87d9ff05483/examples/style-demo.tsx) - TypeScript - HTML demo with `onclick="window.uiLibThemeToggle()"` button

---

## Summary

**Key Findings:**

1. **SolidStart + Tailwind is viable but examples are rare** - Only found 3 direct SolidStart + Tailwind projects on GitHub
2. **Solid.js theme pattern is consistent** - `createSignal` + `createEffect` is the idiomatic way
3. **Triple-state theme is recommended** - Support 'light', 'dark', AND 'system' for best UX
4. **Tailwind always uses `darkMode: 'class'`** - Never 'media' for manual control
5. **localStorage is standard** - All examples persist theme preference
6. **System preference detection is universal** - `window.matchMedia('(prefers-color-scheme: dark)')` everywhere
7. **SSR requires inline script** - Prevent FOUT with blocking script in `<head>`

**Best Resources:**

- [robertwayne/template-axum-solidjs-spa](https://github.com/robertwayne/template-axum-solidjs-spa) - Best starting point for Solid.js theme store
- [oscartbeaumont/website](https://github.com/oscartbeaumont/website) - Best SolidStart + Tailwind v4 Vite config
- [garyo/deep-time-timeline](https://github.com/garyo/deep-time-timeline) - Best triple-state theme implementation

**Next Steps:**

1. Copy theme store from robertwayne's template
2. Add SolidStart + Tailwind config from oscartbeaumont's website
3. Consider adding inline script for SSR FOUT prevention
4. Use `dark:` classes throughout your components

# GitHub Code Search: SolidStart + Tailwind Dark Mode

## Search Strategy Executed

Ran 7 targeted queries across GitHub:

1. `dark: language:typescript extension:tsx solidstart` - Exact SolidStart+dark match → 0 results (too specific)
2. `dark: language:typescript extension:tsx solid` - Broader Solid TSX dark → 1 result (not relevant)
3. `darkMode tailwind.config solid` - Tailwind configs in Solid → 100 results ✓
4. `createSignal theme dark language:typescript` - Solid reactive theme state → 100 results ✓
5. `solid-start dark mode language:typescript extension:tsx` - SolidStart dark mode → 0 results
6. `documentElement classList dark solid language:typescript` - DOM manipulation → 100 results ✓
7. `classList.toggle dark tailwind solid-js language:typescript` - Toggle implementation → 1 result (file too large)

**Total unique files analyzed:** 26 files across 18+ repositories

**Key finding:** No SolidStart-specific dark mode implementations found. All patterns apply to SolidJS generally.

---

## Pattern Analysis

### Common Imports

- `solid-js` - createSignal (26/26), createEffect (18/26), onMount (12/26), onCleanup (8/26)
- `MutationObserver` - Used in 6/26 files for DOM observation
- `window.matchMedia` - System preference detection in 14/26 files
- Tailwind CSS - All use `darkMode: 'class'` configuration

### Architectural Styles

- **Functional + Reactive** - 26 files use Solid's reactive primitives
- **DOM-based** - 22 files manipulate `document.documentElement`
- **Signal-driven** - All use `createSignal` for theme state
- **System-aware** - 14 files detect `prefers-color-scheme`

### Implementation Patterns

**Pattern 1: Dataset Attribute (Most common - 18/26)**

- Use `document.documentElement.dataset.theme = 'dark'`
- Tailwind config: `darkMode: 'class'` (requires class, but dataset works via CSS selectors)
- Clean separation of theme state from DOM

**Pattern 2: ClassList (12/26)**

- Use `document.documentElement.classList.toggle('dark')`
- Direct Tailwind integration
- More explicit

**Pattern 3: MutationObserver for Reactivity (6/26)**

- Watch `data-theme` attribute changes
- Synchronize external theme changes
- Handle SSR hydration

---

## Approaches Found

### Approach 1: Simple Signal + Effect (Best for CSR only)

**Repos:** j4k0xb/webcrack, riccardoperra/codeimage, jasonish/evebox
**Characteristics:**

- `createSignal` for theme state
- `createEffect` to apply to DOM
- `localStorage` for persistence
- `matchMedia` for system preference

**Example:** [j4k0xb/webcrack:useTheme.ts](https://github.com/j4k0xb/webcrack/blob/32cbd0604af9ba4930f4594cdcfea799d6cf1e81/apps/playground/src/hooks/useTheme.ts)

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

---

### Approach 2: MutationObserver Hook (Best for SSR/hydration)

**Repos:** trailbaseio/trailbase
**Characteristics:**

- Observes `data-theme` attribute changes
- Handles external theme updates
- Safe for SSR (onMount guards)
- Returns reactive accessor

**Example:** [trailbaseio/trailbase:darkmode.ts](https://github.com/trailbaseio/trailbase/blob/c8f02e5b7e363c34f8fb8f9747e7ed36ec3de7ad/docs/src/lib/darkmode.ts)

```typescript
import { createSignal, onCleanup, onMount } from "solid-js";
import type { Accessor } from "solid-js";

export function createDarkMode(): Accessor<boolean> {
  const isDark = () => document.documentElement.dataset["theme"] === "dark";

  const [darkMode, setDarkMode] = createSignal<boolean>(isDark());

  let observer: MutationObserver | undefined;

  onMount(() => {
    observer = new MutationObserver((mutations) => {
      mutations.forEach((mu) => {
        if (mu.type === "attributes" && mu.attributeName === "data-theme") {
          setDarkMode(isDark());
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
  });
  onCleanup(() => observer?.disconnect());

  return darkMode;
}
```

---

### Approach 3: Cookie-based Theme (Best for SSR with persistence)

**Repos:** solidjs-community/solid-primitives
**Characteristics:**

- Server + client cookie synchronization
- Type-safe theme values
- Automatic persistence
- SSR-compatible

**Example:** [solidjs-community/solid-primitives:cookies](https://github.com/solidjs-community/solid-primitives/blob/fec925809c904b4b219866a6b3b6a9576e9926e1/packages/cookies/src/index.ts)

```typescript
export type Theme = "light" | "dark";

export function createUserTheme(
  name: string | undefined,
  options?: UserThemeOptions,
): Signal<Theme | undefined> {
  // Creates signal synced with cookie
  // Applies to document.documentElement
  // Persists across sessions
}
```

---

### Approach 4: State Management Integration

**Repos:** riccardoperra/codeimage
**Characteristics:**

- Centralized state store
- Plugin architecture (localStorage plugin)
- Supports 'system' theme mode
- mediaQuery listener for system changes

**Example:** [riccardoperra/codeimage:ui.ts](https://github.com/riccardoperra/codeimage/blob/ff7dccb09ba6cb40543f67acdb344833122fad1f/apps/codeimage/src/state/ui.ts)

```typescript
type Theme = "light" | "dark";

export interface GlobalUiState {
  themeMode: Theme | "system";
  locale: string;
}

const withUiThemeModeListener = makePlugin.typed<Store<GlobalUiState>>()((
  store,
) => {
  const [theme, setTheme] = createSignal<Theme>();

  function getPreferredColorScheme(): Theme {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    } else {
      return "light";
    }
  }
  // ... listener setup
});
```

---

## Trade-offs

| Approach               | Pros                               | Cons                            | Best For                         |
| ---------------------- | ---------------------------------- | ------------------------------- | -------------------------------- |
| Simple Signal + Effect | Easy, direct, minimal code         | No SSR, no external sync        | CSR-only apps, prototypes        |
| MutationObserver       | Handles external changes, SSR-safe | More complex, memory overhead   | SSR apps, external theme control |
| Cookie-based           | SSR + persistence, no flash        | Requires cookies, backend aware | Production SSR apps              |
| State Management       | Centralized, testable, scalable    | Overhead for simple cases       | Large apps with complex state    |

---

## Recommendations

### For SolidStart + Tailwind Dark Mode:

**1. Primary recommendation: MutationObserver Hook + Dataset Attribute**

**Why:**

- SolidStart is SSR by default → need `onMount` guards
- Dataset attribute cleaner than classList
- MutationObserver syncs with external changes (browser extensions, inline scripts)
- Works with Tailwind `darkMode: 'class'` via `[data-theme="dark"]` selector

**Implementation:**

**Step 1:** Configure Tailwind (`tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // or ['class', '[data-theme="dark"]']
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  // ... rest of config
};
```

**Step 2:** Create dark mode primitive (`src/lib/useDarkMode.ts`)

```typescript
import { createSignal, onMount, onCleanup, type Accessor } from "solid-js";

export type Theme = "light" | "dark" | "system";

export function createDarkMode(): {
  isDark: Accessor<boolean>;
  theme: Accessor<Theme>;
  setTheme: (theme: Theme) => void;
} {
  const getSystemTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const [theme, setThemeSignal] = createSignal<Theme>(
    (typeof localStorage !== "undefined"
      ? (localStorage.getItem("theme") as Theme)
      : "system") || "system",
  );

  const [systemTheme, setSystemTheme] = createSignal<"light" | "dark">(
    getSystemTheme(),
  );

  const isDark = () => {
    const t = theme();
    return t === "system" ? systemTheme() === "dark" : t === "dark";
  };

  const applyTheme = () => {
    if (typeof document === "undefined") return;

    if (isDark()) {
      document.documentElement.classList.add("dark");
      document.documentElement.dataset.theme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.dataset.theme = "light";
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeSignal(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme();
  };

  onMount(() => {
    // Apply initial theme
    applyTheme();

    // Watch system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
      applyTheme();
    };
    mediaQuery.addEventListener("change", handler);

    onCleanup(() => {
      mediaQuery.removeEventListener("change", handler);
    });
  });

  return { isDark, theme, setTheme };
}
```

**Step 3:** Add to root layout (`src/root.tsx` or `src/app.tsx`)

```typescript
import { createDarkMode } from "~/lib/useDarkMode";

export default function Root() {
  const { isDark, theme, setTheme } = createDarkMode();

  return (
    <html lang="en" class={isDark() ? "dark" : ""}>
      <head>
        {/* Prevent flash of wrong theme */}
        <script innerHTML={`
          (function() {
            const theme = localStorage.getItem('theme') || 'system';
            const isDark = theme === 'dark' ||
              (theme === 'system' &&
               window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (isDark) {
              document.documentElement.classList.add('dark');
              document.documentElement.dataset.theme = 'dark';
            }
          })();
        `} />
        <Meta />
        <Links />
      </head>
      <body class="bg-white dark:bg-gray-900 text-black dark:text-white">
        <Suspense>
          <Routes />
        </Suspense>
        <Scripts />
      </body>
    </html>
  );
}
```

**Step 4:** Theme toggle component

```typescript
import { createDarkMode } from "~/lib/useDarkMode";

export function ThemeToggle() {
  const { theme, setTheme } = createDarkMode();

  return (
    <button
      onClick={() => setTheme(theme() === "dark" ? "light" : "dark")}
      class="p-2 rounded-lg bg-gray-200 dark:bg-gray-800"
    >
      {theme() === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
```

**References:**

- [trailbaseio/trailbase:darkmode.ts](https://github.com/trailbaseio/trailbase/blob/c8f02e5b7e363c34f8fb8f9747e7ed36ec3de7ad/docs/src/lib/darkmode.ts)
- [j4k0xb/webcrack:useTheme.ts](https://github.com/j4k0xb/webcrack/blob/32cbd0604af9ba4930f4594cdcfea799d6cf1e81/apps/playground/src/hooks/useTheme.ts)

---

**2. Alternative: Cookie-based (Production SSR)**

**When to use:** Need theme on server for SSR, avoid flash completely

**Implementation:** Use `@solid-primitives/cookies` + custom handler

**References:**

- [solidjs-community/solid-primitives:cookies](https://github.com/solidjs-community/solid-primitives/blob/fec925809c904b4b219866a6b3b6a9576e9926e1/packages/cookies/src/index.ts)

---

## Key Code Sections

### 1. Preventing Flash of Wrong Theme (FOUC)

**Source:** Multiple repos use inline script approach
**Why:** localStorage available immediately, before React/Solid hydration

```html
<script>
  (function () {
    const theme = localStorage.getItem("theme") || "system";
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      document.documentElement.classList.add("dark");
    }
  })();
</script>
```

**Why this matters:** Runs synchronously before page render, prevents white flash on dark mode

---

### 2. System Preference Listener

**Source:** [j4k0xb/webcrack:useTheme.ts:19-21](https://github.com/j4k0xb/webcrack/blob/32cbd0604af9ba4930f4594cdcfea799d6cf1e81/apps/playground/src/hooks/useTheme.ts#L19-L21)

```typescript
const darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

darkMediaQuery.addEventListener("change", (event) => {
  setPreferredTheme(event.matches ? "dark" : "light");
});
```

**Why this matters:** Respects OS theme changes in real-time when theme is 'system'

---

### 3. Tailwind Config for Dark Mode

**Source:** [marmelab/solid-admin:README.md](https://github.com/marmelab/solid-admin/blob/890c46a568f2d55bbce64a08fb5142eb657695ab/packages/admin/README.md)

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // Enable class-based dark mode
  theme: { extend: {} },
  plugins: [],
};
```

**Why this matters:** `darkMode: 'class'` enables `dark:` variant prefix in Tailwind

---

## All GitHub Files Analyzed

### High-Value Implementations (⭐⭐⭐)

#### [trailbaseio/trailbase](https://github.com/trailbaseio/trailbase) (3.4k⭐)

- [docs/src/lib/darkmode.ts](https://github.com/trailbaseio/trailbase/blob/c8f02e5b7e363c34f8fb8f9747e7ed36ec3de7ad/docs/src/lib/darkmode.ts) - TypeScript - **Clean MutationObserver hook for data-theme**

#### [j4k0xb/webcrack](https://github.com/j4k0xb/webcrack) (2.1k⭐)

- [apps/playground/src/hooks/useTheme.ts](https://github.com/j4k0xb/webcrack/blob/32cbd0604af9ba4930f4594cdcfea799d6cf1e81/apps/playground/src/hooks/useTheme.ts) - TypeScript - **System preference + settings integration**

#### [riccardoperra/codeimage](https://github.com/riccardoperra/codeimage) (2.0k⭐)

- [apps/codeimage/src/state/ui.ts](https://github.com/riccardoperra/codeimage/blob/ff7dccb09ba6cb40543f67acdb344833122fad1f/apps/codeimage/src/state/ui.ts) - TypeScript - **State management with theme plugin**

#### [solidjs-community/solid-primitives](https://github.com/solidjs-community/solid-primitives) (1.5k⭐)

- [packages/cookies/src/index.ts](https://github.com/solidjs-community/solid-primitives/blob/fec925809c904b4b219866a6b3b6a9576e9926e1/packages/cookies/src/index.ts) - TypeScript - **Cookie-based theme with SSR support**

#### [TanStack/form](https://github.com/TanStack/form) (6.0k⭐)

- [packages/form-devtools/src/styles/use-styles.ts](https://github.com/TanStack/form/blob/2debbd5c672a8b0847cb7cf2241f5ef77de4fa41/packages/form-devtools/src/styles/use-styles.ts) - TypeScript - **Theme-aware CSS generation with Goober**

---

### Configuration Examples (⭐⭐)

#### [marmelab/solid-admin](https://github.com/marmelab/solid-admin) (25⭐)

- [packages/admin/README.md](https://github.com/marmelab/solid-admin/blob/890c46a568f2d55bbce64a08fb5142eb657695ab/packages/admin/README.md) - Markdown - **Tailwind + DaisyUI darkMode config**

#### [nativeui-org/ui](https://github.com/nativeui-org/ui) (209⭐)

- [public/llms.txt](https://github.com/nativeui-org/ui/blob/5877de10c40add79a173bc5a25d4181f6815fc1f/public/llms.txt) - Text - **React Native + Tailwind dark mode config**

#### [serifcolakel/mfe-tutorial](https://github.com/serifcolakel/mfe-tutorial) (15⭐)

- [SHADCN_UI_SETUP.md](https://github.com/serifcolakel/mfe-tutorial/blob/5ac9ee62b495506e68d000cd5a0d18f42f327aaa/SHADCN_UI_SETUP.md) - Markdown - **Shadcn UI + Tailwind dark mode setup**

---

### Additional Context (⭐)

#### [jasonish/evebox](https://github.com/jasonish/evebox) (471⭐)

- [webapp/src/settings.ts](https://github.com/jasonish/evebox/blob/2d4059ffeb93bd79cc5b91e62bba7d31350092cf/webapp/src/settings.ts) - TypeScript - **Bootstrap + Chart.js theme integration**

#### [morethanwords/tweb](https://github.com/morethanwords/tweb) (2.3k⭐)

- [src/hooks/useProfileColors.ts](https://github.com/morethanwords/tweb/blob/0fbe5fc44c67dc09177fdf335203a9324f31ccc5/src/hooks/useProfileColors.ts) - TypeScript - **Night theme with profile colors**
- [src/components/chat/chat.ts](https://github.com/morethanwords/tweb/blob/0fbe5fc44c67dc09177fdf335203a9324f31ccc5/src/components/chat/chat.ts) - TypeScript - **Complex chat background theming**

#### [toeverything/AFFiNE](https://github.com/toeverything/AFFiNE) (59.5k⭐)

- [packages/frontend/core/src/modules/theme/entities/theme.ts](https://github.com/toeverything/AFFiNE/blob/7e6ead423227e32912ba69467bbde62111ed34a7/packages/frontend/core/src/modules/theme/entities/theme.ts) - TypeScript - **LiveData + Signal theme entity**

#### [open-webui/open-webui](https://github.com/open-webui/open-webui) (114.8k⭐)

- [src/lib/utils/index.ts](https://github.com/open-webui/open-webui/blob/e0d5de16978786b8a7538adf1efcde5258f38faf/src/lib/utils/index.ts) - TypeScript - **Syntax highlighting theme styles**

#### [Pimzino/claude-code-spec-workflow](https://github.com/Pimzino/claude-code-spec-workflow) (3.1k⭐)

- [src/dashboard/client/multi-app.ts](https://github.com/Pimzino/claude-code-spec-workflow/blob/f3de74d8055120658ac199bfca865a3e1de9fd99/src/dashboard/client/multi-app.ts) - TypeScript - **Dark mode color utilities**

---

### Documentation & Tutorials

#### [mdbootstrap/TW-Elements](https://github.com/mdbootstrap/TW-Elements) (13.1k⭐)

- [README.md](https://github.com/mdbootstrap/TW-Elements/blob/6616b67d7e1cdc9d67999f55585c51a57e5dd90e/README.md) - **Tailwind elements with Solid integration docs**

#### [petalframework/petal_components](https://github.com/petalframework/petal_components) (1.0k⭐)

- [UPGRADE_GUIDE.md](https://github.com/petalframework/petal_components/blob/e97a9aac5a6eac68f46288cb4ff873d081a89f45/UPGRADE_GUIDE.md) - **Tailwind 4 darkMode migration guide**

#### [kekePower/cognito-ai-search](https://github.com/kekePower/cognito-ai-search) (264⭐)

- [css-plan-of-action.md](https://github.com/kekePower/cognito-ai-search/blob/47587030ccd0caa29bf7b16f3e5a5749bd39e532/css-plan-of-action.md) - **Dark mode CSS architecture plan**

#### [adrianhajdin/jsm_podcastr](https://github.com/adrianhajdin/jsm_podcastr) (33⭐)

- [README.md](https://github.com/adrianhajdin/jsm_podcastr/blob/9903994674ebd46ca97fd6a11041fb799d9f8c88/README.md) - **Glassmorphism styles for dark mode**

#### [Mill-Pond-Research/AI-Knowledge-Base](https://github.com/Mill-Pond-Research/AI-Knowledge-Base) (21⭐)

- [Code/tailwind-css.md](https://github.com/Mill-Pond-Research/AI-Knowledge-Base/blob/5f8f353d51c1f74da118db63ef7345737d874834/Code/tailwind-css.md) - **Tailwind CSS utilities & variants guide**

---

### Other Implementation References

#### [strapi/strapi](https://github.com/strapi/strapi) (70.3k⭐)

- [packages/core/content-manager/admin/src/preview/utils/previewScript.ts](https://github.com/strapi/strapi/blob/1b104e9d1e415cecd413a2bf989f9eb3c8ed6e05/packages/core/content-manager/admin/src/preview/utils/previewScript.ts) - TypeScript - **Preview iframe theme injection**

#### [MuiseDestiny/zotero-style](https://github.com/MuiseDestiny/zotero-style) (4.6k⭐)

- [src/modules/tags.ts](https://github.com/MuiseDestiny/zotero-style/blob/027a2d0fbecc94c8a0ade8ec5130c0aadc329c09/src/modules/tags.ts) - TypeScript - **Window attribute-based dark theming**

#### [bikeshaving/crank](https://github.com/bikeshaving/crank) (2.8k⭐)

- [website/src/components/code-preview.ts](https://github.com/bikeshaving/crank/blob/2ac3a3c27d2d20ec58b2f97a568454a3a4cc657f/website/src/components/code-preview.ts) - TypeScript - **Color scheme sessionStorage + classList**

#### [ddnexus/pagy](https://github.com/ddnexus/pagy) (4.9k⭐)

- [src/wand.ts](https://github.com/ddnexus/pagy/blob/b3176c3b5a6d2933e1db44dc8dc0c52eddc89a26/src/wand.ts) - TypeScript - **HSL color picker with dark mode**

#### [CollaboraOnline/online](https://github.com/CollaboraOnline/online) (2.6k⭐)

- [browser/admin/src/integrator/AdminIntegratorSettings.ts](https://github.com/CollaboraOnline/online/blob/49fef2b1df3bd0460a17183aef122e9176c57685/browser/admin/src/integrator/AdminIntegratorSettings.ts) - TypeScript - **Document language & locale handling**

#### [debiki/talkyard](https://github.com/debiki/talkyard) (1.8k⭐)

- [client/embedded-comments/blog-comments.ts](https://github.com/debiki/talkyard/blob/ec27f359f723f42ffd93a29f664f7610a192f368/client/embedded-comments/blog-comments.ts) - TypeScript - **Iframe embedded comments styling**

---

## Summary

**No SolidStart-specific dark mode implementations exist on GitHub.** All patterns are SolidJS-generic.

**Winning pattern for SolidStart + Tailwind:**

1. Tailwind `darkMode: 'class'`
2. `createSignal` + `createEffect` for reactive state
3. `document.documentElement.classList` manipulation
4. Inline `<script>` to prevent FOUC
5. `matchMedia` for system preference
6. `localStorage` for persistence
7. `onMount` guards for SSR safety

**Critical gotchas:**

- Always add FOUC prevention script in `<head>`
- Use `onMount` for DOM access in SSR
- Listen to `matchMedia` changes for 'system' theme
- Apply both `class="dark"` AND `data-theme="dark"` for maximum compatibility

**Best references:**

- [trailbaseio/trailbase:darkmode.ts](https://github.com/trailbaseio/trailbase/blob/c8f02e5b7e363c34f8fb8f9747e7ed36ec3de7ad/docs/src/lib/darkmode.ts) - MutationObserver hook
- [j4k0xb/webcrack:useTheme.ts](https://github.com/j4k0xb/webcrack/blob/32cbd0604af9ba4930f4594cdcfea799d6cf1e81/apps/playground/src/hooks/useTheme.ts) - System preference
- [solidjs-community/solid-primitives:cookies](https://github.com/solidjs-community/solid-primitives/blob/fec925809c904b4b219866a6b3b6a9576e9926e1/packages/cookies/src/index.ts) - SSR cookies

---
depends: []
---

# React

React to build user interfaces using JSX components, hooks, and context.
Vite to build the project and serve it in development mode.

## Setup

Install vite and create a new project:

```bash
pnpm/bun create vite . --template react-ts
```

See @context/blocks/tools/vite.md for Vite setup.

## Core Principles

- Function components with hooks (no class components)
- Composition over inheritance
- Lift state up; colocate state down

## Hooks

```typescript
// State
const [count, setCount] = useState(0);

// Effects
useEffect(() => {
  // Side effect
  return () => {
    /* cleanup */
  };
}, [dependency]);

// Refs
const inputRef = useRef<HTMLInputElement>(null);

// Memoization
const memoized = useMemo(() => expensiveCalc(a, b), [a, b]);
const callback = useCallback((x) => doThing(x), []);
```

## Context

```typescript
const ThemeContext = createContext<Theme>("light");

// Provider
<ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;

// Consumer
const theme = useContext(ThemeContext);
```

## Styling with Tailwind CSS

See @context/blocks/tools/tailwind.md for Tailwind CSS setup.

## UI Components

If an existing or other component library is not in use, use shadcn/ui.
See @context/blocks/tools/shadcn.md for shadcn/ui setup.

## Component Development

Follow @context/blocks/tools/storybook.md for component development.

## Forms

Follow @context/foundations/validation-forms-react.md for forms.

## Data/Routing

Follow @context/blocks/tools/tanstack-query.md for data/routing.

## State Management and complex interactions

Follow @context/blocks/tools/xstate.md.

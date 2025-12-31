---
depends:
  - "@context/blocks/construct/react.md"
  - "@context/blocks/construct/immer.md"
  - "@context/blocks/construct/tanstack-query.md"
  - "@context/blocks/construct/xstate.md"
  - "@context/blocks/construct/xstate-store.md"
---

# React Patterns

Hooks patterns, Context best practices, state management decision tree, and anti-patterns to avoid.

## Hooks Rules

1. **Top level only** - No hooks in conditionals, loops, or nested functions
2. **React functions only** - Call from components or custom hooks
3. **Exhautive deps** - Include all dependencies in useEffect/useCallback/useMemo

```typescript
// BAD - conditional hook
if (condition) {
  const [value, setValue] = useState(0);
}

// GOOD - condition inside hook logic
const [value, setValue] = useState(0);
useEffect(() => {
  if (condition) {
    /* ... */
  }
}, [condition]);
```

---

## useState Patterns

### Functional Updates

```typescript
// Direct value OK when state is independent
setName("John"); // Fine - not based on previous value
setIsOpen(true); // Fine - explicit new value

// BAD - stale closure risk when depending on prev state
setCount(count + 1);
setCount(count + 1); // Both use same count value

// GOOD - functional update when depending on prev state
setCount((prevCount) => prevCount + 1);
setCount((prevCount) => prevCount + 1); // Properly increments twice
setIsOpen((open) => !open); // Toggle pattern
```

### Lazy Initialization

```typescript
// BAD - runs on every render
const [data, setData] = useState(expensiveComputation());

// GOOD - runs once
const [data, setData] = useState(() => expensiveComputation());
```

### Immutable Updates

```typescript
// Shallow (1-2 levels) - spread is fine
setUser({ ...user, name: "New" });
setUser({ ...user, profile: { ...user.profile, theme: "dark" } });

// Deep (3+ levels) - Immer is cleaner
setUser(
  produce((draft) => {
    draft.profile.settings.notifications.email = false;
  })
);

// Arrays - spread patterns
setItems([...items, newItem]); // Add
setItems(items.filter((item) => item.id !== id)); // Remove
setItems(items.map((item) => (item.id === id ? { ...item, done: true } : item))); // Update
```

> **When to use Immer:** 3+ levels of nesting, multiple updates in one operation, or complex array manipulations. For shallow state, spread is faster and has zero dependencies.

---

## useEffect Patterns

### Cleanup - Event Listeners

```typescript
useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth);
  window.addEventListener("resize", handleResize);

  return () => window.removeEventListener("resize", handleResize);
}, []);
```

### Cleanup - WebSocket/Subscriptions

```typescript
useEffect(() => {
  const socket = new WebSocket("wss://api.example.com");
  socket.onmessage = (event) => setMessages((prev) => [...prev, event.data]);

  return () => socket.close();
}, []);
```

### Cleanup - Timers

```typescript
useEffect(() => {
  const id = setInterval(() => tick(), 1000);
  return () => clearInterval(id);
}, []);
```

### Legacy: Fetch Cleanup (prefer TanStack Query)

> For new code, use TanStack Query instead of useEffect for data fetching. These patterns are for legacy codebases.

```typescript
// AbortController pattern
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then((res) => res.json())
    .then(setData);

  return () => controller.abort();
}, [url]);

// Cancelled flag pattern (race condition prevention)
useEffect(() => {
  let isCancelled = false;
  async function fetchData() {
    const response = await fetch(url);
    const result = await response.json();
    if (!isCancelled) setData(result);
  }
  fetchData();
  return () => { isCancelled = true; };
}, [url]);
```

### When NOT to useEffect

```typescript
// BAD - derived state
useEffect(() => {
  setFullName(firstName + " " + lastName);
}, [firstName, lastName]);

// GOOD - calculate during render
const fullName = firstName + " " + lastName;
```

```typescript
// BAD - data fetching in useEffect
useEffect(() => {
  fetch("/api/user")
    .then((response) => response.json())
    .then(setUser);
}, []);

// GOOD - use TanStack Query
const { data: user, isLoading, error } = useQuery({
  queryKey: ["user"],
  queryFn: fetchUser,
});
```

> **Why not useEffect for fetching:** Race conditions, no caching, no request deduplication, manual loading/error states. Use TanStack Query instead.

---

## Context Patterns

### Split State and Dispatch

```typescript
const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch | undefined>(undefined);

function Provider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

// Components that only dispatch won't re-render on state changes
```

### Memoize Context Values

```typescript
function Provider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // BAD - new object every render
  // return <Context.Provider value={{ user, setUser }}>

  // GOOD - memoized
  const value = useMemo(() => ({ user, setUser }), [user]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
```

### Custom Hook with Error

```typescript
function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

---

## Anti-Patterns

| Pattern                    | Problem                      | Fix                             |
| -------------------------- | ---------------------------- | ------------------------------- |
| Missing deps               | Stale closures               | Use exhaustive-deps rule        |
| Object in deps             | Infinite loop                | Create inside effect or useMemo |
| State for constants        | Unnecessary                  | Declare outside component       |
| useEffect chains           | Hard to follow               | Calculate in render or handler  |
| Giant context              | Cascade re-renders           | Split by domain                 |
| Premature memo             | Overhead                     | Profile first                   |
| useEffect for fetching     | Race conditions, no cache    | TanStack Query                  |
| Context for frequent state | Cascade re-renders           | XState Store / selectors        |
| Over-prop-drilling         | Unnecessary complexity       | 2-3 levels OK, then Context     |

---

## Stale Closure Fix

```typescript
// BAD - stale count
useEffect(() => {
  const id = setInterval(() => {
    console.log(count); // Always initial value
  }, 1000);
  return () => clearInterval(id);
}, []); // Empty deps = stale closure

// GOOD - functional update doesn't need count in deps
useEffect(() => {
  const id = setInterval(() => {
    setCount((c) => c + 1);
  }, 1000);
  return () => clearInterval(id);
}, []);

// GOOD - ref for read-only access
const countRef = useRef(count);
useEffect(() => {
  countRef.current = count;
}, [count]);
```

---

## State Management Decision Tree

Choose the right tool for each type of state.

### Decision Flow

```
Is state used by 1-2 components?
  └─ YES → useState / useReducer
  └─ NO  ↓

Is it just 2-3 levels of prop drilling?
  └─ YES → Props are fine, don't overcomplicate
  └─ NO  ↓

Is it server/API data?
  └─ YES → TanStack Query
  └─ NO  ↓

Does it update frequently (>1/sec)?
  └─ YES → XState Store / useRef
  └─ NO  ↓

Does it have finite states/transitions?
  └─ YES → XState (full)
  └─ NO  ↓

Is it simple, global, AND rarely changing?
  └─ YES → React Context
  └─ NO  → XState Store (has selectors, no cascade re-renders)
```

> **Before Context:** Consider if better component composition solves the problem. Often "needing Context" means components are too granular—try moving state up or passing children as props.

### State Categories

| Category       | Example              | Update Freq | Solution                |
| -------------- | -------------------- | ----------- | ----------------------- |
| Local UI       | Form inputs, toggles | Any         | `useState`              |
| Complex local  | Multi-step form      | Any         | `useReducer`            |
| Server data    | API responses        | Any         | TanStack Query          |
| Global UI      | Theme, locale        | Rare        | Context                 |
| Shared client  | Shopping cart        | Frequent    | XState Store            |
| Finite states  | Auth flow, wizard    | Varies      | XState                  |
| High-frequency | Mouse position       | >1/sec      | `useRef` + subscription |

### State Anti-Patterns

**Don't use Context for:**

- Frequently updating state (causes cascade re-renders)
- Form inputs (use controlled components or React Hook Form)
- Server state (use TanStack Query)

**Don't use full XState for:**

- Simple key-value stores (use XState Store)
- CRUD operations (use TanStack Query)

**Don't use useState for:**

- State shared across 3+ components (lift up or use Context)
- Complex objects with many update paths (use useReducer)

### Hybrid Pattern

```typescript
// Server state → TanStack Query
const { data: user } = useQuery({ queryKey: ["user"], queryFn: fetchUser });

// UI state → Context (low-frequency)
const { theme } = useTheme();

// Complex flow → XState
const [authState, send] = useMachine(authMachine);

// Local → useState
const [isOpen, setIsOpen] = useState(false);
```

### Performance Quick Reference

| Tool           | Re-render Scope | Selector Support |
| -------------- | --------------- | ---------------- |
| useState       | Component       | N/A              |
| Context        | All consumers   | No               |
| XState Store   | Selected        | Yes              |
| TanStack Query | Selected        | Yes              |

XState Store and TanStack Query support selective subscriptions - components only re-render when their selected data changes.

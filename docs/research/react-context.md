# React Context: Comprehensive Reference Guide

> Deep research on React Context API - when to use, performance implications, patterns, and best practices.

## Table of Contents

1. [Overview](#overview)
2. [Core API](#core-api)
3. [When to Use Context](#when-to-use-context)
4. [When NOT to Use Context](#when-not-to-use-context)
5. [Performance Implications](#performance-implications)
6. [Optimization Strategies](#optimization-strategies)
7. [Context Splitting Strategies](#context-splitting-strategies)
8. [Provider Composition Patterns](#provider-composition-patterns)
9. [Context with TypeScript](#context-with-typescript)
10. [Testing Components with Context](#testing-components-with-context)
11. [Context vs Redux vs Zustand](#context-vs-redux-vs-zustand)
12. [Common Mistakes and Anti-Patterns](#common-mistakes-and-anti-patterns)
13. [React 19: The `use` Hook](#react-19-the-use-hook)
14. [Summary and Decision Guide](#summary-and-decision-guide)

---

## Overview

React Context is a built-in mechanism for passing data through the component tree without manually passing props at every level. It was introduced in React 16.3 and provides a way to share values like themes, user authentication, or locale preferences across many components.

**Key characteristics:**

- Built into React (no external dependencies)
- Avoids "prop drilling" through intermediate components
- Creates a publish-subscribe relationship between providers and consumers
- Re-renders all consumers when the context value changes

---

## Core API

### createContext

Creates a Context object with an optional default value:

```typescript
import { createContext } from 'react';

// With default value
const ThemeContext = createContext('light');

// Without meaningful default (common pattern)
const AuthContext = createContext<AuthContextType | undefined>(undefined);
```

**Important notes about default values:**

- The default value is only used when there's NO matching provider above in the tree
- If a provider with `value={undefined}` exists, `undefined` is returned (not the default)
- 99% of the time, you want consumers rendered within a provider - defaults are rarely useful

### useContext

A React Hook that reads and subscribes to context:

```typescript
import { useContext } from 'react';

function Button() {
  const theme = useContext(ThemeContext);
  return <button className={theme}>Click me</button>;
}
```

**Critical caveats:**

1. `useContext()` in a component is NOT affected by providers returned from the SAME component
2. The provider must be ABOVE the calling component in the tree
3. React automatically re-renders all consumers when the provider's value changes
4. Values are compared using `Object.is()` - new object references trigger re-renders

### Provider

Wraps components that need access to the context value:

```tsx
function App() {
  const [theme, setTheme] = useState('dark');

  return (
    <ThemeContext.Provider value={theme}>
      <Page />
    </ThemeContext.Provider>
  );
}

// React 19+ shorter syntax
<ThemeContext value={theme}>
  <Page />
</ThemeContext>
```

---

## When to Use Context

### Ideal Use Cases

1. **Theming** - Dark/light mode, color schemes, spacing preferences
2. **Authentication** - Current user, login status, permissions
3. **Localization** - Language, locale, translations
4. **Routing** - Current route state (many routers use this internally)
5. **Feature Flags** - A/B testing, feature toggles
6. **Configuration** - App-wide settings that rarely change

### Good Indicators for Context

- Data needed by many components at different nesting levels
- Static or infrequently changing data
- "Low-frequency" updates (not every keystroke or mouse move)
- Avoiding prop drilling through 3+ levels
- Data truly needs to be "global" to a section of the app

```tsx
// Good: Theme rarely changes, needed everywhere
const ThemeContext = createContext<Theme>('light');

// Good: Auth state changes infrequently, needed in many places
const AuthContext = createContext<AuthState | undefined>(undefined);
```

---

## When NOT to Use Context

### Before Using Context, Try These Alternatives

#### Alternative 1: Pass Props Directly

```tsx
// Don't jump to context - explicit props are clearer
<Section>
  <Heading level={4}>Sub-heading</Heading>
</Section>
```

**Why:** Makes data flow explicit. You can see exactly which components use which data.

#### Alternative 2: Component Composition (Children Props)

```tsx
// Instead of drilling posts through Layout:
// ❌ <Layout posts={posts} />

// ✅ Extract and pass as children
<Layout>
  <Posts posts={posts} />
</Layout>
```

**Why:** Reduces layers between the component specifying data and the one needing it.

### When Context is the WRONG Choice

| Scenario | Why It's Wrong | Better Alternative |
|----------|----------------|-------------------|
| Frequently updating state | Causes excessive re-renders | Zustand, Jotai, signals |
| High-frequency updates (mouse, scroll) | Performance nightmare | useRef, event subscriptions |
| Complex state with many actions | Gets messy quickly | useReducer + Context or Redux |
| Large applications | Too many providers, poor organization | Redux, Zustand |
| State needed by 1-2 components | Overkill | Local state, prop passing |
| Form state | Re-renders entire form on each keystroke | React Hook Form, local state |

### Specific Anti-Use Cases

```tsx
// ❌ BAD: Mouse position in context (updates 60+ times/second)
const MouseContext = createContext({ x: 0, y: 0 });

// ❌ BAD: Form input values (updates on every keystroke)
const FormContext = createContext({ name: '', email: '' });

// ❌ BAD: Animation state
const AnimationContext = createContext({ progress: 0 });
```

---

## Performance Implications

### The Core Problem

**Every consumer of a context re-renders when the context value changes, regardless of whether they use the changed data.**

```tsx
// When count changes, BOTH components re-render
const AppContext = createContext({ count: 0, theme: 'dark' });

function Counter() {
  const { count } = useContext(AppContext); // Uses count
  return <div>{count}</div>;
}

function ThemeDisplay() {
  const { theme } = useContext(AppContext); // Only uses theme, but still re-renders!
  return <div>{theme}</div>;
}
```

### Re-render Cascade

1. Provider's value changes
2. React compares old and new values using `Object.is()`
3. If different (or new object reference), ALL consumers re-render
4. This happens even if a component only uses a subset of the context
5. `React.memo()` does NOT prevent context-triggered re-renders

### What Triggers Re-renders

```tsx
// ❌ Creates new object every render - always triggers updates
<AppContext.Provider value={{ user, setUser }}>

// Even if user hasn't changed, the object reference is new
```

### Performance Benchmark Comparison (2025)

| Metric | Context | Redux | Zustand | Jotai |
|--------|---------|-------|---------|-------|
| Initial Load | 180ms | 210ms | 160ms | 150ms |
| Frequent Updates | 75ms | 65ms | 35ms | 25ms |
| Bundle Size | 0KB | ~15KB | ~4KB | ~4KB |

---

## Optimization Strategies

### 1. Memoize Context Values

```tsx
import { useMemo, useCallback } from 'react';

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((credentials: Credentials) => {
    // login logic
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  // Memoize the value object
  const value = useMemo(() => ({
    user,
    login,
    logout,
    isAuthenticated: user !== null,
  }), [user, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 2. Separate State and Dispatch Contexts

```tsx
// Split into two contexts
const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // dispatch is stable - never changes
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

// Components that only dispatch won't re-render on state changes
function ActionButton() {
  const dispatch = useContext(DispatchContext); // Only subscribes to dispatch
  return <button onClick={() => dispatch({ type: 'increment' })}>+</button>;
}
```

### 3. Component Composition

```tsx
// Move state down, pass heavy components as children
function Parent() {
  return (
    <StateProvider>
      <ExpensiveComponent /> {/* Passed as children, won't re-render */}
    </StateProvider>
  );
}

function StateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialState);

  return (
    <SomeContext.Provider value={state}>
      {children} {/* children reference is stable */}
    </SomeContext.Provider>
  );
}
```

### 4. React.memo for Intermediate Components

```tsx
// Wrap components that don't need context but are in the tree
const MemoizedIntermediate = React.memo(function Intermediate({ children }) {
  return <div className="wrapper">{children}</div>;
});
```

### 5. React 19+ Compiler

The React Compiler (React 19+) automatically memoizes components and values:

- Delivers 30-60% reduction in unnecessary re-renders
- 20-40% improvement in interaction latency
- Apps with manual memoization see less benefit (10-20%)
- Apps without optimization see dramatic improvements (50-80%)

**Note:** The compiler won't save you from architectural issues like overly broad contexts.

---

## Context Splitting Strategies

### Split by Logical Domain

```tsx
// ❌ One giant context
const AppContext = createContext({
  user: null,
  theme: 'light',
  notifications: [],
  cart: [],
  language: 'en',
});

// ✅ Separate contexts by domain
const AuthContext = createContext<AuthState | undefined>(undefined);
const ThemeContext = createContext<Theme>('light');
const NotificationContext = createContext<NotificationState | undefined>(undefined);
const CartContext = createContext<CartState | undefined>(undefined);
const LocaleContext = createContext<string>('en');
```

### Split by Update Frequency

```tsx
// Group by how often data changes
const StaticConfigContext = createContext(config);     // Never changes
const SessionContext = createContext(session);          // Changes on login/logout
const UIStateContext = createContext(uiState);          // Changes frequently
```

### State/Dispatch Split Pattern (Full Example)

```tsx
// TasksContext.tsx
import { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
interface Task {
  id: number;
  text: string;
  done: boolean;
}

type TasksAction =
  | { type: 'added'; id: number; text: string }
  | { type: 'changed'; task: Task }
  | { type: 'deleted'; id: number };

// Create separate contexts
const TasksContext = createContext<Task[] | undefined>(undefined);
const TasksDispatchContext = createContext<React.Dispatch<TasksAction> | undefined>(undefined);

// Reducer
function tasksReducer(tasks: Task[], action: TasksAction): Task[] {
  switch (action.type) {
    case 'added':
      return [...tasks, { id: action.id, text: action.text, done: false }];
    case 'changed':
      return tasks.map(t => t.id === action.task.id ? action.task : t);
    case 'deleted':
      return tasks.filter(t => t.id !== action.id);
    default:
      throw new Error('Unknown action');
  }
}

// Provider
export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, dispatch] = useReducer(tasksReducer, initialTasks);

  return (
    <TasksContext.Provider value={tasks}>
      <TasksDispatchContext.Provider value={dispatch}>
        {children}
      </TasksDispatchContext.Provider>
    </TasksContext.Provider>
  );
}

// Custom hooks with error handling
export function useTasks(): Task[] {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}

export function useTasksDispatch(): React.Dispatch<TasksAction> {
  const context = useContext(TasksDispatchContext);
  if (context === undefined) {
    throw new Error('useTasksDispatch must be used within a TasksProvider');
  }
  return context;
}
```

---

## Provider Composition Patterns

### The "Provider Hell" Problem

```tsx
// ❌ Deeply nested providers
function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <CartProvider>
            <LocaleProvider>
              <RouterProvider>
                <MyApp />
              </RouterProvider>
            </LocaleProvider>
          </CartProvider>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
```

### Solution 1: Compose Providers Function

```tsx
// Utility to compose providers
function composeProviders(...providers: React.ComponentType<{ children: React.ReactNode }>[]) {
  return providers.reduce(
    (AccumulatedProviders, CurrentProvider) => {
      return ({ children }: { children: React.ReactNode }) => (
        <AccumulatedProviders>
          <CurrentProvider>{children}</CurrentProvider>
        </AccumulatedProviders>
      );
    },
    ({ children }: { children: React.ReactNode }) => <>{children}</>,
  );
}

// Usage
const AppProviders = composeProviders(
  AuthProvider,
  ThemeProvider,
  NotificationProvider,
  CartProvider,
);

function App() {
  return (
    <AppProviders>
      <MyApp />
    </AppProviders>
  );
}
```

### Solution 2: Single AppProvider Component

```tsx
// AppProvider.tsx
function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

// App.tsx
function App() {
  return (
    <AppProvider>
      <MyApp />
    </AppProvider>
  );
}
```

### Solution 3: Hierarchical Provider Organization

```tsx
// Organize by feature domain
function CoreProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LocaleProvider>
        {children}
      </LocaleProvider>
    </AuthProvider>
  );
}

function UIProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <CoreProviders>
      <UIProviders>
        <MyApp />
      </UIProviders>
    </CoreProviders>
  );
}
```

---

## Context with TypeScript

### Basic Pattern with Type Safety

```typescript
import { createContext, useContext, useState, ReactNode } from 'react';

// 1. Define the context type
interface AuthContextType {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// 2. Create context with undefined (don't force a default)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Create a custom hook with type guard
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context; // TypeScript knows this is AuthContextType, not undefined
}

// 4. Create the provider
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (credentials: Credentials) => {
    const userData = await api.login(credentials);
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: user !== null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Generic Context Factory

```typescript
import { createContext, useContext, ReactNode } from 'react';

// Reusable factory for type-safe contexts
function createSafeContext<T>(displayName: string) {
  const Context = createContext<T | undefined>(undefined);
  Context.displayName = displayName;

  function useContextSafe(): T {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error(
        `use${displayName} must be used within a ${displayName}Provider`
      );
    }
    return context;
  }

  function Provider({
    children,
    value
  }: {
    children: ReactNode;
    value: T
  }) {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  return [Provider, useContextSafe] as const;
}

// Usage
interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const [ThemeProvider, useTheme] = createSafeContext<ThemeContextValue>('Theme');

// Now you have fully typed Provider and hook
export { ThemeProvider, useTheme };
```

### Context with useReducer + TypeScript

```typescript
import { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';

// State type
interface CounterState {
  count: number;
  lastAction: string;
}

// Action types (discriminated union)
type CounterAction =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' }
  | { type: 'set'; payload: number };

// Reducer with full type safety
function counterReducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1, lastAction: 'increment' };
    case 'decrement':
      return { count: state.count - 1, lastAction: 'decrement' };
    case 'reset':
      return { count: 0, lastAction: 'reset' };
    case 'set':
      return { count: action.payload, lastAction: 'set' };
  }
}

// Separate contexts for state and dispatch
const CounterStateContext = createContext<CounterState | undefined>(undefined);
const CounterDispatchContext = createContext<Dispatch<CounterAction> | undefined>(undefined);

// Provider
export function CounterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(counterReducer, { count: 0, lastAction: '' });

  return (
    <CounterStateContext.Provider value={state}>
      <CounterDispatchContext.Provider value={dispatch}>
        {children}
      </CounterDispatchContext.Provider>
    </CounterStateContext.Provider>
  );
}

// Typed hooks
export function useCounterState(): CounterState {
  const context = useContext(CounterStateContext);
  if (context === undefined) {
    throw new Error('useCounterState must be used within CounterProvider');
  }
  return context;
}

export function useCounterDispatch(): Dispatch<CounterAction> {
  const context = useContext(CounterDispatchContext);
  if (context === undefined) {
    throw new Error('useCounterDispatch must be used within CounterProvider');
  }
  return context;
}
```

---

## Testing Components with Context

### Basic: Wrapping with Provider

```tsx
import { render, screen } from '@testing-library/react';
import { ThemeContext } from './ThemeContext';
import ThemedButton from './ThemedButton';

test('renders with dark theme', () => {
  render(
    <ThemeContext.Provider value="dark">
      <ThemedButton />
    </ThemeContext.Provider>
  );

  expect(screen.getByRole('button')).toHaveClass('dark');
});
```

### Custom Render Function

```tsx
// test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider } from './AuthContext';

interface AllProvidersProps {
  children: ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
```

### Render with Custom Provider Props

```tsx
// test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  providerProps?: {
    theme?: 'light' | 'dark';
    user?: User | null;
  };
}

function customRender(
  ui: ReactElement,
  { providerProps = {}, ...options }: CustomRenderOptions = {}
) {
  const { theme = 'light', user = null } = providerProps;

  return render(
    <ThemeContext.Provider value={theme}>
      <AuthContext.Provider value={{ user, login: vi.fn(), logout: vi.fn() }}>
        {ui}
      </AuthContext.Provider>
    </ThemeContext.Provider>,
    options
  );
}

// Usage in tests
test('shows user name when logged in', () => {
  render(<UserProfile />, {
    providerProps: {
      user: { id: 1, name: 'Test User' },
    },
  });

  expect(screen.getByText('Test User')).toBeInTheDocument();
});
```

### Testing Default Values

```tsx
test('uses default theme when no provider', () => {
  // Render without provider to test default value
  render(<ThemeDisplay />);
  expect(screen.getByText('Theme: light')).toBeInTheDocument();
});
```

### Mocking Context Values

```tsx
import { vi } from 'vitest'; // or jest

test('calls logout when button clicked', async () => {
  const mockLogout = vi.fn();

  render(
    <AuthContext.Provider value={{
      user: { id: 1, name: 'Test' },
      login: vi.fn(),
      logout: mockLogout,
      isAuthenticated: true,
    }}>
      <LogoutButton />
    </AuthContext.Provider>
  );

  await userEvent.click(screen.getByRole('button', { name: /logout/i }));
  expect(mockLogout).toHaveBeenCalledTimes(1);
});
```

---

## Context vs Redux vs Zustand

### Quick Decision Matrix

| Factor | Context | Redux (RTK) | Zustand |
|--------|---------|-------------|---------|
| **Bundle Size** | 0KB | ~15KB | ~4KB |
| **Learning Curve** | Low | Medium-High | Low |
| **Boilerplate** | Low | Medium (with RTK) | Very Low |
| **DevTools** | React DevTools | Redux DevTools (excellent) | Redux DevTools compatible |
| **Middleware** | Manual | Built-in | Built-in |
| **Performance** | Needs optimization | Good with selectors | Excellent by default |
| **TypeScript** | Good | Excellent | Excellent |
| **Server State** | Not designed for it | RTK Query | Not designed for it |

### When to Choose Each

#### Choose Context When:

- App is small to medium size
- State is simple and infrequently updated
- You're managing UI state (theme, locale, auth)
- You want zero additional dependencies
- Updates are "low-frequency" (not every keystroke)

```tsx
// Perfect for Context
const ThemeContext = createContext<'light' | 'dark'>('light');
const AuthContext = createContext<AuthState | undefined>(undefined);
```

#### Choose Redux (RTK) When:

- Large enterprise application
- Team needs strict patterns and predictability
- Complex state with many interacting pieces
- Need time-travel debugging
- Server state management (RTK Query)
- Multiple developers need consistent patterns

```tsx
// Redux shines here
const store = configureStore({
  reducer: {
    users: usersReducer,
    posts: postsReducer,
    comments: commentsReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefault) => getDefault().concat(logger, api.middleware),
});
```

#### Choose Zustand When:

- Need better performance than Context
- Want minimal boilerplate
- Prefer hooks-based API
- Need selective subscriptions (only re-render when specific data changes)
- Medium to large app without Redux's complexity

```tsx
// Zustand - simple and performant
const useStore = create<Store>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Only re-renders when count changes
const count = useStore((state) => state.count);
```

### Hybrid Approach (Recommended for 2025)

```tsx
// Use Context for truly global, low-frequency state
// - Theme, locale, auth status

// Use TanStack Query for server state
// - API data, caching, refetching

// Use Zustand/Jotai for complex client state
// - UI state that updates frequently
// - State shared across many components

// Use local state (useState) for component-specific state
// - Form inputs, toggles, modals
```

---

## Common Mistakes and Anti-Patterns

### 1. Putting Everything in One Context

```tsx
// ❌ BAD: One giant context
const AppContext = createContext({
  user: null,
  theme: 'light',
  cart: [],
  notifications: [],
  language: 'en',
  isMenuOpen: false,
  // ... 20 more fields
});

// ✅ GOOD: Separate by domain
const AuthContext = createContext(null);
const ThemeContext = createContext('light');
const CartContext = createContext([]);
```

### 2. Not Memoizing Object Values

```tsx
// ❌ BAD: Creates new object every render
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ GOOD: Memoize the value
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const value = useMemo(() => ({ user, setUser }), [user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 3. Using Context for Frequently Updating State

```tsx
// ❌ BAD: Updates on every mouse move
const MouseContext = createContext({ x: 0, y: 0 });

function MouseProvider({ children }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <MouseContext.Provider value={position}>
      {children}
    </MouseContext.Provider>
  );
}

// ✅ GOOD: Use ref or subscription pattern
function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return position; // Local to component, no context needed
}
```

### 4. Not Creating Custom Hooks

```tsx
// ❌ BAD: Using useContext directly everywhere
function Profile() {
  const context = useContext(AuthContext);
  if (!context) {
    // Handle error? Forget sometimes?
  }
  return <div>{context?.user?.name}</div>;
}

// ✅ GOOD: Custom hook with error handling
function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

function Profile() {
  const { user } = useAuth(); // Clean, safe, typed
  return <div>{user.name}</div>;
}
```

### 5. Overusing Context Instead of Composition

```tsx
// ❌ BAD: Context for data only needed one level deep
const ButtonColorContext = createContext('blue');

function Card() {
  return (
    <ButtonColorContext.Provider value="green">
      <CardBody />
    </ButtonColorContext.Provider>
  );
}

// ✅ GOOD: Just pass as prop or use children
function Card() {
  return <CardBody buttonColor="green" />;
}

// Or even better - composition
function Card() {
  return (
    <CardBody>
      <Button color="green">Click</Button>
    </CardBody>
  );
}
```

### 6. Forgetting Provider Hierarchy

```tsx
// ❌ BAD: Provider in same component as useContext
function App() {
  const theme = useContext(ThemeContext); // Uses OLD provider, not the one below!

  return (
    <ThemeContext.Provider value="dark">
      <Page />
    </ThemeContext.Provider>
  );
}

// ✅ GOOD: Provider must be ABOVE consumer
function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Page /> {/* Components here can use the context */}
    </ThemeContext.Provider>
  );
}
```

### 7. Tight Coupling to Context

```tsx
// ❌ BAD: Component only works with context
function UserAvatar() {
  const { user } = useAuth(); // Tightly coupled
  return <img src={user.avatarUrl} alt={user.name} />;
}

// ✅ GOOD: Accept props, use context as default
function UserAvatar({ user: propUser }: { user?: User }) {
  const { user: contextUser } = useAuth();
  const user = propUser ?? contextUser;

  return <img src={user.avatarUrl} alt={user.name} />;
}
```

---

## React 19: The `use` Hook

React 19 introduces the `use` hook, which provides more flexibility than `useContext`.

### Key Differences from useContext

| Feature | useContext | use |
|---------|------------|-----|
| Conditional calls | Not allowed | Allowed |
| Inside loops | Not allowed | Allowed |
| After early returns | Not allowed | Allowed |
| Works with Promises | No | Yes (with Suspense) |

### Conditional Context Reading

```tsx
import { use } from 'react';

function FeatureFlag({ featureName, children }) {
  const { isEnabled } = use(FeatureFlagsContext);

  // Can conditionally read context!
  if (!isEnabled(featureName)) {
    return null;
  }

  // Can read another context conditionally
  const theme = use(ThemeContext);

  return <div className={theme}>{children}</div>;
}
```

### Reading Context in Loops

```tsx
function MultiThemePreview({ themes }) {
  return (
    <div>
      {themes.map((themeName) => {
        // Can use context inside map!
        const settings = use(ThemeSettingsContext);
        return <ThemeCard key={themeName} settings={settings[themeName]} />;
      })}
    </div>
  );
}
```

### Promise Unwrapping (with Suspense)

```tsx
import { use, Suspense } from 'react';

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // Suspends until resolved
  return <div>{user.name}</div>;
}

function App() {
  const userPromise = fetchUser('123');

  return (
    <Suspense fallback={<Loading />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

---

## Summary and Decision Guide

### Quick Reference: When to Use What

```
┌─────────────────────────────────────────────────────────────────┐
│                    State Management Decision Tree                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Is the state used by only 1-2 components?                      │
│    └─ YES → Use useState or useReducer (local state)            │
│    └─ NO  ↓                                                     │
│                                                                 │
│  Is it server/API data?                                         │
│    └─ YES → Use TanStack Query, SWR, or RTK Query               │
│    └─ NO  ↓                                                     │
│                                                                 │
│  Does it update frequently (>1/second)?                         │
│    └─ YES → Use Zustand, Jotai, or refs                         │
│    └─ NO  ↓                                                     │
│                                                                 │
│  Is it simple, low-frequency, truly global state?               │
│  (theme, auth, locale)                                          │
│    └─ YES → Use React Context                                   │
│    └─ NO  ↓                                                     │
│                                                                 │
│  Is it complex state with many actions?                         │
│    └─ YES → Context + useReducer, or Redux/Zustand              │
│    └─ NO  → Context is probably fine                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Context Best Practices Checklist

- [ ] Use custom hooks with error handling for context consumption
- [ ] Split contexts by logical domain (auth, theme, cart)
- [ ] Separate state and dispatch into different contexts
- [ ] Memoize object/array values with useMemo
- [ ] Memoize callback functions with useCallback
- [ ] Consider composition (children props) before reaching for context
- [ ] Profile before optimizing - measure actual performance
- [ ] Use TypeScript with proper type guards
- [ ] Create reusable test utilities for context providers

### Final Recommendations

1. **Start simple**: Begin with `useState` and prop passing
2. **Add Context**: Only when you have genuine prop drilling (3+ levels)
3. **Split early**: Create separate contexts from the start
4. **Optimize later**: Profile first, then apply memoization
5. **Consider alternatives**: For frequent updates, use Zustand or Jotai
6. **Stay updated**: React 19's `use` hook offers new patterns

---

## Sources

- [React Official Documentation - useContext](https://react.dev/reference/react/useContext)
- [React Official Documentation - Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)
- [React Official Documentation - Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context)
- [Kent C. Dodds - How to use React Context effectively](https://kentcdodds.com/blog/how-to-use-react-context-effectively)
- [Developerway - How to write performant React apps with Context](https://www.developerway.com/posts/how-to-write-performant-react-apps-with-context)
- [LogRocket - Pitfalls of overusing React Context](https://blog.logrocket.com/pitfalls-of-overusing-react-context/)
- [Testing Library - React Context Examples](https://testing-library.com/docs/example-react-context/)
- [State Management in 2025: Context, Redux, Zustand, or Jotai](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k)
- [Advanced React Context Optimization](https://javascript.plainenglish.io/advanced-react-context-optimization-master-selective-re-rendering-patterns-to-eliminate-53a34e2c710b)
- [Zustand Official Comparison](https://zustand.docs.pmnd.rs/getting-started/comparison)

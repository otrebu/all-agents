# React Hooks: Comprehensive Reference Guide

> Deep research on React Hooks - rules, patterns, anti-patterns, and best practices.
> Last updated: December 2024

## Table of Contents

1. [Rules of Hooks](#rules-of-hooks)
2. [useState](#usestate)
3. [useEffect](#useeffect)
4. [useCallback and useMemo](#usecallback-and-usememo)
5. [useRef](#useref)
6. [Custom Hooks](#custom-hooks)
7. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
8. [Stale Closure Issues](#stale-closure-issues)
9. [Testing Hooks](#testing-hooks)
10. [Performance Optimization](#performance-optimization)
11. [When NOT to Use Certain Hooks](#when-not-to-use-certain-hooks)
12. [React 19 New Hooks](#react-19-new-hooks)
13. [Sources](#sources)

---

## Rules of Hooks

React Hooks have strict rules that must be followed to ensure correct behavior.

### The Two Fundamental Rules

1. **Only call Hooks at the top level** - Don't call Hooks inside loops, conditions, or nested functions
2. **Only call Hooks from React functions** - Call Hooks from React function components or custom Hooks

### Why These Rules Exist

React relies on the order in which Hooks are called to correctly associate state and effects with each component render. Calling Hooks conditionally breaks this association.

```javascript
// BAD - Conditional hook call
function Component({ condition }) {
  if (condition) {
    const [value, setValue] = useState(0); // Will break!
  }
}

// GOOD - Hook at top level, condition inside
function Component({ condition }) {
  const [value, setValue] = useState(0);

  if (condition) {
    // Use value here
  }
}
```

### The exhaustive-deps Rule

The `react-hooks/exhaustive-deps` ESLint rule validates that dependency arrays contain all necessary dependencies.

```bash
npm install eslint-plugin-react-hooks --save-dev
```

**ESLint 9+ Configuration:**

```javascript
// eslint.config.js
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  reactHooks.configs.flat.recommended,
]);
```

**Why it matters:** When a value referenced inside a Hook isn't included in the dependency array, React won't re-run the effect or recalculate the value when that dependency changes. This causes **stale closures** where the Hook uses outdated values.

---

## useState

### Core Concepts

`useState` returns a state variable and a setter function. The state persists across renders and updating it triggers a re-render.

```javascript
const [count, setCount] = useState(0);
```

### Key Caveats

1. **State updates are not immediate** - The value only changes on the next render
2. **React uses `Object.is()` for comparison** - Mutating objects won't trigger updates
3. **Strict Mode calls functions twice** - For detecting impure functions (development only)

```javascript
function handleClick() {
  setName('Robin');
  console.log(name); // Still the old value!
}
```

### Patterns and Best Practices

#### Functional Updates

Use updater functions when calculating new state from previous state:

```javascript
// WRONG - Multiple clicks may not work as expected
function handleClick() {
  setAge(age + 1);
  setAge(age + 1);
  setAge(age + 1); // Results in age + 1, not age + 3
}

// CORRECT - Queues updates properly
function handleClick() {
  setAge(a => a + 1);
  setAge(a => a + 1);
  setAge(a => a + 1); // Results in age + 3
}
```

#### Lazy Initialization

Avoid recreating expensive initial state on every render:

```javascript
// WRONG - createInitialTodos() runs on EVERY render
const [todos, setTodos] = useState(createInitialTodos());

// CORRECT - createInitialTodos only runs ONCE during initialization
const [todos, setTodos] = useState(createInitialTodos);
```

#### Immutable Updates

Always create new references for objects and arrays:

```javascript
// Objects
setForm({
  ...form,
  firstName: 'Taylor'
});

// Nested Objects
setPerson({
  ...person,
  artwork: {
    ...person.artwork,
    title: 'New Title'
  }
});

// Arrays - Add
setTodos([...todos, newTodo]);

// Arrays - Update
setTodos(todos.map(t =>
  t.id === id ? { ...t, done: !t.done } : t
));

// Arrays - Remove
setTodos(todos.filter(t => t.id !== id));
```

### State Structure Guidelines

1. **Group related state** - If two variables always update together, merge them
2. **Avoid contradictions** - Structure state to prevent "impossible" states
3. **Avoid redundant state** - Don't store values that can be calculated
4. **Avoid duplication** - Store IDs instead of copying objects
5. **Avoid deeply nested state** - Flatten structures for easier updates

```javascript
// BAD - Contradictory states possible
const [isSending, setIsSending] = useState(false);
const [isSent, setIsSent] = useState(false);

// GOOD - Single status variable
const [status, setStatus] = useState('typing'); // 'typing', 'sending', 'sent'
```

```javascript
// BAD - Redundant state
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [fullName, setFullName] = useState(''); // Redundant!

// GOOD - Calculate during render
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const fullName = firstName + ' ' + lastName;
```

### Common Pitfalls

1. **Mutating state directly** - React won't detect changes
2. **Using useState for constants** - Declare outside component instead
3. **Mirroring props in state** - Usually unnecessary; derive from props directly
4. **Calling handler during render** - `onClick={handleClick()}` vs `onClick={handleClick}`

---

## useEffect

### Core Purpose

`useEffect` synchronizes React components with external systems (APIs, DOM, timers, subscriptions). It runs **after** the component commits to the DOM.

### Syntax

```javascript
useEffect(() => {
  // Setup code
  return () => {
    // Cleanup code (optional)
  };
}, [dependencies]); // Dependency array (optional)
```

### Dependency Array Patterns

| Pattern | Behavior | Use Case |
|---------|----------|----------|
| `[dep1, dep2]` | Runs after mount + when dependencies change | Most common |
| `[]` | Runs only after initial mount | Connect once |
| (omitted) | Runs after every render | Rarely needed |

### Cleanup Patterns

Cleanup is essential for preventing memory leaks and race conditions.

```javascript
// Proper cleanup for subscriptions
useEffect(() => {
  const connection = createConnection(serverUrl, roomId);
  connection.connect();
  return () => {
    connection.disconnect();
  };
}, [serverUrl, roomId]);

// Proper cleanup for timers
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);
  return () => clearInterval(id);
}, []);
```

### Race Conditions with Async Operations

When fetching data, previous requests may complete after newer ones:

```javascript
// WRONG - Race condition possible
useEffect(() => {
  async function fetchData() {
    const result = await fetchBio(person);
    setBio(result); // May set stale data!
  }
  fetchData();
}, [person]);

// CORRECT - Boolean flag pattern
useEffect(() => {
  let ignore = false;

  async function fetchData() {
    const result = await fetchBio(person);
    if (!ignore) {
      setBio(result);
    }
  }

  fetchData();
  return () => {
    ignore = true;
  };
}, [person]);

// CORRECT - AbortController pattern
useEffect(() => {
  const controller = new AbortController();

  async function fetchData() {
    try {
      const result = await fetchBio(person, { signal: controller.signal });
      setBio(result);
    } catch (e) {
      if (e.name !== 'AbortError') throw e;
    }
  }

  fetchData();
  return () => controller.abort();
}, [person]);
```

### Common Patterns

#### Removing Object Dependencies

Objects created during render are always "new":

```javascript
// BAD - options recreated every render, effect always re-runs
const options = { serverUrl, roomId };
useEffect(() => {
  const connection = createConnection(options);
  connection.connect();
  return () => connection.disconnect();
}, [options]);

// GOOD - Create object inside effect
useEffect(() => {
  const options = { serverUrl, roomId };
  const connection = createConnection(options);
  connection.connect();
  return () => connection.disconnect();
}, [roomId]);
```

#### Using Updater Functions

Avoid state dependencies when possible:

```javascript
// BAD - Effect re-runs every time count changes
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(id);
}, [count]);

// GOOD - No dependency on count
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);
  return () => clearInterval(id);
}, []);
```

### Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Effect runs twice on mount | Strict Mode verification | Ensure cleanup mirrors setup |
| Effect runs after every render | Missing dependency array or recreated deps | Add deps or create objects inside effect |
| Infinite loop | Effect updates state, causing re-run | Use updater functions or refs |
| Cleanup runs unexpectedly | Normal behavior on dep change | Cleanup runs before each re-run |

---

## useCallback and useMemo

### Core Purpose

- **`useMemo`**: Caches the result of an expensive calculation
- **`useCallback`**: Caches a function definition between re-renders

### The Cost-Benefit Reality

> "Performance optimizations are not free. They ALWAYS come with a cost but do NOT always come with a benefit." - Kent C. Dodds

**Costs of memoization:**
1. **Execution overhead** - Hook invocation and dependency array creation
2. **Memory penalties** - React retains references instead of garbage collecting
3. **Code complexity** - Harder to maintain, risk of dependency mistakes

### When to Use useMemo

1. **Expensive calculations** that are noticeably slow
2. **Values passed to memoized components** as props
3. **Values used as dependencies** of other Hooks

```javascript
// GOOD - Expensive calculation
const visibleTodos = useMemo(
  () => filterTodos(todos, filter),
  [todos, filter]
);

// GOOD - Preserving reference for React.memo child
const options = useMemo(
  () => ({ serverUrl, roomId }),
  [serverUrl, roomId]
);

return <MemoizedChild options={options} />;
```

### When to Use useCallback

1. **Functions passed to memoized components** (prevents breaking `React.memo`)
2. **Functions used as dependencies** of other Hooks
3. **Custom hooks** that return stable function references

```javascript
// GOOD - Function passed to memoized child
const handleClick = useCallback(() => {
  console.log(count);
}, [count]);

return <MemoizedButton onClick={handleClick} />;
```

### When NOT to Use These Hooks

- Simple calculations that take < 1ms
- Values not passed to memoized components
- Values not used as dependencies
- When you haven't profiled and identified a performance issue

```javascript
// UNNECESSARY - Simple calculation
const fullName = useMemo(
  () => firstName + ' ' + lastName,
  [firstName, lastName]
);

// JUST USE
const fullName = firstName + ' ' + lastName;
```

### React Compiler (2025)

React 19's compiler automatically adds memoization, reducing the need for manual optimization. The compiler:

- Automatically memoizes values and functions
- Handles most optimization automatically
- Makes `useMemo` and `useCallback` less frequently needed

**Manual memoization still useful for:**
- Third-party libraries with identity constraints
- Intentional throttling/debouncing patterns
- Hot paths in massive lists (after profiling proves it helps)

---

## useRef

### Core Purpose

`useRef` returns a mutable object that persists across renders without causing re-renders.

```javascript
const ref = useRef(initialValue);
// Access via ref.current
```

### Key Characteristics

| Aspect | Refs | State |
|--------|------|-------|
| Re-renders | Does NOT trigger re-render | Triggers re-render |
| Mutability | Mutable - modify `.current` directly | "Immutable" - use setter |
| Reading | Don't read during rendering | Can read anytime |
| Persistence | Survives re-renders | Survives re-renders |

### Primary Use Cases

#### 1. DOM Element Access

```javascript
function TextInputWithFocusButton() {
  const inputRef = useRef(null);

  function handleClick() {
    inputRef.current.focus();
  }

  return (
    <>
      <input ref={inputRef} type="text" />
      <button onClick={handleClick}>Focus the input</button>
    </>
  );
}
```

#### 2. Storing Mutable Values (No Re-render Needed)

```javascript
function Stopwatch() {
  const intervalRef = useRef(null);
  const [seconds, setSeconds] = useState(0);

  function handleStart() {
    intervalRef.current = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
  }

  function handleStop() {
    clearInterval(intervalRef.current);
  }

  return (
    <>
      <p>{seconds} seconds</p>
      <button onClick={handleStart}>Start</button>
      <button onClick={handleStop}>Stop</button>
    </>
  );
}
```

#### 3. Tracking Previous Values

```javascript
function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return <p>Now: {count}, Before: {prevCount}</p>;
}
```

#### 4. Avoiding Stale Closures in Async Code

```javascript
function Component() {
  const [text, setText] = useState('');
  const textRef = useRef(text);

  // Keep ref in sync with state
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  function handleSend() {
    setTimeout(() => {
      // textRef.current has the latest value
      alert('Sending: ' + textRef.current);
    }, 3000);
  }
}
```

### Best Practices

1. **Treat refs as an escape hatch** - Use for external systems and browser APIs
2. **Don't read/write `.current` during rendering** - Except for one-time initialization
3. **Understand refs mutate immediately** - Unlike state which updates asynchronously

```javascript
// BAD - Reading ref during render
return <button>{countRef.current} times</button>;

// GOOD - Use state for rendered values
const [count, setCount] = useState(0);
return <button>{count} times</button>;
```

### TypeScript Patterns

```typescript
// DOM ref (initialized to null)
const inputRef = useRef<HTMLInputElement>(null);

// Mutable value ref
const countRef = useRef<number>(0);

// Nullable mutable ref
const intervalIdRef = useRef<number | null>(null);
```

---

## Custom Hooks

### Naming Convention

Always prefix custom hooks with `use` (e.g., `useAuth`, `useFetch`, `useLocalStorage`).

**Important:** Only use the `use` prefix for functions that actually call other Hooks. A function that doesn't use Hooks shouldn't be named like a Hook.

### Best Practices

1. **Single Responsibility** - Each Hook should do one thing well
2. **Return consistent data structures** - Objects for named values, tuples for state + setter
3. **Handle cleanup properly** - Always clean up subscriptions and timers
4. **Include error handling** - Provide meaningful error states
5. **Avoid premature abstraction** - Only create custom Hooks when they provide real value

### Common Patterns

#### useLocalStorage

```javascript
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function
        ? value(storedValue)
        : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// Usage
const [theme, setTheme] = useLocalStorage('theme', 'light');
```

#### useDebounce

```javascript
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 500);

useEffect(() => {
  // API call with debouncedSearch
}, [debouncedSearch]);
```

#### usePrevious

```javascript
function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// Usage
const [count, setCount] = useState(0);
const prevCount = usePrevious(count);
```

#### useFetch

```javascript
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(url);
        const result = await response.json();
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}

// Usage
const { data, loading, error } = useFetch('/api/users');
```

---

## Anti-Patterns to Avoid

### 1. Conditional Hook Calls

```javascript
// BAD - Hooks in condition
function Component({ condition }) {
  if (condition) {
    const [value, setValue] = useState(0);
  }
}

// GOOD - Condition inside Hook logic
function Component({ condition }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (condition) {
      // Do something
    }
  }, [condition]);
}
```

### 2. Missing Dependencies

```javascript
// BAD - Missing count dependency
useEffect(() => {
  console.log(count);
}, []); // ESLint will warn

// GOOD - All dependencies listed
useEffect(() => {
  console.log(count);
}, [count]);
```

### 3. Infinite Re-render Loops

```javascript
// BAD - Object created every render
useEffect(() => {
  doSomething(options);
}, [{ a: 1, b: 2 }]); // New object every render = infinite loop

// GOOD - Primitive values or memoized objects
useEffect(() => {
  doSomething({ a, b });
}, [a, b]);
```

### 4. Overusing useEffect

```javascript
// BAD - useEffect for derived state
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [fullName, setFullName] = useState('');

useEffect(() => {
  setFullName(firstName + ' ' + lastName);
}, [firstName, lastName]);

// GOOD - Calculate during render
const fullName = firstName + ' ' + lastName;
```

### 5. Not Using State When Needed

```javascript
// BAD - Variable resets on every render
function Component() {
  let count = 0; // Resets to 0 on every render!

  function increment() {
    count += 1;
  }
}

// GOOD - Use state for persistent values
function Component() {
  const [count, setCount] = useState(0);

  function increment() {
    setCount(c => c + 1);
  }
}
```

### 6. Using useState for Constants

```javascript
// BAD - Unnecessary state
function Component() {
  const [config] = useState({ apiUrl: '/api' });
}

// GOOD - Declare outside component
const CONFIG = { apiUrl: '/api' };

function Component() {
  // Use CONFIG directly
}
```

### 7. Missing Cleanup in useEffect

```javascript
// BAD - No cleanup for interval
useEffect(() => {
  setInterval(() => {
    setCount(c => c + 1);
  }, 1000);
}, []);

// GOOD - Proper cleanup
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);
  return () => clearInterval(id);
}, []);
```

### 8. Naming Non-Hooks with "use" Prefix

```javascript
// BAD - No hooks inside, shouldn't have "use" prefix
function useFormatDate(date) {
  return date.toLocaleDateString();
}

// GOOD - Regular function
function formatDate(date) {
  return date.toLocaleDateString();
}
```

### 9. Premature Memoization

```javascript
// BAD - Unnecessary memoization
const value = useMemo(() => a + b, [a, b]);

// GOOD - Simple calculation doesn't need memoization
const value = a + b;
```

### 10. Overusing Memoization

Using memoization everywhere adds complexity and memory overhead without guaranteed benefits. Only apply after profiling identifies actual performance issues.

---

## Stale Closure Issues

### What is a Stale Closure?

A stale closure occurs when a function captures variables that have outdated values. This is one of the most common bugs with React Hooks.

### Common Scenarios

#### 1. useEffect with State Dependencies

```javascript
// BAD - Stale closure
function WatchCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setInterval(() => {
      console.log(`Count is: ${count}`); // Always logs 0!
    }, 2000);
  }, []); // Empty deps = captures initial count
}

// GOOD - Add dependency and cleanup
function WatchCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(`Count is: ${count}`);
    }, 2000);
    return () => clearInterval(id);
  }, [count]); // Re-runs when count changes
}
```

#### 2. Async Handlers with State

```javascript
// BAD - Multiple rapid clicks won't work correctly
function DelayedCount() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setTimeout(() => {
      setCount(count + 1); // All clicks use same stale count
    }, 1000);
  }
}

// GOOD - Functional update
function DelayedCount() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setTimeout(() => {
      setCount(c => c + 1); // Always uses latest
    }, 1000);
  }
}
```

### Solutions

1. **Include all dependencies** in the dependency array
2. **Use functional updates** for state-dependent updates
3. **Use refs** to track latest values in async code
4. **Enable ESLint plugin** to detect missing dependencies

```javascript
// Solution: Use ref for latest value
function Component() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  function handleAsyncAction() {
    setTimeout(() => {
      console.log(countRef.current); // Always latest
    }, 1000);
  }
}
```

### React 19.2: useEffectEvent

The new `useEffectEvent` Hook (experimental) provides a cleaner solution:

```javascript
function Page({ url, shoppingCart }) {
  const onVisit = useEffectEvent((visitedUrl) => {
    logVisit(visitedUrl, shoppingCart.length); // Always latest
  });

  useEffect(() => {
    onVisit(url);
  }, [url]); // No need to include shoppingCart
}
```

---

## Testing Hooks

### Setup

The `@testing-library/react-hooks` package has been merged into `@testing-library/react`. Use the built-in `renderHook` API.

```bash
npm install @testing-library/react --save-dev
```

### Basic Pattern

```javascript
import { renderHook, act } from '@testing-library/react';
import useCounter from './useCounter';

test('should increment counter', () => {
  const { result } = renderHook(() => useCounter());

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

### Testing Async Hooks

```javascript
import { renderHook, waitFor } from '@testing-library/react';
import useFetch from './useFetch';

test('should fetch data', async () => {
  const { result } = renderHook(() => useFetch('/api/users'));

  expect(result.current.loading).toBe(true);

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.data).toBeDefined();
});
```

### Testing with Dependencies

```javascript
test('should update when props change', () => {
  const { result, rerender } = renderHook(
    ({ userId }) => useUser(userId),
    { initialProps: { userId: 1 } }
  );

  expect(result.current.user.id).toBe(1);

  rerender({ userId: 2 });

  expect(result.current.user.id).toBe(2);
});
```

### Testing with Fake Timers

```javascript
test('should debounce value', () => {
  jest.useFakeTimers();

  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 500),
    { initialProps: { value: 'a' } }
  );

  expect(result.current).toBe('a');

  rerender({ value: 'ab' });
  expect(result.current).toBe('a'); // Still old value

  act(() => {
    jest.advanceTimersByTime(500);
  });

  expect(result.current).toBe('ab'); // Now updated

  jest.useRealTimers();
});
```

### Best Practices

1. **Test behavior, not implementation** - Focus on outputs, not internal state
2. **Use `act()` for state updates** - Wrap actions that cause state changes
3. **Use `waitFor` for async operations** - Don't rely on fixed timeouts
4. **Test edge cases** - Error states, loading states, empty data

---

## Performance Optimization

### Measurement First

> "Measure before you optimize" - The cardinal rule of performance

**Tools:**
- React DevTools Profiler
- Chrome DevTools Performance tab
- Lighthouse
- React DevTools "Highlight updates when components render"

### Key Optimization Hooks

#### useTransition (Concurrent Features)

Marks state updates as non-urgent, keeping UI responsive:

```javascript
function SearchResults() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    // Urgent: Update input immediately
    setQuery(e.target.value);

    // Non-urgent: Filter results can wait
    startTransition(() => {
      setFilteredResults(filterResults(e.target.value));
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending ? <Spinner /> : <ResultsList results={filteredResults} />}
    </>
  );
}
```

#### useDeferredValue

Defers updating part of the UI:

```javascript
function SearchPage({ query }) {
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <SearchInput query={query} />
      <Suspense fallback={<Loading />}>
        <SearchResults query={deferredQuery} />
      </Suspense>
    </>
  );
}
```

### Performance Patterns

1. **State colocation** - Keep state close to where it's used
2. **Lift expensive components** - Move them outside of frequently re-rendering parents
3. **Split components** - Isolate parts that change frequently
4. **Use React.memo strategically** - After profiling proves it helps
5. **Virtualize long lists** - Only render visible items

### Target Metrics

- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- First Input Delay: < 100ms
- Lighthouse Performance: 90+

---

## When NOT to Use Certain Hooks

### When NOT to Use useEffect

#### 1. Transforming Data for Rendering

```javascript
// BAD
useEffect(() => {
  setFullName(firstName + ' ' + lastName);
}, [firstName, lastName]);

// GOOD - Calculate during render
const fullName = firstName + ' ' + lastName;
```

#### 2. Caching Expensive Calculations

```javascript
// BAD
useEffect(() => {
  setVisibleTodos(getFilteredTodos(todos, filter));
}, [todos, filter]);

// GOOD - Use useMemo
const visibleTodos = useMemo(
  () => getFilteredTodos(todos, filter),
  [todos, filter]
);
```

#### 3. Handling User Events

```javascript
// BAD
useEffect(() => {
  if (product.isInCart) {
    showNotification('Added to cart!');
  }
}, [product]);

// GOOD - Handle in event handler
function handleBuyClick() {
  addToCart(product);
  showNotification('Added to cart!');
}
```

#### 4. POST Requests from User Events

```javascript
// BAD
const [formData, setFormData] = useState(null);
useEffect(() => {
  if (formData) {
    post('/api/submit', formData);
  }
}, [formData]);

// GOOD - Handle in event handler
function handleSubmit() {
  post('/api/submit', { firstName, lastName });
}
```

#### 5. Chains of State Updates

```javascript
// BAD - Effect chains
useEffect(() => {
  if (card?.gold) setGoldCount(c => c + 1);
}, [card]);

useEffect(() => {
  if (goldCount > 3) setRound(r => r + 1);
}, [goldCount]);

// GOOD - Calculate and update in event handler
function handlePlaceCard(nextCard) {
  setCard(nextCard);
  if (nextCard.gold) {
    if (goldCount < 3) {
      setGoldCount(c => c + 1);
    } else {
      setGoldCount(0);
      setRound(r => r + 1);
    }
  }
}
```

#### 6. Notifying Parent Components

```javascript
// BAD
useEffect(() => {
  onChange(isOn);
}, [isOn, onChange]);

// GOOD - Update both in event handler
function updateToggle(nextIsOn) {
  setIsOn(nextIsOn);
  onChange(nextIsOn);
}
```

### When TO Use useEffect

- **Synchronizing with external systems** (non-React widgets, network)
- **Subscriptions** (WebSocket, event listeners) - or use `useSyncExternalStore`
- **Data fetching** (with proper cleanup) - or use a library like TanStack Query
- **Analytics on component mount**
- **Controlling browser APIs** (title, focus, etc.)

### When NOT to Use useMemo/useCallback

- Simple calculations (< 1ms)
- Values not passed to memoized components
- Values not used as dependencies
- Before identifying an actual performance issue
- The React Compiler is handling it automatically (React 19+)

### When NOT to Use useRef

- When you need the component to re-render when the value changes
- When the value should be displayed in the UI
- For any value that affects what gets rendered

---

## React 19 New Hooks

### `use` Hook

Handles promises, context, or reactive values more flexibly than traditional Hooks. Unlike other Hooks, `use` can be called inside conditionals and loops.

```javascript
import { use } from 'react';

function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);
  return comments.map(c => <p key={c.id}>{c.text}</p>);
}
```

### `useActionState` Hook

Simplifies state management within Actions:

```javascript
import { useActionState } from 'react';

function SubmitButton() {
  const [state, formAction, isPending] = useActionState(
    async (prevState, formData) => {
      const result = await submitForm(formData);
      return result;
    },
    null
  );

  return (
    <form action={formAction}>
      <button disabled={isPending}>
        {isPending ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

### `useFormStatus` Hook

Access parent form information within child components:

```javascript
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}
```

### `useOptimistic` Hook

Facilitates optimistic UI updates:

```javascript
import { useOptimistic } from 'react';

function TodoList({ todos, addTodo }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo) => [...state, { ...newTodo, pending: true }]
  );

  async function handleAdd(text) {
    addOptimisticTodo({ text, id: Date.now() });
    await addTodo(text);
  }

  return optimisticTodos.map(todo => (
    <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
      {todo.text}
    </li>
  ));
}
```

### `useEffectEvent` Hook (React 19.2)

Decouples event logic from effect dependencies:

```javascript
import { useEffectEvent } from 'react';

function Page({ url, shoppingCart }) {
  const onVisit = useEffectEvent((visitedUrl) => {
    logVisit(visitedUrl, shoppingCart.length);
  });

  useEffect(() => {
    onVisit(url);
  }, [url]); // No need to include shoppingCart
}
```

### Other React 19 Changes

- **`ref` as a prop** - No more `forwardRef` needed for function components
- **Improved `useTransition`** - Now supports async functions
- **Updated `useId` prefix** - Changed from `:r:` to `_r_` for View Transitions compatibility
- **React Compiler** - Automatic memoization reduces need for `useMemo`/`useCallback`

---

## Sources

### Official React Documentation
- [Rules of Hooks](https://legacy.reactjs.org/docs/hooks-rules.html)
- [useState](https://react.dev/reference/react/useState)
- [useEffect](https://react.dev/reference/react/useEffect)
- [useMemo](https://react.dev/reference/react/useMemo)
- [useCallback](https://react.dev/reference/react/useCallback)
- [useRef](https://react.dev/reference/react/useRef)
- [Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs)
- [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks)
- [exhaustive-deps](https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps)
- [React v19](https://react.dev/blog/2024/12/05/react-19)
- [React 19.2](https://react.dev/blog/2025/10/01/react-19-2)

### Expert Articles
- [Understanding useMemo and useCallback - Josh W. Comeau](https://www.joshwcomeau.com/react/usememo-and-usecallback/)
- [When to useMemo and useCallback - Kent C. Dodds](https://kentcdodds.com/blog/usememo-and-usecallback)
- [Be Aware of Stale Closures when Using React Hooks - Dmitri Pavlutin](https://dmitripavlutin.com/react-hooks-stale-closures/)
- [5 Mistakes to Avoid When Using React Hooks - Dmitri Pavlutin](https://dmitripavlutin.com/react-hooks-mistakes-to-avoid/)
- [Fixing Race Conditions in React with useEffect - Max Rozen](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect)
- [How the React Hooks ESLint plugin saved me - Max Rozen](https://maxrozen.com/react-hooks-eslint-plugin-saved-hours-debugging-useeffect)
- [Understanding when to use useMemo - Max Rozen](https://maxrozen.com/understanding-when-use-usememo)

### Performance and Patterns
- [React Performance Optimization 2025](https://www.growin.com/blog/react-performance-optimization-2025/)
- [React Design Patterns and Best Practices for 2025](https://www.telerik.com/blogs/react-design-patterns-best-practices)
- [React 19 Compiler: Why useMemo/useCallback Are Dead](https://isitdev.com/react-19-compiler-usememo-usecallback-dead-2025/)
- [React has changed, your Hooks should too](https://allthingssmitty.com/2025/12/01/react-has-changed-your-hooks-should-too/)

### Anti-Patterns and Best Practices
- [React Hooks Anti-Patterns: A Comprehensive Guide](https://techinsights.manisuec.com/reactjs/react-hooks-antipatterns/)
- [React Hooks Best Practices - rtCamp](https://rtcamp.com/handbook/react-best-practices/hooks/)
- [Common Mistakes to Avoid When Using useState](https://skynix.co/resources/common-mistakes-to-avoid-when-using-usestate-in-react)
- [Master React useState: Patterns That Scale](https://strapi.io/blog/react-usestate-hook-guide-best-practices)

### Custom Hooks
- [Practical Patterns for React Custom Hooks](https://leapcell.io/blog/practical-patterns-for-react-custom-hooks)
- [useHooks - The React Hooks Library](https://usehooks.com/)
- [useLocalStorage - useHooks](https://usehooks.com/uselocalstorage)

### Testing
- [Testing Library API](https://testing-library.com/docs/react-testing-library/api/)
- [How to test custom React hooks - Kent C. Dodds](https://kentcdodds.com/blog/how-to-test-custom-react-hooks)
- [React Hooks Testing Library](https://react-hooks-testing-library.com/)

### Race Conditions and Async
- [Race conditions in useEffect with async: modern patterns 2025](https://medium.com/@sureshdotariya/race-conditions-in-useeffect-with-async-modern-patterns-for-reactjs-2025-9efe12d727b0)
- [Avoiding Race Conditions when Fetching Data with React Hooks](https://dev.to/nas5w/avoiding-race-conditions-when-fetching-data-with-react-hooks-4pi9)
- [React useEffectEvent: Goodbye to stale closure headaches](https://blog.logrocket.com/react-useeffectevent/)
- [Hooks, Dependencies and Stale Closures - TkDodo](https://tkdodo.eu/blog/hooks-dependencies-and-stale-closures)

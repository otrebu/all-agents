# XState Store - Deep Research

> Reactive stores for simple state management from the XState team.
> Version: 3.x | Bundle: <1kb minified/gzipped | TypeScript 5.4+

## Overview

XState Store is a lightweight, event-based state management library designed as a simpler alternative to full XState state machines. It provides Redux/Zustand-like patterns with excellent TypeScript inference and a clear upgrade path to state machines when complexity grows.

**Key Philosophy**: Indirect (event-based) state management leads to better organization of application logic, especially as it grows in complexity.

```bash
npm install @xstate/store
```

---

## Table of Contents

1. [Core API - createStore](#core-api---createstore)
2. [Sending Events - send vs trigger](#sending-events---send-vs-trigger)
3. [Selectors and Derived State](#selectors-and-derived-state)
4. [Atoms](#atoms)
5. [Effects and Side Effects](#effects-and-side-effects)
6. [Emitting Events](#emitting-events)
7. [React Integration](#react-integration)
8. [TypeScript Integration](#typescript-integration)
9. [Immer Integration](#immer-integration)
10. [Undo/Redo Extension](#undoredo-extension)
11. [Testing Patterns](#testing-patterns)
12. [When to Use Store vs Machine](#when-to-use-store-vs-machine)
13. [Comparison with Alternatives](#comparison-with-alternatives)
14. [Migration from useState/useReducer](#migration-from-usestateuseducer)
15. [Debugging and DevTools](#debugging-and-devtools)
16. [Framework Integrations](#framework-integrations)
17. [Performance Characteristics](#performance-characteristics)
18. [Migration from v2 to v3](#migration-from-v2-to-v3)

---

## Core API - createStore

The `createStore` function is the primary entry point for creating stores. It takes a configuration object with `context` (initial state) and `on` (event handlers/transitions).

### Basic Usage

```typescript
import { createStore } from '@xstate/store';

const counterStore = createStore({
  // Initial state
  context: {
    count: 0,
    name: 'Counter'
  },
  // Event handlers (transitions)
  on: {
    increment: (context) => ({
      ...context,
      count: context.count + 1
    }),
    decrement: (context) => ({
      ...context,
      count: context.count - 1
    }),
    add: (context, event: { amount: number }) => ({
      ...context,
      count: context.count + event.amount
    }),
    reset: (context) => ({
      ...context,
      count: 0
    }),
  },
});

// Read current state
console.log(counterStore.getSnapshot().context.count); // 0

// Subscribe to changes
const unsubscribe = counterStore.subscribe((snapshot) => {
  console.log('State changed:', snapshot.context);
});

// Send events
counterStore.send({ type: 'increment' });
counterStore.send({ type: 'add', amount: 10 });
```

### Transition Function Signature

Transition functions receive up to three arguments:

```typescript
on: {
  eventName: (context, event, enqueue) => {
    // context: Current state
    // event: The event object (with type and payload)
    // enqueue: Object with effect() and emit() methods
    return newContext;
  }
}
```

### Core Store Methods

| Method | Description |
|--------|-------------|
| `store.getSnapshot()` | Get current state snapshot |
| `store.subscribe(observer)` | Subscribe to state changes |
| `store.send(event)` | Send an event to trigger transition |
| `store.trigger.eventName(payload)` | Ergonomic event dispatch |
| `store.select(selector)` | Create a derived selector |
| `store.transition(state, event)` | Compute next state (for testing) |

---

## Sending Events - send vs trigger

XState Store provides two ways to dispatch events:

### store.send()

Traditional event dispatch with explicit event objects:

```typescript
// No payload
store.send({ type: 'increment' });

// With payload
store.send({ type: 'add', amount: 5 });
store.send({ type: 'setUser', name: 'Alice', age: 30 });
```

### store.trigger (Recommended)

More ergonomic API with better TypeScript autocompletion:

```typescript
// No payload - call as method
store.trigger.increment();

// With payload - pass as argument
store.trigger.add({ amount: 5 });
store.trigger.setUser({ name: 'Alice', age: 30 });
```

**Benefits of trigger**:
- Immediate autocompletion of event types
- No need to construct event objects
- Cleaner syntax for event handlers in React
- Works directly as event handler callbacks (fixed in v3.9.3)

```tsx
// Works directly as onClick handler
<button onClick={store.trigger.increment}>+</button>
```

---

## Selectors and Derived State

XState Store v3 introduces powerful selectors for efficient state selection and subscription.

### Creating Selectors

```typescript
import { createStore } from '@xstate/store';

const store = createStore({
  context: {
    position: { x: 0, y: 0 },
    name: 'John',
    age: 30,
    items: []
  },
  on: {
    updatePosition: (context, event: { x: number; y: number }) => ({
      ...context,
      position: event
    }),
  },
});

// Create a selector for specific state slice
const positionSelector = store.select((ctx) => ctx.position);

// Get current value
console.log(positionSelector.get()); // { x: 0, y: 0 }

// Subscribe to changes (only fires when position changes)
positionSelector.subscribe((position) => {
  console.log('Position updated:', position);
});
```

### Custom Equality Functions

Control when subscribers are notified:

```typescript
const nameSelector = store.select(
  (ctx) => ctx.name,
  (prev, next) => prev.toLowerCase() === next.toLowerCase() // Custom equality
);
```

### Selector Benefits

1. **Performance**: Only notified when selected value changes
2. **Granular subscriptions**: Components don't re-render for unrelated state changes
3. **Composability**: Selectors can be combined and derived

---

## Atoms

Atoms are lightweight, reactive pieces of state that can be used standalone or combined with stores.

### Creating Atoms

```typescript
import { createAtom } from '@xstate/store';

// Primitive atom
const countAtom = createAtom(0);

// Object atom
const userAtom = createAtom({ name: 'David', age: 30 });

// Read value
console.log(countAtom.get()); // 0

// Update value
countAtom.set(5);
countAtom.set((prev) => prev + 1);

// Subscribe
countAtom.subscribe((value) => {
  console.log('Count changed:', value);
});
```

### Derived Atoms

Create atoms that compute values from other atoms:

```typescript
const firstNameAtom = createAtom('John');
const lastNameAtom = createAtom('Doe');

// Derived atom - automatically updates when dependencies change
const fullNameAtom = createAtom(() =>
  `${firstNameAtom.get()} ${lastNameAtom.get()}`
);

console.log(fullNameAtom.get()); // "John Doe"

// Derived atoms are read-only
// They update automatically when source atoms change
```

### Async Atoms

Handle asynchronous values:

```typescript
import { createAsyncAtom } from '@xstate/store';

const userDataAtom = createAsyncAtom(async () => {
  const response = await fetch('/api/user');
  return response.json();
});

// The atom's value represents loading state
userDataAtom.subscribe((state) => {
  if (state.status === 'pending') {
    console.log('Loading...');
  } else if (state.status === 'fulfilled') {
    console.log('Data:', state.value);
  } else if (state.status === 'rejected') {
    console.log('Error:', state.error);
  }
});
```

### Previous Value Access

Computed atoms can access their previous value:

```typescript
const runningTotalAtom = createAtom<number>((prev = 0) =>
  prev + countAtom.get()
);
```

---

## Effects and Side Effects

XState Store v3 provides a structured way to handle side effects through the `enqueue` parameter.

### Basic Effects

```typescript
const store = createStore({
  context: { count: 0, loading: false },
  on: {
    incrementDelayed: (context, event, enqueue) => {
      // Enqueue a side effect
      enqueue.effect(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        store.send({ type: 'increment' });
      });

      return { ...context, loading: true };
    },
    increment: (context) => ({
      ...context,
      count: context.count + 1,
      loading: false
    }),
  },
});
```

### Effect Rules

**Critical**: `enqueue.effect()` must be called synchronously within the transition function. Calling it inside async callbacks or Promises will have no effect.

```typescript
// CORRECT - synchronous call
on: {
  doSomething: (context, event, enqueue) => {
    enqueue.effect(() => {
      // async work here
    });
    return context;
  }
}

// WRONG - async call
on: {
  doSomething: async (context, event, enqueue) => {
    await somePromise;
    enqueue.effect(() => {}); // This won't work!
    return context;
  }
}
```

### Effect-Only Transitions

Transitions can execute effects without triggering state updates:

```typescript
on: {
  logAction: (context, event, enqueue) => {
    enqueue.effect(() => {
      console.log('Action logged:', event);
    });
    return context; // Same state - no subscriber notification
  }
}
```

### Transition API for Testing

Use `store.transition()` to compute next state and effects without executing them:

```typescript
const [nextState, effects] = store.transition(currentState, { type: 'increment' });

// Effects can be inspected or executed manually
effects.forEach(effect => effect());
```

---

## Emitting Events

Define and emit custom events from transitions using the `emits` configuration.

### Defining Emittable Events

```typescript
const store = createStore({
  context: { count: 0 },

  // Define events that can be emitted
  emits: {
    countChanged: (payload: { oldCount: number; newCount: number }) => {
      // Optional: default side effect when emitted
      console.log(`Count changed from ${payload.oldCount} to ${payload.newCount}`);
    },
    thresholdReached: (payload: { threshold: number }) => {},
  },

  on: {
    increment: (context, event, enqueue) => {
      const newCount = context.count + 1;

      // Emit the event
      enqueue.emit.countChanged({
        oldCount: context.count,
        newCount
      });

      if (newCount >= 10) {
        enqueue.emit.thresholdReached({ threshold: 10 });
      }

      return { ...context, count: newCount };
    },
  },
});

// Listen for emitted events
store.on('countChanged', (event) => {
  console.log(`Count went from ${event.oldCount} to ${event.newCount}`);
});

store.on('thresholdReached', (event) => {
  console.log(`Reached threshold: ${event.threshold}`);
});
```

### Emit Rules

Like effects, `enqueue.emit()` must be called synchronously within the transition function.

---

## React Integration

XState Store provides React-specific hooks through `@xstate/store/react`.

### useSelector Hook

Select and subscribe to specific state slices:

```tsx
import { createStore } from '@xstate/store';
import { useSelector } from '@xstate/store/react';

// Create store (outside component)
const store = createStore({
  context: { count: 0, user: null },
  on: {
    increment: (ctx) => ({ ...ctx, count: ctx.count + 1 }),
    setUser: (ctx, e: { user: string }) => ({ ...ctx, user: e.user }),
  },
});

function Counter() {
  // Subscribe to specific slice - re-renders only when count changes
  const count = useSelector(store, (state) => state.context.count);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => store.trigger.increment()}>+</button>
    </div>
  );
}

function UserDisplay() {
  // Different component, different slice
  const user = useSelector(store, (state) => state.context.user);
  return <p>User: {user ?? 'Not logged in'}</p>;
}
```

### Custom Equality Function

Prevent unnecessary re-renders with custom comparison:

```tsx
const items = useSelector(
  store,
  (state) => state.context.items,
  (prev, next) => prev.length === next.length // Custom equality
);
```

### useStore Hook (Local Stores)

Create component-local stores, similar to `useReducer`:

```tsx
import { useStore, useSelector } from '@xstate/store/react';

function Counter({ initialCount = 0 }) {
  const store = useStore({
    context: { count: initialCount },
    on: {
      increment: (ctx) => ({ ...ctx, count: ctx.count + 1 }),
      decrement: (ctx) => ({ ...ctx, count: ctx.count - 1 }),
    },
  });

  const count = useSelector(store, (s) => s.context.count);

  return (
    <div>
      <p>{count}</p>
      <button onClick={store.trigger.increment}>+</button>
      <button onClick={store.trigger.decrement}>-</button>
    </div>
  );
}
```

### createStoreHook (v3.9.0+)

Create a custom hook combining store and selector functionality:

```tsx
import { createStoreHook } from '@xstate/store/react';

const useCounterStore = createStoreHook({
  context: { count: 0 },
  on: {
    increment: (ctx) => ({ ...ctx, count: ctx.count + 1 }),
  },
});

function Counter() {
  const { count, trigger } = useCounterStore((s) => s.context);
  return <button onClick={trigger.increment}>{count}</button>;
}
```

### Listening to Emitted Events in React

```tsx
function Counter() {
  const store = useStore({
    context: { count: 0 },
    emits: {
      maxReached: (payload: { max: number }) => {},
    },
    on: {
      increment: (ctx, e, enq) => {
        const newCount = ctx.count + 1;
        if (newCount >= 10) {
          enq.emit.maxReached({ max: 10 });
        }
        return { ...ctx, count: newCount };
      },
    },
  });

  useEffect(() => {
    return store.on('maxReached', ({ max }) => {
      alert(`Reached maximum: ${max}`);
    });
  }, [store]);

  const count = useSelector(store, (s) => s.context.count);

  return <button onClick={store.trigger.increment}>{count}</button>;
}
```

### useAtom Hook

Use atoms in React components:

```tsx
import { createAtom } from '@xstate/store';
import { useAtom } from '@xstate/store/react';

const countAtom = createAtom(0);

function Counter() {
  const count = useAtom(countAtom);

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => countAtom.set(c => c + 1)}>+</button>
    </div>
  );
}
```

---

## TypeScript Integration

XState Store provides excellent TypeScript support with automatic type inference.

### Automatic Type Inference

Types are inferred from initial context - no generic parameters needed:

```typescript
const store = createStore({
  context: {
    count: 0,           // inferred as number
    name: 'John',       // inferred as string
    items: [] as Item[] // explicit type for complex types
  },
  on: {
    increment: (context) => ({ ...context, count: context.count + 1 }),
    // context is fully typed
  },
});

// Snapshot is fully typed
const snapshot = store.getSnapshot();
snapshot.context.count; // number
snapshot.context.name;  // string
```

### Typing Event Payloads

Specify event payload types in transition functions:

```typescript
const store = createStore({
  context: { user: null as User | null },
  on: {
    // Type the event parameter
    setUser: (context, event: { user: User }) => ({
      ...context,
      user: event.user,
    }),

    // Multiple payload properties
    updateProfile: (context, event: { name: string; age: number }) => ({
      ...context,
      user: context.user
        ? { ...context.user, name: event.name, age: event.age }
        : null,
    }),
  },
});

// TypeScript enforces correct event shapes
store.send({ type: 'setUser', user: { id: 1, name: 'Alice' } }); // OK
store.send({ type: 'setUser' }); // Error: missing 'user' property

// trigger API also fully typed
store.trigger.setUser({ user: { id: 1, name: 'Alice' } }); // OK
store.trigger.setUser({}); // Error
```

### Strongly Typing Context

For more specific context types:

```typescript
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  notifications: Notification[];
}

const initialContext: AppState = {
  user: null,
  theme: 'light',
  notifications: [],
};

const store = createStore({
  context: initialContext,
  on: {
    setTheme: (ctx, e: { theme: AppState['theme'] }) => ({
      ...ctx,
      theme: e.theme,
    }),
  },
});
```

### Extracting Store Types

```typescript
import type { SnapshotFrom } from '@xstate/store';

type AppSnapshot = SnapshotFrom<typeof store>;
type AppContext = AppSnapshot['context'];
```

### Requirements

- TypeScript version 5.4 or above required
- No need for explicit generic type parameters in most cases

---

## Immer Integration

Use Immer for convenient pseudo-mutative state updates.

### createStoreWithProducer

```typescript
import { createStoreWithProducer } from '@xstate/store';
import { produce } from 'immer';

const store = createStoreWithProducer(
  produce, // Immer's produce function
  {
    context: {
      count: 0,
      todos: [] as string[],
      user: { name: 'John', settings: { theme: 'light' } }
    },
    on: {
      increment: (context) => {
        // Mutate directly - Immer handles immutability
        context.count++;
        // No return needed
      },

      addTodo: (context, event: { todo: string }) => {
        context.todos.push(event.todo);
      },

      updateTheme: (context, event: { theme: string }) => {
        context.user.settings.theme = event.theme;
      },

      removeTodo: (context, event: { index: number }) => {
        context.todos.splice(event.index, 1);
      },
    },
  }
);
```

### Mutative Alternative

You can also use Mutative instead of Immer:

```typescript
import { create } from 'mutative';
import { createStoreWithProducer } from '@xstate/store';

const store = createStoreWithProducer(create, {
  context: { count: 0 },
  on: {
    increment: (ctx) => { ctx.count++; },
  },
});
```

### Important Notes

- Cannot use object assigner syntax with `createStoreWithProducer`
- The producer integration may change in future versions
- Useful for deeply nested state updates

---

## Undo/Redo Extension

XState Store provides built-in undo/redo functionality through extensions.

### Basic Usage

```typescript
import { createStore, undoRedo } from '@xstate/store';

const store = createStore({
  context: { count: 0 },
  on: {
    increment: (ctx) => ({ ...ctx, count: ctx.count + 1 }),
    decrement: (ctx) => ({ ...ctx, count: ctx.count - 1 }),
  },
}).with(undoRedo());

// Make some changes
store.trigger.increment(); // count = 1
store.trigger.increment(); // count = 2
store.trigger.increment(); // count = 3

// Undo/redo via trigger
store.trigger.undo(); // count = 2
store.trigger.undo(); // count = 1
store.trigger.redo(); // count = 2
```

### Strategies

The extension supports different strategies:

1. **Event-sourced (default)**: Stores events in history and replays them
2. **Snapshot**: Stores full state snapshots

### Configuration Options

- **Transactions**: Group multiple events as single undo step
- **Skipping Events**: Exclude certain events from history
- **History Limit**: Maximum undo steps to keep
- **Compare Function**: Custom state comparison
- **Preserving State**: Handle skipped events in history

### Behavior Notes

- Calling `undo()` with no history has no effect
- Calling `redo()` with nothing to redo has no effect
- New events after undo clear the redo stack
- TypeScript types are preserved

---

## Testing Patterns

### Unit Testing Stores

```typescript
import { createStore } from '@xstate/store';
import { describe, it, expect } from 'vitest';

const createCounterStore = () => createStore({
  context: { count: 0 },
  on: {
    increment: (ctx) => ({ ...ctx, count: ctx.count + 1 }),
    add: (ctx, e: { amount: number }) => ({ ...ctx, count: ctx.count + e.amount }),
  },
});

describe('Counter Store', () => {
  it('should increment count', () => {
    const store = createCounterStore();

    store.send({ type: 'increment' });

    expect(store.getSnapshot().context.count).toBe(1);
  });

  it('should add amount to count', () => {
    const store = createCounterStore();

    store.send({ type: 'add', amount: 5 });

    expect(store.getSnapshot().context.count).toBe(5);
  });
});
```

### Testing Transitions Directly

Use `store.transition()` for pure state computation testing:

```typescript
it('should compute next state without side effects', () => {
  const store = createCounterStore();
  const currentState = store.getSnapshot();

  const [nextState, effects] = store.transition(
    currentState,
    { type: 'add', amount: 10 }
  );

  expect(nextState.context.count).toBe(10);
  expect(effects).toHaveLength(0);

  // Original store unchanged
  expect(store.getSnapshot().context.count).toBe(0);
});
```

### Testing Effects

```typescript
it('should enqueue effects', () => {
  const effectFn = vi.fn();

  const store = createStore({
    context: { value: 0 },
    on: {
      doSomething: (ctx, e, enqueue) => {
        enqueue.effect(effectFn);
        return { ...ctx, value: ctx.value + 1 };
      },
    },
  });

  store.send({ type: 'doSomething' });

  expect(effectFn).toHaveBeenCalled();
  expect(store.getSnapshot().context.value).toBe(1);
});
```

### Testing with React

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { useSelector } from '@xstate/store/react';

const store = createCounterStore();

function Counter() {
  const count = useSelector(store, (s) => s.context.count);
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={store.trigger.increment}>+</button>
    </div>
  );
}

it('should render and update count', () => {
  render(<Counter />);

  expect(screen.getByTestId('count')).toHaveTextContent('0');

  fireEvent.click(screen.getByText('+'));

  expect(screen.getByTestId('count')).toHaveTextContent('1');
});
```

### Best Practices

1. **Arrange, Act, Assert**: Follow standard testing pattern
2. **Test transitions in isolation**: Use `store.transition()` for pure logic testing
3. **Test effects separately**: Mock and verify side effects
4. **Keep tests focused**: One behavior per test
5. **Use factory functions**: Create fresh stores for each test

---

## When to Use Store vs Machine

### Use XState Store When

- You need simple state with event-driven updates
- State is essentially a "bag of data" without distinct modes
- You don't need temporal logic (delays, timeouts)
- You're replacing `useState`/`useReducer` with more structure
- Bundle size is critical (<1kb)
- You want Redux/Zustand patterns with better TypeScript

```typescript
// Good for Store: simple data state
const formStore = createStore({
  context: { name: '', email: '', errors: {} },
  on: {
    updateField: (ctx, e: { field: string; value: string }) => ({
      ...ctx,
      [e.field]: e.value,
    }),
    setErrors: (ctx, e: { errors: Record<string, string> }) => ({
      ...ctx,
      errors: e.errors,
    }),
  },
});
```

### Use XState Machine When

- You have distinct application states/modes
- You need guards/conditions on transitions
- You need delayed transitions or timeouts
- You have complex async flows
- You need visualization for debugging
- State logic is getting complex with boolean flags

```typescript
// Better as Machine: distinct states with constraints
// idle -> loading -> success/error
// Can't go from success to loading directly
```

### Upgrade Path

XState Store provides low-friction migration to machines:

1. Start with Store for simple state
2. Add boolean flags for "modes" = sign you need Machine
3. Guards on actions = sign you need Machine
4. Convert Store context to Machine context
5. Add explicit states for the modes
6. Events become transitions between states

The event-driven pattern is shared, making migration straightforward.

---

## Comparison with Alternatives

### XState Store vs Zustand

| Feature | XState Store | Zustand |
|---------|--------------|---------|
| Bundle size | <1kb | ~4kb |
| TypeScript inference | Excellent, automatic | Good, can be verbose |
| API style | Event-based | Direct setters |
| Selector enforcement | Required | Optional |
| State/actions separation | Yes | No (mixed in store) |
| Upgrade path | To XState machines | None |
| React integration | useSyncExternalStore | useSyncExternalStore |
| Devtools | Inspect API | Redux DevTools |

**Zustand example**:
```typescript
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Actions mixed with state - persistence concerns
```

**XState Store equivalent**:
```typescript
const store = createStore({
  context: { count: 0 },
  on: { increment: (ctx) => ({ ...ctx, count: ctx.count + 1 }) },
});

// Actions separate - cleaner persistence
```

### XState Store vs Jotai

| Feature | XState Store | Jotai |
|---------|--------------|-------|
| Model | Event-based store | Atomic (bottom-up) |
| Re-render optimization | Via selectors | Automatic (atomic) |
| Bundle size | <1kb | ~4kb |
| Suspense support | No | Yes |
| Best for | Predictable flows | Complex interdependencies |
| State organization | Centralized | Distributed atoms |

### XState Store vs Redux Toolkit

| Feature | XState Store | Redux Toolkit |
|---------|--------------|---------------|
| Bundle size | <1kb | ~10kb+ |
| Boilerplate | Minimal | Low (for Redux) |
| Middleware | Effects | Full middleware system |
| DevTools | Inspect API | Excellent |
| Ecosystem | Growing | Mature |

### Key Insights

- **Zustand** for developers who prefer direct state mutations
- **Jotai** for complex state interdependencies and Suspense
- **XState Store** for event-driven patterns with machine upgrade path
- **Redux Toolkit** for large enterprise apps with existing Redux knowledge

---

## Migration from useState/useReducer

### From useState

```tsx
// Before: useState
function Counter() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const increment = () => setCount(c => c + 1);
  const asyncIncrement = async () => {
    setLoading(true);
    await delay(1000);
    setCount(c => c + 1);
    setLoading(false);
  };

  return (/* ... */);
}

// After: XState Store
const counterStore = createStore({
  context: { count: 0, loading: false },
  on: {
    increment: (ctx) => ({ ...ctx, count: ctx.count + 1 }),
    startLoading: (ctx) => ({ ...ctx, loading: true }),
    incrementAsync: (ctx, e, enq) => {
      enq.effect(async () => {
        await delay(1000);
        counterStore.trigger.increment();
        counterStore.trigger.stopLoading();
      });
      return { ...ctx, loading: true };
    },
    stopLoading: (ctx) => ({ ...ctx, loading: false }),
  },
});

function Counter() {
  const count = useSelector(counterStore, s => s.context.count);
  const loading = useSelector(counterStore, s => s.context.loading);

  return (/* ... */);
}
```

### From useReducer

```tsx
// Before: useReducer
type Action =
  | { type: 'increment' }
  | { type: 'add'; amount: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1 };
    case 'add':
      return { ...state, count: state.count + action.amount };
    default:
      return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  return (
    <button onClick={() => dispatch({ type: 'increment' })}>
      {state.count}
    </button>
  );
}

// After: XState Store (almost identical pattern!)
const store = createStore({
  context: { count: 0 },
  on: {
    increment: (ctx) => ({ ...ctx, count: ctx.count + 1 }),
    add: (ctx, e: { amount: number }) => ({
      ...ctx,
      count: ctx.count + e.amount
    }),
  },
});

function Counter() {
  const count = useSelector(store, s => s.context.count);
  return (
    <button onClick={store.trigger.increment}>
      {count}
    </button>
  );
}
```

### Migration Benefits

1. **Logic outside component**: Portable, testable
2. **Better TypeScript**: Automatic inference
3. **Effects handling**: Built-in effect system
4. **Upgrade path**: Can evolve to full state machine
5. **Framework agnostic**: Core logic works anywhere

---

## Debugging and DevTools

### Inspect API

XState Store supports inspection similar to XState:

```typescript
const store = createStore({
  context: { count: 0 },
  on: { increment: (ctx) => ({ ...ctx, count: ctx.count + 1 }) },
});

// Inspect events and state changes
store.inspect((inspectionEvent) => {
  if (inspectionEvent.type === '@xstate.event') {
    console.log('Event:', inspectionEvent.event);
  }
  if (inspectionEvent.type === '@xstate.snapshot') {
    console.log('State:', inspectionEvent.snapshot);
  }
});
```

### Browser DevTools

For XState v4, there are browser extensions:
- **XState DevTools**: Chrome extension for visualizing state machines
- **XState Ninja**: DevTools panel for tracking state machines

**Note**: These tools primarily support XState machines, not stores directly. For stores, use the Inspect API.

### Logging Transitions

Simple logging middleware:

```typescript
const loggedStore = createStore({
  context: { count: 0 },
  on: {
    increment: (ctx, e, enq) => {
      enq.effect(() => {
        console.log('[Store] increment:', ctx.count, '->', ctx.count + 1);
      });
      return { ...ctx, count: ctx.count + 1 };
    },
  },
});
```

---

## Framework Integrations

### React (Official)

```typescript
import { useSelector, useStore } from '@xstate/store/react';
```

### SolidJS (Official)

```typescript
import { useSelector } from '@xstate/store/solid';

const count = useSelector(store, (s) => s.context.count);
```

### Vue, Svelte, Angular

XState Store is framework-agnostic at its core. Community contributions for these frameworks are encouraged.

For now, you can integrate manually:

```typescript
// Vue composition API
import { ref, watchEffect } from 'vue';

const count = ref(store.getSnapshot().context.count);
store.subscribe((snapshot) => {
  count.value = snapshot.context.count;
});
```

```svelte
<!-- Svelte -->
<script>
  let count = store.getSnapshot().context.count;
  store.subscribe((snapshot) => {
    count = snapshot.context.count;
  });
</script>
```

### Why Framework-Agnostic

The core store uses standard subscription patterns (`useSyncExternalStore` for React). This makes:
- Core logic portable
- Testing simpler (no framework needed)
- Future framework support feasible

---

## Performance Characteristics

### Bundle Size

- **XState Store**: <1kb minified/gzipped
- **Zustand**: ~4kb
- **Jotai**: ~4kb
- **Redux Toolkit**: ~10kb+

### Re-render Optimization

XState Store prevents unnecessary re-renders through:

1. **Mandatory selectors**: `useSelector(store, selector)` forces granular subscriptions
2. **Reference equality**: Only re-renders when selected value changes
3. **Custom equality**: Optional comparison function for complex values

```tsx
// Component only re-renders when count changes
const count = useSelector(store, (s) => s.context.count);

// Not when other context properties change
```

### Memory Efficiency

- Transitions not stored in state (unlike Zustand actions)
- Selectors create minimal overhead
- Atoms are lightweight primitives

### Comparison with Zustand Pitfall

```typescript
// Zustand - easy to subscribe to everything accidentally
const { count, name, actions } = useStore();

// XState Store - forced granular selection
const count = useSelector(store, (s) => s.context.count);
const name = useSelector(store, (s) => s.context.name);
```

---

## Migration from v2 to v3

### API Changes

**v2 (Deprecated)**:
```typescript
// Two-argument form
const store = createStore(
  { count: 0 }, // context
  { increment: (ctx) => ({ ...ctx, count: ctx.count + 1 }) } // handlers
);
```

**v3 (Current)**:
```typescript
// Single configuration object
const store = createStore({
  context: { count: 0 },
  on: {
    increment: (ctx) => ({ ...ctx, count: ctx.count + 1 }),
  },
});
```

### New Features in v3

1. **Selectors**: `store.select(selector)` for efficient subscriptions
2. **store.trigger**: Ergonomic event dispatch with autocompletion
3. **Effects**: `enqueue.effect()` for side effects
4. **Emit**: `enqueue.emit()` with `emits` configuration
5. **Atoms**: `createAtom()` for simple reactive values
6. **Extensions**: `.with(undoRedo())` pattern
7. **Local stores**: `useStore()` hook for component-local state

### Breaking Changes

1. Only complete context assigner functions supported (no partial updates)
2. New `emits: {}` replaces `types: { emit: {} as ... }`
3. Better TypeScript inference may surface hidden type issues

### Migration Steps

1. Update import to use new API shape
2. Wrap context in `context:` property
3. Wrap handlers in `on:` property
4. Replace `types.emit` with `emits`
5. Consider adopting new features (selectors, trigger, effects)

---

## Quick Reference

### Installation

```bash
npm install @xstate/store
# TypeScript 5.4+ required
```

### Imports

```typescript
// Core
import { createStore, createStoreWithProducer, createAtom } from '@xstate/store';

// React
import { useSelector, useStore, useAtom, createStoreHook } from '@xstate/store/react';

// SolidJS
import { useSelector } from '@xstate/store/solid';
```

### Complete Example

```typescript
import { createStore } from '@xstate/store';
import { useSelector } from '@xstate/store/react';

// Create store
const todoStore = createStore({
  context: {
    todos: [] as Array<{ id: string; text: string; done: boolean }>,
    filter: 'all' as 'all' | 'active' | 'completed',
  },
  emits: {
    todoAdded: (payload: { id: string }) => {},
  },
  on: {
    addTodo: (ctx, e: { text: string }, enq) => {
      const id = crypto.randomUUID();
      enq.emit.todoAdded({ id });
      return {
        ...ctx,
        todos: [...ctx.todos, { id, text: e.text, done: false }],
      };
    },
    toggleTodo: (ctx, e: { id: string }) => ({
      ...ctx,
      todos: ctx.todos.map(t =>
        t.id === e.id ? { ...t, done: !t.done } : t
      ),
    }),
    setFilter: (ctx, e: { filter: typeof ctx.filter }) => ({
      ...ctx,
      filter: e.filter,
    }),
  },
});

// React component
function TodoApp() {
  const todos = useSelector(todoStore, s => s.context.todos);
  const filter = useSelector(todoStore, s => s.context.filter);

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.done;
    if (filter === 'completed') return t.done;
    return true;
  });

  return (
    <div>
      <input onKeyDown={(e) => {
        if (e.key === 'Enter') {
          todoStore.trigger.addTodo({ text: e.currentTarget.value });
          e.currentTarget.value = '';
        }
      }} />
      <ul>
        {filteredTodos.map(t => (
          <li key={t.id} onClick={() => todoStore.trigger.toggleTodo({ id: t.id })}>
            {t.done ? '✓' : '○'} {t.text}
          </li>
        ))}
      </ul>
      <div>
        {(['all', 'active', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => todoStore.trigger.setFilter({ filter: f })}
            style={{ fontWeight: filter === f ? 'bold' : 'normal' }}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Sources

- [XState Store v3 Announcement](https://stately.ai/blog/2025-02-26-xstate-store-v3)
- [Official Documentation](https://stately.ai/docs/xstate-store)
- [npm Package](https://www.npmjs.com/package/@xstate/store)
- [TkDodo's Introduction to XState Store](https://tkdodo.eu/blog/introducing-x-state-store)
- [GitHub Repository](https://github.com/statelyai/xstate/tree/main/packages/xstate-store)
- [State Management Comparison (Jotai docs)](https://jotai.org/docs/basics/comparison)
- [State Management in 2025](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k)

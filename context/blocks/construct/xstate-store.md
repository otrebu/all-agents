---
depends: []
---

# XState Store

Lightweight state management from the XState team. Simple alternative to full state machines.

## Quick Start

```bash
# install
@xstate/store @xstate/react
```

## Creating a Store

```typescript
import { createStore } from "@xstate/store";

const store = createStore({
  context: { count: 0, name: "David" },
  on: {
    increment: (context, event: { by: number }) => ({
      count: context.count + event.by,
    }),
    updateName: (context, event: { name: string }) => ({
      name: event.name,
    }),
  },
});
```

## React Integration

```typescript
import { useSelector } from "@xstate/store/react";

function Counter() {
  const count = useSelector(store, (state) => state.context.count);

  return (
    <button onClick={() => store.send({ type: "increment", by: 1 })}>
      {count}
    </button>
  );
}
```

## Store API

```typescript
// Get current snapshot
const snapshot = store.getSnapshot();
console.log(snapshot.context.count);

// Send events
store.send({ type: "increment", by: 5 });

// Subscribe to changes
const unsubscribe = store.subscribe((snapshot) => {
  console.log(snapshot.context);
});

// Inspect (debugging)
store.inspect((event) => {
  if (event.type === "@xstate.event") {
    console.log(event.event);
  }
});
```

## Emitting Events

```typescript
const store = createStore({
  context: { status: "idle" },
  on: {
    fetch: (context, _event, { emit }) => {
      emit({ type: "fetchStarted" });
      return { status: "loading" };
    },
  },
});

// Subscribe to emitted events
store.on("fetchStarted", () => {
  console.log("Fetch started!");
});
```

## With Immer

```typescript
import { createStoreWithProducer } from "@xstate/store";
import { produce } from "immer";

const store = createStoreWithProducer(produce, {
  context: { items: [] as string[] },
  on: {
    addItem: (context, event: { item: string }) => {
      context.items.push(event.item); // Direct mutation with Immer
    },
  },
});
```

## When to Use

| Scenario | XState Store | Full XState | Context |
|----------|--------------|-------------|---------|
| Simple shared state | Yes | Overkill | Maybe |
| Event-driven updates | Yes | Yes | No |
| Complex state machines | No | Yes | No |
| Finite states | No | Yes | No |
| Lightweight (~1KB) | Yes | No (~15KB) | Yes |

XState Store = simple event-driven state, no state machines, selective subscriptions.

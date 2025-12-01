# XState

State machines for complex state. **Use v5, not v4.**

## Setup

```bash
pnpm add xstate @xstate/react
```

## Basic Machine

```typescript
import { createMachine, assign } from "xstate";

const toggleMachine = createMachine({
  id: "toggle",
  initial: "inactive",
  states: {
    inactive: { on: { TOGGLE: "active" } },
    active: { on: { TOGGLE: "inactive" } },
  },
});
```

## With Context

```typescript
const counterMachine = createMachine({
  id: "counter",
  initial: "idle",
  context: { count: 0 },
  states: {
    idle: {
      on: {
        INCREMENT: {
          actions: assign({ count: ({ context }) => context.count + 1 }),
        },
        DECREMENT: {
          actions: assign({ count: ({ context }) => context.count - 1 }),
        },
      },
    },
  },
});
```

## React Integration

```typescript
import { useMachine } from "@xstate/react";

function Toggle() {
  const [state, send] = useMachine(toggleMachine);

  return (
    <button onClick={() => send({ type: "TOGGLE" })}>
      {state.matches("active") ? "ON" : "OFF"}
    </button>
  );
}
```

## When to Use

- Multi-step flows (wizards, checkout)
- Complex UI states (modals, async operations)
- Workflows with strict state transitions
- Replacing boolean soup (`isLoading && !isError && hasData`)

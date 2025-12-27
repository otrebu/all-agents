# XState v5 - State Machines & Actor Model

> Comprehensive reference for XState v5 (released December 2023)
> XState is a state management and orchestration solution for JavaScript/TypeScript using event-driven programming, state machines, statecharts, and the actor model.

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [Machine Definition](#2-machine-definition)
3. [Actions](#3-actions)
4. [Guards](#4-guards)
5. [Services/Actors](#5-servicesactors)
6. [React Integration](#6-react-integration)
7. [TypeScript](#7-typescript)
8. [Visualization](#8-visualization)
9. [Patterns](#9-patterns)
10. [Use Cases](#10-use-cases)

---

## 1. Core Concepts

### States

A **state** describes the machine's status or mode (e.g., `idle`, `loading`, `success`, `error`). A state machine can only be in **one state at a time** - these are "finite" states.

```typescript
import { createMachine } from 'xstate';

const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' }
    },
    active: {
      on: { TOGGLE: 'inactive' }
    }
  }
});
```

### Transitions

Transitions are **deterministic** - each combination of state and event always points to the same next state. Self-transitions are allowed (useful for updating context without changing state).

```typescript
states: {
  idle: {
    on: {
      FETCH: 'loading',      // Target transition
      RESET: 'idle'          // Self-transition
    }
  }
}
```

### Events

Events are represented by objects with a `type` property and optional payload:

```typescript
// Simple event
{ type: 'TOGGLE' }

// Event with payload
{ type: 'UPDATE_VALUE', value: 42 }

// Sending events
actor.send({ type: 'FETCH', query: 'users' });
```

### Context

Context is **extended state** - mutable data stored in the machine. It's immutable and can only be updated via the `assign` action.

```typescript
const counterMachine = createMachine({
  context: {
    count: 0,
    user: null
  },
  // ...
});

// Lazy initial context (evaluated per actor)
const machine = createMachine({
  context: () => ({
    timestamp: Date.now()
  })
});
```

---

## 2. Machine Definition

### Using `setup()` (Recommended)

The `setup()` function provides type-safe machine creation:

```typescript
import { setup, assign } from 'xstate';

const feedbackMachine = setup({
  types: {
    context: {} as { feedback: string; rating: number },
    events: {} as
      | { type: 'feedback.good' }
      | { type: 'feedback.bad' }
      | { type: 'submit'; data: string }
  },
  actions: {
    logFeedback: ({ context }) => {
      console.log('Feedback:', context.feedback);
    }
  },
  guards: {
    hasRating: ({ context }) => context.rating > 0
  }
}).createMachine({
  id: 'feedback',
  initial: 'question',
  context: { feedback: '', rating: 0 },
  states: {
    question: {
      on: {
        'feedback.good': { target: 'thanks' },
        'feedback.bad': { target: 'form' }
      }
    },
    form: {
      on: {
        submit: {
          guard: 'hasRating',
          target: 'thanks',
          actions: 'logFeedback'
        }
      }
    },
    thanks: { type: 'final' }
  }
});
```

### Using `createMachine()` Directly

```typescript
import { createMachine } from 'xstate';

const machine = createMachine({
  id: 'simple',
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: { START: 'running' }
    },
    running: {
      on: { STOP: 'idle' }
    }
  }
});
```

### Creating Actors

```typescript
import { createActor } from 'xstate';

const actor = createActor(feedbackMachine);

// Subscribe to state changes
actor.subscribe((snapshot) => {
  console.log('State:', snapshot.value);
  console.log('Context:', snapshot.context);
});

// Start the actor
actor.start();

// Send events
actor.send({ type: 'feedback.good' });

// Get current snapshot
const snapshot = actor.getSnapshot();
```

---

## 3. Actions

Actions are fire-and-forget side effects executed during transitions.

### assign() - Update Context

```typescript
import { assign, setup } from 'xstate';

const counterMachine = setup({
  types: {
    events: {} as
      | { type: 'increment'; value: number }
      | { type: 'reset' }
  }
}).createMachine({
  context: { count: 0 },
  on: {
    increment: {
      actions: assign({
        count: ({ context, event }) => context.count + event.value
      })
    },
    reset: {
      actions: assign({ count: 0 })
    }
  }
});

// Full context replacement
actions: assign(({ context, event }) => ({
  ...context,
  count: context.count + event.value
}))
```

### raise() - Queue Internal Events

```typescript
import { raise, setup } from 'xstate';

const machine = setup({
  actions: {
    triggerNext: raise({ type: 'NEXT' })
  }
}).createMachine({
  initial: 'first',
  states: {
    first: {
      entry: 'triggerNext',
      on: { NEXT: 'second' }
    },
    second: {}
  }
});
```

### sendTo() - Send to Other Actors

```typescript
import { sendTo, setup } from 'xstate';

const parentMachine = setup({
  actions: {
    notifyChild: sendTo('childActor', { type: 'NOTIFY' })
  }
}).createMachine({
  // ...
});
```

### Custom Actions

```typescript
const machine = setup({
  actions: {
    logEvent: ({ context, event }) => {
      console.log('Event received:', event.type);
    },
    // Action with parameters
    greet: (_, params: { name: string }) => {
      console.log(`Hello, ${params.name}!`);
    }
  }
}).createMachine({
  entry: {
    type: 'greet',
    params: ({ context }) => ({ name: context.user.name })
  }
});
```

### Action Placement

```typescript
states: {
  active: {
    entry: ['logEntry'],           // On state entry
    exit: ['logExit'],             // On state exit
    on: {
      EVENT: {
        target: 'next',
        actions: ['doSomething']   // On transition
      }
    }
  }
}
```

---

## 4. Guards

Guards are pure, synchronous functions that determine if a transition should be taken.

### Basic Guards

```typescript
import { setup } from 'xstate';

const machine = setup({
  guards: {
    isValid: ({ context }) => context.value > 0,
    hasPermission: ({ context, event }) =>
      context.user.role === 'admin'
  }
}).createMachine({
  states: {
    checking: {
      on: {
        SUBMIT: [
          { guard: 'isValid', target: 'success' },
          { target: 'error' }  // Default fallback
        ]
      }
    }
  }
});
```

### Inline Guards

```typescript
on: {
  SUBMIT: {
    guard: ({ context }) => context.count > 10,
    target: 'success'
  }
}
```

### Guard with Parameters

```typescript
const machine = setup({
  guards: {
    isGreaterThan: (_, params: { value: number }) => {
      return ({ context }) => context.count > params.value;
    }
  }
}).createMachine({
  on: {
    CHECK: {
      guard: { type: 'isGreaterThan', params: { value: 5 } },
      target: 'valid'
    }
  }
});
```

### Higher-Order Guards (and, or, not)

```typescript
import { and, or, not } from 'xstate';

const machine = setup({
  guards: {
    isValid: () => true,
    isAuthorized: () => true,
    isGuest: () => false
  }
}).createMachine({
  on: {
    ACTION: {
      guard: and(['isValid', or(['isAuthorized', 'isGuest'])]),
      target: 'allowed'
    },
    DENY: {
      guard: not('isAuthorized'),
      target: 'denied'
    }
  }
});
```

---

## 5. Services/Actors

XState v5 is built on the **actor model**. Actors can be invoked (state-bound) or spawned (dynamic).

### Actor Logic Types

```typescript
import {
  createMachine,
  fromPromise,
  fromCallback,
  fromObservable,
  fromTransition
} from 'xstate';
```

### fromPromise - Async Operations

```typescript
import { fromPromise, setup } from 'xstate';

const fetchUser = fromPromise(async ({ input }: { input: { id: string } }) => {
  const response = await fetch(`/api/users/${input.id}`);
  return response.json();
});

const userMachine = setup({
  actors: { fetchUser }
}).createMachine({
  initial: 'loading',
  states: {
    loading: {
      invoke: {
        src: 'fetchUser',
        input: ({ context }) => ({ id: context.userId }),
        onDone: {
          target: 'success',
          actions: assign({ user: ({ event }) => event.output })
        },
        onError: {
          target: 'error',
          actions: assign({ error: ({ event }) => event.error })
        }
      }
    },
    success: {},
    error: {}
  }
});
```

### fromCallback - Subscriptions & Event Sources

```typescript
import { fromCallback } from 'xstate';

const websocketLogic = fromCallback(({ sendBack, receive, input }) => {
  const ws = new WebSocket(input.url);

  ws.onmessage = (event) => {
    sendBack({ type: 'MESSAGE', data: JSON.parse(event.data) });
  };

  ws.onerror = () => {
    sendBack({ type: 'ERROR' });
  };

  receive((event) => {
    if (event.type === 'SEND') {
      ws.send(JSON.stringify(event.data));
    }
  });

  // Cleanup function
  return () => ws.close();
});
```

### fromObservable - Observable Streams

```typescript
import { fromObservable } from 'xstate';
import { interval } from 'rxjs';
import { map } from 'rxjs/operators';

const tickerLogic = fromObservable(() =>
  interval(1000).pipe(map(n => ({ type: 'TICK', count: n })))
);
```

### Invoking Actors

```typescript
states: {
  loading: {
    invoke: {
      id: 'loader',
      src: 'fetchData',
      input: ({ context }) => ({ query: context.query }),
      onDone: { target: 'success' },
      onError: { target: 'failure' }
    }
  }
}
```

### Spawning Actors

```typescript
import { assign, spawnChild, stopChild } from 'xstate';

const todosMachine = createMachine({
  context: { todos: [] },
  on: {
    ADD_TODO: {
      actions: assign({
        todos: ({ context, event, spawn }) => [
          ...context.todos,
          spawn(todoMachine, { id: event.id, input: event.todo })
        ]
      })
    },
    REMOVE_TODO: {
      actions: stopChild(({ event }) => event.id)
    }
  }
});
```

---

## 6. React Integration

### Installation

```bash
npm install xstate @xstate/react
```

### useMachine / useActor

```tsx
import { useMachine } from '@xstate/react';
import { toggleMachine } from './machines';

function Toggle() {
  const [snapshot, send, actorRef] = useMachine(toggleMachine);

  return (
    <button onClick={() => send({ type: 'TOGGLE' })}>
      {snapshot.value === 'active' ? 'ON' : 'OFF'}
    </button>
  );
}
```

### useActorRef (formerly useInterpret)

```tsx
import { useActorRef, useSelector } from '@xstate/react';

function Counter() {
  const actorRef = useActorRef(counterMachine);
  const count = useSelector(actorRef, (snapshot) => snapshot.context.count);

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => actorRef.send({ type: 'increment', value: 1 })}>
        +1
      </button>
    </div>
  );
}
```

### useSelector - Selective Subscriptions

```tsx
import { useSelector } from '@xstate/react';

// Only re-render when selected value changes
const user = useSelector(actorRef, (snapshot) => snapshot.context.user);
const isLoading = useSelector(actorRef, (snapshot) =>
  snapshot.matches('loading')
);
```

### createActorContext - Global State

```tsx
import { createActorContext } from '@xstate/react';
import { appMachine } from './machines';

const AppContext = createActorContext(appMachine);

// Provider
function App() {
  return (
    <AppContext.Provider>
      <Dashboard />
    </AppContext.Provider>
  );
}

// Consumer
function Dashboard() {
  const user = AppContext.useSelector((snapshot) => snapshot.context.user);
  const send = AppContext.useActorRef().send;

  return <div>{user.name}</div>;
}
```

### Global Actor (Manual)

```tsx
import { createActor } from 'xstate';
import { useSelector } from '@xstate/react';

// Create and start global actor
export const globalActor = createActor(appMachine).start();

// Use in components
function Component() {
  const value = useSelector(globalActor, (s) => s.context.value);

  return <div>{value}</div>;
}
```

---

## 7. TypeScript

XState v5 requires **TypeScript 5.0+**. Enable `strictNullChecks: true` in tsconfig.json.

### Typing with setup()

```typescript
import { setup, assign } from 'xstate';

interface UserContext {
  user: { name: string; email: string } | null;
  error: string | null;
  attempts: number;
}

type UserEvents =
  | { type: 'FETCH'; userId: string }
  | { type: 'SUCCESS'; user: UserContext['user'] }
  | { type: 'ERROR'; message: string }
  | { type: 'RETRY' };

const userMachine = setup({
  types: {
    context: {} as UserContext,
    events: {} as UserEvents
  },
  actions: {
    setUser: assign({
      user: ({ event }) => {
        if (event.type === 'SUCCESS') return event.user;
        return null;
      }
    }),
    setError: assign({
      error: ({ event }) => {
        if (event.type === 'ERROR') return event.message;
        return null;
      }
    }),
    incrementAttempts: assign({
      attempts: ({ context }) => context.attempts + 1
    })
  },
  guards: {
    canRetry: ({ context }) => context.attempts < 3,
    hasUser: ({ context }) => context.user !== null
  }
}).createMachine({
  id: 'user',
  initial: 'idle',
  context: {
    user: null,
    error: null,
    attempts: 0
  },
  states: {
    idle: {
      on: { FETCH: 'loading' }
    },
    loading: {
      on: {
        SUCCESS: {
          target: 'success',
          actions: 'setUser'
        },
        ERROR: {
          target: 'error',
          actions: ['setError', 'incrementAttempts']
        }
      }
    },
    success: {},
    error: {
      on: {
        RETRY: {
          guard: 'canRetry',
          target: 'loading'
        }
      }
    }
  }
});
```

### Typed Actions with Parameters

```typescript
const machine = setup({
  types: {
    context: {} as { user: { name: string } }
  },
  actions: {
    greet: (_, params: { greeting: string }) => {
      console.log(params.greeting);
    }
  }
}).createMachine({
  entry: {
    type: 'greet',
    params: ({ context }) => ({
      greeting: `Hello, ${context.user.name}!`
    })
  }
});
```

### assertEvent Helper

```typescript
import { assertEvent } from 'xstate';

actions: {
  handleSubmit: ({ event }) => {
    assertEvent(event, 'SUBMIT');
    // event is now typed as { type: 'SUBMIT'; data: FormData }
    console.log(event.data);
  }
}
```

---

## 8. Visualization

### Stately Studio

[Stately Studio](https://stately.ai/studio) is the official visual editor for XState machines:
- Design machines visually
- Generate TypeScript code
- Collaborate with team members
- Export/import machines

### Stately Inspector

Real-time inspection of running actors:

```typescript
import { createActor } from 'xstate';
import { createBrowserInspector } from '@statelyai/inspect';

const inspector = createBrowserInspector();

const actor = createActor(machine, {
  inspect: inspector.inspect
});

actor.start();
```

### XState Visualizer

Online visualizer: [stately.ai/viz](https://stately.ai/viz)

```typescript
// Paste machine definition to visualize
import { createMachine } from 'xstate';

export const machine = createMachine({
  // ...
});
```

---

## 9. Patterns

### Parallel States

```typescript
const editorMachine = createMachine({
  type: 'parallel',
  states: {
    bold: {
      initial: 'off',
      states: {
        off: { on: { TOGGLE_BOLD: 'on' } },
        on: { on: { TOGGLE_BOLD: 'off' } }
      }
    },
    italic: {
      initial: 'off',
      states: {
        off: { on: { TOGGLE_ITALIC: 'on' } },
        on: { on: { TOGGLE_ITALIC: 'off' } }
      }
    }
  }
});
```

### History States

```typescript
const playerMachine = createMachine({
  initial: 'playing',
  states: {
    playing: {
      initial: 'track1',
      states: {
        track1: { on: { NEXT: 'track2' } },
        track2: { on: { NEXT: 'track3' } },
        track3: {},
        hist: { type: 'history' }  // Shallow history
      },
      on: { PAUSE: 'paused' }
    },
    paused: {
      on: { PLAY: 'playing.hist' }  // Resume from history
    }
  }
});
```

### Delayed Transitions

```typescript
import { setup } from 'xstate';

const notificationMachine = setup({
  delays: {
    autoHide: 3000,
    warning: ({ context }) => context.priority === 'high' ? 1000 : 5000
  }
}).createMachine({
  initial: 'visible',
  states: {
    visible: {
      after: {
        autoHide: { target: 'hidden' }
      },
      on: { DISMISS: 'hidden' }
    },
    hidden: { type: 'final' }
  }
});
```

### Nested/Hierarchical States

```typescript
const authMachine = createMachine({
  initial: 'unauthenticated',
  states: {
    unauthenticated: {
      initial: 'idle',
      states: {
        idle: {
          on: { LOGIN: 'authenticating' }
        },
        authenticating: {
          invoke: {
            src: 'authenticate',
            onDone: '#auth.authenticated',
            onError: 'error'
          }
        },
        error: {
          on: { RETRY: 'authenticating' }
        }
      }
    },
    authenticated: {
      id: 'auth.authenticated',
      on: { LOGOUT: 'unauthenticated' }
    }
  }
});
```

---

## 10. Use Cases

### Form Validation

```typescript
const formMachine = setup({
  types: {
    context: {} as {
      values: { email: string; password: string };
      errors: Record<string, string>;
    },
    events: {} as
      | { type: 'CHANGE'; field: string; value: string }
      | { type: 'SUBMIT' }
      | { type: 'VALIDATE' }
  },
  guards: {
    isValid: ({ context }) => Object.keys(context.errors).length === 0
  }
}).createMachine({
  id: 'form',
  initial: 'editing',
  context: {
    values: { email: '', password: '' },
    errors: {}
  },
  states: {
    editing: {
      on: {
        CHANGE: {
          actions: assign({
            values: ({ context, event }) => ({
              ...context.values,
              [event.field]: event.value
            })
          })
        },
        SUBMIT: 'validating'
      }
    },
    validating: {
      always: [
        { guard: 'isValid', target: 'submitting' },
        { target: 'editing' }
      ]
    },
    submitting: {
      invoke: {
        src: 'submitForm',
        onDone: 'success',
        onError: 'editing'
      }
    },
    success: { type: 'final' }
  }
});
```

### Multi-Step Wizard

```typescript
const wizardMachine = createMachine({
  id: 'wizard',
  initial: 'step1',
  context: {
    data: {},
    currentStep: 1,
    totalSteps: 3
  },
  states: {
    step1: {
      on: {
        NEXT: {
          target: 'step2',
          actions: assign({
            data: ({ context, event }) => ({ ...context.data, ...event.data }),
            currentStep: 2
          })
        }
      }
    },
    step2: {
      on: {
        BACK: { target: 'step1', actions: assign({ currentStep: 1 }) },
        NEXT: {
          target: 'step3',
          actions: assign({
            data: ({ context, event }) => ({ ...context.data, ...event.data }),
            currentStep: 3
          })
        }
      }
    },
    step3: {
      on: {
        BACK: { target: 'step2', actions: assign({ currentStep: 2 }) },
        SUBMIT: 'submitting'
      }
    },
    submitting: {
      invoke: {
        src: 'submitWizard',
        onDone: 'complete',
        onError: 'step3'
      }
    },
    complete: { type: 'final' }
  }
});
```

### Async Data Fetching

```typescript
import { fromPromise, setup, assign } from 'xstate';

interface FetchContext<T> {
  data: T | null;
  error: Error | null;
}

const createFetchMachine = <T>() => setup({
  types: {
    context: {} as FetchContext<T>,
    events: {} as { type: 'FETCH' } | { type: 'RETRY' }
  },
  actors: {
    fetchData: fromPromise(async ({ input }: { input: { url: string } }) => {
      const res = await fetch(input.url);
      if (!res.ok) throw new Error('Fetch failed');
      return res.json() as Promise<T>;
    })
  }
}).createMachine({
  id: 'fetch',
  initial: 'idle',
  context: { data: null, error: null },
  states: {
    idle: {
      on: { FETCH: 'loading' }
    },
    loading: {
      invoke: {
        src: 'fetchData',
        input: { url: '/api/data' },
        onDone: {
          target: 'success',
          actions: assign({ data: ({ event }) => event.output, error: null })
        },
        onError: {
          target: 'failure',
          actions: assign({ error: ({ event }) => event.error as Error })
        }
      }
    },
    success: {
      on: { FETCH: 'loading' }
    },
    failure: {
      on: { RETRY: 'loading' }
    }
  }
});
```

### UI Component State (Toggle with Animation)

```typescript
const dropdownMachine = createMachine({
  id: 'dropdown',
  initial: 'closed',
  states: {
    closed: {
      on: { TOGGLE: 'opening' }
    },
    opening: {
      after: {
        300: 'open'  // Animation duration
      }
    },
    open: {
      on: {
        TOGGLE: 'closing',
        SELECT: {
          target: 'closing',
          actions: 'handleSelect'
        }
      }
    },
    closing: {
      after: {
        300: 'closed'
      }
    }
  }
});
```

---

## Quick Reference

### Installation

```bash
npm install xstate @xstate/react
```

### Essential Imports

```typescript
import {
  createMachine,
  createActor,
  setup,
  assign,
  raise,
  sendTo,
  fromPromise,
  fromCallback,
  fromObservable,
  and,
  or,
  not
} from 'xstate';

import {
  useMachine,
  useActor,
  useActorRef,
  useSelector,
  createActorContext
} from '@xstate/react';
```

### Key v4 to v5 Changes

| v4 | v5 |
|----|----|
| `services` | `actors` |
| `cond` | `guard` |
| `send()` | `raise()` / `sendTo()` |
| `useInterpret()` | `useActorRef()` |
| `schema` | `types` |
| `invoke.src: (ctx) => promise` | `invoke.src: fromPromise(...)` |

---

## Resources

- [Official Documentation](https://stately.ai/docs/xstate)
- [XState GitHub](https://github.com/statelyai/xstate)
- [Stately Studio](https://stately.ai/studio)
- [XState Visualizer](https://stately.ai/viz)
- [@xstate/react Package](https://stately.ai/docs/xstate-react)
- [Migration Guide v4 to v5](https://stately.ai/docs/migration)

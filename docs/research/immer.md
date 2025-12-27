# Immer - Immutable State Updates with Mutable Syntax

> **Immer** (German for "always") is a tiny library that allows you to work with immutable state in a more convenient way by using mutable syntax. Winner of "Breakthrough of the year" at React Open Source Awards and "Most impactful" at JavaScript Awards in 2019.

## Table of Contents

- [Core Concepts](#core-concepts)
- [The `produce` Function](#the-produce-function)
- [Draft and Immutable Types (TypeScript)](#draft-and-immutable-types-typescript)
- [Nested Updates Patterns](#nested-updates-patterns)
- [Array Mutations](#array-mutations)
- [Map and Set Support](#map-and-set-support)
- [Patches for Undo/Redo](#patches-for-undoredo)
- [Performance Considerations](#performance-considerations)
- [Integration with React (useImmer)](#integration-with-react-useimmer)
- [Integration with Redux](#integration-with-redux)
- [Frozen vs Unfrozen State](#frozen-vs-unfrozen-state)
- [Common Patterns](#common-patterns)
- [Anti-Patterns and Pitfalls](#anti-patterns-and-pitfalls)
- [When NOT to Use Immer](#when-not-to-use-immer)
- [API Reference](#api-reference)

---

## Core Concepts

### How Immer Works

Immer operates on a simple principle: instead of manually creating immutable copies of your state with spread operators and array methods, you write mutations against a temporary "draft" object. Immer tracks these changes and produces a new immutable state automatically.

```javascript
import { produce } from "immer"

const baseState = [
  { title: "Learn TypeScript", done: true },
  { title: "Try Immer", done: false }
]

// The draft can be mutated freely
const nextState = produce(baseState, draft => {
  draft.push({ title: "Tweet about it" })
  draft[1].done = true
})

// baseState is untouched, nextState reflects all changes
console.log(baseState[1].done) // false
console.log(nextState[1].done) // true
```

### Key Terminology

| Term | Description |
|------|-------------|
| **Base State** | The immutable state passed to `produce` |
| **Recipe** | The second argument of `produce` - a function that captures how the base state should be "mutated" |
| **Draft** | The first argument of any recipe - a proxy to the original base state that can be safely mutated |
| **Producer** | A function using `produce` to create the next immutable state |

### Structural Sharing

When producing new state, Immer only copies parts of the state tree that have changed. Unchanged parts are shared between old and new states:

```javascript
const baseState = {
  user: { name: "Alice", address: { city: "NYC" } },
  settings: { theme: "dark" }
}

const nextState = produce(baseState, draft => {
  draft.user.name = "Bob"
})

// Unchanged objects are shared (same reference)
console.log(baseState.settings === nextState.settings) // true
console.log(baseState.user.address === nextState.user.address) // true

// Changed path has new references
console.log(baseState.user === nextState.user) // false
console.log(baseState === nextState) // false
```

---

## The `produce` Function

### Basic Signature

```typescript
produce<T>(baseState: T, recipe: (draft: Draft<T>) => void | T): T
```

### Usage Patterns

**1. Standard Usage - Modify Draft**

```javascript
import { produce } from "immer"

const state = { count: 0, items: [] }

const newState = produce(state, draft => {
  draft.count++
  draft.items.push("item1")
})
```

**2. Replace Entire State - Return New Value**

```javascript
const newState = produce(state, draft => {
  // Return completely replaces the state
  return { count: 100, items: ["replaced"] }
})
```

**3. Conditional Updates**

```javascript
const newState = produce(state, draft => {
  if (someCondition) {
    draft.count++
  }
  // If nothing is modified and nothing returned, original state is returned
})
```

### Returning Values from Producers

**Rule**: Either mutate the draft OR return a new value, never both.

```javascript
// Valid: Mutate only
produce(state, draft => {
  draft.count++
})

// Valid: Return only (no mutations)
produce(state, draft => {
  return { ...draft, count: draft.count + 1 }
})

// INVALID: Mutate AND return
produce(state, draft => {
  draft.count++
  return draft // This is allowed but unnecessary
})

produce(state, draft => {
  draft.count++
  return { count: 99 } // ERROR: Cannot modify draft and return different value
})
```

### The `nothing` Token

Since JavaScript functions without explicit returns yield `undefined`, Immer cannot distinguish between "no return" and "intentionally return undefined". Use the `nothing` token:

```javascript
import { produce, nothing } from "immer"

const state = { user: { name: "Alice" } }

// These all return the original state
produce(state, draft => {})              // { user: { name: "Alice" } }
produce(state, draft => undefined)       // { user: { name: "Alice" } }

// This returns undefined (replaces state with undefined)
produce(state, draft => nothing)         // undefined
```

### Using `void` for Concise Mutations

Avoid accidental returns with arrow functions:

```javascript
// PROBLEM: Arrow function implicitly returns the assignment result
produce(state, draft => draft.count = 5) // Returns 5, not the draft!

// SOLUTIONS:
produce(state, draft => { draft.count = 5 })    // Block syntax
produce(state, draft => void (draft.count = 5)) // void operator
```

### Curried Producers

Pass only a recipe function to create a reusable producer:

```javascript
// Standard approach
function toggleTodo(state, id) {
  return produce(state, draft => {
    const todo = draft.find(t => t.id === id)
    todo.done = !todo.done
  })
}

// Curried approach - cleaner and reusable
const toggleTodo = produce((draft, id) => {
  const todo = draft.find(t => t.id === id)
  todo.done = !todo.done
})

// Usage is the same
const newState = toggleTodo(state, "todo-1")
```

**With Initial State (for reducers)**:

```javascript
const reducer = produce((draft, action) => {
  switch (action.type) {
    case "INCREMENT":
      draft.count++
      break
  }
}, { count: 0 }) // Initial state as second argument

const state = reducer(undefined, { type: "INCREMENT" })
```

---

## Draft and Immutable Types (TypeScript)

### Core Types

```typescript
import { Draft, Immutable, produce } from "immer"

// Draft<T> - Mutable version of T (removes readonly modifiers)
type Draft<T> = { -readonly [K in keyof T]: Draft<T[K]> }

// Immutable<T> - Deeply readonly version of T
type Immutable<T> = { readonly [K in keyof T]: Immutable<T[K]> }
```

### Usage Examples

```typescript
import { produce, Draft, Immutable } from "immer"

interface State {
  readonly items: readonly string[]
  readonly count: number
}

const baseState: Immutable<State> = {
  items: ["a", "b"],
  count: 2
}

const nextState = produce(baseState, (draft: Draft<State>) => {
  draft.items.push("c")  // OK - draft is mutable
  draft.count++          // OK
})

// nextState is still Immutable<State>
```

### WritableDraft

For explicit mutable typing:

```typescript
import { WritableDraft } from "immer"

function processItems(draft: WritableDraft<State>) {
  draft.items.push("processed")
}
```

---

## Nested Updates Patterns

### Object Mutations

```javascript
const state = {
  user: {
    profile: {
      name: "Alice",
      settings: { theme: "dark" }
    }
  }
}

produce(state, draft => {
  // Deep updates are natural
  draft.user.profile.name = "Bob"
  draft.user.profile.settings.theme = "light"

  // Add new properties
  draft.user.profile.age = 30

  // Delete properties
  delete draft.user.profile.settings.theme
})
```

### Object Used as Lookup Table

```javascript
const usersById = {
  user1: { name: "Alice" },
  user2: { name: "Bob" }
}

produce(usersById, draft => {
  // Add entry
  draft.user3 = { name: "Charlie" }

  // Update entry
  draft.user1.name = "Alicia"

  // Delete entry
  delete draft.user2

  // Bulk update
  Object.assign(draft, {
    user4: { name: "David" },
    user5: { name: "Eve" }
  })
})
```

### Complex Nested Structures

```javascript
// Object in array in map in object
const store = {
  users: new Map([
    ["17", { todos: [{ done: false }] }]
  ])
}

produce(store, draft => {
  draft.users.get("17").todos[0].done = true
})
```

### Important: Check for Existence

Immer does NOT auto-create nested structures:

```javascript
// WRONG - will crash if state[id] doesn't exist
produce(state, draft => {
  draft[id].push(item) // TypeError if draft[id] is undefined
})

// CORRECT - check and create first
produce(state, draft => {
  if (!draft[id]) {
    draft[id] = []
  }
  draft[id].push(item)
})
```

---

## Array Mutations

### All Standard Array Methods Work

```javascript
const state = [
  { id: 1, title: "Learn Immer", done: false },
  { id: 2, title: "Write docs", done: false }
]

produce(state, draft => {
  // Add items
  draft.push({ id: 3, title: "New item", done: false })
  draft.unshift({ id: 0, title: "First item", done: false })

  // Remove items
  draft.pop()                              // Remove last
  draft.shift()                            // Remove first
  draft.splice(1, 1)                       // Remove at index

  // Update items
  draft[0].done = true                     // Direct index access
  draft.find(t => t.id === 2).done = true  // Find and update

  // Insert at index
  draft.splice(1, 0, { id: 99, title: "Inserted", done: false })

  // Reorder
  draft.sort((a, b) => a.id - b.id)
  draft.reverse()

  // Fill
  draft.fill({ id: 0, title: "Reset", done: false })
})
```

### Filter and Replace

To filter, you must return a new array:

```javascript
// Filtering requires returning a new value
produce(state, draft => {
  return draft.filter(item => !item.done)
})

// Or modify in place by finding and splicing
produce(state, draft => {
  const index = draft.findIndex(item => item.done)
  if (index !== -1) {
    draft.splice(index, 1)
  }
})
```

### Remove by ID Pattern

```javascript
produce(state, draft => {
  const index = draft.findIndex(t => t.id === targetId)
  if (index !== -1) {
    draft.splice(index, 1)
  }
})
```

---

## Map and Set Support

### Enabling Map and Set

Map and Set support is opt-in for bundle size optimization:

```javascript
// Call once at application startup
import { enableMapSet } from "immer"
enableMapSet()
```

### Working with Maps

```javascript
import { produce, enableMapSet } from "immer"
enableMapSet()

const state = new Map([
  ["user1", { name: "Alice", score: 100 }],
  ["user2", { name: "Bob", score: 200 }]
])

const nextState = produce(state, draft => {
  // Update existing entry
  draft.get("user1").score += 50

  // Add new entry
  draft.set("user3", { name: "Charlie", score: 0 })

  // Delete entry
  draft.delete("user2")

  // Clear all
  // draft.clear()
})
```

### Working with Sets

```javascript
const state = new Set(["apple", "banana"])

const nextState = produce(state, draft => {
  // Add item
  draft.add("cherry")

  // Delete item
  draft.delete("banana")

  // Clear all
  // draft.clear()
})
```

### Important Limitation: Map Keys

**Map keys are never drafted!** This preserves referential equality semantics:

```javascript
const keyObj = { id: 1 }
const state = new Map([[keyObj, "value"]])

produce(state, draft => {
  // You cannot modify the key object
  // Keys always maintain their original reference
  draft.get(keyObj) // This works - key lookup uses original reference
})
```

---

## Patches for Undo/Redo

### Enabling Patches

```javascript
import { enablePatches } from "immer"
enablePatches()
```

### Using `produceWithPatches`

```javascript
import { produceWithPatches, applyPatches, enablePatches } from "immer"
enablePatches()

const state = { name: "Alice", age: 30 }

const [nextState, patches, inversePatches] = produceWithPatches(state, draft => {
  draft.age = 31
  draft.name = "Alicia"
})

// patches: Operations to go from state -> nextState
// [
//   { op: "replace", path: ["age"], value: 31 },
//   { op: "replace", path: ["name"], value: "Alicia" }
// ]

// inversePatches: Operations to go from nextState -> state (for undo)
// [
//   { op: "replace", path: ["name"], value: "Alice" },
//   { op: "replace", path: ["age"], value: 30 }
// ]
```

### Applying Patches

```javascript
// Apply forward patches (redo)
const redoneState = applyPatches(state, patches)

// Apply inverse patches (undo)
const undoneState = applyPatches(nextState, inversePatches)
```

### Patch Format

Patches follow JSON Patch format (RFC 6902) with array-based paths:

```javascript
{
  op: "add" | "remove" | "replace",
  path: ["users", 0, "name"],  // Array of path segments
  value?: any                   // Value for add/replace operations
}
```

### Implementing Undo/Redo

```javascript
import { produceWithPatches, applyPatches, enablePatches } from "immer"
enablePatches()

class UndoableState {
  constructor(initialState) {
    this.state = initialState
    this.history = []
    this.pointer = -1
  }

  update(recipe) {
    const [nextState, patches, inversePatches] = produceWithPatches(
      this.state,
      recipe
    )

    // Truncate any "future" history if we're not at the end
    this.history = this.history.slice(0, this.pointer + 1)

    // Store the change
    this.history.push({ patches, inversePatches })
    this.pointer++

    this.state = nextState
    return this.state
  }

  undo() {
    if (this.pointer < 0) return this.state

    const { inversePatches } = this.history[this.pointer]
    this.state = applyPatches(this.state, inversePatches)
    this.pointer--

    return this.state
  }

  redo() {
    if (this.pointer >= this.history.length - 1) return this.state

    this.pointer++
    const { patches } = this.history[this.pointer]
    this.state = applyPatches(this.state, patches)

    return this.state
  }
}
```

### Patch Listener Alternative

```javascript
produce(state, draft => {
  draft.name = "Bob"
}, (patches, inversePatches) => {
  // Third argument is a patch listener
  console.log("Patches:", patches)
  console.log("Inverse:", inversePatches)
})
```

### Important Notes on Patches

- **Not Optimal**: Immer does not guarantee minimal patch sets. Post-process if needed.
- **Use Cases**: WebSocket sync, debugging/tracing, collaborative editing, undo/redo
- **Memory**: Store patches instead of full state snapshots for efficient history

---

## Performance Considerations

### When Immer is Fast

1. **Structural sharing** - unchanged objects are reused
2. **Frozen state** - allows early bailout in subsequent updates
3. **Single produce call** - batch multiple mutations together

### Performance Tips

**1. Batch Updates in Single `produce`**

```javascript
// SLOW - Multiple produce calls
let state = initialState
state = produce(state, d => { d.a = 1 })
state = produce(state, d => { d.b = 2 })
state = produce(state, d => { d.c = 3 })

// FAST - Single produce call
const state = produce(initialState, draft => {
  draft.a = 1
  draft.b = 2
  draft.c = 3
})
```

**2. Use `original()` for Read-Only Access**

```javascript
import { produce, original } from "immer"

produce(state, draft => {
  // Accessing original avoids proxy overhead
  const originalData = original(draft)
  if (originalData.someValue > 100) {
    draft.processed = true
  }
})
```

**3. Pre-freeze Large Static Data**

```javascript
import { freeze } from "immer"

// Freeze static data upfront for better performance
const staticData = freeze(loadLargeDataset(), true) // true = deep freeze
```

**4. Disable Auto-freeze in Production (Legacy Approach)**

```javascript
import { setAutoFreeze } from "immer"

// Note: This was the old recommendation, but since Immer 7+,
// frozen data enables faster subsequent updates
// Only disable if you have measured performance issues
if (process.env.NODE_ENV === "production") {
  setAutoFreeze(false)
}
```

**5. Avoid Deeply Nested State**

```javascript
// Consider flattening deeply nested structures
// Instead of:
{ users: { byId: { "1": { posts: { byId: { "a": {...} } } } } } }

// Use normalized form:
{
  users: { "1": { postIds: ["a", "b"] } },
  posts: { "a": {...}, "b": {...} }
}
```

### Performance Benchmarks Context

- Immer adds ~2-3x overhead compared to hand-written spread operators
- For most applications, this is negligible (reducers are rarely bottlenecks)
- Bundle size: ~3KB min+gz
- Trade-off: Dramatically reduced bug risk and improved code clarity

---

## Integration with React (useImmer)

### Installation

```bash
npm install immer use-immer
```

### `useImmer` Hook

Drop-in replacement for `useState`:

```javascript
import { useImmer } from "use-immer"

function UserProfile() {
  const [user, updateUser] = useImmer({
    name: "Alice",
    age: 30,
    address: {
      city: "NYC",
      zip: "10001"
    }
  })

  const updateCity = (city) => {
    updateUser(draft => {
      draft.address.city = city
    })
  }

  const birthday = () => {
    updateUser(draft => {
      draft.age++
    })
  }

  // Can also pass a value directly (like useState)
  const reset = () => {
    updateUser({ name: "Guest", age: 0, address: { city: "", zip: "" } })
  }

  return (
    <div>
      <p>{user.name}, {user.age} - {user.address.city}</p>
      <button onClick={birthday}>Birthday</button>
    </div>
  )
}
```

### `useImmerReducer` Hook

```javascript
import { useImmerReducer } from "use-immer"

const initialState = {
  todos: [],
  filter: "all"
}

function reducer(draft, action) {
  switch (action.type) {
    case "ADD_TODO":
      draft.todos.push({
        id: Date.now(),
        text: action.text,
        done: false
      })
      break

    case "TOGGLE_TODO":
      const todo = draft.todos.find(t => t.id === action.id)
      if (todo) {
        todo.done = !todo.done
      }
      break

    case "SET_FILTER":
      draft.filter = action.filter
      break

    case "CLEAR_COMPLETED":
      // Must return for filter operations
      return {
        ...draft,
        todos: draft.todos.filter(t => !t.done)
      }
  }
}

function TodoApp() {
  const [state, dispatch] = useImmerReducer(reducer, initialState)

  return (
    <div>
      {state.todos.map(todo => (
        <div
          key={todo.id}
          onClick={() => dispatch({ type: "TOGGLE_TODO", id: todo.id })}
        >
          {todo.text}
        </div>
      ))}
    </div>
  )
}
```

### With React Context

```javascript
import { createContext, useContext } from "react"
import { useImmer } from "use-immer"

const StateContext = createContext()
const UpdateContext = createContext()

function StateProvider({ children }) {
  const [state, updateState] = useImmer(initialState)

  return (
    <StateContext.Provider value={state}>
      <UpdateContext.Provider value={updateState}>
        {children}
      </UpdateContext.Provider>
    </StateContext.Provider>
  )
}

function useAppState() {
  return useContext(StateContext)
}

function useUpdateState() {
  return useContext(UpdateContext)
}
```

---

## Integration with Redux

### Redux Toolkit (Built-in)

Redux Toolkit uses Immer internally - no extra setup needed:

```javascript
import { createSlice } from "@reduxjs/toolkit"

const todosSlice = createSlice({
  name: "todos",
  initialState: [],
  reducers: {
    todoAdded(state, action) {
      // "Mutating" code is safe inside createSlice
      state.push({
        id: action.payload.id,
        text: action.payload.text,
        done: false
      })
    },
    todoToggled(state, action) {
      const todo = state.find(t => t.id === action.payload)
      if (todo) {
        todo.done = !todo.done
      }
    },
    todosCleared(state, action) {
      // Return new value for filter operations
      return state.filter(t => !t.done)
    }
  }
})

export const { todoAdded, todoToggled, todosCleared } = todosSlice.actions
export default todosSlice.reducer
```

### Debugging with `current()`

Redux Toolkit re-exports Immer utilities:

```javascript
import { current, original, isDraft } from "@reduxjs/toolkit"

const todosSlice = createSlice({
  name: "todos",
  initialState: [],
  reducers: {
    debugTodo(state, action) {
      // Proxies are hard to read in console
      console.log(state) // Shows Proxy object

      // Use current() for readable snapshot
      console.log(current(state)) // Shows plain JS object

      // Use original() for pre-modification state
      console.log(original(state))

      // Check if value is a draft
      console.log(isDraft(state)) // true
    }
  }
})
```

### extraReducers

```javascript
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

const fetchTodos = createAsyncThunk("todos/fetch", async () => {
  const response = await fetch("/api/todos")
  return response.json()
})

const todosSlice = createSlice({
  name: "todos",
  initialState: { items: [], loading: false },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchTodos.pending, state => {
        state.loading = true
      })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
      })
  }
})
```

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  overrides: [
    {
      files: ["src/**/*.slice.ts", "src/**/*.slice.js"],
      rules: {
        "no-param-reassign": ["error", { props: false }]
      }
    }
  ]
}
```

---

## Frozen vs Unfrozen State

### Auto-Freeze Behavior

By default, Immer freezes all state produced by `produce()`. This prevents accidental mutations:

```javascript
const state = produce({ count: 0 }, draft => {
  draft.count = 1
})

// Attempting to mutate frozen state throws in strict mode
state.count = 2 // TypeError: Cannot assign to read only property
```

### Controlling Auto-Freeze

```javascript
import { setAutoFreeze } from "immer"

// Disable auto-freezing
setAutoFreeze(false)

// Enable auto-freezing (default)
setAutoFreeze(true)
```

### When to Disable Auto-Freeze

Since Immer 7+, frozen data enables performance optimizations (early bailout for unchanged drafts). Disabling is rarely beneficial now, but consider it if:

- Working with very large objects where freezing overhead is measurable
- Integrating with libraries that need to mutate the state

### Manual Freezing

```javascript
import { freeze } from "immer"

// Shallow freeze
const frozen = freeze(obj)

// Deep freeze
const deepFrozen = freeze(obj, true)
```

### What Gets Frozen

- All objects and arrays in the produced result are frozen
- Non-enumerable, non-own, and symbolic properties are NOT frozen unless actively drafted
- Objects from closures (not from base state) are not frozen

---

## Common Patterns

### Toggle Boolean

```javascript
produce(state, draft => {
  draft.isActive = !draft.isActive
})
```

### Update Item in Array by ID

```javascript
produce(state, draft => {
  const item = draft.items.find(i => i.id === targetId)
  if (item) {
    item.value = newValue
  }
})
```

### Upsert Pattern

```javascript
produce(state, draft => {
  const existingIndex = draft.items.findIndex(i => i.id === item.id)
  if (existingIndex >= 0) {
    draft.items[existingIndex] = item
  } else {
    draft.items.push(item)
  }
})
```

### Move Item in Array

```javascript
produce(state, draft => {
  const [item] = draft.items.splice(fromIndex, 1)
  draft.items.splice(toIndex, 0, item)
})
```

### Increment Counter with Max

```javascript
produce(state, draft => {
  draft.count = Math.min(draft.count + 1, draft.maxCount)
})
```

### Bulk Update from Object

```javascript
produce(state, draft => {
  Object.assign(draft, updates)
})
```

### Conditional Reset

```javascript
produce(state, draft => {
  if (shouldReset) {
    return initialState
  }
  draft.value = newValue
})
```

---

## Anti-Patterns and Pitfalls

### 1. Never Reassign the Draft Argument

```javascript
// WRONG - only reassigns local variable
produce(state, draft => {
  draft = { newState: true }
})

// CORRECT - return new state
produce(state, draft => {
  return { newState: true }
})
```

### 2. Don't Mix Mutations and Returns

```javascript
// WRONG - can't mutate AND return different value
produce(state, draft => {
  draft.count++
  return { count: 99 }
})

// CORRECT - do one or the other
produce(state, draft => {
  draft.count++
})
```

### 3. State Must Be a Tree (No Circular References)

```javascript
// WRONG - object appears multiple times
const obj = { value: 1 }
const state = { a: obj, b: obj }  // obj referenced twice

// CORRECT - unique objects
const state = {
  a: { value: 1 },
  b: { value: 1 }
}
```

### 4. Don't Mutate Closure Data

```javascript
// WRONG - closureData is not drafted
const closureData = { x: 1 }
produce(state, draft => {
  draft.data = closureData
  closureData.x = 2  // This mutates the original!
})

// CORRECT - clone closure data
produce(state, draft => {
  draft.data = { ...closureData }
})
```

### 5. Arrow Function Implicit Return Trap

```javascript
// WRONG - implicitly returns 5, not the draft
const next = produce(state, d => d.count = 5)

// CORRECT
const next = produce(state, d => { d.count = 5 })
const next = produce(state, d => void (d.count = 5))
```

### 6. Extracting Primitives Loses Draft Connection

```javascript
// WRONG - extracted primitive loses draft connection
produce(state, draft => {
  let count = draft.count
  count++  // This doesn't update the draft!
})

// CORRECT - mutate the draft directly
produce(state, draft => {
  draft.count++
})
```

### 7. Nested Produce Must Merge Results

```javascript
// WRONG - inner produce result is discarded
produce(state, draft => {
  produce(draft.nested, nestedDraft => {
    nestedDraft.value = 1
  })
})

// CORRECT - merge nested result back
produce(state, draft => {
  draft.nested = produce(draft.nested, nestedDraft => {
    nestedDraft.value = 1
  })
})
```

### 8. Draft Comparison Issues

```javascript
// WRONG - drafts are Proxies, not equal to originals
produce(state, draft => {
  if (draft === state) { }  // Always false
  if (draft.item === state.item) { }  // Also false
})

// CORRECT - use original() for comparison
produce(state, draft => {
  if (original(draft) === state) { }
  if (original(draft.item) === state.item) { }
})
```

### 9. Array Methods Don't Draft Callback Arguments

```javascript
// WRONG - callback gets base values, not drafts
produce(state, draft => {
  draft.items.filter(item => {
    item.processed = true  // NOT tracked!
    return item.active
  })
})

// CORRECT - find index and mutate via draft
produce(state, draft => {
  draft.items.forEach((item, i) => {
    draft.items[i].processed = true
  })
})
```

---

## When NOT to Use Immer

### 1. Simple, Shallow State Updates

If your state is flat and updates are simple, Immer adds unnecessary overhead:

```javascript
// Spread is fine for simple updates
const newState = { ...state, count: state.count + 1 }

// Don't use Immer just for this
const newState = produce(state, d => { d.count++ })
```

### 2. Performance-Critical Hot Paths

For code that runs thousands of times per second (e.g., animation frames, game loops):

```javascript
// Direct mutation or hand-optimized immutable updates may be faster
// Measure before assuming Immer is the bottleneck
```

### 3. Non-Plain Objects

Immer doesn't work well with:
- DOM nodes
- Buffers
- Date objects (must create new instances)
- Class instances (requires `immerable` symbol)
- Subclasses of Map/Set/Array

### 4. When Team Doesn't Understand Immutability

If developers might use "mutating" patterns outside Immer context:

```javascript
// If someone copies this pattern outside createSlice...
state.items.push(newItem)  // Real mutation bug!

// Consider keeping explicit immutable patterns if team is learning
```

### 5. Very Large Objects with Infrequent Updates

The proxy overhead and freezing cost may outweigh benefits for massive static data:

```javascript
// For million-element arrays with rare updates,
// consider specialized immutable data structures
```

---

## API Reference

### Core Functions

| Function | Description |
|----------|-------------|
| `produce(state, recipe)` | Create next state by applying recipe to draft |
| `produceWithPatches(state, recipe)` | Like produce, but returns `[state, patches, inversePatches]` |
| `applyPatches(state, patches)` | Apply patches to produce new state |
| `createDraft(state)` | Create a draft for manual finishing (low-level) |
| `finishDraft(draft, patchListener?)` | Finish a draft created with createDraft |

### Utilities

| Function | Description |
|----------|-------------|
| `current(draft)` | Get a snapshot of current draft state (for debugging) |
| `original(draft)` | Get the original state before any modifications |
| `isDraft(value)` | Check if a value is a draft |
| `freeze(obj, deep?)` | Manually freeze an object |
| `nothing` | Token to explicitly return undefined |

### Configuration

| Function | Description |
|----------|-------------|
| `setAutoFreeze(enabled)` | Enable/disable auto-freezing of produced state |
| `setUseStrictShallowCopy(mode)` | Configure non-enumerable property handling |
| `enableMapSet()` | Enable Map and Set support |
| `enablePatches()` | Enable patch generation support |

### TypeScript Types

| Type | Description |
|------|-------------|
| `Draft<T>` | Mutable version of T |
| `Immutable<T>` | Deeply readonly version of T |
| `WritableDraft<T>` | Explicit mutable draft type |
| `Patch` | Patch object type |

---

## Further Resources

- [Official Immer Documentation](https://immerjs.github.io/immer/)
- [Redux Toolkit Immer Guide](https://redux-toolkit.js.org/usage/immer-reducers)
- [use-immer GitHub](https://github.com/immerjs/use-immer)
- [Immer GitHub Repository](https://github.com/immerjs/immer)
- [Patches Documentation](https://immerjs.github.io/immer/patches/)

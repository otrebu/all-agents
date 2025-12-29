---
depends: []
---

# Immer

Write mutable code, produce immutable state. Simplifies nested updates.

## Quick Start

```bash
# install
immer
```

## Basic Usage

```typescript
import { produce } from "immer";

const baseState = {
  user: { name: "John", settings: { theme: "dark" } },
  items: [1, 2, 3],
};

const nextState = produce(baseState, (draft) => {
  draft.user.settings.theme = "light"; // Mutate the draft
  draft.items.push(4);
});

// baseState unchanged, nextState has updates
```

## Curried Producer

```typescript
const addItem = produce((draft: Item[], item: Item) => {
  draft.push(item);
});

// Usage
const newItems = addItem(items, { id: 1, name: "New" });
```

## Common Patterns

### Array Operations

```typescript
produce(items, (draft) => {
  // Add
  draft.push(newItem);

  // Update
  const index = draft.findIndex((i) => i.id === id);
  if (index !== -1) draft[index].done = true;

  // Remove
  const idx = draft.findIndex((i) => i.id === id);
  if (idx !== -1) draft.splice(idx, 1);

  // Filter (return new array)
  return draft.filter((i) => !i.done);
});
```

### Nested Objects

```typescript
produce(state, (draft) => {
  draft.user.profile.settings.notifications.email = false;
});

// vs without Immer:
{
  ...state,
  user: {
    ...state.user,
    profile: {
      ...state.user.profile,
      settings: {
        ...state.user.profile.settings,
        notifications: {
          ...state.user.profile.settings.notifications,
          email: false
        }
      }
    }
  }
}
```

## When to Use

| Scenario | Use Immer |
|----------|-----------|
| Deeply nested state | Yes |
| Complex array operations | Yes |
| Simple flat state | Overkill |
| Performance-critical hot paths | Profile first |

Immer = write mutations, get immutability. ~3KB gzipped.

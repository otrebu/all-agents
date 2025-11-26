# GitHub Code Search: SolidJS Complex State Patterns

**Date:** 2025-11-26
**Query:** solidjs patterns for handling complex state

## Summary

Analysis of real-world SolidJS state management patterns from production codebases including TanStack Query (47.5k stars), Spacedrive (35.7k stars), Cap (15k stars), and urql (8.9k stars). Key patterns: `createStore` with `produce`/`reconcile` for nested state, `createMutable` for simpler mutable stores, and Context for dependency injection.

## Patterns

### 1. `createStore` + `reconcile` for Query Results

**Pattern:** Use `reconcile` to efficiently update store state with external data while preserving reactivity.

```typescript
import { createStore, reconcile, unwrap } from 'solid-js/store'

function reconcileFn<TData, TError>(
  store: QueryObserverResult<TData, TError>,
  result: QueryObserverResult<TData, TError>,
  reconcileOption: string | false | ((oldData: TData | undefined, newData: TData) => TData),
): QueryObserverResult<TData, TError> {
  if (reconcileOption === false) return result
  if (typeof reconcileOption === 'function') {
    // Custom reconciliation logic
  }
  // Use reconcile for efficient diffing
}
```

**Refs:** [TanStack/query - useBaseQuery.ts](https://github.com/TanStack/query/blob/8b387341eb8e5ce6447b55023c724c76747d4f00/packages/solid-query/src/useBaseQuery.ts)

### 2. `produce` for Immer-style Mutations

**Pattern:** Use `produce` from `solid-js/store` for immutable updates with mutable syntax.

```typescript
import { produce, unwrap } from "solid-js/store";

async function updatePresets(fn: (prev: PresetsStore) => void) {
  if (query.isLoading) throw new Error("Presets not loaded");

  let p = query.data;
  if (!p) await presetsStore.set((p = { presets: [], default: null }));

  const newValue = produce(fn)(p);
  await presetsStore.set(newValue);
}
```

**Refs:** [CapSoftware/Cap - createPresets.ts](https://github.com/CapSoftware/Cap/blob/a292974ed15926ca32fc28622d39de347464c3f0/apps/desktop/src/utils/createPresets.ts)

### 3. `createMutable` for Simple Global State

**Pattern:** Use `createMutable` for straightforward mutable stores without setter functions.

```typescript
import { createMutable } from 'solid-js/store';

interface Store {
  state: { status: 'loading' | 'notLoggedIn' | 'loggingIn' | 'loggedIn' | 'loggingOut' };
}

const store = createMutable<Store>({
  state: { status: 'loading' }
});

// Direct mutation
store.state = { status: 'loggedIn' };
```

**Refs:** [spacedriveapp/spacedrive - auth.ts](https://github.com/spacedriveapp/spacedrive/blob/85bebf4d128c78bb96906d3038b70e83033f50fe/apps/mobile/src/stores/auth.ts)

### 4. `createPersistedMutable` for Persistent State

**Pattern:** Wrap `createMutable` with persistence logic for localStorage/IndexedDB.

```typescript
import { createMutable } from 'solid-js/store';

export const debugState = createPersistedMutable(
  'sd-debugState',
  createMutable<DebugState>({
    enabled: globalThis.isDev,
    rspcLogger: false,
    reactQueryDevtools: false,
  })
);

export function useDebugState() {
  return useSolidStore(debugState);
}
```

**Refs:** [spacedriveapp/spacedrive - debugState.ts](https://github.com/spacedriveapp/spacedrive/blob/85bebf4d128c78bb96906d3038b70e83033f50fe/packages/client/src/stores/debugState.ts)

### 5. Context + Provider Pattern

**Pattern:** Standard dependency injection using `createContext` with typed defaults.

```typescript
import { createContext, useContext } from 'solid-js'
import type { Accessor } from 'solid-js'

const IsRestoringContext = createContext<Accessor<boolean>>(() => false)

export const useIsRestoring = () => useContext(IsRestoringContext)
export const IsRestoringProvider = IsRestoringContext.Provider
```

**Refs:** [TanStack/query - isRestoring.ts](https://github.com/TanStack/query/blob/8b387341eb8e5ce6447b55023c724c76747d4f00/packages/solid-query/src/isRestoring.ts)

### 6. Combined Store with Primitives Pattern

**Pattern:** Use `createStore` with `createComputed`/`createMemo` for derived state and side effects.

```typescript
import { batch, createComputed, createMemo, createResource, createSignal, onCleanup } from 'solid-js';
import { createStore, produce, reconcile } from 'solid-js/store';

// Combine store for data with signals for UI state
const [store, setStore] = createStore<QueryResult>({...});
const [isPending, setIsPending] = createSignal(false);

// Derived state
const isLoading = createMemo(() => store.status === 'loading' || isPending());

// Side effects on store changes
createComputed(on(() => store.data, (data) => {
  // React to data changes
}));
```

**Refs:** [urql-graphql/urql - createQuery.ts](https://github.com/urql-graphql/urql/blob/d845f88bd6b3529666776d315ebcd3d27f61ac23/packages/solid-urql/src/createQuery.ts)

## Key Imports from `solid-js/store`

```typescript
import {
  createStore,    // Reactive store with [state, setState] tuple
  createMutable,  // Directly mutable proxy store
  produce,        // Immer-style mutation helper
  reconcile,      // Efficient state diffing/merging
  unwrap,         // Get raw JS object from proxy
} from 'solid-js/store';
```

## Best Practices Summary

| Use Case | Recommended Approach |
|----------|---------------------|
| Query/fetched data | `createStore` + `reconcile` |
| Form state | `createStore` + `produce` |
| Simple global flags | `createMutable` |
| Persistent settings | `createPersistedMutable` wrapper |
| Dependency injection | `createContext` + Provider |
| Derived state | `createMemo` / `createComputed` |

## All Analyzed Files

1. [TanStack/query - useQueries.ts](https://github.com/TanStack/query/blob/8b387341eb8e5ce6447b55023c724c76747d4f00/packages/solid-query/src/useQueries.ts)
2. [TanStack/query - useBaseQuery.ts](https://github.com/TanStack/query/blob/8b387341eb8e5ce6447b55023c724c76747d4f00/packages/solid-query/src/useBaseQuery.ts)
3. [TanStack/query - isRestoring.ts](https://github.com/TanStack/query/blob/8b387341eb8e5ce6447b55023c724c76747d4f00/packages/solid-query/src/isRestoring.ts)
4. [CapSoftware/Cap - createPresets.ts](https://github.com/CapSoftware/Cap/blob/a292974ed15926ca32fc28622d39de347464c3f0/apps/desktop/src/utils/createPresets.ts)
5. [CapSoftware/Cap - context.ts](https://github.com/CapSoftware/Cap/blob/a292974ed15926ca32fc28622d39de347464c3f0/apps/desktop/src/routes/editor/context.ts)
6. [urql-graphql/urql - createQuery.ts](https://github.com/urql-graphql/urql/blob/d845f88bd6b3529666776d315ebcd3d27f61ac23/packages/solid-urql/src/createQuery.ts)
7. [spacedriveapp/spacedrive - auth.ts](https://github.com/spacedriveapp/spacedrive/blob/85bebf4d128c78bb96906d3038b70e83033f50fe/apps/mobile/src/stores/auth.ts)
8. [spacedriveapp/spacedrive - onboardingStore.ts](https://github.com/spacedriveapp/spacedrive/blob/85bebf4d128c78bb96906d3038b70e83033f50fe/packages/client/src/stores/onboardingStore.ts)
9. [spacedriveapp/spacedrive - debugState.ts](https://github.com/spacedriveapp/spacedrive/blob/85bebf4d128c78bb96906d3038b70e83033f50fe/packages/client/src/stores/debugState.ts)
10. [spacedriveapp/spacedrive - createPersistedMutable.ts](https://github.com/spacedriveapp/spacedrive/blob/85bebf4d128c78bb96906d3038b70e83033f50fe/packages/client/src/solid/createPersistedMutable.ts)
11. [NervJS/taro - app.ts](https://github.com/NervJS/taro/blob/dc9bd71cc1ca8307299e5e1fe24367abeb0dfd71/packages/taro-platform-harmony/src/runtime-framework/solid/app.ts)
12. [solidjs/solid - rendering.ts](https://github.com/solidjs/solid/blob/a5b51fe200fd59a158410f4008677948fec611d9/packages/solid/src/server/rendering.ts)
13. [unplugin/unplugin-auto-import - solid.ts](https://github.com/unplugin/unplugin-auto-import/blob/f9e47fc926121f5bbabca6c72b4254b523fb7b0a/src/presets/solid.ts)

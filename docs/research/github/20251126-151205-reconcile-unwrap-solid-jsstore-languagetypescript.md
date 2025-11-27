# GitHub Code Search Results

**Query:** `reconcile unwrap solid-js/store language:typescript`
**Found:** 100 results, showing top 10
**Execution:** 2.3s

---

### 1. [TanStack/query](https://github.com/TanStack/query) ⭐ 47.5k

**Path:** `packages/solid-query/src/useBaseQuery.ts`
**Language:** typescript | **Lines:** 37
**Link:** https://github.com/TanStack/query/blob/8b387341eb8e5ce6447b55023c724c76747d4f00/packages/solid-query/src/useBaseQuery.ts

```typescript
// Had to disable the lint rule because isServer type is defined as false
// in solid-js/web package. I'll create a GitHub issue with them to see
// why that happens.
import { hydrate, notifyManager, shouldThrowError } from '@tanstack/query-core'
import { isServer } from 'solid-js/web'
import {
  createComputed,
  createMemo,
  createResource,
  createSignal,
  on,
  onCleanup,
} from 'solid-js'
import { createStore, reconcile, unwrap } from 'solid-js/store'
import { useQueryClient } from './QueryClientProvider'
import { useIsRestoring } from './isRestoring'
import type { UseBaseQueryOptions } from './types'
import type { Accessor, Signal } from 'solid-js'
import type { QueryClient } from './QueryClient'
import type {
  Query,
  QueryKey,
  QueryObserver,
  QueryObserverResult,
} from '@tanstack/query-core'

function reconcileFn<TData, TError>(
  store: QueryObserverResult<TData, TError>,
  result: QueryObserverResult<TData, TError>,
  reconcileOption:
    | string
    | false
    | ((oldData: TData | undefined, newData: TData) => TData),
  queryHash?: string,
): QueryObserverResult<TData, TError> {
  if (reconcileOption === false) return result
  if (typeof reconcileOption === 'function') {
```

---

### 2. [CapSoftware/Cap](https://github.com/CapSoftware/Cap) ⭐ 15.0k

**Path:** `apps/desktop/src/routes/editor/context.ts`
**Language:** typescript | **Lines:** 42
**Link:** https://github.com/CapSoftware/Cap/blob/a292974ed15926ca32fc28622d39de347464c3f0/apps/desktop/src/routes/editor/context.ts

```typescript
import {
	createElementBounds,
	type NullableBounds,
} from "@solid-primitives/bounds";
import { createContextProvider } from "@solid-primitives/context";
import { trackStore } from "@solid-primitives/deep";
import { createEventListener } from "@solid-primitives/event-listener";
import { createUndoHistory } from "@solid-primitives/history";
import { createQuery, skipToken } from "@tanstack/solid-query";
import {
	type Accessor,
	batch,
	createEffect,
	createResource,
	createSignal,
	on,
	onCleanup,
} from "solid-js";
import { createStore, produce, reconcile, unwrap } from "solid-js/store";

import { createPresets } from "~/utils/createPresets";
import { createCustomDomainQuery } from "~/utils/queries";
import { createImageDataWS, createLazySignal } from "~/utils/socket";
import {
	commands,
	events,
	type FramesRendered,
	type MultipleSegments,
	type ProjectConfiguration,
	type RecordingMeta,
	type SerializedEditorInstance,
	type SingleSegment,
	type XY,
} from "~/utils/tauri";
import { createProgressBar } from "./utils";

export type CurrentDialog =
	| { type: "createPreset" }
	| { type: "renamePreset"; presetIndex: number }
	| { type: "deletePreset"; presetIndex: number }
// ... truncated ...
```

---

### 3. [morethanwords/tweb](https://github.com/morethanwords/tweb) ⭐ 2.3k

**Path:** `src/lib/mtproto/mtprotoworker.ts`
**Language:** typescript | **Lines:** 47
**Link:** https://github.com/morethanwords/tweb/blob/2071f286df0737b223da54001a501dd904c47117/src/lib/mtproto/mtprotoworker.ts

```typescript
import {makeWorkerURL} from '../../helpers/setWorkerProxy';
import ServiceWorkerURL from '../../../sw?worker&url';
import setDeepProperty, {joinDeepPath, splitDeepPath} from '../../helpers/object/setDeepProperty';
import getThumbKey from '../storages/utils/thumbs/getThumbKey';
import {NULL_PEER_ID, TEST_NO_STREAMING, THUMB_TYPE_FULL} from './mtproto_config';
import generateEmptyThumb from '../storages/utils/thumbs/generateEmptyThumb';
import getStickerThumbKey from '../storages/utils/thumbs/getStickerThumbKey';
import callbackify from '../../helpers/callbackify';
import isLegacyMessageId from '../appManagers/utils/messageId/isLegacyMessageId';
import {MTAppConfig} from './appConfig';
import {setAppStateSilent} from '../../stores/appState';
import getObjectKeysAndSort from '../../helpers/object/getObjectKeysAndSort';
import {reconcilePeer, reconcilePeers} from '../../stores/peers';
import {getCurrentAccount} from '../accounts/getCurrentAccount';
import {ActiveAccountNumber} from '../accounts/types';
import {createProxiedManagersForAccount} from '../appManagers/getProxiedManagers';
import noop from '../../helpers/noop';
import AccountController from '../accounts/accountController';
import getPeerTitle from '../../components/wrappers/getPeerTitle';
import I18n from '../langPack';
import {NOTIFICATION_BADGE_PATH} from '../../config/notifications';
import {createAppURLForAccount} from '../accounts/createAppURLForAccount';
import {appSettings, setAppSettingsSilent} from '../../stores/appSettings';
import {produce, unwrap} from 'solid-js/store';
import {batch} from 'solid-js';
import createNotificationImage from '../../helpers/createNotificationImage';
import PasscodeLockScreenController from '../../components/passcodeLock/passcodeLockScreenController';
import EncryptionKeyStore from '../passcode/keyStore';
import DeferredIsUsingPasscode from '../passcode/deferredIsUsingPasscode';
import CacheStorageController from '../files/cacheStorage';
import type {PushSingleManager} from './pushSingleManager';
import getDeepProperty from '../../helpers/object/getDeepProperty';
import {_changeHistoryStorageKey, _deleteHistoryStorage, _useHistoryStorage} from '../../stores/historyStorages';
import SlicedArray, {SliceEnd} from '../../helpers/slicedArray';
import {createHistoryStorageSearchSlicedArray} from '../appManagers/utils/messages/createHistoryStorage';
import tabId from '../../config/tabId';


export type Mirrors = {
  state: State,
// ... truncated ...
```

---

### 4. [morethanwords/tweb](https://github.com/morethanwords/tweb) ⭐ 2.3k

**Path:** `src/stores/appState.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/morethanwords/tweb/blob/2071f286df0737b223da54001a501dd904c47117/src/stores/appState.ts

```typescript
import {createRoot} from 'solid-js';
import {createStore, reconcile, SetStoreFunction, unwrap} from 'solid-js/store';
import {State} from '../config/state';
import rootScope from '../lib/rootScope';

const [appState, _setAppState] = createRoot(() => createStore<State>({} as any));

const setAppState: SetStoreFunction<State, Promise<void>> = (...args: any[]) => {
  const key = args[0];
  // @ts-ignore
  _setAppState(...args);
  // @ts-ignore
  return rootScope.managers.appStateManager.setByKey(key, unwrap(appState[key]));
};

const setAppStateSilent = (key: any, value?: any) => {
  if(typeof(key) === 'object') {
    _setAppState(key);
    return;
  }

  _setAppState(key, reconcile(value));
};

const useAppState = () => [appState, setAppState] as const;

const useAppConfig = () => appState.appConfig;
```

---

### 5. [TanStack/bling](https://github.com/TanStack/bling) ⭐ 1.5k

**Path:** `examples/astro-solid-router/src/app/data/useLoader.ts`
**Language:** typescript | **Lines:** 39
**Link:** https://github.com/TanStack/bling/blob/62703ba3d204a0315ef6043d0f59c5b70c27e73d/examples/astro-solid-router/src/app/data/useLoader.ts

```typescript
import type {
  Resource,
  ResourceFetcher,
  ResourceFetcherInfo,
  ResourceOptions,
  Signal,
} from 'solid-js'
import {
  createResource,
  onCleanup,
  startTransition,
  untrack,
  useContext,
} from 'solid-js'
import type { ReconcileOptions } from 'solid-js/store'
import { createStore, reconcile, unwrap } from 'solid-js/store'
import { isServer } from 'solid-js/web'
import { useNavigate } from '@solidjs/router'
import { isRedirectResponse, LocationHeader } from '@tanstack/bling'
// import { ServerContext } from '../server/ServerContext'
// import { FETCH_EVENT, ServerFunctionEvent } from '../server/types'

interface RouteDataEvent {}

type RouteDataSource<S> =
  | S
  | false
  | null
  | undefined
  | (() => S | false | null | undefined)

type RouteDataFetcher<S, T> = (
  source: S,
  event: RouteDataEvent,
) => T | Promise<T>

type RouteDataOptions<T, S> = ResourceOptions<T> & {
  key?: RouteDataSource<S>
  reconcileOptions?: ReconcileOptions
```

---

### 6. [solidjs-community/solid-primitives](https://github.com/solidjs-community/solid-primitives) ⭐ 1.5k

**Path:** `packages/mutable/src/index.ts`
**Language:** typescript | **Lines:** 47
**Link:** https://github.com/solidjs-community/solid-primitives/blob/0cbdb59bb42f50de5e08000027789ae3d4c80280/packages/mutable/src/index.ts

```typescript
*/
  if (isServer) return state;

  // TODO: remove this later
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const unwrappedStore = solid_store.unwrap(state || {});

  if (isDev && typeof unwrappedStore !== "object" && typeof unwrappedStore !== "function")
    throw new Error(
      `Unexpected type ${typeof unwrappedStore} received when initializing 'createMutable'. Expected an object.`,
    );

  const wrappedStore = wrap(unwrappedStore);

  if (isDev) solid.DEV!.registerGraph({ value: unwrappedStore, name: options && options.name });

  return wrappedStore;
}

/**
 * Helper function that simplifies making multiple changes to a mutable Store in a single batch, so that dependant computations update just once instead of once per update.
 *
 * @param state The mutable Store to modify
 * @param modifier a Store modifier such as those returned by `reconcile` or `produce` (from `"solid-js/store"`). *(If you pass in your own modifier function, beware that its argument is an unwrapped version of the Store.)*
 *
 * @example
 * ```ts
 * const state = createMutable({
 *   user: {
 *     firstName: "John",
 *     lastName: "Smith",
 *   },
 * });
 *
 * // Replace state.user with the specified object (deleting any other fields)
 * modifyMutable(state.user, reconcile({
 *   firstName: "Jake",
 *   lastName: "Johnson",
 * });
 *
// ... truncated ...
```

---

### 7. [solidjs-community/solid-primitives](https://github.com/solidjs-community/solid-primitives) ⭐ 1.5k

**Path:** `packages/resource/src/index.ts`
**Language:** typescript | **Lines:** 33
**Link:** https://github.com/solidjs-community/solid-primitives/blob/0cbdb59bb42f50de5e08000027789ae3d4c80280/packages/resource/src/index.ts

```typescript
import {
  createMemo,
  createSignal,
  type Accessor,
  type ResourceFetcher,
  type ResourceFetcherInfo,
  type Signal,
  onCleanup,
} from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";

export type AbortableOptions = {
  noAutoAbort?: boolean;
  timeout?: number;
};

/**
 * **Creates and handles an AbortSignal**
 * ```ts
 * const [signal, abort, filterAbortError] =
 *   makeAbortable({ timeout: 10000 });
 * const fetcher = (url) => fetch(url, { signal: signal() })
 *   .catch(filterAbortError); // filters abort errors
 * ```
 * Returns an accessor for the signal and the abort callback.
 *
 * Options are optional and include:
 * - `timeout`: time in Milliseconds after which the fetcher aborts automatically
 * - `noAutoAbort`: can be set to true to make a new source not automatically abort a previous request
 */
export function makeAbortable(
  options: AbortableOptions = {},
): [
```

---

### 8. [solidjs-community/solid-primitives](https://github.com/solidjs-community/solid-primitives) ⭐ 1.5k

**Path:** `packages/db-store/src/index.ts`
**Language:** typescript | **Lines:** 34
**Link:** https://github.com/solidjs-community/solid-primitives/blob/0cbdb59bb42f50de5e08000027789ae3d4c80280/packages/db-store/src/index.ts

```typescript
import {
  createEffect,
  createResource,
  createSignal,
  createMemo,
  on,
  onCleanup,
  untrack,
  DEV,
} from "solid-js";
import { createStore, reconcile, type SetStoreFunction, type Store, unwrap } from "solid-js/store";
import { type RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";

export type DbRow = Record<string, any>;

export type DbAdapterUpdate<Row extends DbRow> = { old?: Partial<Row>; new?: Partial<Row> };

export type DbAdapterAction = "insert" | "update" | "delete";

export type DbAdapterFilter<Row extends DbRow> = (
  ev: { action: DbAdapterAction } & DbAdapterUpdate<Row>,
) => boolean;

export type DbAdapterOptions<Row extends DbRow, Extras extends Record<string, any> = {}> = {
  client: SupabaseClient;
  filter?: DbAdapterFilter<Row>;
  table: string;
} & Extras;

export type DbAdapter<Row extends DbRow> = {
  insertSignal: () => DbAdapterUpdate<Row> | undefined;
  updateSignal: () => DbAdapterUpdate<Row> | undefined;
  deleteSignal: () => DbAdapterUpdate<Row> | undefined;
  init: () => Promise<{ data?: Row[]; error?: unknown }>;
```

---

### 9. [solidjs-community/solid-primitives](https://github.com/solidjs-community/solid-primitives) ⭐ 1.5k

**Path:** `packages/deep/test/track.test.ts`
**Language:** typescript | **Lines:** 26
**Link:** https://github.com/solidjs-community/solid-primitives/blob/0cbdb59bb42f50de5e08000027789ae3d4c80280/packages/deep/test/track.test.ts

```typescript
import { describe, test, expect } from "vitest";
import { batch, createEffect, createRoot, createSignal } from "solid-js";
import { captureStoreUpdates, trackDeep, trackStore } from "../src/index.js";
import { createStore, reconcile, unwrap } from "solid-js/store";

const apis: {
  name: string;
  fn: (store: any) => () => void;
  pojo: boolean;
}[] = [
  {
    name: "trackDeep",
    fn: store => () => trackDeep(store),
    pojo: true,
  },
  {
    name: "trackStore",
    fn: store => () => trackStore(store),
    pojo: false,
  },
  {
    name: "captureUpdates",
    fn: captureStoreUpdates,
    pojo: false,
  },
];
```

---

### 10. [solidjs-community/solid-primitives](https://github.com/solidjs-community/solid-primitives) ⭐ 1.5k

**Path:** `packages/mutable/test/modifiers.test.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/solidjs-community/solid-primitives/blob/0cbdb59bb42f50de5e08000027789ae3d4c80280/packages/mutable/test/modifiers.test.ts

```typescript
import { describe, test, expect } from "vitest";
import { createMutable, modifyMutable } from "../src/index.js";
import { unwrap, reconcile } from "solid-js/store";

describe("modifyMutable with reconcile", () => {
  test("Reconcile a simple object", () => {
    const state = createMutable<{ data: number; missing?: string }>({
      data: 2,
      missing: "soon",
    });
    expect(state.data).toBe(2);
    expect(state.missing).toBe("soon");
    modifyMutable(state, reconcile({ data: 5 }));
    expect(state.data).toBe(5);
    expect(state.missing).toBeUndefined();
  });

  test("Reconcile a simple object on a nested path", () => {
    const state = createMutable<{
      data: { user: { firstName: string; middleName: string; lastName?: string } };
    }>({
      data: { user: { firstName: "John", middleName: "", lastName: "Snow" } },
    });
    expect(state.data.user.firstName).toBe("John");
    expect(state.data.user.lastName).toBe("Snow");
    modifyMutable(state.data.user, reconcile({ firstName: "Jake", middleName: "R" }));
    expect(state.data.user.firstName).toBe("Jake");
```

---

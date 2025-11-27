# GitHub Code Search Results

**Query:** `produce solid-js/store language:typescript`
**Found:** 100 results, showing top 10
**Execution:** 3.0s

---

### 1. [CapSoftware/Cap](https://github.com/CapSoftware/Cap) ⭐ 15.0k

**Path:** `apps/desktop/src/utils/createPresets.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/CapSoftware/Cap/blob/a292974ed15926ca32fc28622d39de347464c3f0/apps/desktop/src/utils/createPresets.ts

```typescript
import { produce, unwrap } from "solid-js/store";
import { presetsStore } from "~/store";
import type { PresetsStore, ProjectConfiguration } from "~/utils/tauri";

export type CreatePreset = {
	name: string;
	config: Omit<ProjectConfiguration, "timeline">;
	default: boolean;
};

export function createPresets() {
	const query = presetsStore.createQuery();

	async function updatePresets(fn: (prev: PresetsStore) => void) {
		if (query.isLoading) throw new Error("Presets not loaded");

		let p = query.data;
		if (!p) await presetsStore.set((p = { presets: [], default: null }));

		const newValue = produce(fn)(p);

		await presetsStore.set(newValue);
	}

	return {
		query,
		createPreset: async (preset: CreatePreset) => {
```

---

### 2. [urql-graphql/urql](https://github.com/urql-graphql/urql) ⭐ 8.9k

**Path:** `packages/solid-urql/src/createQuery.ts`
**Language:** typescript | **Lines:** 40
**Link:** https://github.com/urql-graphql/urql/blob/d845f88bd6b3529666776d315ebcd3d27f61ac23/packages/solid-urql/src/createQuery.ts

```typescript
import {
  type AnyVariables,
  type OperationContext,
  type DocumentInput,
  type OperationResult,
  type RequestPolicy,
  createRequest,
} from '@urql/core';
import {
  batch,
  createComputed,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
} from 'solid-js';
import { createStore, produce, reconcile } from 'solid-js/store';
import { useClient } from './context';
import { type MaybeAccessor, asAccessor } from './utils';
import type { Source, Subscription } from 'wonka';
import { onEnd, pipe, subscribe } from 'wonka';

/** Triggers {@link createQuery} to execute a new GraphQL query operation.
 *
 * @remarks
 * When called, {@link createQuery} will re-execute the GraphQL query operation
 * it currently holds, even if {@link CreateQueryArgs.pause} is set to `true`.
 *
 * This is useful for executing a paused query or re-executing a query
 * and get a new network result, by passing a new request policy.
 *
 * ```ts
 * const [result, reExecuteQuery] = createQuery({ query });
 *
 * const refresh = () => {
 *   // Re-execute the query with a network-only policy, skipping the cache
 *   reExecuteQuery({ requestPolicy: 'network-only' });
 * };
 * ```
 *
```

---

### 3. [unplugin/unplugin-auto-import](https://github.com/unplugin/unplugin-auto-import) ⭐ 3.7k

**Path:** `src/presets/solid.ts`
**Language:** typescript | **Lines:** 47
**Link:** https://github.com/unplugin/unplugin-auto-import/blob/f9e47fc926121f5bbabca6c72b4254b523fb7b0a/src/presets/solid.ts

```typescript
'mapArray',
    'indexArray',
    'createContext',
    'useContext',
    'children',
    'lazy',
    'createDeferred',
    'createRenderEffect',
    'createSelector',
    'For',
    'Show',
    'Switch',
    'Match',
    'Index',
    'ErrorBoundary',
    'Suspense',
    'SuspenseList',
  ],
})

export const solidStore = <ImportsMap>({
  'solid-js/store': [
    'createStore',
    'produce',
    'reconcile',
    'createMutable',
  ],
})

export const solidWeb = <ImportsMap>({
  'solid-js/web': [
    'Dynamic',
    'hydrate',
    'render',
    'renderToString',
    'renderToStringAsync',
    'renderToStream',
    'isServer',
    'Portal',
  ],
// ... truncated ...
```

---

### 4. [rcourtman/Pulse](https://github.com/rcourtman/Pulse) ⭐ 2.8k

**Path:** `frontend-modern/src/stores/websocket.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/rcourtman/Pulse/blob/7fd49fb54a3f37f71b99c3f6b7124f7516f47b8b/frontend-modern/src/stores/websocket.ts

```typescript
import { createSignal, onCleanup } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import type {
  State,
  WSMessage,
  Alert,
  ResolvedAlert,
  PVEBackups,
  VM,
  Container,
  DockerHost,
  Host,
} from '@/types/api';
import type { ActivationState as ActivationStateType } from '@/types/alerts';
import { logger } from '@/utils/logger';
import { POLLING_INTERVALS, WEBSOCKET } from '@/constants';
import { notificationStore } from './notifications';
import { eventBus } from './events';
import { ALERTS_ACTIVATION_EVENT, isAlertsActivationEnabled } from '@/utils/alertsActivation';
import { pruneMetricsByPrefix } from './metricsHistory';
import { getMetricKeyPrefix } from '@/utils/metricsKeys';

// Type-safe WebSocket store
export function createWebSocketStore(url: string) {
  const [connected, setConnected] = createSignal(false);
  const [reconnecting, setReconnecting] = createSignal(false);
  const [initialDataReceived, setInitialDataReceived] = createSignal(false);
```

---

### 5. [rocicorp/mono](https://github.com/rocicorp/mono) ⭐ 2.5k

**Path:** `packages/zero-solid/src/solid-view.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/rocicorp/mono/blob/9630b380339b047910038f9a44a5d5904ca5c92c/packages/zero-solid/src/solid-view.ts

```typescript
import {produce, reconcile, type SetStoreFunction} from 'solid-js/store';
import {
  applyChange,
  type AnyViewFactory,
  type Change,
  type Entry,
  type Format,
  type Input,
  type Node,
  type Output,
  type Query,
  type Schema,
  type Stream,
  type TTL,
  type ViewChange,
} from '../../zero-client/src/mod.js';
import type {
  QueryErrorDetails,
  QueryResultDetails,
} from '../../zero-client/src/types/query-result.ts';
import type {ErroredQuery} from '../../zero-protocol/src/custom-queries.ts';
import {idSymbol} from '../../zql/src/ivm/view-apply-change.ts';

export type State = [Entry, QueryResultDetails];

export const COMPLETE: QueryResultDetails = Object.freeze({type: 'complete'});
export const UNKNOWN: QueryResultDetails = Object.freeze({type: 'unknown'});
```

---

### 6. [malloydata/malloy](https://github.com/malloydata/malloy) ⭐ 2.3k

**Path:** `packages/malloy-render/src/component/result-store/result-store.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/malloydata/malloy/blob/f5685625d9f25a4d41a2eed7478dde6d84405049/packages/malloy-render/src/component/result-store/result-store.ts

```typescript
import {createStore, produce, unwrap} from 'solid-js/store';
import type {DrillData} from '../types';
import type {Cell} from '../../data_tree';
import type {RenderMetadata} from '../render-result-metadata';

interface BrushDataBase {
  fieldRefId: string;
  sourceId: string;
}

interface BrushDataDimension extends BrushDataBase {
  type: 'dimension';
  value: (string | number | boolean | Date)[];
}

interface BrushDataMeasure extends BrushDataBase {
  type: 'measure';
  value: number[];
}

export interface ModifyBrushOp {
  type: 'add' | 'remove';
  sourceId: string;
  value?: BrushData;
}

interface BrushDataMeasureRange extends BrushDataBase {
```

---

### 7. [morethanwords/tweb](https://github.com/morethanwords/tweb) ⭐ 2.3k

**Path:** `src/components/mediaEditor/context.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/morethanwords/tweb/blob/2071f286df0737b223da54001a501dd904c47117/src/components/mediaEditor/context.ts

```typescript
import {Accessor, createContext, createEffect, createSignal, on, useContext, createMemo} from 'solid-js';
import {createMutable, modifyMutable, produce, Store} from 'solid-js/store';

import exceptKeys from '../../helpers/object/exceptKeys';
import throttle from '../../helpers/schedulers/throttle';
import type {AppManagers} from '../../lib/appManagers/managers';
import type {ObjectPath} from '../../types';

import {AdjustmentKey, adjustmentsConfig} from './adjustments';
import {BrushDrawnLine} from './canvas/brushPainter';
import {FinalTransform} from './canvas/useFinalTransform';
import type {MediaEditorProps} from './mediaEditor';
import {MediaType, NumberPair, ResizableLayer, StickerRenderingInfo, TextLayerInfo} from './types';
import {approximateDeepEqual, snapToAvailableQuality, traverseObjectDeep} from './utils';
import {RenderingPayload} from './webgl/initWebGL';


type EditingMediaStateWithoutHistory = {
  scale: number;
  rotation: number;
  translation: NumberPair;
  flip: NumberPair;
  currentImageRatio: number;

  currentVideoTime: number;
  videoCropStart: number;
  videoCropLength: number;
```

---

### 8. [MetaCubeX/metacubexd](https://github.com/MetaCubeX/metacubexd) ⭐ 2.7k

**Path:** `auto-imports.d.ts`
**Language:** typescript | **Lines:** 47
**Link:** https://github.com/MetaCubeX/metacubexd/blob/ea0a8dcb7975b1af899921c50fc4d062b6d93063/auto-imports.d.ts

```typescript
const getOwner: (typeof import('solid-js'))['getOwner']
  const getRequestEvent: (typeof import('solid-js/web'))['getRequestEvent']
  const hashIntegration: (typeof import('@solidjs/router'))['hashIntegration']
  const hydrate: typeof import('solid-js/web')['hydrate']
  const indexArray: typeof import('solid-js')['indexArray']
  const insert: (typeof import('solid-js/web'))['insert']
  const isDev: (typeof import('solid-js/web'))['isDev']
  const isServer: typeof import('solid-js/web')['isServer']
  const json: typeof import('@solidjs/router')['json']
  const keepDepth: typeof import('@solidjs/router')['keepDepth']
  const lazy: typeof import('solid-js')['lazy']
  const mapArray: typeof import('solid-js')['mapArray']
  const mergeProps: typeof import('solid-js')['mergeProps']
  const normalizeIntegration: (typeof import('@solidjs/router'))['normalizeIntegration']
  const notifyIfNotBlocked: typeof import('@solidjs/router')['notifyIfNotBlocked']
  const observable: typeof import('solid-js')['observable']
  const on: typeof import('solid-js')['on']
  const onCleanup: typeof import('solid-js')['onCleanup']
  const onError: typeof import('solid-js')['onError']
  const onMount: typeof import('solid-js')['onMount']
  const pathIntegration: (typeof import('@solidjs/router'))['pathIntegration']
  const pipeToNodeWritable: (typeof import('solid-js/web'))['pipeToNodeWritable']
  const pipeToWritable: (typeof import('solid-js/web'))['pipeToWritable']
  const produce: typeof import('solid-js/store')['produce']
  const query: typeof import('@solidjs/router')['query']
  const reconcile: typeof import('solid-js/store')['reconcile']
  const redirect: typeof import('@solidjs/router')['redirect']
  const reload: typeof import('@solidjs/router')['reload']
  const render: typeof import('solid-js/web')['render']
  const renderToStream: typeof import('solid-js/web')['renderToStream']
  const renderToString: typeof import('solid-js/web')['renderToString']
  const renderToStringAsync: typeof import('solid-js/web')['renderToStringAsync']
  const requestCallback: (typeof import('solid-js'))['requestCallback']
  const resetErrorBoundaries: (typeof import('solid-js'))['resetErrorBoundaries']
  const resolveSSRNode: (typeof import('solid-js/web'))['resolveSSRNode']
  const revalidate: typeof import('@solidjs/router')['revalidate']
  const runWithOwner: (typeof import('solid-js'))['runWithOwner']
  const saveCurrentDepth: typeof import('@solidjs/router')['saveCurrentDepth']
  const sharedConfig: (typeof import('solid-js'))['sharedConfig']
  const splitProps: typeof import('solid-js')['splitProps']
// ... truncated ...
```

---

### 9. [damianricobelli/stepperize](https://github.com/damianricobelli/stepperize) ⭐ 1.5k

**Path:** `packages/solid/src/define-stepper.ts`
**Language:** typescript | **Lines:** 33
**Link:** https://github.com/damianricobelli/stepperize/blob/d29460f154040e4d35abe1b8baec12b65c2547f6/packages/solid/src/define-stepper.ts

```typescript
import type { Get, Metadata, Step, Stepper } from "@stepperize/core";
import {
	executeTransition,
	generateCommonStepperUseFns,
	generateStepperUtils,
	getInitialMetadata,
	getInitialStepIndex,
	updateStepIndex,
} from "@stepperize/core";
import { createMemo } from "solid-js";
import { createStore, produce } from "solid-js/store";
import type { StepperReturn } from "./types";

/**
 * Creates a stepper context and utility functions for managing stepper state.
 *
 * @param steps - The steps to be included in the stepper.
 * @returns An object containing the stepper context and utility functions.
 */
export const defineStepper = <const Steps extends Step[]>(...steps: Steps): StepperReturn<Steps> => {
	const utils = generateStepperUtils(...steps);

	const [state, setState] = createStore({
		stepIndex: 0,
		metadata: getInitialMetadata(steps, undefined),
	});

	const useStepper = (config?: {
		initialStep?: Get.Id<Steps>;
		initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
	}) => {
		const { initialStep, initialMetadata } = config ?? {};
		const initialStepIndex = getInitialStepIndex(steps, initialStep);
```

---

### 10. [solidjs-community/solid-primitives](https://github.com/solidjs-community/solid-primitives) ⭐ 1.5k

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

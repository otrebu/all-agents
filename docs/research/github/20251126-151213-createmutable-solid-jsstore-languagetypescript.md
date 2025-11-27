# GitHub Code Search Results

**Query:** `createMutable solid-js/store language:typescript`
**Found:** 100 results, showing top 10
**Execution:** 3.3s

---

### 1. [spacedriveapp/spacedrive](https://github.com/spacedriveapp/spacedrive) ⭐ 35.7k

**Path:** `apps/mobile/src/stores/auth.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/spacedriveapp/spacedrive/blob/85bebf4d128c78bb96906d3038b70e83033f50fe/apps/mobile/src/stores/auth.ts

```typescript
import { RSPCError } from '@spacedrive/rspc-client';
import { Linking } from 'react-native';
import { createMutable } from 'solid-js/store';
import { nonLibraryClient, useSolidStore } from '@sd/client';

interface Store {
	state: { status: 'loading' | 'notLoggedIn' | 'loggingIn' | 'loggedIn' | 'loggingOut' };
}

// inner object so we can overwrite it in one assignment
const store = createMutable<Store>({
	state: {
		status: 'loading'
	}
});

export function useAuthStateSnapshot() {
	return useSolidStore(store).state;
}

// nonLibraryClient
// 	.query(['auth.me'])
// 	.then(() => (store.state = { status: 'loggedIn' }))
// 	.catch((e) => {
// 		if (e instanceof RSPCError && e.code === 401) {
// 			// TODO: handle error?
// 			console.error('error', e);
```

---

### 2. [spacedriveapp/spacedrive](https://github.com/spacedriveapp/spacedrive) ⭐ 35.7k

**Path:** `packages/client/src/stores/onboardingStore.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/spacedriveapp/spacedrive/blob/85bebf4d128c78bb96906d3038b70e83033f50fe/packages/client/src/stores/onboardingStore.ts

```typescript
import { createMutable } from 'solid-js/store';

import { createPersistedMutable, useSolidStore } from '../solid';

export enum UseCase {
	CameraRoll = 'cameraRoll',
	MediaConsumption = 'mediaConsumption',
	MediaCreation = 'mediaCreation',
	CloudBackup = 'cloudBackup',
	Other = 'other'
}

const onboardingStoreDefaults = () => ({
	unlockedScreens: ['prerelease'],
	lastActiveScreen: null as string | null,
	useCases: [] as UseCase[],
	grantedFullDiskAccess: false,
	data: {} as Record<string, any> | undefined,
	showIntro: true
});

export const onboardingStore = createPersistedMutable(
	'onboarding',
	createMutable(onboardingStoreDefaults())
);

export function useOnboardingStore() {
```

---

### 3. [spacedriveapp/spacedrive](https://github.com/spacedriveapp/spacedrive) ⭐ 35.7k

**Path:** `packages/client/src/stores/debugState.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/spacedriveapp/spacedrive/blob/85bebf4d128c78bb96906d3038b70e83033f50fe/packages/client/src/stores/debugState.ts

```typescript
import { useEffect, useState } from 'react';
import { createMutable } from 'solid-js/store';

import { createPersistedMutable, useSolidStore } from '../solid';

export interface DebugState {
	enabled: boolean;
	rspcLogger: boolean;
	reactQueryDevtools: boolean;
	shareFullTelemetry: boolean; // used for sending telemetry even if the app is in debug mode
	telemetryLogging: boolean;
}

export const debugState = createPersistedMutable(
	'sd-debugState',
	createMutable<DebugState>({
		enabled: globalThis.isDev,
		rspcLogger: false,
		reactQueryDevtools: false,
		shareFullTelemetry: false,
		telemetryLogging: false
	})
);

export function useDebugState() {
	return useSolidStore(debugState);
}
```

---

### 4. [spacedriveapp/spacedrive](https://github.com/spacedriveapp/spacedrive) ⭐ 35.7k

**Path:** `packages/client/src/solid/createPersistedMutable.ts`
**Language:** typescript | **Lines:** 43
**Link:** https://github.com/spacedriveapp/spacedrive/blob/85bebf4d128c78bb96906d3038b70e83033f50fe/packages/client/src/solid/createPersistedMutable.ts

```typescript
import { trackDeep } from '@solid-primitives/deep';
import { createEffect, createRoot } from 'solid-js';
import { type StoreNode } from 'solid-js/store';

type CreatePersistedMutableOpts<T> = {
	onSave?: (value: T) => T;
	/**
	 * This function is always called after the data object's retrieval from localStorage and it getting assigned to the store.
	 *
	 * Originally intended for mutations, but can be used for other things if you have a reason to transform the data.
	 *
	 *
	 * @note This is **not** called on initial load from default values.
	 * @param value The existing data object from localStorage (or null if doesn't exist)
	 * @returns The new data object
	 */
	onLoad?: (value: T | null) => T;
};

// `@solid-primitives/storage`'s `makePersisted` doesn't support `solid-js/store`'s `createMutable` so we roll our own.
export function createPersistedMutable<T extends StoreNode>(
	key: string,
	mutable: T,
	opts?: CreatePersistedMutableOpts<T>
) {
	parsePersistedValue: try {
		const value = localStorage.getItem(key);

		if (value === null) {
			Object.assign(mutable, opts?.onLoad?.(value) ?? {});
			break parsePersistedValue;
		}

		const persisted = JSON.parse(value);
		Object.assign(
			mutable,
			// if we have a function to use to transform data on load, use its return value
			opts?.onLoad?.(persisted) ??
				// otherwise just use the data from localStorage as is
				persisted
// ... truncated ...
```

---

### 5. [spacedriveapp/spacedrive](https://github.com/spacedriveapp/spacedrive) ⭐ 35.7k

**Path:** `packages/client/src/stores/libraryStore.ts`
**Language:** typescript | **Lines:** 11
**Link:** https://github.com/spacedriveapp/spacedrive/blob/85bebf4d128c78bb96906d3038b70e83033f50fe/packages/client/src/stores/libraryStore.ts

```typescript
import { createMutable } from 'solid-js/store';

import { useSolidStore } from '../solid';

export const libraryStore = createMutable({
	onlineLocations: [] as number[][]
});

export function useLibraryStore() {
	return useSolidStore(libraryStore);
}
```

---

### 6. [spacedriveapp/spacedrive](https://github.com/spacedriveapp/spacedrive) ⭐ 35.7k

**Path:** `packages/client/src/stores/themeStore.ts`
**Language:** typescript | **Lines:** 26
**Link:** https://github.com/spacedriveapp/spacedrive/blob/85bebf4d128c78bb96906d3038b70e83033f50fe/packages/client/src/stores/themeStore.ts

```typescript
import { deepEqual } from 'fast-equals';
import { useRef } from 'react';
import { createMutable } from 'solid-js/store';

import { createPersistedMutable, useObserver, useSolidStore } from '../solid';

export type Themes = 'vanilla' | 'dark';

export const themeStore = createPersistedMutable(
	'sd-theme',
	createMutable({
		theme: 'dark' as Themes,
		syncThemeWithSystem: false,
		hueValue: 235
	})
);

export function useThemeStore() {
	return useSolidStore(themeStore);
}

export function useSubscribeToThemeStore(callback: () => void) {
	const ref = useRef<typeof themeStore>(themeStore);
	useObserver(() => {
		// Subscribe to store
		const store = { ...themeStore };
```

---

### 7. [spacedriveapp/spacedrive](https://github.com/spacedriveapp/spacedrive) ⭐ 35.7k

**Path:** `packages/client/src/stores/explorerLayout.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/spacedriveapp/spacedrive/blob/85bebf4d128c78bb96906d3038b70e83033f50fe/packages/client/src/stores/explorerLayout.ts

```typescript
import { createMutable } from 'solid-js/store';

import { ExplorerLayout } from '../core';
import { createPersistedMutable, useSolidStore } from '../solid';
import { isTelemetryStateV0 } from './telemetryState';

interface ExplorerLayoutStore {
	showPathBar: boolean;
	showTags: boolean;
	showImageSlider: boolean;
	defaultView: ExplorerLayout;
}

export const explorerLayout = createPersistedMutable<ExplorerLayoutStore>(
	'sd-explorer-layout',
	createMutable<ExplorerLayoutStore>({
		showPathBar: true,
		showTags: true,
		showImageSlider: true,
		// might move this to a store called settings
		defaultView: 'grid' as ExplorerLayout
	}),
	{
		onLoad(value: unknown): ExplorerLayoutStore {
			// we had a bug previously where we saved the telemetry state in the wrong key
			// and we need to erase it from the layout store
			if (isTelemetryStateV0(value)) {
```

---

### 8. [unplugin/unplugin-auto-import](https://github.com/unplugin/unplugin-auto-import) ⭐ 3.7k

**Path:** `src/presets/solid.ts`
**Language:** typescript | **Lines:** 89
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

### 9. [MetaCubeX/metacubexd](https://github.com/MetaCubeX/metacubexd) ⭐ 2.7k

**Path:** `auto-imports.d.ts`
**Language:** typescript | **Lines:** 47
**Link:** https://github.com/MetaCubeX/metacubexd/blob/ea0a8dcb7975b1af899921c50fc4d062b6d93063/auto-imports.d.ts

```typescript
const Show: typeof import('solid-js')['Show']
  const StaticRouter: typeof import('@solidjs/router')['StaticRouter']
  const Suspense: typeof import('solid-js')['Suspense']
  const SuspenseList: typeof import('solid-js')['SuspenseList']
  const Switch: typeof import('solid-js')['Switch']
  const _mergeSearchString: typeof import('@solidjs/router')['_mergeSearchString']
  const action: typeof import('@solidjs/router')['action']
  const addEventListener: (typeof import('solid-js/web'))['addEventListener']
  const batch: typeof import('solid-js')['batch']
  const cache: typeof import('@solidjs/router')['cache']
  const catchError: (typeof import('solid-js'))['catchError']
  const children: typeof import('solid-js')['children']
  const createAsync: typeof import('@solidjs/router')['createAsync']
  const createAsyncStore: typeof import('@solidjs/router')['createAsyncStore']
  const createBeforeLeave: typeof import('@solidjs/router')['createBeforeLeave']
  const createComponent: (typeof import('solid-js'))['createComponent']
  const createComputed: (typeof import('solid-js'))['createComputed']
  const createContext: typeof import('solid-js')['createContext']
  const createDeferred: typeof import('solid-js')['createDeferred']
  const createEffect: typeof import('solid-js')['createEffect']
  const createIntegration: (typeof import('@solidjs/router'))['createIntegration']
  const createMemo: typeof import('solid-js')['createMemo']
  const createMemoryHistory: typeof import('@solidjs/router')['createMemoryHistory']
  const createMutable: typeof import('solid-js/store')['createMutable']
  const createReaction: (typeof import('solid-js'))['createReaction']
  const createRenderEffect: typeof import('solid-js')['createRenderEffect']
  const createResource: typeof import('solid-js')['createResource']
  const createRoot: typeof import('solid-js')['createRoot']
  const createRouter: typeof import('@solidjs/router')['createRouter']
  const createSelector: typeof import('solid-js')['createSelector']
  const createSignal: typeof import('solid-js')['createSignal']
  const createStore: typeof import('solid-js/store')['createStore']
  const createUniqueId: (typeof import('solid-js'))['createUniqueId']
  const delegateEvents: (typeof import('solid-js/web'))['delegateEvents']
  const enableExternalSource: (typeof import('solid-js'))['enableExternalSource']
  const enableHydration: (typeof import('solid-js'))['enableHydration']
  const enableScheduling: (typeof import('solid-js'))['enableScheduling']
  const equalFn: (typeof import('solid-js'))['equalFn']
  const escape: (typeof import('solid-js/web'))['escape']
  const from: (typeof import('solid-js'))['from']
// ... truncated ...
```

---

### 10. [solidjs-community/solid-primitives](https://github.com/solidjs-community/solid-primitives) ⭐ 1.5k

**Path:** `packages/mutable/src/index.ts`
**Language:** typescript | **Lines:** 47
**Link:** https://github.com/solidjs-community/solid-primitives/blob/0cbdb59bb42f50de5e08000027789ae3d4c80280/packages/mutable/src/index.ts

```typescript
/**
 * Creates a new mutable Store proxy object. Stores only trigger updates on values changing
 * Tracking is done by intercepting property access and automatically tracks deep nesting via proxy.
 *
 * Useful for integrating external systems or as a compatibility layer with MobX/Vue.
 *
 * @param state original object to be wrapped in a proxy (the object is not cloned)
 * @param options Name of the store (used for debugging)
 * @returns mutable proxy of the {@link state} object
 *
 * @example
 * ```ts
 * const state = createMutable(initialValue);
 *
 * // read value
 * state.someValue;
 *
 * // set value
 * state.someValue = 5;
 *
 * state.list.push(anotherValue);
 * ```
 */
export function createMutable<T extends solid_store.StoreNode>(
  state: T,
  options?: MutableOptions,
): T {
  /*
    TODO: improve server noop
    https://github.com/solidjs/solid/issues/1733
  */
  if (isServer) return state;

  // TODO: remove this later
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const unwrappedStore = solid_store.unwrap(state || {});

  if (isDev && typeof unwrappedStore !== "object" && typeof unwrappedStore !== "function")
    throw new Error(
      `Unexpected type ${typeof unwrappedStore} received when initializing 'createMutable'. Expected an object.`,
// ... truncated ...
```

---

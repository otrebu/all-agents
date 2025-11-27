# GitHub Code Search Results

**Query:** `createStore SolidJS language:typescript`
**Found:** 100 results, showing top 9
**Execution:** 3.2s

---

### 1. [TanStack/query](https://github.com/TanStack/query) ⭐ 47.5k

**Path:** `packages/solid-query/src/useQueries.ts`
**Language:** typescript | **Lines:** 69
**Link:** https://github.com/TanStack/query/blob/8b387341eb8e5ce6447b55023c724c76747d4f00/packages/solid-query/src/useQueries.ts

```typescript
import { QueriesObserver, noop } from '@tanstack/query-core'
import { createStore, unwrap } from 'solid-js/store'
import {
  batch,
  createComputed,
  createMemo,
  createRenderEffect,
  createResource,
  mergeProps,
  on,
  onCleanup,
  onMount,
} from 'solid-js'
import { useQueryClient } from './QueryClientProvider'
import { useIsRestoring } from './isRestoring'
import type { SolidQueryOptions, UseQueryResult } from './types'
import type { Accessor } from 'solid-js'
import type { QueryClient } from './QueryClient'
import type {
  DefaultError,
  OmitKeyof,
  QueriesObserverOptions,
  QueriesPlaceholderDataFunction,

---

QueryFunction,
  QueryKey,
  QueryObserverOptions,
  QueryObserverResult,
  ThrowOnError,
} from '@tanstack/query-core'

// This defines the `UseQueryOptions` that are accepted in `QueriesOptions` & `GetOptions`.
// `placeholderData` function does not have a parameter
type UseQueryOptionsForUseQueries<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
// ... truncated ...
```

---

### 2. [TanStack/query](https://github.com/TanStack/query) ⭐ 47.5k

**Path:** `packages/solid-query/src/useBaseQuery.ts`
**Language:** typescript | **Lines:** 89
**Link:** https://github.com/TanStack/query/blob/8b387341eb8e5ce6447b55023c724c76747d4f00/packages/solid-query/src/useBaseQuery.ts

```typescript
defaultOptions._optimisticResults = isRestoring()
      ? 'isRestoring'
      : 'optimistic'
    defaultOptions.structuralSharing = false
    if (isServer) {
      defaultOptions.retry = false
      defaultOptions.throwOnError = true
      // Enable prefetch during render for SSR - required for createResource to work
      // Without this, queries wait for effects which never run on the server
      defaultOptions.experimental_prefetchInRender = true
    }
    return defaultOptions
  })
  const initialOptions = defaultedOptions()

  const [observer, setObserver] = createSignal(
    new Observer(client(), defaultedOptions()),
  )

  let observerResult = observer().getOptimisticResult(defaultedOptions())
  const [state, setState] =
    createStore<QueryObserverResult<TData, TError>>(observerResult)

  const createServerSubscriber = (
    resolve: (
      data: ResourceData | PromiseLike<ResourceData | undefined> | undefined,
    ) => void,
    reject: (reason?: any) => void,
  ) => {
    return observer().subscribe((result) => {
      notifyManager.batchCalls(() => {
        const query = observer().getCurrentQuery()
        const unwrappedResult = hydratableObserverResult(query, result)

        if (result.data !== undefined && unwrappedResult.isError) {
          reject(unwrappedResult.error)
          unsubscribeIfQueued()
        } else {
          resolve(unwrappedResult)
          unsubscribeIfQueued()
// ... truncated ...
```

---

### 3. [solidjs/solid](https://github.com/solidjs/solid) ⭐ 34.6k

**Path:** `packages/solid/store/src/store.ts`
**Language:** typescript | **Lines:** 46
**Link:** https://github.com/solidjs/solid/blob/a5b51fe200fd59a158410f4008677948fec611d9/packages/solid/store/src/store.ts

```typescript
K2 extends KeyOf<W<W<T>[K1]>>,
    K3 extends KeyOf<W<W<W<T>[K1]>[K2]>>,
    K4 extends KeyOf<W<W<W<W<T>[K1]>[K2]>[K3]>>,
    K5 extends KeyOf<W<W<W<W<W<T>[K1]>[K2]>[K3]>[K4]>>,
    K6 extends KeyOf<W<W<W<W<W<W<T>[K1]>[K2]>[K3]>[K4]>[K5]>>,
    K7 extends KeyOf<W<W<W<W<W<W<W<T>[K1]>[K2]>[K3]>[K4]>[K5]>[K6]>>
  >(
    k1: Part<W<T>, K1>,
    k2: Part<W<W<T>[K1]>, K2>,
    k3: Part<W<W<W<T>[K1]>[K2]>, K3>,
    k4: Part<W<W<W<W<T>[K1]>[K2]>[K3]>, K4>,
    k5: Part<W<W<W<W<W<T>[K1]>[K2]>[K3]>[K4]>, K5>,
    k6: Part<W<W<W<W<W<W<T>[K1]>[K2]>[K3]>[K4]>[K5]>, K6>,
    k7: Part<W<W<W<W<W<W<W<T>[K1]>[K2]>[K3]>[K4]>[K5]>[K6]>, K7>,
    ...rest: Rest<W<W<W<W<W<W<W<T>[K1]>[K2]>[K3]>[K4]>[K5]>[K6]>[K7], [K7, K6, K5, K4, K3, K2, K1]>
  ): void;
}

/**
 * Creates a reactive store that can be read through a proxy object and written with a setter function
 *
 * @description https://docs.solidjs.com/reference/store-utilities/create-store
 */
export function createStore<T extends object = {}>(
  ...[store, options]: {} extends T
    ? [store?: T | Store<T>, options?: { name?: string }]
    : [store: T | Store<T>, options?: { name?: string }]
): [get: Store<T>, set: SetStoreFunction<T>] {
  const unwrappedStore = unwrap((store || {}) as T);
  const isArray = Array.isArray(unwrappedStore);
  if (IS_DEV && typeof unwrappedStore !== "object" && typeof unwrappedStore !== "function")
    throw new Error(
      `Unexpected type ${typeof unwrappedStore} received when initializing 'createStore'. Expected an object.`
    );
  const wrappedStore = wrap(unwrappedStore);
  if (IS_DEV) DEV!.registerGraph({ value: unwrappedStore, name: options && options.name });
  function setStore(...args: any[]): void {
    batch(() => {
      isArray && args.length === 1
        ? updateArray(unwrappedStore, args[0])
// ... truncated ...
```

---

### 4. [BuilderIO/mitosis](https://github.com/BuilderIO/mitosis) ⭐ 13.5k

**Path:** `packages/core/src/generators/solid/state/state.ts`
**Language:** typescript | **Lines:** 36
**Link:** https://github.com/BuilderIO/mitosis/blob/993fd9e53243ed9de5ccb19ba2d4653efbd1d9d2/packages/core/src/generators/solid/state/state.ts

```typescript
store: MitosisState;
    },
  );

  const hasMutableState = Object.keys(mutable).length > 0;
  const hasSignalState = Object.keys(signal).length > 0;
  const hasStoreState = Object.keys(store).length > 0;

  const mutableStateStr = hasMutableState
    ? pipe(mutable, getMemberObjectString, (str) => `const state = createMutable(${str});`)
    : '';
  const signalStateStr = hasSignalState ? getSignalsCode({ json, options, state: signal }) : '';
  const storeStateStr = hasStoreState ? getStoreCode({ json, options, state: store }) : '';

  const stateStr = `
  ${mutableStateStr}
  ${signalStateStr}
  ${storeStateStr}
  `;

  const importObj: State['import'] = {
    store: [
      ...(hasMutableState ? ['createMutable'] : []),
      ...(hasStoreState ? ['createStore', 'reconcile'] : []),
    ],
    solidjs: [
      ...(hasSignalState ? ['createSignal', 'createMemo'] : []),
      ...(hasStoreState ? ['createEffect', 'on'] : []),
    ],
  };

  return {
    str: stateStr,
    import: importObj,
  };
};
```

---

### 5. [solidjs/solid-start](https://github.com/solidjs/solid-start) ⭐ 5.7k

**Path:** `packages/start/src/client/mount.ts`
**Language:** typescript | **Lines:** 60
**Link:** https://github.com/solidjs/solid-start/blob/d88785560496a011c63b504ec47c1e75fe00ff28/packages/start/src/client/mount.ts

```typescript
import type { JSX } from "solid-js";
import { createStore } from "solid-js/store";
import {
  createComponent,
  getHydrationKey,
  getOwner,
  hydrate,
  type MountableElement
} from "solid-js/web";

/**
 *
 * Read more: https://docs.solidjs.com/solid-start/reference/client/mount
 */
export function mount(fn: () => JSX.Element, el: MountableElement) {
  if (import.meta.env.START_ISLANDS) {
    const map = new WeakMap();
    async function mountIsland(el: HTMLElement) {
      if (el.dataset.css) {
        let css = JSON.parse(el.dataset.css);
        for (let href of css) {
          if (!document.querySelector(`link[href="${href}"]`)) {
            let link = document.createElement("link");

---

import type { JSX } from "solid-js";
import { createStore } from "solid-js/store";
import {
  createComponent,
  getHydrationKey,
  getOwner,
  hydrate,
  type MountableElement
} from "solid-js/web";

/**
 *
 * Read more: https://docs.solidjs.com/solid-start/reference/client/mount
 */
// ... truncated ...
```

---

### 6. [devflowinc/trieve](https://github.com/devflowinc/trieve) ⭐ 2.6k

**Path:** `frontends/search/src/hooks/useSearch.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/devflowinc/trieve/blob/b496426e4238a57f238b67938d85ed34c603705e/frontends/search/src/hooks/useSearch.ts

```typescript
import { Params, useSearchParams } from "@solidjs/router";
import { createEffect, on } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import { Filters } from "../components/FilterModal";

export interface SortByField {
  field: string;
}

export interface SortBySearchType {
  rerank_type: string;
  rerank_query: string;
}

export interface MultiQuery {
  query: string;
  weight: number;
}

export interface FulltextBoost {
  phrase?: string;
  boost_factor?: number;
}

export interface SemanticBoost {
  phrase?: string;
  distance_factor?: number;
```

---

### 7. [morethanwords/tweb](https://github.com/morethanwords/tweb) ⭐ 2.3k

**Path:** `src/components/popups/newMedia.ts`
**Language:** typescript | **Lines:** 74
**Link:** https://github.com/morethanwords/tweb/blob/2071f286df0737b223da54001a501dd904c47117/src/components/popups/newMedia.ts

```typescript
/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import {render} from 'solid-js/web';
import {createStore} from 'solid-js/store';

import type Chat from '../chat/chat';
import type {SendFileDetails} from '../../lib/appManagers/appMessagesManager';
import type {ChatRights} from '../../lib/appManagers/appChatsManager';
import PopupElement from '.';
import Scrollable from '../scrollable';
import {toast, toastNew} from '../toast';
import SendContextMenu from '../chat/sendContextMenu';
import {createPosterFromMedia, createPosterFromVideo} from '../../helpers/createPoster';
import {MyDocument} from '../../lib/appManagers/appDocsManager';
import I18n, {FormatterArguments, i18n, LangPackKey} from '../../lib/langPack';
import calcImageInBox from '../../helpers/calcImageInBox';
import placeCaretAtEnd from '../../helpers/dom/placeCaretAtEnd';
import {attachClickEvent} from '../../helpers/dom/clickEvent';
import MEDIA_MIME_TYPES_SUPPORTED from '../../environment/mediaMimeTypesSupport';
import getGifDuration from '../../helpers/getGifDuration';
import replaceContent from '../../helpers/dom/replaceContent';
import createVideo from '../../helpers/dom/createVideo';
import prepareAlbum from '../prepareAlbum';
import {makeMediaSize} from '../../helpers/mediaSize';
import {ThumbCache} from '../../lib/storages/thumbs';

---

import InputFieldAnimated from '../inputFieldAnimated';
import IMAGE_MIME_TYPES_SUPPORTED from '../../environment/imageMimeTypesSupport';
import VIDEO_MIME_TYPES_SUPPORTED from '../../environment/videoMimeTypesSupport';
import rootScope from '../../lib/rootScope';
import shake from '../../helpers/dom/shake';
import AUDIO_MIME_TYPES_SUPPORTED from '../../environment/audioMimeTypeSupport';
import liteMode from '../../helpers/liteMode';
import handleVideoLeak from '../../helpers/dom/handleVideoLeak';
// ... truncated ...
```

---

### 8. [morethanwords/tweb](https://github.com/morethanwords/tweb) ⭐ 2.3k

**Path:** `src/components/sidebarRight/tabs/groupPermissions/index.ts`
**Language:** typescript | **Lines:** 46
**Link:** https://github.com/morethanwords/tweb/blob/2071f286df0737b223da54001a501dd904c47117/src/components/sidebarRight/tabs/groupPermissions/index.ts

```typescript
import ScrollableLoader from '../../../../helpers/scrollableLoader';
import {ChannelParticipant, Chat, ChatAdminRights, ChatBannedRights} from '../../../../layer';
import appDialogsManager, {DialogDom, DIALOG_LIST_ELEMENT_TAG} from '../../../../lib/appManagers/appDialogsManager';
import {AppManagers} from '../../../../lib/appManagers/managers';
import combineParticipantBannedRights from '../../../../lib/appManagers/utils/chats/combineParticipantBannedRights';
import hasRights from '../../../../lib/appManagers/utils/chats/hasRights';
import getPeerActiveUsernames from '../../../../lib/appManagers/utils/peers/getPeerActiveUsernames';
import getPeerId from '../../../../lib/appManagers/utils/peers/getPeerId';
import {i18n, join, LangPackKey} from '../../../../lib/langPack';
import rootScope from '../../../../lib/rootScope';
import PopupPickUser from '../../../popups/pickUser';
import Row from '../../../row';
import SettingSection from '../../../settingSection';
import {SliderSuperTabEventable} from '../../../sliderTab';
import {toast} from '../../../toast';
import AppUserPermissionsTab from '../userPermissions';
import CheckboxFields, {CheckboxFieldsField} from '../../../checkboxFields';
import PopupElement from '../../../popups';
import wrapPeerTitle from '../../../wrappers/peerTitle';
import apiManagerProxy from '../../../../lib/mtproto/mtprotoworker';
import RangeStepsSelector from '../../../rangeStepsSelector';
import formatDuration from '../../../../helpers/formatDuration';
import {wrapFormattedDuration} from '../../../wrappers/wrapDuration';
import SolidJSHotReloadGuardProvider from '../../../../lib/solidjs/hotReloadGuardProvider';
import {createEffect, createRoot, createSignal} from 'solid-js';
import {createStore, unwrap} from 'solid-js/store';
import deepEqual from '../../../../helpers/object/deepEqual';
import ButtonIcon from '../../../buttonIcon';
import throttle from '../../../../helpers/schedulers/throttle';
import {NoneToVoidFunction} from '../../../../types';
import {PopupPeerOptions} from '../../../popups/peer';
import confirmationPopup, {ConfirmationPopupRejectReason} from '../../../confirmationPopup';

type PermissionsCheckboxFieldsField = CheckboxFieldsField & {
  flags: ChatRights[],
  exceptionText: LangPackKey
};

type AdministratorRightsCheckboxFieldsField = CheckboxFieldsField & {
  flags: ChatRights[]
// ... truncated ...
```

---

### 10. [MetaCubeX/metacubexd](https://github.com/MetaCubeX/metacubexd) ⭐ 2.7k

**Path:** `auto-imports.d.ts`
**Language:** typescript | **Lines:** 89
**Link:** https://github.com/MetaCubeX/metacubexd/blob/ea0a8dcb7975b1af899921c50fc4d062b6d93063/auto-imports.d.ts

```typescript
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
  const generateHydrationScript: (typeof import('solid-js/web'))['generateHydrationScript']
  const getAssets: (typeof import('solid-js/web'))['getAssets']
  const getHydrationKey: (typeof import('solid-js/web'))['getHydrationKey']
  const getListener: (typeof import('solid-js'))['getListener']
  const getOwner: (typeof import('solid-js'))['getOwner']
  const getRequestEvent: (typeof import('solid-js/web'))['getRequestEvent']
  const hashIntegration: (typeof import('@solidjs/router'))['hashIntegration']
// ... truncated ...
```

---

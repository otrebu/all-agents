# GitHub Code Search Results

**Query:** `createStore solid-js`
**Found:** 100 results, showing top 10
**Execution:** 4.2s

---

### 1. [solidjs/solid](https://github.com/solidjs/solid) ⭐ 34.6k

**Path:** `CHANGELOG.md`
**Language:** markdown | **Lines:** 45
**Link:** https://github.com/solidjs/solid/blob/a5b51fe200fd59a158410f4008677948fec611d9/CHANGELOG.md

```markdown
```js
const [count, setCount] = createSignal(0);

setCount(c => c + 1);
```

This promotes immutable patterns, let's you access the previous value without it being tracked, and makes Signals consistent with State.

It means that when functions are stored in signals you need to use this form to remove ambiguity

```js
const [count, setCount] = createSignal(ComponentA);

// Do this:
setCount(() => ComponentB);

// Don't do this as it will call the function immediately:
setCount(ComponentB);
```

#### `createState` moved and renamed

`createState` has been renamed to `createStore` and moved to `solid-js/store`. Also moved to `solid-js/store`: `createMutable`, `produce`, `reconcile`

#### SSR Entry points

`renderToString` and `renderToStringAsync` now only return their stringified markup. To insert scripts you need to call `generateHydrationScript` or use the new `<HydrationScript>` component.

`renderToNodeStream` and `renderToWebStream` have been replaced with `pipeToNodeWritable` and `pipeToWritable`, respectively.

#### Options Objects

Most non-essential arguments on reactive primitives are now living on an options object. This was done to homogenize the API and make it easier to make future additions while remaining backwards compatible.

#### on

No longer uses rest parameters for multiple dependencies. Instead pass an array. This facilitates new option to defer execution until dependencies change.

#### Actions renamed to Directives

// ... truncated ...
```

---

### 2. [MetaCubeX/metacubexd](https://github.com/MetaCubeX/metacubexd) ⭐ 2.7k

**Path:** `auto-imports.d.ts`
**Language:** typescript | **Lines:** 47
**Link:** https://github.com/MetaCubeX/metacubexd/blob/ea0a8dcb7975b1af899921c50fc4d062b6d93063/auto-imports.d.ts

```typescript
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
  const hydrate: typeof import('solid-js/web')['hydrate']
// ... truncated ...
```

---

### 3. [solidjs-community/solid-primitives](https://github.com/solidjs-community/solid-primitives) ⭐ 1.5k

**Path:** `packages/mutable/README.md`
**Language:** markdown | **Lines:** 34
**Link:** https://github.com/solidjs-community/solid-primitives/blob/0cbdb59bb42f50de5e08000027789ae3d4c80280/packages/mutable/README.md

```markdown
<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=Primitives&background=tiles&project=mutable" alt="Solid Primitives mutable">
</p>

# @solid-primitives/mutable

[![size](https://img.shields.io/bundlephobia/minzip/@solid-primitives/mutable?style=for-the-badge&label=size)](https://bundlephobia.com/package/@solid-primitives/mutable)
[![version](https://img.shields.io/npm/v/@solid-primitives/mutable?style=for-the-badge)](https://www.npmjs.com/package/@solid-primitives/mutable)
[![stage](https://img.shields.io/endpoint?style=for-the-badge&url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolidjs-community%2Fsolid-primitives%2Fmain%2Fassets%2Fbadges%2Fstage-0.json)](https://github.com/solidjs-community/solid-primitives#contribution-process)

A primitive for creating a mutable store proxy object. An alternative to `createStore` from `"solid-js/store"`.

- [`createMutable`](#createmutable) - Creates a mutable store proxy object.
- [`modifyMutable`](#modifymutable) - Helper for applying store mutation utilities - like `produce` or `reconcile` from `"solid-js/store"` - to a mutable store.

## Installation

```bash
npm install @solid-primitives/mutable
# or
pnpm add @solid-primitives/mutable
# or
yarn add @solid-primitives/mutable
```

## `createMutable`

```ts
import { createMutable } from "@solid-primitives/mutable";

declare function createMutable<T extends StoreNode>(state: T): T;
```

Creates a new mutable Store proxy object. Stores only trigger updates on values changing. Tracking is done by intercepting property access and automatically tracks deep nesting via proxy.
```

---

### 4. [PrimalHQ/primal-web-app](https://github.com/PrimalHQ/primal-web-app) ⭐ 249

**Path:** `src/lib/notes.tsx`
**Language:** typescript | **Lines:** 26
**Link:** https://github.com/PrimalHQ/primal-web-app/blob/c304dd989be0f10828c39ea48943820b44e103a8/src/lib/notes.tsx

```typescript
import { Relay, relayInit } from "../lib/nTools";
import { createStore, unwrap } from "solid-js/store";
import LinkPreview from "../components/LinkPreview/LinkPreview";
import { addrRegex, appleMusicRegex, emojiRegex, hashtagRegex, interpunctionRegex, Kind, linebreakRegex, lnRegex, lnUnifiedRegex, mixCloudRegex, nostrNestsRegex, noteRegexLocal, profileRegex, rumbleRegex, soundCloudRegex, spotifyRegex, tagMentionRegex, tidalEmbedRegex, twitchPlayerRegex, twitchRegex, urlRegex, urlRegexG, wavlakeRegex, youtubeRegex, zapStreamEmbedRegex } from "../constants";
import { sendMessage, subsTo } from "../sockets";
import { EventCoordinate, MediaSize, NostrRelays, NostrRelaySignedEvent, PrimalArticle, PrimalDVM, PrimalNote, PrimalUser, SendNoteResult } from "../types/primal";
import { decodeIdentifier, npubToHex } from "./keys";
import { logError, logInfo, logWarning } from "./logger";
import { getMediaUrl as getMediaUrlDefault } from "./media";
import { encrypt44, signEvent } from "./nostrAPI";
import { ArticleEdit } from "../pages/ReadsEditor";
import ExternalLiveEventPreview from "../components/LiveVideo/ExternalLiveEventPreview";
import { APP_ID } from "../App";

const getLikesStorageKey = () => {
  const key = localStorage.getItem('pubkey') || 'anon';
  return `likes_${key}`;
};

export const getStoredLikes = () => {
  return JSON.parse(localStorage.getItem(getLikesStorageKey()) || '[]');
};

export const setStoredLikes = (likes: string[]) => {
  return localStorage.setItem(getLikesStorageKey(), JSON.stringify(likes));
};
```

---

### 5. [kofigumbs/typebeat](https://github.com/kofigumbs/typebeat) ⭐ 435

**Path:** `ui/app.jsx`
**Language:** javascript | **Lines:** 27
**Link:** https://github.com/kofigumbs/typebeat/blob/792dfd21204a06d0b86e95b3ba1be4bf70e31704/ui/app.jsx

```javascript
import { createEffect, createMemo, createSignal, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';

import 'firacode';
import Tare from 'tare';
import { pulse, type } from './animations';
import './index.css';

/*
 * Map of caps to mode names/modules
 */

export const modes = new Map();
const modeImports = import.meta.globEager('./modes/*');
const basename = /([a-z]+)\.jsx/;
for (let [path, module] of Object.entries(modeImports)) {
  const name = path.match(basename)[1];
  modes.set(module.cap, { name, ...module });
}


/*
 * Event handlers
 */

const capsByEventCode = new Map([
  ['Escape', undefined],
```

---

### 6. [mokeyish/obsidian-code-emitter](https://github.com/mokeyish/obsidian-code-emitter) ⭐ 367

**Path:** `src/main.tsx`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/mokeyish/obsidian-code-emitter/blob/c34b5c7d7d51ea5d22ce463ec94b1bd2deb908f6/src/main.tsx

```typescript
import './style.css';
import { Plugin, type App, type PluginManifest } from 'obsidian';
import { createStore, unwrap, type Store, type SetStoreFunction  } from 'solid-js/store';
import { render } from 'solid-js/web';
import { PluginSolidSettingTab } from './solidify';
import backend from './backend';
import SettingTab from './components/SettingTab';
import CodeBlock from './components/CodeBlock';

import SETTING_DEFAULT, { type PluginSetting } from './setting';



export default class CodeEmitterPlugin extends Plugin {
  readonly settings: Store<PluginSetting>;
  readonly settingsUpdate: SetStoreFunction<PluginSetting>;

  public constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    const [settings, settingsUpdate ] = createStore(SETTING_DEFAULT);
    this.settings = settings;
    this.settingsUpdate = settingsUpdate;
  }


  async onload() {
    // Platform.isDesktop && window.hmr && window.hmr(this, 2000);
```

---

### 7. [itaditya/solid-command-palette](https://github.com/itaditya/solid-command-palette) ⭐ 164

**Path:** `src/lib/Root.tsx`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/itaditya/solid-command-palette/blob/595a4a9c7cb7ee535c103669b788297bdbf004c3/src/lib/Root.tsx

```typescript
import { Component } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { createKbdShortcuts } from './createKbdShortcuts';
import { getActiveParentAction } from './actionUtils/actionUtils';
import { rootParentActionId } from './constants';
import { Provider } from './StoreContext';
import { RootProps, StoreState, StoreMethods, StoreContext, DynamicContextMap } from './types';

const RootInternal: Component = () => {
  createKbdShortcuts();

  return null;
};

export const Root: Component<RootProps> = (p) => {
  const initialActions = p.actions || {};
  const initialActionsContext = p.actionsContext || {};

  const [state, setState] = createStore<StoreState>({
    visibility: 'closed',
    searchText: '',
    activeParentActionIdList: [rootParentActionId],
    actions: initialActions,
    actionsContext: {
      root: initialActionsContext,
      dynamic: {},
    },
```

---

### 8. [bluefishjs/bluefish](https://github.com/bluefishjs/bluefish) ⭐ 146

**Path:** `packages/bluefish-solid/src/layout.tsx`
**Language:** typescript | **Lines:** 47
**Link:** https://github.com/bluefishjs/bluefish/blob/516ec19ed9e3226ec5d14b9dc3fb16c2e6307447/packages/bluefish-solid/src/layout.tsx

```typescript
For,
  JSX,
  ParentProps,
  createRenderEffect,
  createSignal,
  on,
  onCleanup,
  useContext,
} from "solid-js";
import {
  BBox,
  Transform,
  UNSAFE_useScenegraph,
  LayoutFn,
  Id,
  ScenegraphElement,
  resolveScenegraphElements,
  UNSAFE_asNode,
} from "./scenegraph";
import { IdContext } from "./withBluefish";
import { ScopeContext } from "./createName";
import { useError } from "./errorContext";
import { LayoutUIDContext } from "./bluefish";
import { createStore, produce } from "solid-js/store";

export type LayoutProps = ParentProps<{
  name: Id;
  bbox?: BBox;
  layout: LayoutFn;
  paint: (props: {
    bbox: BBox;
    transform: Transform;
    children: JSX.Element;
    customData?: any;
  }) => JSX.Element;
}>;

export const Layout = (props: LayoutProps) => {
  const [_scope, setScope] = useContext(ScopeContext);
  const error = useError();
// ... truncated ...
```

---

### 9. [lxsmnsyc/solid-labels](https://github.com/lxsmnsyc/solid-labels) ⭐ 254

**Path:** `docs/ctf.md`
**Language:** markdown | **Lines:** 83
**Link:** https://github.com/lxsmnsyc/solid-labels/blob/56eecd581df1483e301a1c32f3968ea287342380/docs/ctf.md

```markdown
},
  set count(_param) {
    this.__$set$count(() => _param);
  },
  get message() {
    return this.__$get$message();
  }
};
let [_count, _setcount] = _createSignal(0);
const _message = _createMemo(() => `Count: ${_count()}`);
const obj = {
  __proto__: _proto,
  __$get$count: _count,
  __$set$count: _setcount,
  __$get$message: _message
};
```

## Store

These CTFs are based from `solid-js/store` exports.

- `$store` -> `createStore`
- `$mutable` -> `createMutable`
- `$reconcile` -> `reconcile`
- `$produce` -> `produce`
- `$unwrap` -> `unwrap`

## Components

These CTFs are auto-imported components from `solid-js` and `solid-js/web`. You can still use their original identifiers since those are already supported by `babel-preset-solid`.

## Tooling

On any `d.ts` file, add a reference markup

```ts
/// <reference types="solid-labels" />
```

// ... truncated ...
```

---

### 10. [word-hunter/word-hunter](https://github.com/word-hunter/word-hunter) ⭐ 170

**Path:** `src/review/app.tsx`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/word-hunter/word-hunter/blob/f43323996d49e3add6b1ba588ec576aa422470f0/src/review/app.tsx

```typescript
import { ContextMap, StorageKey, WordContext } from '../constant'
import { Accessor, createEffect, createSignal, For, Setter, Show } from 'solid-js'
import { createStore } from 'solid-js/store'
import { getLocalValue } from '../lib/storage'
import { createDraggable } from '@neodrag/solid'
import { getFaviconByDomain, getRelativeTimeString, formatTime } from '../lib/utils'

type Video = { title: string; url: string; thumb: string; sentence: string; current: boolean }

export const App = () => {
  const [contexts, setContexts] = createSignal<ContextMap>({})
  const [isDesc, setIsDesc] = createSignal<boolean>(localStorage.getItem('isDesc') !== '0')
  const [random, setRandom] = createSignal<number>(0)
  const [page, setPage] = createSignal<number>(1)
  const [youtubeOnly, setYoutubeOnly] = createSignal<boolean>(localStorage.getItem('youtubeOnly') === '1')

  const [showVideoWindow, setShowVideoWindow] = createSignal<boolean>(false)
  const [videoSrc, setVideoSrc] = createSignal<string>('')
  const [videosMap, setVideosMap] = createStore<Record<string, { loading: boolean; videos: Video[] }>>({})

  const [isSessionRunning, setIsSessionRunning] = createSignal<boolean>(false)
  const [aiSession, setAiSession] = createSignal<AITextSession>()

  createEffect(() => {
    if (!window.ai) return false
    window.ai.canCreateTextSession().then(async status => {
      if (status === 'readily') {
```

---

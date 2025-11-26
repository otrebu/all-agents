# GitHub Code Search Results

**Query:** `createContext Provider solid-js language:typescript`
**Found:** 100 results, showing top 10
**Execution:** 2.6s

---

### 1. [TanStack/query](https://github.com/TanStack/query) ⭐ 47.5k

**Path:** `packages/solid-query/src/isRestoring.ts`
**Language:** typescript | **Lines:** 17
**Link:** https://github.com/TanStack/query/blob/8b387341eb8e5ce6447b55023c724c76747d4f00/packages/solid-query/src/isRestoring.ts

```typescript
import { createContext, useContext } from 'solid-js'
import type { Accessor } from 'solid-js'

const IsRestoringContext = createContext<Accessor<boolean>>(() => false)

export const useIsRestoring = () => useContext(IsRestoringContext)
export const IsRestoringProvider = IsRestoringContext.Provider

---

import { createContext, useContext } from 'solid-js'
import type { Accessor } from 'solid-js'

const IsRestoringContext = createContext<Accessor<boolean>>(() => false)

export const useIsRestoring = () => useContext(IsRestoringContext)
export const IsRestoringProvider = IsRestoringContext.Provider
```

---

### 2. [NervJS/taro](https://github.com/NervJS/taro) ⭐ 37.1k

**Path:** `packages/taro-platform-harmony/src/runtime-framework/solid/app.ts`
**Language:** typescript | **Lines:** 71
**Link:** https://github.com/NervJS/taro/blob/dc9bd71cc1ca8307299e5e1fe24367abeb0dfd71/packages/taro-platform-harmony/src/runtime-framework/solid/app.ts

```typescript
import { createComponent, h, render } from '@tarojs/plugin-framework-solid/dist/reconciler'
import { Current, document, eventCenter } from '@tarojs/runtime'
import { hooks } from '@tarojs/shared'
import { batch, createContext, createRoot, createSignal, For } from 'solid-js'

import { setReconciler } from './connect'
import { getPageInstance, injectPageInstance } from './page'
import { EMPTY_OBJ, HOOKS_APP_ID, setDefaultDescriptor, setRouterParams } from './utils'

import type { AppInstance, Instance, PageLifeCycle, PageProps, ReactAppInstance } from '@tarojs/runtime'
import type { AppConfig } from '@tarojs/taro'
import type { SolidComponent } from './connect'

export const ReactMeta = {
  R: EMPTY_OBJ,
  Container: EMPTY_OBJ,
  PageContext: EMPTY_OBJ
}

export function createSolidApp(App: SolidComponent, config: AppConfig) {
  setReconciler()

  if (ReactMeta.PageContext === EMPTY_OBJ) {
    ReactMeta.PageContext = createContext<string>()
  }

---

import { hooks } from '@tarojs/shared'
import { batch, createContext, createRoot, createSignal, For } from 'solid-js'

import { setReconciler } from './connect'
import { getPageInstance, injectPageInstance } from './page'
import { EMPTY_OBJ, HOOKS_APP_ID, setDefaultDescriptor, setRouterParams } from './utils'

import type { AppInstance, Instance, PageLifeCycle, PageProps, ReactAppInstance } from '@tarojs/runtime'
import type { AppConfig } from '@tarojs/taro'
import type { SolidComponent } from './connect'

export const ReactMeta = {
// ... truncated ...
```

---

### 3. [solidjs/solid](https://github.com/solidjs/solid) ⭐ 34.6k

**Path:** `packages/solid/src/server/rendering.ts`
**Language:** typescript | **Lines:** 87
**Link:** https://github.com/solidjs/solid/blob/a5b51fe200fd59a158410f4008677948fec611d9/packages/solid/src/server/rendering.ts

```typescript
useContext
} from "./reactive.js";
import type { JSX } from "../jsx.js";

export type Component<P = {}> = (props: P) => JSX.Element;
export type VoidProps<P = {}> = P & { children?: never };
export type VoidComponent<P = {}> = Component<VoidProps<P>>;
export type ParentProps<P = {}> = P & { children?: JSX.Element };
export type ParentComponent<P = {}> = Component<ParentProps<P>>;
export type FlowProps<P = {}, C = JSX.Element> = P & { children: C };
export type FlowComponent<P = {}, C = JSX.Element> = Component<FlowProps<P, C>>;
export type Ref<T> = T | ((val: T) => void);
export type ValidComponent = keyof JSX.IntrinsicElements | Component<any> | (string & {});
export type ComponentProps<T extends ValidComponent> =
  T extends Component<infer P>
    ? P
    : T extends keyof JSX.IntrinsicElements
      ? JSX.IntrinsicElements[T]
      : Record<string, unknown>;

// these methods are duplicates from solid-js/web
// we need a better solution for this in the future
function escape(s: any, attr?: boolean) {
  const t = typeof s;
  if (t !== "string") {
    if (!attr && t === "function") return escape(s());
    if (!attr && Array.isArray(s)) {
      for (let i = 0; i < s.length; i++) s[i] = escape(s[i]);
      return s;
    }
    if (attr && t === "boolean") return String(s);
    return s;
  }
  const delim = attr ? '"' : "<";
  const escDelim = attr ? "&quot;" : "&lt;";
  let iDelim = s.indexOf(delim);
  let iAmp = s.indexOf("&");

  if (iDelim < 0 && iAmp < 0) return s;

// ... truncated ...
```

---

### 4. [urql-graphql/urql](https://github.com/urql-graphql/urql) ⭐ 8.9k

**Path:** `packages/solid-urql/src/context.ts`
**Language:** typescript | **Lines:** 43
**Link:** https://github.com/urql-graphql/urql/blob/d845f88bd6b3529666776d315ebcd3d27f61ac23/packages/solid-urql/src/context.ts

```typescript
import type { Client } from '@urql/core';
import { createContext, useContext } from 'solid-js';

export const Context = createContext<Client>();
export const Provider = Context.Provider;

export type UseClient = () => Client;
export const useClient: UseClient = () => {
  const client = useContext(Context);

  if (process.env.NODE_ENV !== 'production' && client === undefined) {
    const error =
      "No client has been specified using urql's Provider. please create a client and add a Provider.";

    console.error(error);
    throw new Error(error);
  }

  return client!;
};

---

import type { Client } from '@urql/core';
import { createContext, useContext } from 'solid-js';

export const Context = createContext<Client>();
export const Provider = Context.Provider;

export type UseClient = () => Client;
export const useClient: UseClient = () => {
  const client = useContext(Context);

  if (process.env.NODE_ENV !== 'production' && client === undefined) {
    const error =
      "No client has been specified using urql's Provider. please create a client and add a Provider.";

    console.error(error);
    throw new Error(error);
  }
// ... truncated ...
```

---

### 5. [chakra-ui/panda](https://github.com/chakra-ui/panda) ⭐ 5.9k

**Path:** `packages/generator/src/artifacts/solid-jsx/create-style-context.ts`
**Language:** typescript | **Lines:** 76
**Link:** https://github.com/chakra-ui/panda/blob/fd13554905b694bfeb8444babd29b0ad0a58b972/packages/generator/src/artifacts/solid-jsx/create-style-context.ts

```typescript
import type { Context } from '@pandacss/core'
import { outdent } from 'outdent'
import { match } from 'ts-pattern'

export function generateSolidCreateStyleContext(ctx: Context) {
  const { factoryName } = ctx.jsx

  return {
    js: outdent`
    ${ctx.file.import('cx, css, sva', '../css/index')}
    ${ctx.file.import(factoryName, './factory')}
    ${ctx.file.import('getDisplayName', './factory-helper')}
    import { createComponent, mergeProps } from 'solid-js/web'
    import { createContext, createMemo, splitProps, useContext } from 'solid-js'

    function createSafeContext(contextName) {
      const Context = createContext(undefined)
      const useStyleContext = (componentName, slot) => {
        const context = useContext(Context)
        if (context === undefined) {
          const componentInfo = componentName ? \`Component "\${componentName}"\` : 'A component'
          const slotInfo = slot ? \` (slot: "\${slot}")\` : ''
          
          throw new Error(
            \`\${componentInfo}\${slotInfo} cannot access \${contextName} because it's missing its Provider.\`
          )
        }
        return context
      }
      return [Context, useStyleContext]
    }

    export function createStyleContext(recipe) {
      const isConfigRecipe = '__recipe__' in recipe
      const recipeName = isConfigRecipe && recipe.__name__ ? recipe.__name__ : undefined

---

import type { Context } from '@pandacss/core'
import { outdent } from 'outdent'
// ... truncated ...
```

---

### 6. [chakra-ui/ark](https://github.com/chakra-ui/ark) ⭐ 4.8k

**Path:** `packages/solid/src/utils/create-context.ts`
**Language:** typescript | **Lines:** 39
**Link:** https://github.com/chakra-ui/ark/blob/9b79aef8306803f79a58f5e9836b0d5c19f0ba05/packages/solid/src/utils/create-context.ts

```typescript
import { hasProp, isFunction } from '@zag-js/utils'
import { type Context, createContext as createSolidContext, useContext as useSolidContext } from 'solid-js'

export interface CreateContextOptions<T> {
  strict?: boolean
  hookName?: string
  providerName?: string
  errorMessage?: string
  defaultValue?: T
}

export type CreateContextReturn<T> = [Context<T>['Provider'], () => T, Context<T>]

function getErrorMessage(hook: string, provider: string) {
  return `${hook} returned \`undefined\`. Seems you forgot to wrap component within ${provider}`
}

export function createContext<T>(options: CreateContextOptions<T> = {}) {
  const { strict = true, hookName = 'useContext', providerName = 'Provider', errorMessage, defaultValue } = options

  const Context = createSolidContext<T | undefined>(defaultValue)

  function useContext() {
    const context = useSolidContext(Context)

    if (!context && strict) {
      const error = new Error(errorMessage ?? getErrorMessage(hookName, providerName))
      error.name = 'ContextError'
      if (hasProp(Error, 'captureStackTrace') && isFunction(Error.captureStackTrace)) {
        Error.captureStackTrace(error, useContext)
      }
      throw error
    }

    return context
  }

  return [Context.Provider, useContext, Context] as CreateContextReturn<T>
}
```

---

### 7. [effector/effector](https://github.com/effector/effector) ⭐ 4.8k

**Path:** `src/solid/lib/get-scope.ts`
**Language:** typescript | **Lines:** 31
**Link:** https://github.com/effector/effector/blob/bb20c18babd2dec7edf5a6877429d9323b24f319/src/solid/lib/get-scope.ts

```typescript
import {createContext, useContext} from 'solid-js'
import {Scope} from 'effector'

import {throwError} from './throw'

export const ScopeContext = createContext<Scope | null>(null)

export function getScope(forceScope?: boolean) {
  const scope = useContext(ScopeContext)
  if (forceScope && !scope)
    throwError('No scope found, consider adding <Provider> to app root')

  return scope as Scope
}

---

import {createContext, useContext} from 'solid-js'
import {Scope} from 'effector'

import {throwError} from './throw'

export const ScopeContext = createContext<Scope | null>(null)

export function getScope(forceScope?: boolean) {
  const scope = useContext(ScopeContext)
  if (forceScope && !scope)
    throwError('No scope found, consider adding <Provider> to app root')

  return scope as Scope
}
```

---

### 8. [rocicorp/mono](https://github.com/rocicorp/mono) ⭐ 2.5k

**Path:** `packages/zero-solid/src/use-zero.ts`
**Language:** typescript | **Lines:** 76
**Link:** https://github.com/rocicorp/mono/blob/9630b380339b047910038f9a44a5d5904ca5c92c/packages/zero-solid/src/use-zero.ts

```typescript
import {
  batch,
  createContext,
  createEffect,
  createMemo,
  onCleanup,
  splitProps,
  untrack,
  useContext,
  type Accessor,
  type JSX,
} from 'solid-js';
import type {CustomMutatorDefs} from '../../zero-client/src/client/custom.ts';
import type {ZeroOptions} from '../../zero-client/src/client/options.ts';
import {Zero} from '../../zero-client/src/client/zero.ts';
import type {Schema} from '../../zero-types/src/schema.ts';

// oxlint-disable-next-line no-explicit-any
const ZeroContext = createContext<Accessor<Zero<any, any, any>> | undefined>(
  undefined,
);

const NO_AUTH_SET = Symbol();

export function createZero<
  S extends Schema,
  MD extends CustomMutatorDefs,
  Context,
>(options: ZeroOptions<S, MD, Context>): Zero<S, MD, Context> {
  const opts = {
    ...options,
    batchViewUpdates: batch,
  };

---

import {
  batch,
  createContext,
  createEffect,
// ... truncated ...
```

---

### 9. [morethanwords/tweb](https://github.com/morethanwords/tweb) ⭐ 2.3k

**Path:** `src/lib/solidjs/hotReloadGuard.ts`
**Language:** typescript | **Lines:** 27
**Link:** https://github.com/morethanwords/tweb/blob/2071f286df0737b223da54001a501dd904c47117/src/lib/solidjs/hotReloadGuard.ts

```typescript
import {createContext, useContext} from 'solid-js';

/**
 * `import type` is mandatory to avoid reloading the page (not really 😀, vite handles it even without the `import type`)
 */

import type {AutonomousMonoforumThreadList} from '../../components/autonomousDialogList/monoforumThreads';
import type {EmoticonsDropdown} from '../../components/emoticonsDropdown';
import type EmoticonsSearch from '../../components/emoticonsDropdown/search';
import type EmojiTab from '../../components/emoticonsDropdown/tabs/emoji';
import type {InputFieldTsx} from '../../components/inputFieldTsx';
import type PasswordMonkey from '../../components/monkeys/password';
import type PasswordInputField from '../../components/passwordInputField';
import type {PeerTitleTsx} from '../../components/peerTitleTsx';
import type {setQuizHint} from '../../components/poll';
import type showLimitPopup from '../../components/popups/limit';
import type PopupPremium from '../../components/popups/premium';
import type {AppSidebarLeft} from '../../components/sidebarLeft';
import type AppChatFoldersTab from '../../components/sidebarLeft/tabs/chatFolders';
import type AppEditFolderTab from '../../components/sidebarLeft/tabs/editFolder';
import type wrapStickerSetThumb from '../../components/wrappers/stickerSetThumb';
import type {ThemeController} from '../../helpers/themeController';
import type {AppDialogsManager} from '../appManagers/appDialogsManager';
import type {AppImManager} from '../appManagers/appImManager';
import type uiNotificationsManager from '../appManagers/uiNotificationsManager';
import type apiManagerProxy from '../mtproto/mtprotoworker';
import type lottieLoader from '../rlottie/lottieLoader';
```

---

### 10. [malloydata/malloy](https://github.com/malloydata/malloy) ⭐ 2.3k

**Path:** `packages/malloy-render/src/component/result-context.ts`
**Language:** typescript | **Lines:** 43
**Link:** https://github.com/malloydata/malloy/blob/f5685625d9f25a4d41a2eed7478dde6d84405049/packages/malloy-render/src/component/result-context.ts

```typescript
/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {createContext, useContext} from 'solid-js';
import type {Accessor} from 'solid-js';
import type {RenderMetadata} from './render-result-metadata';

export const ResultContext = createContext<Accessor<RenderMetadata>>();
export const useResultContext = () => {
  const ctx = useContext(ResultContext);
  if (!ctx)
    throw Error(
      'useResultContext must be used within a ResultContext.Provider'
    );
  return ctx();
};

---

/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {createContext, useContext} from 'solid-js';
import type {Accessor} from 'solid-js';
import type {RenderMetadata} from './render-result-metadata';

export const ResultContext = createContext<Accessor<RenderMetadata>>();
export const useResultContext = () => {
  const ctx = useContext(ResultContext);
  if (!ctx)
    throw Error(
      'useResultContext must be used within a ResultContext.Provider'
// ... truncated ...
```

---

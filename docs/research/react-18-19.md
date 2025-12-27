# React 18 and React 19: Comprehensive Reference Guide

> Deep dive into concurrent features, new APIs, and migration guidance for React 18 (March 2022) and React 19 (December 2024).

## Table of Contents

- [React 18 Overview](#react-18-overview)
  - [Concurrent Rendering](#concurrent-rendering)
  - [Automatic Batching](#automatic-batching)
  - [Transitions API](#transitions-api)
  - [Suspense Improvements](#suspense-improvements)
  - [Streaming SSR](#streaming-ssr)
  - [New Hooks](#new-hooks-react-18)
- [React 19 Overview](#react-19-overview)
  - [Actions](#actions)
  - [New Hooks](#new-hooks-react-19)
  - [use() API](#use-api)
  - [Server Components](#server-components)
  - [Other Improvements](#other-improvements-react-19)
  - [React Compiler](#react-compiler)
- [Migration Guide](#migration-guide)
  - [React 17 to 18](#react-17-to-18-migration)
  - [React 18 to 19](#react-18-to-19-migration)
- [Performance Optimization](#performance-optimization)
- [Best Practices](#best-practices)

---

## React 18 Overview

React 18 was released on March 29, 2022, introducing the foundation for concurrent rendering and numerous performance improvements.

### Concurrent Rendering

Concurrent rendering is the foundational mechanism that enables all of React 18's new capabilities. It fundamentally changes how React renders components.

**Key Characteristics:**

- **Interruptible rendering**: React can pause, resume, or abandon renders in progress
- **Non-blocking updates**: UI responds immediately to user input even during large rendering tasks
- **Opt-in adoption**: Only enabled when using concurrent features; existing code works unchanged
- **Consistent UI**: DOM mutations only occur after the entire tree is evaluated

**How It Works:**

Before React 18, rendering was synchronous - once started, it couldn't be interrupted. With concurrent rendering, React breaks render work into small, manageable chunks and uses a task scheduler to handle prioritization. This allows pausing a render in progress to prioritize user interactions.

```javascript
// Concurrent rendering is automatically enabled when using:
// - useTransition
// - useDeferredValue
// - Suspense for data fetching
// - startTransition
```

**Important:** Concurrency is NOT enabled by default. Developers must opt-in using concurrent features.

---

### Automatic Batching

React 18 extends automatic batching to all contexts, not just React event handlers.

**Before React 18:**

```javascript
// Only batched inside React event handlers
function handleClick() {
  setCount(c => c + 1);
  setFlag(f => !f);
  // React renders once (batched)
}

// NOT batched - renders twice!
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
}, 1000);

// NOT batched - renders twice!
fetch('/api').then(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
});
```

**After React 18:**

```javascript
// All updates are automatically batched
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // React renders once!
}, 1000);

fetch('/api').then(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // React renders once!
});

// Native event handlers - batched!
element.addEventListener('click', () => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // React renders once!
});
```

**Opting Out with flushSync:**

```javascript
import { flushSync } from 'react-dom';

function handleClick() {
  flushSync(() => {
    setCounter(c => c + 1);
  });
  // DOM is updated immediately

  flushSync(() => {
    setFlag(f => !f);
  });
  // DOM is updated immediately
}
```

**Warning:** `flushSync` can significantly hurt performance and may unexpectedly force Suspense boundaries to show their fallback state. Use as a last resort.

**Note:** React does NOT batch updates across `await` calls:

```javascript
async function handleClick() {
  setCount(c => c + 1);
  await someAsyncOperation();
  setFlag(f => !f); // These two updates are NOT batched
}
```

---

### Transitions API

Transitions distinguish between **urgent updates** (typing, clicking) and **non-urgent updates** (UI transitions).

#### useTransition Hook

```javascript
import { useState, useTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    // Urgent: Update input immediately
    setQuery(e.target.value);

    // Non-urgent: Update results as transition
    startTransition(() => {
      setResults(filterResults(e.target.value));
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </>
  );
}
```

**Key Points:**

- `isPending` indicates if a transition is in progress
- Updates in `startTransition` can be interrupted by urgent updates
- React abandons incomplete transition renders if interrupted
- Transitions work with Suspense to prevent replacing visible content with fallbacks

#### startTransition Function

For cases where you can't use hooks (e.g., outside components):

```javascript
import { startTransition } from 'react';

// Can be used outside components
startTransition(() => {
  setSearchQuery(input);
});
```

#### useDeferredValue Hook

Similar to debouncing but with smart timing - React attempts the deferred render right after the first render reflects on screen.

```javascript
import { useState, useDeferredValue } from 'react';

function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      <ExpensiveResultsList query={deferredQuery} />
    </div>
  );
}
```

**When to Use Which:**

| Hook | Use Case |
|------|----------|
| `useTransition` | When you control the state update |
| `useDeferredValue` | When the value comes from props or external source |

**React 19 Enhancement - Initial Value:**

```javascript
// New in React 19
const value = useDeferredValue(deferredValue, ''); // '' is initial value
```

---

### Suspense Improvements

React 18 significantly expanded Suspense capabilities beyond code-splitting.

#### Basic Usage

```jsx
import { Suspense, lazy } from 'react';

const Comments = lazy(() => import('./Comments'));

function ArticlePage({ article }) {
  return (
    <article>
      <h1>{article.title}</h1>
      <p>{article.body}</p>
      <Suspense fallback={<CommentsLoading />}>
        <Comments articleId={article.id} />
      </Suspense>
    </article>
  );
}
```

#### Nested Suspense for Progressive Loading

```jsx
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<ContentSkeleton />}>
    <MainContent />
    <Suspense fallback={<SidebarSkeleton />}>
      <Sidebar />
    </Suspense>
  </Suspense>
</Suspense>
```

**Loading Sequence:**
1. `PageSkeleton` while Header loads
2. Header appears, `ContentSkeleton` while MainContent loads
3. MainContent appears, `SidebarSkeleton` while Sidebar loads
4. Complete page

#### Suspense with Transitions

Prevent jarring content replacement:

```jsx
import { Suspense, startTransition, useState } from 'react';

function Router() {
  const [page, setPage] = useState('/');

  function navigate(url) {
    // Wrap navigation in transition
    startTransition(() => {
      setPage(url);
    });
  }

  return (
    <Suspense fallback={<Loading />}>
      <Routes page={page} />
    </Suspense>
  );
}
```

#### Suspense with useTransition for Progress Indication

```jsx
import { useTransition, Suspense } from 'react';

function App() {
  const [page, setPage] = useState('/');
  const [isPending, startTransition] = useTransition();

  function navigate(url) {
    startTransition(() => setPage(url));
  }

  return (
    <div style={{ opacity: isPending ? 0.7 : 1 }}>
      <Navigation onNavigate={navigate} isPending={isPending} />
      <Suspense fallback={<Loading />}>
        <PageContent page={page} />
      </Suspense>
    </div>
  );
}
```

#### Supported Data Sources

Suspense works only with Suspense-enabled data sources:

- Data fetching with Suspense-enabled frameworks (Relay, Next.js)
- Lazy-loading components with `React.lazy()`
- Reading cached Promises with `use()` (React 19)

**NOT supported:**
- Data fetched inside Effects or event handlers
- Ad-hoc data fetching without framework support

---

### Streaming SSR

React 18 introduces streaming server-side rendering with Suspense support.

#### renderToPipeableStream (Node.js)

```javascript
import { renderToPipeableStream } from 'react-dom/server';
import express from 'express';

const app = express();

app.get('/', (req, res) => {
  const { pipe, abort } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/client.js'],
    onShellReady() {
      // Stream starts when shell is ready
      res.setHeader('content-type', 'text/html');
      pipe(res);
    },
    onShellError(error) {
      // Shell failed to render
      res.statusCode = 500;
      res.send('<!doctype html><p>Error loading page</p>');
    },
    onAllReady() {
      // All content ready (for crawlers/static generation)
    },
    onError(error) {
      console.error(error);
    }
  });

  // Timeout for slow renders
  setTimeout(() => abort(), 10000);
});
```

#### renderToReadableStream (Edge Runtimes)

```javascript
import { renderToReadableStream } from 'react-dom/server';

async function handler(request) {
  const stream = await renderToReadableStream(<App />, {
    bootstrapScripts: ['/client.js'],
  });

  return new Response(stream, {
    headers: { 'content-type': 'text/html' },
  });
}
```

#### Selective Hydration

With React 18, hydration becomes incremental and prioritized:

```javascript
// Client entry
import { hydrateRoot } from 'react-dom/client';

hydrateRoot(document.getElementById('root'), <App />);
```

**How It Works:**

1. Suspense boundaries hydrate independently
2. User interactions prioritize hydration of interacted components
3. Other components hydrate during idle time

**Example with Selective Hydration:**

```jsx
// Server Component Structure
function App() {
  return (
    <>
      <Header /> {/* Hydrates immediately */}
      <Suspense fallback={<SpinnerA />}>
        <Sidebar /> {/* Hydrates when ready or when clicked */}
      </Suspense>
      <Suspense fallback={<SpinnerB />}>
        <MainContent /> {/* Hydrates when ready or when clicked */}
      </Suspense>
    </>
  );
}
```

---

### New Hooks (React 18)

#### useId

Generates stable unique IDs for accessibility attributes:

```jsx
import { useId } from 'react';

function PasswordField() {
  const id = useId();

  return (
    <>
      <label htmlFor={id}>Password:</label>
      <input id={id} type="password" />
    </>
  );
}
```

**Note:** Don't use for keys in lists. Use data-based keys instead.

#### useSyncExternalStore

For libraries managing external state with concurrent rendering support:

```javascript
import { useSyncExternalStore } from 'react';

function useOnlineStatus() {
  return useSyncExternalStore(
    // subscribe
    (callback) => {
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    // getSnapshot (client)
    () => navigator.onLine,
    // getServerSnapshot (SSR)
    () => true
  );
}
```

#### useInsertionEffect

For CSS-in-JS libraries to inject styles before layout effects:

```javascript
import { useInsertionEffect } from 'react';

// For library authors only
function useCSS(rule) {
  useInsertionEffect(() => {
    // Insert <style> tags here
  });
  return rule;
}
```

---

## React 19 Overview

React 19 was released on December 5, 2024, building upon React 18's concurrent foundation with new APIs for data mutations, forms, and more.

### Actions

Actions simplify handling async operations with automatic pending states, error handling, and optimistic updates.

**Before (Manual State Management):**

```javascript
function UpdateProfile() {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async () => {
    setIsPending(true);
    setError(null);
    try {
      await updateProfile(name);
      redirect('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} />
      <button disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

**After (Using Actions with useTransition):**

```javascript
function UpdateProfile() {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      const err = await updateProfile(name);
      if (err) {
        setError(err);
        return;
      }
      redirect('/profile');
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} />
      <button disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

---

### New Hooks (React 19)

#### useActionState

Simplifies form state management by combining action handling with state:

```jsx
import { useActionState } from 'react';

function RegisterForm() {
  const [error, submitAction, isPending] = useActionState(
    async (previousState, formData) => {
      const username = formData.get('username');
      const password = formData.get('password');

      const error = await registerUser(username, password);
      if (error) {
        return error; // Becomes new state
      }
      redirect('/dashboard');
      return null;
    },
    null // Initial state
  );

  return (
    <form action={submitAction}>
      <input name="username" placeholder="Username" />
      <input name="password" type="password" placeholder="Password" />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Registering...' : 'Register'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

**Key Benefits:**
- No `useState` needed for form values, error, or loading state
- No `onChange` handlers required
- No `value` props needed
- Form inputs only need a `name` attribute
- Uses `action` prop instead of `onSubmit`

**Note:** Previously called `ReactDOM.useFormState` in Canary releases.

#### useFormStatus

Access parent form status from child components without prop drilling:

```jsx
import { useFormStatus } from 'react-dom';

function SubmitButton({ children }) {
  const { pending, data, method, action } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : children}
    </button>
  );
}

// Usage in parent form
function ContactForm() {
  const [error, submitAction] = useActionState(handleSubmit, null);

  return (
    <form action={submitAction}>
      <input name="email" type="email" />
      <input name="message" />
      <SubmitButton>Send Message</SubmitButton>
    </form>
  );
}
```

**Important:** `useFormStatus` must be used in a child component of the form, NOT in the same component that uses `useActionState`.

#### useOptimistic

Show optimistic UI updates while async operations are in progress:

```jsx
import { useOptimistic } from 'react';

function TodoList({ todos, addTodoAction }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (currentTodos, newTodo) => [...currentTodos, newTodo]
  );

  async function handleAddTodo(formData) {
    const title = formData.get('title');
    const optimisticTodo = { id: Date.now(), title, pending: true };

    addOptimisticTodo(optimisticTodo);

    try {
      await addTodoAction(title);
    } catch (error) {
      // On error, optimistic state automatically reverts
    }
  }

  return (
    <div>
      <form action={handleAddTodo}>
        <input name="title" />
        <button type="submit">Add Todo</button>
      </form>
      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
            {todo.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

### use() API

The `use()` API reads resources (Promises and Context) during render:

#### Reading Promises

```jsx
import { use, Suspense } from 'react';

// Promise is created outside component (not in render)
async function fetchComments(postId) {
  const res = await fetch(`/api/posts/${postId}/comments`);
  return res.json();
}

function Comments({ commentsPromise }) {
  // use() suspends until promise resolves
  const comments = use(commentsPromise);

  return (
    <ul>
      {comments.map(comment => (
        <li key={comment.id}>{comment.text}</li>
      ))}
    </ul>
  );
}

function Post({ postId }) {
  // Create promise outside render
  const commentsPromise = fetchComments(postId);

  return (
    <article>
      <h1>Post Title</h1>
      <Suspense fallback={<p>Loading comments...</p>}>
        <Comments commentsPromise={commentsPromise} />
      </Suspense>
    </article>
  );
}
```

#### Reading Context Conditionally

Unlike `useContext`, `use()` can be called conditionally:

```jsx
import { use } from 'react';
import ThemeContext from './ThemeContext';

function Heading({ children }) {
  if (!children) {
    return null;
  }

  // Can be called after conditional return
  const theme = use(ThemeContext);

  return (
    <h1 style={{ color: theme.color }}>
      {children}
    </h1>
  );
}
```

**Limitations:**
- Does NOT support promises created during render
- Can only be called inside components or hooks
- Can be called conditionally (unlike other hooks)

---

### Server Components

Server Components run on the server before bundling, reducing client bundle size.

#### Basic Server Component

```jsx
// app/page.js (Next.js App Router example)
// No 'use client' directive = Server Component

async function ProductPage({ params }) {
  // Direct database access - runs only on server
  const product = await db.products.findById(params.id);

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <AddToCartButton productId={product.id} />
    </div>
  );
}
```

#### Client Component

```jsx
// components/AddToCartButton.jsx
'use client';

import { useState } from 'react';

export function AddToCartButton({ productId }) {
  const [adding, setAdding] = useState(false);

  async function handleClick() {
    setAdding(true);
    await addToCart(productId);
    setAdding(false);
  }

  return (
    <button onClick={handleClick} disabled={adding}>
      {adding ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

#### Server Actions

Functions that run on the server but can be called from client components:

```jsx
// actions.js
'use server';

export async function addToCart(productId) {
  const user = await getAuthenticatedUser();
  await db.carts.add(user.id, productId);
  revalidatePath('/cart');
}
```

```jsx
// components/AddToCartButton.jsx
'use client';

import { addToCart } from './actions';

export function AddToCartButton({ productId }) {
  return (
    <form action={addToCart.bind(null, productId)}>
      <button type="submit">Add to Cart</button>
    </form>
  );
}
```

**When to Use Server vs Client Components:**

| Server Components | Client Components |
|-------------------|-------------------|
| Data-driven views | Interactive widgets |
| Lists and layouts | Forms with state |
| Content that doesn't need client state | Real-time UI (WebSocket) |
| SEO-critical content | Event handlers |
| Database/API access | Browser APIs |

---

### Other Improvements (React 19)

#### ref as a Prop

No more `forwardRef` needed:

```jsx
// Before (React 18)
const MyInput = forwardRef((props, ref) => {
  return <input ref={ref} {...props} />;
});

// After (React 19)
function MyInput({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

#### Context as Provider

```jsx
// Before
<ThemeContext.Provider value="dark">
  {children}
</ThemeContext.Provider>

// After (React 19)
<ThemeContext value="dark">
  {children}
</ThemeContext>
```

#### Ref Cleanup Functions

```jsx
<input
  ref={(node) => {
    // Setup
    node?.focus();

    // Return cleanup function
    return () => {
      // Cleanup when unmounting
    };
  }}
/>
```

#### Document Metadata Support

Render metadata directly in components:

```jsx
function BlogPost({ post }) {
  return (
    <article>
      <title>{post.title}</title>
      <meta name="description" content={post.excerpt} />
      <meta name="author" content={post.author} />
      <link rel="canonical" href={post.url} />

      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

#### Stylesheet Support with Precedence

```jsx
function Component() {
  return (
    <>
      <link rel="stylesheet" href="base.css" precedence="default" />
      <link rel="stylesheet" href="theme.css" precedence="high" />
      <div>Content</div>
    </>
  );
}
```

#### Async Script Deduplication

```jsx
function MultipleWidgets() {
  return (
    <>
      <Widget1 />
      <Widget2 />
    </>
  );
}

function Widget1() {
  return (
    <div>
      <script async src="analytics.js" />
      Widget 1
    </div>
  );
}

function Widget2() {
  return (
    <div>
      <script async src="analytics.js" /> {/* Deduplicated automatically */}
      Widget 2
    </div>
  );
}
```

#### Resource Preloading APIs

```jsx
import { prefetchDNS, preconnect, preload, preinit } from 'react-dom';

function App() {
  prefetchDNS('https://api.example.com');
  preconnect('https://api.example.com');
  preload('https://example.com/font.woff2', { as: 'font' });
  preinit('https://example.com/script.js', { as: 'script' });

  return <div>App Content</div>;
}
```

#### Improved Error Reporting

```jsx
const root = createRoot(document.getElementById('root'), {
  onCaughtError: (error, errorInfo) => {
    // Error caught by Error Boundary
    logError(error, errorInfo);
  },
  onUncaughtError: (error, errorInfo) => {
    // Uncaught error
    reportError(error);
  },
  onRecoverableError: (error, errorInfo) => {
    // Error React recovered from
    logWarning(error);
  },
});
```

#### Better Hydration Error Diffs

React 19 provides clearer hydration mismatch messages:

```
Uncaught Error: Hydration failed because the server rendered HTML
didn't match the client...

<App>
  <span>
    + Client text
    - Server text
```

---

### React Compiler

The React Compiler (separate from React 19) provides automatic memoization.

**Key Points:**

- Automatically memoizes components, values, and functions
- Eliminates need for manual `useMemo`, `useCallback`, and `memo` in many cases
- Is a Babel plugin that integrates with your bundler
- Works best with components following React's rules

**What It Does:**

```jsx
// Before (manual memoization)
const MemoizedChild = memo(function Child({ items }) {
  const processed = useMemo(() =>
    items.map(x => x * 2), [items]
  );

  const handleClick = useCallback(() => {
    console.log(processed);
  }, [processed]);

  return <button onClick={handleClick}>Click</button>;
});

// After (with React Compiler - no manual memoization needed)
function Child({ items }) {
  const processed = items.map(x => x * 2);

  const handleClick = () => {
    console.log(processed);
  };

  return <button onClick={handleClick}>Click</button>;
}
```

**Current Limitations:**

- Not yet part of React 19 stable release
- May miss some edge cases (e.g., non-memoized library returns)
- Array index keys can confuse the compiler
- Still beneficial to understand memoization concepts

---

## Migration Guide

### React 17 to 18 Migration

#### Step 1: Update Dependencies

```bash
npm install react@18 react-dom@18
# or
yarn add react@18 react-dom@18

# TypeScript projects
npm install @types/react@18 @types/react-dom@18
```

#### Step 2: Update Root API

```javascript
// Before (React 17)
import ReactDOM from 'react-dom';
ReactDOM.render(<App />, document.getElementById('root'));

// After (React 18)
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

#### Step 3: Update Hydration (SSR)

```javascript
// Before
import { hydrate } from 'react-dom';
hydrate(<App />, document.getElementById('root'));

// After
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document.getElementById('root'), <App />);
```

#### Step 4: Remove Render Callbacks

```javascript
// Before
ReactDOM.render(<App />, container, () => {
  console.log('Rendered!');
});

// After
function AppWithCallback() {
  useEffect(() => {
    console.log('Rendered!');
  }, []);
  return <App />;
}
root.render(<AppWithCallback />);
```

#### Step 5: TypeScript Updates

Children prop must be explicit:

```typescript
// Before (implicit)
interface ButtonProps {
  color: string;
}

// After (explicit)
interface ButtonProps {
  color: string;
  children?: React.ReactNode;
}
```

#### Step 6: Update Server Rendering

```javascript
// Before
import { renderToNodeStream } from 'react-dom/server';

// After
import { renderToPipeableStream } from 'react-dom/server';
```

#### Breaking Changes Summary

| Change | Impact |
|--------|--------|
| `createRoot` API | Required for concurrent features |
| Automatic batching | May change update timing |
| Strict Mode double-render | Exposes effect cleanup issues |
| TypeScript children | Requires explicit typing |
| IE no longer supported | Stay on React 17 if needed |

---

### React 18 to 19 Migration

#### Deprecated APIs

| Deprecated | Replacement |
|------------|-------------|
| `forwardRef` | `ref` as prop |
| `Context.Provider` | `<Context>` directly |
| `ReactDOM.useFormState` | `useActionState` |
| Ref callback with `null` | Return cleanup function |

#### Key Changes

1. **ref as prop:**
```jsx
// Update forwardRef components
// Before
const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);

// After
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

2. **Context Provider:**
```jsx
// Before
<MyContext.Provider value={value}>{children}</MyContext.Provider>

// After
<MyContext value={value}>{children}</MyContext>
```

3. **Form State Hook:**
```jsx
// Before (Canary)
import { useFormState } from 'react-dom';

// After (React 19)
import { useActionState } from 'react';
```

---

## Performance Optimization

### When to Use Concurrent Features

Use `useTransition` and `startTransition` for:

- Search/filter result updates
- Tab switching with heavy content
- Navigation between routes
- Any update that can be interrupted

**Do NOT use for:**
- All state updates (causes overhead)
- Urgent user feedback (input values)
- Already fast updates

### Profiling and Monitoring

```jsx
import { Profiler } from 'react';

function App() {
  function onRenderCallback(
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) {
    console.log({
      id,
      phase,
      actualDuration,
      baseDuration,
    });
  }

  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <MainContent />
    </Profiler>
  );
}
```

### Memoization Strategy

Even with React Compiler, understanding memoization helps:

```jsx
// Still useful patterns
const expensiveValue = useMemo(() =>
  computeExpensiveValue(a, b), [a, b]
);

const stableCallback = useCallback(
  () => handleClick(id),
  [id]
);

// For components
const MemoizedList = memo(function List({ items }) {
  return items.map(item => <Item key={item.id} item={item} />);
});
```

### Virtualization for Large Lists

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              height: virtualItem.size,
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Best Practices

### Suspense Boundaries

1. **Don't over-granularize** - Avoid Suspense around every component
2. **Group related content** - Content that loads together should share a boundary
3. **Design with UX in mind** - Ask where loading states should appear
4. **Use meaningful fallbacks** - Skeleton screens matching layout

### Server Components

1. **Default to Server Components** - Use client only when needed
2. **Minimize client boundary** - Keep interactive parts small
3. **Colocate data fetching** - Fetch where data is used
4. **Use streaming** - Progressive loading improves perceived performance

### Form Handling

1. **Use Actions for mutations** - Cleaner than manual state management
2. **Optimistic updates** - Improve perceived performance
3. **Proper error handling** - Show errors, allow retry
4. **Progressive enhancement** - Forms should work without JS

### General Guidelines

1. **Opt into concurrency gradually** - Don't wrap everything in transitions
2. **Test with StrictMode** - Catches effect cleanup issues
3. **Profile before optimizing** - Measure actual bottlenecks
4. **Keep up with ecosystem** - Libraries evolving for React 18/19

---

## Quick Reference

### React 18 Hooks

| Hook | Purpose |
|------|---------|
| `useTransition` | Mark updates as non-urgent |
| `useDeferredValue` | Defer re-rendering of non-urgent values |
| `useId` | Generate unique IDs |
| `useSyncExternalStore` | Subscribe to external stores |
| `useInsertionEffect` | Insert styles before layout |

### React 19 Hooks

| Hook | Purpose |
|------|---------|
| `useActionState` | Handle form actions with state |
| `useFormStatus` | Access parent form status |
| `useOptimistic` | Optimistic UI updates |
| `use` | Read promises/context in render |

### API Migration

| React 17 | React 18+ |
|----------|-----------|
| `ReactDOM.render` | `createRoot().render` |
| `ReactDOM.hydrate` | `hydrateRoot` |
| `renderToNodeStream` | `renderToPipeableStream` |

---

## Sources

- [React v18.0 Release](https://react.dev/blog/2022/03/29/react-v18)
- [React v19 Release](https://react.dev/blog/2024/12/05/react-19)
- [React 18 Upgrade Guide](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)
- [Suspense Documentation](https://react.dev/reference/react/Suspense)
- [Server Components Documentation](https://react.dev/reference/rsc/server-components)
- [useActionState Documentation](https://react.dev/reference/react/useActionState)
- [React 18 Working Group Discussions](https://github.com/reactwg/react-18/discussions)
- [React Compiler Overview](https://www.developerway.com/posts/react-compiler-soon)
- [Streaming SSR Architecture](https://github.com/reactwg/react-18/discussions/37)
- [Vercel: How React 18 Improves Performance](https://vercel.com/blog/how-react-18-improves-application-performance)
- [Josh Comeau: Making Sense of React Server Components](https://www.joshwcomeau.com/react/server-components/)

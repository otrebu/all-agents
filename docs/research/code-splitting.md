# React Code Splitting: Complete Reference Guide

> Deep research on lazy loading, bundle optimization, and performance patterns for React applications.

## Table of Contents

1. [Overview](#overview)
2. [React.lazy and Suspense](#reactlazy-and-suspense)
3. [Route-Based Code Splitting](#route-based-code-splitting)
4. [Component-Based Code Splitting](#component-based-code-splitting)
5. [Dynamic Imports Syntax](#dynamic-imports-syntax)
6. [Prefetching Strategies](#prefetching-strategies)
7. [Loading States and Fallbacks](#loading-states-and-fallbacks)
8. [Error Handling](#error-handling-for-lazy-components)
9. [Webpack Magic Comments](#webpack-magic-comments)
10. [Vite Configuration](#vite-code-splitting)
11. [Bundle Analysis](#bundle-analysis-and-optimization)
12. [Performance Metrics](#performance-metrics-impact)
13. [Tree Shaking](#tree-shaking-and-dead-code-elimination)
14. [Server-Side Rendering](#server-side-rendering-considerations)
15. [React Server Components](#react-server-components)
16. [Common Patterns](#common-patterns-from-popular-apps)
17. [Best Practices](#best-practices-summary)

---

## Overview

Code splitting is a technique that breaks your JavaScript bundle into smaller chunks, loading only what users need for the current page. This dramatically improves:

- **Initial load time** - Users download less code upfront
- **Time to Interactive (TTI)** - Less JavaScript to parse and execute
- **Memory usage** - Especially important on mobile/low-power devices
- **Perceived performance** - Content appears faster

### When to Use Code Splitting

**Good candidates:**
- Routes/pages not immediately visible
- Heavy components (modals, drawers, rich text editors)
- Admin panels or authenticated sections
- Features with low usage probability
- Third-party libraries used conditionally

**Avoid splitting:**
- Core UI components used everywhere
- Critical above-the-fold content
- Very small components (overhead exceeds benefit)

**Rule of thumb:** If a feature isn't visible on initial page load, it shouldn't block rendering.

---

## React.lazy and Suspense

### Basic API

`React.lazy()` lets you defer loading a component's code until it is rendered for the first time.

```jsx
import React, { Suspense, lazy } from 'react';

// Lazy-load the component
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### How It Works

1. `lazy()` takes a function that returns a Promise (from dynamic `import()`)
2. React won't call this function until the first render attempt
3. The Promise must resolve to a module with a `default` export containing a React component
4. Both the Promise and resolved value are cached (React won't call `load` more than once)
5. If the Promise rejects, React throws the rejection reason to the nearest Error Boundary

### Requirements

- The lazy component must be exported as the **default export**
- Must be wrapped in `<Suspense>` to handle loading states
- Requires bundler support for dynamic `import()` (Webpack, Vite, Rollup, etc.)

### Named Exports Workaround

React.lazy only supports default exports. For named exports, create an intermediate module:

```jsx
// ManyComponents.js
export const ComponentA = () => <div>A</div>;
export const ComponentB = () => <div>B</div>;

// ComponentA.js (intermediate module)
export { ComponentA as default } from './ManyComponents';

// App.js
const ComponentA = lazy(() => import('./ComponentA'));
```

### Critical: Declare Lazy Components at Module Level

```jsx
// BAD - causes state reset on every render
function Editor() {
  const Preview = lazy(() => import('./Preview')); // Don't do this!
  return <Preview />;
}

// GOOD - declared at module level
const Preview = lazy(() => import('./Preview'));

function Editor() {
  return <Preview />;
}
```

---

## Route-Based Code Splitting

Route-based splitting is the highest-impact, lowest-effort optimization. Start here.

### React Router (Manual)

```jsx
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
}
```

### React Router Framework Mode (Automatic)

React Router v7+ in Framework Mode automatically code-splits routes:

```tsx
// routes.ts
import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/contact", "./contact.tsx"),
  route("/about", "./about.tsx"),
] satisfies RouteConfig;
```

When a user visits `/about`, only `about.tsx` loads. The router knows which bundles are needed based on the URL alone.

**Bonus:** Server-only exports (`loader`, `action`, `headers`) are automatically stripped from browser bundles.

### TanStack Router

```tsx
import { createLazyRoute } from '@tanstack/react-router';

// Define the lazy route
export const AboutRoute = createLazyRoute('/about')({
  component: lazy(() => import('./About')),
});
```

### Next.js App Router

Next.js automatically code-splits by route in the `app/` directory. For additional splitting:

```tsx
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Client-only component
});
```

---

## Component-Based Code Splitting

Think beyond routes - split heavy components that aren't immediately visible.

### Modal/Dialog Pattern

```jsx
import { Suspense, lazy, useState } from 'react';

const SettingsModal = lazy(() => import('./SettingsModal'));

function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Settings</button>

      {isOpen && (
        <Suspense fallback={<ModalSkeleton />}>
          <SettingsModal onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
```

### Conditional Feature Loading

```jsx
const AdminPanel = lazy(() => import('./AdminPanel'));
const RichTextEditor = lazy(() => import('./RichTextEditor'));

function Dashboard({ user, showEditor }) {
  return (
    <div>
      <MainContent />

      {user.isAdmin && (
        <Suspense fallback={<AdminSkeleton />}>
          <AdminPanel />
        </Suspense>
      )}

      {showEditor && (
        <Suspense fallback={<EditorSkeleton />}>
          <RichTextEditor />
        </Suspense>
      )}
    </div>
  );
}
```

### Ideal Candidates for Component Splitting

- **Modals and dialogs** - Only load when opened
- **Drawers and sidebars** - Often hidden initially
- **Rich text editors** - Heavy libraries (Quill, TipTap, etc.)
- **Charts and graphs** - Large visualization libraries
- **Admin panels** - Not all users need them
- **Below-the-fold content** - Load after visible content

---

## Dynamic Imports Syntax

Dynamic imports (`import()`) are the foundation of code splitting.

### Basic Syntax

```javascript
// Static import (bundled together)
import { heavyFunction } from './heavy-module';

// Dynamic import (separate chunk, loaded on demand)
const loadHeavy = () => import('./heavy-module');

// Usage
async function doSomething() {
  const { heavyFunction } = await import('./heavy-module');
  heavyFunction();
}
```

### Promise-Based

```javascript
import('./module')
  .then(module => {
    module.doSomething();
  })
  .catch(error => {
    console.error('Failed to load module:', error);
  });
```

### Async/Await

```javascript
async function loadFeature() {
  try {
    const { feature } = await import('./feature');
    feature.init();
  } catch (error) {
    console.error('Failed to load feature:', error);
  }
}
```

### Conditional Loading

```javascript
// Load based on user type
if (user.isPremium) {
  const { PremiumFeatures } = await import('./premium-features');
  PremiumFeatures.activate();
}

// Load based on environment
if (process.env.NODE_ENV === 'development') {
  const { devTools } = await import('./dev-tools');
  devTools.init();
}
```

### Event-Driven Loading

```javascript
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const { analyze } = await import('./analytics');
  analyze(data);
});
```

---

## Prefetching Strategies

Preload components before they're needed to eliminate loading delays.

### 1. Preload on Hover

```jsx
const importModal = () => import('./HeavyModal');
const HeavyModal = lazy(importModal);

function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <button
      onMouseEnter={importModal}  // Start loading on hover
      onClick={() => setIsOpen(true)}
    >
      Open Modal
    </button>
  );
}
```

### 2. Preload After Idle

```jsx
import { lazy, useEffect } from 'react';

const importDashboard = () => import('./Dashboard');
const Dashboard = lazy(importDashboard);

function App() {
  useEffect(() => {
    // Preload when browser is idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(importDashboard);
    } else {
      setTimeout(importDashboard, 200);
    }
  }, []);

  return <Dashboard />;
}
```

### 3. Preload on Route Match (React Router)

```jsx
import { Link, useLocation } from 'react-router-dom';

const importAbout = () => import('./About');
const About = lazy(importAbout);

function NavLink({ to, children }) {
  return (
    <Link
      to={to}
      onMouseEnter={to === '/about' ? importAbout : undefined}
    >
      {children}
    </Link>
  );
}
```

### 4. Using react-lazy-with-preload Library

```jsx
import lazyWithPreload from 'react-lazy-with-preload';

const HeavyComponent = lazyWithPreload(() => import('./HeavyComponent'));

// Preload imperatively
HeavyComponent.preload();

// Or in useEffect
useEffect(() => {
  HeavyComponent.preload();
}, []);
```

### 5. Webpack Prefetch Hints

```jsx
const Modal = lazy(() =>
  import(/* webpackPrefetch: true */ './Modal')
);
```

This adds `<link rel="prefetch">` to the HTML, downloading in idle time.

---

## Loading States and Fallbacks

### Suspense Fallback Basics

```jsx
<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>
```

### Skeleton Components

Match skeleton structure to actual content to prevent layout shift:

```jsx
function CardSkeleton() {
  return (
    <div className="card-skeleton" aria-busy="true" role="status">
      <div className="skeleton-avatar" />
      <div className="skeleton-title" />
      <div className="skeleton-text" />
      <div className="skeleton-text short" />
    </div>
  );
}

// CSS
.card-skeleton {
  animation: pulse 1.5s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .card-skeleton {
    animation: none;
  }
}
```

### Progressive Loading with Nested Suspense

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

**Loading sequence:**
1. `PageSkeleton` shows first
2. `Header` appears when ready; `ContentSkeleton` shows below
3. `MainContent` appears; `SidebarSkeleton` shows
4. `Sidebar` appears last

### Delayed Loading Indicators

Avoid flash of loading state for fast loads:

```jsx
function DelayedSpinner({ delay = 300 }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return show ? <Spinner /> : null;
}

<Suspense fallback={<DelayedSpinner />}>
  <LazyComponent />
</Suspense>
```

### Keeping Stale Content Visible

Use `useDeferredValue` or `startTransition` to avoid replacing visible content:

```jsx
import { Suspense, useState, useDeferredValue } from 'react';

function SearchResults() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <Suspense fallback={<ResultsSkeleton />}>
        <div style={{ opacity: isStale ? 0.7 : 1 }}>
          <Results query={deferredQuery} />
        </div>
      </Suspense>
    </>
  );
}
```

### Transitions for Navigation

```jsx
import { startTransition, useState } from 'react';

function Router() {
  const [page, setPage] = useState('/');

  function navigate(url) {
    startTransition(() => {
      setPage(url);  // Non-urgent update won't hide current content
    });
  }

  return <Routes page={page} />;
}
```

---

## Error Handling for Lazy Components

### Creating an Error Boundary

```jsx
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy load error:', error, errorInfo);
    // Send to error tracking service
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Failed to load component</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={this.handleRetry}>Try Again</button>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Using with Lazy Components

```jsx
import { Suspense, lazy } from 'react';

const LazyDashboard = lazy(() => import('./Dashboard'));

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<DashboardSkeleton />}>
        <LazyDashboard />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Retry Failed Imports

```jsx
function retryImport(importFn, retries = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    importFn()
      .then(resolve)
      .catch((error) => {
        if (retries === 0) {
          reject(error);
          return;
        }
        setTimeout(() => {
          retryImport(importFn, retries - 1, delay).then(resolve, reject);
        }, delay);
      });
  });
}

const Dashboard = lazy(() =>
  retryImport(() => import('./Dashboard'))
);
```

### React Router Error Handling

```jsx
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: "/dashboard",
    lazy: () => import("./Dashboard").catch(() => {
      // Force reload on chunk load failure
      window.location.reload();
      return {};
    }),
    errorElement: (
      <div>
        <h1>Loading Failed</h1>
        <button onClick={() => window.location.reload()}>
          Reload Page
        </button>
      </div>
    ),
  },
]);
```

### Key Limitations of Error Boundaries

Error boundaries do **not** catch errors in:
- Event handlers
- Asynchronous code (setTimeout, requestAnimationFrame, etc.)
- Server-side rendering
- Errors thrown in the error boundary itself

---

## Webpack Magic Comments

Magic comments provide fine-grained control over chunk behavior.

### webpackChunkName

Name your chunks for easier debugging:

```javascript
const Dashboard = lazy(() =>
  import(/* webpackChunkName: "dashboard" */ './Dashboard')
);

// Output: dashboard.chunk.js instead of 1.chunk.js
```

**Required config:**
```javascript
// webpack.config.js
output: {
  chunkFilename: '[name].chunk.js',
}
```

### webpackPrefetch

Prefetch chunks in browser idle time (for future navigation):

```javascript
const About = lazy(() =>
  import(/* webpackPrefetch: true */ './About')
);

// Adds: <link rel="prefetch" href="about.chunk.js">
```

### webpackPreload

Preload chunks parallel to parent (for immediate use):

```javascript
const ChartLibrary = lazy(() =>
  import(/* webpackPreload: true */ 'chart-library')
);

// Adds: <link rel="preload" href="chart-library.chunk.js">
```

### Prefetch vs Preload

| Aspect | Prefetch | Preload |
|--------|----------|---------|
| Start Time | After parent chunk loads | Parallel to parent chunk |
| Priority | Low (idle time) | Medium (instant) |
| Use Case | Future navigation | Immediate rendering |

### webpackMode

Control chunking behavior:

```javascript
// Create a separate chunk for this import
import(/* webpackMode: "lazy" */ './module');

// Include in parent chunk (no code splitting)
import(/* webpackMode: "eager" */ './module');

// Create chunk but load immediately
import(/* webpackMode: "lazy-once" */ './module');
```

### Combining Magic Comments

```javascript
const AdminPanel = lazy(() =>
  import(
    /* webpackChunkName: "admin" */
    /* webpackPrefetch: true */
    './AdminPanel'
  )
);
```

### Common Issues

**Comments stripped by Babel:**
Remove `dynamic-import-webpack` plugin from Babel config.

**Comments stripped by TypeScript:**
Ensure `removeComments: false` in tsconfig.json.

---

## Vite Code Splitting

Vite automatically code-splits based on dynamic imports with zero configuration.

### Automatic Splitting

```javascript
// Vite automatically creates a separate chunk
const Module = lazy(() => import('./Module'));
```

### import.meta.glob()

Load multiple modules dynamically:

```javascript
// Lazy loading (default) - creates separate chunks
const modules = import.meta.glob('./modules/*.js');

// Eager loading - bundles together
const modules = import.meta.glob('./modules/*.js', { eager: true });

// Usage
async function loadModule(name) {
  const module = await modules[`./modules/${name}.js`]();
  return module;
}
```

### Manual Chunks Configuration

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Group vendor dependencies
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Group by feature
          charts: ['chart.js', 'd3'],
          editor: ['@tiptap/core', '@tiptap/react'],
        },
      },
    },
  },
});
```

### Function-Based Manual Chunks

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split large libraries
            if (id.includes('lodash')) return 'lodash';
            if (id.includes('chart')) return 'charts';
            // Group remaining vendor code
            return 'vendor';
          }
        },
      },
    },
  },
});
```

### CSS Code Splitting

```javascript
// vite.config.js
export default defineConfig({
  build: {
    cssCodeSplit: true,  // Default: enabled
    // Set to false to extract all CSS into a single file
  },
});
```

### Built-in Preloading

Vite automatically adds `<link rel="modulepreload">` for entry chunks and their direct imports.

---

## Bundle Analysis and Optimization

### Webpack Bundle Analyzer

```bash
npm install --save-dev webpack-bundle-analyzer
```

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
    }),
  ],
};
```

### Vite Bundle Analyzer

```bash
npm install --save-dev vite-bundle-analyzer
```

```javascript
// vite.config.js
import { analyzer } from 'vite-bundle-analyzer';

export default defineConfig({
  plugins: [
    analyzer({
      analyzerMode: 'static',
    }),
  ],
});
```

### source-map-explorer

```bash
npx source-map-explorer build/static/js/*.js
```

### What to Look For

1. **Duplicate dependencies** - Same library bundled multiple times
2. **Large dependencies** - Consider alternatives or lazy loading
3. **Unused code** - Ensure tree shaking is working
4. **Inefficient splits** - Too many tiny chunks or few huge chunks

### Optimization Strategies

```javascript
// SplitChunksPlugin configuration
optimization: {
  splitChunks: {
    chunks: 'all',
    minSize: 20000,        // Minimum chunk size (20KB)
    maxSize: 244000,       // Maximum chunk size (244KB)
    minChunks: 1,          // Minimum times a module is used
    maxAsyncRequests: 30,  // Maximum parallel async requests
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: -10,
      },
      default: {
        minChunks: 2,
        priority: -20,
        reuseExistingChunk: true,
      },
    },
  },
},
```

### Performance Budgets

```javascript
// webpack.config.js
performance: {
  hints: 'warning',
  maxAssetSize: 250000,      // 250 KB per asset
  maxEntrypointSize: 250000, // 250 KB for entry point
},
```

---

## Performance Metrics Impact

### Key Metrics Affected

| Metric | Impact | Target |
|--------|--------|--------|
| **LCP** (Largest Contentful Paint) | Smaller initial bundle = faster paint | < 2.5s |
| **FCP** (First Contentful Paint) | Less blocking JS = earlier render | < 1.8s |
| **TTI** (Time to Interactive) | Less JS to parse = quicker interactivity | < 3.8s |
| **TBT** (Total Blocking Time) | Fewer long tasks (>50ms) | < 200ms |
| **CLS** (Cumulative Layout Shift) | Proper skeletons prevent shifts | < 0.1 |

### Typical Improvements

- **Initial bundle reduction:** 18-35% smaller with granular splitting
- **Time to Interactive:** Up to 60% improvement in complex applications
- **Lighthouse score:** 15-30 point improvement possible

### Recommended Bundle Sizes

- **Initial JavaScript:** < 250 KB (compressed)
- **Individual chunks:** 30-100 KB (optimal for HTTP/2)
- **CSS:** < 50 KB initial

### Measuring Impact

```javascript
// Performance API
const perfObserver = new PerformanceObserver((entryList) => {
  for (const entry of entryList.getEntries()) {
    console.log(`${entry.name}: ${entry.startTime}ms`);
  }
});

perfObserver.observe({ type: 'largest-contentful-paint', buffered: true });
perfObserver.observe({ type: 'first-input', buffered: true });
```

---

## Tree Shaking and Dead Code Elimination

Tree shaking removes unused exports from your bundles.

### Requirements

1. **Use ES6 modules** (import/export, not require)
2. **Set `sideEffects` in package.json**
3. **Enable production mode** in bundler

### package.json Configuration

```json
{
  "name": "my-library",
  "sideEffects": false
}
```

For files with side effects (like CSS):

```json
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.js"
  ]
}
```

### The `/*#__PURE__*/` Annotation

Help bundlers identify pure expressions:

```javascript
// Without annotation - bundler may keep this
const result = heavyComputation();

// With annotation - safe to remove if unused
const result = /*#__PURE__*/ heavyComputation();
```

### Common Tree Shaking Issues

**Issue 1: CommonJS modules**
```javascript
// BAD - can't tree shake
const { pick } = require('lodash');

// GOOD - tree shakeable
import { pick } from 'lodash-es';
```

**Issue 2: Re-exports barrel files**
```javascript
// components/index.js (barrel file)
export * from './Button';
export * from './Modal';
export * from './Table';

// Consumer - may import everything
import { Button } from './components';

// Better - direct imports
import Button from './components/Button';
```

**Issue 3: Side effects not declared**
```javascript
// This import has side effects (modifies global)
import './polyfills';

// Must be declared in package.json sideEffects
```

---

## Server-Side Rendering Considerations

### React.lazy Limitations

`React.lazy` works with SSR in React 18+, but with caveats:

- Uses streaming SSR with Suspense boundaries
- Falls back to loading state on server, hydrates on client
- May cause layout shift if fallback differs from content

### @loadable/component for Full SSR

For complete SSR support without streaming:

```bash
npm install @loadable/component @loadable/server
```

```jsx
import loadable from '@loadable/component';

const Dashboard = loadable(() => import('./Dashboard'), {
  fallback: <DashboardSkeleton />,
});

// Works on both server and client
function App() {
  return <Dashboard />;
}
```

**Server setup:**
```javascript
import { ChunkExtractor } from '@loadable/server';

const extractor = new ChunkExtractor({ statsFile });
const jsx = extractor.collectChunks(<App />);

const html = ReactDOMServer.renderToString(jsx);
const scriptTags = extractor.getScriptTags();
```

### React.lazy vs @loadable/component

| Feature | React.lazy | @loadable/component |
|---------|-----------|---------------------|
| Suspense | Required | Optional |
| SSR (React 18+) | Streaming only | Full support |
| Library splitting | No | Yes |
| Full dynamic import | No | Yes |
| Bundle size | 0 KB | ~2 KB |

### When to Use Each

- **React.lazy:** Client-only apps, React 18+ with streaming SSR
- **@loadable/component:** Traditional SSR, complex splitting needs

---

## React Server Components

React Server Components (RSC) offer a different approach to code splitting.

### How RSC Differs

| Aspect | React.lazy | Server Components |
|--------|-----------|-------------------|
| Rendering | Client | Server |
| JS sent to browser | Yes (deferred) | No (zero-bundle) |
| Data fetching | Client-side | Server-side |
| Interactivity | Full | None (use Client Components) |

### Automatic Code Splitting

In Next.js App Router, Server Components are the default:

```tsx
// app/dashboard/page.tsx (Server Component by default)
async function Dashboard() {
  const data = await fetchData(); // Runs on server
  return <DashboardUI data={data} />;
}
```

Only Client Components (`'use client'`) add to the JavaScript bundle.

### Combining RSC with Suspense

```tsx
import { Suspense } from 'react';

async function SlowComponent() {
  const data = await slowFetch();
  return <div>{data}</div>;
}

export default function Page() {
  return (
    <div>
      <FastContent />
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />
      </Suspense>
    </div>
  );
}
```

### Best Practices for RSC (2025)

1. **Default to Server Components** - Only use Client Components for interactivity
2. **Wrap slow components in Suspense** - Progressive rendering
3. **Keep interactivity surface small** - Minimize Client Component usage
4. **Colocate data fetching** - Fetch in Server Components near where data is used

---

## Common Patterns from Popular Apps

### Netflix Pattern

Netflix uses server-rendered React for initial load, then progressively enhances:

1. Server renders critical content
2. Client-side React activates on demand
3. Heavy features load when needed

**Key insight:** "Start with React on the server, then activate client-side parts if you need them, when you need them."

### Route-Based + Component-Based Hybrid

```jsx
// Route-level splitting
const routes = [
  { path: '/', component: lazy(() => import('./Home')) },
  { path: '/shop', component: lazy(() => import('./Shop')) },
];

// Component-level splitting within routes
function Shop() {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div>
      <ProductGrid />
      <button onClick={() => setShowFilters(true)}>Filters</button>

      {showFilters && (
        <Suspense fallback={<FiltersSkeleton />}>
          <AdvancedFilters />  {/* Lazy loaded */}
        </Suspense>
      )}
    </div>
  );
}
```

### Progressive Enhancement Pattern

```jsx
function App() {
  return (
    <Suspense fallback={<AppShell />}>
      <Header />
      <Suspense fallback={<MainSkeleton />}>
        <MainContent />
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
          <Suspense fallback={<RecommendationsSkeleton />}>
            <Recommendations />
          </Suspense>
        </Suspense>
      </Suspense>
    </Suspense>
  );
}
```

### Preload on Intent Pattern

```jsx
const importCheckout = () => import('./Checkout');
const Checkout = lazy(importCheckout);

function Cart() {
  return (
    <div>
      <CartItems />
      <Link
        to="/checkout"
        onMouseEnter={importCheckout}  // Preload on hover
        onFocus={importCheckout}       // Preload on focus (keyboard nav)
      >
        Proceed to Checkout
      </Link>
    </div>
  );
}
```

---

## Best Practices Summary

### Do

1. **Start with route-based splitting** - 15 minutes of work, massive impact
2. **Split heavy components** - Modals, editors, charts, admin panels
3. **Use meaningful loading states** - Skeletons that match content structure
4. **Prefetch likely navigation** - On hover, on idle, or with magic comments
5. **Analyze bundles regularly** - Use bundle analyzers to find opportunities
6. **Handle errors gracefully** - Wrap lazy components with Error Boundaries
7. **Measure performance impact** - Track LCP, TTI, TBT before and after
8. **Keep initial bundle < 250 KB** - Target for good performance
9. **Use ES modules** - Required for tree shaking
10. **Declare lazy components at module level** - Avoid re-creating on render

### Don't

1. **Over-split** - Too many small chunks can hurt performance
2. **Split tiny components** - Overhead exceeds benefit
3. **Forget error handling** - Network failures happen
4. **Ignore layout shift** - Design skeletons to match content
5. **Bundle everything lazily** - Critical UI should load immediately
6. **Skip bundle analysis** - You can't optimize what you don't measure
7. **Use CommonJS for libraries** - Breaks tree shaking
8. **Declare lazy components inside components** - Causes state reset

### Performance Budget Guidelines

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| Initial JS | < 250 KB | Split more aggressively |
| Chunk size | 30-100 KB | Adjust splitting strategy |
| LCP | < 2.5s | Prioritize critical content |
| TTI | < 3.8s | Reduce/defer JS execution |

---

## References

- [React.lazy Documentation](https://react.dev/reference/react/lazy)
- [React Suspense Documentation](https://react.dev/reference/react/Suspense)
- [Webpack Code Splitting Guide](https://webpack.js.org/guides/code-splitting/)
- [Vite Build Options](https://vite.dev/config/build-options)
- [React Router Code Splitting](https://reactrouter.com/explanation/code-splitting)
- [web.dev: Code Splitting with React.lazy](https://web.dev/code-splitting-suspense/)
- [Loadable Components](https://loadable-components.com/)
- [React 18 SSR Architecture](https://github.com/reactwg/react-18/discussions/37)

---

*Last updated: December 2024*

# Bundle Optimization: Splitting Strategies and Lazy Loading

> Comprehensive reference for optimizing JavaScript bundle sizes through code splitting, lazy loading, tree shaking, and best practices.

## Table of Contents

1. [Code Splitting Strategies](#code-splitting-strategies)
2. [Vendor Chunk Optimization](#vendor-chunk-optimization)
3. [Dynamic Imports and Lazy Loading](#dynamic-imports-and-lazy-loading)
4. [Route-Based Splitting](#route-based-splitting)
5. [Component-Based Splitting](#component-based-splitting)
6. [Manual Chunks Configuration](#manual-chunks-configuration)
7. [Tree Shaking Best Practices](#tree-shaking-best-practices)
8. [Side Effects Configuration](#side-effects-configuration)
9. [ESM vs CommonJS Bundle Sizes](#esm-vs-commonjs-bundle-sizes)
10. [Dead Code Elimination](#dead-code-elimination)
11. [Import Cost Awareness](#import-cost-awareness)
12. [Barrel File Anti-Pattern](#barrel-file-anti-pattern)
13. [Bundle Budgets](#bundle-budgets)
14. [Bundle Analysis Tools](#bundle-analysis-tools)
15. [Framework-Specific Patterns](#framework-specific-patterns)

---

## Code Splitting Strategies

Code splitting divides your application into smaller bundles that can be loaded on demand, reducing initial load time.

### Three General Approaches

#### 1. Entry Points (Manual Splitting)

Manually split code using webpack's entry configuration:

```javascript
// webpack.config.js
module.exports = {
  entry: {
    index: './src/index.js',
    admin: './src/admin.js',
    vendor: './src/vendor.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
```

**Drawbacks**:
- Duplicated modules may appear in multiple bundles
- Manual maintenance required
- Less flexible than automatic splitting

#### 2. Prevent Duplication (SplitChunksPlugin)

Use webpack's `SplitChunksPlugin` for automatic deduplication:

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all', // Split both async and initial chunks
    },
  },
};
```

With entry dependencies for shared modules:

```javascript
module.exports = {
  entry: {
    index: {
      import: './src/index.js',
      dependOn: 'shared',
    },
    another: {
      import: './src/another-module.js',
      dependOn: 'shared',
    },
    shared: 'lodash',
  },
  optimization: {
    runtimeChunk: 'single', // Extract runtime into separate chunk
  },
};
```

#### 3. Dynamic Imports (Recommended)

Use dynamic `import()` syntax for on-demand loading:

```javascript
// Async/await pattern
async function loadComponent() {
  const { default: Component } = await import('./HeavyComponent.js');
  return Component;
}

// Promise pattern
import('./analytics.js').then(module => {
  module.trackPageView();
});
```

### When to Use Each Approach

| Approach | Use Case |
|----------|----------|
| Entry Points | Multiple distinct applications, micro-frontends |
| SplitChunksPlugin | Shared dependencies, automatic optimization |
| Dynamic Imports | Routes, modals, conditionally loaded features |

---

## Vendor Chunk Optimization

Separating vendor (third-party) code from application code improves caching efficiency.

### Basic Vendor Chunk Configuration

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
};
```

### Granular Vendor Splitting

Split specific libraries into separate chunks for better caching:

```javascript
optimization: {
  splitChunks: {
    cacheGroups: {
      // React ecosystem in one chunk
      react: {
        test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
        name: 'vendor-react',
        chunks: 'all',
        priority: 20,
      },
      // UI library
      ui: {
        test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
        name: 'vendor-ui',
        chunks: 'all',
        priority: 15,
      },
      // Other vendors
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 10,
      },
    },
  },
}
```

### Runtime Chunk Extraction

Always extract the webpack runtime for consistent caching:

```javascript
optimization: {
  runtimeChunk: 'single',
  // or
  runtimeChunk: {
    name: 'runtime',
  },
}
```

### Default Splitting Conditions

Webpack automatically splits chunks when:
- New chunk can be shared OR modules are from `node_modules`
- New chunk would be larger than 20kb (before min+gz)
- Maximum of 30 parallel requests when loading chunks on demand
- Maximum of 30 parallel requests at initial page load

---

## Dynamic Imports and Lazy Loading

Dynamic imports enable loading JavaScript modules on demand, reducing initial bundle size.

### Basic Dynamic Import

```javascript
// Instead of static import
// import { heavyFunction } from './heavy-module';

// Use dynamic import
const loadHeavyModule = async () => {
  const { heavyFunction } = await import('./heavy-module');
  return heavyFunction();
};
```

### Named Chunks with Magic Comments

```javascript
// webpack magic comments for chunk naming
const AdminPanel = () => import(
  /* webpackChunkName: "admin-panel" */
  './AdminPanel'
);

// Prefetch during idle time (low priority)
const LoginModal = () => import(
  /* webpackChunkName: "login-modal" */
  /* webpackPrefetch: true */
  './LoginModal'
);

// Preload in parallel with parent (high priority)
const ChartLibrary = () => import(
  /* webpackChunkName: "charts" */
  /* webpackPreload: true */
  './ChartLibrary'
);
```

### Prefetch vs Preload

| Feature | Prefetch | Preload |
|---------|----------|---------|
| Priority | Low (idle time) | High (parallel) |
| When | Future navigation likely | Current navigation needs |
| HTML Output | `<link rel="prefetch">` | `<link rel="preload">` |
| Use Case | Login modal, settings | Critical path resources |

### Vite Dynamic Imports

Vite handles dynamic imports automatically with optimizations:

```javascript
// Vite automatically code-splits dynamic imports
const Component = () => import('./Component.vue');

// With Vite's glob import
const modules = import.meta.glob('./modules/*.js');

// Eager loading option (no code splitting)
const eagerModules = import.meta.glob('./modules/*.js', { eager: true });
```

---

## Route-Based Splitting

Route-level code splitting loads route components only when navigated to.

### React Router v6+ with React.lazy

```javascript
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load route components
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

### React Router v6.9+ Native Lazy

```javascript
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    lazy: () => import('./pages/Home'),
  },
  {
    path: '/dashboard',
    // Separate loader and component loading
    lazy: () => import('./pages/Dashboard'),
  },
  {
    path: '/settings',
    lazy: {
      loader: () => import('./pages/Settings/loader').then(m => m.loader),
      Component: () => import('./pages/Settings/component').then(m => m.Component),
    },
  },
]);
```

### React Router Framework Mode (Automatic)

When using React Router's framework features, code splitting is automatic:

```javascript
// app/routes/dashboard.tsx - automatically code split
export default function Dashboard() {
  return <div>Dashboard</div>;
}

// Loaders are also automatically split
export async function loader() {
  return await fetchDashboardData();
}
```

### TanStack Router

```javascript
import { createLazyFileRoute } from '@tanstack/react-router';

// Lazy route definition
export const Route = createLazyFileRoute('/dashboard')({
  component: () => import('./Dashboard'),
});
```

### Next.js Dynamic Imports

```javascript
import dynamic from 'next/dynamic';

// Client-side only component
const Chart = dynamic(() => import('../components/Chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

// With named exports
const SpecificComponent = dynamic(() =>
  import('../components/library').then(mod => mod.SpecificComponent)
);
```

---

## Component-Based Splitting

Split individual components that are conditionally rendered or heavy.

### React.lazy for Components

```javascript
import { lazy, Suspense, useState } from 'react';

// Heavy component loaded on demand
const HeavyChart = lazy(() => import('./HeavyChart'));
const RichTextEditor = lazy(() => import('./RichTextEditor'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      <button onClick={() => setShowEditor(true)}>Show Editor</button>

      <Suspense fallback={<Skeleton />}>
        {showChart && <HeavyChart />}
        {showEditor && <RichTextEditor />}
      </Suspense>
    </div>
  );
}
```

### Preloading Components

```javascript
// Preload on hover/focus for perceived performance
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function Button() {
  const preload = () => {
    // Trigger the import without rendering
    import('./HeavyComponent');
  };

  return (
    <button
      onMouseEnter={preload}
      onFocus={preload}
      onClick={() => setShowComponent(true)}
    >
      Open Heavy Component
    </button>
  );
}
```

### Modal Pattern

```javascript
const SettingsModal = lazy(() => import('./SettingsModal'));

function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Settings</button>

      {isOpen && (
        <Suspense fallback={<ModalSkeleton />}>
          <SettingsModal onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
```

### Suspense Best Practices

```javascript
// Multiple Suspense boundaries for granular loading
function Dashboard() {
  return (
    <div>
      {/* Header loads independently */}
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      {/* Main content with its own boundary */}
      <Suspense fallback={<ContentSkeleton />}>
        <MainContent />
        <Sidebar />
      </Suspense>

      {/* Footer can load last */}
      <Suspense fallback={<FooterSkeleton />}>
        <Footer />
      </Suspense>
    </div>
  );
}
```

---

## Manual Chunks Configuration

Configure specific modules into named chunks for optimal caching and loading.

### Webpack SplitChunksPlugin Deep Dive

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,           // Minimum chunk size (bytes)
      minRemainingSize: 0,      // Minimum remaining size after split
      minChunks: 1,             // Minimum times a module is shared
      maxAsyncRequests: 30,     // Max parallel async chunk requests
      maxInitialRequests: 30,   // Max parallel initial chunk requests
      enforceSizeThreshold: 50000,
      cacheGroups: {
        // Framework libraries (highest priority)
        framework: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'framework',
          priority: 40,
          chunks: 'all',
          enforce: true, // Ignore size thresholds
        },
        // Utility libraries
        utilities: {
          test: /[\\/]node_modules[\\/](lodash|date-fns|axios)[\\/]/,
          name: 'utilities',
          priority: 30,
          chunks: 'all',
        },
        // UI component libraries
        ui: {
          test: /[\\/]node_modules[\\/](@radix-ui|@headlessui)[\\/]/,
          name: 'ui-components',
          priority: 25,
          chunks: 'all',
        },
        // All other node_modules
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          chunks: 'all',
        },
        // Shared application code
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
  },
};
```

### Vite/Rollup manualChunks

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Object syntax for simple grouping
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          utils: ['date-fns', 'lodash-es'],
        },
      },
    },
  },
});
```

### Function-Based manualChunks

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Group React-related packages
          if (id.includes('node_modules/react')) {
            return 'react-vendor';
          }

          // Group charting libraries
          if (id.includes('node_modules/chart.js') ||
              id.includes('node_modules/d3')) {
            return 'charts';
          }

          // Group all other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }

          // Group components by feature
          if (id.includes('src/features/dashboard')) {
            return 'dashboard';
          }
        },
      },
    },
  },
});
```

### Advanced Chunking Strategy

```javascript
// Real-world manualChunks for complex applications
function manualChunks(id) {
  // Define specific library chunks for lazy loading
  const lazyChunks = {
    '/highlight.js/': 'highlight',
    '/prettier/': 'prettier',
    '/monaco-editor/': 'monaco',
    '/@zip.js/': 'zipjs',
  };

  for (const [pattern, chunkName] of Object.entries(lazyChunks)) {
    if (id.includes(pattern)) {
      return chunkName;
    }
  }

  // Group remaining node_modules
  if (id.includes('node_modules')) {
    return 'vendor';
  }
}
```

---

## Tree Shaking Best Practices

Tree shaking eliminates unused code from your bundles through static analysis.

### Requirements for Tree Shaking

1. **Use ES Modules** - `import`/`export` syntax
2. **Set production mode** - Enables optimizations
3. **Configure sideEffects** - Declare pure modules
4. **Avoid transpiling to CommonJS** - Keep ESM syntax

### Webpack Configuration

```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  optimization: {
    usedExports: true,    // Mark unused exports
    minimize: true,       // Enable minification
    sideEffects: true,    // Read sideEffects from package.json
  },
};
```

### Babel Configuration (Preserve ESM)

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', {
      modules: false, // Don't transpile ES modules
    }],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
};
```

### Writing Tree-Shakeable Code

```javascript
// BAD: Default exports are harder to tree-shake
export default {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
};

// GOOD: Named exports enable tree shaking
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;
```

```javascript
// BAD: Importing entire library
import _ from 'lodash';
const result = _.get(obj, 'path');

// GOOD: Import specific functions
import { get } from 'lodash-es';
// or
import get from 'lodash/get';
```

### Pure Function Annotation

```javascript
// Mark function calls as side-effect-free
const result = /*#__PURE__*/ createExpensiveObject();

// Helps minifiers remove unused code
export const Component = /*#__PURE__*/ memo(function Component() {
  return <div />;
});
```

---

## Side Effects Configuration

The `sideEffects` field in `package.json` tells bundlers which files can be safely removed if their exports are unused.

### What Are Side Effects?

A side effect is code that performs actions beyond exporting values:

- Global variable modifications
- CSS imports (apply styles)
- Polyfills (extend prototypes)
- Event listeners
- Console logs

### package.json Configuration

```json
{
  "name": "my-library",
  "sideEffects": false
}
```

For libraries with CSS or polyfills:

```json
{
  "name": "my-ui-library",
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.js",
    "./src/styles/**/*"
  ]
}
```

### Per-Module Configuration

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        sideEffects: false,
      },
      {
        test: /\.css$/,
        sideEffects: true, // CSS has side effects
      },
    ],
  },
};
```

### Common Pitfalls

```javascript
// This file has side effects - don't mark as sideEffects: false
import './polyfills'; // Extends global scope
import './analytics'; // Sends tracking data

// This module is pure - safe to mark as sideEffects: false
export const utils = {
  format: (date) => date.toISOString(),
  parse: (str) => new Date(str),
};
```

---

## ESM vs CommonJS Bundle Sizes

ES Modules (ESM) produce significantly smaller bundles than CommonJS (CJS).

### Why ESM is Smaller

| Feature | ESM | CommonJS |
|---------|-----|----------|
| Static Analysis | Yes | No |
| Tree Shaking | Full support | Very limited |
| Dynamic Exports | Not possible | Possible |
| Bundle Size | Smaller | Larger |

### Real-World Impact

In one comparison, a CommonJS bundle was **625KB vs 40 bytes** for the equivalent ESM code - demonstrating how CommonJS prevents tree shaking entirely.

### Why CommonJS Can't Be Tree-Shaken

```javascript
// CommonJS allows dynamic exports - can't be analyzed at build time
module.exports[dynamicKey()] = value;
module.exports[localStorage.getItem('key')] = value;

// ESM requires static exports - fully analyzable
export const value = 123;
export { value as alias };
```

### Migration to ESM

```javascript
// package.json
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

### Checking Package ESM Support

```bash
# Check if a package supports ESM
npx is-esm lodash-es  # ESM
npx is-esm lodash     # CommonJS
```

### Using ESM Alternatives

```javascript
// Instead of CommonJS packages
import _ from 'lodash';           // CommonJS, poor tree shaking

// Use ESM versions
import { debounce } from 'lodash-es';  // ESM, tree-shakeable
import debounce from 'lodash/debounce'; // Direct import
```

---

## Dead Code Elimination

Dead code elimination (DCE) removes code that will never execute.

### How DCE Works

1. **Unreachable Code Removal**
   ```javascript
   function example() {
     return true;
     console.log('Never runs'); // Removed
   }
   ```

2. **Constant Folding**
   ```javascript
   // Before
   if (process.env.NODE_ENV === 'production') {
     // production code
   } else {
     // development code - removed in production build
   }

   // After (production build)
   if (true) {
     // production code
   }
   ```

3. **Unused Variable Elimination**
   ```javascript
   const unused = expensiveComputation(); // Removed if never used
   const used = anotherFunction();
   console.log(used);
   ```

### Terser vs esbuild

| Feature | Terser | esbuild |
|---------|--------|---------|
| Speed | Slower | 10-100x faster |
| Compression | Slightly better | Good |
| DCE Quality | Excellent | Very good |
| PURE annotations | Yes | Yes |

### Environment-Based DCE

```javascript
// webpack.config.js
const webpack = require('webpack');

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      __DEV__: false,
    }),
  ],
};
```

```javascript
// Code that will be eliminated in production
if (__DEV__) {
  console.log('Debug info');
  validateProps(props);
}
```

---

## Import Cost Awareness

Understanding the size impact of imports helps make informed decisions.

### Import Cost VSCode Extension

The [Import Cost extension](https://marketplace.visualstudio.com/items?itemName=wix.vscode-import-cost) shows package sizes inline:

```javascript
import moment from 'moment';     // 288.4KB (gzipped: 72.3KB) - RED
import { format } from 'date-fns'; // 10.2KB (gzipped: 3.2KB) - GREEN
```

Configuration:
```json
{
  "importCost.smallPackageSize": 50,
  "importCost.mediumPackageSize": 100,
  "importCost.smallPackageColor": "#7cc36e",
  "importCost.mediumPackageColor": "#7cc36e",
  "importCost.largePackageColor": "#d44e40"
}
```

### Bundlephobia

Check package sizes before installing:

```bash
# Visit bundlephobia.com or use CLI
npx bundlephobia lodash
# Minified: 71.5kB
# Minified + gzipped: 25.2kB
```

### Size-Conscious Import Patterns

```javascript
// BAD: Importing entire libraries
import * as Yup from 'yup';
import moment from 'moment';
import _ from 'lodash';

// GOOD: Selective imports
import { object, string } from 'yup';
import { format, parseISO } from 'date-fns';
import debounce from 'lodash/debounce';
```

### Lightweight Alternatives

| Heavy Library | Size | Alternative | Size |
|--------------|------|-------------|------|
| moment | 72KB | date-fns | 13KB (tree-shaken) |
| moment | 72KB | dayjs | 2KB |
| lodash | 71KB | lodash-es (tree-shaken) | ~5KB |
| axios | 14KB | ky | 3KB |
| uuid | 9KB | nanoid | 130B |

---

## Barrel File Anti-Pattern

Barrel files (`index.js` that re-exports) cause significant performance issues.

### What Are Barrel Files?

```javascript
// src/components/index.js (barrel file)
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';
export { Table } from './Table';
// ... 50 more exports
```

### Why They're Problematic

1. **Module Graph Explosion**: Each import pulls in the entire dependency chain
2. **Build Performance**: 60-80% slower builds in large codebases
3. **Test Performance**: Every test file loads all barrel dependencies
4. **Poor Tree Shaking**: Bundlers struggle to eliminate unused exports
5. **Circular Dependencies**: Barrels often create hidden cycles

### Real-World Impact (Atlassian Case Study)

- Build time decreased by ~25%
- Page sizes (HTML + JS) decreased by 5-10%
- Test selection improved by 70%
- Single test runs became significantly faster

### Avoiding Barrel Files

```javascript
// BEFORE: Using barrel file
import { Button, Input } from '@/components';

// AFTER: Direct imports
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
```

### ESLint Rule

```bash
npm install eslint-plugin-no-barrel-files
```

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['no-barrel-files'],
  rules: {
    'no-barrel-files/no-barrel-files': 'error',
  },
};
```

### When Barrels Are Acceptable

- Small libraries with few exports
- TypeScript type-only exports (no runtime impact)
- Public API surface for npm packages (single entry point)

### Next.js optimizePackageImports

```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      '@heroicons/react',
    ],
  },
};
```

This skips barrel files and imports directly from the source.

---

## Bundle Budgets

Performance budgets prevent bundle size regression.

### Setting Budgets in Webpack

```javascript
// webpack.config.js
module.exports = {
  performance: {
    hints: 'error', // 'warning' | 'error' | false
    maxAssetSize: 150 * 1024,      // 150 KB per asset
    maxEntrypointSize: 300 * 1024, // 300 KB per entrypoint
    assetFilter: (assetFilename) => {
      // Only check JS and CSS
      return /\.(js|css)$/.test(assetFilename);
    },
  },
};
```

### bundlesize Tool

```json
// package.json
{
  "bundlesize": [
    {
      "path": "./dist/main.*.js",
      "maxSize": "170 kB"
    },
    {
      "path": "./dist/vendor.*.js",
      "maxSize": "250 kB"
    },
    {
      "path": "./dist/*.css",
      "maxSize": "20 kB"
    }
  ]
}
```

### Lighthouse CI Budgets

```json
// lighthouserc.json
{
  "ci": {
    "assert": {
      "budgets": [
        {
          "resourceSizes": [
            { "resourceType": "script", "budget": 300 },
            { "resourceType": "stylesheet", "budget": 50 }
          ],
          "resourceCounts": [
            { "resourceType": "third-party", "budget": 10 }
          ]
        }
      ]
    }
  }
}
```

### Recommended Budget Guidelines

| Metric | Budget | Reason |
|--------|--------|--------|
| Initial JS | < 170 KB gzipped | Fast 3G load |
| Critical CSS | < 14 KB | Above-the-fold styles |
| Total JS | < 350 KB gzipped | Reasonable total size |
| Time to Interactive | < 5s on 3G | User experience |
| First Contentful Paint | < 2s | Perceived speed |

---

## Bundle Analysis Tools

Visualize and analyze your bundles to identify optimization opportunities.

### webpack-bundle-analyzer

```bash
npm install --save-dev webpack-bundle-analyzer
```

```javascript
// webpack.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
    }),
  ],
};
```

Reports three size values:
- **Stat size**: Size before minification
- **Parsed size**: Size after minification
- **Gzip size**: Compressed size

### Rollup Visualizer (Vite)

```bash
npm install --save-dev rollup-plugin-visualizer
```

```javascript
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

### source-map-explorer

```bash
npm install --save-dev source-map-explorer
npx source-map-explorer dist/main.js dist/main.js.map
```

Works with any bundler that produces source maps.

### Statoscope

```bash
npm install --save-dev @statoscope/webpack-plugin
```

```javascript
const StatoscopeWebpackPlugin = require('@statoscope/webpack-plugin').default;

module.exports = {
  plugins: [
    new StatoscopeWebpackPlugin({
      saveTo: './stats/report.html',
      saveStatsTo: './stats/stats.json',
    }),
  ],
};
```

Features:
- Interactive treemap
- Module dependency graph
- Build comparison over time
- Identifies why modules are bundled

---

## Framework-Specific Patterns

### React

```javascript
// Route-level splitting with Suspense
const Dashboard = lazy(() => import('./Dashboard'));

function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Next.js

```javascript
// pages/dashboard.tsx - automatically code split
export default function Dashboard() {
  return <DashboardContent />;
}

// Dynamic imports with options
const HeavyChart = dynamic(() => import('../components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Client-side only
});
```

### Vue

```javascript
// router/index.js
const routes = [
  {
    path: '/dashboard',
    component: () => import('@/views/Dashboard.vue'),
  },
];

// Async components
const AsyncComponent = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200,
  timeout: 3000,
});
```

### Vite 8 (Rolldown) - December 2025

```javascript
// vite.config.js
export default defineConfig({
  build: {
    // Rolldown is now the default bundler
    // Faster builds with same configuration API
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
```

---

## Quick Reference Checklist

### Before Shipping

- [ ] Enable production mode
- [ ] Configure code splitting for routes
- [ ] Set up vendor chunking
- [ ] Enable tree shaking (ESM, sideEffects)
- [ ] Set performance budgets
- [ ] Run bundle analyzer
- [ ] Check for barrel file usage
- [ ] Verify no CommonJS dependencies blocking tree shaking

### Optimization Priority

1. **High Impact**: Route-based code splitting
2. **High Impact**: Remove/replace heavy dependencies
3. **Medium Impact**: Vendor chunk optimization
4. **Medium Impact**: Remove barrel files
5. **Lower Impact**: Manual chunk tuning
6. **Ongoing**: Bundle budget enforcement

---

## Sources and Further Reading

- [Webpack Code Splitting Guide](https://webpack.js.org/guides/code-splitting/)
- [Webpack SplitChunksPlugin](https://webpack.js.org/plugins/split-chunks-plugin/)
- [Webpack Tree Shaking Guide](https://webpack.js.org/guides/tree-shaking/)
- [Vite Building for Production](https://vite.dev/guide/build)
- [React lazy Documentation](https://react.dev/reference/react/lazy)
- [React Router Lazy Loading](https://reactrouter.com/en/main/route/lazy)
- [CommonJS Larger Bundles - web.dev](https://web.dev/articles/commonjs-larger-bundles)
- [Barrel File Debacle - Marvin Hagemeister](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/)
- [Atlassian: Faster Builds by Removing Barrel Files](https://www.atlassian.com/blog/atlassian-engineering/faster-builds-when-removing-barrel-files)
- [Performance Budgets - MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Performance_budgets)
- [Import Cost VSCode Extension](https://marketplace.visualstudio.com/items?itemName=wix.vscode-import-cost)
- [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [Next.js Lazy Loading](https://nextjs.org/docs/pages/building-your-application/optimizing/lazy-loading)
- [Vite 8 Beta Announcement](https://vite.dev/blog/announcing-vite8-beta)

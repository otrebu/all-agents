# rollup-plugin-visualizer

> Comprehensive guide to bundle analysis and visualization for Rollup, Vite, and Rolldown projects.

## Overview

`rollup-plugin-visualizer` is a development tool that creates interactive visualizations of your production bundles, helping you identify large dependencies, code splitting inefficiencies, and optimization opportunities. The plugin generates standalone HTML files with interactive diagrams showing module sizes and relationships.

**Key capabilities:**

- Visualize bundle composition with multiple diagram types
- Identify large dependencies consuming disproportionate space
- Detect code duplication across modules
- Measure compression impact (gzip/brotli)
- Trace import chains to understand why modules are included
- Compare builds over time in CI

**Latest version:** 6.0.5
**Requirements:** ESM-only, Node.js >= 22
**GitHub stars:** ~3,900
**Weekly downloads:** ~3.2M

---

## Installation

```bash
# npm
npm install --save-dev rollup-plugin-visualizer

# pnpm
pnpm add -D rollup-plugin-visualizer

# yarn
yarn add -D rollup-plugin-visualizer

# bun
bun add -D rollup-plugin-visualizer
```

---

## Setup with Vite

### Basic Configuration

```typescript
// vite.config.ts
import { defineConfig, type PluginOption } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    // ... other plugins
    visualizer() as PluginOption,  // MUST be last
  ],
});
```

### Production Analysis Configuration

```typescript
// vite.config.ts
import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      template: 'treemap',
      open: true,           // Auto-open in browser after build
      gzipSize: true,       // Show gzip sizes
      brotliSize: true,     // Show brotli sizes
      sourcemap: true,      // Use sourcemaps for accurate post-minification sizes
    }) as PluginOption,
  ],
  build: {
    sourcemap: true,        // Required for accurate size analysis
  },
});
```

### Conditional Analysis (Production Only)

```typescript
// vite.config.ts
import { defineConfig, type PluginOption } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  plugins: [
    // Only include visualizer in analyze mode
    mode === 'analyze' && visualizer({
      open: true,
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true,
    }) as PluginOption,
  ].filter(Boolean),
}));
```

Usage: `vite build --mode analyze`

### SvelteKit Configuration

```javascript
// svelte.config.js
import { visualizer } from 'rollup-plugin-visualizer';

const config = {
  kit: {
    vite: {
      plugins: [
        visualizer({
          emitFile: true,
          filename: 'stats.html',
        }),
      ],
    },
  },
};

export default config;
```

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `filename` | `string` | `"stats.html"` | Output file name (extension determines format) |
| `title` | `string` | `"Rollup Visualizer"` | HTML title tag |
| `open` | `boolean` | `false` | Auto-open browser after build |
| `template` | `string` | `"treemap"` | Visualization type (see below) |
| `gzipSize` | `boolean` | `false` | Calculate and display gzip sizes |
| `brotliSize` | `boolean` | `false` | Calculate and display brotli sizes |
| `sourcemap` | `boolean` | `false` | Use sourcemaps for accurate post-minification sizes |
| `emitFile` | `boolean` | `false` | Use Rollup's emitFile API (for output plugins) |
| `projectRoot` | `string \| RegExp` | `process.cwd()` | Root path to strip from file paths |
| `include` | `FilterPattern` | - | Glob patterns for files to include |
| `exclude` | `FilterPattern` | - | Glob patterns for files to exclude |

---

## Visualization Types (Templates)

### treemap (default)

Rectangular hierarchical diagram ideal for identifying large modules at a glance.

```typescript
visualizer({ template: 'treemap' })
```

**Best for:** Quick identification of large dependencies, overall bundle composition.

### sunburst

Circular hierarchical diagram. Click any arc to zoom in for detailed inspection.

```typescript
visualizer({ template: 'sunburst' })
```

**Best for:** Exploring nested dependencies, finding repeated code in different parts of the bundle.

### network

Interactive dependency graph showing import relationships between modules.

```typescript
visualizer({ template: 'network' })
```

**Best for:** Understanding why a module was included, tracing import chains, identifying unexpected dependencies.

**Tips for network view:**
- Remove highly connected nodes first (commonjsHelpers, tslib, react) for clearer visualization
- Click nodes to highlight importing files
- Gray nodes indicate tree-shaken modules

### flamegraph

Top-down hierarchical view familiar from performance profiling tools.

```typescript
visualizer({ template: 'flamegraph' })
```

**Best for:** Developers familiar with CPU/memory profiling tools.

### list

YAML output with complete module data.

```typescript
visualizer({ template: 'list', filename: 'stats.yml' })
```

**Best for:** Programmatic analysis, diffing between builds.

### raw-data

JSON output for CI integration and custom tooling.

```typescript
visualizer({ template: 'raw-data', filename: 'stats.json' })
```

**Best for:** CI pipelines, custom analysis scripts, size comparison actions.

---

## Interpreting the Output

### Color Coding

- **Blue**: Project-owned files (your source code or build-generated files)
- **Green**: Dependencies (`node_modules` packages)
- **Gray** (network view): Tree-shaken modules

### Reading the Visualization

1. **Box/arc size correlates to file size** - Larger areas = larger contributions to bundle
2. **Hover for details** - Shows exact sizes (parsed, gzip, brotli)
3. **Click to zoom** - Drill into specific areas for detailed inspection
4. **Look for patterns:**
   - Single large box? Candidate for code splitting or replacement
   - Many small boxes from same package? May indicate poor tree-shaking
   - Duplicate colors? Possible redundant dependencies

### Key Metrics to Analyze

1. **Largest modules** - Prime candidates for optimization (lazy loading, replacement, removal)
2. **Dependency proportions** - If dependencies > 70% of bundle, consider vendor splitting
3. **Duplicate packages** - Same library appearing multiple times at different versions
4. **Unexpected inclusions** - Modules you didn't expect to be bundled

---

## Gzip and Brotli Size Analysis

### Why Compressed Sizes Matter

Uncompressed sizes can be misleading. What matters for users is the actual download size after compression.

```typescript
visualizer({
  gzipSize: true,
  brotliSize: true,
})
```

### Typical Compression Ratios

- **JavaScript:** 60-80% reduction with gzip, 65-85% with brotli
- **JSON data:** 70-90% reduction
- **Source maps:** 80-95% reduction

### Example Analysis

Real project analysis showed:
- Total uncompressed: ~1.35MB
- Gzip compressed: ~660KB (~50% of original)
- Brotli compressed: ~580KB (~43% of original)

A single dependency (`html2canvas`) contributed ~400KB uncompressed, but ~215KB after gzip - still significant and worthy of optimization.

---

## Tree-Shaking Verification

### What is Tree-Shaking?

Tree-shaking eliminates unused exports from your bundle. ES modules enable static analysis for this optimization.

### Verifying Tree-Shaking is Working

1. **Use network template** to see grayed-out (tree-shaken) modules:

```typescript
visualizer({ template: 'network' })
```

2. **Compare expected vs actual:**
   - Import only `debounce` from lodash-es
   - Verify only `debounce` module appears, not entire lodash

3. **Check for warning signs:**
   - Large dependencies where you use only a few functions
   - CommonJS packages that can't be tree-shaken

### Common Tree-Shaking Failures

1. **CommonJS modules** - Can't be statically analyzed
2. **Side effects** - Modules with global side effects can't be removed
3. **Dynamic imports** - `require()` or computed `import()` paths
4. **Re-exports** - Barrel files (`index.js` re-exporting everything)

### Enabling Better Tree-Shaking

```json
// package.json - Mark your package as side-effect-free
{
  "sideEffects": false
}

// Or specify files WITH side effects
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.js"
  ]
}
```

```javascript
// vite.config.js - Configure Rollup tree-shaking
export default defineConfig({
  build: {
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeduplication: true,
      },
    },
  },
});
```

---

## CI Integration

### GitHub Actions with Size Comparison

```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size Check

on:
  pull_request:
    branches: [main]

permissions:
  pull-requests: write

jobs:
  build-base:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.base_ref }}

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - uses: actions/upload-artifact@v4
        with:
          name: base-stats
          path: stats.json

  build-head:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - uses: actions/upload-artifact@v4
        with:
          name: head-stats
          path: stats.json

  compare:
    needs: [build-base, build-head]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: base-stats
          path: base

      - uses: actions/download-artifact@v4
        with:
          name: head-stats
          path: head

      - uses: twk3/rollup-size-compare-action@v1.0.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          current-stats-json-path: head/stats.json
          base-stats-json-path: base/stats.json
```

Required Vite config for CI:

```typescript
visualizer({
  template: 'raw-data',
  filename: 'stats.json',
})
```

### Alternative: bundle-stats Integration

```bash
npm install --save-dev rollup-plugin-bundle-stats
```

```typescript
// vite.config.ts
import { bundleStats } from 'rollup-plugin-bundle-stats';

export default defineConfig({
  plugins: [
    bundleStats({
      compare: true,  // Compare with baseline
      baseline: true, // Generate baseline for future comparisons
    }),
  ],
});
```

### Artifact Storage for Reports

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: bundle-report
    path: |
      dist/stats.html
      stats.json
    retention-days: 30
```

---

## Comparison with Other Analyzers

### webpack-bundle-analyzer

| Aspect | rollup-plugin-visualizer | webpack-bundle-analyzer |
|--------|--------------------------|------------------------|
| **Bundler** | Rollup, Vite, Rolldown | Webpack only |
| **Visualization types** | 6 (treemap, sunburst, network, list, flamegraph, raw-data) | 1 (treemap) |
| **Server mode** | No (static HTML) | Yes |
| **Gzip/Brotli** | Yes | Yes |
| **Weekly downloads** | ~3.2M | ~8.5M |
| **GitHub stars** | ~3.9K | ~12.6K |

### source-map-explorer

- **Approach:** Analyzes sourcemaps directly for accurate post-minification sizes
- **Advantage:** More accurate for minified bundles since it works on final output
- **Disadvantage:** Requires sourcemaps, less interactive visualization

```bash
npx source-map-explorer dist/bundle.js
```

### vite-bundle-visualizer

Wrapper around rollup-plugin-visualizer with zero-config usage:

```bash
npx vite-bundle-visualizer
```

### Sonda

Universal analyzer supporting Vite, Rollup, esbuild, Webpack, and more:
- Requires sourcemaps
- Accounts for minification
- Modern UI

### Statoscope

Advanced toolkit focused on webpack:
- Build validation in CI
- Performance budgets
- Detailed module analysis

---

## Actionable Optimization Strategies

### 1. Replace Heavy Dependencies

Common culprits and lighter alternatives:

| Heavy Package | Size | Alternative | Size |
|--------------|------|-------------|------|
| moment.js | ~300KB | dayjs | ~2KB |
| lodash | ~70KB | lodash-es (cherry-pick) | varies |
| date-fns (full) | ~75KB | date-fns (tree-shaken) | varies |

**Check before installing:**
- [Bundlephobia](https://bundlephobia.com) - Shows package size, alternatives
- [pkg-size.dev](https://pkg-size.dev) - Detailed size breakdown

### 2. Implement Code Splitting

```typescript
// Route-based splitting (React)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

// Feature-based splitting
const heavyFeature = () => import('./features/heavyFeature');
```

### 3. Configure Manual Chunks

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Group React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Group UI library
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          // Separate heavy utilities
          'chart-vendor': ['recharts', 'd3'],
        },
      },
    },
  },
});
```

Or with a function for node_modules splitting:

```typescript
manualChunks(id) {
  if (id.includes('node_modules')) {
    // Create separate chunks for large packages
    if (id.includes('recharts') || id.includes('d3')) {
      return 'charts';
    }
    if (id.includes('react')) {
      return 'react-vendor';
    }
    return 'vendor';
  }
}
```

### 4. Cherry-Pick Imports

```typescript
// BAD - imports entire library
import _ from 'lodash';
import { format } from 'date-fns';

// GOOD - imports only what's needed
import debounce from 'lodash/debounce';
import { format } from 'date-fns/format';
```

### 5. Lazy Load Heavy Features

```typescript
// Only load when needed
async function exportPDF() {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  // ...
}
```

### 6. Use Dynamic Imports for Locales

```typescript
// Load locale on demand
const loadLocale = async (locale: string) => {
  const { default: messages } = await import(`./locales/${locale}.json`);
  return messages;
};
```

---

## Common Bundle Bloat Causes

### 1. Moment.js with All Locales

**Problem:** Moment includes all locales by default (~300KB)

**Solution:**
```typescript
// Use dayjs instead (2KB)
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
```

### 2. Full Lodash Import

**Problem:** Importing `_` brings entire library

**Solution:**
```typescript
// Use lodash-es with cherry-picking
import debounce from 'lodash-es/debounce';
import groupBy from 'lodash-es/groupBy';
```

### 3. Icon Libraries

**Problem:** Importing entire icon set

**Solution:**
```typescript
// BAD
import * as Icons from 'lucide-react';

// GOOD
import { Search, Menu, X } from 'lucide-react';
```

### 4. Duplicate Dependencies

**Problem:** Multiple versions of same package

**Detection:**
```bash
npm ls react  # See all react versions
npm dedupe    # Attempt automatic deduplication
```

**Solution with overrides:**
```json
// package.json
{
  "overrides": {
    "react": "18.2.0"
  }
}
```

### 5. Source Maps in Production

**Problem:** Sourcemaps accidentally included in bundle

**Solution:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: process.env.ANALYZE ? true : false,
  },
});
```

### 6. Polyfills for Modern Browsers

**Problem:** Including polyfills for browsers you don't support

**Solution:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2020',  // Modern browsers only
  },
});
```

Or update browserslist:
```json
// package.json
{
  "browserslist": [
    "> 1%",
    "last 2 versions",
    "not dead",
    "not IE 11"
  ]
}
```

---

## Quick Reference Commands

```bash
# Build and analyze
npm run build && open stats.html

# Zero-config analysis (alternative)
npx vite-bundle-visualizer

# Check package size before installing
npx bundlephobia-cli lodash

# Find duplicate dependencies
npm ls --depth=5 | grep -i "deduped"
npm dedupe --dry-run

# Generate stats for CI
vite build && cat stats.json | jq '.bundleSize'
```

---

## Troubleshooting

### Inaccurate Sizes (Pre-minification)

**Problem:** Sizes shown are before minification

**Solution:** Enable sourcemaps:
```typescript
visualizer({ sourcemap: true })
// AND
build: { sourcemap: true }
```

### "Sourcemap is likely to be incorrect" Warning

**Problem:** Vite transforms code after Rollup

**Solution:** Accept slight inaccuracies or use `source-map-explorer` for final bundle analysis:
```bash
npx source-map-explorer dist/assets/*.js
```

### Missing Modules in Network View

**Problem:** Some modules not appearing

**Solution:** Check if they're being tree-shaken (intentional) or if there's a resolution issue.

### Large Stats File

**Problem:** `stats.html` file is very large

**Solution:** Use `include`/`exclude` to filter:
```typescript
visualizer({
  include: { file: '**/src/**' },
  exclude: { file: '**/node_modules/.pnpm/**' },
})
```

---

## Data Privacy

Generated HTML files contain **only**:
- File structure and paths
- Size statistics (parsed, gzip, brotli)
- Module relationships

They do **NOT** contain:
- Source code contents
- Actual implementation details
- Sensitive data

Safe to commit or share for analysis.

---

## Further Reading

- [GitHub Repository](https://github.com/btd/rollup-plugin-visualizer)
- [npm Package](https://www.npmjs.com/package/rollup-plugin-visualizer)
- [Webpack Tree Shaking Guide](https://webpack.js.org/guides/tree-shaking/)
- [Bundlephobia](https://bundlephobia.com)
- [Smashing Magazine: Bundle Optimization](https://www.smashingmagazine.com/2022/02/javascript-bundle-performance-code-splitting/)

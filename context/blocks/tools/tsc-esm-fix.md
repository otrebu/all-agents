---
depends: []
---

# tsc-esm-fix - ESM Extension Fixer

Adds .js extensions to import statements for Node.js ESM compatibility.

## When Needed

Using **all three**:
- `"type": "module"` in package.json (ESM)
- `"module": "NodeNext"` in tsconfig.json
- Build-first strategy (tsc → node)

## When NOT Needed

- CommonJS projects (`"type": "commonjs"`)
- Bundlers (handle extensions automatically)
- tsx/bun (runtime loaders don't need extensions)

## Why Node ESM Requires Extensions

Node.js ESM spec requires explicit extensions:

```javascript
// ❌ Won't work in Node ESM
import { foo } from './utils/bar'

// ✅ Required
import { foo } from './utils/bar.js'
```

TypeScript outputs .js files but doesn't rewrite import paths. tsc-esm-fix adds the .js extensions.

## Installation

```bash
pnpm add -D tsc-esm-fix
```

## Usage

Run after tsc and tsc-alias:

```bash
tsc && tsc-alias && tsc-esm-fix
```

**package.json scripts:**

```json
{
  "scripts": {
    "build": "tsc && tsc-alias && tsc-esm-fix"
  }
}
```

## Configuration

No config needed. Scans outDir from tsconfig.json and adds .js extensions.

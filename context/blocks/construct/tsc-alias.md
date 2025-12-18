---
depends: []
---

# tsc-alias - Path Alias Resolver

Resolves TypeScript path aliases (`@/*`) in compiled JavaScript output.

## When Needed

Using **both**:

- Path aliases in tsconfig.json (`"@*": ["./src/*"]`)
- Build-first strategy (tsc → node)

## When NOT Needed

- tsx/bun handle aliases at runtime (no build step)
- Bundlers (Vite/Webpack) resolve aliases during bundling
- No path aliases in your project

## Installation

Install tsc-alias as a dev dependency.

## Usage

**package.json scripts:**

```json
{
  "scripts": {
    "build": "tsc && tsc-alias"
  }
}
```

## How It Works

1. tsc compiles .ts → .js but leaves `import { foo } from '@utils/bar'` unchanged
2. tsc-alias reads tsconfig paths and rewrites imports to relative paths
3. Output: `import { foo } from '../utils/bar.js'`

## Configuration

Uses tsconfig.json paths automatically. No extra config needed.

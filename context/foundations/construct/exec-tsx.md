---
tags: [runtime, execution, build]
depends:
  - "@context/blocks/construct/tsconfig-base.md"
  - "@context/blocks/construct/tsx.md"
---

# TypeScript: Execute TypeScript files via tsx even for production

We run tsx to execute TypeScript files directly, always.

**package.json scripts:**

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  }
}
```

---
tags: [runtime, execution, build]
depends:
  - @context/blocks/construct/node.md
  - @context/blocks/construct/tsconfig-base.md
  - @context/blocks/construct/tsc.md
  - @context/blocks/construct/tsc-alias.md
  - @context/blocks/construct/tsc-esm-fix.md
---

# TypeScript: Execute Node.js via Compiled JS

We transpile TypeScript to JavaScript using tsc and then run the JavaScript code using node. We want to use esm imports and avoid .js extensions therefore we have tsc-alias and tsc-esm-fix.

We use the following tools to achieve this:
@context/blocks/construct/tsc.md
@context/blocks/construct/tsc-alias.md
@context/blocks/construct/tsc-esm-fix.md

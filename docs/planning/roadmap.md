# Roadmap

## DX Improvements

- [ ] Add `eslint-import-resolver-typescript-bun` to uba-eslint-config
  - https://github.com/opsbr/eslint-import-resolver-typescript-bun
  - Properly resolves `bun:*` imports (bun:test, bun:sqlite, etc.)
  - Currently using `import/core-modules` workaround in tools/eslint.config.js

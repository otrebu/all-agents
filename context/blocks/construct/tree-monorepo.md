# Project Structure for Monorepo

```
monorepo/
├── package.json              # Root scripts (proxies)
├── tsconfig.json             # Project references (extends base)
├── tsconfig.base.json        # Shared compiler options
├── tsconfig.package.json     # Package base (extends base + monorepo additions)
├── packages/
│   ├── core/
│   │   ├── src/
│   │   ├── package.json      # ESM, exports, workspace deps
│   │   └── tsconfig.json     # Extends ../../tsconfig.package.json
│   └── utils/
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
└── apps/
    └── api/
        ├── src/
        ├── package.json
        └── tsconfig.json
```

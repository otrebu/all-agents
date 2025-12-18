# package.json Scripts

npm script naming patterns for projects & monorepos.

---

## Universal Fields

All projects need:
- `name`: "@scope/package" or "package"
- `version`: Semver (e.g., "1.0.0")
- `type`: "module" (enables ESM import/export)
- `engines`: Version requirements (e.g., `{ "node": ">=20.19.0" }`)
- Optional: `description`, `keywords`, `author`, `license`

---

## Patterns

| Pattern                | Meaning              | Examples                                  |
| ---------------------- | -------------------- | ----------------------------------------- |
| `{verb}`               | Default/all targets  | `build`, `test`, `lint`                   |
| `{verb}:{target}`      | Specific app/package | `dev:api`, `build:web`                    |
| `{verb}:{modifier}`    | Variant              | `test:watch`, `lint:fix`, `test:coverage` |
| `{noun}:{verb}`        | Domain operations    | `db:migrate`, `db:seed`                   |
| `{verb}:{environment}` | Environment-specific | `check:ci`, `build:prod`                  |

## Rules

- Bare command = default (all/primary target)
- `:fix` = auto-correct issues
- `:watch` = continuous/interactive mode
- `:ci` = strict, non-interactive + coverage
- `:all` = explicit parallel when bare doesn't

## Simple Project

```json
{
  "scripts": {
    "// DEV": "",
    "dev": "<dev server>",
    "dev:debug": "<dev w/ debugger>",

    "// PROD": "",
    "build": "<build>",
    "start": "<prod server>",

    "// TEST": "",
    "test": "<all tests>",
    "test:watch": "<watch mode>",
    "test:ui": "<w/ ui>",
    "test:coverage": "<w/ coverage>",
    "test:e2e": "<e2e>",
    "test:e2e:ui": "<e2e w/ ui>",

    "// QUALITY": "",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "check": "<package manager> run lint && <package manager> run typecheck && <package manager> run test",
    "check:ci": "<package manager> run format:check && <package manager> run lint && <package manager> run typecheck && <package manager> run test:coverage",

    "// DB": "",
    "db:generate": "<generate schema/types>",
    "db:migrate": "<run migrations>",
    "db:push": "<push schema>",
    "db:seed": "<seed>",
    "db:reset": "<reset+reseed>",
    "db:studio": "<db gui>",

    "// UTIL": "",
    "clean": "rm -rf dist node_modules <framework dirs>",
    "prepare": "husky"
  }
}
```

## Monorepo Proxy

Root `package.json` delegates to workspaces = convenience + indirection.

**Recommendation:** Proxy common commands only (`dev`, `build`, `test`, `check`). Use `--filter` directly for rare operations.

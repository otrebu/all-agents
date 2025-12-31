---
depends:
  - "@context/blocks/construct/vite.md"
  - "@context/blocks/construct/zod.md"
---

# Typed Environment Variables (Vite)

## TypeScript Config with Zod

Strongly typed, runtime-validated configuration for Vite/frontend applications.

## Setup

Use `zod` (install if not already installed).

## Implementation

Create `src/config.ts`:

```typescript
import { z } from "zod";

const configSchema = z.object({
  isDev: z.boolean(),
  isProd: z.boolean(),
  mode: z.string(),
  baseUrl: z.string(),
  apiUrl: z.string().url(),
  enableAnalytics: z
    .string()
    .transform((value) => value === "true" || value === "1")
    .default("false"),
});

const configParseResult = configSchema.safeParse({
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
  apiUrl: import.meta.env.VITE_API_URL,
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS,
});

if (!configParseResult.success) {
  console.error("Invalid environment variables:", configParseResult.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const config = configParseResult.data;
export type Config = z.infer<typeof configSchema>;
```

## Vite Built-in Variables

| Variable | Type | Description |
|----------|------|-------------|
| `import.meta.env.DEV` | `boolean` | `true` in development |
| `import.meta.env.PROD` | `boolean` | `true` in production |
| `import.meta.env.MODE` | `string` | `"development"` or `"production"` |
| `import.meta.env.BASE_URL` | `string` | Base URL from config |
| `import.meta.env.SSR` | `boolean` | `true` during SSR |

## Custom Variables

Custom env vars **must** use `VITE_` prefix to be exposed to client:

```bash
# .env
VITE_API_URL=https://api.example.com
VITE_ENABLE_ANALYTICS=true
```

Variables without `VITE_` prefix are NOT available in client code (security feature).

## TypeScript Declarations

Extend `ImportMetaEnv` in `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Usage

```typescript
import { config } from "./config";

// Fully typed, validated at app startup
console.log(config.apiUrl);
console.log(config.isDev);
console.log(config.enableAnalytics);
```

## Key Points

- **Use `z.string().transform()` for booleans** — env vars are always strings
- **Fail at startup** — throw error on invalid config, don't silently fail
- **Never access `import.meta.env` directly elsewhere** — always import `config`
- **No secrets in frontend** — all `VITE_*` vars are PUBLIC in built JS

## File Structure

```
.env.dev              # defaults, committed (no secrets)
.env                  # local overrides, gitignored
src/config.ts         # typed config
src/vite-env.d.ts     # type declarations
```

## Do Not

- Access `import.meta.env` directly after config is set up
- Store secrets in frontend env vars (they're public!)
- Use non-`VITE_` prefixed vars (they won't be available)
- Rely on `process.env` in frontend code

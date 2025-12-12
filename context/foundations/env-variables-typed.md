# Typed environment variables

# TypeScript Config with Zod

Strongly typed, runtime-validated configuration using Zod and dotenv.

## Setup

Install `zod` and `dotenv`.

## Implementation

Create `src/config.ts`:

```typescript
import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ENABLE_FEATURE_X: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .default("false"),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof configSchema>;
```

## Key Points

- **Use `z.coerce.number()`** — env vars are always strings
- **Use `.transform()` for booleans** — `z.coerce.boolean()` treats any non-empty string as `true`
- **Use `safeParse` + flatten** — better error messages than `.parse()` throwing
- **Fail fast at startup** — call `process.exit(1)` on invalid config
- **Never access `process.env` directly elsewhere** — always import `config`

## File Structure

```
.env                  # defaults, committed (no secrets)
.env.local            # local overrides, gitignored
```

## Usage

```typescript
import { config } from "./config";

// Fully typed, validated at startup
console.log(config.PORT); // number
console.log(config.DATABASE_URL); // string
console.log(config.REDIS_URL); // string | undefined
```

## Do Not

- Use declaration merging alone (`declare global { namespace NodeJS {...} }`) — no runtime safety
- Access `process.env` directly after config is set up
- Store secrets in committed `.env` files

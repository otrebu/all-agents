
# TypeScript + Bun CLI Stack

CLI tools with Bun runtime: fast startup, native TS, single-file executables.

# Runtime, Package Manager, Bundler, Test Runner

<file name="bun.md" path="~/dev/all-agents/context/blocks/tools/bun.md">


## Bun

All-in-one JavaScript/TypeScript toolkit: runtime + package manager + bundler + test runner.

### Overview

- **Runtime**: Runs JS/TS directly (native TS, no tsc needed for execution)
- **Package Manager**
- **Bundler**: Built-in, fast (simple projects, CLI tools)
- **Test Runner**: Jest-compatible

### Package Manager

```bash
# Install dependencies
bun install                          # Install all from package.json
bun ci                               # CI mode: exact versions, fails on mismatch
bun install --frozen-lockfile        # Same as bun ci
bun install --production             # Skip devDependencies
bun install --omit=dev --omit=peer   # Skip specific dep types

# Add/remove packages
bun add <package>                    # Add to dependencies
bun add -d <package>                 # Add to devDependencies
bun add -g <package>                 # Install globally
bun add github:user/repo             # From GitHub
bun add git+https://url.git          # From Git
bun remove <package>                 # Remove package

# Update
bun update                           # Update all
bun update <package>                 # Update specific
bun outdated                         # Show outdated packages

# Execute packages (like npx)
bunx <package>                       # Run package binary
bunx --bun vite                      # Force Bun runtime

# Info & analysis
bun pm ls                            # List installed packages
bun pm cache                         # Show cache info
bun why <package>                    # Why is package installed?
bun audit                            # Security audit

# Linking & publishing
bun link                             # Link local package globally
bun link <package>                   # Link global package locally
bun publish                          # Publish to npm
```

**Security**: Bun skips lifecycle scripts by default. Allow specific packages:

```json
{
  "trustedDependencies": ["esbuild", "sharp"]
}
```

**pnpm migration**: Bun auto-converts `pnpm-lock.yaml` → `bun.lock` on first install.

### Runtime

```bash
# Run scripts
bun run <script>                     # Run package.json script
bun <script>                         # Shorthand
bun run index.ts                     # Run TypeScript directly

# Execute files
bun ./src/index.ts                   # Native TS execution
bun ./script.js                      # Run JS

# REPL (not available - use node for REPL)
```

**Native TypeScript**: Bun executes `.ts` files directly without compilation. No `ts-node` or build step needed for development

### Loading Environment Variables

Bun loads `.env` files automatically (no flags needed):

```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts"
  }
}
```

**Variable Expansion**: Bun supports `$VAR` syntax for environment variables.

It also supports `--env-file` flag to load environment variables from a specific file.

### TypeScript with Bun

Bun runs TS natively but **does not type-check**. For type safety:

```bash
# Type-check only (no emit)
tsc --noEmit

# Or in package.json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "bun build ./src/index.ts --outdir ./dist"
  }
}
```

**tsconfig.json for Bun:**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "noEmit": true
  }
}
```

Install types: `bun add -d bun-types`

### Bundler

```bash
# Basic build
bun build ./src/index.ts --outdir ./dist

# With options
bun build ./src/index.ts \
  --outdir ./dist \
  --target node \
  --minify \
  --sourcemap

# Executable (single file)
bun build ./src/cli.ts --compile --outfile ./bin/mycli
```

**When to use Bun build:**

- CLI tools, simple projects
- Fast iteration, no complex plugins needed

**When to use Vite instead:**

- Complex frontends needing HMR
- Extensive plugin ecosystem required
- Production optimization for web apps

### Test Runner

```bash
# Run tests
bun test                             # Run all tests
bun test <file>                      # Run specific file
bun test --watch                     # Watch mode
bun test --coverage                  # With coverage

# Filtering
bun test --grep "pattern"            # Filter by name
bun test path/to/tests               # Filter by path
```

**Jest compatibility**: Most Jest APIs work (`describe`, `it`, `expect`, `beforeEach`, etc.). Mocking via `bun:test`.

```typescript
import { describe, it, expect, mock } from "bun:test";

describe("example", () => {
  it("works", () => {
    expect(1 + 1).toBe(2);
  });
});
```

### Workspaces

**bunfig.toml** (or in package.json):

```toml
[workspace]
packages = ["packages/*"]
```

**package.json** alternative:

```json
{
  "workspaces": ["packages/*"]
}
```

**Commands:**

```bash
# Install all workspace deps
bun install

# Add to specific workspace
bun add <package> --cwd packages/target

# Run in workspace
bun run --cwd packages/target <script>

# Run across all workspaces
bun run --filter '*' <script>
```

**Internal dependencies:**

```json
{
  "dependencies": {
    "@myorg/shared": "workspace:*"
  }
}
```

#### Package.json monorepo scripts

package.json for a monorepo using Bun:

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "// === DEVELOPMENT ===": "",
    "dev": "bun --filter @scope/web dev",
    "dev:api": "bun --filter @scope/api dev",
    "dev:admin": "bun --filter @scope/admin dev",
    "dev:all": "bun --filter '*' dev",

    "// === PRODUCTION ===": "",
    "build": "bun --filter '*' build",
    "build:web": "bun --filter @scope/web build",
    "build:api": "bun --filter @scope/api build",
    "build:packages": "bun --filter './packages/*' build",
    "start": "bun --filter @scope/web start",
    "start:api": "bun --filter @scope/api start",

    "// === TESTING ===": "",
    "test": "bun test",
    "test:unit": "bun --filter '*' test:unit",
    "test:integration": "bun --filter '*' test:integration",
    "test:e2e": "bun --filter @scope/e2e test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",

    "// === CODE QUALITY ===": "",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "check": "bun run lint && bun run typecheck && bun run test",
    "check:ci": "bun run format:check && bun run lint && bun run typecheck && bun run test:coverage",

    "// === DATABASE ===": "",
    "db:generate": "bun --filter @scope/db generate",
    "db:migrate": "bun --filter @scope/db migrate",
    "db:push": "bun --filter @scope/db push",
    "db:seed": "bun --filter @scope/db seed",
    "db:studio": "bun --filter @scope/db studio",

    "// === UTILITIES ===": "",
    "clean": "bun --filter '*' clean && rm -rf node_modules",
    "prepare": "husky",

    "// === RELEASE ===": "",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "bun run build && changeset publish"
  }
}
```

### Configuration (bunfig.toml)

```toml
# Package manager
[install]
auto = true                          # Auto-install on bun run
frozen-lockfile = false              # Lock lockfile in CI

# Test runner
[test]
coverage = true
coverageDir = "coverage"

# Bundle
[bundle]
entryPoints = ["./src/index.ts"]
outdir = "./dist"
```

### When to Use Bun vs Alternatives

| Scenario                      | Use            |
| ----------------------------- | -------------- |
| Greenfield project, max speed | Bun            |
| Complex frontend w/ HMR       | Vite + Vitest  |
| Enterprise, full Node compat  | Node + pnpm    |
| Serverless, fast cold starts  | Bun            |
| Existing large Node codebase  | Stay with Node |

**Bun limitations:**

- ~5% missing Node APIs (edge cases, native addons)
- No REPL (use `node` for quick experiments)
- No built-in linter/formatter (use ESLint/Prettier)
- Vite HMR support incomplete
- Some npm packages have edge case issues
- Limited edge/serverless platform support (Cloudflare Workers uses V8)


</file>
<file name="package-json.md" path="~/dev/all-agents/context/blocks/tools/package-json.md">

## package.json Scripts

npm script naming patterns for projects & monorepos.

---

### Patterns

| Pattern                | Meaning              | Examples                                  |
| ---------------------- | -------------------- | ----------------------------------------- |
| `{verb}`               | Default/all targets  | `build`, `test`, `lint`                   |
| `{verb}:{target}`      | Specific app/package | `dev:api`, `build:web`                    |
| `{verb}:{modifier}`    | Variant              | `test:watch`, `lint:fix`, `test:coverage` |
| `{noun}:{verb}`        | Domain operations    | `db:migrate`, `db:seed`                   |
| `{verb}:{environment}` | Environment-specific | `check:ci`, `build:prod`                  |

### Rules

- Bare command = default (all/primary target)
- `:fix` = auto-correct issues
- `:watch` = continuous/interactive mode
- `:ci` = strict, non-interactive + coverage
- `:all` = explicit parallel when bare doesn't

### Simple Project

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

### Monorepo Proxy

Root `package.json` delegates to workspaces = convenience + indirection.

**Recommendation:** Proxy common commands only (`dev`, `build`, `test`, `check`). Use `--filter` directly for rare operations.


</file>

# Environment Variables

<file name="env-variables-typed-native.md" path="~/dev/all-agents/context/foundations/env-variables-typed-native.md">


## Typed Environment Variables

### TypeScript Config with Zod

Strongly typed, runtime-validated configuration using Zod with native `.env` loading.

### Setup

Use `zod` (Install if not already installed) only — no dotenv needed with Node 20.6+ or Bun.

### Implementation

Create `src/config.ts`:

```typescript
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

### Running Your App

Environment variables are loaded by the runtime, we do not need dotenv.

### Key Points

- **Use `z.coerce.number()`** — env vars are always strings
- **Use `.transform()` for booleans** — `z.coerce.boolean()` treats any non-empty string as `true`
- **Use `safeParse` + flatten** — better error messages than `.parse()` throwing
- **Fail fast at startup** — call `process.exit(1)` on invalid config
- **Never access `process.env` directly elsewhere** — always import `config`

### File Structure

```
.env.dev              # defaults, committed (no secrets, used as template for .env)
.env                  # Needs to be created by the user, it is the actual environment variables file.
```

### Usage

```typescript
import { config } from "./config";

// Fully typed, validated at startup
console.log(config.PORT); // number
console.log(config.DATABASE_URL); // string
console.log(config.REDIS_URL); // string | undefined
```

### Do Not

- Use declaration merging alone (`declare global { namespace NodeJS {...} }`) — no runtime safety
- Access `process.env` directly after config is set up
- Store secrets in committed `.env` files
- Use dotenv — it's redundant with modern runtimes
- Use variable expansion (`$VAR` syntax) — it's not supported by Node.js


</file>

# CLI Tools

<file name="commander.md" path="~/dev/all-agents/context/blocks/tools/commander.md">

## commander

CLI framework for building command-line commands with options and parameters with parsing and validation.
Use with `@commander-js/extra-typings` for type safety.

### Usage

```typescript
import { Command } from "@commander-js/extra-typings";
// The log library is a shared library that is used to log messages to the console.
// It is used to log messages to the console in a consistent way.
import log from "@lib/log";

const program = new Command();

program.name("mycli").description("My CLI tool").version("1.0.0");

program
  .command("greet")
  .description("Greet someone")
  .argument("<name>", "Name to greet")
  .option("-l, --loud", "Shout the greeting")
  .action((name, options) => {
    const greeting = `Hello, ${name}!`;
    log.info(options.loud ? greeting.toUpperCase() : greeting);
  });

program.parse();
```


</file>
<file name="chalk.md" path="~/dev/all-agents/context/blocks/tools/chalk.md">

## chalk

Terminal string styling.

### Usage

#### Simple Output Styling with logger

In simple cases we use chack to style the output of the CLI centrally in our logger:

```typescript
import chalk from "chalk";

/**
 * CLI logging utilities for human-readable terminal output
 */
const log = {
  dim: (message: string) => {
    console.log(chalk.dim(message));
  },
  error: (message: string) => {
    console.error(chalk.red(`✗ ${message}`));
  },
  header: (message: string) => {
    console.log(chalk.bold.cyan(message));
  },
  info: (message: string) => {
    console.log(chalk.blue(`ℹ ${message}`));
  },
  plain: (message: string) => {
    console.log(message);
  },
  success: (message: string) => {
    console.log(chalk.green(`✓ ${message}`));
  },
  warn: (message: string) => {
    console.warn(chalk.yellow(`⚠ ${message}`));
  },
};

export default log;
```

#### Advanced Output Styling with chalk

```typescript
import chalk from "chalk";

// ═══════════════════════════════════════════
// TEXT MODIFIERS
// ═══════════════════════════════════════════

console.log(chalk.bold("Bold text"));
console.log(chalk.dim("Dimmed text"));
console.log(chalk.italic("Italic text"));
console.log(chalk.underline("Underlined text"));
console.log(chalk.strikethrough("Strikethrough text"));
console.log(chalk.inverse("Inverse (swap fg/bg)"));
console.log(chalk.hidden("Hidden text (still selectable)"));
console.log(chalk.overline("Overlined text")); // Not widely supported

// ═══════════════════════════════════════════
// CHAINING MODIFIERS
// ═══════════════════════════════════════════

console.log(chalk.bold.underline("Bold + Underline"));
console.log(chalk.italic.dim.yellow("Italic + Dim + Yellow"));
console.log(chalk.bold.italic.underline.red("Bold + Italic + Underline + Red"));
console.log(chalk.bgBlue.white.bold.underline("Full combo with background"));

// ═══════════════════════════════════════════
// FOREGROUND COLORS
// ═══════════════════════════════════════════

// Standard colors
console.log(chalk.black("black"));
console.log(chalk.red("red"));
console.log(chalk.green("green"));
console.log(chalk.yellow("yellow"));
console.log(chalk.blue("blue"));
console.log(chalk.magenta("magenta"));
console.log(chalk.cyan("cyan"));
console.log(chalk.white("white"));
console.log(chalk.gray("gray / grey"));

// Bright variants
console.log(chalk.redBright("redBright"));
console.log(chalk.greenBright("greenBright"));
console.log(chalk.blueBright("blueBright"));
console.log(chalk.cyanBright("cyanBright"));

// ═══════════════════════════════════════════
// BACKGROUND COLORS
// ═══════════════════════════════════════════

console.log(chalk.bgRed.white(" Background Red "));
console.log(chalk.bgGreen.black(" Background Green "));
console.log(chalk.bgYellow.black(" Background Yellow "));
console.log(chalk.bgBlue.white(" Background Blue "));
console.log(chalk.bgMagenta.white(" Background Magenta "));
console.log(chalk.bgCyan.black(" Background Cyan "));
console.log(chalk.bgWhite.black(" Background White "));
console.log(chalk.bgRedBright.black(" Background Red Bright "));

// ═══════════════════════════════════════════
// HEX, RGB, HSL, ANSI256
// ═══════════════════════════════════════════

// Hex colors
console.log(chalk.hex("#FF6B6B")("Coral via Hex"));
console.log(chalk.hex("#4ECDC4")("Teal via Hex"));
console.log(chalk.bgHex("#2D3436").hex("#DFE6E9")(" Dark bg with light text "));

// RGB colors
console.log(chalk.rgb(255, 107, 107)("Coral via RGB"));
console.log(chalk.bgRgb(46, 204, 113).black(" Green bg via RGB "));

// HSL colors (hue, saturation, lightness)
console.log(chalk.hsl(180, 100, 50)("Cyan via HSL"));
console.log(chalk.bgHsl(280, 100, 50).white(" Purple bg via HSL "));

// ANSI 256 colors
console.log(chalk.ansi256(201)("Hot pink via ANSI256"));
console.log(chalk.bgAnsi256(57).white(" Purple bg via ANSI256 "));

// ═══════════════════════════════════════════
// NESTED STYLES
// ═══════════════════════════════════════════

console.log(
  chalk.red("Red text with", chalk.bold.underline("bold underlined"), "inside")
);

console.log(
  chalk.bgBlue.white(" Start ", chalk.bgRed.bold(" ALERT "), " End ")
);

// ═══════════════════════════════════════════
// TAGGED TEMPLATE LITERALS
// ═══════════════════════════════════════════

console.log(chalk`
{bold.underline.cyan ══════ System Status ══════}

{green.bold ✓} {underline Server}:     {green Online}
{yellow.bold ⚠} {underline Memory}:     {yellow 78% used}
{red.bold ✗} {underline Database}:   {red.strikethrough Disconnected}

{dim.italic Last updated: ${new Date().toLocaleTimeString()}}
`);

// ═══════════════════════════════════════════
// REUSABLE STYLED FUNCTIONS (THEMES)
// ═══════════════════════════════════════════

const theme = {
  title: chalk.bold.underline.hex("#A78BFA"),
  success: chalk.green.bold,
  warning: chalk.yellow.bold,
  error: chalk.red.bold.underline,
  info: chalk.blueBright,
  muted: chalk.gray.italic,
  highlight: chalk.bgYellow.black.bold,
  code: chalk.bgGray.white,
  link: chalk.cyan.underline,
};

console.log(theme.title("Application Report"));
console.log(theme.success("✓ All tests passed"));
console.log(theme.warning("⚠ Deprecation warnings found"));
console.log(theme.error("✗ Critical error in module"));
console.log(theme.info("ℹ Running in development mode"));
console.log(theme.muted("Last run: 2 minutes ago"));
console.log(theme.highlight(" NEW "), "Feature released");
console.log(theme.code(" npm install chalk "));
console.log(theme.link("https://github.com/chalk/chalk"));

// ═══════════════════════════════════════════
// CONDITIONAL / DYNAMIC STYLING
// ═══════════════════════════════════════════

const statusBadge = (status: "ok" | "warn" | "error") => {
  const styles = {
    ok: chalk.bgGreen.black.bold,
    warn: chalk.bgYellow.black.bold,
    error: chalk.bgRed.white.bold,
  };
  return styles[status](` ${status.toUpperCase()} `);
};

console.log(`Build: ${statusBadge("ok")}`);
console.log(`Lint:  ${statusBadge("warn")}`);
console.log(`Test:  ${statusBadge("error")}`);

// ═══════════════════════════════════════════
// DISABLE COLORS PROGRAMMATICALLY
// ═══════════════════════════════════════════

const plain = new chalk.Instance({ level: 0 }); // No colors
console.log(plain.red("This will NOT be red"));

// Force colors even when not TTY
const forced = new chalk.Instance({ level: 3 }); // TrueColor
console.log(forced.hex("#FF0000")("Forced red"));
```


</file>
<file name="ora.md" path="~/dev/all-agents/context/blocks/tools/ora.md">

## ora

Elegant terminal spinners.

### Usage

```typescript
import ora from "ora";

const spinner = ora("Loading...").start();

// ... async work

spinner.succeed("Done!");
// or
spinner.fail("Failed!");
// or
spinner.warn("Warning!");
```

### With async

```typescript
const spinner = ora("Fetching data...").start();
try {
  const data = await fetchData();
  spinner.succeed("Data fetched");
} catch (error) {
  spinner.fail("Fetch failed");
}
```


</file>
<file name="boxen.md" path="~/dev/all-agents/context/blocks/tools/boxen.md">

## boxen (optional)

Create boxes in terminal output.

### Usage

```typescript
import boxen from "boxen";

console.log(
  boxen("Hello World", {
    padding: 1,
    borderStyle: "round",
    borderColor: "green",
  })
);
```

### Result:

```
╭─────────────────╮
│                 │
│   Hello World   │
│                 │
╰─────────────────╯
```


</file>

# CLI Patterns

<file name="logging-cli.md" path="~/dev/all-agents/context/blocks/patterns/logging-cli.md">


## Logging principles

<file name="logging.md" path="~/dev/all-agents/context/blocks/principles/logging.md">

### Logging

#### Universal Logging Principles

- Never log sensitive data (passwords, tokens, PII) - configure redaction
- Use appropriate log levels to reflect system severity:
  - **debug**: Detailed diagnostic info (usually disabled in production)
  - **info**: Normal operations and significant business events
  - **warn**: Unexpected situations that don't prevent operation
  - **error**: Errors affecting functionality but not crashing the app
  - **fatal**: Critical errors requiring immediate shutdown
- Include contextual data (requestId, userId, etc.) for traceability
- Log level reflects **system severity**, not business outcomes (failed login = info/debug, not error)
- Log at key decision points, state transitions, and external calls for traceability

#### Application Type Determines Logging Strategy

##### Services/APIs/Web Servers

- Use structured logging with data as fields, not string interpolation
- Output machine-parseable format (e.g., JSON) for log aggregation
- Never use basic print/console statements

##### CLI Tools

- Use human-readable terminal output
- Direct output to stdout (normal) and stderr (errors)
- Use colored/formatted text for better UX


</file>

### When to use

**✅ Use for:** CLI tools, terminal apps, interactive commands
**❌ Don't use for:** Services, APIs, web server

**DO NOT use pino, winston, or JSON loggers.** CLIs output text for humans, not log aggregators.

### CLI Logging Implementation details

#### Setup

Install chalk and ora.

<file name="chalk.md" path="~/dev/all-agents/context/blocks/tools/chalk.md">

##### chalk

Terminal string styling.

###### Usage

###### Simple Output Styling with logger

In simple cases we use chack to style the output of the CLI centrally in our logger:

```typescript
import chalk from "chalk";

/**
 * CLI logging utilities for human-readable terminal output
 */
const log = {
  dim: (message: string) => {
    console.log(chalk.dim(message));
  },
  error: (message: string) => {
    console.error(chalk.red(`✗ ${message}`));
  },
  header: (message: string) => {
    console.log(chalk.bold.cyan(message));
  },
  info: (message: string) => {
    console.log(chalk.blue(`ℹ ${message}`));
  },
  plain: (message: string) => {
    console.log(message);
  },
  success: (message: string) => {
    console.log(chalk.green(`✓ ${message}`));
  },
  warn: (message: string) => {
    console.warn(chalk.yellow(`⚠ ${message}`));
  },
};

export default log;
```

###### Advanced Output Styling with chalk

```typescript
import chalk from "chalk";

// ═══════════════════════════════════════════
// TEXT MODIFIERS
// ═══════════════════════════════════════════

console.log(chalk.bold("Bold text"));
console.log(chalk.dim("Dimmed text"));
console.log(chalk.italic("Italic text"));
console.log(chalk.underline("Underlined text"));
console.log(chalk.strikethrough("Strikethrough text"));
console.log(chalk.inverse("Inverse (swap fg/bg)"));
console.log(chalk.hidden("Hidden text (still selectable)"));
console.log(chalk.overline("Overlined text")); // Not widely supported

// ═══════════════════════════════════════════
// CHAINING MODIFIERS
// ═══════════════════════════════════════════

console.log(chalk.bold.underline("Bold + Underline"));
console.log(chalk.italic.dim.yellow("Italic + Dim + Yellow"));
console.log(chalk.bold.italic.underline.red("Bold + Italic + Underline + Red"));
console.log(chalk.bgBlue.white.bold.underline("Full combo with background"));

// ═══════════════════════════════════════════
// FOREGROUND COLORS
// ═══════════════════════════════════════════

// Standard colors
console.log(chalk.black("black"));
console.log(chalk.red("red"));
console.log(chalk.green("green"));
console.log(chalk.yellow("yellow"));
console.log(chalk.blue("blue"));
console.log(chalk.magenta("magenta"));
console.log(chalk.cyan("cyan"));
console.log(chalk.white("white"));
console.log(chalk.gray("gray / grey"));

// Bright variants
console.log(chalk.redBright("redBright"));
console.log(chalk.greenBright("greenBright"));
console.log(chalk.blueBright("blueBright"));
console.log(chalk.cyanBright("cyanBright"));

// ═══════════════════════════════════════════
// BACKGROUND COLORS
// ═══════════════════════════════════════════

console.log(chalk.bgRed.white(" Background Red "));
console.log(chalk.bgGreen.black(" Background Green "));
console.log(chalk.bgYellow.black(" Background Yellow "));
console.log(chalk.bgBlue.white(" Background Blue "));
console.log(chalk.bgMagenta.white(" Background Magenta "));
console.log(chalk.bgCyan.black(" Background Cyan "));
console.log(chalk.bgWhite.black(" Background White "));
console.log(chalk.bgRedBright.black(" Background Red Bright "));

// ═══════════════════════════════════════════
// HEX, RGB, HSL, ANSI256
// ═══════════════════════════════════════════

// Hex colors
console.log(chalk.hex("#FF6B6B")("Coral via Hex"));
console.log(chalk.hex("#4ECDC4")("Teal via Hex"));
console.log(chalk.bgHex("#2D3436").hex("#DFE6E9")(" Dark bg with light text "));

// RGB colors
console.log(chalk.rgb(255, 107, 107)("Coral via RGB"));
console.log(chalk.bgRgb(46, 204, 113).black(" Green bg via RGB "));

// HSL colors (hue, saturation, lightness)
console.log(chalk.hsl(180, 100, 50)("Cyan via HSL"));
console.log(chalk.bgHsl(280, 100, 50).white(" Purple bg via HSL "));

// ANSI 256 colors
console.log(chalk.ansi256(201)("Hot pink via ANSI256"));
console.log(chalk.bgAnsi256(57).white(" Purple bg via ANSI256 "));

// ═══════════════════════════════════════════
// NESTED STYLES
// ═══════════════════════════════════════════

console.log(
  chalk.red("Red text with", chalk.bold.underline("bold underlined"), "inside")
);

console.log(
  chalk.bgBlue.white(" Start ", chalk.bgRed.bold(" ALERT "), " End ")
);

// ═══════════════════════════════════════════
// TAGGED TEMPLATE LITERALS
// ═══════════════════════════════════════════

console.log(chalk`
{bold.underline.cyan ══════ System Status ══════}

{green.bold ✓} {underline Server}:     {green Online}
{yellow.bold ⚠} {underline Memory}:     {yellow 78% used}
{red.bold ✗} {underline Database}:   {red.strikethrough Disconnected}

{dim.italic Last updated: ${new Date().toLocaleTimeString()}}
`);

// ═══════════════════════════════════════════
// REUSABLE STYLED FUNCTIONS (THEMES)
// ═══════════════════════════════════════════

const theme = {
  title: chalk.bold.underline.hex("#A78BFA"),
  success: chalk.green.bold,
  warning: chalk.yellow.bold,
  error: chalk.red.bold.underline,
  info: chalk.blueBright,
  muted: chalk.gray.italic,
  highlight: chalk.bgYellow.black.bold,
  code: chalk.bgGray.white,
  link: chalk.cyan.underline,
};

console.log(theme.title("Application Report"));
console.log(theme.success("✓ All tests passed"));
console.log(theme.warning("⚠ Deprecation warnings found"));
console.log(theme.error("✗ Critical error in module"));
console.log(theme.info("ℹ Running in development mode"));
console.log(theme.muted("Last run: 2 minutes ago"));
console.log(theme.highlight(" NEW "), "Feature released");
console.log(theme.code(" npm install chalk "));
console.log(theme.link("https://github.com/chalk/chalk"));

// ═══════════════════════════════════════════
// CONDITIONAL / DYNAMIC STYLING
// ═══════════════════════════════════════════

const statusBadge = (status: "ok" | "warn" | "error") => {
  const styles = {
    ok: chalk.bgGreen.black.bold,
    warn: chalk.bgYellow.black.bold,
    error: chalk.bgRed.white.bold,
  };
  return styles[status](` ${status.toUpperCase()} `);
};

console.log(`Build: ${statusBadge("ok")}`);
console.log(`Lint:  ${statusBadge("warn")}`);
console.log(`Test:  ${statusBadge("error")}`);

// ═══════════════════════════════════════════
// DISABLE COLORS PROGRAMMATICALLY
// ═══════════════════════════════════════════

const plain = new chalk.Instance({ level: 0 }); // No colors
console.log(plain.red("This will NOT be red"));

// Force colors even when not TTY
const forced = new chalk.Instance({ level: 3 }); // TrueColor
console.log(forced.hex("#FF0000")("Forced red"));
```


</file>
<file name="ora.md" path="~/dev/all-agents/context/blocks/tools/ora.md">

##### ora

Elegant terminal spinners.

###### Usage

```typescript
import ora from "ora";

const spinner = ora("Loading...").start();

// ... async work

spinner.succeed("Done!");
// or
spinner.fail("Failed!");
// or
spinner.warn("Warning!");
```

###### With async

```typescript
const spinner = ora("Fetching data...").start();
try {
  const data = await fetchData();
  spinner.succeed("Data fetched");
} catch (error) {
  spinner.fail("Fetch failed");
}
```


</file>

##### @clack/prompts

Interactive CLI prompts and spinners.

###### Usage

```typescript
import * as p from "@clack/prompts";

const result = await p.select({
  message: "Choose an option",
  options: [
    { value: "opt1", label: "Option 1" },
    { value: "opt2", label: "Option 2" }
  ]
});

const spinner = p.spinner();
spinner.start("Loading...");
// work
spinner.stop("Done!");
```

#### Conditional Verbosity

You must be able to control the verbosity of the CLI output.

**Debug Mode:**
Debug mode is enabled via the `AAA_DEBUG` environment variable, not via a `--verbose` flag.
Use the `debug()` function from `@tools/env` to conditionally log debug information.

```typescript
import log from "@lib/log";
import { debug } from "@tools/env";

// Always show
log.success("Done!");
log.error("Failed");

// Debug mode only
if (debug()) {
  log.dim("Debug: processing file.ts");
}
```

### Best Practices

**DO:**

- ✅ `console.log()` for stdout (normal output)
- ✅ `console.error()` for stderr (errors)
- ✅ `console.warn()` for stderr (warnings)
- ✅ Create a logger wrapper to hide the console.log/error calls
- ✅ Use chalk for colors
- ✅ Use ora for spinners/progress
- ✅ Respect debug mode via `AAA_DEBUG` env var

**DON'T:**

- ❌ Output JSON (unless explicit `--json` flag)
- ❌ Use pino/winston
- ❌ Log to files (use stdout/stderr)


</file>

# Testing

<file name="unit-testing.md" path="~/dev/all-agents/context/blocks/patterns/unit-testing.md">


## Unit Testing Patterns

<file name="testing.md" path="~/dev/all-agents/context/blocks/principles/testing.md">

### Testing principles

- **Parameterize for data variance, individualize for behavioral variance.**
- Tests must always be updated when behavior changes, don't force green
- Test names must tell a story, be descriptive and concise.
- Tests serve as documentation

### Parameterized vs Individual Tests

#### Use Parameterized Tests When:

1. **Testing pure functions with clear input/output mapping**
   - Validation functions (email, phone, etc.)
   - Formatters/parsers
   - Math/calculation functions
2. **Edge cases follow the same pattern**
   - Same assertions, different data
   - Minimal or identical setup/teardown
3. **You want to document expected behavior as data**
   - Test cases serve as specification
   - Easy for non-technical stakeholders to review

Example:

```typescript
test.each([
  { input: "user@example.com", expected: true, case: "valid email" },
  { input: "no-at-sign", expected: false, case: "missing @" },
  { input: "@example.com", expected: false, case: "missing local" },
  { input: "user@", expected: false, case: "missing domain" },
])("email validation: $case", ({ input, expected }) => {
  expect(isValidEmail(input)).toBe(expected);
});
```

#### Use Individual Tests When:

1. **Setup/teardown differs significantly per case**

   - Different mocks needed
   - Different database states
   - Different authentication contexts

2. **Assertions vary in complexity or type**
   - Some cases check structure, others check side effects
   - Error vs success paths need different validation
3. **Business scenarios are distinct**

   - Each test tells a different story
   - Test names are descriptive narratives

4. **Debugging needs clarity**
   - Complex async operations
   - Integration tests with multiple steps
   - When failure context matters more than data patterns

#### Decision Tree

```
Is this a pure function with clear input → output?
├─ YES → Are edge cases similar in structure?
│  ├─ YES → Use parameterized tests ✓
│  └─ NO  → Use individual tests
└─ NO  → Does each test need different setup/mocks?
   ├─ YES → Use individual tests ✓
   └─ NO  → Use parameterized tests ✓
```


</file>

### Parameterized Tests

```typescript
test.each([
  { input: "user@example.com", expected: true, case: "valid email" },
  { input: "no-at-sign", expected: false, case: "missing @" },
  { input: "@example.com", expected: false, case: "missing local" },
  { input: "user@", expected: false, case: "missing domain" },
])("email validation: $case", ({ input, expected }) => {
  expect(isValidEmail(input)).toBe(expected);
});
```

### Individual Tests

```typescript
test("should create user and send welcome email", async () => {
  vi.mocked(emailService.send).mockResolvedValue({ id: "msg-123" });

  const user = await createUser({ email: "new@example.com" });

  expect(user.id).toBeDefined();
  expect(emailService.send).toHaveBeenCalledWith({
    to: "new@example.com",
    template: "welcome",
  });
});

test("should rollback user creation if email fails", async () => {
  vi.mocked(emailService.send).mockRejectedValue(new Error("SMTP down"));

  await expect(createUser({ email: "new@example.com" })).rejects.toThrow(
    "SMTP down"
  );

  const users = await db.users.findAll();
  expect(users).toHaveLength(0); // rollback verified
});
```

### Hybrid Approach

```typescript
describe("UserService.updateProfile", () => {
  // Parameterize validation failures
  test.each([
    { field: "email", value: "invalid", error: "Invalid email" },
    { field: "age", value: -5, error: "Age must be positive" },
  ])("rejects invalid $field", async ({ field, value, error }) => {
    await expect(updateProfile({ [field]: value })).rejects.toThrow(error);
  });

  // Separate test for success path with side effects
  test("updates profile and invalidates cache", async () => {
    await updateProfile({ name: "New Name" });

    expect(cache.delete).toHaveBeenCalledWith("user:123");
    expect(auditLog.record).toHaveBeenCalledWith("PROFILE_UPDATED");
  });
});
```


</file>
<file name="cli-e2e-test-with-bun.md" path="~/dev/all-agents/context/blocks/patterns/cli-e2e-test-with-bun.md">


## E2E CLI Testing

Patterns for testing CLI commands end-to-end using `bun:test` + `execa`.

### Why This Is a Mess

This document uses a mix of Bun-native and Node APIs. Here's why:

| Need            | Ideal (Bun-native)    | Reality                        |
| --------------- | --------------------- | ------------------------------ |
| File matching   | `Bun.Glob` ✓          | Works great                    |
| Read files      | `Bun.file().text()`   | Async-only, can't use in hooks |
| Write files     | `Bun.write()`         | Async-only, can't use in hooks |
| Check existence | `Bun.file().exists()` | Async-only, can't use in hooks |
| Directory paths | `import.meta.dir` ✓   | Works great                    |

**The problem:** Bun's test runner has bugs with async lifecycle hooks:

- [#19660](https://github.com/oven-sh/bun/issues/19660): Async tests may run concurrently instead of sequentially
- [#21830](https://github.com/oven-sh/bun/issues/21830): `beforeAll` in nested describes runs at wrong time

**The workaround:** Use sync fs operations in hooks. But Bun's native file APIs are async-only, so we fall back to `node:fs` for sync operations.

This is pragmatic, not principled. Revisit when those issues are closed.

### Setup

```typescript
import {
  describe,
  expect,
  test,
  beforeAll,
  beforeEach,
  afterEach,
} from "bun:test";
import { execa } from "execa";

// Bun-native: no equivalent in Node
// Used for: directory resolution, file matching
// import.meta.dir - Bun-only, returns directory as string

// Node fallback: needed because Bun.file() is async-only
// Used for: sync operations in lifecycle hooks (workaround for Bun bugs)
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
```

### Basic Command Tests

```typescript
describe("my-cmd CLI", () => {
  test("--help shows usage", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "src/cli.ts",
      "--help",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
  });

  test("missing arg fails", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "src/cli.ts", "my-cmd"],
      { reject: false } // Don't throw on non-zero exit
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("missing required argument");
  });
});
```

### Auth/API Key Checks

```typescript
function hasApiKey(): boolean {
  return process.env.MY_API_KEY !== undefined && process.env.MY_API_KEY !== "";
}

describe("my-cmd E2E", () => {
  beforeAll(() => {
    if (!hasApiKey()) {
      throw new Error(
        "API key required.\n\n" +
          "Get key at: https://example.com\n" +
          "Then: export MY_API_KEY=your-key\n"
      );
    }
  });
  // ...tests
});
```

### File Output Validation

```typescript
interface CommandOutput {
  items: Array<{ id: string; name: string }>;
  metadata?: { generatedAt: string };
}

const TEST_TIMEOUT_MS = 120_000;
// Allow 10s buffer for test framework overhead (assertions, cleanup)
const COMMAND_TIMEOUT_MS = TEST_TIMEOUT_MS - 10_000;

describe("my-cmd E2E", () => {
  const createdFiles: Array<string> = [];

  // SYNC REQUIRED: Bun bug #19660 - async hooks may not complete before test runs
  afterEach(() => {
    const files = [...createdFiles];
    createdFiles.length = 0;
    for (const f of files) {
      try {
        rmSync(f, { force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test(
    "creates valid output files",
    async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "src/cli.ts", "my-cmd", "query"],
        { reject: false, timeout: COMMAND_TIMEOUT_MS }
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Done!");

      // Bun-native glob (no npm package needed)
      const glob = new Bun.Glob("output/raw/*.json");
      const jsonFiles = Array.from(glob.scanSync(".")).sort().reverse();
      expect(jsonFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles.at(0)!;
      createdFiles.push(jsonFile);

      // Using node:fs because we need sync in afterEach anyway
      // Could use Bun.file().exists() here, but keeping consistent
      expect(existsSync(jsonFile)).toBe(true);

      // node:fs sync - could use `await Bun.file(jsonFile).json()` here
      // but staying consistent with sync approach
      const content = readFileSync(jsonFile, "utf8");
      const data: CommandOutput = JSON.parse(content);
      expect(data).toHaveProperty("items");
      expect(Array.isArray(data.items)).toBe(true);
    },
    TEST_TIMEOUT_MS
  );
});
```

### Temp Directory Pattern

```typescript
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("my-cmd E2E", () => {
  let tempDir = "";

  // SYNC REQUIRED: Bun bug #19660, #21830
  // Cannot use async mkdir here - test body may start before it completes
  beforeEach(() => {
    tempDir = join(
      tmpdir(),
      `test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (tempDir !== "" && existsSync(tempDir)) {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  test("does something with temp files", async () => {
    // tempDir is guaranteed to exist here (because sync)
  });
});
```

### Environment Override

```typescript
test("shows error without API key", async () => {
  const { exitCode, stdout } = await execa(
    "bun",
    ["run", "src/cli.ts", "my-cmd", "--query", "test"],
    {
      env: { ...process.env, MY_API_KEY: "" },
      reject: false,
    }
  );
  expect(exitCode).toBe(1);
  expect(stdout).toContain("API key required");
});
```

### Working Directory

Tests may run from different directories. Set explicit `cwd` to ensure consistency:

```typescript
import { getProjectRoot } from "@tools/utils/paths.js";

const PROJECT_ROOT = getProjectRoot();

// Ensures test works regardless of cwd
await execa("bun", ["run", "src/cli.ts", "my-cmd", "arg"], {
  cwd: PROJECT_ROOT,
});
```

Implementation of `getProjectRoot()` is outside the scope of this document — typically it walks up the directory tree looking for a marker like `package.json` or `.git`.

### Patterns Summary

| Pattern                       | Usage                               |
| ----------------------------- | ----------------------------------- |
| `{ reject: false }`           | Test expected failures              |
| `timeout: COMMAND_TIMEOUT_MS` | Long-running commands (with buffer) |
| `createdFiles` array          | Track files for cleanup             |
| `Bun.Glob`                    | Native file matching                |
| `import.meta.dir`             | Bun-native directory path           |
| `node:fs` sync ops            | Workaround for Bun async hook bugs  |
| `beforeAll` auth check        | Fail fast with helpful message      |
| `afterEach` cleanup           | Remove test artifacts               |

### Alternatives

If this hybrid approach bothers you:

- **Vitest**: Mature async handling, same Jest-like API, can still run on Bun runtime
- **Wait**: These Bun bugs may be fixed soon, then go full Bun-native
- **Inline setup**: Skip hooks entirely, do setup/teardown in each test body


</file>

Tests go in `tools/tests/e2e/<command>.test.ts`

Run: `bun test tools/tests/e2e/`

# Code Standards

<file name="code-standards.md" path="~/dev/all-agents/context/foundations/code-standards.md">


## Code Standards

Package.json scripts that must be included, and taxonomy of naming scripts.
How linting, formatting, and git hooks work together.

## How to write code The following instructions MUST BE FOLLOWED:

<file name="coding-style.md" path="~/dev/all-agents/context/blocks/principles/coding-style.md">

### Code Standards

#### Quick Reference

- One function, one algorithm. No boolean flags that switch code paths.
- Core functions execute; composition layers select. Use exhaustive `switch` with `never` checks.
- Names are documentation: `timeoutMs`, `priceGBP`, `isValid`, `hasAccess`.
- Comments explain WHY (constraints, trade-offs, gotchas). Never narrate what code does.
- Convenience wrappers are fine IF they're pure delegation with zero logic.
- Duplication beats wrong abstraction. Only DRY when algorithms are truly identical.

---

#### Architecture: Decisions at the Edges

Strategy selection happens at application boundaries (route handlers, CLI entry points, config). Core business logic receives already-made decisions and executes them.

##### Rules

- NEVER put algorithm selection (`if`/`switch` on type/mode) inside business functions
- Entry points parse input → select strategy → call core → format output
- Use explicit `switch` statements with TypeScript's `never` exhaustiveness check
- Core functions receive dependencies as parameters, never import and select them

##### Example

```typescript
// ❌ Decision buried in core
function processPayment(amount: number, method: "stripe" | "paypal") {
  if (method === "stripe") {
    return stripeClient.charge(amount);
  } else {
    return paypalClient.send(amount);
  }
}

// ✅ Core executes, edge selects
type PaymentProcessor = { charge: (amount: number) => Promise<Receipt> };

const processPayment = (processor: PaymentProcessor) => (amount: number) =>
  processor.charge(amount);

// At the edge (route handler, CLI, etc.)
function handlePaymentRoute(req: Request) {
  const processor = selectProcessor(req.body.method); // switch statement here
  return processPayment(processor)(req.body.amount);
}

function selectProcessor(method: "stripe" | "paypal"): PaymentProcessor {
  switch (method) {
    case "stripe":
      return stripeProcessor;
    case "paypal":
      return paypalProcessor;
    default:
      assertNever(method);
  }
}
```

---

#### Function Design: Data vs Behavior

**Data variance**: Different values, same algorithm → use parameters.  
**Behavioral variance**: Different algorithms → use separate functions.

##### Rules

- NEVER use boolean flags that switch between code paths inside a function
- NEVER use string/enum "type" parameters that trigger internal branching
- Parameters are for values that flow through unchanged: counts, thresholds, IDs, config
- If changing a parameter changes the algorithm (not just inputs), split into separate functions

##### Litmus Test

Ask: "If I change this value, does the algorithm change, or just the inputs?"

- Same algorithm → parameterize
- Different algorithm → separate functions

##### Example

```typescript
// ❌ Boolean flag switches behavior
function sendNotification(userId: string, message: string, isUrgent: boolean) {
  if (isUrgent) {
    return smsGateway.send(userId, message); // Different algorithm
  }
  return emailService.queue(userId, message); // Different algorithm
}

// ✅ Separate functions for different algorithms
const sendUrgentNotification = (userId: string, message: string) =>
  smsGateway.send(userId, message);

const sendStandardNotification = (userId: string, message: string) =>
  emailService.queue(userId, message);

// ✅ Parameterize when algorithm is the same
function applyDiscount(subtotal: number, discountPercent: number): number {
  return subtotal * (1 - discountPercent); // Same formula, different values
}
```

---

#### Naming: Make Implicit Explicit

Names carry enough context that readers rarely need to check implementations.

##### Rules

- Booleans: prefix with `is`, `has`, `should`, `can`, `will`
- Functions: verbs describing the action (`fetchUser`, `validateInput`, `calculateTotal`)
- Data/types: nouns describing the thing (`UserProfile`, `orderItems`, `connectionConfig`)
- Include units in numeric names: `timeoutMs`, `maxRetryCount`, `priceInCents`, `distanceKm`
- Include domain context: `apiRateLimitPerSecond` not just `limit`
- Avoid abbreviations unless industry-standard (`id`, `url`, `html`, `api`)

##### Example

```typescript
// ❌ Implicit, unclear
const t = 5000;
const flag = true;
function process(data: any, opt: boolean) {}

// ✅ Explicit, self-documenting
const connectionTimeoutMs = 5000;
const hasActiveSubscription = true;
function validateUserInput(
  formData: ContactForm,
  shouldSanitizeHtml: boolean
) {}
```

---

#### Comments: Intent, Not Mechanics

Code shows WHAT. Comments explain WHY.

##### Rules

- NEVER narrate implementation steps or restate what code does
- DO document: rationale, constraints from external systems, non-obvious trade-offs, invariants, gotchas
- If you need to explain HOW code works, refactor for clarity instead
- Mark technical debt with explanation of the trade-off

##### Example

```typescript
// ❌ Narrates the obvious
// Loop through users and filter active ones
const activeUsers = users.filter((u) => u.isActive);

// ❌ Restates the code
// Set timeout to 30 seconds
const timeoutMs = 30_000;

// ✅ Explains WHY
// Stripe's API has a known race condition where webhooks can arrive before
// the charge object is fully hydrated. 500ms covers 99th percentile latency.
await delay(500);

// ✅ Documents constraint
// Order matters: auth middleware must run before rate limiting
// because rate limits are per-user, not per-IP
app.use(authMiddleware);
app.use(rateLimitMiddleware);

// ✅ Marks trade-off
// TODO: O(n²) but n < 100 in practice. Profile before optimizing.
```

---

#### Convenience Facades

DX wrappers over parameterized cores are fine IF they contain zero logic.

##### Rules

- Build the flexible, parameterized version first (source of truth)
- Convenience functions MUST be pure delegation: no conditionals, no additional behavior
- Test the core thoroughly; convenience wrappers need only smoke tests

##### Example

```typescript
// ✅ Parameterized core (source of truth)
async function httpRequest<T>(config: {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<T> {
  // All logic lives here
}

// ✅ Convenience facades (pure delegation, zero logic)
const get = <T>(url: string) => httpRequest<T>({ method: "GET", url });
const post = <T>(url: string, body: unknown) =>
  httpRequest<T>({ method: "POST", url, body });
const put = <T>(url: string, body: unknown) =>
  httpRequest<T>({ method: "PUT", url, body });
const del = <T>(url: string) => httpRequest<T>({ method: "DELETE", url });
```

---

#### Anti-Patterns to Avoid

##### God Objects

```typescript
// ❌ Accumulates unrelated options
function createUser(options: {
  name: string;
  email: string;
  sendWelcomeEmail: boolean; // Behavioral flag
  notificationPreference: string; // Unrelated concern
  analyticsId?: string; // Unrelated concern
  theme: "light" | "dark"; // UI concern in domain function
}) {}

// ✅ Focused configuration, separate concerns
function createUser(profile: UserProfile): User {}
function sendWelcomeEmail(user: User): void {}
function setNotificationPreference(
  userId: string,
  pref: NotificationPref
): void {}
```

##### Wrong Abstraction

```typescript
// ❌ Premature DRY - these look similar but vary independently
function processEntity(
  entity: User | Product | Order,
  type: "user" | "product" | "order"
) {
  if (type === "user") {
    /* user-specific logic */
  } else if (type === "product") {
    /* product-specific logic */
  } else {
    /* order-specific logic */
  }
}

// ✅ Separate functions - duplication is better than wrong abstraction
function processUser(user: User) {}
function processProduct(product: Product) {}
function processOrder(order: Order) {}

// If they share code, extract a utility they both call
function validateTimestamp(ts: Date): boolean {} // Shared utility
```

##### Stringly-Typed APIs

```typescript
// ❌ Behavior depends on magic strings
function handleEvent(eventType: string, payload: unknown) {
  if (eventType === "user.created") {
  } else if (eventType === "user.deleted") {
  }
}

// ✅ Discriminated union makes it type-safe
type AppEvent =
  | { type: "user.created"; user: User }
  | { type: "user.deleted"; userId: string };

function handleEvent(event: AppEvent) {
  switch (event.type) {
    case "user.created":
      return onUserCreated(event.user);
    case "user.deleted":
      return onUserDeleted(event.userId);
    default:
      assertNever(event);
  }
}
```

---

#### TypeScript Patterns

##### Exhaustive Switch (Decisions at the Edges)

Use in composition layers for strategy selection. Compiler catches missing cases.

```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

type Status = "pending" | "approved" | "rejected";

function handleStatus(status: Status): string {
  switch (status) {
    case "pending":
      return "Waiting for review";
    case "approved":
      return "Ready to proceed";
    case "rejected":
      return "Please resubmit";
    default:
      return assertNever(status); // Compiler error if case missed
  }
}
```

##### Boundary Validation (Decisions at the Edges)

Validation is a decision—do it at system boundaries, not scattered through core logic.

```typescript
import { z } from "zod";

// Define shape expectations at the boundary
const CreateOrderInput = z.object({
  customerId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .nonempty(),
  discountCode: z.string().optional(),
});

type CreateOrderInput = z.infer<typeof CreateOrderInput>;

// ✅ Boundary: parse unknown input, handle validation errors
function createOrderHandler(req: Request) {
  const input = CreateOrderInput.parse(req.body); // Throws if invalid
  return createOrder(input);
}

// ✅ Core: receives validated data, no defensive checks needed
function createOrder(input: CreateOrderInput): Order {
  // Trust the types - validation already happened at the edge
}
```

##### Config Objects with `satisfies` (Make Implicit Explicit)

Type-check config without losing literal inference.

```typescript
const config = {
  apiUrl: "https://api.example.com",
  timeoutMs: 5000,
  retryCount: 3,
} satisfies Readonly<ApiConfig>;
// Gets type checking AND preserves literal types
```

---

#### Testing Expectations

- Each strategy tested in isolation
- Composition layer tested with mocked strategies
- Core functions: thorough unit tests
- Convenience wrappers: smoke tests only (they're pure delegation)
- When splitting a function with boolean flags, test count becomes additive not multiplicative

---

#### Summary: Decision Framework

When writing a new function, ask:

1. **Am I selecting between algorithms?** → Move selection to composition layer
2. **Does this parameter change the algorithm or just inputs?** → Split if algorithm changes
3. **Can I understand this without reading the implementation?** → Rename if not
4. **Am I commenting WHAT instead of WHY?** → Delete or refactor
5. **Is this abstraction forced?** → Prefer duplication over wrong abstraction


</file>

## Tools to uphold code standards

<file name="eslint.md" path="~/dev/all-agents/context/blocks/tools/eslint.md">


### ESLint

JavaScript/TypeScript linter for code quality.

#### Install

Install the eslint configuration from: https://www.npmjs.com/package/uba-eslint-config

#### Configure

**eslint.config.js:**

```typescript
import { ubaEslintConfig } from "uba-eslint-config";

export default [...ubaEslintConfig];
```

**Rules must NOT be disabled or modified.**
**DO NOT USE:**

- `eslint-disable` comments
- Rule overrides
- Config modifications

Fix the code to comply with the rules.

#### Exception: no-console for CLI Projects

**For CLI tools ONLY**, the `no-console` rule may be disabled since `console.log`/`console.error` are correct for terminal output.

```typescript
import { ubaEslintConfig } from "uba-eslint-config";

export default [
  ...ubaEslintConfig,
  {
    rules: {
      "no-console": "off",
    },
  },
];
```

**ONLY for CLI projects.** Services, APIs, and web apps must NOT disable this rule.


</file>
<file name="prettier.md" path="~/dev/all-agents/context/blocks/tools/prettier.md">

### Prettier

Opinionated code formatter.

#### Install

Install the prettier configuration from: https://www.npmjs.com/package/uba-prettier-config

#### Configure

Use the config from uba-eslint-config:

**prettier.config.js:**

```typescript
import { ubaPrettierConfig } from "uba-eslint-config";

export default ubaPrettierConfig;
```


</file>
<file name="commitlint.md" path="~/dev/all-agents/context/blocks/tools/commitlint.md">

### commitlint

#### Install

`@commitlint/cli` and `@commitlint/config-conventional`

#### Configure

**commitlint.config.js:**

```typescript
export default {
  extends: ["@commitlint/config-conventional"],
};
```

**Setup commitlint with husky(.husky/commit-msg):**

```bash
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```


</file>
<file name="husky.md" path="~/dev/all-agents/context/blocks/tools/husky.md">

### husky

Git hooks for pre-commit and pre-push.

#### Install

Install husky, run husky init.

#### Configure

##### Pre-commit hook (.husky/pre-commit)

We must run lint:fix, format:check, typecheck, test.

Example with pnpm:

```bash
pnpm lint:fix && pnpm format:check && pnpm typecheck && pnpm test
```

##### Pre-msg hook (.husky/commit-msg)

We must run commitlint.

Example with pnpm:

```bash
pnpm commitlint --edit $1
```


</file>


</file>

## Husky is configured in tools/ folder.

<file name="husky-from-subdir.md" path="~/dev/all-agents/context/blocks/patterns/husky-from-subdir.md">

### Husky from a subdirectory

Subdirectory install (when package.json is not at repo root):

Install husky in the subdirectory, then configure prepare to run from repo root:

```json
// subdirectory/package.json
{
  "scripts": {
    "prepare": "cd .. && ./subdirectory/node_modules/.bin/husky subdirectory/.husky"
  }
}
```

Scoped hook example (only run when subdirectory files are staged):

```bash
# subdirectory/.husky/pre-commit
if git diff --cached --name-only | grep -q "^subdirectory/"; then
  echo "Running subdirectory/ checks..."
  cd subdirectory && bun run lint && bun run format:check && bun run typecheck
fi
```


</file>

## Typescript CLI structure

<file name="ts-cli-structure.md" path="~/dev/all-agents/context/blocks/patterns/ts-cli-structure.md">

### Typescript CLI structure

```
mycli/
├── src/
│   ├── cli.ts           # Entry point
│   ├── commands/        # Command handlers
│   └── lib/             # Shared utilities
├── bin/                 # Compiled binary ( when using bun )
├── package.json
├── tsconfig.json
└── eslint.config.js
```

#### Commands

Specific to bun, to compile to binary:

```bash
bun build ./src/cli.ts --compile --outfile ./bin/mycli  # Build exe
```

#### Minimal CLI example

Colocate command definition + handler, import into central CLI.

Command Files (nested structure with index.ts):

```
src/commands/
├── task/
│   ├── index.ts       # Main task command
│   ├── create.ts      # task create subcommand
│   └── list.ts        # task list subcommand
└── story/
    ├── index.ts       # Main story command
    └── create.ts      # story create subcommand
```

```typescript
// src/commands/task/create.ts
import { Command } from "commander";
import { createTaskFile } from "@lib/tasks";

export const taskCreateCommand = new Command("create")
  .description("Create empty task file with auto-numbered name")
  .argument("<name>", "Task name in kebab-case")
  .option("-d, --dir <path>", "Custom tasks directory", "docs/planning/tasks")
  .action(async (name, opts) => {
    const filepath = await createTaskFile(name, opts.dir);
    console.log(`Created: ${filepath}`);
  });
```

```typescript
// src/commands/task/list.ts
import { Command } from "commander";
import { listTasks } from "@lib/tasks";

export const taskListCommand = new Command("list")
  .description("List all tasks")
  .option("-s, --status <status>", "Filter by status (open|done|blocked)")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const tasks = await listTasks(opts.status);
    if (opts.json) {
      console.log(JSON.stringify(tasks, null, 2));
    } else {
      tasks.forEach((t) => console.log(`${t.id} [${t.status}] ${t.title}`));
    }
  });
```

```typescript
// src/commands/task/index.ts
import { Command } from "commander";
import { taskCreateCommand } from "./create.js";
import { taskListCommand } from "./list.js";

export const taskCommand = new Command("task")
  .description("Task management")
  .addCommand(taskCreateCommand)
  .addCommand(taskListCommand);
```

```typescript
// src/commands/story/create.ts
import { Command } from "commander";
import { createStoryFile } from "@lib/stories";

export const storyCreateCommand = new Command("create")
  .description("Create empty story file with auto-numbered name")
  .argument("<name>", "Story name in kebab-case")
  .option(
    "-d, --dir <path>",
    "Custom stories directory",
    "docs/planning/stories"
  )
  .option("-p, --priority <level>", "Priority (low|medium|high)", "medium")
  .action(async (name, opts) => {
    const filepath = await createStoryFile(name, opts.dir, opts.priority);
    console.log(`Created: ${filepath}`);
  });
```

```typescript
// src/commands/story/index.ts
import { Command } from "commander";
import { storyCreateCommand } from "./create.js";

export const storyCommand = new Command("story")
  .description("Story management")
  .addCommand(storyCreateCommand);
```

Central CLI:

```typescript
// src/cli.ts
import { Command } from "commander";
import { taskCommand } from "./commands/task/index.js";
import { storyCommand } from "./commands/story/index.js";

const program = new Command()
  .name("plan")
  .description("Project planning utilities")
  .version("1.0.0");

program.addCommand(taskCommand);
program.addCommand(storyCommand);

program.parse();
```

### ESLint: Disable no-console acceptable in CLI application

```typescript
// eslint.config.js
import { ubaEslintConfig } from "uba-eslint-config";

export default [...ubaEslintConfig, { rules: { "no-console": "off" } }];
```


</file>

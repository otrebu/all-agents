# TypeScript/JavaScript Tooling Patterns

## TypeScript/JavaScript FP Patterns

**Principle:** See @docs/CODING_STYLE.md#functional-programming-patterns for universal FP guidelines.

**TypeScript/JavaScript specifics:**

- Avoid `this`, `new`, `prototypes` - use functions, modules, closures instead
- Use plain objects `{}`, not class instances
- Only exception: custom errors extending `Error` class

## Import Aliases

**Goal:** Make imports readable, stable, and maintainable across the codebase using import aliases and absolute paths from project root or src/.

### TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/services/*": ["./src/services/*"]
    }
  }
}
```

### Vite Configuration (vite.config.ts)

```typescript
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**IMPORTANT:** Path aliases must be configured in BOTH tsconfig.json (for TypeScript) AND your bundler config (Vite, Webpack, etc.) for your project to work correctly.

## Package Management

### pnpm

```bash
# Install and manage dependencies
pnpm install                         # Install all dependencies
pnpm add <package>                   # Add package to dependencies
pnpm add -D <package>                # Add to devDependencies
pnpm add -g <package>                # Install globally
pnpm remove <package>                # Remove a package
pnpm update                          # Update all dependencies
pnpm update <package>                # Update specific package

# Running scripts
pnpm <script-name>                   # Run package.json script
pnpm run <script-name>               # Same as above (explicit)
pnpm start                           # Run start script
pnpm test                            # Run test script
pnpm exec <command>                  # Execute shell command

# Run commands across workspaces
pnpm -r <command>                    # Run in all workspace packages (recursive)
pnpm -r --filter <pattern> <command> # Run in filtered packages

# Filtering examples
pnpm --filter "./packages/**" build  # Build all packages
pnpm --filter @myorg/api dev         # Run dev in specific package
pnpm --filter "!@myorg/docs" test    # Exclude specific package

# Add dependencies to workspace packages
pnpm add <package> --filter <workspace>  # Add to specific workspace
pnpm add <package> -w                    # Add to workspace root

# Other useful commands
pnpm list                             # List installed packages
pnpm outdated                         # Check for outdated packages
pnpm why <package>                    # Show why package is installed
pnpm store prune                      # Clean up unused packages
pnpm install --frozen-lockfile        # Install without updating lockfile (CI)
```

### Pnpm Workspaces

Monorepo management tool for pnpm.
Use pnpm workspaces to manage dependencies between packages in the monorepo.
Preferred over lerna/yarn/npm workspaces for speed and developer ergonomics.

TypeScript monorepo with pnpm workspaces

Structure:

```text
├── pnpm-workspace.yaml        # Define workspace packages
├── tsconfig.json              # Root - project references only
├── tsconfig.base.json         # Shared compiler options
├── packages/
│   ├── package-a/
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
```

Key files:

- pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"
```

- tsconfig.base.json (strict mode enabled)

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true
  }
}
```

- tsconfig.json (root)

```json
{
  "files": [],
  "references": [
    { "path": "./packages/package-a" },
    { "path": "./packages/package-b" }
  ]
}
```

- packages/\*/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "references": [{ "path": "../dependency-package" }]
}
```

- packages/\*/package.json

```json
{
  "name": "@monorepo/package-name",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "dependencies": {
    "@monorepo/other-package": "workspace:*"
  }
}
```

Commands:

```bash
# Install dependencies
pnpm add <package> --filter @monorepo/target-package
pnpm add -Dw <package>  # Install to workspace root

# Build (uses project references)
tsc --build
pnpm -r build  # All packages

# Type-check
tsc --build --force

# Development
pnpm --filter @monorepo/package-name dev
```

Key points:

- workspace:\* protocol for internal dependencies (auto-converts on publish)
- Project references enforce boundaries and enable incremental builds
- Each package extends tsconfig.base.json for consistent strict mode
- Use tsc --build to respect project references
- Individual packages can override specific strict flags in their local tsconfig if needed

## Runtime & Language

### Node.js

JavaScript runtime for server-side execution.

Prefer using LTS versions. Manage versions with `nvm`.

### TypeScript

Typed superset of JavaScript.

tsconfig.json for most projects.
Source: https://www.totaltypescript.com/tsconfig-cheat-sheet

```json
{
  "compilerOptions": {
    /* Base Options: */
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "es2022",
    "allowJs": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "isolatedModules": true,
    "verbatimModuleSyntax": true,

    /* Strictness */
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,

    /* If transpiling with TypeScript: */
    "module": "NodeNext",
    "outDir": "dist",
    "sourceMap": true,

    /* AND if you're building for a library: */
    "declaration": true,

    /* AND if you're building for a library in a monorepo: */
    "composite": true,
    "declarationMap": true,

    /* If NOT transpiling with TypeScript: */
    "module": "preserve",
    "noEmit": true,

    /* If your code runs in the DOM: */
    "lib": ["es2022", "dom", "dom.iterable"],

    /* If your code doesn't run in the DOM: */
    "lib": ["es2022"]
  }
}
```

## Build & Dev Tools

### Vite

Fast build tool for modern web development.

Initialize a new Vite project:
`pnpm create vite . --template react-ts`

### Xstate

State management library for building complex state machines.
Be careful to use v5 and not v4.

## Code Quality

### ESLint

Linter for identifying and reporting patterns in JavaScript/TypeScript.
Using the config from: https://www.npmjs.com/package/uba-eslint-config.

eslint.config.js:

```typescript
import { ubaEslintConfig } from "uba-eslint-config";

export default [...ubaEslintConfig];
```

**ESLint rules must NOT be disabled or modified.** Do not use eslint-disable comments, rule overrides, or config modifications. Fix the code to comply with the rules.

#### Exception: no-console Rule for CLI Projects

**For CLI tools ONLY**, the `no-console` rule must be disabled since console.log/console.error are the correct way to output to terminals.

**This is the ONLY ESLint rule that can be disabled, and ONLY for CLI projects.** If your project is a service, API, or web application, do NOT disable this rule.

### Prettier

Opinionated code formatter, always use the default settings. So `.prettierrc` should be just {}.
If installed, use the config from: https://www.npmjs.com/package/uba-eslint-config.
Which exports:

```typescript
import { ubaPrettierConfig } from "uba-eslint-config";

export default ubaPrettierConfig;
```

## Testing Framework

### Vitest

Fast unit test framework with native ESM support.

For testing patterns and guidelines, see @docs/typescript/TESTING.md

## UI Libraries

### React

UI library for building component-based interfaces.

Prefer function components with hooks.
Prefer using Xstate for state management alongside with React Context.

### Tailwind

Utility-first CSS framework.

Install Tailwind dependencies:

```bash
pnpm install tailwindcss @tailwindcss/vite
```

Configure Vite - Add the Tailwind plugin to vite.config.ts:

```typescript
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
});
```

Import Tailwind - Add to your main CSS file (e.g., src/style.css):

```css
@import "tailwindcss";
```

Use classes directly in JSX: `className="flex items-center gap-4"`.

### Storybook

Tool for building UI components in isolation.

## Form & Data Libraries

### react-hook-form

Performant form library with easy validation.

```typescript
import { useForm } from "react-hook-form";

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm();
```

### zod

TypeScript-first schema validation library.

```typescript
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
});

type User = z.infer<typeof schema>;
```

### tanstack query

Powerful data fetching and state management for async data.

```typescript
import { useQuery } from "@tanstack/react-query";

const { data, isLoading, error } = useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
});
```

### tanstack router

Type-safe routing library for React.

```typescript
import { createRouter, createRoute } from "@tanstack/react-router";

const route = createRoute({
  path: "/users/$userId",
  component: UserDetail,
});
```

## CLI Tools

### boxen

Create boxes in terminal output.

```typescript
import boxen from "boxen";

console.log(boxen("Hello World", { padding: 1, borderStyle: "round" }));
```

### chalk

Terminal string styling.

```typescript
import chalk from "chalk";

console.log(chalk.blue.bold("Success!"));
```

For CLI logging patterns, see @docs/typescript/LOGGING.md

### commander

CLI framework for building command-line tools.
Always use it with @commander-js/extra-typings to get the best type safety with the least effort.

```typescript
import { Command } from "@commander-js/extra-typings";

const program = new Command();
program.option("-d, --debug", "enable debug mode").action((options) => {
  /* ... */
});
```

### ora

Elegant terminal spinners.

```typescript
import ora from "ora";

const spinner = ora("Loading...").start();
// ... async work
spinner.succeed("Done!");
```

For CLI logging patterns, see @docs/typescript/LOGGING.md

## Utilities

### date-fns

Modern date utility library.

```typescript
import { format, addDays } from "date-fns";

format(new Date(), "yyyy-MM-dd");
addDays(new Date(), 7);
```

### dotenv

Load environment variables from `.env` files.

```typescript
import "dotenv/config";

const apiKey = process.env.API_KEY;
```

## Release Management

### semantic-release

Automated versioning and package publishing based on conventional commits.

**IMPORTANT: CHANGELOG.md files are ONLY created and updated by semantic-release. NEVER create or modify CHANGELOG files manually. All release notes and version history are generated automatically from conventional commit messages.**

```bash
# Install semantic-release and plugins
pnpm add -D semantic-release \
  @semantic-release/commit-analyzer \
  @semantic-release/release-notes-generator \
  @semantic-release/npm \
  @semantic-release/changelog \
  @semantic-release/git \
  @semantic-release/github
```

Configuration file: `release.config.js`

```typescript
export default {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "angular",
        releaseRules: [
          { breaking: true, release: "major" },
          { type: "feat", release: "minor" },
          { type: "fix", release: "patch" },
          { type: "docs", scope: "README", release: "patch" },
          { type: "chore", release: "patch" },
        ],
        parserOpts: {
          noteKeywords: ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"],
        },
      },
    ],
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    ["@semantic-release/changelog", { changelogFile: "CHANGELOG.md" }],
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json"],
        message:
          // eslint-disable-next-line no-template-curly-in-string
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    "@semantic-release/github",
  ],
};
```

Run in CI:

```bash
pnpm exec semantic-release
```

### husky

Git hooks for pre-commit and pre-push.

#### With commitlint

```bash
# Install husky
pnpm add -D husky

# Initialize husky
pnpm exec husky init

# Add commit-msg hook
echo "pnpm commitlint --edit \$1" > .husky/commit-msg
```

#### To run tests

```bash
# Add pre-commit hook
echo "pnpm lint && pnpm format && pnpm test" > .husky/pre-commit
```

## package.json scripts

### Naming convention

- Use base script names with colon-suffixed variants for specific actions.
- Use `:fix` for auto-fixing variants and `:check` for no-write verification.
- Keep names lowercase and consistent across packages.

### Basic commands

- **Linting**
  - `lint`: Run ESLint
  - `lint:fix`: Fix linting issues
- **Testing**
  - `test`: Run all tests
- **Building**
  - `build`: Build all packages
- **Formatting**
  - `format`: Format code with Prettier
  - `format:check`: Check formatting without changes

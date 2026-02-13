# Context Documentation

SWEBOK-aligned atomic documentation: blocks → foundations → stacks → workflows

For full philosophy and naming conventions: @context/blocks/docs/atomic-documentation.md

---

## SWEBOK vs Logical Domains

**SWEBOK Domains** = Software engineering **activities** (what you DO)

Cross-cut entire application. Organized by engineering concern.

| Domain | Activity | Examples |
|--------|----------|----------|
| **construct** | Build, compile, bundle, package | tsc, vite, docker, package.json |
| **test** | Verify code | vitest, playwright, coverage |
| **quality** | Lint, format, analyze | eslint, prettier, dead code detection |
| **security** | Secure, scan, harden | auth, secrets, vulnerability scans |
| **scm** | Version, release, publish | git, semantic-release, npm publish |
| **ops** | Deploy, orchestrate, infra | CI/CD, docker, kubernetes |
| **observe** | Log, trace, monitor | pino, sentry, prometheus |
| **docs** | Document, diagram | ADRs, API docs, architecture diagrams |

**Logical Domains** = Application **layers** (what part of the APP)

Vertical slices. Traditional architecture boundaries.

| Domain | Purpose | Contains |
|--------|---------|----------|
| **frontend** | UI layer | React, state, routing |
| **backend** | API/server | REST endpoints, business logic |
| **database** | Data layer | Schema, migrations, queries |

### Key Difference

**SWEBOK (context/):** "How do I **test**?" → applies to frontend AND backend
**Logical (docs/):** "What's in **frontend**?" → includes testing, building, security, deployment

**Example: Authentication**

- **SWEBOK view:** security/auth.md, test/auth-tests.md, ops/deploy-auth.md
- **Logical view:** backend/AUTHENTICATION.md (contains security + testing + deployment)

**This repo:**
- `context/` = Reusable SWEBOK-organized patterns (cross-project)
- `docs/` = Project-specific logical-organized documentation (this codebase)

---

## Structure

```
context/
├── blocks/           # Atomic units by SWEBOK domain
│   ├── construct/    # build/bundle/package tools
│   ├── test/         # testing
│   ├── quality/      # lint/format/style
│   ├── security/     # auth/secrets
│   ├── scm/          # version control
│   ├── observe/      # logging/monitoring
│   ├── docs/         # documentation/prompting
│   └── patterns/     # reusable processing patterns
│
├── foundations/      # Capabilities by SWEBOK domain
│   ├── construct/    # build/execution strategies
│   ├── test/         # testing strategies
│   ├── quality/      # quality gates
│   ├── security/     # auth + secrets management
│   ├── scm/          # commit strategies
│   └── observe/      # logging strategies
│
├── stacks/           # Complete setups by artifact type
│   ├── cli/          # CLI apps
│   ├── api/          # API services
│   ├── web/          # web apps
│   ├── library/      # libraries
│   ├── shared/       # shared packages
│   └── monorepo/     # monorepo coordination
│
└── workflows/        # dev processes
```

---

## Blocks

Atomic units organized by **SWEBOK domain**. Single concern, tool-centric.

### construct/

Build, compile, bundle, package.

**Runtimes & Package Managers:** bun, node, pnpm, pnpm-workspaces, tsx, tsc, tsc-alias, tsc-esm-fix

**TypeScript Configs:** tsconfig-base, tsconfig-web, tsconfig-monorepo-root

**Package.json Patterns:** package-json-base, package-json-app, package-json-web, package-json-cli, package-json-library, package-json-monorepo-root, package-json-react

**Frontend:** react, vite, tailwind, shadcn, storybook, tanstack-query, tanstack-router, tanstack-start

**Backend:** fastify, orpc, prisma, postgres

**Validation & State:** zod, react-hook-form, xstate, xstate-store, immer

**CLI Tools:** commander, chalk, ora, boxen

**Utilities:** date-fns, dotenv, fast-xml-parser

**External Tools:** gemini-cli, gh-search, parallel-search

**Project Structure:** tree-monorepo

**Permissions:** claude-code-permissions

**Ralph:** ralph-patterns

### test/

Verify code.

- testing.md - Testing philosophy & patterns
- unit-testing.md - Unit testing approach
- vitest.md - Vitest test runner
- react-testing-library.md - RTL component testing
- storybook.md - Component testing + a11y
- eval-test-doc.md - AI agent evaluation testing

### quality/

Lint, format, analyze.

- coding-style.md - FP patterns, naming conventions
- error-handling.md - Error handling philosophy
- eslint.md - Linting
- prettier.md - Formatting
- accessibility.md - WCAG 2.1 AA compliance

### security/

Secure, scan, harden.

- dotenv.md - Environment variables
- better-auth.md - TypeScript auth library

### scm/

Version, release, publish.

- husky.md - Git hooks
- commitlint.md - Commit linting
- semantic-release.md - Automated releases
- git-gtr.md - Git worktree management (git-worktree-runner)

### observe/

Log, trace, monitor.

- logging.md - Logging principles
- sentry.md - Error tracking and performance monitoring
- web-vitals.md - Core Web Vitals measurement

### docs/

Document, diagram, prompting.

- atomic-documentation.md - This atomic docs system
- maintenance.md - Maintenance patterns for atomic docs
- vocabulary.md - Terminology standards
- task-management.md - Task approaches
- task-template.md - Task file template
- story-template.md - Story file template
- prompting.md - Context engineering
- prompting-optimize.md - Prompt optimization
- prompting-agent-templates.md - AI agent patterns

### patterns/

Reusable processing patterns.

- triage.md - Dedupe, score, rank, group pattern

---

## Foundations

Capabilities organized by **SWEBOK domain**. Capability-centric, composable.

### construct/

Build, execute, bundle, package, parse, patterns.

- exec-bun.md - Bun native TypeScript execution
- exec-tsx.md - tsx runtime execution
- transpile-esm-tsc.md - tsc build pipeline
- bundle-web-vite.md - Vite bundler for web
- monorepo-pnpm-base.md - pnpm workspace coordination
- parse-xml-zod.md - XML parsing with Zod validation
- tree-cli.md - CLI project structure
- validate-forms-react.md - React form validation
- patterns-react.md - React hooks, context, and state management patterns
- error-handling-react.md - React error boundaries
- code-splitting.md - React lazy loading patterns
- data-persist-prisma.md - Database persistence with Prisma + PostgreSQL

### test/

Testing strategies.

- test-unit-vitest.md - Unit testing with Vitest
- test-component-vitest-rtl.md - Component testing with Vitest + RTL
- test-e2e-cli-bun.md - CLI E2E testing with Bun
- test-e2e-cli-node.md - CLI E2E testing with Node
- test-e2e-web-playwright.md - Web E2E testing with Playwright
- test-visual-web-agent-browser.md - Visual UI verification with Agent Browser
- test-integration-api.md - API integration testing
- test-integration-db.md - Database integration testing (ORM-agnostic)

### quality/

Quality gates.

- gate-standards.md - ESLint + Prettier + Husky integration

### security/

Auth and secrets management.

- secrets-env-typed.md - Type-safe environment configuration (backend)
- secrets-env-vite.md - Type-safe environment configuration (Vite/frontend)
- secrets-env-dotenv.md - dotenv implementation
- secrets-env-monorepo.md - Monorepo environment layering patterns
- secrets-env-monorepo-node.md - Node.js-specific monorepo patterns
- secrets-env-monorepo-bun.md - Bun-specific monorepo patterns
- auth-better-auth.md - Better Auth React integration
- auth-session-react.md - Session handling patterns
- auth-protected-routes.md - Route protection patterns

### scm/

Version control strategies.

- commit-monorepo-subdir.md - Monorepo commit patterns

### observe/

Logging, metrics, and error strategies.

- log-structured-cli.md - CLI logging (chalk, terminal)
- log-structured-service.md - Service logging (pino, structured)
- metrics-web-vitals.md - Web Vitals reporting (analytics, Sentry)
- errors-sentry-react.md - Sentry React integration

---

## Stacks

Complete project setups organized by **artifact type** (not domain—stacks span domains).

### cli/

- cli-bun.md - Bun CLI
- cli-pnpm-tsx.md - Node + pnpm CLI with tsx

### api/

- api-pnpm-tsx-fastify.md - Fastify API with tsx
- api-pnpm-tsx-orpc.md - oRPC API with tsx (RPC + REST + OpenAPI)

### web/

- web-pnpm-vite-react.md - CSR React SPA with Vite
- web-pnpm-tanstack-start.md - SSR React with TanStack Start

### library/

- library-pnpm-tsc.md - TypeScript library with tsc
- library-react-pnpm-vite.md - React component library with Vite

### shared/

- shared-pnpm-tsc.md - Shared package with tsc
- shared-pnpm-tsx.md - Shared package with tsx
- shared-react-pnpm-vite.md - Shared React package with Vite

### monorepo/

- monorepo-pnpm-coordination.md - pnpm workspace coordination
- monorepo-pnpm-tsc-api.md - API monorepo with tsc
- monorepo-pnpm-tsc-fullstack.md - Full-stack monorepo
- monorepo-pnpm-tsc-orpc.md - oRPC monorepo with tsc
- monorepo-pnpm-tsx-orpc.md - oRPC monorepo with tsx

---

## Workflows

Development processes.

- dev-lifecycle.md - Complete development workflow
- start-feature.md - Feature worktree creation
- commit.md - Conventional commits
- complete-feature.md - Merge to main and clean up worktree
- code-review.md - Review checklist
- refactoring.md - Refactoring patterns
- consistency-checker.md - Consistency validation
- manage-atomic-doc.md - Create/update atomic documentation
- review-atomic-doc.md - Quality gate for atomic docs
- ralph/planning/components/testing-guidance.md - Testing decision guidance for Ralph planning
- ralph/planning/components/testing-profile-contract.md - Shared AC/test profile contract for Ralph planning/building

---

## Reference Format

Use `@` prefix for cross-references:

```
@context/blocks/construct/bun.md
@context/foundations/construct/exec-tsx.md
@context/stacks/cli/cli-bun.md
@context/workflows/commit.md
```

---

## Frontmatter

All files use YAML frontmatter for dependencies and tags:

```yaml
---
depends:
  - "@context/blocks/construct/tsx.md"
  - "@context/blocks/construct/tsconfig-base.md"
tags: [core, cli]
---
```

**Tags:** Minimal—only cross-cutting concerns not already in folder structure.

---

## Reference Management (at-ref)

We use `at-ref` to manage documentation links and compile modular docs into single files. This project relies on `@reference` paths (e.g., `@context/blocks/...`) which `at-ref` handles.

### VS Code Extension

Install the `at-ref` extension (search for `otrebu.at-ref` in marketplace) to enable:

- **Validation**: Real-time red squiggles for broken `@reference` paths.
- **Navigation**: Cmd/Ctrl+Click to follow references.
- **Compilation**: Right-click a file -> "Compile with at-ref" to generate a standalone version.

### CLI Tool

Install the CLI globally to validate references across many files:

```bash
npm install -g @u-b/at-ref
# or
pnpm add -g @u-b/at-ref
```

Verify all references in your project:

```bash
at-ref check
```

### Compilation Strategy

Compilation resolves all `@reference` links into actual content, creating a single, portable markdown file.

**When to compile:**

- **Stacks** (`context/stacks/`) and **Foundations** (`context/foundations/`): These are high-level entry points composed of many blocks. Compiling them creates a complete manual for that specific stack.
- **Blocks** (`context/blocks/`): Usually self-contained or low-level. Rarely need compilation.

**Example:**
Generate a complete guide for the API stack:

```bash
at-ref compile context/stacks/api/rest-fastify.md -o dist/api-guide.md
```

---

## Further Reading

- **Full philosophy:** @context/blocks/docs/atomic-documentation.md
- **SWEBOK v3:** Software Engineering Body of Knowledge (free PDF)
- **Aspect-Oriented Programming:** Kiczales et al (cross-cutting concerns)
- **Domain-Driven Design:** Eric Evans (bounded contexts)

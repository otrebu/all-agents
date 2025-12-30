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
│   ├── construct/    # 40 build/bundle/package tools
│   ├── test/         # 4 testing docs
│   ├── quality/      # 4 quality/style docs
│   ├── security/     # 2 security docs
│   ├── scm/          # 3 version control docs
│   ├── observe/      # 1 observability doc
│   └── docs/         # 8 documentation/prompting docs
│
├── foundations/      # Capabilities by SWEBOK domain
│   ├── construct/    # 9 build/execution strategies
│   ├── test/         # 3 testing strategies
│   ├── quality/      # 1 quality gate
│   ├── security/     # 8 auth + secrets management
│   ├── scm/          # 1 commit strategy
│   └── observe/      # 2 logging strategies
│
├── stacks/           # Complete setups by artifact type
│   ├── cli/          # 2 CLI stacks
│   ├── monorepo/     # 4 monorepo stacks
│   ├── web/          # 2 web app stacks
│   └── library/      # 1 library stack
│
└── workflows/        # 7 dev processes
```

---

## Blocks

Atomic units organized by **SWEBOK domain**. Single concern, tool-centric.

### construct/ (38)

Build, compile, bundle, package.

**Runtimes & Package Managers:** bun, node, pnpm, pnpm-workspaces, tsx, tsc, tsc-alias, tsc-esm-fix

**TypeScript Configs:** tsconfig-base, tsconfig-web, tsconfig-monorepo-root

**Package.json Patterns:** package-json-base, package-json-app, package-json-web, package-json-cli, package-json-library, package-json-monorepo-root, package-json-react

**Frontend:** react, vite, tailwind, shadcn, storybook, tanstack-query, tanstack-router, tanstack-start

**Backend:** fastify, orpc

**Validation & State:** zod, react-hook-form, xstate, xstate-store, immer

**CLI Tools:** commander, chalk, ora, boxen

**Utilities:** date-fns, dotenv, fast-xml-parser

**External Tools:** gemini-cli, gh-search, parallel-search

**Project Structure:** tree-monorepo

**Permissions:** claude-code-permissions

### test/ (6)

Verify code.

- testing.md - Testing philosophy & patterns
- unit-testing.md - Unit testing approach
- vitest.md - Vitest test runner
- react-testing-library.md - RTL component testing
- storybook.md - Component testing + a11y
- eval-test-doc.md - AI agent evaluation testing

### quality/ (5)

Lint, format, analyze.

- coding-style.md - FP patterns, naming conventions
- error-handling.md - Error handling philosophy
- eslint.md - Linting
- prettier.md - Formatting
- accessibility.md - WCAG 2.1 AA compliance

### security/ (2)

Secure, scan, harden.

- dotenv.md - Environment variables
- better-auth.md - TypeScript auth library

### scm/ (3)

Version, release, publish.

- husky.md - Git hooks
- commitlint.md - Commit linting
- semantic-release.md - Automated releases

### observe/ (1)

Log, trace, monitor.

- logging.md - Logging principles

### docs/ (9)

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

---

## Foundations

Capabilities organized by **SWEBOK domain**. Capability-centric, composable.

### construct/ (11)

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

### test/ (5)

Testing strategies.

- test-unit-vitest.md - Unit testing with Vitest
- test-component-vitest-rtl.md - Component testing with Vitest + RTL
- test-e2e-cli-bun.md - CLI E2E testing with Bun
- test-e2e-cli-node.md - CLI E2E testing with Node
- test-integration-api.md - API integration testing

### quality/ (1)

Quality gates.

- gate-standards.md - ESLint + Prettier + Husky integration

### security/ (9)

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

### scm/ (1)

Version control strategies.

- commit-monorepo-subdir.md - Monorepo commit patterns

### observe/ (2)

Logging strategies.

- log-structured-cli.md - CLI logging (chalk, terminal)
- log-structured-service.md - Service logging (pino, structured)

---

## Stacks

Complete project setups organized by **artifact type** (not domain—stacks span domains).

### cli/ (2)

- cli-bun.md - Bun CLI
- cli-pnpm-tsx.md - Node + pnpm CLI with tsx

### monorepo/ (4)

- monorepo-pnpm-tsc-api.md - API monorepo with tsc
- monorepo-pnpm-tsc-fullstack.md - Full-stack monorepo
- monorepo-pnpm-tsc-orpc.md - oRPC monorepo with tsc
- monorepo-pnpm-tsx-orpc.md - oRPC monorepo with tsx

### web/ (2)

- web-pnpm-vite-react.md - CSR React SPA with Vite
- web-pnpm-tanstack-start.md - SSR React with TanStack Start

### library/ (1)

- library-react-pnpm-vite.md - React component library with Vite

---

## Workflows

Development processes (9).

- dev-lifecycle.md - Complete development workflow
- start-feature.md - Feature branch creation
- commit.md - Conventional commits
- complete-feature.md - Merge to main
- code-review.md - Review checklist
- refactoring.md - Refactoring patterns
- consistency-checker.md - Consistency validation
- manage-atomic-doc.md - Create/update atomic documentation
- review-atomic-doc.md - Quality gate for atomic docs

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

## Further Reading

- **Full philosophy:** @context/blocks/docs/atomic-documentation.md
- **SWEBOK v3:** Software Engineering Body of Knowledge (free PDF)
- **Aspect-Oriented Programming:** Kiczales et al (cross-cutting concerns)
- **Domain-Driven Design:** Eric Evans (bounded contexts)

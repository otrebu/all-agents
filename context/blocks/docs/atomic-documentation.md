# Atomic Documentation

## The Problem

Software documentation becomes monolithic, duplicated, and tightly coupled. When you prompt AI to generate code, you either dump everything (wasteful, noisy) or write context from scratch (tedious, inconsistent).

What we need:

- Documentation that composes like code
- Each piece is self-contained and declares its dependencies
- AI receives exactly what's relevant
- Documentation stays maintainable as tools and patterns evolve

---

## The Idea

**Atomic Design** (Brad Frost) introduced a hierarchy for UI components: atoms → molecules → organisms → templates → pages. The insight: complex UIs are compositions of simpler, reusable pieces.

**Atomic Documentation** borrows this idea. Each doc is self-contained, declares dependencies, and composes with others. A prompt becomes:

```
prompt = @blocks/construct/tsc.md + @foundations/construct/transpile-esm-tsc.md + @stacks/cli/cli-pnpm-tsc.md
```

---

## Three Layers

| Layer           | Purpose                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| **Blocks**      | Single units of knowledge. The smallest teachable pieces.                 |
| **Foundations** | Capabilities. How blocks compose to achieve something.                    |
| **Stacks**      | Complete project setups. Compose foundations into working configurations. |

The metaphor: blocks are raw materials, foundations are capabilities you build, stacks are complete constructions.

All three layers organized by **domains** aligned with SWEBOK knowledge areas for comprehensive coverage of software engineering concerns.

---

## Domains

Eight domains organize all documentation:

| Domain      | SWEBOK Alignment                      | What It Covers                                          |
| ----------- | ------------------------------------- | ------------------------------------------------------- |
| `construct` | Ch 4: Software Construction           | Building, transpiling, bundling, packaging artifacts    |
| `test`      | Ch 5: Software Testing                | Unit, integration, E2E testing, mocking, coverage       |
| `quality`   | Ch 12: Software Quality               | Linting, formatting, static analysis, code health       |
| `security`  | Ch 13: Software Security              | Vulnerability scanning, secrets, hardening              |
| `scm`       | Ch 8: Software Config Management      | Versioning, branching, releasing, publishing            |
| `ops`       | Ch 6: Software Engineering Operations | CI/CD pipelines, containers, infrastructure, deployment |
| `observe`   | Ch 6 (sub-area)                       | Logging, metrics, tracing, error tracking               |
| `docs`      | Ch 2/3: Architecture & Design         | ADRs, API docs, diagrams, project docs                  |

**Stacks** organize by artifact type (cli, api, library, web, monorepo) not domain, since stacks span multiple domains.

---

## Blocks

The smallest units of documentation. One concern, self-contained, tool-centric.

**Naming:** `blocks/{domain}/{tool}.md` or `blocks/{domain}/{tool}-{variant}.md`

Blocks organized by domain. Examples:

**construct/** — Building code

- `tsc.md`, `tsc-alias.md`, `vite.md`, `bun.md`, `pnpm.md`, `pnpm-workspaces.md`
- `package-json-base.md`, `package-json-cli.md`, `package-json-library.md`
- `tsconfig-base.md`, `tsconfig-library.md`, `tsconfig-monorepo-root.md`
- `docker.md`, `docker-node.md`

**test/** — Verifying code

- `vitest.md`, `bun-test.md`, `playwright.md`, `supertest.md`, `msw.md`

**quality/** — Code health

- `eslint.md`, `eslint-typescript.md`, `prettier.md`, `knip.md`, `publint.md`

**security/** — Securing code

- `pnpm-audit.md`, `renovate.md`, `snyk.md`, `dotenv.md`, `helmet.md`

**scm/** — Version control & release

- `git.md`, `husky.md`, `conventional-commits.md`, `semantic-release.md`, `changesets.md`

**ops/** — Pipelines & infrastructure

- `github-actions.md`, `docker-compose.md`, `kubernetes.md`, `terraform.md`

**observe/** — Monitoring & debugging

- `pino.md`, `opentelemetry.md`, `prometheus.md`, `sentry.md`, `grafana.md`

**docs/** — Documentation

- `adr.md`, `openapi.md`, `typedoc.md`, `mermaid.md`, `readme.md`

Blocks are context-agnostic. They teach one thing without assuming where it will be applied.

---

## Foundations

Capabilities—how blocks compose to achieve something. Capability-centric, not tool-centric.

**Naming:** `foundations/{domain}/{capability}-{qualifier}-{tool}.md`

| Part           | Required                | Description                               |
| -------------- | ----------------------- | ----------------------------------------- |
| **Capability** | Always                  | Domain-specific verb (see below)          |
| **Qualifier**  | When needed             | Variant or target (esm, unit, azure, npm) |
| **Tool**       | When alternatives exist | Implementation (tsc, vitest, gha, docker) |

**Capability verbs by domain:**

| Domain      | Capabilities                                            |
| ----------- | ------------------------------------------------------- |
| `construct` | transpile, bundle, exec, package, manifest, types, tree |
| `test`      | test, mock, cover                                       |
| `quality`   | lint, format, analyze, gate                             |
| `security`  | scan, update, secrets, harden                           |
| `scm`       | commit, branch, version, release, publish, changelog    |
| `ops`       | ci, cd, container, orchestrate, iac, deploy             |
| `observe`   | log, trace, metrics, errors, dashboard                  |
| `docs`      | document, diagram                                       |

**When to include tool suffix:**

Required when multiple tools achieve same capability:

- `transpile-esm-tsc.md` vs `transpile-esm-esbuild.md`
- `test-unit-vitest.md` vs `test-unit-bun.md`
- `ci-build-gha.md` vs `ci-build-azure.md`

Not needed when tool IS the capability:

- `exec-tsx.md` (tsx is the only way to "exec via tsx")
- `exec-bun.md`

Not needed when tool-agnostic:

- `tree-cli.md` (structure doesn't depend on tools)
- `commit-conventional.md` (convention, not tool)

**Examples by domain:**

**construct/** — `transpile-esm-tsc.md`, `bundle-web-vite.md`, `exec-tsx.md`, `package-container-docker.md`, `manifest-cli.md`, `types-base.md`, `tree-monorepo.md`

**test/** — `test-unit-vitest.md`, `test-e2e-cli-bun.md`, `mock-api-msw.md`, `cover-vitest.md`

**quality/** — `lint-typescript.md`, `format-prettier.md`, `analyze-dead-code.md`, `gate-precommit.md`

**security/** — `scan-deps-audit.md`, `update-deps-renovate.md`, `secrets-env-typed.md`, `harden-api.md`

**scm/** — `commit-conventional.md`, `version-semver.md`, `release-semantic.md`, `publish-npm.md`, `changelog-conventional.md`

**ops/** — `ci-build-gha.md`, `cd-deploy-azure.md`, `container-node-docker.md`, `orchestrate-k8s.md`, `iac-azure-terraform.md`, `deploy-azure-container-apps.md`

**observe/** — `log-structured-pino.md`, `trace-otel.md`, `metrics-prometheus.md`, `errors-sentry.md`, `dashboard-grafana.md`

**docs/** — `document-adr.md`, `document-api-openapi.md`, `diagram-c4.md`, `diagram-mermaid.md`

**Key distinctions:**

- **package** (construct) → create artifact
- **publish** (scm) → release to registry
- **deploy** (ops) → run in environment

Foundations contain **glue**—integration knowledge that only exists because of context:

- Configuration bridging components
- How blocks work together
- Edge cases and gotchas specific to the combination

---

## Stacks

Complete project setups. Compose multiple foundations into working configurations. Organized by artifact type, not domain (stacks span domains).

**Naming:** `stacks/{artifact}/{artifact}-{package-manager}-{key-characteristic}.md`

| Part                   | Description            | Examples                         |
| ---------------------- | ---------------------- | -------------------------------- |
| **Artifact**           | What you're building   | cli, library, api, web, monorepo |
| **Package manager**    | Package manager used   | pnpm, npm, bun                   |
| **Key characteristic** | Distinguishing feature | tsx, tsc, fullstack, orpc        |

**Note:** For Bun projects where Bun is both runtime and package manager, omit redundant package manager: `cli-bun.md` not `cli-bun-bun.md`.

**Examples:**

**stacks/cli/**

- `cli-pnpm-tsx.md` — TypeScript CLI with tsx execution
- `cli-pnpm-tsc.md` — TypeScript CLI with tsc build
- `cli-bun.md` — Bun CLI (runtime + package manager)

**stacks/library/**

- `library-pnpm-tsc.md` — ESM library with tsc
- `library-pnpm-tsc-dual.md` — Dual ESM/CJS library
- `library-react-pnpm-tsc.md` — React component library

**stacks/api/**

- `api-pnpm-tsx.md` — API with tsx execution
- `api-pnpm-fastify.md` — Fastify API
- `api-bun-hono.md` — Bun + Hono API

**stacks/web/**

- `web-pnpm-vite-react.md` — React + Vite frontend
- `web-pnpm-nextjs.md` — Next.js application

**stacks/monorepo/**

- `monorepo-pnpm-tsc.md` — pnpm workspace monorepo
- `monorepo-pnpm-tsc-fullstack.md` — Full-stack monorepo

**Stack composition:**

Stacks reference foundations from multiple domains:

```markdown
# cli-pnpm-tsx.md

## Foundations Used

construct/ — exec-tsx.md, manifest-cli.md, types-base.md, tree-cli.md
test/ — test-unit-vitest.md, test-e2e-cli-bun.md
quality/ — lint-typescript.md, format-prettier.md
scm/ — commit-conventional.md, publish-npm.md
security/ — scan-deps-audit.md, secrets-env-typed.md
ops/ — ci-build-gha.md
docs/ — document-readme.md
```

---

## Folder Structure

```
documentation/
├── blocks/
│   ├── construct/
│   │   ├── tsc.md
│   │   ├── tsc-alias.md
│   │   ├── vite.md
│   │   ├── bun.md
│   │   ├── pnpm.md
│   │   ├── pnpm-workspaces.md
│   │   ├── package-json-base.md
│   │   ├── package-json-cli.md
│   │   ├── tsconfig-base.md
│   │   └── docker.md
│   ├── test/
│   │   ├── vitest.md
│   │   ├── bun-test.md
│   │   ├── playwright.md
│   │   └── msw.md
│   ├── quality/
│   │   ├── eslint.md
│   │   ├── prettier.md
│   │   └── knip.md
│   ├── security/
│   │   ├── pnpm-audit.md
│   │   ├── renovate.md
│   │   └── dotenv.md
│   ├── scm/
│   │   ├── git.md
│   │   ├── husky.md
│   │   └── conventional-commits.md
│   ├── ops/
│   │   ├── github-actions.md
│   │   ├── docker-compose.md
│   │   └── terraform.md
│   ├── observe/
│   │   ├── pino.md
│   │   ├── prometheus.md
│   │   └── sentry.md
│   └── docs/
│       ├── adr.md
│       ├── openapi.md
│       └── mermaid.md
│
├── foundations/
│   ├── construct/
│   │   ├── transpile-esm-tsc.md
│   │   ├── exec-tsx.md
│   │   ├── package-container-docker.md
│   │   ├── manifest-cli.md
│   │   └── types-base.md
│   ├── test/
│   │   ├── test-unit-vitest.md
│   │   └── cover-vitest.md
│   ├── quality/
│   │   ├── lint-typescript.md
│   │   └── format-prettier.md
│   ├── security/
│   │   ├── scan-deps-audit.md
│   │   └── secrets-env-typed.md
│   ├── scm/
│   │   ├── commit-conventional.md
│   │   └── publish-npm.md
│   ├── ops/
│   │   ├── ci-build-gha.md
│   │   └── deploy-azure-container-apps.md
│   ├── observe/
│   │   ├── log-structured-pino.md
│   │   └── metrics-prometheus.md
│   └── docs/
│       └── document-readme.md
│
└── stacks/
    ├── cli/
    │   ├── cli-pnpm-tsx.md
    │   ├── cli-pnpm-tsc.md
    │   └── cli-bun.md
    ├── library/
    │   ├── library-pnpm-tsc.md
    │   └── library-react-pnpm-tsc.md
    ├── api/
    │   ├── api-pnpm-tsx.md
    │   └── api-pnpm-fastify.md
    ├── web/
    │   └── web-pnpm-vite-react.md
    └── monorepo/
        ├── monorepo-pnpm-tsc.md
        └── monorepo-pnpm-tsc-fullstack.md
```

---

## Frontmatter

Minimal. The folder structure defines the layer. Frontmatter handles dependencies and tags.

**Fields:**

- `depends` — list of file paths this doc requires (optional)
- `tags` — for cross-cutting queries (optional)

---

## Tags

Keep tags minimal. Most differentiation comes from **context**—the environment where a technique is applied (REST, CLI, GraphQL). Context is already encoded in foundation names like `error-handling-rest.md` and stack names like `rest-orpc-node-pnpm.md`.

Tags are for cross-cutting concerns that span multiple contexts:

| Tag        | Meaning                              |
| ---------- | ------------------------------------ |
| `core`     | Foundational, used almost everywhere |
| `auth`     | Authentication, authorization        |
| `database` | Persistence, queries                 |
| `async`    | Background jobs, queues              |

That's it. If you need to find "all REST-related docs," search for `-rest` in filenames or grep the content. Don't duplicate what naming and folder structure already provide.

---

## Frontmatter Examples

```yaml
# blocks/construct/tsc.md
---
tags: [core]
---
```

```yaml
# blocks/test/vitest.md
---
---
```

```yaml
# foundations/construct/transpile-esm-tsc.md
---
depends:
  - "@blocks/construct/tsc.md"
  - "@blocks/construct/tsc-alias.md"
  - "@blocks/construct/tsc-esm-fix.md"
tags: [core]
---
```

```yaml
# foundations/construct/exec-tsx.md
---
depends:
  - "@blocks/construct/tsx.md"
tags: [core]
---
```

```yaml
# foundations/quality/lint-typescript.md
---
depends:
  - "@blocks/quality/eslint.md"
  - "@blocks/quality/eslint-typescript.md"
tags: [core]
---
```

```yaml
# stacks/cli/cli-pnpm-tsx.md
---
depends:
  - "@foundations/construct/exec-tsx.md"
  - "@foundations/construct/manifest-cli.md"
  - "@foundations/construct/types-base.md"
  - "@foundations/test/test-unit-vitest.md"
  - "@foundations/quality/lint-typescript.md"
  - "@foundations/scm/commit-conventional.md"
---
```

```yaml
# stacks/monorepo/monorepo-pnpm-tsc-fullstack.md
---
depends:
  - "@foundations/construct/transpile-esm-tsc.md"
  - "@foundations/construct/manifest-monorepo-root.md"
  - "@foundations/construct/types-monorepo-root.md"
  - "@foundations/test/test-unit-vitest.md"
  - "@foundations/ops/ci-build-gha.md"
tags: [monorepo]
---
```

---

## Summary

| Layer           | Purpose                   | Organisation          |
| --------------- | ------------------------- | --------------------- |
| **Blocks**      | Single units of knowledge | By domain (8 domains) |
| **Foundations** | Capabilities              | By domain (8 domains) |
| **Stacks**      | Complete project setups   | By artifact type      |

**Naming conventions:**

| Layer           | Pattern                                                   | Example                                      |
| --------------- | --------------------------------------------------------- | -------------------------------------------- |
| **Blocks**      | `blocks/{domain}/{tool}.md`                               | `blocks/construct/tsc.md`                    |
| **Foundations** | `foundations/{domain}/{capability}-{qualifier}-{tool}.md` | `foundations/construct/transpile-esm-tsc.md` |
| **Stacks**      | `stacks/{artifact}/{artifact}-{pm}-{characteristic}.md`   | `stacks/cli/cli-pnpm-tsx.md`                 |

**Domains (SWEBOK-aligned):**

construct, test, quality, security, scm, ops, observe, docs

**Capability verbs by domain:**

| Domain    | Capabilities                                            |
| --------- | ------------------------------------------------------- |
| construct | transpile, bundle, exec, package, manifest, types, tree |
| test      | test, mock, cover                                       |
| quality   | lint, format, analyze, gate                             |
| security  | scan, update, secrets, harden                           |
| scm       | commit, branch, version, release, publish, changelog    |
| ops       | ci, cd, container, orchestrate, iac, deploy             |
| observe   | log, trace, metrics, errors, dashboard                  |
| docs      | document, diagram                                       |

**Tags:** Minimal—`core`, `auth`, `database`, `async`, `monorepo`. Context encoded in domain folders & file names.

**Key distinctions:**

- package (construct) → create artifact
- publish (scm) → release to registry
- deploy (ops) → run in environment

**The system:**

- All layers organized by domain (except stacks = artifact type)
- Blocks are tool-centric, context-agnostic
- Foundations are capability-centric (what you can achieve)
- Stacks compose foundations from multiple domains
- `depends` declares dependencies
- Resolver flattens tree into single prompt

---

## Further Reading

- context/blocks/docs/maintenance.md - Maintenance patterns, decision framework, composition rules
- SWEBOK v3 - Software Engineering Body of Knowledge (free PDF)
- Atomic Design - Brad Frost (UI component hierarchy inspiration)

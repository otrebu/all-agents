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
prompt = @blocks/tools/zod.md + @foundations/node-pnpm.md + @stacks/rest-orpc-node-pnpm.md
```

---

## Three Layers

| Layer           | Purpose                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| **Blocks**      | Single units of knowledge. The smallest teachable pieces.                    |
| **Foundations** | Platform choices. Runtime + toolchain combos that everything else builds on. |
| **Stacks**      | Things built on foundations. App shapes and capabilities.                    |

The metaphor: blocks are raw materials, foundations are the ground you build on, stacks are what you construct.

---

## Blocks

The smallest units of documentation. One concern, self-contained.

Organised into two subfolders:

| Subfolder       | Contains                                    | Examples                                        |
| --------------- | ------------------------------------------- | ----------------------------------------------- |
| **tools/**      | How to use a specific library or technology | typescript, eslint, prettier, zod, orpc, lucia  |
| **principles/** | Philosophy and general approach             | error-handling, validation, linting, formatting |

Blocks are context-agnostic. They teach one thing without assuming where it will be applied.

---

## Foundations

Patterns for specific contexts. Platform choices, shared standards, and techniques that apply principles to particular environments.

| Foundation               | What it provides                    |
| ------------------------ | ----------------------------------- |
| `node-pnpm.md`           | TypeScript + Node.js + pnpm setup   |
| `bun.md`                 | TypeScript + Bun setup              |
| `code-standards.md`      | ESLint + Prettier conventions       |
| `testing.md`             | Vitest setup and patterns           |
| `error-handling-rest.md` | Error handling applied to REST APIs |
| `error-handling-cli.md`  | Error handling applied to CLIs      |
| `validation-rest.md`     | Validation applied to REST APIs     |

Foundations contain **glue**—the integration knowledge that only exists because of context:

- Configuration that bridges components
- Conventions specific to the combination
- How to apply principles in a particular environment
- Edge cases and gotchas
- The "how these work together" you'd otherwise discover through trial and error

A **principle** (in blocks) is the "why" and general approach—context-agnostic. A **pattern** (in foundations) is the "how" in a specific context—concrete implementation for REST, CLI, GraphQL, etc.

---

## Stacks

Things built on foundations. Flat folder, descriptive names, tags for discovery.

Two types of stacks:

### App Shapes

Complete application structures tied to a specific foundation.

**Naming:** `{shape}-{framework}-{foundation}.md`

| Stack                         | Shape    | Framework | Foundation |
| ----------------------------- | -------- | --------- | ---------- |
| `rest-orpc-node-pnpm.md`      | REST API | oRPC      | node-pnpm  |
| `rest-fastify-node-pnpm.md`   | REST API | Fastify   | node-pnpm  |
| `rest-hono-bun.md`            | REST API | Hono      | bun        |
| `graphql-pothos-node-pnpm.md` | GraphQL  | Pothos    | node-pnpm  |
| `cli-node-pnpm.md`            | CLI      | —         | node-pnpm  |
| `cli-bun.md`                  | CLI      | —         | bun        |

Drop the framework if there's only one variant for that shape + foundation.

### Features

Shippable capabilities that can work across multiple foundations.

**Naming:** `{capability}-{variant}.md`

| Stack                | Capability      | Variant |
| -------------------- | --------------- | ------- |
| `auth-lucia.md`      | Authentication  | Lucia   |
| `auth-clerk.md`      | Authentication  | Clerk   |
| `file-upload.md`     | File upload     | —       |
| `background-jobs.md` | Background jobs | —       |

Drop the variant if there's only one way to do it.

---

## Folder Structure

```
blocks/
├── tools/
│   ├── typescript.md
│   ├── nodejs.md
│   ├── pnpm.md
│   ├── bun.md
│   ├── eslint.md
│   ├── prettier.md
│   ├── vitest.md
│   ├── zod.md
│   ├── orpc.md
│   ├── fastify.md
│   ├── hono.md
│   ├── pothos.md
│   ├── lucia.md
│   ├── drizzle.md
│   └── bullmq.md
└── principles/
    ├── error-handling.md
    ├── validation.md
    ├── linting.md
    ├── formatting.md
    ├── logging.md
    └── module-structure.md

foundations/
├── node-pnpm.md
├── node-pnpm-workspaces.md
├── bun.md
├── code-standards.md
├── testing.md
├── error-handling-rest.md
├── error-handling-cli.md
├── validation-rest.md
└── validation-cli.md

stacks/
├── rest-orpc-node-pnpm.md
├── rest-fastify-node-pnpm.md
├── graphql-pothos-node-pnpm.md
├── cli-node-pnpm.md
├── rest-hono-bun.md
├── cli-bun.md
├── auth-lucia.md
├── auth-clerk.md
├── file-upload.md
├── background-jobs.md
├── crud-resource.md
├── email.md
└── saas-backend.md
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
# blocks/tools/zod.md
---
tags: [core]
---
```

```yaml
# blocks/principles/error-handling.md
---
---
```

```yaml
# foundations/error-handling-rest.md
---
depends:
  - @blocks/principles/error-handling.md
---
```

```yaml
# foundations/node-pnpm.md
---
depends:
  - @blocks/tools/typescript.md
  - @blocks/tools/nodejs.md
  - @blocks/tools/pnpm.md
tags: [core]
---
```

```yaml
# foundations/code-standards.md
---
depends:
  - @blocks/principles/linting.md
  - @blocks/principles/formatting.md
  - @blocks/tools/eslint.md
  - @blocks/tools/prettier.md
tags: [core]
---
```

```yaml
# stacks/rest-orpc-node-pnpm.md
---
depends:
  - @foundations/node-pnpm.md
  - @foundations/code-standards.md
  - @foundations/error-handling-rest.md
  - @foundations/validation-rest.md
  - @blocks/tools/orpc.md
  - @blocks/tools/zod.md
---
```

```yaml
# stacks/auth-lucia.md
---
depends:
  - @blocks/tools/lucia.md
  - @blocks/tools/drizzle.md
tags: [auth, database]
---
```

```yaml
# stacks/saas-backend.md
---
depends:
  - @stacks/rest-orpc-node-pnpm.md
  - @stacks/auth-lucia.md
  - @stacks/file-upload.md
  - @stacks/background-jobs.md
tags: [auth, async, database]
---
```

---

## Composition at Prompt Time

When you request `@stacks/rest-orpc-node-pnpm.md`, the resolver:

1. Reads the file
2. Finds `depends: [@foundations/node-pnpm.md, ...]`
3. Recursively resolves each dependency
4. Deduplicates and orders by dependency depth (blocks first)
5. Concatenates into final prompt

```
Final prompt = @blocks/tools/typescript.md
             + @blocks/tools/nodejs.md
             + @blocks/tools/pnpm.md
             + @blocks/principles/error-handling.md
             + @blocks/tools/eslint.md
             + @blocks/tools/prettier.md
             + @foundations/node-pnpm.md
             + @foundations/code-standards.md
             + @foundations/error-handling-rest.md
             + @foundations/validation-rest.md
             + @blocks/tools/orpc.md
             + @blocks/tools/zod.md
             + @stacks/rest-orpc-node-pnpm.md
```

---

## Summary

| Layer           | Purpose                        | Organisation                    |
| --------------- | ------------------------------ | ------------------------------- |
| **Blocks**      | Single units of knowledge      | Subfolders: tools/, principles/ |
| **Foundations** | Patterns for specific contexts | Flat                            |
| **Stacks**      | App shapes + features          | Flat, descriptive names         |

**Naming conventions:**

| Type        | Pattern                                                  | Example                                  |
| ----------- | -------------------------------------------------------- | ---------------------------------------- |
| Tools       | `{name}.md`                                              | `typescript.md`, `zod.md`                |
| Principles  | `{concept}.md`                                           | `error-handling.md`, `validation.md`     |
| Foundations | `{concept}-{context}.md` or `{runtime}-{pkg-manager}.md` | `error-handling-rest.md`, `node-pnpm.md` |
| App shapes  | `{shape}-{framework}-{foundation}.md`                    | `rest-orpc-node-pnpm.md`                 |
| Features    | `{capability}-{variant}.md`                              | `auth-lucia.md`                          |

**Tags:** Minimal—just `core`, `auth`, `database`, `async`. Context (REST, CLI, GraphQL) is encoded in file names, not tags.

**The system:**

- Folder structure defines the layer
- Blocks are context-agnostic (tools + principles)
- Foundations apply principles to specific contexts (patterns)
- Stacks are flat with descriptive names
- Tags only for cross-cutting concerns that span contexts
- `depends` declares dependencies
- Resolver flattens the tree into a single prompt

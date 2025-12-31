---
depends:
  - "@context/blocks/docs/atomic-documentation.md"
tags: [core, docs]
---

# Atomic Documentation Maintenance

Practical patterns for maintaining atomic documentation structure.

For system design and philosophy: @context/blocks/docs/atomic-documentation.md

## Naming Patterns

### Blocks (SWEBOK Domains)

Organized by software engineering activity (construct, test, quality, security, scm, observe, docs).

**construct/** — Build, bundle, package

- Single-technology: `bun.md`, `react.md`, `vite.md`
- Config: `tsconfig-base.md`, `tsconfig-monorepo-root.md`
- Package patterns: `package-json-cli.md`, `package-json-library.md`

**test/** — Testing philosophy & patterns

- `testing.md`, `unit-testing.md`, `storybook.md`

**quality/** — Code standards & style

- `coding-style.md`, `error-handling.md`, `eslint.md`, `prettier.md`

**observe/** — Logging & monitoring

- `logging.md`

**docs/** — Documentation & prompting

- `atomic-documentation.md`, `vocabulary.md`, `prompting.md`
- Templates: `task-template.md`, `story-template.md`

### Foundations

Organized by domain (construct/, test/, security/, observe/, scm/, quality/).

**Pattern:** Purpose-first naming (capability/concern → context → tool)

**construct/** — Build, execution, structure

- Execution: `exec-{tool}.md` (exec-tsx.md, exec-bun.md)
- Bundle: `bundle-{target}-{tool}.md` (bundle-web-vite.md)
- Transpile: `transpile-{target}-{tool}.md` (transpile-esm-tsc.md)
- Monorepo: `monorepo-{pm}-base.md` (monorepo-pnpm-base.md)
- Platform foundations can also live here (e.g., node-pnpm.md)
- Structure: `tree-{context}.md` (tree-cli.md)
- Validation: `validate-{domain}-{tool}.md` (validate-forms-react.md)

**security/** — Secrets, auth, env

- `secrets-env-{context}-{tool}.md` (secrets-env-monorepo-node.md)
- `secrets-env-{approach}.md` (secrets-env-typed.md, secrets-env-dotenv.md)

**test/** — Testing strategies

- `test-{type}-{context}-{tool}.md` (test-e2e-cli-bun.md, test-integration-api.md)

**observe/** — Logging, monitoring

- `log-{approach}-{context}.md` (log-structured-cli.md, log-structured-service.md)

**scm/** — Version control, commits

- `commit-{context}-{detail}.md` (commit-monorepo-subdir.md)

**quality/** — Standards, gates

- `gate-standards.md`

**Purpose comes first**, then context/target, then tool

### Stacks

Organized by artifact type (cli/, monorepo/, etc.).

**Pattern:** Artifact-first, with pm/runtime/framework details

- CLI: `cli-{pm}-{runtime}.md` or `cli-{runtime}.md`
  - `cli-bun.md` = Bun CLI (integrated runtime+pm)
  - `cli-pnpm-tsx.md` = pnpm + tsx CLI
- Monorepo: `monorepo-{pm}-{runtime}-{framework}.md`
  - `monorepo-pnpm-tsc-api.md` = pnpm monorepo with tsc build, REST API
  - `monorepo-pnpm-tsx-orpc.md` = pnpm monorepo with tsx runtime, oRPC framework
  - `monorepo-pnpm-tsc-fullstack.md` = Full-stack monorepo setup

### Monorepo Progressive Loading (Optional)

For larger monorepos with diverse tech, consider splitting into coordination + package stacks. Start flat for scaffolding, split as you grow.

See: @context/blocks/docs/atomic-documentation.md → "Progressive Loading in Monorepos"

## When to Split

### DO Split When:

- ✅ Tech is independently usable
  - Example: `tsconfig-base.md` vs `tsconfig-monorepo-additions.md`
  - Base is universal, monorepo additions are optional overlay
- ✅ Clear separation of concerns
  - Example: `logging-cli.md` vs `logging-services.md`
  - CLI uses chalk/terminal, services use pino/structured
- ✅ >30 lines of distinct content
  - From tools/CLAUDE.md: >30 lines of type definitions → separate types file
  - Same applies to docs: >30 lines of independently valuable content → separate file

### DON'T Split When:

- ❌ Content is inseparable
  - Don't split strict mode from base tsconfig
  - Don't split individual compiler options into separate files
- ❌ Creates artificial boundaries
  - Don't split just to hit line count targets
  - Comprehensive is better than scattered

## Composition Over Duplication

### Reference Pattern (Critical!)

**Foundations REFERENCE blocks, don't duplicate:**

````markdown
# ts-node-tsc.md

Node.js via compiled JavaScript (tsc build pipeline).

## References

@context/blocks/construct/tsconfig-base.md

## Tool-Specific TypeScript Config

Extends base config with Node.js ESM build settings:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext", // Only show deltas
    "outDir": "dist", // Not entire base config
    "declaration": true
  }
}
```
````

**Complete package.json** <!-- Complete examples OK in foundations -->

````

**Pattern:**
1. Foundation references base block
2. Shows ONLY tool-specific overrides (deltas)
3. Provides complete package.json + scripts (comprehensive)
4. When to use section

### Stacks Compose Foundations

**DON'T create:**
- ❌ `pnpm-monorepo-tsc.md`
- ❌ `pnpm-monorepo-tsx.md`
- ❌ `pnpm-monorepo-bun.md`

**DO compose in stacks:**
```yaml
# ts-pnpm-node-backend-monorepo.md
depends:
  - "@context/foundations/construct/transpile-esm-tsc.md"        # Execution strategy
  - "@context/blocks/construct/tsconfig-base.md"     # Base config
  - "@context/blocks/construct/tsconfig-monorepo-root.md"
````

**Key insight:** Monorepo coordination + execution strategy = reusable, composable

## Execution-Agnostic Foundations

### Platform Foundations Should Be Execution-Agnostic

**Example:** `pnpm-monorepo.md`

- ✅ Shows workspace:\* pattern
- ✅ Shows directory structure
- ✅ Shows project references
- ❌ Doesn't specify tsc vs tsx vs bun
- ❌ Doesn't hardcode build scripts

**Why:** Allows composition with ANY execution strategy

```
pnpm-monorepo.md (platform)
   ↓
Combined with → ts-node-tsc.md (execution)
             → ts-node-tsx.md (execution)
             → ts-bun.md (execution)
```

### Execution Foundations Are Pluggable

**Example:** `ts-node-tsc.md`, `ts-node-tsx.md`, `ts-bun.md`

- ✅ Tool-specific tsconfig overrides
- ✅ Complete package.json scripts
- ✅ Build pipeline details
- ✅ When to use guidance

**Why:** Can plug into any platform (single package, monorepo, etc.)

## File Size Guidelines

### Blocks: 40-120 lines

- **Focus:** Single concern, atomic piece
- **Example:** `tsconfig-base.md` (~100 lines)
- **Rule:** If >120 lines, consider splitting

### Foundations: 120-280 lines

- **Focus:** Comprehensive, self-contained
- **Example:** `ts-node-tsc.md` (~297 lines, acceptable)
- **Rule:** Complete enough to use standalone

### Stacks: 150-300 lines

- **Focus:** Complete setup with examples
- **Example:** `ts-vite-react.md` (~230 lines)
- **Rule:** Should have quick start, structure, commands, troubleshooting

### Duplication Threshold: 30+ Lines

- If >30 lines of overlap, extract to block and reference
- Exception: Foundations can show complete examples (package.json, tsconfig with base + overrides)

## Decision Framework

When adding/modifying docs, ask:

### 1. Where does this belong?

- **Blocks:** Single-tech, reusable building block
- **Foundations:** Platform combo or execution strategy
- **Stacks:** Complete app shape (combines foundations)

### 2. Should I split this?

- Is tech independently usable? → Block
- Does it combine multiple blocks? → Foundation
- Is it a complete setup? → Stack

### 3. Am I duplicating?

- > 30 lines overlap? → Extract to block, reference it
- Tool-specific override? → Show only delta, reference base
- Complete example? → OK in foundation/stack

### 4. Is this execution-agnostic?

- Platform foundation? → Don't hardcode execution strategy
- Execution foundation? → Be specific about tool (tsc/tsx/bun)
- Stack? → Compose platform + execution

## Examples

### ✅ Good: Atomic Split

```
tsconfig-base.md (block)          → Universal settings
tsconfig-monorepo-additions.md    → Monorepo overlay
ts-node-tsc.md (foundation)       → References base + shows tsc overrides
pnpm-monorepo.md (foundation)     → Coordination (execution-agnostic)
ts-pnpm-node-backend-monorepo.md  → Composes pnpm-monorepo + ts-node-tsc
```

### ❌ Bad: Over-Splitting

```
tsconfig-strict.md              → Part of base, don't split
tsconfig-esm.md                 → Part of base, don't split
pnpm-monorepo-tsc.md           → Should compose, not duplicate
```

### ✅ Good: Reference Pattern

```markdown
# ts-node-tsc.md

References: @context/blocks/construct/tsconfig-base.md

Tool-Specific Overrides: <!-- Only show deltas -->
{
"module": "NodeNext",
"outDir": "dist"
}
```

### ❌ Bad: Duplication

```markdown
# ts-node-tsc.md

Complete tsconfig.json: <!-- Duplicates base -->
{
"target": "ES2022", <!-- All this is in base -->
"strict": true,
"module": "NodeNext" <!-- Only this is new -->
}
```

## Maintenance Checklist

When creating/modifying docs:

- [ ] Named following pattern for its layer?
- [ ] File size appropriate for its type?
- [ ] References blocks instead of duplicating?
- [ ] Shows only deltas (if foundation/stack)?
- [ ] Execution-agnostic (if platform foundation)?
- [ ] Composable (if foundation)?
- [ ] Complete example (if stack)?
- [ ] When to use / When NOT to use sections?
- [ ] Updated references in other files?
- [ ] Added to appropriate README section?

## Reference Format

Always use `@` prefix for cross-references.

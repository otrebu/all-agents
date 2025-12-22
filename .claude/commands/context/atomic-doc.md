---
allowed-tools: Read, Write, Edit, Glob, Grep
argument-hint: create|update <layer>/<domain>/<name>
description: Create/update atomic documentation (blocks, foundations, stacks)
---

# Atomic Documentation Management

Create or update context docs following atomic documentation system.

## Context

@context/blocks/docs/atomic-documentation.md
@context/blocks/docs/maintenance.md

## Workflow

1. Parse `$ARGUMENTS`:
   - `create <layer>/<domain>/<name>` → new doc
   - `update <path>` → modify existing
2. Validate layer/domain against system
3. Create/update at `context/<layer>/<domain>/<name>.md`
4. Add YAML frontmatter with `depends: []`
5. Update @context/README.md index

## Constraints

- Layers: blocks, foundations, stacks
- Domains: construct, test, quality, security, scm, ops, observe, docs
- Stacks: organize by artifact (cli, api, library, web, monorepo)
- Follow naming conventions per layer
- Minimal frontmatter (depends, tags only when needed)

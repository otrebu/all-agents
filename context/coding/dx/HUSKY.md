# husky

Git hooks for pre-commit and pre-push.

**Install:**

Install husky, run husky init.

**Pre-commit hook (.husky/pre-commit):**

Example when using pnpm

```bash
pnpm lint && pnpm format && pnpm test
```

Example when using bun:

```bash
bun run lint && bun run format && bun run test
```

**With commitlint (.husky/commit-msg):**

Example when using pnpm:

```bash
pnpm commitlint --edit $1
```

Example when using bun:

```bash
bun run commitlint --edit $1
```

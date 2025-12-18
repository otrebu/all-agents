## husky

Git hooks for pre-commit and pre-push.

### Install

Install husky, run husky init.

### Configure

#### Pre-commit hook (.husky/pre-commit)

We must run lint:fix, format:check, typecheck, test.

Example with pnpm:

```bash
pnpm lint:fix && pnpm format:check && pnpm typecheck && pnpm test
```

#### Pre-msg hook (.husky/commit-msg)

We must run commitlint.

Example with pnpm:

```bash
pnpm commitlint --edit $1
```

## commitlint

### Install

`@commitlint/cli` and `@commitlint/config-conventional`

### Configure

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

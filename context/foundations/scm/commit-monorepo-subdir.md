## Husky from a subdirectory

Subdirectory install (when package.json is not at repo root):

Install husky in the subdirectory, then configure prepare to run from repo root:

```json
// subdirectory/package.json
{
  "scripts": {
    "prepare": "cd .. && ./subdirectory/node_modules/.bin/husky subdirectory/.husky"
  }
}
```

Scoped hook example (only run when subdirectory files are staged):

```bash
# subdirectory/.husky/pre-commit
if git diff --cached --name-only | grep -q "^subdirectory/"; then
  echo "Running subdirectory/ checks..."
  cd subdirectory && bun run lint && bun run format:check && bun run typecheck
fi
```

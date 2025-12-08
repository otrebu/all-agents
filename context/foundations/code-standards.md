---
tags: [dx]
depends:
  - @primitives/tools/eslint.md
  - @primitives/tools/prettier.md
  - @primitives/tools/husky.md
  - @primitives/principles/coding-style.md
---

# Code Standards

How linting, formatting, and git hooks work together.

## Integration

### package.json Scripts

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### Pre-commit Hooks

Use pre-commit hooks for lint/format on commit is highly recommended.
See @primitives/tools/husky.md for git hooks to run lint/format on commit.

## Components

- **ESLint**: @primitives/tools/eslint.md
- **Prettier**: @primitives/tools/prettier.md
- **Git Hooks**: @primitives/tools/husky.md
- **Style Guide**: @primitives/principles/coding-style.md

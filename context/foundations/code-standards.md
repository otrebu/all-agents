---
tags: [dx]
depends:
  - @context/primitives/tools/eslint.md
  - @context/primitives/tools/prettier.md
  - @context/primitives/tools/husky.md
  - @context/primitives/principles/coding-style.md
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
See @context/primitives/tools/husky.md for git hooks to run lint/format on commit.

## Components

- **ESLint**: @context/primitives/tools/eslint.md
- **Prettier**: @context/primitives/tools/prettier.md
- **Git Hooks**: @context/primitives/tools/husky.md
- **Style Guide**: @context/primitives/principles/coding-style.md

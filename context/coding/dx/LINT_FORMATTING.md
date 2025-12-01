# LINTING AND FORMATTING

ESLint + Prettier configuration.

## ESLint

Using config from: https://www.npmjs.com/package/uba-eslint-config

**eslint.config.js:**

```typescript
import { ubaEslintConfig } from "uba-eslint-config";

export default [...ubaEslintConfig];
```

**Rules must NOT be disabled or modified.** Do not use:

- `eslint-disable` comments
- Rule overrides
- Config modifications

Fix the code to comply with the rules.

### Exception: no-console for CLI Projects

**For CLI tools ONLY**, the `no-console` rule may be disabled since `console.log`/`console.error` are correct for terminal output.

```typescript
import { ubaEslintConfig } from "uba-eslint-config";

export default [
  ...ubaEslintConfig,
  {
    rules: {
      "no-console": "off",
    },
  },
];
```

**ONLY for CLI projects.** Services, APIs, and web apps must NOT disable this rule.

## Prettier

Opinionated formatter - always use default settings.

**.prettierrc:**

```json
{}
```

Or use the config from uba-eslint-config:

**prettier.config.js:**

```typescript
import { ubaPrettierConfig } from "uba-eslint-config";

export default ubaPrettierConfig;
```

## package.json Scripts

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

## Pre-commit Hooks

Use pre-commit hooks for lint/format on commit is highly recommended.
See @context/coding/dx/HUSKY.md for git hooks to run lint/format on commit.

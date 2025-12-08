---
depends: []
---

# ESLint

JavaScript/TypeScript linter for code quality.

## Config

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

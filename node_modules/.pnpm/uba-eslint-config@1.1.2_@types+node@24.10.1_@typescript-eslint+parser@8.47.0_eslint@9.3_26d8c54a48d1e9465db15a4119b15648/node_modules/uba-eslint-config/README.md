# uba-eslint-config

A comprehensive ESLint 9 configuration with TypeScript, React, and extensive plugin support.

## Features

- **ESLint 9** with flat config
- **TypeScript** support (can be disabled via config options)
- **React** with hooks and accessibility rules
- **Testing**: Vitest and Cypress support
- **Code Quality**: Unicorn, Promise, Import, and more
- **Sorting & Formatting**: Perfectionist for consistent code organization
- **GraphQL**, **TanStack Query**, **TanStack Router**, and **Storybook** support

## Included Plugins

- `eslint-plugin-import` (order rules disabled in favor of perfectionist)
- `eslint-plugin-canonical` (import alias rule only)
- `eslint-plugin-check-file`
- `eslint-plugin-function-name`
- `eslint-plugin-promise`
- `eslint-plugin-unicorn`
- `eslint-plugin-cypress` with `eslint-plugin-chai-friendly`
- `@vitest/eslint-plugin`
- `eslint-plugin-jsx-a11y`
- `eslint-plugin-react` & `eslint-plugin-react-hooks`
- `eslint-plugin-storybook`
- `eslint-plugin-tailwindcss`
- `@graphql-eslint/eslint-plugin`
- `@tanstack/eslint-plugin-query`
- `@tanstack/eslint-plugin-router`
- `eslint-plugin-perfectionist`

## Installation

```bash
pnpm add -D uba-eslint-config
```

## Usage

### Basic Usage

```js
import { ubaEslintConfig } from "uba-eslint-config";

export default [...ubaEslintConfig];
```

### Custom Configuration

```js
import { generateEslintConfig } from "uba-eslint-config";

export default generateEslintConfig({
  appType: "fullstack", // or "backendOnly"
  shouldEnableTypescript: true,
  importCycleCheckMode: "off", // "off" or "on" (CI only)
});
```

### Fine-grained Control

```js
import { generateEslintConfigByFeatures } from "uba-eslint-config";

export default generateEslintConfigByFeatures({
  shouldEnableTypescript: true,
  shouldEnableReact: true,
  shouldEnableA11y: true,
  shouldEnableCypress: false,
  shouldEnableVitest: true,
  shouldEnableGraphql: false,
  shouldEnableStorybook: false,
  shouldEnableQuery: true,
  shouldEnableRouter: true,
  shouldEnableNodeGlobals: true,
  shouldEnableBrowserGlobals: true,
  importCycleCheckMode: "off",
});
```

## Prettier Configuration

This package also exports Prettier configurations:

```js
import { ubaPrettierConfig } from "uba-eslint-config";

export default ubaPrettierConfig;
```

Or generate custom config:

```js
import { generatePrettierConfig } from "uba-eslint-config";

export default generatePrettierConfig({
  appType: "fullstack", // or "backendOnly"
});
```

## Peer Dependencies

Make sure to install these plugins in your project:

- `prettier-plugin-packagejson`
- `prettier-plugin-tailwindcss` (if using Tailwind CSS)

## License

MIT

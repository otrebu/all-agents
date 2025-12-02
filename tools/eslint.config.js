import { ubaEslintConfig } from "uba-eslint-config";

export default [
  ...ubaEslintConfig,
  { ignores: ["node_modules/**", "dist/**"] },
  {
    rules: {
      // Disable no-console for CLI projects (as per TOOLING.md)
      "no-console": "off",
    },
  },
  {
    files: ["tests/**/*.ts"],
    settings: {
      // Tell eslint-plugin-import that bun:test is a built-in module (like node:fs)
      "import/core-modules": ["bun:test"],
    },
  },
];

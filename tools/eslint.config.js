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
      // Tell eslint-plugin-import that bun:test and ajv subpaths are valid modules
      "import/core-modules": ["bun:test", "ajv/dist/2020"],
    },
  },
  {
    // marked-terminal's ESM build can't be parsed by eslint-plugin-import
    files: ["src/commands/ralph/display.ts"],
    settings: { "import/core-modules": ["marked-terminal"] },
  },
  {
    // ajv/dist/2020 types aren't resolvable by eslint-typescript parser
    // (works at bun runtime). Disable unsafe rules for this file.
    files: ["tests/e2e/ralph.test.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
    },
  },
];

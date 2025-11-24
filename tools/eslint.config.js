import { ubaEslintConfig } from "uba-eslint-config";

export default [
  ...ubaEslintConfig,
  {
    ignores: ["node_modules/**", "dist/**"],
  },
  {
    rules: {
      // Disable no-console for CLI projects (as per TOOLING.md)
      "no-console": "off",
    },
  },
];

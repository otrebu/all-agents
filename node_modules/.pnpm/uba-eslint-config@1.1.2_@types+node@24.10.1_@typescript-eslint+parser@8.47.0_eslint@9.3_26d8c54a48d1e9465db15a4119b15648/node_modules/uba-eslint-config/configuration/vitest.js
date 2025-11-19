import vitest from "@vitest/eslint-plugin";

/** @type {import("eslint").Linter.Config} */
const vitestConfig = {
  files: ["tests/**", "**/*.test.ts", "**/*.test.js"],
  languageOptions: { globals: { ...vitest.environments.env.globals } },
  plugins: { vitest },
  rules: {
    ...vitest.configs.recommended.rules,
    "vitest/max-nested-describe": ["error", { max: 3 }],
  },
  settings: { vitest: { typecheck: true } },
};

export default vitestConfig;

import importPlugin from "eslint-plugin-import";

const rules = {
  "import/default": 2,
  "import/export": 2,
  "import/exports-last": 2,
  "import/extensions": [2, "never"],
  "import/first": 2,
  "import/group-exports": 0,
  "import/named": 2,
  "import/namespace": 2,
  "import/newline-after-import": 2,
  "import/no-absolute-path": 2,
  "import/no-anonymous-default-export": 2,
  "import/no-cycle": 2,
  "import/no-default-export": 0,
  "import/no-deprecated": 2,
  "import/no-duplicates": 2,
  "import/no-dynamic-require": 2,
  "import/no-empty-named-blocks": 2,
  "import/no-extraneous-dependencies": 2,
  "import/no-internal-modules": 0,
  "import/no-mutable-exports": 2,
  "import/no-named-as-default": 2,
  "import/no-named-export": 0,
  "import/no-relative-packages": 2,
  "import/no-relative-parent-imports": 0,
  "import/no-self-import": 2,
  "import/no-unresolved": 2,
  "import/no-unused-modules": [2],
  "import/no-useless-path-segments": 2,
  "import/order": 0,
  "import/prefer-default-export": 2,
};

/** @type {Record<string, import("eslint").ESLint.Plugin>} */
const importPluginSetting = {
  import: { meta: { name: "import" }, rules: importPlugin.rules },
};

/** @type {import("eslint").Linter.Config} */
const importEslintJavascriptConfig = {
  files: ["**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"],
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: { import: { meta: { name: "import" }, rules: importPlugin.rules } },
  rules: { ...rules, "import/extensions": 0 },
};

/** @type {import("eslint").Linter.Config} */
const importEslintTypescriptConfig = {
  files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
  plugins: { import: { meta: { name: "import" }, rules: importPlugin.rules } },
  ...importPlugin.configs.typescript,
  rules,
  settings: {
    "import/parsers": { "@typescript-eslint/parser": [".ts", ".tsx"] },
    "import/resolver": { node: true, typescript: { alwaysTryTypes: true } },
  },
};

export {
  importEslintJavascriptConfig,
  importEslintTypescriptConfig,
  importPluginSetting,
};

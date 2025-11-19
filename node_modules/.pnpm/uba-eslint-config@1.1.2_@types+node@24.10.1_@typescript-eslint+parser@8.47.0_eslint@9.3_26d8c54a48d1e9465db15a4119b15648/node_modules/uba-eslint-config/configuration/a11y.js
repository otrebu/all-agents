import a11yPlugin from "eslint-plugin-jsx-a11y";

/** @type {import("eslint").Linter.Config} */
const a11yConfig = {
  files: ["**/*.tsx", "**/*.jsx"],
  plugins: { "jsx-a11y": a11yPlugin },
  rules: a11yPlugin.configs.recommended.rules,
};

export default a11yConfig;

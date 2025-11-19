import cypressPlugin from "eslint-plugin-cypress/flat";
import globals from "globals";

/** @type {import("eslint").Linter.Config} */
const cypressConfig = {
  files: ["cypress/**/*.ts", "cypress/**/*.tsx", "**/*.test.tsx"],
  languageOptions: {
    globals: {
      // Cypress testing utilities (false = not read-only, allows mocking/stubbing)
      assert: false,
      chai: false,
      cy: false,
      Cypress: false,
      expect: false,
      // Browser APIs for test environment
      ...globals.browser,
      // Mocha test runner globals
      ...globals.mocha,
    },
  },
  plugins: { cypress: cypressPlugin },
  rules: {
    "cypress/assertion-before-screenshot": "warn",
    "cypress/no-assigning-return-values": "error",
    "cypress/no-async-tests": "error",
    "cypress/no-force": "warn",
    "cypress/no-pause": "error",
    "cypress/no-unnecessary-waiting": "error",
    "promise/always-return": "off",
    "promise/catch-or-return": "off",
    "promise/prefer-await-to-then": "off",
  },
};

export default cypressConfig;

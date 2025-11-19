import pluginChaiFriendly from "eslint-plugin-chai-friendly";
import perfectionist from "eslint-plugin-perfectionist";

import a11yConfig from "./configuration/a11y.js";
import canonicalConfig from "./configuration/canonical.js";
import cypressConfig from "./configuration/cypress.js";
import eslintConfig from "./configuration/eslint.js";
import filenameConfig from "./configuration/filename.js";
import functionNameConfig from "./configuration/functionName.js";
import { browserGlobals, nodeGlobals } from "./configuration/globals.js";
import graphqlConfig from "./configuration/graphql.js";
import {
  importEslintJavascriptConfig,
  importEslintTypescriptConfig,
} from "./configuration/import.js";
import promiseConfig from "./configuration/promise.js";
import queryConfig from "./configuration/query.js";
import reactConfig from "./configuration/react.js";
import routerConfig from "./configuration/router.js";
import storybookConfig from "./configuration/storybook.js";
import typescriptEslintConfig from "./configuration/typescript.js";
import unicornConfig from "./configuration/unicorn.js";
import vitestConfig from "./configuration/vitest.js";

/**
 * @typedef {'fullstack' | 'backendOnly'} AppType
 */

/**
 * @typedef {Object} EslintConfigOptions
 * @property {boolean} [shouldEnableTypescript=true] - Whether to enable TypeScript configuration
 * @property {'on' | 'off'} [importCycleCheckMode='ci'] - When set to 'on', the heavy `import/no-cycle` rule is disabled locally and enforced only in CI; 'off' enforces it everywhere
 * @property {AppType} [appType='fullstack'] - Type of application to configure
 */

/**
 * Generates ESLint configuration based on application type
 * @param {EslintConfigOptions} options - Configuration options
 * @returns {import('eslint').Linter.Config[]} Array of ESLint configurations
 * @throws {Error} When an invalid app type is provided
 */
export function generateEslintConfig({
  appType = "fullstack",
  importCycleCheckMode = "off",
  shouldEnableTypescript = true,
}) {
  switch (appType) {
    case "backendOnly": {
      return generateEslintConfigByFeatures({
        importCycleCheckMode,
        shouldEnableA11y: false,
        shouldEnableBrowserGlobals: false,
        shouldEnableCypress: false,
        shouldEnableGraphql: false,
        shouldEnableNodeGlobals: true,
        shouldEnableQuery: false,
        shouldEnableReact: false,
        shouldEnableRouter: false,
        shouldEnableStorybook: false,
        shouldEnableTypescript,
        shouldEnableVitest: true,
      });
    }
    case "fullstack": {
      return generateEslintConfigByFeatures({
        importCycleCheckMode,
        shouldEnableA11y: true,
        shouldEnableBrowserGlobals: true,
        shouldEnableCypress: true,
        shouldEnableGraphql: false,
        shouldEnableNodeGlobals: true,
        shouldEnableQuery: true,
        shouldEnableReact: true,
        shouldEnableRouter: true,
        shouldEnableStorybook: true,
        shouldEnableTypescript,
        shouldEnableVitest: true,
      });
    }
    default: {
      throw new Error(`Invalid app type: ${appType}`);
    }
  }
}

/**
 * @typedef {import('eslint').Linter.Config} ESLintConfig
 */

/**
 * Creates ESLint configuration
 * @param {Object} options - Configuration options
 * @param {boolean} [options.shouldEnableTypescript=true] - Whether to enable TypeScript configuration
 * @param {boolean} [options.shouldEnableTailwind=false] - Whether to enable Tailwind configuration
 * @param {boolean} [options.shouldEnableReact=true] - Whether to enable React configuration
 * @param {boolean} [options.shouldEnableCypress=false] - Whether to enable Cypress configuration
 * @param {boolean} [options.shouldEnableA11y=false] - Whether to enable A11y configuration
 * @param {boolean} [options.shouldEnableVitest=false] - Whether to enable Vitest configuration
 * @param {boolean} [options.shouldEnableGraphql=false] - Whether to enable GraphQL configuration
 * @param {boolean} [options.shouldEnableStorybook=false] - Whether to enable Storybook configuration
 * @param {boolean} [options.shouldEnableQuery=false] - Whether to enable Query configuration
 * @param {boolean} [options.shouldEnableRouter=false] - Whether to enable Router configuration
 * @param {'ci' | 'always'} [options.importCycleCheckMode='ci'] - Control when the heavy `import/no-cycle` rule runs
 * @returns {ESLintConfig[]} Array of ESLint configurations
 */
// eslint-disable-next-line complexity
export function generateEslintConfigByFeatures({
  importCycleCheckMode = "off",
  shouldEnableA11y = false,
  shouldEnableBrowserGlobals = false,
  shouldEnableCypress = false,
  shouldEnableGraphql = false,
  shouldEnableNodeGlobals = false,
  shouldEnableQuery = false,
  shouldEnableReact = false,
  shouldEnableRouter = false,
  shouldEnableStorybook = false,
  shouldEnableTypescript = true,
  shouldEnableVitest = false,
}) {
  return [
    eslintConfig,
    shouldEnableTypescript ? typescriptEslintConfig : undefined,
    perfectionist.configs["recommended-alphabetical"],
    shouldEnableCypress ? cypressConfig : undefined,
    shouldEnableA11y ? a11yConfig : undefined,
    shouldEnableVitest ? vitestConfig : undefined,
    filenameConfig,
    functionNameConfig,
    promiseConfig,
    unicornConfig,
    canonicalConfig,
    shouldEnableReact ? reactConfig : undefined,
    shouldEnableTypescript
      ? importEslintTypescriptConfig
      : importEslintJavascriptConfig,
    pluginChaiFriendly.configs.recommendedFlat,
    shouldEnableGraphql ? graphqlConfig : undefined,
    shouldEnableStorybook ? storybookConfig : undefined,
    shouldEnableQuery ? queryConfig : undefined,
    shouldEnableRouter ? routerConfig : undefined,
    shouldEnableNodeGlobals ? nodeGlobals : undefined,
    shouldEnableBrowserGlobals ? browserGlobals : undefined,
    importCycleCheckMode === "off"
      ? { rules: { "import/no-cycle": "off" } }
      : undefined,
  ]
    .filter((c) => c !== undefined)
    .flat();
}

// Choose mode here. Change to 'always' to enforce the rule everywhere.
const importCycleCheckMode = process.env.CI ? "on" : "off";

const baseConfig = generateEslintConfig({
  appType: "fullstack",
  importCycleCheckMode,
  shouldEnableTypescript: true,
});

// Export the final configuration.
// The heavy `import/no-cycle` rule is enabled only when `importCycleCheckMode` is set to "on" (i.e. in CI).
export default baseConfig;

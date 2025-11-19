import globals from "globals";

/** @type {import("eslint").Linter.Config} */
const nodeGlobals = { languageOptions: { globals: { ...globals.node } } };

/** @type {import("eslint").Linter.Config} */
const browserGlobals = { languageOptions: { globals: { ...globals.browser } } };

export { browserGlobals, nodeGlobals };

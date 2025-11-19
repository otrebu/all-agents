import promisePlugin from "eslint-plugin-promise";

/** @type {import("eslint").Linter.Config} */
const promiseConfig = {
  files: ["**/*.{js,jsx,ts,tsx}"],
  plugins: { promise: promisePlugin },
  rules: {
    "promise/always-return": 2,
    "promise/avoid-new": 2,
    "promise/catch-or-return": 2,
    "promise/no-callback-in-promise": 2,
    "promise/no-multiple-resolved": 2,
    "promise/no-native": 0,
    "promise/no-nesting": 2,
    "promise/no-new-statics": 2,
    "promise/no-promise-in-callback": 2,
    "promise/no-return-in-finally": 2,
    "promise/no-return-wrap": 2,
    "promise/param-names": 2,
    "promise/prefer-await-to-callbacks": 2,
    "promise/prefer-await-to-then": 2,
    "promise/valid-params": 2,
  },
};

export default promiseConfig;

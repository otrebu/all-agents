import { ubaEslintConfig } from "uba-eslint-config";

export default [
  ...ubaEslintConfig,
  {
    rules: {
      "no-console": "off", // CLI project - console.log/error are correct for terminal output
    },
  },
];

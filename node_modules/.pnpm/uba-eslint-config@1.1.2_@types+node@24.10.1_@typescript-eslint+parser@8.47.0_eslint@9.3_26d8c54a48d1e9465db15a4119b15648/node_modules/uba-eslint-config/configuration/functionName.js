import functionNamePlugin from "eslint-plugin-function-name";

const functionNameConfig = {
  plugins: { "function-name": functionNamePlugin },
  rules: {
    "function-name/starts-with-verb": [
      2,
      {
        whitelist: [
          "invalidate",
          "obfuscate",
          "authenticate",
          "seed",
          "swap",
          "awaken",
          "sanitize",
          "reserve",
          "exclude",
          "teardown",
          "fabricate",
        ],
      },
    ],
  },
};

export default functionNameConfig;

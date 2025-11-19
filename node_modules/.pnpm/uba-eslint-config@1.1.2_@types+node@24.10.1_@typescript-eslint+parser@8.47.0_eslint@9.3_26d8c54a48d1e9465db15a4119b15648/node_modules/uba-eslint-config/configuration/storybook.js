import storybook from "eslint-plugin-storybook";

const storybookConfig = [
  ...storybook.configs["flat/recommended"],
  { ignores: [".storybook", "storybook-static"] },
  {
    files: ["**/*.stories.@(js|jsx|ts|tsx)"],
    rules: { "storybook/no-renderer-packages": "off" },
  },
];

export default storybookConfig;

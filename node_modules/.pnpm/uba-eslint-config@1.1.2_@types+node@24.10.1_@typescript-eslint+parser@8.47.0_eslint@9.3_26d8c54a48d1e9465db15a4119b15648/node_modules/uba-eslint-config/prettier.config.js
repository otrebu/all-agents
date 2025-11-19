/** @type {import("prettier").Options} */
function generatePrettierConfig({ appType = "fullstack" }) {
  const plugins = ["prettier-plugin-packagejson"];

  if (appType === "fullstack") {
    plugins.push("prettier-plugin-tailwindcss");
  }

  return {
    arrowParens: "always",
    bracketSpacing: true,
    embeddedLanguageFormatting: "auto",
    endOfLine: "lf",
    htmlWhitespaceSensitivity: "css",
    objectWrap: "collapse",
    plugins,
    printWidth: 80,
    quoteProps: "as-needed",
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "all",
    useTabs: false,
  };
}

const config = generatePrettierConfig({ appType: "fullstack" });

export default config;
export { generatePrettierConfig };

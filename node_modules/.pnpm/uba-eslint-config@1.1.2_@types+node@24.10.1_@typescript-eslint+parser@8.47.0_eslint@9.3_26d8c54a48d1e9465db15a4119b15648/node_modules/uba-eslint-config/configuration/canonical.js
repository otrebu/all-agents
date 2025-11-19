import canonicalPlugin from "eslint-plugin-canonical";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import("eslint").Linter.Config} */
const canonicalConfig = {
  plugins: { canonical: canonicalPlugin },
  rules: {
    "canonical/prefer-import-alias": [
      2,
      {
        aliases: [
          {
            alias: "@/",
            // the __dirname once this is installed as a package will be /node_modules/@uba/eslint-config/
            matchParent: resolve(__dirname, "../../../../src"),
            matchPath: "^src\\/",
          },
          { alias: "@/", matchPath: "^src\\/", maxRelativeDepth: 2 },
        ],
      },
    ],
  },
};

export default canonicalConfig;

## Package.json

List of scripts that should ALWAYS be present in a package.json

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    // TODO: without compiling
    "typecheck: "tsc "
  }
}
```

TODO: describe the taxonomy of how I prefer scripts to be names with : separators

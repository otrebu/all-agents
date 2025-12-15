# Tsx for development

tsx is a tool that we want to use for development only. It is not a production tool for us.

Examples:

package.json:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts"
  }
}
```

## DO not use when

- You are building for production
- You are using bun as your runtime instead of node

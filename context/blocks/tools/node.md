---
depends: []
---

# Node.js

JavaScript runtime for server-side execution.

## Version Management

Use **nvm** (Node Version Manager) to manage Node versions.

Look up latest version of nvm: https://github.com/nvm-sh/nvm/releases

```bash
# Install nvm (macOS/Linux)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/vX.X.X/install.sh | bash

# List available versions
nvm ls-remote

# Install LTS
nvm install --lts

# Install specific version
nvm install 20

# Use version
nvm use 20

# Set default
nvm alias default 20
```

## LTS Recommendation

Always use latest **LTS (Long Term Support)** version for production:

Check latest LTS: https://nodejs.org/en/about/releases/

## .nvmrc

Pin Node version per project:

```bash
# Create .nvmrc
echo "24" > .nvmrc

# Auto-use when entering directory
nvm use
```

## package.json engines

Enforce Node version:

```json
{
  "engines": {
    "node": ">=24"
  }
}
```

## When to Use Node vs Bun

| Scenario                   | Use  |
| -------------------------- | ---- |
| Enterprise, full ecosystem | Node |
| Maximum compatibility      | Node |
| Large existing codebase    | Node |
| Greenfield, max speed      | Bun  |
| Serverless cold starts     | Bun  |

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
nvm install 24

# Use version
nvm use 24

# Set default
nvm alias default 24
```

### LTS Recommendation

Always use latest **LTS (Long Term Support)** version for production:

Check latest LTS: https://nodejs.org/en/about/releases/

### .nvmrc

Pin Node version per project:

```bash
# Create .nvmrc
echo "24" > .nvmrc

# Auto-use when entering directory
nvm use
```

### package.json engines

Enforce Node version:

```json
{
  "engines": {
    "node": ">=24"
  }
}
```

## Loading Environment Variables

Node.js requires the `--env-file` flag to load environment variables from a specific file.

```bash
node --env-file=.env src/index.ts
```

package.json example:

```json
{
  "scripts": {
    "start": "node --env-file=.env src/index.ts"
  }
}
```

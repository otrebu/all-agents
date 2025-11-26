#!/bin/bash
# Build binary and create symlink (no sudo required)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BIN_PATH="$PROJECT_ROOT/bin/aaa"
LOCAL_BIN="$HOME/.local/bin"
SYMLINK_PATH="$LOCAL_BIN/aaa"

# Build
echo "Building aaa binary..."
cd "$SCRIPT_DIR"
bun install
bun run build

# Verify build
if [[ ! -f "$BIN_PATH" ]]; then
  echo "Error: Build failed - binary not found"
  exit 1
fi

# Create ~/.local/bin if needed
mkdir -p "$LOCAL_BIN"

# Symlink
echo "Creating symlink at $SYMLINK_PATH..."
ln -sf "$BIN_PATH" "$SYMLINK_PATH"

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
  echo ""
  echo "Add ~/.local/bin to your PATH by adding this to ~/.zshrc:"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
  echo "Then run: source ~/.zshrc"
else
  echo "Success! aaa is now available."
  aaa --version
fi

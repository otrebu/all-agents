#!/bin/bash
echo "Building AI Agent..."
cd tools && bun install && bun run build
echo "Linking binary..."
sudo ln -sf "$(pwd)/../bin/ai-agent" /usr/local/bin/ai-agent
echo "Done! Run 'ai-agent --help'"

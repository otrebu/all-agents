#!/usr/bin/env node
/**
 * Plugin scaffolding script for Claude Code
 * Creates new plugin with proper structure
 * Uses only Node.js built-ins - no external dependencies
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface ConflictCheck {
  exists: boolean;
  message?: string;
}

interface Marketplace {
  name: string;
  owner: { name: string };
  plugins: Array<{
    description: string;
    name: string;
    source: string;
    version: string;
  }>;
}

interface PluginJson {
  author: {
    email: string;
    name: string;
  };
  description: string;
  keywords: Array<string>;
  license: string;
  name: string;
  version: string;
}

// Types
interface PluginMetadata {
  description: string;
  keywords: Array<string>;
  name: string;
}

// Check if plugin exists in marketplace
function checkPluginConflicts(
  pluginName: string,
  marketplacePath: string
): ConflictCheck {
  if (!existsSync(marketplacePath)) {
    return {
      exists: false,
      message: "Marketplace file not found, will create new entry",
    };
  }

  try {
    const marketplaceContent = readFileSync(marketplacePath, "utf8");
    const marketplace = JSON.parse(marketplaceContent) as Marketplace;
    const existingPlugin = marketplace.plugins?.find(
      (p) => p.name === pluginName
    );

    if (existingPlugin) {
      return {
        exists: true,
        message: `Plugin "${pluginName}" already exists in marketplace`,
      };
    }

    return { exists: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      exists: false,
      message: `Error reading marketplace: ${errorMessage}`,
    };
  }
}

// Main execution
function createPlugin(
  name: string,
  description: string,
  workingDirectory: string
): void {
  const pluginName = toKebabCase(name);
  const keywords = extractKeywords(description);
  const metadata: PluginMetadata = { description, keywords, name: pluginName };

  console.log("Creating plugin:", pluginName);
  console.log("Description:", description);
  console.log("Keywords:", keywords.join(", "));
  console.log();

  // Check for conflicts
  const marketplacePath = join(
    workingDirectory,
    ".claude-plugin",
    "marketplace.json"
  );
  const conflict = checkPluginConflicts(pluginName, marketplacePath);

  if (conflict.exists) {
    console.error("❌", conflict.message ?? "Plugin conflict detected");
    process.exit(1);
  }

  if (conflict.message !== undefined && conflict.message !== "") {
    console.log("⚠️ ", conflict.message);
  }

  // Create plugin structure
  const pluginPath = join(workingDirectory, ".claude", "plugins", pluginName);

  console.log("Creating directories...");
  createPluginDirectories(pluginPath);

  writePluginFiles(pluginPath, metadata, marketplacePath);
  printSuccessMessage(pluginName);
}

// Create directory structure
function createPluginDirectories(pluginPath: string): void {
  const directories = [
    pluginPath,
    join(pluginPath, ".claude-plugin"),
    join(pluginPath, "commands"),
  ];

  directories.forEach((directory) => {
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
  });
}

// Extract keywords from description
function extractKeywords(description: string): Array<string> {
  const commonWords = [
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
  ];
  const words = description
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !commonWords.includes(w))
    .slice(0, 5);

  return [...new Set(words)];
}

// Generate plugin.json content
function generatePluginJson(metadata: PluginMetadata): string {
  const pluginJson: PluginJson = {
    author: {
      email: "dev@uberto.me",
      name: "otrebu",
    },
    description: metadata.description,
    keywords: metadata.keywords,
    license: "MIT",
    name: metadata.name,
    version: "1.0.0",
  };

  return JSON.stringify(pluginJson, null, 2);
}

// Generate README.md content
function generateReadme(pluginName: string, description: string): string {
  const titleCase = pluginName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return `# ${titleCase}

${description}

## Status

🚧 Plugin scaffolded - no commands or agents yet.

## Development

Add commands and agents to this plugin:

\`\`\`bash
# Add a command
touch .claude/plugins/${pluginName}/commands/my-command.md

# Add an agent
mkdir -p .claude/plugins/${pluginName}/agents
touch .claude/plugins/${pluginName}/agents/my-agent.md
\`\`\`

Update this README as features are added.
`;
}

// Parse CLI arguments
function parseArguments(args: Array<string>): { description: string; name: string; } {
  if (args.length === 0) {
    console.error(
      "Usage: node create-plugin.ts <plugin-name> <plugin-description>"
    );
    console.error(
      'Example: node create-plugin.ts deployment-manager "manages deployment workflows"'
    );
    process.exit(1);
  }

  const name = args[0];
  if (name === undefined || name === "") {
    console.error("Error: Plugin name is required");
    process.exit(1);
  }
  const description = args.slice(1).join(" ");

  if (!description) {
    console.error("Error: Description is required");
    console.error(
      "Usage: node create-plugin.ts <plugin-name> <plugin-description>"
    );
    process.exit(1);
  }

  return { description, name };
}

// Print success message
function printSuccessMessage(pluginName: string): void {
  console.log();
  console.log("✅ Plugin created successfully!");
  console.log();
  console.log("Structure:");
  console.log(`  ✓ .claude/plugins/${pluginName}/.claude-plugin/plugin.json`);
  console.log(`  ✓ .claude/plugins/${pluginName}/commands/ (empty)`);
  console.log(`  ✓ .claude/plugins/${pluginName}/README.md`);
  console.log("  ✓ Updated .claude-plugin/marketplace.json");
  console.log();
  console.log("Next steps:");
  console.log(
    `  1. Add commands: Create .md files in .claude/plugins/${pluginName}/commands/`
  );
  console.log(`  2. Add agents: Create agents/ directory and .md files`);
  console.log("  3. Add hooks: Create hooks/hooks.json");
  console.log("  4. Add MCP servers: Create .mcp.json");
  console.log();
  console.log(
    "The plugin is now registered in the marketplace and ready for development!"
  );
}

// Convert description to kebab-case plugin name
function toKebabCase(text: string): string {
  const fillerWords = [
    "that",
    "to",
    "for",
    "with",
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
  ];

  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => !fillerWords.includes(word))
    .join("-")
    .replaceAll(/[^a-z0-9-]/g, "");
}

// Update marketplace.json with new plugin
function updateMarketplaceFile(
  pluginName: string,
  description: string,
  marketplacePath: string
): void {
  const marketplace: Marketplace = existsSync(marketplacePath)
    ? (() => {
        const content = readFileSync(marketplacePath, "utf8");
        const parsed = JSON.parse(content) as Marketplace;
        return {
          ...parsed,
          plugins: parsed.plugins || [],
        };
      })()
    : {
        name: "local-marketplace",
        owner: { name: "otrebu" },
        plugins: [],
      };

  marketplace.plugins.push({
    description,
    name: pluginName,
    source: `./.claude/plugins/${pluginName}`,
    version: "1.0.0",
  });

  // Ensure directory exists
  const marketplaceDirectory = join(marketplacePath, "..");
  if (!existsSync(marketplaceDirectory)) {
    mkdirSync(marketplaceDirectory, { recursive: true });
  }

  writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)  }\n`);
}

// Write all plugin files
function writePluginFiles(
  pluginPath: string,
  metadata: PluginMetadata,
  marketplacePath: string
): void {
  console.log("Writing plugin.json...");
  writeFileSync(
    join(pluginPath, ".claude-plugin", "plugin.json"),
    generatePluginJson(metadata)
  );

  console.log("Writing README.md...");
  writeFileSync(
    join(pluginPath, "README.md"),
    generateReadme(metadata.name, metadata.description)
  );

  console.log("Updating marketplace.json...");
  updateMarketplaceFile(metadata.name, metadata.description, marketplacePath);
}

// Entry point
try {
  const args = process.argv.slice(2);
  const { description, name } = parseArguments(args);
  const workingDirectory = process.cwd();

  createPlugin(name, description, workingDirectory);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  console.error("Error:", errorMessage);
  process.exit(1);
}

/**
 * Ralph completion command for dynamic shell completions
 *
 * This command provides intelligent completions based on CURRENT system state:
 * - Which providers are installed
 * - Available models for each provider
 * - Dynamic flags for each command
 */

import { Command } from "@commander-js/extra-typings";

import type { ProviderInfo } from "./providers/types";

// Import providers to trigger auto-registration
import "./providers/claude";
import "./providers/codex";
import "./providers/cursor";
import "./providers/gemini";
import "./providers/opencode";
import { initializeProviders, listProviders } from "./providers/index";

// Map of provider names to their CLI commands
const PROVIDER_COMMANDS: Record<string, string> = {
  claude: "claude",
  codex: "codex",
  cursor: "agent",
  gemini: "gemini",
  opencode: "opencode",
};

// Known models for providers (static fallback when CLI doesn't support listing)
const KNOWN_MODELS: Record<string, Array<string>> = {
  claude: [
    "claude-4-opus-latest",
    "claude-4-sonnet-latest",
    "claude-3-5-sonnet-latest",
    "claude-3-5-haiku-latest",
  ],
  codex: ["gpt-5.2-codex", "o3-mini", "o1", "gpt-4o"],
  cursor: ["composer-1", "composer-2", "gpt-4o", "claude-3-5-sonnet"],
  gemini: ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"],
  opencode: [
    "anthropic/claude-3-5-sonnet-latest",
    "anthropic/claude-3-5-haiku-latest",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "google/gemini-2.5-flash",
  ],
};

/**
 * Get flags for a specific command path
 */
function getCommandFlags(commandPath: Array<string>): Array<string> {
  const flags: Record<string, Array<string>> = {
    "ralph.build": [
      "--subtasks",
      "-p",
      "--print",
      "-i",
      "--interactive",
      "-s",
      "--supervised",
      "-H",
      "--headless",
      "-S",
      "--skip-summary",
      "-q",
      "--quiet",
      "--max-iterations",
      "--calibrate-every",
      "--validate-first",
      "--provider",
      "--model",
    ],
    "ralph.calibrate.all": [
      "--subtasks",
      "--force",
      "--review",
      "--provider",
      "--model",
    ],
    "ralph.calibrate.improve": [
      "--subtasks",
      "--force",
      "--review",
      "--provider",
      "--model",
    ],
    "ralph.calibrate.intention": [
      "--subtasks",
      "--force",
      "--review",
      "--provider",
      "--model",
    ],
    "ralph.calibrate.technical": [
      "--subtasks",
      "--force",
      "--review",
      "--provider",
      "--model",
    ],
    "ralph.plan.roadmap": ["--provider", "--model"],
    "ralph.plan.stories": [
      "--milestone",
      "-s",
      "--supervised",
      "-H",
      "--headless",
      "--provider",
      "--model",
    ],
    "ralph.plan.subtasks": [
      "--review",
      "--task",
      "--story",
      "--milestone",
      "--size",
      "-s",
      "--supervised",
      "-H",
      "--headless",
      "--provider",
      "--model",
    ],
    "ralph.plan.tasks": [
      "--story",
      "--milestone",
      "-s",
      "--supervised",
      "-H",
      "--headless",
      "--provider",
      "--model",
    ],
    "ralph.plan.vision": ["--provider", "--model"],
  };

  // Try exact match first
  const pathKey = commandPath.join(".");
  if (flags[pathKey]) {
    return flags[pathKey];
  }

  // Try partial matches
  for (let index = commandPath.length; index > 0; index -= 1) {
    const partialKey = commandPath.slice(0, index).join(".");
    if (flags[partialKey]) {
      return flags[partialKey];
    }
  }

  return [];
}

/**
 * Get list of installed providers
 */
async function getInstalledProviders(): Promise<Array<string>> {
  await initializeProviders();
  const providers = listProviders();
  return providers
    .filter((p: ProviderInfo) => p.available)
    .map((p: ProviderInfo) => p.name);
}

/**
 * Get models for a specific provider
 * Tries CLI-specific methods first, falls back to known models
 */
function getProviderModels(providerName: string): Array<string> {
  // First check if provider is installed
  const command = PROVIDER_COMMANDS[providerName];
  if (command === undefined || command === "") {
    return [];
  }

  if (!isCommandAvailable(command)) {
    return [];
  }

  // Try provider-specific model listing
  try {
    switch (providerName) {
      case "claude": {
        // Claude accepts any model string, return known models as suggestions
        return KNOWN_MODELS[providerName] ?? [];
      }
      case "codex": {
        // Codex: codex --list-models
        const proc = Bun.spawnSync([command, "--list-models"], {
          timeout: 5000,
        });
        if (proc.exitCode === 0) {
          const output = new TextDecoder().decode(proc.stdout);
          return output
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        }
        break;
      }
      case "cursor": {
        // Cursor: agent --list-models
        const proc = Bun.spawnSync([command, "--list-models"], {
          timeout: 5000,
        });
        if (proc.exitCode === 0) {
          const output = new TextDecoder().decode(proc.stdout);
          // Parse output - typically one model per line
          return output
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && !line.startsWith("#"));
        }
        break;
      }
      case "gemini": {
        // Gemini has limited models, use known list
        return KNOWN_MODELS[providerName] ?? [];
      }
      case "opencode": {
        // Opencode: opencode models or opencode --list-models
        const proc = Bun.spawnSync([command, "models"], { timeout: 5000 });
        if (proc.exitCode === 0) {
          const output = new TextDecoder().decode(proc.stdout);
          return output
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && !line.startsWith("#"));
        }
        break;
      }
      default: {
        // Unknown provider
        return [];
      }
    }
  } catch {
    // Fall through to known models
  }

  // Fallback to known models
  return KNOWN_MODELS[providerName] ?? [];
}

/**
 * Check if a CLI command is available in PATH
 */
function isCommandAvailable(command: string): boolean {
  try {
    const proc = Bun.spawnSync(["which", command], { timeout: 5000 });
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Main completion handler
 */
const completionCommand = new Command("completion")
  .description("Dynamic completion for shell integration (internal use)")
  .option("--providers", "List installed providers")
  .option("--models <provider>", "List models for a provider")
  .option("--flags <command>", "List flags for a command path (dot-separated)")
  .action(async (options) => {
    try {
      // List installed providers
      if (options.providers === true) {
        const providers = await getInstalledProviders();
        console.log(providers.join("\n"));
        return;
      }

      // List models for a provider
      if (options.models !== undefined && options.models !== "") {
        const models = getProviderModels(options.models);
        console.log(models.join("\n"));
        return;
      }

      // List flags for a command
      if (options.flags !== undefined && options.flags !== "") {
        const commandPath = options.flags.split(".");
        const commandFlags = getCommandFlags(commandPath);
        console.log(commandFlags.join("\n"));
        return;
      }

      // No options specified - show help
      console.error(
        "Usage: aaa ralph completion [--providers] [--models <provider>] [--flags <command>]",
      );
      console.error("");
      console.error("Options:");
      console.error("  --providers              List installed providers");
      console.error("  --models <provider>      List models for a provider");
      console.error(
        "  --flags <command>        List flags for a command (e.g., ralph.build)",
      );
      process.exit(1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exit(1);
    }
  });

export {
  completionCommand,
  getCommandFlags,
  getInstalledProviders,
  getProviderModels,
};
export default completionCommand;

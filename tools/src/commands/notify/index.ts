/**
 * Notify command - Push notifications via ntfy.sh
 *
 * Commands:
 *   aaa notify <message>     Send notification
 *   aaa notify on            Enable notifications
 *   aaa notify off           Disable notifications
 *   aaa notify status        Show current status
 *   aaa notify config        Config management subcommands
 *     └── config set         Set config values
 *     └── config show        Display config
 *     └── config test        Send test notification
 */

import * as p from "@clack/prompts";
import { Command, Option } from "@commander-js/extra-typings";
import chalk from "chalk";
import { existsSync } from "node:fs";
import ora from "ora";

import type { NotifyConfig, Priority } from "./types";

import { sendNotification } from "./client";
import {
  DEFAULT_NOTIFY_CONFIG,
  getConfigPath,
  isInQuietHours,
  loadNotifyConfig,
  saveNotifyConfig,
} from "./config";
import { NtfyNetworkError, NtfyRateLimitError, priorities } from "./types";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if notifications should be sent
 * Returns empty string if OK, or error message if not
 */
function checkNotificationEnabled(config: NotifyConfig): string {
  if (!config.enabled) {
    return "Notifications are disabled";
  }
  if (config.topic === "") {
    return "Topic not configured";
  }
  return "";
}

/**
 * Format quiet hours for display
 */
function formatQuietHours(config: NotifyConfig): string {
  if (!config.quietHours.enabled) {
    return "disabled";
  }
  function pad(n: number): string {
    return n.toString().padStart(2, "0");
  }
  return `${pad(config.quietHours.startHour)}:00 - ${pad(config.quietHours.endHour)}:00`;
}

/**
 * Resolve final config by merging CLI > env > config > defaults
 *
 * Config resolution: CLI flags → env vars → config file → defaults
 */
function resolveConfig(
  fileConfig: NotifyConfig,
  cliOptions: { priority?: string; title?: string },
): { priority: Priority; server: string; title: string; topic: string } {
  // Resolve priority with quiet hours fallback
  function resolvePriority(): Priority {
    // CLI flag has highest priority
    if (cliOptions.priority !== undefined) {
      return cliOptions.priority as Priority;
    }
    // Env var
    const envPriority = process.env.NTFY_PRIORITY;
    if (
      envPriority !== undefined &&
      priorities.includes(envPriority as Priority)
    ) {
      return envPriority as Priority;
    }
    // Quiet hours check - use low during quiet hours
    if (isInQuietHours(fileConfig.quietHours)) {
      return "low";
    }
    // Config default
    return fileConfig.defaultPriority;
  }

  return {
    priority: resolvePriority(),
    server: process.env.NTFY_SERVER ?? fileConfig.server,
    title: cliOptions.title ?? fileConfig.title,
    topic: process.env.NTFY_TOPIC ?? fileConfig.topic,
  };
}

// =============================================================================
// Main Command
// =============================================================================

const notifyCommand = new Command("notify").description(
  "Push notifications via ntfy.sh",
);

// aaa notify <message> - send notification
notifyCommand
  .argument("[message]", "Message to send")
  .option("-t, --title <text>", "Notification title")
  .addOption(
    new Option("-p, --priority <level>", "Priority level").choices(priorities),
  )
  .option("--tags <tags>", "Comma-separated tags/emojis")
  .option("-q, --quiet", "Suppress output on success")
  .option("--dry-run", "Show what would be sent without sending")
  .action(async (message, options) => {
    // If no message and no subcommand, show help
    if (message === undefined) {
      notifyCommand.help();
      return;
    }

    const fileConfig = loadNotifyConfig();
    const resolved = resolveConfig(fileConfig, options);

    // --dry-run: show what would be sent without sending
    // This runs even when unconfigured to help debug config issues
    if (options.dryRun === true) {
      console.log(chalk.bold("Dry run - would send:"));
      console.log();
      console.log(
        `  Topic:    ${resolved.topic || chalk.yellow("(not configured)")}`,
      );
      console.log(`  Server:   ${resolved.server}`);
      console.log(`  Title:    ${resolved.title}`);
      console.log(`  Priority: ${resolved.priority}`);
      if (options.tags !== undefined) {
        console.log(`  Tags:     ${options.tags}`);
      }
      console.log(`  Message:  ${message}`);
      return;
    }

    // Check if notifications should be sent
    const errorMessage = checkNotificationEnabled(fileConfig);
    if (errorMessage !== "") {
      // Silent exit when unconfigured (safe for hooks)
      process.exit(0);
    }

    try {
      const result = await sendNotification({
        message,
        priority: resolved.priority,
        server: resolved.server,
        tags: options.tags,
        title: resolved.title,
        topic: resolved.topic,
      });

      // -q/--quiet: suppress output on success
      if (options.quiet !== true) {
        console.log(`${chalk.green("✓")} Notification sent (${result.id})`);
      }
    } catch (error) {
      if (error instanceof NtfyRateLimitError) {
        console.error(chalk.red("Error:"), "Rate limited. Try again later.");
        process.exit(2);
      }
      if (error instanceof NtfyNetworkError) {
        console.error(chalk.red("Error:"), error.message);
        process.exit(2);
      }
      throw error;
    }
  });

// aaa notify init - interactive setup wizard
notifyCommand
  .command("init")
  .description("Interactive first-time setup")
  .action(async () => {
    const configPath = getConfigPath();
    const hasExistingConfig = existsSync(configPath);

    p.intro(chalk.bold("🔔 ntfy Notification Setup"));

    // Warn if config already exists
    if (hasExistingConfig) {
      const shouldContinue = await p.confirm({
        initialValue: false,
        message: "Configuration already exists. Overwrite?",
      });

      if (p.isCancel(shouldContinue) || !shouldContinue) {
        p.cancel("Setup cancelled");
        process.exit(0);
      }
    }

    // Prompt for topic (required)
    const topic = await p.text({
      message: "Topic name (secret, hard to guess)",
      placeholder: "my-claude-abc123",
      validate: (value: string): string | undefined => {
        if (value.trim() === "") return "Topic is required";
        if (!/^[\w-]+$/.test(value)) {
          return "Topic can only contain letters, numbers, hyphens, and underscores";
        }
        if (value.length > 64) return "Topic must be 64 characters or less";
        return undefined;
      },
    });

    if (p.isCancel(topic)) {
      p.cancel("Setup cancelled");
      process.exit(0);
    }

    // Prompt for server URL
    const server = await p.text({
      defaultValue: DEFAULT_NOTIFY_CONFIG.server,
      message: "Server URL",
      placeholder: DEFAULT_NOTIFY_CONFIG.server,
    });

    if (p.isCancel(server)) {
      p.cancel("Setup cancelled");
      process.exit(0);
    }

    // Ask about quiet hours
    const enableQuietHours = await p.confirm({
      initialValue: false,
      message: "Enable quiet hours? (lower priority during night)",
    });

    if (p.isCancel(enableQuietHours)) {
      p.cancel("Setup cancelled");
      process.exit(0);
    }

    let quietHoursStart = DEFAULT_NOTIFY_CONFIG.quietHours.startHour;
    let quietHoursEnd = DEFAULT_NOTIFY_CONFIG.quietHours.endHour;

    if (enableQuietHours) {
      const startHour = await p.text({
        defaultValue: String(DEFAULT_NOTIFY_CONFIG.quietHours.startHour),
        message: "Quiet hours start (0-23)",
        validate: (value: string): string | undefined => {
          const parsed = Number.parseInt(value, 10);
          if (Number.isNaN(parsed) || parsed < 0 || parsed > 23) {
            return "Must be a number between 0 and 23";
          }
          return undefined;
        },
      });

      if (p.isCancel(startHour)) {
        p.cancel("Setup cancelled");
        process.exit(0);
      }

      const endHour = await p.text({
        defaultValue: String(DEFAULT_NOTIFY_CONFIG.quietHours.endHour),
        message: "Quiet hours end (0-23)",
        validate: (value: string): string | undefined => {
          const parsed = Number.parseInt(value, 10);
          if (Number.isNaN(parsed) || parsed < 0 || parsed > 23) {
            return "Must be a number between 0 and 23";
          }
          return undefined;
        },
      });

      if (p.isCancel(endHour)) {
        p.cancel("Setup cancelled");
        process.exit(0);
      }

      quietHoursStart = Number.parseInt(startHour, 10);
      quietHoursEnd = Number.parseInt(endHour, 10);
    }

    // Build and save config
    const config: NotifyConfig = {
      $schemaVersion: 1,
      defaultPriority: DEFAULT_NOTIFY_CONFIG.defaultPriority,
      enabled: true,
      quietHours: {
        enabled: enableQuietHours,
        endHour: quietHoursEnd,
        startHour: quietHoursStart,
      },
      server: server || DEFAULT_NOTIFY_CONFIG.server,
      title: DEFAULT_NOTIFY_CONFIG.title,
      topic,
    };

    saveNotifyConfig(config);
    p.log.success("Configuration saved");

    // Send test notification
    const spinner = ora("Sending test notification...").start();

    try {
      await sendNotification({
        message: "Test notification from aaa notify init",
        priority: config.defaultPriority,
        server: config.server,
        title: config.title,
        topic: config.topic,
      });
      spinner.succeed("Test notification sent!");
    } catch (error) {
      spinner.fail("Test notification failed");
      if (error instanceof NtfyNetworkError) {
        p.log.error(`Network error: ${error.message}`);
      } else if (error instanceof NtfyRateLimitError) {
        p.log.error("Rate limited. Try again later.");
      } else {
        p.log.error(error instanceof Error ? error.message : "Unknown error");
      }
      p.log.warn(
        "Configuration was saved. You can test again with: aaa notify config test",
      );
    }

    // Show next steps
    p.note(
      `1. Install ntfy app on your phone (iOS/Android)
2. Subscribe to topic: ${topic}
3. Add hook to ~/.claude/settings.json:

{
  "hooks": {
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "aaa notify 'Task complete'"
      }]
    }]
  }
}`,
      "Next steps",
    );

    p.outro("Setup complete!");
  });

// aaa notify on - enable notifications
notifyCommand
  .command("on")
  .description("Enable notifications")
  .action(() => {
    const config = loadNotifyConfig();
    config.enabled = true;
    saveNotifyConfig(config);
    console.log(`${chalk.green("✓")} Notifications enabled`);
  });

// aaa notify off - disable notifications
notifyCommand
  .command("off")
  .description("Disable notifications")
  .action(() => {
    const config = loadNotifyConfig();
    config.enabled = false;
    saveNotifyConfig(config);
    console.log(`${chalk.green("✓")} Notifications disabled`);
  });

// aaa notify status - show current status
notifyCommand
  .command("status")
  .description("Show current notification status")
  .action(() => {
    const config = loadNotifyConfig();
    const isInQuietNow = isInQuietHours(config.quietHours);

    console.log(chalk.bold("Notification Status"));
    console.log();
    console.log(
      `  Enabled:       ${config.enabled ? chalk.green("yes") : chalk.red("no")}`,
    );
    console.log(
      `  Topic:         ${config.topic || chalk.yellow("(not configured)")}`,
    );
    console.log(`  Server:        ${config.server}`);
    console.log(`  Title:         ${config.title}`);
    console.log(`  Priority:      ${config.defaultPriority}`);
    console.log(`  Quiet hours:   ${formatQuietHours(config)}`);
    if (config.quietHours.enabled) {
      console.log(
        `  In quiet now:  ${isInQuietNow ? chalk.yellow("yes") : "no"}`,
      );
    }
    console.log();
    console.log(`  Config file:   ${getConfigPath()}`);
  });

// =============================================================================
// Config Subcommands
// =============================================================================

const configCommand = new Command("config").description(
  "Configuration management",
);

// aaa notify config set
configCommand
  .command("set")
  .description("Set configuration values")
  .option("--topic <topic>", "Set ntfy topic")
  .option("--server <url>", "Set ntfy server URL")
  .option("--title <title>", "Set default notification title")
  .addOption(
    new Option("--priority <level>", "Set default priority").choices(
      priorities,
    ),
  )
  .option("--quiet-start <hour>", "Set quiet hours start (0-23)", (v) =>
    Number.parseInt(v, 10),
  )
  .option("--quiet-end <hour>", "Set quiet hours end (0-23)", (v) =>
    Number.parseInt(v, 10),
  )
  .option(
    "--quiet-enabled <bool>",
    "Enable/disable quiet hours",
    (v) => v === "true" || v === "1",
  )
  .action((options) => {
    const config = loadNotifyConfig();
    let hasChanged = false;

    if (options.topic !== undefined) {
      config.topic = options.topic;
      hasChanged = true;
    }
    if (options.server !== undefined) {
      config.server = options.server;
      hasChanged = true;
    }
    if (options.title !== undefined) {
      config.title = options.title;
      hasChanged = true;
    }
    if (options.priority !== undefined) {
      config.defaultPriority = options.priority;
      hasChanged = true;
    }
    if (options.quietStart !== undefined) {
      config.quietHours.startHour = options.quietStart;
      hasChanged = true;
    }
    if (options.quietEnd !== undefined) {
      config.quietHours.endHour = options.quietEnd;
      hasChanged = true;
    }
    if (options.quietEnabled !== undefined) {
      config.quietHours.enabled = options.quietEnabled;
      hasChanged = true;
    }

    if (!hasChanged) {
      console.log("No options provided. Use --help for usage.");
      process.exit(1);
    }

    saveNotifyConfig(config);
    console.log(`${chalk.green("✓")} Configuration saved`);
  });

// aaa notify config show
configCommand
  .command("show")
  .description("Display current configuration")
  .option("--json", "Output as JSON")
  .action((options) => {
    const config = loadNotifyConfig();

    if (options.json === true) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    console.log(chalk.bold("Notification Configuration"));
    console.log();
    console.log(`  $schemaVersion:   ${config.$schemaVersion}`);
    console.log(
      `  enabled:          ${config.enabled ? chalk.green("true") : chalk.red("false")}`,
    );
    console.log(
      `  topic:            ${config.topic || chalk.yellow("(empty)")}`,
    );
    console.log(`  server:           ${config.server}`);
    console.log(`  title:            ${config.title}`);
    console.log(`  defaultPriority:  ${config.defaultPriority}`);
    console.log();
    console.log(chalk.bold("  Quiet Hours:"));
    console.log(
      `    enabled:        ${config.quietHours.enabled ? chalk.green("true") : "false"}`,
    );
    console.log(`    startHour:      ${config.quietHours.startHour}`);
    console.log(`    endHour:        ${config.quietHours.endHour}`);
    console.log();
    console.log(`  Config file:      ${getConfigPath()}`);
  });

// aaa notify config test
configCommand
  .command("test")
  .description("Send a test notification")
  .option("-m, --message <text>", "Custom test message")
  .action(async (options) => {
    const config = loadNotifyConfig();

    if (config.topic === "") {
      console.error(chalk.red("Error:"), "Topic not configured.");
      console.log("Run: aaa notify config set --topic <your-topic>");
      process.exit(1);
    }

    const message = options.message ?? "Test notification from aaa notify";

    console.log("Sending test notification...");

    try {
      const result = await sendNotification({
        message,
        priority: config.defaultPriority,
        server: config.server,
        title: config.title,
        topic: config.topic,
      });

      console.log(`${chalk.green("✓")} Test notification sent (${result.id})`);
      console.log();
      console.log("If you didn't receive it:");
      console.log("  1. Check your ntfy app is subscribed to:", config.topic);
      console.log("  2. Check the server URL:", config.server);
    } catch (error) {
      if (error instanceof NtfyRateLimitError) {
        console.error(chalk.red("Error:"), "Rate limited. Try again later.");
        process.exit(2);
      }
      if (error instanceof NtfyNetworkError) {
        console.error(chalk.red("Error:"), error.message);
        process.exit(2);
      }
      throw error;
    }
  });

notifyCommand.addCommand(configCommand);

// =============================================================================
// Exports
// =============================================================================

export { DEFAULT_NOTIFY_CONFIG } from "./config";
export default notifyCommand;

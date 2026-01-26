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

import { Command, Option } from "@commander-js/extra-typings";
import chalk from "chalk";

import type { NotifyConfig, Priority } from "./types";

import { sendNotification } from "./client";
import {
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
  cliOptions: {
    priority?: string;
    title?: string;
  },
): {
  priority: Priority;
  server: string;
  title: string;
  topic: string;
} {
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
  .action(async (message, options) => {
    // If no message and no subcommand, show help
    if (message === undefined) {
      notifyCommand.help();
      return;
    }

    const fileConfig = loadNotifyConfig();

    // Check if notifications should be sent
    const errorMessage = checkNotificationEnabled(fileConfig);
    if (errorMessage !== "") {
      // Silent exit when unconfigured (safe for hooks)
      process.exit(0);
    }

    const resolved = resolveConfig(fileConfig, options);

    try {
      const result = await sendNotification({
        message,
        priority: resolved.priority,
        server: resolved.server,
        tags: options.tags,
        title: resolved.title,
        topic: resolved.topic,
      });

      console.log(`${chalk.green("✓")} Notification sent (${result.id})`);
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
    new Option("--priority <level>", "Set default priority")
      .choices(priorities)
  )
  .option("--quiet-start <hour>", "Set quiet hours start (0-23)", (v) =>
    Number.parseInt(v, 10),
  )
  .option("--quiet-end <hour>", "Set quiet hours end (0-23)", (v) =>
    Number.parseInt(v, 10),
  )
  .option("--quiet-enabled <bool>", "Enable/disable quiet hours", (v) =>
    v === "true" || v === "1",
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

/**
 * Output formatters for extracted conversations
 */

import type { ExtractedConversation } from "./types";

import { formatTimestamp } from "./parser";

/**
 * Format conversations as JSON
 */
export function formatJson(
  conversations: Array<ExtractedConversation>,
): string {
  return JSON.stringify(
    {
      conversations,
      count: conversations.length,
      generated: new Date().toISOString(),
    },
    null,
    2,
  );
}

/**
 * Format conversations as Markdown
 */
export function formatMarkdown(
  conversations: Array<ExtractedConversation>,
): string {
  const lines: Array<string> = [];

  lines.push("# Conversation Extracts");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Conversations: ${conversations.length}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const conv of conversations) {
    lines.push(`## Session: ${conv.sessionId.slice(0, 8)}`);
    lines.push(`**Started:** ${formatTimestamp(conv.startTime)}`);
    if (conv.branch !== undefined && conv.branch !== "") {
      lines.push(`**Branch:** ${conv.branch}`);
    }
    lines.push(`**Summary:** ${conv.summary}`);
    lines.push("");

    for (const exchange of conv.exchanges) {
      // Truncate long messages for readability
      const userMessage =
        exchange.user.length > 500
          ? `${exchange.user.slice(0, 500)}...`
          : exchange.user;
      const assistantMessage =
        exchange.assistant.length > 1000
          ? `${exchange.assistant.slice(0, 1000)}...`
          : exchange.assistant;

      lines.push(`### User (${formatTimestamp(exchange.timestamp)})`);
      lines.push(userMessage);
      lines.push("");
      lines.push(`### Assistant (${formatTimestamp(exchange.timestamp)})`);
      lines.push(assistantMessage);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format output based on specified format
 */
export function formatOutput(
  conversations: Array<ExtractedConversation>,
  format: "json" | "markdown",
): string {
  if (format === "json") {
    return formatJson(conversations);
  }
  return formatMarkdown(conversations);
}

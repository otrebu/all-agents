/**
 * Effect-based ntfy notification client
 *
 * Provides:
 * - Effect-based notification sending with HttpClient service
 * - Automatic retry with exponential backoff
 * - Rate limit handling via Effect error types
 * - Type-safe error handling
 *
 * @module
 */

/* eslint-disable import/exports-last, perfectionist/sort-modules */

import { env } from "@tools/lib/config";
import {
  HttpClient,
  NotifyNetworkError,
  NotifyRateLimitError,
} from "@tools/lib/effect";
import { Effect } from "effect";

import type { Priority } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for sending a notification
 */
export interface SendNotificationOptions {
  /** Message body */
  message: string;
  /** Notification priority */
  priority?: Priority;
  /** ntfy server URL */
  server: string;
  /** Optional comma-separated tags/emojis */
  tags?: string;
  /** Notification title */
  title?: string;
  /** ntfy topic */
  topic: string;
  /** ntfy username for Basic Auth */
  username?: string;
}

/**
 * Result of sending a notification
 */
export interface SendNotificationResult {
  /** Event type from ntfy */
  event: string;
  /** Unique message ID */
  id: string;
  /** Whether notification was sent successfully */
  success: boolean;
  /** Time sent (unix timestamp) */
  time: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Map priority names to ntfy numeric values
 */
export const PRIORITY_MAP: Record<Priority, number> = {
  default: 3,
  high: 4,
  low: 2,
  max: 5,
  min: 1,
};

// =============================================================================
// Effect Functions
// =============================================================================

/**
 * Send a notification via ntfy using HttpClient service
 *
 * @param options - Notification options
 * @returns Effect that yields SendNotificationResult or fails with NotifyError
 */
export function sendNotificationEffect(
  options: SendNotificationOptions,
): Effect.Effect<
  SendNotificationResult,
  NotifyNetworkError | NotifyRateLimitError,
  HttpClient
> {
  return Effect.gen(function* sendNotification() {
    const http = yield* HttpClient;

    const {
      message,
      priority = "default",
      server,
      tags,
      title,
      topic,
      username,
    } = options;

    const url = `${server.replace(/\/$/, "")}/${topic}`;
    const headers = buildHeaders({ priority, tags, title, username });

    // Make the request using HttpClient
    const response = yield* http
      .post<{
        event?: string;
        id?: string;
        time?: number;
      }>(url, { body: message, headers, timeoutMs: 30_000 })
      .pipe(
        // Map HttpClient errors to NotifyError types
        Effect.catchTags({
          NetworkError: (error) =>
            Effect.fail(
              new NotifyNetworkError({
                cause: error.cause,
                message: error.message,
                url: error.url,
              }),
            ),
          RateLimitError: (error) =>
            Effect.fail(
              new NotifyRateLimitError({
                message: error.message,
                retryAfterMs: error.retryAfterMs,
                url: error.url,
              }),
            ),
          TimeoutError: (error) =>
            Effect.fail(
              new NotifyNetworkError({
                message: `Request timed out after ${error.timeoutMs}ms`,
                url: error.url,
              }),
            ),
        }),
      );

    // Check for non-OK response (4xx errors besides rate limiting)
    if (!response.ok) {
      return yield* Effect.fail(
        new NotifyNetworkError({
          message: `Failed to send notification: ${response.status} ${response.statusText} - ${response.text}`,
          url,
        }),
      );
    }

    // Parse successful response
    return {
      event: response.json.event ?? "message",
      id: response.json.id ?? "unknown",
      success: true,
      time: response.json.time ?? Math.floor(Date.now() / 1000),
    };
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

interface BuildHeadersOptions {
  priority: Priority;
  tags?: string;
  title?: string;
  username?: string;
}

/**
 * Build request headers from options
 */
function buildHeaders(options: BuildHeadersOptions): Record<string, string> {
  const { priority, tags, title, username } = options;
  const headers: Record<string, string> = {
    "Content-Type": "text/plain",
    Priority: String(PRIORITY_MAP[priority]),
  };

  if (title !== undefined && title.length > 0) {
    headers.Title = title;
  }

  if (tags !== undefined && tags.length > 0) {
    headers.Tags = tags;
  }

  // Add authentication if NTFY_PASSWORD is set (Basic Auth)
  if (env.NTFY_PASSWORD !== undefined && env.NTFY_PASSWORD.length > 0) {
    const user = username ?? "admin";
    const credentials = Buffer.from(`${user}:${env.NTFY_PASSWORD}`).toString(
      "base64",
    );
    headers.Authorization = `Basic ${credentials}`;
  }

  return headers;
}

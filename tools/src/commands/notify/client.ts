import { env } from "@tools/lib/config";

import { NtfyNetworkError, NtfyRateLimitError, type Priority } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a single fetch attempt
 */
type AttemptResult =
  | { delayMs: number; retry: true }
  | { error: Error; retry: false }
  | { result: SendNotificationResult; retry: false };

/**
 * Internal request context for retry handling
 */
interface RequestContext {
  headers: Record<string, string>;
  message: string;
  url: string;
}

/**
 * Options for sending a notification
 */
interface SendNotificationOptions {
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
interface SendNotificationResult {
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
const PRIORITY_MAP: Record<Priority, number> = {
  default: 3,
  high: 4,
  low: 2,
  max: 5,
  min: 1,
};

/**
 * HTTP status codes that should trigger a retry
 */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/**
 * Maximum number of retry attempts (excluding initial request)
 */
const MAX_RETRIES = 2;

/**
 * Base delay for exponential backoff (ms)
 */
const BASE_RETRY_DELAY_MS = 1000;

/**
 * Request timeout (ms)
 */
const REQUEST_TIMEOUT_MS = 30_000;

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

/**
 * Calculate retry delay with exponential backoff
 * @param attempt Retry attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateRetryDelay(attempt: number): number {
  return BASE_RETRY_DELAY_MS * 2 ** attempt;
}

/**
 * Handle non-retryable client errors
 */
async function handleClientError(response: Response): Promise<AttemptResult> {
  const errorBody = await response.text().catch(() => "Unknown error");

  return {
    error: new NtfyNetworkError(
      `Failed to send notification: ${response.status} ${response.statusText} - ${errorBody}`,
    ),
    retry: false,
  };
}

/**
 * Handle caught exceptions during fetch
 */
function handleFetchException(
  error: unknown,
  attempt: number,
  isLastAttempt: boolean,
): AttemptResult {
  // Re-throw our custom errors immediately
  if (
    error instanceof NtfyNetworkError ||
    error instanceof NtfyRateLimitError
  ) {
    return { error, retry: false };
  }

  // Handle abort (timeout)
  if (error instanceof Error && error.name === "AbortError") {
    const timeoutError = new NtfyNetworkError(
      `Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`,
    );
    if (isLastAttempt) {
      return { error: timeoutError, retry: false };
    }
    return { delayMs: calculateRetryDelay(attempt), retry: true };
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    const networkError = new NtfyNetworkError(
      "Network connection failed. Please check your internet connection.",
      error,
    );
    if (isLastAttempt) {
      return { error: networkError, retry: false };
    }
    return { delayMs: calculateRetryDelay(attempt), retry: true };
  }

  // Handle other unexpected errors
  const unexpectedError = new NtfyNetworkError(
    error instanceof Error ? error.message : "Unknown error occurred",
    error instanceof Error ? error : undefined,
  );
  if (isLastAttempt) {
    return { error: unexpectedError, retry: false };
  }
  return { delayMs: calculateRetryDelay(attempt), retry: true };
}

/**
 * Handle rate limit (429) response
 */
function handleRateLimitResponse(
  response: Response,
  attempt: number,
  isLastAttempt: boolean,
): AttemptResult {
  if (!isLastAttempt) {
    return { delayMs: parseRetryAfterDelay(response, attempt), retry: true };
  }

  const retryAfter = response.headers.get("Retry-After");
  const retryAfterSeconds =
    retryAfter === null ? undefined : Number.parseInt(retryAfter, 10);

  return {
    error: new NtfyRateLimitError(
      "Rate limit exceeded. Please wait before sending more notifications.",
      Number.isNaN(retryAfterSeconds) ? undefined : retryAfterSeconds,
    ),
    retry: false,
  };
}

/**
 * Handle retryable server errors (500, 502, 503, 504)
 */
function handleServerError(
  response: Response,
  attempt: number,
  isLastAttempt: boolean,
): AttemptResult {
  if (isLastAttempt) {
    return {
      error: new NtfyNetworkError(
        `Server error (${response.status}). Please try again later.`,
      ),
      retry: false,
    };
  }

  return { delayMs: calculateRetryDelay(attempt), retry: true };
}

/**
 * Handle a successful response
 */
async function handleSuccessResponse(
  response: Response,
): Promise<SendNotificationResult> {
  const result = (await response.json()) as {
    event?: string;
    id?: string;
    time?: number;
  };

  return {
    event: result.event ?? "message",
    id: result.id ?? "unknown",
    success: true,
    time: result.time ?? Math.floor(Date.now() / 1000),
  };
}

/**
 * Parse retry delay from 429 response headers
 */
function parseRetryAfterDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter === null) {
    return calculateRetryDelay(attempt);
  }

  const seconds = Number.parseInt(retryAfter, 10);
  if (Number.isNaN(seconds)) {
    return calculateRetryDelay(attempt);
  }

  return seconds * 1000;
}

/**
 * Perform a single fetch attempt
 */
async function performFetchAttempt(
  context: RequestContext,
  attempt: number,
  isLastAttempt: boolean,
): Promise<AttemptResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(context.url, {
      body: context.message,
      headers: context.headers,
      method: "POST",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle rate limiting
    if (response.status === 429) {
      return handleRateLimitResponse(response, attempt, isLastAttempt);
    }

    // Handle retryable server errors
    if (
      RETRYABLE_STATUS_CODES.has(response.status) &&
      response.status !== 429
    ) {
      return handleServerError(response, attempt, isLastAttempt);
    }

    // Handle non-retryable errors
    if (!response.ok) {
      return await handleClientError(response);
    }

    // Parse successful response
    return { result: await handleSuccessResponse(response), retry: false };
  } catch (error) {
    clearTimeout(timeoutId);
    return handleFetchException(error, attempt, isLastAttempt);
  }
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Send a notification via ntfy
 *
 * @param options - Notification options
 * @returns Result object with success status and message ID
 * @throws NtfyNetworkError on connection failure or timeout
 * @throws NtfyRateLimitError on HTTP 429
 */
async function sendNotification(
  options: SendNotificationOptions,
): Promise<SendNotificationResult> {
  const {
    message,
    priority = "default",
    server,
    tags,
    title,
    topic,
    username,
  } = options;

  const context: RequestContext = {
    headers: buildHeaders({ priority, tags, title, username }),
    message,
    url: `${server.replace(/\/$/, "")}/${topic}`,
  };

  let lastError: Error = new NtfyNetworkError("Failed to send notification");

  // Disable no-await-in-loop: retry logic requires sequential attempts with delays
  /* eslint-disable no-await-in-loop */
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const isLastAttempt = attempt === MAX_RETRIES;
    const attemptResult = await performFetchAttempt(
      context,
      attempt,
      isLastAttempt,
    );

    if (!attemptResult.retry) {
      if ("result" in attemptResult) {
        return attemptResult.result;
      }
      throw attemptResult.error;
    }

    lastError = new NtfyNetworkError("Request failed, retrying...");
    await sleep(attemptResult.delayMs);
  }
  /* eslint-enable no-await-in-loop */

  throw lastError;
}

/**
 * Sleep for a given number of milliseconds
 */
async function sleep(ms: number): Promise<void> {
  // Disable promise/avoid-new: setTimeout requires manual promise wrapping
  // eslint-disable-next-line promise/avoid-new
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

// =============================================================================
// Exports
// =============================================================================

export {
  PRIORITY_MAP,
  sendNotification,
  type SendNotificationOptions,
  type SendNotificationResult,
};

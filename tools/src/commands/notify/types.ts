import { z } from "zod";

// =============================================================================
// Priority Type
// =============================================================================

/**
 * Notification priority levels
 * Maps to ntfy numeric values: min=1, low=2, default=3, high=4, max=5
 */
const priorities = ["min", "low", "default", "high", "max"] as const;
type Priority = (typeof priorities)[number];

/**
 * Zod schema for priority validation
 */
const prioritySchema = z.enum(priorities);

// =============================================================================
// Quiet Hours Configuration
// =============================================================================

/**
 * Quiet hours configuration
 * During quiet hours, notifications are sent with low priority (no sound)
 */
interface QuietHoursConfig {
  /** Whether quiet hours are enabled */
  enabled: boolean;
  /** Hour to end quiet hours (0-23) */
  endHour: number;
  /** Hour to start quiet hours (0-23) */
  startHour: number;
}

/**
 * Zod schema for quiet hours validation
 */
const quietHoursSchema = z.object({
  enabled: z.boolean(),
  endHour: z.number().int().min(0).max(23),
  startHour: z.number().int().min(0).max(23),
});

// =============================================================================
// Notify Configuration
// =============================================================================

/**
 * Main configuration for the notify command
 * Stored at ~/.config/aaa/notify.json
 */
interface NotifyConfig {
  /** Schema version for migrations */
  $schemaVersion: number;
  /** Default priority when not in quiet hours */
  defaultPriority: Priority;
  /** Whether notifications are enabled globally */
  enabled: boolean;
  /** Quiet hours configuration */
  quietHours: QuietHoursConfig;
  /** ntfy server URL */
  server: string;
  /** Default notification title */
  title: string;
  /** ntfy topic (keep secret - it's your "password") */
  topic: string;
}

/**
 * Zod schema for full config validation
 */
const notifyConfigSchema = z.object({
  $schemaVersion: z.number().int().positive(),
  defaultPriority: prioritySchema,
  enabled: z.boolean(),
  quietHours: quietHoursSchema,
  server: z.string().url(),
  title: z.string().min(1),
  topic: z.string(),
});

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Base error class for ntfy-related errors
 */
class NtfyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NtfyError";
    Error.captureStackTrace(this, NtfyError);
  }
}

/**
 * Network error - connection issues or HTTP errors
 */
class NtfyNetworkError extends Error {
  constructor(
    message: string,
    public override cause?: Error,
  ) {
    super(message);
    this.name = "NtfyNetworkError";
    Error.captureStackTrace(this, NtfyNetworkError);
  }
}

/**
 * Rate limit error - too many requests (HTTP 429)
 */
class NtfyRateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "NtfyRateLimitError";
    Error.captureStackTrace(this, NtfyRateLimitError);
  }
}

/**
 * Validation error - invalid input parameters or config
 */
class NtfyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NtfyValidationError";
    Error.captureStackTrace(this, NtfyValidationError);
  }
}

// =============================================================================
// Exports
// =============================================================================

export {
  type NotifyConfig,
  notifyConfigSchema,
  NtfyError,
  NtfyNetworkError,
  NtfyRateLimitError,
  NtfyValidationError,
  priorities,
  type Priority,
  prioritySchema,
  type QuietHoursConfig,
  quietHoursSchema,
};

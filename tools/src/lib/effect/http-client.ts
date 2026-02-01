/**
 * HttpClientService - Effect Layer wrapping fetch operations
 *
 * Provides:
 * - Effect-based HTTP operations with proper error types
 * - Automatic retry with exponential backoff for transient failures
 * - Rate limit handling (HTTP 429) with RateLimitError
 * - Configurable timeout support
 *
 * @module
 */

/* eslint-disable import/exports-last */

import { Context, Duration, Effect, Layer, Schedule } from "effect";

import { NetworkError, RateLimitError, TimeoutError } from "./errors";

// =============================================================================
// Types
// =============================================================================

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  /** Request body (string or object to be JSON-serialized) */
  body?: Record<string, unknown> | string;
  /** Request headers */
  headers?: Record<string, string>;
  /** HTTP method (GET, POST, etc.) */
  method?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * HTTP response with parsed data
 */
export interface HttpResponse<T = unknown> {
  /** Response headers */
  headers: Headers;
  /** Response body parsed as JSON or text */
  json: T;
  /** Whether the response was successful (2xx status) */
  ok: boolean;
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Response body as text */
  text: string;
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelayMs?: number;
  /** Add random jitter to retry delays (default: true) */
  jitter?: boolean;
  /** Maximum number of retries (default: 2) */
  maxRetries?: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Default request timeout (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Default base delay for retry backoff */
const DEFAULT_BASE_DELAY_MS = 1000;

/** Default max retries */
const DEFAULT_MAX_RETRIES = 2;

/** HTTP status codes that should trigger a retry */
const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504]);

// =============================================================================
// Service Interface
// =============================================================================

/**
 * HttpClientService interface
 * Provides Effect-based HTTP operations with retry, timeout, and error handling
 */
export interface HttpClientService {
  /**
   * Perform a DELETE request
   */
  readonly delete: <T = unknown>(
    url: string,
    options?: HttpRequestOptions,
  ) => Effect.Effect<
    HttpResponse<T>,
    NetworkError | RateLimitError | TimeoutError
  >;

  /**
   * Perform a GET request
   */
  readonly get: <T = unknown>(
    url: string,
    options?: HttpRequestOptions,
  ) => Effect.Effect<
    HttpResponse<T>,
    NetworkError | RateLimitError | TimeoutError
  >;

  /**
   * Perform a PATCH request
   */
  readonly patch: <T = unknown>(
    url: string,
    options?: HttpRequestOptions,
  ) => Effect.Effect<
    HttpResponse<T>,
    NetworkError | RateLimitError | TimeoutError
  >;

  /**
   * Perform a POST request
   */
  readonly post: <T = unknown>(
    url: string,
    options?: HttpRequestOptions,
  ) => Effect.Effect<
    HttpResponse<T>,
    NetworkError | RateLimitError | TimeoutError
  >;

  /**
   * Perform a PUT request
   */
  readonly put: <T = unknown>(
    url: string,
    options?: HttpRequestOptions,
  ) => Effect.Effect<
    HttpResponse<T>,
    NetworkError | RateLimitError | TimeoutError
  >;

  /**
   * Perform a request with full control over method and options
   * Includes automatic retry with exponential backoff for transient errors
   */
  readonly request: <T = unknown>(
    url: string,
    options?: { retry?: RetryOptions } & HttpRequestOptions,
  ) => Effect.Effect<
    HttpResponse<T>,
    NetworkError | RateLimitError | TimeoutError
  >;
}

// =============================================================================
// Service Tag
// =============================================================================

/**
 * Internal response type with original Response for error handling
 */
interface InternalResponse<T> {
  headers: Headers;
  json: T;
  ok: boolean;
  originalResponse: Response;
  status: number;
  statusText: string;
  text: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Effect Context tag for HttpClientService
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const http = yield* HttpClient;
 *   const response = yield* http.get<{ data: string }>("https://api.example.com/data");
 *   return response.json.data;
 * });
 * ```
 */
export class HttpClient extends Context.Tag("HttpClient")<
  HttpClient,
  HttpClientService
>() {}

/**
 * Check if an error is retryable
 */
function isRetryableError(
  error: NetworkError | RateLimitError | TimeoutError,
): boolean {
  // Don't retry rate limits - caller should handle these
  if (error._tag === "RateLimitError") {
    return false;
  }

  // Retry network errors and timeouts - after filtering RateLimitError, only these remain
  return true;
}

/**
 * Check if an HTTP status code is retryable
 */
function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

/**
 * Create the core fetch Effect with timeout handling
 */
function makeFetchEffect<T>(
  url: string,
  options: { method: string } & HttpRequestOptions,
  timeoutMs: number,
): Effect.Effect<
  HttpResponse<T>,
  NetworkError | RateLimitError | TimeoutError
> {
  // Build request init
  const init: RequestInit = {
    headers: options.headers,
    method: options.method,
  };

  // Handle body
  if (options.body !== undefined) {
    if (typeof options.body === "string") {
      init.body = options.body;
    } else {
      init.body = JSON.stringify(options.body);
      // Set Content-Type if not already set
      const contentType = options.headers?.["Content-Type"];
      if (contentType === undefined || contentType === "") {
        init.headers = {
          ...options.headers,
          "Content-Type": "application/json",
        };
      }
    }
  }

  // Create the fetch effect
  const fetchEffect: Effect.Effect<
    InternalResponse<T>,
    NetworkError
  > = Effect.tryPromise({
    catch: (error) =>
      new NetworkError({
        cause: error,
        message:
          error instanceof Error ? error.message : "Network request failed",
        url,
      }),
    try: async () => {
      const response = await fetch(url, init);
      const text = await response.text();

      // Try to parse as JSON, fall back to empty object
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const json: T = tryParseJson<T>(text) ?? ({} as T);

      return {
        headers: response.headers,
        json,
        ok: response.ok,
        originalResponse: response,
        status: response.status,
        statusText: response.statusText,
        text,
      };
    },
  });

  // Apply timeout using timeoutFail to convert to our TimeoutError
  const withTimeout = fetchEffect.pipe(
    Effect.timeoutFail({
      duration: Duration.millis(timeoutMs),
      onTimeout: () =>
        new TimeoutError({
          message: `Request timed out after ${timeoutMs}ms`,
          timeoutMs,
          url,
        }),
    }),
  );

  // Handle HTTP errors and convert to final response type
  return withTimeout.pipe(
    Effect.flatMap((result): Effect.Effect<HttpResponse<T>, RateLimitError> => {
      // Handle rate limiting
      if (result.status === 429) {
        return Effect.fail(
          new RateLimitError({
            message: "Rate limit exceeded",
            retryAfterMs: parseRetryAfterMs(result.originalResponse),
            url,
          }),
        );
      }

      // Extract HttpResponse (without originalResponse)
      const { originalResponse: _, ...response } = result;
      return Effect.succeed(response);
    }),
  );
}

/**
 * Create the HttpClientService implementation
 */
function makeHttpClientService(): HttpClientService {
  // Arrow function needed for generic type parameter preservation
  // eslint-disable-next-line func-style
  const request = <T = unknown>(
    url: string,
    options: {
      method?: string;
      retry?: RetryOptions;
    } & HttpRequestOptions = {},
  ): Effect.Effect<
    HttpResponse<T>,
    NetworkError | RateLimitError | TimeoutError
  > => {
    const method = options.method ?? "GET";
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retryOptions = options.retry ?? {};
    const retrySchedule = makeRetrySchedule(retryOptions);

    // Create base fetch effect
    const baseFetch = makeFetchEffect<T>(
      url,
      { ...options, method },
      timeoutMs,
    );

    // Add retry logic for transient errors
    return baseFetch.pipe(
      // Handle retryable HTTP status codes by converting to NetworkError for retry
      Effect.flatMap((response) => {
        if (!response.ok && isRetryableStatus(response.status)) {
          return Effect.fail(
            new NetworkError({
              message: `Server error: ${response.status} ${response.statusText}`,
              url,
            }),
          );
        }
        return Effect.succeed(response);
      }),
      // Retry on transient errors
      Effect.retry({ schedule: retrySchedule, while: isRetryableError }),
    );
  };

  return {
    delete: <T = unknown>(url: string, options?: HttpRequestOptions) =>
      request<T>(url, { ...options, method: "DELETE" }),

    get: <T = unknown>(url: string, options?: HttpRequestOptions) =>
      request<T>(url, { ...options, method: "GET" }),

    patch: <T = unknown>(url: string, options?: HttpRequestOptions) =>
      request<T>(url, { ...options, method: "PATCH" }),

    post: <T = unknown>(url: string, options?: HttpRequestOptions) =>
      request<T>(url, { ...options, method: "POST" }),

    put: <T = unknown>(url: string, options?: HttpRequestOptions) =>
      request<T>(url, { ...options, method: "PUT" }),

    request,
  };
}

/**
 * Create a retry schedule with exponential backoff
 */
function makeRetrySchedule(options: RetryOptions): Schedule.Schedule<unknown> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const shouldJitter = options.jitter ?? true;

  // Exponential backoff: baseDelay * 2^attempt
  let schedule = Schedule.exponential(Duration.millis(baseDelayMs), 2);

  // Add jitter if enabled (random factor between 0.5 and 1.5)
  if (shouldJitter) {
    schedule = Schedule.jittered(schedule);
  }

  // Limit to max retries using whileOutput on recurs count
  return Schedule.compose(schedule, Schedule.recurs(maxRetries));
}

/**
 * Parse Retry-After header to milliseconds
 */
function parseRetryAfterMs(response: Response): number | undefined {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter === null) {
    return undefined;
  }

  const seconds = Number.parseInt(retryAfter, 10);
  if (Number.isNaN(seconds)) {
    return undefined;
  }

  return seconds * 1000;
}

// =============================================================================
// Live Implementation
// =============================================================================

/**
 * Attempt to parse JSON, returning undefined on failure
 */
function tryParseJson<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

/**
 * Live HttpClientService Layer
 * Provides HTTP operations using native fetch with Effect error handling
 */
export const HttpClientLive = Layer.succeed(
  HttpClient,
  makeHttpClientService(),
);

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock HttpClientService for testing
 *
 * @example
 * ```typescript
 * const mockHttp = makeTestHttpClient({
 *   get: (url) =>
 *     url.includes("/users")
 *       ? Effect.succeed({ ok: true, status: 200, json: { name: "Test" }, ... })
 *       : Effect.fail(new NetworkError({ message: "Not found", url })),
 * });
 *
 * const result = await Effect.runPromise(
 *   program.pipe(Effect.provide(mockHttp))
 * );
 * ```
 */
export function makeTestHttpClient(
  overrides: Partial<HttpClientService> = {},
): Layer.Layer<HttpClient> {
  // Higher-order function for generating mock methods
  // eslint-disable-next-line func-style
  const notImplemented = (method: string) => (url: string) =>
    Effect.fail(
      new NetworkError({
        message: `Mock HTTP client: ${method} not implemented`,
        url,
      }),
    );

  const defaults: HttpClientService = {
    delete: notImplemented("DELETE"),
    get: notImplemented("GET"),
    patch: notImplemented("PATCH"),
    post: notImplemented("POST"),
    put: notImplemented("PUT"),
    request: notImplemented("request"),
  };

  return Layer.succeed(HttpClient, { ...defaults, ...overrides });
}

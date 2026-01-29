/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/await-thenable, @typescript-eslint/no-confusing-void-expression */
import {
  PRIORITY_MAP,
  sendNotification,
  type SendNotificationOptions,
} from "@tools/commands/notify/client";
import {
  NtfyNetworkError,
  NtfyRateLimitError,
} from "@tools/commands/notify/types";
import { afterEach, describe, expect, mock, test } from "bun:test";

// Store original fetch to restore after tests
const originalFetch = globalThis.fetch;

describe("notify client", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("PRIORITY_MAP", () => {
    test("maps priority names to correct numeric values", () => {
      expect(PRIORITY_MAP.min).toBe(1);
      expect(PRIORITY_MAP.low).toBe(2);
      expect(PRIORITY_MAP.default).toBe(3);
      expect(PRIORITY_MAP.high).toBe(4);
      expect(PRIORITY_MAP.max).toBe(5);
    });

    test("has all five priority levels", () => {
      expect(Object.keys(PRIORITY_MAP)).toHaveLength(5);
    });
  });

  describe("sendNotification", () => {
    const baseOptions: SendNotificationOptions = {
      message: "Test notification",
      server: "https://ntfy.sh",
      topic: "test-topic",
    };

    test("sends notification successfully", async () => {
      globalThis.fetch = mock(
        async () =>
          new Response(
            JSON.stringify({
              event: "message",
              id: "abc123",
              time: 1_700_000_000,
            }),
            { status: 200 },
          ),
      ) as unknown as typeof fetch;

      const result = await sendNotification(baseOptions);

      expect(result.success).toBe(true);
      expect(result.id).toBe("abc123");
      expect(result.event).toBe("message");
      expect(result.time).toBe(1_700_000_000);
    });

    test("builds correct URL from server and topic", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (url: string) => {
        capturedUrl = url;
        return new Response(JSON.stringify({ id: "test" }), { status: 200 });
      }) as unknown as typeof fetch;

      await sendNotification(baseOptions);
      expect(capturedUrl).toBe("https://ntfy.sh/test-topic");
    });

    test("strips trailing slash from server URL", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (url: string) => {
        capturedUrl = url;
        return new Response(JSON.stringify({ id: "test" }), { status: 200 });
      }) as unknown as typeof fetch;

      await sendNotification({ ...baseOptions, server: "https://ntfy.sh/" });
      expect(capturedUrl).toBe("https://ntfy.sh/test-topic");
    });

    test("sends message in request body", async () => {
      let capturedBody = "";
      globalThis.fetch = mock(async (_url: string, options: RequestInit) => {
        capturedBody = options.body as string;
        return new Response(JSON.stringify({ id: "test" }), { status: 200 });
      }) as unknown as typeof fetch;

      await sendNotification({ ...baseOptions, message: "Hello world!" });
      expect(capturedBody).toBe("Hello world!");
    });

    test("sets correct priority header", async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = mock(async (_url: string, options: RequestInit) => {
        capturedHeaders = options.headers as Record<string, string>;
        return new Response(JSON.stringify({ id: "test" }), { status: 200 });
      }) as unknown as typeof fetch;

      await sendNotification({ ...baseOptions, priority: "high" });
      expect(capturedHeaders.Priority).toBe("4");
    });

    test("sets default priority when not specified", async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = mock(async (_url: string, options: RequestInit) => {
        capturedHeaders = options.headers as Record<string, string>;
        return new Response(JSON.stringify({ id: "test" }), { status: 200 });
      }) as unknown as typeof fetch;

      await sendNotification(baseOptions);
      expect(capturedHeaders.Priority).toBe("3");
    });

    test("sets Title header when provided", async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = mock(async (_url: string, options: RequestInit) => {
        capturedHeaders = options.headers as Record<string, string>;
        return new Response(JSON.stringify({ id: "test" }), { status: 200 });
      }) as unknown as typeof fetch;

      await sendNotification({ ...baseOptions, title: "Test Title" });
      expect(capturedHeaders.Title).toBe("Test Title");
    });

    test("does not set Title header when not provided", async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = mock(async (_url: string, options: RequestInit) => {
        capturedHeaders = options.headers as Record<string, string>;
        return new Response(JSON.stringify({ id: "test" }), { status: 200 });
      }) as unknown as typeof fetch;

      await sendNotification(baseOptions);
      expect(capturedHeaders.Title).toBeUndefined();
    });

    test("sets Tags header when provided", async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = mock(async (_url: string, options: RequestInit) => {
        capturedHeaders = options.headers as Record<string, string>;
        return new Response(JSON.stringify({ id: "test" }), { status: 200 });
      }) as unknown as typeof fetch;

      await sendNotification({ ...baseOptions, tags: "warning,skull" });
      expect(capturedHeaders.Tags).toBe("warning,skull");
    });

    test("throws NtfyRateLimitError on 429", async () => {
      // Use very short Retry-After to avoid long test duration due to retry delays
      globalThis.fetch = mock(
        async () =>
          new Response("Too many requests", {
            headers: { "Retry-After": "0" },
            status: 429,
          }),
      ) as unknown as typeof fetch;

      await expect(sendNotification(baseOptions)).rejects.toBeInstanceOf(
        NtfyRateLimitError,
      );
    });

    test("includes retryAfter in NtfyRateLimitError when header present", async () => {
      // Note: The retryAfter in the thrown error is the header value (in seconds),
      // but retry delays use this value * 1000 (ms). Use 0 to avoid slow tests.
      let callCount = 0;
      globalThis.fetch = mock(async () => {
        callCount += 1;
        // Return 429 with Retry-After: 0 for first two calls (retries),
        // then 429 with Retry-After: 120 on final call to test the header capture
        if (callCount < 3) {
          return new Response("Too many requests", {
            headers: { "Retry-After": "0" },
            status: 429,
          });
        }
        return new Response("Too many requests", {
          headers: { "Retry-After": "120" },
          status: 429,
        });
      }) as unknown as typeof fetch;

      try {
        await sendNotification(baseOptions);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(NtfyRateLimitError);
        expect((error as NtfyRateLimitError).retryAfter).toBe(120);
      }
    });

    test("throws NtfyNetworkError on non-retryable error", async () => {
      globalThis.fetch = mock(
        async () => new Response("Bad request", { status: 400 }),
      ) as unknown as typeof fetch;

      await expect(sendNotification(baseOptions)).rejects.toBeInstanceOf(
        NtfyNetworkError,
      );
    });

    test("throws NtfyNetworkError on connection failure", async () => {
      globalThis.fetch = mock(async () => {
        throw new TypeError("fetch failed");
      }) as unknown as typeof fetch;

      await expect(sendNotification(baseOptions)).rejects.toBeInstanceOf(
        NtfyNetworkError,
      );
    });

    test("retries on 500 error", async () => {
      let callCount = 0;
      globalThis.fetch = mock(async () => {
        callCount += 1;
        if (callCount < 2) {
          return new Response("Server error", { status: 500 });
        }
        return new Response(JSON.stringify({ id: "success" }), { status: 200 });
      }) as unknown as typeof fetch;

      const result = await sendNotification(baseOptions);
      expect(result.success).toBe(true);
      expect(callCount).toBe(2);
    });

    test("retries on 502 error", async () => {
      let callCount = 0;
      globalThis.fetch = mock(async () => {
        callCount += 1;
        if (callCount < 2) {
          return new Response("Bad gateway", { status: 502 });
        }
        return new Response(JSON.stringify({ id: "success" }), { status: 200 });
      }) as unknown as typeof fetch;

      const result = await sendNotification(baseOptions);
      expect(result.success).toBe(true);
      expect(callCount).toBe(2);
    });

    test("retries on 503 error", async () => {
      let callCount = 0;
      globalThis.fetch = mock(async () => {
        callCount += 1;
        if (callCount < 2) {
          return new Response("Unavailable", { status: 503 });
        }
        return new Response(JSON.stringify({ id: "success" }), { status: 200 });
      }) as unknown as typeof fetch;

      const result = await sendNotification(baseOptions);
      expect(result.success).toBe(true);
      expect(callCount).toBe(2);
    });

    test("retries on 504 error", async () => {
      let callCount = 0;
      globalThis.fetch = mock(async () => {
        callCount += 1;
        if (callCount < 2) {
          return new Response("Timeout", { status: 504 });
        }
        return new Response(JSON.stringify({ id: "success" }), { status: 200 });
      }) as unknown as typeof fetch;

      const result = await sendNotification(baseOptions);
      expect(result.success).toBe(true);
      expect(callCount).toBe(2);
    });

    test("gives up after max retries on persistent 500 error", async () => {
      let callCount = 0;
      globalThis.fetch = mock(async () => {
        callCount += 1;
        return new Response("Server error", { status: 500 });
      }) as unknown as typeof fetch;

      await expect(sendNotification(baseOptions)).rejects.toBeInstanceOf(
        NtfyNetworkError,
      );
      expect(callCount).toBe(3);
    });

    test("handles missing response fields gracefully", async () => {
      globalThis.fetch = mock(
        async () => new Response(JSON.stringify({}), { status: 200 }),
      ) as unknown as typeof fetch;

      const result = await sendNotification(baseOptions);
      expect(result.success).toBe(true);
      expect(result.id).toBe("unknown");
      expect(result.event).toBe("message");
      expect(typeof result.time).toBe("number");
    });
  });
});

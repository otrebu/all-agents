import { envSchema } from "@tools/lib/config/env";
import { describe, expect, test } from "bun:test";

describe("envSchema", () => {
  test("accepts empty environment (all fields optional)", () => {
    expect(envSchema.parse({})).toEqual({});
  });

  test("accepts NTFY_PASSWORD", () => {
    const result = envSchema.parse({ NTFY_PASSWORD: "secret123" });
    expect(result.NTFY_PASSWORD).toBe("secret123");
  });

  test("accepts NTFY_TOPIC", () => {
    const result = envSchema.parse({ NTFY_TOPIC: "my-topic" });
    expect(result.NTFY_TOPIC).toBe("my-topic");
  });

  test("accepts NTFY_SERVER with valid URL", () => {
    const result = envSchema.parse({ NTFY_SERVER: "https://custom.ntfy.sh" });
    expect(result.NTFY_SERVER).toBe("https://custom.ntfy.sh");
  });

  test("rejects NTFY_SERVER with invalid URL", () => {
    expect(() => envSchema.parse({ NTFY_SERVER: "not-a-url" })).toThrow();
  });

  test("accepts all env vars together", () => {
    const result = envSchema.parse({
      NTFY_PASSWORD: "secret",
      NTFY_SERVER: "https://ntfy.example.com",
      NTFY_TOPIC: "my-project",
    });
    expect(result.NTFY_PASSWORD).toBe("secret");
    expect(result.NTFY_SERVER).toBe("https://ntfy.example.com");
    expect(result.NTFY_TOPIC).toBe("my-project");
  });

  test("ignores unknown env vars", () => {
    const result = envSchema.parse({
      NTFY_PASSWORD: "secret",
      OTHER_VAR: "ignored",
    });
    expect(result.NTFY_PASSWORD).toBe("secret");
    expect((result as Record<string, unknown>).OTHER_VAR).toBeUndefined();
  });

  test("handles undefined values gracefully", () => {
    const result = envSchema.parse({
      NTFY_PASSWORD: undefined,
      NTFY_SERVER: undefined,
      NTFY_TOPIC: undefined,
    });
    expect(result.NTFY_PASSWORD).toBeUndefined();
    expect(result.NTFY_SERVER).toBeUndefined();
    expect(result.NTFY_TOPIC).toBeUndefined();
  });
});

describe("env parsing behavior", () => {
  test("safeParse returns success for valid input", () => {
    const result = envSchema.safeParse({ NTFY_TOPIC: "test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NTFY_TOPIC).toBe("test");
    }
  });

  test("safeParse returns error for invalid input", () => {
    const result = envSchema.safeParse({ NTFY_SERVER: "invalid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.NTFY_SERVER).toBeDefined();
    }
  });
});

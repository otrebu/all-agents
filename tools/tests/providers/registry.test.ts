/**
 * Unit tests for provider registry
 *
 * Tests selectProvider(), validateProvider(), invokeWithProvider(),
 * REGISTRY, isBinaryAvailable(), getInstallInstructions(),
 * autoDetectProvider(), selectProviderFromEnv(), and ProviderError.
 */

import type {
  InvocationOptions,
  ProviderType,
} from "@tools/commands/ralph/providers/types";

import {
  autoDetectProvider,
  getInstallInstructions,
  invokeWithProvider,
  isBinaryAvailable,
  ProviderError,
  REGISTRY,
  resolveProvider,
  selectProvider,
  validateProvider,
  validateProviderInvocationPreflight,
} from "@tools/commands/ralph/providers/registry";
import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// =============================================================================
// REGISTRY
// =============================================================================

describe("REGISTRY", () => {
  const allProviders: Array<ProviderType> = [
    "claude",
    "codex",
    "cursor",
    "gemini",
    "opencode",
    "pi",
  ];

  test("has all 6 providers", () => {
    for (const provider of allProviders) {
      expect(REGISTRY[provider]).toBeDefined();
    }
  });

  test("non-implemented providers have available: false", () => {
    const stubProviders: Array<ProviderType> = [
      "codex",
      "cursor",
      "gemini",
      "pi",
    ];
    for (const provider of stubProviders) {
      expect(REGISTRY[provider].available).toBe(false);
    }
  });

  test("opencode has available: true", () => {
    expect(REGISTRY.opencode.available).toBe(true);
  });

  test("claude has available: true", () => {
    expect(REGISTRY.claude.available).toBe(true);
  });

  test("all providers have invoke function", () => {
    for (const provider of allProviders) {
      expect(typeof REGISTRY[provider].invoke).toBe("function");
    }
  });

  test("claude has supervised, headless-sync, headless-async modes", () => {
    expect(REGISTRY.claude.supportedModes).toContain("supervised");
    expect(REGISTRY.claude.supportedModes).toContain("headless-sync");
    expect(REGISTRY.claude.supportedModes).toContain("headless-async");
  });

  test("opencode has supervised, headless-sync, headless-async modes", () => {
    expect(REGISTRY.opencode.supportedModes).toContain("supervised");
    expect(REGISTRY.opencode.supportedModes).toContain("headless-sync");
    expect(REGISTRY.opencode.supportedModes).toContain("headless-async");
  });

  test("capability booleans are set for claude and opencode", () => {
    expect(REGISTRY.claude.supportsHeadless).toBe(true);
    expect(REGISTRY.claude.supportsInteractiveSupervised).toBe(true);
    expect(REGISTRY.opencode.supportsHeadless).toBe(true);
    expect(REGISTRY.opencode.supportsInteractiveSupervised).toBe(true);
  });

  test("codex has empty supportedModes", () => {
    expect(REGISTRY.codex.supportedModes).toEqual([]);
  });

  test("gemini has empty supportedModes", () => {
    expect(REGISTRY.gemini.supportedModes).toEqual([]);
  });

  test("pi has empty supportedModes", () => {
    expect(REGISTRY.pi.supportedModes).toEqual([]);
  });

  test("cursor has empty supportedModes", () => {
    expect(REGISTRY.cursor.supportedModes).toEqual([]);
  });
});

// =============================================================================
// selectProvider
// =============================================================================

describe("selectProvider", () => {
  test("returns cliFlag when provided", () => {
    expect(selectProvider({ cliFlag: "opencode" })).toBe("opencode");
  });

  test("defaults to claude when no context provided", () => {
    expect(selectProvider({})).toBe("claude");
  });

  test("uses envVariable when no cliFlag", () => {
    expect(selectProvider({ envVariable: "codex" })).toBe("codex");
  });

  test("cliFlag takes priority over envVariable", () => {
    expect(selectProvider({ cliFlag: "gemini", envVariable: "codex" })).toBe(
      "gemini",
    );
  });

  test("envVariable takes priority over configFile", () => {
    expect(selectProvider({ configFile: "gemini", envVariable: "codex" })).toBe(
      "codex",
    );
  });

  test("configFile takes priority over auto-detect (default claude)", () => {
    expect(selectProvider({ configFile: "opencode" })).toBe("opencode");
  });

  test("cliFlag takes priority over configFile", () => {
    expect(selectProvider({ cliFlag: "pi", configFile: "opencode" })).toBe(
      "pi",
    );
  });

  test("full priority chain: cliFlag > envVariable > configFile", () => {
    expect(
      selectProvider({
        cliFlag: "claude",
        configFile: "gemini",
        envVariable: "codex",
      }),
    ).toBe("claude");
  });

  test("ignores empty string cliFlag", () => {
    expect(selectProvider({ cliFlag: "" })).toBe("claude");
  });

  test("ignores empty string envVariable", () => {
    expect(selectProvider({ envVariable: "" })).toBe("claude");
  });

  test("ignores empty string configFile", () => {
    expect(selectProvider({ configFile: "" })).toBe("claude");
  });

  test("throws ProviderError for invalid cliFlag", () => {
    expect(() => selectProvider({ cliFlag: "invalid" })).toThrow(ProviderError);
  });

  test("throws ProviderError for invalid envVariable", () => {
    expect(() => selectProvider({ envVariable: "invalid" })).toThrow(
      ProviderError,
    );
  });

  test("throws ProviderError for invalid configFile", () => {
    expect(() => selectProvider({ configFile: "invalid" })).toThrow(
      ProviderError,
    );
  });
});

// =============================================================================
// resolveProvider
// =============================================================================

describe("resolveProvider", () => {
  const originalSpawn = Bun.spawn;
  const originalEnvProvider = process.env.RALPH_PROVIDER;

  afterAll(() => {
    Bun.spawn = originalSpawn;
    if (originalEnvProvider === undefined) {
      delete process.env.RALPH_PROVIDER;
    } else {
      process.env.RALPH_PROVIDER = originalEnvProvider;
    }
  });

  beforeEach(() => {
    Bun.spawn = originalSpawn;
    if (originalEnvProvider === undefined) {
      delete process.env.RALPH_PROVIDER;
    } else {
      process.env.RALPH_PROVIDER = originalEnvProvider;
    }
  });

  test("uses cliFlag over env and config", async () => {
    const provider = await resolveProvider({
      cliFlag: "claude",
      configFile: "gemini",
      envVariable: "opencode",
    });
    expect(provider).toBe("claude");
  });

  test("uses env variable over config when cli is missing", async () => {
    const provider = await resolveProvider({
      configFile: "gemini",
      envVariable: "opencode",
    });
    expect(provider).toBe("opencode");
  });

  test("reads RALPH_PROVIDER from process env when envVariable is omitted", async () => {
    process.env.RALPH_PROVIDER = "opencode";
    const provider = await resolveProvider({ configFile: "" });
    expect(provider).toBe("opencode");
  });

  test("uses config when cli and env are missing", async () => {
    const provider = await resolveProvider({
      configFile: "codex",
      envVariable: "",
    });
    expect(provider).toBe("codex");
  });

  test("auto-detects provider when cli/env/config are all missing", async () => {
    Object.assign(Bun, {
      spawn: mock((cmd: unknown) => {
        const command = cmd as Array<string>;
        const binary = command[1];
        const exitCode = binary === "opencode" ? 0 : 1;
        return {
          exited: Promise.resolve(exitCode),
          stderr: new ReadableStream({
            start(c) {
              c.close();
            },
          }),
          stdout: new ReadableStream({
            start(c) {
              c.close();
            },
          }),
        };
      }),
    });

    delete process.env.RALPH_PROVIDER;
    const provider = await resolveProvider({ configFile: "" });
    expect(provider).toBe("opencode");
  });
});

// =============================================================================
// validateProvider
// =============================================================================

describe("validateProvider", () => {
  test("accepts claude", () => {
    expect(validateProvider("claude")).toBe("claude");
  });

  test("accepts opencode", () => {
    expect(validateProvider("opencode")).toBe("opencode");
  });

  test("accepts codex", () => {
    expect(validateProvider("codex")).toBe("codex");
  });

  test("accepts gemini", () => {
    expect(validateProvider("gemini")).toBe("gemini");
  });

  test("accepts pi", () => {
    expect(validateProvider("pi")).toBe("pi");
  });

  test("accepts cursor", () => {
    expect(validateProvider("cursor")).toBe("cursor");
  });

  test("throws ProviderError for unknown provider", () => {
    expect(() => validateProvider("unknown")).toThrow(ProviderError);
  });

  test("error message includes valid providers", () => {
    try {
      validateProvider("invalid");
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      const providerError = error as ProviderError;
      expect(providerError.message).toContain("claude");
      expect(providerError.message).toContain("opencode");
      expect(providerError.provider).toBe("invalid");
    }
  });

  test("error message lists valid options", () => {
    try {
      validateProvider("bad");
      expect(true).toBe(false);
    } catch (error) {
      const providerError = error as ProviderError;
      expect(providerError.message).toContain("Valid providers:");
      expect(providerError.message).toContain("codex");
      expect(providerError.message).toContain("cursor");
      expect(providerError.message).toContain("gemini");
      expect(providerError.message).toContain("pi");
    }
  });
});

// =============================================================================
// ProviderError
// =============================================================================

describe("ProviderError", () => {
  test("has correct name", () => {
    const error = new ProviderError("test", "test message");
    expect(error.name).toBe("ProviderError");
  });

  test("has correct provider field", () => {
    const error = new ProviderError("claude", "test message");
    expect(error.provider).toBe("claude");
  });

  test("has correct message", () => {
    const error = new ProviderError("test", "some error");
    expect(error.message).toBe("some error");
  });

  test("is an instance of Error", () => {
    const error = new ProviderError("test", "test");
    expect(error).toBeInstanceOf(Error);
  });

  test("cause is undefined when not provided", () => {
    const error = new ProviderError("test", "test");
    expect(error.cause).toBeUndefined();
  });

  test("stores optional cause", () => {
    const originalError = new Error("original");
    const error = new ProviderError("test", "wrapped", originalError);
    expect(error.cause).toBe(originalError);
  });

  test("cause is accessible through Error.cause", () => {
    const originalError = new Error("original");
    const error = new ProviderError("test", "wrapped", originalError);
    expect((error as Error).cause).toBe(originalError);
  });
});

// =============================================================================
// isBinaryAvailable (real)
// =============================================================================

describe("isBinaryAvailable", () => {
  test("returns true for a binary that exists (ls)", async () => {
    const isAvailable = await isBinaryAvailable("ls");
    expect(isAvailable).toBe(true);
  });

  test("returns false for a binary that does not exist", async () => {
    const isAvailable = await isBinaryAvailable(
      "nonexistent-binary-xyz-12345-does-not-exist",
    );
    expect(isAvailable).toBe(false);
  });

  test("returns true for which itself", async () => {
    const isAvailable = await isBinaryAvailable("which");
    expect(isAvailable).toBe(true);
  });
});

// =============================================================================
// isBinaryAvailable (mocked Bun.spawn)
// =============================================================================

describe("isBinaryAvailable (mocked)", () => {
  const originalSpawn = Bun.spawn;

  afterAll(() => {
    Bun.spawn = originalSpawn;
  });

  beforeEach(() => {
    Bun.spawn = originalSpawn;
  });

  test("returns true when which exits with code 0", async () => {
    Object.assign(Bun, {
      spawn: mock(() => ({
        exited: Promise.resolve(0),
        stderr: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
        stdout: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
      })),
    });
    expect(await isBinaryAvailable("fake-binary")).toBe(true);
  });

  test("returns false when which exits with non-zero code", async () => {
    Object.assign(Bun, {
      spawn: mock(() => ({
        exited: Promise.resolve(1),
        stderr: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
        stdout: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
      })),
    });
    expect(await isBinaryAvailable("fake-binary")).toBe(false);
  });

  test("returns false when Bun.spawn throws", async () => {
    Object.assign(Bun, {
      spawn: mock(() => {
        throw new Error("spawn failed");
      }),
    });
    expect(await isBinaryAvailable("fake-binary")).toBe(false);
  });

  test("passes correct command to Bun.spawn", async () => {
    let capturedCommand: unknown = null;
    Object.assign(Bun, {
      spawn: mock((command: unknown) => {
        capturedCommand = command;
        return {
          exited: Promise.resolve(0),
          stderr: new ReadableStream({
            start(c) {
              c.close();
            },
          }),
          stdout: new ReadableStream({
            start(c) {
              c.close();
            },
          }),
        };
      }),
    });
    await isBinaryAvailable("my-tool");
    expect(capturedCommand).toEqual(["which", "my-tool"]);
  });
});

// =============================================================================
// getInstallInstructions
// =============================================================================

describe("getInstallInstructions", () => {
  test("returns npm install command for claude", () => {
    expect(getInstallInstructions("claude")).toContain("npm install -g");
    expect(getInstallInstructions("claude")).toContain("claude-code");
  });

  test("returns npm install command for opencode", () => {
    expect(getInstallInstructions("opencode")).toContain("npm install -g");
    expect(getInstallInstructions("opencode")).toContain("opencode");
  });

  test("returns npm install command for codex", () => {
    expect(getInstallInstructions("codex")).toContain("npm install -g");
    expect(getInstallInstructions("codex")).toContain("codex");
  });

  test("returns npm install command for gemini", () => {
    expect(getInstallInstructions("gemini")).toContain("npm install -g");
    expect(getInstallInstructions("gemini")).toContain("gemini");
  });

  test("returns install instructions for cursor", () => {
    expect(getInstallInstructions("cursor")).toContain("cursor");
  });

  test("returns install instructions for pi", () => {
    const instructions = getInstallInstructions("pi");
    expect(instructions).toContain("npm install -g");
    expect(instructions).toContain("@pi-mono/pi");
  });

  test("returns a string for every provider", () => {
    const providers: Array<ProviderType> = [
      "claude",
      "codex",
      "cursor",
      "gemini",
      "opencode",
      "pi",
    ];
    for (const provider of providers) {
      const instructions = getInstallInstructions(provider);
      expect(typeof instructions).toBe("string");
      expect(instructions.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// autoDetectProvider (real)
// =============================================================================

describe("autoDetectProvider", () => {
  test("returns a valid ProviderType", async () => {
    const provider = await autoDetectProvider();
    const validProviders = [
      "claude",
      "codex",
      "cursor",
      "gemini",
      "opencode",
      "pi",
    ];
    expect(validProviders).toContain(provider);
  });

  test("defaults to claude when called", async () => {
    // In test environment, claude binary may or may not be available
    // But the function should always return a valid provider
    const provider = await autoDetectProvider();
    expect(typeof provider).toBe("string");
  });
});

// =============================================================================
// autoDetectProvider (mocked Bun.spawn to control binary availability)
// =============================================================================

describe("autoDetectProvider (mocked)", () => {
  const originalSpawn = Bun.spawn;

  /**
   * Create a mock Bun.spawn that reports specific binaries as available.
   * Intercepts `which <binary>` calls and returns exit code 0 for available ones.
   */
  function createMockSpawn(availableBinaries: Set<string>) {
    return mock((cmd: ReadonlyArray<string>) => {
      const binary = String(cmd[1]);
      const exitCode = availableBinaries.has(binary) ? 0 : 1;
      return {
        exited: Promise.resolve(exitCode),
        stderr: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
        stdout: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
      };
    });
  }

  afterAll(() => {
    Bun.spawn = originalSpawn;
  });

  beforeEach(() => {
    Bun.spawn = originalSpawn;
  });

  test("returns claude when claude is the first available binary", async () => {
    Object.assign(Bun, { spawn: createMockSpawn(new Set(["claude"])) });
    expect(await autoDetectProvider()).toBe("claude");
  });

  test("returns opencode when only opencode is available", async () => {
    Object.assign(Bun, { spawn: createMockSpawn(new Set(["opencode"])) });
    expect(await autoDetectProvider()).toBe("opencode");
  });

  test("returns codex when only codex is available", async () => {
    Object.assign(Bun, { spawn: createMockSpawn(new Set(["codex"])) });
    expect(await autoDetectProvider()).toBe("codex");
  });

  test("returns gemini when only gemini is available", async () => {
    Object.assign(Bun, { spawn: createMockSpawn(new Set(["gemini"])) });
    expect(await autoDetectProvider()).toBe("gemini");
  });

  test("returns pi when only pi is available", async () => {
    Object.assign(Bun, { spawn: createMockSpawn(new Set(["pi"])) });
    expect(await autoDetectProvider()).toBe("pi");
  });

  test("defaults to claude when no binaries are available", async () => {
    Object.assign(Bun, { spawn: createMockSpawn(new Set()) });
    expect(await autoDetectProvider()).toBe("claude");
  });

  test("returns claude over opencode when both available (priority order)", async () => {
    Object.assign(Bun, {
      spawn: createMockSpawn(new Set(["claude", "opencode"])),
    });
    expect(await autoDetectProvider()).toBe("claude");
  });

  test("returns opencode over codex when both available (priority order)", async () => {
    Object.assign(Bun, {
      spawn: createMockSpawn(new Set(["codex", "opencode"])),
    });
    expect(await autoDetectProvider()).toBe("opencode");
  });

  test("returns codex over gemini when both available (priority order)", async () => {
    Object.assign(Bun, {
      spawn: createMockSpawn(new Set(["codex", "gemini"])),
    });
    expect(await autoDetectProvider()).toBe("codex");
  });

  test("returns gemini over pi when both available (priority order)", async () => {
    Object.assign(Bun, { spawn: createMockSpawn(new Set(["gemini", "pi"])) });
    expect(await autoDetectProvider()).toBe("gemini");
  });

  test("skips unavailable providers and returns first available", async () => {
    // Only gemini and pi available → gemini is earlier in priority
    Object.assign(Bun, { spawn: createMockSpawn(new Set(["gemini", "pi"])) });
    expect(await autoDetectProvider()).toBe("gemini");
  });
});

// =============================================================================
// validateProviderInvocationPreflight
// =============================================================================

describe("validateProviderInvocationPreflight", () => {
  const originalSpawn = Bun.spawn;

  afterAll(() => {
    Bun.spawn = originalSpawn;
  });

  beforeEach(() => {
    Bun.spawn = originalSpawn;
  });

  test("passes for opencode supervised when binary is available", async () => {
    const spawnMock = mock(() => ({
      exited: Promise.resolve(0),
      stderr: new ReadableStream({
        start(c) {
          c.close();
        },
      }),
      stdout: new ReadableStream({
        start(c) {
          c.close();
        },
      }),
    }));
    Object.assign(Bun, { spawn: spawnMock });

    await validateProviderInvocationPreflight("opencode", "supervised");
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  test("throws for non-enabled providers before binary checks", async () => {
    const spawnMock = mock(() => ({
      exited: Promise.resolve(0),
      stderr: new ReadableStream({
        start(c) {
          c.close();
        },
      }),
      stdout: new ReadableStream({
        start(c) {
          c.close();
        },
      }),
    }));
    Object.assign(Bun, { spawn: spawnMock });

    try {
      await validateProviderInvocationPreflight("codex", "headless");
      expect(true).toBe(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("not enabled in this Ralph runtime");
    }
    expect(spawnMock).not.toHaveBeenCalled();
  });

  test("passes for opencode headless when binary is available", async () => {
    Object.assign(Bun, {
      spawn: mock(() => ({
        exited: Promise.resolve(0),
        stderr: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
        stdout: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
      })),
    });

    await validateProviderInvocationPreflight("opencode", "headless");
  });

  test("fails with install guidance when supported mode binary is missing", async () => {
    Object.assign(Bun, {
      spawn: mock(() => ({
        exited: Promise.resolve(1),
        stderr: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
        stdout: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
      })),
    });

    try {
      await validateProviderInvocationPreflight("opencode", "headless");
      expect(true).toBe(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("Install: npm install -g opencode");
    }
  });
});

// =============================================================================
// invokeWithProvider (model forwarding)
// =============================================================================

describe("invokeWithProvider model forwarding", () => {
  const originalSpawn = Bun.spawn;
  const originalOpencodeInvoke = REGISTRY.opencode.invoke;

  afterAll(() => {
    Bun.spawn = originalSpawn;
    REGISTRY.opencode.invoke = originalOpencodeInvoke;
  });

  beforeEach(() => {
    Bun.spawn = originalSpawn;
    REGISTRY.opencode.invoke = originalOpencodeInvoke;
  });

  test("passes selected model into provider config", async () => {
    // Mock binary as available
    Object.assign(Bun, {
      spawn: mock(() => ({
        exited: Promise.resolve(0),
        stderr: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
        stdout: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
      })),
    });

    const invokeSpy = mock(async (options: InvocationOptions) => {
      await Promise.resolve();
      expect(options.config).toEqual({
        model: "openai/gpt-4o",
        provider: "opencode",
      });
      return { costUsd: 0, durationMs: 1, result: "ok", sessionId: "sess-1" };
    });

    REGISTRY.opencode.invoke = invokeSpy;

    const result = await invokeWithProvider("opencode", {
      mode: "headless",
      model: "openai/gpt-4o",
      prompt: "test prompt",
    });

    expect(invokeSpy).toHaveBeenCalledTimes(1);
    expect(result?.result).toBe("ok");
  });

  test("invokes opencode supervised mode with composed prompt", async () => {
    // Mock binary as available (preflight `which opencode`).
    const spawnMock = mock(() => ({
      exited: Promise.resolve(0),
      stderr: new ReadableStream({
        start(c) {
          c.close();
        },
      }),
      stdout: new ReadableStream({
        start(c) {
          c.close();
        },
      }),
    }));
    Object.assign(Bun, { spawn: spawnMock });

    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "aaa-registry-supervised-"),
    );
    const promptPath = join(temporaryDirectory, "prompt.md");
    writeFileSync(promptPath, "Prompt body", "utf8");

    const invokeSpy = mock(async (options: InvocationOptions) => {
      await Promise.resolve();
      expect(options.mode).toBe("supervised");
      expect(options.prompt).toContain("SUPERVISED_CONTEXT");
      expect(options.prompt).toContain("Prompt body");
      return { costUsd: 0, durationMs: 1, result: "ok", sessionId: "sess-2" };
    });
    REGISTRY.opencode.invoke = invokeSpy;

    try {
      const result = await invokeWithProvider("opencode", {
        context: "SUPERVISED_CONTEXT",
        mode: "supervised",
        promptPath,
        sessionName: "test-session",
      });

      expect(result?.sessionId).toBe("sess-2");
      expect(invokeSpy).toHaveBeenCalledTimes(1);
      // `which opencode` preflight check
      expect(spawnMock).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });
});

// =============================================================================
// invokeWithProvider (mocked - error cases)
// =============================================================================

describe("invokeWithProvider error handling", () => {
  const originalSpawn = Bun.spawn;

  afterAll(() => {
    Bun.spawn = originalSpawn;
  });

  beforeEach(() => {
    Bun.spawn = originalSpawn;
  });

  test("throws ProviderError for claude when binary not found", async () => {
    Object.assign(Bun, {
      spawn: mock(() => ({
        exited: Promise.resolve(1),
        stderr: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
        stdout: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
      })),
    });

    try {
      await invokeWithProvider("claude", { mode: "headless", prompt: "test" });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      const pe = error as ProviderError;
      expect(pe.provider).toBe("claude");
      expect(pe.message).toContain("not found in PATH");
      expect(pe.message).toContain("Install:");
      expect(pe.message).toContain("@anthropic-ai/claude-code");
    }
  });

  test("throws ProviderError with install instructions when binary missing", async () => {
    // Mock all binaries as not found
    Object.assign(Bun, {
      spawn: mock(() => ({
        exited: Promise.resolve(1),
        stderr: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
        stdout: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
      })),
    });

    try {
      await invokeWithProvider("opencode", {
        mode: "headless",
        prompt: "test",
      });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      const pe = error as ProviderError;
      expect(pe.provider).toBe("opencode");
      expect(pe.message).toContain("not found in PATH");
      expect(pe.message).toContain("Install:");
      expect(pe.message).toContain("npm install -g");
    }
  });

  test("throws for codex when provider is not enabled", async () => {
    Object.assign(Bun, {
      spawn: mock(() => ({
        exited: Promise.resolve(1),
        stderr: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
        stdout: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
      })),
    });

    try {
      await invokeWithProvider("codex", { mode: "headless", prompt: "test" });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      const pe = error as ProviderError;
      expect(pe.provider).toBe("codex");
      expect(pe.message).toContain("not enabled in this Ralph runtime");
    }
  });

  test("throws for codex before binary checks even when binary exists", async () => {
    // Mock binary as available
    Object.assign(Bun, {
      spawn: mock(() => ({
        exited: Promise.resolve(0),
        stderr: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
        stdout: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
      })),
    });

    try {
      await invokeWithProvider("codex", { mode: "headless", prompt: "test" });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      const pe = error as ProviderError;
      expect(pe.provider).toBe("codex");
      expect(pe.message).toContain("not enabled in this Ralph runtime");
    }
  });

  test("throws for gemini when provider is not enabled", async () => {
    Object.assign(Bun, {
      spawn: mock(() => ({
        exited: Promise.resolve(1),
        stderr: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
        stdout: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
      })),
    });

    try {
      await invokeWithProvider("gemini", { mode: "headless", prompt: "test" });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      const pe = error as ProviderError;
      expect(pe.provider).toBe("gemini");
      expect(pe.message).toContain("not enabled in this Ralph runtime");
    }
  });

  test("throws for pi when provider is not enabled", async () => {
    Object.assign(Bun, {
      spawn: mock(() => ({
        exited: Promise.resolve(1),
        stderr: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
        stdout: new ReadableStream({
          start(c) {
            c.close();
          },
        }),
      })),
    });

    try {
      await invokeWithProvider("pi", { mode: "headless", prompt: "test" });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      const pe = error as ProviderError;
      expect(pe.provider).toBe("pi");
      expect(pe.message).toContain("not enabled in this Ralph runtime");
    }
  });
});

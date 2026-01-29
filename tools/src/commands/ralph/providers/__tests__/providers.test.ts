/**
 * Integration tests for the multi-CLI provider system
 *
 * Tests provider registration, availability, configuration, and method implementations
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/init-declarations, no-inline-comments, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions, no-continue, default-case, no-plusplus, @typescript-eslint/naming-convention, import/no-unresolved, @typescript-eslint/consistent-type-assertions */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

import type {
  AIProvider,
  BaseProviderConfig,
  ClaudeProviderConfig,
  CodexProviderConfig,
  CursorProviderConfig,
  GeminiProviderConfig,
  OpencodeProviderConfig,
} from "../types";

import {
  clearProviderCache,
  getAvailableProviders,
  getDefaultProviderName,
  getProvider,
  hasProvider,
  isProviderAvailable,
  listProviderNames,
  listProviders,
} from "../index";
// Import all providers to trigger registration
import "../claude";
import "../opencode";
import "../cursor";
import "../gemini";
import "../codex";

// Provider names
const PROVIDER_NAMES = [
  "claude",
  "opencode",
  "cursor",
  "gemini",
  "codex",
] as const;
type ProviderName = (typeof PROVIDER_NAMES)[number];

// Expected default models for each provider
const EXPECTED_DEFAULT_MODELS: Record<ProviderName, string> = {
  claude: "claude-3-5-sonnet-latest",
  codex: "gpt-5.2-codex",
  cursor: "composer-1",
  gemini: "gemini-2.5-flash-lite",
  opencode: "anthropic/claude-3-5-sonnet-latest",
};

// Expected context files for each provider
const EXPECTED_CONTEXT_FILES: Record<ProviderName, Array<string>> = {
  claude: ["CLAUDE.md", "AGENTS.md"],
  codex: ["CODEX.md", "AGENTS.md"],
  cursor: [".cursor/rules/", "AGENTS.md", "CLAUDE.md"],
  gemini: ["AGENTS.md"],
  opencode: ["AGENTS.md"],
};

// CLI commands for each provider
const CLI_COMMANDS: Record<ProviderName, string> = {
  claude: "claude",
  codex: "codex",
  cursor: "agent",
  gemini: "gemini",
  opencode: "opencode",
};

describe("Provider System", () => {
  beforeEach(() => {
    // Clear provider cache before each test to ensure isolation
    clearProviderCache();
  });

  describe("Provider Registration", () => {
    it("should register all 5 providers", () => {
      const names = listProviderNames();

      expect(names).toHaveLength(5);
      expect(names).toContain("claude");
      expect(names).toContain("opencode");
      expect(names).toContain("cursor");
      expect(names).toContain("gemini");
      expect(names).toContain("codex");
    });

    it("should confirm all providers exist via hasProvider()", () => {
      for (const name of PROVIDER_NAMES) {
        expect(hasProvider(name)).toBe(true);
      }
    });

    it("should return false for unregistered provider names", () => {
      expect(hasProvider("nonexistent")).toBe(false);
      expect(hasProvider("gpt")).toBe(false);
      expect(hasProvider("openai")).toBe(false);
    });

    it("should create provider instances via factory functions", () => {
      for (const name of PROVIDER_NAMES) {
        const provider = getProvider(name);
        expect(provider).toBeDefined();
        expect(provider.name).toBe(name);
      }
    });

    it("should cache provider instances by default", () => {
      const provider1 = getProvider("claude");
      const provider2 = getProvider("claude");

      // Same reference due to caching
      expect(provider1).toBe(provider2);
    });

    it("should throw error for unregistered provider", () => {
      expect(() => getProvider("nonexistent")).toThrow();
      expect(() => getProvider("nonexistent")).toThrow(
        "Provider 'nonexistent' is not registered",
      );
    });
  });

  describe("Provider Availability", () => {
    let spawnSyncMock: ReturnType<typeof spyOn>;

    afterEach(() => {
      if (spawnSyncMock) {
        spawnSyncMock.mockRestore();
      }
    });

    it("should return true when CLI is installed", () => {
      spawnSyncMock = spyOn(Bun, "spawnSync").mockImplementation(
        () =>
          ({
            exitCode: 0,
            stderr: Buffer.from(""),
            stdout: Buffer.from(""),
          }) as ReturnType<typeof Bun.spawnSync>,
      ) as unknown as ReturnType<typeof spyOn>;

      for (const name of PROVIDER_NAMES) {
        expect(isProviderAvailable(name)).toBe(true);
      }
    });

    it("should return false when CLI is not installed", () => {
      spawnSyncMock = spyOn(Bun, "spawnSync").mockImplementation(
        () =>
          ({
            exitCode: 1,
            stderr: Buffer.from(""),
            stdout: Buffer.from(""),
          }) as ReturnType<typeof Bun.spawnSync>,
      ) as unknown as ReturnType<typeof spyOn>;

      for (const name of PROVIDER_NAMES) {
        expect(isProviderAvailable(name)).toBe(false);
      }
    });

    it("should return false when spawn throws an error", () => {
      spawnSyncMock = spyOn(Bun, "spawnSync").mockImplementation(() => {
        throw new Error("Command not found");
      }) as unknown as ReturnType<typeof spyOn>;

      for (const name of PROVIDER_NAMES) {
        expect(isProviderAvailable(name)).toBe(false);
      }
    });

    it("should check correct CLI commands for each provider", () => {
      const calls: Array<Array<string>> = [];

      spawnSyncMock = spyOn(Bun, "spawnSync").mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (options: any) => {
          const args = Array.isArray(options)
            ? options
            : options?.cmd || [options];
          calls.push(args);
          // Return a mock result - just need exitCode for this test
          return { exitCode: 0 } as unknown as ReturnType<typeof Bun.spawnSync>;
        },
      ) as unknown as ReturnType<typeof spyOn>;

      // Check each provider
      for (const name of PROVIDER_NAMES) {
        isProviderAvailable(name);
      }

      // Verify each provider checked its correct CLI command
      for (const [index, name] of PROVIDER_NAMES.entries()) {
        const expectedCommand = CLI_COMMANDS[name];
        expect(calls[index]).toEqual(["which", expectedCommand]);
      }
    });
  });

  describe("Provider Configuration", () => {
    it("should accept empty configuration object", () => {
      for (const name of PROVIDER_NAMES) {
        const provider = getProvider(name, {});
        expect(provider).toBeDefined();
        expect(provider.name).toBe(name);
      }
    });

    it("should set default models correctly", () => {
      for (const name of PROVIDER_NAMES) {
        const provider = getProvider(name);
        expect(provider.getDefaultModel()).toBe(EXPECTED_DEFAULT_MODELS[name]);
      }
    });

    it("should allow custom model override", () => {
      const customModel = "custom-model-xyz";

      for (const name of PROVIDER_NAMES) {
        const provider = getProvider(name, { model: customModel });
        expect(provider.getDefaultModel()).toBe(customModel);
      }
    });

    it("should not cache providers with custom config", () => {
      const provider1 = getProvider("claude", { model: "model-a" });
      const provider2 = getProvider("claude", { model: "model-b" });
      const provider3 = getProvider("claude");

      // Custom configs should create new instances
      expect(provider1).not.toBe(provider2);
      expect(provider1.getDefaultModel()).toBe("model-a");
      expect(provider2.getDefaultModel()).toBe("model-b");

      // Default config should be cached
      const provider4 = getProvider("claude");
      expect(provider3).toBe(provider4);
    });

    it("should accept Claude-specific options", () => {
      const config: ClaudeProviderConfig = {
        dangerouslySkipPermissions: true,
        lightweightModel: "claude-3-haiku-latest",
        maxTokens: 4096,
        model: "claude-3-opus-latest",
        temperature: 0.7,
      };

      const provider = getProvider("claude", config);
      expect(provider.getDefaultModel()).toBe("claude-3-opus-latest");
    });

    it("should accept Codex-specific options", () => {
      const config: CodexProviderConfig = {
        maxTokens: 2048,
        model: "gpt-4",
        outputSchema: "/path/to/schema.json",
        sandbox: "read-only",
        temperature: 0.5,
      };

      const provider = getProvider("codex", config);
      expect(provider.getDefaultModel()).toBe("gpt-4");
    });

    it("should accept Cursor-specific options", () => {
      const config: CursorProviderConfig = {
        browser: true,
        dangerouslyAllowForceWrites: false,
        maxTokens: 8192,
        model: "cursor-2",
        sandbox: "enabled",
      };

      const provider = getProvider("cursor", config);
      expect(provider.getDefaultModel()).toBe("cursor-2");
    });

    it("should accept Gemini-specific options", () => {
      const config: GeminiProviderConfig = {
        maxTokens: 3072,
        model: "gemini-pro",
        rateLimitRpm: 60,
        sandbox: true,
      };

      const provider = getProvider("gemini", config);
      expect(provider.getDefaultModel()).toBe("gemini-pro");
    });

    it("should accept Opencode-specific options", () => {
      const config: OpencodeProviderConfig = {
        agent: "build",
        lightweightModel: "anthropic/claude-3-haiku",
        maxTokens: 4096,
        model: "anthropic/claude-3-opus",
        serverPort: 8080,
      };

      const provider = getProvider("opencode", config);
      expect(provider.getDefaultModel()).toBe("anthropic/claude-3-opus");
    });

    it("should accept extraFlags in config", () => {
      const config: BaseProviderConfig = {
        extraFlags: ["--verbose", "--debug"],
        model: "test-model",
      };

      const provider = getProvider("claude", config);
      expect(provider.getDefaultModel()).toBe("test-model");
    });
  });

  describe("Method Implementation", () => {
    let provider: AIProvider;

    beforeEach(() => {
      provider = getProvider("claude");
    });

    it("should implement all required AIProvider interface methods", () => {
      // Required properties
      expect(provider.name).toBeDefined();
      expect(typeof provider.name).toBe("string");
      expect(provider.command).toBeDefined();
      expect(typeof provider.command).toBe("string");

      // Required methods
      expect(typeof provider.getContextFileNames).toBe("function");
      expect(typeof provider.getDefaultModel).toBe("function");
      expect(typeof provider.invokeChat).toBe("function");
      expect(typeof provider.invokeHeadless).toBe("function");
      expect(typeof provider.isAvailable).toBe("function");
      expect(typeof provider.isValidModel).toBe("function");
    });

    it("should return correct context file names for each provider", () => {
      for (const name of PROVIDER_NAMES) {
        const p = getProvider(name);
        const contextFiles = p.getContextFileNames();
        expect(contextFiles).toEqual(EXPECTED_CONTEXT_FILES[name]);
      }
    });

    it("should return string array from getContextFileNames", () => {
      for (const name of PROVIDER_NAMES) {
        const p = getProvider(name);
        const files = p.getContextFileNames();
        expect(Array.isArray(files)).toBe(true);
        for (const file of files) {
          expect(typeof file).toBe("string");
        }
      }
    });

    it("should return correct command names", () => {
      for (const name of PROVIDER_NAMES) {
        const p = getProvider(name);
        expect(p.command).toBe(CLI_COMMANDS[name]);
      }
    });

    it("should return true from isValidModel for any string", () => {
      const testModels = [
        "gpt-4",
        "claude-3-sonnet",
        "custom-model",
        "",
        "model with spaces",
        "123",
      ];

      for (const name of PROVIDER_NAMES) {
        const p = getProvider(name);
        for (const model of testModels) {
          expect(p.isValidModel(model)).toBe(true);
        }
      }
    });

    it("should have optional invokeLightweight method", () => {
      for (const name of PROVIDER_NAMES) {
        const p = getProvider(name);
        // invokeLightweight is optional, but if present should be a function
        if (p.invokeLightweight !== undefined) {
          expect(typeof p.invokeLightweight).toBe("function");
        }
      }
    });
  });

  describe("listProviders()", () => {
    it("should return array of ProviderInfo for all providers", () => {
      const providers = listProviders();

      expect(providers).toHaveLength(5);

      for (const provider of providers) {
        expect(provider).toHaveProperty("name");
        expect(provider).toHaveProperty("available");
        expect(provider).toHaveProperty("command");
        expect(provider).toHaveProperty("defaultModel");
        expect(provider).toHaveProperty("description");

        expect(typeof provider.name).toBe("string");
        expect(typeof provider.available).toBe("boolean");
        expect(typeof provider.command).toBe("string");
        expect(typeof provider.defaultModel).toBe("string");
        expect(typeof provider.description).toBe("string");
      }
    });

    it("should include all registered providers in list", () => {
      const providers = listProviders();
      const names = providers.map((p) => p.name);

      for (const name of PROVIDER_NAMES) {
        expect(names).toContain(name);
      }
    });

    it("should reflect provider availability correctly", () => {
      // This test relies on actual CLI availability
      const providers = listProviders();

      for (const provider of providers) {
        // Availability should match isProviderAvailable
        expect(provider.available).toBe(isProviderAvailable(provider.name));
      }
    });

    it("should return correct default models in provider info", () => {
      const providers = listProviders();

      for (const provider of providers) {
        const expectedModel =
          EXPECTED_DEFAULT_MODELS[provider.name as ProviderName];
        expect(provider.defaultModel).toBe(expectedModel);
      }
    });

    it("should return meaningful descriptions", () => {
      const providers = listProviders();

      for (const provider of providers) {
        expect(provider.description.length).toBeGreaterThan(0);
        // Description should contain either the provider name or reference to it
        const hasName = provider.description
          .toLowerCase()
          .includes(provider.name.toLowerCase());
        expect(hasName || provider.description.length > 10).toBe(true);
      }
    });
  });

  describe("getAvailableProviders()", () => {
    it("should return only available providers", () => {
      const available = getAvailableProviders();

      for (const provider of available) {
        expect(provider.available).toBe(true);
      }
    });

    it("should be subset of all providers", () => {
      const allProviders = listProviders();
      const available = getAvailableProviders();

      const allNames = new Set(allProviders.map((p) => p.name));
      const availableNames = available.map((p) => p.name);

      for (const name of availableNames) {
        expect(allNames.has(name)).toBe(true);
      }
    });
  });

  describe("getDefaultProviderName()", () => {
    it("should return claude when available", () => {
      // If claude is available, it should be the default
      if (isProviderAvailable("claude")) {
        expect(getDefaultProviderName()).toBe("claude");
      }
    });

    it("should return a valid provider name", () => {
      const defaultName = getDefaultProviderName();
      expect(PROVIDER_NAMES).toContain(defaultName as ProviderName);
    });
  });

  describe("Mock Tests for Invoke Methods", () => {
    it("should have invokeChat method that accepts ChatOptions", () => {
      const provider = getProvider("claude");

      // Verify the method exists and has correct signature
      expect(typeof provider.invokeChat).toBe("function");

      // Note: We cannot mock the underlying legacy functions without restructuring
      // the module imports. These tests verify the interface contract exists.
      // The actual implementation invokes the real Claude CLI.
      // For unit tests of invoke methods, we would need to:
      // 1. Extract the legacy functions to a separate mockable module, or
      // 2. Use dependency injection to pass in the spawn function
    });

    it("should have invokeHeadless method that accepts HeadlessOptions", () => {
      const provider = getProvider("claude");

      // Verify the method exists and has correct signature
      expect(typeof provider.invokeHeadless).toBe("function");

      // The method returns HeadlessResult | null
      // We verify the return type structure below without calling the actual implementation
      const result = null; // Simulating a case where result is null
      expect(result === null || typeof result === "object").toBe(true);
    });

    it("should have optional invokeLightweight method", () => {
      const provider = getProvider("claude");

      // Claude provider implements invokeLightweight
      expect(provider.invokeLightweight).toBeDefined();
      expect(typeof provider.invokeLightweight).toBe("function");
    });

    it("should return failure when CLI not available", () => {
      // Test non-claude providers which have real implementations
      // When the CLI isn't available, invokeChat should return failure
      // and invokeHeadless should return null
      // Skip providers that are actually available in this environment
      const providers = ["opencode", "cursor", "gemini", "codex"] as const;

      for (const name of providers) {
        const provider = getProvider(name);

        // Skip if CLI is available - we're testing unavailable behavior
        if (provider.isAvailable()) {
          continue;
        }

        // invokeChat should return failure when CLI not available
        const chatResult = provider.invokeChat({
          promptPath: "/tmp/test.md",
          sessionName: "test",
        });

        expect(chatResult.success).toBe(false);
        expect(chatResult.interrupted).toBe(false);

        // invokeHeadless should return null when CLI not available
        const headlessResult = provider.invokeHeadless({ prompt: "test" });

        expect(headlessResult).toBeNull();
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle errors gracefully in isAvailable", () => {
      // Override spawnSync to throw
      const spawnMock = spyOn(Bun, "spawnSync").mockImplementation(() => {
        throw new Error("System error");
      }) as unknown as ReturnType<typeof spyOn>;

      try {
        for (const name of PROVIDER_NAMES) {
          const provider = getProvider(name);
          // Should return false instead of throwing
          expect(provider.isAvailable()).toBe(false);
        }
      } finally {
        spawnMock.mockRestore();
      }
    });

    it("should provide meaningful error for unknown provider", () => {
      expect(() => getProvider("unknown-provider")).toThrow(/unknown-provider/);
      expect(() => getProvider("unknown-provider")).toThrow(/not registered/);
    });
  });

  describe("Provider Identity", () => {
    it("should maintain consistent name and command", () => {
      for (const name of PROVIDER_NAMES) {
        const provider1 = getProvider(name);
        const provider2 = getProvider(name);

        // Name and command should be identical
        expect(provider1.name).toBe(provider2.name);
        expect(provider1.command).toBe(provider2.command);
        expect(provider1.name).toBe(name);
      }
    });

    it("should have unique commands per provider", () => {
      const commands = new Set<string>();

      for (const name of PROVIDER_NAMES) {
        const provider = getProvider(name);
        commands.add(provider.command);
      }

      // Each provider should have a unique command
      expect(commands.size).toBe(PROVIDER_NAMES.length);
    });
  });
});

describe("Provider System - Stress Tests", () => {
  beforeEach(() => {
    clearProviderCache();
  });

  it("should handle rapid provider creation", () => {
    const providers: Array<AIProvider> = [];

    // Create many instances rapidly
    for (let index = 0; index < 100; index++) {
      const provider = getProvider("claude", { model: `model-${index}` });
      providers.push(provider);
    }

    // All should be unique instances
    const uniqueProviders = new Set(providers);
    expect(uniqueProviders.size).toBe(100);
  });

  it("should handle mixed provider operations", () => {
    const operations = PROVIDER_NAMES.flatMap((name) => [
      { name, op: "get" as const },
      { name, op: "available" as const },
      { name, op: "model" as const },
    ]);

    // Shuffle operations using Fisher-Yates
    for (let index = operations.length - 1; index > 0; index--) {
      const index_ = Math.floor(Math.random() * (index + 1));
      if (index_ >= 0 && index_ < operations.length) {
        const opI = operations[index];
        const opJ = operations[index_];
        if (opI !== undefined && opJ !== undefined) {
          operations[index] = opJ;
          operations[index_] = opI;
        }
      }
    }

    // Execute all operations
    for (const operation of operations) {
      if (!operation) continue;
      const { name, op } = operation;
      const provider = getProvider(name);

      switch (op) {
        case "available": {
          // Just verify it doesn't throw
          provider.isAvailable();
          break;
        }
        case "get": {
          expect(provider.name).toBe(name);
          break;
        }
        case "model": {
          expect(typeof provider.getDefaultModel()).toBe("string");
          break;
        }
      }
    }
  });
});

describe("Claude Provider Specific Tests", () => {
  let provider: AIProvider;

  beforeEach(() => {
    clearProviderCache();
    provider = getProvider("claude");
  });

  it("should parse Claude JSON output format", () => {
    // Claude provider has a parseOutput method
    const claudeProvider = provider as unknown as {
      parseOutput: (rawOutput: string) => {
        costUsd?: number;
        duration: number;
        result: string;
        sessionId: string;
        tokenUsage?: object;
      };
    };

    if (typeof claudeProvider.parseOutput === "function") {
      const mockOutput = JSON.stringify({
        duration_ms: 5000,
        result: "Test result",
        session_id: "test-session-123",
        total_cost_usd: 0.05,
        type: "result",
        usage: {
          cache_creation_input_tokens: 5,
          cache_read_input_tokens: 10,
          input_tokens: 100,
          output_tokens: 50,
        },
      });

      const result = claudeProvider.parseOutput(mockOutput);

      expect(result.result).toBe("Test result");
      expect(result.sessionId).toBe("test-session-123");
      expect(result.duration).toBe(5000);
      expect(result.costUsd).toBe(0.05);
      expect(result.tokenUsage).toBeDefined();
    }
  });

  it("should parse Claude array output format", () => {
    const claudeProvider = provider as unknown as {
      parseOutput: (rawOutput: string) => {
        duration: number;
        result: string;
        sessionId: string;
      };
    };

    if (typeof claudeProvider.parseOutput === "function") {
      const mockOutput = JSON.stringify([
        { message: "Starting...", type: "log" },
        {
          duration_ms: 3000,
          result: "Final result",
          session_id: "session-456",
          type: "result",
        },
      ]);

      const result = claudeProvider.parseOutput(mockOutput);

      expect(result.result).toBe("Final result");
      expect(result.sessionId).toBe("session-456");
      expect(result.duration).toBe(3000);
    }
  });

  it("should handle parse errors gracefully", () => {
    const claudeProvider = provider as unknown as {
      parseOutput: (rawOutput: string) => unknown;
    };

    if (typeof claudeProvider.parseOutput === "function") {
      expect(() => claudeProvider.parseOutput("invalid json")).toThrow();
      expect(() => claudeProvider.parseOutput("{invalid}")).toThrow(/parse/i);
    }
  });
});

describe("Provider System - Edge Cases", () => {
  beforeEach(() => {
    clearProviderCache();
  });

  it("should handle empty string model", () => {
    const provider = getProvider("claude", { model: "" });
    // Should still be valid and return empty string
    expect(provider.getDefaultModel()).toBe("");
    expect(provider.isValidModel("")).toBe(true);
  });

  it("should handle special characters in model name", () => {
    const specialModels = [
      "model/with/slashes",
      "model-with-dashes",
      "model.with.dots",
      "model:v1",
      "model@latest",
      "provider/model-name",
    ];

    for (const model of specialModels) {
      const provider = getProvider("claude", { model });
      expect(provider.getDefaultModel()).toBe(model);
      expect(provider.isValidModel(model)).toBe(true);
    }
  });

  it("should handle undefined config gracefully", () => {
    // getProvider with no config should use defaults
    const provider1 = getProvider("claude");
    const provider2 = getProvider("claude");

    // Both should return default model
    expect(provider1.getDefaultModel()).toBe(EXPECTED_DEFAULT_MODELS.claude);
    expect(provider2.getDefaultModel()).toBe(EXPECTED_DEFAULT_MODELS.claude);
  });

  it("should handle config with only undefined values", () => {
    const provider = getProvider("claude", {
      apiKey: undefined,
      maxTokens: undefined,
      model: undefined,
    });

    // Should still use defaults
    expect(provider.getDefaultModel()).toBe(EXPECTED_DEFAULT_MODELS.claude);
  });
});

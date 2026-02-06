# Multi-Provider CLI Testing Strategy Report

## Executive Summary

This report outlines testing strategies for a multi-provider CLI abstraction layer that supports Claude, OpenCode, Codex, Gemini, and Pi without requiring all CLI binaries to be installed during testing.

## 1. Mocking Strategies for CLI Subprocess Invocations

### 1.1 Bun.spawn Mocking Approach

Since the codebase uses `Bun.spawn()` and `Bun.spawnSync()`, we have several options:

#### Option A: Module-Level Mock with `mock.module()`

```typescript
// tests/__mocks__/bun-mock.ts
import { mock } from "bun:test";

export const createMockSpawn = () => {
  const calls: Array<{ cmd: string[]; options?: unknown }> = [];

  const mockSpawn = mock((cmd: string[], options?: object) => {
    calls.push({ cmd, options });
    return {
      pid: 12345,
      exitCode: 0,
      signalCode: null,
      stdout: new ReadableStream(),
      stderr: new ReadableStream(),
      exited: Promise.resolve(0),
      kill: mock(),
    };
  });

  return { mockSpawn, calls };
};
```

**Pros:** Direct replacement of Bun APIs  
**Cons:** Complex due to Bun.spawn's streaming nature

#### Option B: Wrapper Pattern (RECOMMENDED)

Create an abstraction layer that can be easily mocked:

```typescript
// src/lib/providers/spawner.ts
export interface SpawnResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  signalCode: string | null;
}

export interface Spawner {
  spawn(cmd: string[], options?: SpawnOptions): Promise<SpawnResult>;
  spawnSync(cmd: string[], options?: SpawnOptions): SpawnResult;
}

export class BunSpawner implements Spawner {
  spawn(cmd: string[], options?: SpawnOptions): Promise<SpawnResult> {
    const proc = Bun.spawn(cmd, { ...options, stdout: "pipe", stderr: "pipe" });
    // ... implementation
  }

  spawnSync(cmd: string[], options?: SpawnOptions): SpawnResult {
    const proc = Bun.spawnSync(cmd, {
      ...options,
      stdout: "pipe",
      stderr: "pipe",
    });
    // ... implementation
  }
}

// Test double
export class MockSpawner implements Spawner {
  private mocks = new Map<string, SpawnResult>();
  calls: Array<{ cmd: string[]; options?: SpawnOptions }> = [];

  mockCommand(pattern: RegExp, result: SpawnResult) {
    this.mocks.set(pattern.source, result);
  }

  spawn(cmd: string[], options?: SpawnOptions): Promise<SpawnResult> {
    this.calls.push({ cmd, options });
    return Promise.resolve(this.findResult(cmd));
  }

  private findResult(cmd: string[]): SpawnResult {
    const key = [...this.mocks.keys()].find((k) =>
      new RegExp(k).test(cmd.join(" ")),
    );
    return key
      ? this.mocks.get(key)!
      : { exitCode: 0, stdout: "", stderr: "", signalCode: null };
  }
}
```

**Usage in provider abstraction:**

```typescript
// src/lib/providers/base-provider.ts
import { Spawner } from "./spawner";

export abstract class BaseProvider {
  constructor(protected spawner: Spawner) {}

  abstract isAvailable(): Promise<boolean>;
  abstract execute(
    prompt: string,
    options: ProviderOptions,
  ): Promise<ProviderResult>;
}
```

### 1.2 Provider Availability Testing

Test provider discovery without binaries:

```typescript
// tests/lib/providers/provider-discovery.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { MockSpawner } from "@tools/lib/providers/spawner";
import { ProviderRegistry } from "@tools/lib/providers/registry";

describe("Provider Discovery", () => {
  let spawner: MockSpawner;
  let registry: ProviderRegistry;

  beforeEach(() => {
    spawner = new MockSpawner();
    registry = new ProviderRegistry(spawner);
  });

  test("discovers available providers from PATH", async () => {
    spawner.mockCommand(/which opencode/, {
      exitCode: 0,
      stdout: "/usr/bin/opencode",
      stderr: "",
      signalCode: null,
    });
    spawner.mockCommand(/which claude/, {
      exitCode: 1,
      stdout: "",
      stderr: "not found",
      signalCode: null,
    });

    const available = await registry.discover();

    expect(available).toContain("opencode");
    expect(available).not.toContain("claude");
  });
});
```

## 2. JSON Parsing Logic Testing

### 2.1 Pure Function Approach

Separate parsing from CLI invocation:

```typescript
// src/lib/providers/response-parser.ts
export interface ParsedResponse {
  content: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export function parseProviderOutput(
  provider: string,
  stdout: string,
  stderr: string,
): ParsedResponse {
  // Provider-specific parsing logic
  switch (provider) {
    case "claude":
      return parseClaudeOutput(stdout, stderr);
    case "opencode":
      return parseOpencodeOutput(stdout, stderr);
    // ... etc
  }
}

// Pure function - easily testable
function parseClaudeOutput(stdout: string, stderr: string): ParsedResponse {
  try {
    const json = JSON.parse(stdout);
    return { content: json.content || json.response || json };
  } catch {
    return { content: stdout, error: stderr || undefined };
  }
}
```

### 2.2 Test Suite for Parsers

```typescript
// tests/lib/providers/response-parser.test.ts
import { describe, test, expect } from "bun:test";
import { parseProviderOutput } from "@tools/lib/providers/response-parser";

describe("parseProviderOutput", () => {
  describe("Claude", () => {
    test("parses JSON response", () => {
      const result = parseProviderOutput("claude", '{"content": "Hello"}', "");
      expect(result.content).toBe("Hello");
    });

    test("handles plain text fallback", () => {
      const result = parseProviderOutput("claude", "Plain response", "");
      expect(result.content).toBe("Plain response");
    });

    test("captures stderr as error", () => {
      const result = parseProviderOutput("claude", "", "Error message");
      expect(result.error).toBe("Error message");
    });
  });

  describe("OpenCode", () => {
    test("parses streaming JSON format", () => {
      const input = '{"type": "chunk", "data": "Hello"}\n{"type": "end"}';
      const result = parseProviderOutput("opencode", input, "");
      expect(result.content).toContain("Hello");
    });
  });

  // Provider-specific test cases with fixtures
  describe.each([
    ["claude", "./fixtures/claude-responses.json"],
    ["opencode", "./fixtures/opencode-responses.json"],
    ["codex", "./fixtures/codex-responses.json"],
    ["gemini", "./fixtures/gemini-responses.json"],
    ["pi", "./fixtures/pi-responses.json"],
  ])("%s fixtures", (provider, fixturePath) => {
    const fixtures = await import(fixturePath);

    test.each(fixtures.cases)("parses: $name", ({ input, expected }) => {
      const result = parseProviderOutput(provider, input.stdout, input.stderr);
      expect(result).toEqual(expected);
    });
  });
});
```

### 2.3 Fixture Files Structure

```json
// tests/fixtures/claude-responses.json
{
  "cases": [
    {
      "name": "simple text response",
      "input": { "stdout": "Hello, how can I help?", "stderr": "" },
      "expected": {
        "content": "Hello, how can I help?",
        "metadata": null,
        "error": null
      }
    },
    {
      "name": "JSON wrapped response",
      "input": {
        "stdout": "{\"content\": \"Hello\", \"metadata\": {\"tokens\": 42}}",
        "stderr": ""
      },
      "expected": {
        "content": "Hello",
        "metadata": { "tokens": 42 },
        "error": null
      }
    }
  ]
}
```

## 3. Conditional Provider-Specific Test Suites

### 3.1 Runtime Detection Pattern

```typescript
// tests/lib/providers/conditional-test.ts
import { test, describe } from "bun:test";
import { providerAvailable } from "./test-helpers";

// Conditional test wrapper
export const testIfAvailable = (provider: string) => {
  const available = await providerAvailable(provider);
  return {
    describe: available ? describe : describe.skip,
    test: available ? test : test.skip,
  };
};

// Bun's built-in conditional test support
test.if(process.env.TEST_PROVIDERS === "all")(
  "integration with real CLI",
  async () => {
    // Only runs when explicitly requested
  },
);

describe.skipIf(process.env.CI)("Local provider tests", () => {
  // Skip in CI if binaries not available
});
```

### 3.2 Tiered Test Configuration

```typescript
// bunfig.toml
[test]
# Preload test utilities
preload = ["./tests/setup.ts"]

# Environment-specific test tags
tags = ["unit", "integration", "e2e"]
```

```typescript
// tests/setup.ts
import { beforeAll } from "bun:test";

// Detect available providers at test start
beforeAll(async () => {
  const providers = ["claude", "opencode", "codex", "gemini", "pi"];
  const available = [];

  for (const provider of providers) {
    try {
      await $`which ${provider}`.quiet();
      available.push(provider);
    } catch {
      // Not available
    }
  }

  // Store for conditional tests
  globalThis.AVAILABLE_PROVIDERS = available;
  console.log(`Detected providers: ${available.join(", ") || "none"}`);
});
```

### 3.3 Test File Organization

```
tests/
├── lib/
│   └── providers/
│       ├── response-parser.test.ts      # Unit: Always runs
│       ├── provider-registry.test.ts    # Unit: Always runs (with mocks)
│       ├── cli-builder.test.ts          # Unit: Always runs
│       └── __integration__/             # Integration: Conditional
│           ├── claude.integration.test.ts
│           ├── opencode.integration.test.ts
│           └── codex.integration.test.ts
├── fixtures/
│   └── providers/
│       ├── claude-responses.json
│       ├── opencode-responses.json
│       ├── codex-responses.json
│       ├── gemini-responses.json
│       └── pi-responses.json
└── setup.ts
```

## 4. Recording/Replay Patterns

### 4.1 VCR-Style Recording for CLI

```typescript
// src/lib/testing/record-replay.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface RecordedInteraction {
  timestamp: number;
  command: string[];
  env: Record<string, string>;
  stdin?: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export class CLIRecorder {
  private recordingsDir: string;
  private mode: "record" | "replay" | "passthrough";

  constructor(options: {
    recordingsDir: string;
    mode: "record" | "replay" | "passthrough";
  }) {
    this.recordingsDir = options.recordingsDir;
    this.mode = options.mode;
    mkdirSync(recordingsDir, { recursive: true });
  }

  async record(
    name: string,
    fn: () => Promise<RecordedInteraction>,
  ): Promise<RecordedInteraction> {
    const path = join(this.recordingsDir, `${name}.json`);

    if (this.mode === "replay" && existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf8"));
    }

    const interaction = await fn();

    if (this.mode === "record") {
      writeFileSync(path, JSON.stringify(interaction, null, 2));
    }

    return interaction;
  }

  hashCommand(cmd: string[]): string {
    // Deterministic hash for matching
    return cmd
      .join(" ")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "");
  }
}
```

### 4.2 Recording Usage in Tests

```typescript
// tests/lib/providers/recorded.test.ts
import { describe, test, expect, beforeAll } from "bun:test";
import { CLIRecorder } from "@tools/lib/testing/record-replay";
import { BunSpawner } from "@tools/lib/providers/spawner";

describe("Provider Interactions (Recorded)", () => {
  let recorder: CLIRecorder;
  let spawner: BunSpawner;

  beforeAll(() => {
    const mode =
      (process.env.RECORD_MODE as "record" | "replay" | "passthrough") ||
      "replay";
    recorder = new CLIRecorder({ recordingsDir: "./tests/recordings", mode });
    spawner = new BunSpawner();
  });

  test.each(["claude", "opencode", "codex"])(
    "%s help command",
    async (provider) => {
      const interaction = await recorder.record(
        `${provider}_help`,
        async () => {
          const start = performance.now();
          const result = await spawner.spawn([provider, "--help"]);
          const duration = performance.now() - start;

          return {
            timestamp: Date.now(),
            command: [provider, "--help"],
            env: {},
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode ?? 0,
            duration,
          };
        },
      );

      expect(interaction.exitCode).toBe(0);
      expect(interaction.stdout).toContain("Usage");
    },
  );
});
```

### 4.3 Recording Management

```bash
# Record new interactions
RECORD_MODE=record bun test tests/lib/providers/recorded.test.ts

# Replay recorded interactions (default)
bun test tests/lib/providers/recorded.test.ts

# Passthrough to real CLIs
RECORD_MODE=passthrough bun test tests/lib/providers/recorded.test.ts

# CI uses replay mode (no binaries needed)
bun test
```

## 5. Provider Selection Logic Testing

### 5.1 Selection Strategy Pattern

```typescript
// src/lib/providers/selector.ts
export interface SelectionStrategy {
  select(candidates: ProviderInfo[]): ProviderInfo | null;
}

export class PriorityStrategy implements SelectionStrategy {
  constructor(private priority: string[]) {}

  select(candidates: ProviderInfo[]): ProviderInfo | null {
    for (const preferred of this.priority) {
      const match = candidates.find((c) => c.name === preferred && c.available);
      if (match) return match;
    }
    return candidates.find((c) => c.available) || null;
  }
}

export class FastestStrategy implements SelectionStrategy {
  async select(candidates: ProviderInfo[]): Promise<ProviderInfo | null> {
    const available = candidates.filter((c) => c.available);
    // Benchmark each provider
    // Return fastest
    return available[0] || null;
  }
}
```

### 5.2 Test Suite for Selection Logic

```typescript
// tests/lib/providers/selector.test.ts
import { describe, test, expect } from "bun:test";
import {
  PriorityStrategy,
  FastestStrategy,
} from "@tools/lib/providers/selector";

describe("PriorityStrategy", () => {
  test("selects highest priority available provider", () => {
    const strategy = new PriorityStrategy(["claude", "opencode", "codex"]);
    const candidates = [
      { name: "codex", available: true, version: "1.0" },
      { name: "opencode", available: true, version: "1.0" },
    ];

    const selected = strategy.select(candidates);
    expect(selected?.name).toBe("opencode"); // Second priority, first available
  });

  test("returns null when none available", () => {
    const strategy = new PriorityStrategy(["claude", "opencode"]);
    const candidates = [
      { name: "claude", available: false, version: "1.0" },
      { name: "opencode", available: false, version: "1.0" },
    ];

    expect(strategy.select(candidates)).toBeNull();
  });

  test("selects first available when none in priority list", () => {
    const strategy = new PriorityStrategy(["claude"]);
    const candidates = [{ name: "pi", available: true, version: "1.0" }];

    expect(strategy.select(candidates)?.name).toBe("pi");
  });
});

describe("Selection with Fallback Chain", () => {
  test("falls through priority chain correctly", () => {
    const priority = ["gemini", "claude", "opencode", "codex", "pi"];
    const strategy = new PriorityStrategy(priority);

    const testCases = [
      {
        candidates: [
          { name: "pi", available: true },
          { name: "codex", available: true },
        ],
        expected: "codex",
      },
      {
        candidates: [
          { name: "pi", available: true },
          { name: "gemini", available: true },
        ],
        expected: "gemini",
      },
      { candidates: [{ name: "pi", available: true }], expected: "pi" },
    ];

    testCases.forEach(({ candidates, expected }) => {
      const selected = strategy.select(candidates as ProviderInfo[]);
      expect(selected?.name).toBe(expected);
    });
  });
});
```

### 5.3 Configuration-Driven Testing

```typescript
// tests/lib/providers/selector-config.test.ts
describe("Provider Selection from Config", () => {
  test("reads priority from environment", () => {
    process.env.PROVIDER_PRIORITY = "opencode,codex,claude";

    const priority = parseProviderPriority(process.env.PROVIDER_PRIORITY);
    expect(priority).toEqual(["opencode", "codex", "claude"]);
  });

  test("uses default priority when env not set", () => {
    delete process.env.PROVIDER_PRIORITY;

    const priority = getDefaultPriority();
    expect(priority).toEqual(["claude", "opencode", "codex", "gemini", "pi"]);
  });

  test("excludes unavailable providers from selection", () => {
    const available = ["opencode", "pi"];
    const priority = ["claude", "opencode", "codex", "gemini", "pi"];

    const valid = priority.filter((p) => available.includes(p));
    expect(valid).toEqual(["opencode", "pi"]);
  });
});
```

## 6. Bun Testing Patterns for Subprocess Mocking

### 6.1 Complete Mock Pattern

```typescript
// tests/lib/providers/complete-mock.test.ts
import { describe, test, expect, mock, beforeEach } from "bun:test";

describe("Provider with Complete Bun.spawn Mock", () => {
  let spawnMock: ReturnType<typeof mock>;

  beforeEach(() => {
    // Reset mocks before each test
    spawnMock = mock((cmd: string[], options?: object) => {
      // Default mock behavior
      return {
        exitCode: 0,
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(Buffer.from('{"response": "mocked"}'));
            controller.close();
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
        exited: Promise.resolve(0),
        kill: mock(),
      };
    });

    // Replace Bun.spawn
    mock.module("bun", () => ({
      ...Bun,
      spawn: spawnMock,
      spawnSync: mock((cmd: string[], options?: object) => ({
        exitCode: 0,
        stdout: Buffer.from('{"response": "mocked"}'),
        stderr: Buffer.from(""),
      })),
    }));
  });

  test("provider delegates to Bun.spawn correctly", async () => {
    const provider = new OpenCodeProvider();
    await provider.execute("test prompt");

    expect(spawnMock).toHaveBeenCalled();
    const call = spawnMock.mock.calls[0];
    expect(call[0]).toContain("opencode");
  });
});
```

### 6.2 Dependency Injection Pattern (PREFERRED)

```typescript
// src/lib/providers/opencode.ts
export class OpenCodeProvider extends BaseProvider {
  constructor(spawner: Spawner = new BunSpawner()) {
    super(spawner);
  }

  async isAvailable(): Promise<boolean> {
    const result = await this.spawner.spawn(["which", "opencode"]);
    return result.exitCode === 0;
  }

  async execute(prompt: string): Promise<ProviderResult> {
    const result = await this.spawner.spawn(["opencode", "--json", prompt]);

    return parseProviderOutput("opencode", result.stdout, result.stderr);
  }
}
```

```typescript
// tests/lib/providers/opencode.test.ts
import { describe, test, expect } from "bun:test";
import { OpenCodeProvider } from "@tools/lib/providers/opencode";
import { MockSpawner } from "@tools/lib/providers/spawner";

describe("OpenCodeProvider", () => {
  test("detects availability from PATH", async () => {
    const spawner = new MockSpawner();
    spawner.mockCommand(/which opencode/, {
      exitCode: 0,
      stdout: "/usr/bin/opencode",
      stderr: "",
      signalCode: null,
    });

    const provider = new OpenCodeProvider(spawner);
    expect(await provider.isAvailable()).toBe(true);
  });

  test("handles missing binary", async () => {
    const spawner = new MockSpawner();
    spawner.mockCommand(/which opencode/, {
      exitCode: 1,
      stdout: "",
      stderr: "not found",
      signalCode: null,
    });

    const provider = new OpenCodeProvider(spawner);
    expect(await provider.isAvailable()).toBe(false);
  });

  test("executes with correct arguments", async () => {
    const spawner = new MockSpawner();
    spawner.mockCommand(/opencode --json/, {
      exitCode: 0,
      stdout: '{"content": "Hello"}',
      stderr: "",
      signalCode: null,
    });

    const provider = new OpenCodeProvider(spawner);
    const result = await provider.execute("test prompt");

    expect(result.content).toBe("Hello");
    expect(spawner.calls[0].cmd).toEqual(["opencode", "--json", "test prompt"]);
  });
});
```

### 6.3 Snapshot Testing for CLI Output

```typescript
// tests/lib/providers/snapshot.test.ts
import { describe, test, expect } from "bun:test";
import { formatProviderResponse } from "@tools/lib/providers/formatters";

describe("Provider Output Formatting", () => {
  test.each([
    ["claude", { content: "Hello", metadata: { tokens: 42 } }],
    ["opencode", { content: "Hello", metadata: { model: "k2.5" } }],
    [
      "codex",
      { content: "Hello", usage: { prompt_tokens: 10, completion_tokens: 5 } },
    ],
  ])("%s response formatting", (provider, response) => {
    const formatted = formatProviderResponse(provider, response);
    expect(formatted).toMatchSnapshot(`${provider}-response`);
  });
});
```

## 7. Testing Architecture Recommendations

### 7.1 Recommended Architecture

```
src/lib/providers/
├── spawner.ts              # Abstraction layer
├── bun-spawner.ts          # Real implementation
├── base-provider.ts        # Abstract provider class
├── registry.ts             # Provider discovery
├── selector.ts             # Selection strategies
├── response-parser.ts      # Parsing logic
├── formatters.ts           # Output formatting
├── opencode.ts             # OpenCode provider
├── claude.ts               # Claude provider
├── codex.ts                # Codex provider
├── gemini.ts               # Gemini provider
└── pi.ts                   # Pi provider

tests/
├── lib/providers/          # Unit tests (always run)
│   ├── spawner.test.ts
│   ├── registry.test.ts
│   ├── selector.test.ts
│   └── response-parser.test.ts
├── fixtures/providers/     # Provider response fixtures
├── recordings/             # VCR recordings
└── integration/            # Integration tests (conditional)
    └── providers.test.ts
```

### 7.2 Implementation Priority

1. **Phase 1: Abstraction Layer** (Week 1)
   - Create `Spawner` interface
   - Implement `BunSpawner`
   - Create `MockSpawner` for tests
   - Refactor existing code to use abstraction

2. **Phase 2: Parser Testing** (Week 1-2)
   - Separate parsing logic
   - Create fixture files for each provider
   - Implement comprehensive parser tests

3. **Phase 3: Provider Abstraction** (Week 2)
   - Create `BaseProvider` class
   - Implement one provider (e.g., OpenCode)
   - Full test coverage with mocks

4. **Phase 4: Selection Logic** (Week 3)
   - Implement selection strategies
   - Configuration-driven priority
   - Comprehensive unit tests

5. **Phase 5: Recording System** (Week 3-4)
   - Implement VCR-style recording
   - Record interactions for CI
   - Documentation for updating recordings

6. **Phase 6: Integration Tests** (Week 4)
   - Conditional integration tests
   - CI configuration
   - Developer documentation

### 7.3 CI/CD Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2

      - name: Run unit tests
        run: bun test tests/lib/
        env:
          RECORD_MODE: replay

  integration-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2

      - name: Install providers
        run: |
          npm install -g @anthropic-ai/claude-cli
          npm install -g @opencode-ai/opencode
          # ... etc

      - name: Run integration tests
        run: bun test tests/integration/
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          # ... etc
```

### 7.4 Test Commands

```json
// package.json
{
  "scripts": {
    "test": "bun test",
    "test:unit": "bun test tests/lib/",
    "test:integration": "bun test tests/integration/",
    "test:record": "RECORD_MODE=record bun test tests/recorded/",
    "test:ci": "RECORD_MODE=replay bun test"
  }
}
```

## Summary

This architecture provides:

1. **100% test coverage** without requiring any CLI binaries
2. **Fast unit tests** with dependency injection and mocks
3. **Realistic integration tests** using recording/replay
4. **Conditional testing** for developers with specific CLIs
5. **CI/CD friendly** - runs with recordings, no API keys needed
6. **Maintainable** - clear separation of concerns, well-documented patterns

The key insight is to abstract subprocess invocation behind an interface, enabling easy mocking while keeping the ability to run against real CLIs when available.

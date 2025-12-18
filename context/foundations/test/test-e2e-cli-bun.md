---
depends: []
---

# E2E CLI Testing

Patterns for testing CLI commands end-to-end using `bun:test` + `execa`.

## Why This Is a Mess

This document uses a mix of Bun-native and Node APIs. Here's why:

| Need            | Ideal (Bun-native)    | Reality                        |
| --------------- | --------------------- | ------------------------------ |
| File matching   | `Bun.Glob` ✓          | Works great                    |
| Read files      | `Bun.file().text()`   | Async-only, can't use in hooks |
| Write files     | `Bun.write()`         | Async-only, can't use in hooks |
| Check existence | `Bun.file().exists()` | Async-only, can't use in hooks |
| Directory paths | `import.meta.dir` ✓   | Works great                    |

**The problem:** Bun's test runner has bugs with async lifecycle hooks:

- [#19660](https://github.com/oven-sh/bun/issues/19660): Async tests may run concurrently instead of sequentially
- [#21830](https://github.com/oven-sh/bun/issues/21830): `beforeAll` in nested describes runs at wrong time

**The workaround:** Use sync fs operations in hooks. But Bun's native file APIs are async-only, so we fall back to `node:fs` for sync operations.

This is pragmatic, not principled. Revisit when those issues are closed.

## Setup

```typescript
import {
  describe,
  expect,
  test,
  beforeAll,
  beforeEach,
  afterEach,
} from "bun:test";
import { execa } from "execa";

// Bun-native: no equivalent in Node
// Used for: directory resolution, file matching
// import.meta.dir - Bun-only, returns directory as string

// Node fallback: needed because Bun.file() is async-only
// Used for: sync operations in lifecycle hooks (workaround for Bun bugs)
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
```

## Basic Command Tests

```typescript
describe("my-cmd CLI", () => {
  test("--help shows usage", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "src/cli.ts",
      "--help",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
  });

  test("missing arg fails", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "src/cli.ts", "my-cmd"],
      { reject: false } // Don't throw on non-zero exit
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("missing required argument");
  });
});
```

## Auth/API Key Checks

```typescript
function hasApiKey(): boolean {
  return process.env.MY_API_KEY !== undefined && process.env.MY_API_KEY !== "";
}

describe("my-cmd E2E", () => {
  beforeAll(() => {
    if (!hasApiKey()) {
      throw new Error(
        "API key required.\n\n" +
          "Get key at: https://example.com\n" +
          "Then: export MY_API_KEY=your-key\n"
      );
    }
  });
  // ...tests
});
```

## File Output Validation

```typescript
interface CommandOutput {
  items: Array<{ id: string; name: string }>;
  metadata?: { generatedAt: string };
}

const TEST_TIMEOUT_MS = 120_000;
// Allow 10s buffer for test framework overhead (assertions, cleanup)
const COMMAND_TIMEOUT_MS = TEST_TIMEOUT_MS - 10_000;

describe("my-cmd E2E", () => {
  const createdFiles: Array<string> = [];

  // SYNC REQUIRED: Bun bug #19660 - async hooks may not complete before test runs
  afterEach(() => {
    const files = [...createdFiles];
    createdFiles.length = 0;
    for (const f of files) {
      try {
        rmSync(f, { force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test(
    "creates valid output files",
    async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "src/cli.ts", "my-cmd", "query"],
        { reject: false, timeout: COMMAND_TIMEOUT_MS }
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Done!");

      // Bun-native glob (no npm package needed)
      const glob = new Bun.Glob("output/raw/*.json");
      const jsonFiles = Array.from(glob.scanSync(".")).sort().reverse();
      expect(jsonFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles.at(0)!;
      createdFiles.push(jsonFile);

      // Using node:fs because we need sync in afterEach anyway
      // Could use Bun.file().exists() here, but keeping consistent
      expect(existsSync(jsonFile)).toBe(true);

      // node:fs sync - could use `await Bun.file(jsonFile).json()` here
      // but staying consistent with sync approach
      const content = readFileSync(jsonFile, "utf8");
      const data: CommandOutput = JSON.parse(content);
      expect(data).toHaveProperty("items");
      expect(Array.isArray(data.items)).toBe(true);
    },
    TEST_TIMEOUT_MS
  );
});
```

## Temp Directory Pattern

```typescript
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("my-cmd E2E", () => {
  let tempDir = "";

  // SYNC REQUIRED: Bun bug #19660, #21830
  // Cannot use async mkdir here - test body may start before it completes
  beforeEach(() => {
    tempDir = join(
      tmpdir(),
      `test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (tempDir !== "" && existsSync(tempDir)) {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  test("does something with temp files", async () => {
    // tempDir is guaranteed to exist here (because sync)
  });
});
```

## Environment Override

```typescript
test("shows error without API key", async () => {
  const { exitCode, stdout } = await execa(
    "bun",
    ["run", "src/cli.ts", "my-cmd", "--query", "test"],
    {
      env: { ...process.env, MY_API_KEY: "" },
      reject: false,
    }
  );
  expect(exitCode).toBe(1);
  expect(stdout).toContain("API key required");
});
```

## Working Directory

Tests may run from different directories. Set explicit `cwd` to ensure consistency:

```typescript
import { getProjectRoot } from "@tools/utils/paths.js";

const PROJECT_ROOT = getProjectRoot();

// Ensures test works regardless of cwd
await execa("bun", ["run", "src/cli.ts", "my-cmd", "arg"], {
  cwd: PROJECT_ROOT,
});
```

Implementation of `getProjectRoot()` is outside the scope of this document — typically it walks up the directory tree looking for a marker like `package.json` or `.git`.

## Patterns Summary

| Pattern                       | Usage                               |
| ----------------------------- | ----------------------------------- |
| `{ reject: false }`           | Test expected failures              |
| `timeout: COMMAND_TIMEOUT_MS` | Long-running commands (with buffer) |
| `createdFiles` array          | Track files for cleanup             |
| `Bun.Glob`                    | Native file matching                |
| `import.meta.dir`             | Bun-native directory path           |
| `node:fs` sync ops            | Workaround for Bun async hook bugs  |
| `beforeAll` auth check        | Fail fast with helpful message      |
| `afterEach` cleanup           | Remove test artifacts               |

## Alternatives

If this hybrid approach bothers you:

- **Vitest**: Mature async handling, same Jest-like API, can still run on Bun runtime
- **Wait**: These Bun bugs may be fixed soon, then go full Bun-native
- **Inline setup**: Skip hooks entirely, do setup/teardown in each test body

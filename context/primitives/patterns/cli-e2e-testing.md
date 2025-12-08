---
depends: []
---

# E2E CLI Testing

Patterns for testing CLI commands end-to-end using `bun:test` + `execa`.

## Setup

```typescript
import { describe, expect, test, beforeAll, afterEach } from "bun:test";
import { execa } from "execa";
import { glob } from "glob";
import { access, readFile, rm } from "node:fs/promises";
```

## Basic Command Tests

```typescript
describe("my-cmd CLI", () => {
  test("--help shows usage", async () => {
    const { exitCode, stdout } = await execa("bun", ["run", "dev", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
  });

  test("missing arg fails", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "my-cmd"],
      { reject: false }  // Don't throw on non-zero exit
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
const TIMEOUT_MS = 120_000;

describe("my-cmd E2E", () => {
  const createdFiles: Array<string> = [];

  afterEach(async () => {
    const files = [...createdFiles];
    createdFiles.length = 0;
    await Promise.all(files.map(f => rm(f, { force: true }).catch(() => {})));
  });

  test("creates valid output files", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "my-cmd", "query"],
      { reject: false, timeout: TIMEOUT_MS - 10_000 }
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Done!");

    // Find created files
    const jsonFiles = (await glob("output/raw/*.json")).sort().reverse();
    expect(jsonFiles.length).toBeGreaterThan(0);

    const jsonFile = jsonFiles.at(0)!;
    createdFiles.push(jsonFile);

    // Validate exists
    await access(jsonFile);

    // Validate structure
    const content = await readFile(jsonFile, "utf8");
    const data = JSON.parse(content) as { items?: Array<unknown> };
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
  }, TIMEOUT_MS);
});
```

## Environment Override

```typescript
test("shows error without API key", async () => {
  const { exitCode, stdout } = await execa(
    "bun",
    ["run", "dev", "my-cmd", "--query", "test"],
    {
      env: { ...process.env, MY_API_KEY: "" },
      reject: false,
    }
  );
  expect(exitCode).toBe(1);
  expect(stdout).toContain("API key required");
});
```

## Patterns Summary

| Pattern | Usage |
|---------|-------|
| `{ reject: false }` | Test expected failures |
| `timeout: TIMEOUT_MS` | Long-running commands |
| `createdFiles` array | Track for cleanup |
| `glob().sort().reverse()` | Get most recent file |
| `beforeAll` auth check | Fail fast with helpful msg |
| `afterEach` cleanup | Remove test artifacts |

## Working Directory

Tests may be run from repo root or `tools/`. To ensure `bun run dev` works regardless of cwd, set explicit `cwd` on execa calls:

```typescript
import { getProjectRoot } from "@tools/utils/paths.js";
import { join } from "node:path";

const TOOLS_DIR = join(getProjectRoot(), "tools");

// Then in tests:
await execa("bun", ["run", "dev", "my-cmd", "arg"], { cwd: TOOLS_DIR });
```

## Async Hooks Gotcha

Bun runs test files in parallel. When using `beforeEach`/`afterEach` with async operations like `mkdir()`, a race condition can occur where the test body starts before the hook completes.

**Symptom**: Tests pass in isolation but fail with `ENOENT` when running the full suite.

**Solution**: Use synchronous fs operations in hooks:

```typescript
import { existsSync, mkdirSync, rmSync } from "node:fs";

describe("my-cmd E2E", () => {
  let tempDir = "";

  // Use sync operations to avoid race conditions
  beforeEach(() => {
    tempDir = join(tmpdir(), `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (tempDir !== "" && existsSync(tempDir)) {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});
```

**Why**: Sync operations block until complete, guaranteeing the directory exists before any test code runs. Async hooks may not fully complete before Bun starts executing the test body in parallel scenarios.

## File Location

Tests go in `tools/tests/e2e/<command>.test.ts`

Run: `bun test tools/tests/e2e/`

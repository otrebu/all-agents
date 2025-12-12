---
depends: []
---

# E2E CLI Testing

Patterns for testing CLI commands end-to-end using Vitest and execa.

## Setup

```typescript
import {
  describe,
  expect,
  test,
  beforeAll,
  beforeEach,
  afterEach,
} from "vitest";
import { execa } from "execa";
import { access, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { glob } from "glob";

// tsx runs TypeScript directly without a build step
const TSX = "tsx";
```

## Basic Command Tests

```typescript
describe("my-cmd CLI", () => {
  test("--help shows usage", async () => {
    const { exitCode, stdout } = await execa(TSX, ["src/cli.ts", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
  });

  test("missing arg fails", async () => {
    const { exitCode, stderr } = await execa(TSX, ["src/cli.ts", "my-cmd"], {
      reject: false,
    });
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
const COMMAND_TIMEOUT_MS = TEST_TIMEOUT_MS - 10_000;

describe("my-cmd E2E", () => {
  const createdFiles: Array<string> = [];

  afterEach(async () => {
    const files = [...createdFiles];
    createdFiles.length = 0;
    await Promise.all(files.map((f) => rm(f, { force: true }).catch(() => {})));
  });

  test(
    "creates valid output files",
    async () => {
      const { exitCode, stdout } = await execa(
        TSX,
        ["src/cli.ts", "my-cmd", "query"],
        { reject: false, timeout: COMMAND_TIMEOUT_MS }
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Done!");

      const jsonFiles = (await glob("output/raw/*.json")).sort().reverse();
      expect(jsonFiles.length).toBeGreaterThan(0);

      const jsonFile = jsonFiles.at(0)!;
      createdFiles.push(jsonFile);

      await access(jsonFile);

      const content = await readFile(jsonFile, "utf8");
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
describe("my-cmd E2E", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = join(
      tmpdir(),
      `test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    if (tempDir !== "") {
      await rm(tempDir, { force: true, recursive: true }).catch(() => {});
    }
  });

  test("does something with temp files", async () => {
    // tempDir exists
  });
});
```

## Environment Override

```typescript
test("shows error without API key", async () => {
  const { exitCode, stdout } = await execa(
    TSX,
    ["src/cli.ts", "my-cmd", "--query", "test"],
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

await execa(TSX, ["src/cli.ts", "my-cmd", "arg"], { cwd: PROJECT_ROOT });
```

Implementation of `getProjectRoot()` is outside the scope of this document — typically it walks up the directory tree looking for a marker like `package.json` or `.git`.

## Patterns Summary

| Pattern                       | Usage                          |
| ----------------------------- | ------------------------------ |
| `{ reject: false }`           | Test expected failures         |
| `timeout: COMMAND_TIMEOUT_MS` | Long-running commands          |
| `createdFiles` array          | Track files for cleanup        |
| `beforeAll` auth check        | Fail fast with helpful message |
| `afterEach` cleanup           | Remove test artifacts          |

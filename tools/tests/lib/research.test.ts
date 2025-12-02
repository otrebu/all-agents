import { saveResearchOutput } from "@lib/research";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  setSystemTime,
  test,
} from "bun:test";

// Mock fs
void mock.module("node:fs/promises", () => ({
  mkdir: mock(async () => {}),
  writeFile: mock(async () => {}),
}));

// Mock format utility
void mock.module("../../lib/format", () => ({
  default: (s: string) => s.replaceAll(/\s+/g, "-").toLowerCase(),
}));

describe("saveResearchOutput", () => {
  beforeEach(() => {
    // Set a fixed date: 2025-11-20T13:45:30.000Z
    setSystemTime(new Date("2025-11-20T13:45:30.000Z"));
  });

  afterEach(() => {
    setSystemTime();
  });

  test("generates correct timestamp format YYYYMMDD-HHMMSS", async () => {
    const options = {
      markdownContent: "# Test",
      outputDir: "docs/research/test",
      rawData: { foo: "bar" },
      topic: "Test Topic",
    };

    const result = await saveResearchOutput(options);

    // Check timestamp format
    expect(result.timestamp).toBe("20251120-134530");

    // Check filenames contain the timestamp
    expect(result.jsonPath).toContain("20251120-134530");
    expect(result.mdPath).toContain("20251120-134530");

    // Check structure
    expect(result.jsonPath).toContain("raw/");
    expect(result.mdPath).not.toContain("raw/");
  });
});

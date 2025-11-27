import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { saveResearchOutput } from "../../lib/research";

// Mock fs
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

// Mock format utility
vi.mock("../../lib/format", () => ({
  default: (s: string) => s.replaceAll(/\s+/g, "-").toLowerCase(),
}));

describe("saveResearchOutput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set a fixed date: 2025-11-20T13:45:30.000Z
    const date = new Date("2025-11-20T13:45:30.000Z");
    vi.setSystemTime(date);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("generates correct timestamp format YYYYMMDD-HHMMSS", async () => {
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

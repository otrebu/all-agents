import { getContextRoot } from "@tools/utils/paths";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execa } from "execa";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

describe("download E2E", () => {
  let temporaryDirectory = "";

  beforeEach(() => {
    temporaryDirectory = join(
      tmpdir(),
      `download-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(temporaryDirectory, { recursive: true });
  });

  afterEach(() => {
    if (temporaryDirectory !== "" && existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("download --help shows usage", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "download", "--help"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Download URLs");
    expect(stdout).toContain("--output");
  });

  test("download requires at least one URL", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "download"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("missing required argument");
  });

  test("download rejects invalid URL", async () => {
    const { exitCode, stderr } = await execa(
      "bun",
      ["run", "dev", "download", "not-a-url"],
      { cwd: TOOLS_DIR, reject: false },
    );
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Invalid URL");
  });

  test("download fetches and saves content", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "download",
        "https://example.com",
        "-d",
        temporaryDirectory,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Saved to:");
    expect(stdout).toContain(temporaryDirectory);
  });

  test("download with custom output name", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      [
        "run",
        "dev",
        "download",
        "https://example.com",
        "-o",
        "my-custom-name",
        "-d",
        temporaryDirectory,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain("my-custom-name.md");
  });

  test("download multiple URLs concatenates content", async () => {
    const { exitCode } = await execa(
      "bun",
      [
        "run",
        "dev",
        "download",
        "https://example.com",
        "https://example.org",
        "-o",
        "multi",
        "-d",
        temporaryDirectory,
      ],
      { cwd: TOOLS_DIR, reject: false },
    );

    expect(exitCode).toBe(0);

    // Find the created file
    if (existsSync(temporaryDirectory)) {
      const files = readdirSync(temporaryDirectory);
      const multiFile = files.find((f) => f.includes("multi"));
      if (multiFile !== undefined) {
        const content = readFileSync(
          join(temporaryDirectory, multiFile),
          "utf8",
        );
        expect(content).toContain("## https://example.com");
        expect(content).toContain("## https://example.org");
        expect(content).toContain("---");
      }
    }
  });
});

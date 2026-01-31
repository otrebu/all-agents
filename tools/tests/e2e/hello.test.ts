import { describe, expect, test } from "bun:test";
import { execa } from "execa";

describe("aaa hello", () => {
  test("prints Hello World", async () => {
    const { exitCode, stdout } = await execa("bun", ["run", "dev", "hello"]);
    expect(exitCode).toBe(0);
    expect(stdout).toBe("Hello World");
  });

  test("--help shows description", async () => {
    const { exitCode, stdout } = await execa("bun", [
      "run",
      "dev",
      "hello",
      "--help",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Print a greeting message");
  });
});

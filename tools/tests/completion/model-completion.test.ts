import { getContextRoot } from "@tools/utils/paths";
import { describe, expect, test } from "bun:test";
import { execa } from "execa";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

// =============================================================================
// __complete model handler
// =============================================================================

describe("__complete model", () => {
  test("returns all model IDs when no --provider specified", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "__complete", "model"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    // Should contain known models from both providers
    expect(stdout).toContain("claude-sonnet-4-5");
    expect(stdout).toContain("openai/gpt-5.2-codex");
    expect(stdout).toContain("claude-haiku-4-5");
  });

  test("returns only Claude model IDs with --provider claude", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "__complete", "model", "--provider", "claude"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("claude-sonnet-4-5");
    expect(stdout).toContain("claude-haiku-4-5");
    expect(stdout).toContain("claude-opus-4-6");
    // Should NOT contain OpenCode models
    expect(stdout).not.toContain("openai/");
    expect(stdout).not.toContain("github-copilot/");
  });

  test("returns only OpenCode model IDs with --provider opencode", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "__complete", "model", "--provider", "opencode"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("openai/gpt-5.2-codex");
    expect(stdout).toContain("github-copilot/gpt-4o");
    // Should NOT contain native Claude models (non-alias)
    expect(stdout).not.toContain("claude-sonnet-4-5\t");
    expect(stdout).not.toContain("claude-opus-4-6\t");
  });

  test("returns empty output for unknown provider", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "__complete", "model", "--provider", "unknown-provider"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toBe("");
  });

  test("includes cost hints in tab-separated format", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "__complete", "model"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    // Output should have tab-separated "id\tcostHint" lines
    const lines = stdout.split("\n").filter((l) => l.length > 0);
    for (const line of lines) {
      expect(line).toContain("\t");
      const parts = line.split("\t");
      expect(parts).toHaveLength(2);
      expect(["cheap", "standard", "expensive"]).toContain(parts[1] ?? "");
    }
  });

  test("returns sorted model IDs", async () => {
    const { stdout } = await execa(
      "bun",
      ["run", "dev", "__complete", "model"],
      { cwd: TOOLS_DIR },
    );
    const ids = stdout
      .split("\n")
      .filter((l) => l.length > 0)
      .map((l) => l.split("\t")[0] ?? "");
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
  });
});

// =============================================================================
// __complete provider handler
// =============================================================================

describe("__complete provider", () => {
  test("returns all valid provider names", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "__complete", "provider"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    const providers = stdout.split("\n").filter((l) => l.length > 0);
    // Should contain all ProviderType values
    expect(providers).toContain("claude");
    expect(providers).toContain("opencode");
    expect(providers).toContain("codex");
    expect(providers).toContain("cursor");
    expect(providers).toContain("gemini");
    expect(providers).toContain("pi");
  });
});

// =============================================================================
// Shell script content tests for --provider and --model
// =============================================================================

describe("shell scripts include --provider and --model", () => {
  test("bash includes --provider and --model in ralph build flags", async () => {
    const { stdout } = await execa(
      "bun",
      ["run", "dev", "completion", "bash"],
      { cwd: TOOLS_DIR },
    );
    // ralph build flags should include --provider and --model
    expect(stdout).toContain("--provider");
    expect(stdout).toContain("--model");
    expect(stdout).toContain("aaa __complete provider");
    // bash uses variable interpolation for model: aaa __complete $model_args
    expect(stdout).toContain("aaa __complete $model_args");
  });

  test("zsh includes --provider and --model for ralph build", async () => {
    const { stdout } = await execa("bun", ["run", "dev", "completion", "zsh"], {
      cwd: TOOLS_DIR,
    });
    expect(stdout).toContain("--provider");
    expect(stdout).toContain("--model");
    expect(stdout).toContain("_aaa_provider");
    expect(stdout).toContain("_aaa_model");
  });

  test("fish includes --provider and --model for ralph build", async () => {
    const { stdout } = await execa(
      "bun",
      ["run", "dev", "completion", "fish"],
      { cwd: TOOLS_DIR },
    );
    // fish uses -l for long options: "-l provider" = "--provider"
    expect(stdout).toContain("-l provider");
    expect(stdout).toContain("-l model");
    expect(stdout).toContain("aaa __complete provider");
    expect(stdout).toContain("aaa __complete model");
    expect(stdout).toContain("aaa __complete model --provider");
    expect(stdout).toContain("__fish_aaa_model_completions");
    expect(stdout).toContain(
      "__fish_aaa_using_subcommand review' -l model -d 'Model to use' -xa '(__fish_aaa_model_completions)'",
    );
  });
});

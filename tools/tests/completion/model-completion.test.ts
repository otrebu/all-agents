import { describe, expect, test } from "bun:test";
import { execa } from "execa";
import { join } from "node:path";

const TOOLS_DIR = join(import.meta.dir, "..", "..");

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

  test("returns only Cursor model IDs with --provider cursor", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "__complete", "model", "--provider", "cursor"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("gpt-5.3-codex");
    expect(stdout).toContain("sonnet-4.5");
    // Should NOT contain OpenCode/Claude IDs
    expect(stdout).not.toContain("openai/");
    expect(stdout).not.toContain("claude-sonnet-4-5\t");
  });

  test("returns Codex-compatible model IDs with --provider codex", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "__complete", "model", "--provider", "codex"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("openai/gpt-5.2-codex");
    expect(stdout).toContain("openai/gpt-5.3-codex");
    expect(stdout).not.toContain("claude-sonnet-4-5\t");
  });

  test("supports --provider=cursor syntax for model completion", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "__complete", "model", "--provider=cursor"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain("gpt-5.3-codex");
    expect(stdout).not.toContain("openai/");
  });

  test("falls back to all model IDs for unknown provider", async () => {
    const [allModelsResult, unknownProviderResult] = await Promise.all([
      execa("bun", ["run", "dev", "__complete", "model"], { cwd: TOOLS_DIR }),
      execa(
        "bun",
        ["run", "dev", "__complete", "model", "--provider", "unknown-provider"],
        { cwd: TOOLS_DIR },
      ),
    ]);

    expect(unknownProviderResult.exitCode).toBe(0);
    expect(unknownProviderResult.stdout).toBe(allModelsResult.stdout);
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
    expect(stdout).toMatch(/local completion_cmd="\$\{COMP_WORDS\[0\]\}"/);
    expect(stdout).toContain('"$completion_cmd" __complete "$@" 2>/dev/null');
    expect(stdout).toContain(
      "local models=$(_aaa_complete $model_args | cut -f1)",
    );
    expect(stdout).toContain("vision)");
    expect(stdout).toContain(
      'COMPREPLY=($(compgen -W "--provider --model" -- "$cur"))',
    );
    expect(stdout).toContain(
      "--milestone -s --supervised -H --headless --force --review --from --provider --model --with-reviews --cascade",
    );
    expect(stdout).toContain(
      "--force --review --from --cascade --provider --model",
    );
  });

  test("zsh includes --provider and --model for ralph build", async () => {
    const { stdout } = await execa("bun", ["run", "dev", "completion", "zsh"], {
      cwd: TOOLS_DIR,
    });
    expect(stdout).toContain("--provider");
    expect(stdout).toContain("--model");
    expect(stdout).toContain("_aaa_provider");
    expect(stdout).toContain("_aaa_model");
    expect(stdout).toContain("_aaa_completion_cmd()");
    expect(stdout).toContain("_aaa_complete()");
    expect(stdout).toContain(
      'raw="$(_aaa_complete model --provider "$provider_val")"',
    );
    expect(stdout).toContain("vision)");
    expect(stdout).toContain("roadmap)");
    expect(stdout).toContain("stories)");
    expect(stdout).toContain(
      "--from[Resume cascade from this level]:level:_aaa_cascade_target",
    );
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
    expect(stdout).toContain("function __fish_aaa_completion_cmd");
    expect(stdout).toContain("function __fish_aaa_complete");
    expect(stdout).toContain("__fish_aaa_complete provider");
    expect(stdout).toContain(
      '__fish_aaa_complete model --provider "$provider"',
    );
    expect(stdout).toContain("__fish_aaa_model_completions");
    expect(stdout).toContain("__fish_aaa_ralph_plan_vision");
    expect(stdout).toContain("__fish_aaa_ralph_plan_roadmap");
    expect(stdout).toContain("__fish_aaa_ralph_plan_stories");
    expect(stdout).toContain(
      "__fish_aaa_ralph_plan_roadmap -l provider -d 'AI provider'",
    );
    expect(stdout).toContain(
      "__fish_aaa_using_subcommand review' -l model -d 'Model to use' -xa '(__fish_aaa_model_completions)'",
    );
  });

  test("shell scripts support --provider=<value> model filtering", async () => {
    const [bashResult, zshResult, fishResult] = await Promise.all([
      execa("bun", ["run", "dev", "completion", "bash"], { cwd: TOOLS_DIR }),
      execa("bun", ["run", "dev", "completion", "zsh"], { cwd: TOOLS_DIR }),
      execa("bun", ["run", "dev", "completion", "fish"], { cwd: TOOLS_DIR }),
    ]);

    expect(bashResult.stdout).toContain(
      '[[ "$provider_word" == --provider=* ]]',
    );
    expect(zshResult.stdout).toContain(
      '[[ "$provider_word" == --provider=* ]]',
    );
    expect(fishResult.stdout).toContain("string match -q -- '--provider=*'");
  });
});

describe("ralph --dry-run completion entries", () => {
  test("zsh includes preview dry-run entries for build, plan, and calibrate", async () => {
    const { stdout } = await execa("bun", ["run", "dev", "completion", "zsh"], {
      cwd: TOOLS_DIR,
    });

    const previewCount =
      stdout.split("Preview execution plan without running").length - 1;
    expect(previewCount).toBe(6);

    expect(stdout).toContain("build)");
    expect(stdout).toContain("calibrate)");
    expect(stdout).toContain("roadmap)");
    expect(stdout).toContain("stories)");
    expect(stdout).toContain("tasks)");
    expect(stdout).toContain("subtasks)");
  });

  test("fish includes preview dry-run entries for build, plan, and calibrate", async () => {
    const { stdout } = await execa(
      "bun",
      ["run", "dev", "completion", "fish"],
      { cwd: TOOLS_DIR },
    );

    const previewCount =
      stdout.split("Preview execution plan without running").length - 1;
    expect(previewCount).toBe(6);

    expect(stdout).toContain("__fish_aaa_using_subsubcommand ralph build");
    expect(stdout).toContain("__fish_aaa_ralph_plan_roadmap");
    expect(stdout).toContain("__fish_aaa_ralph_plan_stories");
    expect(stdout).toContain("__fish_aaa_ralph_plan_tasks");
    expect(stdout).toContain("__fish_aaa_ralph_plan_subtasks");
    expect(stdout).toContain("__fish_aaa_using_subsubcommand ralph calibrate");
  });

  test("keeps existing non-ralph dry-run completion descriptions unchanged", async () => {
    const { stdout: zshOut } = await execa(
      "bun",
      ["run", "dev", "completion", "zsh"],
      { cwd: TOOLS_DIR },
    );
    expect(zshOut).toContain(
      "--dry-run[Show what would be sent without sending]",
    );
    expect(zshOut).toContain(
      "--dry-run[Show JSON preview without writing queue file]",
    );
    expect(zshOut).toContain(
      "--dry-run[Show what would be discovered without writing]",
    );

    const { stdout: fishOut } = await execa(
      "bun",
      ["run", "dev", "completion", "fish"],
      { cwd: TOOLS_DIR },
    );
    expect(fishOut).toContain(
      "-l dry-run -d 'Show what would be sent without sending'",
    );
    expect(fishOut).toContain(
      "-l dry-run -d 'Show JSON preview without writing queue file'",
    );
    expect(fishOut).toContain(
      "-l dry-run -d 'Show what would be discovered without writing'",
    );
  });
});

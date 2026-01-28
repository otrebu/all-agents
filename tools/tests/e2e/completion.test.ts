import { getContextRoot } from "@tools/utils/paths";
import { describe, expect, test } from "bun:test";
import { execa } from "execa";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

describe("completion E2E", () => {
  // Script generation tests
  describe("script generation", () => {
    test("bash outputs valid script with function and complete", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);
      expect(stdout).toContain("_aaa_completions");
      expect(stdout).toContain(
        "complete -o bashdefault -o default -F _aaa_completions aaa",
      );
      expect(stdout).toContain("COMP_WORDS");
      expect(stdout).toContain("COMPREPLY");
    });

    test("bash script passes syntax check", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      const { exitCode } = await execa("bash", ["-n"], {
        input: stdout,
        reject: false,
      });
      expect(exitCode).toBe(0);
    });

    test("bash includes dynamic provider completion function", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("_aaa_ralph_providers");
      expect(stdout).toContain("aaa ralph completion --providers");
    });

    test("bash includes dynamic model completion function", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("_aaa_ralph_models");
      expect(stdout).toContain("aaa ralph completion --models");
    });

    test("bash includes provider flag completion", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("--provider");
      expect(stdout).toContain("_aaa_ralph_providers");
    });

    test("bash includes model flag completion", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("--model");
    });

    test("zsh outputs valid script with compdef", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "zsh"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);
      expect(stdout).toContain("#compdef aaa");
      expect(stdout).toContain("_aaa");
      expect(stdout).toContain("_arguments");
      expect(stdout).toContain("_describe");
    });

    test("zsh includes dynamic provider completion function", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "zsh"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("_aaa_ralph_providers");
      expect(stdout).toContain("aaa ralph completion --providers");
    });

    test("zsh includes dynamic model completion function", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "zsh"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("_aaa_ralph_models");
      expect(stdout).toContain("_aaa_ralph_models_dynamic");
      expect(stdout).toContain("aaa ralph completion --models");
    });

    test("fish outputs valid script with complete", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "fish"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);
      expect(stdout).toContain("complete -c aaa");
      expect(stdout).toContain("__fish_aaa_using_subcommand");
      expect(stdout).toContain("__fish_aaa_needs_command");
    });

    test("fish includes dynamic provider completion helper", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "fish"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("__fish_aaa_ralph_providers");
      expect(stdout).toContain("aaa ralph completion --providers");
    });

    test("fish includes dynamic model completion helper", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "fish"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("__fish_aaa_ralph_models");
      expect(stdout).toContain("aaa ralph completion --models");
    });

    test("invalid shell errors", async () => {
      const { exitCode, stderr } = await execa(
        "bun",
        ["run", "dev", "completion", "powershell"],
        { cwd: TOOLS_DIR, reject: false },
      );
      expect(exitCode).toBe(1);
      expect(stderr).toContain("Unknown shell");
    });

    test("missing shell argument errors", async () => {
      const { exitCode, stderr } = await execa(
        "bun",
        ["run", "dev", "completion"],
        { cwd: TOOLS_DIR, reject: false },
      );
      expect(exitCode).toBe(1);
      expect(stderr).toContain("missing required argument");
    });
  });

  // Dynamic completion tests
  describe("__complete handler", () => {
    test("__complete milestone returns milestones", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "__complete", "milestone"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);
      // Should contain 'ralph' milestone from roadmap.md
      expect(stdout).toContain("ralph");
    });

    test("__complete command returns command list", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "__complete", "command"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);
      expect(stdout).toContain("download");
      expect(stdout).toContain("ralph");
      expect(stdout).toContain("completion");
    });

    test("__complete unknown type returns empty", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "__complete", "unknown"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);
      expect(stdout).toBe("");
    });
  });

  // Ralph completion command tests
  describe("ralph completion command", () => {
    test("ralph completion --providers returns providers", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "ralph", "completion", "--providers"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);
      // At minimum should return the provider names
      // Since claude is likely installed, check for it
      expect(stdout).toContain("claude");
    });

    test("ralph completion --models claude returns models", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "ralph", "completion", "--models", "claude"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);
      // Should return known claude models
      expect(stdout).toContain("claude-3-5-sonnet-latest");
    });

    test("ralph completion --models unknown returns empty", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "ralph", "completion", "--models", "nonexistent"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);
      // Nonexistent provider should return empty
      expect(stdout).toBe("");
    });

    test("ralph completion --flags returns flags for command", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "ralph", "completion", "--flags", "ralph.build"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--subtasks");
      expect(stdout).toContain("--provider");
      expect(stdout).toContain("--model");
    });

    test("ralph completion with no args shows help", async () => {
      const { exitCode, stderr } = await execa(
        "bun",
        ["run", "dev", "ralph", "completion"],
        { cwd: TOOLS_DIR, reject: false },
      );
      expect(exitCode).toBe(1);
      expect(stderr).toContain("Usage");
    });
  });

  // Help and CLI integration
  describe("help integration", () => {
    test("completion --help shows usage", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "--help"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Generate shell completion scripts");
      expect(stdout).toContain("bash");
      expect(stdout).toContain("zsh");
      expect(stdout).toContain("fish");
    });

    test("aaa --help shows completion command", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "--help"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);
      expect(stdout).toContain("completion");
    });

    test("__complete is hidden from main help", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "--help"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);
      // __complete should NOT appear in help output
      expect(stdout).not.toContain("__complete");
    });
  });

  // Bash script content tests
  describe("bash script content", () => {
    test("bash includes all top-level commands", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("extract-conversations");
      expect(stdout).toContain("gh-search");
      expect(stdout).toContain("gemini-research");
      expect(stdout).toContain("parallel-search");
      expect(stdout).toContain("setup");
      expect(stdout).toContain("uninstall");
      expect(stdout).toContain("sync-context");
      expect(stdout).toContain("task");
      expect(stdout).toContain("story");
      expect(stdout).toContain("ralph");
      expect(stdout).toContain("completion");
    });

    test("bash includes ralph subcommands", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("build");
      expect(stdout).toContain("plan");
      expect(stdout).toContain("milestones");
      expect(stdout).toContain("status");
      expect(stdout).toContain("calibrate");
      expect(stdout).toContain("completion");
    });

    test("bash includes ralph plan subcommands", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("vision");
      expect(stdout).toContain("roadmap");
      expect(stdout).toContain("stories");
      expect(stdout).toContain("tasks");
      expect(stdout).toContain("subtasks");
    });

    test("bash includes dynamic milestone completion", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("aaa __complete milestone");
    });

    test("bash includes mode flag completion", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("--mode");
      expect(stdout).toContain("quick deep code");
    });

    test("bash includes processor flag completion", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("--processor");
      expect(stdout).toContain("base pro");
    });

    test("bash ralph build includes --provider and --model flags", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      // Check that the completion script includes --provider and --model in the build flags
      expect(stdout).toContain("--provider");
      expect(stdout).toContain("--model");
    });
  });
});

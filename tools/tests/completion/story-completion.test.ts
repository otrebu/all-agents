import { describe, expect, test } from "bun:test";
import { execa } from "execa";
import { join } from "node:path";

const TOOLS_DIR = join(import.meta.dir, "..", "..");

// =============================================================================
// Shell script content tests for `aaa story concat`
// =============================================================================

describe("shell scripts include story concat subcommand", () => {
  test("bash includes concat in story subcommand list and its flags", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "completion", "bash"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    // Subcommand listing for `aaa story <TAB>` should offer both create and concat
    expect(stdout).toContain(
      'COMPREPLY=($(compgen -W "create concat" -- "$cur"))',
    );
    // Flag listing for `aaa story concat -<TAB>`
    expect(stdout).toContain(
      'COMPREPLY=($(compgen -W "-m --milestone -o --output" -- "$cur"))',
    );
  });

  test("zsh includes concat subcommand and per-flag _arguments entry", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "completion", "zsh"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    // Subcommand description for `_aaa_story`
    expect(stdout).toContain(
      "'concat:Concatenate milestone stories into one markdown bundle'",
    );
    // Per-subcommand `_arguments` block for concat
    expect(stdout).toContain("concat)");
    expect(stdout).toContain(
      "'(-m --milestone)'{-m,--milestone}'[Milestone name/path]:milestone:_aaa_milestone_or_dir'",
    );
    expect(stdout).toContain(
      "'(-o --output)'{-o,--output}'[Output file path]:file:_files'",
    );
  });

  test("fish includes story concat subcommand and its --milestone/--output flags", async () => {
    const { exitCode, stdout } = await execa(
      "bun",
      ["run", "dev", "completion", "fish"],
      { cwd: TOOLS_DIR },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain(
      "complete -c aaa -n '__fish_aaa_using_subcommand story' -a concat -d 'Concatenate milestone stories into one markdown bundle'",
    );
    expect(stdout).toContain(
      "complete -c aaa -n '__fish_aaa_using_subsubcommand story concat' -s m -l milestone -d 'Milestone name/path' -xa '(__fish_aaa_complete milestone 2>/dev/null; __fish_complete_directories)'",
    );
    expect(stdout).toContain(
      "complete -c aaa -n '__fish_aaa_using_subsubcommand story concat' -s o -l output -d 'Output file path' -r",
    );
  });
});

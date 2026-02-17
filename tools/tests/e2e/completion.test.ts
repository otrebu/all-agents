import { getContextRoot } from "@tools/utils/paths";
import { describe, expect, test } from "bun:test";
import { execa } from "execa";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TOOLS_DIR = join(getContextRoot(), "tools");

function escapeSingleQuotes(value: string): string {
  return value.replaceAll("'", "'\\''");
}

function formatZshWordArray(words: Array<string>): string {
  return words.map((word) => `'${escapeSingleQuotes(word)}'`).join(" ");
}

async function runZshCompletionProbe(
  words: Array<string>,
  probeFunction: "_aaa_model" | "_aaa_provider",
): Promise<Array<string>> {
  const { stdout: completionScript } = await execa(
    "bun",
    ["run", "dev", "completion", "zsh"],
    { cwd: TOOLS_DIR },
  );

  const toolPath = escapeSingleQuotes(TOOLS_DIR);
  const wordsLiteral = formatZshWordArray(words);

  const probeScript = `${completionScript}

function aaa() { (cd '${toolPath}' && bun run dev "$@"); }

_describe() {
    local _label="$1"
    local _array_name="$2"
    local -a _entries
    _entries=("\${(@P)_array_name}")
    local _entry
    for _entry in "\${_entries[@]}"; do
        print -r -- "\${_entry}"
    done
}

words=(${wordsLiteral})
CURRENT=\${#words}
${probeFunction}
`;

  const temporaryDirectory = mkdtempSync(join(tmpdir(), "aaa-zsh-completion-"));
  const probePath = join(temporaryDirectory, "probe.zsh");
  writeFileSync(probePath, probeScript, "utf8");

  const { stdout } = await execa("zsh", [probePath], {
    cwd: TOOLS_DIR,
  }).finally(() => {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  });

  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

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

    test("completion table outputs command-option markdown", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "table"],
        { cwd: TOOLS_DIR },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("| Command |");
      expect(stdout).toContain("`aaa ralph plan tasks`");
      expect(stdout).toContain("`--file <path>`");
      expect(stdout).toContain("File path as source for task generation");
      expect(stdout).not.toContain("aaa __complete");
    });

    test("completion table supports --format json", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "table", "--format", "json"],
        { cwd: TOOLS_DIR },
      );

      expect(exitCode).toBe(0);

      const rows = JSON.parse(stdout) as Array<{
        command: string;
        option: string;
      }>;

      expect(Array.isArray(rows)).toBe(true);
      expect(
        rows.some(
          (row) =>
            row.command === "aaa ralph plan tasks" &&
            row.option === "--file <path>",
        ),
      ).toBe(true);
      expect(rows.some((row) => row.command.includes("__complete"))).toBe(
        false,
      );
    });

    test("completion table keeps review/provider-model and subtasks/validate-first parity", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "table", "--format", "json"],
        { cwd: TOOLS_DIR },
      );

      expect(exitCode).toBe(0);

      const rows = JSON.parse(stdout) as Array<{
        command: string;
        option: string;
      }>;

      expect(
        rows.some(
          (row) =>
            row.command === "aaa ralph review tasks" &&
            row.option === "--provider <name>",
        ),
      ).toBe(true);
      expect(
        rows.some(
          (row) =>
            row.command === "aaa ralph review tasks" &&
            row.option === "--model <name>",
        ),
      ).toBe(true);
      expect(
        rows.some(
          (row) =>
            row.command === "aaa ralph plan subtasks" &&
            row.option === "--validate-first",
        ),
      ).toBe(true);
    });

    test("completion table rejects unknown format", async () => {
      const { exitCode, stderr } = await execa(
        "bun",
        ["run", "dev", "completion", "table", "--format", "yaml"],
        { cwd: TOOLS_DIR, reject: false },
      );

      expect(exitCode).toBe(1);
      expect(stderr).toContain("Unknown table format");
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
      expect(stdout).toContain("ralph");
      expect(stdout).toContain("notify");
      expect(stdout).toContain("completion");
    });

    test("__complete session-id returns zero or more session IDs", async () => {
      const { exitCode, stdout } = await execa(
        "bun",
        ["run", "dev", "__complete", "session-id"],
        { cwd: TOOLS_DIR },
      );
      expect(exitCode).toBe(0);

      const lines = stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");

      for (const line of lines) {
        expect(line).not.toContain("\t");
        expect(line.length).toBeGreaterThan(0);
      }
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
      expect(stdout).toContain("table");
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
      expect(stdout).toContain("models");
      expect(stdout).toContain("status");
      expect(stdout).toContain("subtasks");
      expect(stdout).toContain("calibrate");
    });

    test("completion scripts include ralph build quiet flag", async () => {
      const [bashResult, zshResult, fishResult] = await Promise.all([
        execa("bun", ["run", "dev", "completion", "bash"], { cwd: TOOLS_DIR }),
        execa("bun", ["run", "dev", "completion", "zsh"], { cwd: TOOLS_DIR }),
        execa("bun", ["run", "dev", "completion", "fish"], { cwd: TOOLS_DIR }),
      ]);

      expect(bashResult.stdout).toContain("-q --quiet");
      expect(zshResult.stdout).toContain(
        "'(-q --quiet)'{-q,--quiet}'[Suppress terminal summary output]'",
      );
      expect(fishResult.stdout).toContain(
        "__fish_aaa_using_subsubcommand ralph build' -s q -l quiet",
      );
    });

    test("completion scripts include setup --worktree option", async () => {
      const [bashResult, zshResult, fishResult] = await Promise.all([
        execa("bun", ["run", "dev", "completion", "bash"], { cwd: TOOLS_DIR }),
        execa("bun", ["run", "dev", "completion", "zsh"], { cwd: TOOLS_DIR }),
        execa("bun", ["run", "dev", "completion", "fish"], { cwd: TOOLS_DIR }),
      ]);

      expect(bashResult.stdout).toContain("--user --project --worktree");
      expect(zshResult.stdout).toContain(
        "--worktree[Switch active aaa symlink to all-agents worktree]",
      );
      expect(fishResult.stdout).toContain(
        "__fish_aaa_using_subcommand setup' -l worktree",
      );
    });

    test("completion scripts include ralph models and subtasks options", async () => {
      const [bashResult, zshResult, fishResult] = await Promise.all([
        execa("bun", ["run", "dev", "completion", "bash"], { cwd: TOOLS_DIR }),
        execa("bun", ["run", "dev", "completion", "zsh"], { cwd: TOOLS_DIR }),
        execa("bun", ["run", "dev", "completion", "fish"], { cwd: TOOLS_DIR }),
      ]);

      expect(bashResult.stdout).toContain("models)");
      expect(bashResult.stdout).toContain("subtasks)");
      expect(bashResult.stdout).toContain(
        "--milestone --pending --limit --json",
      );

      expect(zshResult.stdout).toContain("models:List available model names");
      expect(zshResult.stdout).toContain("_aaa_ralph_subtasks");
      expect(zshResult.stdout).toContain("--milestone[Milestone path]");

      expect(fishResult.stdout).toContain(
        "-a models -d 'List available model names'",
      );
      expect(fishResult.stdout).toContain(
        "-a subtasks -d 'Subtask queue operations'",
      );
      expect(fishResult.stdout).toContain(
        "__fish_aaa_ralph_subtasks_list -l milestone",
      );
    });

    test("zsh and fish include new ralph subtasks queue-order subcommands and flags", async () => {
      const [zshResult, fishResult] = await Promise.all([
        execa("bun", ["run", "dev", "completion", "zsh"], { cwd: TOOLS_DIR }),
        execa("bun", ["run", "dev", "completion", "fish"], { cwd: TOOLS_DIR }),
      ]);

      expect(zshResult.stdout).toContain(
        "append:Append subtasks to the end of queue order",
      );
      expect(zshResult.stdout).toContain(
        "prepend:Prepend subtasks to the front of queue order",
      );
      expect(zshResult.stdout).toContain(
        "diff:Preview queue-order changes from a proposal",
      );
      expect(zshResult.stdout).toContain(
        "apply:Apply queue-order changes from a proposal",
      );
      expect(zshResult.stdout).toContain("--subtasks[Subtasks file path]");
      expect(zshResult.stdout).toContain("--file[Read subtask JSON from file]");
      expect(zshResult.stdout).toContain("--dry-run[Show JSON preview");
      expect(zshResult.stdout).toContain(
        "--proposal[Queue proposal JSON file]",
      );
      expect(zshResult.stdout).toContain(
        "--json[Output machine-readable JSON summary]",
      );
      expect(zshResult.stdout).toContain(
        "next:Get next subtask in queue order",
      );
      expect(zshResult.stdout).not.toContain("next:Get next runnable subtask");

      expect(fishResult.stdout).toContain(
        "-a append -d 'Append subtasks to the end of queue order'",
      );
      expect(fishResult.stdout).toContain(
        "-a prepend -d 'Prepend subtasks to the front of queue order'",
      );
      expect(fishResult.stdout).toContain(
        "-a diff -d 'Preview queue-order changes from a proposal'",
      );
      expect(fishResult.stdout).toContain(
        "-a apply -d 'Apply queue-order changes from a proposal'",
      );
      expect(fishResult.stdout).toContain(
        "__fish_aaa_ralph_subtasks_append -l subtasks",
      );
      expect(fishResult.stdout).toContain(
        "__fish_aaa_ralph_subtasks_append -l file",
      );
      expect(fishResult.stdout).toContain(
        "__fish_aaa_ralph_subtasks_append -l dry-run",
      );
      expect(fishResult.stdout).toContain(
        "__fish_aaa_ralph_subtasks_diff -l proposal",
      );
      expect(fishResult.stdout).toContain(
        "__fish_aaa_ralph_subtasks_diff -l json",
      );
      expect(fishResult.stdout).toContain(
        "__fish_aaa_ralph_subtasks_apply -l subtasks",
      );
      expect(fishResult.stdout).toContain(
        "-a next -d 'Get next subtask in queue order'",
      );
      expect(fishResult.stdout).not.toContain(
        "-a next -d 'Get next runnable subtask'",
      );
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

    test("bash includes milestone flag completion", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      // Bash uses file completion for --milestone flag
      expect(stdout).toContain("--milestone");
      expect(stdout).toContain("compgen -f");
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

    test("bash includes subtasks output-dir/file/validate-first completions", async () => {
      const { stdout } = await execa(
        "bun",
        ["run", "dev", "completion", "bash"],
        { cwd: TOOLS_DIR },
      );
      expect(stdout).toContain("--output-dir)");
      expect(stdout).toContain("local output_dirs=$(_aaa_complete milestone)");
      expect(stdout).toContain("--file)");
      expect(stdout).toContain('COMPREPLY=($(compgen -f -- "$cur"))');
      expect(stdout).toContain("--validate-first");
    });

    test("zsh and fish include subtasks output-dir and validate-first", async () => {
      const [zshResult, fishResult] = await Promise.all([
        execa("bun", ["run", "dev", "completion", "zsh"], { cwd: TOOLS_DIR }),
        execa("bun", ["run", "dev", "completion", "fish"], { cwd: TOOLS_DIR }),
      ]);

      expect(zshResult.stdout).toContain("--output-dir");
      expect(zshResult.stdout).toContain("_aaa_milestone_or_dir");
      expect(zshResult.stdout).toContain("--validate-first");
      expect(fishResult.stdout).toContain("-l output-dir");
      expect(fishResult.stdout).toContain("__fish_complete_directories");
      expect(fishResult.stdout).toContain("-l validate-first");
    });

    test("bash, zsh, and fish include review tasks provider/model completions", async () => {
      const [bashResult, zshResult, fishResult] = await Promise.all([
        execa("bun", ["run", "dev", "completion", "bash"], { cwd: TOOLS_DIR }),
        execa("bun", ["run", "dev", "completion", "zsh"], { cwd: TOOLS_DIR }),
        execa("bun", ["run", "dev", "completion", "fish"], { cwd: TOOLS_DIR }),
      ]);

      expect(bashResult.stdout).toContain(
        "--story -s --supervised -H --headless --provider --model --dry-run",
      );

      expect(zshResult.stdout).toContain(
        "--story[Story path to review tasks for]:story:_aaa_story_or_file",
      );
      expect(zshResult.stdout).toContain("--provider[AI provider]");
      expect(zshResult.stdout).toContain("--model[Model to use]");

      expect(fishResult.stdout).toContain("__fish_aaa_ralph_review_tasks");
      expect(fishResult.stdout).toContain("-l provider -d 'AI provider'");
      expect(fishResult.stdout).toContain("-l model -d 'Model to use'");
    });

    test("session path/cat completion includes --id and dynamic session IDs", async () => {
      const [bashResult, zshResult, fishResult] = await Promise.all([
        execa("bun", ["run", "dev", "completion", "bash"], { cwd: TOOLS_DIR }),
        execa("bun", ["run", "dev", "completion", "zsh"], { cwd: TOOLS_DIR }),
        execa("bun", ["run", "dev", "completion", "fish"], { cwd: TOOLS_DIR }),
      ]);

      expect(bashResult.stdout).toContain("--id)");
      expect(bashResult.stdout).toContain(
        "local session_ids=$(_aaa_complete session-id)",
      );
      expect(bashResult.stdout).toContain("--commit --id");

      expect(zshResult.stdout).toContain("_aaa_session_id");
      expect(zshResult.stdout).toContain("$(_aaa_complete session-id)");
      expect(zshResult.stdout).toContain("--id[Session ID to look up]");

      expect(fishResult.stdout).toContain(
        "__fish_aaa_session_path_or_cat -l id",
      );
      expect(fishResult.stdout).toContain("__fish_aaa_complete session-id");
    });

    test("zsh runtime provider completion resolves providers in plan stories context", async () => {
      const providers = await runZshCompletionProbe(
        ["aaa", "ralph", "plan", "stories", "--provider", ""],
        "_aaa_provider",
      );

      expect(providers).toContain("claude");
      expect(providers).toContain("codex");
      expect(providers).toContain("cursor");
      expect(providers).toContain("opencode");
    });

    test("zsh runtime provider completion falls back to aaa when resolved command fails", async () => {
      const providers = await runZshCompletionProbe(
        ["not-a-real-command", "ralph", "plan", "stories", "--provider", ""],
        "_aaa_provider",
      );

      expect(providers).toContain("claude");
      expect(providers).toContain("codex");
      expect(providers).toContain("cursor");
      expect(providers).toContain("opencode");
    });

    test("zsh runtime model completion stays provider-aware in plan stories context", async () => {
      const models = await runZshCompletionProbe(
        [
          "not-a-real-command",
          "ralph",
          "plan",
          "stories",
          "--provider",
          "codex",
          "--model",
          "",
        ],
        "_aaa_model",
      );

      expect(
        models.some((entry) => entry.includes("openai/gpt-5.2-codex")),
      ).toBe(true);
      expect(
        models.some((entry) => entry.includes("openai/gpt-5.3-codex")),
      ).toBe(true);
    });
  });
});

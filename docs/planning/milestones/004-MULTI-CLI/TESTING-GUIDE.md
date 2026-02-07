# Milestone 004: Multi-CLI Abstraction - Testing Guide

What this milestone gave you: ralph can now build with **Claude** or **OpenCode**, you can pick your **model**, and there's a **model registry** with tab completion. Here's how to try it all.

---

## Prerequisites

```bash
cd tools && bun install
git checkout feature/multi-cli-abstraction
```

---

## 1. The existing workflow still works

Before anything else, make sure nothing broke. This should work exactly like before.

```bash
aaa ralph build
```

**Expect:** Ralph picks up your subtasks queue and starts building with Claude, same as always. No config changes needed. If you don't have a subtasks.json ready, `aaa ralph status` should show the familiar status box without any errors.

---

## 2. Build with Claude and pick a model

You can now explicitly choose Claude and select which model to use.

```bash
aaa ralph build --provider claude --model claude-sonnet-4
```

**Available Claude models:**
| Model | Cost |
|-------|------|
| `claude-sonnet-4` | standard |
| `claude-opus-4` | expensive |
| `claude-haiku` | cheap |

**Expect:** Build runs with the model you picked. Output shows `Using provider: claude` and you'll see cost, duration, and session ID after each iteration.

---

## 3. Build with OpenCode

This is the big new thing. Ralph can now use OpenCode as an alternative to Claude.

```bash
# Set permission bypass (required for headless automation)
export OPENCODE_PERMISSION='{"*":"allow"}'

# Build with OpenCode using an Anthropic model
aaa ralph build --provider opencode --model anthropic/claude-sonnet-4-20250514
```

OpenCode uses `provider/model` format, so you can access models from multiple vendors:

```bash
# Use GPT-4o through OpenCode
aaa ralph build --provider opencode --model openai/gpt-4o

# Use a cheap model for quick tasks
aaa ralph build --provider opencode --model openai/gpt-4o-mini
```

**Available OpenCode models:**
| Model | CLI format | Cost |
|-------|-----------|------|
| `gpt-4o` | openai/gpt-4o | standard |
| `gpt-4o-mini` | openai/gpt-4o-mini | cheap |
| `claude-sonnet-opencode` | anthropic/claude-sonnet-4-20250514 | standard |
| `claude-haiku-opencode` | anthropic/claude-3-5-haiku-latest | cheap |

**Expect:** Build runs with OpenCode. JSONL output is parsed into the same format as Claude - you'll see cost, token counts, and session ID. If OpenCode hangs (Issue #8203), the hard timeout kicks in and kills the process.

> **Note:** Requires `opencode` binary installed (`npm install -g opencode`). If it's not installed, you'll get a clear error telling you how to install it.

---

## 4. Discover available models

New command. Queries your installed providers to find what models they support.

```bash
# See what would be discovered (no files changed)
aaa ralph refresh-models --dry-run

# Actually discover and save new models
aaa ralph refresh-models

# Only query a specific provider
aaa ralph refresh-models --provider opencode
```

**Expect:** The command runs `opencode models --json` (or equivalent for other providers), parses the output, and updates `tools/src/commands/ralph/providers/models-dynamic.ts`. After this, any newly discovered models show up in tab completion and `--model` validation.

If you don't have any provider binaries installed, you'll see:
```
Error discovering opencode models: exit code 1
No new models discovered.
```
That's fine - the static baseline models still work regardless.

---

## 5. Tab completion

Set up completion for your shell, then try it out.

```bash
# Install completion (pick your shell)
source <(aaa completion bash)
# OR: aaa completion zsh > ~/.oh-my-zsh/completions/_aaa
# OR: aaa completion fish > ~/.config/fish/completions/aaa.fish
```

Now try:

```bash
aaa ralph build --provider <TAB>
# Shows: claude, codex, cursor, gemini, opencode, pi

aaa ralph build --provider claude --model <TAB>
# Shows: claude-haiku (cheap), claude-opus-4 (expensive), claude-sonnet-4 (standard)

aaa ralph build --provider opencode --model <TAB>
# Shows: claude-haiku-opencode (cheap), claude-sonnet-opencode (standard), gpt-4o (standard), gpt-4o-mini (cheap)

aaa ralph refresh-models --<TAB>
# Shows: --dry-run, --provider
```

The cost hints (`cheap`/`standard`/`expensive`) show inline so you know what you're picking.

---

## 6. Switch providers with an environment variable

Don't want to type `--provider` every time? Set it for your session:

```bash
export RALPH_PROVIDER=opencode
aaa ralph build    # uses opencode without --provider flag
```

The `--provider` flag always wins if you pass both.

---

## Automated tests

If you want to verify the internals, run the full quality gate:

```bash
cd tools
bun run check    # lint + typecheck + all tests
```

Or by story:

```bash
# Story 001 - Provider Foundation
bun test tests/providers/types.test.ts tests/providers/utils.test.ts tests/providers/registry.test.ts

# Story 002 - Claude Refactor
bun test tests/providers/claude.test.ts tests/providers/claude.parser.test.ts tests/providers/claude.config.test.ts tests/providers/claude.integration.test.ts

# Story 003 - OpenCode Support
bun test tests/providers/opencode.test.ts tests/providers/registry-opencode.test.ts tests/providers/opencode.integration.test.ts

# Story 004 - Model Registry
bun test tests/providers/models.test.ts tests/providers/model-validation.test.ts tests/providers/refresh-models.test.ts tests/completion/model-completion.test.ts tests/e2e/provider-flag.test.ts
```

---

## Known gaps

- **Config file provider selection** not wired up yet. The story says `"ralph": { "provider": "opencode" }` in `aaa.config.json` should work, but the config only has `hooks`, `timeouts`, and `selfImprovement` today. Use `--provider` flag or `RALPH_PROVIDER` env var instead.
- **Provider error formatting**: Invalid provider (`--provider notreal`) shows a raw stack trace instead of a clean error. Model validation errors are clean though.

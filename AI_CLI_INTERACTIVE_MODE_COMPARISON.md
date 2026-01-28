# AI CLI Interactive Mode Comparison

## Executive Summary

| CLI | Non-Interactive Command | TTY Detection | Pipe Support | Force Interactive | Output Formats |
|-----|------------------------|---------------|--------------|-------------------|----------------|
| **opencode** | `opencode run [message]` | Auto-detects | Yes (`-` for stdin) | No explicit flag | `default`, `json` |
| **cursor** | `cursor agent -p [prompt]` | Uses `-p` flag | Yes (`-` for stdin) | `-p` / `--print` | `text`, `json`, `stream-json` |
| **codex** | `codex exec [prompt]` | Auto-detects | Yes (`-` for stdin) | No explicit flag | `json` (via `--json`) |

---

## 1. Piped Input Behavior

### opencode
```bash
echo "What is 2+2?" | opencode run -
```
- **Syntax**: Use `-` as message to read from stdin
- **Behavior**: Runs non-interactively when piped
- **Output**: Formatted text by default, JSON with `--format json`
- **Note**: Requires API key configuration

### cursor
```bash
echo "What is 2+2?" | cursor agent -p -
```
- **Syntax**: Use `-` as prompt to read from stdin
- **Flag required**: `-p` or `--print` for non-interactive mode
- **Behavior**: Without `-p`, attempts interactive mode (fails in scripts)
- **Output**: Text by default, JSON with `--output-format json`

### codex
```bash
echo "What is 2+2?" | codex exec -
```
- **Syntax**: Use `-` as prompt to read from stdin
- **Behavior**: Always runs non-interactively with `exec` subcommand
- **Output**: Human-readable by default, JSONL with `--json`
- **Note**: `exec` is specifically designed for non-interactive use

---

## 2. Script Execution

### opencode
```bash
#!/bin/bash
# Works: Non-interactive by default with 'run' command
opencode run "Explain this code"

# Works: With file attachment
opencode run -f ./file.txt "Review this"
```
- **Default mode**: Non-interactive when using `run` subcommand
- **Interactive mode**: `opencode` or `opencode [project]` (TUI mode)
- **Best for**: CI/CD pipelines, automated code reviews

### cursor
```bash
#!/bin/bash
# REQUIRED: -p flag for non-interactive mode
cursor agent -p "Explain this code"

# With JSON output for parsing
cursor agent -p --output-format json "Explain this code"
```
- **Critical**: Must use `-p` or `--print` flag in scripts
- **Without `-p`**: Attempts to launch interactive TUI (fails without TTY)
- **Modes**: `--mode plan` (read-only), `--mode ask` (Q&A)
- **Best for**: Scripting with structured output

### codex
```bash
#!/bin/bash
# Works: Non-interactive with 'exec' subcommand
codex exec "Explain this code"

# With full automation (dangerous)
codex exec --full-auto "Make changes"

# With sandbox control
codex exec --sandbox read-only "Analyze code"
```
- **Default**: `codex` alone = interactive, `codex exec` = non-interactive
- **Safety**: Built-in sandbox with `--sandbox` flag
- **Best for**: Automated code changes with safety controls

---

## 3. TTY Detection

### opencode
- **Automatic**: Detects TTY presence
- **Interactive**: When run as `opencode` without subcommand
- **Non-interactive**: When using `run` subcommand or piped
- **No override flag**: Cannot force interactive mode in scripts

### cursor
- **Manual control**: `-p` flag explicitly selects non-interactive mode
- **Interactive**: Default when run without `-p` and TTY available
- **Non-interactive**: `-p` or `--print` flag
- **Best practice**: Always use `-p` in scripts regardless of TTY

### codex
- **Subcommand-based**: 
  - `codex` = interactive (requires TTY)
  - `codex exec` = non-interactive
- **Automatic**: `exec` subcommand implies non-interactive
- **No override needed**: Clear separation of concerns

---

## 4. Force Interactive Mode Flags

| CLI | Force Interactive | Force Non-Interactive |
|-----|-------------------|----------------------|
| **opencode** | No flag (just run `opencode`) | `opencode run` |
| **cursor** | No flag (default with TTY) | `-p`, `--print` |
| **codex** | No flag (just run `codex`) | `codex exec` |

**Key Insight**: None of the CLIs have an explicit "force interactive" flag. They rely on:
1. Subcommand selection (`run` vs `exec`)
2. TTY detection
3. Explicit non-interactive flags (`-p` for cursor)

---

## 5. Output Formats for Scripting

### opencode
```bash
# JSON output for parsing
opencode run --format json "Analyze code" | jq '.result'
```
- `--format json`: Structured JSON events
- `--format default`: Human-readable (default)

### cursor
```bash
# JSON output
cursor agent -p --output-format json "Analyze code" | jq '.result'

# Streaming JSON (for long operations)
cursor agent -p --output-format stream-json --stream-partial-output "Analyze code"
```
- `--output-format text`: Human-readable (default)
- `--output-format json`: Single JSON response
- `--output-format stream-json`: Streaming JSON deltas

### codex
```bash
# JSON Lines output
codex exec --json "Analyze code" | jq '.result'
```
- `--json`: JSON Lines (JSONL) format with events
- Default: Human-readable with headers

---

## 6. Key Differences Summary

### opencode
- ✅ Simple: `run` subcommand = non-interactive
- ✅ Supports file attachments with `-f`
- ❌ Requires API key setup for each provider
- ❌ No explicit interactive flag

### cursor
- ✅ Explicit control with `-p` flag
- ✅ Multiple output formats including streaming
- ✅ Execution modes (`plan`, `ask`)
- ❌ Must remember `-p` flag in scripts

### codex
- ✅ Clean separation: `codex` vs `codex exec`
- ✅ Built-in sandbox controls
- ✅ Approval policies (`-a` flag)
- ❌ `exec` always runs (even without TTY check)

---

## 7. Recommended Usage Patterns

### For CI/CD Pipelines
```bash
# opencode - Simple and direct
opencode run --format json "Review PR changes"

# cursor - With explicit non-interactive flag
cursor agent -p --output-format json "Review PR changes"

# codex - With safety controls
codex exec --sandbox read-only --json "Review PR changes"
```

### For Automation Scripts
```bash
# Reading from file
FILE_CONTENT=$(cat code.py)

# opencode
echo "$FILE_CONTENT" | opencode run - "Explain this code"

# cursor
echo "$FILE_CONTENT" | cursor agent -p - "Explain this code"

# codex
echo "$FILE_CONTENT" | codex exec - "Explain this code"
```

### For Safe Code Modifications
```bash
# codex has the best safety controls
codex exec \
  --sandbox workspace-write \
  --ask-for-approval on-failure \
  "Refactor this code"
```

---

## 8. Common Pitfalls

### opencode
- ❌ Forgetting to use `run` subcommand (launches TUI)
- ❌ Not configuring API keys before running in CI

### cursor
- ❌ Forgetting `-p` flag (hangs waiting for TTY)
- ❌ Using `--mode ask` in scripts (may still prompt)

### codex
- ❌ Using `codex` instead of `codex exec` in scripts
- ❌ Not setting `--ask-for-approval` for dangerous operations
- ❌ `--full-auto` without understanding sandbox implications

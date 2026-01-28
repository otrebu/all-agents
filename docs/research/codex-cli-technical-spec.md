# OpenAI Codex CLI Technical Specification
## Multi-CLI Integration Reference

**Version Analyzed:** 0.60.1  
**Date:** 2026-01-28  
**Status:** Production (Stable) with Experimental Features

---

## 1. COMMAND STRUCTURE & SYNTAX

### 1.1 Core Command Syntax

```bash
# Interactive mode (default)
codex [OPTIONS] [PROMPT]

# Non-interactive exec mode (for CI/automation)
codex exec [OPTIONS] [PROMPT]
codex e [OPTIONS] [PROMPT]     # Short alias

# Exec with stdin prompt
echo "prompt" | codex exec -
codex exec - << 'EOF'
prompt here
EOF
```

### 1.2 All Available Flags (Verified)

| Flag | Short | Values | Description |
|------|-------|--------|-------------|
| `--config` | `-c` | `key=value` | Override config.toml values (TOML/JSON parsed) |
| `--model` | `-m` | `string` | Model override (e.g., `gpt-5.1-codex-max`) |
| `--sandbox` | `-s` | `read-only` \| `workspace-write` \| `danger-full-access` | Sandbox policy |
| `--ask-for-approval` | `-a` | `untrusted` \| `on-failure` \| `on-request` \| `never` | Approval policy |
| `--full-auto` | | boolean | Shortcut: `-a on-request --sandbox workspace-write` |
| `--json` | | boolean | **CRITICAL**: Output JSONL events to stdout |
| `--output-schema` | | `FILE` | JSON Schema for structured response validation |
| `--output-last-message` | `-o` | `FILE` | Write final assistant message to file |
| `--image` | `-i` | `FILE,...` | Attach images to prompt (repeatable) |
| `--profile` | `-p` | `string` | Config profile from config.toml |
| `--cd` | `-C` | `DIR` | Working directory override |
| `--add-dir` | | `DIR` | Additional writable directories |
| `--skip-git-repo-check` | | boolean | Allow running outside git repo |
| `--color` | | `always` \| `never` \| `auto` | ANSI color control |
| `--search` | | boolean | Enable web search tool |
| `--oss` | | boolean | Use local OSS provider (Ollama/LMStudio) |
| `--local-provider` | | `lmstudio` \| `ollama` | Specify local provider |
| `--enable` | | `FEATURE` | Enable feature flag |
| `--disable` | | `FEATURE` | Disable feature flag |
| `--dangerously-bypass-approvals-and-sandbox` | | boolean | **DANGEROUS**: Skip all protections |

### 1.3 Subcommands

| Subcommand | Alias | Status | Purpose |
|------------|-------|--------|---------|
| `exec` | `e` | Stable | Non-interactive execution |
| `exec resume` | | Stable | Resume exec session |
| `apply` | `a` | Stable | Apply Codex Cloud diff |
| `resume` | | Stable | Resume interactive session |
| `fork` | | Stable | Fork session to new thread |
| `login` | | Stable | Authenticate (OAuth/API key) |
| `logout` | | Stable | Remove credentials |
| `completion` | | Stable | Shell completion scripts |
| `cloud` | | Experimental | Codex Cloud integration |
| `mcp` | | Experimental | MCP server management |
| `mcp-server` | | Experimental | Run as MCP server |
| `app-server` | | Experimental | Local dev server |
| `sandbox` | | Experimental | Run commands in sandbox |
| `features` | | Experimental | Feature flags inspection |

---

## 2. SESSION STORAGE (CRITICAL FOR INTEGRATION)

### 2.1 Session File Location

```
~/.codex/
├── auth.json              # Authentication tokens
├── config.toml            # User configuration
├── history.jsonl          # Session history index
├── internal_storage.json  # Internal state
├── version.json           # Version tracking
├── log/                   # Log files
└── sessions/
    └── YYYY/
        └── MM/
            └── DD/
                └── rollout-YYYY-MM-DDTHH-MM-SS-<SESSION_ID>.jsonl
```

### 2.2 Session File Format

**Filename Pattern:**
```
rollout-{ISO_TIMESTAMP}-{UUID}.jsonl
# Example: rollout-2025-11-20T11-46-16-019aa116-2e78-7952-b540-0e4c3692ae12.jsonl
```

**File Format:** JSON Lines (JSONL) - one JSON object per line

### 2.3 Session ID Extraction

**From History:**
```bash
# ~/.codex/history.jsonl contains session references
{"session_id":"019c0539-d847-7300-9430-36423ee8199d","ts":1765379938,"text":"print the current date"}
```

**From Session Files:**
```bash
# Parse UUID from filename
filename="rollout-2025-11-20T11-46-16-019aa116-2e78-7952-b540-0e4c3692ae12.jsonl"
session_id=$(echo "$filename" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
```

**From Session Content (first line):**
```json
{
  "timestamp": "2025-11-20T11:46:16.874Z",
  "type": "session_meta",
  "payload": {
    "id": "019aa116-2e78-7952-b540-0e4c3692ae12",
    "timestamp": "2025-11-20T11:46:16.824Z",
    "cwd": "/Users/...",
    "originator": "codex_cli_rs",
    "cli_version": "0.60.1",
    "instructions": "...",
    "source": "cli",
    "model_provider": "openai",
    "git": {
      "commit_hash": "b1292e3842135f5f31f851a6af83700b93aec591",
      "branch": "main",
      "repository_url": "git@github.com:..."
    }
  }
}
```

### 2.4 Authentication File Format

**`~/.codex/auth.json`:**
```json
{
  "OPENAI_API_KEY": null,
  "tokens": {
    "id_token": "eyJhbGciOiJSUzI1Ni...",
    "access_token": "eyJhbGciOiJSUzI1Ni...",
    "refresh_token": "rt_UetJU3XizqIcGOF32Zw2fHVO3qtRccNdJqzHgVXTdUA...",
    "account_id": "37752176-3805-4a06-ab20-83e6caec60d7"
  },
  "last_refresh": "2025-11-20T11:46:17.189968Z"
}
```

### 2.5 Config File Format

**`~/.codex/config.toml`:**
```toml
model = "gpt-5.1-codex-max"
model_reasoning_effort = "high"

[projects"/path/to/project"]
trust_level = "trusted"

[projects"/another/project"]
trust_level = "trusted"
```

---

## 3. OUTPUT FORMAT (JSONL) - CRITICAL

### 3.1 Output Mode

**Default:** Formatted text to stdout (final message only), progress to stderr  
**With `--json`:** JSONL stream to stdout (all events)

### 3.2 JSONL Event Types

**Top-level event structure:**
```json
{"type": "<event_type>", ...event_specific_fields}
```

#### Thread Events
```json
// Thread initialization
{"type": "thread.started", "thread_id": "019c0539-d847-7300-9430-36423ee8199d"}

// Turn (iteration) start
{"type": "turn.started"}

// Turn completion with usage stats
{
  "type": "turn.completed",
  "usage": {
    "input_tokens": 25088,
    "cached_input_tokens": 21632,
    "output_tokens": 711
  }
}

// Turn failure
{
  "type": "turn.failed",
  "error": {
    "message": "unexpected status 400..."
  }
}
```

#### Item Events (Inside Turn)
```json
// Item started
{
  "type": "item.started",
  "item": {
    "id": "item_1",
    "type": "command_execution",
    "command": "/bin/zsh -lc 'ls'",
    "aggregated_output": "",
    "exit_code": null,
    "status": "in_progress"
  }
}

// Item completed
{
  "type": "item.completed",
  "item": {
    "id": "item_1",
    "type": "command_execution",
    "command": "/bin/zsh -lc 'ls'",
    "aggregated_output": "file1.txt\nfile2.txt\n",
    "exit_code": 0,
    "status": "completed"
  }
}
```

#### Item Types

| Type | Description | Fields |
|------|-------------|--------|
| `reasoning` | Model reasoning/thinking | `id`, `type`, `text` |
| `agent_message` | Final assistant response | `id`, `type`, `text` |
| `command_execution` | Shell command execution | `id`, `type`, `command`, `aggregated_output`, `exit_code`, `status` |
| `file_change` | File modification | `id`, `type`, `file_path`, `change_type`, `content` |
| `mcp_tool_call` | MCP tool invocation | `id`, `type`, `server`, `tool`, `arguments`, `result` |
| `web_search` | Web search results | `id`, `type`, `query`, `results` |
| `plan_update` | Plan/step updates | `id`, `type`, `plan_id`, `status` |

#### Error Events
```json
// Reconnection attempts
{"type": "error", "message": "Reconnecting... 1/5"}

// Terminal error
{
  "type": "error",
  "message": "unexpected status 400 Bad Request: {...}"
}
```

### 3.3 Complete Event Flow Example

```jsonl
{"type":"thread.started","thread_id":"019c0539-d847-7300-9430-36423ee8199d"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"Planning execution..."}}
{"type":"item.started","item":{"id":"item_1","type":"command_execution","command":"date","status":"in_progress"}}
{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"date","aggregated_output":"Wed Jan 28...\n","exit_code":0,"status":"completed"}}
{"type":"item.completed","item":{"id":"item_2","type":"agent_message","text":"Current date: Wed Jan 28..."}}
{"type":"turn.completed","usage":{"input_tokens":7117,"cached_input_tokens":6144,"output_tokens":87}}
```

### 3.4 Metrics Available

| Metric | Location | Description |
|--------|----------|-------------|
| `input_tokens` | `turn.completed.usage` | Total input tokens used |
| `cached_input_tokens` | `turn.completed.usage` | Cached/prompt-cached tokens |
| `output_tokens` | `turn.completed.usage` | Output tokens generated |
| `exit_code` | `item.completed` (commands) | Command exit status |

**NO EXPLICIT COST TRACKING** - Unlike Claude Code, Codex does NOT expose cost in CLI output. Token counts only.

---

## 4. STRUCTURED OUTPUT (--output-schema)

### 4.1 Schema Definition

**Usage:**
```bash
codex exec "Extract project metadata" \
  --output-schema ./schema.json \
  -o ./result.json
```

**Schema File Example (`schema.json`):**
```json
{
  "type": "object",
  "properties": {
    "project_name": { "type": "string" },
    "programming_languages": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["project_name", "programming_languages"],
  "additionalProperties": false
}
```

### 4.2 Output Behavior

- **Validation:** Codex validates the model's final response against the schema
- **Output:** Schema-compliant JSON written to stdout (and optionally to `-o` file)
- **Error Handling:** Non-zero exit if schema validation fails

### 4.3 Integration with Ralph

**Ralph can leverage this for:**
1. **Structured task results** - Define schemas for subtask outputs
2. **Type-safe parsing** - JSON Schema validation before processing
3. **Contract enforcement** - Ensure model returns expected fields

**Example Ralph integration pattern:**
```bash
# Define schema for subtask
schema='{"type":"object","properties":{"status":{"type":"string"},"files_changed":{"type":"array","items":{"type":"string"}}},"required":["status"]}'
echo "$schema" > /tmp/task_schema.json

# Execute with schema
codex exec "Make the change and report status" \
  --output-schema /tmp/task_schema.json \
  --json

# Parse structured result from JSONL
result=$(cat output.jsonl | jq -s '.[] | select(.type=="item.completed" and .item.type=="agent_message") | .item.text | fromjson')
```

---

## 5. SANDBOX & SECURITY

### 5.1 Sandbox Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `read-only` | No filesystem writes allowed | Safe exploration, audits |
| `workspace-write` | Write access to current working directory | Development, refactoring |
| `danger-full-access` | Full system access | **EXTREMELY DANGEROUS** - isolated containers only |

### 5.2 Platform-Specific Implementation

**macOS:** Seatbelt sandbox
```bash
codex sandbox macos --full-auto -- <command>
```

**Linux:** Landlock + seccomp
```bash
codex sandbox linux --full-auto -- <command>
```

**Windows:** Restricted token
```bash
codex sandbox windows -- <command>
```

### 5.3 Approval Policies

| Policy | Behavior |
|--------|----------|
| `untrusted` | Only "trusted" commands (ls, cat, sed) auto-execute; others require approval |
| `on-failure` | Run all commands; ask for approval only on failure |
| `on-request` | Model decides when to ask for approval |
| `never` | Never ask for approval; failures returned to model immediately |

**Recommended for CI:** `--full-auto` (equivalent to `-a on-request -s workspace-write`)

### 5.4 Bypass Mode (DANGEROUS)

```bash
# EXTREMELY DANGEROUS - only in externally sandboxed environments
codex exec --dangerously-bypass-approvals-and-sandbox "rm -rf /"
# Alias: --yolo
```

---

## 6. METRICS & OBSERVABILITY

### 6.1 Available Metrics

| Metric | Available | Source |
|--------|-----------|--------|
| Input tokens | ✅ Yes | `turn.completed.usage.input_tokens` |
| Cached tokens | ✅ Yes | `turn.completed.usage.cached_input_tokens` |
| Output tokens | ✅ Yes | `turn.completed.usage.output_tokens` |
| Cost ($) | ❌ No | Not exposed in CLI |
| Duration | ❌ No | Not tracked |
| Session ID | ✅ Yes | `thread.started.thread_id` |
| Model used | ❌ No | Not in output (check config) |

### 6.2 Cost Calculation (Manual)

```bash
# Since Codex doesn't provide cost, calculate from tokens
# Example for gpt-5.1-codex-max (hypothetical pricing)
input_tokens=25088
output_tokens=711
cached_tokens=21632

# Calculate effective input (non-cached)
effective_input=$((input_tokens - cached_tokens))

# Apply pricing (update with actual rates)
input_cost=$(echo "$effective_input * 0.000003" | bc)
output_cost=$(echo "$output_tokens * 0.000012" | bc)
total_cost=$(echo "$input_cost + $output_cost" | bc)

echo "Cost: \$$total_cost"
```

---

## 7. CONTEXT FILES

### 7.1 AGENTS.md

**Purpose:** Project-level instructions for Codex (similar to CLAUDE.md for Claude)

**Location:** Project root

**Format:** Markdown with special syntax
```markdown
# AGENTS.md

<INSTRUCTIONS>
You must follow the @docs/DEVELOPMENT_WORKFLOW.md when we are coding.
</INSTRUCTIONS>
```

**Note:** Codex automatically reads AGENTS.md at startup.

### 7.2 System Prompts

**No direct CLI flag for system prompts.** Use:
1. AGENTS.md for project-wide instructions
2. First prompt message for task-specific context
3. `-c` config overrides for behavior tuning

### 7.3 File References

Codex supports `@file` references in prompts:
```bash
codex "@CLAUDE.md explain this codebase"
```

---

## 8. AUTHENTICATION

### 8.1 Authentication Methods

| Method | Command | Use Case |
|--------|---------|----------|
| **ChatGPT OAuth** | `codex login` | Default, browser-based |
| **Device Auth** | `codex login --device-auth` | Headless environments |
| **API Key** | `codex login --with-api-key` | CI/automation |
| **Env Var** | `CODEX_API_KEY=<key>` | One-off exec runs |

### 8.2 API Key Authentication

```bash
# Interactive login with API key
codex login --with-api-key
# Then paste key

# Or pipe key
echo "$OPENAI_API_KEY" | codex login --with-api-key

# One-off usage in exec
CODEX_API_KEY=sk-... codex exec --json "prompt"
```

**Note:** `CODEX_API_KEY` is **only supported in `codex exec`**

### 8.3 Credential Storage

**Location:** `~/.codex/auth.json`

**Security:**
- File permissions: 0600 (user read/write only)
- Encrypted tokens (JWT)
- Refresh token rotation

### 8.4 CI Authentication Best Practices

```yaml
# GitHub Actions example
env:
  CODEX_API_KEY: ${{ secrets.OPENAI_API_KEY }}

steps:
  - name: Run Codex
    run: |
      codex exec --json --full-auto \
        "Read the repository, run tests, fix failures"
```

---

## 9. SESSION RESUMPTION

### 9.1 Resume Commands

```bash
# Resume most recent session in current directory
codex resume --last

# Resume most recent session anywhere
codex resume --last --all

# Resume specific session
codex resume 019c0539-d847-7300-9430-36423ee8199d

# Resume exec session with follow-up
codex exec resume --last "continue with..."
```

### 9.2 Session Selection Logic

1. **Directory-scoped:** Sessions tied to current working directory
2. **Global:** All sessions with `--all`
3. **Most recent:** Sorted by timestamp (descending)

---

## 10. COMPARISON: CODEX vs CLAUDE CODE

| Feature | Codex CLI | Claude Code |
|---------|-----------|-------------|
| **Command** | `codex exec` | `claude -p` |
| **JSON Output** | ✅ `--json` (JSONL) | ✅ `--output-format json` (JSON) |
| **Session Storage** | `~/.codex/sessions/` | `~/.claude/CLAUDE.md` + projects |
| **Session Format** | JSONL | JSON |
| **Session ID** | UUID in filename | Project-based |
| **Cost Tracking** | ❌ Not available | ✅ Built-in |
| **Token Tracking** | ✅ Yes | ✅ Yes |
| **Structured Output** | ✅ `--output-schema` | ❌ No |
| **Sandbox Modes** | 3 modes + platform-specific | Approval-based |
| **Resume** | ✅ `codex resume/exec resume` | ✅ `claude --resume` |
| **Auth Methods** | OAuth, API key, env var | API key only |
| **Context Files** | AGENTS.md | CLAUDE.md |
| **Model Override** | `-m` flag | `--model` |
| **Image Input** | ✅ `-i` flag | ✅ In prompt |
| **GitHub Integration** | `codex cloud` | ❌ |
| **MCP Support** | ✅ Experimental | ✅ (via claude mcp) |

### 10.1 Key Differences for Ralph

1. **Output Format:**
   - **Codex:** JSONL (streaming events)
   - **Claude:** Single JSON object

2. **Session Extraction:**
   - **Codex:** Parse UUID from filename or `thread.started` event
   - **Claude:** No explicit session ID in output

3. **Cost Tracking:**
   - **Codex:** Manual calculation from tokens
   - **Claude:** Automatic in output

4. **Structured Output:**
   - **Codex:** Native `--output-schema` support
   - **Claude:** Requires manual parsing

---

## 11. INTEGRATION PATTERNS FOR RALPH

### 11.1 Basic Subtask Execution

```bash
#!/bin/bash
# Ralph subtask using Codex

TASK="Implement user authentication"
SCHEMA='{"type":"object","properties":{"files_changed":{"type":"array","items":{"type":"string"}},"tests_added":{"type":"boolean"}},"required":["files_changed"]}'

# Run Codex with JSON output
echo "$SCHEMA" > /tmp/schema.json
output=$(codex exec --json \
  --sandbox workspace-write \
  --output-schema /tmp/schema.json \
  "$TASK" 2>/dev/null)

# Extract final message
result=$(echo "$output" | jq -s '.[] | select(.type=="item.completed" and .item.type=="agent_message") | .item.text | fromjson')

# Extract usage
usage=$(echo "$output" | jq -s '.[] | select(.type=="turn.completed") | .usage')
input_tokens=$(echo "$usage" | jq '.input_tokens')
output_tokens=$(echo "$usage" | jq '.output_tokens')

echo "Files changed: $(echo "$result" | jq '.files_changed')"
echo "Tokens: $input_tokens in, $output_tokens out"
```

### 11.2 Session Tracking

```bash
#!/bin/bash
# Track Codex session for resumption

# Run and capture output
output=$(codex exec --json "Complex refactoring task" 2>/dev/null)

# Extract session ID
session_id=$(echo "$output" | jq -r 'select(.type=="thread.started") | .thread_id')

# Store for later
mkdir -p .ralph/sessions
echo "{\"session_id\":\"$session_id\",\"task\":\"refactoring\",\"status\":\"in_progress\"}" > .ralph/sessions/codex_latest.json

# Resume later
codex exec resume "$session_id" "Continue from where you left off"
```

### 11.3 Error Handling

```bash
#!/bin/bash
# Robust error handling for Codex

run_codex_task() {
    local prompt="$1"
    local output
    local exit_code=0
    
    # Run with timeout and capture
    output=$(codex exec --json --sandbox workspace-write "$prompt" 2>&1) || exit_code=$?
    
    # Check for errors
    if echo "$output" | jq -e 'select(.type=="turn.failed")' > /dev/null; then
        error_msg=$(echo "$output" | jq -r 'select(.type=="turn.failed") | .error.message')
        echo "ERROR: Codex failed - $error_msg" >&2
        return 1
    fi
    
    # Check for error events
    if echo "$output" | jq -e 'select(.type=="error")' > /dev/null; then
        error_msg=$(echo "$output" | jq -r 'select(.type=="error") | .message' | tail -1)
        echo "ERROR: Codex error - $error_msg" >&2
        return 1
    fi
    
    # Success - extract result
    result=$(echo "$output" | jq -s '.[] | select(.type=="item.completed" and .item.type=="agent_message") | .item.text')
    echo "$result"
    return 0
}

# Usage
result=$(run_codex_task "Fix the bug") || echo "Task failed"
```

### 11.4 Multi-CLI Abstraction

```typescript
// Ralph CLI abstraction layer
interface CLISession {
  id: string;
  tokens: { input: number; output: number; cached?: number };
  cost?: number;  // Calculated for Codex
  success: boolean;
  result: any;
}

async function runCodex(prompt: string, options?: {
  sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access';
  schema?: object;
}): Promise<CLISession> {
  const args = ['exec', '--json'];
  
  if (options?.sandbox) args.push('--sandbox', options.sandbox);
  if (options?.schema) {
    await writeFile('/tmp/schema.json', JSON.stringify(options.schema));
    args.push('--output-schema', '/tmp/schema.json');
  }
  
  args.push(prompt);
  
  const { stdout } = await execa('codex', args);
  const events = stdout.trim().split('\n').map(line => JSON.parse(line));
  
  // Extract session data
  const threadEvent = events.find(e => e.type === 'thread.started');
  const turnEvent = events.find(e => e.type === 'turn.completed');
  const messageEvent = events.find(e => 
    e.type === 'item.completed' && e.item?.type === 'agent_message'
  );
  
  // Calculate approximate cost (update rates)
  const inputTokens = turnEvent?.usage?.input_tokens || 0;
  const outputTokens = turnEvent?.usage?.output_tokens || 0;
  const cost = (inputTokens * 0.000003) + (outputTokens * 0.000012);
  
  return {
    id: threadEvent?.thread_id,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      cached: turnEvent?.usage?.cached_input_tokens
    },
    cost,
    success: !events.some(e => e.type === 'turn.failed' || e.type === 'error'),
    result: messageEvent?.item?.text
  };
}
```

---

## 12. RECOMMENDATIONS FOR RALPH INTEGRATION

### 12.1 High Priority

1. **Use `--json` for all exec calls** - Essential for programmatic parsing
2. **Implement JSONL parsing** - Different from Claude's single JSON output
3. **Track sessions via `thread_id`** - Store for resumption capability
4. **Calculate cost manually** - Codex doesn't provide cost (unlike Claude)
5. **Use `--output-schema` for structured results** - Leverage native schema validation

### 12.2 CLI Detection

```bash
# Check if Codex is installed
if command -v codex &> /dev/null; then
    version=$(codex --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
    echo "Codex $version available"
fi

# Check authentication
if [ -f ~/.codex/auth.json ]; then
    echo "Codex authenticated"
fi
```

### 12.3 Environment Setup

```bash
# For CI/CD
export CODEX_API_KEY="${OPENAI_API_KEY}"
export CODEX_DISABLE_TELEMETRY=true  # If available
```

### 12.4 Best Practices

1. **Always specify sandbox mode** explicitly (don't rely on defaults)
2. **Use `--full-auto` for automation** but understand the tradeoffs
3. **Parse `turn.completed.usage` for token tracking**
4. **Handle reconnection events** (`{"type":"error","message":"Reconnecting..."}`)
5. **Check for `turn.failed` before processing results**
6. **Store session IDs** for debugging and resumption
7. **Use `workspace-write` for most dev tasks**, not `danger-full-access`

---

## 13. LIMITATIONS & CAVEATS

1. **No explicit cost tracking** - Must calculate from tokens
2. **JSONL not single JSON** - More complex parsing than Claude
3. **Requires git repository** (by default) - Use `--skip-git-repo-check` for one-offs
4. **ChatGPT account required** - OAuth flow (not just API key) for most features
5. **No built-in retry logic** - Handle `turn.failed` events
6. **Model limited by account** - Not all models available to all users
7. **Session files can be large** - Heavy usage = large JSONL files

---

## 14. TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| "not supported when using Codex with a ChatGPT account" | Use model included in your ChatGPT plan (e.g., `gpt-5.1-codex-max`) |
| "Requires git repository" | Add `--skip-git-repo-check` flag |
| Session not found | Use `--all` flag or check `~/.codex/sessions/` |
| Authentication errors | Run `codex login` or set `CODEX_API_KEY` |
| Sandbox permission denied | Use `--sandbox workspace-write` or `--full-auto` |
| JSON parse errors | Ensure `--json` flag is set; check for stderr contamination |

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-28  
**Codex CLI Version:** 0.60.1

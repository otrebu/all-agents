# Claude Code CLI Session File Format Specification

## Executive Summary

This document provides a comprehensive technical specification of the Claude Code CLI session file format, output format, and storage patterns. This specification is designed as a reference for creating adapters for other AI providers (OpenAI, Google, etc.) to integrate with Ralph and similar tools that depend on Claude session data.

**Version**: Claude Code CLI (as of January 2026)  
**Format Version**: 2.x (JSONL with typed records)

---

## Table of Contents

1. [Session File Location Patterns](#1-session-file-location-patterns)
2. [Session File Format (JSONL)](#2-session-file-format-jsonl)
3. [Output Format (JSON Mode)](#3-output-format-json-mode)
4. [Metrics and Usage Data](#4-metrics-and-usage-data)
5. [Context Files and Discovery](#5-context-files-and-discovery)
6. [Environment Variables](#6-environment-variables)
7. [Example Session Files](#7-example-session-files)
8. [Adapter Implementation Guide](#8-adapter-implementation-guide)

---

## 1. Session File Location Patterns

### 1.1 Base Directory

Claude stores session files in a configurable base directory:

```
${CLAUDE_CONFIG_DIR}  # Environment variable override
~/.claude            # Default fallback
```

**Environment Variable**: `CLAUDE_CONFIG_DIR`
- If set, overrides the default `~/.claude` location
- Used by Ralph/tools to discover Claude configuration and sessions
- Example: `export CLAUDE_CONFIG_DIR="/path/to/project/.claude"`

### 1.2 Session File Naming Convention

Session files use **UUID v4** format with `.jsonl` extension:

```
<sessionId>.jsonl

Examples:
- 19fcd253-23f6-48a8-a8e3-26921729c066.jsonl
- agent-a9211ce.jsonl                    # Subagent sessions
- 00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl
```

**Session ID Patterns**:
1. **Standard sessions**: Full UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)
2. **Subagent sessions**: Prefixed with `agent-` + short hash (e.g., `agent-a9211ce`)
3. **Custom IDs**: Can be specified via `--session-id` flag (must be valid UUID)

### 1.3 Directory Structure

Sessions are organized by project using **path encoding**:

```
${CLAUDE_CONFIG_DIR}/
├── projects/
│   ├── <encoded-path-1>/
│   │   ├── <sessionId-1>.jsonl
│   │   ├── <sessionId-2>.jsonl
│   │   └── subagents/
│   │       └── agent-<id>.jsonl
│   ├── <encoded-path-2>/
│   │   └── ...
│   └── <sessionId>.jsonl          # Flat storage (legacy)
├── sessions/
│   └── <sessionId>.jsonl          # Global sessions
└── settings.json                  # User settings
```

### 1.4 Path Encoding Schemes

Claude uses multiple encoding schemes for project paths. Adapters MUST check all locations:

#### Scheme 1: Dash-Encoding (Primary)

Replace path separators and dots with dashes:

```javascript
// Algorithm
const dashPath = repoRoot
  .replace(/\//g, '-')      // Replace / with -
  .replace(/\./g, '-')      // Replace . with -
  .replace(/^-/, '');       // Remove leading dash

// Examples
"/Users/foo/dev/bar"        → "-Users-foo-dev-bar"
"/home/user/project"        → "-home-user-project"
"/Users/Uberto.Rapizzi/dev" → "-Users-Uberto-Rapizzi-dev"
```

**Path**: `${CLAUDE_CONFIG_DIR}/projects/${dashPath}/${sessionId}.jsonl`

#### Scheme 2: Base64-Encoding (Alternative)

Base64 URL-safe encoding of the full path:

```javascript
// Algorithm
const base64Path = Buffer.from(repoRoot)
  .toString('base64url');   // URL-safe base64

// Example
"/Users/foo/dev/bar" → "L1VzZXJzL2Zvby9kZXYvYmFy"
```

**Path**: `${CLAUDE_CONFIG_DIR}/projects/${base64Path}/${sessionId}.jsonl`

#### Scheme 3: Direct/Flat Storage

Session stored directly in projects directory (no subfolder):

**Path**: `${CLAUDE_CONFIG_DIR}/projects/${sessionId}.jsonl`

#### Scheme 4: Global Sessions Directory

**Path**: `${CLAUDE_CONFIG_DIR}/sessions/${sessionId}.jsonl`

### 1.5 Session Discovery Algorithm

To find a session file, implementations MUST search in this order:

```typescript
function findSession(sessionId: string, repoRoot: string): string | null {
  const home = homedir();
  const claudeDir = process.env.CLAUDE_CONFIG_DIR ?? `${home}/.claude`;
  
  // 1. Search recursively in projects/ (most common)
  const projectsDir = `${claudeDir}/projects`;
  if (existsSync(projectsDir)) {
    const result = execSync(
      `find "${projectsDir}" -name "${sessionId}.jsonl" -type f 2>/dev/null | head -1`
    ).toString().trim();
    if (result) return result;
  }
  
  // 2. Try dash-encoded path
  const dashPath = repoRoot.replace(/\//g, '-').replace(/\./g, '-').replace(/^-/, '');
  const path2 = `${claudeDir}/projects/${dashPath}/${sessionId}.jsonl`;
  if (existsSync(path2)) return path2;
  
  // 3. Try sessions directory
  const path3 = `${claudeDir}/sessions/${sessionId}.jsonl`;
  if (existsSync(path3)) return path3;
  
  return null;
}
```

### 1.6 Subagent Sessions

Subagent sessions are stored in a `subagents/` subdirectory:

```
${CLAUDE_CONFIG_DIR}/projects/<encoded-path>/<parent-sessionId>/subagents/agent-<id>.jsonl
```

**Naming**: `agent-<shortHash>.jsonl` (e.g., `agent-a9211ce`)

---

## 2. Session File Format (JSONL)

### 2.1 File Structure

Session files are **JSON Lines (JSONL)** format:
- One JSON object per line
- No outer array wrapper
- Lines separated by newline (`\n`)
- Empty lines are ignored
- UTF-8 encoding

```jsonl
{"type":"user","message":"Hello"}
{"type":"assistant","message":"Hi there!"}
{"type":"tool_use","name":"Read","input":{"file_path":"/path/to/file"}}
```

### 2.2 Record Types

All records have a `type` field. These are the known types:

| Type | Description | Key Fields |
|------|-------------|------------|
| `user` | User message/input | `message`, `timestamp` |
| `assistant` | Assistant response | `message`, `timestamp`, `usage` |
| `tool_use` | Tool invocation | `name`, `input`, `tool_use_id` |
| `tool_result` | Tool execution result | `content`, `tool_use_id` |
| `summary` | Session summary | `summary` |
| `file-history-snapshot` | File state capture | `files` |
| `system` | System message | `message` |

### 2.3 Type: `user`

User-submitted prompts or messages.

```json
{
  "type": "user",
  "message": "Read the config file and update the version number",
  "timestamp": "2026-01-26T10:00:00.000Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "uuid": "uuid-123",
  "parentUuid": null
}
```

**Fields**:
- `type` (string, required): Always `"user"`
- `message` (string, required): User input text
- `timestamp` (string, ISO 8601): When the message was sent
- `sessionId` (string): Session identifier
- `uuid` (string): Unique message identifier
- `parentUuid` (string | null): Parent message UUID

### 2.4 Type: `assistant`

Assistant responses with optional token usage.

```json
{
  "type": "assistant",
  "message": {
    "content": [{ "type": "text", "text": "I'll help you with that." }],
    "id": "msg_01ABC123",
    "model": "claude-sonnet-4-20250514",
    "role": "assistant",
    "stop_reason": "end_turn",
    "type": "message",
    "usage": {
      "input_tokens": 1500,
      "output_tokens": 250,
      "cache_read_input_tokens": 5000,
      "cache_creation_input_tokens": 1000,
      "cache_creation": {
        "ephemeral_1h_input_tokens": 0
      },
      "service_tier": "standard"
    }
  },
  "timestamp": "2026-01-26T10:00:05.000Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "uuid": "uuid-456",
  "parentUuid": "uuid-123",
  "isSidechain": false,
  "requestId": "req_123",
  "userType": "external",
  "version": "2.1.4"
}
```

**Fields**:
- `type` (string): Always `"assistant"`
- `message` (object): Response metadata
  - `content` (array): Content blocks (text, tool_use, etc.)
  - `id` (string): Message ID from API
  - `model` (string): Model identifier
  - `role` (string): Always `"assistant"`
  - `stop_reason` (string): Why generation stopped
  - `type` (string): Always `"message"`
  - `usage` (object): Token usage statistics
- `timestamp` (string, ISO 8601)
- `sessionId` (string)
- `uuid` (string)
- `parentUuid` (string | null)
- `isSidechain` (boolean): Whether this is a sidechain message
- `requestId` (string): API request ID
- `userType` (string): `"external"` or `"internal"`
- `version` (string): Claude Code version
- `gitBranch` (string, optional): Current git branch

### 2.5 Type: `tool_use`

Tool invocations by the assistant.

```json
{
  "type": "tool_use",
  "name": "Read",
  "input": {
    "file_path": "/path/to/file.txt",
    "offset": 0,
    "limit": 2000
  },
  "tool_use_id": "toolu_01ABC123",
  "timestamp": "2026-01-26T10:00:10.000Z"
}
```

**Common Tool Types**:

#### Read Tool
```json
{
  "type": "tool_use",
  "name": "Read",
  "input": {
    "file_path": "/absolute/path/to/file",
    "offset": 0,      // Optional: line number to start
    "limit": 2000     // Optional: max lines to read
  }
}
```

#### Write Tool
```json
{
  "type": "tool_use",
  "name": "Write",
  "input": {
    "file_path": "/absolute/path/to/file",
    "content": "file content here"
  }
}
```

#### Edit Tool
```json
{
  "type": "tool_use",
  "name": "Edit",
  "input": {
    "file_path": "/absolute/path/to/file",
    "old_string": "text to find",
    "new_string": "replacement text",
    "replace_all": false  // Optional
  }
}
```

#### Bash Tool
```json
{
  "type": "tool_use",
  "name": "Bash",
  "input": {
    "command": "ls -la",
    "description": "List files",
    "timeout": 120000,           // Optional: ms
    "run_in_background": false   // Optional
  }
}
```

#### Glob Tool
```json
{
  "type": "tool_use",
  "name": "Glob",
  "input": {
    "pattern": "**/*.ts",
    "path": "/optional/base/path"
  }
}
```

#### Grep Tool
```json
{
  "type": "tool_use",
  "name": "Grep",
  "input": {
    "pattern": "function.*test",
    "path": "/optional/base/path",
    "include": "*.ts"
  }
}
```

#### WebFetch Tool
```json
{
  "type": "tool_use",
  "name": "WebFetch",
  "input": {
    "url": "https://example.com",
    "format": "markdown"  // or "text", "html"
  }
}
```

#### WebSearch Tool
```json
{
  "type": "tool_use",
  "name": "WebSearch",
  "input": {
    "query": "Claude Code documentation"
  }
}
```

### 2.6 Type: `tool_result`

Results from tool execution.

```json
{
  "type": "tool_result",
  "content": "file contents or command output",
  "tool_use_id": "toolu_01ABC123",
  "timestamp": "2026-01-26T10:00:11.000Z",
  "is_error": false
}
```

**Fields**:
- `type` (string): Always `"tool_result"`
- `content` (string): Tool output
- `tool_use_id` (string): Matches the `tool_use` that triggered this
- `timestamp` (string, ISO 8601)
- `is_error` (boolean, optional): Whether tool failed

### 2.7 Type: `summary`

Session summary generated by Claude.

```json
{
  "type": "summary",
  "summary": "User asked to update version number in package.json. Successfully updated from 1.0.0 to 1.1.0.",
  "timestamp": "2026-01-26T10:00:15.000Z"
}
```

**Fields**:
- `type` (string): Always `"summary"`
- `summary` (string): Human-readable summary
- `timestamp` (string, ISO 8601)

### 2.8 Type: `file-history-snapshot`

Captures file state for undo/history.

```json
{
  "type": "file-history-snapshot",
  "files": {
    "/path/to/file.txt": {
      "content": "previous file content",
      "timestamp": "2026-01-26T09:59:59.000Z"
    }
  },
  "timestamp": "2026-01-26T10:00:00.000Z"
}
```

### 2.9 Token Usage Schema

Token usage appears in `assistant` messages under `message.usage`:

```json
{
  "usage": {
    "input_tokens": 1500,                    // Non-cached input tokens
    "output_tokens": 250,                    // Generated tokens
    "cache_read_input_tokens": 5000,         // Read from cache
    "cache_creation_input_tokens": 1000,     // New cache entries
    "cache_creation": {
      "ephemeral_1h_input_tokens": 0         // Ephemeral cache tokens
    },
    "service_tier": "standard"               // API tier used
  }
}
```

**Token Calculation**:
```typescript
// Context window size (for monitoring)
const contextTokens = 
  usage.cache_read_input_tokens + 
  usage.cache_creation_input_tokens + 
  usage.input_tokens;

// Total cost calculation (simplified)
const outputTokens = usage.output_tokens;
```

---

## 3. Output Format (JSON Mode)

### 3.1 Invocation

JSON output is enabled with `--output-format json` flag:

```bash
claude -p "Your prompt here" --output-format json
```

### 3.2 Output Structure

Claude outputs a **JSON array** where each element is a typed message:

```json
[
  {"type": "system", ...},
  {"type": "user", ...},
  {"type": "assistant", ...},
  {"type": "result", ...}
]
```

### 3.3 Message Types in Output

#### Type: `system`

System initialization messages.

```json
{
  "type": "system",
  "message": "Initializing Claude Code...",
  "timestamp": "2026-01-26T10:00:00.000Z"
}
```

#### Type: `user`

Echo of user prompt.

```json
{
  "type": "user",
  "message": "Explain this code",
  "timestamp": "2026-01-26T10:00:00.000Z"
}
```

#### Type: `assistant`

Assistant response (same structure as session file).

#### Type: `result` (CRITICAL)

**Final message** containing session statistics. This is what Ralph extracts for metrics.

```json
{
  "type": "result",
  "result": "The assistant's final response text...",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "duration_ms": 15420,
  "num_turns": 5,
  "total_cost_usd": 0.0234
}
```

**Fields**:
- `type` (string): Always `"result"`
- `result` (string): Final response content
- `session_id` (string): Session ID for lookup
- `duration_ms` (number): Total session duration in milliseconds
- `num_turns` (number): Number of assistant turns
- `total_cost_usd` (number): Estimated total cost in USD

### 3.4 Parsing Algorithm

```typescript
interface ClaudeJsonOutput {
  type?: string;
  result?: string;
  session_id?: string;
  duration_ms?: number;
  total_cost_usd?: number;
  num_turns?: number;
}

function parseClaudeOutput(stdout: string): HeadlessResult {
  const parsed = JSON.parse(stdout) as ClaudeJsonOutput[] | ClaudeJsonOutput;
  
  // Handle both array and object output
  const output: ClaudeJsonOutput = Array.isArray(parsed)
    ? (parsed.findLast(entry => entry.type === "result") ?? parsed.at(-1) ?? {})
    : parsed;
  
  return {
    result: output.result ?? "",
    sessionId: output.session_id ?? "",
    duration: output.duration_ms ?? 0,
    cost: output.total_cost_usd ?? 0
  };
}
```

### 3.5 Stream JSON Output

With `--output-format stream-json`, Claude outputs newline-delimited JSON:

```jsonl
{"type":"system","message":"Initializing..."}
{"type":"assistant","message":"Working..."}
{"type":"result","session_id":"...","total_cost_usd":0.01}
```

---

## 4. Metrics and Usage Data

### 4.1 Available Metrics

#### From Session File (JSONL)

| Metric | Source | Calculation |
|--------|--------|-------------|
| **Tool Calls** | Count `type:"tool_use"` entries | `grep -c '"type":"tool_use"'` |
| **Duration** | First/last timestamp | `last.timestamp - first.timestamp` |
| **Files Modified** | Extract from `Write`/`Edit` tools | Parse `file_path` fields |
| **Context Tokens** | Last `assistant` message | `cache_read + cache_creation + input` |
| **Output Tokens** | Sum all `assistant` messages | Sum `output_tokens` |

#### From JSON Output

| Metric | Field | Type |
|--------|-------|------|
| **Cost** | `total_cost_usd` | number |
| **Duration** | `duration_ms` | number (ms) |
| **Turns** | `num_turns` | number |
| **Session ID** | `session_id` | string |
| **Result** | `result` | string |

### 4.2 Cost Calculation

Claude provides estimated cost in `total_cost_usd`. For manual calculation:

```typescript
// Simplified pricing (varies by model)
const INPUT_COST_PER_1K = 0.003;    // $3 per 1M tokens
const OUTPUT_COST_PER_1K = 0.015;   // $15 per 1M tokens
const CACHE_READ_COST_PER_1K = 0.0003;   // $0.30 per 1M tokens
const CACHE_WRITE_COST_PER_1K = 0.00375; // $3.75 per 1M tokens

function calculateCost(usage: TokenUsage): number {
  const inputCost = (usage.input_tokens / 1000) * INPUT_COST_PER_1K;
  const outputCost = (usage.output_tokens / 1000) * OUTPUT_COST_PER_1K;
  const cacheReadCost = (usage.cache_read_input_tokens / 1000) * CACHE_READ_COST_PER_1K;
  const cacheWriteCost = (usage.cache_creation_input_tokens / 1000) * CACHE_WRITE_COST_PER_1K;
  
  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}
```

### 4.3 Duration Calculation

```typescript
function calculateDuration(sessionPath: string): number {
  const content = readFileSync(sessionPath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  
  if (lines.length < 2) return 0;
  
  const first = JSON.parse(lines[0]);
  const last = JSON.parse(lines[lines.length - 1]);
  
  const startMs = new Date(first.timestamp).getTime();
  const endMs = new Date(last.timestamp).getTime();
  
  return endMs - startMs;  // Duration in milliseconds
}
```

---

## 5. Context Files and Discovery

### 5.1 CLAUDE.md Discovery

Claude automatically discovers `CLAUDE.md` files:

**Search Order**:
1. Current working directory: `./CLAUDE.md`
2. Parent directories (up to git root)
3. `${CLAUDE_CONFIG_DIR}/CLAUDE.md`

**Behavior**:
- Content is prepended to system prompt
- Multiple CLAUDE.md files can be loaded (from different levels)
- Files are concatenated in discovery order

### 5.2 System Prompt Modification

Claude provides four flags for modifying the system prompt:

| Flag | Behavior | Mode |
|------|----------|------|
| `--system-prompt` | **Replaces** entire default prompt | Interactive + Print |
| `--system-prompt-file` | **Replaces** with file contents | Print only |
| `--append-system-prompt` | **Appends** to default prompt | Interactive + Print |
| `--append-system-prompt-file` | **Appends** file contents | Print only |

**Example** (from Ralph):
```bash
claude \
  --permission-mode bypassPermissions \
  --append-system-prompt "${fullPrompt}" \
  "Please begin the session."
```

### 5.3 Settings Files

Claude loads settings from multiple sources (in order):

1. `~/.claude/settings.json` - User settings
2. `${CLAUDE_CONFIG_DIR}/settings.json` - Project settings (if CLAUDE_CONFIG_DIR set)
3. `.claude/settings.json` - Project settings (in repo)
4. `.claude/settings.local.json` - Local settings (gitignored)

**Settings Schema** (relevant to adapters):
```json
{
  "hooks": {
    "SessionEnd": [{
      "hooks": [{
        "type": "command",
        "command": "ralph hooks:session-end"
      }]
    }]
  },
  "agent": "default",
  "permissionMode": "acceptEdits"
}
```

---

## 6. Environment Variables

### 6.1 Claude-Defined Variables

| Variable | Description | Set By |
|----------|-------------|--------|
| `CLAUDE_CONFIG_DIR` | Base directory for Claude config | User |
| `CLAUDE_PROJECT_DIR` | Project root directory | Claude (hooks only) |
| `CLAUDE_PLUGIN_ROOT` | Plugin directory path | Claude (plugins only) |
| `CLAUDE_ENV_FILE` | File for persisting env vars | Claude (SessionStart hooks) |
| `CLAUDE_CODE_REMOTE` | `"true"` if running on web | Claude |

### 6.2 Hook Input Schema

Hooks receive JSON via stdin with common fields:

```json
{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../session.jsonl",
  "cwd": "/current/working/dir",
  "permission_mode": "default",
  "hook_event_name": "SessionEnd",
  "reason": "exit"
}
```

**Common Fields**:
- `session_id` (string): Session identifier
- `transcript_path` (string): Full path to session JSONL file
- `cwd` (string): Working directory when hook fired
- `permission_mode` (string): Current permission mode
- `hook_event_name` (string): Which hook fired

---

## 7. Example Session Files

### 7.1 Simple Session

```jsonl
{"type":"user","message":"Read the config file and update the version number","timestamp":"2026-01-26T10:00:00.000Z","uuid":"uuid-1"}
{"type":"assistant","message":"I'll read the config file first.","timestamp":"2026-01-26T10:00:01.000Z","uuid":"uuid-2","parentUuid":"uuid-1"}
{"type":"tool_use","name":"Bash","input":{"command":"cat package.json"},"tool_use_id":"toolu_1","timestamp":"2026-01-26T10:00:02.000Z"}
{"type":"tool_result","content":"{\"name\": \"test-app\", \"version\": \"1.0.0\"}","tool_use_id":"toolu_1","timestamp":"2026-01-26T10:00:03.000Z"}
{"type":"assistant","message":"Now I'll update the version number.","timestamp":"2026-01-26T10:00:04.000Z","uuid":"uuid-3","parentUuid":"uuid-2"}
{"type":"tool_use","name":"Bash","input":{"command":"echo '{\"name\": \"test-app\", \"version\": \"1.1.0\"}' > package.json"},"tool_use_id":"toolu_2","timestamp":"2026-01-26T10:00:05.000Z"}
{"type":"tool_result","content":"","tool_use_id":"toolu_2","timestamp":"2026-01-26T10:00:06.000Z"}
{"type":"assistant","message":"Done. I've updated the version from 1.0.0 to 1.1.0.","timestamp":"2026-01-26T10:00:07.000Z","uuid":"uuid-4","parentUuid":"uuid-3","message":{"usage":{"input_tokens":50,"output_tokens":15,"cache_read_input_tokens":0,"cache_creation_input_tokens":0}}}
{"type":"summary","summary":"Updated package.json version from 1.0.0 to 1.1.0","timestamp":"2026-01-26T10:00:08.000Z"}
```

### 7.2 Complex Session with Token Usage

```jsonl
{"type":"user","message":"Implement a comprehensive authentication module","timestamp":"2026-01-26T10:00:00.000Z","sessionId":"550e8400-e29b-41d4-a716-446655440000","uuid":"usr-001"}
{"type":"assistant","message":{"content":[{"type":"text","text":"I'll implement a comprehensive authentication module. Let me start by examining the existing codebase structure."}],"id":"msg_01ABC","model":"claude-sonnet-4-20250514","role":"assistant","stop_reason":"end_turn","type":"message","usage":{"input_tokens":1500,"output_tokens":45,"cache_read_input_tokens":0,"cache_creation_input_tokens":1449}},"timestamp":"2026-01-26T10:00:05.000Z","sessionId":"550e8400-e29b-41d4-a716-446655440000","uuid":"ast-001","parentUuid":"usr-001","isSidechain":false,"requestId":"req_001","userType":"external","version":"2.1.4"}
{"type":"tool_use","name":"Glob","input":{"pattern":"**/*auth*"},"tool_use_id":"toolu_001","timestamp":"2026-01-26T10:00:06.000Z"}
{"type":"tool_result","content":"[\"/src/auth/handlers/login.ts\",\"/src/auth/handlers/logout.ts\"]","tool_use_id":"toolu_001","timestamp":"2026-01-26T10:00:07.000Z"}
{"type":"assistant","message":{"content":[{"type":"text","text":"I found existing auth handlers. Let me read them to understand the current implementation."}],"id":"msg_02DEF","model":"claude-sonnet-4-20250514","role":"assistant","stop_reason":"end_turn","type":"message","usage":{"input_tokens":1600,"output_tokens":25,"cache_read_input_tokens":1449,"cache_creation_input_tokens":0}},"timestamp":"2026-01-26T10:00:12.000Z","sessionId":"550e8400-e29b-41d4-a716-446655440000","uuid":"ast-002","parentUuid":"ast-001"}
{"type":"tool_use","name":"Read","input":{"file_path":"/src/auth/handlers/login.ts"},"tool_use_id":"toolu_002","timestamp":"2026-01-26T10:00:13.000Z"}
{"type":"tool_result","content":"export function login(req: Request, res: Response) { ... }","tool_use_id":"toolu_002","timestamp":"2026-01-26T10:00:14.000Z"}
{"type":"summary","summary":"Implemented comprehensive authentication module with JWT support, middleware, and handlers","timestamp":"2026-01-26T10:05:00.000Z"}
```

### 7.3 JSON Output Example

```bash
$ claude -p "Say hello" --output-format json
```

```json
[
  {
    "type": "system",
    "message": "Initializing Claude Code...",
    "timestamp": "2026-01-26T10:00:00.000Z"
  },
  {
    "type": "user",
    "message": "Say hello",
    "timestamp": "2026-01-26T10:00:00.500Z"
  },
  {
    "type": "assistant",
    "message": "Hello! How can I help you today?",
    "timestamp": "2026-01-26T10:00:02.000Z"
  },
  {
    "type": "result",
    "result": "Hello! How can I help you today?",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "duration_ms": 2500,
    "num_turns": 1,
    "total_cost_usd": 0.0003
  }
]
```

---

## 8. Adapter Implementation Guide

### 8.1 For Other AI Providers

To adapt another AI provider (OpenAI, Google, etc.) to work with Ralph:

#### Required: Session File Format

Your adapter MUST produce JSONL files with these minimum fields:

```jsonl
{"type":"user","message":"User prompt","timestamp":"2026-01-26T10:00:00.000Z"}
{"type":"assistant","message":"Assistant response","timestamp":"2026-01-26T10:00:05.000Z","message":{"usage":{"input_tokens":100,"output_tokens":50}}}
{"type":"tool_use","name":"ToolName","input":{"param":"value"},"timestamp":"2026-01-26T10:00:06.000Z"}
{"type":"tool_result","content":"Tool output","timestamp":"2026-01-26T10:00:07.000Z"}
```

#### Required: JSON Output Format

When invoked with `--output-format json` equivalent:

```json
[
  {"type":"result","result":"Final output","session_id":"uuid","duration_ms":5000,"total_cost_usd":0.01}
]
```

#### Required: File Locations

Store sessions using Claude's path encoding:
- Dash-encoded: `~/.claude/projects/-path-to-project/<sessionId>.jsonl`
- Or your own location with `PROVIDER_CONFIG_DIR` env var

#### Recommended: Environment Variables

Support these for compatibility:
- `PROVIDER_CONFIG_DIR` - Override default config location
- `PROVIDER_PROJECT_DIR` - Set in hooks

### 8.2 TypeScript Types Reference

```typescript
// Session file record types
interface SessionRecord {
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'summary' | 'file-history-snapshot';
  timestamp?: string;
  sessionId?: string;
  uuid?: string;
  parentUuid?: string | null;
}

interface UserRecord extends SessionRecord {
  type: 'user';
  message: string;
}

interface AssistantRecord extends SessionRecord {
  type: 'assistant';
  message: {
    content?: Array<{type: string; text?: string}>;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  } | string;
  gitBranch?: string;
}

interface ToolUseRecord extends SessionRecord {
  type: 'tool_use';
  name: string;
  input: Record<string, unknown>;
  tool_use_id: string;
}

interface ToolResultRecord extends SessionRecord {
  type: 'tool_result';
  content: string;
  tool_use_id: string;
  is_error?: boolean;
}

// JSON output types
interface JsonOutputRecord {
  type: 'system' | 'user' | 'assistant' | 'result';
}

interface ResultRecord extends JsonOutputRecord {
  type: 'result';
  result: string;
  session_id: string;
  duration_ms: number;
  num_turns: number;
  total_cost_usd: number;
}

// Token usage
interface TokenUsage {
  contextTokens: number;  // Final context window
  outputTokens: number;   // Sum of all outputs
}
```

### 8.3 Testing Your Adapter

Verify your adapter produces compatible output:

```bash
# 1. Test session file format
your-adapter -p "test" --output-format json
# Should output valid JSON array with result type

# 2. Test session file creation
ls ~/.your-adapter/projects/-path-to-project/*.jsonl
# Should find the session file

# 3. Test tool call tracking
cat session.jsonl | grep '"type":"tool_use"' | wc -l
# Should count tool calls correctly

# 4. Test token extraction
# Implement getTokenUsageFromSession equivalent
```

---

## Appendix A: Complete Field Reference

### Session File Fields by Type

#### All Records
| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Record discriminator |
| `timestamp` | string (ISO 8601) | When record was created |
| `sessionId` | string | Session identifier |
| `uuid` | string | Unique record ID |
| `parentUuid` | string \| null | Parent message reference |

#### User Records
| Field | Type | Description |
|-------|------|-------------|
| `message` | string | User input text |

#### Assistant Records
| Field | Type | Description |
|-------|------|-------------|
| `message` | object \| string | Response content |
| `message.content` | array | Content blocks |
| `message.usage` | object | Token statistics |
| `gitBranch` | string | Current git branch |
| `isSidechain` | boolean | Sidechain flag |
| `requestId` | string | API request ID |
| `userType` | string | "external" or "internal" |
| `version` | string | Claude Code version |

#### Tool Use Records
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Tool name (Read, Write, Edit, Bash, etc.) |
| `input` | object | Tool parameters |
| `tool_use_id` | string | Unique tool invocation ID |

#### Tool Result Records
| Field | Type | Description |
|-------|------|-------------|
| `content` | string | Tool output |
| `tool_use_id` | string | Matches tool_use |
| `is_error` | boolean | Whether tool failed |

#### Summary Records
| Field | Type | Description |
|-------|------|-------------|
| `summary` | string | Human-readable summary |

### JSON Output Fields by Type

#### Result Record
| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always "result" |
| `result` | string | Final response |
| `session_id` | string | Session ID |
| `duration_ms` | number | Duration in milliseconds |
| `num_turns` | number | Number of turns |
| `total_cost_usd` | number | Cost in USD |

---

## Appendix B: Error Handling

### Malformed JSON Lines

Session files may contain malformed lines. Implementations should:

```typescript
function parseSessionFile(content: string): SessionRecord[] {
  const lines = content.split('\n').filter(l => l.trim());
  const records: SessionRecord[] = [];
  
  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch (e) {
      // Skip malformed lines
      console.warn(`Skipping malformed line: ${line.slice(0, 100)}`);
    }
  }
  
  return records;
}
```

### Missing Fields

Use defensive parsing with defaults:

```typescript
function extractTokenUsage(record: AssistantRecord): TokenUsage {
  const usage = record.message?.usage ?? {};
  return {
    input_tokens: usage.input_tokens ?? 0,
    output_tokens: usage.output_tokens ?? 0,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0
  };
}
```

---

## Appendix C: Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.1.4 | Jan 2026 | Current version with full usage schema |
| 2.0.0 | 2025 | Added cache token tracking |
| 1.x | 2024 | Initial JSONL format |

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-28  
**Author**: Research compiled from Claude Code CLI documentation and source code analysis

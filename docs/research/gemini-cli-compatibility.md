# Google Gemini CLI Technical Specification

## Overview

Comprehensive analysis of Google Gemini CLI session/output format based on existing codebase implementation and CLI testing.

---

## 1. Command Structure

### Installation
```bash
npm add -g @google/gemini-cli
```

### Headless Mode Syntax

**Basic syntax:**
```bash
gemini -p "<prompt>" --output-format json
```

**Full command reference:**
```bash
gemini [options] [command]

# Non-interactive (headless) mode
gemini -p "prompt text" [--output-format <format>]

# With query positionals
gemini "query text" -p "additional context"
```

### Flag Reference

| Flag | Short | Description | Values |
|------|-------|-------------|---------|
| `--prompt` | `-p` | Prompt text (appended to stdin if any) | String |
| `--prompt-interactive` | `-i` | Execute prompt and continue interactively | String |
| `--output-format` | `-o` | Output format | `text`, `json`, `stream-json` |
| `--sandbox` | `-s` | Run in sandbox mode | Boolean |
| `--model` | `-m` | Model selection | String (e.g., `gemini-2.5-pro`) |
| `--yolo` | `-y` | Auto-accept all actions | Boolean |
| `--approval-mode` | | Approval mode | `default`, `auto_edit`, `yolo`, `plan` |
| `--resume` | `-r` | Resume previous session | `latest` or index number |
| `--list-sessions` | | List available sessions | Boolean |
| `--delete-session` | | Delete session by index | String |
| `--debug` | `-d` | Debug mode | Boolean |

### Output Formats

#### 1. Text Format (Default)
```bash
gemini -p "hello"
# Plain text response
```

#### 2. JSON Format
```bash
gemini -p "hello" --output-format json
```

**Structure:**
```json
{
  "session_id": "uuid-string",
  "response": "The actual response text",
  "stats": {
    "models": {
      "gemini-2.5-flash-lite": {
        "api": {
          "totalRequests": 1,
          "totalErrors": 0,
          "totalLatencyMs": 1427
        },
        "tokens": {
          "input": 6237,
          "prompt": 6237,
          "candidates": 54,
          "total": 6394,
          "cached": 0,
          "thoughts": 103,
          "tool": 0
        }
      }
    },
    "tools": {
      "totalCalls": 3,
      "totalSuccess": 3,
      "totalFail": 0,
      "totalDurationMs": 12,
      "totalDecisions": {
        "accept": 0,
        "reject": 0,
        "modify": 0,
        "auto_accept": 3
      },
      "byName": {
        "read_file": {
          "count": 3,
          "success": 3,
          "fail": 0,
          "durationMs": 12,
          "decisions": { "accept": 0, "reject": 0, "modify": 0, "auto_accept": 3 }
        }
      }
    },
    "files": {
      "totalLinesAdded": 0,
      "totalLinesRemoved": 0
    }
  }
}
```

#### 3. Stream-JSON Format
```bash
gemini -p "hello" --output-format stream-json
```

**Structure:** NDJSON (Newline Delimited JSON) with event types:

```json
{"type":"init","timestamp":"2026-01-28T15:08:23.541Z","session_id":"uuid","model":"auto-gemini-3"}
{"type":"message","timestamp":"2026-01-28T15:08:23.542Z","role":"user","content":"test"}
{"type":"tool_use","timestamp":"...","tool_name":"read_file","tool_id":"...","parameters":{}}
{"type":"tool_result","timestamp":"...","tool_id":"...","status":"success","output":"..."}
{"type":"message","timestamp":"...","role":"assistant","content":"..."}
```

**Event Types:**
- `init`: Session initialization
- `message`: User/assistant messages
- `tool_use`: Tool invocation
- `tool_result`: Tool execution result
- `error`: Error events

---

## 2. Session Storage

### Storage Location

**Base Directory:**
```
~/.gemini/
```

**Key Files:**
| File | Purpose | Format |
|------|---------|--------|
| `settings.json` | User preferences | JSON |
| `state.json` | Application state | JSON |
| `google_accounts.json` | Auth accounts | JSON |
| `oauth_creds.json` | OAuth credentials | JSON |
| `extensions/extension-enablement.json` | Extension config | JSON |

### Session List

Gemini tracks interactive sessions automatically:
```bash
gemini --list-sessions
# Shows 44 sessions with:
# - Prompt preview (truncated)
# - Age (e.g., "69 days ago")
# - UUID [a3fc2135-e4ac-4559-b82d-301f8b0e68d8]
```

**Session Storage Format:**
- Sessions are stored internally by the CLI
- No direct file access to session data
- Access via `--resume <index|latest>` flag

### Settings Configuration

**`~/.gemini/settings.json`:**
```json
{
  "security": {
    "auth": {
      "selectedType": "oauth-personal"
    }
  },
  "general": {
    "vimMode": true,
    "previewFeatures": true,
    "enablePromptCompletion": true
  },
  "output": {
    "format": "text"
  },
  "ui": {
    "showMemoryUsage": true
  },
  "tools": {
    "shell": {
      "showColor": true
    }
  }
}
```

---

## 3. Output Format Schema (JSON)

### Top-Level Structure

```typescript
interface GeminiJsonOutput {
  session_id: string;        // UUID v4 format
  response: string;          // Assistant's text response
  stats: GeminiStats;        // Detailed metrics
}
```

### Stats Schema

```typescript
interface GeminiStats {
  models: Record<string, ModelStats>;  // Per-model metrics
  tools: ToolStats;                    // Tool usage metrics
  files: FileStats;                    // File operation metrics
}

interface ModelStats {
  api: {
    totalRequests: number;
    totalErrors: number;
    totalLatencyMs: number;
  };
  tokens: {
    input: number;       // Input tokens
    prompt: number;      // Prompt tokens
    candidates: number;  // Output tokens
    total: number;       // Total tokens
    cached: number;      // Cached tokens
    thoughts: number;    // Thinking/reasoning tokens
    tool: number;        // Tool-related tokens
  };
}

interface ToolStats {
  totalCalls: number;
  totalSuccess: number;
  totalFail: number;
  totalDurationMs: number;
  totalDecisions: {
    accept: number;
    reject: number;
    modify: number;
    auto_accept: number;
  };
  byName: Record<string, ToolMetrics>;
}

interface ToolMetrics {
  count: number;
  success: number;
  fail: number;
  durationMs: number;
  decisions: {
    accept: number;
    reject: number;
    modify: number;
    auto_accept: number;
  };
}

interface FileStats {
  totalLinesAdded: number;
  totalLinesRemoved: number;
}
```

### Available Metrics

| Metric Category | Fields | Description |
|----------------|--------|-------------|
| **Cost** | ❌ NOT INCLUDED | Gemini CLI does NOT expose cost |
| **Tokens** | `input`, `output`, `total`, `cached`, `thoughts` | Detailed token breakdown |
| **Latency** | `totalLatencyMs` | Request latency |
| **Duration** | `totalDurationMs` | Tool execution time |
| **Requests** | `totalRequests`, `totalErrors` | API call counts |
| **Tools** | `totalCalls`, `success`, `fail` | Tool usage stats |
| **Files** | `linesAdded`, `linesRemoved` | File operations |

---

## 4. Metrics Analysis

### Token Tracking

**Detailed token metrics per model:**
- `input`: Total input tokens (prompt + context)
- `prompt`: Prompt-specific tokens
- `candidates`: Generated/output tokens
- `total`: Combined total
- `cached`: Cached context tokens (saves cost)
- `thoughts`: Reasoning/thinking tokens
- `tool`: Tool invocation tokens

### Cost Tracking

**⚠️ IMPORTANT:** Gemini CLI does **NOT** include cost metrics in output.

**Workaround:** Use token counts with Google AI Studio pricing:
- Input: $0.075 per 1M tokens (Gemini 2.5 Flash)
- Output: $0.30 per 1M tokens (Gemini 2.5 Flash)
- Cached: $0.01875 per 1M tokens (25% of input)

### Rate Limits

**Free Tier (as documented):**
- 60 requests/minute
- 1,000 requests/day

**Error Response:**
```
Error: Rate limit exceeded
```

**Retry Behavior:**
- Auto-retry with exponential backoff
- Shows: "Attempt 1 failed: You have exhausted your capacity... Retrying after 1951ms..."

---

## 5. Context Files & System Prompts

### GEMINI.md Support

**❌ No native GEMINI.md support** (unlike CLAUDE.md)

**Current State:**
- No automatic context file loading
- No system prompt flag
- Context must be passed via `-p` flag

**Workaround (used in codebase):**
```typescript
// Load prompt from template file
const prompt = TEMPLATES[mode].replace("%QUERY%", query);

// Execute with full prompt inline
await execa`gemini -p "${prompt}" --output-format json`;
```

### System Prompt Patterns

**Pattern 1: Inline Template (Current Implementation)**
```typescript
const TEMPLATES = {
  quick: `Use GoogleSearch to research: %QUERY%
Execute 2-3 diverse queries...
Return JSON: {...}`,
  deep: `Use GoogleSearch to deeply research: %QUERY%...
Return JSON: {...}`,
  code: `Use GoogleSearch to find code examples: %QUERY%...
Return JSON: {...}`
};
```

**Pattern 2: File-based (Future)**
```bash
# Not supported natively, would require:
gemini -p "$(cat GEMINI.md)" -p "$(cat task.md)" --output-format json
```

---

## 6. Sandbox Mode

### Enable Sandbox
```bash
gemini -p "command" --sandbox
# or
gemini -p "command" -s
```

**Behavior:**
- Runs tools in isolated environment
- Restricted file system access
- Limited network access
- Tool execution requires explicit approval (unless --yolo)

---

## 7. Comparison with Claude CLI

| Feature | Gemini CLI | Claude CLI |
|---------|-----------|-----------|
| **Headless flag** | `-p` / `--prompt` | `-p` / `--print` |
| **Output formats** | `text`, `json`, `stream-json` | `text`, `json`, `jsonl` |
| **Session storage** | `~/.gemini/` | `~/.claude/` |
| **Session format** | Internal/binary | `.jsonl` files |
| **Context file** | ❌ No GEMINI.md | ✅ CLAUDE.md |
| **Cost tracking** | ❌ Not included | ✅ Included in JSON |
| **Token tracking** | ✅ Detailed per-model | ✅ Total only |
| **Tool stats** | ✅ Detailed | ✅ Basic |
| **Rate limits** | 60/min free tier | Varies by tier |
| **Resume session** | `--resume <index>` | N/A |
| **Sandbox** | `--sandbox` | `--permission-mode` |
| **API Key** | OAuth only | API key |

### Key Differences

**1. Output Structure:**
```json
// Gemini
{
  "session_id": "uuid",
  "response": "text",
  "stats": { "models": {}, "tools": {}, "files": {} }
}

// Claude
[
  {
    "type": "message",
    "role": "assistant",
    "content": [{ "type": "text", "text": "..." }]
  },
  {
    "type": "usage",
    "usage": { "input_tokens": 100, "output_tokens": 50, "cost_usd": 0.001 }
  }
]
```

**2. Cost Tracking:**
- Gemini: ❌ No cost field
- Claude: ✅ `cost_usd` field

**3. Session Format:**
- Gemini: Binary/internal storage
- Claude: JSONL text files

**4. Context Loading:**
- Gemini: Manual via `-p` flag
- Claude: Automatic CLAUDE.md loading

---

## 8. Implementation Notes (from Codebase)

### Current Implementation

**Location:** `tools/src/commands/gemini/`

**Files:**
- `index.ts` - Command implementation
- `types.ts` - TypeScript interfaces

**Key Implementation Details:**

```typescript
// Parse Gemini response (handles wrapper object)
function parseGeminiResponse(stdout: string): GeminiResponse {
  const parsed = JSON.parse(stdout);
  
  // Extract from { response: "..." } wrapper
  const content = parsed?.response ?? parsed;
  
  // Clean markdown blocks if present
  const cleanContent = typeof content === 'string' 
    ? content.replaceAll(/```json\n?|\n?```/g, "")
    : JSON.stringify(content);
  
  return JSON.parse(cleanContent);
}
```

**Modes:**
- `quick`: 2-3 queries, 5-8 sources
- `deep`: 4-6 queries, 10-15 sources, contradictions analysis
- `code`: 3-4 code-focused queries, 6-10 sources with snippets

**Response Schema (from types.ts):**
```typescript
interface GeminiResponse {
  queries_used: string[];
  sources: Array<{ title: string; url: string }>;
  key_points: string[];
  quotes: Array<{ text: string; source_url: string }>;
  summary: string;
  // Mode-specific fields:
  code_snippets?: Array<{ code: string; language: string; description: string; source_url: string }>;
  patterns?: string[];
  libraries?: string[];
  gotchas?: Array<{ issue: string; solution: string }>;
  contradictions?: string[];
  consensus?: string[];
  gaps?: string[];
}
```

---

## 9. Error Handling

### Authentication Errors
```
Error: Not authenticated.
```
**Fix:** Run `gemini -p "test"` to authenticate via OAuth

### Rate Limit Errors
```
Error: Rate limit exceeded
```
**Fix:** Wait 1 minute (60 req/min limit)

### JSON Parsing Errors
```
Failed to parse Gemini response
```
**Cause:** Gemini wrapped JSON in markdown blocks
**Fix:** Implementation cleans ` ```json ` wrappers automatically

### Error Log Files
Gemini saves detailed error logs:
```
Full report available at: /path/to/error-uuid.json
```

---

## 10. Summary

### Strengths
1. ✅ Free tier (60 req/min, 1000/day)
2. ✅ Built-in Google Search grounding
3. ✅ Detailed token tracking (cached, thoughts, tool)
4. ✅ Tool execution metrics
5. ✅ Session resume capability
6. ✅ Multiple output formats

### Limitations
1. ❌ No cost tracking in output
2. ❌ No GEMINI.md context file support
3. ❌ No system prompt flag
4. ❌ Binary session storage (not human-readable)
5. ❌ OAuth-only authentication

### Best Practices
1. Use `--output-format json` for programmatic access
2. Parse response from `response` field wrapper
3. Clean markdown blocks from JSON output
4. Handle rate limits with exponential backoff
5. Use mode-specific templates for structured research

---

*Document generated from codebase analysis and live CLI testing*
*Last updated: 2026-01-28*

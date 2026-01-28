# Multi-CLI Provider Support

Ralph now supports multiple AI CLI providers, allowing you to choose the best tool for each task while maintaining a consistent workflow and output format.

## Overview

By default, Ralph uses Claude Code for all operations. With multi-CLI support, you can:

- Switch providers per command based on cost, speed, or capability needs
- Use the same workflow regardless of underlying provider
- Track costs and tokens across providers with unified metrics
- Maintain provider-specific configurations for fine-grained control

## Supported Providers

| Provider | CLI Command | Cost Tracking | Best For |
|----------|-------------|---------------|----------|
| **Claude** | `claude` | ✅ Full (built-in) | General development, comprehensive features |
| **Opencode** | `opencode` | ✅ Full | Multi-provider flexibility, 75+ model options |
| **Cursor** | `cursor` or `agent` | ❌ None | Fast execution, IDE integration |
| **Gemini** | `gemini` | ❌ None | Free tier (60 req/min), Google Search grounding |
| **Codex** | `codex` | ❌ None | OpenAI integration, structured output schemas |

### Provider Capabilities

| Feature | Claude | Opencode | Cursor | Gemini | Codex |
|---------|--------|----------|--------|--------|-------|
| Session Storage | ✅ JSONL | ✅ JSON | ❓ Unknown | ⚠️ Binary only | ✅ JSONL |
| Session Import | ✅ Full | ✅ Full | ❌ N/A | ❌ N/A | ⚠️ Limited |
| Token Metrics | ✅ Detailed | ✅ Yes | ❓ Unknown | ✅ Detailed | ✅ Basic |
| Cost Tracking | ✅ Built-in | ✅ Calculated | ❌ None | ❌ None | ❌ None |
| Context Files | CLAUDE.md | AGENTS.md | .cursor/rules | Manual | AGENTS.md |
| Sandbox Modes | Permission-based | Varies | Unknown | ✅ Built-in | ✅ 3 modes |
| Headless Mode | ✅ `-p` | ✅ `-p` | ✅ `-p --force` | ✅ `-p` | ✅ `exec` |
| Rate Limits | Variable | Unknown | Unknown | 60 req/min | Unknown |

## Quick Start

### 1. Install Your Preferred CLI

```bash
# Claude Code (default)
npm install -g @anthropic-ai/claude-code

# Opencode
npm install -g opencode

# Cursor Agent
# Install via Cursor IDE: Settings → Features → Enable Composer Agent

# Gemini CLI
npm install -g @google/gemini-cli

# Codex CLI
npm install -g @openai/codex
```

### 2. Basic Usage

```bash
# Use Claude (default)
aaa ralph build

# Use Cursor with specific model
aaa ralph build --provider cursor --model composer-1

# Use Gemini for planning
aaa ralph plan stories --provider gemini

# Use Codex with structured output
aaa ralph build --provider codex --output-schema ./schema.json
```

### 3. Set Default Provider

```json
// aaa.config.json
{
  "ralph": {
    "provider": "cursor"
  }
}
```

## Configuration

### Global Settings

Create `aaa.config.json` in your project root:

```json
{
  "ralph": {
    "provider": "claude",
    "model": "claude-3-opus-20240229"
  }
}
```

### Provider-Specific Settings

```json
{
  "ralph": {
    "provider": "claude",
    
    "claude": {
      "model": "claude-3-opus-20240229",
      "dangerouslySkipPermissions": false,
      "lightweightModel": "claude-3-haiku-20240307"
    },
    
    "opencode": {
      "model": "claude/claude-3-opus",
      "agent": "build"
    },
    
    "cursor": {
      "model": "composer-1",
      "dangerouslyAllowForceWrites": false,
      "sandbox": true
    },
    
    "gemini": {
      "model": "gemini-2.5-pro",
      "sandbox": true,
      "rateLimitRpm": 60
    },
    
    "codex": {
      "model": "gpt-5.1-codex-max",
      "sandbox": "workspace-write",
      "askForApproval": "on-request",
      "outputSchema": "./schemas/output.json"
    }
  }
}
```

### Configuration Precedence

Settings are resolved in this order (highest priority first):

1. **CLI flags**: `--provider`, `--model`
2. **Environment variables**: `RALPH_PROVIDER`, `RALPH_CLAUDE_MODEL`
3. **Config file**: `aaa.config.json` → `ralph.config.json`
4. **Defaults**: Provider-specific defaults

### Environment Variables

```bash
# Provider selection
export RALPH_PROVIDER=cursor

# Claude-specific
export RALPH_CLAUDE_MODEL=claude-3-opus-20240229
export RALPH_CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=true

# Cursor-specific (security)
export RALPH_CURSOR_DANGEROUSLY_ALLOW_FORCE_WRITES=true

# Gemini-specific
export RALPH_GEMINI_MODEL=gemini-2.5-pro

# Debug
export RALPH_DEBUG=true
```

## Provider Details

### Claude (Default)

**Installation**: `npm install -g @anthropic-ai/claude-code`

**Strengths**:
- Full cost tracking built-in
- Comprehensive session metadata
- Best-in-class reasoning
- Automatic CLAUDE.md context loading

**Configuration**:
```json
{
  "ralph": {
    "claude": {
      "model": "claude-3-opus-20240229",
      "dangerouslySkipPermissions": false,
      "lightweightModel": "claude-3-haiku-20240307"
    }
  }
}
```

**Flags**:
- `--dangerously-skip-permissions`: Skip permission prompts (use with caution)
- `--model`: Specify Claude model version
- `--lightweight-model`: Use faster model for summaries

**Cost Tracking**: ✅ Full built-in cost tracking

### Opencode

**Installation**: `npm install -g opencode`

**Strengths**:
- Access to 75+ AI providers
- Unified interface across models
- Server mode for advanced use cases

**Configuration**:
```json
{
  "ralph": {
    "opencode": {
      "model": "claude/claude-3-opus",
      "agent": "build"
    }
  }
}
```

**Model Format**: Use `provider/model` syntax (e.g., `claude/claude-3-opus`, `openai/gpt-4`)

**Cost Tracking**: ✅ Calculated from token usage

### Cursor

**Installation**: Comes with Cursor IDE. Enable via Settings → Features → Enable Composer Agent.

**Strengths**:
- Integrated with Cursor IDE
- Fast execution
- Familiar interface for Cursor users

**Configuration**:
```json
{
  "ralph": {
    "cursor": {
      "model": "composer-1",
      "dangerouslyAllowForceWrites": false,
      "sandbox": true
    }
  }
}
```

**⚠️ Security Warning**: Cursor requires `--force` flag for automatic file modifications. By default, this is **disabled** and requires explicit opt-in via `dangerouslyAllowForceWrites: true`.

**Cost Tracking**: ❌ Not available

**Session Storage**: ❓ Session format unknown; limited import capabilities

### Gemini

**Installation**: `npm install -g @google/gemini-cli`

**Strengths**:
- Free tier: 60 requests/minute, 1000/day
- Built-in Google Search grounding
- Detailed token metrics (cached, thoughts, tool)

**Configuration**:
```json
{
  "ralph": {
    "gemini": {
      "model": "gemini-2.5-pro",
      "sandbox": true,
      "rateLimitRpm": 60
    }
  }
}
```

**Cost Calculation**: Manual from tokens (pricing varies by model)
- Gemini 2.5 Flash: $0.075/1M input, $0.30/1M output

**Limitations**:
- Binary session storage (cannot import sessions)
- No cost tracking in CLI output
- OAuth-only authentication

### Codex

**Installation**: `npm install -g @openai/codex`

**Strengths**:
- Structured output via JSON Schema (`--output-schema`)
- Multiple sandbox modes
- JSON Lines streaming output

**Configuration**:
```json
{
  "ralph": {
    "codex": {
      "model": "gpt-5.1-codex-max",
      "sandbox": "workspace-write",
      "askForApproval": "on-request",
      "fullAuto": false,
      "outputSchema": "./schemas/output.json"
    }
  }
}
```

**Sandbox Modes**:
- `read-only`: No filesystem writes
- `workspace-write`: Write access to current directory (recommended)
- `danger-full-access`: Full system access (use with extreme caution)

**Approval Policies**:
- `untrusted`: Only trusted commands auto-execute
- `on-failure`: Ask on command failure
- `on-request`: Model decides when to ask
- `never`: Never ask for approval

**Cost Tracking**: ❌ Not available (calculate from tokens)

## Security Considerations

### Cursor `--force` Flag

By default, Cursor requires manual approval for file modifications. To enable automatic modifications (use with caution):

```json
{
  "ralph": {
    "cursor": {
      "dangerouslyAllowForceWrites": true
    }
  }
}
```

**Warning**: This bypasses safety checks. Only enable in trusted environments.

### Claude Permissions

Claude's `--dangerously-skip-permissions` flag is available but opt-in only:

```json
{
  "ralph": {
    "claude": {
      "dangerouslySkipPermissions": true
    }
  }
}
```

### Codex Bypass Mode

Codex has a `--dangerously-bypass-approvals-and-sandbox` flag. This is **not exposed** in Ralph configuration. Use standard sandbox modes instead.

### Best Practices

1. **Start with restricted permissions** and gradually relax as needed
2. **Use version control** (git) to track all changes
3. **Review changes** before committing, especially with `--force` flags
4. **Enable sandbox modes** where available
5. **Keep provider-specific configs separate** (use `.ralph/context/`)

## Provider Comparison

### Cost Tracking

| Provider | Cost Tracking | Calculation Method |
|----------|---------------|-------------------|
| Claude | ✅ Full | Built-in `total_cost_usd` field |
| Opencode | ✅ Calculated | From token counts using configured pricing |
| Cursor | ❌ None | N/A |
| Gemini | ⚠️ Manual | From tokens (no CLI cost field) |
| Codex | ⚠️ Manual | From tokens (no CLI cost field) |

### Output Formats

| Provider | Format | Notes |
|----------|--------|-------|
| Claude | JSON array | Single JSON array with typed entries |
| Opencode | NDJSON | Newline-delimited JSON |
| Cursor | Unknown | Auto-detection with fallback |
| Gemini | Single JSON | Wrapped object with `response` field |
| Codex | JSONL | Streaming JSON Lines events |

### Session Storage

| Provider | Format | Importable |
|----------|--------|------------|
| Claude | JSONL | ✅ Full |
| Opencode | JSON Lines | ✅ Full |
| Cursor | Unknown | ❌ Limited |
| Gemini | Binary | ❌ N/A |
| Codex | JSONL | ⚠️ Partial |

## Troubleshooting

### Provider Not Found

If you get "Provider not found" error:

```bash
# Check if CLI is installed and in PATH
which claude
which opencode
which cursor
which gemini
which codex

# Install missing providers
npm install -g @anthropic-ai/claude-code
npm install -g opencode
npm install -g @google/gemini-cli
npm install -g @openai/codex
```

### Authentication Issues

**Cursor**:
- Ensure Composer Agent is enabled in Cursor IDE settings
- Check Cursor account has required permissions

**Gemini**:
```bash
# Authenticate via OAuth
gemini -p "test"
# Follow browser prompts
```

**Codex**:
```bash
# Set API key for exec mode
export CODEX_API_KEY=sk-...

# Or login interactively
codex login --with-api-key
```

### Cost Showing as $0.00

For providers without built-in cost tracking (Gemini, Codex, Cursor), cost will show as $0.00 or be calculated from token counts. This is expected behavior.

To enable cost calculation for these providers, add pricing to your config:

```json
{
  "ralph": {
    "gemini": {
      "pricing": {
        "inputPer1K": 0.000075,
        "outputPer1K": 0.0003,
        "cacheReadPer1K": 0.00001875
      }
    }
  }
}
```

### Output Parsing Errors

If Ralph fails to parse provider output:

1. Check provider CLI version (some output formats change between versions)
2. Verify provider supports headless mode (`-p` or `exec`)
3. Run with `RALPH_DEBUG=true` to see raw output
4. Report issue with provider output sample (sanitized)

### Rate Limit Errors

**Gemini**:
```
Error: Rate limit exceeded
```
Wait 1 minute (60 req/min free tier limit). Consider upgrading or adding rate limiting:

```json
{
  "ralph": {
    "gemini": {
      "rateLimitRpm": 60
    }
  }
}
```

## Migration Guide

### From Single-Provider (Claude) Setup

Existing configurations continue to work. Ralph defaults to Claude when no provider is specified.

**Migration steps**:
1. Keep existing `ralph.config.json` - it continues to work
2. Optionally rename to `aaa.config.json` for unified configuration
3. Add `provider` field to switch default provider
4. Add provider-specific sections as needed

### Switching Providers Mid-Project

You can use different providers for different tasks:

```bash
# Plan with Claude (best for complex reasoning)
aaa ralph plan stories --milestone docs/planning/milestones/mvp.md --provider claude

# Build with Cursor (faster execution)
aaa ralph build --provider cursor

# Research with Gemini (free tier)
aaa ralph calibrate intention --provider gemini
```

### Migrating Context Files

If you have provider-specific instructions in `CLAUDE.md`:

1. Keep general instructions in `CLAUDE.md`
2. Create `.ralph/context/` directory
3. Add provider-specific files:
   - `.ralph/context/cursor.md`
   - `.ralph/context/codex.md`
   - etc.
4. Ralph will merge canonical + provider-specific context

## Best Practices

### 1. Use Provider Strengths

- **Claude**: Complex planning, reasoning-heavy tasks
- **Cursor**: Fast execution, IDE-integrated workflows
- **Gemini**: Research, free tier usage
- **Codex**: Structured output requirements, OpenAI ecosystem
- **Opencode**: Multi-model experimentation

### 2. Start Conservative

When trying a new provider:
1. Use `--supervised` mode first
2. Run with `--max-iterations 1` to test
3. Review output before scaling up
4. Enable `--validate-first` for alignment checks

### 3. Monitor Costs

Track spending across providers:

```bash
# Ralph tracks costs in logs/ralph-sessions.jsonl
cat logs/ralph-sessions.jsonl | jq -s '
  group_by(.provider) |
  map({
    provider: .[0].provider,
    totalCost: map(.costUsd // 0) | add,
    totalTokens: map(.tokenUsage.inputTokens + .tokenUsage.outputTokens) | add
  })
'
```

### 4. Maintain Backward Compatibility

Use environment variables for CI/CD:

```bash
# CI pipeline uses specific provider
export RALPH_PROVIDER=codex
export RALPH_CODEX_SANDBOX=read-only
aaa ralph build --headless
```

### 5. Document Provider-Specific Behavior

Add comments in config for team clarity:

```json
{
  "ralph": {
    // Use Cursor for fast builds in local dev
    // Switch to Claude for complex planning tasks
    "provider": "cursor",
    
    "cursor": {
      // ⚠️ Only enable in trusted environments
      "dangerouslyAllowForceWrites": false
    }
  }
}
```

## Advanced Usage

### Custom Provider Pricing

For providers without built-in cost tracking:

```json
{
  "ralph": {
    "gemini": {
      "model": "gemini-2.5-pro",
      "pricing": {
        "inputPer1K": 0.000075,
        "outputPer1K": 0.0003,
        "cacheReadPer1K": 0.00001875
      }
    },
    "codex": {
      "model": "gpt-5.1-codex-max",
      "pricing": {
        "inputPer1K": 0.003,
        "outputPer1K": 0.012
      }
    }
  }
}
```

### Provider Fallback Chain

Configure fallback providers if primary is unavailable:

```json
{
  "ralph": {
    "provider": "cursor",
    "fallbackProviders": ["claude", "gemini"]
  }
}
```

### Per-Task Provider Selection

Use shell aliases for common provider/task combinations:

```bash
# ~/.zshrc or ~/.bashrc
alias ralph-fast='aaa ralph build --provider cursor'
alias ralph-safe='aaa ralph build --provider claude'
alias ralph-research='aaa ralph plan vision --provider gemini'
alias ralph-ci='aaa ralph build --provider codex --headless'
```

## Future Enhancements

Planned improvements to multi-CLI support:

- [ ] Automatic provider selection based on task type
- [ ] Cost optimization suggestions
- [ ] Provider performance benchmarking
- [ ] Cross-provider session migration
- [ ] Custom provider plugin API

## See Also

- [Examples: Multi-CLI Usage](./examples/multi-cli-usage.md) - Detailed usage examples
- [Ralph Documentation](./ralph/README.md) - Ralph framework overview
- [Architecture Overview](../architecture/ARCHITECTURE_OVERVIEW.md) - Technical implementation details
- [Codex CLI Spec](./research/codex-cli-technical-spec.md) - Codex technical details
- [Gemini CLI Spec](./research/gemini-cli-compatibility.md) - Gemini technical details
- [Multi-CLI Master Plan](./planning/multi-cli-master-plan.md) - Implementation roadmap

---

**Last Updated**: 2026-01-28  
**Document Version**: 1.0

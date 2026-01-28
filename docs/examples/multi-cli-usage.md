# Multi-CLI Usage Examples

Practical examples for using Ralph with different AI CLI providers.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Provider Switching](#provider-switching)
- [Configuration Examples](#configuration-examples)
- [Model Selection](#model-selection)
- [Advanced Scenarios](#advanced-scenarios)
- [Tips for Choosing Providers](#tips-for-choosing-providers)

---

## Basic Usage

### Claude (Default)

```bash
# Use Claude for everything (default behavior)
aaa ralph plan vision
aaa ralph plan roadmap
aaa ralph build

# Specify explicitly
aaa ralph build --provider claude

# Use specific model
aaa ralph build --provider claude --model claude-3-opus-20240229
```

**When to use**: Complex reasoning, comprehensive planning, when you need full cost tracking.

### Cursor

```bash
# Fast builds with Cursor
aaa ralph build --provider cursor

# Use Composer model
aaa ralph build --provider cursor --model composer-1

# Enable automatic file modifications (requires config)
aaa ralph build --provider cursor --model composer-1
```

**Configuration required** for file modifications:
```json
{
  "ralph": {
    "cursor": {
      "dangerouslyAllowForceWrites": true
    }
  }
}
```

**When to use**: Fast execution, IDE integration, routine refactoring tasks.

### Gemini

```bash
# Plan with free tier
aaa ralph plan vision --provider gemini
aaa ralph plan stories --milestone docs/planning/milestones/mvp.md --provider gemini

# Quick research tasks
aaa ralph calibrate intention --provider gemini
```

**When to use**: Cost-sensitive projects, research tasks, high-volume operations (60 req/min free tier).

### Codex

```bash
# Build with structured output
aaa ralph build --provider codex

# Use specific sandbox mode
aaa ralph build --provider codex --sandbox workspace-write

# Full auto mode for CI
aaa ralph build --provider codex --full-auto
```

**When to use**: OpenAI ecosystem integration, structured output requirements, CI/CD pipelines.

### Opencode

```bash
# Use specific model through Opencode
aaa ralph build --provider opencode --model claude/claude-3-opus

# Try different providers
aaa ralph build --provider opencode --model openai/gpt-4
aaa ralph build --provider opencode --model anthropic/claude-3-haiku
```

**When to use**: Multi-model experimentation, accessing providers through unified interface.

---

## Provider Switching

### Use Different Providers for Different Phases

```bash
# Phase 1: Planning with Claude (complex reasoning)
aaa ralph plan vision --provider claude
aaa ralph plan roadmap --provider claude
aaa ralph plan stories --milestone docs/planning/milestones/mvp.md --provider claude

# Phase 2: Building with Cursor (fast execution)
aaa ralph build --provider cursor

# Phase 3: Calibration with Gemini (cost-effective)
aaa ralph calibrate all --provider gemini
```

### Switch Providers Mid-Build

```bash
# Build first half with Claude
aaa ralph build --subtasks docs/planning/milestones/001/subtasks.json --provider claude

# Switch to Cursor for remaining tasks
aaa ralph build --subtasks docs/planning/milestones/001/subtasks.json --provider cursor
```

### Environment-Based Switching

```bash
# Development: Use Cursor for speed
export RALPH_PROVIDER=cursor
aaa ralph build

# Production/Review: Use Claude for thoroughness
export RALPH_PROVIDER=claude
aaa ralph review stories --milestone docs/planning/milestones/mvp.md

# CI/CD: Use Codex with structured output
export RALPH_PROVIDER=codex
export RALPH_CODEX_SANDBOX=read-only
aaa ralph build --headless
```

---

## Configuration Examples

### Minimal Configuration

```json
{
  "ralph": {
    "provider": "cursor"
  }
}
```

### Claude-Optimized Setup

```json
{
  "ralph": {
    "provider": "claude",
    "claude": {
      "model": "claude-3-opus-20240229",
      "dangerouslySkipPermissions": false,
      "lightweightModel": "claude-3-haiku-20240307"
    }
  }
}
```

### Multi-Provider Setup

```json
{
  "ralph": {
    "provider": "claude",
    
    "claude": {
      "model": "claude-3-opus-20240229"
    },
    
    "cursor": {
      "model": "composer-1",
      "dangerouslyAllowForceWrites": false
    },
    
    "gemini": {
      "model": "gemini-2.5-pro",
      "rateLimitRpm": 60
    },
    
    "codex": {
      "model": "gpt-5.1-codex-max",
      "sandbox": "workspace-write"
    }
  }
}
```

### Cost-Conscious Setup

```json
{
  "ralph": {
    "provider": "gemini",
    
    "gemini": {
      "model": "gemini-2.5-pro",
      "rateLimitRpm": 60
    },
    
    "claude": {
      "model": "claude-3-haiku-20240307"
    }
  }
}
```

### Team Setup with Shared Config

```json
{
  "ralph": {
    // Default provider for the team
    "provider": "claude",
    
    "claude": {
      "model": "claude-3-sonnet-20240229",
      "lightweightModel": "claude-3-haiku-20240307"
    }
  }
}
```

Individual team members can override:
```bash
# Developer A prefers Cursor
export RALPH_PROVIDER=cursor

# Developer B uses local config
# ~/.config/ralph/config.json
{
  "provider": "cursor"
}
```

### CI/CD Configuration

```json
{
  "ralph": {
    "provider": "codex",
    
    "codex": {
      "model": "gpt-5.1-codex-max",
      "sandbox": "read-only",
      "askForApproval": "never",
      "fullAuto": true
    },
    
    "build": {
      "maxIterations": 3,
      "headless": true
    }
  }
}
```

---

## Model Selection

### Claude Models

```bash
# Fast, cost-effective
aaa ralph build --provider claude --model claude-3-haiku-20240307

# Balanced performance
aaa ralph build --provider claude --model claude-3-sonnet-20240229

# Maximum capability
aaa ralph build --provider claude --model claude-3-opus-20240229

# Planning with Opus, building with Sonnet
aaa ralph plan stories --provider claude --model claude-3-opus-20240229
aaa ralph build --provider claude --model claude-3-sonnet-20240229
```

### Opencode Model Selection

```bash
# Anthropic models
aaa ralph build --provider opencode --model claude/claude-3-opus
aaa ralph build --provider opencode --model claude/claude-3.5-sonnet

# OpenAI models
aaa ralph build --provider opencode --model openai/gpt-4
aaa ralph build --provider opencode --model openai/gpt-4-turbo

# Google models
aaa ralph build --provider opencode --model google/gemini-1.5-pro

# Local models (if configured)
aaa ralph build --provider opencode --model ollama/llama3
```

### Gemini Models

```bash
# Pro version (recommended)
aaa ralph build --provider gemini --model gemini-2.5-pro

# Flash (faster, cheaper)
aaa ralph build --provider gemini --model gemini-2.5-flash

# Ultra (if available)
aaa ralph build --provider gemini --model gemini-2.5-ultra
```

### Codex Models

```bash
# Latest/max model
aaa ralph build --provider codex --model gpt-5.1-codex-max

# Standard model
aaa ralph build --provider codex --model gpt-5.1-codex
```

### Cursor Models

```bash
# Composer agent
aaa ralph build --provider cursor --model composer-1

# GPT-based (if available)
aaa ralph build --provider cursor --model gpt-5.2
```

---

## Advanced Scenarios

### A/B Testing Providers

Compare provider performance on the same task:

```bash
# Test Claude
cp subtasks.json subtasks-claude.json
time aaa ralph build --subtasks subtasks-claude.json --provider claude --max-iterations 1

# Test Cursor
cp subtasks.json subtasks-cursor.json
time aaa ralph build --subtasks subtasks-cursor.json --provider cursor --max-iterations 1

# Compare results
cat logs/ralph-sessions.jsonl | jq 'select(.sessionId | contains("claude")) | {provider, costUsd, duration}'
cat logs/ralph-sessions.jsonl | jq 'select(.sessionId | contains("cursor")) | {provider, costUsd, duration}'
```

### Provider-Specific Context

Create provider-specific instructions:

```bash
# Create context directory
mkdir -p .ralph/context

# Claude-specific additions
cat > .ralph/context/claude.md << 'EOF'
## Claude-Specific Instructions

When using Claude:
- Leverage extended thinking for complex problems
- Use tool calls liberally
- Provide detailed explanations
EOF

# Cursor-specific additions
cat > .ralph/context/cursor.md << 'EOF'
## Cursor-Specific Instructions

When using Cursor:
- Focus on code changes
- Minimize explanations
- Use Composer features when available
EOF
```

### Cost Tracking Across Providers

```bash
# Build with different providers and compare costs

# Claude
aaa ralph build --provider claude -q
cost_claude=$(cat logs/ralph-sessions.jsonl | jq -s 'last | .costUsd')

# Gemini
aaa ralph build --provider gemini -q
cost_gemini=$(cat logs/ralph-sessions.jsonl | jq -s 'last | .costUsd')

echo "Claude cost: $cost_claude"
echo "Gemini cost: $cost_gemini (estimated from tokens)"
```

### Fallback Configuration

```bash
# Create wrapper script with fallback
#!/bin/bash
# ralph-with-fallback.sh

providers=("claude" "cursor" "gemini")

for provider in "${providers[@]}"; do
  if command -v "$provider" &> /dev/null; then
    echo "Using provider: $provider"
    aaa ralph build --provider "$provider" "$@"
    exit $?
  fi
done

echo "No AI CLI providers found. Please install one of: ${providers[*]}"
exit 1
```

### Conditional Provider Selection

```bash
# Use different providers based on task complexity

select_provider() {
  local task="$1"
  
  # Complex tasks -> Claude
  if echo "$task" | grep -qE "(architecture|design|planning)"; then
    echo "claude"
  # Quick tasks -> Gemini (free tier)
  elif echo "$task" | grep -qE "(refactor|format|lint)"; then
    echo "gemini"
  # Default -> Cursor
  else
    echo "cursor"
  fi
}

# Usage
provider=$(select_provider "implement authentication")
aaa ralph build --provider "$provider"
```

### Per-Milestone Provider Configuration

```bash
# Milestone 1: Use Claude for foundation
aaa ralph plan stories --milestone docs/planning/milestones/001-foundation.md --provider claude
aaa ralph build --provider claude

# Milestone 2: Switch to Cursor for features
aaa ralph plan stories --milestone docs/planning/milestones/002-features.md --provider cursor
aaa ralph build --provider cursor

# Milestone 3: Use Gemini for polish (cost-effective)
aaa ralph plan stories --milestone docs/planning/milestones/003-polish.md --provider gemini
aaa ralph build --provider gemini
```

---

## Tips for Choosing Providers

### By Task Type

| Task Type | Recommended Provider | Rationale |
|-----------|---------------------|-----------|
| **Vision/Architecture** | Claude | Best reasoning, comprehensive analysis |
| **Planning/Stories** | Claude | Complex planning, stakeholder considerations |
| **Initial Build** | Claude | High-quality foundation, fewer regressions |
| **Feature Implementation** | Cursor | Fast iteration, IDE integration |
| **Refactoring** | Cursor or Gemini | Speed or cost-efficiency |
| **Bug Fixes** | Cursor | Quick turnaround |
| **Code Review** | Claude | Thorough analysis |
| **Calibration** | Gemini | Cost-effective for regular checks |
| **Research** | Gemini | Free tier, Google Search integration |
| **CI/CD** | Codex | Structured output, sandbox modes |
| **Documentation** | Gemini or Cursor | Fast, cost-effective |

### By Project Phase

| Phase | Recommended | Alternative |
|-------|-------------|-------------|
| **Discovery** | Claude | Gemini |
| **MVP** | Claude | Cursor |
| **Scale-up** | Cursor | Claude |
| **Maintenance** | Gemini | Cursor |
| **Archive** | Gemini | - |

### By Budget Constraints

| Budget Level | Strategy |
|--------------|----------|
| **Unlimited** | Claude for everything |
| **Moderate** | Claude for planning, Cursor for building |
| **Limited** | Gemini for most tasks, Claude for critical planning |
| **Zero** | Gemini free tier only (60 req/min) |

### By Team Size

| Team Size | Recommendation |
|-----------|----------------|
| **Solo** | Use your preferred provider consistently |
| **Small (2-5)** | Standardize on one provider, document when to switch |
| **Medium (5-20)** | Default provider + documented exceptions |
| **Large (20+)** | Multiple approved providers, team-specific configs |

### Security Considerations

| Environment | Recommended Provider | Settings |
|-------------|---------------------|----------|
| **Local Dev** | Any | Standard permissions |
| **Shared Dev** | Claude or Codex | Restricted sandbox |
| **Staging** | Codex | Read-only sandbox |
| **Production** | Codex | Read-only, never auto-approve |

### Performance Optimization

```bash
# For fastest builds
aaa ralph build --provider cursor

# For most thorough builds
aaa ralph build --provider claude --model claude-3-opus-20240229

# For cost-optimized builds
aaa ralph build --provider gemini

# For CI/CD speed
aaa ralph build --provider codex --headless --full-auto
```

### Provider Comparison Matrix

| Criteria | Claude | Cursor | Gemini | Codex |
|----------|--------|--------|--------|-------|
| **Speed** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Cost** | $$$ | $$ | $ (free tier) | $$ |
| **Reasoning** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Integration** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Features** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

### Decision Tree

```
Start
  │
  ├─→ Planning/Architecture?
  │   └─→ Yes → Use Claude
  │
  ├─→ Cost-sensitive?
  │   └─→ Yes → Use Gemini
  │
  ├─→ Need IDE integration?
  │   └─→ Yes → Use Cursor
  │
  ├─→ CI/CD automation?
  │   └─→ Yes → Use Codex
  │
  └─→ Default → Use Claude
```

### Quick Reference Card

```bash
# One-liners for common scenarios

# Fast iteration during development
alias ralph-dev='aaa ralph build --provider cursor'

# Thorough planning before major changes
alias ralph-plan='aaa ralph plan stories --provider claude'

# Cost-effective research
alias ralph-research='aaa ralph calibrate intention --provider gemini'

# Safe CI builds
alias ralph-ci='aaa ralph build --provider codex --sandbox read-only --headless'

# Full planning suite
alias ralph-full-plan='aaa ralph plan vision --provider claude && aaa ralph plan roadmap --provider claude && aaa ralph plan stories --provider claude'
```

---

## Troubleshooting Examples

### Provider Not Responding

```bash
# Check if provider CLI works standalone
claude -p "hello" --output-format json
cursor -p "hello"
gemini -p "hello" --output-format json
codex exec --json "hello"

# If standalone fails, the issue is with the CLI, not Ralph
```

### Verify Configuration

```bash
# Check which provider is configured
cat aaa.config.json | jq '.ralph.provider'

# Check environment variable
echo $RALPH_PROVIDER

# Debug mode
RALPH_DEBUG=true aaa ralph build --provider claude
```

### Reset to Defaults

```bash
# Remove provider override
unset RALPH_PROVIDER

# Use default (Claude)
aaa ralph build
```

---

**Last Updated**: 2026-01-28  
**Document Version**: 1.0

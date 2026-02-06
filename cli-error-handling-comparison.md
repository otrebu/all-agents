# CLI Error Handling Comparison: Claude Code, OpenCode, Codex, Gemini CLI, Pi Mono, and Cursor

## Executive Summary

This document provides a detailed comparison of error handling, exit codes, and error output formats across 6 major AI coding CLI tools. Each CLI approaches error handling differently, with varying levels of documentation, exit code granularity, and automation-friendliness.

---

## 1. Claude Code (claude CLI)

### Exit Codes

| Exit Code | Meaning | Documentation |
|-----------|---------|---------------|
| 0 | Success | ✅ Well documented |
| 1 | General error | ✅ Documented |
| 2 | Specific hook/script error | ✅ Documented in hooks reference |
| 127 | Command not found | From GitHub issues |

**Exit Code 2 Behavior per Event:**
- `SessionStart`: Abort the session launch
- `UserPromptSubmit`: Abort the prompt, return to input mode
- `ToolUse`: Prevent tool execution, return to input mode
- `PreToolUse`: Same as ToolUse
- `Checkpoint`: Abort checkpoint creation, show error

### Error Output Format

**Human-readable stderr:**
```
Command failed with exit code 127
```

**JSON output (with `--output-format json`):**
```json
{
  "error": {
    "code": "COMMAND_FAILED",
    "exit_code": 127,
    "message": "Command not found"
  }
}
```

**Print mode error handling:**
```bash
claude -p "task" --output-format json
# Returns structured JSON on errors
```

### Failure Modes

| Failure Type | Signal | Exit Code | Recovery |
|--------------|--------|-----------|----------|
| Binary not found | `command not found` | 127 | Install binary |
| Permission denied | `Permission denied` | 1 | Check permissions |
| API errors | `API Error` in output | 1 | Retry or check key |
| Rate limits | Rate limit message | 1 | Wait and retry |
| MCP server errors | Connection failed | 1 | Check server |
| Max turns reached | Turn limit message | 1 | Start new session |
| Max budget exceeded | Budget exceeded | 1 | Increase budget |

### Error Handling Documentation

**Strengths:**
- Well-documented hooks system for custom error handling
- Support for both interactive and non-interactive modes
- `--verbose` flag for detailed debugging
- `--debug` flag with category filtering (`api,hooks`)

**Hooks Error Handling Example:**
```yaml
# .claude/hooks/on-error.yaml
on:
  - error
run: |
  echo "Error occurred: $CLAUDE_ERROR_MESSAGE" >> error.log
  exit 2  # Control flow based on error
```

**Real-world GitHub Issues:**
- Issue #1093: "Command failed with exit code 127" during complexity assessment
- Hook lifecycle documentation shows error propagation through decision control

---

## 2. OpenCode (opencode CLI)

### Exit Codes

| Exit Code | Meaning | Documentation |
|-----------|---------|---------------|
| 0 | Success | ✅ Documented |
| 1 | General error | ⚠️ Partial |
| 124 | Timeout (from `timeout` command) | From GitHub issues |
| ? | API errors | ❌ Not documented |

**Known Issue:** OpenCode has a critical bug where API errors cause it to **hang indefinitely** instead of exiting with an error code (Issue #8203).

### Error Output Format

**Log file format (structured):**
```
# Location: ~/.local/share/opencode/log/2025-01-09T123456.log
ERROR service=llm error={"statusCode":429,"message":"Rate limit exceeded"}
```

**TUI error display:**
```
┌─ Error ──────────────────────────────────┐
│ ProviderInitError: Invalid configuration │
│ Run /connect to re-authenticate          │
└──────────────────────────────────────────┘
```

**Configuration errors:**
```
ProviderModelNotFoundError: Model not found
Models should be referenced as: <providerId>/<modelId>
Examples:
  - openai/gpt-4.1
  - openrouter/google/gemini-2.5-flash
```

### Failure Modes

| Failure Type | Signal | Behavior | Issue |
|--------------|--------|----------|-------|
| API rate limit | Logs to file, hangs | **No exit** - hangs forever | #8203 |
| ProviderInitError | Config error message | Exits with error | - |
| AI_APICallError | API call failure | May hang or exit | - |
| Authentication | Invalid credentials | Prompts for re-auth | - |
| Model not found | ProviderModelNotFoundError | Exits with guidance | - |
| EADDRINUSE | Port in use | Error message | - |

### Error Handling Documentation

**Strengths:**
- Comprehensive troubleshooting guide
- Log files with timestamps
- `--log-level DEBUG` for detailed output
- `--print-logs` for terminal output

**Weaknesses:**
- ❌ No documented exit code conventions
- ❌ API errors cause hangs in automation (Issue #8203)
- ❌ Inconsistent error handling between TUI and CLI modes

**Real-world GitHub Issues:**
- Issue #8203: "opencode run hangs forever on API errors" - breaks CLI/automation integrations
- Issue #4245: Unable to exit TUI when configuration errors occur
- Common fix for provider issues: `rm -rf ~/.cache/opencode`

---

## 3. Codex CLI (codex by OpenAI)

### Exit Codes

| Exit Code | Meaning | Documentation |
|-----------|---------|---------------|
| 0 | Success | ✅ Documented |
| 1 | General error / failure | ✅ Documented |
| -1 | Sandbox failure | From GitHub issues |
| ? | Rate limit exceeded | From GitHub issues |

**Exit codes from `codex login status`:**
- `0` - Successfully authenticated
- Non-zero - Not authenticated

### Error Output Format

**Structured JSON output (with `--json`):**
```json
{
  "type": "error",
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit reached for requests",
    "retry_after": 60
  }
}
```

**Newline-delimited JSON events:**
```json
{"type":"tool_call","tool":"bash","status":"started"}
{"type":"tool_call","tool":"bash","status":"completed","exit_code":0}
{"type":"error","error":{"code":"sandbox_failure","message":"failed in sandbox"}}
```

**Human-readable error examples:**
```
Error: Rate limit exceeded. Please wait 60 seconds before retrying.
```

```
Error: The model encountered an error while processing your request.
Exit code: -1
Message: failed in sandbox
```

### Failure Modes

| Failure Type | Signal | Exit Code | Behavior |
|--------------|--------|-----------|----------|
| Rate limit | `rate_limit_exceeded` | 1 or hangs | Abrupt exit (Issue #690) |
| Sandbox failure | `exited -1` | -1 | Sandbox execution failed |
| Command failure | Non-zero from tool | Preserved | Model sees exit code (Issue #6767) |
| Out of credits | Hangs | N/A | Infinite hang (Issue #6512) |
| API timeout | Timeout message | 1 | May not propagate well |
| Git apply failure | Non-zero | 1 | `codex apply` fails |

### Error Handling Documentation

**Strengths:**
- OpenAI API error codes well documented (401, 429, 500, 503)
- `--json` flag for structured output in automation
- Configurable sandbox policies (`read-only`, `workspace-write`, `danger-full-access`)
- `--output-schema` for validated outputs

**Weaknesses:**
- ❌ Exit codes not consistently documented
- ❌ Rate limits cause abrupt exits instead of graceful backoff (Issue #690)
- ❌ Out of credits causes hang (Issue #6512)

**Real-world GitHub Issues:**
- Issue #690: "Codex CLI exits abruptly on rate_limit_exceeded"
- Issue #6512: "Codex CLI hangs indefinitely when the workspace is out of credits"
- Issue #6767: "Model does not see non-zero exit code from command"
- Issue #1367: "codex cannot obtain error information when receiving non-zero exit codes"
- Issue #4928: "exited -1 in 0ms: failed in sandbox"

**API Error Codes (from OpenAI docs):**
```
401 - Invalid Authentication
401 - Incorrect API key provided
403 - Country not supported
429 - Rate limit reached
429 - Quota exceeded
500 - Server error
503 - Engine overloaded
```

---

## 4. Gemini CLI (gemini by Google)

### Exit Codes

| Exit Code | Meaning | Documentation |
|-----------|---------|---------------|
| 0 | Success | ✅ Documented |
| 41 | `FatalAuthenticationError` | ✅ Documented |
| 42 | `FatalInputError` | ✅ Documented |
| 44 | `FatalSandboxError` | ✅ Documented |
| 52 | `FatalConfigError` | ✅ Documented |
| 53 | `FatalTurnLimitedError` | ✅ Documented |

**Best exit code documentation among all CLIs reviewed.**

### Error Output Format

**Headless mode JSON output:**
```bash
gemini --headless --output=json "analyze this code"
```

```json
{
  "response": "Analysis complete",
  "error": null,
  "exit_code": 0,
  "tokens_used": 150
}
```

**Error response schema:**
```json
{
  "error": {
    "code": 41,
    "type": "FatalAuthenticationError",
    "message": "Authentication failed. Run 'gemini login' to authenticate."
  }
}
```

**Human-readable errors:**
```
Error: You must be a named user on your organization's Gemini Code Assist 
Standard edition subscription to use this service.
```

```
Error: Failed to login. Message: Request contains an invalid argument
```

### Failure Modes

| Failure Type | Exit Code | Signal | Solution |
|--------------|-----------|--------|----------|
| Authentication failure | 41 | `FatalAuthenticationError` | Run `gemini login` |
| Invalid input | 42 | `FatalInputError` | Check input format |
| Sandbox error | 44 | `FatalSandboxError` | Check sandbox config |
| Config error | 52 | `FatalConfigError` | Validate settings.json |
| Turn limit reached | 53 | `FatalTurnLimitedError` | Non-interactive only |
| EADDRINUSE | N/A | Address already in use | Change port |
| MODULE_NOT_FOUND | N/A | Import error | Run `npm install` |
| Certificate error | N/A | `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` | Set `NODE_USE_SYSTEM_CA=1` |

### Error Handling Documentation

**Strengths:**
- ✅ **Best documented exit codes** with specific numeric codes for each error type
- Headless mode designed for automation with consistent exit codes
- `--debug` flag for detailed output
- F12 debug console in interactive mode
- Clear troubleshooting guide with solutions

**Headless Mode Exit Codes:**
```
Exit code 0: Success
Exit code 41: FatalAuthenticationError
Exit code 42: FatalInputError
Exit code 44: FatalSandboxError
Exit code 52: FatalConfigError
Exit code 53: FatalTurnLimitedError (non-interactive)
```

**Real-world Error Examples:**
```
# Authentication error
gemini
# Output: Error: You must be a named user on your organization's 
#         Gemini Code Assist Standard edition subscription

# Fix: Unset GOOGLE_CLOUD_PROJECT environment variables
unset GOOGLE_CLOUD_PROJECT
unset GOOGLE_CLOUD_PROJECT_ID
```

```
# Certificate error on corporate networks
export NODE_USE_SYSTEM_CA=1
# OR
export NODE_EXTRA_CA_CERTS=/path/to/corporate-ca.crt
```

---

## 5. Pi Mono (pi CLI)

### Exit Codes

| Exit Code | Meaning | Documentation |
|-----------|---------|---------------|
| 0 | Success | ⚠️ Limited |
| 1 | General error | ⚠️ Limited |
| ? | Specific errors | ❌ Not documented |

**Limited public documentation on error handling.**

### Error Output Format

**Based on package structure and code analysis:**

```javascript
// From @mariozechner/pi-ai error handling
{
  "error": {
    "type": "ProviderInitError",
    "provider": "openai",
    "message": "Failed to initialize provider"
  }
}
```

**Print mode output:**
```bash
pi print "task" --format json
# Returns structured output or error object
```

### Failure Modes

| Failure Type | Signal | Behavior |
|--------------|--------|----------|
| Provider initialization | `ProviderInitError` | Configuration error |
| API errors | Provider-specific | Varies by provider |
| Session errors | Session management failure | Retry or restart |
| Tool execution | Tool error | Error propagated |

### Error Handling Documentation

**Status:** Limited documentation available.

**Known features:**
- Print mode for non-interactive usage
- RPC mode for programmatic access
- Provider-agnostic error abstraction
- Extension system with error hooks

**Limitations:**
- ❌ No comprehensive error code documentation
- ❌ Limited GitHub issues for real-world examples
- Primarily focused on the TUI experience

---

## 6. Cursor CLI (cursor command)

### Exit Codes

| Exit Code | Meaning | Documentation |
|-----------|---------|---------------|
| 0 | Success | ⚠️ Limited |
| 1 | General error / Terminal error | From issues |
| ? | CLI-specific errors | ❌ Not documented |

**Note:** Cursor primarily operates as an IDE; CLI functionality is more limited.

### Error Output Format

**IDE-focused error handling:**
```
Request ID: req_abc123xyz
Error: Failed to generate completion
```

**CLI error example (from forum):**
```
[Bug]: cursor-cli silent failure - "Generating..." flashes and returns to prompt
```

**Terminal exit code 1 on Windows:**
```powershell
# Windows PowerShell 5.1 compatibility issue
# Upgrading to PowerShell 7.5 resolves
```

### Failure Modes

| Failure Type | Signal | Behavior |
|--------------|--------|----------|
| Terminal execution | Exit code 1 | PowerShell compatibility |
| Silent failures | No output | Returns to prompt immediately |
| Non-interactive hangs | Hangs | Fails to terminate (Issue #3588) |
| Stderr capture | Missing output | Terminal tool doesn't capture stderr |
| Command not executed | No response | Terminal shows command but doesn't run |

### Error Handling Documentation

**Strengths:**
- Request ID system for support
- Developer tools and logs available
- `cursor --disable-extensions` for troubleshooting

**Weaknesses:**
- ❌ **No CLI-specific exit code documentation**
- ❌ IDE-focused, CLI is secondary
- ❌ Error handling not designed for automation
- ❌ Known terminal reliability issues

**Real-world Issues:**
- Terminal bug in v2.1.39: commands shown but not executed
- Windows terminal exit code 1 with PowerShell 5.1
- Non-interactive `cursor-agent -p` fails to terminate (Issue #3588)
- Stderr not properly captured in Agent mode

---

## Comparison Matrix

| Feature | Claude Code | OpenCode | Codex | Gemini CLI | Pi Mono | Cursor |
|---------|-------------|----------|-------|------------|---------|--------|
| **Exit Code 0 (Success)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Documented Exit Codes** | ✅ Good | ❌ Poor | ⚠️ Partial | ✅ **Excellent** | ❌ Poor | ❌ Poor |
| **Granular Exit Codes** | ✅ (0,1,2,127) | ❌ | ⚠️ (0,1,-1) | ✅ **(0,41-44,52-53)** | ❌ | ❌ |
| **JSON Error Output** | ✅ | ⚠️ Logs only | ✅ | ✅ | ⚠️ | ❌ |
| **Automation-Friendly** | ✅ | ❌ Hangs | ⚠️ Abrupt | ✅ **Best** | ⚠️ | ❌ |
| **Rate Limit Handling** | ✅ Graceful | ❌ Hangs | ❌ Abrupt exit | ✅ Graceful | ⚠️ | N/A |
| **API Error Documentation** | ✅ | ⚠️ | ✅ | ✅ | ❌ | ❌ |
| **Non-Interactive Mode** | ✅ (`-p`) | ✅ (`run`) | ✅ (`exec`) | ✅ (`--headless`) | ✅ (`print`) | ⚠️ Buggy |
| **Debug/Verbose Flags** | ✅ (`--debug`, `--verbose`) | ✅ (`--log-level`) | ✅ (`--json`) | ✅ (`--debug`) | ⚠️ | ✅ (IDE) |
| **Error Recovery Guidance** | ✅ | ✅ | ✅ | ✅ **Best** | ❌ | ⚠️ |

---

## Recommendations by Use Case

### For CI/CD Automation

**Best:** Gemini CLI
- Specific exit codes (41-53) for different failures
- Headless mode designed for automation
- Consistent JSON output

**Good:** Claude Code
- `--output-format json` for structured output
- Well-behaved in non-interactive mode (`-p`)
- Reliable error propagation

**Avoid:** OpenCode, Cursor
- OpenCode hangs on API errors
- Cursor CLI not designed for automation

### For Interactive Development

**Best:** Claude Code, Gemini CLI
- Good error messages
- Clear recovery paths
- Stable exit behavior

**Good:** Codex
- Good interactive experience
- Sandboxing for safety

**Avoid:** OpenCode (hanging issues)

### For Scripting Integration

**Best:** Gemini CLI
```bash
# Reliable exit codes for scripting
gemini --headless "task"
case $? in
  0) echo "Success" ;;
  41) echo "Auth error" ;;
  42) echo "Input error" ;;
  *) echo "Other error" ;;
esac
```

**Good:** Claude Code
```bash
# JSON output for parsing
claude -p "task" --output-format json | jq '.error'
```

---

## Key Findings

1. **Gemini CLI has the best error handling** with specific exit codes (41-53) and excellent documentation

2. **OpenCode has critical issues** - API errors cause indefinite hangs instead of exiting (Issue #8203)

3. **Codex has rate limit issues** - exits abruptly instead of graceful backoff/retry

4. **Cursor CLI is IDE-focused** - CLI error handling is not well-documented or reliable for automation

5. **Claude Code offers good balance** - reliable for both interactive and automation use cases

6. **Pi Mono lacks documentation** - limited public information on error handling

---

## Appendix: Real Error Examples

### Claude Code
```bash
$ claude -p "test" --max-budget-usd 0.01
# Exits when budget exceeded with clear message
```

### OpenCode Hanging (Issue #8203)
```bash
$ timeout 30 opencode run "what is 1+1"
# Hangs for 30 seconds, exit code 124 (timeout kills it)
# Error only visible in log file, not stderr
```

### Codex Rate Limit
```bash
$ codex exec "task"
# Exits immediately on rate limit
# No backoff or retry mechanism
```

### Gemini CLI Auth Error
```bash
$ gemini --headless "task"
# Exit code: 41
# Output: FatalAuthenticationError - clear message
```

### Cursor Terminal Bug
```bash
$ cursor --cli "npm run build"
# Shows "Generating..." then returns to prompt
# Command never actually executes
```

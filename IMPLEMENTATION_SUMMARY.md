# Intelligent Shell Completion Implementation

## Summary

I've successfully implemented intelligent shell completion for the multi-CLI provider system that shows available providers and their models dynamically.

## Files Created/Modified

### 1. tools/src/commands/ralph/completion.ts (NEW)
New `ralph completion` subcommand with three options:
- `--providers`: Lists installed providers by checking which CLIs are in PATH
- `--models <provider>`: Lists models for a specific provider
- `--flags <command>`: Lists flags for a command (e.g., ralph.build)

Features:
- Supports all 5 providers: claude, opencode, cursor, gemini, codex
- Uses `which` command to detect installed providers dynamically
- Falls back to known model lists when CLI doesn't support model listing
- Fast timeouts (5 seconds) to ensure quick completion

### 2. tools/src/commands/completion/bash.ts (UPDATED)
Enhanced bash completion with:
- Dynamic provider completion function `_aaa_ralph_providers()`
- Dynamic model completion function `_aaa_ralph_models()`
- Helper to detect --provider flag context
- Updated all commands with --provider and --model flags
- Provider completion: `aaa ralph completion --providers`
- Model completion: `aaa ralph completion --models <provider>`

### 3. tools/src/commands/completion/zsh.ts (UPDATED)
Enhanced zsh completion with:
- `_aaa_ralph_providers()` function for dynamic provider completion
- `_aaa_ralph_models()` for provider-specific model completion
- `_aaa_ralph_models_dynamic()` that detects --provider context
- Updated all ralph subcommands with completions
- Added ralph completion subcommand

### 4. tools/src/commands/completion/fish.ts (UPDATED)
Enhanced fish completion with:
- `__fish_aaa_ralph_providers()` helper
- `__fish_aaa_ralph_models()` with --provider detection
- Updated all ralph subcommands
- Added ralph completion subcommand

### 5. tools/src/commands/ralph/index.ts (UPDATED)
- Added import for completionCommand
- Registered completionCommand with ralph command

### 6. tools/tests/e2e/completion.test.ts (UPDATED)
- Added tests for dynamic provider completion
- Added tests for dynamic model completion
- Added tests for ralph completion command
- Verified all shell scripts include new completion functions

## Key Features

1. **Dynamic Provider Detection**: Actually checks `which claude`, `which agent`, etc. Only shows providers that are installed.

2. **Provider-Specific Model Completion**: After typing `--provider cursor`, pressing TAB for `--model` shows cursor-specific models.

3. **Performance**: Uses 5-second timeouts, doesn't block on slow CLI commands.

4. **Fallback Support**: Falls back to known models when CLI doesn't support listing (e.g., claude accepts any model string).

5. **Cross-Shell Support**: Works with Bash, Zsh, and Fish.

## Usage Examples

```bash
# List installed providers
aaa ralph completion --providers

# List models for a provider
aaa ralph completion --models cursor

# List flags for a command
aaa ralph completion --flags ralph.build

# Shell completion examples:
# Type: aaa ralph plan vision --provider <TAB>
# Shows: claude cursor (only installed providers)

# Type: aaa ralph plan vision --provider cursor --model <TAB>
# Shows: composer-1 composer-2 gpt-4o claude-3-5-sonnet
```

## Testing

All 32 completion E2E tests pass, including:
- Script generation tests for bash, zsh, fish
- Dynamic completion handler tests
- Ralph completion command tests
- Help integration tests
- Bash script content verification

## Model Detection Methods

- **Cursor**: `agent --list-models`
- **Opencode**: `opencode models`
- **Codex**: `codex --list-models`
- **Claude**: Returns known models (accepts any string)
- **Gemini**: Returns known models (limited set)

## Provider Commands

- claude: `claude`
- codex: `codex`
- cursor: `agent`
- gemini: `gemini`
- opencode: `opencode`

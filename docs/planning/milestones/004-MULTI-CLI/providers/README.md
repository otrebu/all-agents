# Provider Readiness Profiles

Date: 2026-02-06
Scope: Continuation of multi-provider feasibility analysis using one subagent pass per provider.

## Snapshot

| Provider | Local Binary | Headless | Supervised Interactive | Session Contract | Confidence |
|---|---|---|---|---|---|
| `claude` | Yes (`2.1.34`) | Yes (`-p --output-format json`) | Yes (TTY required) | Yes (`--session-id`/`--resume`) | High |
| `opencode` | Yes (`1.1.53`) | Yes (`run --format json`) | Yes (TUI/attach; TTY required) | Yes (`session`, `export`) | Medium |
| `codex` | Yes (`0.98.0`) | Yes (`exec --json`) | Yes (TTY required) | Partial+ (`exec resume`) | Medium-High |
| `cursor` | No (`agent`/`cursor-agent`) | Likely yes (`-p --output-format json`) | Likely yes (TTY required) | Partial (`create-chat`, `--resume`) | Medium-Low |
| `gemini` | Yes (`0.25.2`) | Yes (`--output-format stream-json`) | Yes (TTY required) | Yes (`--resume`, `--list-sessions`) | Medium |
| `pi` | No (`pi`) | Yes (via package, `-p --mode json`/`--mode rpc`) | Yes (TTY required) | Yes (`--continue`, `--session`, `--export`) | Medium-Low |

## Profiles

- `docs/planning/milestones/004-MULTI-CLI/providers/claude.md`
- `docs/planning/milestones/004-MULTI-CLI/providers/opencode.md`
- `docs/planning/milestones/004-MULTI-CLI/providers/codex.md`
- `docs/planning/milestones/004-MULTI-CLI/providers/cursor.md`
- `docs/planning/milestones/004-MULTI-CLI/providers/gemini.md`
- `docs/planning/milestones/004-MULTI-CLI/providers/pi.md`

## Cross-provider conclusions

- Headless execution is feasible now for `claude`, `opencode`, `codex`, and `gemini` on this machine.
- True supervised mode is uniformly TTY-bound; any provider-neutral supervised contract must require a PTY lifecycle manager.
- Session contracts vary widely; provider-specific adapters are required instead of `.claude` path assumptions.
- Exit code semantics are not uniform; Ralph must standardize success/failure off provider-specific signals, not process code alone.

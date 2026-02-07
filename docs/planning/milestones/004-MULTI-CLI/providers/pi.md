# Provider Profile: Pi

Date: 2026-02-06
Binary in registry: `pi`
Local install status: Not present on PATH in this environment
Observed package path: `@mariozechner/pi-coding-agent` (`0.52.6`)
Confidence: Medium-Low

## Supported modes and caveats

- Headless: Yes, via `-p --mode json`; stronger machine protocol available via `--mode rpc`.
- Supervised interactive: Yes, default TTY/TUI interaction.
- Sessions: Yes (`--session`, `--continue`, `--resume`, `--session-dir`, `--export`).
- Caveat: failure signaling differs by mode; JSON mode may encode errors in events while exiting `0`.

## Recommended command patterns

- Preferred automation path:
  - `pi --mode rpc --no-session ...` (or package equivalent if `pi` binary is unavailable)
- JSON fallback path:
  - `pi -p --mode json --no-session -- <prompt>`
- Supervised path:
  - `pi` in PTY only.

## Session extraction strategy

- Parse session metadata event at stream start for stable session ID.
- Use explicit `--session`/`--session-dir` for deterministic workspace isolation.
- Export session artifacts with `--export <session.jsonl> <output.html>` for reproducible review.

## Risks and mitigation

- Risk: package/binary drift (`@pi-mono/pi` appears stale; active package differs).
  - Mitigation: update install instructions and runtime detection to supported package/source.
- Risk: exit code is not authoritative in all modes.
  - Mitigation: classify success/failure from protocol events (`stopReason`, error fields), not exit code alone.
- Risk: long-lived interactive/rpc processes can hang without watchdogs.
  - Mitigation: enforce provider-level timeout and heartbeat checks in wrapper.

## Suggested tests

- JSON headless success path emits parseable event stream with session metadata.
- JSON headless auth/model error path is correctly marked failed even if process exits `0`.
- `--continue` reuses session ID and preserves context.
- `--export` generates session artifact successfully.

# Provider Profile: Claude

Date: 2026-02-06
Binary: `claude`
Local version: `2.1.34`
Confidence: High

## Supported modes and caveats

- Headless: Yes, via `claude -p` with machine formats `--output-format json` and `--output-format stream-json` (stream requires `--verbose`).
- Supervised interactive: Yes, true TTY interactive mode (`claude` without `-p`).
- Sessions: Yes, first-class (`--session-id`, `--resume`, `--continue`, `--fork-session`).
- Caveat: stderr/stdout split for errors is inconsistent across failure types.

## Recommended command patterns

- Headless deterministic path:
  - `claude -p --output-format json --permission-mode dontAsk --max-turns 1 -- <prompt>`
- Streaming path:
  - `claude -p --verbose --output-format stream-json -- <prompt>`
- Supervised path:
  - `claude` (requires PTY/inherited stdio).

## Session extraction strategy

- Capture `session_id` from JSON result output in headless mode.
- Continue stateful runs with `--resume <sessionId>`.
- Use `--fork-session` for branch-style follow-ups.
- Prefer caller-owned artifact persistence from machine output instead of reading raw session files directly.

## Risks and mitigation

- Risk: error text may appear on either stdout or stderr.
  - Mitigation: check both streams whenever exit code is non-zero.
- Risk: local `--help` does not expose every supported flag in all versions.
  - Mitigation: keep an internal capability probe command list and pin behavior in tests.
- Risk: supervised mode fails in non-TTY environments.
  - Mitigation: enforce PTY requirement in provider capability checks.

## Suggested tests

- `claude -p --output-format json "Return exactly: ok"` returns parseable JSON and non-empty `session_id`.
- `claude -p --output-format stream-json "Return exactly: ok"` fails without `--verbose` (expected contract).
- `claude -p --verbose --output-format stream-json "Return exactly: ok"` emits JSONL events.
- `claude -p --session-id <uuid> ...` then `--resume <uuid> ...` preserves context.
- `claude -p --model not-a-real-model ...` returns clean fatal error handling path.

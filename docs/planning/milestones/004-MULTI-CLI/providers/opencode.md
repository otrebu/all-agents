# Provider Profile: OpenCode

Date: 2026-02-06
Binary: `opencode`
Local version: `1.1.53`
Confidence: Medium

## Supported modes and caveats

- Headless: Yes, via `opencode run --format json` (NDJSON event stream).
- Supervised interactive: Yes, via TUI (`opencode`) and attach flows (`opencode attach`), both PTY-dependent.
- Sessions: Yes (`opencode session list`, `--session`, `--continue`, `opencode export`).
- Caveat: some failure paths may return exit code `0` with empty output or only internal logs.

## Recommended command patterns

- Headless deterministic path:
  - `opencode run --format json --model <provider/model> -- <prompt>`
- Stateful continuation:
  - `opencode run --format json --session <sessionId> -- <prompt>`
- Supervised path:
  - `opencode` (interactive) or `opencode attach <url>` (interactive attach).

## Session extraction strategy

- Extract `sessionID` from `step_start` event in JSON output.
- Prefer explicit `--session <id>` in automation; avoid implicit `--continue` for deterministic loops.
- Export artifacts with `opencode export <sessionId>` and strip the known non-JSON prefix line (`Exporting session: ...`) before JSON parsing.

## Risks and mitigation

- Risk: silent soft-failure shapes (`rc=0` with no useful payload).
  - Mitigation: treat missing terminal events (`step_finish`) as failure, not success.
- Risk: no provider-native timeout flag for `run`.
  - Mitigation: enforce external hard timeout and kill policy in Ralph.
- Risk: attach behavior can be environment-sensitive.
  - Mitigation: gate supervised attach behind explicit capability checks and PTY presence.

## Suggested tests

- `opencode run --format json "Reply exactly: ok"` yields `step_start/text/step_finish` with `sessionID`.
- `opencode session list --format json -n 3` returns parseable JSON list.
- `opencode export <sessionId>` round-trips after stripping prefix line.
- Invalid model (`--model opencode/not-a-model`) produces fatal model-not-found handling.
- Timeout watchdog test verifies hung run is force-terminated and reported correctly.

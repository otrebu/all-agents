# Provider Profile: Cursor

Date: 2026-02-06
Binary: `agent` / `cursor-agent`
Local install status: Not present on PATH in this environment
Confidence: Medium-Low (docs + downloaded binary validation, limited local runtime coverage)

## Supported modes and caveats

- Headless: Likely yes, via `-p/--print` with `--output-format json` or `--output-format stream-json`.
- Supervised interactive: Likely yes, true TTY interactive mode.
- Sessions: Partial, using `create-chat`, `--resume`, and session IDs in output.
- Caveat: non-TTY interactive flows can emit raw-mode errors and ambiguous behavior.

## Recommended command patterns

- Headless deterministic path:
  - `agent -p --output-format json --model <model> -- <prompt>`
- Streaming path:
  - `agent -p --output-format stream-json --stream-partial-output -- <prompt>`
- Supervised path:
  - `agent` in a PTY only.

## Session extraction strategy

- Capture `session_id` from JSON output in headless mode.
- Use `create-chat` to mint explicit IDs where needed.
- Resume explicitly with `--resume <chatId>`.
- Avoid interactive listing flows in automation until non-TTY behavior is proven stable.

## Risks and mitigation

- Risk: binary naming/install ambiguity (`agent` vs `cursor-agent`).
  - Mitigation: probe both binaries during provider detection.
- Risk: interactive commands behave poorly without PTY.
  - Mitigation: hard-gate supervised mode on PTY availability.
- Risk: limited local authenticated testing.
  - Mitigation: require smoke suite on a provisioned Cursor account before enabling by default.

## Suggested tests

- `agent -p --output-format json "Return exactly: ok"` success path with parseable JSON.
- Auth failure in print mode returns non-zero and useful stderr diagnostics.
- `agent create-chat` + `agent -p --resume <id> ...` validates session continuation.
- Non-TTY supervised invocation is rejected cleanly (expected capability error path).

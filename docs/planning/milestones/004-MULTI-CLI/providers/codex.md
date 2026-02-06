# Provider Profile: Codex

Date: 2026-02-06
Binary: `codex`
Local version: `codex-cli 0.98.0`
Confidence: Medium-High

## Supported modes and caveats

- Headless: Yes, via `codex exec --json` (JSONL events).
- Supervised interactive: Yes, via `codex` TUI (PTY required).
- Sessions: Partial+, with explicit resume in headless and interactive (`codex exec resume`, `codex resume`).
- Caveat: no obvious local `models` listing command; model discovery may require docs/provider APIs.

## Recommended command patterns

- Headless deterministic path:
  - `codex exec --json --model <model> --skip-git-repo-check -- <prompt>`
- Stateful continuation:
  - `codex exec resume <threadId> --json -- <prompt>`
- Supervised path:
  - `codex` in a real PTY.

## Session extraction strategy

- Capture `thread_id` from initial JSON events (`thread.started`).
- Mark success/failure using terminal events (`turn.completed` vs `turn.failed`).
- Persist final answer via event parsing or `-o/--output-last-message` when needed.

## Risks and mitigation

- Risk: schema/event taxonomy can evolve by CLI version.
  - Mitigation: parse by event type envelope, ignore unknown fields.
- Risk: no built-in timeout flag.
  - Mitigation: enforce external timeout in provider wrapper.
- Risk: docs/CLI surface drift across releases.
  - Mitigation: pin tested version and run capability probes in CI startup.

## Suggested tests

- `codex exec --json "Return exactly: ok"` emits parseable JSONL with terminal success event.
- `codex exec --json --model not-a-real-model ...` produces `turn.failed` failure handling.
- `codex exec resume --last --json "..."` continues previous thread and preserves context.
- `codex` without PTY fails fast with explicit non-terminal error (expected supervised guardrail).

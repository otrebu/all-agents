# Provider Profile: Gemini

Date: 2026-02-06
Binary: `gemini`
Local version: `0.25.2` (npm latest observed by subagent: `0.27.2`)
Confidence: Medium

## Supported modes and caveats

- Headless: Yes, via `--output-format json` and `--output-format stream-json`.
- Supervised interactive: Yes, default interactive flow is TTY-oriented.
- Sessions: Yes, via `--resume` and `--list-sessions`, with local session file storage.
- Caveat: stderr carries extra operational logs; parsers must isolate stdout JSON.

## Recommended command patterns

- Headless deterministic path:
  - `gemini --output-format stream-json --model <model> -- <prompt>`
- Stateful continuation:
  - `gemini --resume <sessionId|latest> --output-format stream-json -- <prompt>`
- Supervised path:
  - `gemini` in PTY only.

## Session extraction strategy

- Extract `session_id` from `init` event in stream-json output.
- Continue context with `--resume` using explicit ID.
- Optionally archive local session files under `~/.gemini/tmp/.../chats/session-*.json` for post-iteration telemetry.

## Risks and mitigation

- Risk: local CLI version lag can change behavior or event shape.
  - Mitigation: pin supported version and include startup contract probes.
- Risk: server-side retries/backoff create long-tail latency.
  - Mitigation: enforce external hard timeout and retry budget.
- Risk: model listing/discovery path is not as explicit as other CLIs.
  - Mitigation: maintain provider-specific model registry and runtime validation.

## Suggested tests

- `gemini --output-format stream-json "Return exactly: ok"` emits `init/message/result` events.
- `gemini --list-sessions` returns usable session identifiers.
- `gemini --resume latest --output-format stream-json "..."` preserves continuity.
- Invalid model path returns fatal error event and is classified as non-retryable.

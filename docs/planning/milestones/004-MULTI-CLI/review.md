# 004-MULTI-CLI Review Notes

Date: 2026-02-06
Branch: `feature/multi-cli-abstraction`

## Issues

### High

- [x] Provider selection priority is not fully applied in `build` and `review`. Current calls pass only CLI flag and fall back to `claude`, so env/config/auto-detect behavior from story acceptance criteria is not actually used.
  - `tools/src/commands/ralph/build.ts:782`
  - `tools/src/commands/review/index.ts:908`
  - `tools/src/commands/review/index.ts:1238`
  - `tools/src/commands/ralph/providers/registry.ts:316`
- [x] Config-based provider/model defaults are not wired through in current schema/loader path.
  - `tools/src/lib/config/types.ts:261`
  - `tools/src/commands/ralph/config.ts:264`
- [x] `--model` is validated and displayed, but the selected model is not passed into provider invocation config.
  - `tools/src/commands/ralph/build.ts:394`
  - `tools/src/commands/review/index.ts:913`
  - `tools/src/commands/ralph/providers/registry.ts:249`
- [x] `aaa ralph build --provider opencode` does not execute OpenCode end-to-end in default path because build defaults to supervised mode and OpenCode supervised mode currently returns a stub result.
  - `tools/src/commands/ralph/index.ts:466`
  - `tools/src/commands/ralph/providers/opencode.ts:182`

### Medium

- [x] OpenCode invocation contract in implementation appears inconsistent with story docs (`opencode run` vs direct `opencode` invocation).
  - `docs/planning/milestones/004-MULTI-CLI/stories/003-opencode-support.md:62`
  - `tools/src/commands/ralph/providers/opencode.ts:205`
- [x] Claude is special-cased in provider invocation and bypasses shared binary availability/install-instruction checks, creating inconsistent UX for missing binaries.
  - `tools/src/commands/ralph/providers/registry.ts:220`
- [x] Fish completion for `--model` is not provider-aware (it does not forward current `--provider` to completion backend).
  - `tools/src/commands/completion/fish.ts:166`

### Low

- [x] `pi` install instructions are mapped to Claude package text.
  - `tools/src/commands/ralph/providers/registry.ts:151`

## Handoff Notes (for context reset)

### Completed

- All **HIGH** issues above are implemented and marked `[x]`.
- All **MEDIUM** issues above are implemented and marked `[x]`.
- `build` and `review` now use async provider resolution (`CLI > env > config > auto-detect`).
- Unified config now carries `ralph.provider`, `ralph.model`, and `ralph.lightweightModel` through schema + loader + `loadRalphConfig()`.
- Selected model is now propagated into provider invocation config.
- OpenCode supervised default path no longer stubs; registry now composes supervised prompts for non-Claude providers.
- OpenCode invocation contract now uses `opencode run`.
- Fish model completion is provider-aware for both `aaa ralph build` and `aaa review`.

### Not completed

- None.

### Key files changed in this pass

- `tools/src/commands/ralph/providers/registry.ts`
- `tools/src/commands/ralph/providers/opencode.ts`
- `tools/src/commands/ralph/build.ts`
- `tools/src/commands/review/index.ts`
- `tools/src/commands/ralph/config.ts`
- `tools/src/lib/config/types.ts`
- `tools/src/lib/config/loader.ts`
- `tools/src/commands/completion/fish.ts`
- `tools/tests/providers/registry.test.ts`
- `tools/tests/providers/opencode.test.ts`
- `tools/tests/providers/opencode.integration.test.ts`
- `tools/tests/lib/config-types.test.ts`
- `tools/tests/lib/config-loader.test.ts`
- `tools/tests/lib/ralph-config.test.ts`
- `tools/tests/completion/model-completion.test.ts`

### Validation run (all passed)

- `cd tools && bun test tests/lib/config-types.test.ts tests/lib/config-loader.test.ts tests/lib/ralph-config.test.ts`
- `cd tools && bun test tests/providers/registry.test.ts tests/e2e/provider-flag.test.ts`
- `cd tools && bun test tests/providers/registry.test.ts tests/providers/opencode.test.ts`
- `cd tools && bun test tests/providers/opencode.test.ts tests/providers/opencode.integration.test.ts tests/providers/registry.test.ts tests/completion/model-completion.test.ts tests/e2e/completion.test.ts`

# 004-MULTI-CLI Feedback Report

Date: 2026-02-06
Scope: Current multi-provider implementation status, remaining Claude coupling, and feasibility of true interactive/session support for OpenCode.

## Executive Summary

The multi-provider abstraction is real, but only partially complete.

- What works now: `aaa ralph build` and top-level `aaa review` can invoke non-Claude providers through `providers/registry.ts`, and OpenCode now executes end-to-end in headless flows.
- What is still Claude-centric: supervised semantics, session discovery, post-iteration telemetry, planning/review command families, session tooling, and several user-facing labels/docs.
- Feasibility of true OpenCode supervised + session support: **Yes, feasible**, with a medium/high implementation effort and some provider-specific lifecycle risks.

Bottom line: we can make this truly multi-provider, but it needs a second pass focused on runtime contracts (interactive/session), not just invocation abstraction.

## Method

- Code review of Ralph + provider stack (`tools/src/commands/ralph/**`, `tools/src/commands/review/index.ts`, `tools/src/commands/session/index.ts`).
- Local OpenCode capability checks:
  - `opencode --help`
  - `opencode run --help`
  - `opencode attach --help`
  - `opencode serve --help`
  - `opencode session list --format json -n 3`
  - `opencode export <sessionId>`
- Cross-check against existing milestone notes (`docs/planning/milestones/004-MULTI-CLI/review.md`).

## Key Findings

### 1) Supervised mode contract is not provider-neutral (High)

Today, "supervised" means different things depending on provider.

- Claude supervised is true interactive chat (`stdio: inherit`) where the user can intervene (`tools/src/commands/ralph/providers/claude.ts:132`, `tools/src/commands/ralph/providers/claude.ts:174`).
- OpenCode supervised currently reuses the JSON run path (non-interactive) (`tools/src/commands/ralph/providers/opencode.ts:193`, `tools/src/commands/ralph/providers/opencode.ts:221`, `tools/src/commands/ralph/providers/opencode.ts:225`).
- Build/review UX text implies interactive supervision generally, but behavior is currently Claude-parity only.

Impact:
- "Supervised" is not semantically stable across providers.
- Users selecting OpenCode supervised do not get true watch/intervene behavior.

### 2) Session discovery and metrics are Claude-path dependent (High)

Session plumbing is still tied to `~/.claude` layout.

- Supervised build uses `discoverRecentSession(...)` (`tools/src/commands/ralph/build.ts:651`).
- `discoverRecentSession` scans under `CLAUDE_CONFIG_DIR`/`.claude/projects` (`tools/src/commands/ralph/session.ts:133`, `tools/src/commands/ralph/session.ts:137`).
- `getSessionJsonlPath` only searches Claude-style session locations (`tools/src/commands/ralph/session.ts:289`, `tools/src/commands/ralph/session.ts:295`).

Impact:
- Non-Claude sessions are not discovered through the current Ralph session APIs.
- Post-iteration hook loses metrics detail for non-Claude providers.

### 3) Post-iteration summary path is Claude-specific (High)

- Post-iteration summary generation depends on `invokeClaudeHaiku` regardless of main provider (`tools/src/commands/ralph/post-iteration.ts:26`, `tools/src/commands/ralph/post-iteration.ts:217`).
- Timing and type naming remain Claude-specific (`claudeMs`, "Claude session ID", token usage comments) (`tools/src/commands/ralph/post-iteration.ts:67`, `tools/src/commands/ralph/types.ts:157`, `tools/src/commands/ralph/types.ts:200`).

Impact:
- Even if main execution is OpenCode, summarization and telemetry still depend on Claude tooling/conventions.

### 4) Large Ralph command surface is still Claude-hardcoded (High)

Multi-provider abstraction is not yet applied to most `aaa ralph` subcommands.

- `aaa ralph build` supports `--provider` and `--model` (`tools/src/commands/ralph/index.ts:490`).
- Most planning/review paths still call `invokeClaude*` wrappers directly (`tools/src/commands/ralph/index.ts:370`, `tools/src/commands/ralph/index.ts:932`, and many call sites like `tools/src/commands/ralph/index.ts:1299`, `tools/src/commands/ralph/index.ts:1714`).
- Provider/model flags are absent on these commands (help output confirms for `plan stories`, `ralph review stories`, `calibrate intention`).

Impact:
- Only a subset of Ralph is truly provider-agnostic.
- Users experience "multi-provider" primarily in build + top-level review, not in the broader Ralph workflow.

### 5) Top-level review command is provider-aware, but still has Claude assumptions (Medium)

- Good: top-level `aaa review` resolves provider/model and calls `invokeWithProvider` (`tools/src/commands/review/index.ts:956`, `tools/src/commands/review/index.ts:966`, `tools/src/commands/review/index.ts:1280`).
- Still Claude-coupled:
  - Skill path hardcoded under `.claude/skills/...` (`tools/src/commands/review/index.ts:934`, `tools/src/commands/review/index.ts:1248`).
  - Comments/UI text still Claude-branded (`tools/src/commands/review/index.ts:982`, `tools/src/commands/review/index.ts:1234`).

Impact:
- Functional in headless multi-provider mode, but ecosystem naming and supervised expectations are still Claude-first.

### 6) Session CLI is explicitly Claude-only (Medium)

- Command description and behavior target Claude session files (`tools/src/commands/session/index.ts:2`, `tools/src/commands/session/index.ts:193`).
- Reads `.claude/current-session` (`tools/src/commands/session/index.ts:70`, `tools/src/commands/session/index.ts:339`).
- Session listing scans `~/.claude/projects` (`tools/src/commands/session/index.ts:107`, `tools/src/commands/session/index.ts:115`).

Impact:
- Interrogation/session tooling does not currently support OpenCode session stores.

### 7) Mode capabilities are declared but not enforced (Medium)

- Registry advertises `supportedModes` per provider (`tools/src/commands/ralph/providers/registry.ts:455`, `tools/src/commands/ralph/providers/registry.ts:483`).
- Invocation path does not gate by `supportedModes` before execution (`tools/src/commands/ralph/providers/registry.ts:258`, `tools/src/commands/ralph/providers/registry.ts:264`).
- `headless-sync` exists in types but is not actually implemented/used (`tools/src/commands/ralph/providers/types.ts:70`).

Impact:
- Capability metadata is partially informational, not a strict runtime contract.

### 8) Model discovery is still single-provider (Medium)

- `DISCOVERABLE_PROVIDERS` currently includes only OpenCode (`tools/src/commands/ralph/refresh-models.ts:33`).

Impact:
- Registry refresh is not yet a general multi-provider discovery mechanism.

### 9) User-facing language/docs remain Claude-biased (Low)

- Response header still says "Claude Response" (`tools/src/commands/ralph/display.ts:1164`).
- Build retry message still says "Claude invocation failed" in provider-agnostic path (`tools/src/commands/ralph/build.ts:1032`, `tools/src/commands/ralph/build.ts:1059`).
- Docs still describe supervised as "Watch Claude work" (`tools/README.md:285`).
- Ralph execution-pattern doc is entirely Claude invocation oriented (`context/blocks/construct/ralph-patterns.md:38`, `context/blocks/construct/ralph-patterns.md:51`).

Impact:
- Increases confusion for non-Claude users and hides real provider behavior differences.

## OpenCode Interactive + Session Feasibility

### Confirmed OpenCode capabilities (local checks)

- `opencode --help` exposes interactive + remote supervision primitives:
  - TUI: `opencode [project]`
  - Server: `opencode serve`
  - Attach: `opencode attach <url>`
  - Web UI: `opencode web`
  - Session APIs: `opencode session`, `opencode export`
- `opencode run --help` supports `--session`, `--continue`, `--attach`, `--format json`.
- `opencode session list --format json` returns stable IDs and timestamps.
- `opencode export <id>` returns structured session JSON (with a known stdout prefix quirk).

Conclusion:
- **True OpenCode interactive supervision is feasible** (via server+attach/web architecture, not `run` alone).

## Recommended Architecture to Reach "Real Multi-Provider"

### Phase 1: Contract clarity and capability gating

- Introduce explicit provider runtime capabilities:
  - `supportsInteractiveSupervised`
  - `supportsHeadless`
  - `supportsSessionExport`
- Enforce capabilities at invocation time (fail fast with clear message).
- Rename internal semantics where needed (`supervised-interactive` vs `supervised-noninteractive` if both are supported).

### Phase 2: Session abstraction (provider-agnostic)

- Add a provider session interface:
  - `discoverRecentSession(provider, context)`
  - `resolveSessionPath(provider, sessionId)`
  - `extractTokenUsage(provider, session)`
  - `extractToolCalls(provider, session)`
- Replace direct `.claude` path assumptions in build/post-iteration/session tooling.

### Phase 3: OpenCode true supervised implementation

- Implement supervised runtime for OpenCode using one of:
  1. Server + attach (`serve` + `attach`) [recommended]
  2. Server + web (`serve` + `web`) for browser intervention
- Keep headless path on `opencode run --format json` for automation reliability.
- Capture and persist OpenCode session IDs for post-iteration hooks.

### Phase 4: Apply provider abstraction to remaining Ralph command families

- Migrate `ralph plan *` and `ralph review *` (the planning artifact review group in `ralph index`) from `invokeClaude*` wrappers to `invokeWithProvider`.
- Add `--provider` and `--model` where missing (or document intentional constraints explicitly).

### Phase 5: Docs + test parity

- Update all mode descriptions to provider-neutral language.
- Add E2E coverage for:
  - non-Claude supervised behavior
  - provider-specific capability errors
  - session extraction/diary logging parity across providers

## Risks and Constraints

- TTY lifecycle complexity for interactive attach sessions (start/stop, orphan handling, interruption).
- Provider-specific bugs can affect reliability in supervised mode.
- Current post-iteration and commit/session conventions (`cc-session-id`, `.claude/current-session`) will need migration strategy for backward compatibility.

## Prioritized Action List

1. Implement provider capability gating and truthful mode messaging.
2. Add provider-agnostic session abstraction and remove direct `.claude` assumptions from build/post-iteration.
3. Implement OpenCode supervised interactive flow (server+attach/web) with robust lifecycle handling.
4. Migrate `ralph plan` and `ralph review` command families to provider abstraction.
5. Clean up user-facing Claude-specific text/docs and add multiprovider E2E tests.

## Required: Readiness Analysis for Every Provider

Yes, we should run the same deep analysis for every CLI provider we intend to include, not only OpenCode.

Reason:
- Most late failures come from provider CLI contract mismatches (flags, output format, TTY behavior, session semantics).
- A provider can be "headless-ready" but not "supervised-ready".
- Without pre-analysis, we risk shipping a "multi-provider" label with uneven behavior.

### Provider Readiness Matrix (initial)

| Provider | Headless | Supervised Interactive | Session Export/Lookup | Current Confidence | Notes |
|---|---|---|---|---|---|
| `claude` | Yes | Yes | Yes (`.claude`) | High | Baseline implementation |
| `opencode` | Yes | Partial today / Yes feasible | Yes (`session` + `export`) | Medium | Needs server+attach/web integration |
| `codex` | Unknown | Unknown | Unknown | Low | Needs CLI capability audit |
| `cursor` | Unknown | Unknown | Unknown | Low | Needs CLI capability audit |
| `gemini` | Unknown | Unknown | Unknown | Low | Needs CLI capability audit |
| `pi` | Unknown | Unknown | Unknown | Low | Needs CLI capability audit |

### Mandatory analysis checklist per provider

1. Command surface and version behavior (`--help`, subcommand help, exit codes).
2. Headless contract (machine output format + parse stability + timeout behavior).
3. Supervised contract (true TTY-interactive or non-interactive wrapper).
4. Session contract (session IDs, resume/continue, export artifacts, path stability).
5. Model contract (how model IDs are listed/validated and provider-specific formats).
6. Failure contract (stderr/stdout split, retryable vs fatal errors, auth errors).
7. Testability contract (can we reliably mock/integration-test in CI).

### Expected artifact from each provider analysis

- One short provider profile doc under `docs/planning/milestones/004-MULTI-CLI/` with:
  - Supported modes and caveats
  - Recommended command patterns
  - Session extraction strategy
  - Risks and mitigation
  - Suggested tests

## Implementation Progress Update (2026-02-06)

**COMMIT MARKER: `bc4c516` - "WIP: multi-provider planning support through GPT 5.3"**

This commit marks the end of the GPT 5.3 Codex session. Work is incomplete and needs continuation.

### What Was Accomplished

**Planning Commands - Provider/Model Flag Support:**
- ✅ `ralph build --provider <name> --model <name>` - FULLY WORKING (already existed)
- ✅ `ralph plan subtasks --provider <name> --model <name>` - IMPLEMENTED & TESTED
  - Working end-to-end with OpenCode: `plan subtasks --provider opencode --model openai/gpt-5.3-codex`
  - Both headless and supervised modes supported
- ✅ `ralph calibrate <subcommand> --provider <name> --model <name>` - IMPLEMENTED
  - All subcommands: intention, technical, improve, all
  - Flags added and wired through to `invokeWithProvider()`

**Provider Infrastructure:**
- ✅ Provider-aware invocation wrappers added to `index.ts`:
  - `resolvePlanningProvider()` - resolves provider with CLI > config > env > auto priority
  - `resolvePlanningModel()` - resolves model override
  - `invokePlanningSupervised()` - routes to correct provider for supervised mode
  - `invokeClaudeHeadless()` - updated to support provider/model parameters
- ✅ `calibrate.ts` updated to accept and forward provider/model to all check functions

**Task Creation (20 tasks total, TASK-036 through TASK-057):**
- Provider types, registry, utilities (036-038)
- Claude unit/integration tests (043-044)
- OpenCode implementation, registry, tests (045-048)
- Model registry: static, dynamic discovery, tab completion, validation (049-052)
- **NEW OpenCode parity tasks (053-057):**
  - TASK-053: Provider capability gating
  - TASK-054: OpenCode supervised lifecycle
  - TASK-055: Provider session abstraction
  - TASK-056: Provider outcome classification
  - TASK-057: Provider-neutral post-iteration

**Provider Profile Docs Created:**
- ✅ Comprehensive readiness analysis for all 6 providers
- ✅ `providers/README.md` with audited matrix
- ✅ Individual profiles: claude.md, opencode.md, codex.md, cursor.md, gemini.md, pi.md

### What's Partially Done (Needs Completion)

**Planning Commands - INTERNAL SUPPORT EXISTS, CLI FLAGS NOT WIRED:**
- ⚠️ `ralph plan stories` - interfaces updated (`TasksMilestoneOptions` has model/provider), but:
  - Command definition lacks `--provider` and `--model` flags
  - Action handler doesn't pass options to `runTasksMilestoneMode()`
- ⚠️ `ralph plan tasks` - interfaces updated (`TasksStoryOptions`, `TasksSourceOptions` have model/provider), but:
  - Command definition lacks `--provider` and `--model` flags
  - Action handler doesn't pass options to `runTasksStoryMode()` or `runTasksSourceMode()`
- ⚠️ `ralph plan vision` - NO SUPPORT (still hardcoded Claude-only)
- ⚠️ `ralph plan roadmap` - NO SUPPORT (still hardcoded Claude-only)

**Review Commands:**
- ❌ `ralph review stories --milestone <path>` - NO provider/model flags
- ❌ `ralph review roadmap` - NO provider/model flags
- ❌ `ralph review tasks --story <path>` - NO provider/model flags
- ❌ `ralph review gap <subcommand>` - NO provider/model flags
- ❌ `ralph review <subcommand>` - NO provider/model flags

**Core Abstractions Still Missing:**
- ❌ Provider capability gating (TASK-053 not started)
- ❌ OpenCode true supervised lifecycle (TASK-054 not started)
- ❌ Provider-agnostic session abstraction (TASK-055 not started)
- ❌ Provider outcome classification (TASK-056 not started)
- ❌ Provider-neutral post-iteration (TASK-057 not started)

### Critical Gap: Tasks vs Implementation

**WE CREATED TASKS BUT HAVEN'T STARTED THE CORE ABSTRACTION WORK:**

Tasks TASK-053 through TASK-057 define the necessary work, but **none of the actual implementation has been done yet**. These are the foundational abstractions needed for true multi-provider support:

1. **TASK-053 (Capability Gating)** - Must be done FIRST
   - Currently no runtime enforcement of what providers support what modes
   - OpenCode supervised doesn't actually do interactive supervision
   - Need strict capability checks before invocation

2. **TASK-054 (OpenCode Supervised)** - Depends on 053
   - OpenCode supervised currently falls back to JSON mode
   - Need proper PTY lifecycle for true interactive mode
   - Should use `opencode serve` + `opencode attach` or `opencode web`

3. **TASK-055 (Session Abstraction)** - Critical decoupling
   - Session discovery still hardcoded to `.claude` paths
   - Post-iteration metrics extraction assumes Claude session format
   - Need provider-specific session adapters

4. **TASK-056 (Outcome Classification)** - Retry logic fix
   - Exit codes vary by provider
   - Need normalized success/retryable/fatal classification

5. **TASK-057 (Post-iteration Neutral)** - Final cleanup
   - Remove Claude-specific naming (`claudeMs`, etc.)
   - Provider-neutral summary invocation

### Updated Priority List (Reality Check)

**IMMEDIATE (Finish what GPT 5.3 started):**
1. Wire `--provider` and `--model` flags to `plan stories` and `plan tasks` commands
2. Add provider/model support to `plan vision` and `plan roadmap`
3. Add provider/model support to ALL `ralph review` commands

**CORE ABSTRACTIONS (The real work - TASKS 053-057):**
4. Implement TASK-053: Provider capability gating
5. Implement TASK-054: OpenCode supervised lifecycle
6. Implement TASK-055: Provider session abstraction
7. Implement TASK-056: Provider outcome classification
8. Implement TASK-057: Provider-neutral post-iteration

**EXPANSION (After core is solid):**
9. Integrate Codex and Gemini as additional providers
10. Fix install/binary metadata for Pi and Cursor
11. E2E test coverage for non-Claude providers

### Continuation Context

**If you are continuing this work:**

1. **Start with the EASY wins**: Finish wiring provider/model flags to `plan stories`, `plan tasks`, `plan vision`, `plan roadmap`
2. **Then tackle review commands**: Add provider/model flags to all review subcommands
3. **Then do the hard work**: Implement TASK-053 through TASK-057 in order (they have dependencies)

**Key files to modify:**
- `tools/src/commands/ralph/index.ts` - Add flags to plan stories/tasks/vision/roadmap commands
- `tools/src/commands/review/index.ts` - Add provider/model support to review commands
- `tools/src/commands/ralph/providers/registry.ts` - Implement capability gating
- `tools/src/commands/ralph/providers/opencode.ts` - Implement true supervised mode
- `tools/src/commands/ralph/session.ts` - Create provider session adapters
- `tools/src/commands/ralph/post-iteration.ts` - Remove Claude-specific assumptions

**Test before claiming victory:**
```bash
# Test planning commands with OpenCode
aaa ralph plan stories --milestone 004-MULTI-CLI --provider opencode --model openai/gpt-5.3-codex --headless
aaa ralph plan tasks --story 005-opencode-parity-multiprovider-runtime --provider opencode --headless
aaa ralph plan vision --provider opencode  # Should work after implementation

# Test review commands
aaa ralph review stories --milestone 004-MULTI-CLI --provider opencode --headless

# Verify capability gating works
aaa ralph build --provider opencode --mode supervised  # Should fail gracefully until TASK-054 done
```

## Continuation Update: Per-Provider Deep-Dive (2026-02-06)

Executed one subagent-led readiness audit per provider (`claude`, `opencode`, `codex`, `cursor`, `gemini`, `pi`) and generated profile docs:

- `docs/planning/milestones/004-MULTI-CLI/providers/README.md`
- `docs/planning/milestones/004-MULTI-CLI/providers/claude.md`
- `docs/planning/milestones/004-MULTI-CLI/providers/opencode.md`
- `docs/planning/milestones/004-MULTI-CLI/providers/codex.md`
- `docs/planning/milestones/004-MULTI-CLI/providers/cursor.md`
- `docs/planning/milestones/004-MULTI-CLI/providers/gemini.md`
- `docs/planning/milestones/004-MULTI-CLI/providers/pi.md`

### Audited readiness matrix

| Provider | Local Binary Status | Headless Contract | Supervised Interactive | Session Contract | Current Confidence | Readiness Verdict |
|---|---|---|---|---|---|---|
| `claude` | Installed (`2.1.34`) | Strong (`-p --output-format json`) | Strong (PTY-required) | Strong (`--session-id`/`--resume`) | High | Production baseline |
| `opencode` | Installed (`1.1.53`) | Strong (`run --format json`) | Medium (TTY attach/TUI lifecycle) | Strong (`session`, `export`) | Medium | Production with guardrails |
| `codex` | Installed (`0.98.0`) | Strong (`exec --json`) | Strong (PTY-required) | Medium+ (`exec resume`) | Medium-High | High-potential next provider |
| `cursor` | Not installed (`agent`/`cursor-agent`) | Medium (docs + downloaded binary) | Medium (PTY-required) | Medium (`create-chat`, `--resume`) | Medium-Low | Discovery only until local smoke suite |
| `gemini` | Installed (`0.25.2`) | Strong (`--output-format stream-json`) | Strong (PTY-required) | Strong (`--resume`, `--list-sessions`) | Medium | Good candidate after adapter work |
| `pi` | Not installed (`pi`) | Medium (`--mode json`/`--mode rpc`) | Medium (PTY-required) | Strong (`--continue`, `--export`) | Medium-Low | Blocked by packaging/invocation drift |

### New cross-provider findings

1. **Supervised mode is PTY-gated for all providers tested**
   - A provider-neutral supervised contract must enforce PTY lifecycle requirements up front.

2. **Exit-code semantics are not uniform and cannot be trusted alone**
   - At least one provider path can emit protocol-level errors with process exit `0`.
   - Runtime success criteria must be adapter-specific (terminal event parsing), not generic exit checks.

3. **Session APIs vary by transport shape and artifact format**
   - Claude/Codex center on ID-based resume.
   - OpenCode adds explicit `session list` + `export`, with an export stdout prefix quirk.
   - Gemini exposes resume/list + file-backed sessions.
   - Pi supports multiple session modes and export but differs on package/binary naming.

4. **Install and binary assumptions need correction before "real multiprovider" claims**
   - `pi` package assumptions in current install guidance appear stale.
   - Cursor binary naming should probe both `agent` and `cursor-agent`.

5. **Model discovery maturity is provider-asymmetric**
   - Some providers expose first-class model listing commands, while others rely on runtime validation and docs.
   - Static+dynamic registry design remains valid, but per-provider discovery adapters are required.

### Updated priority order after deep-dive

1. Add strict provider capability probes at startup (headless/supervised/session-export/model-list) and surface truthful UX.
2. Introduce a provider result-classification contract (`success`, `retryable`, `fatal`) based on adapter-level terminal events, not exit code.
3. Implement provider-specific session adapters and remove remaining `.claude` assumptions from build/session/post-iteration tooling.
4. Integrate Codex and Gemini as next concrete providers for headless parity, then supervised parity with PTY orchestration.
5. Fix install/binary metadata (`pi`, `cursor`) and gate those providers behind explicit experimental status until smoke tests pass.

## Continuation Packet (if context is reset)

If a new agent continues this work, this is the minimum context needed:

### Goal

- Make Ralph truly multiprovider across invocation, supervised interaction, sessions, telemetry, docs, and tests.

### Current state snapshot (Updated 2026-02-06 after GPT 5.3 session)

**COMMIT: `bc4c516`**

**Working now:**
- `aaa ralph build --provider opencode --headless` - working
- `aaa ralph plan subtasks --provider opencode --model openai/gpt-5.3-codex --headless` - working end-to-end
- `aaa ralph calibrate intention --provider opencode --model openai/gpt-5.3-codex` - flags present, invocation starts

**Implemented but incomplete:**
- Planning command interfaces updated with provider/model support, but CLI flags not wired for:
  - `ralph plan stories` (interface ready, flags missing)
  - `ralph plan tasks` (interface ready, flags missing)
  - `ralph plan vision` (no support yet)
  - `ralph plan roadmap` (no support yet)
- All `ralph review` commands (no provider/model support yet)

**Not started (tasks created but no implementation):**
- TASK-053: Provider capability gating
- TASK-054: OpenCode supervised lifecycle  
- TASK-055: Provider session abstraction
- TASK-056: Provider outcome classification
- TASK-057: Provider-neutral post-iteration

**Still true:**
- OpenCode lacks true interactive supervised behavior (currently non-interactive run path)
- Session and post-iteration internals remain primarily Claude-shaped
- Capability gating not enforced - unsupported mode/provider combos may fail confusingly

### Highest-priority code areas to inspect first

- `tools/src/commands/ralph/providers/opencode.ts`
- `tools/src/commands/ralph/providers/registry.ts`
- `tools/src/commands/ralph/build.ts`
- `tools/src/commands/ralph/session.ts`
- `tools/src/commands/ralph/post-iteration.ts`
- `tools/src/commands/ralph/index.ts`
- `tools/src/commands/session/index.ts`
- `tools/src/commands/review/index.ts`

### Key architecture decisions already recommended

1. **Finish surface area first**: Wire `--provider` and `--model` flags to ALL planning and review commands.
2. Add strict runtime capability gating by provider/mode (TASK-053).
3. Introduce provider-agnostic session abstraction before expanding supervised support (TASK-055).
4. Implement OpenCode supervised via server+attach/web, not `run` (TASK-054).
5. Migrate remaining `ralph plan` and `ralph review` command families off direct `invokeClaude*` paths.

### Tasks Created (Ready for Implementation)

**Surface area completion:**
- Wire provider/model flags to `ralph plan stories`, `plan tasks`, `plan vision`, `plan roadmap`
- Add provider/model support to all `ralph review` subcommands

**Core abstractions (in dependency order):**
- TASK-053: Provider capability gating (MUST be first)
- TASK-054: OpenCode supervised lifecycle (depends on 053)
- TASK-055: Provider session abstraction (depends on 053)
- TASK-056: Provider outcome classification (depends on 053)
- TASK-057: Provider-neutral post-iteration (depends on 055)

### Validation commands to run during continuation

```bash
aaa ralph build --subtasks docs/planning/milestones/003-ralph-workflow/subtasks.json --provider opencode --headless
aaa ralph build --help
aaa review --help
opencode --help
opencode run --help
opencode attach --help
opencode serve --help
opencode session list --format json -n 3
```

### Definition of done for "true multiprovider"

- Same mode semantics across providers (or explicit capability errors).
- Provider-agnostic session tracking and post-iteration telemetry.
- Provider/model flags available where relevant across Ralph command families.
- Documentation language is provider-neutral unless intentionally provider-specific.
- E2E coverage includes at least one non-Claude provider for both headless and supervised paths.

## External References

- OpenCode CLI docs: https://opencode.ai/docs/cli/
- OpenCode server docs: https://opencode.ai/docs/server/
- OpenCode TUI docs: https://opencode.ai/docs/tui/
- OpenCode web docs: https://opencode.ai/docs/web/
- OpenCode repo: https://github.com/anomalyco/opencode

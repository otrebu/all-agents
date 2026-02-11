# Testing & Verification Guidance

Shared reference for task/subtask generation and build execution handoff.

## Source of Truth

Use the profile contract for lane requirements and policy decisions:
- @context/workflows/ralph/planning/components/testing-profile-contract.md

## Handoff Contract (Planner -> Builder)

Each implementation subtask should include profile-aligned AC lines using these prefixes:
- `[Behavioral]` automated behavior test to implement/run
- `[Visual]` user-visible visual/interaction verification to perform
- `[Regression]` regression protection to add/run
- `[Evidence]` explicit proof artifacts to produce

Builder mapping is deterministic:
- `[Behavioral]` -> write/extend automated tests and run them
- `[Visual]` -> run Agent Browser verification steps and capture screenshot/snapshot evidence
- `[Regression]` -> add or execute targeted regression case for the prior risk/failure mode
- `[Evidence]` -> report test command, test file/path, and verification artifacts in completion output

## Verification Tools

- **Agent Browser**: required for user-visible web UI verification.
- **Playwright**: automated web flow testing where project patterns support it.

## Tooling Rules

- User-visible web UI: Agent Browser verification is required.
- Non-visual web logic (state, API handlers, transformations): Agent Browser is optional; use automated tests.
- Browser flow automation can use Playwright where project patterns support it.
- BDD/Cucumber framework adoption is deferred; do not require BDD framework syntax.

References:
- @context/blocks/test/agent-browser.md
- @context/blocks/test/playwright.md
- @context/foundations/test/test-visual-web-agent-browser.md
- @context/foundations/test/test-e2e-web-playwright.md

## Mixed TDD Defaults

- Outside-in: `cli_command`, `cli_flag`, `web_user_flow`
- Unit/component-first: `web_ui_visual`, `module`, `api_endpoint`
- Characterization-first: `refactor`
- Failing regression first: `bug_fix`

## AC Examples (Executable)

- `[Behavioral] Playwright test validates account recovery flow success and invalid token states`
- `[Visual] Agent Browser verifies recovery screen layout and disabled submit state before valid input`
- `[Regression] Existing sign-in flow test still passes for users not entering recovery flow`
- `[Evidence] tests/e2e/recovery.spec.ts passes via pnpm test --filter recovery; attach Agent Browser screenshot for /recover`

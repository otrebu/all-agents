# Testing Profile Contract

Shared contract for planning and build prompts so acceptance criteria (AC) map to consistent test and verification work across CLI, web, API, and module changes.

## Profiles

Use exactly one primary profile per subtask:

| Profile | Use For |
|---|---|
| `cli_command` | New executable command surface |
| `cli_flag` | New/changed flags on existing commands |
| `web_ui_visual` | Visual UI component/layout/styling behavior |
| `web_user_flow` | Multi-step user journeys in web UI |
| `api_endpoint` | HTTP/RPC endpoint behavior and contracts |
| `module` | Internal logic, services, utilities, non-UI components |
| `refactor` | Structural/code-shape improvements without intended behavior change |
| `bug_fix` | Corrective changes for broken behavior |

## Required AC Lanes by Profile

Lane keys:
- **Behavioral** = automated test AC (unit/integration/E2E)
- **Visual** = visual/interaction verification AC
- **Regression** = regression-protection AC
- **Evidence** = explicit proof expectations in AC

| Profile | Behavioral | Visual | Regression | Evidence |
|---|---|---|---|---|
| `cli_command` | Required | Not required | Required when adjacent command behavior can regress | Required |
| `cli_flag` | Required | Not required | Required | Required |
| `web_ui_visual` | Required | Required (Agent Browser) | Required when modifying existing UI | Required |
| `web_user_flow` | Required | Required (Agent Browser on key screens/interactions) | Required | Required |
| `api_endpoint` | Required | Not required | Required when existing contract/path is touched | Required |
| `module` | Required | Not required | Required when exported/public behavior changes | Required |
| `refactor` | Required (characterization first) | Required only if user-visible UI is touched | Required | Required |
| `bug_fix` | Required | Required only for user-visible UI bugs | Required | Required |

Policy:
- BDD/Cucumber adoption is deferred; no BDD framework is required.
- Agent Browser is required for user-visible web UI verification and optional for non-visual web logic.

## Mixed TDD Strategy by Profile

| Profile | Default TDD Mode |
|---|---|
| `cli_command`, `cli_flag`, `web_user_flow` | Outside-in (user entrypoint first) |
| `web_ui_visual`, `module`, `api_endpoint` | Unit/component-first |
| `refactor` | Characterization-first, then safe extraction |
| `bug_fix` | Failing regression test first, then fix |

## AC Wording Contract (Planner -> Builder)

For each required lane, add one AC string using these prefixes:
- `[Behavioral] ...`
- `[Visual] ...` (only when required)
- `[Regression] ...` (when required by profile/condition)
- `[Evidence] ...`

Prefix contract is mandatory so build prompts can map AC lines directly to implementation and verification steps.

## Evidence Expectations

Evidence ACs should specify concrete proof:
- Test command and scope, for example: `pnpm test --filter auth-login-flow`
- Test location(s), for example: `tests/e2e/login.spec.ts`
- For Agent Browser checks: page/route + element/interaction verified + screenshot/snapshot artifact
- For regressions: explicit case name tied to the prior failure mode

References:
- @context/blocks/test/agent-browser.md
- @context/blocks/test/playwright.md
- @context/foundations/test/test-visual-web-agent-browser.md
- @context/foundations/test/test-e2e-web-playwright.md

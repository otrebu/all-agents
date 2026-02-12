---
depends:
  - "@context/blocks/test/agent-browser.md"
  - "@context/foundations/test/test-e2e-web-playwright.md"
---

# Visual Web Verification with Agent Browser

Use Agent Browser to verify user-visible UI outcomes with concrete visual evidence.

## References

@context/blocks/test/agent-browser.md
@context/foundations/test/test-e2e-web-playwright.md

---

## When to Use Agent Browser

Use Agent Browser when acceptance criteria require user-visible proof, such as:

- Layout and visual states (loading, empty, error, success)
- Copy, labels, headings, and visible navigation outcomes
- Responsive behavior at common breakpoints
- End-to-end walkthrough evidence for Ralph task completion notes

Policy: for user-visible UI verification, Agent Browser evidence is required.

---

## Required Evidence Artifacts

For each UI-focused acceptance criterion, collect:

1. **Before/after screenshots**
   - One screenshot before the key action
   - One screenshot after the expected visible outcome

2. **Interactive snapshot evidence**
   - `agent-browser snapshot -i` output showing discovered controls and refs
   - Keep the snapshot closest to the action being verified

3. **Verification notes mapped to AC**
   - AC identifier or short AC phrase
   - Action performed
   - Visible result observed

4. **Failure diagnostics (if AC fails)**
   - Error screenshot
   - Relevant URL/state from `agent-browser get url` and `agent-browser snapshot -i`

Minimal artifact bundle example:

```text
artifacts/
  ui/
    ac-1-before.png
    ac-1-after.png
    ac-1-snapshot.txt
    ac-1-notes.md
```

---

## Selector Discovery and Handoff to Playwright

Use Agent Browser to discover stable selectors quickly, then codify them in Playwright tests.

### Discovery Workflow

1. Navigate and inspect interactive elements with `agent-browser snapshot -i`
2. Prefer semantic handles first (role, label, text, testid)
3. Validate each intended target with a real click/fill in Agent Browser
4. Translate to Playwright locators (`getByRole`, `getByLabel`, `getByText`, `getByTestId`)

### Handoff Table Pattern

Capture selector intent during discovery so test authoring is deterministic:

| Target | Agent Browser discovery | Playwright locator | Why this is stable |
|--------|--------------------------|--------------------|--------------------|
| Submit button | `button "Save" [ref=e8]` | `page.getByRole("button", { name: "Save" })` | Accessible name tied to UX copy |
| Email field | `textbox "Email" [ref=e2]` | `page.getByLabel("Email")` | Label contract is user-facing |
| Success toast | text `Saved successfully` | `page.getByText("Saved successfully")` | AC verifies visible text |

Important: do not use `@e*` refs directly in Playwright tests. Re-express them as semantic locators.

---

## When NOT to Use Agent Browser

- Behavioral regressions across critical flows without automated coverage
- CI gatekeeping for repeatable pass/fail on every commit
- API-only or backend-only verification
- Large-scale cross-browser matrix validation

In these cases, use Playwright (or the project-standard automated E2E framework) as the executable test source of truth.

---

## Policy Guardrails

- Agent Browser is required for user-visible UI verification evidence.
- Playwright (or project-standard automated E2E) is required for behavioral web flows.
- BDD syntax is optional; no framework-level Given/When/Then requirement.

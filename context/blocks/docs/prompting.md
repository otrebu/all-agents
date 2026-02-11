---
depends: []
---

# Prompting Standards (Canonical)

Single source of prompting policy for this repository. Use this doc for both GPT-5.x Codex and Claude Opus 4.6.

## Policy Tiers

### MUST

- Treat context as finite: include only information that changes output quality.
- Maximize signal-to-noise: remove redundancy, repetition, and decorative boilerplate.
- Use progressive discovery: reference docs with `@context/...` instead of duplicating details.
- State non-negotiables explicitly: constraints, expected output, and acceptance checks.
- Include "how" steps when omission risks unsafe behavior, failed verification, or hidden/non-obvious execution details.

### SHOULD

- Be concise by default; prefer short, direct instructions over long prose.
- Use structured sections (context, workflow, output, constraints) for scanability.
- Keep procedural detail proportional to risk and complexity.
- Prefer references to canonical docs over re-explaining standards.
- Keep language readable and grammatical; optimize clarity, not shorthand tricks.

### MAY

- Add one short example when format or intent is ambiguous.
- Add brief rationale when it improves compliance with constraints.
- Tune wording for model tendencies (see tuning knobs) without creating separate rule systems.

## Shared Prompt Template

```markdown
# [Task Title]

## Objective
- [Desired outcome in 1-2 lines]

## Context
- [Essential facts only]
- References: @context/[path].md, @context/[path].md

## Workflow
1. [Actionable step]
2. [Actionable step]

## Output
- [Required artifact or response format]

## Constraints
- [Hard limits, forbidden actions, safety rules]

## Verification
- [How to validate result]
```

## Compact Checklist

- [ ] Uses only required context (finite budget respected)
- [ ] Duplicates removed; references used for detail
- [ ] MUST constraints and acceptance checks are explicit
- [ ] "How" included only where safety/verification/non-obviousness requires it
- [ ] Output format is concrete and testable

## Model Tuning Knobs (Same Policy, Different Emphasis)

### GPT-5.x Codex tendencies

- Strong at literal instruction following; explicit acceptance criteria improves first-pass success.
- Can over-compress when asked to be brief; keep critical verification steps explicit.
- Responds well to deterministic ordering and clear tool/file constraints.

### Claude Opus 4.6 tendencies

- Often provides richer narrative by default; tighten output boundaries for concise tasks.
- Benefits from explicit "do not expand" constraints when brevity matters.
- Strong synthesis across references; still enforce reference-over-duplication discipline.

Use these as tuning knobs only. Core MUST/SHOULD/MAY policy remains shared.

# Milestone 008: Prelude Load Screen Exploration

## Objective

Create a small set of terminal-friendly ASCII logos and mascots for first-run startup, then choose a default intro presentation.

## Outcome

The milestone results in two polished concept directions (AAA-led and Ralph-led), one selected as the default for the next implementation.

## Scope

- Design-only milestone: no command wiring, no behavioral implementation, no tests.
- Focus exclusively on startup visuals and clear selection rationale.
- Keep output plain ASCII and terminal-safe.

## Deliverables

- Concept direction for **Variant A (AAA-led)**.
- Concept direction for **Variant B (Ralph-led)**.
- Decision note: why one concept wins (personality, clarity, terminal fit).
- Implementation handoff constraints (fallback, width, and optional color strategy).

## Constraints

- Keep each variant to ~12-14 lines.
- Keep each variant within ~72 columns.
- No non-ASCII symbols required.
- Prefer cute but quickly scannable characters for noisy terminals.

## Candidate Directions

### Candidate A (AAA-led)

- Visual style: ASCII-first, compact, and welcoming.
- Branding intent: primary emphasis on `AAA` identity while visually referencing `Ralph`.
- Mascot style: one small friendly character that fits inside ~72 columns.

### Candidate B (Ralph-led)

- Visual style: ASCII-first, compact, and playful.
- Branding intent: primary emphasis on `Ralph` identity with subtle `AAA` framing.
- Mascot style: one small friendly character that fits inside ~72 columns.

## Suggested Decision Criteria

- Readability in narrow terminals.
- Immediate recognition of AAA and Ralph intent.
- Cute factor without blocking operational information.
- Monochrome fallback clarity.

## Success Criteria

- Both variants are defined as concise concept notes for logo and mascot direction.
- A default is selected with documented rationale.
- Scope remains limited to art + logo selection only.

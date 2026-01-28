# Text Consistency

Patterns for detecting inconsistencies in documentation text: contradictions, numerical mismatches, timeline conflicts, definition drift, and logical impossibilities.

---

## Quick Reference

- Contradictory statements say X in one place and not-X elsewhere.
- Numerical values (versions, dates, quantities) must match across references.
- Temporal sequences must be logically consistent (before/after relationships).
- Terms must be defined once and used consistently throughout.
- Statements must be logically compatible (not mutually exclusive).

---

## Contradictory Statements

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| "X is required" vs "X is optional" | Reader confusion, wrong implementation | Search for key terms, compare qualifiers |
| "Always use A" vs "Never use A" | Conflicting guidance | Search for "always", "never", "must" |
| "Feature enabled by default" vs "must enable manually" | Wrong setup | Compare configuration guidance |
| Prose claims vs code behavior | Implementation mismatch | Cross-reference prose with actual code |

### Rules

- When a term has qualifiers (required, optional, always, never), those must be consistent
- If guidance changes based on context, make the conditions explicit
- When updating documentation, search for all occurrences of the term being changed
- Mark contradictions with confidence level: High (unambiguous), Medium (context-dependent), Low (needs SME review)

### Example

```markdown
❌ Contradictory (from two sections of same doc):

Section 2.1: "Users must authenticate before accessing the API."
Section 4.3: "Anonymous access is supported for read operations."

→ These may both be true (anonymous for reads, auth for writes), but the
  contradiction in language ("must authenticate" vs "anonymous supported")
  needs clarification.

✅ Consistent:

Section 2.1: "Users must authenticate for write operations."
Section 4.3: "Anonymous access is supported for read-only operations."
```

---

## Numerical Inconsistencies

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Version number mismatch | Wrong dependency installed | Search for version patterns (vX.Y, @X.Y.Z) |
| Date discrepancies | Confusion about timelines | Compare all date references |
| Quantity mismatches | Wrong capacity planning | Search for numbers with same unit |
| Configuration value conflicts | System misconfiguration | Compare config references |

### Rules

- Version numbers should appear in exactly one authoritative location
- If repeated, they must match exactly (v2.0 vs 2.0.0 is a mismatch)
- Dates should use consistent format throughout (ISO 8601 preferred)
- Quantities should include units and match when referring to same thing

### Example

```markdown
❌ Numerical inconsistency:

README.md: "Requires Node.js 18+"
package.json: { "engines": { "node": ">=16" } }
CI config: "node-version: 20"

→ Three different Node.js version requirements

✅ Consistent:

README.md: "Requires Node.js 18+ (see package.json for exact version)"
package.json: { "engines": { "node": ">=18" } }
CI config: "node-version: 18"
```

---

## Temporal Inconsistencies

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| "Before X, do Y" vs "After X, do Y" | Wrong sequence | Search for temporal words |
| Conflicting timelines | Confusion about order | Map out stated sequence |
| Past/present tense mixing | Unclear if current or historical | Check tense consistency |
| Deadline conflicts | Missed deadlines | Compare date references |

### Rules

- Sequences should be stated consistently (if A before B, never say B before A)
- Use consistent tense: present for current behavior, past for historical
- When referencing dates, make relative terms clear ("next release" → specify version)
- Deprecation timelines must be consistent across all documentation

### Example

```markdown
❌ Temporal inconsistency:

Setup guide: "Install dependencies before running the build script."
Troubleshooting: "If build fails, run npm install after the build."

→ Conflicting guidance on install timing

✅ Consistent:

Setup guide: "Install dependencies before running the build script."
Troubleshooting: "If build fails due to missing modules, run npm install first,
then retry the build."
```

---

## Definitional Drift

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Term used with different meanings | Semantic confusion | Track term definitions |
| Acronym inconsistency | Reader confusion | Compare acronym expansions |
| Name vs identifier mismatch | Implementation errors | Compare user-facing vs code names |
| Scope drift | Wrong assumptions | Track where term is scoped |

### Rules

- Define terms in a glossary or on first use; use consistently thereafter
- Acronyms should expand identically everywhere
- If a term has different meanings in different contexts, use different names
- When a term's meaning evolves, update all occurrences

### Example

```markdown
❌ Definitional drift:

Introduction: "A 'workspace' contains multiple projects."
Chapter 3: "Each workspace is a single project folder."
API docs: "workspace_id refers to the user's home directory."

→ "Workspace" means three different things

✅ Consistent:

Glossary: "Workspace: A container for multiple related projects."
All subsequent usage refers to this definition consistently.
For user home directory: use "home_directory" instead.
```

---

## Logical Impossibilities

### Patterns

| Pattern | Risk | Detection Method |
|---------|------|------------------|
| Mutually exclusive claims | Impossible to satisfy | Check for logical compatibility |
| Circular dependencies | Deadlock, infinite loop | Trace dependency chains |
| Impossible sequences | Can't follow instructions | Verify steps are achievable |
| Self-contradicting requirements | Unsatisfiable spec | Formal logic check |

### Rules

- Requirements must be jointly satisfiable
- Dependencies must form a DAG (no cycles)
- Sequences must be physically possible to execute
- Conditionals must have achievable triggers

### Example

```markdown
❌ Logical impossibility:

"The cache must be populated before the server starts."
"The cache is populated by requesting data from the server."

→ Circular dependency: cache needs server, server needs cache

✅ Consistent:

"The cache can be pre-populated from a seed file, or will
populate on first request after server starts (cold start latency)."
```

---

## Severity Definitions

| Severity | Criteria | Example |
|----------|----------|---------|
| **Critical** | Breaks functionality if reader follows incorrect version | Wrong API endpoint in one location |
| **Moderate** | Causes confusion, requires reader to guess intent | Unclear if feature is optional |
| **Minor** | Stylistic inconsistency, doesn't affect functionality | Date format varies (Jan 1 vs 1 Jan) |

---

## Summary: Checklist

When reviewing documentation for text consistency:

- [ ] Search for key terms and verify qualifiers match
- [ ] Verify version numbers are consistent across all files
- [ ] Check that temporal sequences are logically possible
- [ ] Ensure terms are defined and used consistently
- [ ] Verify requirements don't contradict each other
- [ ] Mark issues with severity and confidence levels

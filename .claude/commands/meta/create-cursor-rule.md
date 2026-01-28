---
name: meta:create-cursor-rule
description: Create a Cursor rules file (.mdc)
argument-hint: [rule-name] [description]
allowed-tools: Read, Write, Bash(mkdir:*)
---

# Create Cursor Rule

Create a Cursor rules file in `.cursor/rules/` directory following MDC format.

**MANDATORY** Write the rule based on @context/blocks/docs/prompting.md

## Instructions

1. **Scope Rule**: Determine trigger type (Global, Path-based, or Manual `@mention`).
2. **Create Directory**: Ensure `.cursor/rules/` exists in the appropriate scope (root or subdirectory).
3. **Create File**: Generate `[name].mdc` using the **Template Structure** below.
4. **Write Content**:
   - 🛑 MUST follow @context/blocks/docs/prompting.md standards.
   - Keep context minimal and high-signal.
   - Use direct, imperative instructions.
5. **Review**: Verify metadata (`globs`, `description`) and content structure.

# Cursor Project Rule documentation

## Background

Project rules live in `.cursor/rules`. Each rule is version-controlled and scoped using path patterns, invoked manually, or included based on relevance. Subdirectories can include their own `.cursor/rules` directory scoped to that folder.

Rules are written in MDC (.mdc), a format supporting metadata and content.

## Rule Types

| Type                    | Description                      | Metadata                  |
| ----------------------- | -------------------------------- | ------------------------- |
| Always Apply            | Apply to every chat session      | `alwaysApply: true`       |
| Apply Intelligently     | When Agent decides it's relevant | `description: [key info]` |
| Apply to Specific Files | When file matches pattern        | `globs: ["**/*.ts"]`      |
| Apply Manually          | When @-mentioned                 | `alwaysApply: false`      |

## Use Cases

- Encode domain-specific knowledge about codebase
- Automate project-specific workflows or templates
- Standardize style or architecture decisions
- Reference example files with `@filename.ext`

## Parameters

- `$1`: Rule name (filename without .mdc extension)
- `$2+`: Rule description or purpose

## Instructions

- Create `.cursor/rules/` directory if needed
- Generate `.mdc` file with frontmatter and content
- For nested rules, place in subdirectory with own `.cursor/rules/`
- Keep under 500 lines
- Use actionable, direct language
- Include concrete examples or file references
- Split large rules into composable components

## Template Structure

```
---
description: [Brief, focused description for intelligent application]
globs: ["**/*.pattern"]
alwaysApply: false
---

# [Rule Name]

## Background Information

[Minimal essential context about domain/system]

## Instructions

- [Clear, actionable directive 1]
- [Clear, actionable directive 2]
- [Reference files with @filename if helpful]

## Examples

**Example 1: [Scenario]**
Input: [Example input]
Expected: [Example output]

**Example 2: [Edge case]**
Input: [Example input]
Expected: [Example output]

## Constraints

- [Specific limitation 1]
- [Specific limitation 2]
```

## Example Rule Patterns

**Domain Knowledge:**

```
---
description: RPC Service boilerplate
alwaysApply: false
---
- Use internal RPC pattern when defining services
- Always use snake_case for service names
@service-template.ts
```

**File-Scoped:**

```
---
description: React component standards
globs: ["**/components/**/*.tsx"]
alwaysApply: false
---
- Use functional components with hooks
- Export as named exports, not default
```

## Nested Rules Structure

```
project/
  .cursor/rules/        # Project-wide rules
  backend/
    server/
      .cursor/rules/    # Backend-specific rules
  frontend/
    .cursor/rules/      # Frontend-specific rules
```

Nested rules automatically attach when files in their directory are referenced.

## Output

- Create the `.mdc` file in appropriate location
- Report file path and suggested activation mode
- Provide @-mention syntax for manual invocation

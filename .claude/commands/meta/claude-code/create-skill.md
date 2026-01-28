---
name: meta:claude-code:create-skill
description: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.
allowed-tools: Bash(python3 ./.claude/commands/meta/claude-code/init_skill.py*)
---

# Skill Creator for Claude Code

Create skills in Claude Code's skill directory.

**References:**
- @context/blocks/docs/prompting.md - Writing standards
- @context/blocks/construct/claude-code-permissions.md - allowed-tools configuration

## About Skills

Skills are modular packages providing specialized knowledge, workflows, and tools. Transform Claude from general to specialized agent with procedural knowledge.

### What Skills Provide

1. Specialized workflows - Multi-step procedures
2. Tool integrations - File formats, APIs
3. Domain expertise - Schemas, business logic
4. Bundled resources - Scripts, references, templates

## Core Principles

### Concise is Key

Context window is public good. Only add what Claude doesn't know. Challenge each piece: "Does Claude need this?"

Default: Claude is smart. Add only non-obvious info.

### Set Appropriate Degrees of Freedom

**High freedom (text)**: Multiple valid approaches, context-dependent
**Medium freedom (pseudocode/params)**: Preferred pattern, some variation
**Low freedom (scripts)**: Fragile operations, consistency critical

### Critical Structure Requirements

**MANDATORY:** Every skill MUST be structured as a directory, NOT a single file.

**Required structure:**

- Directory named `skill-name/` (lowercase letters, numbers, hyphens only)
- Containing `SKILL.md` file (UPPERCASE, exactly this filename)

**Correct examples:**

- ✅ `git-commit/SKILL.md`
- ✅ `pdf-processing/SKILL.md`
- ✅ `data-analyzer/SKILL.md`

**Wrong examples:**

- ❌ `git-commit.md` (single file, not directory)
- ❌ `git-commit/skill.md` (lowercase)
- ❌ `git-commit/README.md` (wrong filename)

### Anatomy

```
skill-name/
├── SKILL.md (required - UPPERCASE)
│   ├── YAML frontmatter (name, description)
│   └── Markdown instructions
├── reference.md (optional - root-level docs)
├── examples.md (optional - root-level docs)
├── scripts/ (optional)
│   └── helper.py - Executable code
└── templates/ (optional)
    └── template.txt - Files used in output
```

#### SKILL.md (required)

- **Frontmatter** (YAML): `name` and `description` - triggers when Claude uses skill
- **Body** (Markdown): Instructions for using skill

#### Bundled Resources (optional)

**Scripts** (`scripts/`) - Executable code for deterministic/repeated tasks

- Token efficient, deterministic
- May execute without loading to context
- Examples: `scripts/rotate_pdf.py`, `scripts/fill_form.py`

**Reference docs** (root-level `.md` files) - Docs loaded as needed

- Database schemas, API docs, detailed workflows
- Keeps SKILL.md lean
- Load only when Claude determines needed
- Examples: `reference.md`, `api_docs.md`, `workflows.md`
- **Note:** These are individual files at root, NOT in a `references/` subdirectory

**Templates** (`templates/`) - Files used as assets/starting points

- Templates, boilerplate code, starter files
- Used in final output by copying/modifying
- Examples: `templates/starter-project/`, `templates/document.docx`

#### What NOT to Include

No auxiliary docs:

- README.md
- INSTALLATION_GUIDE.md
- QUICK_REFERENCE.md
- CHANGELOG.md

Only info needed for AI agent to work.

### Progressive Disclosure

Three-level loading:

1. **Metadata** - Always in context (~100 words)
2. **SKILL.md body** - When triggered (<5k words)
3. **Bundled resources** - As needed (unlimited)

Keep SKILL.md <500 lines. Split when approaching limit.

**Pattern: High-level guide with references**

```markdown
## Quick start

[core example]

## Advanced

- **Forms**: See ./forms.md
- **API**: See ./api-reference.md
```

## Skill Creation Process

1. Understand skill with concrete examples
2. Plan reusable contents (scripts, references, assets)
3. Initialize skill (run init_skill.py)
4. Edit skill (implement resources, write SKILL.md)
5. Iterate based on usage

### Step 1: Understanding with Concrete Examples

Skip if usage patterns clear.

Ask for concrete examples:

- "What functionality should skill support?"
- "Examples of usage?"
- "What triggers this skill?"

Avoid overwhelming - ask most important questions first.

Conclude when functionality clear.

### Step 2: Planning Reusable Contents

Analyze each example:

1. How to execute from scratch?
2. What scripts/references/assets help?

**Example: pdf-editor**

- Query: "Rotate this PDF"
- Analysis: Same code each time → `scripts/rotate_pdf.py`

**Example: frontend-webapp-builder**

- Query: "Build todo app"
- Analysis: Same boilerplate → `templates/hello-world/` starter project

**Example: big-query**

- Query: "How many users logged in today?"
- Analysis: Re-discovering schemas → `schema.md` (root-level reference)

Output: List of reusable resources needed.

### Step 3: Initialize Skill

Skip if skill exists.

Run init script from repo root:

```bash
python3 ./.claude/commands/meta/claude-code/init_skill.py <skill-name> --path <output-directory>
```

Example:

```bash
python3 ./.claude/commands/meta/claude-code/init_skill.py brainwriting --path ./.claude/skills
```

Creates:

- Skill directory
- SKILL.md template with frontmatter
- Example resource directories
- Example files (customize/delete)

### Step 4: Edit Skill

#### Start with Resources

Implement resources first: scripts, reference docs, templates.
May need user input (brand assets, docs).

Test scripts - run to verify no bugs.
Delete unused example files.

#### Update SKILL.md

**Writing**: Use imperative/infinitive form.

**Frontmatter**:

- `name`: Skill name
- `description`: What it does + when to use. Specific, comprehensive, direct. Claude uses this to choose from 100+ skills.

**Body**: Instructions for using skill and resources.

### Step 5: Validate Skill

Script will:

1. **Validate** skill (YAML, structure, naming, descriptions)

Default priority:

1. `./.claude/skills/` (project-local)
2. `~/.claude/skills/` (user-global)
3. Custom path if specified

Validation checks:

- YAML frontmatter format, required fields
- Naming conventions, directory structure
- Description quality
- File organization, resource references

If validation fails, fix errors and re-run.

### Step 6: Iterate

Test skill on real tasks.
Notice struggles → identify improvements → implement → test.

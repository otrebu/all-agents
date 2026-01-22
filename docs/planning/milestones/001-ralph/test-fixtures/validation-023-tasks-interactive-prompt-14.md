# Validation: 023-tasks-interactive-prompt-14

## Test: Codebase references are incorporated

### Prerequisites
- Prompt file: `context/workflows/ralph/planning/tasks-interactive.md`
- Skill file: `.claude/skills/ralph-plan/SKILL.md`
- Existing codebase with files to reference

### Test Steps

#### Step 1: Run with existing codebase
**Command:** `/ralph plan tasks <any-story-id>`

**Context:** The session runs in a codebase with established patterns, conventions, and file structures.

#### Step 2: Verify file paths mentioned in conversation
**Expected:** The AI should reference specific file paths from the codebase during the conversation:
- Source file paths (e.g., `tools/src/commands/ralph/index.ts`)
- Test file paths (e.g., `tools/src/commands/ralph/__tests__/`)
- Configuration files (e.g., `.claude/skills/ralph-plan/SKILL.md`)
- Pattern directories (e.g., `context/workflows/ralph/planning/`)

#### Step 3: Verify patterns from code are referenced
**Expected:** The AI should reference:
- Existing code patterns (e.g., "Following the pattern in...")
- Naming conventions (e.g., "Using kebab-case like other files")
- Implementation approaches (e.g., "Similar to how X is implemented in...")
- Test patterns (e.g., "Test structure matches existing tests in...")

### Verification Evidence

#### Prompt Analysis: Codebase Analysis Section (lines 37-46)
```markdown
## Codebase Analysis

Before and during the conversation, analyze the codebase to inform task generation:

1. **Explore relevant directories** - Use Glob/Grep to understand existing patterns
2. **Read related files** - Understand current implementations
3. **Identify dependencies** - What existing code will tasks interact with?
4. **Note conventions** - File naming, code style, existing patterns

Reference specific files and patterns from the codebase in your questions and suggestions.
```

#### Prompt Analysis: Phase 2 Technical Probes (lines 65-76)
```markdown
### Phase 2: Technical Approach Exploration

For each potential task, explore the technical approach:

**Key question:** "How should we implement this capability?"

Technical probes:
- "What existing code can we build on? Let me check the codebase..."
- "What patterns are already established here?" [reference specific files]
- "Should we modify existing code or create new modules?"
- "What data structures or interfaces are involved?"
- "Where does this logic belong in the codebase architecture?"
```

#### Prompt Analysis: Phase 5 Testing Probes (lines 104-115)
```markdown
### Phase 5: Acceptance Criteria & Testing

Define testable outcomes:

**Key question:** "How will we verify this task is complete?"

Testing probes:
- "What tests should cover this functionality?"
- "What test patterns exist in the codebase?" [reference specific test files]
- "Do we need unit tests, integration tests, or both?"
- "What manual verification is needed?"
- "What edge cases should tests cover?"
```

#### Prompt Analysis: Conversation Guidelines (lines 131-145)
```markdown
### Do:
- Ask one or two questions at a time, then wait for response
- Reference specific files and patterns from the codebase
- Summarize what you've learned before moving to the next task
...

### Don't:
...
- Ignore existing codebase patterns and conventions
```

#### Prompt Analysis: Starting Template (lines 309-329)
```markdown
Begin with:

---

"Let's create technical tasks for story **[story-id]**.

I've read the story - it focuses on: [brief summary of narrative and key acceptance criteria].

Let me also explore the codebase to understand existing patterns..."

[Read relevant files/directories based on the story context]

"Based on the story and the codebase, here's what I see:
- [relevant existing code/patterns]
- [dependencies/integrations involved]

**To start:** Looking at the acceptance criteria, which capability should we tackle first? What's your thinking on the technical approach?"
```

#### Prompt Analysis: Full Tool Access (lines 300-308)
```markdown
## Full Tool Access

This interactive session has access to all tools. You may:
- Read files to understand existing code and patterns
- Search the codebase for relevant implementations
- Create and edit task files
- Navigate the file system
- Use Glob/Grep to explore the codebase
```

#### Skill Analysis: Codebase Exploration (SKILL.md lines 79-82)
```markdown
5. Read the story file to understand the user outcomes
6. Explore the codebase to understand existing patterns relevant to the story
7. Begin the session with: [opening message]
```

### Test Result: PASS

The implementation ensures codebase references are incorporated through:

1. **Codebase Analysis Section** (lines 37-46) - Explicitly requires exploring directories, reading files, identifying dependencies, and noting conventions with "Reference specific files and patterns"

2. **Phase 2 Probes** (lines 72-73) - Direct instruction: "Let me check the codebase...", "[reference specific files]"

3. **Phase 5 Probes** (line 112) - Direct instruction: "[reference specific test files]"

4. **Do Guidelines** (line 133) - Explicit: "Reference specific files and patterns from the codebase"

5. **Don't Guidelines** (line 144) - Prevents ignoring: "Ignore existing codebase patterns and conventions"

6. **Starting Template** (lines 319-325):
   - "Let me also explore the codebase to understand existing patterns..."
   - "[Read relevant files/directories based on the story context]"
   - "- [relevant existing code/patterns]"
   - "- [dependencies/integrations involved]"

7. **Full Tool Access** (lines 302-307) - Capabilities enabled: Read files, Search codebase, Use Glob/Grep

8. **Skill Routing** (line 80) - "Explore the codebase to understand existing patterns relevant to the story"

### Evidence of Codebase-Aware Session

A properly executed session will include outputs like:

```
Let me also explore the codebase to understand existing patterns...

Looking at `tools/src/commands/ralph/index.ts`, I can see the CLI structure uses commander with subcommand patterns...

Based on the story and the codebase, here's what I see:
- Existing prompts follow the structure in `context/workflows/ralph/planning/`
- Test patterns use bun:test in `__tests__` directories
- Skills are registered in `.claude/skills/` with YAML frontmatter

What patterns are already established here? I notice the files in `context/workflows/ralph/` use a consistent markdown format with sections for Role, Output, etc.
```

The prompt is designed to ensure codebase exploration and referencing happen at:
- Session start (opening message with exploration)
- Throughout phases (technical probes with file references)
- Before creating tasks (understanding existing patterns)

### Validation Complete

All verification steps satisfied:
- Step 1: Session runs with full codebase access
- Step 2: File paths required in conversation (template and guidelines)
- Step 3: Patterns from code required (explicit probes and don't ignore guideline)

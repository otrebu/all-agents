# Milestone Progress: Ralph 002

## 2026-01-25

### SUB-012
- **Problem:** Need to define the interrogation workflow for surfacing assumptions and confidence levels in code changes
- **Changes:** Created context/workflows/interrogate.md with:
  - 3 core questions (hardest decision, rejected alternatives, lowest confidence)
  - Default, --quick, and --skeptical modes
  - Structured output format with confidence levels and tables
  - Target options (changes, commit, pr)
  - Integration guidance with code review workflow
- **Files:** context/workflows/interrogate.md (created)

### SUB-013
- **Problem:** Need a skill command to invoke the interrogation workflow with git context
- **Changes:** Created .claude/commands/dev/interrogate.md with:
  - Proper frontmatter (description, allowed-tools, argument-hint)
  - Target argument parsing (changes, commit, pr)
  - Mode flags support (--quick, --skeptical)
  - Git context gathering commands for each target type
  - Reference to interrogate workflow document
- **Files:** .claude/commands/dev/interrogate.md (created)

### SUB-014
- **Problem:** Need to integrate interrogation workflow into the complete-feature workflow as a pre-merge checkpoint
- **Changes:** Updated context/workflows/complete-feature.md with:
  - Added step 4 "Interrogation Checkpoint (Optional)" between storing branch name and squashing commits
  - Documents when interrogation is most valuable (substantial changes, AI code, uncertainty about trade-offs)
  - Shows invocation examples for default, --quick, and --skeptical modes
  - Renumbered subsequent steps (5-11)
- **Files:** context/workflows/complete-feature.md (modified)

### SUB-015
- **Problem:** Need a shared data contract (Finding interface) for all code review agents to output findings in a consistent format
- **Changes:** Created .claude/agents/code-review/ directory and types.md with:
  - Finding interface schema: id, reviewer, severity, file, line?, description, suggestedFix?, confidence
  - Severity enum: critical, high, medium, low with usage guidelines
  - Confidence scale: 0-1 with ranges explained (0.9-1.0 certain, 0.7-0.9 high, etc.)
  - Example Finding JSON for reference
  - Output format specification for reviewer agents
  - Usage notes for synthesizer agent
- **Files:** .claude/agents/code-review/types.md (created)

### SUB-016
- **Problem:** Need a security-focused code reviewer agent that analyzes code for vulnerabilities and outputs findings in the standard Finding JSON format
- **Changes:** Created .claude/agents/code-review/security-reviewer.md with:
  - Proper frontmatter (name, description, model: haiku)
  - Security focus areas: injection, XSS, authentication, secrets, authorization, crypto, data handling
  - OWASP Top 10 coverage
  - Confidence scoring logic with factors that increase/decrease confidence
  - Severity guidelines specific to security issues
  - Example findings for SQL injection, XSS, and hardcoded secrets
  - JSON output format matching Finding schema from types.md
- **Files:** .claude/agents/code-review/security-reviewer.md (created)

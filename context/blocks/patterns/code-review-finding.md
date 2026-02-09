# Code Review Types

This document defines the shared data contracts for all code review agents.

## Finding Interface

Every reviewer agent must output findings in this format. The synthesizer agent aggregates findings from all reviewers.

### Schema

```typescript
interface Finding {
  id: string;               // Hash of file+line+description for deduplication
  reviewer: string;         // Agent name (e.g., "security-reviewer")
  severity: Severity;       // Issue severity level
  file: string;             // File path relative to project root
  line?: number;            // Line number (optional if issue is file-wide)
  description: string;      // Clear explanation of the issue
  suggestedFix?: string;    // Code snippet showing the fix (optional)
  confidence: number;       // 0-1 scale, how certain the reviewer is
}

type Severity = 'critical' | 'high' | 'medium' | 'low';
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier, typically a hash of `file+line+description`. Used by synthesizer to dedupe similar findings. |
| `reviewer` | string | Yes | Name of the agent that found this issue (e.g., `security-reviewer`, `data-integrity-reviewer`). |
| `severity` | enum | Yes | One of: `critical`, `high`, `medium`, `low`. See severity guidelines below. |
| `file` | string | Yes | Relative path from project root (e.g., `src/auth/login.ts`). |
| `line` | number | No | Line number where issue occurs. Omit for file-wide or architectural issues. |
| `description` | string | Yes | Human-readable explanation. Should be specific and actionable. |
| `suggestedFix` | string | No | Code snippet showing the corrected code. Include when a clear fix exists. |
| `confidence` | number | Yes | Value between 0 and 1. See confidence guidelines below. |

### Severity Guidelines

| Level | When to Use |
|-------|-------------|
| `critical` | Security vulnerabilities, data loss risks, crashes in production paths |
| `high` | Bugs that will cause incorrect behavior, significant performance issues |
| `medium` | Code quality issues, minor bugs in edge cases, maintainability concerns |
| `low` | Style issues, minor improvements, documentation gaps |

### Confidence Guidelines

| Range | Meaning |
|-------|---------|
| 0.9-1.0 | Certain - clear violation of documented rules or obvious bug |
| 0.7-0.9 | High confidence - strong evidence but some context might change interpretation |
| 0.5-0.7 | Moderate - issue likely exists but depends on usage patterns |
| 0.3-0.5 | Low - potential issue, needs human judgment |
| 0.0-0.3 | Speculative - flagging for human review, may be false positive |

## Example Finding

```json
{
  "id": "a1b2c3d4",
  "reviewer": "security-reviewer",
  "severity": "critical",
  "file": "src/api/users.ts",
  "line": 42,
  "description": "SQL injection vulnerability: user input is concatenated directly into query string without sanitization",
  "suggestedFix": "const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);",
  "confidence": 0.95
}
```

## Output Format

Each reviewer agent should output a JSON array of findings:

```json
{
  "findings": [
    { "id": "...", "reviewer": "...", ... },
    { "id": "...", "reviewer": "...", ... }
  ]
}
```

If no issues are found, output an empty array:

```json
{
  "findings": []
}
```

## Usage by Synthesizer

The synthesizer agent:
1. Collects findings from all parallel reviewers
2. Dedupes by `id` (same file+line+description = same issue)
3. Ranks by `severity × confidence` product
4. Groups by file for presentation
5. Outputs consolidated report

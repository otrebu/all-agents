# Triage Pattern

Reusable pattern for processing collections of items that need deduplication, scoring, ranking, and grouping before human review.

---

## Overview

The triage pattern consists of four sequential phases:

| Phase | Purpose | Input | Output |
|-------|---------|-------|--------|
| **Dedupe** | Remove duplicates | Raw items | Unique items |
| **Score** | Calculate priority | Unique items | Scored items |
| **Rank** | Order by importance | Scored items | Sorted list |
| **Group** | Organize for navigation | Sorted list | Grouped view |

---

## Phase 1: Deduplication

Remove duplicate items to avoid reviewing the same issue twice.

### Duplicate Detection Criteria

Two items are duplicates if they share:

1. **Exact match** - Same unique identifier
2. **Location match** - Same location reference AND descriptions refer to the same issue
3. **Context match** - Same context AND no specific location AND significant description overlap

### Merge Strategy

When duplicates are found:

- **Keep** the item with higher confidence
- **Elevate** severity to the higher of the two if they differ
- **Combine** source attributions (who flagged this)
- **Preserve** the more detailed description

### Example: Code Review Findings

```
Duplicate if:
- Same file + Same line + Similar description
- Same file + Both null line + Overlapping description

Merge result:
- Keep higher confidence finding
- Use max(severity1, severity2)
- flaggedBy: [...sources1, ...sources2]
```

---

## Phase 2: Priority Scoring

Calculate a numeric priority score to enable objective ranking.

### Formula

```
priority = weight(category) × confidence
```

### Severity Weights

| Category | Weight | Use When |
|----------|--------|----------|
| Critical | 4 | System failure, security breach, data loss |
| High | 3 | Major functionality broken, significant risk |
| Medium | 2 | Functionality impaired, quality degradation |
| Low | 1 | Minor issues, stylistic concerns |

### Confidence Factors

Confidence (0.0-1.0) indicates how certain the assessment is:

| Range | Meaning |
|-------|---------|
| 0.9-1.0 | High certainty, clear evidence |
| 0.7-0.9 | Likely correct, some ambiguity |
| 0.5-0.7 | Possible issue, needs verification |
| < 0.5 | Uncertain, may be false positive |

### Example Calculations

| Severity | Confidence | Priority |
|----------|------------|----------|
| Critical (4) | 0.95 | 3.80 |
| High (3) | 0.85 | 2.55 |
| Medium (2) | 0.90 | 1.80 |
| Low (1) | 0.70 | 0.70 |

---

## Phase 3: Ranking

Sort items so the most important appear first.

### Sort Order

1. **Priority score** (descending) - Highest priority first
2. **Category/severity** (descending) - Critical > High > Medium > Low
3. **Location** (alphabetical) - Consistent ordering within same priority

### Rationale

- Priority score combines severity AND confidence for balanced ranking
- Breaking ties by severity ensures critical issues surface
- Alphabetical location provides predictable grouping

---

## Phase 4: Grouping

Organize ranked items for efficient navigation during review.

### Grouping Strategies

| Strategy | Best For | Example |
|----------|----------|---------|
| By location | Code review, file-based work | Group by file path |
| By category | Dashboard views, reporting | Group by severity |
| By source | Multi-agent systems | Group by reviewer/detector |
| Flat list | Small result sets (< 10 items) | No grouping needed |

### Example: By-File Grouping

```json
{
  "src/api/auth.ts": [
    { "line": 45, "priority": 3.80, "severity": "critical" },
    { "line": 78, "priority": 1.56, "severity": "medium" }
  ],
  "src/utils/parse.ts": [
    { "line": 12, "priority": 2.55, "severity": "high" }
  ]
}
```

---

## Output Structure

### Summary Statistics

Always include aggregate statistics:

```json
{
  "summary": {
    "total": 15,
    "unique": 12,
    "duplicatesRemoved": 3,
    "byCategory": {
      "critical": 1,
      "high": 3,
      "medium": 5,
      "low": 3
    },
    "bySource": {
      "source-a": 6,
      "source-b": 6
    }
  }
}
```

### Full Items Array

Provide complete item details sorted by priority:

```json
{
  "items": [
    {
      "id": "item-001",
      "category": "critical",
      "priority": 3.80,
      "confidence": 0.95,
      "sources": ["source-a", "source-b"],
      "description": "...",
      "location": "..."
    }
  ]
}
```

### Grouped View

Provide location-grouped view for navigation:

```json
{
  "byLocation": {
    "location-a": [
      { "id": "item-001", "priority": 3.80 }
    ]
  }
}
```

---

## Use Cases

### Code Review Synthesizer

- **Items:** Review findings from multiple agents
- **Dedupe:** Same file + line + description
- **Score:** severity × confidence
- **Group:** By file path

See: @.claude/agents/code-review/synthesizer.md

### Subtask Reviewer

- **Items:** Planning subtasks
- **Dedupe:** Same task reference + similar work
- **Score:** sizing risk (oversized/undersized)
- **Group:** By classification

See: @.claude/agents/subtask-reviewer.md (when created)

---

## Implementation Notes

- Deduplication should err on keeping both when uncertain
- Priority scores aid decision-making but don't replace human judgment
- The grouped view is for navigation; use full items array for details
- Sources/attribution should always be preserved through merging

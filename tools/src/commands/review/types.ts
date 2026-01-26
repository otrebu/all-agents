/**
 * Shared types for Code Review system
 *
 * This module provides the type definitions for:
 * - Finding interface (matches agent schema in .claude/agents/code-review/types.md)
 * - Review diary entries (logs/reviews.jsonl)
 * - Review command result
 *
 * @see .claude/agents/code-review/types.md
 * @see docs/planning/milestones/002-ralph-💪/stories/STORY-001-parallel-code-review.md
 */

import { z } from "zod";

// =============================================================================
// Finding Types (matches .claude/agents/code-review/types.md)
// =============================================================================

/**
 * A code review finding from a reviewer agent
 *
 * Every reviewer agent outputs findings in this format.
 * The synthesizer agent aggregates findings from all reviewers.
 */
interface Finding {
  /** Confidence score from 0 to 1 indicating how certain the reviewer is */
  confidence: number;
  /** Clear explanation of the issue - should be specific and actionable */
  description: string;
  /** Relative file path from project root (e.g., "src/auth/login.ts") */
  file: string;
  /** Unique identifier - hash of file+line+description for deduplication */
  id: string;
  /** Line number where issue occurs (optional for file-wide issues) */
  line?: number;
  /** Name of the agent that found this issue (e.g., "security-reviewer") */
  reviewer: string;
  /** Issue severity level */
  severity: Severity;
  /** Code snippet showing the fix (optional - include when clear fix exists) */
  suggestedFix?: string;
}

/**
 * Entry in the review diary (logs/reviews.jsonl)
 * Tracks review outcomes for status reporting and analysis
 */
interface ReviewDiaryEntry {
  /** Array of triage decisions made during this review */
  decisions: Array<TriageDecision>;
  /** Count of findings marked as false positives */
  falsePositives: number;
  /** Total number of findings from all reviewers */
  findings: number;
  /** Count of findings that were fixed */
  fixed: number;
  /** Review execution mode */
  mode: ReviewMode;
  /** Claude Code session ID (for self-improvement analysis) */
  sessionId?: string;
  /** Count of findings that were skipped */
  skipped: number;
  /** ISO 8601 timestamp when this review completed */
  timestamp: string;
}

/**
 * Output format from reviewer agents
 */
interface ReviewerOutput {
  /** Array of findings from this reviewer */
  findings: Array<Finding>;
}

// =============================================================================
// Triage Types
// =============================================================================

/**
 * Review execution mode
 * - headless: Fully autonomous, auto-fix, logs
 * - supervised: Autopilot, can stop manually
 * - interactive: Human in loop (skill/chat mode)
 */
type ReviewMode = "headless" | "interactive" | "supervised";

/**
 * Result of a review command execution
 */
interface ReviewResult {
  /** Diary entry for this review session */
  diary: ReviewDiaryEntry;
  /** Error message if review failed */
  error?: string;
  /** All findings from the review */
  findings: Array<Finding>;
  /** Whether the review completed successfully */
  success: boolean;
}

// =============================================================================
// Diary Types (logs/reviews.jsonl)
// =============================================================================

/**
 * Severity levels for findings
 * - critical: Security vulnerabilities, data loss risks, crashes in production paths
 * - high: Bugs that will cause incorrect behavior, significant performance issues
 * - medium: Code quality issues, minor bugs in edge cases, maintainability concerns
 * - low: Style issues, minor improvements, documentation gaps
 */
type Severity = "critical" | "high" | "low" | "medium";

/**
 * Triage action for a finding
 * - fix: Apply the suggested fix
 * - skip: Acknowledge but don't fix now
 * - false_positive: Mark as not a real issue
 */
type TriageAction = "false_positive" | "fix" | "skip";

// =============================================================================
// CLI Result Types
// =============================================================================

/**
 * A triage decision for a single finding
 */
interface TriageDecision {
  /** The triage action taken */
  action: TriageAction;
  /** Confidence of the original finding */
  confidence: number;
  /** Finding ID that was triaged */
  id: string;
  /** Severity of the original finding */
  severity: Severity;
}

/**
 * Severity weight mapping for priority calculation
 * Used by synthesizer: priority = severity_weight × confidence
 */
const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 4,
  high: 3,
  low: 1,
  medium: 2,
};

// =============================================================================
// Zod Schemas for Runtime Validation
// =============================================================================

/**
 * Zod schema for Severity enum
 */
const SeveritySchema = z.enum(["critical", "high", "medium", "low"]);

/**
 * Zod schema for Finding interface
 * Used by parseReviewFindings to validate JSON from Claude output
 */
const FindingSchema = z.object({
  confidence: z.number().min(0).max(1),
  description: z.string(),
  file: z.string(),
  id: z.string(),
  line: z.number().optional(),
  reviewer: z.string(),
  severity: SeveritySchema,
  suggestedFix: z.string().optional(),
});

/**
 * Zod schema for array of Findings
 * Used to validate the findings array from review output
 */
const FindingsArraySchema = z.array(FindingSchema);

/**
 * Calculate priority score for a finding
 * @param finding - The finding to calculate priority for
 * @returns Priority score (higher = more important)
 */
function calculatePriority(finding: Finding): number {
  return SEVERITY_WEIGHTS[finding.severity] * finding.confidence;
}

// =============================================================================
// Exports
// =============================================================================

export {
  calculatePriority,
  type Finding,
  FindingsArraySchema,
  FindingSchema,
  type ReviewDiaryEntry,
  type ReviewerOutput,
  type ReviewMode,
  type ReviewResult,
  type Severity,
  SEVERITY_WEIGHTS,
  type TriageAction,
  type TriageDecision,
};

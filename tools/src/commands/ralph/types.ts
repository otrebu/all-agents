import { z } from "zod";

/**
 * Individual feature in the PRD
 */
export interface Feature {
  blockedReason?: string;
  category: FeatureCategory;
  description: string;
  id: string;
  priority: FeaturePriority;
  status: FeatureStatus;
  testSteps: Array<string>;
}

/**
 * Feature category for organization
 */
export type FeatureCategory = "functional" | "other" | "ui" | "validation";

/**
 * Feature priority levels - determines implementation order
 */
export type FeaturePriority = "high" | "low" | "medium";

/**
 * Feature status in the PRD lifecycle
 */
export type FeatureStatus = "blocked" | "done" | "in_progress" | "pending";

/**
 * Product Requirements Document schema
 */
export interface PRD {
  description: string;
  features: Array<Feature>;
  name: string;
  smokeTestCommand?: string;
  testCommand: string;
  typecheckCommand?: string;
}

// Zod schema for runtime validation
export const FeatureSchema = z.object({
  blockedReason: z.string().optional(),
  category: z.enum(["functional", "ui", "validation", "other"]),
  description: z.string().min(1),
  id: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  status: z.enum(["pending", "in_progress", "done", "blocked"]),
  testSteps: z.array(z.string()).min(1),
});

export const PRDSchema = z.object({
  description: z.string().min(1),
  features: z.array(FeatureSchema).min(1),
  name: z.string().min(1),
  smokeTestCommand: z.string().optional(),
  testCommand: z.string().min(1),
  typecheckCommand: z.string().optional(),
});

/**
 * Options for ralph init command
 */
export interface InitOptions {
  prdPath: string;
}

/**
 * Result of a single iteration
 */
export interface IterationResult {
  completed: boolean;
  error?: string;
  featureId?: string;
}

/**
 * Run mode for the iteration loop
 */
export type RunMode = "fixed" | "interactive" | "unlimited";

/**
 * Options for ralph run command
 */
export interface RunOptions {
  iterationCount: number;
  mode: RunMode;
  prdPath: string;
  progressPath: string;
}

/**
 * Error when Claude subprocess fails
 */
export class ClaudeError extends Error {
  override name = "ClaudeError";

  constructor(
    message: string,
    public exitCode?: number,
  ) {
    super(message);
  }
}

/**
 * Error when PRD file is invalid or missing
 */
export class PRDError extends Error {
  override name = "PRDError";

  constructor(
    message: string,
    public override cause?: Error,
  ) {
    super(message);
  }
}

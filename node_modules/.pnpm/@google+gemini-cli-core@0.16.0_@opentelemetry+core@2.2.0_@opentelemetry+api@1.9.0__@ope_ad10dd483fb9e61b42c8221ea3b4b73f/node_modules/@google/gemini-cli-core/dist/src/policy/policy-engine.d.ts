/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type FunctionCall } from '@google/genai';
import { PolicyDecision, type PolicyEngineConfig, type PolicyRule, type SafetyCheckerRule } from './types.js';
import type { CheckerRunner } from '../safety/checker-runner.js';
export declare class PolicyEngine {
    private rules;
    private checkers;
    private readonly defaultDecision;
    private readonly nonInteractive;
    private readonly checkerRunner?;
    constructor(config?: PolicyEngineConfig, checkerRunner?: CheckerRunner);
    /**
     * Check if a tool call is allowed based on the configured policies.
     * Returns the decision and the matching rule (if any).
     */
    check(toolCall: FunctionCall, serverName: string | undefined): Promise<{
        decision: PolicyDecision;
        rule?: PolicyRule;
    }>;
    /**
     * Add a new rule to the policy engine.
     */
    addRule(rule: PolicyRule): void;
    addChecker(checker: SafetyCheckerRule): void;
    /**
     * Remove rules for a specific tool.
     */
    removeRulesForTool(toolName: string): void;
    /**
     * Get all current rules.
     */
    getRules(): readonly PolicyRule[];
    getCheckers(): readonly SafetyCheckerRule[];
    private applyNonInteractiveMode;
}

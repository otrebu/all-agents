/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import {} from '@google/genai';
import { PolicyDecision, } from './types.js';
import { stableStringify } from './stable-stringify.js';
import { debugLogger } from '../utils/debugLogger.js';
import { SafetyCheckDecision } from '../safety/protocol.js';
function ruleMatches(rule, toolCall, stringifiedArgs, serverName) {
    // Check tool name if specified
    if (rule.toolName) {
        // Support wildcard patterns: "serverName__*" matches "serverName__anyTool"
        if (rule.toolName.endsWith('__*')) {
            const prefix = rule.toolName.slice(0, -3); // Remove "__*"
            if (serverName !== undefined) {
                // Robust check: if serverName is provided, it MUST match the prefix exactly.
                // This prevents "malicious-server" from spoofing "trusted-server" by naming itself "trusted-server__malicious".
                if (serverName !== prefix) {
                    return false;
                }
            }
            // Always verify the prefix, even if serverName matched
            if (!toolCall.name || !toolCall.name.startsWith(prefix + '__')) {
                return false;
            }
        }
        else if (toolCall.name !== rule.toolName) {
            return false;
        }
    }
    // Check args pattern if specified
    if (rule.argsPattern) {
        // If rule has an args pattern but tool has no args, no match
        if (!toolCall.args) {
            return false;
        }
        // Use stable JSON stringification with sorted keys to ensure consistent matching
        if (stringifiedArgs === undefined ||
            !rule.argsPattern.test(stringifiedArgs)) {
            return false;
        }
    }
    return true;
}
export class PolicyEngine {
    rules;
    checkers;
    defaultDecision;
    nonInteractive;
    checkerRunner;
    constructor(config = {}, checkerRunner) {
        this.rules = (config.rules ?? []).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        this.checkers = (config.checkers ?? []).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        this.defaultDecision = config.defaultDecision ?? PolicyDecision.ASK_USER;
        this.nonInteractive = config.nonInteractive ?? false;
        this.checkerRunner = checkerRunner;
    }
    /**
     * Check if a tool call is allowed based on the configured policies.
     * Returns the decision and the matching rule (if any).
     */
    async check(toolCall, serverName) {
        let stringifiedArgs;
        // Compute stringified args once before the loop
        if (toolCall.args &&
            (this.rules.some((rule) => rule.argsPattern) ||
                this.checkers.some((checker) => checker.argsPattern))) {
            stringifiedArgs = stableStringify(toolCall.args);
        }
        debugLogger.debug(`[PolicyEngine.check] toolCall.name: ${toolCall.name}, stringifiedArgs: ${stringifiedArgs}`);
        // Find the first matching rule (already sorted by priority)
        let matchedRule;
        let decision;
        for (const rule of this.rules) {
            if (ruleMatches(rule, toolCall, stringifiedArgs, serverName)) {
                debugLogger.debug(`[PolicyEngine.check] MATCHED rule: toolName=${rule.toolName}, decision=${rule.decision}, priority=${rule.priority}, argsPattern=${rule.argsPattern?.source || 'none'}`);
                matchedRule = rule;
                decision = this.applyNonInteractiveMode(rule.decision);
                break;
            }
        }
        if (!decision) {
            // No matching rule found, use default decision
            debugLogger.debug(`[PolicyEngine.check] NO MATCH - using default decision: ${this.defaultDecision}`);
            decision = this.applyNonInteractiveMode(this.defaultDecision);
        }
        // If decision is not DENY, run safety checkers
        if (decision !== PolicyDecision.DENY && this.checkerRunner) {
            for (const checkerRule of this.checkers) {
                if (ruleMatches(checkerRule, toolCall, stringifiedArgs, serverName)) {
                    debugLogger.debug(`[PolicyEngine.check] Running safety checker: ${checkerRule.checker.name}`);
                    try {
                        const result = await this.checkerRunner.runChecker(toolCall, checkerRule.checker);
                        if (result.decision === SafetyCheckDecision.DENY) {
                            debugLogger.debug(`[PolicyEngine.check] Safety checker denied: ${result.reason}`);
                            return {
                                decision: PolicyDecision.DENY,
                                rule: matchedRule,
                            };
                        }
                        else if (result.decision === SafetyCheckDecision.ASK_USER) {
                            debugLogger.debug(`[PolicyEngine.check] Safety checker requested ASK_USER: ${result.reason}`);
                            decision = PolicyDecision.ASK_USER;
                        }
                    }
                    catch (error) {
                        debugLogger.debug(`[PolicyEngine.check] Safety checker failed: ${error}`);
                        return {
                            decision: PolicyDecision.DENY,
                            rule: matchedRule,
                        };
                    }
                }
            }
        }
        return {
            decision: this.applyNonInteractiveMode(decision),
            rule: matchedRule,
        };
    }
    /**
     * Add a new rule to the policy engine.
     */
    addRule(rule) {
        this.rules.push(rule);
        // Re-sort rules by priority
        this.rules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    }
    addChecker(checker) {
        this.checkers.push(checker);
        this.checkers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    }
    /**
     * Remove rules for a specific tool.
     */
    removeRulesForTool(toolName) {
        this.rules = this.rules.filter((rule) => rule.toolName !== toolName);
    }
    /**
     * Get all current rules.
     */
    getRules() {
        return this.rules;
    }
    getCheckers() {
        return this.checkers;
    }
    applyNonInteractiveMode(decision) {
        // In non-interactive mode, ASK_USER becomes DENY
        if (this.nonInteractive && decision === PolicyDecision.ASK_USER) {
            return PolicyDecision.DENY;
        }
        return decision;
    }
}
//# sourceMappingURL=policy-engine.js.map
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { CodebaseInvestigatorAgent } from './codebase-investigator.js';
import {} from 'zod';
import { debugLogger } from '../utils/debugLogger.js';
/**
 * Manages the discovery, loading, validation, and registration of
 * AgentDefinitions.
 */
export class AgentRegistry {
    config;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agents = new Map();
    constructor(config) {
        this.config = config;
    }
    /**
     * Discovers and loads agents.
     */
    async initialize() {
        this.loadBuiltInAgents();
        if (this.config.getDebugMode()) {
            debugLogger.log(`[AgentRegistry] Initialized with ${this.agents.size} agents.`);
        }
    }
    loadBuiltInAgents() {
        const investigatorSettings = this.config.getCodebaseInvestigatorSettings();
        // Only register the agent if it's enabled in the settings.
        if (investigatorSettings?.enabled) {
            const agentDef = {
                ...CodebaseInvestigatorAgent,
                modelConfig: {
                    ...CodebaseInvestigatorAgent.modelConfig,
                    model: investigatorSettings.model ??
                        CodebaseInvestigatorAgent.modelConfig.model,
                    thinkingBudget: investigatorSettings.thinkingBudget ??
                        CodebaseInvestigatorAgent.modelConfig.thinkingBudget,
                },
                runConfig: {
                    ...CodebaseInvestigatorAgent.runConfig,
                    max_time_minutes: investigatorSettings.maxTimeMinutes ??
                        CodebaseInvestigatorAgent.runConfig.max_time_minutes,
                    max_turns: investigatorSettings.maxNumTurns ??
                        CodebaseInvestigatorAgent.runConfig.max_turns,
                },
            };
            this.registerAgent(agentDef);
        }
    }
    /**
     * Registers an agent definition. If an agent with the same name exists,
     * it will be overwritten, respecting the precedence established by the
     * initialization order.
     */
    registerAgent(definition) {
        // Basic validation
        if (!definition.name || !definition.description) {
            debugLogger.warn(`[AgentRegistry] Skipping invalid agent definition. Missing name or description.`);
            return;
        }
        if (this.agents.has(definition.name) && this.config.getDebugMode()) {
            debugLogger.log(`[AgentRegistry] Overriding agent '${definition.name}'`);
        }
        this.agents.set(definition.name, definition);
    }
    /**
     * Retrieves an agent definition by name.
     */
    getDefinition(name) {
        return this.agents.get(name);
    }
    /**
     * Returns all active agent definitions.
     */
    getAllDefinitions() {
        return Array.from(this.agents.values());
    }
}
//# sourceMappingURL=registry.js.map
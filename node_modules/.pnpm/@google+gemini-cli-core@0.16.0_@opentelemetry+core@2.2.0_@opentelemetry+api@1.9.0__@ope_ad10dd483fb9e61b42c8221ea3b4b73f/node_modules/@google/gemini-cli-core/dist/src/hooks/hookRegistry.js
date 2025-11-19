/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { HookEventName } from './types.js';
import { debugLogger } from '../utils/debugLogger.js';
/**
 * Error thrown when attempting to use HookRegistry before initialization
 */
export class HookRegistryNotInitializedError extends Error {
    constructor(message = 'Hook registry not initialized') {
        super(message);
        this.name = 'HookRegistryNotInitializedError';
    }
}
/**
 * Configuration source levels in precedence order (highest to lowest)
 */
export var ConfigSource;
(function (ConfigSource) {
    ConfigSource["Project"] = "project";
    ConfigSource["User"] = "user";
    ConfigSource["System"] = "system";
    ConfigSource["Extensions"] = "extensions";
})(ConfigSource || (ConfigSource = {}));
/**
 * Hook registry that loads and validates hook definitions from multiple sources
 */
export class HookRegistry {
    config;
    entries = [];
    initialized = false;
    constructor(config) {
        this.config = config;
    }
    /**
     * Initialize the registry by processing hooks from config
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        this.entries = [];
        this.processHooksFromConfig();
        this.initialized = true;
        debugLogger.log(`Hook registry initialized with ${this.entries.length} hook entries`);
    }
    /**
     * Get all hook entries for a specific event
     */
    getHooksForEvent(eventName) {
        if (!this.initialized) {
            throw new HookRegistryNotInitializedError();
        }
        return this.entries
            .filter((entry) => entry.eventName === eventName && entry.enabled)
            .sort((a, b) => this.getSourcePriority(a.source) - this.getSourcePriority(b.source));
    }
    /**
     * Get all registered hooks
     */
    getAllHooks() {
        if (!this.initialized) {
            throw new HookRegistryNotInitializedError();
        }
        return [...this.entries];
    }
    /**
     * Enable or disable a specific hook
     */
    setHookEnabled(hookName, enabled) {
        const updated = this.entries.filter((entry) => {
            const name = this.getHookName(entry);
            if (name === hookName) {
                entry.enabled = enabled;
                return true;
            }
            return false;
        });
        if (updated.length > 0) {
            debugLogger.log(`${enabled ? 'Enabled' : 'Disabled'} ${updated.length} hook(s) matching "${hookName}"`);
        }
        else {
            debugLogger.warn(`No hooks found matching "${hookName}"`);
        }
    }
    /**
     * Get hook name for display purposes
     */
    getHookName(entry) {
        return entry.config.command || 'unknown-command';
    }
    /**
     * Process hooks from the config that was already loaded by the CLI
     */
    processHooksFromConfig() {
        // Get hooks from the main config (this comes from the merged settings)
        const configHooks = this.config.getHooks();
        if (configHooks) {
            this.processHooksConfiguration(configHooks, ConfigSource.Project);
        }
        // Get hooks from extensions
        const extensions = this.config.getExtensions() || [];
        for (const extension of extensions) {
            if (extension.isActive && extension.hooks) {
                this.processHooksConfiguration(extension.hooks, ConfigSource.Extensions);
            }
        }
    }
    /**
     * Process hooks configuration and add entries
     */
    processHooksConfiguration(hooksConfig, source) {
        for (const [eventName, definitions] of Object.entries(hooksConfig)) {
            if (!this.isValidEventName(eventName)) {
                debugLogger.warn(`Invalid hook event name: ${eventName}`);
                continue;
            }
            const typedEventName = eventName;
            if (!Array.isArray(definitions)) {
                debugLogger.warn(`Hook definitions for event "${eventName}" from source "${source}" is not an array. Skipping.`);
                continue;
            }
            for (const definition of definitions) {
                this.processHookDefinition(definition, typedEventName, source);
            }
        }
    }
    /**
     * Process a single hook definition
     */
    processHookDefinition(definition, eventName, source) {
        if (!definition ||
            typeof definition !== 'object' ||
            !Array.isArray(definition.hooks)) {
            debugLogger.warn(`Discarding invalid hook definition for ${eventName} from ${source}:`, definition);
            return;
        }
        for (const hookConfig of definition.hooks) {
            if (hookConfig &&
                typeof hookConfig === 'object' &&
                this.validateHookConfig(hookConfig, eventName, source)) {
                this.entries.push({
                    config: hookConfig,
                    source,
                    eventName,
                    matcher: definition.matcher,
                    sequential: definition.sequential,
                    enabled: true,
                });
            }
            else {
                // Invalid hooks are logged and discarded here, they won't reach HookRunner
                debugLogger.warn(`Discarding invalid hook configuration for ${eventName} from ${source}:`, hookConfig);
            }
        }
    }
    /**
     * Validate a hook configuration
     */
    validateHookConfig(config, eventName, source) {
        if (!config.type || !['command', 'plugin'].includes(config.type)) {
            debugLogger.warn(`Invalid hook ${eventName} from ${source} type: ${config.type}`);
            return false;
        }
        if (config.type === 'command' && !config.command) {
            debugLogger.warn(`Command hook ${eventName} from ${source} missing command field`);
            return false;
        }
        return true;
    }
    /**
     * Check if an event name is valid
     */
    isValidEventName(eventName) {
        const validEventNames = Object.values(HookEventName);
        return validEventNames.includes(eventName);
    }
    /**
     * Get source priority (lower number = higher priority)
     */
    getSourcePriority(source) {
        switch (source) {
            case ConfigSource.Project:
                return 1;
            case ConfigSource.User:
                return 2;
            case ConfigSource.System:
                return 3;
            case ConfigSource.Extensions:
                return 4;
            default:
                return 999;
        }
    }
}
//# sourceMappingURL=hookRegistry.js.map
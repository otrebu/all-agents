/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export class ModelConfigService {
    config;
    // TODO(12597): Process config to build a typed alias hierarchy.
    constructor(config) {
        this.config = config;
    }
    resolveAlias(aliasName, aliases, visited = new Set()) {
        if (visited.has(aliasName)) {
            throw new Error(`Circular alias dependency: ${[...visited, aliasName].join(' -> ')}`);
        }
        visited.add(aliasName);
        const alias = aliases[aliasName];
        if (!alias) {
            throw new Error(`Alias "${aliasName}" not found.`);
        }
        if (!alias.extends) {
            return alias;
        }
        const baseAlias = this.resolveAlias(alias.extends, aliases, visited);
        return {
            modelConfig: {
                model: alias.modelConfig.model ?? baseAlias.modelConfig.model,
                generateContentConfig: this.deepMerge(baseAlias.modelConfig.generateContentConfig, alias.modelConfig.generateContentConfig),
            },
        };
    }
    internalGetResolvedConfig(context) {
        const config = this.config || {};
        const { aliases = {}, overrides = [] } = config;
        let baseModel = context.model;
        let resolvedConfig = {};
        // Step 1: Alias Resolution
        if (aliases[context.model]) {
            const resolvedAlias = this.resolveAlias(context.model, aliases);
            baseModel = resolvedAlias.modelConfig.model; // This can now be undefined
            resolvedConfig = this.deepMerge(resolvedConfig, resolvedAlias.modelConfig.generateContentConfig);
        }
        // If an alias was used but didn't resolve to a model, `baseModel` is undefined.
        // We still need a model for matching overrides. We'll use the original alias name
        // for matching if no model is resolved yet.
        const modelForMatching = baseModel ?? context.model;
        const finalContext = {
            ...context,
            model: modelForMatching,
        };
        // Step 2: Override Application
        const matches = overrides
            .map((override, index) => {
            const matchEntries = Object.entries(override.match);
            if (matchEntries.length === 0) {
                return null;
            }
            const isMatch = matchEntries.every(([key, value]) => {
                if (key === 'model') {
                    return value === context.model || value === finalContext.model;
                }
                if (key === 'overrideScope' && value === 'core') {
                    // The 'core' overrideScope is special. It should match if the
                    // overrideScope is explicitly 'core' or if the overrideScope
                    // is not specified.
                    return context.overrideScope === 'core' || !context.overrideScope;
                }
                return finalContext[key] === value;
            });
            if (isMatch) {
                return {
                    specificity: matchEntries.length,
                    modelConfig: override.modelConfig,
                    index,
                };
            }
            return null;
        })
            .filter((match) => match !== null);
        // The override application logic is designed to be both simple and powerful.
        // By first sorting all matching overrides by specificity (and then by their
        // original order as a tie-breaker), we ensure that as we merge the `config`
        // objects, the settings from the most specific rules are applied last,
        // correctly overwriting any values from broader, less-specific rules.
        // This achieves a per-property override effect without complex per-property logic.
        matches.sort((a, b) => {
            if (a.specificity !== b.specificity) {
                return a.specificity - b.specificity;
            }
            return a.index - b.index;
        });
        // Apply matching overrides
        for (const match of matches) {
            if (match.modelConfig.model) {
                baseModel = match.modelConfig.model;
            }
            if (match.modelConfig.generateContentConfig) {
                resolvedConfig = this.deepMerge(resolvedConfig, match.modelConfig.generateContentConfig);
            }
        }
        return {
            model: baseModel,
            generateContentConfig: resolvedConfig,
        };
    }
    getResolvedConfig(context) {
        const resolved = this.internalGetResolvedConfig(context);
        if (!resolved.model) {
            throw new Error(`Could not resolve a model name for alias "${context.model}". Please ensure the alias chain or a matching override specifies a model.`);
        }
        return {
            model: resolved.model,
            generateContentConfig: resolved.generateContentConfig,
        };
    }
    isObject(item) {
        return !!item && typeof item === 'object' && !Array.isArray(item);
    }
    deepMerge(config1, config2) {
        return this.genericDeepMerge(config1, config2);
    }
    genericDeepMerge(...objects) {
        return objects.reduce((acc, obj) => {
            if (!obj) {
                return acc;
            }
            Object.keys(obj).forEach((key) => {
                const accValue = acc[key];
                const objValue = obj[key];
                // For now, we only deep merge objects, and not arrays. This is because
                // If we deep merge arrays, there is no way for the user to completely
                // override the base array.
                // TODO(joshualitt): Consider knobs here, i.e. opt-in to deep merging
                // arrays on a case-by-case basis.
                if (this.isObject(accValue) && this.isObject(objValue)) {
                    acc[key] = this.deepMerge(accValue, objValue);
                }
                else {
                    acc[key] = objValue;
                }
            });
            return acc;
        }, {});
    }
}
//# sourceMappingURL=modelConfigService.js.map
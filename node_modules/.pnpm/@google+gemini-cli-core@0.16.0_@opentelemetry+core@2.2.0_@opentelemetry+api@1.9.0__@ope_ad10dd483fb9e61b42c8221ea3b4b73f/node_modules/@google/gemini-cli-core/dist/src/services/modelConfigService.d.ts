/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { GenerateContentConfig } from '@google/genai';
export interface ModelConfigKey {
    model: string;
    overrideScope?: string;
}
export interface ModelConfig {
    model?: string;
    generateContentConfig?: GenerateContentConfig;
}
export interface ModelConfigOverride {
    match: {
        model?: string;
        overrideScope?: string;
    };
    modelConfig: ModelConfig;
}
export interface ModelConfigAlias {
    extends?: string;
    modelConfig: ModelConfig;
}
export interface ModelConfigServiceConfig {
    aliases?: Record<string, ModelConfigAlias>;
    overrides?: ModelConfigOverride[];
}
export type ResolvedModelConfig = _ResolvedModelConfig & {
    readonly _brand: unique symbol;
};
export interface _ResolvedModelConfig {
    model: string;
    generateContentConfig: GenerateContentConfig;
}
export declare class ModelConfigService {
    private readonly config;
    constructor(config: ModelConfigServiceConfig);
    private resolveAlias;
    private internalGetResolvedConfig;
    getResolvedConfig(context: ModelConfigKey): ResolvedModelConfig;
    private isObject;
    private deepMerge;
    private genericDeepMerge;
}

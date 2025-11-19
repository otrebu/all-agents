/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
import type { CallableTool } from '@google/genai';
import type { Config } from '../config/config.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
type ToolParams = Record<string, unknown>;
export declare class DiscoveredMCPTool extends BaseDeclarativeTool<ToolParams, ToolResult> {
    private readonly mcpTool;
    readonly serverName: string;
    readonly serverToolName: string;
    readonly parameterSchema: unknown;
    readonly trust?: boolean | undefined;
    private readonly cliConfig?;
    readonly extensionName?: string | undefined;
    readonly extensionId?: string | undefined;
    constructor(mcpTool: CallableTool, serverName: string, serverToolName: string, description: string, parameterSchema: unknown, trust?: boolean | undefined, nameOverride?: string, cliConfig?: Config | undefined, extensionName?: string | undefined, extensionId?: string | undefined, messageBus?: MessageBus);
    getFullyQualifiedPrefix(): string;
    asFullyQualifiedTool(): DiscoveredMCPTool;
    protected createInvocation(params: ToolParams, _messageBus?: MessageBus, _toolName?: string, _displayName?: string): ToolInvocation<ToolParams, ToolResult>;
}
/** Visible for testing */
export declare function generateValidName(name: string): string;
export {};

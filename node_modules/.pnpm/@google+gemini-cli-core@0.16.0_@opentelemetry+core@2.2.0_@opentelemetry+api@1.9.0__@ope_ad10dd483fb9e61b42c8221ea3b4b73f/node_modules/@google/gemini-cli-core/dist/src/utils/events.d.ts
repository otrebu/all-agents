/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'node:events';
import type { LoadServerHierarchicalMemoryResponse } from './memoryDiscovery.js';
/**
 * Defines the severity level for user-facing feedback.
 * This maps loosely to UI `MessageType`
 */
export type FeedbackSeverity = 'info' | 'warning' | 'error';
/**
 * Payload for the 'user-feedback' event.
 */
export interface UserFeedbackPayload {
    /**
     * The severity level determines how the message is rendered in the UI
     * (e.g. colored text, specific icon).
     */
    severity: FeedbackSeverity;
    /**
     * The main message to display to the user in the chat history or stdout.
     */
    message: string;
    /**
     * The original error object, if applicable.
     * Listeners can use this to extract stack traces for debug logging
     * or verbose output, while keeping the 'message' field clean for end users.
     */
    error?: unknown;
}
/**
 * Payload for the 'fallback-mode-changed' event.
 */
export interface FallbackModeChangedPayload {
    /**
     * Whether fallback mode is now active.
     */
    isInFallbackMode: boolean;
}
/**
 * Payload for the 'model-changed' event.
 */
export interface ModelChangedPayload {
    /**
     * The new model that was set.
     */
    model: string;
}
/**
 * Payload for the 'memory-changed' event.
 */
export type MemoryChangedPayload = LoadServerHierarchicalMemoryResponse;
export declare enum CoreEvent {
    UserFeedback = "user-feedback",
    FallbackModeChanged = "fallback-mode-changed",
    ModelChanged = "model-changed",
    MemoryChanged = "memory-changed"
}
export interface CoreEvents {
    [CoreEvent.UserFeedback]: [UserFeedbackPayload];
    [CoreEvent.FallbackModeChanged]: [FallbackModeChangedPayload];
    [CoreEvent.ModelChanged]: [ModelChangedPayload];
    [CoreEvent.MemoryChanged]: [MemoryChangedPayload];
}
export declare class CoreEventEmitter extends EventEmitter<CoreEvents> {
    private _feedbackBacklog;
    private static readonly MAX_BACKLOG_SIZE;
    constructor();
    /**
     * Sends actionable feedback to the user.
     * Buffers automatically if the UI hasn't subscribed yet.
     */
    emitFeedback(severity: FeedbackSeverity, message: string, error?: unknown): void;
    /**
     * Notifies subscribers that fallback mode has changed.
     * This is synchronous and doesn't use backlog (UI should already be initialized).
     */
    emitFallbackModeChanged(isInFallbackMode: boolean): void;
    /**
     * Notifies subscribers that the model has changed.
     */
    emitModelChanged(model: string): void;
    /**
     * Flushes buffered messages. Call this immediately after primary UI listener
     * subscribes.
     */
    drainFeedbackBacklog(): void;
}
export declare const coreEvents: CoreEventEmitter;

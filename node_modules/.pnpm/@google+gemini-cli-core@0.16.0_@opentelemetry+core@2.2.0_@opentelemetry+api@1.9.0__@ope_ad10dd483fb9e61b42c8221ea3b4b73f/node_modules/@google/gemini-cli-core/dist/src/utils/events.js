/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'node:events';
export var CoreEvent;
(function (CoreEvent) {
    CoreEvent["UserFeedback"] = "user-feedback";
    CoreEvent["FallbackModeChanged"] = "fallback-mode-changed";
    CoreEvent["ModelChanged"] = "model-changed";
    CoreEvent["MemoryChanged"] = "memory-changed";
})(CoreEvent || (CoreEvent = {}));
export class CoreEventEmitter extends EventEmitter {
    _feedbackBacklog = [];
    static MAX_BACKLOG_SIZE = 10000;
    constructor() {
        super();
    }
    /**
     * Sends actionable feedback to the user.
     * Buffers automatically if the UI hasn't subscribed yet.
     */
    emitFeedback(severity, message, error) {
        const payload = { severity, message, error };
        if (this.listenerCount(CoreEvent.UserFeedback) === 0) {
            if (this._feedbackBacklog.length >= CoreEventEmitter.MAX_BACKLOG_SIZE) {
                this._feedbackBacklog.shift();
            }
            this._feedbackBacklog.push(payload);
        }
        else {
            this.emit(CoreEvent.UserFeedback, payload);
        }
    }
    /**
     * Notifies subscribers that fallback mode has changed.
     * This is synchronous and doesn't use backlog (UI should already be initialized).
     */
    emitFallbackModeChanged(isInFallbackMode) {
        const payload = { isInFallbackMode };
        this.emit(CoreEvent.FallbackModeChanged, payload);
    }
    /**
     * Notifies subscribers that the model has changed.
     */
    emitModelChanged(model) {
        const payload = { model };
        this.emit(CoreEvent.ModelChanged, payload);
    }
    /**
     * Flushes buffered messages. Call this immediately after primary UI listener
     * subscribes.
     */
    drainFeedbackBacklog() {
        const backlog = [...this._feedbackBacklog];
        this._feedbackBacklog.length = 0; // Clear in-place
        for (const payload of backlog) {
            this.emit(CoreEvent.UserFeedback, payload);
        }
    }
}
export const coreEvents = new CoreEventEmitter();
//# sourceMappingURL=events.js.map
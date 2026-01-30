/**
 * Temporary session directory management for Ralph prototype
 *
 * This module provides utilities for managing /tmp session directories:
 * - createSessionDirectory() - Create a timestamped session directory
 * - getSessionPaths() - Get paths to session files (tasks.json, state.json, progress.log)
 * - removeSessionDirectory() - Remove a session directory
 *
 * Session directories are created at /tmp/ralph-prototype-{YYYYMMDD-HHMMSS}/
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

// =============================================================================
// Types
// =============================================================================

/**
 * Session directory information
 */
interface SessionInfo {
  /** ISO timestamp when session was created */
  createdAt: string;
  /** Path to session directory */
  path: string;
  /** Session ID (timestamp portion) */
  sessionId: string;
}

/**
 * Paths to standard session files
 */
interface SessionPaths {
  /** Path to progress.log file */
  progressLog: string;
  /** Root session directory path */
  root: string;
  /** Path to state.json file */
  stateJson: string;
  /** Path to tasks.json file */
  tasksJson: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Base directory for prototype sessions
 */
const TMP_BASE = "/tmp";

/**
 * Prefix for session directories
 */
const SESSION_PREFIX = "ralph-prototype-";

// =============================================================================
// Session Directory Management
// =============================================================================

/**
 * Check if a session directory exists
 *
 * @param sessionDirectory - Path to session directory
 * @returns True if directory exists
 */
function checkSessionExists(sessionDirectory: string): boolean {
  return existsSync(sessionDirectory);
}

/**
 * Create a new session directory in /tmp
 *
 * Creates a timestamped directory at /tmp/ralph-prototype-{YYYYMMDD-HHMMSS}/
 * and initializes it with empty standard files.
 *
 * @param timestamp - Optional timestamp to use (defaults to current time)
 * @returns Session information including path and ID
 * @throws Error if directory creation fails
 */
function createSessionDirectory(timestamp?: Date): SessionInfo {
  const now = timestamp ?? new Date();
  const sessionId = formatTimestamp(now);
  const sessionPath = `${TMP_BASE}/${SESSION_PREFIX}${sessionId}`;

  // Create the directory
  mkdirSync(sessionPath, { recursive: true });

  // Initialize standard files
  const paths = getSessionPaths(sessionPath);

  // Create empty tasks.json with valid JSON structure
  writeFileSync(paths.tasksJson, JSON.stringify({ subtasks: [] }, null, 2));

  // Create empty state.json with initial state
  writeFileSync(
    paths.stateJson,
    JSON.stringify(
      {
        createdAt: now.toISOString(),
        currentSubtaskIndex: 0,
        status: "initialized",
      },
      null,
      2,
    ),
  );

  // Create empty progress.log
  writeFileSync(
    paths.progressLog,
    `# Ralph Prototype Session: ${sessionId}\n# Started: ${now.toISOString()}\n\n`,
  );

  return { createdAt: now.toISOString(), path: sessionPath, sessionId };
}

/**
 * Extract session ID from session directory path
 *
 * @param sessionDirectory - Full path to session directory
 * @returns Session ID or null if path doesn't match expected format
 */
function extractSessionIdFromPath(sessionDirectory: string): null | string {
  const prefix = `${TMP_BASE}/${SESSION_PREFIX}`;
  if (!sessionDirectory.startsWith(prefix)) {
    return null;
  }
  return sessionDirectory.slice(prefix.length);
}

/**
 * Format a date as YYYYMMDD-HHMMSS
 *
 * @param date - Date to format
 * @returns Formatted string
 */
function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Get session directory path from session ID
 *
 * @param sessionId - Session ID (YYYYMMDD-HHMMSS format)
 * @returns Full path to session directory
 */
function getSessionDirectoryFromId(sessionId: string): string {
  return `${TMP_BASE}/${SESSION_PREFIX}${sessionId}`;
}

/**
 * Get paths to standard session files
 *
 * @param sessionDirectory - Path to session directory
 * @returns Object with paths to standard files
 */
function getSessionPaths(sessionDirectory: string): SessionPaths {
  return {
    progressLog: `${sessionDirectory}/progress.log`,
    root: sessionDirectory,
    stateJson: `${sessionDirectory}/state.json`,
    tasksJson: `${sessionDirectory}/tasks.json`,
  };
}

/**
 * Remove a session directory
 *
 * Removes the session directory and all its contents.
 * Safe to call even if directory doesn't exist.
 *
 * @param sessionDirectory - Path to session directory to remove
 */
function removeSessionDirectory(sessionDirectory: string): void {
  if (existsSync(sessionDirectory)) {
    rmSync(sessionDirectory, { force: true, recursive: true });
  }
}

// =============================================================================
// Exports
// =============================================================================

export {
  checkSessionExists,
  createSessionDirectory,
  extractSessionIdFromPath,
  formatTimestamp,
  getSessionDirectoryFromId,
  getSessionPaths,
  removeSessionDirectory,
  SESSION_PREFIX,
  TMP_BASE,
};
export type { SessionInfo, SessionPaths };

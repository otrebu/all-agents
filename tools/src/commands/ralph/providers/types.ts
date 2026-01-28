/**
 * Provider abstraction types for multi-CLI support in Ralph
 * 
 * This module defines the core interfaces that all AI providers must implement.
 * It enables Ralph to work with Claude, Opencode, Codex, Gemini, and Cursor
 * through a unified abstraction layer.
 */

// =============================================================================
// Core Provider Interface
// =============================================================================

/**
 * AI Provider interface that all CLI implementations must conform to
 */
export interface AIProvider {
  /** CLI command name (e.g., 'claude', 'opencode', 'agent') */
  readonly command: string;
  
  /**
   * Get the list of context files this provider supports
   * e.g., ['CLAUDE.md', 'AGENTS.md'] for Claude
   */
  getContextFileNames: () => Array<string>;
  
  /**
   * Get default model for this provider
   */
  getDefaultModel: () => string;
  
  /** 
   * Invoke provider in chat/supervised mode
   * User can watch and interact with the session
   */
  invokeChat: (options: ChatOptions) => ProviderResult;
  
  /**
   * Invoke provider in headless mode
   * Returns structured output for programmatic use
   */
  invokeHeadless: (options: HeadlessOptions) => HeadlessResult | null;
  
  /**
   * Invoke lightweight/haiku mode for summaries (optional)
   * Falls back to headless if not implemented
   */
  invokeLightweight?: (options: LightweightOptions) => null | string;
  
  /**
   * Check if the provider CLI is available in PATH
   */
  isAvailable: () => boolean;
  
  /**
   * Validate if a model name is valid for this provider
   */
  isValidModel: (model: string) => boolean;
  
  /** Provider name (e.g., 'claude', 'opencode', 'cursor') */
  readonly name: string;
}

// =============================================================================
// Invocation Options
// =============================================================================

/**
 * Base configuration for all providers
 */
export interface BaseProviderConfig {
  /** API key or authentication (if needed) */
  apiKey?: string;
  
  /** Base URL for API (if applicable) */
  baseUrl?: string;
  
  /** Additional CLI flags to always include */
  extraFlags?: Array<string>;
  
  /** Maximum tokens to generate */
  maxTokens?: number;
  
  /** Default model for this provider */
  model?: string;
  
  /** Temperature (0-2) */
  temperature?: number;
  
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Options for chat/supervised mode invocation
 */
export interface ChatOptions {
  /** Working directory for the session */
  cwd?: string;
  
  /** Optional context to prepend to the prompt */
  extraContext?: string;
  
  /** Model override (optional) */
  model?: string;
  
  /** Path to the prompt file */
  promptPath: string;
  
  /** Name for the session (used in console output) */
  sessionName: string;
}

/**
 * Claude-specific configuration
 */
export interface ClaudeProviderConfig extends BaseProviderConfig {
  /** Skip permission prompts */
  dangerouslySkipPermissions?: boolean;
  
  /** Lightweight model for summaries */
  lightweightModel?: string;
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Codex-specific configuration
 */
export interface CodexProviderConfig extends BaseProviderConfig {
  /** Path to JSON schema for structured output */
  outputSchema?: string;
  
  /** Sandbox mode: read-only, workspace-write, or danger-full-access */
  sandbox?: 'danger-full-access' | 'read-only' | 'workspace-write';
}

/**
 * Cursor-specific configuration
 */
export interface CursorProviderConfig extends BaseProviderConfig {
  /** Browser automation support */
  browser?: boolean;
  
  /** 
   * Allow file modifications in headless mode
   * WARNING: This bypasses safety checks. Use with caution.
   */
  dangerouslyAllowForceWrites?: boolean;
  
  /** Sandbox mode */
  sandbox?: 'disabled' | 'enabled';
}

/**
 * Gemini-specific configuration
 */
export interface GeminiProviderConfig extends BaseProviderConfig {
  /** Rate limit (requests per minute) */
  rateLimitRpm?: number;
  
  /** Enable sandbox mode for untrusted code */
  sandbox?: boolean;
}

// =============================================================================
// Provider Configuration
// =============================================================================

/**
 * Options for headless mode invocation
 */
export interface HeadlessOptions {
  /** Working directory for the session */
  cwd?: string;
  
  /** Additional provider-specific flags */
  extraFlags?: Array<string>;
  
  /** Model override (optional) */
  model?: string;
  
  /** The prompt to send to the provider */
  prompt: string;
}

/**
 * Result from headless mode invocation
 * This is the canonical format that all providers must normalize to
 */
export interface HeadlessResult {
  /** 
   * Cost in USD (optional - not all providers provide this)
   * If undefined, cost will not be displayed
   */
  costUsd?: number;
  
  /** Duration in milliseconds */
  duration: number;
  
  /**
   * Files that were modified (optional)
   */
  filesChanged?: Array<string>;
  
  /**
   * Raw provider output (for debugging)
   */
  rawOutput?: string;
  
  /** The result/response content */
  result: string;
  
  /** Session ID */
  sessionId: string;
  
  /**
   * Token usage (optional - not all providers provide detailed token info)
   */
  tokenUsage?: TokenUsage;
  
  /**
   * Number of tool calls made (optional)
   */
  toolCalls?: number;
}

/**
 * Options for lightweight/haiku mode
 */
export interface LightweightOptions {
  /** Model override (optional) */
  model?: string;
  
  /** The prompt to send */
  prompt: string;
  
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Opencode-specific configuration
 */
export interface OpencodeProviderConfig extends BaseProviderConfig {
  /** Agent to use (e.g., 'build', 'plan') */
  agent?: string;
  
  /** Server mode port (if using persistent server) */
  serverPort?: number;
}

/**
 * Provider error types
 */
export type ProviderErrorType = 
  | 'authentication-failed'
  | 'execution-failed'
  | 'interrupted'
  | 'invalid-model'
  | 'not-installed'
  | 'output-parse-failed'
  | 'rate-limited'
  | 'timeout';

/**
 * Provider factory function type
 */
export type ProviderFactory = (config?: BaseProviderConfig) => AIProvider;

// =============================================================================
// Provider Registry Types
// =============================================================================

/**
 * Provider information for listing/display
 */
export interface ProviderInfo {
  available: boolean;
  command: string;
  defaultModel: string;
  description: string;
  name: string;
}

/**
 * Map of provider names to their implementations
 */
export type ProviderRegistry = Map<string, AIProvider>;

/**
 * Result from chat/supervised mode invocation
 */
export interface ProviderResult {
  /** Exit code from the process (null if killed by signal) */
  exitCode: null | number;
  
  /** Whether the session was interrupted (SIGINT/SIGTERM) */
  interrupted: boolean;
  
  /** Session ID if available */
  sessionId?: string;
  
  /** Whether the session completed successfully */
  success: boolean;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Token usage information
 */
export interface TokenUsage {
  /** Cached input tokens read */
  cacheReadTokens?: number;
  
  /** Cached input tokens written */
  cacheWriteTokens?: number;
  
  /** Input/prompt tokens */
  inputTokens?: number;
  
  /** Output/completion tokens */
  outputTokens?: number;
  
  /** Reasoning tokens (for models that support it) */
  reasoningTokens?: number;
}

/**
 * Provider error
 */
export class ProviderError extends Error {
  constructor(
    public type: ProviderErrorType,
    message: string,
    public provider?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Type guard for HeadlessResult
 */
export function isHeadlessResult(object: unknown): object is HeadlessResult {
  return (
    typeof object === 'object' &&
    object !== null &&
    'result' in object &&
    'sessionId' in object &&
    'duration' in object
  );
}

/**
 * Type guard for TokenUsage
 */
export function isTokenUsage(object: unknown): object is TokenUsage {
  return (
    typeof object === 'object' &&
    object !== null &&
    ('inputTokens' in object || 'outputTokens' in object)
  );
}
